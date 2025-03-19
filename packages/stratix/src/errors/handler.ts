import { ErrorConstructor, ErrorHandler, ErrorOptions } from '../types/app.js';

export class ErrorManager {
  private errorHandler: ErrorHandler;
  private errors: Record<string, ErrorConstructor> = {};

  constructor() {
    // 默认错误处理器
    this.errorHandler = (err, req, reply) => {
      console.error(err);

      const statusCode = (err as any).statusCode || 500;
      const message = err.message || 'Internal Server Error';

      if (reply && typeof reply.code === 'function') {
        reply.code(statusCode).send({ error: message });
      }
    };
  }

  /**
   * 设置错误处理器
   */
  setErrorHandler(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * 获取错误处理器
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * 创建自定义错误类型
   */
  createError(name: string, options: ErrorOptions = {}): ErrorConstructor {
    class CustomError extends Error {
      statusCode: number;
      code?: string;

      constructor(message: string) {
        super(message);
        this.name = name;
        this.statusCode = options.statusCode || 500;
        this.code = options.code;

        // 捕获堆栈跟踪
        Error.captureStackTrace(this, this.constructor);

        // 添加自定义属性
        Object.keys(options).forEach((key) => {
          if (key !== 'statusCode' && key !== 'code') {
            (this as any)[key] = options[key];
          }
        });
      }
    }

    // 添加到错误集合
    this.errors[name] = CustomError;

    return CustomError;
  }

  /**
   * 获取已注册的错误类型
   */
  getError(name: string): ErrorConstructor | undefined {
    return this.errors[name];
  }
}
