import { CacheStrategy, LFUStrategyOptions } from '../types/strategy.js';

/**
 * 最少使用（LFU）缓存策略实现
 * 当缓存达到最大容量时，删除使用频率最低的项
 */
export class LFUStrategy<K = string, V = any> implements CacheStrategy<K, V> {
  private readonly map: Map<K, V>;
  private readonly frequencies: Map<K, number>;
  private readonly maxSize: number;
  private readonly countFactor: number;

  /**
   * 创建LFU缓存策略实例
   * @param options LFU策略选项
   */
  constructor(options: LFUStrategyOptions<K, V> = {}) {
    this.map = new Map<K, V>();
    this.frequencies = new Map<K, number>();
    this.maxSize = options.max || 1000;
    this.countFactor = options.countFactor || 1;
  }

  /**
   * 获取缓存项
   * 此操作会增加项的使用频率
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  get(key: K): V | undefined {
    if (this.map.has(key)) {
      // 增加使用频率
      this.incrementFrequency(key);
      return this.map.get(key);
    }
    return undefined;
  }

  /**
   * 设置缓存项
   * 如果达到容量限制，会删除使用频率最低的项
   * @param key 缓存键
   * @param value 缓存值
   * @returns 是否设置成功
   */
  set(key: K, value: V): boolean {
    // 如果键已存在，更新值和频率
    if (this.map.has(key)) {
      this.map.set(key, value);
      this.incrementFrequency(key);
      return true;
    }

    // 如果达到容量上限，删除使用频率最低的项
    if (this.map.size >= this.maxSize) {
      this.evictLeastFrequent();
    }

    // 设置新值和初始频率
    this.map.set(key, value);
    this.frequencies.set(key, 1);
    return true;
  }

  /**
   * 检查缓存键是否存在
   * 此操作不会增加使用频率
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: K): boolean {
    return this.map.has(key);
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: K): boolean {
    const result = this.map.delete(key);
    this.frequencies.delete(key);
    return result;
  }

  /**
   * 清空所有缓存项
   * @returns 是否成功清空
   */
  clear(): boolean {
    this.map.clear();
    this.frequencies.clear();
    return true;
  }

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  keys(): K[] {
    return Array.from(this.map.keys());
  }

  /**
   * 获取缓存项数量
   * @returns 缓存项数量
   */
  size(): number {
    return this.map.size;
  }

  /**
   * 获取策略名称
   * @returns 策略名称
   */
  name(): string {
    return 'lfu';
  }

  /**
   * 增加键的使用频率
   * @param key 缓存键
   */
  private incrementFrequency(key: K): void {
    const currentFrequency = this.frequencies.get(key) || 0;
    this.frequencies.set(key, currentFrequency + this.countFactor);
  }

  /**
   * 淘汰使用频率最低的项
   */
  private evictLeastFrequent(): void {
    if (this.map.size === 0) return;

    let leastFrequentKey: K | null = null;
    let lowestFrequency = Infinity;

    // 找出使用频率最低的键
    for (const [key, frequency] of this.frequencies.entries()) {
      if (frequency < lowestFrequency) {
        lowestFrequency = frequency;
        leastFrequentKey = key;
      }
    }

    // 删除使用频率最低的项
    if (leastFrequentKey !== null) {
      this.map.delete(leastFrequentKey);
      this.frequencies.delete(leastFrequentKey);
    }
  }
}
