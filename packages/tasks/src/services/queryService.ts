/**
 * 任务查询服务
 * 基于现有的 repositories 提供高效的任务查询功能，支持任务树查询
 */

import { Logger } from '@stratix/core';
import { CompletedTaskRepository } from '../repositories/CompletedTaskRepository.js';
import { RunningTaskRepository } from '../repositories/RunningTaskRepository.js';
import type {
  CompletedTaskEntity,
  RunningTaskEntity
} from '../repositories/types.js';
import { TaskStatus } from '../types/task.types.js';

/**
 * 查询条件接口
 */
export interface TaskQueryConditions {
  /** 任务ID */
  id?: string;
  /** 父任务ID */
  parentId?: string | null;
  /** 任务名称（支持模糊查询） */
  name?: string;
  /** 任务类型 */
  taskType?: string;
  /** 任务状态 */
  status?: TaskStatus | TaskStatus[];
  /** 执行器名称 */
  executorName?: string;
  /** 优先级范围 */
  priorityRange?: { min?: number; max?: number };
  /** 进度范围 */
  progressRange?: { min?: number; max?: number };
  /** 创建时间范围 */
  createdAtRange?: { start?: Date; end?: Date };
  /** 更新时间范围 */
  updatedAtRange?: { start?: Date; end?: Date };
  /** 是否包含元数据筛选 */
  hasMetadata?: boolean;
  /** 分页参数 */
  pagination?: {
    limit?: number;
    offset?: number;
  };
  /** 排序参数 */
  orderBy?: {
    field: 'created_at' | 'updated_at' | 'priority' | 'progress' | 'name';
    direction: 'asc' | 'desc';
  }[];
}

/**
 * 查询结果接口
 */
export interface TaskQueryResult {
  /** 运行中任务 */
  runningTasks: RunningTaskEntity[];
  /** 已完成任务 */
  completedTasks: CompletedTaskEntity[];
  /** 总数 */
  total: number;
  /** 分页信息 */
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * 子任务查询结果
 */
export interface ChildTasksResult {
  /** 直接子任务 */
  directChildren: TaskQueryResult;
  /** 所有后代任务 */
  allDescendants?: TaskQueryResult;
  /** 父任务信息 */
  parentTask?: RunningTaskEntity | CompletedTaskEntity;
}

/**
 * 任务统计信息
 */
export interface TaskStatistics {
  /** 按状态统计 */
  byStatus: Record<TaskStatus, number>;
  /** 按类型统计 */
  byType: Record<string, number>;
  /** 按执行器统计 */
  byExecutor: Record<string, number>;
  /** 总任务数 */
  total: number;
  /** 运行中任务数 */
  running: number;
  /** 已完成任务数 */
  completed: number;
  /** 平均进度 */
  averageProgress: number;
  /** 任务树深度统计 */
  depthDistribution: Record<number, number>;
}

/**
 * 任务查询服务
 */
export class QueryService {
  constructor(
    private runningTaskRepo: RunningTaskRepository,
    private completedTaskRepo: CompletedTaskRepository,
    private log: Logger
  ) {}

  /**
   * 根据条件查询任务
   */
  async queryTasks(
    conditions: TaskQueryConditions = {}
  ): Promise<TaskQueryResult> {
    const startTime = Date.now();

    try {
      // 如果指定了ID，直接查找单个任务
      if (conditions.id) {
        const runningTask = await this.runningTaskRepo.findById(conditions.id);
        const completedTask = runningTask
          ? null
          : await this.completedTaskRepo.findById(conditions.id);

        return {
          runningTasks: runningTask ? [runningTask] : [],
          completedTasks: completedTask ? [completedTask] : [],
          total: runningTask || completedTask ? 1 : 0
        };
      }

      // 如果指定了父任务ID，查询子任务
      if (conditions.parentId !== undefined) {
        return await this.queryTasksByParentId(conditions);
      }

      // 如果指定了状态，按状态查询
      if (conditions.status) {
        return await this.queryTasksByStatus(conditions);
      }

      // 默认查询所有任务
      return await this.queryAllTasks(conditions);
    } catch (error) {
      this.log.error({ conditions, error }, '任务查询失败');
      throw error;
    }
  }

  /**
   * 根据父任务ID查询子任务
   */
  async queryChildTasks(
    parentId: string,
    includeDescendants = false,
    conditions: Omit<TaskQueryConditions, 'parentId'> = {}
  ): Promise<ChildTasksResult> {
    const startTime = Date.now();

    try {
      // 查询父任务信息
      const parentTask = await this.getTaskById(parentId);

      if (!parentTask) {
        throw new Error(`父任务不存在: ${parentId}`);
      }

      // 查询直接子任务
      const directChildrenConditions: TaskQueryConditions = {
        ...conditions,
        parentId
      };
      const directChildren = await this.queryTasks(directChildrenConditions);

      let allDescendants: TaskQueryResult | undefined;

      // 如果需要查询所有后代任务
      if (includeDescendants) {
        allDescendants = await this.queryDescendantTasks(parentId, conditions);
      }

      const executionTime = Date.now() - startTime;

      this.log.debug(
        {
          parentId,
          includeDescendants,
          directChildrenCount: directChildren.total,
          allDescendantsCount: allDescendants?.total,
          executionTime
        },
        '子任务查询完成'
      );

      return {
        directChildren,
        allDescendants,
        parentTask
      };
    } catch (error) {
      this.log.error(
        { parentId, includeDescendants, conditions, error },
        '子任务查询失败'
      );
      throw error;
    }
  }

  /**
   * 查询任务的所有后代任务（递归查询）
   */
  async queryDescendantTasks(
    rootParentId: string,
    conditions: Omit<TaskQueryConditions, 'parentId'> = {}
  ): Promise<TaskQueryResult> {
    const allDescendants: RunningTaskEntity[] = [];
    const allCompletedDescendants: CompletedTaskEntity[] = [];

    // 使用队列进行广度优先搜索
    const queue: string[] = [rootParentId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentParentId = queue.shift()!;

      if (visited.has(currentParentId)) {
        continue;
      }
      visited.add(currentParentId);

      // 查询当前父任务的直接子任务
      const childConditions: TaskQueryConditions = {
        ...conditions,
        parentId: currentParentId
      };

      const children = await this.queryTasks(childConditions);

      // 收集子任务
      allDescendants.push(...children.runningTasks);
      allCompletedDescendants.push(...children.completedTasks);

      // 将子任务的ID加入队列，继续查找下一层
      const childIds = [
        ...children.runningTasks.map((t) => t.id),
        ...children.completedTasks.map((t) => t.id)
      ];
      queue.push(...childIds);
    }

    return {
      runningTasks: allDescendants,
      completedTasks: allCompletedDescendants,
      total: allDescendants.length + allCompletedDescendants.length
    };
  }

  /**
   * 根据ID获取单个任务（优先查找运行中任务）
   */
  async getTaskById(
    id: string
  ): Promise<RunningTaskEntity | CompletedTaskEntity | null> {
    try {
      // 先查找运行中任务
      const runningTask = await this.runningTaskRepo.findById(id);
      if (runningTask) {
        return runningTask;
      }

      // 如果没找到，查找已完成任务
      const completedTask = await this.completedTaskRepo.findById(id);
      return completedTask;
    } catch (error) {
      this.log.error({ id, error }, '根据ID查询任务失败');
      throw error;
    }
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStatistics(
    conditions: Omit<TaskQueryConditions, 'pagination'> = {}
  ): Promise<TaskStatistics> {
    try {
      // 获取运行中任务统计
      const runningStats = await this.runningTaskRepo.getStats();

      // 获取已完成任务统计
      const completedStats = await this.completedTaskRepo.getStats();

      // 合并统计信息
      const byStatus: Record<TaskStatus, number> = {} as any;
      Object.values(TaskStatus).forEach((status) => {
        byStatus[status] = 0;
      });

      byStatus[TaskStatus.PENDING] = runningStats.pending;
      byStatus[TaskStatus.RUNNING] = runningStats.running;
      byStatus[TaskStatus.PAUSED] = runningStats.paused;
      byStatus[TaskStatus.SUCCESS] = completedStats.success;
      byStatus[TaskStatus.FAILED] = completedStats.failed;
      byStatus[TaskStatus.CANCELLED] = completedStats.cancelled;

      // 获取执行器统计
      const activeExecutors =
        await this.runningTaskRepo.getActiveExecutorNames();
      const byExecutor: Record<string, number> = {};
      for (const executor of activeExecutors) {
        byExecutor[executor] = 1; // 简化统计，实际应该计算每个执行器的任务数
      }

      // 获取所有任务来计算其他统计信息
      const allTasks = await this.queryTasks(conditions);
      const allTasksList = [
        ...allTasks.runningTasks,
        ...allTasks.completedTasks
      ];

      // 按类型统计
      const byType: Record<string, number> = {};
      for (const task of allTasksList) {
        byType[task.task_type] = (byType[task.task_type] || 0) + 1;
      }

      // 计算平均进度
      const totalProgress = allTasksList.reduce(
        (sum, task) => sum + task.progress,
        0
      );
      const averageProgress =
        allTasksList.length > 0 ? totalProgress / allTasksList.length : 0;

      // 任务树深度统计 - 简化版本
      const depthDistribution: Record<number, number> = {};
      for (const task of allTasksList) {
        const depth = await this.getTaskDepth(task.id);
        depthDistribution[depth] = (depthDistribution[depth] || 0) + 1;
      }

      return {
        byStatus,
        byType,
        byExecutor,
        total: runningStats.total + completedStats.total,
        running: runningStats.total,
        completed: completedStats.total,
        averageProgress,
        depthDistribution
      };
    } catch (error) {
      this.log.error({ conditions, error }, '获取任务统计信息失败');
      throw error;
    }
  }

  /**
   * 获取任务在树中的深度
   */
  async getTaskDepth(taskId: string): Promise<number> {
    let depth = 0;
    let currentTask = await this.getTaskById(taskId);

    while (currentTask?.parent_id) {
      depth++;
      currentTask = await this.getTaskById(currentTask.parent_id);

      // 防止无限循环
      if (depth > 100) {
        this.log.warn({ taskId, depth }, '任务深度查询可能存在循环引用');
        break;
      }
    }

    return depth;
  }

  /**
   * 获取根任务列表
   */
  async getRootTasks(options?: {
    limit?: number;
    offset?: number;
  }): Promise<TaskQueryResult> {
    try {
      // 获取运行中的根任务
      const runningRootTasks = await this.runningTaskRepo.findRootTasks();

      // 获取已完成的根任务
      const completedRootTasks =
        await this.completedTaskRepo.findCompletedRootTasks(options);

      // 应用分页逻辑（简化版本）
      let allRootTasks = [...runningRootTasks, ...completedRootTasks];

      if (options?.offset) {
        allRootTasks = allRootTasks.slice(options.offset);
      }

      if (options?.limit) {
        allRootTasks = allRootTasks.slice(0, options.limit);
      }

      // 分离运行中和已完成的任务
      const finalRunningTasks: RunningTaskEntity[] = [];
      const finalCompletedTasks: CompletedTaskEntity[] = [];

      for (const task of allRootTasks) {
        if ('started_at' in task && task.started_at !== undefined) {
          // 判断是否为运行中任务（这里简化判断）
          if (
            [
              TaskStatus.PENDING,
              TaskStatus.RUNNING,
              TaskStatus.PAUSED
            ].includes(task.status)
          ) {
            finalRunningTasks.push(task as RunningTaskEntity);
          } else {
            finalCompletedTasks.push(task as CompletedTaskEntity);
          }
        }
      }

      return {
        runningTasks: finalRunningTasks,
        completedTasks: finalCompletedTasks,
        total: finalRunningTasks.length + finalCompletedTasks.length,
        pagination: options
          ? {
              limit: options.limit || 20,
              offset: options.offset || 0,
              hasMore: allRootTasks.length >= (options.limit || 20)
            }
          : undefined
      };
    } catch (error) {
      this.log.error({ options, error }, '获取根任务列表失败');
      throw error;
    }
  }

  /**
   * 获取完整的任务树（根据根任务ID）
   */
  async getTaskTree(rootTaskId: string): Promise<TaskQueryResult> {
    try {
      // 先尝试从运行中任务获取完整树
      const runningTree =
        await this.runningTaskRepo.findTaskTreeByRoot(rootTaskId);
      if (runningTree.length > 0) {
        return {
          runningTasks: runningTree,
          completedTasks: [],
          total: runningTree.length
        };
      }

      // 如果运行中任务没有，尝试从已完成任务获取
      const completedTree =
        await this.completedTaskRepo.findTaskTreeByRootId(rootTaskId);
      return {
        runningTasks: [],
        completedTasks: completedTree,
        total: completedTree.length
      };
    } catch (error) {
      this.log.error({ rootTaskId, error }, '获取任务树失败');
      throw error;
    }
  }

  /**
   * 根据父任务ID查询任务
   */
  private async queryTasksByParentId(
    conditions: TaskQueryConditions
  ): Promise<TaskQueryResult> {
    let runningTasks: RunningTaskEntity[] = [];
    let completedTasks: CompletedTaskEntity[] = [];

    if (conditions.parentId === null) {
      // 查询根任务
      const rootResult = await this.getRootTasks(conditions.pagination);
      return rootResult;
    } else if (conditions.parentId) {
      // 查询指定父任务的子任务
      runningTasks = await this.runningTaskRepo.findByParentId(
        conditions.parentId
      );
      // 已完成任务暂时没有直接的 findByParentId 方法，需要扩展
    }

    // 应用其他过滤条件
    const filteredResult = this.applyFilters(
      { runningTasks, completedTasks },
      conditions
    );

    return {
      ...filteredResult,
      total:
        filteredResult.runningTasks.length +
        filteredResult.completedTasks.length
    };
  }

  /**
   * 根据状态查询任务
   */
  private async queryTasksByStatus(
    conditions: TaskQueryConditions
  ): Promise<TaskQueryResult> {
    const status = conditions.status!;
    const statuses = Array.isArray(status) ? status : [status];

    let runningTasks: RunningTaskEntity[] = [];
    let completedTasks: CompletedTaskEntity[] = [];

    // 根据状态分别查询
    const runningStatuses = statuses.filter((s) =>
      [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.PAUSED].includes(s)
    );
    const completedStatuses = statuses.filter((s) =>
      [
        TaskStatus.SUCCESS,
        TaskStatus.FAILED,
        TaskStatus.CANCELLED,
        TaskStatus.COMPLETED
      ].includes(s)
    );

    if (runningStatuses.length > 0) {
      runningTasks = await this.runningTaskRepo.findByStatus(runningStatuses);
    }

    // 已完成任务的状态查询需要扩展 CompletedTaskRepository
    // 暂时跳过，或者可以通过其他方式实现

    const filteredResult = this.applyFilters(
      { runningTasks, completedTasks },
      conditions
    );

    return {
      ...filteredResult,
      total:
        filteredResult.runningTasks.length +
        filteredResult.completedTasks.length
    };
  }

  /**
   * 查询所有任务
   */
  private async queryAllTasks(
    conditions: TaskQueryConditions
  ): Promise<TaskQueryResult> {
    // 获取所有运行中任务
    const runningTasks = await this.runningTaskRepo.findAll();

    // 获取所有已完成任务（暂时限制数量避免性能问题）
    const completedTasks = await this.completedTaskRepo.findCompletedRootTasks({
      limit: conditions.pagination?.limit || 100
    });

    const filteredResult = this.applyFilters(
      { runningTasks, completedTasks },
      conditions
    );

    return {
      ...filteredResult,
      total:
        filteredResult.runningTasks.length +
        filteredResult.completedTasks.length
    };
  }

  /**
   * 应用过滤条件
   */
  private applyFilters(
    tasks: {
      runningTasks: RunningTaskEntity[];
      completedTasks: CompletedTaskEntity[];
    },
    conditions: TaskQueryConditions
  ): {
    runningTasks: RunningTaskEntity[];
    completedTasks: CompletedTaskEntity[];
  } {
    let { runningTasks, completedTasks } = tasks;

    // 应用名称过滤
    if (conditions.name) {
      const nameFilter = (task: RunningTaskEntity | CompletedTaskEntity) =>
        task.name.toLowerCase().includes(conditions.name!.toLowerCase());
      runningTasks = runningTasks.filter(nameFilter);
      completedTasks = completedTasks.filter(nameFilter);
    }

    // 应用任务类型过滤
    if (conditions.taskType) {
      const typeFilter = (task: RunningTaskEntity | CompletedTaskEntity) =>
        task.task_type === conditions.taskType;
      runningTasks = runningTasks.filter(typeFilter);
      completedTasks = completedTasks.filter(typeFilter);
    }

    // 应用执行器过滤
    if (conditions.executorName) {
      const executorFilter = (task: RunningTaskEntity | CompletedTaskEntity) =>
        task.executor_name === conditions.executorName;
      runningTasks = runningTasks.filter(executorFilter);
      completedTasks = completedTasks.filter(executorFilter);
    }

    // 应用优先级范围过滤
    if (conditions.priorityRange) {
      const { min, max } = conditions.priorityRange;
      const priorityFilter = (
        task: RunningTaskEntity | CompletedTaskEntity
      ) => {
        if (min !== undefined && task.priority < min) return false;
        if (max !== undefined && task.priority > max) return false;
        return true;
      };
      runningTasks = runningTasks.filter(priorityFilter);
      completedTasks = completedTasks.filter(priorityFilter);
    }

    // 应用进度范围过滤
    if (conditions.progressRange) {
      const { min, max } = conditions.progressRange;
      const progressFilter = (
        task: RunningTaskEntity | CompletedTaskEntity
      ) => {
        if (min !== undefined && task.progress < min) return false;
        if (max !== undefined && task.progress > max) return false;
        return true;
      };
      runningTasks = runningTasks.filter(progressFilter);
      completedTasks = completedTasks.filter(progressFilter);
    }

    // 应用元数据过滤
    if (conditions.hasMetadata !== undefined) {
      const metadataFilter = (
        task: RunningTaskEntity | CompletedTaskEntity
      ) => {
        const hasMetadata =
          task.metadata && Object.keys(task.metadata).length > 0;
        return hasMetadata === conditions.hasMetadata;
      };
      runningTasks = runningTasks.filter(metadataFilter);
      completedTasks = completedTasks.filter(metadataFilter);
    }

    // 应用时间范围过滤
    if (conditions.createdAtRange) {
      const { start, end } = conditions.createdAtRange;
      const timeFilter = (task: RunningTaskEntity | CompletedTaskEntity) => {
        const taskTime = new Date(task.created_at);
        if (start && taskTime < start) return false;
        if (end && taskTime > end) return false;
        return true;
      };
      runningTasks = runningTasks.filter(timeFilter);
      completedTasks = completedTasks.filter(timeFilter);
    }

    return { runningTasks, completedTasks };
  }
}
