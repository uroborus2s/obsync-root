/**
 * 任务服务实现
 * 特点：
 * 1. 使用LRU缓存管理，最多保留5000个任务对象
 * 2. 节点间使用弱关联（parentId + childrenIds）
 * 3. 直接操作模式，不使用事件触发启动/暂停/恢复
 * 4. 运行任务时：先变更状态，同步更新数据库，同时运行任务方法
 */

import { IStratixApp, Logger } from '@stratix/core';
import { ids } from '@stratix/utils';
import { SharedContextData } from '../entity/SharedContext.js';
import { TaskEventBus } from '../events/TaskEventBus.js';
import { CompletedTaskRepository } from '../repositories/CompletedTaskRepository.js';
import { RunningTaskRepository } from '../repositories/RunningTaskRepository.js';
import { SharedContextRepository } from '../repositories/SharedContextRepository.js';
import { TaskStatus } from '../types/task.types.js';

/**
 * 任务节点数据（完整数据，存储在LRU缓存中）
 */
interface TaskNodeData {
  id: string;
  parentId: string | null;
  name: string;
  description: string;
  type: string;
  executorName: string;
  priority: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  status: TaskStatus;
  progress: number;
  totalChildren: number; // 总计子任务数量
  completedChildren: number; // 已完成子任务数量
  childrenIds: string[];
}

/**
 * 任务操作结果
 */
interface TaskOperationResult {
  success: boolean;
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  errorMessage?: string;
  executionTime: number;
}

/**
 * 任务服务接口
 */
export interface ITaskService {
  // 基础任务管理
  createTask(taskData: {
    id?: string;
    parentId?: string;
    name: string;
    description: string;
    type: string;
    executorName?: string;
    priority?: number;
    metadata?: Record<string, any>;
  }): Promise<string>;

  getTaskData(taskId: string): Promise<TaskNodeData | null>;

  // 任务状态控制
  startTask(taskId: string, reason?: string): Promise<TaskOperationResult>;
  pauseTask(taskId: string, reason?: string): Promise<TaskOperationResult>;
  resumeTask(taskId: string, reason?: string): Promise<TaskOperationResult>;
  cancelTask(taskId: string, reason?: string): Promise<TaskOperationResult>;
  retryTask(taskId: string, reason?: string): Promise<TaskOperationResult>;

  // 任务完成
  completeTask(
    taskId: string,
    result?: any,
    reason?: string
  ): Promise<TaskOperationResult>;
  succeedTask(
    taskId: string,
    result?: any,
    reason?: string
  ): Promise<TaskOperationResult>;
  failTask(
    taskId: string,
    error?: any,
    reason?: string
  ): Promise<TaskOperationResult>;

  // 任务查询
  getChildrenIds(taskId: string): Promise<string[]>;
  getParentId(taskId: string): Promise<string | null>;
  getTaskCompletionPercentage(taskId: string): Promise<number>;
  getChildrenCompletionStats(taskId: string): Promise<{
    totalChildren: number;
    completedChildren: number;
    completionPercentage: number;
  } | null>;

  // 系统管理
  recoverRunningTasks(): Promise<void>;
  getCacheStats(): any;
}

/**
 * LRU 缓存管理器
 * 最多保留5000个任务对象
 */
class TaskNodeCache {
  private cache = new Map<string, TaskNodeData>();
  private accessOrder: string[] = [];
  private readonly maxSize = 5000;

  get(id: string): TaskNodeData | null {
    const data = this.cache.get(id);
    if (data) {
      this.updateAccessOrder(id);
      return data;
    }
    return null;
  }

  set(id: string, data: TaskNodeData): void {
    if (this.cache.has(id)) {
      this.cache.set(id, data);
      this.updateAccessOrder(id);
    } else {
      if (this.cache.size >= this.maxSize) {
        this.evictOldest();
      }
      this.cache.set(id, data);
      this.accessOrder.push(id);
    }
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  delete(id: string): boolean {
    if (this.cache.has(id)) {
      this.cache.delete(id);
      const index = this.accessOrder.indexOf(id);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  private updateAccessOrder(id: string): void {
    const index = this.accessOrder.indexOf(id);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(id);
  }

  private evictOldest(): void {
    const oldest = this.accessOrder.shift();
    if (oldest) {
      this.cache.delete(oldest);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // 需要统计计算
    };
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

/**
 * 任务服务实现
 */
export class TaskService implements ITaskService {
  // LRU缓存保存完整节点数据
  private nodeCache = new TaskNodeCache();

  // 事件总线
  private eventBus: TaskEventBus;

  constructor(
    private readonly runningTaskRepo: RunningTaskRepository,
    private readonly completedTaskRepo: CompletedTaskRepository,
    private readonly log: Logger,
    private readonly app: IStratixApp,
    private readonly sharedContextRepo: SharedContextRepository
  ) {
    this.eventBus = new TaskEventBus();
  }

  /**
   * 创建任务
   * 步骤：
   * 1. 检查参数中的ID，如果有则先查询
   * 2. 没有查询到则创建任务节点
   * 3. 判断是否是根目录，根目录需要创建关联的context
   * 4. 创建task并保存到数据库，默认状态是PENDING
   */
  async createTask(taskData: {
    id?: string;
    parentId?: string;
    name: string;
    description: string;
    type: string;
    executorName?: string;
    priority?: number;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const startTime = Date.now();
    let taskId = taskData.id;
    try {
      // 步骤1: 检查参数中的ID，如果有则先查询
      if (taskId) {
        // 先从缓存查询
        let existingTask = this.nodeCache.get(taskId);

        // 如果缓存中没有，从数据库查询
        if (!existingTask) {
          existingTask = await this.loadTaskFromDatabase(taskId);
        }
        // 如果任务已存在，返回错误或现有ID（根据业务需求）
        if (existingTask) {
          // 加入到缓存（如果是从数据库加载的）
          if (!this.nodeCache.has(taskId)) {
            this.nodeCache.set(taskId, existingTask);
          }

          this.log.warn({ taskId }, '任务ID已存在，返回现有任务');
          return taskId;
        }
      }

      // 步骤2: 生成新的任务ID（如果没有提供）
      if (!taskId) {
        taskId = ids.generateTaskId();
      }

      const now = new Date();

      // 创建完整的任务数据
      const nodeData: TaskNodeData = {
        id: taskId,
        parentId: taskData.parentId || null,
        name: taskData.name,
        description: taskData.description,
        type: taskData.type,
        executorName: taskData.executorName || 'default',
        priority: taskData.priority || 0,
        metadata: taskData.metadata || {},
        createdAt: now,
        updatedAt: now,
        status: TaskStatus.PENDING, // 默认状态为PENDING
        progress: 0,
        totalChildren: 0,
        completedChildren: 0,
        childrenIds: []
      };

      // 步骤3: 判断是否是根目录，根目录需要创建关联的context
      const isRootTask = !nodeData.parentId;
      if (isRootTask) {
        // 创建根任务的上下文信息
        await this.createRootTaskContext(taskId, nodeData);
      }

      // 保存到内存缓存
      this.nodeCache.set(taskId, nodeData);

      // 建立父子关系（如果有父任务）
      if (nodeData.parentId) {
        await this.addChildRelation(nodeData.parentId, taskId);

        // 创建子节点时，删除父节点缓存，确保下次获取时从数据库加载最新数据
        if (this.nodeCache.has(nodeData.parentId)) {
          this.nodeCache.delete(nodeData.parentId);
          this.log.debug(
            {
              taskId,
              parentId: nodeData.parentId
            },
            '父节点缓存已删除，下次获取时将从数据库重新加载'
          );
        }
      }

      // 步骤4: 异步保存到数据库
      await this.saveTaskToDatabase(nodeData);

      this.log.info(
        {
          taskId,
          parentId: nodeData.parentId,
          isRootTask,
          executionTime: Date.now() - startTime
        },
        '任务创建成功'
      );

      return taskId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error(
        {
          taskId,
          parentId: taskData.parentId,
          error: errorMsg,
          executionTime: Date.now() - startTime
        },
        '任务创建失败'
      );

      throw new Error(`创建任务失败: ${errorMsg}`);
    }
  }

  /**
   * 获取任务数据（优先从缓存，必要时从数据库加载）
   */
  async getTaskData(taskId: string): Promise<TaskNodeData | null> {
    // 先检查缓存
    let nodeData = this.nodeCache.get(taskId);
    if (nodeData) {
      return nodeData;
    }

    // 从数据库加载
    nodeData = await this.loadTaskFromDatabase(taskId);
    if (nodeData) {
      // 更新缓存
      this.nodeCache.set(taskId, nodeData);
    }

    return nodeData;
  }

  /**
   * 启动任务
   * 只有PENDING状态的任务可以启动，递归启动所有子任务
   * 状态变更后执行执行器的onStart方法
   */
  async startTask(
    taskId: string,
    reason?: string
  ): Promise<TaskOperationResult> {
    const startTime = Date.now();

    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        return this.createErrorResult(
          taskId,
          TaskStatus.PENDING,
          TaskStatus.PENDING,
          '任务不存在',
          startTime
        );
      }

      const fromStatus = taskData.status;

      // 检查状态是否可以启动 - 只有PENDING状态可以启动
      if (fromStatus !== TaskStatus.PENDING) {
        return this.createErrorResult(
          taskId,
          fromStatus,
          fromStatus,
          `只有PENDING状态的任务可以启动，当前状态：${fromStatus}`,
          startTime
        );
      }

      // 递归启动任务及其所有子任务
      await this.recursiveStartTask(taskId, reason);

      this.log.info({ taskId, fromStatus, reason }, '任务启动成功');

      return {
        success: true,
        taskId,
        fromStatus,
        toStatus: TaskStatus.RUNNING,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error({ taskId, error: errorMsg }, '任务启动失败');

      return this.createErrorResult(
        taskId,
        TaskStatus.PENDING,
        TaskStatus.PENDING,
        errorMsg,
        startTime
      );
    }
  }

  /**
   * 暂停任务
   * 递归暂停所有子任务，对于叶子节点调用执行器的暂停方法
   */
  async pauseTask(
    taskId: string,
    reason?: string
  ): Promise<TaskOperationResult> {
    const startTime = Date.now();

    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        return this.createErrorResult(
          taskId,
          TaskStatus.PENDING,
          TaskStatus.PENDING,
          '任务不存在',
          startTime
        );
      }

      const fromStatus = taskData.status;

      if (!this.canTransitionTo(fromStatus, TaskStatus.PAUSED)) {
        return this.createErrorResult(
          taskId,
          fromStatus,
          fromStatus,
          `任务状态 ${fromStatus} 无法暂停`,
          startTime
        );
      }

      // 递归暂停所有子任务
      await this.recursivePauseTask(taskId, reason);

      this.log.info({ taskId, fromStatus, reason }, '任务暂停成功');

      return {
        success: true,
        taskId,
        fromStatus,
        toStatus: TaskStatus.PAUSED,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error({ taskId, error: errorMsg }, '任务暂停失败');

      return this.createErrorResult(
        taskId,
        TaskStatus.RUNNING,
        TaskStatus.RUNNING,
        errorMsg,
        startTime
      );
    }
  }

  /**
   * 恢复任务
   * 递归恢复所有子任务，对于叶子节点调用执行器的恢复方法
   */
  async resumeTask(
    taskId: string,
    reason?: string
  ): Promise<TaskOperationResult> {
    const startTime = Date.now();

    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        return this.createErrorResult(
          taskId,
          TaskStatus.PENDING,
          TaskStatus.PENDING,
          '任务不存在',
          startTime
        );
      }

      const fromStatus = taskData.status;

      if (!this.canTransitionTo(fromStatus, TaskStatus.RUNNING)) {
        return this.createErrorResult(
          taskId,
          fromStatus,
          fromStatus,
          `任务状态 ${fromStatus} 无法恢复`,
          startTime
        );
      }

      // 递归恢复所有子任务
      await this.recursiveResumeTask(taskId, reason);

      this.log.info({ taskId, fromStatus, reason }, '任务恢复成功');

      return {
        success: true,
        taskId,
        fromStatus,
        toStatus: TaskStatus.RUNNING,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error({ taskId, error: errorMsg }, '任务恢复失败');

      return this.createErrorResult(
        taskId,
        TaskStatus.PAUSED,
        TaskStatus.PAUSED,
        errorMsg,
        startTime
      );
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(
    taskId: string,
    reason?: string
  ): Promise<TaskOperationResult> {
    const startTime = Date.now();

    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        return this.createErrorResult(
          taskId,
          TaskStatus.PENDING,
          TaskStatus.PENDING,
          '任务不存在',
          startTime
        );
      }

      const fromStatus = taskData.status;

      if (!this.canTransitionTo(fromStatus, TaskStatus.CANCELLED)) {
        return this.createErrorResult(
          taskId,
          fromStatus,
          fromStatus,
          `任务状态 ${fromStatus} 无法取消`,
          startTime
        );
      }

      // 立即更新内存状态
      await this.updateTaskStatus(taskId, TaskStatus.CANCELLED);

      // 同步到数据库
      await this.syncUpdateTaskToDatabase(
        taskId,
        TaskStatus.CANCELLED,
        taskData.progress || 0,
        {
          cancelReason: reason,
          cancelledAt: new Date()
        }
      );

      this.log.info({ taskId, fromStatus, reason }, '任务取消成功');

      return {
        success: true,
        taskId,
        fromStatus,
        toStatus: TaskStatus.CANCELLED,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error({ taskId, error: errorMsg }, '任务取消失败');

      return this.createErrorResult(
        taskId,
        TaskStatus.PENDING,
        TaskStatus.PENDING,
        errorMsg,
        startTime
      );
    }
  }

  /**
   * 重试任务
   * 可以重试失败的任务或包含失败子节点的已完成任务
   * 递归重试所有失败的子任务，将状态改为RUNNING
   */
  async retryTask(
    taskId: string,
    reason?: string
  ): Promise<TaskOperationResult> {
    const startTime = Date.now();

    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        return this.createErrorResult(
          taskId,
          TaskStatus.PENDING,
          TaskStatus.PENDING,
          '任务不存在',
          startTime
        );
      }

      const fromStatus = taskData.status;

      // 检查是否可以重试
      const canRetry = await this.canRetryTask(taskId, taskData);
      if (!canRetry.allowed) {
        return this.createErrorResult(
          taskId,
          fromStatus,
          fromStatus,
          canRetry.reason || '任务不满足重试条件',
          startTime
        );
      }

      // 递归重试任务及其失败的子任务
      await this.recursiveRetryTask(taskId, reason);

      this.log.info({ taskId, fromStatus, reason }, '任务重试成功');

      return {
        success: true,
        taskId,
        fromStatus,
        toStatus: TaskStatus.RUNNING,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error({ taskId, error: errorMsg }, '任务重试失败');

      return this.createErrorResult(
        taskId,
        TaskStatus.PENDING,
        TaskStatus.PENDING,
        errorMsg,
        startTime
      );
    }
  }

  /**
   * 获取子任务列表（只返回ID，按需加载完整数据）
   */
  async getChildrenIds(taskId: string): Promise<string[]> {
    const nodeData = await this.getTaskData(taskId);
    if (nodeData) {
      return [...nodeData.childrenIds];
    }

    // 如果内存中没有，从数据库查询
    const children = await this.runningTaskRepo.findByParentId(taskId);
    return children.map((child) => child.id);
  }

  /**
   * 获取父任务ID
   */
  async getParentId(taskId: string): Promise<string | null> {
    const nodeData = await this.getTaskData(taskId);
    return nodeData?.parentId || null;
  }

  /**
   * 恢复运行中的任务到内存
   */
  async recoverRunningTasks(): Promise<void> {
    this.log.info('开始恢复运行中的任务到内存');

    const runningTasks = await this.runningTaskRepo.findAll();

    for (const task of runningTasks) {
      const nodeData: TaskNodeData = {
        id: task.id,
        parentId: task.parent_id,
        name: task.name,
        description: task.description || '',
        type: task.task_type,
        executorName: task.executor_name || 'default',
        priority: task.priority || 0,
        metadata: task.metadata || {},
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        status: task.status as TaskStatus,
        progress: task.progress || 0,
        totalChildren: 0,
        completedChildren: 0,
        childrenIds: []
      };

      this.nodeCache.set(task.id, nodeData);
    }

    // 构建父子关系
    for (const task of runningTasks) {
      if (task.parent_id) {
        const parentData = this.nodeCache.get(task.parent_id);
        if (parentData && !parentData.childrenIds.includes(task.id)) {
          parentData.childrenIds.push(task.id);
        }
      }
    }

    this.log.info({ taskCount: runningTasks.length }, '运行中任务恢复完成');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      cache: this.nodeCache.getStats()
    };
  }

  private createErrorResult(
    taskId: string,
    fromStatus: TaskStatus,
    toStatus: TaskStatus,
    error: string,
    startTime: number
  ): TaskOperationResult {
    return {
      success: false,
      taskId,
      fromStatus,
      toStatus,
      errorMessage: error,
      executionTime: Date.now() - startTime
    };
  }

  private canTransitionTo(
    fromStatus: TaskStatus,
    toStatus: TaskStatus
  ): boolean {
    // 定义状态转换规则
    const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.PENDING]: [TaskStatus.RUNNING, TaskStatus.CANCELLED],
      [TaskStatus.RUNNING]: [
        TaskStatus.PAUSED,
        TaskStatus.SUCCESS,
        TaskStatus.FAILED,
        TaskStatus.CANCELLED
      ],
      [TaskStatus.PAUSED]: [TaskStatus.RUNNING, TaskStatus.CANCELLED],
      [TaskStatus.SUCCESS]: [TaskStatus.RUNNING], // 允许重跑成功的任务
      [TaskStatus.FAILED]: [TaskStatus.RUNNING], // 允许重试失败的任务
      [TaskStatus.CANCELLED]: [TaskStatus.RUNNING], // 允许重启取消的任务
      [TaskStatus.COMPLETED]: [TaskStatus.RUNNING] // 添加COMPLETED状态
    };

    return allowedTransitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * 更新任务状态（缓存中）
   */
  private async updateTaskStatus(taskId: string, status: TaskStatus) {
    const nodeData = this.nodeCache.get(taskId);
    if (nodeData) {
      nodeData.status = status;
      this.nodeCache.set(taskId, nodeData);
    }
  }

  /**
   * 更新任务进度（缓存中）
   */
  private async updateTaskProgress(taskId: string, progress: number) {
    const nodeData = this.nodeCache.get(taskId);
    if (nodeData) {
      nodeData.progress = progress;
      this.nodeCache.set(taskId, nodeData);
    }
  }

  /**
   * 异步更新任务状态到数据库（已废弃，请使用syncUpdateTaskToDatabase）
   */
  private async asyncUpdateTaskToDatabase(
    taskId: string,
    status: TaskStatus,
    progress: number,
    metadata?: any
  ): Promise<void> {
    // 直接调用同步方法
    await this.syncUpdateTaskToDatabase(taskId, status, progress, metadata);
  }

  private async addChildRelation(
    parentId: string,
    childId: string
  ): Promise<void> {
    const parentData = await this.getTaskData(parentId);
    if (parentData && !parentData.childrenIds.includes(childId)) {
      parentData.childrenIds.push(childId);
      parentData.totalChildren += 1;
      this.nodeCache.set(parentId, parentData);

      // 同步更新数据库中的总计子任务数量
      await this.runningTaskRepo.incrementTotalChildren(parentId);
    }
  }

  /**
   * 从数据库加载任务数据并转换为TaskNodeData
   */
  private async loadTaskFromDatabase(
    taskId: string
  ): Promise<TaskNodeData | null> {
    try {
      const dbTask = await this.runningTaskRepo.findById(taskId);
      if (!dbTask) {
        return null;
      }

      // 转换为内存格式
      const nodeData: TaskNodeData = {
        id: dbTask.id,
        parentId: dbTask.parent_id,
        name: dbTask.name,
        description: dbTask.description || '',
        type: dbTask.task_type,
        executorName: dbTask.executor_name || '',
        priority: dbTask.priority,
        metadata: dbTask.metadata || {},
        createdAt: dbTask.created_at,
        updatedAt: dbTask.updated_at,
        status: dbTask.status as TaskStatus,
        progress: dbTask.progress,
        totalChildren: dbTask.total_children,
        completedChildren: dbTask.completed_children,
        childrenIds: []
      };

      return nodeData;
    } catch (error) {
      this.log.error({ taskId, error }, '从数据库加载任务失败');
      return null;
    }
  }

  private async asyncRunTask(taskId: string, reason?: string): Promise<void> {
    try {
      // 1. 从依赖注入容器获取执行器
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        this.log.error({ taskId }, '无法获取任务数据，停止执行');
        return;
      }

      const executorName = taskData.executorName;
      if (!executorName) {
        this.log.warn({ taskId }, '任务没有指定执行器，跳过执行');
        return;
      }

      const executor = this.app.tryResolve(executorName);
      if (!executor) {
        this.log.error({ taskId, executorName }, '执行器未注册到依赖注入容器');
        await this.updateTaskStatus(taskId, TaskStatus.FAILED);
        await this.syncUpdateTaskToDatabase(
          taskId,
          TaskStatus.FAILED,
          taskData.progress || 0,
          {
            error: `执行器 ${executorName} 未注册`,
            failureReason: 'executor_not_found'
          }
        );

        // 如果有父任务，更新父任务的completed_children
        if (taskData.parentId) {
          await this.incrementParentCompletedChildren(taskData.parentId);
        }
        return;
      }

      if (typeof executor.run !== 'function') {
        this.log.error({ taskId, executorName }, '执行器没有实现 run 方法');
        await this.updateTaskStatus(taskId, TaskStatus.FAILED);
        await this.syncUpdateTaskToDatabase(
          taskId,
          TaskStatus.FAILED,
          taskData.progress || 0,
          {
            error: `执行器 ${executorName} 没有实现 run 方法`,
            failureReason: 'executor_method_missing'
          }
        );

        // 如果有父任务，更新父任务的completed_children
        if (taskData.parentId) {
          await this.incrementParentCompletedChildren(taskData.parentId);
        }
        return;
      }

      // 2. 执行任务
      this.log.info({ taskId, executorName, reason }, '开始执行任务');
      const result = await executor.run(taskId, taskData);

      // 3. 更新任务状态为成功
      await this.updateTaskStatus(taskId, TaskStatus.SUCCESS);
      await this.syncUpdateTaskToDatabase(taskId, TaskStatus.SUCCESS, 100, {
        result,
        completedAt: new Date(),
        successReason: 'execution_completed'
      });

      // 4. 执行成功回调的冒泡机制
      await this.bubbleExecuteOnSuccess(taskId, result);

      // 5. 如果有父任务，更新父任务的completed_children
      if (taskData.parentId) {
        await this.incrementParentCompletedChildren(taskData.parentId);
      }

      this.log.info({ taskId, executorName, result }, '任务执行成功');
    } catch (error) {
      this.log.error({ taskId, error }, '任务执行失败');

      // 更新任务状态为失败
      const taskData = await this.getTaskData(taskId);
      await this.updateTaskStatus(taskId, TaskStatus.FAILED);
      await this.syncUpdateTaskToDatabase(taskId, TaskStatus.FAILED, 0, {
        error: error instanceof Error ? error.message : String(error),
        failureReason: 'execution_error',
        failedAt: new Date()
      });

      // 如果有父任务，更新父任务的completed_children
      if (taskData && taskData.parentId) {
        await this.incrementParentCompletedChildren(taskData.parentId);
      }
    }
  }

  /**
   * 创建根任务的上下文信息
   * 将任务上下文保存到 SharedContextRepository 表中
   */
  private async createRootTaskContext(
    taskId: string,
    taskData: TaskNodeData
  ): Promise<void> {
    try {
      // 为根任务创建执行上下文数据
      const contextData: SharedContextData = {
        rootTaskId: taskId,
        taskInfo: {
          id: taskId,
          name: taskData.name,
          description: taskData.description,
          type: taskData.type,
          createdAt: taskData.createdAt
        },
        workingDirectory: `/tmp/tasks/${taskId}`,
        environment: {},
        resources: {
          maxMemory: '512MB',
          maxCpuTime: '10m',
          maxDiskSpace: '1GB'
        },
        executionConfig: {
          timeout: 3600000, // 1小时
          retries: 3,
          parallel: false
        },
        metadata: {
          ...taskData.metadata,
          isRootTask: true,
          createdBy: 'system',
          version: '1.0'
        }
      };

      // 保存上下文到 SharedContextRepository 表
      await this.sharedContextRepo.saveContext(taskId, contextData);

      this.log.info(
        {
          taskId,
          contextKeys: Object.keys(contextData).length
        },
        '根任务上下文已创建并保存到数据库'
      );
    } catch (error) {
      this.log.error({ taskId, error }, '创建根任务上下文失败');
      throw error;
    }
  }

  /**
   * 保存任务到数据库
   */
  private async saveTaskToDatabase(taskData: TaskNodeData): Promise<void> {
    try {
      // 转换TaskNodeData为数据库所需的格式
      const dbTaskData = {
        id: taskData.id,
        parent_id: taskData.parentId,
        name: taskData.name,
        description: taskData.description,
        task_type: taskData.type, // TaskNodeData.type -> task_type
        status: taskData.status,
        priority: taskData.priority,
        progress: taskData.progress,
        total_children: taskData.totalChildren,
        completed_children: taskData.completedChildren,
        executor_name: taskData.executorName,
        metadata: taskData.metadata
      };

      await this.runningTaskRepo.create(dbTaskData);
      this.log.debug({ taskId: taskData.id }, '任务已保存到数据库');
    } catch (error) {
      this.log.error({ taskId: taskData.id, error }, '保存任务到数据库失败');
      throw error;
    }
  }

  /**
   * 通用任务完成处理方法
   */
  private async finishTask(
    taskId: string,
    targetStatus: TaskStatus,
    progress?: number,
    extraData?: any,
    reason?: string
  ): Promise<TaskOperationResult> {
    const startTime = Date.now();

    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        return {
          success: false,
          taskId,
          fromStatus: TaskStatus.PENDING,
          toStatus: TaskStatus.PENDING,
          errorMessage: '任务不存在',
          executionTime: Date.now() - startTime
        };
      }

      const fromStatus = taskData.status;

      // 检查状态是否可以转换
      if (!this.canTransitionTo(fromStatus, targetStatus)) {
        return {
          success: false,
          taskId,
          fromStatus,
          toStatus: fromStatus,
          errorMessage: `任务状态 ${fromStatus} 无法转换为 ${targetStatus}`,
          executionTime: Date.now() - startTime
        };
      }

      // 先修改任务状态
      taskData.status = targetStatus;

      // 更新进度（如果指定）
      if (progress !== undefined) {
        taskData.progress = progress;
      }

      // 保存额外数据到元数据
      if (extraData) {
        taskData.metadata = {
          ...taskData.metadata,
          ...extraData,
          [`${targetStatus}At`]: new Date(),
          [`${targetStatus}Reason`]: reason
        };
      }

      // 更新缓存
      this.nodeCache.set(taskId, taskData);

      // 同步更新到数据库
      await this.syncUpdateTaskToDatabase(
        taskId,
        targetStatus,
        progress !== undefined ? progress : taskData.progress || 100,
        extraData ? { ...extraData, reason } : { reason }
      );

      // 如果是成功状态，执行onSuccess冒泡机制
      if (this.isSuccessStatus(targetStatus)) {
        const result = extraData?.result || null;
        await this.bubbleExecuteOnSuccess(taskId, result);
      }

      // 状态更新完成后，如果是完成状态且有父任务，更新父任务的completed_children
      if (this.isCompletedStatus(targetStatus) && taskData.parentId) {
        await this.incrementParentCompletedChildren(taskData.parentId);
      }

      this.log.info(
        { taskId, fromStatus, targetStatus, reason },
        `任务${targetStatus}成功`
      );

      return {
        success: true,
        taskId,
        fromStatus,
        toStatus: targetStatus,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error(
        { taskId, targetStatus, error: errorMsg },
        `任务${targetStatus}操作失败`
      );

      return {
        success: false,
        taskId,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        errorMessage: errorMsg,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 判断是否为成功状态
   */
  private isSuccessStatus(status: TaskStatus): boolean {
    return [TaskStatus.SUCCESS, TaskStatus.COMPLETED].includes(status);
  }

  /**
   * 判断是否为完成状态
   */
  private isCompletedStatus(status: TaskStatus): boolean {
    return [
      TaskStatus.SUCCESS,
      TaskStatus.FAILED,
      TaskStatus.CANCELLED,
      TaskStatus.COMPLETED
    ].includes(status);
  }

  /**
   * 增加父任务的已完成子任务数量
   * 当进度达到100%时，自动完成父节点并递归向上执行
   */
  private async incrementParentCompletedChildren(
    parentId: string
  ): Promise<void> {
    try {
      // 更新数据库中的父任务completed_children计数和进度
      await this.runningTaskRepo.incrementCompletedChildren(parentId);

      // 更新缓存中的父任务数据
      const parentData = await this.getTaskData(parentId);
      if (parentData) {
        parentData.completedChildren += 1;
        if (parentData.totalChildren > 0) {
          parentData.progress = Math.round(
            (parentData.completedChildren / parentData.totalChildren) * 100
          );
        }
        this.nodeCache.set(parentId, parentData);

        // 检查进度是否达到100%
        if (parentData.progress >= 100) {
          this.log.info(
            { parentId, progress: parentData.progress },
            '父任务进度达到100%，开始自动完成'
          );

          // 根据子节点状态决定父节点的最终状态
          const finalStatus = await this.determineParentFinalStatus(parentId);

          // 完成父节点
          await this.autoCompleteParentTask(parentId, finalStatus);

          // 递归向上更新祖父节点
          if (parentData.parentId) {
            await this.incrementParentCompletedChildren(parentData.parentId);
          }
        }
      }

      this.log.debug({ parentId }, '父任务已完成子任务数量+1');
    } catch (error) {
      this.log.error({ parentId, error }, '更新父任务已完成子任务数量失败');
    }
  }

  /**
   * 同步更新任务状态到数据库
   */
  private async syncUpdateTaskToDatabase(
    taskId: string,
    status: TaskStatus,
    progress: number,
    metadata?: any
  ): Promise<void> {
    try {
      // 从缓存获取完整的任务数据
      const nodeData = this.nodeCache.get(taskId);
      if (!nodeData) {
        throw new Error(`任务 ${taskId} 在缓存中不存在`);
      }

      // 同步更新基本信息（updateStatus方法可以同时更新status和progress）
      await this.runningTaskRepo.updateStatus(taskId, status, progress);

      if (metadata) {
        await this.runningTaskRepo.updateTaskMetadata(taskId, {
          ...nodeData.metadata,
          ...metadata
        });
      }

      this.log.debug({ taskId, status, progress }, '任务状态已同步到数据库');
    } catch (error) {
      this.log.error({ taskId, error }, '同步任务状态到数据库失败');
      throw error;
    }
  }

  /**
   * 完成任务（通用完成状态）
   */
  async completeTask(
    taskId: string,
    result?: any,
    reason?: string
  ): Promise<TaskOperationResult> {
    // 检查是否有子节点
    const hasChildren = await this.hasChildren(taskId);
    if (hasChildren) {
      return {
        success: false,
        taskId,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        errorMessage: '有子节点的任务不能直接调用completeTask方法',
        executionTime: 0
      };
    }

    return this.finishTask(
      taskId,
      TaskStatus.COMPLETED,
      100,
      result !== undefined
        ? { result, completedAt: new Date(), completionReason: reason }
        : undefined,
      reason
    );
  }

  /**
   * 成功完成任务
   */
  async succeedTask(
    taskId: string,
    result?: any,
    reason?: string
  ): Promise<TaskOperationResult> {
    // 检查是否有子节点
    const hasChildren = await this.hasChildren(taskId);
    if (hasChildren) {
      return {
        success: false,
        taskId,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        errorMessage: '有子节点的任务不能直接调用succeedTask方法',
        executionTime: 0
      };
    }

    return this.finishTask(
      taskId,
      TaskStatus.SUCCESS,
      100,
      { result, succeededAt: new Date(), successReason: reason },
      reason
    );
  }

  /**
   * 失败完成任务
   */
  async failTask(
    taskId: string,
    error?: any,
    reason?: string
  ): Promise<TaskOperationResult> {
    // 检查是否有子节点
    const hasChildren = await this.hasChildren(taskId);
    if (hasChildren) {
      return {
        success: false,
        taskId,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        errorMessage: '有子节点的任务不能直接调用failTask方法',
        executionTime: 0
      };
    }

    return this.finishTask(
      taskId,
      TaskStatus.FAILED,
      undefined, // 失败任务进度保持当前值
      {
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date(),
        failureReason: reason
      },
      reason
    );
  }

  /**
   * 检查任务是否有子节点
   */
  private async hasChildren(taskId: string): Promise<boolean> {
    const taskData = await this.getTaskData(taskId);
    if (!taskData) {
      return false;
    }
    return taskData.totalChildren > 0 || taskData.childrenIds.length > 0;
  }

  /**
   * 获取任务完成百分比（使用新的计算方式）
   */
  async getTaskCompletionPercentage(taskId: string): Promise<number> {
    const taskData = await this.getTaskData(taskId);
    if (!taskData) {
      return 0;
    }

    // 如果有子任务，使用 completed_children / total_children 计算
    if (taskData.totalChildren > 0) {
      return Math.round(
        (taskData.completedChildren / taskData.totalChildren) * 100
      );
    }

    // 如果没有子任务，返回任务自身的进度
    return taskData.progress;
  }

  /**
   * 获取子任务完成统计（基于新的计数方式）
   */
  async getChildrenCompletionStats(taskId: string): Promise<{
    totalChildren: number;
    completedChildren: number;
    completionPercentage: number;
  } | null> {
    const taskData = await this.getTaskData(taskId);
    if (!taskData) {
      return null;
    }

    return {
      totalChildren: taskData.totalChildren,
      completedChildren: taskData.completedChildren,
      completionPercentage:
        taskData.totalChildren > 0
          ? Math.round(
              (taskData.completedChildren / taskData.totalChildren) * 100
            )
          : 0
    };
  }

  /**
   * 根据子节点状态确定父节点的最终状态
   * 规则：
   * - 如果子节点全部成功，则父节点成功
   * - 如果子节点全部失败，则父节点失败
   * - 如果子节点有成功有失败，则父节点为完成状态
   */
  private async determineParentFinalStatus(
    parentId: string
  ): Promise<TaskStatus> {
    try {
      // 获取所有子节点的状态统计
      const childrenIds = await this.getChildrenIds(parentId);
      if (childrenIds.length === 0) {
        // 没有子节点，默认为完成状态
        return TaskStatus.COMPLETED;
      }

      let successCount = 0;
      let failedCount = 0;
      let completedCount = 0;
      let cancelledCount = 0;

      // 统计各种状态的子节点数量
      for (const childId of childrenIds) {
        const childData = await this.getTaskData(childId);
        if (childData) {
          switch (childData.status) {
            case TaskStatus.SUCCESS:
              successCount++;
              break;
            case TaskStatus.FAILED:
              failedCount++;
              break;
            case TaskStatus.COMPLETED:
              completedCount++;
              break;
            case TaskStatus.CANCELLED:
              cancelledCount++;
              break;
          }
        }
      }

      const totalFinishedChildren =
        successCount + failedCount + completedCount + cancelledCount;

      // 确保所有子节点都已完成
      if (totalFinishedChildren !== childrenIds.length) {
        this.log.warn(
          {
            parentId,
            totalChildren: childrenIds.length,
            finishedChildren: totalFinishedChildren
          },
          '父节点进度达到100%但仍有子节点未完成'
        );
        return TaskStatus.COMPLETED;
      }

      // 判断最终状态
      if (successCount === childrenIds.length) {
        // 全部成功
        return TaskStatus.SUCCESS;
      } else if (failedCount === childrenIds.length) {
        // 全部失败
        return TaskStatus.FAILED;
      } else {
        // 混合状态（有成功有失败或有取消）
        return TaskStatus.COMPLETED;
      }
    } catch (error) {
      this.log.error({ parentId, error }, '确定父节点最终状态失败');
      return TaskStatus.COMPLETED; // 默认返回完成状态
    }
  }

  /**
   * 自动完成父任务
   */
  private async autoCompleteParentTask(
    parentId: string,
    finalStatus: TaskStatus
  ): Promise<void> {
    try {
      const parentData = await this.getTaskData(parentId);
      if (!parentData) {
        this.log.error({ parentId }, '自动完成父任务失败：任务不存在');
        return;
      }

      // 检查父任务当前状态是否允许完成
      if (!this.canTransitionTo(parentData.status, finalStatus)) {
        this.log.warn(
          {
            parentId,
            currentStatus: parentData.status,
            targetStatus: finalStatus
          },
          '父任务状态不允许转换到目标状态'
        );
        return;
      }

      // 更新任务状态到内存缓存
      await this.updateTaskStatus(parentId, finalStatus);
      await this.updateTaskProgress(parentId, 100);

      // 构建完成元数据
      const completionMetadata = {
        autoCompletedAt: new Date(),
        autoCompletionReason: '所有子任务已完成',
        finalStatus: finalStatus,
        childrenCompletionSummary: {
          totalChildren: parentData.totalChildren,
          completedChildren: parentData.completedChildren
        }
      };

      // 同步更新到数据库
      await this.syncUpdateTaskToDatabase(
        parentId,
        finalStatus,
        100,
        completionMetadata
      );

      // 如果是成功状态，执行onSuccess冒泡机制
      if (this.isSuccessStatus(finalStatus)) {
        const result = {
          autoCompleted: true,
          ...completionMetadata
        };
        await this.bubbleExecuteOnSuccess(parentId, result);
      }

      // 如果是已完成状态，需要移动到completed_tasks表
      if (this.isCompletedStatus(finalStatus)) {
        await this.moveTaskToCompletedTable(
          parentId,
          finalStatus,
          completionMetadata
        );
      }

      this.log.info(
        {
          parentId,
          finalStatus,
          totalChildren: parentData.totalChildren,
          completedChildren: parentData.completedChildren
        },
        '父任务自动完成成功'
      );
    } catch (error) {
      this.log.error({ parentId, finalStatus, error }, '自动完成父任务失败');
    }
  }

  /**
   * 将已完成的任务移动到completed_tasks表
   */
  private async moveTaskToCompletedTable(
    taskId: string,
    status: TaskStatus,
    metadata: any
  ): Promise<void> {
    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        throw new Error(`任务 ${taskId} 不存在`);
      }

      // 使用backupTaskTree方法保存到completed_tasks表
      const runningTaskEntity = {
        id: taskData.id,
        parent_id: taskData.parentId,
        name: taskData.name,
        description: taskData.description,
        task_type: taskData.type,
        executor_name: taskData.executorName,
        priority: taskData.priority,
        status: status,
        progress: 100,
        total_children: taskData.totalChildren,
        completed_children: taskData.completedChildren,
        metadata: { ...taskData.metadata, ...metadata },
        created_at: taskData.createdAt,
        updated_at: new Date(),
        started_at: null,
        completed_at: new Date()
      };

      await this.completedTaskRepo.backupTaskTree([runningTaskEntity]);

      // 从running_tasks表删除
      await this.runningTaskRepo.deleteTask(taskId);

      // 从缓存中移除
      this.nodeCache.delete(taskId);

      this.log.debug({ taskId, status }, '任务已移动到completed_tasks表');
    } catch (error) {
      this.log.error(
        { taskId, status, error },
        '移动任务到completed_tasks表失败'
      );
      throw error;
    }
  }

  /**
   * 递归暂停任务及其所有子任务
   */
  private async recursivePauseTask(
    taskId: string,
    reason?: string
  ): Promise<void> {
    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        this.log.warn({ taskId }, '递归暂停：任务不存在，跳过');
        return;
      }

      // 检查当前任务状态是否可以暂停
      if (!this.canTransitionTo(taskData.status, TaskStatus.PAUSED)) {
        this.log.debug(
          { taskId, status: taskData.status },
          '递归暂停：任务状态不允许暂停，跳过'
        );
        return;
      }

      // 先暂停所有子任务
      const childrenIds = taskData.childrenIds;
      if (childrenIds.length > 0) {
        this.log.debug(
          { taskId, childrenCount: childrenIds.length },
          '开始递归暂停子任务'
        );

        // 并行暂停所有子任务
        const pausePromises = childrenIds.map((childId) =>
          this.recursivePauseTask(childId, reason).catch((error) => {
            this.log.error({ taskId, childId, error }, '递归暂停子任务失败');
          })
        );

        await Promise.all(pausePromises);
      }

      // 判断是否为叶子节点
      const isLeafNode = childrenIds.length === 0;

      if (isLeafNode) {
        // 叶子节点：调用执行器的暂停方法
        await this.pauseTaskExecutor(taskId, taskData, reason);
      }

      // 更新当前任务状态
      await this.updateTaskStatus(taskId, TaskStatus.PAUSED);

      // 同步到数据库
      await this.syncUpdateTaskToDatabase(
        taskId,
        TaskStatus.PAUSED,
        taskData.progress || 0,
        {
          pauseReason: reason,
          pausedAt: new Date(),
          pauseType: isLeafNode ? 'executor_pause' : 'recursive_pause'
        }
      );

      this.log.debug(
        { taskId, isLeafNode, childrenCount: childrenIds.length },
        '任务递归暂停完成'
      );
    } catch (error) {
      this.log.error({ taskId, error }, '递归暂停任务失败');
      throw error;
    }
  }

  /**
   * 递归恢复任务及其所有子任务
   */
  private async recursiveResumeTask(
    taskId: string,
    reason?: string
  ): Promise<void> {
    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        this.log.warn({ taskId }, '递归恢复：任务不存在，跳过');
        return;
      }

      // 检查当前任务状态是否可以恢复
      if (!this.canTransitionTo(taskData.status, TaskStatus.RUNNING)) {
        this.log.debug(
          { taskId, status: taskData.status },
          '递归恢复：任务状态不允许恢复，跳过'
        );
        return;
      }

      // 判断是否为叶子节点
      const childrenIds = taskData.childrenIds;
      const isLeafNode = childrenIds.length === 0;

      // 更新当前任务状态
      await this.updateTaskStatus(taskId, TaskStatus.RUNNING);

      // 同步到数据库
      await this.syncUpdateTaskToDatabase(
        taskId,
        TaskStatus.RUNNING,
        taskData.progress || 0,
        {
          resumeReason: reason,
          resumedAt: new Date(),
          resumeType: isLeafNode ? 'executor_resume' : 'recursive_resume'
        }
      );

      if (isLeafNode) {
        // 叶子节点：调用执行器的恢复方法
        await this.resumeTaskExecutor(taskId, taskData, reason);
      } else {
        // 非叶子节点：恢复所有子任务
        this.log.debug(
          { taskId, childrenCount: childrenIds.length },
          '开始递归恢复子任务'
        );

        // 并行恢复所有子任务
        const resumePromises = childrenIds.map((childId) =>
          this.recursiveResumeTask(childId, reason).catch((error) => {
            this.log.error({ taskId, childId, error }, '递归恢复子任务失败');
          })
        );

        await Promise.all(resumePromises);
      }

      this.log.debug(
        { taskId, isLeafNode, childrenCount: childrenIds.length },
        '任务递归恢复完成'
      );
    } catch (error) {
      this.log.error({ taskId, error }, '递归恢复任务失败');
      throw error;
    }
  }

  /**
   * 暂停任务执行器（仅针对叶子节点）
   */
  private async pauseTaskExecutor(
    taskId: string,
    taskData: TaskNodeData,
    reason?: string
  ): Promise<void> {
    try {
      const executorName = taskData.executorName;
      if (!executorName) {
        this.log.debug({ taskId }, '任务没有指定执行器，跳过执行器暂停');
        return;
      }

      const executor = this.app.tryResolve(executorName);
      if (!executor) {
        this.log.warn(
          { taskId, executorName },
          '执行器未注册到依赖注入容器，跳过执行器暂停'
        );
        return;
      }

      // 检查执行器是否支持暂停功能
      if (typeof executor.canPause === 'function') {
        const canPause = await executor.canPause(taskId, taskData);
        if (!canPause) {
          this.log.debug(
            { taskId, executorName },
            '执行器不支持暂停功能，跳过'
          );
          return;
        }
      }

      // 调用执行器的暂停方法
      if (typeof executor.pause === 'function') {
        await executor.pause(taskId, taskData, reason);
        this.log.info(
          { taskId, executorName, reason },
          '执行器暂停方法调用成功'
        );
      } else {
        this.log.debug(
          { taskId, executorName },
          '执行器没有实现 pause 方法，跳过'
        );
      }
    } catch (error) {
      this.log.error(
        { taskId, executorName: taskData.executorName, error },
        '调用执行器暂停方法失败'
      );
      // 不抛出错误，允许任务状态更新继续进行
    }
  }

  /**
   * 恢复任务执行器（仅针对叶子节点）
   */
  private async resumeTaskExecutor(
    taskId: string,
    taskData: TaskNodeData,
    reason?: string
  ): Promise<void> {
    try {
      const executorName = taskData.executorName;
      if (!executorName) {
        this.log.debug({ taskId }, '任务没有指定执行器，跳过执行器恢复');
        return;
      }

      const executor = this.app.tryResolve(executorName);
      if (!executor) {
        this.log.warn(
          { taskId, executorName },
          '执行器未注册到依赖注入容器，跳过执行器恢复'
        );
        return;
      }

      // 检查执行器是否支持恢复功能
      if (typeof executor.canResume === 'function') {
        const canResume = await executor.canResume(taskId, taskData);
        if (!canResume) {
          this.log.debug(
            { taskId, executorName },
            '执行器不支持恢复功能，跳过'
          );
          return;
        }
      }

      // 调用执行器的恢复方法
      if (typeof executor.resume === 'function') {
        await executor.resume(taskId, taskData, reason);
        this.log.info(
          { taskId, executorName, reason },
          '执行器恢复方法调用成功'
        );

        // 恢复后重新执行任务
        this.asyncRunTask(taskId, `resumed: ${reason || 'no reason'}`);
      } else {
        this.log.debug(
          { taskId, executorName },
          '执行器没有实现 resume 方法，直接重新执行任务'
        );

        // 如果执行器没有resume方法，直接重新执行
        this.asyncRunTask(
          taskId,
          `resumed_without_executor_support: ${reason || 'no reason'}`
        );
      }
    } catch (error) {
      this.log.error(
        { taskId, executorName: taskData.executorName, error },
        '调用执行器恢复方法失败'
      );
      // 不抛出错误，但也不重新执行任务
    }
  }

  /**
   * 冒泡执行onSuccess方法
   * 执行顺序：当前任务 -> 父任务 -> 祖父任务 ... -> 根任务
   */
  private async bubbleExecuteOnSuccess(
    taskId: string,
    result: any
  ): Promise<void> {
    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        this.log.warn({ taskId }, '冒泡执行onSuccess：任务不存在，跳过');
        return;
      }

      // 先执行当前任务的onSuccess
      await this.executeTaskOnSuccess(taskId, taskData, result);

      // 然后向父节点冒泡执行
      if (taskData.parentId) {
        await this.bubbleExecuteOnSuccess(taskData.parentId, result);
      }

      this.log.debug({ taskId }, 'onSuccess冒泡执行完成');
    } catch (error) {
      this.log.error({ taskId, error }, 'onSuccess冒泡执行失败');
      // 不抛出错误，避免影响任务完成流程
    }
  }

  /**
   * 执行单个任务的onSuccess方法
   */
  private async executeTaskOnSuccess(
    taskId: string,
    taskData: TaskNodeData,
    result: any
  ): Promise<void> {
    try {
      const executorName = taskData.executorName;
      if (!executorName) {
        this.log.debug({ taskId }, '任务没有指定执行器，跳过onSuccess执行');
        return;
      }

      const executor = this.app.tryResolve(executorName);
      if (!executor) {
        this.log.debug(
          { taskId, executorName },
          '执行器未注册到依赖注入容器，跳过onSuccess执行'
        );
        return;
      }

      // 检查执行器是否有onSuccess方法
      if (typeof executor.onSuccess !== 'function') {
        this.log.debug(
          { taskId, executorName },
          '执行器没有实现 onSuccess 方法，跳过'
        );
        return;
      }

      // 调用执行器的onSuccess方法
      this.log.info({ taskId, executorName }, '开始执行执行器的onSuccess方法');

      const onSuccessResult = await executor.onSuccess(
        taskId,
        taskData,
        result
      );

      this.log.info(
        { taskId, executorName, onSuccessResult },
        '执行器onSuccess方法执行成功'
      );

      // 将onSuccess的结果保存到任务元数据中
      const updatedTaskData = await this.getTaskData(taskId);
      if (updatedTaskData) {
        updatedTaskData.metadata = {
          ...updatedTaskData.metadata,
          onSuccessResult,
          onSuccessExecutedAt: new Date()
        };
        this.nodeCache.set(taskId, updatedTaskData);

        // 同步更新到数据库
        await this.syncUpdateTaskToDatabase(
          taskId,
          updatedTaskData.status,
          updatedTaskData.progress,
          {
            onSuccessResult,
            onSuccessExecutedAt: new Date()
          }
        );
      }
    } catch (error) {
      this.log.error(
        { taskId, executorName: taskData.executorName, error },
        '执行onSuccess方法失败'
      );

      // 记录onSuccess执行失败，但不影响任务完成状态
      const updatedTaskData = await this.getTaskData(taskId);
      if (updatedTaskData) {
        updatedTaskData.metadata = {
          ...updatedTaskData.metadata,
          onSuccessError:
            error instanceof Error ? error.message : String(error),
          onSuccessFailedAt: new Date()
        };
        this.nodeCache.set(taskId, updatedTaskData);

        // 同步更新到数据库
        await this.syncUpdateTaskToDatabase(
          taskId,
          updatedTaskData.status,
          updatedTaskData.progress,
          {
            onSuccessError:
              error instanceof Error ? error.message : String(error),
            onSuccessFailedAt: new Date()
          }
        );
      }
    }
  }

  /**
   * 递归启动任务及其所有子任务
   */
  private async recursiveStartTask(
    taskId: string,
    reason?: string
  ): Promise<void> {
    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        this.log.warn({ taskId }, '递归启动：任务不存在，跳过');
        return;
      }

      // 只有PENDING状态的任务可以启动
      if (taskData.status !== TaskStatus.PENDING) {
        this.log.debug(
          { taskId, status: taskData.status },
          '递归启动：任务状态不是PENDING，跳过'
        );
        return;
      }

      // 更新当前任务状态为RUNNING
      await this.updateTaskStatus(taskId, TaskStatus.RUNNING);

      // 同步到数据库
      await this.syncUpdateTaskToDatabase(
        taskId,
        TaskStatus.RUNNING,
        taskData.progress || 0,
        {
          startReason: reason,
          startedAt: new Date(),
          startType: 'recursive_start'
        }
      );

      // 执行当前任务的onStart方法
      await this.executeTaskOnStart(taskId, taskData, reason);

      // 获取所有子任务ID
      const childrenIds = taskData.childrenIds;

      if (childrenIds.length > 0) {
        this.log.debug(
          { taskId, childrenCount: childrenIds.length },
          '开始递归启动子任务'
        );

        // 并行启动所有PENDING状态的子任务
        const startPromises = childrenIds.map((childId) =>
          this.recursiveStartTask(childId, reason).catch((error) => {
            this.log.error({ taskId, childId, error }, '递归启动子任务失败');
          })
        );

        await Promise.all(startPromises);
      }

      // 判断是否为叶子节点，如果是则异步执行任务
      const isLeafNode = childrenIds.length === 0;
      if (isLeafNode) {
        // 叶子节点：异步执行任务方法
        this.asyncRunTask(taskId, reason);
      }

      this.log.debug(
        { taskId, isLeafNode, childrenCount: childrenIds.length },
        '任务递归启动完成'
      );
    } catch (error) {
      this.log.error({ taskId, error }, '递归启动任务失败');
      throw error;
    }
  }

  /**
   * 执行任务的onStart方法
   */
  private async executeTaskOnStart(
    taskId: string,
    taskData: TaskNodeData,
    reason?: string
  ): Promise<void> {
    try {
      const executorName = taskData.executorName;
      if (!executorName) {
        this.log.debug({ taskId }, '任务没有指定执行器，跳过onStart执行');
        return;
      }

      const executor = this.app.tryResolve(executorName);
      if (!executor) {
        this.log.debug(
          { taskId, executorName },
          '执行器未注册到依赖注入容器，跳过onStart执行'
        );
        return;
      }

      // 检查执行器是否有onStart方法
      if (typeof executor.onStart !== 'function') {
        this.log.debug(
          { taskId, executorName },
          '执行器没有实现 onStart 方法，跳过'
        );
        return;
      }

      // 调用执行器的onStart方法
      this.log.info(
        { taskId, executorName, reason },
        '开始执行执行器的onStart方法'
      );

      const onStartResult = await executor.onStart(taskId, taskData, reason);

      this.log.info(
        { taskId, executorName, onStartResult },
        '执行器onStart方法执行成功'
      );

      // 将onStart的结果保存到任务元数据中
      const updatedTaskData = await this.getTaskData(taskId);
      if (updatedTaskData) {
        updatedTaskData.metadata = {
          ...updatedTaskData.metadata,
          onStartResult,
          onStartExecutedAt: new Date()
        };
        this.nodeCache.set(taskId, updatedTaskData);

        // 同步更新到数据库
        await this.syncUpdateTaskToDatabase(
          taskId,
          updatedTaskData.status,
          updatedTaskData.progress,
          {
            onStartResult,
            onStartExecutedAt: new Date()
          }
        );
      }
    } catch (error) {
      this.log.error(
        { taskId, executorName: taskData.executorName, error },
        '执行onStart方法失败'
      );

      // 记录onStart执行失败，但不影响任务启动流程
      const updatedTaskData = await this.getTaskData(taskId);
      if (updatedTaskData) {
        updatedTaskData.metadata = {
          ...updatedTaskData.metadata,
          onStartError: error instanceof Error ? error.message : String(error),
          onStartFailedAt: new Date()
        };
        this.nodeCache.set(taskId, updatedTaskData);

        // 同步更新到数据库
        await this.syncUpdateTaskToDatabase(
          taskId,
          updatedTaskData.status,
          updatedTaskData.progress,
          {
            onStartError:
              error instanceof Error ? error.message : String(error),
            onStartFailedAt: new Date()
          }
        );
      }
    }
  }

  /**
   * 检查任务是否可以重试
   */
  private async canRetryTask(
    taskId: string,
    taskData: TaskNodeData
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // 1. 如果任务是失败状态，可以直接重试
      if (taskData.status === TaskStatus.FAILED) {
        return { allowed: true };
      }

      // 2. 如果任务是完成状态，检查是否有失败的子节点
      if (taskData.status === TaskStatus.COMPLETED) {
        const hasFailedChildren = await this.hasFailedChildren(taskId);
        if (hasFailedChildren) {
          return { allowed: true };
        } else {
          return {
            allowed: false,
            reason: '已完成的任务没有失败的子节点，无需重试'
          };
        }
      }

      // 3. 其他状态不允许重试
      return {
        allowed: false,
        reason: `任务状态 ${taskData.status} 不支持重试，只有FAILED或COMPLETED（包含失败子节点）状态可以重试`
      };
    } catch (error) {
      this.log.error({ taskId, error }, '检查任务重试条件失败');
      return {
        allowed: false,
        reason: '检查重试条件时发生错误'
      };
    }
  }

  /**
   * 检查任务是否有失败的子节点
   */
  private async hasFailedChildren(taskId: string): Promise<boolean> {
    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData || taskData.childrenIds.length === 0) {
        return false;
      }

      // 递归检查所有子节点
      for (const childId of taskData.childrenIds) {
        const childData = await this.getTaskData(childId);
        if (childData) {
          // 如果子节点是失败状态
          if (childData.status === TaskStatus.FAILED) {
            return true;
          }
          // 如果子节点是完成状态，递归检查其子节点
          if (childData.status === TaskStatus.COMPLETED) {
            const childHasFailedChildren =
              await this.hasFailedChildren(childId);
            if (childHasFailedChildren) {
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      this.log.error({ taskId, error }, '检查失败子节点时发生错误');
      return false;
    }
  }

  /**
   * 递归重试任务及其失败的子任务
   */
  private async recursiveRetryTask(
    taskId: string,
    reason?: string
  ): Promise<void> {
    try {
      const taskData = await this.getTaskData(taskId);
      if (!taskData) {
        this.log.warn({ taskId }, '递归重试：任务不存在，跳过');
        return;
      }

      const currentStatus = taskData.status;
      let shouldRetryCurrentTask = false;

      // 判断当前任务是否需要重试
      if (currentStatus === TaskStatus.FAILED) {
        shouldRetryCurrentTask = true;
      } else if (currentStatus === TaskStatus.COMPLETED) {
        // 检查是否有失败的子节点
        const hasFailedChildren = await this.hasFailedChildren(taskId);
        if (hasFailedChildren) {
          shouldRetryCurrentTask = true;
        }
      }

      // 如果当前任务不需要重试，跳过
      if (!shouldRetryCurrentTask) {
        this.log.debug(
          { taskId, status: currentStatus },
          '递归重试：任务状态不需要重试，跳过'
        );
        return;
      }

      // 重置任务状态为RUNNING
      await this.updateTaskStatus(taskId, TaskStatus.RUNNING);

      // 重置进度（失败任务重新开始）
      if (currentStatus === TaskStatus.FAILED) {
        await this.updateTaskProgress(taskId, 0);
      }

      // 同步到数据库
      await this.syncUpdateTaskToDatabase(
        taskId,
        TaskStatus.RUNNING,
        currentStatus === TaskStatus.FAILED ? 0 : taskData.progress,
        {
          retryReason: reason,
          retriedAt: new Date(),
          retryType: 'recursive_retry',
          previousStatus: currentStatus,
          retryCount: (taskData.metadata.retryCount || 0) + 1
        }
      );

      // 执行当前任务的onStart方法（重试也算是重新启动）
      await this.executeTaskOnStart(
        taskId,
        taskData,
        `retry: ${reason || 'no reason'}`
      );

      // 获取所有子任务ID
      const childrenIds = taskData.childrenIds;

      if (childrenIds.length > 0) {
        this.log.debug(
          { taskId, childrenCount: childrenIds.length },
          '开始递归重试失败的子任务'
        );

        // 并行重试所有需要重试的子任务
        const retryPromises = childrenIds.map((childId) =>
          this.recursiveRetryTask(childId, reason).catch((error) => {
            this.log.error({ taskId, childId, error }, '递归重试子任务失败');
          })
        );

        await Promise.all(retryPromises);
      }

      // 判断是否为叶子节点，如果是则异步执行任务
      const isLeafNode = childrenIds.length === 0;
      if (isLeafNode && currentStatus === TaskStatus.FAILED) {
        // 叶子节点且之前失败：重新异步执行任务方法
        this.asyncRunTask(taskId, `retry: ${reason || 'no reason'}`);
      }

      this.log.debug(
        {
          taskId,
          isLeafNode,
          childrenCount: childrenIds.length,
          previousStatus: currentStatus
        },
        '任务递归重试完成'
      );
    } catch (error) {
      this.log.error({ taskId, error }, '递归重试任务失败');
      throw error;
    }
  }
}
