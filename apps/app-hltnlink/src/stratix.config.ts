// @wps/app-icasync Stratix 框架配置文件
// 基于 @stratix/core 的现代化应用配置

import underPressure from '@fastify/under-pressure';
import type { FastifyInstance, StratixConfig } from '@stratix/core';
import stratixDatabasePlugin from '@stratix/database';
import redisPlugin from '@stratix/redis';
import tasksPlugin from '@stratix/tasks';
import { isDevelopment } from '@stratix/utils/environment';
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
  const hltnlinkConfig = sensitiveConfig.hltnlink || {};
  const apiConfig = sensitiveConfig.api || {};
  const redisConfig = sensitiveConfig.redis || {};

  return {
    // 服务器配置
    server: {
      port: webConfig.port || '3000',
      host: webConfig.host || '0.0.0.0'
    },
    hooks: {
      afterFastifyCreated: async (fastify: FastifyInstance) => {
        // 关闭数据库连接
      }
    },
    applicationAutoDI: {
      options: {
        api: {
          url: apiConfig.url || 'https://api.example.com',
          appId: apiConfig.appId || '',
          appSecret: apiConfig.appSecret || ''
        }
      }
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
              type: 'sqlite' as const,
              database: databaseConfig.default?.database || 'hltnlink.db'
            }
          }
        }
      },
      {
        name: '@stratix/redis',
        plugin: redisPlugin,
        options: {
          single: {
            ...redisConfig
          }
        }
      },
      {
        name: '@stratix/was-v7',
        plugin: wasV7Plugin,
        options: {
          appId: sensitiveConfig.wasV7?.appId || '',
          appSecret: sensitiveConfig.wasV7?.appSecret || '',
          baseUrl: 'https://openapi.wps.cn'
        }
      },
      {
        name: '@stratix/tasks',
        plugin: tasksPlugin,
        options: {
          // 任务工作流配置
          connectionName: 'default', // 使用默认数据库连接
          enableScheduler: true, // 启用任务调度器
          maxConcurrency: 10, // 最大并发任务数
          retryAttempts: 3, // 重试次数
          retryDelay: 1000, // 重试延迟(ms)
          enableMetrics: true, // 启用性能指标
          debug: isDevelopment(),
          recovery: {
            enabled: true,
            autoStart: true
          }
        }
      },
      {
        name: 'under-pressure',
        plugin: underPressure,
        options: {
          maxEventLoopDelay: 2000, // 提高到2秒，减少误触发
          maxHeapUsedBytes: 1200 * 1024 * 1024, // 提高到1.2GB
          maxRssBytes: 1400 * 1024 * 1024, // 提高到1.4GB
          maxEventLoopUtilization: 0.98, // 提高到98%
          message: 'Service under pressure - please retry later',
          retryAfter: 10000, // 增加到1秒重试间隔
          exposeStatusRoute: {
            routeOpts: { logLevel: 'silent' },
            url: '/health'
          }
        }
      }
    ]
  } as any;
};
