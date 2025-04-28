/**
 * @stratix/queue 队列管理器
 * 负责管理所有队列实例、创建队列和提供统一的队列操作接口
 */

import * as utils from '@stratix/utils';
import { driverFactory } from '../drivers/index.js';
import type {
  QueueDriver,
  QueueHealth,
  QueueManagerOptions,
  QueueOptions,
  QueueStatus
} from '../types/index.js';
import { Queue } from './queue.js';

/**
 * 队列管理器类
 * 负责创建和管理队列实例
 */
export class QueueManager {
  private driver: QueueDriver;
  private queues: Map<string, Queue>;
  private options: QueueManagerOptions;
  private defaultOptions: QueueOptions;

  /**
   * 队列管理器构造函数
   * @param options 队列管理器配置选项
   */
  constructor(options: QueueManagerOptions) {
    this.options = utils.object.deepClone(options) as QueueManagerOptions;
    this.queues = new Map();

    // 创建驱动工厂实例但不立即初始化
    const driverPromise = driverFactory.createDriver(
      options.driver || 'bullmq',
      options.driverOptions || {}
    );

    // 临时分配一个占位符，真正的驱动将在init()方法中异步初始化
    this.driver = {} as QueueDriver;

    // 设置默认队列选项
    this.defaultOptions = {
      prefix: options.prefix || '',
      defaultJobOptions: options.defaultJobOptions || {}
    };
  }

  /**
   * 初始化队列管理器
   */
  async init(): Promise<void> {
    // 异步初始化驱动
    const driver = await driverFactory.createDriver(
      this.options.driver || 'bullmq',
      this.options.driverOptions || {}
    );
    this.driver = driver;
    await this.driver.init(this.options.driverOptions);
  }

  /**
   * 创建新队列
   * @param name 队列名称
   * @param options 队列选项
   * @returns 队列实例
   */
  createQueue(name: string, options: QueueOptions = {}): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    // 合并选项
    const queueOptions = utils.object.deepMerge(
      {},
      this.defaultOptions,
      options
    ) as QueueOptions;

    // 创建队列实例
    const queue = new Queue(name, this.driver, queueOptions);
    this.queues.set(name, queue);

    return queue;
  }

  /**
   * 获取队列实例
   * @param name 队列名称
   * @returns 队列实例
   * @throws 如果队列不存在
   */
  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      throw new Error(`Queue "${name}" does not exist`);
    }

    return this.queues.get(name)!;
  }

  /**
   * 检查队列是否存在
   * @param name 队列名称
   * @returns 是否存在
   */
  hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  /**
   * 获取所有队列实例
   * @returns 队列实例数组
   */
  getAllQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  /**
   * 获取所有队列名称
   * @returns 队列名称数组
   */
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * 移除队列
   * @param name 队列名称
   * @returns 是否成功移除
   */
  async removeQueue(name: string): Promise<boolean> {
    if (!this.queues.has(name)) {
      return false;
    }

    const queue = this.queues.get(name)!;
    await queue.close();
    this.queues.delete(name);

    return true;
  }

  /**
   * 获取队列状态
   * @param name 队列名称
   * @returns 队列状态
   */
  async getQueueStatus(name: string): Promise<QueueStatus> {
    const queue = this.getQueue(name);
    return await queue.getStatus();
  }

  /**
   * 关闭所有队列
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) =>
      queue.close().catch((err) => {
        console.error(`关闭队列 ${queue.name} 时出错:`, err);
        return Promise.resolve();
      })
    );

    await Promise.all(closePromises);
    this.queues.clear();

    try {
      await this.driver.close();
    } catch (error) {
      console.error('关闭队列驱动时出错:', error);
    }
  }

  /**
   * 优雅关闭
   * 等待活动任务完成后关闭
   * @param timeout 超时时间（毫秒）
   */
  async gracefulShutdown(timeout: number = 15000): Promise<void> {
    // 暂停所有队列
    const pausePromises = Array.from(this.queues.values()).map((queue) =>
      queue.pause().catch(() => Promise.resolve())
    );
    await Promise.all(pausePromises);

    // 创建超时Promise
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), timeout);
    });

    // 等待所有活动任务完成或超时
    await Promise.race([
      Promise.all(
        Array.from(this.queues.values()).map((queue) =>
          queue.waitUntilIdle().catch(() => Promise.resolve())
        )
      ),
      timeoutPromise
    ]);

    // 关闭所有队列
    await this.closeAll();
  }

  /**
   * 检查队列健康状态
   * @returns 健康状态信息
   */
  async checkHealth(): Promise<QueueHealth> {
    const driverHealth = await this.driver.checkHealth();

    const queuesHealth = {} as Record<string, boolean>;
    for (const [name, queue] of this.queues.entries()) {
      try {
        const status = await queue.getStatus();
        queuesHealth[name] = true;
      } catch (error) {
        queuesHealth[name] = false;
      }
    }

    return {
      driver: driverHealth,
      queues: queuesHealth,
      healthy: driverHealth && Object.values(queuesHealth).every(Boolean)
    };
  }
}
