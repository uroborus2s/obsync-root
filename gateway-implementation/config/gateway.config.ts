// Stratix Gateway 配置文件
// 定义网关的完整配置，包括插件、路由、认证等

import type { StratixConfig } from '@stratix/core';
import jwtAuthPlugin from '../src/plugins/auth/jwt-auth.js';
import healthCheckPlugin from '../src/plugins/monitoring/health-checker.js';
import requestLoggerPlugin from '../src/plugins/monitoring/request-logger.js';
import dynamicRouterPlugin from '../src/plugins/routing/dynamic-router.js';
import corsPlugin from '../src/plugins/security/cors-handler.js';
import rateLimiterPlugin from '../src/plugins/security/rate-limiter.js';

/**
 * 创建网关配置
 * @param sensitiveConfig 敏感配置参数（从环境变量或加密配置中获取）
 */
export function createGatewayConfig(sensitiveConfig: Record<string, string> = {}): StratixConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    // Fastify服务器配置
    server: {
      port: parseInt(process.env.GATEWAY_PORT || '3000'),
      host: process.env.GATEWAY_HOST || '0.0.0.0',
      
      // 日志配置
      logger: isDevelopment ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            levelFirst: true
          }
        },
        level: 'debug'
      } : {
        level: 'info'
      },

      // 请求配置
      keepAliveTimeout: 30000,
      requestTimeout: 30000,
      bodyLimit: 1048576, // 1MB
      
      // 信任代理
      trustProxy: true,
      
      // 禁用X-Powered-By头
      disableRequestLogging: false
    },

    // 插件配置
    plugins: [
      // CORS插件 - 必须在其他插件之前
      {
        name: 'cors-handler',
        plugin: corsPlugin,
        options: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
          exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
        }
      },

      // 健康检查插件
      {
        name: 'health-checker',
        plugin: healthCheckPlugin,
        options: {
          healthCheckPath: '/health',
          detailedHealthPath: '/health/detailed',
          checks: {
            database: true,
            redis: true,
            upstreamServices: true
          }
        }
      },

      // 请求日志插件
      {
        name: 'request-logger',
        plugin: requestLoggerPlugin,
        options: {
          logLevel: isDevelopment ? 'debug' : 'info',
          includeHeaders: isDevelopment,
          includeBody: false,
          excludePaths: ['/health', '/metrics', '/favicon.ico'],
          enableMetrics: true,
          enablePerformanceLogging: true,
          performanceThreshold: 1000 // 1秒
        }
      },

      // JWT认证插件
      {
        name: 'jwt-auth',
        plugin: jwtAuthPlugin,
        options: {
          secret: sensitiveConfig.JWT_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
          algorithms: ['HS256'],
          expiresIn: process.env.JWT_EXPIRES_IN || '24h',
          issuer: process.env.JWT_ISSUER || 'stratix-gateway',
          audience: process.env.JWT_AUDIENCE || 'api-clients',
          
          // 排除路径（不需要认证）
          excludePaths: [
            '/health',
            '/metrics',
            '/auth/login',
            '/gateway/info',
            '/public'
          ],
          
          // 可选认证路径（认证失败不会阻止访问）
          optionalPaths: [
            '/gateway/routes'
          ]
        }
      },

      // 限流插件
      {
        name: 'rate-limiter',
        plugin: rateLimiterPlugin,
        options: {
          // 全局限流
          global: {
            max: parseInt(process.env.RATE_LIMIT_GLOBAL || '1000'),
            timeWindow: '1 minute',
            skipOnError: true
          },
          
          // IP限流
          perIP: {
            max: parseInt(process.env.RATE_LIMIT_PER_IP || '200'),
            timeWindow: '1 minute',
            skipSuccessfulRequests: false,
            skipFailedRequests: false
          },
          
          // 用户限流
          perUser: {
            max: parseInt(process.env.RATE_LIMIT_PER_USER || '100'),
            timeWindow: '1 minute'
          },
          
          // 路由特定限流
          perRoute: {
            '/auth/login': {
              max: 5,
              timeWindow: '1 minute'
            },
            '/admin/.*': {
              max: 50,
              timeWindow: '1 minute'
            }
          },
          
          // 存储配置
          storage: process.env.RATE_LIMIT_STORAGE as 'memory' | 'redis' || 'memory',
          redis: sensitiveConfig.REDIS_URL ? {
            host: new URL(sensitiveConfig.REDIS_URL).hostname,
            port: parseInt(new URL(sensitiveConfig.REDIS_URL).port) || 6379,
            password: new URL(sensitiveConfig.REDIS_URL).password || undefined,
            db: 0
          } : undefined
        }
      },

      // 动态路由插件
      {
        name: 'dynamic-router',
        plugin: dynamicRouterPlugin,
        options: {
          configPath: './config/routes.config.js',
          enableServiceDiscovery: process.env.ENABLE_SERVICE_DISCOVERY === 'true',
          
          // 负载均衡配置
          loadBalancing: {
            strategy: process.env.LOAD_BALANCING_STRATEGY || 'round-robin',
            healthCheck: {
              enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
              interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
              timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
              path: process.env.HEALTH_CHECK_PATH || '/health'
            }
          },
          
          // 代理配置
          proxy: {
            timeout: parseInt(process.env.PROXY_TIMEOUT || '30000'),
            retries: parseInt(process.env.PROXY_RETRIES || '3'),
            retryDelay: parseInt(process.env.PROXY_RETRY_DELAY || '1000'),
            
            // 请求头配置
            headers: {
              'X-Forwarded-Proto': 'https',
              'X-Gateway-Version': '1.0.0'
            },
            
            // 移除的请求头
            removeHeaders: ['host', 'connection', 'transfer-encoding']
          }
        }
      }
    ],

    // 自动加载配置
    autoLoad: {
      enabled: true,
      patterns: [
        'controllers/*.{ts,js}',
        'services/*.{ts,js}',
        'repositories/*.{ts,js}'
      ]
    },

    // 缓存配置
    cache: {
      type: process.env.CACHE_TYPE as 'memory' | 'redis' || 'memory',
      options: sensitiveConfig.REDIS_URL ? {
        host: new URL(sensitiveConfig.REDIS_URL).hostname,
        port: parseInt(new URL(sensitiveConfig.REDIS_URL).port) || 6379,
        password: new URL(sensitiveConfig.REDIS_URL).password || undefined,
        db: 1, // 使用不同的数据库
        ttl: parseInt(process.env.CACHE_TTL || '300') // 5分钟
      } : {
        ttl: parseInt(process.env.CACHE_TTL || '300')
      }
    },

    // 日志配置
    logger: {
      level: (process.env.LOG_LEVEL as any) || (isDevelopment ? 'debug' : 'info'),
      enableRequestLogging: true,
      enablePerformanceLogging: true,
      enableErrorTracking: true,
      enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
      
      // 性能阈值（毫秒）
      performanceThreshold: parseInt(process.env.PERFORMANCE_THRESHOLD || '1000'),
      
      // 敏感字段（在日志中会被脱敏）
      sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization'],
      
      // 采样率（0-1）
      sampleRate: parseFloat(process.env.LOG_SAMPLE_RATE || '1.0'),
      
      // 文件日志配置
      file: process.env.LOG_FILE_ENABLED === 'true' ? {
        enabled: true,
        path: process.env.LOG_FILE_PATH || './logs/gateway.log',
        maxSize: process.env.LOG_FILE_MAX_SIZE || '10MB',
        maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '5')
      } : undefined
    },

    // 应用级生命周期钩子
    hooks: {
      beforeStart: async () => {
        console.log('🔧 Initializing gateway services...');
        
        // 这里可以添加启动前的初始化逻辑
        // 例如：数据库连接、配置验证等
      },
      
      afterStart: async (fastify) => {
        console.log('✅ Gateway services initialized');
        
        // 注册优雅关闭处理
        const gracefulShutdown = async (signal: string) => {
          console.log(`📡 Received ${signal}, starting graceful shutdown...`);
          
          try {
            await fastify.close();
            console.log('✅ Gateway shutdown completed');
            process.exit(0);
          } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
          }
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
        // 输出启动信息
        const address = fastify.server.address();
        if (address && typeof address === 'object') {
          console.log(`🌐 Gateway ready at http://${address.address}:${address.port}`);
        }
      }
    }
  };
}

// 默认导出
export default createGatewayConfig;