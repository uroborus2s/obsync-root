/**
 * 异步缓存相关函数
 */

/**
 * 缓存选项接口
 */
export interface CacheOptions {
  ttl?: number; // 缓存生存时间(ms)
  maxSize?: number; // 最大缓存项数量
  keyFn?: (...args: any[]) => string; // 自定义缓存键函数
}

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  value: T;
  timestamp: number;
}

/**
 * 创建带有缓存的异步函数
 * @param fn 要缓存结果的异步函数
 * @param options 缓存选项
 * @returns 带有缓存的异步函数
 */
export function asyncCache<T, A extends any[]>(
  fn: (...args: A) => Promise<T>,
  options: CacheOptions = {}
): (...args: A) => Promise<T> {
  const { ttl, maxSize = 100, keyFn } = options;
  const cache = new Map<string, CacheItem<T>>();
  const keys: string[] = [];

  return async function (this: any, ...args: A): Promise<T> {
    // 生成缓存键
    const key = keyFn ? keyFn.apply(this, args) : JSON.stringify(args);

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
        // 返回缓存值
        return item.value;
      }
    }

    // 获取新值
    const value = await fn.apply(this, args);

    // 添加到缓存
    cache.set(key, { value, timestamp: now });
    keys.push(key);

    // 如果超过最大尺寸，删除最旧的项
    if (keys.length > maxSize) {
      const oldestKey = keys.shift()!;
      cache.delete(oldestKey);
    }

    return value;
  };
}
