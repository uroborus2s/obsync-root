/**
 * 身份验证工具函数
 * 用于@fastify/http-proxy的preHandler中进行身份验证
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import jwt from 'jsonwebtoken';

/**
 * JWT载荷接口
 */
export interface JWTPayload {
  userId: string;
  userName: string;
  userType: 'student' | 'teacher';
  userNumber: string;
  email?: string;
  phone?: string;
  collegeName?: string;
  majorName?: string;
  className?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * 认证用户信息接口
 */
export interface AuthenticatedUser {
  id: string;
  name: string;
  userType: 'student' | 'teacher';
  userNumber: string;
  email?: string;
  phone?: string;
  collegeName?: string;
  majorName?: string;
  className?: string;
  roles?: string[]; // 用户角色列表
}

/**
 * 从请求中提取JWT token
 */
export function extractTokenFromRequest(
  request: FastifyRequest
): string | null {
  try {
    // 1. 尝试从Authorization header获取
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return token;
    }

    // 2. 尝试从Cookie获取
    const cookieToken = request.cookies?.['wps_jwt_token'];
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 验证JWT token
 */
export function verifyJWTToken(token: string): {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
} {
  try {
    if (!token) {
      return { valid: false, error: 'Token is missing' };
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    const payload = jwt.verify(token, secret) as JWTPayload;

    return { valid: true, payload };
  } catch (error) {
    let errorMessage = 'Invalid token';

    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = 'Token has expired';
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = 'Malformed token';
    }

    return { valid: false, error: errorMessage };
  }
}

/**
 * 检查路径是否在白名单中
 */
export function isWhitelistedPath(path: string): boolean {
  const whitelistPaths = [
    '/health',
    '/metrics',
    '/status',
    '/docs',
    '/swagger',
    '/api/auth/authorization',
    '/api/auth/verify',
    '/api/auth/logout'
  ];

  return whitelistPaths.some((whitelistPath) => {
    // 支持通配符匹配
    if (whitelistPath.endsWith('*')) {
      const prefix = whitelistPath.slice(0, -1);
      return path.startsWith(prefix);
    }
    // 精确匹配
    return path === whitelistPath;
  });
}

/**
 * 创建身份验证preHandler
 * 用于@fastify/http-proxy的preHandler选项
 * 优化版本：添加性能监控、错误处理和缓存机制
 */
export function createAuthPreHandler() {
  // Token验证结果缓存（短期缓存，避免重复验证）
  const tokenCache = new Map<
    string,
    { user: AuthenticatedUser; expiry: number }
  >();
  const CACHE_TTL = 60000; // 1分钟缓存

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    const requestPath = request.url.split('?')[0]; // 移除查询参数

    try {
      // 添加开始时间到请求上下文，用于性能监控
      (request as any).startTime = startTime;

      // 检查是否为白名单路径
      if (isWhitelistedPath(requestPath)) {
        request.log.debug('Skipping authentication for whitelisted path', {
          path: requestPath,
          duration: Date.now() - startTime
        });
        return;
      }

      // 提取token
      const token = extractTokenFromRequest(request);
      if (!token) {
        request.log.warn('Missing authentication token', {
          path: requestPath,
          duration: Date.now() - startTime
        });
        return reply.code(401).send({
          success: false,
          error: 'MISSING_TOKEN',
          message: '未找到认证token，请先登录',
          timestamp: new Date().toISOString()
        });
      }

      // 检查缓存
      const cached = tokenCache.get(token);
      if (cached && cached.expiry > Date.now()) {
        (request as any).user = cached.user;
        request.log.debug('Authentication successful (cached)', {
          path: requestPath,
          userId: cached.user.id,
          userType: cached.user.userType,
          duration: Date.now() - startTime
        });
        return;
      }

      // 验证token
      const validationResult = verifyJWTToken(token);
      if (!validationResult.valid) {
        request.log.warn('Invalid authentication token', {
          path: requestPath,
          error: validationResult.error,
          duration: Date.now() - startTime
        });

        // 清除缓存中的无效token
        tokenCache.delete(token);

        // 清除无效的cookie
        reply.clearCookie('wps_jwt_token').clearCookie('wps_auth_expires');

        return reply.code(401).send({
          success: false,
          error: 'INVALID_TOKEN',
          message: validationResult.error || '无效的认证token',
          timestamp: new Date().toISOString()
        });
      }

      // 构建用户信息
      const user: AuthenticatedUser = {
        id: validationResult.payload!.userId,
        name: validationResult.payload!.userName,
        userType: validationResult.payload!.userType,
        userNumber: validationResult.payload!.userNumber,
        email: validationResult.payload!.email,
        phone: validationResult.payload!.phone,
        collegeName: validationResult.payload!.collegeName,
        majorName: validationResult.payload!.majorName,
        className: validationResult.payload!.className
      };

      // 🔧 修复：改进缓存管理机制
      // 先清理过期缓存，再添加新缓存
      const now = Date.now();

      // 定期清理过期缓存（每100次请求清理一次，而不是随机）
      if (tokenCache.size % 100 === 0) {
        for (const [key, value] of tokenCache.entries()) {
          if (value.expiry <= now) {
            tokenCache.delete(key);
          }
        }
      }

      // 如果缓存仍然太大，清理最老的条目
      if (tokenCache.size >= 1000) {
        const entries = Array.from(tokenCache.entries());
        entries.sort((a, b) => a[1].expiry - b[1].expiry);
        // 删除最老的20%条目
        const deleteCount = Math.floor(entries.length * 0.2);
        for (let i = 0; i < deleteCount; i++) {
          tokenCache.delete(entries[i][0]);
        }
      }

      // 添加新的缓存条目
      tokenCache.set(token, {
        user,
        expiry: Date.now() + CACHE_TTL
      });

      (request as any).user = user;

      request.log.debug('Authentication successful', {
        path: requestPath,
        userId: user.id,
        userType: user.userType,
        duration: Date.now() - startTime
      });
    } catch (error) {
      request.log.error('Authentication error', {
        path: requestPath,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });

      return reply.code(500).send({
        success: false,
        error: 'AUTHENTICATION_ERROR',
        message: '认证过程中发生错误',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * 创建请求头重写函数
 * 用于@fastify/http-proxy的replyOptions.rewriteRequestHeaders
 * 优化版本：添加错误处理、性能优化和缓存机制
 */
export function createRequestHeadersRewriter() {
  // 缓存编码结果以提高性能
  const encodingCache = new Map<string, string>();

  function safeEncodeURIComponent(value: string): string {
    if (!value) return '';

    // 检查缓存
    if (encodingCache.has(value)) {
      return encodingCache.get(value)!;
    }

    try {
      const encoded = encodeURIComponent(value);
      // 限制缓存大小，避免内存泄漏
      if (encodingCache.size < 1000) {
        encodingCache.set(value, encoded);
      }
      return encoded;
    } catch (error) {
      console.warn('Failed to encode URI component:', value, error);
      return value; // 返回原始值作为后备
    }
  }

  return (originalReq: any, headers: Record<string, string | string[]>) => {
    try {
      const newHeaders = { ...headers };

      // 如果用户已认证，添加用户信息到请求头
      if (originalReq.user) {
        const user = originalReq.user as AuthenticatedUser;

        // 验证必需字段
        if (!user.id || !user.name || !user.userType) {
          originalReq.log?.warn('Incomplete user information in request', {
            userId: user.id,
            hasName: !!user.name,
            hasUserType: !!user.userType
          });
        }

        // 添加核心用户信息到请求头
        if (user.id) newHeaders['x-user-id'] = user.id;
        if (user.name)
          newHeaders['x-user-name'] = safeEncodeURIComponent(user.name);
        if (user.userType) newHeaders['x-user-type'] = user.userType;
        if (user.userNumber) newHeaders['x-user-number'] = user.userNumber;

        // 添加可选用户信息
        if (user.email) newHeaders['x-user-email'] = user.email;
        if (user.phone) newHeaders['x-user-phone'] = user.phone;
        if (user.collegeName)
          newHeaders['x-user-college'] = safeEncodeURIComponent(
            user.collegeName
          );
        if (user.majorName)
          newHeaders['x-user-major'] = safeEncodeURIComponent(user.majorName);
        if (user.className)
          newHeaders['x-user-class'] = safeEncodeURIComponent(user.className);

        // 添加用户权限信息（如果存在）
        if (user.roles && Array.isArray(user.roles)) {
          newHeaders['x-user-roles'] = JSON.stringify(user.roles);
        }
      }

      // 添加网关信息
      newHeaders['x-gateway'] = 'stratix-gateway';
      newHeaders['x-gateway-version'] = process.env.GATEWAY_VERSION || '1.0.0';
      newHeaders['x-gateway-timestamp'] = new Date().toISOString();

      // 添加请求追踪ID（如果不存在）
      if (!newHeaders['x-request-id']) {
        newHeaders['x-request-id'] =
          `gw-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      }

      // 添加转发信息
      if (originalReq.ip) {
        newHeaders['x-forwarded-for'] = originalReq.ip;
      }
      if (originalReq.protocol) {
        newHeaders['x-forwarded-proto'] = originalReq.protocol;
      }
      if (originalReq.hostname) {
        newHeaders['x-forwarded-host'] = originalReq.hostname;
      }

      return newHeaders;
    } catch (error) {
      // 错误处理：记录错误但不中断请求
      originalReq.log?.error('Error in request headers rewriter', error);

      // 返回基本头部信息
      return {
        ...headers,
        'x-gateway': 'stratix-gateway',
        'x-gateway-timestamp': new Date().toISOString(),
        'x-request-id': `gw-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        'x-error': 'header-rewrite-failed'
      };
    }
  };
}
