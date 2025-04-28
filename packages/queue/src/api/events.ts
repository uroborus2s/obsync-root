/**
 * @stratix/queue 事件系统
 * 提供队列和作业事件的管理和分发功能
 */

import { EventEmitter } from 'events';
import type { JobEvent, QueueEvent } from '../types/index.js';

/**
 * 全局事件总线
 * 用于跨队列共享事件
 */
class EventBus extends EventEmitter {
  private static instance: EventBus;

  /**
   * 获取单例实例
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();

      // 设置最大监听器数量，避免警告
      EventBus.instance.setMaxListeners(100);
    }

    return EventBus.instance;
  }

  /**
   * 发布队列事件
   * @param event 事件名称
   * @param queueName 队列名称
   * @param args 事件参数
   */
  publishQueueEvent(
    event: QueueEvent,
    queueName: string,
    ...args: any[]
  ): void {
    this.emit(`queue:${queueName}:${event}`, ...args);
    this.emit(`queue:${event}`, queueName, ...args);
    this.emit('queue:*', event, queueName, ...args);
  }

  /**
   * 发布作业事件
   * @param event 事件名称
   * @param queueName 队列名称
   * @param jobId 作业ID
   * @param args 事件参数
   */
  publishJobEvent(
    event: JobEvent,
    queueName: string,
    jobId: string,
    ...args: any[]
  ): void {
    this.emit(`job:${queueName}:${jobId}:${event}`, ...args);
    this.emit(`job:${queueName}:${event}`, jobId, ...args);
    this.emit(`job:${event}`, queueName, jobId, ...args);
    this.emit('job:*', event, queueName, jobId, ...args);
  }

  /**
   * 订阅特定队列的事件
   * @param queueName 队列名称
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  subscribeToQueue(
    queueName: string,
    event: QueueEvent,
    handler: (...args: any[]) => void
  ): void {
    this.on(`queue:${queueName}:${event}`, handler);
  }

  /**
   * 订阅所有队列的特定事件
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  subscribeToAllQueues(
    event: QueueEvent,
    handler: (queueName: string, ...args: any[]) => void
  ): void {
    this.on(`queue:${event}`, handler);
  }

  /**
   * 订阅所有队列事件
   * @param handler 事件处理函数
   */
  subscribeToAllQueueEvents(
    handler: (event: QueueEvent, queueName: string, ...args: any[]) => void
  ): void {
    this.on('queue:*', handler);
  }

  /**
   * 订阅特定作业的事件
   * @param queueName 队列名称
   * @param jobId 作业ID
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  subscribeToJob(
    queueName: string,
    jobId: string,
    event: JobEvent,
    handler: (...args: any[]) => void
  ): void {
    this.on(`job:${queueName}:${jobId}:${event}`, handler);
  }

  /**
   * 订阅特定队列中的作业事件
   * @param queueName 队列名称
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  subscribeToQueueJobs(
    queueName: string,
    event: JobEvent,
    handler: (jobId: string, ...args: any[]) => void
  ): void {
    this.on(`job:${queueName}:${event}`, handler);
  }

  /**
   * 订阅所有作业的特定事件
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  subscribeToAllJobs(
    event: JobEvent,
    handler: (queueName: string, jobId: string, ...args: any[]) => void
  ): void {
    this.on(`job:${event}`, handler);
  }

  /**
   * 订阅所有作业事件
   * @param handler 事件处理函数
   */
  subscribeToAllJobEvents(
    handler: (
      event: JobEvent,
      queueName: string,
      jobId: string,
      ...args: any[]
    ) => void
  ): void {
    this.on('job:*', handler);
  }

  /**
   * 取消订阅特定队列的事件
   * @param queueName 队列名称
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  unsubscribeFromQueue(
    queueName: string,
    event: QueueEvent,
    handler: (...args: any[]) => void
  ): void {
    this.off(`queue:${queueName}:${event}`, handler);
  }

  /**
   * 取消订阅特定作业的事件
   * @param queueName 队列名称
   * @param jobId 作业ID
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  unsubscribeFromJob(
    queueName: string,
    jobId: string,
    event: JobEvent,
    handler: (...args: any[]) => void
  ): void {
    this.off(`job:${queueName}:${jobId}:${event}`, handler);
  }
}

// 导出全局事件总线单例
export const eventBus = EventBus.getInstance();

/**
 * 事件管理器类
 * 负责单个队列的事件管理
 */
export class EventManager {
  private queueName: string;
  private enabled: boolean;
  private useGlobalBus: boolean;
  private localEmitter: EventEmitter;

  /**
   * 创建事件管理器实例
   * @param queueName 队列名称
   * @param options 选项
   */
  constructor(
    queueName: string,
    options: { enabled?: boolean; global?: boolean } = {}
  ) {
    this.queueName = queueName;
    this.enabled = options.enabled !== false;
    this.useGlobalBus = options.global === true;
    this.localEmitter = new EventEmitter();

    // 设置最大监听器数量，避免警告
    this.localEmitter.setMaxListeners(50);
  }

  /**
   * 发布队列事件
   * @param event 事件名称
   * @param args 事件参数
   */
  publishQueueEvent(event: QueueEvent, ...args: any[]): void {
    if (!this.enabled) return;

    // 本地事件
    this.localEmitter.emit(event, ...args);

    // 全局事件总线
    if (this.useGlobalBus) {
      eventBus.publishQueueEvent(event, this.queueName, ...args);
    }
  }

  /**
   * 发布作业事件
   * @param event 事件名称
   * @param jobId 作业ID
   * @param args 事件参数
   */
  publishJobEvent(event: JobEvent, jobId: string, ...args: any[]): void {
    if (!this.enabled) return;

    // 本地事件
    this.localEmitter.emit(`job:${jobId}:${event}`, ...args);
    this.localEmitter.emit(`job:${event}`, jobId, ...args);

    // 全局事件总线
    if (this.useGlobalBus) {
      eventBus.publishJobEvent(event, this.queueName, jobId, ...args);
    }
  }

  /**
   * 订阅队列事件
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  on(event: QueueEvent | string, handler: (...args: any[]) => void): void {
    this.localEmitter.on(event, handler);
  }

  /**
   * 取消订阅队列事件
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  off(event: QueueEvent | string, handler: (...args: any[]) => void): void {
    this.localEmitter.off(event, handler);
  }

  /**
   * 订阅作业事件
   * @param jobId 作业ID
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  onJob(
    jobId: string,
    event: JobEvent,
    handler: (...args: any[]) => void
  ): void {
    this.localEmitter.on(`job:${jobId}:${event}`, handler);
  }

  /**
   * 取消订阅作业事件
   * @param jobId 作业ID
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  offJob(
    jobId: string,
    event: JobEvent,
    handler: (...args: any[]) => void
  ): void {
    this.localEmitter.off(`job:${jobId}:${event}`, handler);
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners(): void {
    this.localEmitter.removeAllListeners();
  }

  /**
   * 是否启用事件
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 启用事件
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用事件
   */
  disable(): void {
    this.enabled = false;
  }
}
