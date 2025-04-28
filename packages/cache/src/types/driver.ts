import { CacheEntry, CacheLock, CacheStats } from './cache.js';

/**
 * 缓存驱动接口
 * 定义所有缓存驱动必须实现的方法
 */
export interface CacheDriver {
  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或null（如果不存在或已过期）
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），0表示永不过期
   * @returns 操作是否成功
   */
  set<T = any>(key: string, value: T, ttl?: number): Promise<boolean>;

  /**
   * 检查缓存键是否存在
   * @param key 缓存键
   * @returns 是否存在且未过期
   */
  has(key: string): Promise<boolean>;

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: string): Promise<boolean>;

  /**
   * 清空所有缓存
   * @returns 是否成功清空
   */
  clear(): Promise<boolean>;

  /**
   * 批量获取缓存项
   * @param keys 缓存键数组
   * @returns 缓存值数组，对应位置无值则为null
   */
  mget<T = any>(keys: string[]): Promise<Array<T | null>>;

  /**
   * 批量设置缓存项
   * @param entries 键值对对象
   * @param ttl 统一的过期时间
   * @returns 是否全部设置成功
   */
  mset(entries: Record<string, any>, ttl?: number): Promise<boolean>;

  /**
   * 批量删除缓存项
   * @param keys 缓存键数组
   * @returns 成功删除的数量
   */
  mdelete(keys: string[]): Promise<number>;

  /**
   * 增加数值
   * @param key 缓存键
   * @param value 增加的值，默认为1
   * @returns 增加后的值
   */
  increment(key: string, value?: number): Promise<number>;

  /**
   * 减少数值
   * @param key 缓存键
   * @param value 减少的值，默认为1
   * @returns 减少后的值
   */
  decrement(key: string, value?: number): Promise<number>;

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  keys(): Promise<string[]>;

  /**
   * 获取缓存项数量
   * @returns 缓存项数量
   */
  size(): Promise<number>;

  /**
   * 尝试获取分布式锁
   * @param key 锁键名
   * @param ttl 锁超时时间
   * @returns 锁对象或null（获取失败）
   */
  lock(key: string, ttl?: number): Promise<CacheLock | null>;

  /**
   * 获取原始缓存条目（包含值和过期时间）
   * @param key 缓存键
   * @returns 缓存条目或null
   */
  getEntry<T = any>(key: string): Promise<CacheEntry<T> | null>;

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param ttl 过期时间（毫秒）
   * @returns 是否设置成功
   */
  expire(key: string, ttl: number): Promise<boolean>;

  /**
   * 为缓存键添加标签
   * @param tag 标签名
   * @param keys 缓存键数组
   * @returns 是否成功添加
   */
  tagKeys(tag: string, keys: string[]): Promise<boolean>;

  /**
   * 获取标签下的所有缓存键
   * @param tag 标签名
   * @returns 缓存键数组
   */
  getKeysByTag(tag: string): Promise<string[]>;

  /**
   * 使标签下的所有缓存项失效
   * @param tag 标签名
   * @returns 是否成功使所有项失效
   */
  invalidateTag(tag: string): Promise<boolean>;

  /**
   * 获取缓存统计信息
   * @returns 统计数据对象
   */
  getStats(): Promise<CacheStats>;
}

/**
 * 内存缓存驱动选项
 */
export interface MemoryCacheOptions {
  max?: number; // 最大缓存项数量
  maxSize?: number; // 最大内存使用量（字节）
  strategy?: 'lru' | 'fifo' | 'lfu'; // 缓存替换策略
  ttl?: number; // 默认过期时间
  cleanupInterval?: number; // 过期项清理间隔
}

/**
 * Redis缓存驱动选项
 */
export interface RedisCacheOptions {
  url?: string; // Redis连接URL
  host?: string; // Redis主机
  port?: number; // Redis端口
  password?: string; // Redis密码
  db?: number; // Redis数据库索引
  keyPrefix?: string; // Redis键前缀
  ttl?: number; // 默认过期时间
  cluster?: {
    // Redis集群配置
    nodes: Array<{ host: string; port: number }>;
  };
  sentinels?: Array<{ host: string; port: number }>; // Redis Sentinel配置
  sentinelName?: string; // Redis Sentinel主节点名称
  maxRetriesPerRequest?: number; // 每个请求的最大重试次数
  connectTimeout?: number; // 连接超时（毫秒）
}
