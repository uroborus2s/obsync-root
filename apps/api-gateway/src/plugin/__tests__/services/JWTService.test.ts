/**
 * JWT服务单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import JWTService from '../../services/JWTService.js';
import type { AuthConfig, JWTPayload } from '../../types/auth.js';

describe('JWTService', () => {
  let jwtService: JWTService;
  let mockConfig: AuthConfig;
  let mockLogger: any;

  beforeEach(() => {
    mockConfig = {
      jwtSecret: 'test-secret-key',
      tokenExpiry: '1h',
      refreshTokenExpiry: '7d',
      cookieName: 'test_jwt_token',
      excludePaths: ['/health', '/metrics'],
      enabled: true
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    jwtService = new JWTService(mockConfig, mockLogger);
  });

  describe('generateToken', () => {
    it('应该生成有效的JWT token', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user']
      };

      const token = jwtService.generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT应该有3个部分
    });

    it('应该使用自定义选项生成token', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        username: 'testuser'
      };

      const customOptions = { expiresIn: '2h' as any };
      const token = jwtService.generateToken(payload, customOptions);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('生成token失败时应该抛出错误', () => {
      const invalidPayload = null as any;
      
      expect(() => {
        jwtService.generateToken(invalidPayload);
      }).toThrow();
    });
  });

  describe('verifyToken', () => {
    it('应该验证有效的token', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const token = jwtService.generateToken(payload);
      const result = jwtService.verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.userId).toBe('user123');
      expect(result.payload?.username).toBe('testuser');
    });

    it('应该拒绝无效的token', () => {
      const invalidToken = 'invalid.token.here';
      const result = jwtService.verifyToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorType).toBe('MALFORMED');
    });

    it('应该拒绝空token', () => {
      const result = jwtService.verifyToken('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is missing');
      expect(result.errorType).toBe('MISSING');
    });

    it('应该处理过期的token', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        username: 'testuser'
      };

      // 生成一个立即过期的token
      const expiredToken = jwtService.generateToken(payload, { expiresIn: '0s' as any });
      
      // 等待一小段时间确保token过期
      setTimeout(() => {
        const result = jwtService.verifyToken(expiredToken);
        expect(result.valid).toBe(false);
        expect(result.errorType).toBe('EXPIRED');
      }, 100);
    });
  });

  describe('decodeToken', () => {
    it('应该解码有效的token而不验证签名', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const token = jwtService.generateToken(payload);
      const decoded = jwtService.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('user123');
      expect(decoded?.username).toBe('testuser');
    });

    it('应该处理无效的token', () => {
      const invalidToken = 'invalid.token';
      const decoded = jwtService.decodeToken(invalidToken);

      expect(decoded).toBeNull();
    });
  });

  describe('extractTokenFromRequest', () => {
    it('应该从Authorization header提取token', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token-123'
        },
        cookies: {}
      };

      const token = jwtService.extractTokenFromRequest(mockRequest);
      expect(token).toBe('test-token-123');
    });

    it('应该从Cookie提取token', () => {
      const mockRequest = {
        headers: {},
        cookies: {
          test_jwt_token: 'cookie-token-456'
        }
      };

      const token = jwtService.extractTokenFromRequest(mockRequest);
      expect(token).toBe('cookie-token-456');
    });

    it('Authorization header应该优先于Cookie', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer header-token'
        },
        cookies: {
          test_jwt_token: 'cookie-token'
        }
      };

      const token = jwtService.extractTokenFromRequest(mockRequest);
      expect(token).toBe('header-token');
    });

    it('没有token时应该返回null', () => {
      const mockRequest = {
        headers: {},
        cookies: {}
      };

      const token = jwtService.extractTokenFromRequest(mockRequest);
      expect(token).toBeNull();
    });

    it('应该处理格式错误的Authorization header', () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat token'
        },
        cookies: {}
      };

      const token = jwtService.extractTokenFromRequest(mockRequest);
      expect(token).toBeNull();
    });
  });

  describe('createPayload', () => {
    it('应该从用户信息创建JWT载荷', () => {
      const userInfo = {
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user', 'admin'],
        permissions: ['read', 'write']
      };

      const payload = jwtService.createPayload(userInfo);

      expect(payload.userId).toBe('user123');
      expect(payload.username).toBe('Test User');
      expect(payload.email).toBe('test@example.com');
      expect(payload.roles).toEqual(['user', 'admin']);
      expect(payload.permissions).toEqual(['read', 'write']);
    });

    it('应该处理最小用户信息', () => {
      const userInfo = {
        id: 'user456'
      };

      const payload = jwtService.createPayload(userInfo);

      expect(payload.userId).toBe('user456');
      expect(payload.username).toBeUndefined();
      expect(payload.roles).toEqual([]);
      expect(payload.permissions).toEqual([]);
    });

    it('应该处理userId字段的不同命名', () => {
      const userInfo = {
        userId: 'user789',
        username: 'testuser'
      };

      const payload = jwtService.createPayload(userInfo);

      expect(payload.userId).toBe('user789');
      expect(payload.username).toBe('testuser');
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('应该检测即将过期的token', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        username: 'testuser'
      };

      // 生成一个1分钟后过期的token
      const token = jwtService.generateToken(payload, { expiresIn: '1m' as any });
      
      // 检查是否即将过期（默认阈值5分钟）
      const isExpiring = jwtService.isTokenExpiringSoon(token);
      expect(isExpiring).toBe(true);
    });

    it('应该检测不会很快过期的token', () => {
      const payload: JWTPayload = {
        userId: 'user123',
        username: 'testuser'
      };

      // 生成一个1小时后过期的token
      const token = jwtService.generateToken(payload, { expiresIn: '1h' as any });
      
      // 检查是否即将过期（阈值5分钟）
      const isExpiring = jwtService.isTokenExpiringSoon(token, 5);
      expect(isExpiring).toBe(false);
    });
  });
});
