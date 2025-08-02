/**
 * @stratix/queue - 高可靠、基于Redis的消息队列系统
 */
export { Consumer, DeadLetterQueueManager, Producer, Queue, QueueManager } from './core/index.js';
export { RedisConnectionManager } from './redis/index.js';
export { CachedSerializer, CompressedSerializer, createCachedSerializer, createCompressedSerializer, getSerializer, SerializerAdapter, SerializerFactory } from './serialization/index.js';
export type { ISerializer } from './serialization/index.js';
export { CircuitBreakerRetryPolicy, CustomRetryPolicy, DecoratedRetryPolicy, ExponentialBackoffRetryPolicy, FixedDelayRetryPolicy, LinearBackoffRetryPolicy, RetryExecutor, RetryPolicyFactory } from './retry/index.js';
export { AlertManager, ConsumerMetricsCollector, HealthMonitor, MetricsAggregator, PerformanceMonitor, ProducerMetricsCollector, QueueMetricsCollector, SystemMetricsCollector } from './monitoring/index.js';
export { createQueueError, createRedisError, handleError, isRetryableError } from './errors/index.js';
export { createLogger, debounce, generateMessageId, generateUUID, retry, sleep, throttle } from './utils/index.js';
export { createQueuePlugin, defaultPluginManager, PluginManager } from './plugin.js';
export type { BatchMessageHandler, ConsumeResult, ConsumerMetrics, ConsumerOptions, HealthStatus, IConsumer, IProducer, IQueue, IQueueManager, Message, MessageHandler, Metrics, ProducerConfig, ProducerMetrics, QueueConfig, QueueManagerConfig, QueueStats, SendOptions, SendResult } from './types/index.js';
export type { RetryPolicy, RetryPolicyConfig } from './retry/index.js';
export { DEFAULT_CONFIG, PRIORITY } from './types/index.js';
//# sourceMappingURL=index.d.ts.map