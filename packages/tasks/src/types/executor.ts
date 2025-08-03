/**
 * 执行器相关类型定义
 */

import type { Schema } from 'ajv';

/**
 * 执行器健康状态
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors?: string[];
  /** 警告信息 */
  warnings?: string[];
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  /** 任务ID */
  taskId: number;
  /** 工作流实例ID */
  workflowInstanceId: number;
  /** 节点配置 */
  config: Record<string, any>;
  /** 输入数据 */
  inputs: Record<string, any>;
  /** 工作流上下文 */
  context: Record<string, any>;
  /** 日志记录器 */
  logger: {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
  /** 取消信号 */
  signal?: AbortSignal;
  /** 进度回调 */
  onProgress?: (progress: number, message?: string) => void;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 错误详情 */
  errorDetails?: any;
  /** 执行时长（毫秒） */
  duration?: number;
  /** 是否需要重试 */
  shouldRetry?: boolean;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 执行日志 */
  logs?: ExecutionLog[];
}

/**
 * 执行日志
 */
export interface ExecutionLog {
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 日志消息 */
  message: string;
  /** 时间戳 */
  timestamp: Date;
  /** 额外数据 */
  data?: any;
}

/**
 * 任务执行器接口
 */
export interface TaskExecutor {
  /** 执行器名称 */
  readonly name: string;
  /** 执行器描述 */
  readonly description?: string;
  /** 配置参数的JSON Schema */
  readonly configSchema?: Schema;
  /** 执行器版本 */
  readonly version?: string;
  /** 执行器标签 */
  readonly tags?: string[];

  /**
   * 执行任务
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(context: ExecutionContext): Promise<ExecutionResult>;

  /**
   * 验证配置（可选）
   * @param config 配置对象
   * @returns 验证结果
   */
  validateConfig?(config: any): ValidationResult;

  /**
   * 健康检查（可选）
   * @returns 健康状态
   */
  healthCheck?(): Promise<HealthStatus>;

  /**
   * 初始化执行器（可选）
   * @param config 初始化配置
   */
  initialize?(config?: any): Promise<void>;

  /**
   * 销毁执行器（可选）
   */
  destroy?(): Promise<void>;
}

/**
 * 执行器信息
 */
export interface ExecutorInfo {
  /** 执行器名称 */
  name: string;
  /** 执行器描述 */
  description?: string;
  /** 所属插件 */
  pluginName: string;
  /** 执行器类名 */
  executorClass: string;
  /** 配置Schema */
  configSchema?: Schema;
  /** 是否活跃 */
  isActive: boolean;
  /** 版本 */
  version: string;
  /** 注册时间 */
  registeredAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 健康状态 */
  healthStatus?: HealthStatus;
  /** 最后健康检查时间 */
  lastHealthCheck?: Date;
}

/**
 * 执行器注册表接口
 */
export interface ExecutorRegistry {
  /**
   * 注册执行器
   * @param name 执行器名称
   * @param executor 执行器实例
   */
  registerExecutor(name: string, executor: TaskExecutor): void;

  /**
   * 获取执行器
   * @param name 执行器名称
   * @returns 执行器实例
   */
  getExecutor(name: string): Promise<TaskExecutor>;

  /**
   * 列出所有执行器
   * @returns 执行器信息列表
   */
  listExecutors(): Promise<ExecutorInfo[]>;

  /**
   * 注销执行器
   * @param name 执行器名称
   */
  unregisterExecutor(name: string): void;

  /**
   * 检查执行器是否存在
   * @param name 执行器名称
   * @returns 是否存在
   */
  hasExecutor(name: string): boolean;

  /**
   * 执行健康检查
   * @param name 执行器名称（可选，不传则检查所有）
   * @returns 健康检查结果
   */
  healthCheck(name?: string): Promise<Record<string, HealthStatus>>;
}

/**
 * 执行器工厂接口
 */
export interface ExecutorFactory {
  /**
   * 创建执行器实例
   * @param name 执行器名称
   * @param config 配置参数
   * @returns 执行器实例
   */
  createExecutor(name: string, config?: any): TaskExecutor;

  /**
   * 获取支持的执行器类型
   * @returns 执行器类型列表
   */
  getSupportedTypes(): string[];
}

/**
 * 内置执行器类型
 */
export type BuiltInExecutorType =
  | 'http' // HTTP请求执行器
  | 'script' // 脚本执行器
  | 'email' // 邮件发送执行器
  | 'webhook' // Webhook执行器
  | 'delay' // 延迟执行器
  | 'condition' // 条件判断执行器
  | 'transform' // 数据转换执行器
  | 'log'; // 日志记录执行器

/**
 * HTTP执行器配置
 */
export interface HttpExecutorConfig {
  /** 请求URL */
  url: string;
  /** HTTP方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: any;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
}

/**
 * 脚本执行器配置
 */
export interface ScriptExecutorConfig {
  /** 脚本语言 */
  language: 'javascript' | 'typescript' | 'python' | 'shell';
  /** 脚本内容 */
  script: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 邮件执行器配置
 */
export interface EmailExecutorConfig {
  /** 收件人 */
  to: string | string[];
  /** 抄送 */
  cc?: string | string[];
  /** 密送 */
  bcc?: string | string[];
  /** 主题 */
  subject: string;
  /** 邮件内容 */
  body: string;
  /** 是否HTML格式 */
  html?: boolean;
  /** 附件 */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}
