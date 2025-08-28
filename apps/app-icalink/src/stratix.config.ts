// @wps/app-icalink Stratix 框架配置文件
// 基于 @stratix/core 的现代化应用配置

import underPressure from '@fastify/under-pressure';
import type { StratixConfig } from '@stratix/core';
import stratixDatabasePlugin from '@stratix/database';
import { onRequestPermissionHook } from '@stratix/utils/auth';
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
    hooks: {
      afterFastifyCreated: async (fastify: any) => {
        // 关闭数据库连接
        fastify.addHook(
          'onRequest',
          onRequestPermissionHook([], { skipPaths: ['/health'] })
        );
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
