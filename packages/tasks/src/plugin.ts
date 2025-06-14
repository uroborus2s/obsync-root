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

  // 注册插件关闭钩子
  fastify.addHook('onReady', async () => {
    fastify.log.info('Tasks plugin initialized');
    try {
      const taskTreeService = fastify.tryResolve('taskTreeService');
      if (taskTreeService) {
        fastify.log.info('Recovering running tasks');
        await taskTreeService.recoverRunningTasks();
      } else {
        fastify.log.error('TaskTreeService not found');
      }
    } catch (error) {
      fastify.log.error('Error recovering running tasks', error);
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
