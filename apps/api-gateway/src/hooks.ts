import { FastifyInstance } from '@stratix/core';

import circuitBreaker from '@fastify/circuit-breaker';
import httpProxy from '@fastify/http-proxy';
import { asValue, FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import JWTService from './services/JWTService.js';
import type {
  GatewayServicesList,
  JWTPayload,
  UserIdentity
} from './types/gateway.js';
/**
 * 将JWT载荷转换为用户身份信息
 */
function convertPayloadToIdentity(payload: JWTPayload): UserIdentity {
  return {
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
}

/**
 * 处理可能包含汉字的请求头值
 * 只对特定的几个请求头进行URL编码处理
 *
 * @param value - 原始值
 * @returns URL编码后的值
 */
function encodeChineseHeaderValue(value: string): string {
  if (!value) return '';

  // 移除控制字符
  const cleaned = value
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/[\r\n]/g, '')
    .trim();

  if (!cleaned) return '';

  // 直接进行URL编码（对汉字和特殊字符都有效）
  try {
    return encodeURIComponent(cleaned);
  } catch (error) {
    return '';
  }
}

/**
 * 生成身份信息Headers（明文，内网使用）
 * 自动处理包含汉字等非ASCII字符的值
 */
function generateIdentityHeaders(
  identity: UserIdentity,
  logger: Logger
): Record<string, string> {
  try {
    const headers: Record<string, string> = {};

    // 基础用户信息 - 只有用户名可能包含汉字
    if (identity.userId) {
      headers['X-User-Id'] = identity.userId;
    }
    if (identity.username) {
      headers['X-User-Name'] = encodeChineseHeaderValue(identity.username);
    }
    if (identity.userType) {
      headers['X-User-Type'] = identity.userType;
    }
    if (identity.userNumber) {
      headers['X-User-Number'] = identity.userNumber;
    }
    if (identity.email) {
      headers['X-User-Email'] = identity.email;
    }
    if (identity.phone) {
      headers['X-User-Phone'] = identity.phone;
    }

    // 学院信息 - 这些字段包含汉字，需要URL编码
    if (identity.collegeName) {
      headers['X-User-College'] = encodeChineseHeaderValue(
        identity.collegeName
      );
    }
    if (identity.majorName) {
      headers['X-User-Major'] = encodeChineseHeaderValue(identity.majorName);
    }
    if (identity.className) {
      headers['X-User-Class'] = encodeChineseHeaderValue(identity.className);
    }

    // 权限信息（JSON格式）- 角色和权限可能包含汉字，需要编码
    if (identity.roles && identity.roles.length > 0) {
      try {
        headers['X-User-Roles'] = JSON.stringify(identity.roles);
      } catch (error) {
        logger.warn('Failed to serialize user roles', {
          roles: identity.roles,
          error
        });
      }
    }
    if (identity.permissions && identity.permissions.length > 0) {
      try {
        headers['X-User-Permissions'] = JSON.stringify(identity.permissions);
      } catch (error) {
        logger.warn('Failed to serialize user permissions', {
          permissions: identity.permissions,
          error
        });
      }
    }

    // 请求时间戳（用于日志追踪）
    headers['X-Request-Timestamp'] = new Date().toISOString();

    logger.debug('Generated identity headers for internal network', {
      userId: identity.userId,
      headersCount: Object.keys(headers).length
    });

    return headers;
  } catch (error) {
    logger.error('Failed to generate identity headers', error);
    return {};
  }
}

/**
 * 创建认证预处理器
 * 增强错误处理和上下文安全检查，防止重复响应
 */
export async function authPreHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // 防止重复响应：检查响应是否已发送
  if (reply.sent) {
    return;
  }

  try {
    // 安全检查：确保请求上下文完整
    if (!request || !request.diScope) {
      request?.log?.error(
        'Request context or diScope not available in authPreHandler'
      );
      if (!reply.sent) {
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Request context not available',
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    // 从DI容器获取JWTService
    let jwtService;
    try {
      jwtService = request.diScope.resolve('jwtService') as JWTService;
    } catch (error) {
      request.log.error('Failed to resolve jwtService from diScope', error);
      if (!reply.sent) {
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Authentication service not available',
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    const token = jwtService.extractTokenFromRequest(request);

    if (!token) {
      if (!reply.sent) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication token required',
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    const result = jwtService.verifyToken(token);

    if (!result.valid) {
      if (!reply.sent) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: result.error || 'Invalid token',
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    // 安全地注册用户载荷到diScope
    try {
      request.diScope.register({
        userPayload: asValue(result.payload)
      });

      request.log.debug('User payload registered to diScope', {
        userId: result.payload?.userId,
        url: request.url,
        method: request.method
      });
    } catch (error) {
      request.log.error('Failed to register userPayload to diScope', error);
      if (!reply.sent) {
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to process authentication',
          timestamp: new Date().toISOString()
        });
      }
      return;
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // 使用更安全的日志记录
    if (request?.log) {
      request.log.error('Authentication failed', {
        error: errorMessage,
        url: request.url,
        method: request.method
      });
    } else {
      console.error('Authentication failed:', errorMessage);
    }

    if (!reply.sent) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * 创建身份信息转发预处理器
 * 从diScope中获取已验证的用户载荷，避免重复JWT解析
 * 增强错误处理和上下文安全检查，防止重复响应
 */
export async function identityForwardPreHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // 防止重复响应：检查响应是否已发送
  if (reply.sent) {
    return;
  }

  try {
    // 安全检查：确保请求上下文完整
    if (!request || !request.diScope) {
      request?.log?.warn(
        'Request context or diScope not available, skipping identity forwarding'
      );
      return;
    }

    // 安全检查：确保日志对象可用
    if (!request.log) {
      console.warn('Request log not available in identityForwardPreHandler');
      return;
    }

    // 从diScope中获取已验证的用户载荷
    let userPayload: JWTPayload;
    try {
      userPayload = request.diScope.resolve('userPayload');
    } catch (error) {
      // 如果没有userPayload，说明认证失败或是白名单路径，跳过身份转发
      request.log.debug(
        'No userPayload found in diScope, skipping identity forwarding',
        {
          url: request.url,
          method: request.method
        }
      );
      return;
    }

    if (!userPayload) {
      // userPayload为空，跳过身份转发
      request.log.debug(
        'UserPayload is null/undefined, skipping identity forwarding'
      );
      return;
    }

    // 将JWT载荷转换为UserIdentity格式
    const userIdentity = convertPayloadToIdentity(userPayload);

    // 生成身份信息Headers
    const identityHeaders = generateIdentityHeaders(
      userIdentity,
      request.log as Logger
    );

    // 将身份Headers添加到请求中
    if (Object.keys(identityHeaders).length > 0) {
      // 确保headers对象存在
      if (!request.headers) {
        request.headers = {};
      }

      // 添加身份信息Headers
      Object.assign(request.headers, identityHeaders);

      request.log.debug('Added identity headers to request', {
        userId: userIdentity.userId,
        headersCount: Object.keys(identityHeaders).length,
        url: request.url,
        method: request.method
      });
    }
  } catch (error) {
    // 身份转发失败不应该阻断请求，只记录错误
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 使用更安全的日志记录
    if (request?.log) {
      request.log.error('Identity forwarding failed', {
        error: errorMessage,
        stack: errorStack,
        url: request.url,
        method: request.method
      });
    } else {
      console.error('Identity forwarding failed:', {
        error: errorMessage,
        stack: errorStack,
        url: request?.url,
        method: request?.method
      });
    }
  }
}

/**
 * 初始化默认代理服务
 *
 * @param services - 网关服务配置列表，包含服务名称和代理配置
 * @returns 返回符合 Stratix 框架 afterFastifyCreated 钩子规范的函数
 *
 * @example
 * ```typescript
 * const services: GatewayServicesList = [
 *   {
 *     name: 'workflows',
 *     config: {
 *       name: 'workflows',
 *       upstream: 'http://localhost:3001',
 *       prefix: '/api/workflows',
 *       rewritePrefix: '/api/workflows',
 *       requireAuth: true,
 *       timeout: 30000,
 *       retries: 3,
 *       httpMethods: ['GET', 'POST', 'PUT', 'DELETE'],
 *       preHandlers: [authPreHandler, identityForwardPreHandler]
 *     }
 *   }
 * ];
 *
 * // 在 stratix.config.ts 中使用
 * hooks: {
 *   afterFastifyCreated: createAfterFastifyCreated(services)
 * }
 * ```
 */
export const createAfterFastifyCreated =
  (
    services: GatewayServicesList
  ): ((instance: FastifyInstance) => Promise<void>) =>
  async (instance: FastifyInstance) => {
    instance.log.info(`Initializing proxy for ${services.length} services`);

    await instance.register(circuitBreaker, {
      threshold: 5, // 失败阈值：5次失败后打开断路器
      timeout: 3000, // 超时时间：3秒未响应视为失败
      resetTimeout: 10000, // 重置时间：10秒后从打开状态转为半开状态
      timeoutErrorMessage: '请求超时',
      circuitOpenErrorMessage: '服务暂时不可用，请稍后再试'
    });

    // 为每个服务创建代理路由
    for (const { name, config } of services) {
      try {
        instance.log.info(`Setting up proxy for service: ${name}`);

        // 注册代理路由 - 增强错误处理和安全性
        await instance.register(httpProxy as any, {
          upstream: config.upstream,
          prefix: config.prefix,
          rewritePrefix: config.rewritePrefix,
          http2: false,
          preHandler: config.requireAuth
            ? [...config.preHandlers!, instance.circuitBreaker()]
            : undefined,
          timeout: config.timeout || 30000,
          httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          // 增强错误处理 - 防止重复响应
          replyOptions: {
            onError: (reply: any, error: any) => {
              // 防止重复响应：检查响应是否已发送
              if (reply.sent) {
                instance.log.warn('Attempted to send response after already sent', {
                  error: error.message,
                  service: name,
                  upstream: config.upstream
                });
                return;
              }

              instance.log.error('Proxy error occurred', {
                error: error.message,
                stack: error.stack,
                service: name,
                upstream: config.upstream
              });

              try {
                // 返回标准化的错误响应
                reply.code(502).send({
                  error: 'Bad Gateway',
                  message: 'Upstream service unavailable',
                  service: name,
                  timestamp: new Date().toISOString()
                });
              } catch (sendError) {
                instance.log.error('Failed to send error response', {
                  originalError: error.message,
                  sendError: sendError instanceof Error ? sendError.message : sendError,
                  service: name
                });
              }
            }
          },
          // 增强请求处理
          beforeHandler: (request: any, reply: any, next: any) => {
            // 防止重复响应：检查响应是否已发送
            if (reply.sent) {
              instance.log.warn('Request already handled, skipping beforeHandler', {
                method: request.method,
                url: request.url,
                service: name
              });
              return next();
            }

            try {
              // 添加请求追踪
              request.log.info('Proxying request', {
                method: request.method,
                url: request.url,
                service: name,
                upstream: config.upstream
              });
              next();
            } catch (error) {
              instance.log.error('Error in beforeHandler', {
                error: error instanceof Error ? error.message : error,
                service: name
              });
              next(error);
            }
          }
        });

        instance.log.info(
          `✅ Proxy setup completed for ${name}: ${config.prefix} -> ${config.upstream}`
        );
      } catch (error) {
        instance.log.error(`❌ Failed to setup proxy for ${name}:`, error);
        throw error;
      }
    }
    instance.log.info('🚀 Proxy plugin initialization completed');
  };
