/**
 * @stratix/queue 插件定义
 */

import * as utils from '@stratix/utils';
import { createQueueManager } from './api/factory.js';
import { DEFAULT_QUEUE_OPTIONS, QueuePluginOptions } from './types/index.js';

/**
 * 队列插件注册函数
 *
 * @param app Stratix应用实例
 * @param options 插件配置选项
 */
export async function register(
  app: any,
  options: QueuePluginOptions = {}
): Promise<void> {
  // 合并配置选项
  const config = utils.object.deepMerge(
    {},
    DEFAULT_QUEUE_OPTIONS,
    options
  ) as QueuePluginOptions;

  // 获取应用名称作为默认前缀
  if (!config.prefix && app.name) {
    config.prefix = `${app.name}:`;
  }

  // 如果使用现有Redis连接
  if (
    config.useExistingRedis &&
    app.hasPlugin &&
    app.hasPlugin('cache') &&
    app.cache
  ) {
    try {
      // 尝试从缓存插件获取Redis连接
      const cachePlugin = app.cache;
      const redisClient =
        (cachePlugin as any)._driver?.client || (cachePlugin as any).client;

      if (redisClient) {
        // 使用缓存插件的Redis连接
        if (config.bullmq) {
          config.bullmq.connection = redisClient;
        } else {
          config.bullmq = { connection: redisClient };
        }

        if (app.log && app.log.debug) {
          app.log.debug(
            'Queue plugin using existing Redis connection from cache plugin'
          );
        }
      }
    } catch (error) {
      if (app.log && app.log.error) {
        app.log.error(
          'Failed to use existing Redis connection, fallback to new connection',
          error
        );
      } else {
        console.error(
          'Failed to use existing Redis connection, fallback to new connection',
          error
        );
      }
    }
  }

  // 创建队列管理器
  const queueManager = createQueueManager({
    driver: config.driver,
    prefix: config.prefix,
    defaultJobOptions: config.defaultJobOptions,
    driverOptions: config.driver === 'memory' ? config.memory : config.redis,
    processor: config.processor,
    events: config.events,
    bullmq: config.bullmq
  });

  // 注册预定义的队列
  if (config.queues) {
    for (const [name, queueConfig] of Object.entries(config.queues)) {
      const queue = queueManager.createQueue(name, {
        concurrency: queueConfig.concurrency,
        ...queueConfig.options
      });

      // 注册处理器
      if (queueConfig.processors) {
        // 将处理器对象转换为适当的类型
        const processorsMap: Record<string, (job: any) => any> = {};

        // 遍历处理器并确保它们符合预期格式
        for (const [key, processor] of Object.entries(queueConfig.processors)) {
          if (typeof processor === 'function') {
            processorsMap[key] = processor;
          }
        }

        queue.process(processorsMap);
      }
    }
  }

  // 注册到应用实例
  app.decorate('queue', queueManager);

  // 如果应用有容器，注册为服务
  if (app.container) {
    app.container.registerInstance('queue', queueManager);
    app.container.registerValue('QueueManager', queueManager);
  }

  // 注册关闭钩子
  if (app.hook) {
    app.hook.register('beforeExit', async () => {
      try {
        // 关闭所有队列连接
        await queueManager.closeAll();
      } catch (error) {
        if (app.log && app.log.error) {
          app.log.error('关闭队列连接时出错:', error);
        } else {
          console.error('关闭队列连接时出错:', error);
        }
      }
    });
  }

  if (app.log && app.log.debug) {
    app.log.debug('Queue plugin registered');
  }
}

/**
 * 队列插件定义
 */
const queuePlugin = {
  name: 'queue',
  dependencies: ['core'],
  optionalDependencies: ['logger', 'container', 'cache'],
  register,

  /**
   * 配置验证Schema
   */
  schema: {
    type: 'object',
    properties: {
      driver: { type: 'string', enum: ['bullmq', 'memory'] },
      prefix: { type: 'string' },
      defaultQueue: { type: 'string' },
      useExistingRedis: { type: 'boolean' },
      debug: { type: 'boolean' },

      defaultJobOptions: {
        type: 'object',
        properties: {
          attempts: { type: 'number', minimum: 1 },
          backoff: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['fixed', 'exponential'] },
              delay: { type: 'number', minimum: 0 }
            }
          },
          timeout: { type: 'number', minimum: 0 },
          removeOnComplete: { type: ['boolean', 'number'] },
          removeOnFail: { type: ['boolean', 'number'] }
        }
      },

      redis: {
        type: 'object',
        properties: {
          host: { type: 'string' },
          port: { type: 'number' },
          password: { type: 'string' },
          db: { type: 'number' },
          tls: { type: ['boolean', 'object'] }
        }
      },

      bullmq: {
        type: 'object'
      },

      memory: {
        type: 'object',
        properties: {
          maxJobs: { type: 'number', minimum: 1 },
          persistence: { type: 'boolean' },
          persistenceInterval: { type: 'number', minimum: 1000 }
        }
      },

      processor: {
        type: 'object',
        properties: {
          concurrency: { type: 'number', minimum: 1 },
          sandboxed: { type: 'boolean' },
          maxSandboxes: { type: 'number', minimum: 1 }
        }
      },

      events: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          global: { type: 'boolean' },
          log: { type: 'boolean' }
        }
      },

      queues: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            concurrency: { type: 'number', minimum: 1 },
            options: { type: 'object' },
            processors: { type: 'object' }
          }
        }
      }
    }
  }
};

export default queuePlugin;

/**
 * 创建自定义队列插件实例
 * @param factoryOptions 工厂配置选项
 */
export function createQueuePlugin(factoryOptions: QueuePluginOptions = {}) {
  return {
    ...queuePlugin,
    register: async (app: any, options: QueuePluginOptions = {}) => {
      // 合并工厂选项和注册选项
      const mergedOptions = utils.object.deepMerge(
        {},
        factoryOptions,
        options
      ) as QueuePluginOptions;

      await register(app, mergedOptions);
    }
  };
}
