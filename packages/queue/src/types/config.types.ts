/**
 * @stratix/queue 配置类型定义
 */

import type { WaterMarkLevel } from './queue.types.js';

// ============================================================================
// 水位配置类型
// ============================================================================

/**
 * 水位标记配置
 */
export interface WaterMarkConfig {
  /** 低水位阈值 */
  low: number;
  /** 正常水位阈值 */
  normal: number;
  /** 高水位阈值 */
  high: number;
  /** 临界水位阈值 */
  critical: number;
}

/**
 * 水位监控配置
 */
export interface WaterMarkMonitorConfig {
  /** 水位标记配置 */
  waterMarks: WaterMarkConfig;
  /** 是否启用水位监控 */
  enabled: boolean;
  /** 监控间隔（毫秒） */
  monitorInterval?: number;
}

// ============================================================================
// 背压配置类型
// ============================================================================

/**
 * 背压管理配置
 */
export interface BackpressureConfig {
  /** 启动数据流延迟（毫秒） */
  startStreamDelay: number;
  /** 停止数据流延迟（毫秒） */
  stopStreamDelay: number;
  /** 最小流运行时间（毫秒） */
  minStreamDuration: number;
  /** 冷却期（毫秒） */
  cooldownPeriod: number;
  /** 是否启用背压 */
  enabled: boolean;
  /** 强制背压的水位级别 */
  forceBackpressureLevel?: WaterMarkLevel;
  /** 激活延迟（毫秒） */
  activationDelay: number;
  /** 停用延迟（毫秒） */
  deactivationDelay: number;
  /** 调整间隔（毫秒） */
  adjustmentInterval: number;
  /** 高水位速度倍数 */
  highMultiplier: number;
  /** 临界水位速度倍数 */
  criticalMultiplier: number;
}

// ============================================================================
// 防抖配置类型
// ============================================================================

/**
 * 防抖配置
 */
export interface DebounceConfig {
  /** 长度变化防抖延迟（毫秒） */
  lengthChange: number;
  /** 任务添加防抖延迟（毫秒） */
  jobAddition: number;
  /** 水位变化防抖延迟（毫秒） */
  watermarkChange: number;
  /** 事件发射防抖延迟（毫秒） */
  eventEmission: number;
}

// ============================================================================
// 数据库流配置类型
// ============================================================================

/**
 * 数据库流配置
 */
export interface DatabaseStreamConfig {
  /** 批量加载大小 */
  batchSize: number;
  /** 流读取超时（毫秒） */
  readTimeout: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 是否启用流压缩 */
  enableCompression?: boolean;
  /** 预取缓冲区大小 */
  prefetchBufferSize?: number;
}

// ============================================================================
// 任务处理配置类型
// ============================================================================

/**
 * 任务处理配置
 */
export interface JobProcessingConfig {
  /** 并发处理数量 - 控制同时执行的任务数量 */
  concurrency: number;
  /** 任务超时时间（毫秒） */
  timeout: number;
  /** 默认最大重试次数 */
  defaultMaxAttempts: number;
  /** 重试延迟配置 */
  retryDelay: {
    /** 基础延迟（毫秒） */
    base: number;
    /** 延迟倍数 */
    multiplier: number;
    /** 最大延迟（毫秒） */
    max: number;
  };
  /** 是否启用任务优先级 */
  enablePriority: boolean;
  /** 处理间隔（毫秒） */
  processingInterval: number;
  /** 并发执行模式配置 */
  parallel: {
    /** 是否启用并行处理（默认为true） */
    enabled: boolean;
    /** 最大并发数限制（0表示无限制，但受内存限制） */
    maxConcurrency: number;
    /** 任务分批处理大小（批量获取任务数量） */
    batchSize: number;
    /** 并发任务间隔时间（毫秒，防止过快启动） */
    taskInterval: number;
    /** 动态并发调整（基于系统负载自动调整并发数） */
    dynamicAdjustment: {
      /** 是否启用动态调整 */
      enabled: boolean;
      /** 最小并发数 */
      minConcurrency: number;
      /** CPU使用率阈值（超过此值降低并发） */
      cpuThreshold: number;
      /** 内存使用率阈值（超过此值降低并发） */
      memoryThreshold: number;
      /** 调整检查间隔（毫秒） */
      checkInterval: number;
    };
  };
}

// ============================================================================
// 监控配置类型
// ============================================================================

/**
 * 监控配置
 */
export interface MonitoringConfig {
  /** 是否启用监控 */
  enabled: boolean;
  /** 指标收集间隔（毫秒） */
  metricsInterval: number;
  /** 健康检查间隔（毫秒） */
  healthCheckInterval: number;
  /** 性能统计窗口大小 */
  performanceWindowSize: number;
  /** 是否启用详细日志 */
  enableDetailedLogging: boolean;
  /** 指标保留时间（毫秒） */
  metricsRetentionTime: number;
}

// ============================================================================
// 分组管理配置类型
// ============================================================================

/**
 * 分组管理配置
 */
export interface GroupManagementConfig {
  /** 是否启用分组功能 */
  enabled: boolean;
  /** 分组状态同步间隔（毫秒） */
  statusSyncInterval: number;
  /** 分组统计更新间隔（毫秒） */
  statisticsUpdateInterval: number;
  /** 是否自动创建分组 */
  autoCreateGroups: boolean;
  /** 分组清理配置 */
  cleanup: {
    /** 是否启用自动清理 */
    enabled: boolean;
    /** 清理间隔（毫秒） */
    interval: number;
    /** 空分组保留时间（毫秒） */
    emptyGroupRetentionTime: number;
  };
}

// ============================================================================
// 持久化配置类型
// ============================================================================

/**
 * 持久化配置
 */
export interface PersistenceConfig {
  /** 是否启用持久化 */
  enabled: boolean;
  /** 批量写入大小 */
  batchWriteSize: number;
  /** 写入间隔（毫秒） */
  writeInterval: number;
  /** 事务超时时间（毫秒） */
  transactionTimeout: number;
  /** 连接池配置 */
  connectionPool: {
    /** 最小连接数 */
    min: number;
    /** 最大连接数 */
    max: number;
    /** 连接超时（毫秒） */
    timeout: number;
  };
  /** 数据清理配置 */
  cleanup: {
    /** 是否启用自动清理 */
    enabled: boolean;
    /** 清理间隔（毫秒） */
    interval: number;
    /** 成功任务保留时间（毫秒） */
    successRetentionTime: number;
    /** 失败任务保留时间（毫秒） */
    failureRetentionTime: number;
  };
}

// ============================================================================
// 队列配置类型
// ============================================================================

/**
 * 单个队列配置
 */
export interface QueueConfig {
  /** 队列名称 */
  name: string;
  /** 是否启用队列 */
  enabled: boolean;
  /** 水位监控配置 */
  watermark: WaterMarkMonitorConfig;
  /** 背压管理配置 */
  backpressure: BackpressureConfig;
  /** 防抖配置 */
  debounce: DebounceConfig;
  /** 数据库流配置 */
  databaseStream: DatabaseStreamConfig;
  /** 任务处理配置 */
  jobProcessing: JobProcessingConfig;
  /** 监控配置 */
  monitoring: MonitoringConfig;
  /** 分组管理配置 */
  groupManagement: GroupManagementConfig;
  /** 持久化配置 */
  persistence: PersistenceConfig;
}

// ============================================================================
// 插件配置类型
// ============================================================================

/**
 * 队列插件配置选项
 */
export interface QueuePluginOptions {
  /** 默认队列配置 */
  defaultQueue?: Partial<QueueConfig>;
  /** 多个队列配置 */
  queues?: Record<string, Partial<QueueConfig>>;
  /** 队列监控器配置 */
  queueMonitorOptions?: QueueMonitorOptions;
  /** 全局配置 */
  global?: GlobalQueueConfig;
}

/**
 * 队列监控器配置选项
 */
export interface QueueMonitorOptions {
  /** 是否启用监控器 */
  enabled?: boolean;
  /** 监控间隔（毫秒） */
  interval?: number;
  /** 监控器名称 */
  name?: string;
  /** 实例ID */
  instanceId?: string;
  /** 监控指标配置 */
  metrics?: {
    /** 是否收集性能指标 */
    performance?: boolean;
    /** 是否收集吞吐量指标 */
    throughput?: boolean;
    /** 是否收集错误率指标 */
    errorRate?: boolean;
    /** 是否收集水位指标 */
    watermark?: boolean;
  };
}

/**
 * 全局队列配置
 */
export interface GlobalQueueConfig {
  /** 实例ID */
  instanceId?: string;
  /** 是否启用集群模式 */
  clusterMode?: boolean;
  /** 集群配置 */
  cluster?: {
    /** 节点ID */
    nodeId?: string;
    /** 心跳间隔（毫秒） */
    heartbeatInterval?: number;
    /** 节点超时时间（毫秒） */
    nodeTimeout?: number;
  };
  /** 日志配置 */
  logging?: {
    /** 日志级别 */
    level?: 'debug' | 'info' | 'warn' | 'error';
    /** 是否启用结构化日志 */
    structured?: boolean;
    /** 日志前缀 */
    prefix?: string;
  };
  /** 错误处理配置 */
  errorHandling?: {
    /** 是否启用全局错误处理 */
    enabled?: boolean;
    /** 错误重试配置 */
    retry?: {
      /** 最大重试次数 */
      maxAttempts?: number;
      /** 重试延迟（毫秒） */
      delay?: number;
    };
  };
}

// ============================================================================
// 预设配置类型
// ============================================================================

/**
 * 配置预设类型
 */
export type ConfigPreset =
  | 'high_throughput'
  | 'normal_load'
  | 'low_latency'
  | 'memory_optimized'
  | 'custom';

/**
 * 预设配置映射
 */
export interface ConfigPresets {
  high_throughput: Partial<QueueConfig>;
  normal_load: Partial<QueueConfig>;
  low_latency: Partial<QueueConfig>;
  memory_optimized: Partial<QueueConfig>;
}

// ============================================================================
// 配置验证类型
// ============================================================================

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
  /** 建议信息列表 */
  suggestions: string[];
}

/**
 * 配置验证选项
 */
export interface ConfigValidationOptions {
  /** 是否严格验证 */
  strict?: boolean;
  /** 是否检查性能建议 */
  checkPerformance?: boolean;
  /** 是否检查兼容性 */
  checkCompatibility?: boolean;
}

// ============================================================================
// 运行时配置类型
// ============================================================================

/**
 * 运行时配置状态
 */
export interface RuntimeConfigState {
  /** 当前配置 */
  current: QueueConfig;
  /** 默认配置 */
  default: QueueConfig;
  /** 配置更新时间 */
  lastUpdated: Date;
  /** 配置版本 */
  version: string;
  /** 是否已初始化 */
  initialized: boolean;
}

/**
 * 配置更新选项
 */
export interface ConfigUpdateOptions {
  /** 是否立即应用 */
  immediate?: boolean;
  /** 是否验证配置 */
  validate?: boolean;
  /** 更新原因 */
  reason?: string;
  /** 是否备份当前配置 */
  backup?: boolean;
}
