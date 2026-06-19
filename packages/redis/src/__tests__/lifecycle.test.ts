/**
 * Redis 适配器生命周期测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createContainer, asValue } from 'awilix';
import type { AwilixContainer } from '@stratix/core';
import clientAdapter from '../adapters/redis.adapter.js';

// Mock ioredis
vi.mock('ioredis', () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    ping: vi.fn()
  };

  const Cluster = vi.fn(function RedisClusterMock() {
    return mockRedis;
  });
  const Redis = vi.fn(function RedisMock() {
    return mockRedis;
  });
  (Redis as any).Cluster = Cluster;

  return { Redis, Cluster, default: Redis };
});

describe('Redis Adapter Lifecycle', () => {
  let container: AwilixContainer;
  let adapter: clientAdapter;
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
        single: {
          host: 'localhost',
          port: 6379,
          db: 0
        }
      })
    });

    // 创建适配器实例
    adapter = new clientAdapter(container);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('生命周期钩子', () => {
    it('应该有正确的适配器名称', () => {
      expect(clientAdapter.adapterName).toBe('redisClient');
    });

    it('应该实现 onClose 方法', () => {
      expect(typeof adapter.onClose).toBe('function');
    });

    it('应该在 onClose 时正确关闭 Redis 连接', async () => {
      const redisAdapter = adapter.getAdapter();
      const disconnectSpy = vi.spyOn(redisAdapter, 'disconnect');

      await adapter.onClose();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔄 Closing Redis connections...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Redis connections closed successfully'
      );
    });

    it('应该在 onClose 出错时正确处理错误', async () => {
      const redisAdapter = adapter.getAdapter();
      const mockError = new Error('Disconnect failed');
      vi.spyOn(redisAdapter, 'disconnect').mockRejectedValue(mockError);

      await expect(adapter.onClose()).rejects.toThrow('Disconnect failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Error closing Redis connections:',
        mockError
      );
    });

    it('应该能够获取 Redis 适配器实例', () => {
      const redisAdapter = adapter.getAdapter();
      expect(redisAdapter).toBeDefined();
      expect(typeof redisAdapter.get).toBe('function');
      expect(typeof redisAdapter.set).toBe('function');
      expect(typeof redisAdapter.disconnect).toBe('function');
    });
  });

  describe('适配器代理方法', () => {
    it('应该代理基本的 Redis 操作', async () => {
      // 测试代理方法是否存在
      expect(typeof adapter.get).toBe('function');
      expect(typeof adapter.set).toBe('function');
      expect(typeof adapter.del).toBe('function');
      expect(typeof adapter.ping).toBe('function');
      expect(typeof adapter.isConnected).toBe('function');
      expect(typeof adapter.disconnect).toBe('function');
    });

    it('应该正确代理 get 方法', async () => {
      const getSpy = vi
        .spyOn(adapter.getAdapter(), 'get')
        .mockResolvedValue('test-value');

      const result = await adapter.get('test-key');

      expect(getSpy).toHaveBeenCalledWith('test-key');
      expect(result).toBe('test-value');
    });

    it('应该正确代理 set 方法', async () => {
      const setSpy = vi
        .spyOn(adapter.getAdapter(), 'set')
        .mockResolvedValue('OK');

      const result = await adapter.set('test-key', 'test-value');

      expect(setSpy).toHaveBeenCalledWith('test-key', 'test-value');
      expect(result).toBe('OK');
    });

    it('应该正确代理 ping 方法', async () => {
      const pingSpy = vi
        .spyOn(adapter.getAdapter(), 'ping')
        .mockResolvedValue('PONG');

      const result = await adapter.ping();

      expect(pingSpy).toHaveBeenCalled();
      expect(result).toBe('PONG');
    });
  });
});
