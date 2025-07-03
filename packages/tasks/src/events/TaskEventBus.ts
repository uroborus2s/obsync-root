/**
 * 基于EventEmitter的任务事件总线
 *
 * 核心观点：EventEmitter默认限制是10个监听器，但这不是硬限制
 * 可以通过setMaxListeners()调整，实际使用中单个EventEmitter完全够用
 */

import { EventEmitter } from 'events';
import { TaskEvent, TaskEventListener } from '../types/events.types.js';

/**
 * 任务事件总线
 * 基于单个EventEmitter的简化实现
 *
 * 核心观点：EventEmitter默认限制是10个监听器，但这不是硬限制
 * 可以通过setMaxListeners()调整，实际使用中单个EventEmitter完全够用
 */
export class TaskEventBus {
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
    // 设置更高的监听器限制，避免警告
    // 假设最多可能有1000个任务同时被监听
    this.eventEmitter.setMaxListeners(1000);
  }

  /**
   * 订阅全局事件
   */
  on<T extends TaskEvent>(
    eventType: T['type'],
    listener: TaskEventListener<T>
  ): void {
    this.eventEmitter.on(eventType, listener);
  }

  /**
   * 订阅特定任务的事件
   */
  onTask<T extends TaskEvent>(
    taskId: string,
    eventType: T['type'],
    listener: TaskEventListener<T>
  ): void {
    const eventName = `${taskId}:${eventType}`;
    this.eventEmitter.on(eventName, listener);
  }

  /**
   * 订阅一次性事件
   */
  once<T extends TaskEvent>(
    eventType: T['type'],
    listener: TaskEventListener<T>
  ): void {
    this.eventEmitter.once(eventType, listener);
  }

  /**
   * 订阅特定任务的一次性事件
   */
  onceTask<T extends TaskEvent>(
    taskId: string,
    eventType: T['type'],
    listener: TaskEventListener<T>
  ): void {
    const eventName = `${taskId}:${eventType}`;
    this.eventEmitter.once(eventName, listener);
  }

  /**
   * 发出事件
   */
  emit<T extends TaskEvent>(event: T): void {
    // 发出全局事件
    this.eventEmitter.emit(event.type, event);

    // 发出特定任务的事件
    const taskEventName = `${event.taskId}:${event.type}`;
    this.eventEmitter.emit(taskEventName, event);
  }

  /**
   * 移除监听器
   */
  off<T extends TaskEvent>(
    eventType: T['type'],
    listener: TaskEventListener<T>
  ): void {
    this.eventEmitter.off(eventType, listener);
  }

  /**
   * 移除特定任务的监听器
   */
  offTask<T extends TaskEvent>(
    taskId: string,
    eventType: T['type'],
    listener: TaskEventListener<T>
  ): void {
    const eventName = `${taskId}:${eventType}`;
    this.eventEmitter.off(eventName, listener);
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(eventType?: string): void {
    this.eventEmitter.removeAllListeners(eventType);
  }

  /**
   * 移除特定任务的所有监听器
   */
  removeTaskListeners(taskId: string): void {
    const eventNames = this.eventEmitter.eventNames();
    const taskPrefix = `${taskId}:`;

    for (const eventName of eventNames) {
      if (typeof eventName === 'string' && eventName.startsWith(taskPrefix)) {
        this.eventEmitter.removeAllListeners(eventName);
      }
    }
  }

  /**
   * 获取事件名称列表
   */
  eventNames(): (string | symbol)[] {
    return this.eventEmitter.eventNames();
  }

  /**
   * 获取监听器数量
   */
  listenerCount(eventType: string): number {
    return this.eventEmitter.listenerCount(eventType);
  }

  /**
   * 获取总监听器数量
   */
  getTotalListenerCount(): number {
    const eventNames = this.eventEmitter.eventNames();
    return eventNames.reduce((total, eventName) => {
      return total + this.eventEmitter.listenerCount(eventName);
    }, 0);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const eventNames = this.eventEmitter.eventNames();
    const totalListeners = this.getTotalListenerCount();
    const maxListeners = this.eventEmitter.getMaxListeners();

    // 分析事件类型
    const globalEvents = eventNames.filter(
      (name) => typeof name === 'string' && !name.includes(':')
    );
    const taskEvents = eventNames.filter(
      (name) => typeof name === 'string' && name.includes(':')
    );

    return {
      totalEvents: eventNames.length,
      globalEvents: globalEvents.length,
      taskEvents: taskEvents.length,
      totalListeners,
      maxListeners,
      usagePercentage: Math.round((totalListeners / maxListeners) * 100),
      eventBreakdown: eventNames.map((eventName) => ({
        event: eventName,
        listenerCount: this.eventEmitter.listenerCount(eventName)
      }))
    };
  }

  /**
   * 清理所有监听器
   */
  cleanup(): void {
    this.eventEmitter.removeAllListeners();
  }
}
