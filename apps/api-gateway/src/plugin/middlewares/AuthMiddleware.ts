/**
 * 认证中间件
 * 负责验证JWT token，处理未认证请求
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Logger } from '@stratix/core';
import type { IJWTService } from '../services/JWTService.js';
import type { AuthConfig } from '../types/auth.js';

export interface IAuthMiddleware {
  /**
   * 认证中间件处理函数
   */
  authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;

  /**
   * 检查路径是否在白名单中
   */
  isWhitelistPath(path: string): boolean;
}

export default class AuthMiddleware implements IAuthMiddleware {
  private readonly excludePaths: string[];

  constructor(
    private jwtService: IJWTService,
    private config: AuthConfig,
    private logger: Logger
  ) {
    this.excludePaths = config.excludePaths || [
      '/health',
      '/metrics',
      '/docs',
      '/api/auth/*'
    ];
  }

  /**
   * 认证中间件处理函数
   */
  async authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // 检查认证是否启用
      if (!this.config.enabled) {
        this.logger.debug('Authentication is disabled, skipping auth check');
        return;
      }

      // 检查是否为白名单路径
      const requestPath = request.url.split('?')[0];
      if (this.isWhitelistPath(requestPath)) {
        this.logger.debug(`Skipping auth check for whitelisted path: ${requestPath}`);
        return;
      }

      // 提取token
      const token = this.jwtService.extractTokenFromRequest(request);
      if (!token) {
        this.logger.warn(`Unauthenticated access attempt: ${requestPath}`, {
          ip: request.ip,
          userAgent: request.headers['user-agent']
        });

        return reply.code(401).send({
          success: false,
          error: 'UNAUTHENTICATED',
          message: '用户未认证，请先登录',
          code: 'AUTH_TOKEN_MISSING'
        });
      }

      // 验证token
      const validationResult = this.jwtService.verifyToken(token);
      if (!validationResult.valid) {
        this.logger.warn(`Invalid token access attempt: ${requestPath}`, {
          error: validationResult.error,
          errorType: validationResult.errorType,
          ip: request.ip
        });

        const errorCode = this.getErrorCode(validationResult.errorType);
        const errorMessage = this.getErrorMessage(validationResult.errorType);

        return reply.code(401).send({
          success: false,
          error: 'UNAUTHENTICATED',
          message: errorMessage,
          code: errorCode
        });
      }

      // 将用户信息添加到请求上下文
      (request as any).user = validationResult.payload;
      (request as any).token = token;

      this.logger.debug(`Authentication successful for user: ${validationResult.payload?.userId}`, {
        path: requestPath,
        userId: validationResult.payload?.userId
      });

    } catch (error) {
      this.logger.error('Authentication middleware error:', error);
      
      return reply.code(500).send({
        success: false,
        error: 'INTERNAL_ERROR',
        message: '认证服务内部错误',
        code: 'AUTH_INTERNAL_ERROR'
      });
    }
  }

  /**
   * 检查路径是否在白名单中
   */
  isWhitelistPath(path: string): boolean {
    return this.excludePaths.some(excludePath => {
      // 支持通配符匹配
      if (excludePath.endsWith('*')) {
        const prefix = excludePath.slice(0, -1);
        return path.startsWith(prefix);
      }
      
      // 精确匹配
      return path === excludePath;
    });
  }

  /**
   * 获取错误代码
   */
  private getErrorCode(errorType?: string): string {
    switch (errorType) {
      case 'EXPIRED':
        return 'AUTH_TOKEN_EXPIRED';
      case 'INVALID':
        return 'AUTH_TOKEN_INVALID';
      case 'MALFORMED':
        return 'AUTH_TOKEN_MALFORMED';
      case 'MISSING':
        return 'AUTH_TOKEN_MISSING';
      default:
        return 'AUTH_TOKEN_ERROR';
    }
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(errorType?: string): string {
    switch (errorType) {
      case 'EXPIRED':
        return 'Token已过期，请重新登录';
      case 'INVALID':
        return 'Token无效，请重新登录';
      case 'MALFORMED':
        return 'Token格式错误，请重新登录';
      case 'MISSING':
        return '缺少认证Token，请先登录';
      default:
        return '认证失败，请重新登录';
    }
  }

  /**
   * 添加白名单路径
   */
  addWhitelistPath(path: string): void {
    if (!this.excludePaths.includes(path)) {
      this.excludePaths.push(path);
      this.logger.info(`Added whitelist path: ${path}`);
    }
  }

  /**
   * 移除白名单路径
   */
  removeWhitelistPath(path: string): void {
    const index = this.excludePaths.indexOf(path);
    if (index > -1) {
      this.excludePaths.splice(index, 1);
      this.logger.info(`Removed whitelist path: ${path}`);
    }
  }

  /**
   * 获取当前白名单路径
   */
  getWhitelistPaths(): string[] {
    return [...this.excludePaths];
  }
}
