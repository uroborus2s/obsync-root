// @stratix/core 应用级错误处理模块
// 提供应用级容器注册过程中的错误处理和异常捕获机制

import { getLogger } from '../logger/index.js';

/**
 * 应用级错误类型
 */
export enum ApplicationErrorType {
  MODULE_REGISTRATION = 'MODULE_REGISTRATION',
  LIFECYCLE_EXECUTION = 'LIFECYCLE_EXECUTION',
  ROUTE_REGISTRATION = 'ROUTE_REGISTRATION',
  CONTAINER_RESOLUTION = 'CONTAINER_RESOLUTION',
  CONFIGURATION = 'CONFIGURATION',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 应用级错误详情
 */
export interface ApplicationErrorDetails {
  type: ApplicationErrorType;
  moduleName?: string;
  phase?: string;
  originalError: Error;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * 错误处理策略
 */
export type ErrorHandlingStrategy = 'throw' | 'warn' | 'ignore';

/**
 * 应用级错误处理器
 */
export class ApplicationErrorHandler {
  private errors: ApplicationErrorDetails[] = [];
  private debugEnabled: boolean;

  constructor(debugEnabled: boolean = false) {
    this.debugEnabled = debugEnabled;
  }

  /**
   * 处理模块注册错误
   */
  handleModuleRegistrationError(
    moduleName: string,
    error: Error,
    strategy: ErrorHandlingStrategy = 'warn',
    context?: Record<string, any>
  ): void {
    const errorDetails: ApplicationErrorDetails = {
      type: ApplicationErrorType.MODULE_REGISTRATION,
      moduleName,
      originalError: error,
      timestamp: new Date(),
      context
    };

    this.errors.push(errorDetails);
    this.processError(errorDetails, strategy);
  }

  /**
   * 处理生命周期执行错误
   */
  handleLifecycleExecutionError(
    moduleName: string,
    phase: string,
    error: Error,
    strategy: ErrorHandlingStrategy = 'warn',
    context?: Record<string, any>
  ): void {
    const errorDetails: ApplicationErrorDetails = {
      type: ApplicationErrorType.LIFECYCLE_EXECUTION,
      moduleName,
      phase,
      originalError: error,
      timestamp: new Date(),
      context
    };

    this.errors.push(errorDetails);
    this.processError(errorDetails, strategy);
  }

  /**
   * 处理路由注册错误
   */
  handleRouteRegistrationError(
    moduleName: string,
    error: Error,
    strategy: ErrorHandlingStrategy = 'warn',
    context?: Record<string, any>
  ): void {
    const errorDetails: ApplicationErrorDetails = {
      type: ApplicationErrorType.ROUTE_REGISTRATION,
      moduleName,
      originalError: error,
      timestamp: new Date(),
      context
    };

    this.errors.push(errorDetails);
    this.processError(errorDetails, strategy);
  }

  /**
   * 处理容器解析错误
   */
  handleContainerResolutionError(
    moduleName: string,
    error: Error,
    strategy: ErrorHandlingStrategy = 'warn',
    context?: Record<string, any>
  ): void {
    const errorDetails: ApplicationErrorDetails = {
      type: ApplicationErrorType.CONTAINER_RESOLUTION,
      moduleName,
      originalError: error,
      timestamp: new Date(),
      context
    };

    this.errors.push(errorDetails);
    this.processError(errorDetails, strategy);
  }

  /**
   * 处理配置错误
   */
  handleConfigurationError(
    error: Error,
    strategy: ErrorHandlingStrategy = 'throw',
    context?: Record<string, any>
  ): void {
    const errorDetails: ApplicationErrorDetails = {
      type: ApplicationErrorType.CONFIGURATION,
      originalError: error,
      timestamp: new Date(),
      context
    };

    this.errors.push(errorDetails);
    this.processError(errorDetails, strategy);
  }

  /**
   * 处理未知错误
   */
  handleUnknownError(
    error: Error,
    strategy: ErrorHandlingStrategy = 'warn',
    context?: Record<string, any>
  ): void {
    const errorDetails: ApplicationErrorDetails = {
      type: ApplicationErrorType.UNKNOWN,
      originalError: error,
      timestamp: new Date(),
      context
    };

    this.errors.push(errorDetails);
    this.processError(errorDetails, strategy);
  }

  /**
   * 处理错误的核心逻辑
   */
  private processError(
    errorDetails: ApplicationErrorDetails,
    strategy: ErrorHandlingStrategy
  ): void {
    const logger = getLogger();
    const errorMessage = this.formatErrorMessage(errorDetails);

    switch (strategy) {
      case 'throw':
        if (this.debugEnabled) {
          logger.error(errorMessage, errorDetails);
        }
        throw errorDetails.originalError;

      case 'warn':
        logger.warn(errorMessage, this.debugEnabled ? errorDetails : undefined);
        break;

      case 'ignore':
        if (this.debugEnabled) {
          logger.debug(errorMessage, errorDetails);
        }
        break;

      default:
        logger.warn(`Unknown error handling strategy: ${strategy}. Defaulting to 'warn'.`);
        logger.warn(errorMessage, this.debugEnabled ? errorDetails : undefined);
        break;
    }
  }

  /**
   * 格式化错误消息
   */
  private formatErrorMessage(errorDetails: ApplicationErrorDetails): string {
    const { type, moduleName, phase, originalError } = errorDetails;
    
    let message = `[${type}]`;
    
    if (moduleName) {
      message += ` Module: ${moduleName}`;
    }
    
    if (phase) {
      message += ` Phase: ${phase}`;
    }
    
    message += ` - ${originalError.message}`;
    
    return message;
  }

  /**
   * 获取所有错误
   */
  getErrors(): ApplicationErrorDetails[] {
    return [...this.errors];
  }

  /**
   * 获取指定类型的错误
   */
  getErrorsByType(type: ApplicationErrorType): ApplicationErrorDetails[] {
    return this.errors.filter(error => error.type === type);
  }

  /**
   * 获取错误统计
   */
  getErrorStatistics(): Record<ApplicationErrorType, number> {
    const stats: Record<ApplicationErrorType, number> = {
      [ApplicationErrorType.MODULE_REGISTRATION]: 0,
      [ApplicationErrorType.LIFECYCLE_EXECUTION]: 0,
      [ApplicationErrorType.ROUTE_REGISTRATION]: 0,
      [ApplicationErrorType.CONTAINER_RESOLUTION]: 0,
      [ApplicationErrorType.CONFIGURATION]: 0,
      [ApplicationErrorType.UNKNOWN]: 0
    };

    this.errors.forEach(error => {
      stats[error.type]++;
    });

    return stats;
  }

  /**
   * 检查是否有错误
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * 检查是否有指定类型的错误
   */
  hasErrorsOfType(type: ApplicationErrorType): boolean {
    return this.errors.some(error => error.type === type);
  }

  /**
   * 清除所有错误
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * 生成错误报告
   */
  generateErrorReport(): string {
    if (!this.hasErrors()) {
      return 'No errors recorded.';
    }

    const stats = this.getErrorStatistics();
    const totalErrors = this.errors.length;

    let report = `Application Error Report (Total: ${totalErrors})\n`;
    report += '='.repeat(50) + '\n\n';

    // 错误统计
    report += 'Error Statistics:\n';
    Object.entries(stats).forEach(([type, count]) => {
      if (count > 0) {
        report += `  ${type}: ${count}\n`;
      }
    });
    report += '\n';

    // 详细错误列表
    report += 'Detailed Errors:\n';
    this.errors.forEach((error, index) => {
      report += `${index + 1}. [${error.type}] `;
      if (error.moduleName) {
        report += `Module: ${error.moduleName} `;
      }
      if (error.phase) {
        report += `Phase: ${error.phase} `;
      }
      report += `- ${error.originalError.message}\n`;
      report += `   Timestamp: ${error.timestamp.toISOString()}\n`;
      if (error.context && Object.keys(error.context).length > 0) {
        report += `   Context: ${JSON.stringify(error.context, null, 2)}\n`;
      }
      report += '\n';
    });

    return report;
  }
}

/**
 * 安全执行函数，带错误处理
 */
export async function safeExecute<T>(
  operation: () => Promise<T> | T,
  errorHandler: ApplicationErrorHandler,
  errorType: ApplicationErrorType,
  strategy: ErrorHandlingStrategy = 'warn',
  context?: {
    moduleName?: string;
    phase?: string;
    operationName?: string;
    [key: string]: any;
  }
): Promise<T | null> {
  try {
    return await Promise.resolve(operation());
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    switch (errorType) {
      case ApplicationErrorType.MODULE_REGISTRATION:
        errorHandler.handleModuleRegistrationError(
          context?.moduleName || 'unknown',
          err,
          strategy,
          context
        );
        break;
      case ApplicationErrorType.LIFECYCLE_EXECUTION:
        errorHandler.handleLifecycleExecutionError(
          context?.moduleName || 'unknown',
          context?.phase || 'unknown',
          err,
          strategy,
          context
        );
        break;
      case ApplicationErrorType.ROUTE_REGISTRATION:
        errorHandler.handleRouteRegistrationError(
          context?.moduleName || 'unknown',
          err,
          strategy,
          context
        );
        break;
      case ApplicationErrorType.CONTAINER_RESOLUTION:
        errorHandler.handleContainerResolutionError(
          context?.moduleName || 'unknown',
          err,
          strategy,
          context
        );
        break;
      case ApplicationErrorType.CONFIGURATION:
        errorHandler.handleConfigurationError(err, strategy, context);
        break;
      default:
        errorHandler.handleUnknownError(err, strategy, context);
        break;
    }
    
    return null;
  }
}
