import { EventEmitter } from 'events';
import { CacheAPI } from '../types/api.js';
import { CacheEventType, CacheLock, CacheStats } from '../types/cache.js';
import { CacheDriver } from '../types/driver.js';
import { KeyBuilder, LockManager } from '../utils/index.js';

/**
 * 缓存API实现
 * 提供了应用可以使用的缓存操作方法
 */
export class CacheApiImpl implements CacheAPI {
  private readonly driver: CacheDriver;
  private readonly keyBuilder: KeyBuilder;
  private readonly lockManager: LockManager;
  private readonly events: EventEmitter;
  private readonly defaultTtl: number;

  /**
   * 创建缓存API实现实例
   * @param driver 缓存驱动
   * @param options 配置选项
   */
  constructor(
    driver: CacheDriver,
    options: {
      prefix?: string;
      defaultTtl?: number;
      lockTimeout?: number;
      lockRetryCount?: number;
      lockRetryDelay?: number;
    } = {}
  ) {
    this.driver = driver;
    this.keyBuilder = new KeyBuilder(options.prefix || '');
    this.defaultTtl = options.defaultTtl || 60000; // 默认缓存1分钟
    this.events = new EventEmitter();

    // 创建锁管理器
    this.lockManager = new LockManager(driver, this.keyBuilder, {
      timeout: options.lockTimeout,
      retryCount: options.lockRetryCount,
      retryDelay: options.lockRetryDelay
    });

    // 设置事件监听器最大数量
    this.events.setMaxListeners(50);
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或null（如果不存在或已过期）
   */
  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = this.keyBuilder.build(key);
    const value = await this.driver.get<T>(fullKey);

    // 触发事件
    if (value !== null) {
      this.events.emit(CacheEventType.HIT, { key, value });
    } else {
      this.events.emit(CacheEventType.MISS, { key });
    }

    return value;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），0表示永不过期
   * @returns 操作是否成功
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    const fullKey = this.keyBuilder.build(key);
    const result = await this.driver.set<T>(fullKey, value, ttl);

    // 触发事件
    if (result) {
      this.events.emit(CacheEventType.SET, { key, value });
    }

    return result;
  }

  /**
   * 检查缓存键是否存在
   * @param key 缓存键
   * @returns 是否存在且未过期
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.keyBuilder.build(key);
    return this.driver.has(fullKey);
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.keyBuilder.build(key);
    const result = await this.driver.delete(fullKey);

    // 触发事件
    if (result) {
      this.events.emit(CacheEventType.DELETE, { key });
    }

    return result;
  }

  /**
   * 清空所有缓存
   * @returns 是否成功清空
   */
  async clear(): Promise<boolean> {
    const result = await this.driver.clear();

    // 触发事件
    if (result) {
      this.events.emit(CacheEventType.CLEAR, {});
    }

    return result;
  }

  /**
   * 批量获取缓存项
   * @param keys 缓存键数组
   * @returns 缓存值数组，对应位置无值则为null
   */
  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    if (keys.length === 0) {
      return [];
    }

    // 转换所有键
    const fullKeys = keys.map((key) => this.keyBuilder.build(key));
    return this.driver.mget<T>(fullKeys);
  }

  /**
   * 批量设置缓存项
   * @param entries 键值对对象
   * @param ttl 统一的过期时间
   * @returns 是否全部设置成功
   */
  async mset(entries: Record<string, any>, ttl?: number): Promise<boolean> {
    if (Object.keys(entries).length === 0) {
      return true;
    }

    // 转换所有键
    const fullEntries: Record<string, any> = {};
    for (const [key, value] of Object.entries(entries)) {
      fullEntries[this.keyBuilder.build(key)] = value;
    }

    const result = await this.driver.mset(fullEntries, ttl);

    // 触发事件
    if (result) {
      this.events.emit(CacheEventType.SET, { keys: Object.keys(entries) });
    }

    return result;
  }

  /**
   * 批量删除缓存项
   * @param keys 缓存键数组
   * @returns 成功删除的数量
   */
  async mdelete(keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    // 转换所有键
    const fullKeys = keys.map((key) => this.keyBuilder.build(key));
    const count = await this.driver.mdelete(fullKeys);

    // 触发事件
    if (count > 0) {
      this.events.emit(CacheEventType.DELETE, { keys });
    }

    return count;
  }

  /**
   * 获取或设置缓存项
   * 如果缓存存在则返回，否则调用工厂函数生成值并缓存
   * @param key 缓存键
   * @param factory 生成值的工厂函数
   * @param ttl 过期时间
   * @returns 缓存值
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const fullKey = this.keyBuilder.build(key);
    const value = await this.driver.get<T>(fullKey);

    if (value !== null) {
      this.events.emit(CacheEventType.HIT, { key, value });
      return value;
    }

    // 缓存未命中，执行工厂函数
    this.events.emit(CacheEventType.MISS, { key });
    try {
      const result = await factory();
      await this.driver.set<T>(
        fullKey,
        result,
        ttl !== undefined ? ttl : this.defaultTtl
      );
      this.events.emit(CacheEventType.SET, { key, value: result });
      return result;
    } catch (error) {
      this.events.emit(CacheEventType.ERROR, { key, error });
      throw error;
    }
  }

  /**
   * 增加数值
   * @param key 缓存键
   * @param value 增加的值，默认为1
   * @returns 增加后的值
   */
  async increment(key: string, value: number = 1): Promise<number> {
    const fullKey = this.keyBuilder.build(key);
    return this.driver.increment(fullKey, value);
  }

  /**
   * 减少数值
   * @param key 缓存键
   * @param value 减少的值，默认为1
   * @returns 减少后的值
   */
  async decrement(key: string, value: number = 1): Promise<number> {
    const fullKey = this.keyBuilder.build(key);
    return this.driver.decrement(fullKey, value);
  }

  /**
   * 为缓存键添加标签
   * @param tag 标签名
   * @param keys 缓存键数组
   * @returns 是否成功添加
   */
  async tagKeys(tag: string, keys: string[]): Promise<boolean> {
    if (keys.length === 0) {
      return true;
    }

    const tagKey = this.keyBuilder.buildTagKey(tag);
    const fullKeys = keys.map((key) => this.keyBuilder.build(key));
    return this.driver.tagKeys(tagKey, fullKeys);
  }

  /**
   * 使标签下的所有缓存项失效
   * @param tag 标签名
   * @returns 是否成功使所有项失效
   */
  async invalidateTag(tag: string): Promise<boolean> {
    const tagKey = this.keyBuilder.buildTagKey(tag);
    return this.driver.invalidateTag(tagKey);
  }

  /**
   * 获取标签下的所有缓存键
   * @param tag 标签名
   * @returns 缓存键数组
   */
  async getKeysByTag(tag: string): Promise<string[]> {
    const tagKey = this.keyBuilder.buildTagKey(tag);
    const keys = await this.driver.getKeysByTag(tagKey);

    // 移除前缀
    const prefix = this.keyBuilder.build('');
    return keys.map((key: string) => {
      if (prefix && key.startsWith(prefix)) {
        return key.substring(prefix.length);
      }
      return key;
    });
  }

  /**
   * 创建命名空间缓存
   * 返回一个新的CacheAPI实例，所有键都带有命名空间前缀
   * @param namespace 命名空间名称
   * @returns 命名空间缓存API
   */
  namespace(namespace: string): CacheAPI {
    // 创建一个新的缓存API实例，使用命名空间键生成器
    const namespaceApi = new CacheApiImpl(this.driver, {
      defaultTtl: this.defaultTtl
    });

    // 替换键生成器，将当前键生成器的命名空间设置为新的命名空间
    const newKeyBuilder = new KeyBuilder(
      this.keyBuilder['prefix'], // 访问私有属性
      namespace
    );

    // 使用类型断言访问私有属性
    (namespaceApi as any).keyBuilder = newKeyBuilder;

    return namespaceApi;
  }

  /**
   * 使命名空间下的所有缓存项失效
   * @param namespace 命名空间名称
   * @returns 是否成功使所有项失效
   */
  async invalidateNamespace(namespace: string): Promise<boolean> {
    // 使用命名空间生成一个标签键
    const nsTag = `ns:${namespace}`;
    return this.invalidateTag(nsTag);
  }

  /**
   * 尝试获取分布式锁
   * @param key 锁键名
   * @param ttl 锁超时时间
   * @returns 锁对象或null（获取失败）
   */
  async lock(key: string, ttl?: number): Promise<CacheLock | null> {
    return this.lockManager.acquire(key, ttl);
  }

  /**
   * 在锁内执行函数
   * @param key 锁键名
   * @param factory 在锁内执行的函数
   * @param ttl 锁超时时间
   * @returns 函数执行结果
   */
  async withLock<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    return this.lockManager.withLock(key, factory, ttl);
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计数据
   */
  async stats(): Promise<CacheStats> {
    return this.driver.getStats();
  }

  /**
   * 监听缓存事件
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.events.on(event, handler);
  }

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.events.off(event, handler);
  }

  /**
   * 记住（缓存）工厂函数的结果一段时间
   * @param key 缓存键
   * @param ttl 过期时间
   * @param factory 生成值的工厂函数
   * @returns 函数执行结果
   */
  async remember<T>(
    key: string,
    ttl: number,
    factory: () => Promise<T> | T
  ): Promise<T> {
    return this.getOrSet(key, factory, ttl);
  }

  /**
   * 永久记住工厂函数的结果
   * @param key 缓存键
   * @param factory 生成值的工厂函数
   * @returns 函数执行结果
   */
  async rememberForever<T>(
    key: string,
    factory: () => Promise<T> | T
  ): Promise<T> {
    return this.getOrSet(key, factory, 0);
  }
}
