import { CacheStrategy, LRUStrategyOptions } from '../types/strategy.js';

// 延迟导入lru-cache（依赖）
let LRUCache: any = null;

/**
 * 初始化LRUCache
 * @returns LRUCache构造函数
 */
async function getLRUCache() {
  if (!LRUCache) {
    try {
      // 动态导入lru-cache
      const lruCacheModule = await import('lru-cache');
      // ES模块直接使用导入的模块，无需.default
      LRUCache = lruCacheModule;
    } catch (error) {
      throw new Error(
        '使用LRU策略需要安装lru-cache依赖: npm install lru-cache'
      );
    }
  }
  return LRUCache;
}

/**
 * 最近最少使用（LRU）缓存策略实现
 * 当缓存达到最大容量时，删除最久未使用的项
 */
export class LRUStrategy<K = string, V = any> implements CacheStrategy<K, V> {
  private cache: any = null;
  private readonly options: LRUStrategyOptions<K, V>;
  private initializing: Promise<void> | null = null;

  /**
   * 创建LRU缓存策略实例
   * @param options LRU策略选项
   */
  constructor(options: LRUStrategyOptions<K, V> = {}) {
    this.options = options;
    // 初始化在第一次使用时进行
  }

  /**
   * 确保缓存已初始化
   */
  private async ensureCache(): Promise<void> {
    if (this.cache) return;

    if (!this.initializing) {
      this.initializing = this.initCache();
    }

    await this.initializing;
  }

  /**
   * 初始化缓存实例
   */
  private async initCache(): Promise<void> {
    try {
      const LRUCacheClass = await getLRUCache();
      this.cache = new LRUCacheClass({
        max: this.options.max || 1000,
        maxSize: this.options.maxSize,
        sizeCalculation: this.options.sizeCalculation,
        updateAgeOnGet: this.options.updateAgeOnGet !== false
      });
    } catch (error) {
      console.error('初始化LRU缓存失败:', error);
      // 创建一个基本的Map作为备用
      this.cache = new Map();
    }
  }

  /**
   * 获取缓存项
   * 此操作会更新项的访问时间
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  async get(key: K): Promise<V | undefined> {
    await this.ensureCache();
    return this.cache.get(key);
  }

  /**
   * 设置缓存项
   * 如果达到容量限制，会淘汰最久未使用的项
   * @param key 缓存键
   * @param value 缓存值
   * @returns 是否设置成功
   */
  async set(key: K, value: V): Promise<boolean> {
    await this.ensureCache();
    this.cache.set(key, value);
    return true;
  }

  /**
   * 检查缓存键是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  async has(key: K): Promise<boolean> {
    await this.ensureCache();
    return this.cache.has(key);
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  async delete(key: K): Promise<boolean> {
    await this.ensureCache();
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存项
   * @returns 是否成功清空
   */
  async clear(): Promise<boolean> {
    await this.ensureCache();
    this.cache.clear();
    return true;
  }

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  async keys(): Promise<K[]> {
    await this.ensureCache();
    return [...this.cache.keys()];
  }

  /**
   * 获取缓存项数量
   * @returns 缓存项数量
   */
  async size(): Promise<number> {
    await this.ensureCache();
    return this.cache.size;
  }

  /**
   * 获取策略名称
   * @returns 策略名称
   */
  name(): string {
    return 'lru';
  }
}
