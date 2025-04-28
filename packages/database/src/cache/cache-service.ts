/**
 * @stratix/database 缓存服务类
 */

import { Cache, CacheManager } from '@stratix/cache';
import { DatabaseConfig } from '../types/database.js';

/**
 * 数据库缓存服务类
 * 负责管理数据库查询和模型的缓存
 */
export class DatabaseCacheService {
  /**
   * 缓存管理器实例
   */
  private cacheManager: CacheManager;

  /**
   * 缓存实例
   */
  private cache: Cache;

  /**
   * 是否启用缓存
   */
  private enabled: boolean = false;

  /**
   * 默认缓存时间（毫秒）
   */
  private defaultTtl: number = 60000; // 默认1分钟

  /**
   * 缓存前缀
   */
  private prefix: string = 'db:';

  /**
   * 是否启用查询缓存
   */
  private queryCacheEnabled: boolean = false;

  /**
   * 查询缓存时间（毫秒）
   */
  private queryTtl: number = 30000; // 默认30秒

  /**
   * 是否启用模型缓存
   */
  private modelCacheEnabled: boolean = false;

  /**
   * 模型缓存时间（毫秒）
   */
  private modelTtl: number = 60000; // 默认1分钟

  /**
   * 构造函数
   *
   * @param cacheManager 缓存管理器
   * @param config 数据库配置
   */
  constructor(cacheManager: CacheManager, config?: DatabaseConfig) {
    this.cacheManager = cacheManager;

    if (config?.cache) {
      this.configure(config);
    }

    // 获取默认缓存实例
    this.cache = this.cacheManager.getCache();
  }

  /**
   * 配置缓存服务
   *
   * @param config 数据库配置
   */
  public configure(config: DatabaseConfig): void {
    if (config.cache) {
      // 全局缓存设置
      this.enabled = config.cache.enabled ?? false;
      this.prefix = config.cache.prefix ?? 'db:';
      this.defaultTtl = config.cache.ttl ?? 60000;

      // 查询缓存设置
      if (config.cache.queries) {
        this.queryCacheEnabled = config.cache.queries.enabled ?? false;
        this.queryTtl = config.cache.queries.ttl ?? 30000;
      }

      // 模型缓存设置
      if (config.cache.models) {
        this.modelCacheEnabled = config.cache.models.enabled ?? false;
        this.modelTtl = config.cache.models.ttl ?? 60000;
      }
    }
  }

  /**
   * 获取缓存键
   *
   * @param key 键名
   * @param type 缓存类型
   * @returns 带前缀的缓存键
   */
  public getCacheKey(key: string, type: 'query' | 'model' = 'model'): string {
    return `${this.prefix}${type}:${key}`;
  }

  /**
   * 是否启用缓存
   *
   * @param type 缓存类型
   * @returns 是否启用
   */
  public isEnabled(type: 'query' | 'model' = 'model'): boolean {
    if (!this.enabled) return false;

    if (type === 'query') {
      return this.queryCacheEnabled;
    } else {
      return this.modelCacheEnabled;
    }
  }

  /**
   * 获取缓存TTL
   *
   * @param type 缓存类型
   * @param customTtl 自定义TTL
   * @returns 缓存TTL
   */
  public getTtl(type: 'query' | 'model' = 'model', customTtl?: number): number {
    if (customTtl !== undefined) return customTtl;

    if (type === 'query') {
      return this.queryTtl;
    } else {
      return this.modelTtl;
    }
  }

  /**
   * 从缓存获取数据
   *
   * @param key 缓存键
   * @param type 缓存类型
   * @returns 缓存数据或null
   */
  public async get<T>(
    key: string,
    type: 'query' | 'model' = 'model'
  ): Promise<T | null> {
    if (!this.isEnabled(type)) return null;

    const cacheKey = this.getCacheKey(key, type);
    return this.cache.get<T>(cacheKey);
  }

  /**
   * 设置缓存
   *
   * @param key 缓存键
   * @param value 缓存值
   * @param type 缓存类型
   * @param ttl 缓存时间（毫秒）
   * @returns 操作是否成功
   */
  public async set<T>(
    key: string,
    value: T,
    type: 'query' | 'model' = 'model',
    ttl?: number
  ): Promise<boolean> {
    if (!this.isEnabled(type)) return false;

    const cacheKey = this.getCacheKey(key, type);
    const cacheTtl = this.getTtl(type, ttl);

    return this.cache.set(cacheKey, value, cacheTtl);
  }

  /**
   * 删除缓存
   *
   * @param key 缓存键
   * @param type 缓存类型
   * @returns 操作是否成功
   */
  public async delete(
    key: string,
    type: 'query' | 'model' = 'model'
  ): Promise<boolean> {
    if (!this.isEnabled(type)) return false;

    const cacheKey = this.getCacheKey(key, type);
    return this.cache.delete(cacheKey);
  }

  /**
   * 清除特定类型的所有缓存
   *
   * @param type 缓存类型
   * @returns 操作是否成功
   */
  public async clear(type?: 'query' | 'model'): Promise<boolean> {
    let pattern: string;

    if (type) {
      pattern = `${this.prefix}${type}:*`;
    } else {
      pattern = `${this.prefix}*`;
    }

    return this.cache.clear(pattern);
  }

  /**
   * 获取或设置缓存
   *
   * @param key 缓存键
   * @param callback 回调函数，用于生成缓存数据
   * @param type 缓存类型
   * @param ttl 缓存时间（毫秒）
   * @returns 缓存数据或回调结果
   */
  public async remember<T>(
    key: string,
    callback: () => Promise<T>,
    type: 'query' | 'model' = 'model',
    ttl?: number
  ): Promise<T> {
    if (!this.isEnabled(type)) {
      return callback();
    }

    const cacheKey = this.getCacheKey(key, type);
    const cacheTtl = this.getTtl(type, ttl);

    return this.cache.remember<T>(cacheKey, callback, cacheTtl);
  }
}
