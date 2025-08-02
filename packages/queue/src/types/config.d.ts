/**
 * 配置相关类型定义
 */
import { ClusterOptions, RedisOptions } from 'ioredis';
export interface RedisConnectionConfig {
    cluster?: {
        nodes: Array<{
            host: string;
            port: number;
        }>;
        options?: ClusterOptions;
    };
    single?: {
        host: string;
        port: number;
        options?: RedisOptions;
    };
    poolSize?: number;
    retryAttempts?: number;
    retryDelay?: number;
}
export interface QueueConfig {
    maxLength?: number;
    retention?: number;
    deadLetterQueue?: string;
    retryAttempts?: number;
    retryDelay?: number;
    priority?: boolean;
    compression?: boolean;
    serialization?: 'json' | 'msgpack' | 'protobuf';
}
export interface ProducerConfig {
    batchSize?: number;
    batchTimeout?: number;
    compression?: boolean;
    serialization?: 'json' | 'msgpack' | 'protobuf';
    maxRetries?: number;
    retryDelay?: number;
}
export interface ConsumerOptions {
    consumerId?: string;
    consumerGroup?: string;
    batchSize?: number;
    timeout?: number;
    autoAck?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    retryPolicy?: string | any;
    deadLetterQueue?: string;
    concurrency?: number;
}
export interface MonitoringConfig {
    enabled: boolean;
    interval?: number;
    metrics?: MetricsConfig;
    alerts?: AlertConfig[];
}
export interface MetricsConfig {
    enabled: boolean;
    retention?: number;
    aggregation?: 'sum' | 'avg' | 'max' | 'min';
}
export interface AlertConfig {
    id: string;
    name: string;
    condition: string;
    threshold: number;
    duration?: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    channels: string[];
}
export interface SecurityConfig {
    auth?: {
        username?: string;
        password?: string;
    };
    tls?: {
        enabled: boolean;
        cert?: string;
        key?: string;
        ca?: string;
    };
    encryption?: {
        enabled: boolean;
        algorithm?: string;
        key?: string;
    };
}
export interface HealthCheckConfig {
    enabled?: boolean;
    interval?: number;
    timeout?: number;
    retries?: number;
}
export interface QueueManagerConfig {
    redis: RedisConnectionConfig;
    queues?: {
        [queueName: string]: QueueConfig;
    };
    monitoring?: MonitoringConfig;
    security?: SecurityConfig;
    defaultQueue?: QueueConfig;
    healthCheck?: HealthCheckConfig;
    metrics?: MetricsConfig;
}
export interface RetryPolicyConfig {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
    jitter?: boolean;
    strategy: 'exponential' | 'linear' | 'fixed';
}
export interface SerializationConfig {
    type: 'json' | 'msgpack' | 'protobuf';
    compression?: boolean;
    compressionThreshold?: number;
    schema?: any;
}
export interface LoadBalancerConfig {
    strategy: 'round-robin' | 'weighted' | 'least-connections' | 'random';
    weights?: number[];
    healthCheck?: boolean;
    healthCheckInterval?: number;
}
export interface ClusterConfig {
    nodes: Array<{
        host: string;
        port: number;
        weight?: number;
    }>;
    loadBalancer?: LoadBalancerConfig;
    failover?: {
        enabled: boolean;
        timeout?: number;
        maxRetries?: number;
    };
    sharding?: {
        strategy: 'hash' | 'range' | 'consistent-hash';
        replicas?: number;
    };
}
//# sourceMappingURL=config.d.ts.map