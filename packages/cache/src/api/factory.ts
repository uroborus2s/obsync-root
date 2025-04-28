import { createDriver } from '../drivers/driver-factory.js';
import { CacheAPI } from '../types/api.js';
import { CacheDriverType } from '../types/cache.js';
import { DEFAULT_CACHE_OPTIONS } from '../types/plugin.js';
import { CacheApiImpl } from './cache-api.js';

/**
 * 创建缓存API实例
 * @param options 缓存配置选项
 * @returns 缓存API实例
 */
export function createCacheAPI(
  options: {
    driver?: CacheDriverType;
    prefix?: string;
    ttl?: number;
    driverOptions?: any;
    lockTimeout?: number;
    lockRetryCount?: number;
    lockRetryDelay?: number;
  } = {}
): CacheAPI {
  // 合并默认选项
  const config = {
    driver: options.driver || DEFAULT_CACHE_OPTIONS.driver,
    prefix:
      options.prefix !== undefined
        ? options.prefix
        : DEFAULT_CACHE_OPTIONS.prefix,
    ttl: options.ttl !== undefined ? options.ttl : DEFAULT_CACHE_OPTIONS.ttl,
    driverOptions: options.driverOptions || {},
    lockTimeout: options.lockTimeout,
    lockRetryCount: options.lockRetryCount,
    lockRetryDelay: options.lockRetryDelay
  };

  // 创建缓存驱动
  const driver = createDriver(config.driver, config.driverOptions);

  // 创建并返回缓存API实例
  return new CacheApiImpl(driver, {
    prefix: config.prefix,
    defaultTtl: config.ttl,
    lockTimeout: config.lockTimeout,
    lockRetryCount: config.lockRetryCount,
    lockRetryDelay: config.lockRetryDelay
  });
}
