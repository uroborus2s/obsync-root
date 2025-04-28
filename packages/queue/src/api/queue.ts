/**
 * @stratix/queue 队列实现
 * 提供队列的核心功能实现
 */

import * as utils from '@stratix/utils';
import { EventEmitter } from 'events';
import type {
  JobOptions,
  JobStatus,
  QueueDriver,
  QueueMetrics,
  QueueStatus
} from '../types/index.js';
import type { QueueOptions, RepeatOptions } from '../types/plugin.js';
import { Job } from './job.js';

// 定义队列事件类型，与api.ts保持同步
type QueueEvent =
  | 'added'
  | 'waiting'
  | 'active'
  | 'stalled'
  | 'progress'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'resumed'
  | 'cleaned'
  | 'drained'
  | 'removed'
  | 'error'
  | 'emptied'; // 自定义事件

// 定义队列实例接口，避免导入循环依赖问题
interface QueueInstance {
  add(name: string, data: any, options: any): Promise<any>;
  addBulk(jobs: any[]): Promise<any[]>;
  process(processor: Function | Record<string, Function>): void;
  getJob(jobId: string): Promise<any>;
  getJobs(
    status: any,
    start?: number,
    end?: number,
    asc?: boolean
  ): Promise<any[]>;
  getJobCounts(): Promise<any>;
  removeJob(jobId: string): Promise<boolean>;
  removeJobs(pattern: string): Promise<number>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  isPaused(): Promise<boolean>;
  empty(): Promise<void>;
  close(): Promise<void>;
  getStatus(): Promise<QueueStatus>;
  getMetrics(): Promise<QueueMetrics>;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}

/**
 * 队列类
 * 提供队列的所有核心操作
 */
export class Queue extends EventEmitter {
  private queueInstance: QueueInstance;
  private _driver: QueueDriver;
  private _options: QueueOptions;
  private _processors: Map<string, Function>;
  private _processing: boolean;

  /**
   * 队列名称
   */
  readonly name: string;

  /**
   * 创建队列实例
   * @param name 队列名称
   * @param driver 队列驱动
   * @param options 队列选项
   */
  constructor(name: string, driver: QueueDriver, options: QueueOptions = {}) {
    super();

    this.name = name;
    this._driver = driver;
    this._options = utils.object.deepMerge({}, options) as QueueOptions;
    this._processors = new Map();
    this._processing = false;

    // 创建队列实例
    this.queueInstance = driver.createQueue(name, options);

    // 转发队列事件
    this._forwardEvents();
  }

  /**
   * 添加任务到队列
   * @param name 任务名称
   * @param data 任务数据
   * @param opts 任务选项
   * @returns 任务实例
   */
  async add<T = any, R = any>(
    name: string,
    data?: T,
    opts?: JobOptions
  ): Promise<Job<T, R>> {
    const jobOptions = this._mergeJobOptions(opts);
    const jobInstance = await this.queueInstance.add(
      name,
      data || {},
      jobOptions
    );
    return new Job<T, R>(jobInstance, this);
  }

  /**
   * 批量添加任务
   * @param jobs 任务配置数组
   * @returns 任务实例数组
   */
  async addBulk<T = any, R = any>(
    jobs: Array<{ name: string; data?: T; opts?: JobOptions }>
  ): Promise<Job<T, R>[]> {
    const bulkJobs = jobs.map((job) => ({
      name: job.name,
      data: job.data || {},
      opts: this._mergeJobOptions(job.opts)
    }));

    const jobInstances = await this.queueInstance.addBulk(bulkJobs);
    return jobInstances.map((jobInstance) => new Job<T, R>(jobInstance, this));
  }

  /**
   * 添加延迟任务
   * @param name 任务名称
   * @param data 任务数据
   * @param delay 延迟时间（毫秒）
   * @param opts 任务选项
   * @returns 任务实例
   */
  async addDelayed<T = any, R = any>(
    name: string,
    data: T,
    delay: number,
    opts?: JobOptions
  ): Promise<Job<T, R>> {
    const jobOptions = this._mergeJobOptions(opts, { delay });
    return this.add<T, R>(name, data, jobOptions);
  }

  /**
   * 添加重复执行的任务
   * @param name 任务名称
   * @param data 任务数据
   * @param repeatOpts 重复选项
   * @param jobOpts 任务选项
   * @returns 任务实例
   */
  async addRepeatableJob<T = any, R = any>(
    name: string,
    data: T,
    repeatOpts: RepeatOptions,
    jobOpts?: JobOptions
  ): Promise<Job<T, R>> {
    const options = this._mergeJobOptions(jobOpts, { repeat: repeatOpts });
    return this.add<T, R>(name, data, options);
  }

  /**
   * 获取任务实例
   * @param jobId 任务ID
   * @returns 任务实例，如果不存在则返回null
   */
  async getJob<T = any, R = any>(jobId: string): Promise<Job<T, R> | null> {
    const jobInstance = await this.queueInstance.getJob(jobId);
    if (!jobInstance) {
      return null;
    }
    return new Job<T, R>(jobInstance, this);
  }

  /**
   * 获取指定状态的任务列表
   * @param status 任务状态或状态数组
   * @param start 起始索引
   * @param end 结束索引
   * @param asc 是否升序排序
   * @returns 任务实例数组
   */
  async getJobs<T = any, R = any>(
    status: JobStatus | JobStatus[],
    start?: number,
    end?: number,
    asc?: boolean
  ): Promise<Job<T, R>[]> {
    const jobInstances = await this.queueInstance.getJobs(
      status,
      start,
      end,
      asc
    );
    return jobInstances.map((jobInstance) => new Job<T, R>(jobInstance, this));
  }

  /**
   * 获取任务计数
   * @returns 各状态任务数量
   */
  async getJobCounts(): Promise<Record<JobStatus, number>> {
    return await this.queueInstance.getJobCounts();
  }

  /**
   * 移除任务
   * @param jobId 任务ID
   * @returns 是否成功移除
   */
  async removeJob(jobId: string): Promise<boolean> {
    return await this.queueInstance.removeJob(jobId);
  }

  /**
   * 批量移除任务
   * @param pattern 任务ID匹配模式
   * @returns 移除的任务数量
   */
  async removeJobs(pattern: string): Promise<number> {
    return await this.queueInstance.removeJobs(pattern);
  }

  /**
   * 注册任务处理器
   * @param processor 处理器函数或映射
   */
  process<T = any, R = any>(
    processor:
      | ((job: Job<T, R>) => Promise<R> | R)
      | Record<string, (job: Job<T, R>) => Promise<R> | R>
  ): void {
    if (typeof processor === 'function') {
      // 单个处理器函数，应用于所有任务类型
      this._processors.set('*', this._wrapProcessor(processor));
    } else {
      // 多个处理器函数，映射到特定任务类型
      for (const [jobName, fn] of Object.entries(processor)) {
        this._processors.set(jobName, this._wrapProcessor(fn));
      }
    }

    // 如果尚未启动处理，则启动
    this._startProcessing();
  }

  /**
   * 暂停队列
   */
  async pause(): Promise<void> {
    await this.queueInstance.pause();
    this._processing = false;
    this.emit('paused');
  }

  /**
   * 恢复队列
   */
  async resume(): Promise<void> {
    await this.queueInstance.resume();
    this._processing = true;
    this.emit('resumed');
  }

  /**
   * 清空队列
   */
  async empty(): Promise<void> {
    await this.queueInstance.empty();
    this.emit('emptied');
  }

  /**
   * 等待队列空闲
   * 等待所有活动任务完成
   */
  async waitUntilIdle(): Promise<void> {
    // 如果底层驱动支持waitUntilIdle方法则直接调用
    if (typeof (this.queueInstance as any).waitUntilIdle === 'function') {
      return await (this.queueInstance as any).waitUntilIdle();
    }

    // 否则实现一个简单的轮询机制
    return new Promise((resolve) => {
      const checkIdle = async (): Promise<void> => {
        const counts = await this.getJobCounts();

        // 当没有活动任务时视为空闲
        if (counts.active === 0) {
          resolve();
          return;
        }

        // 否则继续轮询
        setTimeout(checkIdle, 100);
      };

      checkIdle();
    });
  }

  /**
   * 关闭队列
   */
  async close(): Promise<void> {
    await this.queueInstance.close();
    this.removeAllListeners();
  }

  /**
   * 获取队列状态
   * @returns 队列状态
   */
  async getStatus(): Promise<QueueStatus> {
    return await this.queueInstance.getStatus();
  }

  /**
   * 获取队列指标
   * @returns 队列指标
   */
  async getMetrics(): Promise<QueueMetrics> {
    return await this.queueInstance.getMetrics();
  }

  /**
   * 是否暂停
   * @returns 是否暂停
   */
  async isPaused(): Promise<boolean> {
    return await this.queueInstance.isPaused();
  }

  /**
   * 获取队列选项
   * @returns 队列选项
   */
  getOptions(): QueueOptions {
    return utils.object.deepMerge({}, this._options) as QueueOptions;
  }

  // 私有方法

  /**
   * 合并任务选项
   * @param opts 用户选项
   * @param extraOpts 附加选项
   * @returns 合并后的选项
   */
  private _mergeJobOptions(
    opts?: JobOptions,
    extraOpts?: JobOptions
  ): JobOptions {
    return utils.object.deepMerge(
      {},
      this._options.defaultJobOptions || {},
      opts || {},
      extraOpts || {}
    ) as JobOptions;
  }

  /**
   * 包装处理器函数
   * @param processor 原始处理器函数
   * @returns 包装后的处理器函数
   */
  private _wrapProcessor<T = any, R = any>(
    processor: (job: Job<T, R>) => Promise<R> | R
  ): (jobInstance: any) => Promise<R> {
    return async (jobInstance: any) => {
      const job = new Job<T, R>(jobInstance, this);
      try {
        return await processor(job);
      } catch (error) {
        this.emit('failed', job, error);
        throw error;
      }
    };
  }

  /**
   * 启动任务处理
   */
  private _startProcessing(): void {
    if (this._processing) {
      return;
    }

    this._processing = true;

    if (this._processors.size === 1 && this._processors.has('*')) {
      // 单个处理器处理所有任务
      this.queueInstance.process(this._processors.get('*')!);
    } else {
      // 多个处理器处理特定任务
      const processorMap: Record<string, Function> = {};
      for (const [jobName, processor] of this._processors.entries()) {
        if (jobName !== '*') {
          processorMap[jobName] = processor;
        }
      }

      // 如果有通用处理器，也添加
      if (this._processors.has('*')) {
        processorMap['*'] = this._processors.get('*')!;
      }

      this.queueInstance.process(processorMap);
    }
  }

  /**
   * 转发队列事件
   */
  private _forwardEvents(): void {
    const events: QueueEvent[] = [
      'added',
      'waiting',
      'active',
      'stalled',
      'progress',
      'completed',
      'failed',
      'delayed',
      'paused',
      'resumed',
      'cleaned',
      'drained',
      'removed',
      'error'
    ];

    for (const event of events) {
      this.queueInstance.on(event, (...args: any[]) => {
        this.emit(event, ...args);
      });
    }
  }
}
