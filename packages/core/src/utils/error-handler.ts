// 统一错误处理机制
// 提供一致的错误处理和报告功能

/**
 * Stratix 错误类型
 */
export enum StratixErrorType {
  PLUGIN_REGISTRATION = 'PLUGIN_REGISTRATION',
  DEPENDENCY_INJECTION = 'DEPENDENCY_INJECTION',
  ROUTE_REGISTRATION = 'ROUTE_REGISTRATION',
  CONTAINER_MANAGEMENT = 'CONTAINER_MANAGEMENT',
  CONFIGURATION = 'CONFIGURATION',
  LIFECYCLE = 'LIFECYCLE'
}

/**
 * Stratix 错误基类
 */
export class StratixError extends Error {
  public readonly type: StratixErrorType;
  public readonly code: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    type: StratixErrorType,
    message: string,
    code?: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message);
    this.name = 'StratixError';
    this.type = type;
    this.code = code || type;
    this.context = context;
    this.timestamp = new Date();

    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * 错误处理器接口
 */
export interface ErrorHandler {
  handle(error: Error, context?: Record<string, any>): void;
  canHandle(error: Error): boolean;
}

/**
 * 默认错误处理器
 */
export class DefaultErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    return true; // 默认处理器处理所有错误
  }

  handle(error: Error, context?: Record<string, any>): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    if (error instanceof StratixError) {
      console.error(`[${error.type}] ${error.message}`, {
        code: error.code,
        context: error.context,
        timestamp: error.timestamp.toISOString()
      });
    } else {
      console.error('Unhandled error:', errorInfo);
    }
  }
}

/**
 * 错误处理管理器
 */
export class ErrorHandlerManager {
  private handlers: ErrorHandler[] = [];

  constructor() {
    // 添加默认错误处理器
    this.addHandler(new DefaultErrorHandler());
  }

  addHandler(handler: ErrorHandler): void {
    this.handlers.unshift(handler); // 新添加的处理器优先级更高
  }

  removeHandler(handler: ErrorHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  handle(error: Error, context?: Record<string, any>): void {
    const handler = this.handlers.find((h) => h.canHandle(error));
    if (handler) {
      handler.handle(error, context);
    }
  }
}

/**
 * 全局错误处理管理器实例
 */
export const globalErrorHandler = new ErrorHandlerManager();

/**
 * 错误处理装饰器
 */
export function HandleErrors(errorType?: StratixErrorType) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        if (result && typeof result.then === 'function') {
          return await result;
        }
        return result;
      } catch (error) {
        const context = {
          className: target.constructor.name,
          methodName: propertyKey,
          arguments: args
        };

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorType && !(error instanceof StratixError)) {
          const stratixError = new StratixError(
            errorType,
            `Error in ${target.constructor.name}.${propertyKey}: ${errorMessage}`,
            undefined,
            context,
            error instanceof Error ? error : undefined
          );
          globalErrorHandler.handle(stratixError, context);
          throw stratixError;
        } else {
          globalErrorHandler.handle(
            error instanceof Error ? error : new Error(String(error)),
            context
          );
          throw error;
        }
      }
    };

    return descriptor;
  };
}

/**
 * 安全执行函数
 */
export async function safeExecute<T>(
  fn: () => T | Promise<T>,
  errorType: StratixErrorType,
  context?: Record<string, any>
): Promise<T | null> {
  try {
    const result = fn();
    if (result && typeof (result as any).then === 'function') {
      return await (result as Promise<T>);
    }
    return result as T;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stratixError = new StratixError(
      errorType,
      `Safe execution failed: ${errorMessage}`,
      undefined,
      context,
      error instanceof Error ? error : undefined
    );
    globalErrorHandler.handle(stratixError, context);
    return null;
  }
}

/**
 * 创建错误工厂函数
 */
export function createErrorFactory(type: StratixErrorType) {
  return (message: string, context?: Record<string, any>, cause?: Error) => {
    return new StratixError(type, message, undefined, context, cause);
  };
}

// 预定义的错误工厂
export const createPluginError = createErrorFactory(
  StratixErrorType.PLUGIN_REGISTRATION
);
export const createDIError = createErrorFactory(
  StratixErrorType.DEPENDENCY_INJECTION
);
export const createRouteError = createErrorFactory(
  StratixErrorType.ROUTE_REGISTRATION
);
export const createContainerError = createErrorFactory(
  StratixErrorType.CONTAINER_MANAGEMENT
);
