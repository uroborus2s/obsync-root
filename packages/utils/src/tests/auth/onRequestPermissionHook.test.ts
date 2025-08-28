// @stratix/utils onRequestPermissionHook 测试
// 基于 vitest 的单元测试

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequestPermissionHook, type UserIdentity } from '../../auth/header.js';

describe('onRequestPermissionHook', () => {
  let mockRequest: any;
  let mockReply: any;
  let mockUserIdentity: UserIdentity;

  beforeEach(() => {
    mockUserIdentity = {
      userId: 'test-user-123',
      userType: 'teacher',
      roles: ['teacher', 'admin'],
      permissions: [],
      metadata: {}
    };

    mockRequest = {
      url: '/api/test',
      headers: {
        'x-user-id': 'test-user-123',
        'x-user-type': 'teacher',
        'x-user-roles': 'teacher,admin'
      },
      log: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }
    };

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
  });

  describe('路径白名单功能', () => {
    it('应该跳过白名单中的路径', async () => {
      const hook = onRequestPermissionHook(
        [(identity: UserIdentity) => identity.userType === 'teacher'],
        { skipPaths: ['/health'] }
      );

      mockRequest.url = '/health';

      await hook(mockRequest, mockReply);

      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Skipping permission check for whitelisted path',
        expect.objectContaining({
          url: '/health',
          skipPaths: ['/health'],
          reason: 'Path in whitelist'
        })
      );
      expect(mockReply.code).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('应该支持前缀匹配', async () => {
      const hook = onRequestPermissionHook(
        [(identity: UserIdentity) => identity.userType === 'teacher'],
        { skipPaths: ['/health'] }
      );

      mockRequest.url = '/health/status';

      await hook(mockRequest, mockReply);

      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Skipping permission check for whitelisted path',
        expect.objectContaining({
          url: '/health/status',
          skipPaths: ['/health']
        })
      );
    });

    it('应该支持多个跳过路径', async () => {
      const hook = onRequestPermissionHook(
        [(identity: UserIdentity) => identity.userType === 'teacher'],
        { skipPaths: ['/health', '/metrics', '/status'] }
      );

      mockRequest.url = '/metrics';

      await hook(mockRequest, mockReply);

      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Skipping permission check for whitelisted path',
        expect.objectContaining({
          url: '/metrics',
          skipPaths: ['/health', '/metrics', '/status']
        })
      );
    });

    it('不在白名单中的路径应该继续权限验证', async () => {
      const hook = onRequestPermissionHook(
        [(identity: UserIdentity) => identity.userType === 'teacher'],
        { skipPaths: ['/health'] }
      );

      mockRequest.url = '/api/protected';

      await hook(mockRequest, mockReply);

      expect(mockRequest.userIdentity).toBeDefined();
      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Access granted',
        expect.objectContaining({
          url: '/api/protected',
          userId: 'test-user-123'
        })
      );
    });
  });

  describe('验证模式功能', () => {
    it('or模式：任一验证函数通过即可', async () => {
      const hook = onRequestPermissionHook(
        [
          (identity: UserIdentity) => identity.userType === 'student', // false
          (identity: UserIdentity) => identity.userType === 'teacher'  // true
        ],
        { mode: 'or' }
      );

      await hook(mockRequest, mockReply);

      expect(mockRequest.userIdentity).toBeDefined();
      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Access granted',
        expect.objectContaining({
          mode: 'or',
          handleCount: 2
        })
      );
    });

    it('and模式：所有验证函数都必须通过', async () => {
      const hook = onRequestPermissionHook(
        [
          (identity: UserIdentity) => identity.userType === 'teacher', // true
          (identity: UserIdentity) => identity.roles?.includes('admin') || false // true
        ],
        { mode: 'and' }
      );

      await hook(mockRequest, mockReply);

      expect(mockRequest.userIdentity).toBeDefined();
      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Access granted',
        expect.objectContaining({
          mode: 'and',
          handleCount: 2
        })
      );
    });

    it('and模式：任一验证函数失败则拒绝访问', async () => {
      const hook = onRequestPermissionHook(
        [
          (identity: UserIdentity) => identity.userType === 'teacher', // true
          (identity: UserIdentity) => identity.userType === 'student'  // false
        ],
        { mode: 'and' }
      );

      await hook(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Required permission not found to access this resource (mode: and)'
        })
      );
    });

    it('默认使用or模式', async () => {
      const hook = onRequestPermissionHook([
        (identity: UserIdentity) => identity.userType === 'student', // false
        (identity: UserIdentity) => identity.userType === 'teacher'  // true
      ]);

      await hook(mockRequest, mockReply);

      expect(mockRequest.userIdentity).toBeDefined();
      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Access granted',
        expect.objectContaining({
          mode: 'or'
        })
      );
    });
  });

  describe('向后兼容性', () => {
    it('应该支持原有的函数签名（只传handles参数）', async () => {
      const hook = onRequestPermissionHook([
        (identity: UserIdentity) => identity.userType === 'teacher'
      ]);

      await hook(mockRequest, mockReply);

      expect(mockRequest.userIdentity).toBeDefined();
      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Access granted',
        expect.objectContaining({
          mode: 'or',
          handleCount: 1
        })
      );
    });

    it('应该支持空的options对象', async () => {
      const hook = onRequestPermissionHook(
        [(identity: UserIdentity) => identity.userType === 'teacher'],
        {}
      );

      await hook(mockRequest, mockReply);

      expect(mockRequest.userIdentity).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的用户身份', async () => {
      const hook = onRequestPermissionHook(
        [(identity: UserIdentity) => identity.userType === 'teacher'],
        { skipPaths: ['/health'] }
      );

      mockRequest.headers = {}; // 无效的headers

      await hook(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Valid user identity required'
        })
      );
    });

    it('应该处理权限验证失败', async () => {
      const hook = onRequestPermissionHook(
        [(identity: UserIdentity) => identity.userType === 'admin'], // 要求admin，但用户是teacher
        { mode: 'or' }
      );

      await hook(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: 'Required permission not found to access this resource (mode: or)'
        })
      );
    });

    it('应该处理异常情况', async () => {
      const hook = onRequestPermissionHook(
        [() => { throw new Error('Test error'); }],
        { mode: 'or' }
      );

      await hook(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Failed to verify permissions'
        })
      );
    });
  });

  describe('综合场景', () => {
    it('健康检查路径应该跳过权限验证', async () => {
      const hook = onRequestPermissionHook(
        [(identity: UserIdentity) => identity.userType === 'admin'], // 严格的权限要求
        { skipPaths: ['/health'] }
      );

      mockRequest.url = '/health';
      mockRequest.headers = {}; // 即使没有有效的身份信息

      await hook(mockRequest, mockReply);

      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Skipping permission check for whitelisted path',
        expect.objectContaining({
          url: '/health'
        })
      );
      expect(mockReply.code).not.toHaveBeenCalled();
    });

    it('复杂权限验证场景', async () => {
      const hook = onRequestPermissionHook(
        [
          (identity: UserIdentity) => identity.userType === 'teacher',
          (identity: UserIdentity) => identity.roles?.includes('admin') || false
        ],
        { 
          skipPaths: ['/health', '/metrics'],
          mode: 'and'
        }
      );

      await hook(mockRequest, mockReply);

      expect(mockRequest.userIdentity).toBeDefined();
      expect(mockRequest.log.debug).toHaveBeenCalledWith(
        'Access granted',
        expect.objectContaining({
          mode: 'and',
          handleCount: 2
        })
      );
    });
  });
});
