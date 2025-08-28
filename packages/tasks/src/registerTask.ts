import type { Logger } from '@stratix/core';
import type { Schema } from 'ajv';
import { ExecutionContext } from './types/workflow.js';

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
 * 执行器健康状态
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

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
 * 全局执行器注册表
 * 注意：在生产环境中，这应该使用依赖注入容器管理
 */
const executorRegistry = new Map<string, TaskExecutor>();

/**
 * 注册任务执行器
 * @param logger 日志器
 * @returns 注册函数
 */
export const registerTaskExecutor =
  (logger: Logger) => (name: string, executor: TaskExecutor) => {
    // 验证执行器名称
    if (!name || typeof name !== 'string') {
      throw new Error('Executor name must be a non-empty string');
    }

    // 验证执行器对象
    if (!executor || typeof executor.execute !== 'function') {
      throw new Error('Executor must have an execute method');
    }

    // 验证执行器基本属性
    if (!executor.name) {
      throw new Error(
        'Executor must have name, description, and version properties'
      );
    }

    executorRegistry.set(name, executor);
    logger.info(
      `📝 Task executor registered: ${name} (${executor.description} v${executor.version})`
    );
  };

/**
 * 获取已注册的执行器
 * @param name 执行器名称
 * @returns 执行器实例或undefined
 */
export const getExecutor = (name: string): TaskExecutor | undefined => {
  return executorRegistry.get(name);
};

/**
 * 获取所有已注册的执行器名称
 * @returns 执行器名称列表
 */
export const getRegisteredExecutorNames = (): string[] => {
  return Array.from(executorRegistry.keys());
};

/**
 * 检查执行器是否已注册
 * @param name 执行器名称
 * @returns 是否已注册
 */
export const isExecutorRegistered = (name: string): boolean => {
  return executorRegistry.has(name);
};

/**
 * 清空执行器注册表（主要用于测试）
 */
export const clearExecutorRegistry = (): void => {
  executorRegistry.clear();
};
