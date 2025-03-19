/**
 * 日志级别
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志记录器接口
 */
export interface Logger {
  // 日志级别方法
  trace(obj: object, msg?: string, ...args: any[]): void;
  debug(obj: object, msg?: string, ...args: any[]): void;
  info(obj: object, msg?: string, ...args: any[]): void;
  warn(obj: object, msg?: string, ...args: any[]): void;
  error(obj: object, msg?: string, ...args: any[]): void;
  fatal(obj: object, msg?: string, ...args: any[]): void;

  // 简化版接口
  trace(msg: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
  info(msg: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  fatal(msg: string, ...args: any[]): void;

  // 子日志
  child(bindings: object): Logger;

  // 工具方法
  isLevelEnabled(level: string): boolean;
  level: string;

  // 格式化消息
  formatters: {
    level: (label: string, number: number) => object;
    bindings: (bindings: object) => object;
    log: (object: object) => object;
  };

  // 序列化器
  serializers: Record<string, (value: any) => any>;

  // 自定义方法
  [key: string]: any;
}

/**
 * 日志轮转配置
 */
export interface RotationOptions {
  // 文件大小轮转
  size?: string;

  // 时间轮转
  interval?: string;

  // 保留文件数量
  maxFiles?: number;

  // 压缩旧日志
  compress?: boolean;

  // 文件名格式化
  filename?: (time: number | null) => string;
}

/**
 * 日志输出目标配置
 */
export interface TargetOptions {
  level: string;
  target: string | NodeJS.WritableStream;
  options?: Record<string, any>;
}

/**
 * 日志脱敏配置
 */
export interface RedactOptions {
  paths?: string[];
  censor?: string | ((value: any) => any);
  remove?: boolean;
}

/**
 * 日志性能优化配置
 */
export interface OptimizationOptions {
  bufferSize?: number;
  flushInterval?: number;
}

/**
 * 日志配置选项
 */
export interface LoggerOptions {
  // 日志级别
  level?: LogLevel;

  // 应用名称
  name?: string;

  // 输出目标 (文件路径或流)
  destination?: string | NodeJS.WritableStream;

  // 多输出目标
  targets?: TargetOptions[];

  // 美化输出配置
  prettyPrint?: boolean | Record<string, any>;

  // 基础上下文数据
  base?: Record<string, any>;

  // 时间戳生成
  timestamp?: boolean | (() => string);

  // 消息格式化
  formatters?: {
    level?: (label: string, number: number) => object;
    bindings?: (bindings: object) => object;
    log?: (object: object) => object;
  };

  // 序列化器
  serializers?: Record<string, (value: any) => any>;

  // 日志轮转
  rotation?: RotationOptions;

  // 敏感数据脱敏
  redact?: RedactOptions;

  // 异步模式
  sync?: boolean;

  // 性能优化选项
  optimization?: OptimizationOptions;

  // 扩展选项
  [key: string]: any;
}

/**
 * 框架插件接口
 */
export interface StratixPlugin {
  name: string;
  dependencies: string[];
  register: (app: any, options: any) => Promise<void>;
}

/**
 * Stratix应用接口
 */
export interface StratixApp {
  register: (plugin: any, options?: any) => Promise<void>;
  inject: (name: string, factory: any) => void;
  decorate: (name: string, value: any) => void;
  addHook: (name: string, fn: Function) => void;
  resolve: (name: string) => Promise<any>;
  [key: string]: any;
}
