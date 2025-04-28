/**
 * Stratix日志系统类型定义
 */

/**
 * 日志级别类型
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志配置选项
 */
export interface LoggerOptions {
  /**
   * 日志级别
   */
  level?: LogLevel;

  /**
   * 是否美化输出
   */
  prettyPrint?: boolean;

  /**
   * 需要隐藏的敏感字段
   */
  redact?: string[];

  /**
   * 日志输出目标
   */
  destination?: string | NodeJS.WritableStream;

  /**
   * 时间戳配置
   */
  timestamp?: boolean | (() => string);
}

/**
 * 日志实例接口
 */
export interface LoggerInstance {
  /**
   * 记录trace级别日志
   */
  trace(obj: unknown, msg?: string, ...args: any[]): void;

  /**
   * 记录debug级别日志
   */
  debug(obj: unknown, msg?: string, ...args: any[]): void;

  /**
   * 记录info级别日志
   */
  info(obj: unknown, msg?: string, ...args: any[]): void;

  /**
   * 记录warn级别日志
   */
  warn(obj: unknown, msg?: string, ...args: any[]): void;

  /**
   * 记录error级别日志
   */
  error(obj: unknown, msg?: string, ...args: any[]): void;

  /**
   * 记录fatal级别日志
   */
  fatal(obj: unknown, msg?: string, ...args: any[]): void;

  /**
   * 创建子日志实例
   */
  child(bindings: Record<string, any>): LoggerInstance;
}
