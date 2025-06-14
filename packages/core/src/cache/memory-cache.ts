import { EventEmitter } from 'events';

/**
 * 缓存条目接口
 */
export interface CacheEntry<T = any> {
  /**
   * 缓存值
   */
  value: T;

  /**
   * 过期时间戳
   */
  expiredAt: number;

  /**
   * 创建时间戳
   */
  createdAt: number;

  /**
   * 最后访问时间戳
   */
  lastAccessedAt: number;

  /**
   * 访问次数
   */
  accessCount: number;

  /**
   * 缓存标签
   */
  tags?: string[];

  /**
   * 缓存大小（字节）
   */
  size?: number;
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /**
   * 最大缓存条目数
   */
  maxSize?: number;

  /**
   * 默认TTL（秒）
   */
  defaultTtl?: number;

  /**
   * 最大内存使用量（字节）
   */
  maxMemory?: number;

  /**
   * 清理策略
   */
  evictionPolicy?: 'lru' | 'lfu' | 'fifo' | 'ttl';

  /**
   * 清理间隔（毫秒）
   */
  cleanupInterval?: number;

  /**
   * 是否启用统计
   */
  enableStats?: boolean;

  /**
   * 序列化函数
   */
  serialize?: (value: any) => string;

  /**
   * 反序列化函数
   */
  deserialize?: (value: string) => any;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /**
   * 命中次数
   */
  hits: number;

  /**
   * 未命中次数
   */
  misses: number;

  /**
   * 当前缓存条目数
   */
  size: number;

  /**
   * 内存使用量（字节）
   */
  memoryUsage: number;

  /**
   * 命中率
   */
  hitRate: number;

  /**
   * 设置次数
   */
  sets: number;

  /**
   * 删除次数
   */
  deletes: number;

  /**
   * 清理次数
   */
  evictions: number;

  /**
   * 过期清理次数
   */
  expirations: number;
}

/**
 * 缓存事件类型
 */
export interface CacheEvents {
  hit: (key: string, value: any) => void;
  miss: (key: string) => void;
  set: (key: string, value: any, ttl?: number) => void;
  delete: (key: string) => void;
  expire: (key: string, value: any) => void;
  evict: (key: string, value: any, reason: string) => void;
  clear: () => void;
  cleanup: (removedCount: number) => void;
}

/**
 * 内存缓存实现
 */
export class MemoryCache extends EventEmitter {
  private cache = new Map<string, CacheEntry>();
  private config: Required<CacheConfig>;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;
  private accessOrder: string[] = []; // LRU访问顺序
  private accessFrequency = new Map<string, number>(); // LFU访问频率

  constructor(config: CacheConfig = {}) {
    super();

    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTtl: config.defaultTtl || 300, // 5分钟
      maxMemory: config.maxMemory || 100 * 1024 * 1024, // 100MB
      evictionPolicy: config.evictionPolicy || 'lru',
      cleanupInterval: config.cleanupInterval || 60000, // 1分钟
      enableStats: config.enableStats !== false,
      serialize: config.serialize || JSON.stringify,
      deserialize: config.deserialize || JSON.parse
    };

    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      memoryUsage: 0,
      hitRate: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expirations: 0
    };

    // 启动清理定时器
    this.startCleanupTimer();
  }

  /**
   * 获取缓存值
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordMiss(key);
      return null;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.removeEntry(key, 'expired');
      this.recordMiss(key);
      return null;
    }

    // 更新访问信息
    this.updateAccessInfo(key, entry);
    this.recordHit(key, entry.value);

    return entry.value as T;
  }

  /**
   * 设置缓存值
   */
  set<T = any>(key: string, value: T, ttl?: number): boolean {
    try {
      const actualTtl = ttl || this.config.defaultTtl;
      const now = Date.now();
      const size = this.calculateSize(value);

      // 检查内存限制
      if (this.stats.memoryUsage + size > this.config.maxMemory) {
        this.evictToMakeSpace(size);
      }

      // 检查条目数限制
      if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
        this.evictOldest();
      }

      const entry: CacheEntry<T> = {
        value,
        expiredAt: now + actualTtl * 1000,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        size
      };

      // 如果是更新现有条目，先移除旧的内存使用量
      const existingEntry = this.cache.get(key);
      if (existingEntry) {
        this.stats.memoryUsage -= existingEntry.size || 0;
      }

      this.cache.set(key, entry);
      this.stats.memoryUsage += size;
      this.updateAccessOrder(key);

      this.recordSet(key, value, ttl);
      this.updateStats();

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 删除缓存值
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.removeEntry(key, 'manual');
    this.recordDelete(key);
    return true;
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.removeEntry(key, 'expired');
      return false;
    }

    return true;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.accessFrequency.clear();
    this.stats.memoryUsage = 0;
    this.updateStats();
    this.emit('clear');
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    const validKeys: string[] = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiredAt > now) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: this.cache.size,
      memoryUsage: this.stats.memoryUsage,
      hitRate: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expirations: 0
    };
  }

  /**
   * 根据标签删除缓存
   */
  deleteByTags(tags: string[]): number {
    let deletedCount = 0;
    const tagSet = new Set(tags);

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some((tag) => tagSet.has(tag))) {
        this.removeEntry(key, 'tag');
        deletedCount++;
      }
    }

    this.updateStats();
    return deletedCount;
  }

  /**
   * 设置带标签的缓存
   */
  setWithTags<T = any>(
    key: string,
    value: T,
    tags: string[],
    ttl?: number
  ): boolean {
    const result = this.set(key, value, ttl);
    if (result) {
      const entry = this.cache.get(key);
      if (entry) {
        entry.tags = tags;
      }
    }
    return result;
  }

  /**
   * 手动清理过期条目
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.removeEntry(key, 'expired');
        removedCount++;
      }
    }

    this.updateStats();
    this.emit('cleanup', removedCount);
    return removedCount;
  }

  /**
   * 销毁缓存实例
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
    this.removeAllListeners();
  }

  /**
   * 检查条目是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiredAt;
  }

  /**
   * 移除缓存条目
   */
  private removeEntry(key: string, reason: string): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    this.cache.delete(key);
    this.stats.memoryUsage -= entry.size || 0;

    // 从访问顺序中移除
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    // 从访问频率中移除
    this.accessFrequency.delete(key);

    if (reason === 'expired') {
      this.stats.expirations++;
      this.emit('expire', key, entry.value);
    } else if (reason === 'evicted') {
      this.stats.evictions++;
      this.emit('evict', key, entry.value, reason);
    }
  }

  /**
   * 更新访问信息
   */
  private updateAccessInfo(key: string, entry: CacheEntry): void {
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;

    this.updateAccessOrder(key);
    this.updateAccessFrequency(key);
  }

  /**
   * 更新LRU访问顺序
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * 更新LFU访问频率
   */
  private updateAccessFrequency(key: string): void {
    const current = this.accessFrequency.get(key) || 0;
    this.accessFrequency.set(key, current + 1);
  }

  /**
   * 驱逐最旧的条目
   */
  private evictOldest(): void {
    let keyToEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder[0] || null;
        break;
      case 'lfu':
        keyToEvict = this.findLeastFrequentlyUsed();
        break;
      case 'fifo':
        keyToEvict = this.cache.keys().next().value || null;
        break;
      case 'ttl':
        keyToEvict = this.findEarliestExpiring();
        break;
    }

    if (keyToEvict) {
      this.removeEntry(keyToEvict, 'evicted');
    }
  }

  /**
   * 驱逐条目以释放空间
   */
  private evictToMakeSpace(requiredSize: number): void {
    while (
      this.stats.memoryUsage + requiredSize > this.config.maxMemory &&
      this.cache.size > 0
    ) {
      this.evictOldest();
    }
  }

  /**
   * 找到最少使用的键
   */
  private findLeastFrequentlyUsed(): string | null {
    let minFrequency = Infinity;
    let leastUsedKey: string | null = null;

    for (const [key, frequency] of this.accessFrequency.entries()) {
      if (frequency < minFrequency) {
        minFrequency = frequency;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  /**
   * 找到最早过期的键
   */
  private findEarliestExpiring(): string | null {
    let earliestExpiry = Infinity;
    let earliestKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiredAt < earliestExpiry) {
        earliestExpiry = entry.expiredAt;
        earliestKey = key;
      }
    }

    return earliestKey;
  }

  /**
   * 计算值的大小
   */
  private calculateSize(value: any): number {
    try {
      const serialized = this.config.serialize(value);
      return new Blob([serialized]).size;
    } catch {
      // 如果序列化失败，使用估算
      return JSON.stringify(value).length * 2; // 假设UTF-16编码
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
    }
  }

  /**
   * 记录命中
   */
  private recordHit(key: string, value: any): void {
    if (this.config.enableStats) {
      this.stats.hits++;
      this.emit('hit', key, value);
    }
  }

  /**
   * 记录未命中
   */
  private recordMiss(key: string): void {
    if (this.config.enableStats) {
      this.stats.misses++;
      this.emit('miss', key);
    }
  }

  /**
   * 记录设置
   */
  private recordSet(key: string, value: any, ttl?: number): void {
    if (this.config.enableStats) {
      this.stats.sets++;
      this.emit('set', key, value, ttl);
    }
  }

  /**
   * 记录删除
   */
  private recordDelete(key: string): void {
    if (this.config.enableStats) {
      this.stats.deletes++;
      this.emit('delete', key);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private caches = new Map<string, MemoryCache>();
  private defaultConfig: CacheConfig;

  constructor(defaultConfig: CacheConfig = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * 创建或获取缓存实例
   */
  getCache(name: string, config?: CacheConfig): MemoryCache {
    if (!this.caches.has(name)) {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const cache = new MemoryCache(mergedConfig);
      this.caches.set(name, cache);
    }
    return this.caches.get(name)!;
  }

  /**
   * 删除缓存实例
   */
  deleteCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (cache) {
      cache.destroy();
      return this.caches.delete(name);
    }
    return false;
  }

  /**
   * 获取所有缓存名称
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * 获取所有缓存的统计信息
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * 销毁所有缓存
   */
  destroy(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }
}
