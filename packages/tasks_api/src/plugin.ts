/**
 * @stratix/tasks-api 声明式插件
 * 提供任务管理系统的RESTful API接口
 */

import type { StratixPlugin } from '@stratix/core';
import type { TasksApiConfig } from './types/index.js';

// 导入处理器
import { healthCheck } from './handlers/health.js';
import { cleanupTasks, getExecutors, getStats } from './handlers/statistics.js';
import {
  pauseTask,
  resumeTask,
  startTask,
  stopTask
} from './handlers/task-control.js';
import {
  createTask,
  deleteTask,
  getTask,
  getTaskTree,
  updateTask
} from './handlers/task-management.js';

/**
 * Tasks API 声明式插件
 */
export const tasksApiPlugin: StratixPlugin<TasksApiConfig> = {
  name: '@stratix/tasks-api',
  version: '1.0.0',
  description: 'Task management REST API plugin',
  defaultOptions: {
    prefix: '/api/tasks',
    healthCheck: true,
    healthCheckPath: '/health',
    taskManagement: true,
    taskControl: true,
    statistics: true,
    version: 'v1'
  },

  // 通用路由定义
  routes: [
    // 更新任务 (PUT)
    {
      method: 'PUT',
      url: '/:id',
      handler: updateTask,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            executorConfig: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                params: { type: 'object' },
                timeout: { type: 'number' },
                retries: { type: 'number' },
                retryDelay: { type: 'number' }
              }
            },
            metadata: { type: 'object' }
          }
        }
      }
    }
  ],

  // GET 路由定义
  gets: [
    // 健康检查
    {
      url: '/health',
      handler: healthCheck,
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              service: { type: 'string' },
              taskManager: {
                type: 'object',
                properties: {
                  running: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    },
    // 查询任务列表
    {
      url: '/list',
      handler: healthCheck,
      schema: {}
    },
    // 获取任务树
    {
      url: '/tree',
      handler: getTaskTree,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            rootId: { type: 'string' }
          }
        }
      }
    },
    // 获取统计信息
    {
      url: '/stats',
      handler: getStats
    },
    // 获取已注册的执行器
    {
      url: '/executors',
      handler: getExecutors
    },
    // 获取任务
    {
      url: '/:id',
      handler: getTask,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        }
      }
    }
  ],

  // POST 路由定义
  posts: [
    // 创建任务
    {
      url: '/',
      handler: createTask,
      schema: {
        body: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            parentId: { type: 'string' },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['directory', 'leaf'] },
            executorConfig: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                params: { type: 'object' },
                timeout: { type: 'number' },
                retries: { type: 'number' },
                retryDelay: { type: 'number' }
              }
            },
            metadata: { type: 'object' }
          }
        }
      }
    },
    // 启动任务
    {
      url: '/:id/start',
      handler: startTask,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          properties: {
            cascade: { type: 'boolean' },
            force: { type: 'boolean' }
          }
        }
      }
    },
    // 暂停任务
    {
      url: '/:id/pause',
      handler: pauseTask,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          properties: {
            cascade: { type: 'boolean' },
            force: { type: 'boolean' }
          }
        }
      }
    },
    // 继续任务
    {
      url: '/:id/resume',
      handler: resumeTask,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          properties: {
            cascade: { type: 'boolean' },
            force: { type: 'boolean' }
          }
        }
      }
    },
    // 停止任务
    {
      url: '/:id/stop',
      handler: stopTask,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          properties: {
            cascade: { type: 'boolean' },
            force: { type: 'boolean' }
          }
        }
      }
    },
    // 清理任务
    {
      url: '/cleanup',
      handler: cleanupTasks,
      schema: {
        body: {
          type: 'object',
          properties: {
            olderThan: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  ],

  // DELETE 路由定义
  deletes: [
    // 删除任务
    {
      url: '/:id',
      handler: deleteTask,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            cascade: { type: 'boolean' },
            force: { type: 'boolean' }
          }
        }
      }
    }
  ]
};
