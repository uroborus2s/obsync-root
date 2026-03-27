/**
 * HttpClientService 单元测试
 * 测试重构后的 Redis token 缓存功能
 */

import type { Logger } from '@stratix/core';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { HttpClientService } from '../services/httpClientService.js';
import type { ITokenCacheService } from '../services/interfaces/ITokenCacheService.js';
import { SignatureService } from '../services/signatureService.js';
import type { AccessToken, WpsConfig } from '../types/index.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      defaults: { headers: { common: {} } },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }))
  }
}));

// Mock TokenCacheService
const createMockTokenCacheService = (): ITokenCacheService => ({
  setToken: vi.fn(),
  getToken: vi.fn(),
  isTokenValid: vi.fn(),
  deleteToken: vi.fn(),
  clearAllTokens: vi.fn(),
  getTokenTtl: vi.fn(),
  healthCheck: vi.fn()
});

// Mock SignatureService
const createMockSignatureService = (): SignatureService =>
  ({
    generateRequestSignature: vi.fn().mockReturnValue({
      timestamp: new Date().toUTCString(),
      signature: 'mock-signature'
    }),
    verifySignature: vi.fn()
  }) as any;

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

describe('HttpClientService', () => {
  let httpClientService: HttpClientService;
  let mockTokenCacheService: ITokenCacheService;
  let mockSignatureService: SignatureService;
  let mockLogger: Logger;

  const testConfig: WpsConfig = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    baseUrl: 'https://openapi.wps.cn',
    timeout: 60000
  };

  const testToken: AccessToken = {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 7200,
    refresh_token: 'test-refresh-token',
    scope: 'read write'
  };

  beforeEach(() => {
    mockTokenCacheService = createMockTokenCacheService();
    mockSignatureService = createMockSignatureService();
    mockLogger = createMockLogger();

    httpClientService = new HttpClientService(
      mockSignatureService,
      mockLogger,
      mockTokenCacheService,
      testConfig
    );
  });

  describe('getAppAccessToken', () => {
    it('应该优先使用缓存中的有效 token', async () => {
      // Arrange
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: true,
        data: testToken
      });

      // Act
      const result = await httpClientService.getAppAccessToken();

      // Assert
      expect(result).toBe(testToken.access_token);
      expect(mockTokenCacheService.getToken).toHaveBeenCalledWith(
        testConfig.appId
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Using cached access token',
        { appId: testConfig.appId }
      );
    });

    it('当缓存中没有 token 时应该从 WPS API 获取新 token', async () => {
      // Arrange
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: true,
        data: null
      });
      (mockTokenCacheService.setToken as Mock).mockResolvedValue({
        success: true,
        data: true
      });

      // Mock axios post response
      const mockAxiosInstance = (httpClientService as any).axiosInstance;
      mockAxiosInstance.post = vi.fn().mockResolvedValue({
        data: {
          access_token: testToken.access_token,
          token_type: testToken.token_type,
          expires_in: testToken.expires_in,
          refresh_token: testToken.refresh_token,
          scope: testToken.scope
        }
      });

      // Act
      const result = await httpClientService.getAppAccessToken();

      // Assert
      expect(result).toBe(testToken.access_token);
      expect(mockTokenCacheService.setToken).toHaveBeenCalledWith(
        testConfig.appId,
        expect.objectContaining({
          access_token: testToken.access_token,
          token_type: testToken.token_type,
          expires_in: testToken.expires_in
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'New access token obtained and cached',
        expect.objectContaining({
          appId: testConfig.appId,
          expiresIn: testToken.expires_in
        })
      );
    });

    it('当缓存失败时应该记录警告但继续执行', async () => {
      // Arrange
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: true,
        data: null
      });
      (mockTokenCacheService.setToken as Mock).mockResolvedValue({
        success: false,
        error: 'Redis connection failed'
      });

      // Mock axios post response
      const mockAxiosInstance = (httpClientService as any).axiosInstance;
      mockAxiosInstance.post = vi.fn().mockResolvedValue({
        data: {
          access_token: testToken.access_token,
          token_type: testToken.token_type,
          expires_in: testToken.expires_in
        }
      });

      // Act
      const result = await httpClientService.getAppAccessToken();

      // Assert
      expect(result).toBe(testToken.access_token);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to cache access token',
        expect.objectContaining({
          appId: testConfig.appId,
          error: 'Redis connection failed'
        })
      );
    });
  });

  describe('isTokenValid', () => {
    it('应该调用 tokenCacheService 检查 token 有效性', async () => {
      // Arrange
      (mockTokenCacheService.isTokenValid as Mock).mockResolvedValue({
        success: true,
        data: true
      });

      // Act
      const result = await httpClientService.isTokenValid();

      // Assert
      expect(result).toBe(true);
      expect(mockTokenCacheService.isTokenValid).toHaveBeenCalledWith(
        testConfig.appId
      );
    });

    it('当 tokenCacheService 调用失败时应该返回 false', async () => {
      // Arrange
      (mockTokenCacheService.isTokenValid as Mock).mockResolvedValue({
        success: false,
        error: 'Cache error'
      });

      // Act
      const result = await httpClientService.isTokenValid();

      // Assert
      expect(result).toBe(false);
    });

    it('当 tokenCacheService 抛出异常时应该返回 false', async () => {
      // Arrange
      (mockTokenCacheService.isTokenValid as Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      // Act
      const result = await httpClientService.isTokenValid();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error checking token validity',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('getCurrentAccessToken', () => {
    it('应该从 tokenCacheService 获取当前 token', async () => {
      // Arrange
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: true,
        data: testToken
      });

      // Act
      const result = await httpClientService.getCurrentAccessToken();

      // Assert
      expect(result).toEqual(testToken);
      expect(mockTokenCacheService.getToken).toHaveBeenCalledWith(
        testConfig.appId
      );
    });

    it('当没有 token 时应该返回 undefined', async () => {
      // Arrange
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: true,
        data: null
      });

      // Act
      const result = await httpClientService.getCurrentAccessToken();

      // Assert
      expect(result).toBeUndefined();
    });

    it('当 tokenCacheService 调用失败时应该返回 undefined', async () => {
      // Arrange
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: false,
        error: 'Cache error'
      });

      // Act
      const result = await httpClientService.getCurrentAccessToken();

      // Assert
      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting current access token',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('ensureAccessToken', () => {
    it('当 token 有效且请求头已设置时不应该刷新', async () => {
      // Arrange
      (mockTokenCacheService.isTokenValid as Mock).mockResolvedValue({
        success: true,
        data: true
      });
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: true,
        data: testToken
      });

      // 模拟请求头已正确设置
      const mockAxiosInstance = (httpClientService as any).axiosInstance;
      mockAxiosInstance.defaults.headers.common['Authorization'] =
        `Bearer ${testToken.access_token}`;

      // Act
      await httpClientService.ensureAccessToken();

      // Assert
      expect(mockTokenCacheService.isTokenValid).toHaveBeenCalledWith(
        testConfig.appId
      );
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Token expired or invalid')
      );
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Setting cached token to HTTP client')
      );
    });

    it('当 token 有效但请求头未设置时应该设置请求头', async () => {
      // Arrange
      (mockTokenCacheService.isTokenValid as Mock).mockResolvedValue({
        success: true,
        data: true
      });
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: true,
        data: testToken
      });

      // 模拟请求头未设置
      const mockAxiosInstance = (httpClientService as any).axiosInstance;
      delete mockAxiosInstance.defaults.headers.common['Authorization'];

      // Act
      await httpClientService.ensureAccessToken();

      // Assert
      expect(mockTokenCacheService.isTokenValid).toHaveBeenCalledWith(
        testConfig.appId
      );
      expect(mockTokenCacheService.getToken).toHaveBeenCalledWith(
        testConfig.appId
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Setting cached token to HTTP client',
        { appId: testConfig.appId }
      );
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe(
        `Bearer ${testToken.access_token}`
      );
    });

    it('当 token 有效但请求头不匹配时应该更新请求头', async () => {
      // Arrange
      (mockTokenCacheService.isTokenValid as Mock).mockResolvedValue({
        success: true,
        data: true
      });
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: true,
        data: testToken
      });

      // 模拟请求头设置了错误的 token
      const mockAxiosInstance = (httpClientService as any).axiosInstance;
      mockAxiosInstance.defaults.headers.common['Authorization'] =
        'Bearer old-token';

      // Act
      await httpClientService.ensureAccessToken();

      // Assert
      expect(mockTokenCacheService.isTokenValid).toHaveBeenCalledWith(
        testConfig.appId
      );
      expect(mockTokenCacheService.getToken).toHaveBeenCalledWith(
        testConfig.appId
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Setting cached token to HTTP client',
        { appId: testConfig.appId }
      );
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe(
        `Bearer ${testToken.access_token}`
      );
    });

    it('当 token 无效时应该刷新', async () => {
      // Arrange
      (mockTokenCacheService.isTokenValid as Mock).mockResolvedValue({
        success: true,
        data: false
      });
      (mockTokenCacheService.getToken as Mock).mockResolvedValue({
        success: true,
        data: null
      });
      (mockTokenCacheService.setToken as Mock).mockResolvedValue({
        success: true,
        data: true
      });

      // Mock axios post response
      const mockAxiosInstance = (httpClientService as any).axiosInstance;
      mockAxiosInstance.post = vi.fn().mockResolvedValue({
        data: {
          access_token: testToken.access_token,
          token_type: testToken.token_type,
          expires_in: testToken.expires_in
        }
      });

      // Act
      await httpClientService.ensureAccessToken();

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Token expired or invalid, refreshing...',
        { appId: testConfig.appId }
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Token refreshed successfully',
        { appId: testConfig.appId }
      );
    });
  });
});
