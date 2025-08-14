/**
 * 代理功能测试
 * 基于@fastify/http-proxy的正确实现
 * 包含认证、监控、健康检查等完整功能测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Proxy Functionality (直接在stratix.config.ts中配置)', () => {
  describe('Auth Utils', () => {
    it('should check whitelisted paths correctly', async () => {
      const { isWhitelistedPath } = await import('../utils/authUtils.js');

      expect(isWhitelistedPath('/health')).toBe(true);
      expect(isWhitelistedPath('/metrics')).toBe(true);
      expect(isWhitelistedPath('/api/auth/authorization')).toBe(true);
      expect(isWhitelistedPath('/api/tasks/list')).toBe(false);
      expect(isWhitelistedPath('/some/random/path')).toBe(false);
    });
  });

  describe('JWT Service Token Extraction', () => {
    it('should extract token from Authorization header via JWTService', async () => {
      // 模拟JWTService
      const JWTService = (await import('../services/JWTService.js')).default;
      const mockOptions = {
        jwtSecret: 'test-secret',
        cookieName: 'wps_jwt_token'
      };
      const mockLogger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };

      const jwtService = new JWTService(mockLogger as any, mockOptions as any);

      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token-123'
        },
        cookies: {}
      } as any;

      const token = jwtService.extractTokenFromRequest(mockRequest);
      expect(token).toBe('test-token-123');
    });

    it('should extract token from Cookie via JWTService', async () => {
      const JWTService = (await import('../services/JWTService.js')).default;
      const mockOptions = {
        jwtSecret: 'test-secret',
        cookieName: 'wps_jwt_token'
      };
      const mockLogger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };

      const jwtService = new JWTService(mockLogger as any, mockOptions as any);

      const mockRequest = {
        headers: {},
        cookies: {
          wps_jwt_token: 'cookie-token-456'
        }
      } as any;

      const token = jwtService.extractTokenFromRequest(mockRequest);
      expect(token).toBe('cookie-token-456');
    });

    it('should return null when no token found via JWTService', async () => {
      const JWTService = (await import('../services/JWTService.js')).default;
      const mockOptions = {
        jwtSecret: 'test-secret',
        cookieName: 'wps_jwt_token'
      };
      const mockLogger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() };

      const jwtService = new JWTService(mockLogger as any, mockOptions as any);

      const mockRequest = {
        headers: {},
        cookies: {}
      } as any;

      const token = jwtService.extractTokenFromRequest(mockRequest);
      expect(token).toBeNull();
    });
  });

  // 请求头重写功能已移除，因为在实际代理逻辑中未被使用

  // JWT验证功能现在由JWTService处理，相关测试已移至JWTService的测试文件中

  describe('Proxy Status Controller', () => {
    it('should return proxy status', async () => {
      // 模拟logger
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      };

      const { default: ProxyStatusController } = await import(
        '../controllers/ProxyStatusController.js'
      );
      const controller = new ProxyStatusController(mockLogger as any);

      // 模拟请求和响应
      const mockRequest = {} as any;
      const mockReply = {
        send: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis()
      } as any;

      await controller.getProxyStatus(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          initialized: true,
          services: expect.any(Array),
          environment: expect.any(Object),
          configuration: expect.any(Object),
          timestamp: expect.any(String)
        })
      });
    });

    it('should return registered services', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      };

      const { default: ProxyStatusController } = await import(
        '../controllers/ProxyStatusController.js'
      );
      const controller = new ProxyStatusController(mockLogger as any);

      const mockRequest = {} as any;
      const mockReply = {
        send: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis()
      } as any;

      await controller.getRegisteredServices(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          services: expect.any(Array),
          count: expect.any(Number),
          timestamp: expect.any(String)
        })
      });
    });

    it('should return tasks service config', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      };

      const { default: ProxyStatusController } = await import(
        '../controllers/ProxyStatusController.js'
      );
      const controller = new ProxyStatusController(mockLogger as any);

      const mockRequest = {
        params: { serviceName: 'tasks' }
      } as any;
      const mockReply = {
        send: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis()
      } as any;

      await controller.getServiceConfig(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: 'tasks',
          prefix: '/api/tasks',
          upstream: expect.any(String),
          requireAuth: true
        })
      });
    });

    it('should return 404 for non-existent service', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      };

      const { default: ProxyStatusController } = await import(
        '../controllers/ProxyStatusController.js'
      );
      const controller = new ProxyStatusController(mockLogger as any);

      const mockRequest = {
        params: { serviceName: 'nonexistent' }
      } as any;
      const mockReply = {
        send: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis()
      } as any;

      await controller.getServiceConfig(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'SERVICE_NOT_FOUND',
        message: "Service 'nonexistent' not found"
      });
    });
  });

  describe('Proxy Manager', () => {
    let proxyManager: any;

    beforeEach(async () => {
      const { ProxyManager } = await import('../services/ProxyManager.js');
      proxyManager = new ProxyManager();
    });

    it('should register a service successfully', () => {
      const config = {
        name: 'test-service',
        upstream: 'http://localhost:3001',
        prefix: '/api/test',
        requireAuth: true,
        timeout: 30000,
        retries: 3,
        httpMethods: ['GET', 'POST']
      };

      proxyManager.registerService(config);
      const retrievedConfig = proxyManager.getServiceConfig('test-service');

      expect(retrievedConfig).toEqual(config);
    });

    it('should validate service configuration', () => {
      const validConfig = {
        name: 'valid-service',
        upstream: 'http://localhost:3001',
        prefix: '/api/valid',
        requireAuth: true,
        timeout: 30000,
        retries: 3,
        httpMethods: ['GET', 'POST']
      };

      const invalidConfig = {
        name: '',
        upstream: 'invalid-url',
        prefix: '',
        requireAuth: true,
        timeout: -1,
        retries: -1,
        httpMethods: []
      };

      const validResult = proxyManager.validateServiceConfig(validConfig);
      const invalidResult = proxyManager.validateServiceConfig(invalidConfig);

      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should get service statistics', () => {
      const config = {
        name: 'stats-service',
        upstream: 'http://localhost:3001',
        prefix: '/api/stats',
        requireAuth: true,
        timeout: 30000,
        retries: 3,
        httpMethods: ['GET']
      };

      proxyManager.registerService(config);
      const stats = proxyManager.getServiceStats('stats-service');

      expect(stats.name).toBe('stats-service');
      expect(stats.isRegistered).toBe(true);
    });

    it('should unregister a service', () => {
      const config = {
        name: 'temp-service',
        upstream: 'http://localhost:3001',
        prefix: '/api/temp',
        requireAuth: true,
        timeout: 30000,
        retries: 3,
        httpMethods: ['GET']
      };

      proxyManager.registerService(config);
      expect(proxyManager.getServiceConfig('temp-service')).toBeDefined();

      const unregistered = proxyManager.unregisterService('temp-service');
      expect(unregistered).toBe(true);
      expect(proxyManager.getServiceConfig('temp-service')).toBeUndefined();
    });
  });

  // 健康检查功能现在由@fastify/under-pressure统一管理，相关测试已移至集成测试中

  describe('Metrics Collection', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should record proxy metrics', async () => {
      const { recordProxyMetrics } = await import('../utils/metrics.js');

      // 这个测试主要验证函数不会抛出错误
      expect(() => {
        recordProxyMetrics('test-service', 1000, 200);
        recordProxyMetrics('test-service', 2000, 500, 'timeout');
      }).not.toThrow();
    });

    it('should record auth metrics', async () => {
      const { recordAuthMetrics } = await import('../utils/metrics.js');

      expect(() => {
        recordAuthMetrics('success', 100);
        recordAuthMetrics('failure', 200, 'invalid_token');
      }).not.toThrow();
    });

    it('should record cache metrics', async () => {
      const { recordCacheMetrics } = await import('../utils/metrics.js');

      expect(() => {
        recordCacheMetrics('auth', 'hit');
        recordCacheMetrics('auth', 'miss');
      }).not.toThrow();
    });
  });
});
