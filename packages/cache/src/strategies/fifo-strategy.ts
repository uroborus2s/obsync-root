import { CacheStrategy, FIFOStrategyOptions } from '../types/strategy.js';

/**
 * 先进先出（FIFO）缓存策略实现
 * 当缓存达到最大容量时，删除最先添加的项
 */
export class FIFOStrategy<K = string, V = any> implements CacheStrategy<K, V> {
  private readonly map: Map<K, V>;
  private readonly queue: K[];
  private readonly maxSize: number;

  /**
   * 创建FIFO缓存策略实例
   * @param options FIFO策略选项
   */
  constructor(options: FIFOStrategyOptions<K, V> = {}) {
    this.map = new Map<K, V>();
    this.queue = [];
    this.maxSize = options.max || 1000;
  }

  /**
   * 获取缓存项
   * 此操作不会改变项的位置
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  get(key: K): V | undefined {
    return this.map.get(key);
  }

  /**
   * 设置缓存项
   * 如果达到容量限制，会删除最先添加的项
   * @param key 缓存键
   * @param value 缓存值
   * @returns 是否设置成功
   */
  set(key: K, value: V): boolean {
    // 如果键已存在，先从队列中移除
    if (this.map.has(key)) {
      const index = this.queue.indexOf(key);
      if (index !== -1) {
        this.queue.splice(index, 1);
      }
    }

    // 添加到队列末尾
    this.queue.push(key);

    // 如果超出容量，删除队列头部的键（最先添加的）
    if (this.queue.length > this.maxSize) {
      const oldestKey = this.queue.shift();
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }

    // 设置值
    this.map.set(key, value);
    return true;
  }

  /**
   * 检查缓存键是否存在
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

    // 从队列中删除键
    const index = this.queue.indexOf(key);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }

    return result;
  }

  /**
   * 清空所有缓存项
   * @returns 是否成功清空
   */
  clear(): boolean {
    this.map.clear();
    this.queue.length = 0;
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
    return 'fifo';
  }
}
