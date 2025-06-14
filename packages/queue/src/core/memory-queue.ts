/**
 * @stratix/queue 事件驱动内存队列
 */

import type { Logger } from '@stratix/core';
import { EventEmitter } from 'node:events';
import type {
  LengthChangeEvent,
  QueueJob,
  WaterMarkChangeEvent,
  WaterMarkConfig,
  WaterMarkLevel,
  WaterMarkLevelEvent
} from '../types/index.js';

/**
 * 事件驱动内存队列类
 */
export class EventDrivenMemoryQueue extends EventEmitter {
  private queue: QueueJob[] = [];
  private _length = 0;
  private currentLevel: WaterMarkLevel = 'empty';
  private debounceTimeout: NodeJS.Timeout | null = null;
  private waterMarkChangeTimeout: NodeJS.Timeout | null = null;
  private waterMarks: WaterMarkConfig = {
    low: 1000, // 低水位：1000个任务
    normal: 2500, // 正常水位：2500个任务
    high: 4000, // 高水位：4000个任务
    critical: 5000 // 临界水位：5000个任务（最大容量）
  };
  private debounceDelay: number = 50;

  constructor(private log: Logger) {
    super();
  }

  get normalWaterMark() {
    return this.waterMarks.normal;
  }

  get lowlWaterMark() {
    return this.waterMarks.low;
  }

  get remainingWaterMark(): number {
    return this.waterMarks.critical - this._length;
  }

  get waterMarkValues(): WaterMarkConfig {
    return this.waterMarks;
  }

  /**
   * 添加单个任务到队列
   */
  push(job: QueueJob): void {
    this.queue.push(job);
    this._length++;
    this.log.debug(
      { jobId: job.id, queueLength: this._length },
      '任务添加到内存队列'
    );
    this.checkWaterMarksAndEmit();
  }

  /**
   * 批量添加任务到队列
   */
  pushBatch(jobs: QueueJob[]): void {
    if (jobs.length === 0) return;

    this.queue.push(...jobs);
    this._length += jobs.length;
    this.log.debug(
      {
        jobCount: jobs.length,
        queueLength: this._length,
        jobIds: jobs.map((j) => j.id)
      },
      '批量任务添加到内存队列'
    );
    // this.checkWaterMarksAndEmit();
  }

  /**
   * 从队列头部取出任务
   */
  shift(): QueueJob | undefined {
    const job = this.queue.shift();
    if (job) {
      this._length--;
      this.log.debug(
        { jobId: job.id, queueLength: this._length },
        '任务从内存队列取出'
      );
      this.checkWaterMarksAndEmit();
    }
    return job;
  }

  /**
   * 批量从队列头部取出任务
   */
  shiftBatch(count: number): QueueJob[] {
    if (count <= 0 || this._length === 0) return [];

    const actualCount = Math.min(count, this._length);
    const jobs = this.queue.splice(0, actualCount);
    this._length -= jobs.length;

    this.log.debug(
      {
        jobCount: jobs.length,
        queueLength: this._length,
        jobIds: jobs.map((j) => j.id)
      },
      '批量任务从内存队列取出'
    );
    this.checkWaterMarksAndEmit();
    return jobs;
  }

  /**
   * 查看队列头部任务（不移除）
   */
  peek(): QueueJob | undefined {
    return this.queue[0];
  }

  /**
   * 查看队列头部多个任务（不移除）
   */
  peekBatch(count: number): QueueJob[] {
    if (count <= 0) return [];
    return this.queue.slice(0, count);
  }

  /**
   * 获取队列长度
   */
  get length(): number {
    return this._length;
  }

  /**
   * 获取当前水位级别
   */
  get currentWaterMarkLevel(): WaterMarkLevel {
    return this.currentLevel;
  }

  /**
   * 检查队列是否为空
   */
  get isEmpty(): boolean {
    return this._length === 0;
  }

  /**
   * 清空队列
   */
  clear(): QueueJob[] {
    const jobs = [...this.queue];
    this.queue = [];
    this._length = 0;
    this.log.info({ clearedJobCount: jobs.length }, '内存队列已清空');
    this.checkWaterMarksAndEmit();
    return jobs;
  }

  /**
   * 获取队列中的所有任务（只读）
   */
  getJobs(): readonly QueueJob[] {
    return Object.freeze([...this.queue]);
  }

  /**
   * 获取队列中最后一个任务的游标信息
   * 用于确保数据库加载的连续性
   */
  getLastJobCursor(): {
    priority: number;
    created_at: Date;
    id: string;
  } | null {
    if (this.queue.length === 0) {
      return null;
    }

    const lastJob = this.queue[this.queue.length - 1];
    return {
      priority: lastJob.priority,
      created_at: lastJob.created_at,
      id: lastJob.id
    };
  }

  /**
   * 根据条件查找任务
   */
  findJobs(predicate: (job: QueueJob) => boolean): QueueJob[] {
    return this.queue.filter(predicate);
  }

  /**
   * 移除指定的任务
   */
  removeJob(jobId: string): QueueJob | null {
    const index = this.queue.findIndex((job) => job.id === jobId);
    if (index === -1) return null;

    const [removedJob] = this.queue.splice(index, 1);
    this._length--;
    this.log.debug({ jobId, queueLength: this._length }, '任务从内存队列移除');
    this.checkWaterMarksAndEmit();
    return removedJob;
  }

  /**
   * 批量移除任务
   */
  removeJobs(jobIds: string[]): QueueJob[] {
    const removedJobs: QueueJob[] = [];

    for (const jobId of jobIds) {
      const index = this.queue.findIndex((job) => job.id === jobId);
      if (index !== -1) {
        const [removedJob] = this.queue.splice(index, 1);
        removedJobs.push(removedJob);
        this._length--;
      }
    }

    if (removedJobs.length > 0) {
      this.log.debug(
        {
          removedCount: removedJobs.length,
          queueLength: this._length,
          jobIds: removedJobs.map((j) => j.id)
        },
        '批量任务从内存队列移除'
      );
      this.checkWaterMarksAndEmit();
    }

    return removedJobs;
  }

  /**
   * 检查水位并发出事件
   */
  private checkWaterMarksAndEmit(): void {
    const newLevel = this.calculateWaterMarkLevel();

    if (newLevel !== this.currentLevel) {
      this.emitWaterMarkChange(this.currentLevel, newLevel);
      this.currentLevel = newLevel;
    }

    this.debouncedLengthChange();
  }

  /**
   * 计算当前水位级别
   */
  private calculateWaterMarkLevel(): WaterMarkLevel {
    if (this._length === 0) return 'empty';
    if (this._length >= this.waterMarks.critical) return 'critical';
    if (this._length >= this.waterMarks.high) return 'high';
    if (this._length >= this.waterMarks.normal) return 'normal';
    if (this._length <= this.waterMarks.low) return 'low';
    return 'normal';
  }

  /**
   * 发出水位变化事件
   */
  private emitWaterMarkChange(from: WaterMarkLevel, to: WaterMarkLevel): void {
    // 清除之前的防抖定时器
    if (this.waterMarkChangeTimeout) {
      clearTimeout(this.waterMarkChangeTimeout);
    }

    // 防抖发送水位变化事件
    this.waterMarkChangeTimeout = setTimeout(() => {
      const changeEvent: WaterMarkChangeEvent = {
        timestamp: new Date(),
        eventId: `watermark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        from,
        to,
        length: this._length
      };

      const levelEvent: WaterMarkLevelEvent = {
        timestamp: new Date(),
        eventId: `level-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        length: this._length,
        level: to
      };

      this.log.info(
        { from, to, length: this._length, level: to },
        `📊 队列水位变化: ${from} → ${to} (长度: ${this._length})`
      );

      // 发出水位变化事件
      this.emit('watermark:changed', changeEvent);

      // 发出特定水位级别事件
      this.emit(`watermark:${to}`, levelEvent);
    }, 10); // 10ms 防抖，避免频繁的水位变化事件
  }

  /**
   * 防抖的长度变化事件
   */
  private debouncedLengthChange(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      const lengthEvent: LengthChangeEvent = {
        timestamp: new Date(),
        eventId: `length-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        length: this._length,
        level: this.currentLevel
      };

      this.emit('length:changed', lengthEvent);
    }, this.debounceDelay);
  }

  /**
   * 更新水位配置
   */
  updateWaterMarks(newWaterMarks: WaterMarkConfig): void {
    this.waterMarks = { ...newWaterMarks };
    this.log.info({ waterMarks: this.waterMarks }, '水位配置已更新');

    // 重新检查水位
    this.checkWaterMarksAndEmit();
  }

  /**
   * 获取队列统计信息
   */
  getStatistics(): {
    length: number;
    waterMarkLevel: WaterMarkLevel;
    waterMarks: WaterMarkConfig;
    isEmpty: boolean;
  } {
    return {
      length: this._length,
      waterMarkLevel: this.currentLevel,
      waterMarks: { ...this.waterMarks },
      isEmpty: this.isEmpty
    };
  }

  /**
   * 销毁队列，清理资源
   */
  destroy(): void {
    // 清理定时器
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    if (this.waterMarkChangeTimeout) {
      clearTimeout(this.waterMarkChangeTimeout);
      this.waterMarkChangeTimeout = null;
    }

    // 清空队列
    this.queue = [];
    this._length = 0;
    this.currentLevel = 'empty';

    // 移除所有事件监听器
    this.removeAllListeners();

    this.log.info('内存队列已销毁');
  }
}
