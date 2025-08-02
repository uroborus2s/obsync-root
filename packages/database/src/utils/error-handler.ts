// @stratix/database 错误处理系统
// 基于 @stratix/utils 函数式错误处理

import {
  withRetry,
  withTimeout,
  type RetryOptions
} from '@stratix/utils/async';

import type { Result } from './helpers.js';

/**
 * 数据库错误类型枚举
 */
export enum DatabaseErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

/**
 * 数据库错误基接口
 */
export interface DatabaseError {
  readonly type: DatabaseErrorType;
  readonly message: string;
  readonly timestamp: Date;
  readonly retryable: boolean;
  readonly code?: string;
  readonly details?: Record<string, any>;
  readonly cause?: Error;
}

/**
 * 连接错误
 */
export class ConnectionError implements DatabaseError {
  readonly type = DatabaseErrorType.CONNECTION_ERROR;
  readonly timestamp = new Date();
  readonly retryable = true;

  constructor(
    readonly message: string,
    readonly connectionName?: string,
    readonly cause?: Error,
    readonly code?: string
  ) {}

  static create(
    message: string,
    connectionName?: string,
    cause?: Error
  ): ConnectionError {
    return new ConnectionError(message, connectionName, cause);
  }
}

/**
 * 查询错误
 */
export class QueryError implements DatabaseError {
  readonly type = DatabaseErrorType.QUERY_ERROR;
  readonly timestamp = new Date();
  readonly retryable = false;

  constructor(
    readonly message: string,
    readonly query?: string,
    readonly parameters?: any[],
    readonly cause?: Error
  ) {}

  static create(
    message: string,
    query?: string,
    parameters?: any[]
  ): QueryError {
    return new QueryError(message, query, parameters);
  }
}

/**
 * 事务错误
 */
export class TransactionError implements DatabaseError {
  readonly type = DatabaseErrorType.TRANSACTION_ERROR;
  readonly timestamp = new Date();
  readonly retryable = true;

  constructor(
    readonly message: string,
    readonly cause?: Error
  ) {}

  static create(message: string, cause?: Error): TransactionError {
    return new TransactionError(message, cause);
  }
}

/**
 * 验证错误
 */
export class ValidationError implements DatabaseError {
  readonly type = DatabaseErrorType.VALIDATION_ERROR;
  readonly timestamp = new Date();
  readonly retryable = false;

  constructor(
    readonly message: string,
    readonly field?: string,
    readonly value?: any
  ) {}

  static create(message: string, field?: string, value?: any): ValidationError {
    return new ValidationError(message, field, value);
  }
}

/**
 * 超时错误
 */
export class TimeoutError implements DatabaseError {
  readonly type = DatabaseErrorType.TIMEOUT_ERROR;
  readonly timestamp = new Date();
  readonly retryable = true;

  constructor(
    readonly message: string,
    readonly timeoutMs?: number,
    readonly operation?: string
  ) {}

  static create(
    message: string,
    timeoutMs?: number,
    operation?: string
  ): TimeoutError {
    return new TimeoutError(message, timeoutMs, operation);
  }
}

/**
 * 权限错误
 */
export class PermissionError implements DatabaseError {
  readonly type = DatabaseErrorType.PERMISSION_ERROR;
  readonly timestamp = new Date();
  readonly retryable = false;

  constructor(
    readonly message: string,
    readonly operation?: string,
    readonly resource?: string
  ) {}

  static create(
    message: string,
    operation?: string,
    resource?: string
  ): PermissionError {
    return new PermissionError(message, operation, resource);
  }
}

/**
 * 配置错误
 */
export class ConfigurationError implements DatabaseError {
  readonly type = DatabaseErrorType.CONFIGURATION_ERROR;
  readonly timestamp = new Date();
  readonly retryable = false;

  constructor(
    readonly message: string,
    readonly configPath?: string
  ) {}

  static create(message: string, configPath?: string): ConfigurationError {
    return new ConfigurationError(message, configPath);
  }
}

/**
 * 数据库操作结果类型
 */
export type DatabaseResult<T> = Result<T, DatabaseError>;

/**
 * 错误分类器 - 使用纯函数
 */
export const ErrorClassifier = {
  /**
   * 分类错误
   */
  classify: (error: unknown): DatabaseError => {
    if (error instanceof Error) {
      const errorInfo = {
        message: error.message.toLowerCase(),
        code: (error as any).code,
        error: error
      };

      // 超时错误优先判断
      if (
        errorInfo.code === 'ETIMEDOUT' ||
        errorInfo.message.includes('timeout') ||
        errorInfo.message.includes('timed out')
      ) {
        return TimeoutError.create(errorInfo.error.message);
      }

      // 连接错误
      if (
        errorInfo.code === 'ECONNRESET' ||
        errorInfo.code === 'ECONNREFUSED' ||
        errorInfo.message.includes('connection') ||
        errorInfo.message.includes('connect')
      ) {
        return ConnectionError.create(errorInfo.error.message);
      }

      // 权限错误
      if (
        errorInfo.message.includes('access denied') ||
        errorInfo.message.includes('permission') ||
        errorInfo.message.includes('unauthorized')
      ) {
        return PermissionError.create(errorInfo.error.message);
      }

      // 验证错误
      if (
        errorInfo.message.includes('constraint') ||
        errorInfo.message.includes('validation') ||
        errorInfo.message.includes('invalid')
      ) {
        return ValidationError.create(errorInfo.error.message);
      }

      // 事务错误
      if (
        errorInfo.message.includes('transaction') ||
        errorInfo.message.includes('rollback')
      ) {
        return TransactionError.create(errorInfo.error.message);
      }

      // 默认为查询错误
      return QueryError.create(errorInfo.error.message);
    }

    if (typeof error === 'string') {
      return QueryError.create(error);
    }

    return QueryError.create('Unknown error occurred');
  },

  isRetryable: (error: DatabaseError): boolean => error.retryable,

  isConnectionError: (error: DatabaseError): boolean =>
    error.type === DatabaseErrorType.CONNECTION_ERROR,

  isTemporaryError: (error: DatabaseError): boolean =>
    [
      DatabaseErrorType.CONNECTION_ERROR,
      DatabaseErrorType.TIMEOUT_ERROR,
      DatabaseErrorType.TRANSACTION_ERROR
    ].includes(error.type)
};

/**
 * 数据库错误处理器 - 使用 @stratix/utils 函数
 */
export const DatabaseErrorHandler = {
  /**
   * 创建成功结果
   */
  success: <T>(data: T): DatabaseResult<T> => ({
    success: true,
    data
  }),

  /**
   * 创建失败结果
   */
  failure: <T>(error: DatabaseError): DatabaseResult<T> => ({
    success: false,
    error
  }),

  /**
   * 执行操作并处理错误
   */
  execute: async <T>(
    operation: () => Promise<T>,
    _context?: string
  ): Promise<DatabaseResult<T>> => {
    try {
      const data = await operation();
      return DatabaseErrorHandler.success(data);
    } catch (error) {
      const classifiedError = ErrorClassifier.classify(error);
      return DatabaseErrorHandler.failure(classifiedError);
    }
  },

  /**
   * 带重试的执行
   */
  executeWithRetry: async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = { retries: 3, delay: 1000 },
    context?: string
  ): Promise<DatabaseResult<T>> => {
    const retryableOperation = async (): Promise<T> => {
      const result = await DatabaseErrorHandler.execute(operation, context);

      if (result.success) {
        return result.data;
      }

      // 如果不可重试，直接抛出
      if (!ErrorClassifier.isRetryable(result.error)) {
        throw result.error;
      }

      throw result.error;
    };

    try {
      const result = await withRetry(retryableOperation, options);
      if (result._tag === 'Right') {
        return DatabaseErrorHandler.success(result.right);
      } else {
        const classifiedError = ErrorClassifier.classify(result.left);
        return DatabaseErrorHandler.failure(classifiedError);
      }
    } catch (error) {
      const classifiedError = ErrorClassifier.classify(error);
      return DatabaseErrorHandler.failure(classifiedError);
    }
  },

  /**
   * 带超时的执行
   */
  executeWithTimeout: async <T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    context?: string
  ): Promise<DatabaseResult<T>> => {
    try {
      const data = await withTimeout(
        operation(),
        timeoutMs,
        `Operation timeout: ${context}`
      );
      return DatabaseErrorHandler.success(data);
    } catch (error) {
      const classifiedError = ErrorClassifier.classify(error);
      return DatabaseErrorHandler.failure(classifiedError);
    }
  }
};

/**
 * 恢复策略接口
 */
export interface RecoveryStrategy<T> {
  canRecover(error: DatabaseError): boolean;
  recover(error: DatabaseError): Promise<T>;
}

/**
 * 连接恢复策略
 */
export class ConnectionRecoveryStrategy<T> implements RecoveryStrategy<T> {
  constructor(private fallbackOperation: () => Promise<T>) {}

  canRecover(error: DatabaseError): boolean {
    return ErrorClassifier.isConnectionError(error);
  }

  async recover(_error: DatabaseError): Promise<T> {
    return await this.fallbackOperation();
  }
}

/**
 * 带恢复策略的错误处理器
 */
export const RecoverableErrorHandler = {
  executeWithRecovery: async <T>(
    operation: () => Promise<T>,
    recoveryStrategy: RecoveryStrategy<T>,
    context?: string
  ): Promise<DatabaseResult<T>> => {
    const result = await DatabaseErrorHandler.execute(operation, context);

    if (result.success) {
      return result;
    }

    // 尝试恢复
    if (recoveryStrategy.canRecover(result.error)) {
      return await DatabaseErrorHandler.execute(
        () => recoveryStrategy.recover(result.error),
        `recovery:${context || 'unknown'}`
      );
    }

    return result;
  }
};
