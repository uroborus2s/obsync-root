// @wps/app-icalink 用户身份验证工具
// 基于 Stratix 框架的用户身份验证辅助函数

import type { FastifyRequest } from '@stratix/core';
import type { UserIdentity } from '@stratix/utils/auth';
import type { UserInfo } from '../types/api.js';

/**
 * 从请求中获取用户身份信息
 */
export function getUserIdentityFromRequest(request: FastifyRequest): UserInfo {
  const userIdentity = (request as any).userIdentity as UserIdentity;
  
  if (!userIdentity) {
    throw new Error('用户身份验证失败：缺少用户身份信息');
  }
  
  if (!userIdentity.userId || userIdentity.userId.trim() === '') {
    throw new Error('用户身份验证失败：用户ID无效');
  }
  
  return {
    id: userIdentity.userId,
    type: userIdentity.userType as 'student' | 'teacher',
    name: userIdentity.username || ''
  };
}

/**
 * 从请求中获取学生身份信息
 */
export function getStudentIdentityFromRequest(request: FastifyRequest): UserInfo {
  const userInfo = getUserIdentityFromRequest(request);
  
  if (userInfo.type !== 'student') {
    throw new Error('用户身份验证失败：需要学生权限');
  }
  
  return userInfo;
}

/**
 * 从请求中获取教师身份信息
 */
export function getTeacherIdentityFromRequest(request: FastifyRequest): UserInfo {
  const userInfo = getUserIdentityFromRequest(request);
  
  if (userInfo.type !== 'teacher') {
    throw new Error('用户身份验证失败：需要教师权限');
  }
  
  return userInfo;
}

/**
 * 从请求中获取用户身份信息并检查类型
 */
export function getUserIdentityWithTypeCheck(
  request: FastifyRequest,
  allowedTypes: Array<'student' | 'teacher'>
): UserInfo {
  const userInfo = getUserIdentityFromRequest(request);
  
  if (!allowedTypes.includes(userInfo.type)) {
    throw new Error(`用户身份验证失败：需要 ${allowedTypes.join(' 或 ')} 权限`);
  }
  
  return userInfo;
}

/**
 * 检查用户是否具有指定权限
 */
export function hasUserPermission(
  request: FastifyRequest,
  requiredType: 'student' | 'teacher'
): boolean {
  try {
    const userInfo = getUserIdentityFromRequest(request);
    return userInfo.type === requiredType;
  } catch (error) {
    return false;
  }
}

/**
 * 验证用户身份并返回安全的用户信息
 */
export function validateUserIdentity(request: FastifyRequest): {
  isValid: boolean;
  userInfo?: UserInfo;
  error?: string;
} {
  try {
    const userInfo = getUserIdentityFromRequest(request);
    return {
      isValid: true,
      userInfo
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : '用户身份验证失败'
    };
  }
}