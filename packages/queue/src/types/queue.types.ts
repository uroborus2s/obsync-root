/**
 * @stratix/queue 队列核心类型定义
 */

import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable
} from '@stratix/database';

// ============================================================================
// 基础枚举类型
// ============================================================================

/**
 * 任务状态枚举
 */
export type JobStatus =
  | 'waiting'
  | 'executing'
  | 'delayed'
  | 'paused'
  | 'failed';

/**
 * 队列分组状态枚举
 */
export type GroupStatus = 'active' | 'paused';

/**
 * 水位级别枚举
 */
export type WaterMarkLevel = 'empty' | 'low' | 'normal' | 'high' | 'critical';

/**
 * 事件类型枚举
 */
export type QueueEventType =
  | 'job_added'
  | 'job_completed'
  | 'job_failed'
  | 'job_started'
  | 'group_paused'
  | 'group_resumed'
  | 'queue_paused'
  | 'queue_resumed';

// ============================================================================
// 数据库表类型定义
// ============================================================================

/**
 * 队列任务表结构
 */
export interface QueueJobsTable {
  id: string;
  queue_name: string;
  group_id: string | null;
  job_name: string;
  executor_name: string;
  payload: ColumnType<unknown, string, string>; // 数据库存储为JSON字符串，应用层为对象
  result: ColumnType<unknown | null, string | null, string | null>;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  delay_until: ColumnType<
    Date | null,
    Date | string | null,
    Date | string | null
  >;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, never, Date | string>;
  started_at: ColumnType<Date | null, never, Date | string | null>;
  metadata: ColumnType<unknown | null, string | null, string | null>;
  locked_at: ColumnType<Date | null, never, Date | string | null>;
  locked_by: string | null;
  locked_until: ColumnType<Date | null, never, Date | string | null>;
  error_message: string | null;
  error_stack: string | null;
  error_code: string | null;
  failed_at: ColumnType<Date | null, never, Date | string | null>;
}

/**
 * 队列成功任务表结构
 */
export interface QueueSuccessTable {
  id: string;
  queue_name: string;
  group_id: string | null;
  job_name: string;
  executor_name: string;
  payload: ColumnType<unknown, string, string>;
  result: ColumnType<unknown | null, string | null, string | null>;
  attempts: number;
  execution_time: number | null;
  created_at: Date;
  started_at: Date;
  completed_at: ColumnType<Date, never, never>;
}

/**
 * 队列失败任务表结构
 */
export interface QueueFailuresTable {
  id: string;
  queue_name: string;
  group_id: string | null;
  job_name: string;
  executor_name: string;
  payload: ColumnType<unknown, string, string>;
  error_message: string | null;
  error_stack: string | null;
  error_code: string | null;
  attempts: number;
  created_at: Date;
  started_at: Date | null;
  failed_at: ColumnType<Date, never, never>;
  metadata: ColumnType<unknown | null, string | null, string | null>;
}

/**
 * 队列分组表结构
 */
export interface QueueGroupsTable {
  id: string;
  queue_name: string;
  group_id: string;
  status: GroupStatus;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, never, Date | string>;
  metadata: ColumnType<unknown | null, string | null, string | null>;
}

/**
 * 队列指标表结构
 */
export interface QueueMetricsTable {
  id: Generated<number>;
  queue_name: string;
  instance_id: string;
  memory_queue_length: number;
  watermark_level: WaterMarkLevel;
  is_backpressure_active: boolean;
  has_active_stream: boolean;
  is_processing: boolean;
  total_processed: number;
  total_failed: number;
  average_processing_time: number | null;
  backpressure_activations: number;
  total_backpressure_time: number;
  stream_start_count: number;
  stream_pause_count: number;
  average_stream_duration: number | null;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, never, Date | string>;
}

// ============================================================================
// 数据库类型组合
// ============================================================================

/**
 * 队列数据库表集合
 */
export interface QueueDatabase {
  queue_jobs: QueueJobsTable;
  queue_success: QueueSuccessTable;
  queue_failures: QueueFailuresTable;
  queue_groups: QueueGroupsTable;
  queue_metrics: QueueMetricsTable;
}

// ============================================================================
// 操作类型定义
// ============================================================================

/**
 * 队列任务插入类型
 */
export type QueueJobInsert = Insertable<QueueJobsTable>;

/**
 * 队列任务更新类型
 */
export type QueueJobUpdate = Updateable<QueueJobsTable>;

/**
 * 队列任务选择类型
 */
export type QueueJobSelect = Selectable<QueueJobsTable>;

/**
 * 队列分组插入类型
 */
export type QueueGroupInsert = Insertable<QueueGroupsTable>;

/**
 * 队列分组更新类型
 */
export type QueueGroupUpdate = Updateable<QueueGroupsTable>;

/**
 * 队列分组选择类型
 */
export type QueueGroupSelect = Selectable<QueueGroupsTable>;

/**
 * 队列指标插入类型
 */
export type QueueMetricsInsert = Insertable<QueueMetricsTable>;

/**
 * 队列指标更新类型
 */
export type QueueMetricsUpdate = Updateable<QueueMetricsTable>;

/**
 * 队列指标选择类型
 */
export type QueueMetricsSelect = Selectable<QueueMetricsTable>;
