/**
 * 记忆化工具函数
 */
import type { AnyFunction, MemoCache, MemoOptions } from './types.js';

/**
 * 默认的内存缓存实现
 */
class DefaultMemoCache<K, V> implements MemoCache<K, V> {
  private readonly cache = new Map<K, V>();
  private readonly accessOrder = new Map<K, number>();
  private accessCounter = 0;

  constructor(
    private readonly maxSize: number = 1000,
    private readonly ttl?: number
  ) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.accessOrder.set(key, ++this.accessCounter);
    }
    return value;
  }

  set(key: K, value: V): void {
    // 如果缓存已满，删除最少使用的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastUsed();
    }

    this.cache.set(key, value);
    this.accessOrder.set(key, ++this.accessCounter);

    // 如果设置了TTL，在指定时间后删除
    if (this.ttl) {
      setTimeout(() => {
        this.delete(key);
      }, this.ttl);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  private evictLeastUsed(): void {
    let leastUsedKey: K | undefined;
    let leastAccessTime = Infinity;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < leastAccessTime) {
        leastAccessTime = accessTime;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey !== undefined) {
      this.delete(leastUsedKey);
    }
  }
}

/**
 * 默认的键生成器
 */
const defaultKeyGenerator = (...args: any[]): string => {
  return JSON.stringify(args);
};

/**
 * 记忆化函数
 * 缓存函数的执行结果，相同参数的调用直接返回缓存结果
 */
export const memo = <T extends AnyFunction>(
  fn: T,
  options: MemoOptions<Parameters<T>> = {}
): T => {
  const {
    cache = new DefaultMemoCache<string, any>(options.maxSize, options.ttl),
    keyGenerator = defaultKeyGenerator,
    maxSize = 1000,
    ttl
  } = options;

  const memoizedFn = ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;

  // 添加缓存管理方法
  (memoizedFn as any).cache = cache;
  (memoizedFn as any).clearCache = () => {
    cache.clear();
  };
  (memoizedFn as any).deleteFromCache = (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    return cache.delete(key);
  };

  return memoizedFn;
};

/**
 * 异步函数记忆化
 */
export const memoAsync = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: MemoOptions<Parameters<T>> = {}
): T => {
  const {
    cache = new DefaultMemoCache<string, any>(options.maxSize, options.ttl),
    keyGenerator = defaultKeyGenerator
  } = options;

  const memoizedFn = (async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> => {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    try {
      const result = await fn(...args);
      cache.set(key, result);
      return result;
    } catch (error) {
      // 不缓存错误结果
      throw error;
    }
  }) as T;

  // 添加缓存管理方法
  (memoizedFn as any).cache = cache;
  (memoizedFn as any).clearCache = () => {
    cache.clear();
  };
  (memoizedFn as any).deleteFromCache = (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    return cache.delete(key);
  };

  return memoizedFn;
};

/**
 * 弱记忆化 - 使用WeakMap，当对象被垃圾回收时自动清理缓存
 */
export const memoWeak = <T extends (obj: object, ...args: any[]) => any>(
  fn: T
): T => {
  const cache = new WeakMap<object, Map<string, any>>();

  return ((obj: object, ...args: any[]): ReturnType<T> => {
    if (!cache.has(obj)) {
      cache.set(obj, new Map());
    }

    const objCache = cache.get(obj)!;
    const key = JSON.stringify(args);

    if (objCache.has(key)) {
      return objCache.get(key);
    }

    const result = fn(obj, ...args);
    objCache.set(key, result);
    return result;
  }) as T;
};

/**
 * 条件记忆化 - 只在满足条件时缓存结果
 */
export const memoIf = <T extends AnyFunction>(
  fn: T,
  condition: (...args: Parameters<T>) => boolean,
  options: MemoOptions<Parameters<T>> = {}
): T => {
  const {
    cache = new DefaultMemoCache<string, any>(options.maxSize, options.ttl),
    keyGenerator = defaultKeyGenerator
  } = options;

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);

    // 只在满足条件时缓存
    if (condition(...args)) {
      cache.set(key, result);
    }

    return result;
  }) as T;
};
