import { CacheConfig, MemoryCache } from './memory-cache.js';

/**
 * 默认缓存配置
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  defaultTtl: 300, // 5分钟
  maxMemory: 50 * 1024 * 1024, // 50MB
  evictionPolicy: 'lru',
  cleanupInterval: 60000, // 1分钟
  enableStats: true
};

/**
 * 默认缓存实例
 */
export class DefaultCache {
  private cache: MemoryCache;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new MemoryCache({
      ...DEFAULT_CACHE_CONFIG,
      ...config
    });
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），可选
   */
  set<T = any>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl);
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或null
   */
  get<T = any>(key: string): T | null {
    return this.cache.get<T>(key);
  }

  /**
   * 删除缓存值
   * @param key 缓存键
   * @returns 是否删除成功
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return this.cache.keys();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size();
  }

  /**
   * 设置带标签的缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param tags 标签数组
   * @param ttl 过期时间（秒），可选
   */
  setWithTags<T = any>(
    key: string,
    value: T,
    tags: string[],
    ttl?: number
  ): boolean {
    return this.cache.setWithTags(key, value, tags, ttl);
  }

  /**
   * 根据标签删除缓存
   * @param tags 标签数组
   * @returns 删除的条目数
   */
  deleteByTags(tags: string[]): number {
    return this.cache.deleteByTags(tags);
  }

  /**
   * 手动清理过期条目
   * @returns 清理的条目数
   */
  cleanup(): number {
    return this.cache.cleanup();
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.cache.resetStats();
  }

  /**
   * 销毁缓存实例
   */
  destroy(): void {
    this.cache.destroy();
  }

  /**
   * 获取底层缓存实例（用于高级操作）
   */
  getInternalCache(): MemoryCache {
    return this.cache;
  }
}

/**
 * 创建默认缓存实例
 * @param config 缓存配置
 * @returns 默认缓存实例
 */
export function createDefaultCache(
  config?: Partial<CacheConfig>
): DefaultCache {
  return new DefaultCache(config);
}
