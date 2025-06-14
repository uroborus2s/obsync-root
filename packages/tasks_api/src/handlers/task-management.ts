/**
 * 任务管理相关的路由处理器
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import type { TaskManager } from '@stratix/tasks';

/**
 * 创建任务
 */
export async function createTask(
  request: FastifyRequest<{
    Body: {
      parentId?: string;
      name: string;
      description?: string;
      type: 'directory' | 'leaf';
      executorConfig?: {
        name: string;
        params?: any;
        timeout?: number;
        retries?: number;
        retryDelay?: number;
      };
      metadata?: any;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager =
    request.server.diContainer.resolve<TaskManager>('taskManager');
  const task = await taskManager.createTask(request.body);
  reply.code(201).send(task);
}

/**
 * 获取任务
 */
export async function getTask(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager =
    request.server.diContainer.resolve<TaskManager>('taskManager');
  const { id } = request.params;
  const task = await taskManager.getTask(id);

  if (!task) {
    reply.code(404).send({ error: 'Task not found' });
    return;
  }

  reply.send(task);
}

/**
 * 更新任务
 */
export async function updateTask(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      executorConfig?: {
        name: string;
        params?: any;
        timeout?: number;
        retries?: number;
        retryDelay?: number;
      };
      metadata?: any;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager =
    request.server.diContainer.resolve<TaskManager>('taskManager');
  const { id } = request.params;
  const task = await taskManager.updateTask(id, request.body);
  reply.send(task);
}

/**
 * 删除任务
 */
export async function deleteTask(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: {
      cascade?: boolean;
      force?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager =
    request.server.diContainer.resolve<TaskManager>('taskManager');
  const { id } = request.params;
  const { cascade, force } = request.query;

  await taskManager.deleteTask(id, { cascade, force });
  reply.code(204).send();
}

/**
 * 查询任务列表
 */
export async function queryTasks(
  request: FastifyRequest<{
    Querystring: {
      parentId?: string;
      status?: string | string[];
      type?: 'directory' | 'leaf';
      tags?: string[];
      offset?: number;
      limit?: number;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    console.log('🔍 queryTasks 开始执行');
    console.log('📝 请求参数:', request.query);

    // 检查依赖注入
    const taskManager =
      request.server.diContainer.resolve<TaskManager>('taskManager');
    console.log('✅ TaskManager 解析成功:', !!taskManager);

    if (!taskManager) {
      console.error('❌ TaskManager 未找到');
      reply.code(500).send({ error: 'TaskManager not found' });
      return;
    }

    // 调用查询方法
    console.log('🔄 调用 taskManager.queryTasks 开始执行');
    const tasks = await taskManager.queryTasks(request.query);
    console.log(
      '🔄 TaskService.queryTasks 完成，返回任务数量:',
      tasks?.length || 0
    );

    // 详细检查返回的数据
    console.log('📊 查询结果:', {
      taskCount: tasks?.length || 0,
      isArray: Array.isArray(tasks),
      type: typeof tasks,
      firstTask: tasks?.[0]
        ? {
            id: tasks[0].id,
            name: tasks[0].name,
            status: tasks[0].status
          }
        : null
    });

    // 简单处理 - 直接返回数据，不做复杂清理
    if (!tasks || !Array.isArray(tasks)) {
      console.log('📋 返回空数组 - 数据无效');
      reply.header('Content-Type', 'application/json');
      reply.send([]);
      return;
    }

    if (tasks.length === 0) {
      console.log('📋 返回空数组 - 无任务');
      reply.header('Content-Type', 'application/json');
      reply.send([]);
      return;
    }

    // 尝试发送响应
    console.log('📤 准备发送响应，任务数量:', tasks.length);

    // 设置响应头
    reply.header('Content-Type', 'application/json');

    // 逐步测试数据序列化
    try {
      // 测试1: 发送任务数量
      console.log('🧪 测试1: 发送任务数量');
      // reply.send({ count: tasks.length, message: '任务数量测试' });
      // return;

      // 测试2: 发送第一个任务的基本信息
      if (tasks.length > 0) {
        console.log('🧪 测试2: 发送第一个任务的基本信息');
        const firstTask = tasks[0];
        console.log('第一个任务原始数据:', firstTask);

        const simpleTask = {
          id: firstTask.id,
          name: firstTask.name,
          status: firstTask.status,
          type: firstTask.type
        };

        console.log('简化的任务数据:', simpleTask);
        // reply.send([simpleTask]);
        // return;
      }

      // 测试3: 尝试序列化所有任务的基本信息
      console.log('🧪 测试3: 序列化所有任务的基本信息');
      const simpleTasks = tasks.map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status,
        type: task.type
      }));

      console.log('简化任务列表长度:', simpleTasks.length);
      JSON.stringify(simpleTasks); // 测试序列化
      console.log('✅ 简化任务数据序列化成功');

      reply.send(simpleTasks);
    } catch (serializeError) {
      console.error('💥 序列化测试失败:', serializeError);
      reply.send({
        error: '序列化失败',
        message:
          serializeError instanceof Error
            ? serializeError.message
            : String(serializeError),
        taskCount: tasks.length
      });
    }
  } catch (error) {
    console.error('💥 queryTasks 执行出错:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query
    });

    reply.code(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * 获取任务树
 */
export async function getTaskTree(
  request: FastifyRequest<{
    Querystring: {
      rootId?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const taskManager =
    request.server.diContainer.resolve<TaskManager>('taskManager');
  const { rootId } = request.query;
  const tree = await taskManager.getTaskTree(rootId);
  reply.send(tree);
}
