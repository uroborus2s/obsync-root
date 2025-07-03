/**
 * 同步控制器
 * 提供同步任务相关的 HTTP 接口
 */

import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from '@stratix/core';
import { SyncTaskService } from '../services/index.js';

/**
 * 启动同步请求体接口
 */
interface StartSyncBody {
  xnxq: string;
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
}

/**
 * 任务状态参数
 */
interface TaskStatusParams {
  taskId: string;
}

/**
 * 任务控制请求体
 */
interface TaskControlBody {
  reason?: string;
}

/**
 * 启动全量同步
 */
const startFullSync = async (
  request: FastifyRequest<{ Body: StartSyncBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { xnxq, batchSize, maxRetries, timeout } = request.body;

    request.log.info(
      { xnxq, batchSize, maxRetries, timeout },
      '收到全量同步请求'
    );

    const syncTaskService =
      request.diScope.resolve<SyncTaskService>('syncTaskService');
    const taskId = await syncTaskService.startFullSync({
      xnxq,
      batchSize,
      maxRetries,
      timeout
    });

    reply.status(201).send({
      success: true,
      data: {
        taskId,
        type: 'full',
        xnxq,
        message: '全量同步任务已启动'
      }
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, '启动全量同步失败');
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : '启动全量同步失败'
    });
  }
};

/**
 * 启动增量同步
 */
const startIncrementalSync = async (
  request: FastifyRequest<{ Body: StartSyncBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { xnxq, batchSize, maxRetries, timeout } = request.body;

    request.log.info(
      { xnxq, batchSize, maxRetries, timeout },
      '收到增量同步请求'
    );

    const syncTaskService =
      request.diScope.resolve<SyncTaskService>('syncTaskService');
    const taskId = await syncTaskService.startIncrementalSync({
      xnxq,
      batchSize,
      maxRetries,
      timeout
    });

    reply.status(201).send({
      success: true,
      data: {
        taskId,
        type: 'incremental',
        xnxq,
        message: '增量同步任务已启动'
      }
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, '启动增量同步失败');
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : '启动增量同步失败'
    });
  }
};

/**
 * 获取任务状态
 */
const getTaskStatus = async (
  request: FastifyRequest<{ Params: TaskStatusParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { taskId } = request.params;

    const syncTaskService =
      request.diScope.resolve<SyncTaskService>('syncTaskService');
    const taskData = await syncTaskService.getTaskStatus(taskId);

    if (!taskData) {
      return reply.status(404).send({
        success: false,
        error: '任务不存在'
      });
    }

    // 获取进度信息
    const progress = await syncTaskService.getTaskProgress(taskId);
    const childrenStats = await syncTaskService.getChildrenStats(taskId);

    reply.send({
      success: true,
      data: {
        taskId,
        name: taskData.name,
        description: taskData.description,
        status: taskData.status,
        progress,
        childrenStats,
        createdAt: taskData.createdAt,
        updatedAt: taskData.updatedAt,
        metadata: taskData.metadata
      }
    });
  } catch (error) {
    request.log.error(
      { error, taskId: request.params.taskId },
      '获取任务状态失败'
    );
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : '获取任务状态失败'
    });
  }
};

/**
 * 获取任务进度
 */
const getTaskProgress = async (
  request: FastifyRequest<{ Params: TaskStatusParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { taskId } = request.params;

    const syncTaskService =
      request.diScope.resolve<SyncTaskService>('syncTaskService');
    const progress = await syncTaskService.getTaskProgress(taskId);

    if (progress === null) {
      return reply.status(404).send({
        success: false,
        error: '任务不存在'
      });
    }

    reply.send({
      success: true,
      data: {
        taskId,
        progress
      }
    });
  } catch (error) {
    request.log.error(
      { error, taskId: request.params.taskId },
      '获取任务进度失败'
    );
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : '获取任务进度失败'
    });
  }
};

/**
 * 暂停任务
 */
const pauseTask = async (
  request: FastifyRequest<{
    Params: TaskStatusParams;
    Body: TaskControlBody;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { taskId } = request.params;
    const { reason } = request.body;

    const syncTaskService =
      request.diScope.resolve<SyncTaskService>('syncTaskService');
    const result = await syncTaskService.pauseSync(taskId, reason);

    reply.send({
      success: result.success,
      data: {
        taskId,
        fromStatus: result.fromStatus,
        toStatus: result.toStatus,
        executionTime: result.executionTime,
        message: result.success ? '任务暂停成功' : '任务暂停失败'
      },
      error: result.errorMessage
    });
  } catch (error) {
    request.log.error({ error, taskId: request.params.taskId }, '暂停任务失败');
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : '暂停任务失败'
    });
  }
};

/**
 * 恢复任务
 */
const resumeTask = async (
  request: FastifyRequest<{
    Params: TaskStatusParams;
    Body: TaskControlBody;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { taskId } = request.params;
    const { reason } = request.body;

    const syncTaskService =
      request.diScope.resolve<SyncTaskService>('syncTaskService');
    const result = await syncTaskService.resumeSync(taskId, reason);

    reply.send({
      success: result.success,
      data: {
        taskId,
        fromStatus: result.fromStatus,
        toStatus: result.toStatus,
        executionTime: result.executionTime,
        message: result.success ? '任务恢复成功' : '任务恢复失败'
      },
      error: result.errorMessage
    });
  } catch (error) {
    request.log.error({ error, taskId: request.params.taskId }, '恢复任务失败');
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : '恢复任务失败'
    });
  }
};

/**
 * 取消任务
 */
const cancelTask = async (
  request: FastifyRequest<{
    Params: TaskStatusParams;
    Body: TaskControlBody;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { taskId } = request.params;
    const { reason } = request.body;

    const syncTaskService =
      request.diScope.resolve<SyncTaskService>('syncTaskService');
    const result = await syncTaskService.cancelSync(taskId, reason);

    reply.send({
      success: result.success,
      data: {
        taskId,
        fromStatus: result.fromStatus,
        toStatus: result.toStatus,
        executionTime: result.executionTime,
        message: result.success ? '任务取消成功' : '任务取消失败'
      },
      error: result.errorMessage
    });
  } catch (error) {
    request.log.error({ error, taskId: request.params.taskId }, '取消任务失败');
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : '取消任务失败'
    });
  }
};

/**
 * 重试任务
 */
const retryTask = async (
  request: FastifyRequest<{
    Params: TaskStatusParams;
    Body: TaskControlBody;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { taskId } = request.params;
    const { reason } = request.body;

    const syncTaskService =
      request.diScope.resolve<SyncTaskService>('syncTaskService');
    const result = await syncTaskService.retrySync(taskId, reason);

    reply.send({
      success: result.success,
      data: {
        taskId,
        fromStatus: result.fromStatus,
        toStatus: result.toStatus,
        executionTime: result.executionTime,
        message: result.success ? '任务重试成功' : '任务重试失败'
      },
      error: result.errorMessage
    });
  } catch (error) {
    request.log.error({ error, taskId: request.params.taskId }, '重试任务失败');
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : '重试任务失败'
    });
  }
};

/**
 * 同步控制器主函数
 * 注册所有同步相关的路由
 */
export async function syncController(fastify: FastifyInstance): Promise<void> {
  // 启动同步任务
  fastify.post(
    '/api/sync/full',
    {
      schema: {
        body: {
          type: 'object',
          required: ['xnxq'],
          properties: {
            xnxq: { type: 'string' },
            batchSize: { type: 'number', minimum: 1, maximum: 1000 },
            maxRetries: { type: 'number', minimum: 0, maximum: 10 },
            timeout: { type: 'number', minimum: 1000, maximum: 3600000 }
          }
        }
      }
    },
    startFullSync
  );

  fastify.post(
    '/api/sync/incremental',
    {
      schema: {
        body: {
          type: 'object',
          required: ['xnxq'],
          properties: {
            xnxq: { type: 'string' },
            batchSize: { type: 'number', minimum: 1, maximum: 1000 },
            maxRetries: { type: 'number', minimum: 0, maximum: 10 },
            timeout: { type: 'number', minimum: 1000, maximum: 3600000 }
          }
        }
      }
    },
    startIncrementalSync
  );

  // 查询任务状态
  fastify.get(
    '/api/sync/task/:taskId/status',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string' }
          },
          required: ['taskId']
        }
      }
    },
    getTaskStatus
  );

  fastify.get(
    '/api/sync/task/:taskId/progress',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string' }
          },
          required: ['taskId']
        }
      }
    },
    getTaskProgress
  );

  // 控制任务
  fastify.post(
    '/api/sync/task/:taskId/pause',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string' }
          },
          required: ['taskId']
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' }
          }
        }
      }
    },
    pauseTask
  );

  fastify.post(
    '/api/sync/task/:taskId/resume',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string' }
          },
          required: ['taskId']
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' }
          }
        }
      }
    },
    resumeTask
  );

  fastify.post(
    '/api/sync/task/:taskId/cancel',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string' }
          },
          required: ['taskId']
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' }
          }
        }
      }
    },
    cancelTask
  );

  fastify.post(
    '/api/sync/task/:taskId/retry',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string' }
          },
          required: ['taskId']
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' }
          }
        }
      }
    },
    retryTask
  );

  fastify.log.info('同步控制器路由注册完成');
}
