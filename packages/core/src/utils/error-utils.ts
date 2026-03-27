// 统一错误处理工具
// 提供统一的错误处理模式，消除重复代码

import type { Logger } from 'pino';

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  operation?: string;
  component?: string;
  metadata?: Record<string, any>;
}

/**
 * 安全执行选项
 */
export interface SafeExecuteOptions<T> {
  defaultValue: T;
  logger?: Logger;
  context?: ErrorContext;
  logLevel?: 'error' | 'warn' | 'debug';
}

/**
 * 错误包装选项
 */
export interface WrapErrorOptions {
  context: string;
  logger?: Logger;
  preserveStack?: boolean;
  metadata?: Record<string, any>;
}

/**
 * 统一错误处理工具类
 * 采用函数式编程风格，提供纯函数接口
 */
export const ErrorUtils = {
  /**
   * 统一错误消息提取
   * 安全地从任意类型的错误中提取消息
   */
  extractMessage: (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }
    return String(error);
  },

  /**
   * 统一错误包装
   * 将原始错误包装为带有上下文信息的新错误
   */
  wrapError: (error: unknown, options: WrapErrorOptions): Error => {
    const message = ErrorUtils.extractMessage(error);
    const wrappedMessage = `${options.context}: ${message}`;
    
    const wrappedError = new Error(wrappedMessage);
    
    // 保留原始堆栈信息
    if (options.preserveStack !== false && error instanceof Error) {
      wrappedError.stack = `${wrappedError.stack}\nCaused by: ${error.stack}`;
    }
    
    // 添加元数据
    if (options.metadata) {
      Object.assign(wrappedError, { metadata: options.metadata });
    }
    
    // 记录日志
    if (options.logger) {
      options.logger.error(wrappedMessage, {
        originalError: error,
        metadata: options.metadata
      });
    }
    
    return wrappedError;
  },

  /**
   * 安全执行包装器
   * 执行可能失败的操作，失败时返回默认值
   */
  safeExecute: async <T>(
    fn: () => T | Promise<T>,
    options: SafeExecuteOptions<T>
  ): Promise<T> => {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      const message = ErrorUtils.extractMessage(error);
      const logLevel = options.logLevel || 'error';
      
      if (options.logger) {
        const logMessage = options.context 
          ? `Safe execution failed in ${options.context?.component || 'unknown'}.${options.context?.operation || 'unknown'}: ${message}`
          : `Safe execution failed: ${message}`;
          
        options.logger[logLevel](logMessage, {
          error,
          context: options.context,
          defaultValue: options.defaultValue
        });
      }
      
      return options.defaultValue;
    }
  },

  /**
   * 同步版本的安全执行
   */
  safeExecuteSync: <T>(
    fn: () => T,
    options: SafeExecuteOptions<T>
  ): T => {
    try {
      return fn();
    } catch (error) {
      const message = ErrorUtils.extractMessage(error);
      const logLevel = options.logLevel || 'error';
      
      if (options.logger) {
        const logMessage = options.context 
          ? `Safe execution failed in ${options.context?.component || 'unknown'}.${options.context?.operation || 'unknown'}: ${message}`
          : `Safe execution failed: ${message}`;
          
        options.logger[logLevel](logMessage, {
          error,
          context: options.context,
          defaultValue: options.defaultValue
        });
      }
      
      return options.defaultValue;
    }
  },

  /**
   * 创建带有上下文的错误包装器
   * 返回一个预配置的错误包装函数
   */
  createErrorWrapper: (context: string, logger?: Logger) => {
    return (error: unknown, additionalContext?: string): Error => {
      const fullContext = additionalContext ? `${context}.${additionalContext}` : context;
      return ErrorUtils.wrapError(error, {
        context: fullContext,
        logger,
        preserveStack: true
      });
    };
  },

  /**
   * 创建带有上下文的安全执行器
   * 返回一个预配置的安全执行函数
   */
  createSafeExecutor: <T>(
    component: string,
    logger?: Logger,
    defaultLogLevel: 'error' | 'warn' | 'debug' = 'error'
  ) => {
    return async (
      operation: string,
      fn: () => T | Promise<T>,
      defaultValue: T
    ): Promise<T> => {
      return ErrorUtils.safeExecute(fn, {
        defaultValue,
        logger,
        logLevel: defaultLogLevel,
        context: {
          component,
          operation
        }
      });
    };
  },

  /**
   * 检查错误类型
   */
  isError: (value: unknown): value is Error => {
    return value instanceof Error;
  },

  /**
   * 检查是否为特定类型的错误
   */
  isErrorOfType: <T extends Error>(
    error: unknown,
    errorClass: new (...args: any[]) => T
  ): error is T => {
    return error instanceof errorClass;
  },

  /**
   * 提取错误代码（如果存在）
   */
  extractErrorCode: (error: unknown): string | undefined => {
    if (error && typeof error === 'object' && 'code' in error) {
      return String((error as any).code);
    }
    return undefined;
  },

  /**
   * 检查是否为系统错误
   */
  isSystemError: (error: unknown): error is NodeJS.ErrnoException => {
    return ErrorUtils.isError(error) && 'code' in error && 'errno' in error;
  },

  /**
   * 格式化错误信息用于日志记录
   */
  formatForLogging: (error: unknown, context?: ErrorContext): Record<string, any> => {
    const baseInfo = {
      message: ErrorUtils.extractMessage(error),
      timestamp: new Date().toISOString()
    };

    if (ErrorUtils.isError(error)) {
      Object.assign(baseInfo, {
        name: error.name,
        stack: error.stack
      });
    }

    if (ErrorUtils.isSystemError(error)) {
      Object.assign(baseInfo, {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        path: error.path
      });
    }

    if (context) {
      Object.assign(baseInfo, { context });
    }

    return baseInfo;
  }
};

/**
 * 常用的错误处理装饰器工厂
 */
export const withErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  context: string,
  logger?: Logger
): T => {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      
      // 处理异步函数
      if (result && typeof result.then === 'function') {
        return result.catch((error: unknown) => {
          throw ErrorUtils.wrapError(error, { context, logger });
        });
      }
      
      return result;
    } catch (error) {
      throw ErrorUtils.wrapError(error, { context, logger });
    }
  }) as T;
};

/**
 * 重试执行装饰器
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
    logger?: Logger;
    context?: string;
  }
): Promise<T> => {
  const { maxRetries, delay = 1000, backoff = 'linear', logger, context } = options;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const currentDelay = backoff === 'exponential' 
        ? delay * Math.pow(2, attempt)
        : delay * (attempt + 1);
      
      if (logger && context) {
        logger.warn(`${context} failed, retrying in ${currentDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, {
          error: ErrorUtils.formatForLogging(error)
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw ErrorUtils.wrapError(lastError, {
    context: context ? `${context} (after ${maxRetries} retries)` : `Operation failed after ${maxRetries} retries`,
    logger
  });
};
