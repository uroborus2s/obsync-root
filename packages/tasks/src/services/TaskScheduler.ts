/**
 * 任务调度器
 *
 * 负责任务的调度、执行、重试和队列管理
 */

import type { ExecutorRegistry } from '../types/executor.js';

// 使用简单的 console 作为日志器，避免循环依赖
const logger = console;

/**
 * 任务状态
 */
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

/**
 * 任务优先级
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 任务定义
 */
export interface TaskDefinition {
  id: string;
  name: string;
  executor: string;
  config: any;
  priority: TaskPriority;
  timeout?: number;
  retryPolicy?: {
    maxAttempts: number;
    backoff: 'fixed' | 'exponential' | 'linear';
    delay: number;
  };
  dependencies?: string[];
  condition?: string;
}

/**
 * 任务实例
 */
export interface TaskInstance {
  id: string;
  taskDefinitionId: string;
  workflowInstanceId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  inputData: any;
  outputData?: any;
  errorMessage?: string;
  errorDetails?: any;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  shouldRetry?: boolean;
  duration?: number;
}

/**
 * 任务调度器接口
 */
export interface TaskScheduler {
  /**
   * 调度任务
   * @param definition 任务定义
   * @param inputs 输入数据
   * @returns 任务实例
   */
  scheduleTask(definition: TaskDefinition, inputs: any): Promise<TaskInstance>;

  /**
   * 取消任务
   * @param taskId 任务ID
   */
  cancelTask(taskId: string): Promise<void>;

  /**
   * 获取任务状态
   * @param taskId 任务ID
   * @returns 任务实例
   */
  getTaskStatus(taskId: string): Promise<TaskInstance>;

  /**
   * 列出任务
   * @param filters 过滤条件
   * @returns 任务实例列表
   */
  listTasks(filters?: TaskFilters): Promise<TaskInstance[]>;

  /**
   * 启动调度器
   */
  start(): Promise<void>;

  /**
   * 停止调度器
   */
  stop(): Promise<void>;
}

/**
 * 任务过滤条件
 */
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  workflowInstanceId?: string;
  limit?: number;
  offset?: number;
}

/**
 * 任务队列
 */
class TaskQueue {
  private readonly tasks = new Map<string, TaskInstance>();
  private readonly pendingTasks: string[] = [];
  private readonly runningTasks = new Set<string>();

  /**
   * 添加任务到队列
   */
  enqueue(task: TaskInstance): void {
    this.tasks.set(task.id, task);

    // 按优先级插入到合适位置
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const taskPriority = priorityOrder[task.priority];

    let insertIndex = this.pendingTasks.length;
    for (let i = 0; i < this.pendingTasks.length; i++) {
      const existingTask = this.tasks.get(this.pendingTasks[i]);
      if (existingTask && priorityOrder[existingTask.priority] > taskPriority) {
        insertIndex = i;
        break;
      }
    }

    this.pendingTasks.splice(insertIndex, 0, task.id);
  }

  /**
   * 从队列中取出下一个任务
   */
  dequeue(): TaskInstance | null {
    const taskId = this.pendingTasks.shift();
    if (!taskId) return null;

    const task = this.tasks.get(taskId);
    if (!task) return null;

    this.runningTasks.add(taskId);
    return task;
  }

  /**
   * 标记任务完成
   */
  complete(taskId: string): void {
    this.runningTasks.delete(taskId);
  }

  /**
   * 移除任务
   */
  remove(taskId: string): void {
    this.tasks.delete(taskId);
    this.runningTasks.delete(taskId);
    const index = this.pendingTasks.indexOf(taskId);
    if (index >= 0) {
      this.pendingTasks.splice(index, 1);
    }
  }

  /**
   * 获取任务
   */
  get(taskId: string): TaskInstance | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 列出所有任务
   */
  list(filters?: TaskFilters): TaskInstance[] {
    let tasks = Array.from(this.tasks.values());

    if (filters?.status) {
      tasks = tasks.filter((task) => filters.status!.includes(task.status));
    }

    if (filters?.priority) {
      tasks = tasks.filter((task) => filters.priority!.includes(task.priority));
    }

    if (filters?.workflowInstanceId) {
      tasks = tasks.filter(
        (task) => task.workflowInstanceId === filters.workflowInstanceId
      );
    }

    // 排序：运行中的任务在前，然后按优先级和创建时间
    tasks.sort((a, b) => {
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (b.status === 'running' && a.status !== 'running') return 1;

      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    if (filters?.offset) {
      tasks = tasks.slice(filters.offset);
    }

    if (filters?.limit) {
      tasks = tasks.slice(0, filters.limit);
    }

    return tasks;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.tasks.size;
    const pending = this.pendingTasks.length;
    const running = this.runningTasks.size;
    const completed = Array.from(this.tasks.values()).filter(
      (t) => t.status === 'completed'
    ).length;
    const failed = Array.from(this.tasks.values()).filter(
      (t) => t.status === 'failed'
    ).length;

    return { total, pending, running, completed, failed };
  }
}

/**
 * 任务调度器实现
 */
export class TaskSchedulerService implements TaskScheduler {
  private readonly logger = logger;
  private readonly queue = new TaskQueue();
  private readonly executorRegistry: ExecutorRegistry;
  private isRunning = false;
  private processingInterval?: NodeJS.Timeout | undefined;
  private readonly maxConcurrentTasks: number;

  constructor(executorRegistry: ExecutorRegistry, maxConcurrentTasks = 10) {
    this.executorRegistry = executorRegistry;
    this.maxConcurrentTasks = maxConcurrentTasks;
  }

  /**
   * 调度任务
   */
  async scheduleTask(
    definition: TaskDefinition,
    inputs: any
  ): Promise<TaskInstance> {
    this.logger.info(`Scheduling task: ${definition.name}`);

    const task: TaskInstance = {
      id: this.generateTaskId(),
      taskDefinitionId: definition.id,
      status: 'pending',
      priority: definition.priority,
      inputData: inputs,
      retryCount: 0,
      maxRetries: definition.retryPolicy?.maxAttempts || 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.queue.enqueue(task);
    this.logger.info(`Task scheduled: ${task.id}`);

    return task;
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this.queue.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status === 'running') {
      // 对于正在运行的任务，只能标记为取消，实际停止需要执行器支持
      task.status = 'cancelled';
      task.updatedAt = new Date();
      this.logger.info(`Task marked as cancelled: ${taskId}`);
    } else if (task.status === 'pending') {
      // 对于待执行的任务，直接从队列中移除
      this.queue.remove(taskId);
      this.logger.info(`Task removed from queue: ${taskId}`);
    } else {
      throw new Error(`Cannot cancel task in status: ${task.status}`);
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskInstance> {
    const task = this.queue.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return task;
  }

  /**
   * 列出任务
   */
  async listTasks(filters?: TaskFilters): Promise<TaskInstance[]> {
    return this.queue.list(filters);
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Task scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting task scheduler');

    // 启动任务处理循环
    this.processingInterval = setInterval(() => {
      this.processTasks().catch((error) => {
        this.logger.error('Error processing tasks:', error);
      });
    }, 1000); // 每秒检查一次

    this.logger.info('Task scheduler started');
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Task scheduler is not running');
      return;
    }

    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    this.logger.info('Task scheduler stopped');
  }

  /**
   * 处理任务队列
   */
  private async processTasks(): Promise<void> {
    const stats = this.queue.getStats();

    // 检查是否有可用的执行槽位
    if (stats.running >= this.maxConcurrentTasks) {
      return;
    }

    // 获取下一个待执行的任务
    const task = this.queue.dequeue();
    if (!task) {
      return;
    }

    // 异步执行任务，不阻塞队列处理
    this.executeTask(task).catch((error) => {
      this.logger.error(`Task execution error: ${task.id}`, error);
    });
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: TaskInstance): Promise<void> {
    try {
      this.logger.info(`Executing task: ${task.id}`);

      task.status = 'running';
      task.startedAt = new Date();
      task.updatedAt = new Date();

      // 获取执行器
      const executor = await this.executorRegistry.getExecutor(
        task.taskDefinitionId
      );

      // 准备执行上下文
      const context = {
        taskId: parseInt(task.id.replace('task_', '')) || 0, // 转换为数字
        workflowInstanceId: task.workflowInstanceId
          ? parseInt(task.workflowInstanceId)
          : 0,
        config: task.inputData,
        inputs: task.inputData,
        context: {}, // 添加必需的 context 属性
        logger: this.logger
      };

      // 执行任务
      const result = await executor.execute(context);

      if (result.success) {
        task.status = 'completed';
        task.outputData = result.data;
        task.completedAt = new Date();
        this.logger.info(`Task completed: ${task.id}`);
      } else {
        throw new Error(result.error || 'Task execution failed');
      }
    } catch (error) {
      this.logger.error(`Task failed: ${task.id}`, error);

      task.errorMessage =
        error instanceof Error ? error.message : String(error);
      task.errorDetails = error;

      // 检查是否需要重试
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'retrying';

        // 计算重试延迟
        const delay = this.calculateRetryDelay(task.retryCount);
        this.logger.info(
          `Retrying task ${task.id} in ${delay}ms (attempt ${task.retryCount})`
        );

        setTimeout(() => {
          task.status = 'pending';
          this.queue.enqueue(task);
        }, delay);
      } else {
        task.status = 'failed';
        this.logger.error(`Task failed permanently: ${task.id}`);
      }
    } finally {
      task.updatedAt = new Date();
      this.queue.complete(task.id);
    }
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(retryCount: number): number {
    // 指数退避策略：1s, 2s, 4s, 8s, ...
    return Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 获取调度器统计信息
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      maxConcurrentTasks: this.maxConcurrentTasks,
      ...this.queue.getStats()
    };
  }
}
