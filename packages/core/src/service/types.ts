/**
 * Service 层核心类型定义
 * 提供统一的服务层返回格式和错误处理类型
 *
 * @module @stratix/core/service/types
 */

import type { Either } from '@stratix/utils/functional';

// ============================================================================
// 核心类型
// ============================================================================

/**
 * 服务错误信息
 *
 * @example
 * ```typescript
 * const error: ServiceError = {
 *   code: 'VALIDATION_ERROR',
 *   message: 'Invalid input',
 *   details: { field: 'email', reason: 'invalid format' }
 * };
 * ```
 */
export interface ServiceError {
  /** 错误代码（建议使用枚举或常量） */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误详细信息 */
  details?: any;
  /** 错误堆栈（仅开发环境） */
  stack?: string;
}

/**
 * 基础服务错误代码
 * 应用可以扩展此枚举添加业务特定的错误代码
 *
 * @example
 * ```typescript
 * // 在应用中扩展
 * export enum AppServiceErrorCode {
 *   ...BaseServiceErrorCode,
 *   CUSTOM_ERROR = 'CUSTOM_ERROR'
 * }
 * ```
 */
export enum BaseServiceErrorCode {
  // 通用错误
  SUCCESS = 'SUCCESS',
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

  // 数据验证错误
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  INVALID_IMAGE_FORMAT = 'INVALID_IMAGE_FORMAT',
  INVALID_FILE_SIZE = 'INVALID_FILE_SIZE',

  // 文件存储错误
  STORAGE_ERROR = 'STORAGE_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ALREADY_EXISTS = 'FILE_ALREADY_EXISTS',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  INVALID_FILE_PATH = 'INVALID_FILE_PATH',
  FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
  STORAGE_SERVICE_UNAVAILABLE = 'STORAGE_SERVICE_UNAVAILABLE',

  // 权限相关错误
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 其他
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN'
}

// ============================================================================
// 函数式类型
// ============================================================================

/**
 * 服务函数类型（函数式风格）
 * 使用 Either 类型进行错误处理
 *
 * @template Args - 函数参数类型数组
 * @template R - 成功时返回的数据类型
 *
 * @example
 * ```typescript
 * const getUser: ServiceFunction<[string], User> = async (id) => {
 *   // 实现
 * };
 * ```
 */
export type ServiceFunction<Args extends any[], R> = (
  ...args: Args
) => Promise<Either<ServiceError, R>>;

/**
 * 服务函数装饰器类型
 * 用于包装和增强服务函数
 *
 * @example
 * ```typescript
 * const withLogging: ServiceDecorator = (fn) => async (...args) => {
 *   console.log('Before');
 *   const result = await fn(...args);
 *   console.log('After');
 *   return result;
 * };
 * ```
 */
export type ServiceDecorator = <Args extends any[], R>(
  fn: ServiceFunction<Args, R>
) => ServiceFunction<Args, R>;

// ============================================================================
// 装饰器选项类型
// ============================================================================

/**
 * 日志选项
 */
export interface LoggingOptions {
  /** Logger 实例 */
  logger: any;
  /** 操作名称 */
  operationName: string;
  /** 是否记录输入参数 */
  logInput?: boolean;
  /** 是否记录输出结果 */
  logOutput?: boolean;
  /** 是否记录错误 */
  logErrors?: boolean;
  /** 数据脱敏函数 */
  maskSensitiveData?: (data: any) => any;
}

/**
 * 性能监控选项
 */
export interface PerformanceOptions {
  /** Logger 实例 */
  logger: any;
  /** 操作名称 */
  operationName: string;
  /** 慢操作阈值（毫秒） */
  slowThreshold?: number;
  /** 是否监控内存使用 */
  trackMemory?: boolean;
}

/**
 * 重试选项
 */
export interface RetryOptions {
  /** 重试次数 */
  retries: number;
  /** 初始延迟（毫秒） */
  delay?: number;
  /** 退避策略 */
  backoff?: 'linear' | 'exponential';
  /** 是否应该重试的判断函数 */
  shouldRetry?: (error: ServiceError) => boolean;
  /** 重试前的回调 */
  onRetry?: (attempt: number, error: ServiceError) => void;
}

/**
 * 超时选项
 */
export interface TimeoutOptions {
  /** 超时时间（毫秒） */
  timeoutMs: number;
  /** 超时错误代码 */
  errorCode?: string;
  /** 超时错误消息 */
  errorMessage?: string;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 缓存键生成函数 */
  keyGenerator: (...args: any[]) => string;
  /** 缓存过期时间（毫秒） */
  ttl?: number;
  /** 缓存实例 */
  cache?: any;
  /** 是否缓存错误结果 */
  cacheErrors?: boolean;
}

/**
 * 限流选项
 */
export interface RateLimitOptions {
  /** 时间窗口内最大请求数 */
  maxRequests: number;
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 限流键生成函数（用于区分不同用户/IP） */
  keyGenerator?: (...args: any[]) => string;
  /** 限流器实例 */
  rateLimiter?: any;
}

/**
 * 熔断器选项
 */
export interface CircuitBreakerOptions {
  /** 失败率阈值（0-1） */
  failureThreshold: number;
  /** 重置超时时间（毫秒） */
  resetTimeout: number;
  /** 最小请求数（达到此数量后才开始计算失败率） */
  minimumRequests?: number;
  /** 熔断器实例 */
  circuitBreaker?: any;
}

/**
 * 权限验证选项
 */
export interface AuthorizationOptions<Args extends any[]> {
  /** 权限检查函数 */
  authorize: (...args: Args) => Promise<boolean> | boolean;
  /** 权限错误代码 */
  errorCode?: string;
  /** 权限错误消息 */
  errorMessage?: string;
}

/**
 * 数据脱敏选项
 */
export interface DataMaskingOptions {
  /** 脱敏规则 */
  rules: DataMaskingRule[];
  /** 是否仅在日志中脱敏 */
  logOnly?: boolean;
}

/**
 * 数据脱敏规则
 */
export interface DataMaskingRule {
  /** 字段路径（支持点号分隔的嵌套路径） */
  field: string;
  /** 脱敏类型 */
  type: 'phone' | 'email' | 'idCard' | 'custom';
  /** 自定义脱敏函数 */
  maskFn?: (value: string) => string;
}

/**
 * 事务选项
 */
export interface TransactionOptions {
  /** 数据库连接或事务管理器 */
  transactionManager: any;
  /** 事务隔离级别 */
  isolationLevel?:
    | 'READ_UNCOMMITTED'
    | 'READ_COMMITTED'
    | 'REPEATABLE_READ'
    | 'SERIALIZABLE';
  /** 是否支持嵌套事务 */
  nested?: boolean;
}

/**
 * 创建服务函数选项
 */
export interface CreateServiceFunctionOptions {
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 慢操作阈值（毫秒） */
  slowThreshold?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试选项 */
  retry?: RetryOptions;
  /** 缓存选项 */
  cache?: CacheOptions;
  /** 限流选项 */
  rateLimit?: RateLimitOptions;
  /** 熔断器选项 */
  circuitBreaker?: CircuitBreakerOptions;
}

// ============================================================================
// 分页和排序类型
// ============================================================================

/**
 * 分页参数
 */
export interface PaginationParams {
  /** 页码（从1开始） */
  page?: number;
  /** 每页大小 */
  page_size?: number;
  /** 最大每页大小 */
  max_page_size?: number;
}

/**
 * 排序参数
 */
export interface SortParams {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  direction: 'asc' | 'desc';
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  data: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页大小 */
  page_size: number;
  /** 总页数 */
  total_pages: number;
  /** 是否有下一页 */
  has_next: boolean;
  /** 是否有上一页 */
  has_prev: boolean;
}
