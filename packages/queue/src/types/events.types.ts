/**
 * @stratix/queue 事件系统类型定义
 */

import type { JobExecutionResult, JobSummary } from './job.types.js';
import type { WaterMarkLevel } from './queue.types.js';

// ============================================================================
// 基础事件类型
// ============================================================================

/**
 * 基础事件接口
 */
export interface BaseEvent {
  /** 事件时间戳 */
  timestamp: Date;
  /** 事件ID */
  eventId: string;
  /** 队列名称 */
  queueName?: string;
}

/**
 * 事件监听器函数类型
 */
export type EventListener<T = any> = (event: T) => void | Promise<void>;

/**
 * 事件监听器选项
 */
export interface EventListenerOptions {
  /** 是否只监听一次 */
  once?: boolean;
  /** 监听器优先级 */
  priority?: number;
}

// ============================================================================
// 水位相关事件
// ============================================================================

/**
 * 水位变化事件数据
 */
export interface WaterMarkChangeEvent extends BaseEvent {
  /** 变化前的水位级别 */
  from: WaterMarkLevel;
  /** 变化后的水位级别 */
  to: WaterMarkLevel;
  /** 当前队列长度 */
  length: number;
}

/**
 * 队列长度变化事件数据
 */
export interface LengthChangeEvent extends BaseEvent {
  /** 当前队列长度 */
  length: number;
  /** 当前水位级别 */
  level: WaterMarkLevel;
  /** 长度变化量 */
  delta?: number;
}

/**
 * 特定水位级别事件数据
 */
export interface WaterMarkLevelEvent extends BaseEvent {
  /** 当前队列长度 */
  length: number;
  /** 水位级别 */
  level: WaterMarkLevel;
}

// ============================================================================
// 背压相关事件
// ============================================================================

/**
 * 背压激活事件数据
 */
export interface BackpressureActivatedEvent extends BaseEvent {
  /** 当前水位级别 */
  level: WaterMarkLevel;
  /** 当前队列长度 */
  queueLength: number;
  /** 速度倍数 */
  multiplier: number;
  /** 激活原因 */
  reason: string;
}

/**
 * 背压解除事件数据
 */
export interface BackpressureDeactivatedEvent extends BaseEvent {
  /** 当前水位级别 */
  level: WaterMarkLevel;
  /** 当前队列长度 */
  queueLength: number;
  /** 之前的速度倍数 */
  previousMultiplier: number;
  /** 解除原因 */
  reason: string;
}

/**
 * 背压调整事件数据
 */
export interface BackpressureAdjustedEvent extends BaseEvent {
  /** 当前水位级别 */
  level: WaterMarkLevel;
  /** 当前队列长度 */
  queueLength: number;
  /** 之前的速度倍数 */
  previousMultiplier: number;
  /** 新的速度倍数 */
  newMultiplier: number;
  /** 调整量 */
  adjustment: number;
}

/**
 * 背压状态变化事件数据
 */
export interface BackpressureStatusEvent extends BaseEvent {
  /** 是否激活背压 */
  isActive: boolean;
  /** 当前队列长度 */
  queueLength: number;
  /** 背压激活次数 */
  activationCount: number;
  /** 总背压时间 */
  totalBackpressureTime: number;
}

/**
 * 背压状态接口
 */
export interface BackpressureState {
  /** 是否激活 */
  isActive: boolean;
  /** 当前水位级别 */
  currentLevel: WaterMarkLevel;
  /** 当前速度倍数 */
  multiplier: number;
  /** 背压配置 */
  config: any; // 临时使用any，避免循环依赖
}

// ============================================================================
// 数据流相关事件
// ============================================================================

/**
 * 数据流启动事件数据
 */
export interface StreamStartedEvent extends BaseEvent {
  /** 流ID */
  streamId: string;
  /** 启动原因 */
  reason: 'empty_queue' | 'low_watermark' | 'job_added' | 'manual';
  /** 预期加载的任务数量 */
  expectedJobCount?: number;
}

/**
 * 数据流暂停事件数据
 */
export interface StreamPausedEvent extends BaseEvent {
  /** 流ID */
  streamId: string;
  /** 暂停原因 */
  reason: 'backpressure' | 'high_watermark' | 'manual' | 'error';
  /** 流运行时长（毫秒） */
  duration: number;
  /** 已加载的任务数量 */
  loadedJobCount: number;
}

/**
 * 数据流结束事件数据
 */
export interface StreamEndedEvent extends BaseEvent {
  /** 流ID */
  streamId: string;
  /** 结束原因 */
  reason: 'no_more_jobs' | 'error' | 'manual';
  /** 流运行时长（毫秒） */
  duration: number;
  /** 总加载的任务数量 */
  totalLoadedJobs: number;
}

/**
 * 数据流错误事件数据
 */
export interface StreamErrorEvent extends BaseEvent {
  /** 流ID */
  streamId: string;
  /** 错误信息 */
  error: Error;
  /** 错误发生时的状态 */
  streamState: {
    isActive: boolean;
    loadedJobCount: number;
    duration: number;
  };
}

// ============================================================================
// 任务相关事件
// ============================================================================

/**
 * 任务添加事件数据
 */
export interface JobsAddedEvent extends BaseEvent {
  /** 添加的任务ID列表 */
  jobIds: string[];
  /** 任务数量 */
  count: number;
  /** 分组ID（如果有） */
  groupId?: string;
}

/**
 * 批量任务添加事件数据
 */
export interface JobsAddedBatchEvent extends BaseEvent {
  /** 添加的任务ID列表 */
  jobIds: string[];
  /** 任务数量 */
  count: number;
  /** 分组ID（如果有） */
  groupId?: string;
  /** 批次ID */
  batchId: string;
}

/**
 * 任务开始执行事件数据
 */
export interface JobStartedEvent extends BaseEvent {
  /** 任务摘要信息 */
  job: JobSummary;
  /** 执行器名称 */
  executorName: string;
  /** 开始时间 */
  startedAt: Date;
}

/**
 * 任务完成事件数据
 */
export interface JobCompletedEvent extends BaseEvent {
  /** 任务摘要信息 */
  job: JobSummary;
  /** 执行结果 */
  result: JobExecutionResult;
  /** 完成时间 */
  completedAt: Date;
  /** 执行时长（毫秒） */
  executionTime: number;
}

/**
 * 任务失败事件数据
 */
export interface JobFailedEvent extends BaseEvent {
  /** 任务摘要信息 */
  job: JobSummary;
  /** 执行结果（包含错误信息） */
  result: JobExecutionResult;
  /** 失败时间 */
  failedAt: Date;
  /** 是否会重试 */
  willRetry: boolean;
  /** 剩余重试次数 */
  remainingAttempts: number;
}

/**
 * 任务重试事件数据
 */
export interface JobRetryEvent extends BaseEvent {
  /** 任务摘要信息 */
  job: JobSummary;
  /** 重试次数 */
  attemptNumber: number;
  /** 重试原因 */
  reason: string;
  /** 下次重试时间 */
  nextRetryAt?: Date;
}

// ============================================================================
// 分组相关事件
// ============================================================================

/**
 * 分组暂停事件数据
 */
export interface GroupPausedEvent extends BaseEvent {
  /** 分组ID */
  groupId: string;
  /** 暂停时的任务统计 */
  statistics: {
    totalJobs: number;
    waitingJobs: number;
    executingJobs: number;
  };
  /** 暂停原因 */
  reason: 'manual' | 'error' | 'dependency';
}

/**
 * 分组恢复事件数据
 */
export interface GroupResumedEvent extends BaseEvent {
  /** 分组ID */
  groupId: string;
  /** 恢复时的任务统计 */
  statistics: {
    totalJobs: number;
    waitingJobs: number;
    executingJobs: number;
  };
  /** 暂停持续时间（毫秒） */
  pauseDuration: number;
}

// ============================================================================
// 队列相关事件
// ============================================================================

/**
 * 队列空闲事件数据
 */
export interface QueueIdleEvent extends BaseEvent {
  /** 空闲开始时间 */
  idleStartedAt: Date;
  /** 最后处理的任务ID */
  lastJobId?: string;
}

/**
 * 队列忙碌事件数据
 */
export interface QueueBusyEvent extends BaseEvent {
  /** 忙碌开始时间 */
  busyStartedAt: Date;
  /** 当前处理的任务数量 */
  activeJobCount: number;
  /** 空闲持续时间（毫秒） */
  idleDuration: number;
}

/**
 * 队列暂停事件数据
 */
export interface QueuePausedEvent extends BaseEvent {
  /** 暂停原因 */
  reason: 'manual' | 'error' | 'maintenance';
  /** 暂停时的统计信息 */
  statistics: {
    totalJobs: number;
    waitingJobs: number;
    executingJobs: number;
    delayedJobs: number;
  };
}

/**
 * 队列恢复事件数据
 */
export interface QueueResumedEvent extends BaseEvent {
  /** 恢复原因 */
  reason: 'manual' | 'auto_recovery';
  /** 暂停持续时间（毫秒） */
  pauseDuration: number;
  /** 恢复时的统计信息 */
  statistics: {
    totalJobs: number;
    waitingJobs: number;
    executingJobs: number;
    delayedJobs: number;
  };
}

// ============================================================================
// 监控相关事件
// ============================================================================

/**
 * 性能指标事件数据
 */
export interface MetricsEvent extends BaseEvent {
  /** 指标类型 */
  type: 'watermark' | 'performance' | 'throughput' | 'error_rate';
  /** 指标数据 */
  metrics: Record<string, number | string | boolean>;
  /** 指标收集时间 */
  collectedAt: Date;
}

/**
 * 健康检查事件数据
 */
export interface HealthCheckEvent extends BaseEvent {
  /** 健康状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 检查结果详情 */
  details: {
    memoryUsage: number;
    queueLength: number;
    processingRate: number;
    errorRate: number;
    lastError?: string;
  };
  /** 检查时间 */
  checkedAt: Date;
}

// ============================================================================
// 事件映射类型
// ============================================================================

/**
 * 所有事件类型映射
 */
export interface QueueEventMap {
  // 水位相关事件
  'watermark:changed': WaterMarkChangeEvent;
  'watermark:empty': WaterMarkLevelEvent;
  'watermark:low': WaterMarkLevelEvent;
  'watermark:normal': WaterMarkLevelEvent;
  'watermark:high': WaterMarkLevelEvent;
  'watermark:critical': WaterMarkLevelEvent;
  'length:changed': LengthChangeEvent;

  // 背压相关事件
  'backpressure:activated': BackpressureActivatedEvent;
  'backpressure:deactivated': BackpressureDeactivatedEvent;
  'backpressure:adjusted': BackpressureAdjustedEvent;
  'backpressure:status': BackpressureStatusEvent;

  // 数据流相关事件
  'stream:started': StreamStartedEvent;
  'stream:paused': StreamPausedEvent;
  'stream:ended': StreamEndedEvent;
  'stream:error': StreamErrorEvent;

  // 任务相关事件
  'jobs:added': JobsAddedEvent;
  'jobs:added:batch': JobsAddedBatchEvent;
  'job:started': JobStartedEvent;
  'job:completed': JobCompletedEvent;
  'job:failed': JobFailedEvent;
  'job:retry': JobRetryEvent;

  // 分组相关事件
  'group:paused': GroupPausedEvent;
  'group:resumed': GroupResumedEvent;

  // 队列相关事件
  'queue:idle': QueueIdleEvent;
  'queue:busy': QueueBusyEvent;
  'queue:paused': QueuePausedEvent;
  'queue:resumed': QueueResumedEvent;

  // 监控相关事件
  'metrics:watermark': MetricsEvent;
  'metrics:performance': MetricsEvent;
  'metrics:throughput': MetricsEvent;
  'metrics:error_rate': MetricsEvent;
  'health:check': HealthCheckEvent;
}

/**
 * 事件名称类型
 */
export type QueueEventName = keyof QueueEventMap;

/**
 * 获取事件数据类型的工具类型
 */
export type QueueEventData<T extends QueueEventName> = QueueEventMap[T];
