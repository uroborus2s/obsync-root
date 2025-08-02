/**
 * 性能优化工具库
 */

import {
  type BatchProcessor,
  type CacheOptions,
  type ConcurrencyController,
  type PerformanceOptions
} from './types.js';

/**
 * 重试装饰器
 */
export const withRetry =
  <T extends any[], R>(retries: number, delay = 1000) =>
  (fn: (...args: T) => Promise<R>) => {
    return async (...args: T): Promise<R> => {
      let lastError: Error;

      for (let i = 0; i <= retries; i++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error as Error;
          if (i < retries) {
            await new Promise((resolve) =>
              setTimeout(resolve, delay * Math.pow(2, i))
            );
          }
        }
      }

      throw lastError!;
    };
  };

/**
 * 超时装饰器
 */
export const withTimeout =
  <T extends any[], R>(timeoutMs: number) =>
  (fn: (...args: T) => Promise<R>) => {
    return async (...args: T): Promise<R> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      return Promise.race([fn(...args), timeoutPromise]);
    };
  };

/**
 * 日志装饰器
 */
export const withLogging =
  <T extends any[], R>(
    logger: { info: (msg: string) => void; error: (msg: string) => void },
    operationName: string
  ) =>
  (fn: (...args: T) => Promise<R>) => {
    return async (...args: T): Promise<R> => {
      const startTime = Date.now();
      logger.info(`Starting ${operationName}`);

      try {
        const result = await fn(...args);
        const duration = Date.now() - startTime;
        logger.info(`Completed ${operationName} in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Failed ${operationName} after ${duration}ms: ${error}`);
        throw error;
      }
    };
  };

/**
 * 智能缓存类
 */
export class SmartCache<K, V> {
  private readonly cache = new Map<
    K,
    { value: V; timestamp: number; hits: number }
  >();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize = 100, ttl = 300000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    item.hits++;
    return item.value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;
    let lowestHits = Infinity;

    for (const [key, item] of this.cache) {
      if (
        item.hits < lowestHits ||
        (item.hits === lowestHits && item.timestamp < oldestTime)
      ) {
        oldestKey = key;
        oldestTime = item.timestamp;
        lowestHits = item.hits;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * 智能缓存装饰器
 */
export const withSmartCache =
  <T extends any[], R>(options: CacheOptions<T> = {}) =>
  (fn: (...args: T) => Promise<R>) => {
    const cache = new SmartCache<string, R>(options.maxSize, options.ttl);
    const keyGen =
      options.keyGenerator || ((...args: T) => JSON.stringify(args));

    return async (...args: T): Promise<R> => {
      const key = keyGen(...args);
      const cached = cache.get(key);

      if (cached !== undefined) {
        return cached;
      }

      const result = await fn(...args);
      cache.set(key, result);
      return result;
    };
  };

/**
 * 性能监控装饰器
 */
export const withPerformanceMonitoring =
  <T extends any[], R>(options: PerformanceOptions = {}) =>
  (fn: (...args: T) => Promise<R>) => {
    const name = options.name || fn.name || 'anonymous';
    const logger = options.logger || console;
    const slowThreshold = options.slowThreshold || 1000;

    return async (...args: T): Promise<R> => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      try {
        const result = await fn(...args);
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

        if (duration > slowThreshold) {
          logger.warn(
            `Slow operation detected: ${name} took ${duration.toFixed(2)}ms`
          );
        }

        logger.info(
          `Performance: ${name} - Duration: ${duration.toFixed(2)}ms, Memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
        );

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        logger.info(
          `Performance: ${name} (failed) - Duration: ${duration.toFixed(2)}ms`
        );
        throw error;
      }
    };
  };

/**
 * 防抖函数
 */
export const debounce = <T extends any[]>(
  fn: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  let timeoutId: NodeJS.Timeout | undefined;

  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends any[]>(
  fn: (...args: T) => void,
  interval: number
): ((...args: T) => void) => {
  let lastCallTime = 0;

  return (...args: T) => {
    const now = Date.now();
    if (now - lastCallTime >= interval) {
      lastCallTime = now;
      fn(...args);
    }
  };
};

/**
 * 批处理器实现
 */
export const batch = <T>(
  processor: (items: T[]) => Promise<void>,
  options: { size?: number; delay?: number } = {}
): BatchProcessor<T> => {
  const batchSize = options.size || 10;
  const batchDelay = options.delay || 100;

  let items: T[] = [];
  let timeoutId: NodeJS.Timeout | undefined;

  const flush = async () => {
    if (items.length === 0) return;

    const currentItems = items;
    items = [];

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    await processor(currentItems);
  };

  const scheduleFlush = () => {
    if (timeoutId) return;
    timeoutId = setTimeout(flush, batchDelay);
  };

  return {
    add: (item: T) => {
      items.push(item);

      if (items.length >= batchSize) {
        flush();
      } else {
        scheduleFlush();
      }
    },
    flush
  };
};

/**
 * 并发限制控制器
 */
export const concurrencyLimit = (
  maxConcurrent: number
): ConcurrencyController => {
  let running = 0;
  const queue: Array<() => void> = [];

  const execute = async <Args extends any[], R>(
    fn: (...args: Args) => Promise<R>,
    ...args: Args
  ): Promise<R> => {
    return new Promise((resolve, reject) => {
      const task = async () => {
        running++;
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          running--;
          if (queue.length > 0) {
            const next = queue.shift();
            next?.();
          }
        }
      };

      if (running < maxConcurrent) {
        task();
      } else {
        queue.push(task);
      }
    });
  };

  return { execute };
};
