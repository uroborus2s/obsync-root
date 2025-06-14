/**
 * @stratix/queue 任务通知系统
 */

import type { Logger } from '@stratix/core';
import { EventEmitter } from 'node:events';
import type {
  DebounceConfig,
  JobCompletedEvent,
  JobExecutionResult,
  JobFailedEvent,
  JobRetryEvent,
  JobStartedEvent,
  QueueJob
} from '../types/index.js';

/**
 * 通知队列项
 */
interface NotificationQueueItem {
  id: string;
  type: 'started' | 'completed' | 'failed' | 'retry';
  job: QueueJob;
  result?: JobExecutionResult;
  timestamp: Date;
  retryCount?: number;
  nextRetryAt?: Date;
}

/**
 * 批量通知配置
 */
interface BatchNotificationConfig {
  enabled: boolean;
  batchSize: number;
  flushInterval: number;
  maxWaitTime: number;
}

/**
 * 任务通知系统
 * 负责处理任务状态变化的通知和事件发射
 */
export class JobNotificationSystem extends EventEmitter {
  private notificationQueue: NotificationQueueItem[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private debounceTimeouts = new Map<string, NodeJS.Timeout>();
  private batchConfig: BatchNotificationConfig;
  private debounceConfig: DebounceConfig = {
    lengthChange: 100,
    jobAddition: 50,
    watermarkChange: 200,
    eventEmission: 100
  };

  constructor(private log: Logger) {
    super();

    this.batchConfig = {
      enabled: true,
      batchSize: 50,
      flushInterval: 1000,
      maxWaitTime: 5000
    };

    // 启动批量处理
    if (this.batchConfig.enabled) {
      this.startBatchProcessing();
    }
  }

  /**
   * 通知任务开始执行
   */
  notifyJobStarted(job: QueueJob, executorName: string): void {
    const notification: NotificationQueueItem = {
      id: `started-${job.id}-${Date.now()}`,
      type: 'started',
      job,
      timestamp: new Date()
    };

    this.log.debug(
      {
        jobId: job.id,
        queueName: job.queue_name,
        executorName,
        jobName: job.job_name
      },
      '🚀 任务开始执行通知'
    );

    if (this.batchConfig.enabled) {
      this.addToBatch(notification);
    } else {
      this.processNotification(notification, executorName);
    }
  }

  /**
   * 通知任务执行完成
   */
  notifyJobCompleted(job: QueueJob, result: JobExecutionResult): void {
    const notification: NotificationQueueItem = {
      id: `completed-${job.id}-${Date.now()}`,
      type: 'completed',
      job,
      result,
      timestamp: new Date()
    };

    this.log.debug(
      {
        jobId: job.id,
        queueName: job.queue_name,
        jobName: job.job_name,
        success: result.success,
        executionTime: result.executionTime
      },
      '✅ 任务完成通知'
    );

    if (this.batchConfig.enabled) {
      this.addToBatch(notification);
    } else {
      this.processNotification(notification);
    }
  }

  /**
   * 通知任务执行失败
   */
  notifyJobFailed(
    job: QueueJob,
    result: JobExecutionResult,
    willRetry: boolean,
    remainingAttempts: number
  ): void {
    const notification: NotificationQueueItem = {
      id: `failed-${job.id}-${Date.now()}`,
      type: 'failed',
      job,
      result,
      timestamp: new Date()
    };

    this.log.debug(
      {
        jobId: job.id,
        queueName: job.queue_name,
        jobName: job.job_name,
        error: result.error?.message,
        willRetry,
        remainingAttempts
      },
      '❌ 任务失败通知'
    );

    if (this.batchConfig.enabled) {
      this.addToBatch(notification);
    } else {
      this.processNotification(
        notification,
        undefined,
        willRetry,
        remainingAttempts
      );
    }
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
    const notification: NotificationQueueItem = {
      id: `retry-${job.id}-${Date.now()}`,
      type: 'retry',
      job,
      retryCount: attemptNumber,
      nextRetryAt,
      timestamp: new Date()
    };

    this.log.debug(
      {
        jobId: job.id,
        queueName: job.queue_name,
        jobName: job.job_name,
        attemptNumber,
        reason,
        nextRetryAt
      },
      '🔄 任务重试通知'
    );

    if (this.batchConfig.enabled) {
      this.addToBatch(notification);
    } else {
      this.processNotification(
        notification,
        undefined,
        undefined,
        undefined,
        reason
      );
    }
  }

  /**
   * 添加到批量处理队列
   */
  private addToBatch(notification: NotificationQueueItem): void {
    this.notificationQueue.push(notification);

    // 如果达到批量大小，立即处理
    if (this.notificationQueue.length >= this.batchConfig.batchSize) {
      this.flushBatch();
    }
  }

  /**
   * 启动批量处理
   */
  private startBatchProcessing(): void {
    const scheduleFlush = () => {
      this.flushTimeout = setTimeout(() => {
        this.flushBatch();
        scheduleFlush(); // 递归调度下一次
      }, this.batchConfig.flushInterval);
    };

    scheduleFlush();
  }

  /**
   * 刷新批量通知
   */
  private flushBatch(): void {
    if (this.notificationQueue.length === 0) {
      return;
    }

    const batch = [...this.notificationQueue];
    this.notificationQueue = [];

    this.log.debug({ batchSize: batch.length }, '📦 处理批量通知');

    // 按类型分组处理
    const groupedNotifications = this.groupNotificationsByType(batch);

    // 处理每个类型的通知
    for (const [type, notifications] of groupedNotifications) {
      this.processBatchNotifications(type, notifications);
    }
  }

  /**
   * 按类型分组通知
   */
  private groupNotificationsByType(
    notifications: NotificationQueueItem[]
  ): Map<string, NotificationQueueItem[]> {
    const grouped = new Map<string, NotificationQueueItem[]>();

    for (const notification of notifications) {
      const key = notification.type;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(notification);
    }

    return grouped;
  }

  /**
   * 处理批量通知
   */
  private processBatchNotifications(
    type: string,
    notifications: NotificationQueueItem[]
  ): void {
    for (const notification of notifications) {
      this.processNotification(notification);
    }
  }

  /**
   * 处理单个通知
   */
  private processNotification(
    notification: NotificationQueueItem,
    executorName?: string,
    willRetry?: boolean,
    remainingAttempts?: number,
    retryReason?: string
  ): void {
    const { type, job, result, retryCount, nextRetryAt } = notification;

    // 使用防抖机制避免重复事件
    const debounceKey = `${type}-${job.id}`;

    if (this.debounceTimeouts.has(debounceKey)) {
      clearTimeout(this.debounceTimeouts.get(debounceKey)!);
    }

    const timeout = setTimeout(() => {
      this.debounceTimeouts.delete(debounceKey);
      this.emitJobEvent(
        type,
        job,
        result,
        executorName,
        willRetry,
        remainingAttempts,
        retryCount,
        retryReason,
        nextRetryAt
      );
    }, this.getDebounceDelay(type));

    this.debounceTimeouts.set(debounceKey, timeout);
  }

  /**
   * 发射任务事件
   */
  private emitJobEvent(
    type: string,
    job: QueueJob,
    result?: JobExecutionResult,
    executorName?: string,
    willRetry?: boolean,
    remainingAttempts?: number,
    retryCount?: number,
    retryReason?: string,
    nextRetryAt?: Date
  ): void {
    const baseEventData = {
      timestamp: new Date(),
      queueName: job.queue_name,
      job: this.createJobSummary(job)
    };

    switch (type) {
      case 'started': {
        const event: JobStartedEvent = {
          ...baseEventData,
          eventId: `job-started-${job.id}-${Date.now()}`,
          executorName: executorName || 'unknown',
          startedAt: new Date()
        };
        this.emit('job:started', event);
        break;
      }

      case 'completed': {
        if (!result) return;

        const event: JobCompletedEvent = {
          ...baseEventData,
          eventId: `job-completed-${job.id}-${Date.now()}`,
          result,
          completedAt: new Date(),
          executionTime: result.executionTime || 0
        };
        this.emit('job:completed', event);
        break;
      }

      case 'failed': {
        if (!result) return;

        const event: JobFailedEvent = {
          ...baseEventData,
          eventId: `job-failed-${job.id}-${Date.now()}`,
          result,
          failedAt: new Date(),
          willRetry: willRetry || false,
          remainingAttempts: remainingAttempts || 0
        };
        this.emit('job:failed', event);
        break;
      }

      case 'retry': {
        const event: JobRetryEvent = {
          ...baseEventData,
          eventId: `job-retry-${job.id}-${Date.now()}`,
          attemptNumber: retryCount || 1,
          reason: retryReason || 'unknown',
          nextRetryAt
        };
        this.emit('job:retry', event);
        break;
      }
    }
  }

  /**
   * 创建任务摘要
   */
  private createJobSummary(job: QueueJob): any {
    return {
      id: job.id,
      jobName: job.job_name,
      queueName: job.queue_name,
      groupId: job.group_id,
      priority: job.priority,
      attempts: job.attempts,
      maxAttempts: job.max_attempts,
      createdAt: job.created_at,
      delayUntil: job.delay_until,
      status: job.status
    };
  }

  /**
   * 获取防抖延迟
   */
  private getDebounceDelay(type: string): number {
    switch (type) {
      case 'started':
        return this.debounceConfig.eventEmission;
      case 'completed':
      case 'failed':
        return this.debounceConfig.eventEmission;
      case 'retry':
        return this.debounceConfig.eventEmission * 2; // 重试事件稍长的防抖
      default:
        return this.debounceConfig.eventEmission;
    }
  }

  /**
   * 更新批量配置
   */
  updateBatchConfig(newConfig: Partial<BatchNotificationConfig>): void {
    this.batchConfig = { ...this.batchConfig, ...newConfig };
    this.log.info({ batchConfig: this.batchConfig }, '批量通知配置已更新');
  }

  /**
   * 更新防抖配置
   */
  updateDebounceConfig(newConfig: Partial<DebounceConfig>): void {
    this.debounceConfig = { ...this.debounceConfig, ...newConfig };
    this.log.info({ debounceConfig: this.debounceConfig }, '防抖配置已更新');
  }

  /**
   * 立即刷新所有待处理的通知
   */
  flush(): void {
    // 清除所有防抖定时器，立即处理
    for (const [key, timeout] of this.debounceTimeouts) {
      clearTimeout(timeout);
      this.debounceTimeouts.delete(key);
    }

    // 刷新批量队列
    this.flushBatch();
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    queuedNotifications: number;
    pendingDebounces: number;
    batchConfig: BatchNotificationConfig;
  } {
    return {
      queuedNotifications: this.notificationQueue.length,
      pendingDebounces: this.debounceTimeouts.size,
      batchConfig: { ...this.batchConfig }
    };
  }

  /**
   * 销毁通知系统
   */
  destroy(): void {
    // 清除批量处理定时器
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // 清除所有防抖定时器
    for (const timeout of this.debounceTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.debounceTimeouts.clear();

    // 处理剩余的通知
    this.flushBatch();

    // 移除所有事件监听器
    this.removeAllListeners();

    this.log.info('任务通知系统已销毁');
  }
}
