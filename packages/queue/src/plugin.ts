/**
 * @stratix/queue 插件
 * 提供高性能消息队列功能
 */

import type { FastifyInstance } from '@stratix/core';
import { fp } from '@stratix/core';
import { SmartBackpressureManager } from './core/backpressure-manager.js';
import { EventDrivenMemoryQueue } from './core/memory-queue.js';
import { QueueManager } from './managers/queue-manager.js';
import { JobNotificationSystem } from './notifications/job-notification-system.js';
import { QueueGroupRepository } from './repositories/queue-group.repository.js';
import { QueueJobRepository } from './repositories/queue-job.repository.js';
import { GroupManagementService } from './services/group-management-service.js';
import { QueueService } from './services/group-service.js';
import { JobExecutionService } from './services/job-execution-service.js';
import { DatabaseJobStream } from './streams/database-job-stream.js';
import type { QueuePluginOptions } from './types/index.js';

/**
 * 队列插件
 */
async function queuePlugin(
  fastify: FastifyInstance,
  options: QueuePluginOptions = {}
): Promise<void> {
  // 注册仓储层到 DI 容器
  fastify.registerDI(QueueJobRepository, {
    name: 'jobRepository',
    lifetime: 'SINGLETON',
    asyncInit: 'init'
  });

  fastify.registerDI(QueueGroupRepository, {
    name: 'groupRepository',
    lifetime: 'SINGLETON',
    asyncInit: 'init'
  });

  fastify.registerDI(EventDrivenMemoryQueue, {
    name: 'drivenMemoryQueue',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(SmartBackpressureManager, {
    name: 'backpressureManager',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(DatabaseJobStream, {
    name: 'databaseJobStream',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(JobNotificationSystem, {
    name: 'jobNotificationSystem',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(QueueManager, {
    name: 'queueManager',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(JobExecutionService, {
    name: 'jobExecutionService',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(GroupManagementService, {
    name: 'groupManagementService',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(QueueService, {
    name: 'queueService',
    lifetime: 'SINGLETON'
  });

  fastify.addHook('onReady', async () => {
    try {
      const queueService = fastify.diContainer.resolve('queueService');
      await queueService.start(); // 🔥 添加 await
    } catch (error) {
      fastify.log.error({ error }, 'Failed to initialize queue plugin');
      throw error;
    }
  });
}

// 导出插件
export const wrapQueuePlugin = fp(queuePlugin, {
  name: '@stratix/queue',
  dependencies: ['@stratix/database']
});
