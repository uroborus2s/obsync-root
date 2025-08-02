/**
 * @stratix/queue - 高可靠、基于Redis的消息队列系统
 */
// 核心类 - 具体导出避免循环依赖
export { Consumer, DeadLetterQueueManager, Producer, Queue, QueueManager } from './core/index.js';
// Redis连接管理
export { RedisConnectionManager } from './redis/index.js';
// 序列化
export { CachedSerializer, CompressedSerializer, createCachedSerializer, createCompressedSerializer, getSerializer, SerializerAdapter, SerializerFactory } from './serialization/index.js';
// 重试机制
export { CircuitBreakerRetryPolicy, CustomRetryPolicy, DecoratedRetryPolicy, ExponentialBackoffRetryPolicy, FixedDelayRetryPolicy, LinearBackoffRetryPolicy, RetryExecutor, RetryPolicyFactory } from './retry/index.js';
// 监控
export { AlertManager, ConsumerMetricsCollector, HealthMonitor, MetricsAggregator, PerformanceMonitor, ProducerMetricsCollector, QueueMetricsCollector, SystemMetricsCollector } from './monitoring/index.js';
// 错误定义
export { createQueueError, createRedisError, handleError, isRetryableError } from './errors/index.js';
// 工具函数
export { createLogger, debounce, generateMessageId, generateUUID, retry, sleep, throttle } from './utils/index.js';
// 插件
export { createQueuePlugin, defaultPluginManager, PluginManager } from './plugin.js';
// 常量导出
export { DEFAULT_CONFIG, PRIORITY } from './types/index.js';
//# sourceMappingURL=index.js.map