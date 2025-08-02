/**
 * 并发控制工具 - 智能队列管理、背压处理、资源池管理
 */

import { sleep } from './common.js';

/**
 * 任务优先级
 */
export enum TaskPriority {
  Low = 1,
  Normal = 2,
  High = 3,
  Critical = 4
}

/**
 * 任务状态
 */
export enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled'
}

/**
 * 任务定义
 */
export interface Task<T = any> {
  id: string;
  fn: () => Promise<T>;
  priority: TaskPriority;
  timeout?: number;
  retries?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: TaskStatus;
  result?: T;
  error?: Error;
}

/**
 * 队列配置
 */
export interface QueueConfig {
  /** 最大并发数 */
  maxConcurrency: number;
  /** 队列最大长度 */
  maxQueueSize?: number;
  /** 背压阈值 */
  backpressureThreshold?: number;
  /** 自动启动 */
  autoStart?: boolean;
  /** 默认任务超时 */
  defaultTimeout?: number;
  /** 默认重试次数 */
  defaultRetries?: number;
}

/**
 * 队列统计信息
 */
export interface QueueStats {
  /** 队列中的任务数 */
  pending: number;
  /** 运行中的任务数 */
  running: number;
  /** 已完成的任务数 */
  completed: number;
  /** 失败的任务数 */
  failed: number;
  /** 总处理任务数 */
  total: number;
  /** 平均执行时间 */
  averageExecutionTime: number;
  /** 吞吐量(任务/秒) */
  throughput: number;
}

/**
 * 智能任务队列
 */
export class SmartQueue<T = any> {
  private queue: Task<T>[] = [];
  private readonly running: Map<string, Task<T>> = new Map();
  private readonly completed: Task<T>[] = [];
  private readonly failed: Task<T>[] = [];
  private readonly config: Required<QueueConfig>;
  private isRunning = false;
  private taskCounter = 0;
  private readonly startTime = Date.now();

  constructor(config: QueueConfig) {
    this.config = {
      maxQueueSize: 1000,
      backpressureThreshold: 0.8,
      autoStart: true,
      defaultTimeout: 30000,
      defaultRetries: 0,
      ...config
    };

    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * 添加任务到队列
   */
  async add(
    fn: () => Promise<T>,
    options: {
      priority?: TaskPriority;
      timeout?: number;
      retries?: number;
      id?: string;
    } = {}
  ): Promise<string> {
    const task: Task<T> = {
      id: options.id || `task_${++this.taskCounter}`,
      fn,
      priority: options.priority || TaskPriority.Normal,
      timeout: options.timeout || this.config.defaultTimeout,
      retries: options.retries || this.config.defaultRetries,
      createdAt: Date.now(),
      status: TaskStatus.Pending
    };

    // 检查队列是否已满
    if (
      this.config.maxQueueSize &&
      this.queue.length >= this.config.maxQueueSize
    ) {
      throw new Error('Queue is full');
    }

    // 检查背压
    if (this.isBackpressure()) {
      // 等待背压缓解
      await this.waitForBackpressureRelief();
    }

    // 按优先级插入任务
    this.insertByPriority(task);

    return task.id;
  }

  /**
   * 启动队列处理
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processQueue();
  }

  /**
   * 停止队列处理
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * 暂停队列处理
   */
  pause(): void {
    this.isRunning = false;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * 取消任务
   */
  cancel(taskId: string): boolean {
    // 从队列中移除
    const queueIndex = this.queue.findIndex((task) => task.id === taskId);
    if (queueIndex !== -1) {
      this.queue[queueIndex].status = TaskStatus.Cancelled;
      this.queue.splice(queueIndex, 1);
      return true;
    }

    // 取消正在运行的任务
    const runningTask = this.running.get(taskId);
    if (runningTask) {
      runningTask.status = TaskStatus.Cancelled;
      this.running.delete(taskId);
      this.failed.push(runningTask);
      return true;
    }

    return false;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): TaskStatus | null {
    const task = this.findTask(taskId);
    return task ? task.status : null;
  }

  /**
   * 获取队列统计信息
   */
  getStats(): QueueStats {
    const now = Date.now();
    const totalExecutionTime = this.completed.reduce((sum, task) => {
      return sum + (task.completedAt! - task.startedAt!);
    }, 0);

    const runningTime = (now - this.startTime) / 1000; // 秒

    return {
      pending: this.queue.length,
      running: this.running.size,
      completed: this.completed.length,
      failed: this.failed.length,
      total: this.completed.length + this.failed.length,
      averageExecutionTime:
        this.completed.length > 0
          ? totalExecutionTime / this.completed.length
          : 0,
      throughput:
        runningTime > 0
          ? (this.completed.length + this.failed.length) / runningTime
          : 0
    };
  }

  /**
   * 等待特定任务完成
   */
  async waitForTask(taskId: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const checkTask = () => {
        const task = this.findTask(taskId);
        if (!task) {
          reject(new Error(`Task ${taskId} not found`));
          return;
        }

        switch (task.status) {
          case TaskStatus.Completed:
            resolve(task.result!);
            break;
          case TaskStatus.Failed:
            reject(task.error);
            break;
          case TaskStatus.Cancelled:
            reject(new Error(`Task ${taskId} was cancelled`));
            break;
          default:
            // 继续等待
            setTimeout(checkTask, 100);
        }
      };

      checkTask();
    });
  }

  /**
   * 等待所有任务完成
   */
  async waitForAll(): Promise<void> {
    while (this.queue.length > 0 || this.running.size > 0) {
      await sleep(100);
    }
  }

  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      // 检查是否有可执行的任务
      if (
        this.queue.length === 0 ||
        this.running.size >= this.config.maxConcurrency
      ) {
        await sleep(10);
        continue;
      }

      const task = this.queue.shift()!;
      task.status = TaskStatus.Running;
      task.startedAt = Date.now();
      this.running.set(task.id, task);

      // 异步执行任务
      this.executeTask(task);
    }
  }

  private async executeTask(task: Task<T>): Promise<void> {
    try {
      let result: T;
      let attempts = 0;
      const maxAttempts = (task.retries ?? 0) + 1;

      while (attempts < maxAttempts) {
        try {
          // 添加超时控制
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error('Task timeout'));
            }, task.timeout);
          });

          result = await Promise.race([task.fn(), timeoutPromise]);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw error;
          }
          // 指数退避重试
          await sleep(Math.pow(2, attempts - 1) * 1000);
        }
      }

      task.result = result!;
      task.status = TaskStatus.Completed;
      task.completedAt = Date.now();
      this.completed.push(task);
    } catch (error) {
      task.error = error as Error;
      task.status = TaskStatus.Failed;
      task.completedAt = Date.now();
      this.failed.push(task);
    } finally {
      this.running.delete(task.id);
    }
  }

  private insertByPriority(task: Task<T>): void {
    let insertIndex = 0;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < task.priority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    this.queue.splice(insertIndex, 0, task);
  }

  private findTask(taskId: string): Task<T> | null {
    // 在队列中查找
    let task = this.queue.find((t) => t.id === taskId);
    if (task) return task;

    // 在运行中查找
    task = this.running.get(taskId);
    if (task) return task;

    // 在已完成中查找
    task = this.completed.find((t) => t.id === taskId);
    if (task) return task;

    // 在失败中查找
    task = this.failed.find((t) => t.id === taskId);
    if (task) return task;

    return null;
  }

  private isBackpressure(): boolean {
    if (!this.config.maxQueueSize) return false;
    return (
      this.queue.length / this.config.maxQueueSize >=
      this.config.backpressureThreshold
    );
  }

  private async waitForBackpressureRelief(): Promise<void> {
    while (this.isBackpressure()) {
      await sleep(100);
    }
  }
}

/**
 * 资源池管理器
 */
export class ResourcePool<T> {
  private available: T[] = [];
  private readonly inUse: Set<T> = new Set();
  private waitingQueue: Array<(resource: T) => void> = [];
  private readonly factory: () => Promise<T>;
  private readonly destructor?: (resource: T) => Promise<void>;
  private readonly validator?: (resource: T) => Promise<boolean>;
  private readonly maxSize: number;
  private readonly minSize: number;

  constructor(options: {
    factory: () => Promise<T>;
    destructor?: (resource: T) => Promise<void>;
    validator?: (resource: T) => Promise<boolean>;
    maxSize: number;
    minSize?: number;
  }) {
    this.factory = options.factory;
    this.destructor = options.destructor;
    this.validator = options.validator;
    this.maxSize = options.maxSize;
    this.minSize = options.minSize || 0;

    // 初始化最小数量的资源
    this.initialize();
  }

  /**
   * 获取资源
   */
  async acquire(): Promise<T> {
    // 检查可用资源
    if (this.available.length > 0) {
      const resource = this.available.pop()!;

      // 验证资源有效性
      if (this.validator) {
        const isValid = await this.validator(resource);
        if (!isValid) {
          // 销毁无效资源并重新获取
          await this.destroyResource(resource);
          return this.acquire();
        }
      }

      this.inUse.add(resource);
      return resource;
    }

    // 创建新资源（如果没有达到最大限制）
    if (this.inUse.size < this.maxSize) {
      const resource = await this.factory();
      this.inUse.add(resource);
      return resource;
    }

    // 等待资源释放
    return new Promise((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  /**
   * 释放资源
   */
  async release(resource: T): Promise<void> {
    if (!this.inUse.has(resource)) {
      return;
    }

    this.inUse.delete(resource);

    // 如果有等待的请求，直接分配给它们
    if (this.waitingQueue.length > 0) {
      const waiting = this.waitingQueue.shift()!;
      this.inUse.add(resource);
      waiting(resource);
      return;
    }

    // 验证资源有效性
    if (this.validator) {
      const isValid = await this.validator(resource);
      if (!isValid) {
        await this.destroyResource(resource);
        return;
      }
    }

    // 放回可用池
    this.available.push(resource);
  }

  /**
   * 销毁资源池
   */
  async destroy(): Promise<void> {
    // 销毁所有可用资源
    for (const resource of this.available) {
      await this.destroyResource(resource);
    }
    this.available = [];

    // 销毁所有使用中的资源
    for (const resource of this.inUse) {
      await this.destroyResource(resource);
    }
    this.inUse.clear();

    // 拒绝所有等待的请求
    for (const waiting of this.waitingQueue) {
      waiting(null as any);
    }
    this.waitingQueue = [];
  }

  /**
   * 获取池统计信息
   */
  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      waiting: this.waitingQueue.length,
      total: this.available.length + this.inUse.size
    };
  }

  private async initialize(): Promise<void> {
    for (let i = 0; i < this.minSize; i++) {
      try {
        const resource = await this.factory();
        this.available.push(resource);
      } catch (error) {
        console.error('Failed to initialize resource:', error);
      }
    }
  }

  private async destroyResource(resource: T): Promise<void> {
    if (this.destructor) {
      try {
        await this.destructor(resource);
      } catch (error) {
        console.error('Failed to destroy resource:', error);
      }
    }
  }
}

/**
 * 限流器
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefill: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * 尝试获取令牌
   */
  async acquire(tokens = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    // 等待令牌补充
    const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
    await sleep(waitTime);
    await this.acquire(tokens);
  }

  /**
   * 检查是否可以获取令牌
   */
  canAcquire(tokens = 1): boolean {
    this.refill();
    return this.tokens >= tokens;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
