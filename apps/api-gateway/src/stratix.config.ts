import circuitBreaker from '@fastify/circuit-breaker';
import compress from '@fastify/compress';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import type { StratixConfig } from '@stratix/core';
import database from '@stratix/database';
import proxyPlugin from './plugins/proxy.js';

export default (sensitiveConfig: Record<string, string>): StratixConfig => ({
  server: {
    port: parseInt(process.env.PORT || '8090'),
    host: process.env.HOST || '0.0.0.0',
    keepAliveTimeout: 30000, // 🔧 增加到30秒，减少连接重建
    requestTimeout: 30000,
    maxParamLength: 100,
    bodyLimit: 5242880, // 🔧 增加到5MB
    trustProxy: true,
    // 🔧 新增：连接管理配置
    connectionTimeout: 60000, // 连接超时60秒
    maxRequestsPerSocket: 0, // 不限制每个socket的请求数
    requestIdHeader: 'x-request-id', // 请求ID头
    requestIdLogLabel: 'reqId' // 日志中的请求ID标签
  },
  autoLoad: {},
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
            host: '120.46.26.206',
            port: 3306,
            database: 'syncdb',
            username: 'sync_user',
            password: 'XtbF&anPR8(zzsL3QY2'
          }
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
        secret: sensitiveConfig.COOKIE_SECRET || 'gateway-cookie-secret',
        parseOptions: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        }
      }
    },

    // 压缩
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
        max: parseInt(process.env.GLOBAL_RATE_LIMIT || '10000'),
        timeWindow: process.env.GLOBAL_RATE_WINDOW || '1 minute',
        allowList: ['127.0.0.1', '::1'],
        redis: sensitiveConfig.REDIS_HOST
          ? {
              host: sensitiveConfig.REDIS_HOST,
              port: parseInt(sensitiveConfig.REDIS_PORT || '6379'),
              password: sensitiveConfig.REDIS_PASSWORD
            }
          : undefined,
        nameSpace: 'gateway-rate-limit',
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

    // 🔧 优化系统压力监控配置
    {
      name: 'under-pressure',
      plugin: underPressure,
      options: {
        maxEventLoopDelay: 200, // 降低到200ms，更早发现问题
        maxHeapUsedBytes: 500000000, // 提高到500MB
        maxRssBytes: 800000000, // 提高到800MB
        maxEventLoopUtilization: 0.95, // 降低到95%
        message: 'Service under pressure',
        retryAfter: 50,
        healthCheckInterval: 10000, // 增加到10秒，减少检查频率
        exposeStatusRoute: {
          routeOpts: { logLevel: 'warn' },
          url: '/status'
        }
      }
    },

    // 熔断器
    {
      name: 'circuit-breaker',
      plugin: circuitBreaker,
      options: {
        threshold: 5,
        timeout: 10000,
        resetTimeout: 30000,
        onCircuitOpen: async (_request: any, reply: any) => {
          reply.statusCode = 503;
          return {
            error: 'Service Unavailable',
            message: 'Circuit breaker is open',
            retryAfter: 30,
            timestamp: new Date().toISOString()
          };
        }
      }
    },
    // HTTP 代理转发 - 核心功能
    {
      name: 'proxy',
      plugin: proxyPlugin,
      options: {}
    }
  ]
});
