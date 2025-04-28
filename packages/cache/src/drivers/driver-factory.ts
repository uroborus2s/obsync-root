import { CacheDriver, CacheDriverType } from '../types/index.js';
import { MemoryCacheDriver } from './memory-cache-driver.js';
import { NullCacheDriver } from './null-cache-driver.js';
import { RedisCacheDriver } from './redis-cache-driver.js';

/**
 * 创建缓存驱动的工厂函数
 * @param type 驱动类型
 * @param options 驱动选项
 * @returns 缓存驱动实例
 */
export function createDriver(
  type: CacheDriverType = 'memory',
  options: any = {}
): CacheDriver {
  switch (type) {
    case 'memory':
      return new MemoryCacheDriver(options);
    case 'redis':
      return new RedisCacheDriver(options);
    case 'null':
      return new NullCacheDriver();
    default:
      throw new Error(`不支持的缓存驱动类型: ${type}`);
  }
}
