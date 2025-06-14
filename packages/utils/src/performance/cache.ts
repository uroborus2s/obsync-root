/**
 * 缓存相关工具函数，提供函数结果缓存功能
 *
 * 此模块提供了有助于提高性能的缓存机制，尤其是用于缓存异步函数结果，
 * 避免重复计算和网络请求，减少资源消耗和响应时间。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能优化
 *
 * @packageDocumentation
 */

/**
 * 缓存项接口
 *
 * @internal
 */
interface CacheItem<T> {
  /** 缓存的值 */
  value: T;
  /** 缓存创建的时间戳 */
  timestamp: number;
}

/**
 * 异步函数缓存选项接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @public
 */
export interface AsyncCacheOptions<T, A extends any[]> {
  /**
   * 缓存键生成函数
   *
   * 基于函数参数生成缓存键的函数
   *
   * @defaultValue 使用 JSON.stringify 序列化参数
   */
  keyGenerator?: (...args: A) => string;

  /**
   * 缓存有效期(毫秒)
   *
   * 缓存项的生存时间，超过该时间后缓存将被视为过期
   *
   * @defaultValue Infinity (永不过期)
   */
  ttl?: number;

  /**
   * 最大缓存项数量
   *
   * 缓存可以保存的最大项目数，超过此数量时会删除最旧的项目
   *
   * @defaultValue 100
   */
  maxItems?: number;

  /**
   * 缓存命中时是否刷新TTL
   *
   * 当访问缓存项时是否刷新其过期时间
   *
   * @defaultValue true
   */
  refreshTTL?: boolean;

  /**
   * 缓存错误结果
   *
   * 是否缓存函数执行过程中抛出的错误
   *
   * @defaultValue false
   */
  cacheErrors?: boolean;

  /**
   * 缓存预热数据
   *
   * 初始缓存数据，用于缓存预热
   *
   * @defaultValue \{\}
   */
  initialCache?: Record<string, { value: T; timestamp: number }>;
}

/**
 * 具有缓存清理功能的函数类型
 *
 * @typeParam T - 函数返回值类型
 * @typeParam A - 函数参数类型数组
 * @internal
 */
export interface CacheableFunction<T, A extends any[]> {
  (...args: A): Promise<T>;
  /**
   * 清除特定参数的缓存
   * @param args - 与调用函数时相同的参数
   */
  clearCache: (...args: A) => void;
  /**
   * 清除所有缓存项
   */
  clearAllCache: () => void;
}

/**
 * 为异步函数创建带缓存的版本
 *
 * 将异步函数包装为带缓存功能的版本，相同参数的调用只执行一次，后续调用使用缓存结果。
 * 支持TTL、最大缓存项、键生成等配置选项。
 *
 * @param fn - 要缓存的异步函数
 * @param options - 缓存选项
 * @returns 带缓存功能的包装函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能优化
 *
 * @example
 * ```typescript
 * // 创建带缓存的API请求函数
 * const cachedFetchUser = asyncCache(
 *   async (userId) => {
 *     const response = await fetch(`/api/users/${userId}`);
 *     return response.json();
 *   },
 *   { ttl: 60000 } // 缓存60秒
 * );
 *
 * // 第一次调用会发起请求
 * const user1 = await cachedFetchUser('123');
 *
 * // 相同参数的第二次调用会使用缓存，不会发起新请求
 * const user2 = await cachedFetchUser('123');
 *
 * // 清除特定缓存项
 * cachedFetchUser.clearCache('123');
 *
 * // 清除所有缓存
 * cachedFetchUser.clearAllCache();
 * ```
 * @public
 */
export function asyncCache<T, A extends any[]>(
  fn: (...args: A) => Promise<T>,
  options: AsyncCacheOptions<T, A> = {}
): CacheableFunction<T, A> {
  const {
    ttl = Infinity,
    maxItems = 100,
    keyGenerator,
    refreshTTL = true,
    cacheErrors = false,
    initialCache = {}
  } = options;
  const cache = new Map<string, CacheItem<T>>();
  const keys: string[] = [];

  // 初始化缓存预热数据
  if (initialCache) {
    for (const [key, item] of Object.entries(initialCache)) {
      cache.set(key, item);
      keys.push(key);
    }
  }

  // 生成缓存键的辅助函数
  const generateKey = function (thisArg: any, args: A): string {
    return keyGenerator
      ? keyGenerator.apply(thisArg, args)
      : JSON.stringify(args);
  };

  const cachedFn = async function (this: any, ...args: A): Promise<T> {
    // 生成缓存键
    const key = generateKey(this, args);

    const now = Date.now();

    // 检查缓存项是否存在且未过期
    if (cache.has(key)) {
      const item = cache.get(key)!;

      // 如果设置了TTL且项已过期，则删除
      if (ttl && now - item.timestamp > ttl) {
        cache.delete(key);
        const index = keys.indexOf(key);
        if (index !== -1) {
          keys.splice(index, 1);
        }
      } else {
        // 如果设置了refreshTTL，更新时间戳
        if (refreshTTL) {
          item.timestamp = now;
        }
        // 返回缓存值
        return item.value;
      }
    }

    try {
      // 获取新值
      const value = await fn.apply(this, args);

      // 添加到缓存
      cache.set(key, { value, timestamp: now });
      keys.push(key);

      // 如果超过最大尺寸，删除最旧的项
      if (keys.length > maxItems) {
        const oldestKey = keys.shift()!;
        cache.delete(oldestKey);
      }

      return value;
    } catch (error) {
      // 如果配置了缓存错误，则缓存错误结果
      if (cacheErrors) {
        cache.set(key, { value: error as any, timestamp: now });
        keys.push(key);

        // 如果超过最大尺寸，删除最旧的项
        if (keys.length > maxItems) {
          const oldestKey = keys.shift()!;
          cache.delete(oldestKey);
        }
      }

      throw error;
    }
  };

  // 添加清除指定缓存的方法
  (cachedFn as CacheableFunction<T, A>).clearCache = function (
    ...args: A
  ): void {
    const key = generateKey(this, args);
    if (cache.has(key)) {
      cache.delete(key);
      const index = keys.indexOf(key);
      if (index !== -1) {
        keys.splice(index, 1);
      }
    }
  };

  // 添加清除所有缓存的方法
  (cachedFn as CacheableFunction<T, A>).clearAllCache = function (): void {
    cache.clear();
    keys.length = 0;
  };

  return cachedFn as CacheableFunction<T, A>;
}
