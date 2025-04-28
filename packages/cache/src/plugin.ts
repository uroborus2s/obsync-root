import { createCacheAPI } from './api/factory.js';
import { CachePluginOptions, DEFAULT_CACHE_OPTIONS } from './types/plugin.js';

// 简单的对象合并函数，用于替代@stratix/utils的object.merge
function merge<T extends Record<string, any>>(target: T, ...sources: any[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        merge(target[key] as Record<string, any>, source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return merge(target, ...sources);
}

// 检查是否为对象
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 缓存插件注册函数
 *
 * @param app Stratix应用实例
 * @param options 插件配置选项
 */
export async function register(
  app: any,
  options: CachePluginOptions = {}
): Promise<void> {
  // 合并配置选项
  const config = merge(
    {} as CachePluginOptions,
    DEFAULT_CACHE_OPTIONS,
    options
  );

  // 根据配置创建缓存驱动选项
  const driverOptions =
    config.driver === 'memory'
      ? config.memory
      : config.driver === 'redis'
        ? config.redis
        : {};

  // 创建缓存API实例
  const cache = createCacheAPI({
    driver: config.driver,
    prefix: config.prefix,
    ttl: config.ttl,
    driverOptions,
    lockTimeout: config.advanced?.lockTimeout,
    lockRetryCount: config.advanced?.lockRetryCount,
    lockRetryDelay: config.advanced?.lockRetryDelay
  });

  // 注册到应用实例中
  app.decorate('cache', cache);

  // 如果应用有容器，注册为服务
  if (app.container) {
    app.container.registerInstance('cache', cache);
    app.container.registerValue('CacheAPI', cache);
  }

  // 注册钩子，在应用退出前关闭缓存连接
  if (app.hook) {
    app.hook.register('beforeExit', async () => {
      try {
        // 尝试调用close方法（如果存在）
        const anyCache = cache as any;
        if (anyCache.close && typeof anyCache.close === 'function') {
          await anyCache.close();
        }
      } catch (error) {
        console.error('关闭缓存连接时出错:', error);
      }
    });
  }

  if (app.log && app.log.debug) {
    app.log.debug('Cache plugin registered');
  }
}

/**
 * 缓存插件定义
 */
const cachePlugin = {
  name: 'cache',
  dependencies: ['core'],
  optionalDependencies: ['logger', 'container'],
  register,

  /**
   * 预置配置验证Schema
   */
  schema: {
    type: 'object',
    properties: {
      driver: { type: 'string', enum: ['memory', 'redis', 'null'] },
      prefix: { type: 'string' },
      ttl: { type: 'number', minimum: 0 },
      serializer: { type: 'string', enum: ['json', 'msgpack'] },

      memory: {
        type: 'object',
        properties: {
          max: { type: 'number', minimum: 1 },
          maxSize: { type: 'number', minimum: 1 },
          strategy: { type: 'string', enum: ['lru', 'fifo', 'lfu'] },
          ttl: { type: 'number', minimum: 0 },
          cleanupInterval: { type: ['number', 'null'] }
        }
      },

      redis: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          host: { type: 'string' },
          port: { type: 'number' },
          password: { type: 'string' },
          db: { type: 'number' },
          keyPrefix: { type: 'string' },
          ttl: { type: 'number', minimum: 0 },
          cluster: { type: 'object' },
          sentinels: { type: 'array' }
        }
      },

      events: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          emitHitMiss: { type: 'boolean' },
          emitExpire: { type: 'boolean' },
          emitError: { type: 'boolean' },
          cacheStats: { type: 'boolean' }
        }
      },

      advanced: {
        type: 'object',
        properties: {
          lockTimeout: { type: 'number', minimum: 0 },
          lockRetryCount: { type: 'number', minimum: 0 },
          lockRetryDelay: { type: 'number', minimum: 0 },
          staleWhileRevalidate: { type: 'boolean' },
          staleIfError: { type: 'boolean' },
          stampedeLock: { type: 'boolean' }
        }
      }
    }
  }
};

export default cachePlugin;

/**
 * 工厂函数，用于创建带有自定义选项的插件实例
 * @param factoryOptions 工厂配置选项
 */
export function createCachePlugin(factoryOptions: CachePluginOptions = {}) {
  return {
    ...cachePlugin,
    register: async (app: any, options: CachePluginOptions = {}) => {
      // 合并工厂选项和注册选项
      const mergedOptions = merge(
        {} as CachePluginOptions,
        factoryOptions,
        options
      );
      await register(app, mergedOptions);
    }
  };
}
