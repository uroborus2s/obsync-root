// Logger 模块 - 日志相关功能（简化版本）
// 基于 Pino 的日志系统

import type { Logger as PinoLogger, LoggerOptions } from 'pino';

export { getLogger, LoggerFactory } from './logger-factory.js';
export { pino as createLogger } from 'pino';

type CompatLogFn = (...args: any[]) => void;

// 对外暴露兼容旧调用习惯的 logger 类型，避免工作区包在升级到 pino 10 后集体报错。
export interface Logger
  extends Omit<
    PinoLogger,
    'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
  > {
  fatal: CompatLogFn;
  error: CompatLogFn;
  warn: CompatLogFn;
  info: CompatLogFn;
  debug: CompatLogFn;
  trace: CompatLogFn;
}

export type { LoggerOptions };
