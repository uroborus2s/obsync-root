import { object } from '@stratix/utils';
import { CacheEntry, CacheLock } from '../types/cache.js';
import { CacheDriver, RedisCacheOptions } from '../types/driver.js';

// 延迟导入ioredis（可选依赖）
let Redis: any = null;
let Cluster: any = null;

/**
 * 初始化Redis客户端
 */
async function getRedis() {
  if (!Redis) {
    try {
      // 动态导入ioredis
      const ioredisModule = await import('ioredis');
      Redis = ioredisModule.default;
      Cluster = ioredisModule.Cluster;
    } catch (error) {
      throw new Error(
        '使用Redis缓存驱动需要安装ioredis依赖: npm install ioredis'
      );
    }
  }
  return { Redis, Cluster };
}

/**
 * Redis缓存锁实现
 */
class RedisCacheLock implements CacheLock {
  private released: boolean = false;
  private readonly key: string;
  private readonly driver: RedisCacheDriver;

  constructor(key: string, driver: RedisCacheDriver) {
    this.key = key;
    this.driver = driver;
  }

  /**
   * 释放锁
   * @returns 是否成功释放
   */
  async unlock(): Promise<boolean> {
    if (this.released) {
      return false;
    }
    this.released = true;
    return this.driver.delete(this.key);
  }
}

/**
 * 基于Redis的缓存驱动实现
 */
export class RedisCacheDriver implements CacheDriver {
  private client: any; // Redis客户端实例
  private readonly prefix: string;
  private readonly ttl: number;

  private _isReady: boolean = false;
  private readonly stats: {
    hits: number;
    misses: number;
    operations: {
      get: number;
      set: number;
      delete: number;
    };
  };

  /**
   * 创建Redis缓存驱动实例
   * @param options Redis缓存选项
   */
  constructor(options: RedisCacheOptions = {}) {
    this.prefix = options.keyPrefix || '';
    this.ttl = options.ttl || 60000; // 默认1分钟
    this.stats = {
      hits: 0,
      misses: 0,
      operations: {
        get: 0,
        set: 0,
        delete: 0
      }
    };

    // 初始化Redis客户端
    this.initClient(options);
  }

  /**
   * 初始化Redis客户端
   * @param options Redis缓存选项
   */
  private async initClient(options: RedisCacheOptions): Promise<void> {
    const { Redis, Cluster } = await getRedis();

    if (options.cluster) {
      // 创建Redis集群客户端
      this.client = new Cluster(options.cluster.nodes, {
        redisOptions: {
          password: options.password,
          db: options.db || 0,
          keyPrefix: this.prefix
        },
        ...object.omit(options, ['cluster', 'keyPrefix'])
      });
    } else if (options.sentinels) {
      // 创建Redis Sentinel客户端
      this.client = new Redis({
        sentinels: options.sentinels,
        name: options.sentinelName || 'mymaster',
        password: options.password,
        db: options.db || 0,
        keyPrefix: this.prefix,
        ...object.omit(options, ['sentinels', 'keyPrefix', 'sentinelName'])
      });
    } else if (options.url) {
      // 使用URL创建Redis客户端
      this.client = new Redis(options.url, {
        keyPrefix: this.prefix,
        ...object.omit(options, ['url', 'keyPrefix'])
      });
    } else {
      // 使用主机和端口创建Redis客户端
      this.client = new Redis({
        host: options.host || 'localhost',
        port: options.port || 6379,
        password: options.password,
        db: options.db || 0,
        keyPrefix: this.prefix,
        ...object.omit(options, ['host', 'port', 'password', 'db', 'keyPrefix'])
      });
    }

    // 监听客户端状态
    this.client.on('ready', () => {
      this._isReady = true;
    });

    this.client.on('error', (err: Error) => {
      console.error('Redis缓存驱动错误:', err);
    });
  }

  /**
   * 确保客户端已准备好
   */
  private async ensureClient(): Promise<void> {
    // 如果客户端未初始化或未准备好
    if (!this.client) {
      throw new Error('Redis客户端未初始化');
    }

    // 等待客户端准备就绪
    if (!this._isReady && this.client.status !== 'ready') {
      return new Promise<void>((resolve) => {
        this.client.once('ready', () => {
          this._isReady = true;
          resolve();
        });
      });
    }
  }

  /**
   * 关闭缓存驱动，释放资源
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this._isReady = false;
    }
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或null（如果不存在或已过期）
   */
  async get<T = any>(key: string): Promise<T | null> {
    await this.ensureClient();
    this.stats.operations.get++;

    const data = await this.client.get(key);

    if (data) {
      try {
        this.stats.hits++;
        return JSON.parse(data);
      } catch (error) {
        return data as unknown as T;
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * 获取原始缓存条目（包含值和过期时间）
   * @param key 缓存键
   * @returns 缓存条目或null
   */
  async getEntry<T = any>(key: string): Promise<CacheEntry<T> | null> {
    await this.ensureClient();

    // 获取值和TTL
    const [data, ttl] = await Promise.all([
      this.client.get(key),
      this.client.pttl(key)
    ]);

    if (!data || ttl === -2) {
      // -2表示键不存在
      return null;
    }

    try {
      const value = JSON.parse(data);
      // ttl为-1表示永不过期
      const expiresAt = ttl === -1 ? null : Date.now() + ttl;

      return { value, expiresAt };
    } catch (error) {
      // 如果解析失败，返回原始数据
      const value = data as unknown as T;
      const expiresAt = ttl === -1 ? null : Date.now() + ttl;

      return { value, expiresAt };
    }
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），0表示永不过期
   * @returns 操作是否成功
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    await this.ensureClient();
    this.stats.operations.set++;

    // 序列化值
    const data = typeof value === 'string' ? value : JSON.stringify(value);

    // 设置有效期的毫秒数
    const millis = ttl === 0 ? 0 : ttl !== undefined ? ttl : this.ttl;

    if (millis === 0) {
      // 永不过期
      const result = await this.client.set(key, data);
      return result === 'OK';
    } else {
      // 设置有过期时间的缓存
      const result = await this.client.set(key, data, 'PX', millis);
      return result === 'OK';
    }
  }

  /**
   * 检查缓存键是否存在
   * @param key 缓存键
   * @returns 是否存在且未过期
   */
  async has(key: string): Promise<boolean> {
    await this.ensureClient();
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否成功删除
   */
  async delete(key: string): Promise<boolean> {
    await this.ensureClient();
    this.stats.operations.delete++;

    const result = await this.client.del(key);
    return result >= 1;
  }

  /**
   * 清空所有缓存
   * 警告：这将删除当前数据库中的所有键
   * @returns 是否成功清空
   */
  async clear(): Promise<boolean> {
    await this.ensureClient();

    if (this.prefix) {
      // 只删除带前缀的键
      const keys = await this.client.keys(`${this.prefix}*`);

      if (keys.length > 0) {
        // 移除前缀后再删除
        const rawKeys = keys.map((key: string) =>
          key.slice(this.prefix.length)
        );
        await this.client.del(...rawKeys);
      }
    } else {
      // 清空整个数据库
      await this.client.flushdb();
    }

    return true;
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

    await this.ensureClient();
    this.stats.operations.get += keys.length;

    const values = await this.client.mget(keys);

    return values.map((data: string | null) => {
      if (!data) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      try {
        return JSON.parse(data);
      } catch (error) {
        return data as unknown as T;
      }
    });
  }

  /**
   * 批量设置缓存项
   * @param entries 键值对对象
   * @param ttl 统一的过期时间
   * @returns 是否全部设置成功
   */
  async mset(entries: Record<string, any>, ttl?: number): Promise<boolean> {
    const keys = Object.keys(entries);
    if (keys.length === 0) {
      return true;
    }

    await this.ensureClient();
    this.stats.operations.set += keys.length;

    // 准备键值对数组
    const data: string[] = [];
    for (const key of keys) {
      data.push(key);
      const value = entries[key];
      data.push(typeof value === 'string' ? value : JSON.stringify(value));
    }

    // 使用管道批量操作
    const pipeline = this.client.pipeline();

    // 设置所有值
    pipeline.mset(data);

    // 设置过期时间
    if (ttl !== undefined && ttl !== 0) {
      for (const key of keys) {
        pipeline.pexpire(key, ttl);
      }
    }

    // 执行管道命令
    const results = await pipeline.exec();

    // 检查mset操作的结果
    return results[0][1] === 'OK';
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

    await this.ensureClient();
    this.stats.operations.delete += keys.length;

    const count = await this.client.del(...keys);
    return count;
  }

  /**
   * 增加数值
   * @param key 缓存键
   * @param value 增加的值，默认为1
   * @returns 增加后的值
   */
  async increment(key: string, value: number = 1): Promise<number> {
    await this.ensureClient();

    // 如果值不是整数，使用浮点数递增
    if (!Number.isInteger(value)) {
      return this.client.incrbyfloat(key, value);
    }

    return this.client.incrby(key, value);
  }

  /**
   * 减少数值
   * @param key 缓存键
   * @param value 减少的值，默认为1
   * @returns 减少后的值
   */
  async decrement(key: string, value: number = 1): Promise<number> {
    return this.increment(key, -value);
  }

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  async keys(): Promise<string[]> {
    await this.ensureClient();

    let pattern = '*';
    if (this.prefix) {
      // 只获取带前缀的键
      pattern = `${this.prefix}*`;
    }

    const keys = await this.client.keys(pattern);

    // 如果有前缀，移除前缀
    if (this.prefix) {
      return keys.map((key: string) => key.slice(this.prefix.length));
    }

    return keys;
  }

  /**
   * 获取缓存项数量
   * @returns 缓存项数量
   */
  async size(): Promise<number> {
    await this.ensureClient();

    if (this.prefix) {
      // 只计算带前缀的键
      const keys = await this.client.keys(`${this.prefix}*`);
      return keys.length;
    }

    // 获取所有键数量
    return this.client.dbsize();
  }

  /**
   * 尝试获取分布式锁
   * @param key 锁键名
   * @param ttl 锁超时时间
   * @returns 锁对象或null（获取失败）
   */
  async lock(key: string, ttl: number = 5000): Promise<CacheLock | null> {
    await this.ensureClient();

    const lockKey = `lock:${key}`;

    // 使用SET NX PX命令尝试获取锁
    const result = await this.client.set(lockKey, '1', 'NX', 'PX', ttl);

    if (result === 'OK') {
      return new RedisCacheLock(lockKey, this);
    }

    return null;
  }

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param ttl 过期时间（毫秒）
   * @returns 是否设置成功
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    await this.ensureClient();

    const result = await this.client.pexpire(key, ttl);
    return result === 1;
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

    await this.ensureClient();

    const tagKey = `tag:${tag}`;

    // 使用Redis集合存储标签
    const result = await this.client.sadd(tagKey, ...keys);

    return result >= 0;
  }

  /**
   * 获取标签下的所有缓存键
   * @param tag 标签名
   * @returns 缓存键数组
   */
  async getKeysByTag(tag: string): Promise<string[]> {
    await this.ensureClient();

    const tagKey = `tag:${tag}`;

    // 获取集合中的所有成员
    return this.client.smembers(tagKey);
  }

  /**
   * 使标签下的所有缓存项失效
   * @param tag 标签名
   * @returns 是否成功使所有项失效
   */
  async invalidateTag(tag: string): Promise<boolean> {
    await this.ensureClient();

    const tagKey = `tag:${tag}`;

    // 获取标签中的所有键
    const keys = await this.client.smembers(tagKey);

    if (keys.length === 0) {
      await this.client.del(tagKey);
      return true;
    }

    // 使用管道批量删除
    const pipeline = this.client.pipeline();

    // 删除所有缓存项
    if (keys.length > 0) {
      pipeline.del(...keys);
    }

    // 删除标签本身
    pipeline.del(tagKey);

    // 执行管道命令
    await pipeline.exec();

    return true;
  }

  /**
   * 获取缓存统计信息
   * @returns 统计数据对象
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
    operations: {
      get: number;
      set: number;
      delete: number;
    };
  }> {
    const keyCount = await this.size();

    return {
      ...this.stats,
      keys: keyCount
    };
  }
}
