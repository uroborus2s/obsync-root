/**
 * 增强的错误处理服务
 * 提供错误分类、重试策略和错误恢复机制
 */

import type { Logger } from '@stratix/core';
import type {
  EnhancedError,
  ErrorHandlingStrategy,
  ErrorSeverity,
  ErrorType,
  RetryConfig,
  RetryStrategy
} from '../types/workflow.js';

/**
 * 错误分析结果
 */
export interface ErrorAnalysis {
  enhancedError: EnhancedError;
  shouldRetry: boolean;
  retryDelay: number;
  escalate: boolean;
}

/**
 * 增强的错误处理器
 */
export default class ErrorHandler {
  private readonly defaultStrategies: Map<ErrorType, ErrorHandlingStrategy>;
  private readonly errorHistory = new Map<string, number>(); // 错误计数

  constructor(private readonly logger: Logger) {
    this.defaultStrategies = this.initializeDefaultStrategies();
  }

  /**
   * 分析错误并返回处理建议
   */
  analyzeError(
    error: Error | any,
    context: Record<string, any> = {},
    customStrategy?: ErrorHandlingStrategy
  ): ErrorAnalysis {
    try {
      // 1. 分类错误
      const enhancedError = this.classifyError(error, context);

      // 2. 获取处理策略
      const strategy = customStrategy || this.getStrategy(enhancedError.type);

      // 3. 检查是否应该重试
      const errorKey = this.getErrorKey(context);
      const errorCount = this.getErrorCount(errorKey);
      const shouldRetry = this.shouldRetry(enhancedError, strategy, errorCount);

      // 4. 计算重试延迟
      const retryDelay = shouldRetry
        ? this.calculateRetryDelay(strategy.retryConfig, errorCount)
        : 0;

      // 5. 检查是否需要升级
      const escalate = errorCount >= strategy.escalationThreshold;

      // 6. 更新错误计数
      if (shouldRetry) {
        this.incrementErrorCount(errorKey);
      }

      this.logger.debug('错误分析完成', {
        errorType: enhancedError.type,
        severity: enhancedError.severity,
        shouldRetry,
        retryDelay,
        escalate,
        errorCount,
        context
      });

      return {
        enhancedError,
        shouldRetry,
        retryDelay,
        escalate
      };
    } catch (analysisError) {
      this.logger.error('错误分析失败', {
        originalError: error,
        analysisError,
        context
      });

      // 返回保守的分析结果
      return {
        enhancedError: {
          type: 'UNKNOWN_ERROR',
          severity: 'HIGH',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          retryable: false,
          context
        },
        shouldRetry: false,
        retryDelay: 0,
        escalate: true
      };
    }
  }

  /**
   * 分类错误
   */
  private classifyError(
    error: Error | any,
    context: Record<string, any>
  ): EnhancedError {
    const message = error instanceof Error ? error.message : String(error);
    const timestamp = new Date();

    // 基于错误消息和类型进行分类
    let type: ErrorType = 'UNKNOWN_ERROR';
    let severity: ErrorSeverity = 'MEDIUM';
    let retryable = false;
    let retryStrategy: RetryStrategy = 'NO_RETRY';

    // 网络错误
    if (this.isNetworkError(error, message)) {
      type = 'NETWORK_ERROR';
      severity = 'MEDIUM';
      retryable = true;
      retryStrategy = 'EXPONENTIAL_BACKOFF';
    }
    // 超时错误
    else if (this.isTimeoutError(error, message)) {
      type = 'TIMEOUT_ERROR';
      severity = 'MEDIUM';
      retryable = true;
      retryStrategy = 'LINEAR_BACKOFF';
    }
    // 验证错误
    else if (this.isValidationError(error, message)) {
      type = 'VALIDATION_ERROR';
      severity = 'LOW';
      retryable = false;
      retryStrategy = 'NO_RETRY';
    }
    // 资源错误
    else if (this.isResourceError(error, message)) {
      type = 'RESOURCE_ERROR';
      severity = 'HIGH';
      retryable = true;
      retryStrategy = 'FIXED_INTERVAL';
    }
    // 依赖服务错误
    else if (this.isDependencyError(error, message)) {
      type = 'DEPENDENCY_ERROR';
      severity = 'HIGH';
      retryable = true;
      retryStrategy = 'EXPONENTIAL_BACKOFF';
    }
    // 业务逻辑错误
    else if (this.isBusinessError(error, message)) {
      type = 'BUSINESS_ERROR';
      severity = 'LOW';
      retryable = false;
      retryStrategy = 'NO_RETRY';
    }
    // 系统错误
    else if (this.isSystemError(error, message)) {
      type = 'SYSTEM_ERROR';
      severity = 'CRITICAL';
      retryable = true;
      retryStrategy = 'EXPONENTIAL_BACKOFF';
    }

    return {
      type,
      severity,
      message,
      code: error.code || undefined,
      details: error.stack || error,
      timestamp,
      retryable,
      retryStrategy,
      context
    };
  }

  /**
   * 检查是否应该重试
   */
  private shouldRetry(
    error: EnhancedError,
    strategy: ErrorHandlingStrategy,
    currentCount: number
  ): boolean {
    if (!error.retryable) {
      return false;
    }

    if (currentCount >= strategy.retryConfig.maxRetries) {
      return false;
    }

    if (strategy.retryConfig.strategy === 'NO_RETRY') {
      return false;
    }

    return true;
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(
    config: RetryConfig,
    attemptCount: number
  ): number {
    let delay = config.baseDelay;

    switch (config.strategy) {
      case 'EXPONENTIAL_BACKOFF':
        delay = config.baseDelay * Math.pow(config.multiplier, attemptCount);
        break;
      case 'LINEAR_BACKOFF':
        delay =
          config.baseDelay +
          config.baseDelay * config.multiplier * attemptCount;
        break;
      case 'FIXED_INTERVAL':
        delay = config.baseDelay;
        break;
      case 'IMMEDIATE':
        delay = 0;
        break;
      default:
        delay = config.baseDelay;
    }

    // 应用最大延迟限制
    delay = Math.min(delay, config.maxDelay);

    // 添加随机抖动
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10% 抖动
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * 获取错误处理策略
   */
  private getStrategy(errorType: ErrorType): ErrorHandlingStrategy {
    return this.defaultStrategies.get(errorType) || this.getDefaultStrategy();
  }

  /**
   * 初始化默认策略
   */
  private initializeDefaultStrategies(): Map<ErrorType, ErrorHandlingStrategy> {
    const strategies = new Map<ErrorType, ErrorHandlingStrategy>();

    // 网络错误策略
    strategies.set('NETWORK_ERROR', {
      errorType: 'NETWORK_ERROR',
      retryConfig: {
        strategy: 'EXPONENTIAL_BACKOFF',
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        multiplier: 2,
        jitter: true
      },
      escalationThreshold: 5,
      notificationEnabled: true
    });

    // 超时错误策略
    strategies.set('TIMEOUT_ERROR', {
      errorType: 'TIMEOUT_ERROR',
      retryConfig: {
        strategy: 'LINEAR_BACKOFF',
        maxRetries: 2,
        baseDelay: 2000,
        maxDelay: 10000,
        multiplier: 1.5,
        jitter: false
      },
      escalationThreshold: 3,
      notificationEnabled: true
    });

    // 资源错误策略
    strategies.set('RESOURCE_ERROR', {
      errorType: 'RESOURCE_ERROR',
      retryConfig: {
        strategy: 'FIXED_INTERVAL',
        maxRetries: 5,
        baseDelay: 5000,
        maxDelay: 5000,
        multiplier: 1,
        jitter: true
      },
      escalationThreshold: 3,
      notificationEnabled: true
    });

    // 依赖服务错误策略
    strategies.set('DEPENDENCY_ERROR', {
      errorType: 'DEPENDENCY_ERROR',
      retryConfig: {
        strategy: 'EXPONENTIAL_BACKOFF',
        maxRetries: 4,
        baseDelay: 1500,
        maxDelay: 60000,
        multiplier: 2.5,
        jitter: true
      },
      escalationThreshold: 4,
      notificationEnabled: true
    });

    // 系统错误策略
    strategies.set('SYSTEM_ERROR', {
      errorType: 'SYSTEM_ERROR',
      retryConfig: {
        strategy: 'EXPONENTIAL_BACKOFF',
        maxRetries: 2,
        baseDelay: 3000,
        maxDelay: 30000,
        multiplier: 3,
        jitter: false
      },
      escalationThreshold: 2,
      notificationEnabled: true
    });

    // 验证错误和业务错误不重试
    strategies.set('VALIDATION_ERROR', {
      errorType: 'VALIDATION_ERROR',
      retryConfig: {
        strategy: 'NO_RETRY',
        maxRetries: 0,
        baseDelay: 0,
        maxDelay: 0,
        multiplier: 1,
        jitter: false
      },
      escalationThreshold: 1,
      notificationEnabled: false
    });

    strategies.set('BUSINESS_ERROR', {
      errorType: 'BUSINESS_ERROR',
      retryConfig: {
        strategy: 'NO_RETRY',
        maxRetries: 0,
        baseDelay: 0,
        maxDelay: 0,
        multiplier: 1,
        jitter: false
      },
      escalationThreshold: 1,
      notificationEnabled: false
    });

    return strategies;
  }

  /**
   * 获取默认策略
   */
  private getDefaultStrategy(): ErrorHandlingStrategy {
    return {
      errorType: 'UNKNOWN_ERROR',
      retryConfig: {
        strategy: 'EXPONENTIAL_BACKOFF',
        maxRetries: 1,
        baseDelay: 2000,
        maxDelay: 10000,
        multiplier: 2,
        jitter: true
      },
      escalationThreshold: 2,
      notificationEnabled: true
    };
  }

  /**
   * 错误分类辅助方法
   */
  private isNetworkError(error: any, message: string): boolean {
    const networkKeywords = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'network',
      'connection',
      'socket',
      'dns',
      'fetch failed'
    ];

    return networkKeywords.some(
      (keyword) =>
        message.toLowerCase().includes(keyword.toLowerCase()) ||
        error.code === keyword
    );
  }

  private isTimeoutError(error: any, message: string): boolean {
    const timeoutKeywords = ['timeout', 'ETIMEDOUT', 'time out', 'timed out'];

    return timeoutKeywords.some(
      (keyword) =>
        message.toLowerCase().includes(keyword.toLowerCase()) ||
        error.code === keyword
    );
  }

  private isValidationError(error: any, message: string): boolean {
    const validationKeywords = [
      'validation',
      'invalid',
      'required',
      'missing',
      'format',
      'schema',
      'type error',
      'parse error'
    ];

    return (
      validationKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword.toLowerCase())
      ) || error.name === 'ValidationError'
    );
  }

  private isResourceError(error: any, message: string): boolean {
    const resourceKeywords = [
      'out of memory',
      'memory',
      'disk space',
      'storage',
      'quota',
      'limit',
      'capacity',
      'ENOMEM',
      'ENOSPC'
    ];

    return resourceKeywords.some(
      (keyword) =>
        message.toLowerCase().includes(keyword.toLowerCase()) ||
        error.code === keyword
    );
  }

  private isDependencyError(error: any, message: string): boolean {
    const dependencyKeywords = [
      'service unavailable',
      'dependency',
      'external service',
      'api error',
      'upstream',
      '503',
      '502',
      '504'
    ];

    return (
      dependencyKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword.toLowerCase())
      ) ||
      (error.status >= 500 && error.status <= 599)
    );
  }

  private isBusinessError(error: any, message: string): boolean {
    const businessKeywords = [
      'business rule',
      'business logic',
      'workflow rule',
      'condition not met',
      'state error',
      'permission denied'
    ];

    return (
      businessKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword.toLowerCase())
      ) || error.name === 'BusinessError'
    );
  }

  private isSystemError(error: any, message: string): boolean {
    const systemKeywords = [
      'system error',
      'internal error',
      'database error',
      'file system',
      'permission',
      'access denied',
      'EACCES'
    ];

    return systemKeywords.some(
      (keyword) =>
        message.toLowerCase().includes(keyword.toLowerCase()) ||
        error.code === keyword
    );
  }

  /**
   * 错误计数管理
   */
  private getErrorKey(context: Record<string, any>): string {
    const { instanceId, nodeId, taskId } = context;
    return `${instanceId || 'unknown'}:${nodeId || 'unknown'}:${taskId || 'unknown'}`;
  }

  private getErrorCount(errorKey: string): number {
    return this.errorHistory.get(errorKey) || 0;
  }

  private incrementErrorCount(errorKey: string): void {
    const currentCount = this.getErrorCount(errorKey);
    this.errorHistory.set(errorKey, currentCount + 1);
  }

  /**
   * 清理错误历史记录
   */
  clearErrorHistory(errorKey?: string): void {
    if (errorKey) {
      this.errorHistory.delete(errorKey);
    } else {
      this.errorHistory.clear();
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [key, count] of this.errorHistory.entries()) {
      stats[key] = count;
    }
    return stats;
  }
}
