/**
 * @stratix/queue 任务相关类型定义
 */

import type { JobStatus, QueueJobSelect } from './queue.types.js';

// ============================================================================
// 任务数据类型
// ============================================================================

/**
 * 任务负载数据接口
 */
export interface JobPayload {
  [key: string]: unknown;
}

/**
 * 任务结果数据接口
 */
export interface JobResult {
  [key: string]: unknown;
}

/**
 * 任务元数据接口
 */
export interface JobMetadata {
  /** 任务标签 */
  tags?: string[];
  /** 任务描述 */
  description?: string;
  /** 任务来源 */
  source?: string;
  /** 自定义属性 */
  [key: string]: unknown;
}

/**
 * 任务错误信息接口
 */
export interface JobError {
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 错误代码 */
  code?: string;
  /** 错误详情 */
  details?: Record<string, unknown>;
}

// ============================================================================
// 任务创建和更新类型
// ============================================================================

/**
 * 创建任务的输入数据
 */
export interface CreateJobInput {
  /** 队列名称 */
  queueName: string;
  /** 分组ID（可选） */
  groupId?: string;
  /** 任务名称/类型 */
  jobName: string;
  /** 执行器名称 */
  executorName: string;
  /** 任务负载数据 */
  payload: JobPayload;
  /** 优先级（默认为0） */
  priority?: number;
  /** 最大重试次数（默认为3） */
  maxAttempts?: number;
  /** 延迟执行时间 */
  delayUntil?: Date;
  /** 任务元数据 */
  metadata?: JobMetadata;
}

/**
 * 批量创建任务的输入数据
 */
export interface CreateJobsBatchInput {
  /** 队列名称 */
  queueName: string;
  /** 分组ID（可选） */
  groupId?: string;
  /** 任务列表 */
  jobs: Array<{
    /** 任务名称/类型 */
    jobName: string;
    /** 执行器名称 */
    executorName: string;
    /** 任务负载数据 */
    payload: JobPayload;
    /** 优先级（默认为0） */
    priority?: number;
    /** 最大重试次数（默认为3） */
    maxAttempts?: number;
    /** 延迟执行时间 */
    delayUntil?: Date;
    /** 任务元数据 */
    metadata?: JobMetadata;
  }>;
}

/**
 * 更新任务状态的输入数据
 */
export interface UpdateJobStatusInput {
  /** 任务ID */
  jobId: string;
  /** 新状态 */
  status: JobStatus;
  /** 任务结果（可选） */
  result?: JobResult;
  /** 开始时间（可选） */
  startedAt?: Date;
}

/**
 * 任务执行结果
 */
export interface JobExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 执行结果数据 */
  result?: JobResult;
  /** 错误信息（如果失败） */
  error?: JobError;
  /** 执行时长（毫秒） */
  executionTime: number;
}

// ============================================================================
// 执行器相关类型
// ============================================================================

/**
 * 任务执行器接口
 */
export interface JobExecutor {
  /** 执行器名称 */
  name: string;
  /** 执行任务 */
  execute(job: QueueJob): Promise<JobExecutionResult>;
  /** 验证任务负载（可选） */
  validate?(payload: JobPayload): boolean | Promise<boolean>;
  /** 执行器配置（可选） */
  config?: ExecutorConfig;
}

/**
 * 执行器配置接口
 */
export interface ExecutorConfig {
  /** 并发数限制 */
  concurrency?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试配置 */
  retry?: {
    /** 最大重试次数 */
    maxAttempts?: number;
    /** 重试延迟（毫秒） */
    delay?: number;
    /** 重试延迟倍数 */
    backoffMultiplier?: number;
  };
  /** 自定义配置 */
  [key: string]: unknown;
}

/**
 * 执行器注册信息
 */
export interface ExecutorRegistration {
  /** 执行器实例 */
  executor: JobExecutor;
  /** 注册时间 */
  registeredAt: Date;
  /** 是否启用 */
  enabled: boolean;
}

// ============================================================================
// 队列任务类型
// ============================================================================

/**
 * 队列任务类（运行时使用）
 */
export interface QueueJob extends QueueJobSelect {
  /** 执行任务 */
  execute(): Promise<JobExecutionResult>;
  /** 获取任务信息摘要 */
  getSummary(): JobSummary;
  /** 检查是否可以执行 */
  canExecute(): boolean;
  /** 检查是否已延迟 */
  isDelayed(): boolean;
  /** 检查是否已暂停 */
  isPaused(): boolean;
}

/**
 * 任务信息摘要
 */
export interface JobSummary {
  /** 任务ID */
  id: string;
  /** 队列名称 */
  queueName: string;
  /** 分组ID */
  groupId?: string;
  /** 任务名称 */
  jobName: string;
  /** 执行器名称 */
  executorName: string;
  /** 任务状态 */
  status: JobStatus;
  /** 优先级 */
  priority: number;
  /** 已尝试次数 */
  attempts: number;
  /** 最大尝试次数 */
  maxAttempts: number;
  /** 创建时间 */
  createdAt: Date;
  /** 延迟执行时间 */
  delayUntil?: Date;
}

// ============================================================================
// 查询和过滤类型
// ============================================================================

/**
 * 任务查询条件
 */
export interface JobQueryOptions {
  /** 队列名称 */
  queueName?: string;
  /** 分组ID */
  groupId?: string;
  /** 任务状态 */
  status?: JobStatus | JobStatus[];
  /** 执行器名称 */
  executorName?: string;
  /** 优先级范围 */
  priorityRange?: {
    min?: number;
    max?: number;
  };
  /** 创建时间范围 */
  createdAtRange?: {
    from?: Date;
    to?: Date;
  };
  /** 分页选项 */
  pagination?: {
    offset?: number;
    limit?: number;
  };
  /** 排序选项 */
  orderBy?: {
    field: 'created_at' | 'priority' | 'updated_at';
    direction: 'asc' | 'desc';
  };
}

/**
 * 任务统计信息
 */
export interface JobStatistics {
  /** 总任务数 */
  total: number;
  /** 等待中的任务数 */
  waiting: number;
  /** 执行中的任务数 */
  executing: number;
  /** 延迟的任务数 */
  delayed: number;
  /** 暂停的任务数 */
  paused: number;
  /** 按队列分组的统计 */
  byQueue: Record<
    string,
    {
      total: number;
      waiting: number;
      executing: number;
      delayed: number;
      paused: number;
    }
  >;
  /** 按分组分组的统计 */
  byGroup: Record<
    string,
    {
      total: number;
      waiting: number;
      executing: number;
      delayed: number;
      paused: number;
    }
  >;
}
