/**
 * 类型定义统一导出
 */
export type { AlertConfig, ClusterConfig, ConsumerOptions, HealthCheckConfig, LoadBalancerConfig, MetricsConfig, MonitoringConfig, ProducerConfig, QueueConfig, QueueManagerConfig, RedisConnectionConfig, RetryPolicyConfig, SecurityConfig, SerializationConfig } from './config.js';
export type { BatchMessageHandler, BatchSendResult, ConsumeResult, DeadLetterMessage, DelayedMessage, Message, MessageFilter, MessageHandler, MessageMetadata, MessageQueryOptions, MessageQueryResult, MessageStats, MessageStatus, QueueEvent, QueueEventData, SendOptions, SendResult } from './message.js';
export type { AlertInfo, ClusterMetrics, ClusterNode, ConsumerMetrics, HealthCheck, HealthStatus, IConsumer, IMonitor, IProducer, IQueue, IQueueManager, Metrics, ProducerMetrics, QueueInfo, QueueStats, SystemMetrics } from './queue.js';
export type QueueManagerEvent = 'connected' | 'disconnected' | 'error' | 'queue-created' | 'queue-deleted' | 'metrics-updated';
export type ProducerEvent = 'started' | 'stopped' | 'sent' | 'batch-sent' | 'error';
export type ConsumerEvent = 'started' | 'stopped' | 'paused' | 'resumed' | 'message' | 'batch' | 'error';
export type MonitorEvent = 'metrics-collected' | 'alert-triggered' | 'alert-resolved' | 'health-check' | 'threshold-exceeded';
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
export declare const DEFAULT_CONFIG: {
    readonly QUEUE: {
        readonly maxLength: 10000;
        readonly retention: number;
        readonly retryAttempts: 3;
        readonly retryDelay: 1000;
        readonly priority: false;
        readonly compression: false;
        readonly serialization: "json";
    };
    readonly PRODUCER: {
        readonly batchSize: 100;
        readonly batchTimeout: 1000;
        readonly compression: false;
        readonly serialization: "json";
        readonly maxRetries: 3;
        readonly retryDelay: 1000;
    };
    readonly CONSUMER: {
        readonly batchSize: 1;
        readonly timeout: 5000;
        readonly autoAck: false;
        readonly maxRetries: 3;
        readonly retryDelay: 1000;
        readonly concurrency: 1;
    };
    readonly REDIS: {
        readonly poolSize: 10;
        readonly retryAttempts: 3;
        readonly retryDelay: 1000;
    };
    readonly MONITORING: {
        readonly enabled: true;
        readonly interval: 10000;
        readonly retention: number;
    };
};
export declare const PRIORITY: {
    readonly LOWEST: 0;
    readonly LOW: 2;
    readonly NORMAL: 5;
    readonly HIGH: 7;
    readonly HIGHEST: 9;
};
export declare const MESSAGE_STATUS: {
    readonly PENDING: "pending";
    readonly PROCESSING: "processing";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly RETRYING: "retrying";
    readonly DEAD_LETTER: "dead_letter";
};
export declare const HEALTH_STATUS: {
    readonly HEALTHY: "healthy";
    readonly DEGRADED: "degraded";
    readonly UNHEALTHY: "unhealthy";
};
export declare const ALERT_SEVERITY: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
    readonly CRITICAL: "critical";
};
//# sourceMappingURL=index.d.ts.map