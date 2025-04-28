import { CacheLock, CacheStats } from './cache.js';

/**
 * 缓存API接口
 * 定义了应用可以使用的缓存操作方法
 */
export interface CacheAPI {
  // 基本操作
  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或null（如果不存在或已过期）
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），0表示永不过期
   * @returns 操作是否成功
   */
  set<T = any>(key: string, value: T, ttl?: number): Promise<boolean>;

  /**
   * 检查缓存键是否存在
   * @param key 缓存键
   * @returns 是否存在且未过期
   */
  has(key: string): Promise<boolean>;

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: string): Promise<boolean>;

  /**
   * 清空所有缓存
   * @returns 是否成功清空
   */
  clear(): Promise<boolean>;

  // 批量操作
  /**
   * 批量获取缓存项
   * @param keys 缓存键数组
   * @returns 缓存值数组，对应位置无值则为null
   */
  mget<T = any>(keys: string[]): Promise<Array<T | null>>;

  /**
   * 批量设置缓存项
   * @param entries 键值对对象
   * @param ttl 统一的过期时间
   * @returns 是否全部设置成功
   */
  mset(entries: Record<string, any>, ttl?: number): Promise<boolean>;

  /**
   * 批量删除缓存项
   * @param keys 缓存键数组
   * @returns 成功删除的数量
   */
  mdelete(keys: string[]): Promise<number>;

  // 高级操作
  /**
   * 获取或设置缓存项
   * 如果缓存存在则返回，否则调用工厂函数生成值并缓存
   * @param key 缓存键
   * @param factory 生成值的工厂函数
   * @param ttl 过期时间
   * @returns 缓存值
   */
  getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T>;

  /**
   * 增加数值
   * @param key 缓存键
   * @param value 增加的值，默认为1
   * @returns 增加后的值
   */
  increment(key: string, value?: number): Promise<number>;

  /**
   * 减少数值
   * @param key 缓存键
   * @param value 减少的值，默认为1
   * @returns 减少后的值
   */
  decrement(key: string, value?: number): Promise<number>;

  // 标签与分组
  /**
   * 为缓存项添加标签
   * @param tag 标签名
   * @param keys 缓存键数组
   * @returns 是否成功添加
   */
  tagKeys(tag: string, keys: string[]): Promise<boolean>;

  /**
   * 使标签下的所有缓存项失效
   * @param tag 标签名
   * @returns 是否成功使所有项失效
   */
  invalidateTag(tag: string): Promise<boolean>;

  /**
   * 获取标签下的所有缓存键
   * @param tag 标签名
   * @returns 缓存键数组
   */
  getKeysByTag(tag: string): Promise<string[]>;

  // 命名空间操作
  /**
   * 创建命名空间缓存
   * 返回一个新的CacheAPI实例，所有键都带有命名空间前缀
   * @param namespace 命名空间名称
   * @returns 命名空间缓存API
   */
  namespace(namespace: string): CacheAPI;

  /**
   * 使命名空间下的所有缓存项失效
   * @param namespace 命名空间名称
   * @returns 是否成功使所有项失效
   */
  invalidateNamespace(namespace: string): Promise<boolean>;

  // 锁操作
  /**
   * 尝试获取分布式锁
   * @param key 锁键名
   * @param ttl 锁超时时间
   * @returns 锁对象或null（获取失败）
   */
  lock(key: string, ttl?: number): Promise<CacheLock | null>;

  /**
   * 在锁内执行函数
   * @param key 锁键名
   * @param factory 在锁内执行的函数
   * @param ttl 锁超时时间
   * @returns 函数执行结果
   */
  withLock<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T>;

  // 统计信息
  /**
   * 获取缓存统计信息
   * @returns 缓存统计数据
   */
  stats(): Promise<CacheStats>;

  // 事件监听
  /**
   * 监听缓存事件
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  on(event: string, handler: (...args: any[]) => void): void;

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  off(event: string, handler: (...args: any[]) => void): void;

  // 实用工具
  /**
   * 记住（缓存）工厂函数的结果一段时间
   * @param key 缓存键
   * @param ttl 过期时间
   * @param factory 生成值的工厂函数
   * @returns 函数执行结果
   */
  remember<T>(
    key: string,
    ttl: number,
    factory: () => Promise<T> | T
  ): Promise<T>;

  /**
   * 永久记住工厂函数的结果
   * @param key 缓存键
   * @param factory 生成值的工厂函数
   * @returns 函数执行结果
   */
  rememberForever<T>(key: string, factory: () => Promise<T> | T): Promise<T>;
}
