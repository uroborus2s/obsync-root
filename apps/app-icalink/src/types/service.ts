// @wps/app-icalink 服务层类型定义
// 基于 Stratix 框架的服务层统一返回格式

// 导入Stratix框架的类型，并重新导出以避免冲突
import type { QueryOptions as StratixQueryOptions } from '@stratix/database';

// 扩展的QueryOptions类型，兼容Stratix和我们的需求
export interface QueryOptions extends Partial<StratixQueryOptions> {
  pagination?: {
    page?: number;
    page_size?: number;
    pageSize?: number;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// 重新导出Stratix的QueryOptions供内部使用（保持兼容性）
export type { StratixQueryOptions };

/**
 * 服务执行结果
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  message?: string;
}

/**
 * 服务错误信息
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

/**
 * 服务错误代码枚举
 */
export enum ServiceErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // 认证和授权错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // 业务逻辑错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  INVALID_OPERATION = 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  
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
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED'
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
  max_page_size?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * 排序参数
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 创建成功的服务结果
 */
export function createSuccessResult<T>(data: T, message?: string): ServiceResult<T> {
  return {
    success: true,
    data,
    message
  };
}

/**
 * 创建失败的服务结果
 */
export function createErrorResult(
  code: ServiceErrorCode | string,
  message: string,
  details?: any
): ServiceResult<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    message
  };
}

/**
 * 创建分页成功结果
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  page_size: number,
  message?: string
): ServiceResult<PaginatedResult<T>> {
  const total_pages = Math.ceil(total / page_size);
  
  return createSuccessResult({
    data,
    total,
    page,
    page_size,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1
  }, message);
}

/**
 * 检查服务结果是否成功
 */
export function isSuccessResult<T>(result: ServiceResult<T>): result is ServiceResult<T> & { success: true; data: T } {
  return result.success === true;
}

/**
 * 检查服务结果是否失败
 */
export function isErrorResult<T>(result: ServiceResult<T>): result is ServiceResult<T> & { success: false; error: ServiceError } {
  return result.success === false;
}

/**
 * 从服务结果中提取数据，如果失败则抛出错误
 */
export function unwrapResult<T>(result: ServiceResult<T>): T {
  if (isSuccessResult(result)) {
    return result.data;
  }
  
  const error = new Error(result.error?.message || 'Service operation failed');
  (error as any).code = result.error?.code;
  (error as any).details = result.error?.details;
  throw error;
}

/**
 * 将Promise包装为ServiceResult
 */
export async function wrapServiceCall<T>(
  operation: () => Promise<T>,
  errorCode: ServiceErrorCode = ServiceErrorCode.UNKNOWN_ERROR
): Promise<ServiceResult<T>> {
  try {
    const data = await operation();
    return createSuccessResult(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResult(errorCode, message, error);
  }
}

/**
 * 链式处理服务结果
 */
export function chainServiceResult<T, U>(
  result: ServiceResult<T>,
  transform: (data: T) => ServiceResult<U>
): ServiceResult<U> {
  if (isErrorResult(result)) {
    return result as ServiceResult<U>;
  }
  
  if (result.data !== undefined) {
    return transform(result.data);
  }
  
  return createErrorResult(ServiceErrorCode.UNKNOWN_ERROR, 'No data available');
}

/**
 * 异步链式处理服务结果
 */
export async function chainServiceResultAsync<T, U>(
  result: ServiceResult<T>,
  transform: (data: T) => Promise<ServiceResult<U>>
): Promise<ServiceResult<U>> {
  if (isErrorResult(result)) {
    return result as ServiceResult<U>;
  }
  
  if (result.data !== undefined) {
    return await transform(result.data);
  }
  
  return createErrorResult(ServiceErrorCode.UNKNOWN_ERROR, 'No data available');
}

/**
 * 合并多个服务结果
 */
export function combineServiceResults<T extends readonly unknown[]>(
  ...results: { [K in keyof T]: ServiceResult<T[K]> }
): ServiceResult<T> {
  const errors: ServiceError[] = [];
  const data: any[] = [];
  
  for (const result of results) {
    if (isErrorResult(result)) {
      errors.push(result.error);
    } else {
      data.push(result.data);
    }
  }
  
  if (errors.length > 0) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      'Multiple validation errors occurred',
      errors
    );
  }
  
  return createSuccessResult(data as any);
}

/**
 * 验证参数的辅助函数
 */
export function validateRequired<T>(
  value: T | undefined | null,
  fieldName: string
): ServiceResult<T> {
  if (value === undefined || value === null || value === '') {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `${fieldName} is required`
    );
  }
  
  return createSuccessResult(value);
}

/**
 * 验证字符串长度
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): ServiceResult<string> {
  if (minLength !== undefined && value.length < minLength) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `${fieldName} must be at least ${minLength} characters long`
    );
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `${fieldName} must be no more than ${maxLength} characters long`
    );
  }
  
  return createSuccessResult(value);
}

/**
 * 验证数字范围
 */
export function validateNumberRange(
  value: number,
  fieldName: string,
  min?: number,
  max?: number
): ServiceResult<number> {
  if (min !== undefined && value < min) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `${fieldName} must be at least ${min}`
    );
  }
  
  if (max !== undefined && value > max) {
    return createErrorResult(
      ServiceErrorCode.VALIDATION_ERROR,
      `${fieldName} must be no more than ${max}`
    );
  }
  
  return createSuccessResult(value);
}

/**
 * 验证日期格式
 */
export function validateDateFormat(
  value: string,
  fieldName: string,
  format: 'YYYY-MM-DD' | 'ISO8601' = 'YYYY-MM-DD'
): ServiceResult<Date> {
  let date: Date;
  
  try {
    if (format === 'YYYY-MM-DD') {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      if (!regex.test(value)) {
        throw new Error('Invalid date format');
      }
    }
    
    date = new Date(value);
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
  } catch (error) {
    return createErrorResult(
      ServiceErrorCode.INVALID_DATE_FORMAT,
      `${fieldName} must be a valid date in ${format} format`
    );
  }
  
  return createSuccessResult(date);
}

/**
 * 验证坐标
 */
export function validateCoordinates(
  latitude: number,
  longitude: number
): ServiceResult<{ latitude: number; longitude: number }> {
  if (latitude < -90 || latitude > 90) {
    return createErrorResult(
      ServiceErrorCode.INVALID_COORDINATES,
      'Latitude must be between -90 and 90'
    );
  }
  
  if (longitude < -180 || longitude > 180) {
    return createErrorResult(
      ServiceErrorCode.INVALID_COORDINATES,
      'Longitude must be between -180 and 180'
    );
  }
  
  return createSuccessResult({ latitude, longitude });
}
