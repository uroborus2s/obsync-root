/**
 * 认证控制器
 * 处理OAuth认证流程，包括授权回调和cookie管理
 */

import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import type { IJWTService } from '../services/JWTService.js';
import type { AuthConfig, AuthRequest, CookieOptions } from '../types/auth.js';

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
    private jwtService: IJWTService,
    private config: AuthConfig,
    private logger: Logger
  ) {}

  /**
   * 处理OAuth授权回调
   * 参考icalink-api的handleAuthCode方法实现
   */
  @Get('/api/auth/authorization')
  async handleAuthorizationCallback(
    request: FastifyRequest<{ Querystring: AuthRequest }>,
    reply: FastifyReply
  ): Promise<void> {
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
        return reply.code(400).send({
          success: false,
          error: 'MISSING_CODE',
          message: '缺少授权码'
        });
      }

      if (!state) {
        this.logger.error('Missing state parameter');
        return reply.code(400).send({
          success: false,
          error: 'MISSING_STATE',
          message: '缺少state参数'
        });
      }

      // 解析state参数获取回调URL
      let callbackUrl: string;
      let authType = 'web';

      try {
        const decodedState = Buffer.from(state, 'base64').toString('utf8');
        const parts = decodedState.split('||');
        callbackUrl = parts[0];

        if (parts.length > 1) {
          const typeParam = parts[1];
          if (typeParam.includes('type=')) {
            authType = typeParam.split('=')[1];
          }
        }
      } catch (error) {
        this.logger.error('Failed to decode state parameter:', error);
        return reply.code(400).send({
          success: false,
          error: 'INVALID_STATE',
          message: 'state参数格式错误'
        });
      }

      // 这里应该调用实际的OAuth服务来交换token
      // 由于这是网关，我们假设已经有了用户信息
      // 在实际实现中，需要调用对应的OAuth服务
      const userInfo = await this.exchangeCodeForUserInfo(code, authType);

      if (!userInfo) {
        this.logger.error('Failed to exchange code for user info');
        return this.handleAuthError(
          reply,
          state,
          'exchange_failed',
          '获取用户信息失败'
        );
      }

      // 生成JWT token
      const jwtPayload = this.jwtService.createPayload(userInfo);
      const jwtToken = this.jwtService.generateToken(jwtPayload, {
        expiresIn: (this.config.tokenExpiry || '29d') as any
      });

      // 设置安全的HTTP-only cookie
      await this.setAuthCookie(reply, jwtToken);

      // 记录成功日志
      this.logger.info('OAuth authentication successful', {
        userId: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        authType
      });

      // 重定向到回调URL
      const redirectUrl = addUrlParams(callbackUrl, { auth_success: 'true' });
      return reply.redirect(redirectUrl);
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

  /**
   * 验证当前认证状态
   */
  @Get('/api/auth/verify')
  async verifyAuth(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
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
  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const cookieName = this.config.cookieName || 'wps_jwt_token';

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
   * 设置认证cookie
   */
  private async setAuthCookie(
    reply: FastifyReply,
    jwtToken: string
  ): Promise<void> {
    const cookieName = this.config.cookieName || 'wps_jwt_token';
    const expiresIn = 29 * 24 * 60 * 60 * 1000; // 29天，单位毫秒
    const expiresAt = Date.now() + expiresIn;

    // Cookie配置
    const cookieOptions: CookieOptions = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...this.config.cookieOptions
    };

    // 设置JWT Token cookie
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

    reply.redirect(errorRedirectUrl);
  }

  /**
   * 交换授权码获取用户信息
   * 这里需要根据实际的OAuth服务实现
   */
  private async exchangeCodeForUserInfo(
    code: string,
    authType: string
  ): Promise<any> {
    // TODO: 实现实际的OAuth token交换逻辑
    // 这里返回模拟数据，实际应该调用OAuth服务

    this.logger.info('Exchanging code for user info', { code, authType });

    // 模拟用户信息（实际应该从OAuth服务获取）
    return {
      id: 'user_' + Date.now(),
      name: 'Test User',
      email: 'test@example.com',
      avatar: '',
      roles: ['user'],
      permissions: ['read']
    };
  }
}
