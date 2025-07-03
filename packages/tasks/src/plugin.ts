/**
 * @stratix/tasks 插件 v2.0.0
 * 提供任务管理功能
 */

import type { FastifyInstance } from '@stratix/core';
import { fp } from '@stratix/core';

import { SharedContext } from './entity/SharedContext.js';
import { createTaskFactory } from './entity/taskNode.js';
import {
  CompletedTaskRepository,
  RunningTaskRepository,
  TaskMigrationRepository
} from './repositories/index.js';
import { SharedContextRepository } from './repositories/SharedContextRepository.js';
import { QueryService } from './services/queryService.js';
import { TaskService } from './services/taskService.js';
import { TaskTreeService } from './services/TaskTreeService.js';
import {
  cleanup as contextCleanup,
  handleContextChange
} from './subscribe/handleContextChange.js';
import {
  handleMetadataChange,
  cleanup as metadataClenup
} from './subscribe/handleMetadataChange.js';
import { handleNodeCreation } from './subscribe/nodeCreationSubscribe.js';
import {
  handleStatusSync,
  cleanup as stausCleanup
} from './subscribe/statusSyncSubscribe.js';
import { handleTreeCompletion } from './subscribe/treeCleanupSubscribe.js';

/**
 * 任务插件选项
 */
export interface TasksPluginOptions {
  // 插件配置选项
  autoRecovery?: boolean; // 是否自动恢复运行中的任务
  cleanupInterval?: number; // 清理间隔（毫秒）
  onRecoveryComplete?: (
    result: any,
    fastify: FastifyInstance
  ) => Promise<void> | void; // 恢复完成后的回调函数
}

/**
 * 任务插件
 */
async function tasksPlugin(
  fastify: FastifyInstance,
  options: TasksPluginOptions = {}
): Promise<void> {
  // 注册新的Repository到DI容器
  fastify.registerDI(RunningTaskRepository, {
    name: 'runningTaskRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(CompletedTaskRepository, {
    name: 'completedTaskRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(TaskMigrationRepository, {
    name: 'taskMigrationRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(SharedContextRepository, {
    name: 'sharedContextRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(handleStatusSync, {
    name: 'statusSyncSubscribe',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(handleTreeCompletion, {
    name: 'treeCompletionSubscribe',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(handleNodeCreation, {
    name: 'nodeCreationSubscribe',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(handleMetadataChange, {
    name: 'metadataChangeSubscribe',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(handleContextChange, {
    name: 'contextSubscribe',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(QueryService, {
    name: 'queryService',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(TaskTreeService, {
    name: 'taskTreeService',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(SharedContext.createSharedFactory, {
    name: 'createSharedContext',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(createTaskFactory, {
    name: 'createTaskNode',
    lifetime: 'SINGLETON'
  });

  // 注册任务服务
  fastify.registerDI(TaskService, {
    name: 'taskService',
    lifetime: 'SINGLETON'
  });

  // 注册插件关闭钩子
  fastify.addHook('onReady', async () => {
    fastify.log.info('Tasks plugin initialized');
    try {
      const taskTreeService = fastify.tryResolve('taskTreeService');
      if (taskTreeService) {
        fastify.log.info('Recovering running tasks');

        taskTreeService
          .recoverRunningTasks()
          .then(async (recoveryResult: any) => {
            fastify.log.info('Task recovery completed successfully', {
              recoveredCount: recoveryResult.recoveredCount,
              rootTasksCount: recoveryResult.rootTasksCount,
              errorCount: recoveryResult.errors.length
            });
            // 如果提供了恢复完成回调，则执行它
            if (options.onRecoveryComplete) {
              try {
                fastify.log.info('Executing post-recovery callback...');
                await options.onRecoveryComplete(recoveryResult, fastify);
                fastify.log.info(
                  'Post-recovery callback completed successfully'
                );
              } catch (callbackError) {
                fastify.log.error(
                  'Post-recovery callback failed',
                  callbackError
                );
                // 不抛出错误，避免影响应用启动
              }
            }

            // 发出任务恢复完成事件，允许其他插件监听
            fastify.emit('taskRecoveryCompleted', {
              result: recoveryResult,
              timestamp: new Date()
            });
          });
      } else {
        fastify.log.error('TaskTreeService not found');
      }
    } catch (error) {
      fastify.log.error('Error recovering running tasks', error);
      // 不要抛出错误，让服务器继续启动
      // 任务恢复失败不应该阻止整个应用启动
    }
  });

  // 注册插件关闭钩子
  fastify.addHook('onClose', async () => {
    stausCleanup();
    metadataClenup();
    contextCleanup();
  });
}

// 导出插件
export const wrapTasksPlugin = fp(tasksPlugin, {
  name: '@stratix/tasks',
  dependencies: ['@stratix/database']
});
