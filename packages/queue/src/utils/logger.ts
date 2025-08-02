/**
 * 日志工具
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: any;
  error?: Error;
  queue?: string;
  messageId?: string;
  operation?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'text';
  output: 'console' | 'file' | 'both';
  filename?: string;
  maxFileSize?: number;
  maxFiles?: number;
  includeStack?: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private context: any = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      format: 'json',
      output: 'console',
      includeStack: true,
      ...config
    };
  }

  setContext(context: any): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: any): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  fatal(message: string, error?: Error, context?: any): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  private log(level: LogLevel, message: string, context?: any, error?: Error): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: { ...this.context, ...context },
      error,
      queue: context?.queue,
      messageId: context?.messageId,
      operation: context?.operation
    };

    this.output(entry);
  }

  private output(entry: LogEntry): void {
    const formatted = this.format(entry);

    if (this.config.output === 'console' || this.config.output === 'both') {
      this.outputToConsole(entry.level, formatted);
    }

    if (this.config.output === 'file' || this.config.output === 'both') {
      this.outputToFile(formatted);
    }
  }

  private format(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return this.formatJson(entry);
    } else {
      return this.formatText(entry);
    }
  }

  private formatJson(entry: LogEntry): string {
    const logObject: any = {
      timestamp: new Date(entry.timestamp).toISOString(),
      level: LogLevel[entry.level],
      message: entry.message,
      ...entry.context
    };

    if (entry.queue) {
      logObject.queue = entry.queue;
    }

    if (entry.messageId) {
      logObject.messageId = entry.messageId;
    }

    if (entry.operation) {
      logObject.operation = entry.operation;
    }

    if (entry.error) {
      logObject.error = {
        name: entry.error.name,
        message: entry.error.message,
        ...(this.config.includeStack && { stack: entry.error.stack })
      };
    }

    return JSON.stringify(logObject);
  }

  private formatText(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    let message = `${timestamp} [${level}] ${entry.message}`;

    if (entry.queue) {
      message += ` queue=${entry.queue}`;
    }

    if (entry.messageId) {
      message += ` messageId=${entry.messageId}`;
    }

    if (entry.operation) {
      message += ` operation=${entry.operation}`;
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      message += ` context=${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      message += `\nError: ${entry.error.message}`;
      if (this.config.includeStack && entry.error.stack) {
        message += `\n${entry.error.stack}`;
      }
    }

    return message;
  }

  private outputToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message);
        break;
    }
  }

  private outputToFile(message: string): void {
    // 文件输出实现（简化版）
    // 在实际项目中可以使用 fs 模块或日志库如 winston
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(message + '\n');
    }
  }

  // 创建子logger
  child(context: any): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }
}

// 默认logger实例
export const defaultLogger = new Logger({
  level: LogLevel.INFO,
  format: 'json',
  output: 'console'
});

// 便捷函数
export const createLogger = (config?: Partial<LoggerConfig>): Logger => {
  return new Logger(config);
};

// 队列专用logger
export const createQueueLogger = (queueName: string, config?: Partial<LoggerConfig>): Logger => {
  const logger = new Logger(config);
  logger.setContext({ queue: queueName });
  return logger;
};

// 操作专用logger
export const createOperationLogger = (operation: string, config?: Partial<LoggerConfig>): Logger => {
  const logger = new Logger(config);
  logger.setContext({ operation });
  return logger;
};
