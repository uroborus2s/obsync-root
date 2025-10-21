import type { AwilixContainer, Logger } from '@stratix/core';
import { Cluster, Redis, type RedisOptions } from 'ioredis';
import { RedisPluginOptions } from '../index.js';

/**
 * Redis 配置接口
 */
export interface RedisConfig {
  /** 单实例配置 */
  single?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    options?: RedisOptions;
  };
  /** 集群配置 */
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
    options?: any;
  };
  /** 连接池大小 */
  poolSize?: number;
  /** 重试次数 */
  retryAttempts?: number;
  /** 重试延迟 */
  retryDelay?: number;
}

/**
 * Redis 适配器接口
 */
export interface RedisAdapter {
  /** 获取 Redis 客户端实例 */
  getClient(): Redis | Cluster;

  /** 基础操作方法 */
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<'OK'>;
  del(...keys: string[]): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;

  /** 哈希操作 */
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hdel(key: string, field: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;

  /** 列表操作 */
  lpush(key: string, ...values: string[]): Promise<number>;
  rpush(key: string, ...values: string[]): Promise<number>;
  lpop(key: string): Promise<string | null>;
  rpop(key: string): Promise<string | null>;
  llen(key: string): Promise<number>;

  /** 集合操作 */
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sismember(key: string, member: string): Promise<number>;

  /** 有序集合操作 */
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  zrank(key: string, member: string): Promise<number | null>;

  /** 发布订阅 */
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<void>;
  unsubscribe(channel: string): Promise<void>;

  /** 事务操作 */
  multi(): any;

  /** 管道操作 */
  pipeline(): any;

  /** 健康检查 */
  ping(): Promise<string>;

  /** 连接状态 */
  isConnected(): boolean;

  /** 关闭连接 */
  disconnect(): Promise<void>;
}

/**
 * 创建 Redis 适配器的工厂函数
 */
export function createRedisAdapter(
  pluginContainer: AwilixContainer
): RedisAdapter {
  const logger = pluginContainer.resolve<Logger>('logger');

  // 从配置中获取 Redis 配置
  const config: RedisConfig = pluginContainer.resolve(
    'config'
  ) as RedisPluginOptions;

  let client: Redis | Cluster;
  let isConnected = false;

  // 初始化 Redis 客户端
  const initializeClient = (): Redis | Cluster => {
    try {
      if (config.cluster) {
        // 集群模式
        logger.info('Initializing Redis cluster client', {
          nodes: config.cluster.nodes
        });

        client = new Redis.Cluster(config.cluster.nodes, {
          enableOfflineQueue: false,
          retryDelayOnFailover: config.retryDelay || 100,
          ...config.cluster.options
        });
      } else if (config.single) {
        // 单实例模式
        logger.info('Initializing Redis single client', {
          host: config.single.host,
          port: config.single.port
        });

        client = new Redis({
          host: config.single.host,
          port: config.single.port,
          password: config.single.password,
          db: config.single.db || 0,
          maxRetriesPerRequest: config.retryAttempts || null,
          ...config.single.options
        });
      } else {
        throw new Error('Redis configuration is required');
      }

      // 设置事件监听器
      client.on('connect', () => {
        isConnected = true;
        logger.info('Redis client connected');
      });

      client.on('ready', () => {
        logger.info('Redis client ready');
      });

      client.on('error', (error) => {
        isConnected = false;
        logger.error('Redis client error:', error);
      });

      client.on('close', () => {
        isConnected = false;
        logger.info('Redis client connection closed');
      });

      client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      return client;
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
      throw error;
    }
  };

  // 初始化客户端
  client = initializeClient();

  // 返回适配器实例
  const adapter: RedisAdapter = {
    getClient(): Redis | Cluster {
      return client;
    },

    async get(key: string): Promise<string | null> {
      try {
        return await client.get(key);
      } catch (error) {
        logger.error('Redis GET error:', error);
        throw error;
      }
    },

    async set(key: string, value: string, ttl?: number): Promise<'OK'> {
      try {
        if (ttl) {
          return await client.setex(key, ttl, value);
        }
        return await client.set(key, value);
      } catch (error) {
        logger.error('Redis SET error:', error);
        throw error;
      }
    },

    async del(...keys: string[]): Promise<number> {
      try {
        return await client.del(...keys);
      } catch (error) {
        logger.error('Redis DEL error:', error);
        throw error;
      }
    },

    async exists(key: string): Promise<number> {
      try {
        return await client.exists(key);
      } catch (error) {
        logger.error('Redis EXISTS error:', error);
        throw error;
      }
    },

    async expire(key: string, seconds: number): Promise<number> {
      try {
        return await client.expire(key, seconds);
      } catch (error) {
        logger.error('Redis EXPIRE error:', error);
        throw error;
      }
    },

    async ttl(key: string): Promise<number> {
      try {
        return await client.ttl(key);
      } catch (error) {
        logger.error('Redis TTL error:', error);
        throw error;
      }
    },

    async keys(pattern: string): Promise<string[]> {
      try {
        return await client.keys(pattern);
      } catch (error) {
        logger.error('Redis KEYS error:', error);
        throw error;
      }
    },

    // 哈希操作
    async hget(key: string, field: string): Promise<string | null> {
      try {
        return await client.hget(key, field);
      } catch (error) {
        logger.error('Redis HGET error:', error);
        throw error;
      }
    },

    async hset(key: string, field: string, value: string): Promise<number> {
      try {
        return await client.hset(key, field, value);
      } catch (error) {
        logger.error('Redis HSET error:', error);
        throw error;
      }
    },

    async hdel(key: string, field: string): Promise<number> {
      try {
        return await client.hdel(key, field);
      } catch (error) {
        logger.error('Redis HDEL error:', error);
        throw error;
      }
    },

    async hgetall(key: string): Promise<Record<string, string>> {
      try {
        return await client.hgetall(key);
      } catch (error) {
        logger.error('Redis HGETALL error:', error);
        throw error;
      }
    },

    // 列表操作
    async lpush(key: string, ...values: string[]): Promise<number> {
      try {
        return await client.lpush(key, ...values);
      } catch (error) {
        logger.error('Redis LPUSH error:', error);
        throw error;
      }
    },

    async rpush(key: string, ...values: string[]): Promise<number> {
      try {
        return await client.rpush(key, ...values);
      } catch (error) {
        logger.error('Redis RPUSH error:', error);
        throw error;
      }
    },

    async lpop(key: string): Promise<string | null> {
      try {
        return await client.lpop(key);
      } catch (error) {
        logger.error('Redis LPOP error:', error);
        throw error;
      }
    },

    async rpop(key: string): Promise<string | null> {
      try {
        return await client.rpop(key);
      } catch (error) {
        logger.error('Redis RPOP error:', error);
        throw error;
      }
    },

    async llen(key: string): Promise<number> {
      try {
        return await client.llen(key);
      } catch (error) {
        logger.error('Redis LLEN error:', error);
        throw error;
      }
    },

    // 集合操作
    async sadd(key: string, ...members: string[]): Promise<number> {
      try {
        return await client.sadd(key, ...members);
      } catch (error) {
        logger.error('Redis SADD error:', error);
        throw error;
      }
    },

    async srem(key: string, ...members: string[]): Promise<number> {
      try {
        return await client.srem(key, ...members);
      } catch (error) {
        logger.error('Redis SREM error:', error);
        throw error;
      }
    },

    async smembers(key: string): Promise<string[]> {
      try {
        return await client.smembers(key);
      } catch (error) {
        logger.error('Redis SMEMBERS error:', error);
        throw error;
      }
    },

    async sismember(key: string, member: string): Promise<number> {
      try {
        return await client.sismember(key, member);
      } catch (error) {
        logger.error('Redis SISMEMBER error:', error);
        throw error;
      }
    },

    // 有序集合操作
    async zadd(key: string, score: number, member: string): Promise<number> {
      try {
        return await client.zadd(key, score, member);
      } catch (error) {
        logger.error('Redis ZADD error:', error);
        throw error;
      }
    },

    async zrem(key: string, member: string): Promise<number> {
      try {
        return await client.zrem(key, member);
      } catch (error) {
        logger.error('Redis ZREM error:', error);
        throw error;
      }
    },

    async zrange(key: string, start: number, stop: number): Promise<string[]> {
      try {
        return await client.zrange(key, start, stop);
      } catch (error) {
        logger.error('Redis ZRANGE error:', error);
        throw error;
      }
    },

    async zrank(key: string, member: string): Promise<number | null> {
      try {
        return await client.zrank(key, member);
      } catch (error) {
        logger.error('Redis ZRANK error:', error);
        throw error;
      }
    },

    // 发布订阅
    async publish(channel: string, message: string): Promise<number> {
      try {
        return await client.publish(channel, message);
      } catch (error) {
        logger.error('Redis PUBLISH error:', error);
        throw error;
      }
    },

    async subscribe(channel: string): Promise<void> {
      try {
        await client.subscribe(channel);
      } catch (error) {
        logger.error('Redis SUBSCRIBE error:', error);
        throw error;
      }
    },

    async unsubscribe(channel: string): Promise<void> {
      try {
        await client.unsubscribe(channel);
      } catch (error) {
        logger.error('Redis UNSUBSCRIBE error:', error);
        throw error;
      }
    },

    // 事务操作
    multi() {
      return client.multi();
    },

    // 管道操作
    pipeline() {
      return client.pipeline();
    },

    // 健康检查
    async ping(): Promise<string> {
      try {
        return await client.ping();
      } catch (error) {
        logger.error('Redis PING error:', error);
        throw error;
      }
    },

    // 连接状态
    isConnected(): boolean {
      return isConnected;
    },

    // 关闭连接
    async disconnect(): Promise<void> {
      try {
        client.disconnect();
        isConnected = false;
        logger.info('Redis client disconnected');
      } catch (error) {
        logger.error('Redis disconnect error:', error);
        throw error;
      }
    }
  };

  return adapter;
}

/**
 * Redis 适配器类实现
 * 遵循 Stratix 框架的 Adapter 层规范
 */
export default class clientAdapter {
  private adapter: RedisAdapter;
  private logger: Logger;

  constructor(pluginContainer: AwilixContainer) {
    this.adapter = createRedisAdapter(pluginContainer);
    this.logger = pluginContainer.resolve<Logger>('logger');
  }

  /**
   * 应用关闭时的清理钩子
   * 优雅关闭 Redis 连接
   */
  async onClose(): Promise<void> {
    try {
      this.logger.info('🔄 Closing Redis connections...');
      await this.adapter.disconnect();
      this.logger.info('✅ Redis connections closed successfully');
    } catch (error) {
      this.logger.error('❌ Error closing Redis connections:', error);
      throw error;
    }
  }

  /**
   * 获取 Redis 适配器实例
   */
  getAdapter(): RedisAdapter {
    return this.adapter;
  }

  /**
   * 代理所有 Redis 操作方法
   */
  getClient() {
    return this.adapter.getClient();
  }

  async get(key: string) {
    return this.adapter.get(key);
  }

  async set(key: string, value: string, ttl?: number) {
    return this.adapter.set(key, value, ttl);
  }

  async del(...keys: string[]) {
    return this.adapter.del(...keys);
  }

  async exists(key: string) {
    return this.adapter.exists(key);
  }

  async expire(key: string, seconds: number) {
    return this.adapter.expire(key, seconds);
  }

  async ttl(key: string) {
    return this.adapter.ttl(key);
  }

  async keys(pattern: string) {
    return this.adapter.keys(pattern);
  }

  async hget(key: string, field: string) {
    return this.adapter.hget(key, field);
  }

  async hset(key: string, field: string, value: string) {
    return this.adapter.hset(key, field, value);
  }

  async hdel(key: string, field: string) {
    return this.adapter.hdel(key, field);
  }

  async hgetall(key: string) {
    return this.adapter.hgetall(key);
  }

  async lpush(key: string, ...values: string[]) {
    return this.adapter.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]) {
    return this.adapter.rpush(key, ...values);
  }

  async lpop(key: string) {
    return this.adapter.lpop(key);
  }

  async rpop(key: string) {
    return this.adapter.rpop(key);
  }

  async llen(key: string) {
    return this.adapter.llen(key);
  }

  async sadd(key: string, ...members: string[]) {
    return this.adapter.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]) {
    return this.adapter.srem(key, ...members);
  }

  async smembers(key: string) {
    return this.adapter.smembers(key);
  }

  async sismember(key: string, member: string) {
    return this.adapter.sismember(key, member);
  }

  async zadd(key: string, score: number, member: string) {
    return this.adapter.zadd(key, score, member);
  }

  async zrem(key: string, member: string) {
    return this.adapter.zrem(key, member);
  }

  async zrange(key: string, start: number, stop: number) {
    return this.adapter.zrange(key, start, stop);
  }

  async zrank(key: string, member: string) {
    return this.adapter.zrank(key, member);
  }

  async publish(channel: string, message: string) {
    return this.adapter.publish(channel, message);
  }

  async subscribe(channel: string) {
    return this.adapter.subscribe(channel);
  }

  async unsubscribe(channel: string) {
    return this.adapter.unsubscribe(channel);
  }

  multi() {
    return this.adapter.multi();
  }

  pipeline() {
    return this.adapter.pipeline();
  }

  async ping() {
    return this.adapter.ping();
  }

  isConnected() {
    return this.adapter.isConnected();
  }

  async disconnect() {
    return this.adapter.disconnect();
  }
}
