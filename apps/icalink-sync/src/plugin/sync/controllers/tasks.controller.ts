/**
 * Tasks 控制器
 * 提供任务管理相关的 HTTP 接口
 */

import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from '@stratix/core';
import type { Kysely } from '@stratix/database';
import {
  ITaskTreeService,
  TaskNode,
  TaskNodePlaceholder,
  TaskStatus,
  TaskType
} from '@stratix/tasks';
import {
  IncrementalSyncConfig,
  IncrementalSyncService
} from '../services/index.js';

/**
 * 任务查询参数接口
 */
interface TaskQueryParams {
  status?: string | string[];
  includeChildren?: boolean;
  includeAncestors?: boolean;
  limit?: number;
  offset?: number;
  page?: number;
  page_size?: number;
}

/**
 * 树形任务查询参数接口
 */
interface TreeTaskQueryParams {
  status?: string | string[];
}

/**
 * 任务树查询参数接口
 */
interface TaskTreeQueryParams {
  /** 返回的最大深度，默认为1（只返回根节点） */
  maxDepth?: number;
  /** 是否包含占位符节点，默认为true */
  includePlaceholders?: boolean;
  /** 分页大小，默认为20 */
  limit?: number;
  /** 分页偏移量，默认为0 */
  offset?: number;
  /** 状态过滤 */
  status?: string | string[];
}

/**
 * 数据库任务实体接口（对应 running_tasks 表）
 */
interface DatabaseTask {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  task_type: string;
  status: TaskStatus;
  priority: number;
  progress: number;
  executor_name: string | null;
  metadata: any | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

/**
 * 树形任务响应接口
 */
interface TreeTaskResponse {
  id: string;
  parent_id: string | null;
  description: string | null;
  status: TaskStatus;
  priority: number;
  progress: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  childrenCount?: number;
  children?: TreeTaskResponse[];
  depth?: number;
}

/**
 * 任务操作参数接口
 */
interface TaskOperationParams {
  reason?: string;
}

/**
 * 任务创建参数接口
 */
interface CreateTaskBody {
  name: string;
  description?: string;
  type: TaskType;
  parentId?: string;
  autoStart?: boolean;
  executorConfig?: {
    name: string;
    params?: Record<string, any>;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * 增量同步请求体接口
 */
interface IncrementalSyncBody {
  xnxq: string;
  batchSize?: number;
  parallel?: boolean;
  maxConcurrency?: number;
}

/**
 * 运行中的任务接口
 */
interface RunningTask {
  id: string;
  parent_id: string | null;
  name: string;
  description?: string;
  task_type: string;
  status: TaskStatus;
  priority?: number;
  progress: number;
  executor_name?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  children: RunningTask[];
}

/**
 * 分页响应接口
 */
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * 格式化任务响应数据
 */
const formatTaskResponse = (task: TaskNode | TaskNodePlaceholder): any => {
  if ('data' in task) {
    // TaskNode 实例
    return {
      id: task.id,
      name: task.data.name,
      description: task.data.description,
      type: task.data.type,
      status: task.status,
      progress: task.progress,
      parentId: task.parent?.id || null,
      executorConfig: task.data.executorName
        ? { name: task.data.executorName }
        : null,
      metadata: task.data.metadata,
      createdAt: task.data.createdAt,
      updatedAt: task.data.updatedAt,
      startedAt: null,
      completedAt: null,
      isPlaceholder: false,
      childrenCount: task.children?.length || 0
    };
  } else {
    // TaskNodePlaceholder 实例
    return {
      id: task.id,
      name: task.name,
      description: null,
      type: null,
      status: task.status,
      progress: task.progress,
      parentId: null,
      createdAt: null,
      updatedAt: null,
      startedAt: null,
      completedAt: task.completedAt,
      isPlaceholder: true,
      childrenCount: 0
    };
  }
};

/**
 * 格式化任务响应数据
 */
const formatTaskToRunning = (task: DatabaseTask | any): RunningTask => {
  // 检查是否是数据库实体（有 task_type 字段）
  const isDatabaseEntity = 'task_type' in task;

  if (isDatabaseEntity) {
    // 处理数据库实体
    return {
      id: task.id,
      parent_id: task.parent_id,
      name: task.name,
      description: task.description,
      task_type: task.task_type,
      status: task.status,
      priority: task.priority || 0,
      progress: task.progress,
      executor_name: task.executor_name,
      metadata: task.metadata,
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
      started_at: task.started_at?.toISOString() || null,
      completed_at: task.completed_at?.toISOString() || null,
      children: [] // 数据库实体默认不包含子任务
    };
  } else {
    // 处理 TaskNode 实体（保持原有逻辑）
    return {
      id: task.id,
      parent_id: task.parent?.id || null,
      name: task.data.name,
      description: task.data.description,
      task_type: task.data.type,
      status: task.status,
      priority: task.data.priority,
      progress: task.progress,
      executor_name: task.data.executorName,
      metadata: task.data.metadata,
      created_at: task.data.createdAt.toISOString(),
      updated_at: task.data.updatedAt.toISOString(),
      started_at: (task.data as any).startedAt?.toISOString() || null,
      completed_at: (task.data as any).completedAt?.toISOString() || null,
      children: (task.children || [])
        .filter((child: any): child is TaskNode => 'data' in child)
        .map(formatTaskToRunning)
    };
  }
};

/**
 * 格式化数据库任务为树形响应格式
 */
const formatDatabaseTaskToTreeResponse = (
  task: DatabaseTask,
  childrenCount?: number
): TreeTaskResponse => {
  return {
    id: task.id,
    parent_id: task.parent_id,
    description: task.description,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    created_at: task.created_at.toISOString(),
    updated_at: task.updated_at.toISOString(),
    started_at: task.started_at?.toISOString() || null,
    completed_at: task.completed_at?.toISOString() || null,
    childrenCount: childrenCount
  };
};

/**
 * 获取任务统计信息
 */
const getStatistics = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const statistics = await taskTreeService.getStatistics();

    reply.send({
      success: true,
      data: statistics
    });
  } catch (error) {
    request.log.error('获取任务统计信息失败', error);
    reply.status(500).send({
      success: false,
      error: '获取任务统计信息失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 获取任务树视图
 * 支持分层返回和分页，避免一次返回过多数据
 */
const getTaskTree = async (
  request: FastifyRequest<{ Querystring: TaskTreeQueryParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const {
      maxDepth = 1,
      includePlaceholders = true,
      limit = 20,
      offset = 0,
      status
    } = request.query;

    // 转换状态参数
    let statusFilter;
    if (status) {
      statusFilter = Array.isArray(status) ? status : [status];
    }

    const options = {
      maxDepth: Number(maxDepth),
      includePlaceholders:
        includePlaceholders === 'true' || includePlaceholders === true,
      limit: Number(limit),
      offset: Number(offset),
      status: statusFilter
    };

    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const layeredTrees = await taskTreeService.getLayeredTaskTrees(options);

    reply.send({
      success: true,
      data: layeredTrees
    });
  } catch (error) {
    request.log.error('获取任务树视图失败', error);
    reply.status(500).send({
      success: false,
      error: '获取任务树视图失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 获取树形根任务列表（用于前端树形展示）
 */
const getTreeRootTasks = async (
  request: FastifyRequest<{ Querystring: TreeTaskQueryParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { status } = request.query;

    const db = request.diScope.resolve<Kysely<any>>('db');

    // 构建状态过滤条件
    const statusFilter = status
      ? Array.isArray(status)
        ? status
        : status.split(',')
      : undefined;

    // 构建查询 - 获取所有根节点（parent_id 为 null）
    let query = db
      .selectFrom('running_tasks_bak25 as rt')
      .where('rt.parent_id', 'is', null)
      .leftJoin(
        db
          .selectFrom('running_tasks_bak25')
          .select(['parent_id'])
          .select((eb: any) => eb.fn.count('id').as('child_count'))
          .where('parent_id', 'is not', null)
          .groupBy('parent_id')
          .as('child_counts'),
        'rt.id',
        'child_counts.parent_id'
      )
      .select([
        'rt.id',
        'rt.parent_id',
        'rt.name',
        'rt.description',
        'rt.task_type',
        'rt.status',
        'rt.priority',
        'rt.progress',
        'rt.executor_name',
        'rt.metadata',
        'rt.created_at',
        'rt.updated_at',
        'rt.started_at',
        'rt.completed_at'
      ])
      .select((eb: any) =>
        eb.fn
          .coalesce('child_counts.child_count', eb.lit(0))
          .as('childrenCount')
      );

    // 添加状态过滤
    if (statusFilter && statusFilter.length > 0) {
      query = query.where('rt.status', 'in', statusFilter);
    }

    // 按创建时间倒序排列
    const tasks = await query.orderBy('rt.created_at', 'desc').execute();

    const formattedTasks = tasks.map((task: any) =>
      formatDatabaseTaskToTreeResponse(
        task as DatabaseTask,
        Number(task.childrenCount || 0)
      )
    );

    reply.send({
      success: true,
      data: {
        items: formattedTasks,
        total: formattedTasks.length
      }
    });
  } catch (error) {
    request.log.error('获取根任务列表失败', error);
    reply.status(500).send({
      success: false,
      error: '获取根任务列表失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 获取任务的子任务列表
 */
const getTaskChildrenList = async (
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: {
      includeChildrenCount?: boolean;
      status?: string | string[];
      page?: number;
      page_size?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const {
      includeChildrenCount = true,
      status,
      page = 1,
      page_size = 100
    } = request.query;

    const db = request.diScope.resolve<Kysely<any>>('db');

    // 构建状态过滤条件
    const statusFilter = status
      ? Array.isArray(status)
        ? status
        : status.split(',')
      : undefined;

    const limit = Number(page_size);
    const offset = (Number(page) - 1) * limit;

    let query = db
      .selectFrom('running_tasks_bak25 as rt')
      .where('rt.parent_id', '=', id);

    // 添加状态过滤
    if (statusFilter && statusFilter.length > 0) {
      query = query.where('rt.status', 'in', statusFilter);
    }

    if (includeChildrenCount) {
      // 包含子任务计数的查询
      query = query
        .leftJoin(
          db
            .selectFrom('running_tasks_bak25')
            .select(['parent_id'])
            .select((eb: any) => eb.fn.count('id').as('child_count'))
            .where('parent_id', 'is not', null)
            .groupBy('parent_id')
            .as('child_counts'),
          'rt.id',
          'child_counts.parent_id'
        )
        .select([
          'rt.id',
          'rt.parent_id',
          'rt.description',
          'rt.status',
          'rt.priority',
          'rt.progress',
          'rt.created_at',
          'rt.updated_at',
          'rt.started_at',
          'rt.completed_at'
        ])
        .select((eb: any) =>
          eb.fn
            .coalesce('child_counts.child_count', eb.lit(0))
            .as('childrenCount')
        );
    } else {
      query = query.selectAll();
    }

    // 获取总数
    let countQuery = db
      .selectFrom('running_tasks_bak25')
      .select((eb: any) => eb.fn.count('id').as('total'))
      .where('parent_id', '=', id);
    if (statusFilter && statusFilter.length > 0) {
      countQuery = countQuery.where('status', 'in', statusFilter);
    }
    const [tasks, countResult] = await Promise.all([
      query
        .orderBy('rt.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      countQuery.executeTakeFirst()
    ]);

    const formattedTasks = tasks.map((task: any) =>
      formatDatabaseTaskToTreeResponse(
        task as DatabaseTask,
        Number(task.childrenCount || 0)
      )
    );
    const total = Number(countResult?.total || 0);
    reply.send({
      success: true,
      data: {
        items: formattedTasks.slice(0, 10),
        total,
        page: Number(page),
        page_size: limit,
        total_pages: Math.ceil(total / limit),
        has_next: offset + limit < total,
        has_prev: offset > 0
      }
    });
  } catch (error) {
    request.log.error('获取子任务列表失败', error);
    reply.status(500).send({
      success: false,
      error: '获取子任务列表失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 获取完整的任务树结构
 */
const getCompleteTaskTree = async (
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: {
      maxDepth?: number;
      status?: string | string[];
    };
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const { maxDepth = 10, status } = request.query;

    const db = request.diScope.resolve<Kysely<any>>('db');

    // 构建状态过滤条件
    const statusFilter = status
      ? Array.isArray(status)
        ? status
        : status.split(',')
      : undefined;

    // 递归获取所有子任务
    const getAllDescendants = async (
      parentId: string,
      currentDepth: number = 0
    ): Promise<TreeTaskResponse[]> => {
      if (currentDepth >= Number(maxDepth)) {
        return [];
      }

      let query = db
        .selectFrom('running_tasks')
        .selectAll()
        .where('parent_id', '=', parentId);

      if (statusFilter && statusFilter.length > 0) {
        query = query.where('status', 'in', statusFilter);
      }

      const children = await query.orderBy('created_at', 'asc').execute();

      const result: TreeTaskResponse[] = [];

      for (const child of children) {
        const formattedChild = formatDatabaseTaskToTreeResponse(
          child as DatabaseTask
        );
        formattedChild.depth = currentDepth + 1;

        // 递归获取子任务的子任务
        const grandChildren = await getAllDescendants(
          child.id,
          currentDepth + 1
        );
        formattedChild.children = grandChildren;
        formattedChild.childrenCount = grandChildren.length;

        result.push(formattedChild);
      }

      return result;
    };

    // 获取根任务
    const rootTask = await db
      .selectFrom('running_tasks')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!rootTask) {
      reply.status(404).send({
        success: false,
        error: '任务不存在',
        message: `找不到ID为 ${id} 的任务`
      });
      return;
    }

    // 构建完整的树结构
    const formattedRoot = formatDatabaseTaskToTreeResponse(
      rootTask as DatabaseTask
    );
    formattedRoot.depth = 0;
    formattedRoot.children = await getAllDescendants(id);
    formattedRoot.childrenCount = formattedRoot.children.length;

    reply.send({
      success: true,
      data: formattedRoot
    });
  } catch (error) {
    request.log.error('获取完整任务树失败', error);
    reply.status(500).send({
      success: false,
      error: '获取完整任务树失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 获取任务的子任务列表
 */
const getTaskChildren = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const children = await taskTreeService.getTaskChildren(id);

    reply.send({
      success: true,
      data: {
        parentId: id,
        children,
        count: children.length
      }
    });
  } catch (error) {
    request.log.error(
      '获取任务子节点失败',
      { taskId: request.params.id },
      error
    );
    reply.status(500).send({
      success: false,
      error: '获取任务子节点失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 获取根任务列表
 */
const getRootTasks = async (
  request: FastifyRequest<{ Querystring: TaskQueryParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const rootTasks = await taskTreeService.getRootTasks();

    // 应用查询过滤器
    let filteredTasks = rootTasks;

    if (request.query.status) {
      const statusFilter = Array.isArray(request.query.status)
        ? request.query.status
        : [request.query.status];

      filteredTasks = filteredTasks.filter((task: TaskNode) =>
        statusFilter.includes(task.status)
      );
    }

    // 应用分页
    const { limit = 50, offset = 0 } = request.query;
    const paginatedTasks = filteredTasks.slice(offset, offset + limit);

    reply.send({
      success: true,
      data: {
        tasks: paginatedTasks.map((task: TaskNode) => formatTaskResponse(task)),
        total: filteredTasks.length,
        limit,
        offset
      }
    });
  } catch (error) {
    request.log.error('获取根任务列表失败', error);
    reply.status(500).send({
      success: false,
      error: '获取根任务列表失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 根据ID获取任务详情
 */
const getTaskById = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const task = taskTreeService.getTask(id);

    if (!task) {
      reply.status(404).send({
        success: false,
        error: '任务不存在',
        message: `任务 ${id} 未找到`
      });
      return;
    }

    reply.send({
      success: true,
      data: formatTaskResponse(task)
    });
  } catch (error) {
    request.log.error('获取任务详情失败', { taskId: request.params.id }, error);
    reply.status(500).send({
      success: false,
      error: '获取任务详情失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 根据名称获取任务详情
 */
const getTaskByName = async (
  request: FastifyRequest<{ Params: { name: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { name } = request.params;
    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const task = taskTreeService.getTaskByname(decodeURIComponent(name));

    if (!task) {
      reply.status(404).send({
        success: false,
        error: '任务不存在',
        message: `名称为 ${name} 的任务未找到`
      });
      return;
    }

    reply.send({
      success: true,
      data: formatTaskResponse(task)
    });
  } catch (error) {
    request.log.error(
      '根据名称获取任务详情失败',
      { taskName: request.params.name },
      error
    );
    reply.status(500).send({
      success: false,
      error: '获取任务详情失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 创建任务
 */
const createTask = async (
  request: FastifyRequest<{ Body: CreateTaskBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const taskData = request.body;

    // 验证必填字段
    if (!taskData.name || !taskData.type) {
      reply.status(400).send({
        success: false,
        error: '参数错误',
        message: '任务名称和类型为必填字段'
      });
      return;
    }

    // 构造创建任务参数
    const createParams = {
      data: {
        name: taskData.name,
        description: taskData.description,
        type: taskData.type,
        executorConfig: taskData.executorConfig,
        metadata: taskData.metadata
      },
      parentId: taskData.parentId,
      autoStart: taskData.autoStart ?? true
    };

    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const task = await taskTreeService.createTask(createParams);

    reply.status(201).send({
      success: true,
      data: formatTaskResponse(task)
    });
  } catch (error) {
    request.log.error('创建任务失败', error);
    reply.status(500).send({
      success: false,
      error: '创建任务失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 启动任务
 */
const startTask = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: TaskOperationParams;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const { reason } = request.body || {};

    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const result = await taskTreeService.startTask(id, reason);

    if (result.success) {
      reply.send({
        success: true,
        data: result
      });
    } else {
      reply.status(400).send({
        success: false,
        error: '启动任务失败',
        message: result.error
      });
    }
  } catch (error) {
    request.log.error('启动任务失败', { taskId: request.params.id }, error);
    reply.status(500).send({
      success: false,
      error: '启动任务失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 暂停任务
 */
const pauseTask = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: TaskOperationParams;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const { reason } = request.body || {};

    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const result = await taskTreeService.pauseTask(id, reason);

    if (result.success) {
      reply.send({
        success: true,
        data: result
      });
    } else {
      reply.status(400).send({
        success: false,
        error: '暂停任务失败',
        message: result.error
      });
    }
  } catch (error) {
    request.log.error('暂停任务失败', { taskId: request.params.id }, error);
    reply.status(500).send({
      success: false,
      error: '暂停任务失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 恢复任务
 */
const resumeTask = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: TaskOperationParams;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const { reason } = request.body || {};

    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const result = await taskTreeService.resumeTask(id, reason);

    if (result.success) {
      reply.send({
        success: true,
        data: result
      });
    } else {
      reply.status(400).send({
        success: false,
        error: '恢复任务失败',
        message: result.error
      });
    }
  } catch (error) {
    request.log.error('恢复任务失败', { taskId: request.params.id }, error);
    reply.status(500).send({
      success: false,
      error: '恢复任务失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 取消任务
 */
const cancelTask = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: TaskOperationParams;
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const { reason } = request.body || {};

    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const result = await taskTreeService.cancelTask(id, reason);

    if (result.success) {
      reply.send({
        success: true,
        data: result
      });
    } else {
      reply.status(400).send({
        success: false,
        error: '取消任务失败',
        message: result.error
      });
    }
  } catch (error) {
    request.log.error('取消任务失败', { taskId: request.params.id }, error);
    reply.status(500).send({
      success: false,
      error: '取消任务失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 标记任务成功
 */
const markTaskSuccess = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: TaskOperationParams & { result?: any };
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const { reason, result } = request.body || {};

    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const operationResult = await taskTreeService.success(id, reason, result);

    if (operationResult.success) {
      reply.send({
        success: true,
        data: operationResult
      });
    } else {
      reply.status(400).send({
        success: false,
        error: '标记任务成功失败',
        message: operationResult.error
      });
    }
  } catch (error) {
    request.log.error('标记任务成功失败', { taskId: request.params.id }, error);
    reply.status(500).send({
      success: false,
      error: '标记任务成功失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 标记任务失败
 */
const markTaskFail = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: TaskOperationParams & { error?: string };
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = request.params;
    const { reason, error: errorMessage } = request.body || {};

    const taskError = errorMessage ? new Error(errorMessage) : undefined;
    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const operationResult = await taskTreeService.fail(id, reason, taskError);

    if (operationResult.success) {
      reply.send({
        success: true,
        data: operationResult
      });
    } else {
      reply.status(400).send({
        success: false,
        error: '标记任务失败失败',
        message: operationResult.error
      });
    }
  } catch (error) {
    request.log.error('标记任务失败失败', { taskId: request.params.id }, error);
    reply.status(500).send({
      success: false,
      error: '标记任务失败失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 恢复运行中的任务
 */
const recoverTasks = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const taskTreeService =
      request.diScope.resolve<ITaskTreeService>('taskTreeService');
    const result = await taskTreeService.recoverRunningTasks();

    reply.send({
      success: true,
      data: result
    });
  } catch (error) {
    request.log.error('恢复任务失败', error);
    reply.status(500).send({
      success: false,
      error: '恢复任务失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 启动增量同步
 */
const startIncrementalSync = async (
  request: FastifyRequest<{ Body: IncrementalSyncBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const {
      xnxq,
      batchSize = 50,
      parallel = false,
      maxConcurrency = 5
    } = request.body;

    const config: IncrementalSyncConfig = {
      xnxq,
      batchSize,
      parallel,
      maxConcurrency
    };

    const incrementalSyncService =
      request.diScope.resolve<IncrementalSyncService>('incrementalSyncService');
    const stats = await incrementalSyncService.startIncrementalSync(config);

    reply.send({
      success: true,
      data: stats,
      message: '增量同步完成'
    });
  } catch (error) {
    request.log.error('增量同步失败', error);
    reply.status(500).send({
      success: false,
      error: '增量同步失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 获取增量同步状态
 */
const getIncrementalSyncStatus = async (
  request: FastifyRequest<{ Params: { xnxq: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { xnxq } = request.params;

    const incrementalSyncService =
      request.diScope.resolve<IncrementalSyncService>('incrementalSyncService');
    const status = await incrementalSyncService.getIncrementalSyncStatus(xnxq);

    reply.send({
      success: true,
      data: status
    });
  } catch (error) {
    request.log.error(
      '获取增量同步状态失败',
      { xnxq: request.params.xnxq },
      error
    );
    reply.status(500).send({
      success: false,
      error: '获取增量同步状态失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * 获取任务列表（支持按状态等条件过滤）
 * 这是新的通用任务查询接口
 */
const getTasks = async (
  request: FastifyRequest<{ Querystring: TaskQueryParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const {
      status,
      page = 1,
      page_size = 50,
      limit: queryLimit,
      offset: queryOffset
    } = request.query;

    const limit = queryLimit ? Number(queryLimit) : Number(page_size);
    const offset = queryOffset
      ? Number(queryOffset)
      : (Number(page) - 1) * limit;

    const db = request.diScope.resolve<Kysely<any>>('db');

    // 构建状态过滤条件
    const statusFilter = status
      ? Array.isArray(status)
        ? status
        : status.split(',')
      : undefined;

    // 构建查询
    let query = db.selectFrom('running_tasks').selectAll();

    // 添加状态过滤
    if (statusFilter && statusFilter.length > 0) {
      query = query.where('status', 'in', statusFilter);
    }

    // 获取总数
    let countQuery = db
      .selectFrom('running_tasks')
      .select((eb: any) => eb.fn.count('id').as('total'));

    if (statusFilter && statusFilter.length > 0) {
      countQuery = countQuery.where('status', 'in', statusFilter);
    }

    const [tasks, countResult] = await Promise.all([
      query.orderBy('created_at', 'desc').limit(limit).offset(offset).execute(),
      countQuery.executeTakeFirst()
    ]);

    const formattedTasks = tasks.map((task: any) => formatTaskToRunning(task));
    const total = Number(countResult?.total || 0);

    reply.send({
      success: true,
      data: {
        items: formattedTasks,
        total,
        page: Number(page),
        page_size: limit,
        total_pages: Math.ceil(total / limit),
        has_next: offset + limit < total,
        has_prev: offset > 0
      }
    });
  } catch (error) {
    request.log.error('获取任务列表失败', error);
    reply.status(500).send({
      success: false,
      error: '获取任务列表失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Tasks 控制器主函数
 * 注册所有任务相关的路由
 */
export async function tasksController(fastify: FastifyInstance): Promise<void> {
  // 新的通用任务查询接口
  fastify.get('/apiv2/tasks', getTasks);

  // 获取任务统计信息
  fastify.get('/apiv2/tasks/statistics', getStatistics);

  // 获取任务树视图（分层返回）
  fastify.get('/apiv2/tasks/tree', getTaskTree);

  // 获取树形根任务列表（用于前端树形展示）
  fastify.get('/apiv2/tasks/tree/roots', getTreeRootTasks);

  // 获取任务的子任务列表（树形展示用）
  fastify.get('/apiv2/tasks/:id/tree/children', getTaskChildrenList);

  // 获取完整的任务树结构
  fastify.get('/apiv2/tasks/:id/tree/complete', getCompleteTaskTree);

  // 获取根任务列表（原有接口）
  fastify.get('/apiv2/tasks/roots', getRootTasks);

  // 获取任务的子任务列表（原有接口）
  fastify.get('/apiv2/tasks/:id/children', getTaskChildren);

  // 根据ID获取任务详情
  fastify.get('/apiv2/tasks/:id', getTaskById);

  // 根据名称获取任务详情
  fastify.get('/apiv2/tasks/by-name/:name', getTaskByName);

  // 创建任务
  fastify.post('/apiv2/tasks', createTask);

  // 启动任务
  fastify.post('/apiv2/tasks/:id/start', startTask);

  // 暂停任务
  fastify.post('/apiv2/tasks/:id/pause', pauseTask);

  // 恢复任务
  fastify.post('/apiv2/tasks/:id/resume', resumeTask);

  // 取消任务
  fastify.post('/apiv2/tasks/:id/cancel', cancelTask);

  // 标记任务成功
  fastify.post('/apiv2/tasks/:id/success', markTaskSuccess);

  // 标记任务失败
  fastify.post('/apiv2/tasks/:id/fail', markTaskFail);

  // 恢复运行中的任务
  fastify.post('/apiv2/tasks/recovery', recoverTasks);

  // 启动增量同步
  fastify.post('/apiv2/tasks/incremental-sync', startIncrementalSync);

  // 获取增量同步状态
  fastify.get('/api/tasks/incremental-sync/:xnxq', getIncrementalSyncStatus);

  fastify.log.info('Tasks 控制器路由注册完成');
}
