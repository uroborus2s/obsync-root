/**
 * JWT认证服务 - 应用级服务
 * 负责JWT token的生成、验证和解析
 * 使用SINGLETON生命周期，全局共享
 */

import jwt from 'jsonwebtoken';
import type { Logger } from '@stratix/core';

/**
 * JWT Token 载荷
 */
export interface JWTPayload {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 用户邮箱 */
  email?: string;
  /** 用户角色 */
  roles?: string[];
  /** 权限列表 */
  permissions?: string[];
  /** 发布时间 */
  iat?: number;
  /** 过期时间 */
  exp?: number;
  /** 发布者 */
  iss?: string;
  /** 受众 */
  aud?: string;
}

/**
 * Token 验证结果
 */
export interface TokenValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 解析后的载荷 */
  payload?: JWTPayload;
  /** 错误信息 */
  error?: string;
  /** 错误类型 */
  errorType?: 'EXPIRED' | 'INVALID' | 'MALFORMED' | 'MISSING';
}

/**
 * 认证配置
 */
export interface AuthConfig {
  /** JWT 密钥 */
  jwtSecret: string;
  /** Token 过期时间 */
  tokenExpiry?: string;
  /** 刷新Token过期时间 */
  refreshTokenExpiry?: string;
  /** Cookie 名称 */
  cookieName?: string;
  /** 白名单路径 */
  excludePaths?: string[];
  /** 是否启用认证 */
  enabled?: boolean;
}

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
  private readonly config: AuthConfig;

  constructor(logger: Logger) {
    // 从环境变量或配置中获取JWT配置
    this.config = {
      jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
      tokenExpiry: process.env.TOKEN_EXPIRY || '1h',
      refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
      cookieName: process.env.COOKIE_NAME || 'wps_jwt_token',
      excludePaths: ['/health', '/metrics', '/docs', '/api/auth/*'],
      enabled: process.env.AUTH_ENABLED !== 'false'
    };

    this.secret = this.config.jwtSecret;
    this.defaultOptions = {
      expiresIn: this.config.tokenExpiry || '1h',
      issuer: 'stratix-gateway',
      audience: 'stratix-app'
    } as jwt.SignOptions;

    logger.info('✅ JWTService initialized with application-level DI');
  }

  /**
   * 生成JWT token
   */
  generateToken(payload: JWTPayload, options?: jwt.SignOptions): string {
    try {
      const signOptions = { ...this.defaultOptions, ...options };
      const token = jwt.sign(payload, this.secret, signOptions);
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

      const payload = jwt.verify(token, this.secret) as JWTPayload;
      
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
      const cookieName = this.config.cookieName || 'wps_jwt_token';
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
      
      return (decoded.exp - now) <= threshold;
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
   * 获取认证配置
   */
  getConfig(): AuthConfig {
    return { ...this.config };
  }
}
