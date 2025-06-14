/**
 * @stratix/queue-api 声明式插件
 * 提供队列管理的 REST API 接口
 */

import type { StratixPlugin } from '@stratix/core';
import type { QueueApiConfig } from './config.js';

// 导入处理器

/**
 * Queue API 声明式插件
 */
export const queueApiPlugin: StratixPlugin<QueueApiConfig> = {
  name: '@stratix/queue-api',
  version: '1.0.0',
  description: 'Queue management REST API plugin',

  defaultOptions: {
    prefix: '/api/queue',
    healthCheck: true,
    healthCheckPath: '/health',
    queueManagement: true,
    jobManagement: true,
    cacheManagement: true,
    version: 'v1'
  },

  // 路由定义
  routes: []
};

export default queueApiPlugin;
