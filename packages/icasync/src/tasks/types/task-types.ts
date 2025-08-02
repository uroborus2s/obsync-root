// @stratix/icasync 任务系统类型定义
// 定义任务处理器、执行上下文、结果等核心类型

import type { Logger } from '@stratix/core';

/**
 * icasync 任务类型枚举
 */
export enum IcasyncTaskType {
  // === 数据处理任务 ===
  DATA_VALIDATION = 'data_validation',           // 数据验证
  DATA_AGGREGATION = 'data_aggregation',         // 数据聚合
  DATA_CLEANUP = 'data_cleanup',                 // 数据清理
  
  // === 日历管理任务 ===
  CALENDAR_CREATION = 'calendar_creation',       // 日历创建
  CALENDAR_DELETION = 'calendar_deletion',       // 日历删除
  CALENDAR_UPDATE = 'calendar_update',           // 日历更新
  
  // === 参与者管理任务 ===
  PARTICIPANT_ADDITION = 'participant_addition', // 添加参与者
  PARTICIPANT_REMOVAL = 'participant_removal',   // 移除参与者
  PARTICIPANT_SYNC = 'participant_sync',         // 同步参与者
  
  // === 日程管理任务 ===
  SCHEDULE_CREATION = 'schedule_creation',       // 日程创建
  SCHEDULE_DELETION = 'schedule_deletion',       // 日程删除
  SCHEDULE_UPDATE = 'schedule_update',           // 日程更新
  
  // === 状态管理任务 ===
  STATUS_UPDATE = 'status_update',               // 状态更新
  SYNC_COMPLETION = 'sync_completion',           // 同步完成
  REPORT_GENERATION = 'report_generation'       // 报告生成
}

/**
 * 任务配置基础接口
 */
export interface TaskConfig {
  /** 学年学期 */
  xnxq?: string;
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否并行执行 */
  parallel?: boolean;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retries?: number;
  /** 自定义配置 */
  [key: string]: any;
}

/**
 * 任务执行上下文
 */
export interface TaskExecutionContext {
  /** 任务ID */
  taskId: string;
  /** 工作流ID */
  workflowId: string;
  /** 任务配置 */
  config: TaskConfig;
  /** 任务数据 */
  data: Record<string, any>;
  /** 依赖任务的执行结果 */
  dependencies: TaskExecutionResult[];
  /** 日志记录器 */
  logger: Logger;
  /** 服务实例 */
  services: IcasyncServices;
  /** 任务开始时间 */
  startTime: number;
  /** 执行上下文元数据 */
  metadata?: Record<string, any>;
}

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: Record<string, any>;
  /** 错误信息 */
  error?: string;
  /** 执行进度 (0-100) */
  progress: number;
  /** 性能指标 */
  metrics: TaskMetrics;
  /** 下一步要执行的任务 */
  nextTasks?: string[];
  /** 警告信息 */
  warnings?: string[];
}

/**
 * 任务性能指标
 */
export interface TaskMetrics {
  /** 执行时长（毫秒） */
  duration: number;
  /** 处理的记录数 */
  recordsProcessed: number;
  /** 内存使用量（字节） */
  memoryUsed: number;
  /** 自定义指标 */
  customMetrics?: Record<string, any>;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings?: string[];
}

/**
 * icasync 服务集合
 */
export interface IcasyncServices {
  // Repository 层
  courseRawRepository: any;
  juheRenwuRepository: any;
  calendarMappingRepository: any;
  calendarParticipantsRepository: any;
  studentCourseRepository: any;
  studentRepository: any;
  teacherRepository: any;
  
  // Service 层
  courseScheduleSyncService: any;
  calendarSyncService: any;
  courseAggregationService: any;
  
  // 外部 API 适配器
  wasV7ApiCalendar: any;
  wasV7ApiSchedule: any;
}

/**
 * 任务处理器接口
 */
export interface IcasyncTaskProcessor {
  /** 处理器名称 */
  readonly name: string;
  /** 任务类型 */
  readonly type: IcasyncTaskType;
  /** 是否支持批处理 */
  readonly supportsBatch: boolean;
  /** 是否支持并行执行 */
  readonly supportsParallel: boolean;
  
  /**
   * 执行任务
   */
  execute(context: TaskExecutionContext): Promise<TaskExecutionResult>;
  
  /**
   * 验证任务配置
   */
  validate(config: TaskConfig): Promise<ValidationResult>;
  
  /**
   * 估算任务进度
   */
  estimateProgress(context: TaskExecutionContext): Promise<number>;
  
  /**
   * 任务清理（可选）
   */
  cleanup?(context: TaskExecutionContext): Promise<void>;
  
  /**
   * 任务暂停（可选）
   */
  pause?(context: TaskExecutionContext): Promise<void>;
  
  /**
   * 任务恢复（可选）
   */
  resume?(context: TaskExecutionContext): Promise<void>;
}

/**
 * 工作流执行结果
 */
export interface WorkflowExecutionResult {
  /** 工作流ID */
  workflowId: string;
  /** 是否成功启动 */
  success: boolean;
  /** 开始时间 */
  startedAt: Date;
  /** 错误信息 */
  error?: string;
}

/**
 * 同步配置
 */
export interface SyncConfig {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 批处理大小 */
  batchSize?: number;
  /** 是否并行执行 */
  parallel?: boolean;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 是否强制执行 */
  force?: boolean;
  /** 自定义配置 */
  [key: string]: any;
}

/**
 * 错误类型枚举
 */
export enum IcasyncErrorType {
  VALIDATION_ERROR = 'validation_error',         // 验证错误
  DATABASE_ERROR = 'database_error',             // 数据库错误
  WPS_API_ERROR = 'wps_api_error',              // WPS API 错误
  NETWORK_ERROR = 'network_error',               // 网络错误
  BUSINESS_LOGIC_ERROR = 'business_logic_error', // 业务逻辑错误
  SYSTEM_ERROR = 'system_error',                 // 系统错误
  TIMEOUT_ERROR = 'timeout_error',               // 超时错误
  RESOURCE_ERROR = 'resource_error'              // 资源错误
}

/**
 * 重试策略
 */
export interface RetryStrategy {
  /** 最大重试次数 */
  maxRetries: number;
  /** 是否可重试 */
  retryable: boolean;
  /** 退避策略 */
  backoff?: 'linear' | 'exponential' | 'fixed';
  /** 基础延迟时间（毫秒） */
  baseDelay?: number;
  /** 最大延迟时间（毫秒） */
  maxDelay?: number;
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',       // 等待中
  RUNNING = 'running',       // 运行中
  COMPLETED = 'completed',   // 已完成
  FAILED = 'failed',         // 失败
  CANCELLED = 'cancelled',   // 已取消
  PAUSED = 'paused',         // 已暂停
  RETRYING = 'retrying'      // 重试中
}

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  PENDING = 'pending',       // 等待中
  RUNNING = 'running',       // 运行中
  COMPLETED = 'completed',   // 已完成
  FAILED = 'failed',         // 失败
  CANCELLED = 'cancelled',   // 已取消
  PAUSED = 'paused'          // 已暂停
}

/**
 * 任务进度信息
 */
export interface TaskProgress {
  /** 任务ID */
  taskId: string;
  /** 任务名称 */
  taskName: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 进度百分比 (0-100) */
  progress: number;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 错误信息 */
  error?: string;
  /** 处理的记录数 */
  recordsProcessed?: number;
  /** 总记录数 */
  totalRecords?: number;
}

/**
 * 工作流进度信息
 */
export interface WorkflowProgress {
  /** 工作流ID */
  workflowId: string;
  /** 工作流名称 */
  workflowName: string;
  /** 当前状态 */
  status: WorkflowStatus;
  /** 总体进度百分比 (0-100) */
  progress: number;
  /** 总任务数 */
  totalTasks: number;
  /** 已完成任务数 */
  completedTasks: number;
  /** 失败任务数 */
  failedTasks: number;
  /** 当前执行的任务 */
  currentTasks: TaskProgress[];
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 错误信息 */
  error?: string;
}

/**
 * 资源监控信息
 */
export interface ResourceMonitor {
  /** 内存使用率 (0-1) */
  memoryUsage: number;
  /** CPU 使用率 (0-1) */
  cpuUsage: number;
  /** 数据库连接数 */
  databaseConnections: number;
  /** API 调用频率（每分钟） */
  apiCallsPerMinute: number;
  /** 活跃任务数 */
  activeTasks: number;
  /** 队列长度 */
  queueLength: number;
}

/**
 * 性能统计信息
 */
export interface PerformanceStats {
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 成功率 (0-1) */
  successRate: number;
  /** 吞吐量（任务/秒） */
  throughput: number;
  /** 错误率 (0-1) */
  errorRate: number;
  /** 重试率 (0-1) */
  retryRate: number;
}

/**
 * 任务处理器注册信息
 */
export interface ProcessorRegistration {
  /** 处理器实例 */
  processor: IcasyncTaskProcessor;
  /** 注册时间 */
  registeredAt: Date;
  /** 是否启用 */
  enabled: boolean;
  /** 配置信息 */
  config?: Record<string, any>;
}
