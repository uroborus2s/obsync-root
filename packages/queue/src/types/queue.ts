/**
 * 队列相关类型定义
 */

import { EventEmitter } from 'events';
import {
  Message,
  MessageQueryOptions,
  MessageQueryResult,
  MessageStats
} from './message.js';

// 队列信息
export interface QueueInfo {
  name: string;
  length: number;
  consumers: number;
  producers: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  createdAt: number;
  lastActivity: number;
  config: any;
}

// 队列统计
export interface QueueStats extends MessageStats {
  throughput: {
    sent: number;
    processed: number;
    failed: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  consumers: {
    active: number;
    idle: number;
    total: number;
  };
  memory: {
    used: number;
    peak: number;
  };
}

// 生产者指标
export interface ProducerMetrics {
  messagesSent: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  batchesSent: number;
  averageBatchSize: number;
  lastSentAt?: number;
}

// 消费者指标
export interface ConsumerMetrics {
  messagesProcessed: number;
  messagesPerSecond: number;
  averageProcessingTime: number;
  errorRate: number;
  pendingMessages: number;
  lastProcessedAt?: number;
  consumerLag: number;
}

// 集群节点信息
export interface ClusterNode {
  id: string;
  host: string;
  port: number;
  role: 'master' | 'slave';
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  slots?: number[];
  memory: {
    used: number;
    max: number;
    fragmentation: number;
  };
  connections: number;
  commandsPerSecond: number;
  lastSeen: number;
}

// 集群指标
export interface ClusterMetrics {
  nodes: ClusterNode[];
  totalMemory: number;
  usedMemory: number;
  totalConnections: number;
  commandsPerSecond: number;
  keyspaceHits: number;
  keyspaceMisses: number;
  evictedKeys: number;
  expiredKeys: number;
}

// 系统指标
export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    free: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  disk: {
    used: number;
    total: number;
    free: number;
    iops: number;
  };
}

// 综合指标
export interface Metrics {
  queues: Record<string, QueueStats>;
  producers: Record<string, ProducerMetrics>;
  consumers: Record<string, ConsumerMetrics>;
  cluster: ClusterMetrics;
  system: SystemMetrics;
  timestamp: number;
}

// 健康状态
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: number;
  uptime: number;
}

// 健康检查项
export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration: number;
  timestamp: number;
}

// 告警信息
export interface AlertInfo {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  duration?: number;
}

// 队列操作接口
export interface IQueue<T = any> extends EventEmitter {
  readonly name: string;
  readonly config: any;

  // 消息操作
  send(message: Message<T>, options?: any): Promise<any>;
  sendBatch(messages: Message<T>[], options?: any): Promise<any>;

  // 队列管理
  purge(): Promise<number>;
  getLength(): Promise<number>;
  getInfo(): Promise<QueueInfo>;
  getStats(): Promise<QueueStats>;

  // 消息查询
  queryMessages(options?: MessageQueryOptions): Promise<MessageQueryResult<T>>;

  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

// 生产者接口
export interface IProducer<T = any> extends EventEmitter {
  readonly queue: IQueue<T>;
  readonly config: any;

  // 消息发送
  send(message: Message<T>, options?: any): Promise<any>;
  sendBatch(messages: Message<T>[], options?: any): Promise<any[]>;
  sendDelayed(message: Message<T>, delay: number, options?: any): Promise<any>;
  sendPriority(
    message: Message<T>,
    priority: number,
    options?: any
  ): Promise<any>;

  // 指标获取
  getMetrics(): ProducerMetrics;
  resetMetrics(): void;

  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

// 消费者接口
export interface IConsumer<T = any> extends EventEmitter {
  readonly queue: IQueue<T>;
  readonly config: any;
  readonly groupName: string;
  readonly consumerName: string;

  // 消息消费
  consume(handler: any): Promise<void>;
  consumeBatch(handler: any): Promise<void>;

  // 消费控制
  pause(): void;
  resume(): void;

  // 指标获取
  getMetrics(): ConsumerMetrics;

  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

// 队列管理器接口
export interface IQueueManager extends EventEmitter {
  readonly config: any;

  // 队列管理
  createQueue(name: string, config?: any): Promise<IQueue>;
  getQueue(name: string): IQueue | null;
  deleteQueue(name: string): Promise<boolean>;
  listQueues(): string[];

  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // 健康检查
  healthCheck(): Promise<HealthStatus>;
  getMetrics(): Promise<Metrics>;

  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
}

// 监控器接口
export interface IMonitor extends EventEmitter {
  readonly config: any;

  // 指标收集
  getMetrics(): Promise<Metrics>;
  getQueueMetrics(queueName: string): Promise<QueueStats>;
  getClusterMetrics(): Promise<ClusterMetrics>;

  // 健康检查
  healthCheck(): Promise<HealthStatus>;

  // 告警管理
  addAlert(alert: any): void;
  removeAlert(alertId: string): void;
  getAlerts(): AlertInfo[];

  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
