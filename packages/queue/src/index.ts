/**
 * @stratix/queue 包主入口
 * 提供队列功能的核心组件
 */

// 导出插件定义
export { createQueuePlugin, default as queuePlugin } from './plugin.js';

// 导出类型定义
export * from './types/index.js';

// 导出API具体实现类
export { createQueueManager } from './api/factory.js';
export { Job } from './api/job.js';
export { QueueManager } from './api/manager.js';
export { Queue } from './api/queue.js';

// 默认导出插件
export { default } from './plugin.js';
