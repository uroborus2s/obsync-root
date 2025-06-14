/**
 * 统计相关的路由处理器
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';

/**
 * 获取统计信息
 */
export async function getStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const taskManager = request.server.diContainer.resolve('taskManager');
  const stats = await taskManager.getStats();
  reply.send(stats);
}

/**
 * 获取已注册的执行器
 */
export async function getExecutors(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const taskManager = request.server.diContainer.resolve('taskManager');
  const executors = taskManager.getRegisteredExecutors();
  reply.send({ executors });
}

/**
 * 清理任务
 */
export async function cleanupTasks(
  request: FastifyRequest<{
    Body: {
      olderThan?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager = request.server.diContainer.resolve('taskManager');
  const { olderThan } = request.body;
  const cutoffDate = olderThan ? new Date(olderThan) : undefined;

  const deletedCount = await taskManager.cleanup(cutoffDate);
  reply.send({ deletedCount });
}
