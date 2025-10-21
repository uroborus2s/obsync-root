// @wps/app-icalink 服务层类型定义
// 基于 Stratix 框架的函数式编程范式

import type { Either } from '@stratix/utils/functional';
import {
  eitherLeft as left,
  eitherRight as right
} from '@stratix/utils/functional';

// 从 @stratix/core 导入通用类型和错误代码
import type {
  PaginatedResult,
  PaginationParams,
  ServiceDecorator,
  ServiceError,
  ServiceFunction,
  SortParams
} from '@stratix/core';

import { BaseServiceErrorCode } from '@stratix/core';

// 从 @stratix/database 导入数据库相关类型
import type { QueryOptions } from '@stratix/database';

// 重新导出通用类型
export type {
  PaginatedResult,
  PaginationParams,
  QueryOptions,
  ServiceDecorator,
  ServiceError,
  ServiceFunction,
  SortParams
};

/**
 * 服务结果类型
 * 用于统一的服务层返回格式
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export { BaseServiceErrorCode };

/**
 * 业务特定的服务错误代码枚举
 * 扩展 BaseServiceErrorCode
 */
export enum ServiceErrorCode {
  // 继承通用错误代码
  SUCCESS = BaseServiceErrorCode.SUCCESS,
  UNKNOWN_ERROR = BaseServiceErrorCode.UNKNOWN_ERROR,
  VALIDATION_ERROR = BaseServiceErrorCode.VALIDATION_ERROR,
  DATABASE_ERROR = BaseServiceErrorCode.DATABASE_ERROR,
  NETWORK_ERROR = BaseServiceErrorCode.NETWORK_ERROR,
  UNAUTHORIZED = BaseServiceErrorCode.UNAUTHORIZED,
  FORBIDDEN = BaseServiceErrorCode.FORBIDDEN,
  RESOURCE_NOT_FOUND = BaseServiceErrorCode.RESOURCE_NOT_FOUND,
  NOT_IMPLEMENTED = BaseServiceErrorCode.NOT_IMPLEMENTED,

  // 业务特定错误代码
  INVALID_TOKEN = 'INVALID_TOKEN',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  INVALID_OPERATION = 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',

  // 考勤相关错误
  ATTENDANCE_RECORD_NOT_FOUND = 'ATTENDANCE_RECORD_NOT_FOUND',
  ATTENDANCE_ALREADY_EXISTS = 'ATTENDANCE_ALREADY_EXISTS',
  ATTENDANCE_WINDOW_CLOSED = 'ATTENDANCE_WINDOW_CLOSED',
  ATTENDANCE_NOT_ALLOWED = 'ATTENDANCE_NOT_ALLOWED',

  // 请假相关错误
  LEAVE_APPLICATION_NOT_FOUND = 'LEAVE_APPLICATION_NOT_FOUND',
  LEAVE_APPLICATION_ALREADY_EXISTS = 'LEAVE_APPLICATION_ALREADY_EXISTS',
  LEAVE_APPLICATION_CANNOT_WITHDRAW = 'LEAVE_APPLICATION_CANNOT_WITHDRAW',
  LEAVE_APPLICATION_ALREADY_APPROVED = 'LEAVE_APPLICATION_ALREADY_APPROVED',
  LEAVE_ATTACHMENT_TOO_LARGE = 'LEAVE_ATTACHMENT_TOO_LARGE',
  LEAVE_ATTACHMENT_INVALID_FORMAT = 'LEAVE_ATTACHMENT_INVALID_FORMAT',
  LEAVE_WITHDRAW_FAILED = 'LEAVE_WITHDRAW_FAILED',
  LEAVE_APPROVAL_FAILED = 'LEAVE_APPROVAL_FAILED',

  // 权限相关错误
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  STUDENT_NOT_ENROLLED = 'STUDENT_NOT_ENROLLED',
  TEACHER_NOT_ASSIGNED = 'TEACHER_NOT_ASSIGNED',

  // 数据验证错误
  INVALID_STUDENT_ID = 'INVALID_STUDENT_ID',
  INVALID_TEACHER_ID = 'INVALID_TEACHER_ID',
  INVALID_COURSE_ID = 'INVALID_COURSE_ID',
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  INVALID_IMAGE_FORMAT = 'INVALID_IMAGE_FORMAT',
  INVALID_FILE_SIZE = 'INVALID_FILE_SIZE',
  INVALID_PARAMETER = 'INVALID_PARAMETER',

  // 文件存储错误
  STORAGE_ERROR = 'STORAGE_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ALREADY_EXISTS = 'FILE_ALREADY_EXISTS',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  INVALID_FILE_PATH = 'INVALID_FILE_PATH',
  FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
  STORAGE_SERVICE_UNAVAILABLE = 'STORAGE_SERVICE_UNAVAILABLE',

  // 迁移相关错误
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  MIGRATION_IN_PROGRESS = 'MIGRATION_IN_PROGRESS',
  MIGRATION_FAILED = 'MIGRATION_FAILED'
}

// ============================================================================
// 业务特定的验证函数（使用 Either）
// ============================================================================

/**
 * 验证日期格式
 *
 * @param value - 日期字符串
 * @param fieldName - 字段名称
 * @param format - 日期格式
 * @returns Either<ServiceError, Date>
 *
 * @example
 * ```typescript
 * const result = validateDateFormat('2024-01-01', 'startDate');
 * if (isRight(result)) {
 *   console.log(result.right); // Date object
 * }
 * ```
 */
export const validateDateFormat =
  (fieldName: string, format: 'YYYY-MM-DD' | 'ISO8601' = 'YYYY-MM-DD') =>
  (value: string): Either<ServiceError, Date> => {
    try {
      if (format === 'YYYY-MM-DD') {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(value)) {
          throw new Error('Invalid date format');
        }
      }

      const date = new Date(value);

      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }

      return right(date);
    } catch (error) {
      return left({
        code: String(ServiceErrorCode.INVALID_DATE_FORMAT),
        message: `${fieldName} must be a valid date in ${format} format`,
        details: error
      });
    }
  };
