import compress from '@fastify/compress';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import type { StratixConfig } from '@stratix/core';
import database from '@stratix/database';
import { Redis } from 'ioredis';
import {
  authPreHandler,
  createAfterFastifyCreated,
  identityForwardPreHandler
} from './hooks.js';
import type {
  GatewayServicesList,
  ProxyServiceConfig
} from './types/gateway.js';

export default (sensitiveConfig: Record<string, any> = {}): StratixConfig => {
  // 从敏感配置中提取各种配置
  const databaseConfig = sensitiveConfig.databases || {};
  const webConfig = sensitiveConfig.web || {};
  const redisConfig = sensitiveConfig.redis || {};
  const rateLimitConfig = sensitiveConfig.rateLimit || {};
  const jwtConfig = sensitiveConfig.jwt || {};
  const wpsConfig = sensitiveConfig.wps || {};
  const proxyServicesConfig = sensitiveConfig.proxyServices || [];

  const services: GatewayServicesList = proxyServicesConfig.map(
    (config: ProxyServiceConfig) => ({
      name: config.name,
      config: {
        ...config,
        requireAuth: config.requireAuth || true,
        timeout: config.timeout || 30000,
        retries: config.retries || 3,
        httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        preHandlers: [authPreHandler, identityForwardPreHandler]
      }
    })
  );

  const redisClient = redisConfig.host
    ? new Redis({
        host: redisConfig.host,
        port: redisConfig.port || 6379,
        ...(redisConfig.password ? { password: redisConfig.password } : {})
      })
    : undefined;

  return {
    server: {
      port: webConfig.port || '8090',
      host: webConfig.host || '0.0.0.0',
      keepAliveTimeout: 30000, // 🔧 增加到30秒，减少连接重建
      requestTimeout: 30000,
      bodyLimit: 1024 * 1024 * 20, // 🔧 增加到5MB
      trustProxy: true,
      // 🔧 新增：连接管理配置
      connectionTimeout: 60000, // 连接超时60秒
      maxRequestsPerSocket: 0, // 不限制每个socket的请求数
      requestIdHeader: 'x-request-id', // 请求ID头
      requestIdLogLabel: 'reqId' // 日志中的请求ID标签
    },
    autoLoad: {},
    applicationAutoDI: {
      options: {
        jwt: {
          jwtSecret: jwtConfig.secret || 'your-jwt-secret-key-here',
          tokenExpiry: jwtConfig.tokenExpiry || '29d',
          refreshTokenExpiry: jwtConfig.refreshTokenExpiry || '7d',
          cookieName: jwtConfig.cookieName || 'wps_jwt_token',
          excludePaths: ['/health', '/metrics', '/docs', '/api/auth/*'],
          enabled: true
        },
        wps: {
          baseUrl: wpsConfig.baseUrl || 'https://openapi.wps.cn',
          appid: wpsConfig.clientId,
          appkey: wpsConfig.clientSecret
        }
      }
    },
    hooks: {
      afterFastifyCreated: createAfterFastifyCreated(services),
      beforeClose: async (fastify: any) => {
        redisClient?.disconnect();
      }
    },
    plugins: [
      {
        name: '@stratix/database',
        plugin: database,
        options: {
          // 数据库连接配置
          connections: {
            // 默认数据库连接
            default: {
              type: 'mysql' as const,
              host: databaseConfig.default?.host || 'localhost',
              port: databaseConfig.default?.port || 3306,
              database: databaseConfig.default?.database || 'syncdb',
              username:
                databaseConfig.default?.user ||
                databaseConfig.default?.username ||
                'root',
              password: databaseConfig.default?.password || ''
            },
          }
        }
      },
      // CORS 支持
      {
        name: 'cors',
        plugin: cors,
        options: {
          origin: process.env.CORS_ORIGIN?.split(',') || true,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Request-ID',
            'Cookie'
          ]
        }
      },

      // 安全头
      {
        name: 'helmet',
        plugin: helmet,
        options: {
          contentSecurityPolicy: false,
          crossOriginEmbedderPolicy: false,
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          }
        }
      },

      // Cookie 支持
      {
        name: 'cookie',
        plugin: cookie,
        options: {
          secret:
            jwtConfig.secret ||
            'stratix-cookie-secret-key-32-chars-required-for-security', // 用于cookie签名，至少32字符
          hook: 'onRequest', // 在onRequest钩子中解析cookie
          parseOptions: {
            // cookie解析选项，使用默认值即可
          }
        }
      },
      {
        name: 'compress',
        plugin: compress,
        options: {
          global: true,
          threshold: 1024,
          encodings: ['gzip', 'deflate']
        }
      },

      // 限流
      {
        name: 'rate-limit',
        plugin: rateLimit,
        options: {
          global: true,
          max: rateLimitConfig.globalMax || 10000,
          timeWindow: rateLimitConfig.globalWindow || '1 minute',
          allowList: ['127.0.0.1', '::1'],
          redis: redisClient,
          nameSpace: 'stratix-gateway-rate-limit',
          continueExceeding: true,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
          ban: 10,
          onBanReach: (_req: any, key: string) => {
            console.warn(`Rate limit ban reached for key: ${key}`);
          },
          keyGenerator: (req: any) => {
            return req.ip || 'anonymous';
          }
        }
      },
      // 🔧 优化系统压力监控配置（暂时禁用自定义健康检查）
      {
        name: 'under-pressure',
        plugin: underPressure,
        options: {
          maxEventLoopDelay: 2000, // 500ms，更早发现问题
          maxHeapUsedBytes: 650 * 1024 * 1024, // 650MB
          maxRssBytes: 850 * 1024 * 1024, // 850MB
          maxEventLoopUtilization: 0.98, // 95%
          message: 'Service under pressure',
          retryAfter: 30000,
          exposeStatusRoute: {
            routeOpts: { logLevel: 'silent' },
            url: '/health'
          }
        }
      }
    ]
  };
};
