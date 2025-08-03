/**
 * @stratix/gateway 网关插件入口文件
 * 基于Stratix框架的API网关服务，提供认证、授权、代理转发等功能
 */

import type { FastifyInstance, FastifyPluginOptions } from '@stratix/core';
import { withRegisterAutoDI } from '@stratix/core';

/**
 * 网关插件主函数
 * 负责注册网关相关的路由、中间件和服务
 */
async function gatewayPlugin(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // 注册必要的Fastify插件
  await fastify.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET || 'gateway-cookie-secret',
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  });

  // 注册CORS支持
  await fastify.register(require('@fastify/cors'), {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  });

  // 注册安全头
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: false // 允许自定义CSP
  });

  // 注册压缩
  await fastify.register(require('@fastify/compress'), {
    global: true,
    threshold: 1024
  });

  // 注册全局认证中间件
  fastify.addHook('onRequest', async (request: any, reply: any) => {
    try {
      // 从容器中获取认证中间件
      const authMiddleware = fastify.diContainer.resolve('authMiddleware');
      await authMiddleware.authenticate(request, reply);
    } catch (error) {
      fastify.log.error('Authentication middleware error:', error);
      // 如果认证中间件未注册，跳过认证（开发模式）
      if (process.env.NODE_ENV === 'development') {
        fastify.log.warn(
          'Authentication middleware not found, skipping auth check'
        );
      }
    }
  });

  // 注册代理路由
  fastify.addHook('onReady', async () => {
    try {
      const proxyService = fastify.diContainer.resolve('proxyService');
      await proxyService.registerProxyRoutes(fastify);
      fastify.log.info('✅ Proxy routes registered successfully');
    } catch (error) {
      fastify.log.error('❌ Failed to register proxy routes:', error);
    }
  });

  // 注册全局钩子
  fastify.addHook('onReady', async () => {
    fastify.log.info('🚀 API Gateway plugin is ready');
  });

  fastify.addHook('onClose', async () => {
    fastify.log.info('🔄 API Gateway plugin is closing');
  });

  // 注册健康检查路由
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: '1.0.0'
    };
  });

  // 注册指标路由
  fastify.get('/metrics', async () => {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  });
}

/**
 * 插件配置
 */
const pluginConfig = {
  discovery: {
    patterns: [
      'controllers/**/*.{ts,js}',
      'services/**/*.{ts,js}',
      'middlewares/**/*.{ts,js}',
      'adapters/**/*.{ts,js}'
    ]
  },
  routing: {
    enabled: true,
    prefix: '',
    validation: false
  },
  services: {
    enabled: true,
    patterns: [
      'services/**/*.{ts,js}',
      'middlewares/**/*.{ts,js}',
      'adapters/**/*.{ts,js}'
    ]
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'log' as const,
    debug: process.env.NODE_ENV === 'development'
  },
  debug: process.env.NODE_ENV === 'development'
};

/**
 * 导出增强后的网关插件
 */
export default withRegisterAutoDI(gatewayPlugin, pluginConfig);
