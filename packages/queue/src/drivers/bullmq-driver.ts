/**
 * @stratix/queue BullMQ驱动实现
 */

import * as utils from '@stratix/utils';
import {
  Job as BullJob,
  Queue as BullQueue,
  ConnectionOptions,
  QueueEvents,
  Worker
} from 'bullmq';

import {
  QueueEvent,
  type JobInstance,
  type QueueInstance,
  type QueueMetrics,
  type QueueStatus
} from '../types/index.js';

import {
  defaultErrorHandler,
  defaultPerformanceMonitor
} from '../utils/index.js';
import {
  AbstractQueueDriver,
  AbstractQueueInstance
} from './abstract-driver.js';

/**
 * Redis连接池管理
 * 用于在多个队列间共享连接
 */
class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private connections: Map<string, ConnectionOptions>;
  private connectionUsage: Map<string, number>;
  private connectionKeys: Map<ConnectionOptions, string>;

  private constructor() {
    this.connections = new Map();
    this.connectionUsage = new Map();
    this.connectionKeys = new Map();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  /**
   * 获取连接
   * @param options 连接选项
   * @returns 连接对象
   */
  public getConnection(options: ConnectionOptions): ConnectionOptions {
    const connectionKey = this.getConnectionKey(options);

    // 如果连接已存在，增加引用计数并返回
    if (this.connections.has(connectionKey)) {
      const count = this.connectionUsage.get(connectionKey) || 0;
      this.connectionUsage.set(connectionKey, count + 1);
      return this.connections.get(connectionKey)!;
    }

    // 否则创建新连接并存储
    this.connections.set(connectionKey, options);
    this.connectionUsage.set(connectionKey, 1);
    this.connectionKeys.set(options, connectionKey);

    return options;
  }

  /**
   * 释放连接
   * @param connection 连接对象
   */
  public releaseConnection(connection: ConnectionOptions): void {
    const connectionKey = this.connectionKeys.get(connection);
    if (!connectionKey) return;

    const count = this.connectionUsage.get(connectionKey) || 0;
    if (count <= 1) {
      this.connections.delete(connectionKey);
      this.connectionUsage.delete(connectionKey);
      this.connectionKeys.delete(connection);
    } else {
      this.connectionUsage.set(connectionKey, count - 1);
    }
  }

  /**
   * 生成连接键
   * @param options 连接选项
   * @returns 连接键
   */
  private getConnectionKey(options: ConnectionOptions): string {
    const { host, port, db, password } = options as any;
    return `${host || 'localhost'}:${port || 6379}:${db || 0}:${password || ''}`;
  }
}

/**
 * BullMQ任务实例包装类
 * 实现JobInstance接口，包装BullMQ的Job类
 */
class BullMQJobInstance implements JobInstance {
  private _job: BullJob;

  /**
   * 构造函数
   * @param job BullMQ任务实例
   */
  constructor(job: BullJob) {
    // 确保_job不为undefined
    if (!job) {
      throw new Error('BullMQ job instance cannot be null or undefined');
    }
    this._job = job;
  }

  /**
   * 获取任务ID
   */
  get id(): string {
    return this._job.id ? this._job.id.toString() : '';
  }

  /**
   * 获取任务名称
   */
  get name(): string {
    return this._job.name;
  }

  /**
   * 获取任务数据
   */
  get data(): any {
    return this._job.data;
  }

  /**
   * 获取任务状态
   */
  get status(): string {
    // 直接返回getState的结果，而不是访问state属性
    // 实际调用时将异步获取状态
    return 'unknown'; // 默认值，实际会通过getState()异步获取
  }

  /**
   * 获取任务结果
   */
  get returnvalue(): any {
    return this._job.returnvalue;
  }

  /**
   * 获取已尝试次数
   */
  get attemptsMade(): number {
    return this._job.attemptsMade;
  }

  /**
   * 更新任务进度
   * @param progress 进度值或对象
   */
  async updateProgress(progress: number | object): Promise<void> {
    await this._job.updateProgress(progress);
  }

  /**
   * 获取任务进度
   */
  async getProgress(): Promise<number | object> {
    // BullMQ中progress可能是string, number或object类型
    const progress = this._job.progress;
    // 如果是数字或对象，直接返回，否则返回0
    if (typeof progress === 'number' || typeof progress === 'object') {
      return progress;
    }
    return 0;
  }

  /**
   * 重试任务
   */
  async retry(): Promise<void> {
    await this._job.retry();
  }

  /**
   * 移除任务
   */
  async remove(): Promise<void> {
    await this._job.remove();
  }

  /**
   * 将任务标记为失败
   * @param error 错误对象
   */
  async moveToFailed(error: Error): Promise<void> {
    await this._job.moveToFailed(error, '');
  }

  /**
   * 将任务标记为完成
   * @param returnvalue 返回值
   */
  async moveToCompleted(returnvalue?: any): Promise<void> {
    await this._job.moveToCompleted(returnvalue, '', false);
  }

  /**
   * 提升延迟任务优先级
   */
  async promote(): Promise<void> {
    await this._job.promote();
  }

  /**
   * 废弃任务
   */
  async discard(): Promise<void> {
    await this._job.discard();
  }

  /**
   * 添加任务日志
   * @param message 日志消息
   */
  async log(message: string): Promise<void> {
    await this._job.log(message);
  }

  /**
   * 获取任务日志
   */
  async getLogs(): Promise<any[]> {
    try {
      // BullMQ可能没有直接的getLogs方法
      // 使用一个空数组并添加一条当前日志作为替代方案
      return [
        {
          message: `Job ${this._job.id} logs not directly available in this BullMQ version`,
          timestamp: new Date()
        }
      ];
    } catch (error) {
      console.warn(`Failed to get logs for job ${this._job.id}: ${error}`);
      return [];
    }
  }

  /**
   * 添加依赖任务
   * @param jobId 依赖任务ID
   */
  async addDependency(jobId: string): Promise<void> {
    try {
      // 依赖管理功能可能需要通过其他方式实现
      // 这里简化处理
      console.warn('addDependency not fully implemented');
    } catch (error) {
      console.error(`Failed to add dependency: ${error}`);
    }
  }

  /**
   * 移除依赖任务
   * @param jobId 依赖任务ID
   */
  async removeDependency(jobId: string): Promise<void> {
    try {
      // 依赖管理功能可能需要通过其他方式实现
      // 这里简化处理
      console.warn('removeDependency not fully implemented');
    } catch (error) {
      console.error(`Failed to remove dependency: ${error}`);
    }
  }

  /**
   * 获取任务详细状态
   */
  async getState(): Promise<any> {
    try {
      const state = await this._job.getState();
      const jobState: any = {
        status: state,
        data: this._job.data,
        attemptsMade: this._job.attemptsMade,
        returnvalue: this._job.returnvalue,
        failedReason: this._job.failedReason
      };

      // 根据不同状态填充额外信息
      if (state === 'completed') {
        jobState.finishedOn = this._job.finishedOn;
        jobState.processedOn = this._job.processedOn;
      } else if (state === 'failed') {
        jobState.finishedOn = this._job.finishedOn;
        jobState.stacktrace = this._job.stacktrace;
      } else if (state === 'active') {
        jobState.processedOn = this._job.processedOn;
      }
      // 其他状态不需要额外处理

      return jobState;
    } catch (error) {
      console.error(`Failed to get job state: ${error}`);
      return { status: 'unknown' };
    }
  }
}

/**
 * BullMQ队列实例
 * 实现QueueInstance接口，包装BullMQ的Queue类
 */
class BullMQQueueInstance extends AbstractQueueInstance {
  private _queue: BullQueue;
  private _worker?: Worker;
  private _events?: QueueEvents;
  private _isInitialized: boolean = false;
  private _isClosed: boolean = false;
  private _connectionManager: RedisConnectionManager;
  private _perfMetrics: {
    completedJobs: number;
    startTime: number;
    processingTimes: number[];
    lastResetTime: number;
  };

  /**
   * 构造函数
   * @param name 队列名称
   * @param connection 连接选项
   * @param options 队列选项
   */
  constructor(name: string, connection: ConnectionOptions, options: any = {}) {
    super(name, options);

    // 获取连接管理器
    this._connectionManager = RedisConnectionManager.getInstance();
    const managedConnection = this._connectionManager.getConnection(connection);

    // 创建BullMQ队列
    const queueOptions = { ...options };
    queueOptions.connection = managedConnection;
    this._queue = new BullQueue(name, queueOptions);

    // 初始化性能指标
    this._perfMetrics = {
      completedJobs: 0,
      startTime: Date.now(),
      processingTimes: [],
      lastResetTime: Date.now()
    };

    // 设置事件监听
    this._setupEvents();
  }

  /**
   * 设置事件监听
   */
  private _setupEvents(): void {
    // 如果启用了全局事件
    if (this.options.globalEvents !== false) {
      this._events = new QueueEvents(this._name, {
        connection: this._queue.opts.connection
      });

      // 监听全局事件
      this._events.on('completed', ({ jobId, returnvalue }) => {
        this.emitEvent(QueueEvent.COMPLETED, { jobId, returnvalue });

        // 更新性能指标
        this._perfMetrics.completedJobs++;
      });

      this._events.on('failed', ({ jobId, failedReason }) => {
        this.emitEvent(QueueEvent.FAILED, { jobId, failedReason });
      });

      this._events.on('progress', ({ jobId, data }) => {
        this.emitEvent(QueueEvent.PROGRESS, { jobId, progress: data });
      });

      this._events.on('added', ({ jobId, name }) => {
        this.emitEvent(QueueEvent.ADDED, { jobId, name });
      });

      this._events.on('removed', ({ jobId }) => {
        this.emitEvent(QueueEvent.REMOVED, { jobId });
      });
    }
  }

  /**
   * 添加任务到队列
   * @param name 任务名称
   * @param data 任务数据
   * @param options 任务选项
   */
  async add(name: string, data: any, options: any = {}): Promise<JobInstance> {
    try {
      // 使用性能监控来测量添加任务的性能
      const job = await defaultPerformanceMonitor.measure(
        `${this._name}:add`,
        async () => await this._queue.add(name, data, options),
        { name, options }
      );

      return new BullMQJobInstance(job);
    } catch (error) {
      // 使用统一的错误处理
      throw defaultErrorHandler.handleJobError(error as Error, {
        queue: this._name,
        operation: 'add',
        name,
        options
      });
    }
  }

  /**
   * 批量添加任务
   * @param jobs 任务数组
   */
  async addBulk(
    jobs: Array<{ name: string; data: any; opts?: any }>
  ): Promise<JobInstance[]> {
    try {
      // 对于较大的批量任务，使用分批添加以避免Redis阻塞
      if (jobs.length > 1000) {
        const batchSize = 1000;
        const batches: any[] = [];

        for (let i = 0; i < jobs.length; i += batchSize) {
          const batch = jobs.slice(i, i + batchSize);
          batches.push(batch);
        }

        // 使用性能监控工具测量批量添加性能
        const results: BullJob[] = await defaultPerformanceMonitor.measure(
          `${this._name}:addBulk`,
          async () => {
            // 并行添加多个批次，但每批的大小有限制
            const batchResults = await utils.async.pMap(
              batches,
              async (batch) => {
                return await this._queue.addBulk(batch);
              },
              { concurrency: 5 } // 最多并行5个批次
            );

            return batchResults.flat();
          },
          { jobCount: jobs.length, batchCount: batches.length }
        );

        return results.map((job) => new BullMQJobInstance(job));
      }

      // 对于较小的批量，直接添加
      const bullJobs = await defaultPerformanceMonitor.measure(
        `${this._name}:addBulk`,
        async () => await this._queue.addBulk(jobs),
        { jobCount: jobs.length }
      );

      return bullJobs.map((job) => new BullMQJobInstance(job));
    } catch (error) {
      throw defaultErrorHandler.handleJobError(error as Error, {
        queue: this._name,
        operation: 'addBulk',
        jobCount: jobs.length
      });
    }
  }

  /**
   * 注册处理器
   * @param processor 处理器函数或处理器映射
   */
  process(processor: Function | Record<string, Function>): void {
    // 关闭已有的Worker
    if (this._worker) {
      this._worker.close().catch((error) => {
        console.error(`关闭Worker失败 (${this._name}):`, error);
      });
    }

    // 创建新的Worker
    const concurrency = this.options.concurrency || 1;

    if (typeof processor === 'function') {
      // 单一处理器
      this._worker = new Worker(
        this._name,
        async (job) => {
          try {
            const jobWrapper = new BullMQJobInstance(job);
            const startTime = Date.now();

            const result = await processor(jobWrapper);

            // 记录任务处理时间
            const processingTime = Date.now() - startTime;
            this._perfMetrics.processingTimes.push(processingTime);
            // 只保留最近100个处理时间
            if (this._perfMetrics.processingTimes.length > 100) {
              this._perfMetrics.processingTimes.shift();
            }

            return result;
          } catch (error) {
            console.error(`任务处理错误 (${this._name}):`, error);
            throw error;
          }
        },
        {
          connection: this._queue.opts.connection,
          concurrency,
          lockDuration: this.options.lockDuration,
          lockRenewTime: this.options.lockRenewTime
        }
      );
    } else {
      // 多处理器映射
      this._worker = new Worker(
        this._name,
        async (job) => {
          try {
            const jobProcessor = processor[job.name];
            if (!jobProcessor) {
              throw new Error(`未找到任务处理器: ${job.name}`);
            }
            const jobWrapper = new BullMQJobInstance(job);

            const startTime = Date.now();
            const result = await jobProcessor(jobWrapper);

            // 记录任务处理时间
            const processingTime = Date.now() - startTime;
            this._perfMetrics.processingTimes.push(processingTime);
            // 只保留最近100个处理时间
            if (this._perfMetrics.processingTimes.length > 100) {
              this._perfMetrics.processingTimes.shift();
            }

            return result;
          } catch (error) {
            console.error(`任务处理错误 (${this._name}):`, error);
            throw error;
          }
        },
        {
          connection: this._queue.opts.connection,
          concurrency,
          lockDuration: this.options.lockDuration,
          lockRenewTime: this.options.lockRenewTime
        }
      );
    }

    // 监听Worker事件
    this._worker.on('completed', (job, result) => {
      if (!job) {
        console.warn('Worker completed event received with undefined job');
        return;
      }

      const jobWrapper = new BullMQJobInstance(job);
      this.emitEvent(QueueEvent.COMPLETED, jobWrapper, result);

      // 更新完成任务计数
      this._perfMetrics.completedJobs++;
    });

    this._worker.on('failed', (job, error) => {
      if (!job) {
        console.warn('Worker failed event received with undefined job');
        return;
      }

      const jobWrapper = new BullMQJobInstance(job);
      this.emitEvent(QueueEvent.FAILED, jobWrapper, error);
    });

    this._worker.on('error', (error) => {
      this.emitEvent(QueueEvent.ERROR, error);
      console.error(`Worker错误 (${this._name}):`, error);
    });

    this._isInitialized = true;
  }

  /**
   * 获取任务实例
   * @param jobId 任务ID
   */
  async getJob(jobId: string): Promise<JobInstance | null> {
    try {
      // 获取任务
      const job = await this._queue.getJob(jobId);
      if (!job) {
        return null;
      }

      try {
        // 使用try-catch创建JobInstance，以防job类型不符合预期
        return new BullMQJobInstance(job);
      } catch (e) {
        console.error(`Error creating job instance for ${jobId}:`, e);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * 获取任务列表
   * @param status 任务状态或状态数组
   * @param start 起始索引
   * @param end 结束索引
   * @param asc 是否升序排序
   */
  async getJobs(
    status: string | string[],
    start: number = 0,
    end: number = -1,
    asc: boolean = false
  ): Promise<JobInstance[]> {
    // 确保statusArr是一个数组
    const statusArr = Array.isArray(status) ? status : [status];

    try {
      const result: JobInstance[] = [];

      // 逐个获取每种状态的任务
      for (const state of statusArr) {
        try {
          // 使用any类型避免类型检查问题
          const stateJobs = await this._queue.getJobs(
            [state as any],
            start,
            end,
            asc
          );

          // 过滤并转换有效的任务
          if (Array.isArray(stateJobs)) {
            for (const job of stateJobs) {
              if (job) {
                try {
                  result.push(new BullMQJobInstance(job));
                } catch (e) {
                  // 忽略无效的任务
                  console.warn(`Invalid job object found: ${e}`);
                }
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to get jobs with status ${state}: ${e}`);
        }
      }

      return result;
    } catch (error) {
      console.error(`Error getting jobs: ${error}`);
      return [];
    }
  }

  /**
   * 获取任务计数
   */
  async getJobCounts(): Promise<Record<string, number>> {
    return await this._queue.getJobCounts();
  }

  /**
   * 移除任务
   * @param jobId 任务ID
   */
  async removeJob(jobId: string): Promise<boolean> {
    const job = await this._queue.getJob(jobId);
    if (!job) return false;
    await job.remove();
    return true;
  }

  /**
   * 批量移除任务
   * @param pattern 任务ID模式
   */
  async removeJobs(pattern: string): Promise<number> {
    try {
      // BullMQ 4.x+ 版本使用removeByPattern
      if ('removeByPattern' in this._queue) {
        await (this._queue as any).removeByPattern(pattern);
      } else {
        // 回退方法：获取任务并移除
        const jobs = await this._queue.getJobs([
          'waiting',
          'active',
          'delayed'
        ]);
        const matchingJobs = jobs.filter(
          (job) =>
            job.id.toString().includes(pattern) || job.name.includes(pattern)
        );

        await Promise.all(matchingJobs.map((job) => job.remove()));
        return matchingJobs.length;
      }
      return 1; // 无法获取确切数量
    } catch (error) {
      console.error(`批量移除任务失败 (${pattern}):`, error);
      return 0;
    }
  }

  /**
   * 暂停队列处理
   */
  async pause(): Promise<void> {
    if (this._worker) {
      await this._worker.pause();
    }
    await this._queue.pause();
    this.emitEvent(QueueEvent.PAUSED);
  }

  /**
   * 恢复队列处理
   */
  async resume(): Promise<void> {
    await this._queue.resume();
    if (this._worker) {
      await this._worker.resume();
    }
    this.emitEvent(QueueEvent.RESUMED);
  }

  /**
   * 检查队列是否暂停
   */
  async isPaused(): Promise<boolean> {
    try {
      if (this._worker) {
        return await this._worker.isPaused();
      }
      return false;
    } catch (error) {
      throw defaultErrorHandler.handleQueueError(error as Error, {
        queue: this._name,
        operation: 'isPaused'
      });
    }
  }

  /**
   * 重置性能指标
   */
  private _resetPerfMetrics(): void {
    this._perfMetrics = {
      completedJobs: 0,
      startTime: Date.now(),
      processingTimes: [],
      lastResetTime: Date.now()
    };
  }

  /**
   * 计算平均处理时间
   */
  private _calculateAvgProcessingTime(): number {
    if (this._perfMetrics.processingTimes.length === 0) {
      return 0;
    }

    const sum = this._perfMetrics.processingTimes.reduce((a, b) => a + b, 0);
    return sum / this._perfMetrics.processingTimes.length;
  }

  /**
   * 计算吞吐量（每秒完成任务数）
   */
  private _calculateThroughput(): number {
    const timeElapsed = (Date.now() - this._perfMetrics.startTime) / 1000; // 秒
    if (timeElapsed <= 0) return 0;

    return this._perfMetrics.completedJobs / timeElapsed;
  }

  /**
   * 清空队列
   */
  async empty(): Promise<void> {
    try {
      await defaultPerformanceMonitor.measure(
        `${this._name}:empty`,
        async () => await this._queue.obliterate({ force: true })
      );

      this.emitEvent(QueueEvent.CLEANED);

      // 重置指标
      this._resetPerfMetrics();
    } catch (error) {
      throw defaultErrorHandler.handleQueueError(error as Error, {
        queue: this._name,
        operation: 'empty'
      });
    }
  }

  /**
   * 关闭队列连接
   */
  async close(): Promise<void> {
    if (this._isClosed) return;

    try {
      this._isClosed = true;

      // 关闭对应的事件监听器
      if (this._events) {
        await this._events.close();
        this._events = undefined;
      }

      // 关闭队列处理器
      if (this._worker) {
        await this._worker.close();
        this._worker = undefined;
      }

      // 关闭队列连接
      await this._queue.close();

      // 释放连接
      this._connectionManager.releaseConnection(this._queue.opts.connection);

      this._isInitialized = false;
    } catch (error) {
      throw defaultErrorHandler.handleQueueError(error as Error, {
        queue: this._name,
        operation: 'close'
      });
    }
  }

  /**
   * 获取队列状态
   */
  async getStatus(): Promise<QueueStatus> {
    const isPaused = await this.isPaused();
    const counts = await this.getJobCounts();

    // 确保返回对象符合QueueStatus接口
    return {
      isPaused,
      jobCounts: {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: counts.paused || 0
      }
    };
  }

  /**
   * 获取队列指标
   */
  async getMetrics(): Promise<QueueMetrics> {
    const { waiting, active, completed, failed, delayed } =
      await this.getJobCounts();

    // 自动重置超过1小时的指标
    if (Date.now() - this._perfMetrics.lastResetTime > 3600000) {
      this._resetPerfMetrics();
    }

    // 计算性能指标
    const throughput = this._calculateThroughput();
    const avgProcessingTime = this._calculateAvgProcessingTime();

    // 确保返回对象符合QueueMetrics接口
    return {
      throughput,
      latency: avgProcessingTime, // 用平均处理时间作为延迟指标
      waiting: waiting || 0,
      active: active || 0,
      completed: completed || 0,
      failed: failed || 0,
      delayed: delayed || 0
    };
  }
}

/**
 * BullMQ驱动实现
 * 基于BullMQ实现的队列驱动
 */
export class BullMQDriver extends AbstractQueueDriver {
  private connection: ConnectionOptions;
  private connectionManager: RedisConnectionManager;

  /**
   * 构造函数
   * @param options 驱动选项
   */
  constructor(options: any = {}) {
    super(options);

    // 获取连接管理器
    this.connectionManager = RedisConnectionManager.getInstance();

    // 设置默认连接选项
    this.connection = {
      host: options.host || 'localhost',
      port: options.port || 6379,
      db: options.db || 0
    };

    // 如果提供了密码
    if (options.password) {
      this.connection.password = options.password;
    }

    // 如果提供了TLS配置
    if (options.tls) {
      this.connection.tls = options.tls;
    }

    // 如果直接提供了连接对象
    if (options.connection) {
      this.connection = options.connection;
    }
  }

  /**
   * 初始化驱动
   * @param options 初始化选项
   */
  async init(options: any): Promise<void> {
    await super.init(options);

    // 更新连接选项
    if (options.connection) {
      this.connection = options.connection;
    } else if (options.redis) {
      this.connection = {
        ...this.connection,
        ...options.redis
      };
    }

    // 连接优化：设置最大连接数
    if (options.maxConnections) {
      (this.connection as any).maxConnections = options.maxConnections;
    }
  }

  /**
   * 创建队列实例
   * @param name 队列名称
   * @param options 队列选项
   */
  createQueue(name: string, options: any = {}): QueueInstance {
    // 如果指定了前缀，添加到队列名称
    const prefix = this.options.prefix || '';
    const queueName = prefix + name;

    // 合并默认队列选项和传入的选项
    const queueOptions = utils.object.deepMerge(
      {},
      this.options.defaultQueueOptions || {},
      options
    );

    // 创建BullMQ队列实例
    const queue = new BullMQQueueInstance(
      queueName,
      this.connection,
      queueOptions
    );

    // 添加到队列映射
    this.queues.set(name, queue);

    return queue;
  }

  /**
   * 获取驱动名称
   */
  getName(): string {
    return 'bullmq';
  }

  /**
   * 检查驱动健康状态
   */
  async checkHealth(): Promise<boolean> {
    try {
      // 实现带超时的健康检查
      return await Promise.race([
        (async () => {
          try {
            // 创建一个临时队列测试连接
            const testQueue = new BullQueue('health-check', {
              connection: this.connection
            });

            // 添加一个测试任务
            await testQueue.add('health-check', { timestamp: Date.now() });

            // 清空队列
            await testQueue.obliterate({ force: true });

            // 关闭连接
            await testQueue.close();

            return true;
          } catch (error) {
            defaultErrorHandler.handleConnectionError(error as Error, {
              operation: 'checkHealth'
            });
            return false;
          }
        })(),
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            defaultErrorHandler.handleTimeoutError('健康检查超时', {
              operation: 'checkHealth',
              timeout: 5000
            });
            resolve(false);
          }, 5000);
        })
      ]);
    } catch (error) {
      defaultErrorHandler.handleDriverError(error as Error, {
        operation: 'checkHealth'
      });
      return false;
    }
  }

  /**
   * 关闭所有连接
   */
  async close(): Promise<void> {
    // 先关闭所有队列
    await super.close();

    // 额外的清理工作
    try {
      // 这里可以添加任何需要的额外清理
    } catch (error) {
      console.error('关闭BullMQ驱动连接时出错:', error);
    }
  }
}

export default BullMQDriver;
