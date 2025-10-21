/**
 * Service 层辅助函数
 * 提供错误处理、结果创建等通用工具
 *
 * @module @stratix/core/service/helpers
 */

import type {
  ServiceDecorator,
  ServiceError,
  ServiceFunction
} from './types.js';

// ============================================================================
// 错误处理工具
// ============================================================================

/**
 * 将异常转换为 ServiceError
 *
 * @param code - 错误代码
 * @param defaultMessage - 默认错误消息
 * @returns 转换函数
 *
 * @example
 * ```typescript
 * const error = toServiceError('DATABASE_ERROR', 'Database operation failed')(exception);
 * ```
 */
export const toServiceError =
  (code: string, defaultMessage?: string) =>
  (error: unknown): ServiceError => ({
    code,
    message:
      error instanceof Error
        ? error.message
        : defaultMessage || 'Unknown error',
    details: error,
    stack: error instanceof Error ? error.stack : undefined
  });

/**
 * 创建 ServiceError
 *
 * @param code - 错误代码
 * @param message - 错误消息
 * @param details - 错误详情
 * @returns ServiceError
 *
 * @example
 * ```typescript
 * const error = createServiceError('VALIDATION_ERROR', 'Invalid input', { field: 'email' });
 * ```
 */
export const createServiceError = (
  code: string,
  message: string,
  details?: any
): ServiceError => ({
  code,
  message,
  details
});

// ============================================================================
// 装饰器组合工具
// ============================================================================

/**
 * 组合多个装饰器
 * 从左到右应用装饰器
 *
 * @param decorators - 装饰器数组
 * @returns 组合后的装饰器
 *
 * @example
 * ```typescript
 * const decorated = composeDecorators(
 *   withLogging(options),
 *   withRetry(retryOptions),
 *   withTimeout(5000)
 * )(serviceFunction);
 * ```
 */
export const composeDecorators =
  (...decorators: ServiceDecorator[]): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) =>
    decorators.reduce((decorated, decorator) => decorator(decorated), fn);
