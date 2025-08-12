/**
 * 控制器单元测试
 * 验证控制器类的基本功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import AuthController from '../../controllers/AuthController.js';
import GatewayController from '../../controllers/GatewayController.js';
import JWTService from '../../services/JWTService.js';

describe('Controllers Unit Tests', () => {
  let mockLogger: any;
  let mockJWTService: JWTService;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // 创建真实的JWTService实例用于测试
    mockJWTService = new JWTService(mockLogger);
  });

  describe('AuthController', () => {
    it('应该能够正确实例化', () => {
      const controller = new AuthController(mockJWTService, mockLogger);
      expect(controller).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ AuthController initialized with application-level DI'
      );
    });

    it('应该有正确的方法', () => {
      const controller = new AuthController(mockJWTService, mockLogger);
      expect(typeof controller.handleAuthorizationCallback).toBe('function');
      expect(typeof controller.verifyAuth).toBe('function');
      expect(typeof controller.logout).toBe('function');
    });
  });

  describe('GatewayController', () => {
    it('应该能够正确实例化', () => {
      const controller = new GatewayController(mockJWTService, mockLogger);
      expect(controller).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ GatewayController initialized with application-level DI'
      );
    });

    it('应该有正确的方法', () => {
      const controller = new GatewayController(mockJWTService, mockLogger);
      expect(typeof controller.getGatewayStatus).toBe('function');
      expect(typeof controller.getGatewayConfig).toBe('function');
      expect(typeof controller.getGatewayMetrics).toBe('function');
      expect(typeof controller.healthCheck).toBe('function');
      expect(typeof controller.readinessCheck).toBe('function');
      expect(typeof controller.livenessCheck).toBe('function');
    });
  });

  describe('JWTService', () => {
    it('应该能够正确实例化', () => {
      expect(mockJWTService).toBeDefined();
      expect(typeof mockJWTService.generateToken).toBe('function');
      expect(typeof mockJWTService.verifyToken).toBe('function');
      expect(typeof mockJWTService.extractTokenFromRequest).toBe('function');
    });

    it('应该能够生成和验证token', () => {
      const payload = {
        userId: 'test-123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const token = mockJWTService.generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const result = mockJWTService.verifyToken(token);
      expect(result.valid).toBe(true);
      expect(result.payload?.userId).toBe('test-123');
    });

    it('应该能够从请求中提取token', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token-123'
        },
        cookies: {}
      };

      const token = mockJWTService.extractTokenFromRequest(mockRequest);
      expect(token).toBe('test-token-123');
    });

    it('应该能够从Cookie中提取token', () => {
      const mockRequest = {
        headers: {},
        cookies: {
          wps_jwt_token: 'cookie-token-456'
        }
      };

      const token = mockJWTService.extractTokenFromRequest(mockRequest);
      expect(token).toBe('cookie-token-456');
    });

    it('应该正确处理无效token', () => {
      const result = mockJWTService.verifyToken('invalid-token');
      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('MALFORMED');
    });

    it('应该正确处理空token', () => {
      const result = mockJWTService.verifyToken('');
      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('MISSING');
    });

    it('应该能够创建JWT载荷', () => {
      const userInfo = {
        id: 'user-789',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read']
      };

      const payload = mockJWTService.createPayload(userInfo);
      expect(payload.userId).toBe('user-789');
      expect(payload.username).toBe('Test User');
      expect(payload.email).toBe('test@example.com');
      expect(payload.roles).toEqual(['user']);
      expect(payload.permissions).toEqual(['read']);
    });

    it('应该能够获取配置', () => {
      const config = mockJWTService.getConfig();
      expect(config).toBeDefined();
      expect(config.jwtSecret).toBeDefined();
      expect(config.tokenExpiry).toBeDefined();
      expect(config.cookieName).toBeDefined();
    });
  });
});
