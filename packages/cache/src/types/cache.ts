/**
 * 缓存条目接口
 * 包含值和过期时间信息
 */
export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number | null; // null表示永不过期
}

/**
 * 缓存统计信息接口
 */
export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  size?: number; // 可选，内存使用量（字节）
  operations: {
    get: number;
    set: number;
    delete: number;
  };
}

/**
 * 缓存事件类型
 */
export enum CacheEventType {
  HIT = 'hit',
  MISS = 'miss',
  SET = 'set',
  DELETE = 'delete',
  EXPIRE = 'expire',
  CLEAR = 'clear',
  ERROR = 'error'
}

/**
 * 缓存事件接口
 */
export interface CacheEvent {
  type: CacheEventType;
  key?: string;
  keys?: string[];
  value?: any;
  error?: Error;
  timestamp: number;
}

/**
 * 缓存锁接口
 */
export interface CacheLock {
  unlock(): Promise<boolean>;
}

/**
 * 缓存驱动类型
 */
export type CacheDriverType = 'memory' | 'redis' | 'null' | string;

/**
 * 缓存策略类型
 */
export type CacheStrategyType = 'lru' | 'fifo' | 'lfu' | string;

/**
 * 序列化器类型
 */
export type CacheSerializerType = 'json' | 'msgpack' | string;

/**
 * 缓存命名空间接口
 */
export interface CacheNamespace {
  name: string;
  keys: Set<string>;
}

/**
 * 缓存标签接口
 */
export interface CacheTag {
  name: string;
  keys: Set<string>;
}
