import { CacheEntry, CacheLock } from '../types/cache.js';
import { CacheDriver, MemoryCacheOptions } from '../types/driver.js';

/**
 * 内存缓存锁实现
 */
class MemoryCacheLock implements CacheLock {
  private released: boolean = false;
  private readonly key: string;
  private readonly driver: MemoryCacheDriver;

  constructor(key: string, driver: MemoryCacheDriver) {
    this.key = key;
    this.driver = driver;
  }

  /**
   * 释放锁
   * @returns 是否成功释放
   */
  async unlock(): Promise<boolean> {
    if (this.released) {
      return false;
    }
    this.released = true;
    return this.driver.delete(this.key);
  }
}

/**
 * 基于内存的缓存驱动实现
 */
export class MemoryCacheDriver implements CacheDriver {
  private cache: Map<string, CacheEntry<any>>;
  private readonly ttl: number;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly tags: Map<string, Set<string>>;
  private readonly stats: {
    hits: number;
    misses: number;
    operations: {
      get: number;
      set: number;
      delete: number;
    };
  };

  /**
   * 创建内存缓存驱动实例
   * @param options 内存缓存选项
   */
  constructor(options: MemoryCacheOptions = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 60000; // 默认1分钟
    this.tags = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      operations: {
        get: 0,
        set: 0,
        delete: 0
      }
    };

    // 设置定期清理过期项的定时器
    if (options.cleanupInterval !== 0) {
      const interval = options.cleanupInterval || 60000; // 默认1分钟
      this.cleanupTimer = setInterval(() => this.cleanup(), interval);
      // 防止定时器阻止进程退出
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * 关闭缓存驱动，清理资源
   */
  close(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或null（如果不存在或已过期）
   */
  async get<T = any>(key: string): Promise<T | null> {
    this.stats.operations.get++;
    const entry = await this.getEntry<T>(key);

    if (entry !== null) {
      this.stats.hits++;
      return entry.value;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * 获取原始缓存条目（包含值和过期时间）
   * @param key 缓存键
   * @returns 缓存条目或null
   */
  async getEntry<T = any>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），0表示永不过期
   * @returns 操作是否成功
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    this.stats.operations.set++;

    const expiresAt =
      ttl === 0 ? null : Date.now() + (ttl !== undefined ? ttl : this.ttl);

    this.cache.set(key, { value, expiresAt });
    return true;
  }

  /**
   * 检查缓存键是否存在
   * @param key 缓存键
   * @returns 是否存在且未过期
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.getEntry(key);
    return entry !== null;
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  async delete(key: string): Promise<boolean> {
    this.stats.operations.delete++;

    // 从所有标签中移除键
    for (const [tagName, keys] of this.tags.entries()) {
      if (keys.has(key)) {
        keys.delete(key);
      }
    }

    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   * @returns 是否成功清空
   */
  async clear(): Promise<boolean> {
    this.cache.clear();
    this.tags.clear();
    return true;
  }

  /**
   * 批量获取缓存项
   * @param keys 缓存键数组
   * @returns 缓存值数组，对应位置无值则为null
   */
  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    const promises = keys.map((key) => this.get<T>(key));
    return Promise.all(promises);
  }

  /**
   * 批量设置缓存项
   * @param entries 键值对对象
   * @param ttl 统一的过期时间
   * @returns 是否全部设置成功
   */
  async mset(entries: Record<string, any>, ttl?: number): Promise<boolean> {
    const promises = Object.entries(entries).map(([key, value]) =>
      this.set(key, value, ttl)
    );

    const results = await Promise.all(promises);
    return results.every((result) => result === true);
  }

  /**
   * 批量删除缓存项
   * @param keys 缓存键数组
   * @returns 成功删除的数量
   */
  async mdelete(keys: string[]): Promise<number> {
    let count = 0;

    for (const key of keys) {
      if (await this.delete(key)) {
        count++;
      }
    }

    return count;
  }

  /**
   * 增加数值
   * @param key 缓存键
   * @param value 增加的值，默认为1
   * @returns 增加后的值
   */
  async increment(key: string, value: number = 1): Promise<number> {
    const entry = await this.getEntry<number>(key);
    const currentValue = entry ? entry.value : 0;
    const newValue = currentValue + value;

    await this.set(
      key,
      newValue,
      entry ? this.getRemainingTtl(entry) : undefined
    );
    return newValue;
  }

  /**
   * 减少数值
   * @param key 缓存键
   * @param value 减少的值，默认为1
   * @returns 减少后的值
   */
  async decrement(key: string, value: number = 1): Promise<number> {
    return this.increment(key, -value);
  }

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  async keys(): Promise<string[]> {
    // 清理过期项后返回键
    await this.cleanup();
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存项数量
   * @returns 缓存项数量
   */
  async size(): Promise<number> {
    // 清理过期项后返回大小
    await this.cleanup();
    return this.cache.size;
  }

  /**
   * 尝试获取分布式锁
   * @param key 锁键名
   * @param ttl 锁超时时间
   * @returns 锁对象或null（获取失败）
   */
  async lock(key: string, ttl: number = 5000): Promise<CacheLock | null> {
    const lockKey = `lock:${key}`;

    // 如果锁已存在，获取失败
    if (await this.has(lockKey)) {
      return null;
    }

    // 设置锁
    await this.set(lockKey, true, ttl);
    return new MemoryCacheLock(lockKey, this);
  }

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param ttl 过期时间（毫秒）
   * @returns 是否设置成功
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const entry = await this.getEntry(key);

    if (!entry) {
      return false;
    }

    const expiresAt = ttl === 0 ? null : Date.now() + ttl;
    this.cache.set(key, { ...entry, expiresAt });

    return true;
  }

  /**
   * 为缓存键添加标签
   * @param tag 标签名
   * @param keys 缓存键数组
   * @returns 是否成功添加
   */
  async tagKeys(tag: string, keys: string[]): Promise<boolean> {
    const tagSet = this.tags.get(tag) || new Set<string>();

    for (const key of keys) {
      if (await this.has(key)) {
        tagSet.add(key);
      }
    }

    this.tags.set(tag, tagSet);
    return true;
  }

  /**
   * 获取标签下的所有缓存键
   * @param tag 标签名
   * @returns 缓存键数组
   */
  async getKeysByTag(tag: string): Promise<string[]> {
    const tagSet = this.tags.get(tag);

    if (!tagSet) {
      return [];
    }

    // 过滤出仍然存在的键
    const existingKeys: string[] = [];
    for (const key of tagSet) {
      if (await this.has(key)) {
        existingKeys.push(key);
      } else {
        tagSet.delete(key);
      }
    }

    return existingKeys;
  }

  /**
   * 使标签下的所有缓存项失效
   * @param tag 标签名
   * @returns 是否成功使所有项失效
   */
  async invalidateTag(tag: string): Promise<boolean> {
    const keys = await this.getKeysByTag(tag);

    if (keys.length === 0) {
      return true;
    }

    await this.mdelete(keys);
    this.tags.delete(tag);

    return true;
  }

  /**
   * 获取缓存统计信息
   * @returns 统计数据对象
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
    operations: {
      get: number;
      set: number;
      delete: number;
    };
  }> {
    return {
      ...this.stats,
      keys: this.cache.size
    };
  }

  /**
   * 清理所有过期的缓存项
   * @returns 清理的项数量
   */
  private async cleanup(): Promise<number> {
    let count = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt < now) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取缓存项剩余的TTL
   * @param entry 缓存条目
   * @returns 剩余毫秒数，如果永不过期则返回undefined
   */
  private getRemainingTtl(entry: CacheEntry<any>): number | undefined {
    if (entry.expiresAt === null) {
      return undefined;
    }

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }
}
