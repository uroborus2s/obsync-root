/**
 * @stratix/queue 抽象基础驱动类
 * 提供所有驱动的通用功能和基础实现
 */

import { async, object } from '@stratix/utils';
import { QueueDriver, QueueInstance } from '../types/driver.js';

/**
 * 抽象队列驱动基类
 * 为所有实现提供通用功能和基础结构
 */
export abstract class AbstractQueueDriver implements QueueDriver {
  protected options: any;
  protected queues: Map<string, QueueInstance> = new Map();

  /**
   * 构造函数
   * @param options 驱动选项
   */
  constructor(options: any = {}) {
    this.options = options;
  }

  /**
   * 初始化驱动
   * 子类应该重写此方法以执行具体初始化逻辑
   * @param options 初始化选项
   */
  async init(options: any): Promise<void> {
    // 合并选项
    this.options = object.deepMerge({}, this.options, options);
  }

  /**
   * 创建队列实例
   * 此方法必须由子类实现
   * @param name 队列名称
   * @param options 队列选项
   */
  abstract createQueue(name: string, options?: any): QueueInstance;

  /**
   * 获取已有队列实例
   * @param name 队列名称
   */
  getQueue(name: string): QueueInstance | undefined {
    return this.queues.get(name);
  }

  /**
   * 关闭驱动连接
   * 关闭所有队列连接并释放资源
   */
  async close(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    // 关闭所有队列连接
    for (const queue of this.queues.values()) {
      if (queue.close) {
        closePromises.push(queue.close());
      }
    }

    // 等待所有关闭操作完成
    if (closePromises.length > 0) {
      await async.pMap(closePromises, (promise) => promise, { concurrency: 5 });
    }

    // 清空队列映射
    this.queues.clear();
  }

  /**
   * 获取驱动名称
   * 子类应该重写此方法以返回具体驱动名称
   */
  abstract getName(): string;

  /**
   * 检查驱动健康状态
   * 子类应该重写此方法以实现具体健康检查逻辑
   */
  abstract checkHealth(): Promise<boolean>;
}

/**
 * 抽象队列实例基类
 * 为所有队列实例实现提供通用功能和基础结构
 */
export abstract class AbstractQueueInstance implements QueueInstance {
  protected _name: string;
  protected options: any;
  protected eventHandlers: Map<string, Set<Function>> = new Map();

  /**
   * 构造函数
   * @param name 队列名称
   * @param options 队列选项
   */
  constructor(name: string, options: any = {}) {
    this._name = name;
    this.options = options;
  }

  /**
   * 获取队列名称
   */
  get name(): string {
    return this._name;
  }

  /**
   * 添加任务
   * 此方法必须由子类实现
   */
  abstract add(name: string, data: any, options?: any): Promise<any>;

  /**
   * 批量添加任务
   * 此方法必须由子类实现
   */
  abstract addBulk(
    jobs: Array<{ name: string; data: any; opts?: any }>
  ): Promise<any[]>;

  /**
   * 注册处理器
   * 此方法必须由子类实现
   */
  abstract process(processor: Function | Record<string, Function>): void;

  /**
   * 注册事件监听器
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  off(event: string, handler: Function): void {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)!;
      handlers.delete(handler);

      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param args 事件参数
   */
  protected emitEvent(event: string, ...args: any[]): void {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)!;
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }

  /**
   * 获取任务实例
   * 此方法必须由子类实现
   */
  abstract getJob(jobId: string): Promise<any>;

  /**
   * 获取任务列表
   * 此方法必须由子类实现
   */
  abstract getJobs(
    status: string | string[],
    start?: number,
    end?: number,
    asc?: boolean
  ): Promise<any[]>;

  /**
   * 获取任务计数
   * 此方法必须由子类实现
   */
  abstract getJobCounts(): Promise<Record<string, number>>;

  /**
   * 移除任务
   * 此方法必须由子类实现
   */
  abstract removeJob(jobId: string): Promise<boolean>;

  /**
   * 批量移除任务
   * 此方法必须由子类实现
   */
  abstract removeJobs(pattern: string): Promise<number>;

  /**
   * 暂停队列处理
   * 此方法必须由子类实现
   */
  abstract pause(): Promise<void>;

  /**
   * 恢复队列处理
   * 此方法必须由子类实现
   */
  abstract resume(): Promise<void>;

  /**
   * 检查队列是否暂停
   * 此方法必须由子类实现
   */
  abstract isPaused(): Promise<boolean>;

  /**
   * 清空队列
   * 此方法必须由子类实现
   */
  abstract empty(): Promise<void>;

  /**
   * 关闭队列连接
   * 此方法必须由子类实现
   */
  abstract close(): Promise<void>;

  /**
   * 获取队列状态
   * 此方法必须由子类实现
   */
  abstract getStatus(): Promise<any>;

  /**
   * 获取队列指标
   * 此方法必须由子类实现
   */
  abstract getMetrics(): Promise<any>;
}
