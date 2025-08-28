/**
 * 认证控制器 - 应用级控制器
 * 处理OAuth认证流程，包括授权回调和cookie管理
 * 使用应用级自动依赖注入，SINGLETON生命周期
 */

import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import type JWTService from '../services/JWTService.js';
import UserAuthService, {
  type ExtendedAuthenticatedUser
} from '../services/UserAuthService.js';
import WPSApiService from '../services/WPSApiService.js';

/**
 * 安全响应工具 - 防止重复响应错误
 */
class SafeResponse {
  /**
   * 安全发送响应
   */
  static safeSend(reply: FastifyReply, statusCode: number, data: any): boolean {
    if (reply.sent) {
      return false;
    }
    try {
      reply.code(statusCode).send(data);
      return true;
    } catch (error) {
      console.error('Failed to send response:', error);
      return false;
    }
  }

  /**
   * 安全重定向
   */
  static safeRedirect(reply: FastifyReply, url: string): boolean {
    if (reply.sent) {
      return false;
    }
    try {
      reply.redirect(url);
      return true;
    } catch (error) {
      console.error('Failed to redirect:', error);
      return false;
    }
  }
}

/**
 * 认证请求参数
 */
interface AuthRequest {
  /** 授权码 */
  code: string;
  /** 状态参数 */
  state: string;
  /** 错误信息 */
  error?: string;
  /** 错误描述 */
  error_description?: string;
}

/**
 * Cookie 配置选项
 */
interface CookieOptions {
  /** 最大存活时间（毫秒） */
  maxAge?: number;
  /** 过期时间 */
  expires?: Date;
  /** 是否仅HTTP访问 */
  httpOnly?: boolean;
  /** 是否安全传输 */
  secure?: boolean;
  /** 同站策略 */
  sameSite?: 'strict' | 'lax' | 'none';
  /** 路径 */
  path?: string;
  /** 域名 */
  domain?: string;
  /** 是否签名cookie */
  signed?: boolean;
}

/**
 * 添加URL参数的工具函数
 */
function addUrlParams(url: string, params: Record<string, string>): string {
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });
  return urlObj.toString();
}

@Controller()
export default class AuthController {
  constructor(
    private jwtService: JWTService,
    private wpsApiService: WPSApiService,
    private userAuthService: UserAuthService,
    private logger: Logger
  ) {
    this.logger.info('✅ AuthController initialized with application-level DI');
  }

  /**
   * 处理OAuth授权回调
   * 参考icalink-api的handleAuthCode方法实现
   */
  @Get('/api/auth/authorization')
  async handleAuthorizationCallback(
    request: FastifyRequest<{ Querystring: AuthRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { code, state, error, error_description } = request.query;

      // 检查是否有OAuth错误
      if (error) {
        this.logger.error('OAuth authorization error:', {
          error,
          error_description
        });
        return this.handleAuthError(
          reply,
          state,
          'oauth_error',
          error_description || error
        );
      }

      // 验证必要参数
      if (!code) {
        this.logger.error('Missing authorization code');
        SafeResponse.safeSend(reply, 400, {
          success: false,
          error: 'MISSING_CODE',
          message: '缺少授权码'
        });
        return;
      }

      // 1. 使用授权码获取WPS访问令牌
      let wpsTokenResponse;
      try {
        wpsTokenResponse = await this.wpsApiService.getAccessToken(code);
        this.logger.info('Successfully obtained WPS access token');
      } catch (error) {
        this.logger.error('Failed to get WPS access token:', error);
        return this.handleAuthError(
          reply,
          state,
          'token_exchange_failed',
          '获取访问令牌失败'
        );
      }

      // 2. 使用访问令牌获取WPS用户信息
      let wpsUserInfo;
      try {
        wpsUserInfo = await this.wpsApiService.getUserInfo(
          wpsTokenResponse.token.access_token
        );
        this.logger.info('Successfully obtained WPS user info', {
          wpsOpenid: wpsUserInfo.openid,
          wpsNickname: wpsUserInfo.nickname,
          wpsThirdUnionId: wpsUserInfo.third_union_id
        });
      } catch (error) {
        this.logger.error('Failed to get WPS user info:', error);
        return this.handleAuthError(
          reply,
          state,
          'user_info_failed',
          '获取用户信息失败'
        );
      }

      // 3. 根据WPS用户信息查找本地用户
      const userMatchResult =
        await this.userAuthService.findLocalUser(wpsUserInfo);

      if (!userMatchResult.matched || !userMatchResult.user) {
        this.logger.warn('User not found in local database', {
          wpsOpenid: wpsUserInfo.openid,
          wpsNickname: wpsUserInfo.nickname,
          error: userMatchResult.error
        });
        return this.handleAuthError(
          reply,
          state,
          'user_not_found',
          userMatchResult.error || '用户不存在于本地数据库中，请联系管理员'
        );
      }

      // 4. 验证用户访问权限
      const hasAccess = await this.userAuthService.validateUserAccess(
        userMatchResult.user
      );
      if (!hasAccess) {
        this.logger.warn('User access denied', {
          userId: userMatchResult.user.id,
          userType: userMatchResult.user.userType
        });
        return this.handleAuthError(
          reply,
          state,
          'access_denied',
          '用户账户已被禁用或无权限访问'
        );
      }

      const userInfo = userMatchResult.user;

      // 5. 生成JWT token
      const jwtPayload = this.createEnhancedJWTPayload(userInfo);
      const config = this.jwtService.getConfig();
      const jwtToken = this.jwtService.generateToken(jwtPayload, {
        expiresIn: (config.tokenExpiry || '29d') as any
      });

      // 设置安全的HTTP-only cookie
      await this.setAuthCookie(reply, jwtToken);

      // 记录成功日志
      this.logger.info('OAuth authentication successful', {
        userId: userInfo.id,
        name: userInfo.name,
        email: userInfo.email
      });

      const callbackUrl = decodeURIComponent(
        Buffer.from(state, 'base64').toString('utf8')
      );

      // 重定向到回调URL
      const redirectUrl = addUrlParams(callbackUrl, { auth_success: 'true' });
      SafeResponse.safeRedirect(reply, redirectUrl);
    } catch (error) {
      this.logger.error('OAuth authorization callback failed:', error);
      return this.handleAuthError(
        reply,
        request.query.state,
        'callback_failed',
        '认证回调处理失败'
      );
    }
  }

  @Get('/api/auth/cookie')
  async setCookie(request: FastifyRequest, reply: FastifyReply) {
    // 根据提供的userInfo生成JWT token 并设置cookie ，和生产方式一样

    const userInfo = {
      id: '0304062400128',
      name: '高誉宁',
      userType: 'student' as 'student',
      userNumber: '0304062400128',
      collegeName: '统计学院',
      majorName: '数据科学',
      className: '数据科学2401'
    };
    const jwtPayload = this.createEnhancedJWTPayload(userInfo);
    const config = this.jwtService.getConfig();
    const jwtToken = this.jwtService.generateToken(jwtPayload, {
      expiresIn: (config.tokenExpiry || '29d') as any
    });
    await this.setAuthCookie(reply, jwtToken);
    return reply.send({
      success: true,
      message: 'Cookie设置成功'
    });
  }

  /**
   * 验证当前认证状态
   */
  @Get('/api/auth/verify')
  async verifyAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = this.jwtService.extractTokenFromRequest(request);

      if (!token) {
        return reply.code(401).send({
          success: false,
          error: 'NO_TOKEN',
          message: '未找到认证token'
        });
      }

      const validationResult = this.jwtService.verifyToken(token);

      if (!validationResult.valid) {
        return reply.code(401).send({
          success: false,
          error: 'INVALID_TOKEN',
          message: validationResult.error || '无效的token'
        });
      }

      return reply.send({
        success: true,
        user: validationResult.payload,
        message: '认证有效'
      });
    } catch (error) {
      this.logger.error('Auth verification failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'VERIFICATION_ERROR',
        message: '认证验证失败'
      });
    }
  }

  /**
   * 用户登出
   */
  @Post('/api/auth/logout')
  async logout(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = this.jwtService.getConfig();
      const cookieName = config.cookieName || 'wps_jwt_token';

      // 清除认证cookie
      reply.clearCookie(cookieName, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      });

      // 清除过期时间cookie
      reply.clearCookie('wps_auth_expires', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      });

      this.logger.info('User logged out successfully');

      return reply.send({
        success: true,
        message: '登出成功'
      });
    } catch (error) {
      this.logger.error('Logout failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'LOGOUT_ERROR',
        message: '登出失败'
      });
    }
  }

  /**
   * 刷新JWT token
   */
  @Post('/api/auth/refresh')
  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      // 从请求中提取当前token
      const currentToken = this.jwtService.extractTokenFromRequest(request);

      if (!currentToken) {
        return reply.code(401).send({
          success: false,
          error: 'NO_TOKEN',
          message: '未找到认证token'
        });
      }

      // 检查token是否即将过期
      if (!this.jwtService.isTokenExpiringSoon(currentToken)) {
        return reply.send({
          success: true,
          message: 'Token尚未到期，无需刷新',
          refreshed: false
        });
      }

      // 刷新token
      const refreshResult = this.jwtService.refreshToken(currentToken);

      if (!refreshResult.success) {
        return reply.code(401).send({
          success: false,
          error: 'REFRESH_FAILED',
          message: refreshResult.error || 'Token刷新失败'
        });
      }

      // 设置新的认证cookie
      await this.setAuthCookie(reply, refreshResult.newToken!);

      this.logger.info('Token refreshed successfully');

      return reply.send({
        success: true,
        message: 'Token刷新成功',
        refreshed: true
      });
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'REFRESH_ERROR',
        message: 'Token刷新失败'
      });
    }
  }

  /**
   * 设置认证cookie
   */
  private async setAuthCookie(
    reply: FastifyReply,
    jwtToken: string
  ): Promise<void> {
    const config = this.jwtService.getConfig();
    const cookieName = config.cookieName || 'wps_jwt_token';
    const expiresIn = 29 * 24 * 60 * 60 * 1000; // 29天，单位毫秒
    const expiresAt = Date.now() + expiresIn;

    // Cookie配置
    const cookieOptions: CookieOptions = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      signed: true // 启用cookie签名，防止篡改
    };

    // 设置JWT Token cookie（带签名）
    reply.setCookie(cookieName, jwtToken, cookieOptions);

    // 设置兼容性cookie（过期时间）
    reply.setCookie('wps_auth_expires', expiresAt.toString(), cookieOptions);
  }

  /**
   * 处理认证错误
   */
  private handleAuthError(
    reply: FastifyReply,
    state?: string,
    errorType: string = 'unknown',
    errorMessage: string = '认证失败'
  ): void {
    // 防止重复响应：检查响应是否已发送
    if (reply.sent) {
      this.logger.warn('Attempted to handle auth error after response sent', {
        errorType,
        errorMessage
      });
      return;
    }

    let callbackUrl = process.env.APP_URL || 'http://localhost:3000';

    if (state) {
      try {
        callbackUrl = Buffer.from(state, 'base64')
          .toString('utf8')
          .split('||')[0];
      } catch (error) {
        this.logger.warn('Failed to parse state for error redirect');
      }
    }

    const errorRedirectUrl = addUrlParams(callbackUrl, {
      auth_error: errorType,
      error_message: encodeURIComponent(errorMessage)
    });

    SafeResponse.safeRedirect(reply, errorRedirectUrl);
  }

  /**
   * 创建增强的JWT载荷
   * 包含用户类型和详细信息
   */
  private createEnhancedJWTPayload(user: ExtendedAuthenticatedUser) {
    const basePayload = {
      userId: user.id,
      username: user.name,
      userNumber: user.userNumber, // 学号或工号
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      collegeName: user.collegeName, // 学院或部门名称
      roles: [user.userType], // 基础角色
      permissions: ['read'] // 基础权限
    };

    // 根据用户类型添加特定信息
    if (user.userType === 'student' && user.studentInfo) {
      const student = user.studentInfo;
      return {
        ...basePayload,
        studentNumber: user.userNumber, // 学号（从用户信息中获取）
        className: user.className, // 班级名称
        majorName: user.majorName, // 专业名称
        // collegeName 已在 basePayload 中包含
        studentType: student.lx === 1 ? 'undergraduate' : 'graduate', // 本科生/研究生
        grade: student.sznj, // 年级
        enrollmentYear: student.rxnf, // 入学年份
        permissions: ['read', 'student:profile', 'student:courses']
      };
    }

    if (user.userType === 'teacher' && user.teacherInfo) {
      const teacher = user.teacherInfo;
      return {
        ...basePayload,
        employeeNumber: user.userNumber, // 工号（从用户信息中获取）
        departmentName: user.collegeName, // 部门名称（从用户信息中获取）
        title: teacher.zc, // 职称
        education: teacher.zgxl, // 最高学历
        degree: teacher.xw, // 学位
        permissions: [
          'read',
          'teacher:profile',
          'teacher:courses',
          'teacher:students'
        ]
      };
    }

    return basePayload;
  }
}
