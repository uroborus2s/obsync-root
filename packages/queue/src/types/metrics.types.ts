/**
 * @stratix/queue 监控指标类型定义
 */

import type { JobStatus, WaterMarkLevel } from './queue.types.js';

// ============================================================================
// 基础指标类型
// ============================================================================

/**
 * 基础指标接口
 */
export interface BaseMetric {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number | string | boolean;
  /** 指标单位 */
  unit?: string;
  /** 指标标签 */
  labels?: Record<string, string>;
  /** 指标时间戳 */
  timestamp: Date;
}

/**
 * 时间序列指标
 */
export interface TimeSeriesMetric extends BaseMetric {
  /** 时间序列数据点 */
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
  /** 聚合类型 */
  aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

/**
 * 计数器指标
 */
export interface CounterMetric extends BaseMetric {
  /** 计数值 */
  value: number;
  /** 增量 */
  delta?: number;
}

/**
 * 直方图指标
 */
export interface HistogramMetric extends BaseMetric {
  /** 桶配置 */
  buckets: number[];
  /** 桶计数 */
  bucketCounts: number[];
  /** 总计数 */
  totalCount: number;
  /** 总和 */
  sum: number;
}

// ============================================================================
// 队列状态指标
// ============================================================================

/**
 * 队列状态指标
 */
export interface QueueStatusMetrics {
  /** 队列名称 */
  queueName: string;
  /** 实例ID */
  instanceId: string;
  /** 内存队列长度 */
  memoryQueueLength: number;
  /** 当前水位级别 */
  watermarkLevel: WaterMarkLevel;
  /** 是否激活背压 */
  isBackpressureActive: boolean;
  /** 是否有活跃数据流 */
  hasActiveStream: boolean;
  /** 是否正在处理 */
  isProcessing: boolean;
  /** 指标收集时间 */
  timestamp: Date;
}

/**
 * 队列任务统计指标
 */
export interface QueueJobMetrics {
  /** 队列名称 */
  queueName: string;
  /** 按状态分组的任务数量 */
  jobsByStatus: Record<JobStatus, number>;
  /** 总任务数 */
  totalJobs: number;
  /** 待处理任务数 */
  pendingJobs: number;
  /** 延迟任务数 */
  delayedJobs: number;
  /** 按优先级分组的任务数量 */
  jobsByPriority: Record<number, number>;
  /** 按执行器分组的任务数量 */
  jobsByExecutor: Record<string, number>;
  /** 指标收集时间 */
  timestamp: Date;
}

/**
 * 分组状态指标
 */
export interface GroupStatusMetrics {
  /** 队列名称 */
  queueName: string;
  /** 分组ID */
  groupId: string;
  /** 分组状态 */
  status: 'active' | 'paused';
  /** 总任务数 */
  totalJobs: number;
  /** 已完成任务数 */
  completedJobs: number;
  /** 失败任务数 */
  failedJobs: number;
  /** 等待中任务数 */
  waitingJobs: number;
  /** 执行中任务数 */
  executingJobs: number;
  /** 指标收集时间 */
  timestamp: Date;
}

// ============================================================================
// 性能指标
// ============================================================================

/**
 * 处理性能指标
 */
export interface ProcessingPerformanceMetrics {
  /** 队列名称 */
  queueName: string;
  /** 总处理任务数 */
  totalProcessed: number;
  /** 总失败任务数 */
  totalFailed: number;
  /** 成功率 */
  successRate: number;
  /** 平均处理时间（毫秒） */
  averageProcessingTime: number;
  /** 处理时间分位数 */
  processingTimePercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  /** 吞吐量（任务/秒） */
  throughput: number;
  /** 指标收集时间 */
  timestamp: Date;
}

/**
 * 背压性能指标
 */
export interface BackpressurePerformanceMetrics {
  /** 队列名称 */
  queueName: string;
  /** 背压激活次数 */
  backpressureActivations: number;
  /** 总背压时间（毫秒） */
  totalBackpressureTime: number;
  /** 平均背压持续时间（毫秒） */
  averageBackpressureDuration: number;
  /** 背压激活率 */
  backpressureActivationRate: number;
  /** 最后一次背压时间 */
  lastBackpressureAt?: Date;
  /** 指标收集时间 */
  timestamp: Date;
}

/**
 * 数据流性能指标
 */
export interface StreamPerformanceMetrics {
  /** 队列名称 */
  queueName: string;
  /** 流启动次数 */
  streamStartCount: number;
  /** 流暂停次数 */
  streamPauseCount: number;
  /** 平均流持续时间（毫秒） */
  averageStreamDuration: number;
  /** 流效率（加载任务数/流持续时间） */
  streamEfficiency: number;
  /** 总加载任务数 */
  totalLoadedJobs: number;
  /** 平均批次大小 */
  averageBatchSize: number;
  /** 指标收集时间 */
  timestamp: Date;
}

// ============================================================================
// 系统资源指标
// ============================================================================

/**
 * 内存使用指标
 */
export interface MemoryUsageMetrics {
  /** 队列名称 */
  queueName: string;
  /** 堆内存使用量（字节） */
  heapUsed: number;
  /** 堆内存总量（字节） */
  heapTotal: number;
  /** 外部内存使用量（字节） */
  external: number;
  /** 内存使用率 */
  memoryUsagePercentage: number;
  /** 垃圾回收统计 */
  gcStats: {
    /** GC次数 */
    count: number;
    /** GC总时间（毫秒） */
    totalTime: number;
    /** 平均GC时间（毫秒） */
    averageTime: number;
  };
  /** 指标收集时间 */
  timestamp: Date;
}

/**
 * CPU使用指标
 */
export interface CpuUsageMetrics {
  /** 队列名称 */
  queueName: string;
  /** CPU使用率 */
  cpuUsagePercentage: number;
  /** 用户态CPU时间 */
  userCpuTime: number;
  /** 系统态CPU时间 */
  systemCpuTime: number;
  /** 事件循环延迟（毫秒） */
  eventLoopDelay: number;
  /** 活跃句柄数 */
  activeHandles: number;
  /** 活跃请求数 */
  activeRequests: number;
  /** 指标收集时间 */
  timestamp: Date;
}

// ============================================================================
// 错误和异常指标
// ============================================================================

/**
 * 错误统计指标
 */
export interface ErrorMetrics {
  /** 队列名称 */
  queueName: string;
  /** 总错误数 */
  totalErrors: number;
  /** 错误率 */
  errorRate: number;
  /** 按错误类型分组的错误数 */
  errorsByType: Record<string, number>;
  /** 按执行器分组的错误数 */
  errorsByExecutor: Record<string, number>;
  /** 最近错误列表 */
  recentErrors: Array<{
    timestamp: Date;
    type: string;
    message: string;
    executorName?: string;
    jobId?: string;
  }>;
  /** 指标收集时间 */
  timestamp: Date;
}

/**
 * 重试统计指标
 */
export interface RetryMetrics {
  /** 队列名称 */
  queueName: string;
  /** 总重试次数 */
  totalRetries: number;
  /** 重试成功次数 */
  successfulRetries: number;
  /** 重试失败次数 */
  failedRetries: number;
  /** 重试成功率 */
  retrySuccessRate: number;
  /** 平均重试次数 */
  averageRetryCount: number;
  /** 按重试次数分组的任务数 */
  jobsByRetryCount: Record<number, number>;
  /** 指标收集时间 */
  timestamp: Date;
}

// ============================================================================
// 健康检查指标
// ============================================================================

/**
 * 健康状态
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * 健康检查指标
 */
export interface HealthMetrics {
  /** 队列名称 */
  queueName: string;
  /** 整体健康状态 */
  overallStatus: HealthStatus;
  /** 各组件健康状态 */
  componentStatus: {
    memoryQueue: HealthStatus;
    databaseStream: HealthStatus;
    backpressureManager: HealthStatus;
    jobProcessor: HealthStatus;
    monitoring: HealthStatus;
  };
  /** 健康评分（0-100） */
  healthScore: number;
  /** 健康检查详情 */
  details: {
    /** 内存使用是否正常 */
    memoryUsageOk: boolean;
    /** 队列长度是否正常 */
    queueLengthOk: boolean;
    /** 处理速度是否正常 */
    processingRateOk: boolean;
    /** 错误率是否正常 */
    errorRateOk: boolean;
    /** 数据库连接是否正常 */
    databaseConnectionOk: boolean;
  };
  /** 警告信息 */
  warnings: string[];
  /** 错误信息 */
  errors: string[];
  /** 指标收集时间 */
  timestamp: Date;
}

// ============================================================================
// 聚合指标
// ============================================================================

/**
 * 队列综合指标
 */
export interface QueueOverallMetrics {
  /** 队列名称 */
  queueName: string;
  /** 实例ID */
  instanceId: string;
  /** 队列状态指标 */
  status: QueueStatusMetrics;
  /** 任务统计指标 */
  jobs: QueueJobMetrics;
  /** 性能指标 */
  performance: ProcessingPerformanceMetrics;
  /** 背压指标 */
  backpressure: BackpressurePerformanceMetrics;
  /** 数据流指标 */
  stream: StreamPerformanceMetrics;
  /** 内存使用指标 */
  memory: MemoryUsageMetrics;
  /** CPU使用指标 */
  cpu: CpuUsageMetrics;
  /** 错误指标 */
  errors: ErrorMetrics;
  /** 重试指标 */
  retries: RetryMetrics;
  /** 健康指标 */
  health: HealthMetrics;
  /** 指标收集时间 */
  timestamp: Date;
}

/**
 * 多队列聚合指标
 */
export interface MultiQueueMetrics {
  /** 实例ID */
  instanceId: string;
  /** 各队列指标 */
  queues: Record<string, QueueOverallMetrics>;
  /** 全局统计 */
  global: {
    /** 总队列数 */
    totalQueues: number;
    /** 活跃队列数 */
    activeQueues: number;
    /** 总任务数 */
    totalJobs: number;
    /** 总处理任务数 */
    totalProcessed: number;
    /** 总失败任务数 */
    totalFailed: number;
    /** 全局成功率 */
    globalSuccessRate: number;
    /** 全局吞吐量 */
    globalThroughput: number;
  };
  /** 指标收集时间 */
  timestamp: Date;
}

// ============================================================================
// 指标收集配置
// ============================================================================

/**
 * 指标收集器配置
 */
export interface MetricsCollectorConfig {
  /** 是否启用指标收集 */
  enabled: boolean;
  /** 收集间隔（毫秒） */
  interval: number;
  /** 指标保留时间（毫秒） */
  retentionTime: number;
  /** 启用的指标类型 */
  enabledMetrics: {
    status: boolean;
    performance: boolean;
    memory: boolean;
    cpu: boolean;
    errors: boolean;
    health: boolean;
  };
  /** 指标导出配置 */
  export?: {
    /** 导出格式 */
    format: 'json' | 'prometheus' | 'influxdb';
    /** 导出端点 */
    endpoint?: string;
    /** 导出间隔（毫秒） */
    interval?: number;
  };
}

// ============================================================================
// 指标查询类型
// ============================================================================

/**
 * 指标查询选项
 */
export interface MetricsQueryOptions {
  /** 队列名称过滤 */
  queueName?: string;
  /** 时间范围 */
  timeRange?: {
    from: Date;
    to: Date;
  };
  /** 指标类型过滤 */
  metricTypes?: string[];
  /** 聚合方式 */
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  /** 分组字段 */
  groupBy?: string[];
  /** 分页选项 */
  pagination?: {
    offset: number;
    limit: number;
  };
}

/**
 * 指标查询结果
 */
export interface MetricsQueryResult {
  /** 查询到的指标数据 */
  metrics: BaseMetric[];
  /** 总数量 */
  total: number;
  /** 查询时间 */
  queryTime: Date;
  /** 查询耗时（毫秒） */
  duration: number;
}
