/**
 * @stratix/queue 数据库任务流
 * 负责从数据库加载任务到内存队列，使用基于游标的连续加载模式
 */

import type { Logger } from '@stratix/core';
import { EventEmitter } from 'node:events';
import type { EventDrivenMemoryQueue } from '../core/memory-queue.js';
import type { QueueGroupRepository } from '../repositories/queue-group.repository.js';
import type { QueueJobRepository } from '../repositories/queue-job.repository.js';
import type { DatabaseStreamConfig } from '../types/index.js';

/**
 * 数据库任务流状态
 */
interface StreamState {
  isActive: boolean;
  isLoading: boolean;
  totalBatches: number;
  totalJobs: number;
  lastCursor: { priority: number; created_at: Date; id: string } | null;
}

/**
 * 数据库任务流
 * 负责从数据库批量加载任务并推送到内存队列
 * 使用基于游标的分页确保数据加载的连续性
 */
export class DatabaseJobStream extends EventEmitter {
  private state: StreamState = {
    isActive: false,
    isLoading: false,
    totalBatches: 0,
    totalJobs: 0,
    lastCursor: null
  };

  private queueName: string = 'default';

  private config: DatabaseStreamConfig = {
    batchSize: 1000,
    readTimeout: 10000,
    maxRetries: 3,
    retryDelay: 2000
  };

  constructor(
    private drivenMemoryQueue: EventDrivenMemoryQueue,
    private jobRepository: QueueJobRepository,
    private groupRepository: QueueGroupRepository,
    private log: Logger
  ) {
    super();

    this.log.debug(
      {
        queueName: this.queueName,
        config: this.config
      },
      '数据库任务流已初始化'
    );
  }

  /**
   * 初始化数据流
   */
  async initialize(): Promise<void> {
    if (this.state.isActive) {
      return;
    }

    this.state.isActive = true;
    this.log.info('🔧 事件驱动数据流已初始化');
  }

  /**
   * 触发批量加载
   */
  async triggerBatchLoad(
    trigger:
      | 'empty_queue'
      | 'low_watermark'
      | 'job_added'
      | 'job_processed'
      | 'manual'
  ): Promise<void> {
    if (!this.state.isActive) {
      await this.initialize();
    }

    // 防止并发加载
    if (this.state.isLoading) {
      this.log.debug({ trigger }, '数据加载正在进行中，跳过此次触发');
      return;
    }

    this.state.isLoading = true;

    try {
      this.log.debug({ trigger }, '🚀 开始批量加载任务');

      await this.performBatchLoad();

      this.log.info(
        {
          trigger,
          totalBatches: this.state.totalBatches,
          totalJobs: this.state.totalJobs
        },
        '✅ 批量加载完成'
      );
    } catch (error) {
      await this.handleLoadError(error as Error, trigger);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * 执行批量加载
   */
  private async performBatchLoad(): Promise<void> {
    try {
      // 获取内存队列的剩余容量
      const remainingCapacity = this.drivenMemoryQueue.remainingWaterMark;

      // 如果内存队列已满，则不加载
      if (remainingCapacity <= 0) {
        this.log.debug(
          {
            queueLength: this.drivenMemoryQueue.length,
            maxCapacity: this.drivenMemoryQueue.length + remainingCapacity
          },
          '内存队列已满，跳过数据加载'
        );
        return;
      }

      // 计算实际加载数量：取配置的batchSize和剩余容量的较小值
      const actualBatchSize = Math.min(
        this.config.batchSize,
        remainingCapacity
      );

      this.log.debug(
        {
          configBatchSize: this.config.batchSize,
          remainingCapacity,
          actualBatchSize,
          currentQueueLength: this.drivenMemoryQueue.length
        },
        '计算实际加载数量'
      );

      // 获取内存队列中最后一个任务的游标信息
      const cursor = this.drivenMemoryQueue.getLastJobCursor();

      // 获取暂停的分组列表
      const pausedGroupIds = await this.groupRepository.getPausedGroupIds(
        this.queueName
      );

      // 从数据库查询待处理任务，使用游标确保连续性
      const jobs = await this.jobRepository.findPendingJobs(
        this.queueName,
        actualBatchSize, // 使用动态计算的加载数量
        pausedGroupIds,
        cursor || undefined
      );

      if (jobs.length === 0) {
        this.log.debug('没有找到待处理的任务，发出流结束事件');
        return;
      }

      // 将获取到数据加入到队列中
      this.drivenMemoryQueue.pushBatch(jobs);

      this.state.totalBatches += 1;
      this.state.totalJobs += jobs.length;

      // 更新游标信息
      const lastJob = jobs[jobs.length - 1];
      this.state.lastCursor = {
        priority: lastJob.priority,
        created_at: lastJob.created_at,
        id: lastJob.id
      };

      this.log.info(
        {
          queueName: this.queueName,
          jobCount: jobs.length,
          requestedCount: actualBatchSize,
          remainingCapacityBefore: remainingCapacity,
          remainingCapacityAfter: this.drivenMemoryQueue.remainingWaterMark,
          currentQueueLength: this.drivenMemoryQueue.length,
          totalBatches: this.state.totalBatches,
          totalJobs: this.state.totalJobs,
          cursor: this.state.lastCursor
        },
        '📦 批量任务已加载到内存队列'
      );
    } catch (error) {
      this.log.error(
        {
          error: (error as Error).message,
          queueName: this.queueName
        },
        '❌ 批量加载任务失败'
      );
      throw error;
    } finally {
      this.state.isLoading = false;
      // 发布数据加载消息
      this.emit('stream:batch-loaded', {
        timestamp: new Date(),
        eventId: `batch-loaded-${Date.now()}-${Math.random()}`,
        queueName: this.queueName,
        totalBatches: this.state.totalBatches,
        totalJobs: this.state.totalJobs,
        cursor: this.state.lastCursor
      });
    }
  }

  /**
   * 处理加载错误
   */
  private async handleLoadError(error: Error, trigger: string): Promise<void> {
    this.log.error(
      {
        error: error.message,
        trigger,
        queueName: this.queueName
      },
      '数据库任务流加载失败'
    );

    this.emit('stream:error', {
      timestamp: new Date(),
      eventId: `stream-error-${Date.now()}-${Math.random()}`,
      error: error.message,
      trigger
    });
  }

  /**
   * 获取流统计信息
   */
  getStatistics(): {
    queueName: string;
    isActive: boolean;
    isLoading: boolean;
    totalBatches: number;
    totalJobs: number;
    lastCursor: { priority: number; created_at: Date; id: string } | null;
  } {
    return {
      queueName: this.queueName,
      isActive: this.state.isActive,
      isLoading: this.state.isLoading,
      totalBatches: this.state.totalBatches,
      totalJobs: this.state.totalJobs,
      lastCursor: this.state.lastCursor
    };
  }

  /**
   * 重置流状态
   */
  reset(): void {
    this.state = {
      isActive: false,
      isLoading: false,
      totalBatches: 0,
      totalJobs: 0,
      lastCursor: null
    };
    this.log.debug({ queueName: this.queueName }, '数据库任务流状态已重置');
  }

  /**
   * 销毁流
   */
  destroy(): void {
    this.state.isActive = false;
    this.removeAllListeners();
    this.log.info({ queueName: this.queueName }, '数据库任务流已销毁');
  }

  /**
   * 获取是否激活状态
   */
  get isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * 获取已加载任务数量
   */
  get loadedJobCount(): number {
    return this.state.totalJobs;
  }
}
