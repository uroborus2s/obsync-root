/**
 * Service 层高阶函数装饰器
 * 提供日志、性能监控、重试、超时等横切关注点
 *
 * @module @stratix/core/service/decorators
 */

import { CircuitBreaker, RateLimiter } from '@stratix/utils/async';
import {
  isLeft,
  isRight,
  eitherLeft as left,
  eitherRight as right,
  SmartCache
} from '@stratix/utils/functional';
import { composeDecorators } from './helpers.js';
import type {
  AuthorizationOptions,
  CacheOptions,
  CircuitBreakerOptions,
  CreateServiceFunctionOptions,
  DataMaskingOptions,
  LoggingOptions,
  PerformanceOptions,
  RateLimitOptions,
  RetryOptions,
  ServiceDecorator,
  ServiceError,
  ServiceFunction,
  TimeoutOptions
} from './types.js';
import { BaseServiceErrorCode } from './types.js';

// ============================================================================
// 日志装饰器
// ============================================================================

/**
 * 日志装饰器
 * 自动记录函数的输入、输出和错误
 *
 * @param options - 日志选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withLogging({
 *   logger,
 *   operationName: 'getUser',
 *   logInput: true,
 *   logOutput: true
 * })(getUserFunction);
 * ```
 */
export const withLogging =
  (options: LoggingOptions): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) =>
  async (...args: Args) => {
    const {
      logger,
      operationName,
      logInput = true,
      logOutput = true,
      logErrors = true,
      maskSensitiveData
    } = options;
    const startTime = Date.now();

    if (logInput) {
      const maskedArgs = maskSensitiveData ? maskSensitiveData(args) : args;
      logger.info(
        { args: maskedArgs, operationName },
        `Starting ${operationName}`
      );
    }

    const result = await fn(...args);
    const duration = Date.now() - startTime;

    if (isRight(result)) {
      if (logOutput) {
        logger.info(
          { duration, operationName },
          `Completed ${operationName} in ${duration}ms`
        );
      }
    } else {
      if (logErrors) {
        logger.error(
          { error: result.left, duration, operationName },
          `Failed ${operationName} after ${duration}ms`
        );
      }
    }

    return result;
  };

// ============================================================================
// 性能监控装饰器
// ============================================================================

/**
 * 性能监控装饰器
 * 监控函数执行时间和内存使用，超过阈值时发出警告
 *
 * @param options - 性能监控选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withPerformanceMonitoring({
 *   logger,
 *   operationName: 'processData',
 *   slowThreshold: 1000
 * })(processDataFunction);
 * ```
 */
export const withPerformanceMonitoring =
  (options: PerformanceOptions): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) =>
  async (...args: Args) => {
    const {
      logger,
      operationName,
      slowThreshold = 1000,
      trackMemory = true
    } = options;
    const startTime = performance.now();
    const startMemory = trackMemory ? process.memoryUsage() : null;

    const result = await fn(...args);

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (trackMemory && startMemory) {
      const endMemory = process.memoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      if (duration > slowThreshold) {
        logger.warn(
          { duration, memoryDelta, operationName },
          `Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`
        );
      }

      logger.debug(
        { duration, memoryDelta, operationName },
        `Performance: ${operationName} - Duration: ${duration.toFixed(2)}ms, Memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
      );
    } else {
      if (duration > slowThreshold) {
        logger.warn(
          { duration, operationName },
          `Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`
        );
      }

      logger.debug(
        { duration, operationName },
        `Performance: ${operationName} - Duration: ${duration.toFixed(2)}ms`
      );
    }

    return result;
  };

// ============================================================================
// 重试装饰器
// ============================================================================

/**
 * 重试装饰器
 * 在失败时自动重试，支持线性和指数退避
 *
 * @param options - 重试选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withRetry({
 *   retries: 3,
 *   delay: 1000,
 *   backoff: 'exponential'
 * })(fetchDataFunction);
 * ```
 */
export const withRetry =
  (options: RetryOptions): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) =>
  async (...args: Args) => {
    const {
      retries,
      delay = 1000,
      backoff = 'exponential',
      shouldRetry = () => true,
      onRetry
    } = options;

    let lastError: ServiceError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const result = await fn(...args);

      if (isRight(result)) {
        return result;
      }

      lastError = result.left;

      // 检查是否应该重试
      if (attempt < retries && shouldRetry(lastError)) {
        // 计算延迟时间
        const waitTime =
          backoff === 'exponential'
            ? delay * Math.pow(2, attempt)
            : delay * (attempt + 1);

        // 调用重试回调
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // 所有重试都失败，返回最后一个错误
    return left(lastError!);
  };

// ============================================================================
// 超时装饰器
// ============================================================================

/**
 * 超时装饰器
 * 为函数添加超时限制
 *
 * @param options - 超时选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withTimeout({
 *   timeoutMs: 5000,
 *   errorMessage: 'Request timeout'
 * })(fetchDataFunction);
 * ```
 */
export const withTimeout =
  (options: TimeoutOptions): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) =>
  async (...args: Args) => {
    const {
      timeoutMs,
      errorCode = BaseServiceErrorCode.TIMEOUT_ERROR,
      errorMessage = `Operation timed out after ${timeoutMs}ms`
    } = options;

    const timeoutPromise = new Promise<
      Awaited<ReturnType<ServiceFunction<Args, R>>>
    >((resolve) => {
      setTimeout(() => {
        resolve(
          left({
            code: errorCode,
            message: errorMessage,
            details: { timeoutMs }
          }) as any
        );
      }, timeoutMs);
    });

    return Promise.race([fn(...args), timeoutPromise]);
  };

// ============================================================================
// 参数验证装饰器
// ============================================================================

/**
 * 参数验证装饰器
 * 在函数执行前验证参数
 *
 * @template Args - 参数类型数组
 * @param validator - 验证函数
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withValidation(
 *   (id: string) => id.length > 0 ? right([id]) : left(error)
 * )(getUserFunction);
 * ```
 */
export const withValidation =
  <Args extends any[]>(
    validator: (...args: Args) => ReturnType<ServiceFunction<Args, Args>>
  ) =>
  <R>(fn: ServiceFunction<Args, R>): ServiceFunction<Args, R> =>
  async (...args: Args) => {
    const validationResult = await validator(...args);

    if (isLeft(validationResult)) {
      return left(validationResult.left);
    }

    return fn(...validationResult.right);
  };

// ============================================================================
// 错误转换装饰器
// ============================================================================

/**
 * 错误转换装饰器
 * 将特定错误转换为其他错误
 *
 * @param errorMapper - 错误映射函数
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withErrorMapping(
 *   (error) => ({ ...error, code: 'CUSTOM_ERROR' })
 * )(serviceFunction);
 * ```
 */
export const withErrorMapping =
  (errorMapper: (error: ServiceError) => ServiceError): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) =>
  async (...args: Args) => {
    const result = await fn(...args);
    return isLeft(result) ? left(errorMapper(result.left)) : result;
  };

// ============================================================================
// 创建标准 Service 函数（完整实现）
// ============================================================================

// ============================================================================
// 缓存装饰器
// ============================================================================

/**
 * 缓存装饰器
 * 基于参数缓存函数结果
 *
 * @param options - 缓存选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withCache({
 *   keyGenerator: (id: string) => `user:${id}`,
 *   ttl: 60000 // 1分钟
 * })(getUserFunction);
 * ```
 */
export const withCache =
  (options: CacheOptions): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) => {
    const { keyGenerator, ttl, cache, cacheErrors = false } = options;
    const cacheInstance =
      cache || new SmartCache<string, ReturnType<ServiceFunction<Args, R>>>();

    return async (...args: Args) => {
      const cacheKey = keyGenerator(...args);

      // 检查缓存
      const cached = cacheInstance.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // 执行函数
      const result = await fn(...args);

      // 缓存结果（根据配置决定是否缓存错误）
      if (isRight(result) || cacheErrors) {
        cacheInstance.set(cacheKey, result, ttl);
      }

      return result;
    };
  };

// ============================================================================
// 限流装饰器
// ============================================================================

/**
 * 限流装饰器
 * 基于令牌桶算法限制请求频率
 *
 * @param options - 限流选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withRateLimit({
 *   maxRequests: 100,
 *   windowMs: 60000, // 1分钟内最多100次请求
 *   keyGenerator: (userId: string) => userId
 * })(apiFunction);
 * ```
 */
export const withRateLimit =
  (options: RateLimitOptions): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) => {
    const { maxRequests, windowMs, keyGenerator, rateLimiter } = options;
    const limiterInstance =
      rateLimiter || new RateLimiter(maxRequests, windowMs);

    return async (...args: Args) => {
      const key = keyGenerator ? keyGenerator(...args) : 'default';

      // 检查限流
      const allowed = await limiterInstance.tryAcquire(key);
      if (!allowed) {
        return left({
          code: BaseServiceErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Rate limit exceeded. Please try again later.',
          details: { maxRequests, windowMs }
        });
      }

      return fn(...args);
    };
  };

// ============================================================================
// 熔断器装饰器
// ============================================================================

/**
 * 熔断器装饰器
 * 在失败率过高时自动熔断，防止雪崩
 *
 * @param options - 熔断器选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withCircuitBreaker({
 *   failureThreshold: 0.5, // 50%失败率
 *   resetTimeout: 60000, // 1分钟后尝试恢复
 *   minimumRequests: 10
 * })(externalApiFunction);
 * ```
 */
export const withCircuitBreaker =
  (options: CircuitBreakerOptions): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) => {
    const {
      failureThreshold,
      resetTimeout,
      minimumRequests = 10,
      circuitBreaker
    } = options;
    const breakerInstance =
      circuitBreaker ||
      new CircuitBreaker(failureThreshold, resetTimeout, minimumRequests);

    return async (...args: Args) => {
      // 检查熔断器状态
      if (breakerInstance.isOpen()) {
        return left({
          code: BaseServiceErrorCode.CIRCUIT_BREAKER_OPEN,
          message: 'Circuit breaker is open. Service temporarily unavailable.',
          details: { failureThreshold, resetTimeout }
        });
      }

      // 执行函数
      const result = await fn(...args);

      // 记录结果
      if (isRight(result)) {
        breakerInstance.recordSuccess();
      } else {
        breakerInstance.recordFailure();
      }

      return result;
    };
  };

// ============================================================================
// 权限验证装饰器
// ============================================================================

/**
 * 权限验证装饰器
 * 在函数执行前验证权限
 *
 * @template Args - 参数类型数组
 * @param options - 权限验证选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withAuthorization({
 *   authorize: async (userId: string, resourceId: string) => {
 *     return await checkPermission(userId, resourceId);
 *   },
 *   errorMessage: 'Access denied'
 * })(protectedFunction);
 * ```
 */
export const withAuthorization =
  <Args extends any[]>(options: AuthorizationOptions<Args>) =>
  <R>(fn: ServiceFunction<Args, R>): ServiceFunction<Args, R> =>
  async (...args: Args) => {
    const {
      authorize,
      errorCode = BaseServiceErrorCode.FORBIDDEN,
      errorMessage = 'Access denied'
    } = options;

    const authorized = await authorize(...args);

    if (!authorized) {
      return left({
        code: errorCode,
        message: errorMessage
      });
    }

    return fn(...args);
  };

// ============================================================================
// 数据脱敏装饰器
// ============================================================================

/**
 * 数据脱敏装饰器
 * 自动脱敏敏感数据（仅用于日志）
 *
 * @param options - 数据脱敏选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * const decorated = withDataMasking({
 *   rules: [
 *     { field: 'phone', type: 'phone' },
 *     { field: 'email', type: 'email' }
 *   ]
 * })(serviceFunction);
 * ```
 */
export const withDataMasking =
  (options: DataMaskingOptions): ServiceDecorator =>
  <Args extends any[], R>(fn: ServiceFunction<Args, R>) => {
    const { rules, logOnly = true } = options;

    const maskData = (data: any): any => {
      if (!data || typeof data !== 'object') return data;

      const masked = { ...data };

      for (const rule of rules) {
        const value = getNestedValue(masked, rule.field);
        if (value) {
          setNestedValue(masked, rule.field, maskValue(value, rule));
        }
      }

      return masked;
    };

    return async (...args: Args) => {
      const result = await fn(...args);

      // 如果只在日志中脱敏，直接返回原始结果
      if (logOnly) {
        return result;
      }

      // 否则脱敏返回数据
      return isRight(result) ? right(maskData(result.right) as R) : result;
    };
  };

// 辅助函数：获取嵌套值
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// 辅助函数：设置嵌套值
const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => current[key], obj);
  if (target) {
    target[lastKey] = value;
  }
};

// 辅助函数：脱敏值
const maskValue = (
  value: string,
  rule: DataMaskingOptions['rules'][0]
): string => {
  if (rule.maskFn) {
    return rule.maskFn(value);
  }

  switch (rule.type) {
    case 'phone':
      return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    case 'email':
      return value.replace(/(.{2}).*(@.*)/, '$1***$2');
    case 'idCard':
      return value.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
    default:
      return '***';
  }
};

// ============================================================================
// 创建标准 Service 函数（完整实现）
// ============================================================================

/**
 * 创建标准的 Service 函数
 * 自动应用日志、性能监控等装饰器
 *
 * @template Args - 函数参数类型数组
 * @template R - 返回数据类型
 * @param operationName - 操作名称
 * @param logger - Logger 实例
 * @param fn - 服务函数
 * @param options - 选项
 * @returns 装饰后的服务函数
 *
 * @example
 * ```typescript
 * const getUser = createServiceFunction(
 *   'getUser',
 *   logger,
 *   async (id: string) => { ... },
 *   {
 *     enableLogging: true,
 *     enablePerformanceMonitoring: true,
 *     timeout: 5000,
 *     retry: { retries: 3, delay: 1000 },
 *     cache: { keyGenerator: (id) => `user:${id}`, ttl: 60000 }
 *   }
 * );
 * ```
 */
export const createServiceFunction = <Args extends any[], R>(
  operationName: string,
  logger: any,
  fn: ServiceFunction<Args, R>,
  options?: CreateServiceFunctionOptions
): ServiceFunction<Args, R> => {
  const {
    enableLogging = true,
    enablePerformanceMonitoring = true,
    slowThreshold = 1000,
    timeout,
    retry,
    cache,
    rateLimit,
    circuitBreaker
  } = options || {};

  const decorators: ServiceDecorator[] = [];

  // 按顺序应用装饰器（从外到内）
  if (enableLogging) {
    decorators.push(withLogging({ logger, operationName }));
  }

  if (enablePerformanceMonitoring) {
    decorators.push(
      withPerformanceMonitoring({ logger, operationName, slowThreshold })
    );
  }

  if (rateLimit) {
    decorators.push(withRateLimit(rateLimit));
  }

  if (circuitBreaker) {
    decorators.push(withCircuitBreaker(circuitBreaker));
  }

  if (cache) {
    decorators.push(withCache(cache));
  }

  if (timeout) {
    decorators.push(withTimeout({ timeoutMs: timeout }));
  }

  if (retry) {
    decorators.push(withRetry(retry));
  }

  return composeDecorators(...decorators)(fn);
};
