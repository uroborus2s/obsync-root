/**
 * JWT认证服务
 * 负责JWT token的生成、验证和解析
 */

import type { Logger } from '@stratix/core';
import jwt from 'jsonwebtoken';
import type {
  AuthConfig,
  JWTPayload,
  TokenValidationResult
} from '../types/auth.js';

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
}

export default class JWTService implements IJWTService {
  private readonly secret: string;
  private readonly defaultOptions: jwt.SignOptions;

  constructor(
    private config: AuthConfig,
    private logger: Logger
  ) {
    this.secret = config.jwtSecret;
    this.defaultOptions = {
      expiresIn: config.tokenExpiry || '1h',
      issuer: 'stratix-gateway',
      audience: 'stratix-app'
    } as jwt.SignOptions;
  }

  /**
   * 生成JWT token
   */
  generateToken(payload: JWTPayload, options?: jwt.SignOptions): string {
    try {
      const signOptions = { ...this.defaultOptions, ...options };
      const token = jwt.sign(payload, this.secret, signOptions);

      this.logger.debug('JWT token generated successfully', {
        userId: payload.userId,
        expiresIn: signOptions.expiresIn
      });

      return token;
    } catch (error) {
      this.logger.error('Failed to generate JWT token:', error);
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

      const payload = jwt.verify(token, this.secret) as JWTPayload;

      this.logger.debug('JWT token verified successfully', {
        userId: payload.userId
      });

      return {
        valid: true,
        payload
      };
    } catch (error) {
      this.logger.warn('JWT token verification failed:', error);

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
      this.logger.warn('Failed to decode JWT token:', error);
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
        this.logger.debug('Token extracted from Authorization header');
        return token;
      }

      // 2. 尝试从Cookie获取
      const cookieName = this.config.cookieName || 'wps_jwt_token';
      const cookieToken = request.cookies?.[cookieName];
      if (cookieToken) {
        this.logger.debug('Token extracted from cookie');
        return cookieToken;
      }

      this.logger.debug('No token found in request');
      return null;
    } catch (error) {
      this.logger.error('Error extracting token from request:', error);
      return null;
    }
  }

  /**
   * 检查token是否即将过期
   */
  isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      const threshold = thresholdMinutes * 60;

      return decoded.exp - now <= threshold;
    } catch (error) {
      this.logger.warn('Error checking token expiration:', error);
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
}
