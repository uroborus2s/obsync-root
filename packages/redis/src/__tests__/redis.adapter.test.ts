/**
 * Redis 适配器测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createContainer, asValue } from 'awilix';
import type { AwilixContainer } from '@stratix/core';
import { createRedisAdapter, type RedisAdapter } from '../adapters/redis.adapter.js';

// Mock ioredis
vi.mock('ioredis', () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    expire: vi.fn(),
    hget: vi.fn(),
    hset: vi.fn(),
    hdel: vi.fn(),
    hgetall: vi.fn(),
    lpush: vi.fn(),
    rpush: vi.fn(),
    lpop: vi.fn(),
    rpop: vi.fn(),
    llen: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    smembers: vi.fn(),
    sismember: vi.fn(),
    zadd: vi.fn(),
    zrem: vi.fn(),
    zrange: vi.fn(),
    zrank: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    multi: vi.fn(() => mockRedis),
    pipeline: vi.fn(() => mockRedis),
    ping: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    exec: vi.fn()
  };

  return {
    Redis: vi.fn(() => mockRedis),
    Cluster: vi.fn(() => mockRedis)
  };
});

describe('Redis Adapter', () => {
  let container: AwilixContainer;
  let redisAdapter: RedisAdapter;
  let mockLogger: any;

  beforeEach(() => {
    // 创建模拟 logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    // 创建容器
    container = createContainer();
    container.register({
      logger: asValue(mockLogger),
      config: asValue({
        redis: {
          single: {
            host: 'localhost',
            port: 6379,
            db: 0
          }
        }
      })
    });

    // 创建 Redis 适配器
    redisAdapter = createRedisAdapter(container);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基础操作', () => {
    it('应该能够执行 GET 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.get as any).mockResolvedValue('test-value');

      const result = await redisAdapter.get('test-key');
      
      expect(result).toBe('test-value');
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('应该能够执行 SET 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.set as any).mockResolvedValue('OK');

      const result = await redisAdapter.set('test-key', 'test-value');
      
      expect(result).toBe('OK');
      expect(mockClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('应该能够执行带 TTL 的 SET 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.setex as any).mockResolvedValue('OK');

      const result = await redisAdapter.set('test-key', 'test-value', 3600);
      
      expect(result).toBe('OK');
      expect(mockClient.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
    });

    it('应该能够执行 DEL 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.del as any).mockResolvedValue(1);

      const result = await redisAdapter.del('test-key');
      
      expect(result).toBe(1);
      expect(mockClient.del).toHaveBeenCalledWith('test-key');
    });

    it('应该能够执行 EXISTS 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.exists as any).mockResolvedValue(1);

      const result = await redisAdapter.exists('test-key');
      
      expect(result).toBe(1);
      expect(mockClient.exists).toHaveBeenCalledWith('test-key');
    });
  });

  describe('哈希操作', () => {
    it('应该能够执行 HGET 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.hget as any).mockResolvedValue('field-value');

      const result = await redisAdapter.hget('test-hash', 'test-field');
      
      expect(result).toBe('field-value');
      expect(mockClient.hget).toHaveBeenCalledWith('test-hash', 'test-field');
    });

    it('应该能够执行 HSET 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.hset as any).mockResolvedValue(1);

      const result = await redisAdapter.hset('test-hash', 'test-field', 'field-value');
      
      expect(result).toBe(1);
      expect(mockClient.hset).toHaveBeenCalledWith('test-hash', 'test-field', 'field-value');
    });

    it('应该能够执行 HGETALL 操作', async () => {
      const mockClient = redisAdapter.getClient();
      const mockData = { field1: 'value1', field2: 'value2' };
      (mockClient.hgetall as any).mockResolvedValue(mockData);

      const result = await redisAdapter.hgetall('test-hash');
      
      expect(result).toEqual(mockData);
      expect(mockClient.hgetall).toHaveBeenCalledWith('test-hash');
    });
  });

  describe('列表操作', () => {
    it('应该能够执行 LPUSH 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.lpush as any).mockResolvedValue(2);

      const result = await redisAdapter.lpush('test-list', 'value1', 'value2');
      
      expect(result).toBe(2);
      expect(mockClient.lpush).toHaveBeenCalledWith('test-list', 'value1', 'value2');
    });

    it('应该能够执行 LPOP 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.lpop as any).mockResolvedValue('popped-value');

      const result = await redisAdapter.lpop('test-list');
      
      expect(result).toBe('popped-value');
      expect(mockClient.lpop).toHaveBeenCalledWith('test-list');
    });
  });

  describe('健康检查', () => {
    it('应该能够执行 PING 操作', async () => {
      const mockClient = redisAdapter.getClient();
      (mockClient.ping as any).mockResolvedValue('PONG');

      const result = await redisAdapter.ping();
      
      expect(result).toBe('PONG');
      expect(mockClient.ping).toHaveBeenCalled();
    });

    it('应该能够检查连接状态', () => {
      const isConnected = redisAdapter.isConnected();
      
      expect(typeof isConnected).toBe('boolean');
    });
  });

  describe('错误处理', () => {
    it('应该正确处理 GET 操作错误', async () => {
      const mockClient = redisAdapter.getClient();
      const mockError = new Error('Redis connection failed');
      (mockClient.get as any).mockRejectedValue(mockError);

      await expect(redisAdapter.get('test-key')).rejects.toThrow('Redis connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Redis GET error:', mockError);
    });

    it('应该正确处理 SET 操作错误', async () => {
      const mockClient = redisAdapter.getClient();
      const mockError = new Error('Redis write failed');
      (mockClient.set as any).mockRejectedValue(mockError);

      await expect(redisAdapter.set('test-key', 'test-value')).rejects.toThrow('Redis write failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Redis SET error:', mockError);
    });
  });

  describe('事务和管道', () => {
    it('应该能够创建事务', () => {
      const multi = redisAdapter.multi();
      
      expect(multi).toBeDefined();
      expect(redisAdapter.getClient().multi).toHaveBeenCalled();
    });

    it('应该能够创建管道', () => {
      const pipeline = redisAdapter.pipeline();
      
      expect(pipeline).toBeDefined();
      expect(redisAdapter.getClient().pipeline).toHaveBeenCalled();
    });
  });
});
