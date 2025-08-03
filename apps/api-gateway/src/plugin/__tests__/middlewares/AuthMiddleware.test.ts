/**
 * 认证中间件单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import AuthMiddleware from '../../middlewares/AuthMiddleware.js';
import type { IJWTService } from '../../services/JWTService.js';
import type { AuthConfig, TokenValidationResult } from '../../types/auth.js';

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockJWTService: IJWTService;
  let mockConfig: AuthConfig;
  let mockLogger: any;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockConfig = {
      jwtSecret: 'test-secret',
      enabled: true,
      excludePaths: ['/health', '/metrics', '/docs', '/api/auth/*']
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    mockJWTService = {
      generateToken: vi.fn(),
      verifyToken: vi.fn(),
      decodeToken: vi.fn(),
      extractTokenFromRequest: vi.fn(),
      createPayload: vi.fn()
    };

    mockRequest = {
      url: '/api/users',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      }
    };

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    authMiddleware = new AuthMiddleware(mockJWTService, mockConfig, mockLogger);
  });

  describe('authenticate', () => {
    it('认证禁用时应该跳过验证', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const middleware = new AuthMiddleware(mockJWTService, disabledConfig, mockLogger);

      await middleware.authenticate(mockRequest, mockReply);

      expect(mockJWTService.extractTokenFromRequest).not.toHaveBeenCalled();
      expect(mockReply.code).not.toHaveBeenCalled();
    });

    it('白名单路径应该跳过验证', async () => {
      mockRequest.url = '/health';

      await middleware.authenticate(mockRequest, mockReply);

      expect(mockJWTService.extractTokenFromRequest).not.toHaveBeenCalled();
      expect(mockReply.code).not.toHaveBeenCalled();
    });

    it('通配符白名单路径应该跳过验证', async () => {
      mockRequest.url = '/api/auth/login';

      await middleware.authenticate(mockRequest, mockReply);

      expect(mockJWTService.extractTokenFromRequest).not.toHaveBeenCalled();
      expect(mockReply.code).not.toHaveBeenCalled();
    });

    it('缺少token时应该返回401', async () => {
      vi.mocked(mockJWTService.extractTokenFromRequest).mockReturnValue(null);

      await authMiddleware.authenticate(mockRequest, mockReply);

      expect(mockJWTService.extractTokenFromRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'UNAUTHENTICATED',
        message: '用户未认证，请先登录',
        code: 'AUTH_TOKEN_MISSING'
      });
    });

    it('无效token时应该返回401', async () => {
      const invalidResult: TokenValidationResult = {
        valid: false,
        error: 'Invalid token',
        errorType: 'INVALID'
      };

      vi.mocked(mockJWTService.extractTokenFromRequest).mockReturnValue('invalid-token');
      vi.mocked(mockJWTService.verifyToken).mockReturnValue(invalidResult);

      await authMiddleware.authenticate(mockRequest, mockReply);

      expect(mockJWTService.verifyToken).toHaveBeenCalledWith('invalid-token');
      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Token无效，请重新登录',
        code: 'AUTH_TOKEN_INVALID'
      });
    });

    it('过期token时应该返回401', async () => {
      const expiredResult: TokenValidationResult = {
        valid: false,
        error: 'Token expired',
        errorType: 'EXPIRED'
      };

      vi.mocked(mockJWTService.extractTokenFromRequest).mockReturnValue('expired-token');
      vi.mocked(mockJWTService.verifyToken).mockReturnValue(expiredResult);

      await authMiddleware.authenticate(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Token已过期，请重新登录',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    });

    it('有效token时应该设置用户信息', async () => {
      const validResult: TokenValidationResult = {
        valid: true,
        payload: {
          userId: 'user123',
          username: 'testuser',
          email: 'test@example.com'
        }
      };

      vi.mocked(mockJWTService.extractTokenFromRequest).mockReturnValue('valid-token');
      vi.mocked(mockJWTService.verifyToken).mockReturnValue(validResult);

      await authMiddleware.authenticate(mockRequest, mockReply);

      expect(mockRequest.user).toEqual(validResult.payload);
      expect(mockRequest.token).toBe('valid-token');
      expect(mockReply.code).not.toHaveBeenCalled();
    });

    it('认证过程中出现异常时应该返回500', async () => {
      vi.mocked(mockJWTService.extractTokenFromRequest).mockImplementation(() => {
        throw new Error('Service error');
      });

      await authMiddleware.authenticate(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: '认证服务内部错误',
        code: 'AUTH_INTERNAL_ERROR'
      });
    });
  });

  describe('isWhitelistPath', () => {
    it('应该识别精确匹配的白名单路径', () => {
      expect(authMiddleware.isWhitelistPath('/health')).toBe(true);
      expect(authMiddleware.isWhitelistPath('/metrics')).toBe(true);
      expect(authMiddleware.isWhitelistPath('/docs')).toBe(true);
    });

    it('应该识别通配符匹配的白名单路径', () => {
      expect(authMiddleware.isWhitelistPath('/api/auth/login')).toBe(true);
      expect(authMiddleware.isWhitelistPath('/api/auth/logout')).toBe(true);
      expect(authMiddleware.isWhitelistPath('/api/auth/callback')).toBe(true);
    });

    it('应该拒绝非白名单路径', () => {
      expect(authMiddleware.isWhitelistPath('/api/users')).toBe(false);
      expect(authMiddleware.isWhitelistPath('/api/orders')).toBe(false);
      expect(authMiddleware.isWhitelistPath('/admin')).toBe(false);
    });

    it('应该处理查询参数', () => {
      expect(authMiddleware.isWhitelistPath('/health?check=true')).toBe(true);
      expect(authMiddleware.isWhitelistPath('/api/auth/login?redirect=home')).toBe(true);
    });
  });

  describe('白名单管理', () => {
    it('应该能添加白名单路径', () => {
      authMiddleware.addWhitelistPath('/new-path');
      expect(authMiddleware.isWhitelistPath('/new-path')).toBe(true);
    });

    it('应该能移除白名单路径', () => {
      authMiddleware.removeWhitelistPath('/health');
      expect(authMiddleware.isWhitelistPath('/health')).toBe(false);
    });

    it('应该能获取当前白名单路径', () => {
      const paths = authMiddleware.getWhitelistPaths();
      expect(paths).toContain('/health');
      expect(paths).toContain('/metrics');
      expect(paths).toContain('/docs');
      expect(paths).toContain('/api/auth/*');
    });

    it('不应该重复添加已存在的路径', () => {
      const originalLength = authMiddleware.getWhitelistPaths().length;
      authMiddleware.addWhitelistPath('/health'); // 已存在的路径
      expect(authMiddleware.getWhitelistPaths().length).toBe(originalLength);
    });
  });

  describe('错误处理', () => {
    it('应该正确映射错误类型到错误代码', () => {
      const testCases = [
        { errorType: 'EXPIRED', expectedCode: 'AUTH_TOKEN_EXPIRED' },
        { errorType: 'INVALID', expectedCode: 'AUTH_TOKEN_INVALID' },
        { errorType: 'MALFORMED', expectedCode: 'AUTH_TOKEN_MALFORMED' },
        { errorType: 'MISSING', expectedCode: 'AUTH_TOKEN_MISSING' },
        { errorType: undefined, expectedCode: 'AUTH_TOKEN_ERROR' }
      ];

      testCases.forEach(({ errorType, expectedCode }) => {
        const result: TokenValidationResult = {
          valid: false,
          error: 'Test error',
          errorType: errorType as any
        };

        vi.mocked(mockJWTService.extractTokenFromRequest).mockReturnValue('test-token');
        vi.mocked(mockJWTService.verifyToken).mockReturnValue(result);

        authMiddleware.authenticate(mockRequest, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({ code: expectedCode })
        );
      });
    });

    it('应该正确映射错误类型到错误消息', () => {
      const testCases = [
        { errorType: 'EXPIRED', expectedMessage: 'Token已过期，请重新登录' },
        { errorType: 'INVALID', expectedMessage: 'Token无效，请重新登录' },
        { errorType: 'MALFORMED', expectedMessage: 'Token格式错误，请重新登录' },
        { errorType: 'MISSING', expectedMessage: '缺少认证Token，请先登录' }
      ];

      testCases.forEach(({ errorType, expectedMessage }) => {
        const result: TokenValidationResult = {
          valid: false,
          error: 'Test error',
          errorType: errorType as any
        };

        vi.mocked(mockJWTService.extractTokenFromRequest).mockReturnValue('test-token');
        vi.mocked(mockJWTService.verifyToken).mockReturnValue(result);

        authMiddleware.authenticate(mockRequest, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({ message: expectedMessage })
        );
      });
    });
  });
});
