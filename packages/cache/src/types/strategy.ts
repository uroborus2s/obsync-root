/**
 * 缓存策略接口
 * 定义缓存项的淘汰策略
 */
export interface CacheStrategy<K = string, V = any> {
  /**
   * 获取缓存项
   * 此操作可能更新项的使用状态（如LRU策略）
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  get(key: K): V | undefined | Promise<V | undefined>;

  /**
   * 设置缓存项
   * 如果达到容量限制，可能会淘汰其他项
   * @param key 缓存键
   * @param value 缓存值
   * @returns 是否设置成功
   */
  set(key: K, value: V): boolean | Promise<boolean>;

  /**
   * 检查缓存键是否存在
   * 此操作不应更新项的使用状态
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: K): boolean | Promise<boolean>;

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: K): boolean | Promise<boolean>;

  /**
   * 清空所有缓存项
   * @returns 是否成功清空
   */
  clear(): boolean | Promise<boolean>;

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  keys(): K[] | Promise<K[]>;

  /**
   * 获取缓存项数量
   * @returns 缓存项数量
   */
  size(): number | Promise<number>;

  /**
   * 获取策略名称
   * @returns 策略名称
   */
  name(): string;
}

/**
 * LRU缓存策略选项
 */
export interface LRUStrategyOptions<K = string, V = any> {
  max?: number; // 最大缓存项数量
  maxSize?: number; // 最大内存使用量（字节）
  sizeCalculation?: (value: V, key: K) => number; // 计算项大小的函数
  updateAgeOnGet?: boolean; // 是否在获取时更新项的访问时间
}

/**
 * FIFO缓存策略选项
 */
export interface FIFOStrategyOptions<K = string, V = any> {
  max?: number; // 最大缓存项数量
}

/**
 * LFU缓存策略选项
 */
export interface LFUStrategyOptions<K = string, V = any> {
  max?: number; // 最大缓存项数量
  countFactor?: number; // 计数因子，影响访问频率的增加量
}
