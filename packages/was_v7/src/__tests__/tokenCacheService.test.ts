/**
 * TokenCacheService 单元测试
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { TokenCacheService } from '../services/tokenCacheService.js';
import type { RedisAdapter } from '@stratix/redis';
import type { Logger } from '@stratix/core';
import type { AccessToken } from '../types/index.js';

// Mock Redis 适配器
const createMockRedisAdapter = (): RedisAdapter => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  keys: vi.fn(),
  ping: vi.fn(),
  isConnected: vi.fn(),
  disconnect: vi.fn(),
  hget: vi.fn(),
  hset: vi.fn(),
  hdel: vi.fn(),
  hgetall: vi.fn(),
  lpush: vi.fn(),
  rpush: vi.fn(),
  lpop: vi.fn(),
  rpop: vi.fn(),
  llen: vi.fn(),
  lrange: vi.fn(),
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
  multi: vi.fn(),
  pipeline: vi.fn(),
  getClient: vi.fn()
});

// Mock Logger
const createMockLogger = (): Logger => ({
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn()
});

describe('TokenCacheService', () => {
  let tokenCacheService: TokenCacheService;
  let mockRedisAdapter: RedisAdapter;
  let mockLogger: Logger;

  const testAppId = 'test-app-id';
  const testToken: AccessToken = {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 7200,
    refresh_token: 'test-refresh-token',
    scope: 'read write'
  };

  beforeEach(() => {
    mockRedisAdapter = createMockRedisAdapter();
    mockLogger = createMockLogger();
    
    tokenCacheService = new TokenCacheService(
      mockRedisAdapter,
      mockLogger,
      {
        keyPrefix: 'test:token:',
        defaultTtl: 7200,
        earlyExpireSeconds: 900,
        enableFallback: true
      }
    );
  });

  describe('setToken', () => {
    it('应该成功将 token 存储到 Redis', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');
      (mockRedisAdapter.set as Mock).mockResolvedValue('OK');

      // Act
      const result = await tokenCacheService.setToken(testAppId, testToken);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRedisAdapter.set).toHaveBeenCalledWith(
        'test:token:test-app-id',
        JSON.stringify(testToken),
        7200
      );
    });

    it('当 Redis 不可用时应该降级到内存存储', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockRejectedValue(new Error('Redis connection failed'));

      // Act
      const result = await tokenCacheService.setToken(testAppId, testToken);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection lost'),
        expect.any(Object)
      );
    });

    it('当降级被禁用且 Redis 不可用时应该返回失败', async () => {
      // Arrange
      tokenCacheService = new TokenCacheService(
        mockRedisAdapter,
        mockLogger,
        { enableFallback: false }
      );
      (mockRedisAdapter.ping as Mock).mockRejectedValue(new Error('Redis connection failed'));

      // Act
      const result = await tokenCacheService.setToken(testAppId, testToken);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis unavailable and fallback disabled');
    });
  });

  describe('getToken', () => {
    it('应该从 Redis 成功获取 token', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');
      (mockRedisAdapter.get as Mock).mockResolvedValue(JSON.stringify(testToken));

      // Act
      const result = await tokenCacheService.getToken(testAppId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testToken);
      expect(mockRedisAdapter.get).toHaveBeenCalledWith('test:token:test-app-id');
    });

    it('当 Redis 中没有 token 时应该返回 null', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');
      (mockRedisAdapter.get as Mock).mockResolvedValue(null);

      // Act
      const result = await tokenCacheService.getToken(testAppId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('当 Redis 不可用时应该从内存存储获取 token', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockRejectedValue(new Error('Redis connection failed'));
      
      // 先存储到内存
      await tokenCacheService.setToken(testAppId, testToken);
      
      // Act
      const result = await tokenCacheService.getToken(testAppId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testToken);
    });
  });

  describe('isTokenValid', () => {
    it('当 token 存在时应该返回 true', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');
      (mockRedisAdapter.get as Mock).mockResolvedValue(JSON.stringify(testToken));

      // Act
      const result = await tokenCacheService.isTokenValid(testAppId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('当 token 不存在时应该返回 false', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');
      (mockRedisAdapter.get as Mock).mockResolvedValue(null);

      // Act
      const result = await tokenCacheService.isTokenValid(testAppId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('deleteToken', () => {
    it('应该从 Redis 和内存存储中删除 token', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');
      (mockRedisAdapter.del as Mock).mockResolvedValue(1);

      // Act
      const result = await tokenCacheService.deleteToken(testAppId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRedisAdapter.del).toHaveBeenCalledWith('test:token:test-app-id');
    });
  });

  describe('clearAllTokens', () => {
    it('应该清除所有 token', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');
      (mockRedisAdapter.keys as Mock).mockResolvedValue(['test:token:app1', 'test:token:app2']);
      (mockRedisAdapter.del as Mock).mockResolvedValue(2);

      // Act
      const result = await tokenCacheService.clearAllTokens();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRedisAdapter.keys).toHaveBeenCalledWith('test:token:*');
      expect(mockRedisAdapter.del).toHaveBeenCalledWith('test:token:app1', 'test:token:app2');
    });
  });

  describe('getTokenTtl', () => {
    it('应该从 Redis 获取 token TTL', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');
      (mockRedisAdapter.ttl as Mock).mockResolvedValue(3600);

      // Act
      const result = await tokenCacheService.getTokenTtl(testAppId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(3600);
      expect(mockRedisAdapter.ttl).toHaveBeenCalledWith('test:token:test-app-id');
    });

    it('当 token 不存在时应该返回 -1', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');
      (mockRedisAdapter.ttl as Mock).mockResolvedValue(-2);

      // Act
      const result = await tokenCacheService.getTokenTtl(testAppId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(-1);
    });
  });

  describe('healthCheck', () => {
    it('当 Redis 健康时应该返回 true', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockResolvedValue('PONG');

      // Act
      const result = await tokenCacheService.healthCheck();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('当 Redis 不健康但启用降级时应该返回 true', async () => {
      // Arrange
      (mockRedisAdapter.ping as Mock).mockRejectedValue(new Error('Redis connection failed'));

      // Act
      const result = await tokenCacheService.healthCheck();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true); // 因为启用了降级
    });

    it('当 Redis 不健康且禁用降级时应该返回 false', async () => {
      // Arrange
      tokenCacheService = new TokenCacheService(
        mockRedisAdapter,
        mockLogger,
        { enableFallback: false }
      );
      (mockRedisAdapter.ping as Mock).mockRejectedValue(new Error('Redis connection failed'));

      // Act
      const result = await tokenCacheService.healthCheck();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });
});
