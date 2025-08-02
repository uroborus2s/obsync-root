/**
 * 类型定义统一导出
 */

// 配置类型 - 具体导出避免循环依赖
export type {
  AlertConfig,
  ClusterConfig,
  ConsumerOptions,
  HealthCheckConfig,
  LoadBalancerConfig,
  MetricsConfig,
  MonitoringConfig,
  ProducerConfig,
  QueueConfig,
  QueueManagerConfig,
  RedisConnectionConfig,
  RetryPolicyConfig,
  SecurityConfig,
  SerializationConfig
} from './config.js';

// 消息类型 - 具体导出
export type {
  BatchMessageHandler,
  BatchSendResult,
  ConsumeResult,
  DeadLetterMessage,
  DelayedMessage,
  Message,
  MessageFilter,
  MessageHandler,
  MessageMetadata,
  MessageQueryOptions,
  MessageQueryResult,
  MessageStats,
  MessageStatus,
  QueueEvent,
  QueueEventData,
  SendOptions,
  SendResult
} from './message.js';

// 队列类型 - 具体导出
export type {
  AlertInfo,
  ClusterMetrics,
  ClusterNode,
  ConsumerMetrics,
  HealthCheck,
  HealthStatus,
  IConsumer,
  IMonitor,
  IProducer,
  IQueue,
  IQueueManager,
  Metrics,
  ProducerMetrics,
  QueueInfo,
  QueueStats,
  SystemMetrics
} from './queue.js';

// 注意：已在上面具体导出，这里不再重复

// 事件类型
export type QueueManagerEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'queue-created'
  | 'queue-deleted'
  | 'metrics-updated';

export type ProducerEvent =
  | 'started'
  | 'stopped'
  | 'sent'
  | 'batch-sent'
  | 'error';

export type ConsumerEvent =
  | 'started'
  | 'stopped'
  | 'paused'
  | 'resumed'
  | 'message'
  | 'batch'
  | 'error';

export type MonitorEvent =
  | 'metrics-collected'
  | 'alert-triggered'
  | 'alert-resolved'
  | 'health-check'
  | 'threshold-exceeded';

// 错误类型
export interface QueueError extends Error {
  code: string;
  queue?: string;
  messageId?: string;
  details?: any;
}

export interface RedisError extends Error {
  code: string;
  node?: string;
  command?: string;
  details?: any;
}

// 常量定义
export const DEFAULT_CONFIG = {
  QUEUE: {
    maxLength: 10000,
    retention: 24 * 60 * 60 * 1000, // 24小时
    retryAttempts: 3,
    retryDelay: 1000,
    priority: false,
    compression: false,
    serialization: 'json' as const
  },

  PRODUCER: {
    batchSize: 100,
    batchTimeout: 1000,
    compression: false,
    serialization: 'json' as const,
    maxRetries: 3,
    retryDelay: 1000
  },

  CONSUMER: {
    batchSize: 1,
    timeout: 5000,
    autoAck: false,
    maxRetries: 3,
    retryDelay: 1000,
    concurrency: 1
  },

  REDIS: {
    poolSize: 10,
    retryAttempts: 3,
    retryDelay: 1000
  },

  MONITORING: {
    enabled: true,
    interval: 10000, // 10秒
    retention: 24 * 60 * 60 * 1000 // 24小时
  }
} as const;

// 优先级常量
export const PRIORITY = {
  LOWEST: 0,
  LOW: 2,
  NORMAL: 5,
  HIGH: 7,
  HIGHEST: 9
} as const;

// 消息状态常量
export const MESSAGE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
  DEAD_LETTER: 'dead_letter'
} as const;

// 健康状态常量
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy'
} as const;

// 告警严重级别常量
export const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;
