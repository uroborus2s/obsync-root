/**
 * @stratix/queue 类型定义索引
 */

// 导出队列核心类型
export * from './queue.types.js';

// 导出任务相关类型
export * from './job.types.js';

// 导出事件系统类型
export * from './events.types.js';

// 导出配置类型
export * from './config.types.js';

// 导出监控指标类型
export * from './metrics.types.js';

// ============================================================================
// 主要接口重新导出（便于使用）
// ============================================================================

// 队列相关
export type {
  JobStatus,
  QueueDatabase,
  QueueEventType,
  QueueJobInsert,
  QueueJobSelect,
  QueueJobsTable,
  QueueJobUpdate,
  WaterMarkLevel
} from './queue.types.js';

// 任务相关
export type {
  CreateJobInput,
  CreateJobsBatchInput,
  JobExecutionResult,
  JobExecutor,
  JobPayload,
  JobResult,
  JobStatistics,
  JobSummary,
  QueueJob
} from './job.types.js';

// 事件相关
export type {
  BackpressureActivatedEvent,
  BackpressureAdjustedEvent,
  BackpressureDeactivatedEvent,
  BackpressureState,
  EventListener,
  JobsAddedEvent,
  LengthChangeEvent,
  QueueEventData,
  QueueEventMap,
  QueueEventName,
  StreamStartedEvent,
  WaterMarkChangeEvent,
  WaterMarkLevelEvent
} from './events.types.js';

// 配置相关
export type {
  BackpressureConfig,
  ConfigPreset,
  DebounceConfig,
  JobProcessingConfig,
  MonitoringConfig,
  QueueConfig,
  QueuePluginOptions,
  WaterMarkConfig
} from './config.types.js';

// 指标相关
export type {
  HealthMetrics,
  HealthStatus,
  MetricsCollectorConfig,
  ProcessingPerformanceMetrics,
  QueueOverallMetrics,
  QueueStatusMetrics
} from './metrics.types.js';
