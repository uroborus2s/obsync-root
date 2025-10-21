/**
 * WPSApiService 单元测试
 * 测试缓存逻辑、降级机制和错误处理
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { Logger } from '@stratix/core';
import type { RedisAdapter } from '@stratix/redis';
import WPSApiService, { 
  type WPSConfig, 
  type WPSJSAPITokenResponse, 
  type WPSJSAPITicketResponse,
  type CachedTokenData,
  type CachedTicketData
} from '../../services/WPSApiService.js';

// Mock fetch
global.fetch = vi.fn();

describe('WPSApiService Cache Tests', () => {
  let wpsApiService: WPSApiService;
  let mockLogger: Logger;
  let mockRedisAdapter: RedisAdapter;
  let mockFetch: MockedFunction<typeof fetch>;

  const mockConfig: WPSConfig = {
    baseUrl: 'https://test.wps.cn',
    appid: 'test-app-id',
    appkey: 'test-app-key'
  };

  const mockTokenResponse: WPSJSAPITokenResponse = {
    result: 0,
    jsapi_token: 'mock-token-123',
    expires_in: 7200
  };

  const mockTicketResponse: WPSJSAPITicketResponse = {
    result: 0,
    jsapi_ticket: 'mock-ticket-456',
    expires_in: 7200
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    // Mock RedisAdapter
    mockRedisAdapter = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      ping: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true)
    } as any;

    // Mock fetch
    mockFetch = vi.mocked(fetch);
    
    // Create service instance
    wpsApiService = new WPSApiService(mockLogger, mockConfig, mockRedisAdapter);
  });

  describe('getServerAccessToken', () => {
    it('should return cached token from Redis when available', async () => {
      // Arrange
      const cachedData: CachedTokenData = {
        jsapi_token: 'cached-token',
        expires_at: Date.now() + 3600000, // 1 hour from now
        cached_at: Date.now() - 1000
      };
      
      mockRedisAdapter.get = vi.fn().mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await wpsApiService.getServerAccessToken();

      // Assert
      expect(result.jsapi_token).toBe('cached-token');
      expect(result.result).toBe(0);
      expect(mockRedisAdapter.get).toHaveBeenCalledWith('wps:jsapi:token:test-app-id');
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Using cached JSAPI token from Redis');
    });

    it('should call API when cache is empty', async () => {
      // Arrange
      mockRedisAdapter.get = vi.fn().mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      } as Response);

      // Act
      const result = await wpsApiService.getServerAccessToken();

      // Assert
      expect(result).toEqual(mockTokenResponse);
      expect(mockFetch).toHaveBeenCalled();
      expect(mockRedisAdapter.set).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss, requesting server access token')
      );
    });

    it('should use memory cache when Redis fails', async () => {
      // Arrange
      mockRedisAdapter.get = vi.fn().mockRejectedValue(new Error('Redis connection failed'));
      
      // First call to populate memory cache
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      } as Response);
      
      await wpsApiService.getServerAccessToken();
      
      // Clear fetch mock for second call
      mockFetch.mockClear();

      // Act - Second call should use memory cache
      const result = await wpsApiService.getServerAccessToken();

      // Assert
      expect(result.jsapi_token).toBe('mock-token-123');
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Using cached JSAPI token from memory fallback');
    });

    it('should handle expired cache correctly', async () => {
      // Arrange
      const expiredCachedData: CachedTokenData = {
        jsapi_token: 'expired-token',
        expires_at: Date.now() - 1000, // Expired 1 second ago
        cached_at: Date.now() - 3600000
      };
      
      mockRedisAdapter.get = vi.fn().mockResolvedValue(JSON.stringify(expiredCachedData));
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      } as Response);

      // Act
      const result = await wpsApiService.getServerAccessToken();

      // Assert
      expect(result).toEqual(mockTokenResponse);
      expect(mockFetch).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss, requesting server access token')
      );
    });

    it('should use expired cache as fallback when API fails', async () => {
      // Arrange
      const expiredCachedData: CachedTokenData = {
        jsapi_token: 'expired-but-usable-token',
        expires_at: Date.now() - 1000,
        cached_at: Date.now() - 3600000
      };
      
      mockRedisAdapter.get = vi.fn()
        .mockResolvedValueOnce(JSON.stringify(expiredCachedData)) // First call for normal cache check
        .mockResolvedValueOnce(JSON.stringify(expiredCachedData)); // Second call for fallback
      
      mockFetch.mockRejectedValue(new Error('API is down'));

      // Act
      const result = await wpsApiService.getServerAccessToken();

      // Assert
      expect(result.jsapi_token).toBe('expired-but-usable-token');
      expect(result.expires_in).toBe(60); // Temporary 1-minute validity
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'API failed, using expired cached JSAPI token as fallback',
        expect.any(Object)
      );
    });
  });

  describe('getJSAPITicket', () => {
    it('should return cached ticket from Redis when available', async () => {
      // Arrange
      const cachedData: CachedTicketData = {
        jsapi_ticket: 'cached-ticket',
        expires_at: Date.now() + 3600000,
        cached_at: Date.now() - 1000
      };
      
      mockRedisAdapter.get = vi.fn().mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await wpsApiService.getJSAPITicket('test-token');

      // Assert
      expect(result.jsapi_ticket).toBe('cached-ticket');
      expect(result.result).toBe(0);
      expect(mockRedisAdapter.get).toHaveBeenCalledWith('wps:jsapi:ticket:test-app-id');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call API when cache is empty', async () => {
      // Arrange
      mockRedisAdapter.get = vi.fn().mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTicketResponse)
      } as Response);

      // Act
      const result = await wpsApiService.getJSAPITicket('test-token');

      // Assert
      expect(result).toEqual(mockTicketResponse);
      expect(mockFetch).toHaveBeenCalled();
      expect(mockRedisAdapter.set).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      // Act
      const stats = wpsApiService.getCacheStats();

      // Assert
      expect(stats).toHaveProperty('memoryCache');
      expect(stats).toHaveProperty('redisEnabled');
      expect(stats.redisEnabled).toBe(true);
      expect(stats.memoryCache).toHaveProperty('size');
      expect(stats.memoryCache).toHaveProperty('keys');
    });

    it('should work without Redis adapter', () => {
      // Arrange
      const serviceWithoutRedis = new WPSApiService(mockLogger, mockConfig);

      // Act
      const stats = serviceWithoutRedis.getCacheStats();

      // Assert
      expect(stats.redisEnabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Arrange
      mockRedisAdapter.get = vi.fn().mockRejectedValue(new Error('Connection timeout'));
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      } as Response);

      // Act
      const result = await wpsApiService.getServerAccessToken();

      // Assert
      expect(result).toEqual(mockTokenResponse);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Redis cache get failed, falling back',
        expect.any(Object)
      );
    });

    it('should handle API errors with proper logging', async () => {
      // Arrange
      mockRedisAdapter.get = vi.fn().mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server Error')
      } as Response);

      // Act & Assert
      await expect(wpsApiService.getServerAccessToken()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
