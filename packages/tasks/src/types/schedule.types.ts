/**
 * 定时任务相关类型定义
 *
 * 定义定时任务业务逻辑相关的类型
 * 版本: v3.0.0-enhanced
 */

/**
 * 定时任务配置
 */
export interface ScheduleConfig {
  /** 任务名称 */
  name: string;
  /** 执行器名称 (替代workflowDefinitionId) */
  executorName: string;
  /** 工作流定义ID (保留兼容性，可选) */
  workflowDefinitionId?: number;
  /** Cron表达式 */
  cronExpression: string;
  /** 时区，默认UTC */
  timezone?: string;
  /** 是否启用，默认true */
  enabled?: boolean;
  /** 最大并发实例数，默认1 */
  maxInstances?: number;
  /**
   * @deprecated 执行器配置 - 为向后兼容保留，实际会合并到inputData中
   * 将在v4.0.0版本中移除，请使用inputData
   */
  executorConfig?: any;
  /** 输入数据 */
  inputData?: any;
  /** 上下文数据 */
  contextData?: any;
  /** 业务键 */
  businessKey?: string;
  /** 互斥键 */
  mutexKey?: string;
  /** 创建者 */
  createdBy?: string;
}

/**
 * 定时任务实体
 */
export interface Schedule {
  id: number;
  name: string;
  /** 执行器名称 (新增) */
  executorName: string;
  /** 工作流定义ID (保留兼容性，可选) */
  workflowDefinitionId?: number;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  /**
   * @deprecated 执行器配置 - 为向后兼容保留，实际会合并到inputData中
   * 将在v4.0.0版本中移除，请使用inputData
   */
  executorConfig?: any;
  inputData?: any;
  contextData?: any;
  businessKey?: string;
  mutexKey?: string;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'failed' | 'running';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * 执行历史记录
 */
export interface ScheduleExecution {
  id: number;
  scheduleId: number;
  workflowInstanceId?: number;
  status: 'success' | 'failed' | 'timeout' | 'running';
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  errorMessage?: string;
  triggerTime: Date;
  createdAt: Date;
}

/**
 * 查询参数
 */
export interface ScheduleQueryOptions {
  page?: number;
  pageSize?: number;
  workflowDefinitionId?: number;
  enabled?: boolean;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 执行统计信息
 */
export interface ScheduleExecutionStats {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  timeoutCount: number;
  successRate: number;
  averageDurationMs: number;
  lastExecutionAt?: Date;
  nextExecutionAt?: Date;
}

/**
 * 调度器状态
 */
export interface SchedulerStatus {
  isRunning: boolean;
  runningTasks: number;
  totalSchedules: number;
  enabledSchedules: number;
  uptime?: number;
  lastScanAt?: Date;
  nextScanAt?: Date;
}

/**
 * 定时任务创建数据
 */
export interface NewScheduleData {
  name: string;
  /** 执行器名称 */
  executor_name: string;
  /** 工作流定义ID (保留兼容性，可选) */
  workflow_definition_id?: number;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  input_data?: any;
  context_data?: any;
  business_key?: string;
  mutex_key?: string;
  next_run_at?: Date;
  created_by?: string;
}

/**
 * 定时任务更新数据
 */
export interface ScheduleUpdateData {
  name?: string;
  executor_name?: string;
  cron_expression?: string;
  timezone?: string;
  enabled?: boolean;
  input_data?: any;
  context_data?: any;
  business_key?: string;
  mutex_key?: string;
}

/**
 * 执行记录创建数据
 */
export interface NewScheduleExecutionData {
  schedule_id: number;
  workflow_instance_id?: number;
  status: 'success' | 'failed' | 'timeout' | 'running';
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  error_message?: string;
  trigger_time: Date;
}

/**
 * 执行记录更新数据
 */
export interface ScheduleExecutionUpdateData {
  workflow_instance_id?: number;
  status?: 'success' | 'failed' | 'timeout' | 'running';
  completed_at?: Date;
  duration_ms?: number;
  error_message?: string;
}

/**
 * Cron表达式验证结果
 */
export interface CronValidationResult {
  isValid: boolean;
  error?: string;
  nextExecutions?: Date[];
}

/**
 * 定时任务触发上下文
 */
export interface ScheduleTriggerContext {
  scheduleId: number;
  scheduleName: string;
  executionId: string;
  triggerTime: Date;
  expectedRunTime: Date;
  delay?: number; // 延迟执行时间（毫秒）
}
