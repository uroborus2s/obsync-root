/**
 * Service 层通用验证函数
 * 提供基于 Either 类型的函数式验证工具
 *
 * @module @stratix/core/service/validators
 */

import {
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import type { ServiceError } from './types.js';
import { BaseServiceErrorCode } from './types.js';

// ============================================================================
// 错误创建辅助函数
// ============================================================================

/**
 * 创建验证错误
 *
 * @param message - 错误消息
 * @param code - 错误代码
 * @param details - 错误详情
 * @returns ServiceError
 *
 * @internal
 */
const createValidationError = (
  message: string,
  code: string = BaseServiceErrorCode.VALIDATION_ERROR,
  details?: any
): ServiceError => ({
  code,
  message,
  details
});

// ============================================================================
// 基础验证函数
// ============================================================================

/**
 * 验证值存在（非 null/undefined）
 *
 * @template T - 值的类型
 * @param errorMessage - 错误消息
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateExists<User>('User not found')(user);
 * if (isRight(result)) {
 *   console.log(result.right); // User
 * }
 * ```
 */
export const validateExists =
  <T>(
    errorMessage: string,
    errorCode: string = BaseServiceErrorCode.RESOURCE_NOT_FOUND
  ) =>
  (value: T | null | undefined): Either<ServiceError, T> =>
    value != null
      ? right(value)
      : left(createValidationError(errorMessage, errorCode));

/**
 * 验证必填字段（非 null/undefined/空字符串）
 *
 * @template T - 值的类型
 * @param fieldName - 字段名称
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateRequired<string>('email')(email);
 * ```
 */
export const validateRequired =
  <T>(fieldName: string) =>
  (value: T | undefined | null): Either<ServiceError, T> =>
    value !== undefined && value !== null && value !== ''
      ? right(value as T)
      : left(createValidationError(`${fieldName} is required`));

/**
 * 验证可选字段（允许 undefined，但不允许 null）
 *
 * @template T - 值的类型
 * @param fieldName - 字段名称
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateOptional<string>('nickname')(nickname);
 * ```
 */
export const validateOptional =
  <T>(fieldName: string) =>
  (value: T | undefined | null): Either<ServiceError, T | undefined> =>
    value === undefined
      ? right(undefined)
      : value !== null
        ? right(value)
        : left(createValidationError(`${fieldName} cannot be null`));

// ============================================================================
// 字符串验证
// ============================================================================

/**
 * 验证字符串长度
 *
 * @param fieldName - 字段名称
 * @param minLength - 最小长度（可选）
 * @param maxLength - 最大长度（可选）
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateStringLength('password', 8, 32)(password);
 * ```
 */
export const validateStringLength =
  (fieldName: string, minLength?: number, maxLength?: number) =>
  (value: string): Either<ServiceError, string> => {
    if (minLength !== undefined && value.length < minLength) {
      return left(
        createValidationError(
          `${fieldName} must be at least ${minLength} characters long`
        )
      );
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return left(
        createValidationError(
          `${fieldName} must be no more than ${maxLength} characters long`
        )
      );
    }
    return right(value);
  };

/**
 * 验证字符串匹配正则表达式
 *
 * @param fieldName - 字段名称
 * @param pattern - 正则表达式
 * @param errorMessage - 自定义错误消息（可选）
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateStringPattern('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)(email);
 * ```
 */
export const validateStringPattern =
  (fieldName: string, pattern: RegExp, errorMessage?: string) =>
  (value: string): Either<ServiceError, string> =>
    pattern.test(value)
      ? right(value)
      : left(
          createValidationError(
            errorMessage || `${fieldName} does not match the required pattern`
          )
        );

/**
 * 验证邮箱格式
 *
 * @param fieldName - 字段名称
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateEmail('email')(email);
 * ```
 */
export const validateEmail = (fieldName: string = 'email') =>
  validateStringPattern(
    fieldName,
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    `${fieldName} must be a valid email address`
  );

/**
 * 验证 URL 格式
 *
 * @param fieldName - 字段名称
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateUrl('website')(url);
 * ```
 */
export const validateUrl = (fieldName: string = 'url') =>
  validateStringPattern(
    fieldName,
    /^https?:\/\/.+/,
    `${fieldName} must be a valid URL`
  );

// ============================================================================
// 数字验证
// ============================================================================

/**
 * 验证数字范围
 *
 * @param fieldName - 字段名称
 * @param min - 最小值（可选）
 * @param max - 最大值（可选）
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateNumberRange('age', 0, 150)(age);
 * ```
 */
export const validateNumberRange =
  (fieldName: string, min?: number, max?: number) =>
  (value: number): Either<ServiceError, number> => {
    if (min !== undefined && value < min) {
      return left(
        createValidationError(`${fieldName} must be at least ${min}`)
      );
    }
    if (max !== undefined && value > max) {
      return left(
        createValidationError(`${fieldName} must be no more than ${max}`)
      );
    }
    return right(value);
  };

/**
 * 验证整数
 *
 * @param fieldName - 字段名称
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateInteger('count')(count);
 * ```
 */
export const validateInteger =
  (fieldName: string) =>
  (value: number): Either<ServiceError, number> =>
    Number.isInteger(value)
      ? right(value)
      : left(createValidationError(`${fieldName} must be an integer`));

/**
 * 验证正数
 *
 * @param fieldName - 字段名称
 * @param includeZero - 是否包含0
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validatePositive('price', false)(price);
 * ```
 */
export const validatePositive =
  (fieldName: string, includeZero: boolean = false) =>
  (value: number): Either<ServiceError, number> =>
    includeZero
      ? value >= 0
        ? right(value)
        : left(createValidationError(`${fieldName} must be non-negative`))
      : value > 0
        ? right(value)
        : left(createValidationError(`${fieldName} must be positive`));

// ============================================================================
// 日期验证
// ============================================================================

/**
 * 验证日期格式
 *
 * @param fieldName - 字段名称
 * @param format - 日期格式（可选）
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateDateFormat('birthDate', 'YYYY-MM-DD')(dateString);
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
      return left(
        createValidationError(
          `${fieldName} must be a valid date in ${format} format`,
          BaseServiceErrorCode.INVALID_DATE_FORMAT
        )
      );
    }
  };

/**
 * 验证日期范围
 *
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @param fieldName - 字段名称
 * @returns Either<ServiceError, { startDate: Date; endDate: Date }>
 *
 * @example
 * ```typescript
 * const result = validateDateRange(start, end, 'event period');
 * ```
 */
export const validateDateRange = (
  startDate: Date,
  endDate: Date,
  fieldName: string = 'date range'
): Either<ServiceError, { startDate: Date; endDate: Date }> =>
  startDate <= endDate
    ? right({ startDate, endDate })
    : left(
        createValidationError(
          `${fieldName}: start date must be before or equal to end date`,
          BaseServiceErrorCode.INVALID_TIME_RANGE
        )
      );

// ============================================================================
// 数组验证
// ============================================================================

/**
 * 验证数组长度
 *
 * @param fieldName - 字段名称
 * @param minLength - 最小长度（可选）
 * @param maxLength - 最大长度（可选）
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateArrayLength('tags', 1, 10)(tags);
 * ```
 */
export const validateArrayLength =
  <T>(fieldName: string, minLength?: number, maxLength?: number) =>
  (value: T[]): Either<ServiceError, T[]> => {
    if (minLength !== undefined && value.length < minLength) {
      return left(
        createValidationError(
          `${fieldName} must contain at least ${minLength} items`
        )
      );
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return left(
        createValidationError(
          `${fieldName} must contain no more than ${maxLength} items`
        )
      );
    }
    return right(value);
  };

/**
 * 验证数组非空
 *
 * @param fieldName - 字段名称
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateArrayNotEmpty('items')(items);
 * ```
 */
export const validateArrayNotEmpty =
  <T>(fieldName: string) =>
  (value: T[]): Either<ServiceError, T[]> =>
    value.length > 0
      ? right(value)
      : left(createValidationError(`${fieldName} must not be empty`));

// ============================================================================
// 枚举验证
// ============================================================================

/**
 * 验证值在枚举中
 *
 * @param fieldName - 字段名称
 * @param allowedValues - 允许的值列表
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const result = validateEnum('status', ['active', 'inactive'])(status);
 * ```
 */
export const validateEnum =
  <T>(fieldName: string, allowedValues: readonly T[]) =>
  (value: T): Either<ServiceError, T> =>
    allowedValues.includes(value)
      ? right(value)
      : left(
          createValidationError(
            `${fieldName} must be one of: ${allowedValues.join(', ')}`
          )
        );

// ============================================================================
// 组合验证
// ============================================================================

/**
 * 组合多个验证函数（全部通过才成功）
 *
 * @param validators - 验证函数数组
 * @returns 组合后的验证函数
 *
 * @example
 * ```typescript
 * const validatePassword = composeValidators(
 *   validateRequired('password'),
 *   validateStringLength('password', 8, 32),
 *   validateStringPattern('password', /[A-Z]/, 'must contain uppercase')
 * );
 * ```
 */
export const composeValidators =
  <T>(...validators: Array<(value: T) => Either<ServiceError, T>>) =>
  (value: T): Either<ServiceError, T> => {
    for (const validator of validators) {
      const result = validator(value);
      if (result._tag === 'Left') {
        return result;
      }
    }
    return right(value);
  };
