/**
 * @stratix/queue 作业实现
 * 提供队列作业/任务的核心功能实现
 */

import type { JobInstance, JobOptions, JobState } from '../types/index.js';
import { Queue } from './queue.js';

// 作业状态枚举
enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused'
}

// 日志条目接口
interface LogEntry {
  id: string;
  message: string;
  timestamp: number | string | Date;
}

// 作业进度类型
type JobProgress = number | { [key: string]: any };

/**
 * 作业类
 * 表示队列中的一个任务/作业
 */
export class Job<T = any, R = any> {
  private _jobInstance: JobInstance;
  private _queue: Queue;

  /**
   * 创建作业实例
   * @param jobInstance 底层作业实例
   * @param queue 所属队列
   */
  constructor(jobInstance: JobInstance, queue: Queue) {
    this._jobInstance = jobInstance;
    this._queue = queue;
  }

  /**
   * 作业ID
   */
  get id(): string {
    return this._jobInstance.id;
  }

  /**
   * 作业名称
   */
  get name(): string {
    return this._jobInstance.name;
  }

  /**
   * 作业数据
   */
  get data(): T {
    return this._jobInstance.data as T;
  }

  /**
   * 作业返回值
   */
  get returnvalue(): R | null {
    return this._jobInstance.returnvalue as R | null;
  }

  /**
   * 作业状态
   */
  get status(): JobStatus {
    // 在这里做类型转换，确保返回的是JobStatus类型
    const status = this._jobInstance.status as string;
    return this.mapStatus(status);
  }

  /**
   * 映射状态字符串到JobStatus枚举
   * @param status 状态字符串
   * @returns JobStatus枚举值
   */
  private mapStatus(status: string): JobStatus {
    switch (status) {
      case 'waiting':
        return JobStatus.WAITING;
      case 'active':
        return JobStatus.ACTIVE;
      case 'completed':
        return JobStatus.COMPLETED;
      case 'failed':
        return JobStatus.FAILED;
      case 'delayed':
        return JobStatus.DELAYED;
      case 'paused':
        return JobStatus.PAUSED;
      default:
        return JobStatus.WAITING;
    }
  }

  /**
   * 已尝试次数
   */
  get attemptsMade(): number {
    return this._jobInstance.attemptsMade;
  }

  /**
   * 最大尝试次数
   */
  get attempts(): number {
    // 使用可选链和类型断言处理可能不存在的属性
    return ((this._jobInstance as any).opts?.attempts || 1) as number;
  }

  /**
   * 作业选项
   */
  get opts(): JobOptions {
    return (this._jobInstance as any).opts || {};
  }

  /**
   * 创建时间
   */
  get timestamp(): number {
    return (this._jobInstance as any).timestamp || Date.now();
  }

  /**
   * 处理时间
   */
  get processedOn(): number | undefined {
    return (this._jobInstance as any).processedOn;
  }

  /**
   * 完成时间
   */
  get finishedOn(): number | undefined {
    return (this._jobInstance as any).finishedOn;
  }

  /**
   * 所属队列
   */
  get queue(): Queue {
    return this._queue;
  }

  /**
   * 更新作业进度
   * @param progress 进度值或对象
   */
  async updateProgress(progress: number | object): Promise<void> {
    await this._jobInstance.updateProgress(progress);
  }

  /**
   * 获取作业进度
   * @returns 进度值或对象
   */
  async getProgress(): Promise<JobProgress> {
    return await this._jobInstance.getProgress();
  }

  /**
   * 重试作业
   */
  async retry(): Promise<void> {
    await this._jobInstance.retry();
  }

  /**
   * 移除作业
   */
  async remove(): Promise<void> {
    await this._jobInstance.remove();
  }

  /**
   * 将作业移至失败状态
   * @param error 错误信息
   */
  async moveToFailed(error: Error): Promise<void> {
    await this._jobInstance.moveToFailed(error);
  }

  /**
   * 提升作业优先级（使延迟作业立即执行）
   */
  async promote(): Promise<void> {
    await this._jobInstance.promote();
  }

  /**
   * 放弃作业处理
   */
  async discard(): Promise<void> {
    await this._jobInstance.discard();
  }

  /**
   * 为作业添加日志
   * @param message 日志消息
   */
  async log(message: string): Promise<void> {
    await this._jobInstance.log(message);
  }

  /**
   * 获取作业日志
   * @returns 日志条目数组
   */
  async getLogs(): Promise<LogEntry[]> {
    // 确保返回的日志包含id字段
    const logs = await this._jobInstance.getLogs();
    return logs.map((log) => ({
      // 生成唯一ID
      id: Math.random().toString(36).substring(2, 15) + '_log_' + Date.now(),
      message: log.message,
      timestamp: log.timestamp
    }));
  }

  /**
   * 添加依赖作业
   * @param jobId 依赖作业ID
   */
  async addDependency(jobId: string): Promise<void> {
    await this._jobInstance.addDependency(jobId);
  }

  /**
   * 移除依赖作业
   * @param jobId 依赖作业ID
   */
  async removeDependency(jobId: string): Promise<void> {
    await this._jobInstance.removeDependency(jobId);
  }

  /**
   * 获取作业状态
   * @returns 作业状态详情
   */
  async getState(): Promise<JobState> {
    const state = await this._jobInstance.getState();
    const progress = await this.getProgress();

    return {
      status: this.mapStatus(state.status as string),
      progress: progress,
      data: state.data,
      attemptsMade: state.attemptsMade,
      returnvalue: state.returnvalue,
      failedReason: state.failedReason,
      finishedOn: state.finishedOn,
      processedOn: state.processedOn
    };
  }

  /**
   * 将作业标记为完成
   * @param result 结果数据
   */
  async complete(result?: R): Promise<void> {
    // 针对不同驱动实现可能有差异，使用try-catch处理可能的错误
    try {
      if (typeof (this._jobInstance as any).complete === 'function') {
        await (this._jobInstance as any).complete(result);
      } else {
        // 降级处理，直接调用底层moveToCompleted方法
        await (this._jobInstance as any).moveToCompleted(result);
      }
    } catch (error) {
      console.error('完成任务失败:', error);
      throw error;
    }
  }

  /**
   * 将作业标记为失败
   * @param error 错误信息
   */
  async fail(error: Error): Promise<void> {
    try {
      if (typeof (this._jobInstance as any).fail === 'function') {
        await (this._jobInstance as any).fail(error);
      } else {
        // 降级处理，直接调用底层方法
        await this.moveToFailed(error);
      }
    } catch (err) {
      console.error('标记任务失败时出错:', err);
      throw err;
    }
  }

  /**
   * 延迟作业执行
   * @param delayMs 延迟时间（毫秒）
   */
  async delay(delayMs: number): Promise<void> {
    try {
      if (typeof (this._jobInstance as any).delay === 'function') {
        await (this._jobInstance as any).delay(delayMs);
      } else {
        // 降级处理
        await this.retry();
      }
    } catch (error) {
      console.error('延迟任务执行失败:', error);
      throw error;
    }
  }

  /**
   * 原始作业实例
   * 用于访问底层实现的特定功能
   */
  get raw(): JobInstance {
    return this._jobInstance;
  }

  /**
   * 获取作业的JSON表示
   */
  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      data: this.data,
      status: this.status,
      attemptsMade: this.attemptsMade,
      timestamp: this.timestamp,
      opts: this.opts,
      progress: this.getProgress(),
      returnvalue: this.returnvalue,
      processedOn: this.processedOn,
      finishedOn: this.finishedOn
    };
  }
}
