/**
 * 健康检查相关的路由处理器
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';

/**
 * 健康检查
 */
export async function healthCheck(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const taskManager = request.server.diContainer.resolve('taskManager');
    const isRunning = taskManager.isRunning;

    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '@stratix/tasks-api',
      taskManager: {
        running: isRunning
      }
    });
  } catch (error) {
    reply.code(503).send({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: '@stratix/tasks-api',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
