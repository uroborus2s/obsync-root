import compress from '@fastify/compress';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import type { FastifyInstance, StratixConfig } from '@stratix/core';
import database from '@stratix/database';
import { isProduction } from '@stratix/utils/environment';
import { Redis } from 'ioredis';
import { afterFastifyCreated } from './hooks.js';

export default (sensitiveConfig: Record<string, any> = {}): StratixConfig => {
  // 从敏感配置中提取各种配置
  const databaseConfig = sensitiveConfig.databases || {};
  const webConfig = sensitiveConfig.web || {};
  const redisConfig = sensitiveConfig.redis || {};
  const rateLimitConfig = sensitiveConfig.rateLimit || {};
  const jwtConfig = sensitiveConfig.jwt || {};
  const wpsConfig = sensitiveConfig.wps || {};

  return {
    server: {
      port: webConfig.port || '8090',
      host: webConfig.host || '0.0.0.0',
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
          appkey: webConfig.clientSecret
        }
      }
    },
    hooks: { afterFastifyCreated: afterFastifyCreated },
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
              database: databaseConfig.default?.database || 'icasync',
              username:
                databaseConfig.default?.user ||
                databaseConfig.default?.username ||
                'root',
              password: databaseConfig.default?.password || ''
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
            secure: isProduction(),
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
          max: rateLimitConfig.globalMax || 10000,
          timeWindow: rateLimitConfig.globalWindow || '1 minute',
          allowList: ['127.0.0.1', '::1'],
          redis: redisConfig.host
            ? new Redis({
                host: redisConfig.host,
                port: redisConfig.port || 6379,
                ...(redisConfig.password
                  ? { password: redisConfig.password }
                  : {})
              })
            : undefined,
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

      // 🔧 优化系统压力监控配置 + 集成健康检查
      {
        name: 'under-pressure',
        plugin: underPressure,
        options: {
          maxEventLoopDelay: 500, // 500ms，更早发现问题
          maxHeapUsedBytes: 650 * 1024 * 1024, // 650MB
          maxRssBytes: 850 * 1024 * 1024, // 850MB
          maxEventLoopUtilization: 0.95, // 95%
          message: 'Service under pressure',
          retryAfter: 50,
          healthCheckInterval: 5 * 60 * 1000, // 10秒检查间隔
          exposeStatusRoute: {
            routeOpts: { logLevel: 'silent' },
            url: '/health'
          },
          // 🔧 新增：集成的健康检查功能
          healthCheck: async (fastifyInstance: FastifyInstance) => {
            try {
              const databaseApi =
                fastifyInstance.diContainer.resolve('databaseApi');
              const dbres = await databaseApi.healthCheck();
              // const checks: Record<string, any> = {};

              // 检查后端服务连接（使用统一配置）
              const createServiceCheck = (
                serviceName: string,
                url: string,
                timeout: number = 5000
              ) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                return fetch(url, {
                  method: 'GET',
                  signal: controller.signal,
                  headers: {
                    'User-Agent': 'Stratix-Gateway-HealthCheck/1.0'
                  }
                })
                  .then((res) => {
                    clearTimeout(timeoutId);
                    return {
                      name: serviceName,
                      status: res.ok ? 'healthy' : 'unhealthy',
                      statusCode: res.status,
                      responseTime: Date.now() - Date.now() // 简化实现
                    };
                  })
                  .catch((error) => {
                    clearTimeout(timeoutId);
                    return {
                      name: serviceName,
                      status: 'unhealthy',
                      error:
                        error instanceof Error ? error.message : 'Unknown error'
                    };
                  });
              };

              const serviceChecks = await Promise.allSettled([
                // Tasks服务检查
                createServiceCheck('workflows', `http://localhost:3001/health`)

                // 用户服务检查
                // createServiceCheck('users', `http://localhost:3002/health`)
              ]);

              const allServicesHealthy = serviceChecks.every(
                (check) =>
                  check.status === 'fulfilled' &&
                  check.value.status === 'healthy'
              );

              return dbres.success && dbres.data && allServicesHealthy;
            } catch (error) {
              return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error:
                  error instanceof Error
                    ? error.message
                    : 'Health check failed',
                gateway: {
                  version: process.env.GATEWAY_VERSION || '1.0.0',
                  uptime: process.uptime()
                }
              };
            }
          }
        }
      }
    ]
  };
};
