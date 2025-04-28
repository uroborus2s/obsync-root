import { CacheEntry, CacheLock } from '../types/cache.js';
import { CacheDriver } from '../types/driver.js';

/**
 * 空缓存锁实现
 */
class NullCacheLock implements CacheLock {
  /**
   * 释放锁
   * @returns 始终返回true
   */
  async unlock(): Promise<boolean> {
    return true;
  }
}

/**
 * 空缓存驱动实现
 * 不会真正存储任何数据，用于测试或禁用缓存
 */
export class NullCacheDriver implements CacheDriver {
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
   * 创建空缓存驱动实例
   */
  constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      operations: {
        get: 0,
        set: 0,
        delete: 0
      }
    };
  }

  /**
   * 获取缓存项
   * @returns 始终返回null
   */
  async get<T = any>(): Promise<T | null> {
    this.stats.operations.get++;
    this.stats.misses++;
    return null;
  }

  /**
   * 获取原始缓存条目
   * @returns 始终返回null
   */
  async getEntry<T = any>(): Promise<CacheEntry<T> | null> {
    return null;
  }

  /**
   * 设置缓存项
   * @returns 始终返回true
   */
  async set<T = any>(): Promise<boolean> {
    this.stats.operations.set++;
    return true;
  }

  /**
   * 检查缓存键是否存在
   * @returns 始终返回false
   */
  async has(): Promise<boolean> {
    return false;
  }

  /**
   * 删除缓存项
   * @returns 始终返回true
   */
  async delete(): Promise<boolean> {
    this.stats.operations.delete++;
    return true;
  }

  /**
   * 清空所有缓存
   * @returns 始终返回true
   */
  async clear(): Promise<boolean> {
    return true;
  }

  /**
   * 批量获取缓存项
   * @param keys 缓存键数组
   * @returns 全为null的数组
   */
  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    this.stats.operations.get += keys.length;
    this.stats.misses += keys.length;
    return keys.map(() => null);
  }

  /**
   * 批量设置缓存项
   * @returns 始终返回true
   */
  async mset(): Promise<boolean> {
    return true;
  }

  /**
   * 批量删除缓存项
   * @param keys 缓存键数组
   * @returns 始终返回键数组长度
   */
  async mdelete(keys: string[]): Promise<number> {
    return keys.length;
  }

  /**
   * 增加数值
   * @param key 缓存键（未使用）
   * @param value 增加的值，默认为1
   * @returns 始终返回传入的值
   */
  async increment(_key: string, value: number = 1): Promise<number> {
    return value;
  }

  /**
   * 减少数值
   * @param key 缓存键（未使用）
   * @param value 减少的值，默认为1
   * @returns 始终返回传入值的负数
   */
  async decrement(_key: string, value: number = 1): Promise<number> {
    return -value;
  }

  /**
   * 获取所有缓存键
   * @returns 始终返回空数组
   */
  async keys(): Promise<string[]> {
    return [];
  }

  /**
   * 获取缓存项数量
   * @returns 始终返回0
   */
  async size(): Promise<number> {
    return 0;
  }

  /**
   * 尝试获取分布式锁
   * @returns 始终返回新的锁实例
   */
  async lock(): Promise<CacheLock | null> {
    return new NullCacheLock();
  }

  /**
   * 设置缓存过期时间
   * @returns 始终返回true
   */
  async expire(): Promise<boolean> {
    return true;
  }

  /**
   * 为缓存键添加标签
   * @returns 始终返回true
   */
  async tagKeys(): Promise<boolean> {
    return true;
  }

  /**
   * 获取标签下的所有缓存键
   * @returns 始终返回空数组
   */
  async getKeysByTag(): Promise<string[]> {
    return [];
  }

  /**
   * 使标签下的所有缓存项失效
   * @returns 始终返回true
   */
  async invalidateTag(): Promise<boolean> {
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
      keys: 0
    };
  }
}
