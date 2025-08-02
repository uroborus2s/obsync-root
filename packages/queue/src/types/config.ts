/**
 * 配置相关类型定义
 */

import { ClusterOptions, RedisOptions } from 'ioredis';

// Redis连接配置
export interface RedisConnectionConfig {
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
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

// 队列配置
export interface QueueConfig {
  maxLength?: number; // 队列最大长度
  retention?: number; // 消息保留时间(ms)
  deadLetterQueue?: string; // 死信队列名称
  retryAttempts?: number; // 最大重试次数
  retryDelay?: number; // 重试延迟(ms)
  priority?: boolean; // 是否支持优先级
  compression?: boolean; // 是否压缩消息
  serialization?: 'json' | 'msgpack' | 'protobuf'; // 序列化方式
}

// 生产者配置
export interface ProducerConfig {
  batchSize?: number; // 批量发送大小
  batchTimeout?: number; // 批量超时时间
  compression?: boolean; // 是否压缩
  serialization?: 'json' | 'msgpack' | 'protobuf';
  maxRetries?: number; // 最大重试次数
  retryDelay?: number; // 重试延迟
}

// 消费者配置
export interface ConsumerOptions {
  consumerId?: string; // 消费者ID
  consumerGroup?: string; // 消费者组名称
  batchSize?: number; // 批量消费大小
  timeout?: number; // 消费超时时间
  autoAck?: boolean; // 自动确认
  maxRetries?: number; // 最大重试次数
  retryDelay?: number; // 重试延迟
  retryPolicy?: string | any; // 重试策略名称或策略实例
  deadLetterQueue?: string; // 死信队列
  concurrency?: number; // 并发数
}

// 监控配置
export interface MonitoringConfig {
  enabled: boolean;
  interval?: number; // 监控间隔(ms)
  metrics?: MetricsConfig;
  alerts?: AlertConfig[];
}

// 指标配置
export interface MetricsConfig {
  enabled: boolean;
  retention?: number; // 指标保留时间
  aggregation?: 'sum' | 'avg' | 'max' | 'min';
}

// 告警配置
export interface AlertConfig {
  id: string;
  name: string;
  condition: string; // 告警条件表达式
  threshold: number; // 阈值
  duration?: number; // 持续时间
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[]; // 告警渠道
}

// 安全配置
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

// 健康检查配置
export interface HealthCheckConfig {
  enabled?: boolean;
  interval?: number; // 健康检查间隔(ms)
  timeout?: number; // 检查超时时间(ms)
  retries?: number; // 重试次数
}

// 队列管理器配置
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

// 重试策略配置
export interface RetryPolicyConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter?: boolean;
  strategy: 'exponential' | 'linear' | 'fixed';
}

// 序列化配置
export interface SerializationConfig {
  type: 'json' | 'msgpack' | 'protobuf';
  compression?: boolean;
  compressionThreshold?: number; // 压缩阈值(字节)
  schema?: any; // protobuf schema
}

// 负载均衡配置
export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'weighted' | 'least-connections' | 'random';
  weights?: number[];
  healthCheck?: boolean;
  healthCheckInterval?: number;
}

// 集群配置
export interface ClusterConfig {
  nodes: Array<{ host: string; port: number; weight?: number }>;
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
