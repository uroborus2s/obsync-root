/**
 * @stratix/queue 主入口文件
 * 导出所有队列相关功能
 */

// 插件
export { wrapQueuePlugin as default } from './plugin.js';

// 零配置队列服务
export {
  type BatchJobInput,
  type GroupServiceOptions,
  type GroupStatus,
  type QueueService,
  type ServiceStats,
  type SimpleJobInput,
  type TaskStatus
} from './services/group-service.js';

// 核心管理器
export { QueueManager } from './managers/queue-manager.js';

// 仓储层
export {
  QueueGroupRepository,
  QueueJobRepository
} from './repositories/index.js';

// 服务层
export {
  GroupManagementService,
  JobExecutionService
} from './services/index.js';

// 监控
export { QueueMonitor } from './monitoring/queue-monitor.js';

// 核心组件
export { SmartBackpressureManager } from './core/backpressure-manager.js';
export { EventDrivenMemoryQueue } from './core/memory-queue.js';
export { JobNotificationSystem } from './notifications/job-notification-system.js';
export { DatabaseJobStream } from './streams/database-job-stream.js';

// 类型定义
export type {
  BackpressureActivatedEvent,
  BackpressureConfig,
  BackpressureDeactivatedEvent,
  CreateJobInput,
  CreateJobsBatchInput,
  DatabaseStreamConfig,
  DebounceConfig,
  ExecutorConfig,
  GroupManagementConfig,
  GroupPausedEvent,
  GroupResumedEvent,
  // 监控类型
  HealthStatus,
  JobCompletedEvent,
  JobExecutor,
  JobFailedEvent,
  // 任务相关类型
  JobPayload,
  JobProcessingConfig,
  JobResult,
  JobsAddedEvent,
  JobStatus,
  MonitoringConfig,
  PersistenceConfig,
  // 队列核心类型
  QueueConfig,
  QueueDatabase,
  // 事件类型
  QueueEventMap,
  QueueFailuresTable,
  QueueGroupsTable,
  GroupStatus as QueueGroupStatus,
  QueueJob,
  QueueJobsTable,
  QueueMetricsTable,
  QueuePluginOptions,
  QueueSuccessTable,
  StreamStartedEvent,
  WaterMarkChangeEvent,
  // 配置类型
  WaterMarkConfig,
  WaterMarkLevel
} from './types/index.js';

// ============================================================================
// 模型
// ============================================================================

export { QueueJobModel } from './models/queue-job.model.js';

// ============================================================================
// 配置
// ============================================================================

export {
  DEFAULT_QUEUE_CONFIG,
  getPresetConfig,
  HIGH_THROUGHPUT_CONFIG,
  LOW_LATENCY_CONFIG,
  MEMORY_OPTIMIZED_CONFIG,
  mergeConfig
} from './config/default-config.js';
