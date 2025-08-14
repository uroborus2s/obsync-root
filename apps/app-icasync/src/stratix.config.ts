// @wps/app-icasync Stratix 框架配置文件
// 基于 @stratix/core 的现代化应用配置

import underPressure from '@fastify/under-pressure';
import type { FastifyInstance, StratixConfig } from '@stratix/core';
import stratixDatabasePlugin from '@stratix/database';
import icasyncPlugin from '@stratix/icasync';
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

  return {
    // 服务器配置
    server: {
      port: webConfig.port || '3001',
      host: webConfig.host || '0.0.0.0'
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
        },
        prefix: '/api/database'
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
        name: '@stratix/icasync',
        plugin: icasyncPlugin,
        options: {
          // 课程同步配置
          connectionName: 'default', // 使用默认数据库连接
          enableValidation: true, // 启用请求验证
          enableLogging: true, // 启用详细日志
          batchSize: 100, // 默认批处理大小
          timeout: 1800000, // 默认超时时间(30分钟)
          maxConcurrency: 5, // 最大并发数
          retryCount: 3, // 重试次数
          debug: isDevelopment()
        }
      },
      {
        name: 'under-pressure',
        plugin: underPressure,
        options: {
          maxEventLoopDelay: 500, // 500ms，更早发现问题
          maxHeapUsedBytes: 900 * 1024 * 1024, // 650MB
          maxRssBytes: 1100 * 1024 * 1024, // 850MB
          maxEventLoopUtilization: 0.95, // 95%
          message: 'Service under pressure',
          retryAfter: 50,
          exposeStatusRoute: {
            routeOpts: { logLevel: 'silent' },
            url: '/health'
          },
          // 🔧 新增：集成的健康检查功能
          healthCheck: async (fastifyInstance: FastifyInstance) => {
            try {
              const dataApi =
                fastifyInstance.diContainer.resolve('databaseApi');
              const db1 = await dataApi.healthCheck('default');
              return db1.success && db1.data;
            } catch (error) {
              return false;
            }
          }
        }
      }
    ]
  } as any;
};
