/**
 * @stratix/queue 内存队列驱动实现
 */

import { common, object } from '@stratix/utils';
import {
  JobInstance,
  JobStatus,
  QueueEvent,
  QueueInstance
} from '../types/index.js';
import {
  AbstractQueueDriver,
  AbstractQueueInstance
} from './abstract-driver.js';

/**
 * 内存任务实例
 * 实现JobInstance接口
 */
class MemoryJobInstance implements JobInstance {
  private _id: string;
  private _name: string;
  private _data: any;
  private _status: string;
  private _progress: number = 0;
  private _result: any = null;
  private _error: Error | null = null;
  private _attempts: number = 0;
  private _maxAttempts: number = 0;
  private _logs: Array<{ message: string; timestamp: Date }> = [];
  private _dependencies: string[] = [];
  private _createdAt: Date;
  private _startedAt: Date | null = null;
  private _finishedAt: Date | null = null;
  private _options: any;

  /**
   * 构造函数
   * @param name 任务名称
   * @param data 任务数据
   * @param options 任务选项
   */
  constructor(name: string, data: any, options: any = {}) {
    this._id = options.jobId || common.generateId();
    this._name = name;
    this._data = data;
    this._status = JobStatus.WAITING;
    this._createdAt = new Date();
    this._options = options;
    this._maxAttempts = options.attempts || 1;

    if (options.delay) {
      this._status = JobStatus.DELAYED;
    }

    if (options.dependencies && Array.isArray(options.dependencies)) {
      this._dependencies = options.dependencies;
      this._status = JobStatus.WAITING;
    }
  }

  /**
   * 获取任务ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * 获取任务名称
   */
  get name(): string {
    return this._name;
  }

  /**
   * 获取任务数据
   */
  get data(): any {
    return this._data;
  }

  /**
   * 获取任务状态
   */
  get status(): string {
    return this._status;
  }

  /**
   * 获取任务结果
   */
  get returnvalue(): any {
    return this._result;
  }

  /**
   * 获取已尝试次数
   */
  get attemptsMade(): number {
    return this._attempts;
  }

  /**
   * 更新任务进度
   * @param progress 进度值或对象
   */
  async updateProgress(progress: any): Promise<void> {
    this._progress = typeof progress === 'number' ? progress : 0;
  }

  /**
   * 获取任务进度
   */
  async getProgress(): Promise<any> {
    return this._progress;
  }

  /**
   * 重试任务
   */
  async retry(): Promise<void> {
    if (
      this._status === JobStatus.FAILED &&
      this._attempts < this._maxAttempts
    ) {
      this._status = JobStatus.WAITING;
    }
  }

  /**
   * 移除任务
   */
  async remove(): Promise<void> {
    this._status = JobStatus.FAILED;
  }

  /**
   * 将任务标记为失败
   * @param error 错误对象
   */
  async moveToFailed(error: Error): Promise<void> {
    this._status = JobStatus.FAILED;
    this._error = error;
    this._finishedAt = new Date();
  }

  /**
   * 提升延迟任务优先级
   */
  async promote(): Promise<void> {
    if (this._status === JobStatus.DELAYED) {
      this._status = JobStatus.WAITING;
    }
  }

  /**
   * 废弃任务
   */
  async discard(): Promise<void> {
    this._status = JobStatus.FAILED;
    this._error = new Error('手动丢弃');
    this._finishedAt = new Date();
  }

  /**
   * 添加任务日志
   * @param message 日志消息
   */
  async log(message: string): Promise<void> {
    this._logs.push({
      message,
      timestamp: new Date()
    });
  }

  /**
   * 获取任务日志
   */
  async getLogs(): Promise<
    Array<{ message: string; timestamp: string | Date }>
  > {
    return this._logs;
  }

  /**
   * 添加依赖任务
   * @param jobId 依赖任务ID
   */
  async addDependency(jobId: string): Promise<void> {
    if (!this._dependencies.includes(jobId)) {
      this._dependencies.push(jobId);
      if (this._status !== JobStatus.DELAYED) {
        this._status = JobStatus.WAITING;
      }
    }
  }

  /**
   * 移除依赖任务
   * @param jobId 依赖任务ID
   */
  async removeDependency(jobId: string): Promise<void> {
    this._dependencies = this._dependencies.filter((id) => id !== jobId);
  }

  /**
   * 获取任务详细状态
   */
  async getState(): Promise<any> {
    return {
      status: this._status,
      progress: this._progress,
      data: this._data,
      attemptsMade: this._attempts,
      returnvalue: this._result,
      error: this._error,
      createdAt: this._createdAt,
      startedAt: this._startedAt,
      finishedAt: this._finishedAt,
      dependencies: this._dependencies,
      logs: this._logs.length
    };
  }

  /**
   * 标记任务为活动状态 (内部使用)
   */
  _activate(): void {
    this._status = JobStatus.ACTIVE;
    this._startedAt = new Date();
    this._attempts++;
  }

  /**
   * 标记任务为完成状态 (内部使用)
   * @param result 任务结果
   */
  _complete(result: any): void {
    this._status = JobStatus.COMPLETED;
    this._result = result;
    this._finishedAt = new Date();
  }

  /**
   * 获取任务选项 (内部使用)
   */
  _getOptions(): any {
    return this._options;
  }

  /**
   * 获取依赖任务ID列表 (内部使用)
   */
  _getDependencies(): string[] {
    return this._dependencies;
  }

  /**
   * 检查是否可以执行任务 (内部使用)
   */
  _canProcess(): boolean {
    return (
      (this._status === JobStatus.WAITING ||
        this._status === JobStatus.DELAYED) &&
      this._dependencies.length === 0
    );
  }
}

/**
 * 内存队列实例
 * 实现QueueInstance接口
 */
class MemoryQueueInstance extends AbstractQueueInstance {
  private _jobs: Map<string, MemoryJobInstance> = new Map();
  private _processorMap: Record<string, Function> = {};
  private _defaultProcessor?: Function;
  private _timers: Map<string, NodeJS.Timeout> = new Map();
  private _processing: boolean = false;
  private _paused: boolean = false;
  private _processInterval?: NodeJS.Timeout;
  private _concurrency: number = 1;
  private _runningJobs: Set<string> = new Set();

  /**
   * 构造函数
   * @param name 队列名称
   * @param options 队列选项
   */
  constructor(name: string, options: any = {}) {
    super(name, options);

    // 设置并发数
    this._concurrency = options.concurrency || 1;

    // 设置默认进程间隔 (毫秒)
    const processInterval = options.processInterval || 500;

    // 启动处理器
    this._startProcessor(processInterval);
  }

  /**
   * 启动任务处理器
   * @param interval 处理间隔 (毫秒)
   */
  private _startProcessor(interval: number): void {
    // 清除已有的处理器
    if (this._processInterval) {
      clearInterval(this._processInterval);
    }

    // 启动新的处理器
    this._processInterval = setInterval(() => {
      this._processNextJobs();
    }, interval);
  }

  /**
   * 处理下一批任务
   */
  private async _processNextJobs(): Promise<void> {
    // 如果队列已暂停或正在处理中，则跳过
    if (this._paused || this._processing) return;

    this._processing = true;

    try {
      // 检查可处理的任务数
      const availableSlots = this._concurrency - this._runningJobs.size;
      if (availableSlots <= 0) {
        return;
      }

      // 查找待处理的任务
      const jobsToProcess: MemoryJobInstance[] = [];

      // 首先处理延迟和等待任务
      for (const job of this._jobs.values()) {
        if (job._canProcess() && !this._runningJobs.has(job.id)) {
          jobsToProcess.push(job);
          if (jobsToProcess.length >= availableSlots) {
            break;
          }
        }
      }

      // 处理任务
      for (const job of jobsToProcess) {
        // 将任务标记为正在运行
        this._runningJobs.add(job.id);

        // 标记任务为活动状态
        job._activate();

        // 发送活动事件
        this.emitEvent(QueueEvent.ACTIVE, job);

        // 处理任务 (异步)
        this._processJob(job).catch((error) => {
          console.error(
            `内存队列任务处理错误 (${this._name}:${job.id}):`,
            error
          );
        });
      }
    } finally {
      this._processing = false;
    }
  }

  /**
   * 处理单个任务
   * @param job 任务实例
   */
  private async _processJob(job: MemoryJobInstance): Promise<void> {
    try {
      let processor: Function | undefined;

      // 查找对应的处理器
      if (this._processorMap[job.name]) {
        processor = this._processorMap[job.name];
      } else if (this._defaultProcessor) {
        processor = this._defaultProcessor;
      }

      // 如果没有处理器，标记任务为失败
      if (!processor) {
        await job.moveToFailed(new Error(`未找到任务处理器: ${job.name}`));
        this.emitEvent(
          QueueEvent.FAILED,
          job,
          new Error(`未找到任务处理器: ${job.name}`)
        );
        this._runningJobs.delete(job.id);
        return;
      }

      // 调用处理器
      try {
        const result = await processor(job);
        job._complete(result);
        this.emitEvent(QueueEvent.COMPLETED, job, result);
      } catch (error) {
        // 处理任务失败
        await job.moveToFailed(
          error instanceof Error ? error : new Error(String(error))
        );
        this.emitEvent(QueueEvent.FAILED, job, error);

        // 检查是否需要重试
        const options = job._getOptions();
        if (options.attempts && job.attemptsMade < options.attempts) {
          // 如果配置了重试延迟
          if (options.backoff) {
            let delay = options.backoff;

            // 如果是函数，计算延迟时间
            if (typeof options.backoff === 'function') {
              delay = options.backoff(job.attemptsMade);
            } else if (
              typeof options.backoff === 'object' &&
              options.backoff.type === 'exponential'
            ) {
              // 指数退避
              const base = options.backoff.delay || 1000;
              delay = base * Math.pow(2, job.attemptsMade - 1);

              // 应用抖动
              if (options.backoff.jitter) {
                const jitter = options.backoff.jitter * delay;
                delay = delay - jitter / 2 + Math.random() * jitter;
              }
            }

            // 设置延迟重试
            setTimeout(() => {
              job.retry().catch(console.error);
            }, delay);
          } else {
            // 立即重试
            job.retry().catch(console.error);
          }
        }
      }
    } finally {
      // 清理运行状态
      this._runningJobs.delete(job.id);
    }
  }

  /**
   * 添加任务到队列
   * @param name 任务名称
   * @param data 任务数据
   * @param options 任务选项
   */
  async add(name: string, data: any, options: any = {}): Promise<JobInstance> {
    const job = new MemoryJobInstance(name, data, options);
    this._jobs.set(job.id, job);

    // 发送添加事件
    this.emitEvent(QueueEvent.ADDED, job);

    // 如果设置了延迟
    if (options.delay && options.delay > 0) {
      this._timers.set(
        job.id,
        setTimeout(() => {
          job.promote().catch(console.error);
          this._timers.delete(job.id);
        }, options.delay)
      );
    }

    return job;
  }

  /**
   * 批量添加任务
   * @param jobs 任务数组
   */
  async addBulk(
    jobs: Array<{ name: string; data: any; opts?: any }>
  ): Promise<JobInstance[]> {
    return Promise.all(
      jobs.map((job) => this.add(job.name, job.data, job.opts || {}))
    );
  }

  /**
   * 注册处理器
   * @param processor 处理器函数或处理器映射
   */
  process(processor: Function | Record<string, Function>): void {
    if (typeof processor === 'function') {
      // 单个处理器作为默认处理器
      this._defaultProcessor = processor;
    } else {
      // 处理器映射
      for (const [jobName, jobProcessor] of Object.entries(processor)) {
        this._processorMap[jobName] = jobProcessor;
      }
    }
  }

  /**
   * 获取任务实例
   * @param jobId 任务ID
   */
  async getJob(jobId: string): Promise<JobInstance | null> {
    return this._jobs.get(jobId) || null;
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
    const statusArr = Array.isArray(status) ? status : [status];

    // 筛选指定状态的任务
    let jobs = Array.from(this._jobs.values()).filter((job) =>
      statusArr.includes(job.status)
    );

    // 排序
    jobs.sort((a, b) => {
      const dateA = (a as any)._createdAt;
      const dateB = (b as any)._createdAt;
      return asc ? dateA - dateB : dateB - dateA;
    });

    // 截取
    if (end === -1) {
      jobs = jobs.slice(start);
    } else {
      jobs = jobs.slice(start, end + 1);
    }

    return jobs;
  }

  /**
   * 获取任务计数
   */
  async getJobCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {
      [JobStatus.WAITING]: 0,
      [JobStatus.ACTIVE]: 0,
      [JobStatus.COMPLETED]: 0,
      [JobStatus.FAILED]: 0,
      [JobStatus.DELAYED]: 0,
      [JobStatus.PAUSED]: 0
    };

    for (const job of this._jobs.values()) {
      if (counts[job.status] !== undefined) {
        counts[job.status]++;
      }
    }

    return counts;
  }

  /**
   * 移除任务
   * @param jobId 任务ID
   */
  async removeJob(jobId: string): Promise<boolean> {
    const job = this._jobs.get(jobId);
    if (!job) return false;

    // 清除定时器
    if (this._timers.has(jobId)) {
      clearTimeout(this._timers.get(jobId));
      this._timers.delete(jobId);
    }

    // 移除任务
    this._jobs.delete(jobId);
    this._runningJobs.delete(jobId);

    // 发送移除事件
    this.emitEvent(QueueEvent.REMOVED, job);

    return true;
  }

  /**
   * 批量移除任务
   * @param pattern 任务ID模式
   */
  async removeJobs(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const [jobId, job] of this._jobs.entries()) {
      if (regex.test(jobId)) {
        // 清除定时器
        if (this._timers.has(jobId)) {
          clearTimeout(this._timers.get(jobId));
          this._timers.delete(jobId);
        }

        // 移除任务
        this._jobs.delete(jobId);
        this._runningJobs.delete(jobId);

        // 发送移除事件
        this.emitEvent(QueueEvent.REMOVED, job);

        count++;
      }
    }

    return count;
  }

  /**
   * 暂停队列处理
   */
  async pause(): Promise<void> {
    this._paused = true;
    this.emitEvent(QueueEvent.PAUSED);
  }

  /**
   * 恢复队列处理
   */
  async resume(): Promise<void> {
    this._paused = false;
    this.emitEvent(QueueEvent.RESUMED);
  }

  /**
   * 检查队列是否暂停
   */
  async isPaused(): Promise<boolean> {
    return this._paused;
  }

  /**
   * 清空队列
   */
  async empty(): Promise<void> {
    // 清除所有定时器
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }

    // 清空集合
    this._timers.clear();
    this._jobs.clear();
    this._runningJobs.clear();

    // 发送清理事件
    this.emitEvent(QueueEvent.CLEANED);
  }

  /**
   * 关闭队列连接
   */
  async close(): Promise<void> {
    // 清除处理器定时器
    if (this._processInterval) {
      clearInterval(this._processInterval);
      this._processInterval = undefined;
    }

    // 清除所有任务定时器
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
    this._timers.clear();

    // 清空运行任务列表
    this._runningJobs.clear();

    // 不清空任务列表，保留数据
  }

  /**
   * 获取队列状态
   */
  async getStatus(): Promise<any> {
    const jobCounts = await this.getJobCounts();

    return {
      isPaused: this._paused,
      jobCounts,
      runningJobs: this._runningJobs.size,
      concurrency: this._concurrency
    };
  }

  /**
   * 获取队列指标
   */
  async getMetrics(): Promise<any> {
    const { waiting, active, completed, failed, delayed } =
      await this.getJobCounts();

    return {
      throughput: 0, // 需要自定义实现
      latency: 0, // 需要自定义实现
      waiting,
      active,
      completed,
      failed,
      delayed,
      runningJobs: this._runningJobs.size
    };
  }
}

/**
 * 内存队列驱动
 * 基于内存实现的队列驱动
 */
export class MemoryDriver extends AbstractQueueDriver {
  /**
   * 构造函数
   * @param options 驱动选项
   */
  constructor(options: any = {}) {
    super(options);
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
    const queueOptions = object.deepMerge(
      {},
      this.options.defaultQueueOptions || {},
      options
    );

    // 创建内存队列实例
    const queue = new MemoryQueueInstance(queueName, queueOptions);

    // 添加到队列映射
    this.queues.set(name, queue);

    return queue;
  }

  /**
   * 获取驱动名称
   */
  getName(): string {
    return 'memory';
  }

  /**
   * 检查驱动健康状态
   */
  async checkHealth(): Promise<boolean> {
    // 内存队列总是可用
    return true;
  }
}

export default MemoryDriver;
