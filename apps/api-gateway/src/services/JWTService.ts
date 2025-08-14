/**
 * JWT认证服务 - 应用级服务
 * 负责JWT token的生成、验证和解析
 * 使用SINGLETON生命周期，全局共享
 */

import { AwilixContainer, RESOLVER, type Logger } from '@stratix/core';
import jwt from 'jsonwebtoken';
import type {
  AuthConfig,
  JWTPayload,
  TokenValidationResult,
  UserIdentity
} from '../types/gateway.js';

export interface IJWTService {
  /**
   * 生成JWT token
   */
  generateToken(payload: JWTPayload, options?: jwt.SignOptions): string;

  /**
   * 验证JWT token
   */
  verifyToken(token: string): TokenValidationResult;

  /**
   * 解析JWT token（不验证签名）
   */
  decodeToken(token: string): JWTPayload | null;

  /**
   * 从请求中提取token
   */
  extractTokenFromRequest(request: any): string | null;

  /**
   * 创建JWT载荷
   */
  createPayload(userInfo: any): JWTPayload;

  /**
   * 检查token是否即将过期（剩余有效期少于7天）
   */
  isTokenExpiringSoon(token: string): boolean;

  /**
   * 刷新JWT token
   */
  refreshToken(token: string): {
    success: boolean;
    newToken?: string;
    error?: string;
  };

  /**
   * 获取配置信息
   */
  getConfig(): AuthConfig;

  /**
   * 从JWT token中提取用户身份信息
   */
  extractUserIdentity(token: string): {
    success: boolean;
    identity?: UserIdentity;
    error?: string;
  };
}

export default class JWTService implements IJWTService {
  private readonly defaultOptions: jwt.SignOptions;

  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      const orgOptions = container.resolve('options');
      return { options: orgOptions.jwt || {} };
    }
  };

  constructor(
    private logger: Logger,
    private options: AuthConfig
  ) {
    this.defaultOptions = {
      expiresIn: this.options.tokenExpiry || '29d',
      issuer: 'stratix-gateway',
      audience: 'stratix-app'
    } as jwt.SignOptions;

    this.logger.info('✅ JWTService initialized with application-level DI');
  }

  /**
   * 生成JWT token
   */
  generateToken(payload: JWTPayload, options?: jwt.SignOptions): string {
    try {
      const signOptions = { ...this.defaultOptions, ...options };
      const token = jwt.sign(payload, this.options.jwtSecret, signOptions);
      return token;
    } catch (error) {
      throw new Error('Token generation failed');
    }
  }

  /**
   * 验证JWT token
   */
  verifyToken(token: string): TokenValidationResult {
    try {
      if (!token) {
        return {
          valid: false,
          error: 'Token is missing',
          errorType: 'MISSING'
        };
      }

      const payload = jwt.verify(token, this.options.jwtSecret) as JWTPayload;

      return {
        valid: true,
        payload
      };
    } catch (error) {
      let errorType: TokenValidationResult['errorType'] = 'INVALID';
      let errorMessage = 'Invalid token';

      if (error instanceof jwt.TokenExpiredError) {
        errorType = 'EXPIRED';
        errorMessage = 'Token has expired';
      } else if (error instanceof jwt.JsonWebTokenError) {
        errorType = 'MALFORMED';
        errorMessage = 'Malformed token';
      }

      return {
        valid: false,
        error: errorMessage,
        errorType
      };
    }
  }

  /**
   * 解析JWT token（不验证签名）
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * 从请求中提取token
   * 支持从Authorization header和Cookie中获取
   */
  extractTokenFromRequest(request: any): string | null {
    try {
      // 1. 尝试从Authorization header获取
      const authHeader = request.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return token;
      }

      // 2. 尝试从Cookie获取
      const cookieName = this.options.cookieName || 'wps_jwt_token';
      const cookieToken = request.cookies?.[cookieName];
      if (cookieToken) {
        return cookieToken;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查token是否即将过期（剩余有效期少于7天）
   */
  isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      const sevenDaysInSeconds = 7 * 24 * 60 * 60; // 7天的秒数

      return decoded.exp - now <= sevenDaysInSeconds;
    } catch (error) {
      return false;
    }
  }

  /**
   * 创建JWT载荷
   */
  createPayload(userInfo: any): JWTPayload {
    return {
      userId: userInfo.id || userInfo.userId,
      username: userInfo.name || userInfo.username,
      email: userInfo.email,
      roles: userInfo.roles || [],
      permissions: userInfo.permissions || []
    };
  }

  /**
   * 刷新JWT token
   */
  refreshToken(token: string): {
    success: boolean;
    newToken?: string;
    error?: string;
  } {
    try {
      // 验证当前token
      const validationResult = this.verifyToken(token);

      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error || 'Invalid token'
        };
      }

      // 获取原有载荷
      const payload = validationResult.payload!;

      // 创建新的载荷（移除时间相关字段，让JWT库重新生成）
      const newPayload: JWTPayload = {
        userId: payload.userId,
        username: payload.username,
        userName: payload.userName,
        userType: payload.userType,
        userNumber: payload.userNumber,
        email: payload.email,
        phone: payload.phone,
        collegeName: payload.collegeName,
        majorName: payload.majorName,
        className: payload.className,
        roles: payload.roles,
        permissions: payload.permissions
      };

      // 生成新token
      const newToken = this.generateToken(newPayload);

      return {
        success: true,
        newToken
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  /**
   * 获取认证配置
   */
  getConfig(): AuthConfig {
    return { ...this.options };
  }

  /**
   * 从JWT token中提取用户身份信息
   */
  extractUserIdentity(token: string): {
    success: boolean;
    identity?: UserIdentity;
    error?: string;
  } {
    try {
      // 验证token有效性
      const validationResult = this.verifyToken(token);

      if (!validationResult.valid || !validationResult.payload) {
        return {
          success: false,
          error: validationResult.error || 'Invalid token'
        };
      }

      const payload = validationResult.payload;

      // 构造用户身份信息
      const identity: UserIdentity = {
        userId: payload.userId,
        username: payload.username || payload.userName,
        userType: payload.userType,
        userNumber: payload.userNumber,
        email: payload.email,
        phone: payload.phone,
        collegeName: payload.collegeName,
        majorName: payload.majorName,
        className: payload.className,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        timestamp: Math.floor(Date.now() / 1000)
      };

      return {
        success: true,
        identity
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to extract user identity'
      };
    }
  }
}
