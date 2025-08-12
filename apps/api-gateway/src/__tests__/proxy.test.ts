/**
 * 代理功能测试
 * 基于@fastify/http-proxy的正确实现
 * 包含认证、监控、健康检查等完整功能测试
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';

describe('Proxy Functionality (直接在stratix.config.ts中配置)', () => {
  describe('Auth Utils', () => {
    it('should extract token from Authorization header', async () => {
      const { extractTokenFromRequest } = await import('../utils/authUtils.js');

      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token-123'
        },
        cookies: {}
      } as any;

      const token = extractTokenFromRequest(mockRequest);
      expect(token).toBe('test-token-123');
    });

    it('should extract token from Cookie', async () => {
      const { extractTokenFromRequest } = await import('../utils/authUtils.js');

      const mockRequest = {
        headers: {},
        cookies: {
          wps_jwt_token: 'cookie-token-456'
        }
      } as any;

      const token = extractTokenFromRequest(mockRequest);
      expect(token).toBe('cookie-token-456');
    });

    it('should return null when no token found', async () => {
      const { extractTokenFromRequest } = await import('../utils/authUtils.js');

      const mockRequest = {
        headers: {},
        cookies: {}
      } as any;

      const token = extractTokenFromRequest(mockRequest);
      expect(token).toBeNull();
    });

    it('should check whitelisted paths correctly', async () => {
      const { isWhitelistedPath } = await import('../utils/authUtils.js');

      expect(isWhitelistedPath('/health')).toBe(true);
      expect(isWhitelistedPath('/metrics')).toBe(true);
      expect(isWhitelistedPath('/api/auth/authorization')).toBe(true);
      expect(isWhitelistedPath('/api/tasks/list')).toBe(false);
      expect(isWhitelistedPath('/some/random/path')).toBe(false);
    });
  });

  describe('Request Headers Rewriter', () => {
    it('should add user information to headers', async () => {
      const { createRequestHeadersRewriter } = await import(
        '../utils/authUtils.js'
      );

      const rewriter = createRequestHeadersRewriter();
      const mockRequest = {
        user: {
          id: 'user123',
          name: '张三',
          userType: 'student',
          userNumber: '2021001',
          email: 'zhangsan@example.com',
          collegeName: '计算机学院'
        }
      };

      const originalHeaders = {
        'content-type': 'application/json'
      };

      const newHeaders = rewriter(mockRequest, originalHeaders);

      expect(newHeaders['x-user-id']).toBe('user123');
      expect(newHeaders['x-user-name']).toBe(encodeURIComponent('张三'));
      expect(newHeaders['x-user-type']).toBe('student');
      expect(newHeaders['x-user-number']).toBe('2021001');
      expect(newHeaders['x-user-email']).toBe('zhangsan@example.com');
      expect(newHeaders['x-user-college']).toBe(
        encodeURIComponent('计算机学院')
      );
      expect(newHeaders['x-gateway']).toBe('stratix-gateway');
      expect(newHeaders['x-gateway-timestamp']).toBeDefined();
      expect(newHeaders['x-request-id']).toBeDefined();
    });

    it('should preserve original headers', async () => {
      const { createRequestHeadersRewriter } = await import(
        '../utils/authUtils.js'
      );

      const rewriter = createRequestHeadersRewriter();
      const mockRequest = {};

      const originalHeaders = {
        'content-type': 'application/json',
        'user-agent': 'test-agent'
      };

      const newHeaders = rewriter(mockRequest, originalHeaders);

      expect(newHeaders['content-type']).toBe('application/json');
      expect(newHeaders['user-agent']).toBe('test-agent');
      expect(newHeaders['x-gateway']).toBe('stratix-gateway');
    });
  });

  describe('JWT Token Verification', () => {
    beforeAll(() => {
      // 设置测试用的JWT密钥
      process.env.JWT_SECRET = 'test-secret-key';
    });

    it('should return invalid for empty token', async () => {
      const { verifyJWTToken } = await import('../utils/authUtils.js');

      const result = verifyJWTToken('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is missing');
    });

    it('should return invalid for malformed token', async () => {
      const { verifyJWTToken } = await import('../utils/authUtils.js');

      const result = verifyJWTToken('invalid-token');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Malformed token');
    });

    // 注意：这里需要一个有效的JWT token来测试成功情况
    // 在实际项目中，你可能需要使用jwt库来生成测试token
  });

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

  describe('Health Check Manager', () => {
    let healthCheckManager: any;

    beforeEach(async () => {
      const { HealthCheckManager } = await import('../utils/healthCheck.js');
      healthCheckManager = new HealthCheckManager();
    });

    afterEach(() => {
      healthCheckManager.shutdown();
    });

    it('should register a service for health checking', () => {
      const config = {
        name: 'health-test-service',
        url: 'http://localhost:3001/health',
        timeout: 5000,
        interval: 30000,
        retries: 3
      };

      healthCheckManager.registerService(config);
      const health = healthCheckManager.getServiceHealth('health-test-service');

      expect(health).toBeDefined();
      expect(health.name).toBe('health-test-service');
      expect(health.status).toBe('unknown');
    });

    it('should get all services health', () => {
      const config1 = {
        name: 'service1',
        url: 'http://localhost:3001/health',
        timeout: 5000,
        interval: 30000,
        retries: 3
      };

      const config2 = {
        name: 'service2',
        url: 'http://localhost:3002/health',
        timeout: 5000,
        interval: 30000,
        retries: 3
      };

      healthCheckManager.registerService(config1);
      healthCheckManager.registerService(config2);

      const allHealth = healthCheckManager.getAllServicesHealth();
      expect(allHealth).toHaveLength(2);
      expect(allHealth.map((h) => h.name)).toContain('service1');
      expect(allHealth.map((h) => h.name)).toContain('service2');
    });
  });

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
