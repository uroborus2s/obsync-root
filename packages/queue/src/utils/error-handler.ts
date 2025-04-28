/**
 * @stratix/queue 错误处理工具
 * 提供统一的错误处理机制和错误类型
 */

/**
 * 队列错误类型枚举
 */
export enum QueueErrorType {
  // 连接错误
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  // 任务操作错误
  JOB_ERROR = 'JOB_ERROR',
  // 队列操作错误
  QUEUE_ERROR = 'QUEUE_ERROR',
  // 驱动错误
  DRIVER_ERROR = 'DRIVER_ERROR',
  // 配置错误
  CONFIG_ERROR = 'CONFIG_ERROR',
  // 超时错误
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 队列错误类
 * 扩展标准Error，增加错误类型和上下文信息
 */
export class QueueError extends Error {
  public type: QueueErrorType;
  public context: any;
  public cause?: Error;
  public timestamp: Date;

  /**
   * 构造函数
   * @param message 错误消息
   * @param type 错误类型
   * @param context 错误上下文
   * @param cause 导致此错误的原始错误
   */
  constructor(
    message: string,
    type: QueueErrorType = QueueErrorType.UNKNOWN_ERROR,
    context: any = {},
    cause?: Error
  ) {
    super(message);
    this.name = 'QueueError';
    this.type = type;
    this.context = context;
    this.cause = cause;
    this.timestamp = new Date();

    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueueError);
    }
  }

  /**
   * 获取完整错误信息
   */
  getFullMessage(): string {
    let fullMessage = `[${this.type}] ${this.message}`;

    if (this.cause) {
      fullMessage += `\nCaused by: ${this.cause.message}`;
    }

    if (Object.keys(this.context).length > 0) {
      fullMessage += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }

    return fullMessage;
  }
}

/**
 * 错误处理器类
 * 提供统一的错误处理和日志记录功能
 */
export class ErrorHandler {
  private logFunction: (level: string, message: string, ...args: any[]) => void;
  private isSilent: boolean;

  /**
   * 构造函数
   * @param logFunction 日志记录函数
   * @param isSilent 是否静默（不输出到控制台）
   */
  constructor(
    logFunction?: (level: string, message: string, ...args: any[]) => void,
    isSilent: boolean = false
  ) {
    // 如果提供了日志函数，使用它；否则使用默认日志
    this.logFunction = logFunction || this.defaultLogger;
    this.isSilent = isSilent;
  }

  /**
   * 默认日志记录器
   * @param level 日志级别
   * @param message 日志消息
   * @param args 其他参数
   */
  private defaultLogger(level: string, message: string, ...args: any[]): void {
    if (this.isSilent) return;

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [QUEUE] [${level.toUpperCase()}] ${message}`;

    switch (level.toLowerCase()) {
      case 'error':
        console.error(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'info':
        console.info(formattedMessage, ...args);
        break;
      case 'debug':
        console.debug(formattedMessage, ...args);
        break;
      default:
        console.log(formattedMessage, ...args);
    }
  }

  /**
   * 记录错误日志
   * @param error 错误对象
   * @param context 额外上下文
   */
  logError(error: Error | QueueError, context: any = {}): void {
    if (error instanceof QueueError) {
      // 如果已经是QueueError，只添加额外上下文
      error.context = { ...error.context, ...context };
      this.logFunction('error', error.getFullMessage());
    } else {
      // 否则创建新的QueueError
      const queueError = new QueueError(
        error.message,
        QueueErrorType.UNKNOWN_ERROR,
        context,
        error
      );
      this.logFunction('error', queueError.getFullMessage());
    }
  }

  /**
   * 处理连接错误
   * @param error 原始错误
   * @param context 错误上下文
   * @returns 统一格式的QueueError
   */
  handleConnectionError(error: Error, context: any = {}): QueueError {
    const queueError = new QueueError(
      `连接错误: ${error.message}`,
      QueueErrorType.CONNECTION_ERROR,
      context,
      error
    );
    this.logError(queueError);
    return queueError;
  }

  /**
   * 处理任务错误
   * @param error 原始错误
   * @param context 错误上下文
   * @returns 统一格式的QueueError
   */
  handleJobError(error: Error, context: any = {}): QueueError {
    const queueError = new QueueError(
      `任务操作错误: ${error.message}`,
      QueueErrorType.JOB_ERROR,
      context,
      error
    );
    this.logError(queueError);
    return queueError;
  }

  /**
   * 处理队列错误
   * @param error 原始错误
   * @param context 错误上下文
   * @returns 统一格式的QueueError
   */
  handleQueueError(error: Error, context: any = {}): QueueError {
    const queueError = new QueueError(
      `队列操作错误: ${error.message}`,
      QueueErrorType.QUEUE_ERROR,
      context,
      error
    );
    this.logError(queueError);
    return queueError;
  }

  /**
   * 处理驱动错误
   * @param error 原始错误
   * @param context 错误上下文
   * @returns 统一格式的QueueError
   */
  handleDriverError(error: Error, context: any = {}): QueueError {
    const queueError = new QueueError(
      `驱动错误: ${error.message}`,
      QueueErrorType.DRIVER_ERROR,
      context,
      error
    );
    this.logError(queueError);
    return queueError;
  }

  /**
   * 处理超时错误
   * @param message 错误消息
   * @param context 错误上下文
   * @returns 统一格式的QueueError
   */
  handleTimeoutError(message: string, context: any = {}): QueueError {
    const queueError = new QueueError(
      `操作超时: ${message}`,
      QueueErrorType.TIMEOUT_ERROR,
      context
    );
    this.logError(queueError);
    return queueError;
  }
}

/**
 * 创建默认错误处理器实例
 */
export const defaultErrorHandler = new ErrorHandler();
