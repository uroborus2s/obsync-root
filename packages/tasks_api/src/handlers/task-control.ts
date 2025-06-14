/**
 * 任务控制相关的路由处理器
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';

/**
 * 启动任务
 */
export async function startTask(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      cascade?: boolean;
      force?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager = request.server.diContainer.resolve('taskManager');
  const { id } = request.params;
  const options = request.body;

  await taskManager.startTask(id, options);
  reply.code(204).send();
}

/**
 * 暂停任务
 */
export async function pauseTask(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      cascade?: boolean;
      force?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager = request.server.diContainer.resolve('taskManager');
  const { id } = request.params;
  const options = request.body;

  await taskManager.pauseTask(id, options);
  reply.code(204).send();
}

/**
 * 继续任务
 */
export async function resumeTask(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      cascade?: boolean;
      force?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager = request.server.diContainer.resolve('taskManager');
  const { id } = request.params;
  const options = request.body;

  await taskManager.resumeTask(id, options);
  reply.code(204).send();
}

/**
 * 停止任务
 */
export async function stopTask(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      cascade?: boolean;
      force?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager = request.server.diContainer.resolve('taskManager');
  const { id } = request.params;
  const options = request.body;

  await taskManager.stopTask(id, options);
  reply.code(204).send();
}
