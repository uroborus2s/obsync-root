/**
 * Service 层模块统一导出
 * 提供函数式 Service 层的所有工具和类型
 *
 * @module @stratix/core/service
 */

// ============================================================================
// 类型导出
// ============================================================================

export type {
  AuthorizationOptions,
  CacheOptions,
  CircuitBreakerOptions,
  CreateServiceFunctionOptions,
  DataMaskingOptions,
  DataMaskingRule,
  // 装饰器选项类型
  LoggingOptions,
  PaginatedResult,
  // 分页和排序
  PaginationParams,
  PerformanceOptions,
  RateLimitOptions,
  RetryOptions,
  ServiceDecorator,
  // 核心类型
  ServiceError,
  ServiceFunction,
  SortParams,
  TimeoutOptions,
  TransactionOptions
} from './types.js';

export { BaseServiceErrorCode } from './types.js';

// ============================================================================
// 验证器导出
// ============================================================================

export {
  // 组合验证
  composeValidators,
  // 数组验证
  validateArrayLength,
  validateArrayNotEmpty,
  // 日期验证
  validateDateFormat,
  validateDateRange,
  validateEmail,
  // 枚举验证
  validateEnum,
  // 基础验证
  validateExists,
  validateInteger,
  // 数字验证
  validateNumberRange,
  validateOptional,
  validatePositive,
  validateRequired,
  // 字符串验证
  validateStringLength,
  validateStringPattern,
  validateUrl
} from './validators.js';

// ============================================================================
// 辅助函数导出
// ============================================================================

export {
  // 装饰器组合
  composeDecorators,
  createServiceError,
  // 错误处理
  toServiceError
} from './helpers.js';

// ============================================================================
// 装饰器导出
// ============================================================================

export {
  // 创建 Service 函数
  createServiceFunction,
  withAuthorization,
  // 高级装饰器
  withCache,
  withCircuitBreaker,
  withDataMasking,
  withErrorMapping,
  // 基础装饰器
  withLogging,
  withPerformanceMonitoring,
  withRateLimit,
  withRetry,
  withTimeout,
  withValidation
} from './decorators.js';
