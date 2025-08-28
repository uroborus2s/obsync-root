// @wps/app-icalink 用户身份验证工具测试
// 测试用户身份验证工具函数的正确性

import type { FastifyRequest } from '@stratix/core';
import type { UserIdentity } from '@stratix/utils/auth';
import { describe, expect, it } from 'vitest';
import {
  getStudentIdentityFromRequest,
  getTeacherIdentityFromRequest,
  getUserIdentityFromRequest,
  getUserIdentityWithTypeCheck
} from '../utils/user-identity.js';

// 模拟 FastifyRequest
function createMockRequest(
  userIdentity?: UserIdentity,
  headers?: Record<string, string>
): FastifyRequest {
  const request = {
    headers: headers || {},
    userIdentity
  } as any;

  if (userIdentity) {
    (request as any).userIdentity = userIdentity;
  }

  return request;
}

describe('用户身份验证工具测试', () => {
  describe('getUserIdentityFromRequest', () => {
    it('应该从 userIdentity 获取用户信息', () => {
      const userIdentity: UserIdentity = {
        userId: 'student123',
        username: '张三',
        userType: 'student'
      };

      const request = createMockRequest(userIdentity);
      const result = getUserIdentityFromRequest(request);

      expect(result).toEqual({
        id: 'student123',
        type: 'student',
        name: '张三'
      });
    });

    it('应该在缺少 userIdentity 时抛出错误', () => {
      const request = createMockRequest();

      expect(() => getUserIdentityFromRequest(request)).toThrow(
        '用户身份验证失败：缺少用户身份信息'
      );
    });

    it('应该在 userId 无效时抛出错误', () => {
      const userIdentity: UserIdentity = {
        userId: '',
        username: '张三',
        userType: 'student'
      };

      const request = createMockRequest(userIdentity);

      expect(() => getUserIdentityFromRequest(request)).toThrow(
        '用户身份验证失败：用户ID无效'
      );
    });
  });

  describe('getStudentIdentityFromRequest', () => {
    it('应该成功获取学生身份信息', () => {
      const userIdentity: UserIdentity = {
        userId: 'student123',
        username: '张三',
        userType: 'student'
      };

      const request = createMockRequest(userIdentity);
      const result = getStudentIdentityFromRequest(request);

      expect(result).toEqual({
        id: 'student123',
        type: 'student',
        name: '张三'
      });
    });

    it('应该在用户不是学生时抛出错误', () => {
      const userIdentity: UserIdentity = {
        userId: 'teacher123',
        username: '王老师',
        userType: 'teacher'
      };

      const request = createMockRequest(userIdentity);

      expect(() => getStudentIdentityFromRequest(request)).toThrow(
        '用户身份验证失败：需要学生权限'
      );
    });
  });

  describe('getTeacherIdentityFromRequest', () => {
    it('应该成功获取教师身份信息', () => {
      const userIdentity: UserIdentity = {
        userId: 'teacher123',
        username: '王老师',
        userType: 'teacher'
      };

      const request = createMockRequest(userIdentity);
      const result = getTeacherIdentityFromRequest(request);

      expect(result).toEqual({
        id: 'teacher123',
        type: 'teacher',
        name: '王老师'
      });
    });

    it('应该在用户不是教师时抛出错误', () => {
      const userIdentity: UserIdentity = {
        userId: 'student123',
        username: '张三',
        userType: 'student'
      };

      const request = createMockRequest(userIdentity);

      expect(() => getTeacherIdentityFromRequest(request)).toThrow(
        '用户身份验证失败：需要教师权限'
      );
    });
  });

  describe('getUserIdentityWithTypeCheck', () => {
    it('应该允许指定类型的用户', () => {
      const userIdentity: UserIdentity = {
        userId: 'student123',
        username: '张三',
        userType: 'student'
      };

      const request = createMockRequest(userIdentity);
      const result = getUserIdentityWithTypeCheck(request, [
        'student',
        'teacher'
      ]);

      expect(result).toEqual({
        id: 'student123',
        type: 'student',
        name: '张三'
      });
    });

    it('应该在用户类型不被允许时抛出错误', () => {
      const userIdentity: UserIdentity = {
        userId: 'student123',
        username: '张三',
        userType: 'student'
      };

      const request = createMockRequest(userIdentity);

      expect(() => getUserIdentityWithTypeCheck(request, ['teacher'])).toThrow(
        '用户身份验证失败：需要 teacher 权限'
      );
    });
  });
});
