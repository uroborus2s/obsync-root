/**
 * @stratix/gateway 代理插件
 * 基于 @fastify/http-proxy 的企业级代理转发实现
 * 使用 withRegisterAutoDI 高阶函数集成 Stratix 框架
 */

import httpProxy from '@fastify/http-proxy';
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from '@stratix/core';
import { withRegisterAutoDI } from '@stratix/core';
import {
  initializeProxyServices,
  proxyManager
} from '../services/ProxyManager.js';
import { extractTokenFromRequest, verifyJWTToken } from '../utils/authUtils.js';
import { recordProxyMetrics } from '../utils/metrics.js';

/**
 * 创建认证预处理器
 */
function createAuthPreHandler() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractTokenFromRequest(request);

    if (!token) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication token required',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const result = verifyJWTToken(token);
      if (!result.valid) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: result.error || 'Invalid token',
          timestamp: new Date().toISOString()
        });
      }
      (request as any).user = result.payload;
    } catch (error) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * 创建请求头重写器
 */
function createRequestHeadersRewriter() {
  return (originalReq: FastifyRequest, headers: Record<string, string>) => ({
    ...headers,
    'x-user-id': (originalReq as any).user?.id || '',
    'x-user-roles': JSON.stringify((originalReq as any).user?.roles || []),
    'x-request-id': originalReq.id,
    'x-forwarded-for': originalReq.ip,
    'x-forwarded-by': 'stratix-gateway',
    'x-gateway-version': process.env.GATEWAY_VERSION || '1.0.0',
    'x-timestamp': new Date().toISOString()
  });
}

/**
 * 创建响应处理器
 */
function createResponseHandler(serviceName: string) {
  return (request: FastifyRequest, reply: FastifyReply, res: any) => {
    const startTime = (request as any).startTime || Date.now();
    const responseTime = Date.now() - startTime;

    try {
      // 记录代理指标
      recordProxyMetrics(serviceName, responseTime, res.statusCode);

      // 添加响应头
      reply.header('x-proxy-service', serviceName);
      reply.header('x-response-time', responseTime.toString());
      reply.header('x-gateway', 'stratix-gateway');

      // 记录响应日志
      request.log.info('proxy response processed', {
        service: serviceName,
        statusCode: res.statusCode,
        responseTime
      });
    } catch (error) {
      request.log.error('Error in response handler:', error);
    }
  };
}

/**
 * 代理插件核心实现
 */
async function proxyPlugin(fastify: FastifyInstance, _options: any) {
  // 初始化代理服务配置
  initializeProxyServices();

  // 添加请求开始时间中间件
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any).startTime = Date.now();
  });

  // 获取所有注册的服务
  const services = proxyManager.getAllServices();

  fastify.log.info(`Initializing proxy for ${services.size} services`);

  // 为每个服务创建代理路由
  for (const [serviceName, config] of services) {
    try {
      fastify.log.info(`Setting up proxy for service: ${serviceName}`);

      // 构建预处理器数组
      const preHandlers = [];

      // 添加认证预处理器（如果需要）
      if (config.requireAuth) {
        preHandlers.push(createAuthPreHandler());
      }

      // 注册代理路由 - 简化配置用于调试
      await fastify.register(httpProxy as any, {
        upstream: config.upstream,
        prefix: config.prefix,
        rewritePrefix: config.rewritePrefix,
        http2: false,
        preHandler: preHandlers.length > 0 ? preHandlers : undefined,
        timeout: config.timeout || 30000,
        httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
      });

      fastify.log.info(
        `✅ Proxy setup completed for ${serviceName}: ${config.prefix} -> ${config.upstream}`
      );
    } catch (error) {
      fastify.log.error(`❌ Failed to setup proxy for ${serviceName}:`, error);
      throw error;
    }
  }

  fastify.log.info('🚀 Proxy plugin initialization completed');
}

/**
 * 使用 withRegisterAutoDI 包装的代理插件
 * 集成 Stratix 框架的自动依赖注入和插件生命周期管理
 */
export default withRegisterAutoDI(proxyPlugin, {
  discovery: {
    patterns: [] // 代理插件不需要自动发现
  },
  routing: {
    enabled: false, // 代理插件不使用装饰器路由
    prefix: '',
    validation: false
  },
  services: {
    enabled: false, // 代理插件不需要服务注册
    patterns: []
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'throw',
    debug: process.env.NODE_ENV === 'development'
  }
});
