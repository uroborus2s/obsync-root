import { type StratixConfig } from '@stratix/core';
import databasePlugin from '@stratix/database';
import { default as icalinkPlugin } from '@stratix/icalink';
import queuePlugin from '@stratix/queue';
import tasksPlugin from '@stratix/tasks';
import wasV7Plugin from '@stratix/was-v7';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Stratix配置文件
 *
 * 该函数接收从环境变量中解密的敏感信息作为参数
 */
export default (sensitiveInfo: any): StratixConfig => {
  const projectRootDir = path.resolve(
    typeof __dirname !== 'undefined'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url)),
    '..'
  );

  let httpsOptions = {};
  if (sensitiveInfo.web.https) {
    const keyPath = path.resolve(
      projectRootDir,
      'ssl',
      sensitiveInfo.web.https.key
    );
    const certPath = path.resolve(
      projectRootDir,
      'ssl',
      sensitiveInfo.web.https.cert
    );
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      throw new Error('SSL证书不存在');
    }
    httpsOptions = {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      }
    };
  }

  return {
    // 应用基础信息
    name: 'stratix-example-app',
    version: '1.0.0',
    description: 'Stratix框架示例应用',
    logger: {
      level: sensitiveInfo.logger.loglevle
    },
    server: {
      disableRequestLogging: sensitiveInfo.logger.disableRequestLogging,
      ...httpsOptions
    },
    registers: [
      [
        wasV7Plugin,
        {
          appId: sensitiveInfo.wasV7.appId,
          appSecret: sensitiveInfo.wasV7.appSecret
        }
      ],
      [
        databasePlugin,
        {
          databases: {
            default: {
              connection: {
                client: 'mysql',
                ...sensitiveInfo.databases.default
              }
            }
          }
        }
      ],
      [
        queuePlugin,
        {
          defaultQueue: {
            processors: []
          }
        }
      ],
      [
        tasksPlugin,
        {
          onRecoveryComplete: async (recoveryResult: any, fastify: any) => {
            // 任务恢复完成后执行全量同步
            fastify.log.info('任务恢复完成，开始执行后续操作', {
              recoveredCount: recoveryResult.recoveredCount,
              rootTasksCount: recoveryResult.rootTasksCount,
              errorCount: recoveryResult.errors.length
            });

            // 延迟执行，确保所有服务都已完全初始化
            setTimeout(async () => {
              try {
                // 从DI容器获取fullSyncService
                const fullSyncService = fastify.tryResolve('fullSyncService');

                if (fullSyncService) {
                  // 如果没有恢复任务，启动新的全量同步
                  fastify.log.info('没有恢复任务，开始执行全量同步...');

                  await fullSyncService.startFullSync({
                    reason: '应用启动后自动执行',
                    xnxq: '2024-2025-2'
                  });

                  fastify.log.info('全量同步启动成功');
                } else {
                  fastify.log.warn('fullSyncService 未找到，跳过全量同步');
                }
              } catch (error) {
                fastify.log.error('执行恢复后操作失败', error);
              }
            }, 3000); // 延迟3秒确保所有服务就绪
          }
        }
      ],
      // [postRecoveryPlugin, {}], // 临时注释掉以测试其他插件
      [icalinkPlugin, { ...sensitiveInfo.icalink }]
    ]
  };
};
