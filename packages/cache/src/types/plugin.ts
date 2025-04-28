import { CacheDriverType, CacheSerializerType } from './cache.js';
import { MemoryCacheOptions, RedisCacheOptions } from './driver.js';

/**
 * 缓存插件配置选项
 */
export interface CachePluginOptions {
  // 缓存驱动配置
  driver?: CacheDriverType; // 缓存驱动类型，默认为 'memory'

  // 通用配置
  prefix?: string; // 缓存键前缀
  ttl?: number; // 默认过期时间（毫秒），0 表示永不过期
  serializer?: CacheSerializerType; // 序列化方式，默认为 'json'

  // 内存缓存配置
  memory?: MemoryCacheOptions;

  // Redis 缓存配置
  redis?: RedisCacheOptions;

  // 事件与监控配置
  events?: {
    enabled?: boolean; // 是否启用事件
    emitHitMiss?: boolean; // 是否触发命中/未命中事件
    emitExpire?: boolean; // 是否触发过期事件
    emitError?: boolean; // 是否触发错误事件
    cacheStats?: boolean; // 是否收集缓存统计信息
  };

  // 高级特性配置
  advanced?: {
    lockTimeout?: number; // 缓存锁超时时间（毫秒）
    lockRetryCount?: number; // 锁重试次数
    lockRetryDelay?: number; // 锁重试延迟（毫秒）
    staleWhileRevalidate?: boolean; // 返回过期数据并在后台更新
    staleIfError?: boolean; // 出错时返回过期数据
    stampedeLock?: boolean; // 是否使用防击穿锁
  };
}

/**
 * 缓存插件默认配置
 */
export const DEFAULT_CACHE_OPTIONS: CachePluginOptions = {
  driver: 'memory',
  prefix: '',
  ttl: 60000, // 默认1分钟
  serializer: 'json',
  memory: {
    max: 1000,
    strategy: 'lru',
    cleanupInterval: 60000 // 默认1分钟清理一次
  },
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0
  },
  events: {
    enabled: true,
    emitHitMiss: true,
    emitExpire: true,
    emitError: true,
    cacheStats: true
  },
  advanced: {
    lockTimeout: 5000, // 默认锁超时5秒
    lockRetryCount: 3,
    lockRetryDelay: 200,
    staleWhileRevalidate: false,
    staleIfError: false,
    stampedeLock: false
  }
};
