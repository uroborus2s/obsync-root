import underPressure from '@fastify/under-pressure';
import type { StratixConfig } from '@stratix/core';
import stratixDatabasePlugin from '@stratix/database';
import osspPlugin from '@stratix/ossp';
import queuePlugin from '@stratix/queue';
import redisPlugin from '@stratix/redis';
import { onRequestPermissionHook } from '@stratix/utils/auth';
import wasV7Plugin from '@stratix/was-v7';

/**
 * Stratix 应用配置工厂函数
 * 接收解密后的敏感配置作为参数
 *
 * @param sensitiveConfig - 从 STRATIX_SENSITIVE_CONFIG 环境变量解密得到的配置
 * @returns 完整的 Stratix 应用配置
 */
export default (sensitiveConfig: Record<string, any> = {}): StratixConfig => {
  // 从敏感配置中提取各种配置
  const databaseConfig = sensitiveConfig.databases || {};
  const webConfig = sensitiveConfig.web || {};
  const osspConfig = sensitiveConfig.ossp || {};
  const redisConfig = sensitiveConfig.redis || {};

  return {
    // 服务器配置
    server: {
      port: webConfig.port || '8090',
      host: webConfig.host || '0.0.0.0',
      // 增加请求体大小限制，支持大文件上传
      bodyLimit: 10 * 1024 * 1024, // 50MB，支持多个大图片上传
      requestTimeout: 60000, // 60秒请求超时
      keepAliveTimeout: 30000, // 30秒保持连接
      maxParamLength: 1000 // 增加参数长度限制
    },
    hooks: {
      afterFastifyCreated: async (fastify: any) => {
        // 关闭数据库连接
        fastify.addHook(
          'onRequest',
          onRequestPermissionHook([], { skipPaths: ['/health'] })
        );

        // Queue worker disabled - CheckinJobHandler removed
        // const container = fastify.diContainer;
        // const queueAdapter = container.resolve('queueAdapter');
        // const checkinJobHandler = container.resolve(CheckinJobHandler);
        // queueAdapter.process('checkin', (job: any) =>
        //   checkinJobHandler.process(job)
        // );
      }
    },
    applicationAutoDI: {
      options: {}
    },
    // 插件配置
    plugins: [
      {
        name: '@stratix/database',
        plugin: stratixDatabasePlugin as any,
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
            },
            syncdb: {
              type: 'mysql' as const,
              host: databaseConfig.syncdb?.host || 'localhost',
              port: databaseConfig.syncdb?.port || 3306,
              database: databaseConfig.syncdb?.database || 'syncdb',
              username:
                databaseConfig.syncdb?.user ||
                databaseConfig.syncdb?.username ||
                'root',
              password: databaseConfig.syncdb?.password || ''
            }
          }
        }
      },
      {
        name: '@stratix/ossp',
        plugin: osspPlugin,
        options: {
          ...osspConfig
        }
      },
      {
        name: '@stratix/redis',
        plugin: redisPlugin,
        options: {
          retryAttempts: null,
          single: {
            ...redisConfig
          }
        }
      },
      {
        name: '@stratix/was-v7',
        plugin: wasV7Plugin,
        options: {
          appId: sensitiveConfig.wasV7?.appId || 'your-app-id',
          appSecret: sensitiveConfig.wasV7?.appSecret || 'your-app-secret',
          baseUrl: 'https://openapi.wps.cn'
        }
      },
      {
        name: '@stratix/queue',
        plugin: queuePlugin,
        options: {
          defaultJobOptions: {
            removeOnComplete: true, // Automatically remove jobs on completion
            removeOnFail: 100, // Keep last 100 failed jobs
            attempts: 3, // Retry up to 3 times
            backoff: {
              type: 'exponential',
              delay: 1000 // 1s, 2s, 4s
            }
          }
        }
      },
      {
        name: 'under-pressure',
        plugin: underPressure,
        options: {
          maxEventLoopDelay: 1000, // 提高到2秒，减少误触发
          maxHeapUsedBytes: 1200 * 1024 * 1024, // 提高到1.2GB
          maxRssBytes: 1400 * 1024 * 1024, // 提高到1.4GB
          maxEventLoopUtilization: 0.98, // 提高到98%
          message: 'Service under pressure - please retry later',
          retryAfter: 10000, // 增加到1秒重试间隔
          pressureHandler: (req: any, rep: any, type: any, value: any) => {
            // 自定义处理器，添加更多信息
            rep.code(503).send({
              error: 'Service Unavailable',
              message: `Service under pressure: ${type}`,
              value: value,
              retryAfter: 1000
            });
          },
          exposeStatusRoute: {
            routeOpts: { logLevel: 'silent' },
            url: '/health'
          }
        }
      }
    ]
  } as any;
};
