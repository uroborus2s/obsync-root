/**
 * @stratix/queue API工厂函数
 * 提供创建队列管理器的工厂函数
 */

import type { QueueManagerOptions } from '../types/index.js';
import { QueueManager } from './manager.js';

/**
 * 创建队列管理器
 * @param options 队列管理器配置选项
 * @returns 队列管理器实例
 */
export function createQueueManager(
  options: QueueManagerOptions = {}
): QueueManager {
  const manager = new QueueManager(options);

  // 初始化队列管理器
  void manager.init().catch((error) => {
    console.error('初始化队列管理器失败:', error);
  });

  return manager;
}
