import { CacheLock } from '../types/cache.js';
import { CacheDriver } from '../types/driver.js';
import { KeyBuilder } from './key-builder.js';

/**
 * 锁管理器
 * 用于处理基于缓存的分布式锁
 */
export class LockManager {
  private readonly driver: CacheDriver;
  private readonly keyBuilder: KeyBuilder;
  private readonly options: {
    timeout: number;
    retryCount: number;
    retryDelay: number;
  };

  /**
   * 创建锁管理器实例
   * @param driver 缓存驱动
   * @param keyBuilder 键生成器
   * @param options 锁选项
   */
  constructor(
    driver: CacheDriver,
    keyBuilder: KeyBuilder,
    options: {
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
    } = {}
  ) {
    this.driver = driver;
    this.keyBuilder = keyBuilder;
    this.options = {
      timeout: options.timeout || 5000, // 默认锁超时5秒
      retryCount: options.retryCount || 3, // 默认重试3次
      retryDelay: options.retryDelay || 200 // 默认重试延迟200毫秒
    };
  }

  /**
   * 尝试获取锁
   * @param key 锁键
   * @param ttl 锁超时时间
   * @returns 锁对象或null（获取失败）
   */
  async acquire(
    key: string,
    ttl: number = this.options.timeout
  ): Promise<CacheLock | null> {
    const lockKey = this.keyBuilder.buildLockKey(key);
    return this.driver.lock(lockKey, ttl);
  }

  /**
   * 尝试获取锁，如果失败则重试
   * @param key 锁键
   * @param ttl 锁超时时间
   * @returns 锁对象或null（所有重试都失败）
   */
  async acquireWithRetry(
    key: string,
    ttl: number = this.options.timeout
  ): Promise<CacheLock | null> {
    const lockKey = this.keyBuilder.buildLockKey(key);

    // 首次尝试获取锁
    let lock = await this.driver.lock(lockKey, ttl);
    if (lock) {
      return lock;
    }

    // 如果失败，按配置进行重试
    let retries = 0;
    while (retries < this.options.retryCount) {
      // 等待一段时间后重试
      await this.delay(this.options.retryDelay);

      lock = await this.driver.lock(lockKey, ttl);
      if (lock) {
        return lock;
      }

      retries++;
    }

    return null;
  }

  /**
   * 在锁保护下执行函数
   * @param key 锁键
   * @param fn 要执行的函数
   * @param ttl 锁超时时间
   * @returns 函数执行结果
   * @throws 如果无法获取锁则抛出错误
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T> | T,
    ttl: number = this.options.timeout
  ): Promise<T> {
    const lock = await this.acquireWithRetry(key, ttl);

    if (!lock) {
      throw new Error(`无法获取锁: ${key}`);
    }

    try {
      // 执行函数
      return await fn();
    } finally {
      // 释放锁
      await lock.unlock();
    }
  }

  /**
   * 延迟执行
   * @param ms 延迟毫秒数
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
