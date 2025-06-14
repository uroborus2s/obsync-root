/**
 * @stratix/queue 队列管理器
 */

import type { Logger } from '@stratix/core';
import { EventEmitter } from 'node:events';
import { SmartBackpressureManager } from '../core/backpressure-manager.js';
import { EventDrivenMemoryQueue } from '../core/memory-queue.js';
import { JobNotificationSystem } from '../notifications/job-notification-system.js';
import type { QueueJobRepository } from '../repositories/index.js';
import { DatabaseJobStream } from '../streams/database-job-stream.js';
import type {
  JobsAddedEvent,
  LengthChangeEvent,
  QueueJob,
  StreamEndedEvent,
  StreamPausedEvent,
  StreamStartedEvent,
  WaterMarkChangeEvent,
  WaterMarkLevel
} from '../types/index.js';

/**
 * 队列管理器状态
 */
interface QueueManagerState {
  isInitialized: boolean;
  isRunning: boolean;
  isPaused: boolean;
  startedAt: Date | null;
  pausedAt: Date | null;
  lastActivityAt: Date | null;
}

/**
 * 队列管理器
 * 整合内存队列、背压管理器、数据库流和通知系统
 */
export class QueueManager extends EventEmitter {
  private state: QueueManagerState = {
    isInitialized: false,
    isRunning: false,
    isPaused: false,
    startedAt: null,
    pausedAt: null,
    lastActivityAt: null
  };

  constructor(
    private jobRepository: QueueJobRepository,
    private log: Logger,
    private backpressureManager: SmartBackpressureManager,
    private databaseJobStream: DatabaseJobStream,
    private jobNotificationSystem: JobNotificationSystem,
    private drivenMemoryQueue: EventDrivenMemoryQueue
  ) {
    super();
    // 初始化组件
    // 设置事件监听
    this.setupEventListeners();

    this.state.isInitialized = true;
    this.log.info('队列管理器组件初始化完成');
  }

  /**
   * 触发批量数据加载
   * 供JobExecutionService直接调用
   */
  public async triggerBatchLoad(trigger: string): Promise<void> {
    try {
      // 检查背压状态
      const isBackpressureActive =
        this.backpressureManager.isBackpressureActive;
      if (isBackpressureActive) {
        this.log.debug('🚫 背压激活中，跳过批量加载');
        return;
      }

      // 获取当前队列统计
      const stats = this.drivenMemoryQueue.getStatistics();
      const shouldLoad = this.shouldLoadMoreTasks(stats, stats.length);

      if (shouldLoad) {
        this.log.info(
          {
            trigger,
            currentLevel: stats.waterMarkLevel,
            queueLength: stats.length,
            lowThreshold: stats.waterMarks.low
          },
          '🔄 触发批量数据加载'
        );

        // 触发数据库流加载
        await this.databaseJobStream.triggerBatchLoad('job_processed' as any);
      } else {
        this.log.debug(
          {
            trigger,
            currentLevel: stats.waterMarkLevel,
            queueLength: stats.length
          },
          '✅ 队列水位正常，无需加载'
        );
      }
    } catch (error) {
      this.log.error({ error, trigger }, '❌ 触发批量加载失败');
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 内存队列事件
    this.drivenMemoryQueue.on(
      'watermark:changed',
      this.handleWaterMarkChange.bind(this)
    );
    this.drivenMemoryQueue.on(
      'length:changed',
      this.handleLengthChange.bind(this)
    );

    // 背压管理器事件
    this.backpressureManager.on('backpressure:activated', (event) => {
      this.log.warn(event, '背压已激活 - 暂停触发新的数据加载');
      // 事件驱动模式下，控制逻辑会自动检查背压状态
      this.emit('backpressure:activated', event);
    });

    this.backpressureManager.on('backpressure:deactivated', (event) => {
      this.log.info(event, '背压已停用 - 可以恢复数据加载');
      // 背压解除时，检查是否需要加载任务
      const queueLength = this.drivenMemoryQueue.length;
      const stats = this.drivenMemoryQueue.getStatistics();
      if (queueLength < stats.waterMarks.low) {
        this.databaseJobStream.triggerBatchLoad('low_watermark');
      }
      this.emit('backpressure:deactivated', event);
    });

    this.backpressureManager.on('backpressure:adjusted', (event) => {
      this.emit('backpressure:adjusted', event);
    });

    // 数据库流事件
    this.databaseJobStream.on(
      'stream:started',
      this.handleStreamStarted.bind(this)
    );
    this.databaseJobStream.on(
      'stream:paused',
      this.handleStreamPaused.bind(this)
    );
    this.databaseJobStream.on(
      'stream:ended',
      this.handleStreamEnded.bind(this)
    );
    this.databaseJobStream.on('jobs:added', this.handleJobsAdded.bind(this));

    // 通知系统事件转发
    this.jobNotificationSystem.on('job:started', (event) =>
      this.emit('job:started', event)
    );
    this.jobNotificationSystem.on('job:completed', (event) =>
      this.emit('job:completed', event)
    );
    this.jobNotificationSystem.on('job:failed', (event) =>
      this.emit('job:failed', event)
    );
    this.jobNotificationSystem.on('job:retry', (event) =>
      this.emit('job:retry', event)
    );
  }

  /**
   * 处理水位变化
   */
  private handleWaterMarkChange(event: WaterMarkChangeEvent): void {
    this.updateLastActivity();

    this.log.debug(
      {
        from: event.from,
        to: event.to,
        length: event.length
      },
      '处理水位变化'
    );

    // 通知背压管理器
    this.backpressureManager.handleWaterMarkChange(event.to, event.length);

    // 根据水位变化控制数据流
    this.controlDatabaseStream(event.to, event.length);

    // 转发事件
    this.emit('watermark:changed', event);
  }

  /**
   * 处理长度变化
   */
  private handleLengthChange(event: LengthChangeEvent): void {
    this.updateLastActivity();
    this.emit('length:changed', event);
  }

  /**
   * 判断是否需要加载更多任务
   */
  private shouldLoadMoreTasks(
    stats: ReturnType<EventDrivenMemoryQueue['getStatistics']>,
    queueLength: number
  ): boolean {
    // 如果队列为空，立即加载
    if (stats.waterMarkLevel === 'empty' || queueLength === 0) {
      return true;
    }

    // 如果队列低于低水位阈值，加载更多任务
    if (stats.waterMarkLevel === 'low' || queueLength <= stats.waterMarks.low) {
      return true;
    }

    // 其他情况不需要加载
    return false;
  }

  /**
   * 控制数据库流 - 事件驱动版本
   */
  private controlDatabaseStream(
    level: WaterMarkLevel,
    queueLength: number
  ): void {
    const isBackpressureActive = this.backpressureManager.isBackpressureActive;

    // 如果背压激活，不触发新的加载
    if (isBackpressureActive) {
      this.log.debug('🚫 背压激活，跳过数据流控制');
      return;
    }

    // 根据水位级别控制数据加载
    switch (level) {
      case 'empty':
        // 队列空了，立即触发大批量加载
        this.databaseJobStream.triggerBatchLoad('empty_queue');
        this.log.debug('📦 队列为空，触发批量加载');
        break;

      case 'low':
        // 队列较少，触发批量加载补充
        if (!isBackpressureActive) {
          this.databaseJobStream.triggerBatchLoad('low_watermark');
          this.log.debug({ queueLength }, '📦 队列水位较低，触发批量加载');
        }
        break;

      case 'high':
      case 'critical':
        // 队列较满，不需要加载更多任务
        this.log.debug({ queueLength }, '🚫 队列水位较高，暂停加载任务');
        break;

      case 'normal':
        // 正常状态，保持现状
        this.log.debug({ queueLength }, '✅ 队列水位正常');
        break;
    }
  }

  /**
   * 处理流启动事件
   */
  private handleStreamStarted(event: StreamStartedEvent): void {
    this.updateLastActivity();
    this.log.info(
      {
        streamId: event.streamId,
        reason: event.reason,
        expectedJobCount: event.expectedJobCount
      },
      '数据库流已启动'
    );
    this.emit('stream:started', event);
  }

  /**
   * 处理流暂停事件
   */
  private handleStreamPaused(event: StreamPausedEvent): void {
    this.updateLastActivity();
    this.log.info(
      {
        streamId: event.streamId,
        reason: event.reason,
        duration: event.duration,
        loadedJobCount: event.loadedJobCount
      },
      '数据库流已暂停'
    );
    this.emit('stream:paused', event);
  }

  /**
   * 处理流结束事件
   */
  private handleStreamEnded(event: StreamEndedEvent): void {
    this.updateLastActivity();
    this.log.info(
      {
        streamId: event.streamId,
        reason: event.reason,
        duration: event.duration,
        totalLoadedJobs: event.totalLoadedJobs
      },
      '数据库流已结束'
    );
    this.emit('stream:ended', event);
  }

  /**
   * 处理任务添加事件
   */
  private handleJobsAdded(event: JobsAddedEvent): void {
    this.updateLastActivity();

    // 这里应该从数据库加载实际的任务对象
    // 为了演示，我们创建一个简化版本
    this.loadJobsToMemoryQueue(event.jobIds);

    this.emit('jobs:added', event);
  }

  /**
   * 加载任务到内存队列
   */
  private async loadJobsToMemoryQueue(jobIds: string[]): Promise<void> {
    try {
      // 检查内存队列剩余容量
      const remainingCapacity = this.drivenMemoryQueue.remainingWaterMark;

      if (remainingCapacity <= 0) {
        this.log.debug(
          {
            requestedJobCount: jobIds.length,
            queueLength: this.drivenMemoryQueue.length
          },
          '内存队列已满，跳过任务加载'
        );
        return;
      }

      // 限制加载的任务数量不超过剩余容量
      const limitedJobIds = jobIds.slice(0, remainingCapacity);

      if (limitedJobIds.length < jobIds.length) {
        this.log.debug(
          {
            requestedCount: jobIds.length,
            actualLoadCount: limitedJobIds.length,
            remainingCapacity,
            skippedCount: jobIds.length - limitedJobIds.length
          },
          '由于容量限制，部分任务将被跳过'
        );
      }

      // 直接从数据库加载任务，无需锁定
      const jobs = await Promise.all(
        limitedJobIds.map((id) => this.jobRepository.findById(id))
      );

      const validJobs = jobs.filter((job): job is QueueJob => job !== null);

      if (validJobs.length > 0) {
        this.drivenMemoryQueue.pushBatch(validJobs);
        this.log.debug(
          {
            jobCount: validJobs.length,
            jobIds: validJobs.map((j) => j.id),
            remainingCapacityAfter: this.drivenMemoryQueue.remainingWaterMark
          },
          '已加载任务到内存队列'
        );
      }
    } catch (error) {
      this.log.error(
        {
          error: (error as Error).message,
          jobIds
        },
        '加载任务到内存队列失败'
      );
    }
  }

  /**
   * 启动队列管理器
   */
  async start(): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('队列管理器未初始化');
    }

    if (this.state.isRunning) {
      this.log.warn('队列管理器已在运行中');
      return;
    }

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.startedAt = new Date();
    this.updateLastActivity();

    this.log.info('🚀 队列管理器启动中...');

    // 🔥 新增：启动时进行数据一致性检查和恢复
    await this.performStartupDataRecovery();

    this.log.info('✅ 队列管理器已启动');
  }

  /**
   * 启动时数据恢复逻辑
   */
  private async performStartupDataRecovery(): Promise<void> {
    try {
      this.log.info('🔍 开始启动数据一致性检查...');

      // 无锁定机制模式：直接加载待处理任务
      await this.loadInitialTasks();
      this.log.info('🔄 初始任务加载完成');
      this.log.info('✅ 启动数据一致性检查完成（无锁定机制模式）');
    } catch (error) {
      this.log.error(
        { error: (error as Error).message },
        '❌ 启动数据一致性检查失败'
      );
      // 不要抛出错误，允许系统继续启动
      this.log.warn('🔄 以降级模式启动');
    }
  }

  /**
   * 加载初始任务到内存队列
   */
  private async loadInitialTasks(): Promise<void> {
    try {
      // 检查数据库中是否有待处理的任务
      const pendingJobsCount =
        await this.jobRepository.countPendingJobs('default');

      if (pendingJobsCount > 0) {
        this.log.info(
          { pendingJobsCount },
          '发现待处理任务，启动数据流加载任务'
        );

        // 启动数据流开始加载任务
        await this.databaseJobStream.triggerBatchLoad('empty_queue');
      } else {
        this.log.info('暂无待处理任务');
      }
    } catch (error) {
      this.log.error({ error }, '加载初始任务失败');
      throw error;
    }
  }

  /**
   * 暂停队列管理器
   */
  pause(): void {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }

    this.state.isPaused = true;
    this.state.pausedAt = new Date();

    // 事件驱动模式下，暂停由水位控制逻辑自动处理
    this.log.debug('队列管理器已暂停，数据加载将受到背压控制');

    this.log.info('⏸️ 队列管理器已暂停');
  }

  /**
   * 恢复队列管理器
   */
  resume(): void {
    if (!this.state.isRunning || !this.state.isPaused) {
      return;
    }

    this.state.isPaused = false;
    this.state.pausedAt = null;
    this.updateLastActivity();

    // 事件驱动模式下，恢复时检查是否需要加载任务
    const queueLength = this.drivenMemoryQueue.length;
    if (queueLength === 0) {
      this.databaseJobStream.triggerBatchLoad('empty_queue');
    }

    this.log.info('▶️ 队列管理器已恢复');
  }

  /**
   * 停止队列管理器
   */
  stop(): void {
    if (!this.state.isRunning) {
      return;
    }

    this.log.info('🛑 正在停止队列管理器...');

    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.startedAt = null;
    this.state.pausedAt = null;

    // 事件驱动模式下，销毁数据流
    this.databaseJobStream.destroy();

    // 清空内存队列（无锁定机制，直接清空即可）
    const queuedJobs = this.drivenMemoryQueue.clear();
    if (queuedJobs.length > 0) {
      this.log.info({ clearedJobCount: queuedJobs.length }, '已清空内存队列');
    }

    this.log.info('✅ 队列管理器已停止');
  }

  /**
   * 获取下一个任务
   */
  getNextJob(): QueueJob | undefined {
    this.updateLastActivity();
    return this.drivenMemoryQueue.shift();
  }

  /**
   * 获取多个任务
   */
  getJobs(count: number): QueueJob[] {
    this.updateLastActivity();
    return this.drivenMemoryQueue.shiftBatch(count);
  }

  /**
   * 查看下一个任务（不移除）
   */
  peekNextJob(): QueueJob | undefined {
    return this.drivenMemoryQueue.peek();
  }

  /**
   * 查看多个任务（不移除）
   */
  peekJobs(count: number): QueueJob[] {
    return this.drivenMemoryQueue.peekBatch(count);
  }

  /**
   * 通知任务开始执行
   */
  notifyJobStarted(job: QueueJob, executorName: string): void {
    this.updateLastActivity();
    this.jobNotificationSystem.notifyJobStarted(job, executorName);
  }

  /**
   * 通知任务执行完成
   */
  notifyJobCompleted(job: QueueJob, result: any): void {
    this.updateLastActivity();
    this.jobNotificationSystem.notifyJobCompleted(job, result);
  }

  /**
   * 通知任务执行失败
   */
  notifyJobFailed(
    job: QueueJob,
    result: any,
    willRetry: boolean,
    remainingAttempts: number
  ): void {
    this.updateLastActivity();
    this.jobNotificationSystem.notifyJobFailed(
      job,
      result,
      willRetry,
      remainingAttempts
    );
  }

  /**
   * 通知任务重试
   */
  notifyJobRetry(
    job: QueueJob,
    attemptNumber: number,
    reason: string,
    nextRetryAt?: Date
  ): void {
    this.updateLastActivity();
    this.jobNotificationSystem.notifyJobRetry(
      job,
      attemptNumber,
      reason,
      nextRetryAt
    );
  }

  /**
   * 更新最后活动时间
   */
  private updateLastActivity(): void {
    this.state.lastActivityAt = new Date();
  }

  /**
   * 获取队列统计信息
   */
  getStatistics(): {
    state: QueueManagerState;
    memoryQueue: ReturnType<EventDrivenMemoryQueue['getStatistics']>;
    backpressure: ReturnType<SmartBackpressureManager['getState']>;
    databaseStream: ReturnType<DatabaseJobStream['getStatistics']>;
    notifications: ReturnType<JobNotificationSystem['getStatistics']>;
  } {
    return {
      state: { ...this.state },
      memoryQueue: this.drivenMemoryQueue.getStatistics(),
      backpressure: this.backpressureManager.getState(),
      databaseStream: this.databaseJobStream.getStatistics(),
      notifications: this.jobNotificationSystem.getStatistics()
    };
  }

  /**
   * 销毁队列管理器
   */
  destroy(): void {
    this.stop();

    // 销毁所有组件
    this.drivenMemoryQueue.destroy();
    this.backpressureManager.destroy();
    this.databaseJobStream.destroy();
    this.jobNotificationSystem.destroy();

    // 移除所有事件监听器
    this.removeAllListeners();

    this.state.isInitialized = false;
    this.log.info('队列管理器已销毁');
  }
}
