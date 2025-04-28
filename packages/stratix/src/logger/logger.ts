/**
 * Stratix日志系统实现
 */
import pino, { Logger, LoggerOptions } from 'pino';
import { LoggerInstance } from '../types/logger.js';

/**
 * 日志配置选项
 */
export interface LoggerConfig {
  /**
   * 日志级别
   */
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  /**
   * 是否美化输出
   */
  prettyPrint?: boolean;

  /**
   * 日志文件路径
   */
  destination?: string;

  /**
   * 是否启用时间戳
   */
  timestamp?: boolean;

  /**
   * 自定义序列化器
   */
  serializers?: Record<string, (value: any) => any>;
}

/**
 * 创建日志实例
 * @param config 日志配置
 * @returns 日志实例
 */
export function createLogger(config: LoggerConfig = {}): LoggerInstance {
  const {
    level = 'info',
    prettyPrint = false,
    destination,
    timestamp = true,
    serializers = {}
  } = config;

  // 基础配置
  const options: LoggerOptions = {
    level,
    timestamp: timestamp ? pino.stdTimeFunctions.isoTime : undefined,
    serializers: {
      // 内置序列化器
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      // 自定义序列化器
      ...serializers
    }
  };

  // 美化输出
  if (prettyPrint) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    };
  }

  // 创建日志实例
  let logger: Logger;

  if (destination) {
    // 输出到文件
    const stream = pino.destination({
      dest: destination,
      sync: false // 异步写入以提高性能
    });

    // 使用类型断言解决pino调用问题
    logger = (
      pino as unknown as (options: LoggerOptions, stream: any) => Logger
    )(options, stream);

    // 处理进程退出时的日志同步
    process.on('beforeExit', () => {
      stream.flushSync();
    });
  } else {
    // 输出到控制台，使用类型断言
    logger = (pino as unknown as (options: LoggerOptions) => Logger)(options);
  }

  // 包装pino日志实例以符合LoggerInstance接口
  const wrapper: LoggerInstance = {
    trace: (obj: any, msg?: string, ...args: any[]) =>
      logger.trace(obj, msg, ...args),
    debug: (obj: any, msg?: string, ...args: any[]) =>
      logger.debug(obj, msg, ...args),
    info: (obj: any, msg?: string, ...args: any[]) =>
      logger.info(obj, msg, ...args),
    warn: (obj: any, msg?: string, ...args: any[]) =>
      logger.warn(obj, msg, ...args),
    error: (obj: any, msg?: string, ...args: any[]) =>
      logger.error(obj, msg, ...args),
    fatal: (obj: any, msg?: string, ...args: any[]) =>
      logger.fatal(obj, msg, ...args),
    child: (bindings: Record<string, any>) => logger.child(bindings)
  };

  return wrapper;
}

/**
 * 默认日志配置
 */
export const defaultLoggerConfig: LoggerConfig = {
  level: 'info',
  prettyPrint: process.env.NODE_ENV === 'development',
  timestamp: true
};
