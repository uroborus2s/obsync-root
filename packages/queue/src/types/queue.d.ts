/**
 * 队列相关类型定义
 */
import { EventEmitter } from 'events';
import { Message, MessageQueryOptions, MessageQueryResult, MessageStats } from './message.js';
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
export interface ProducerMetrics {
    messagesSent: number;
    messagesPerSecond: number;
    averageLatency: number;
    errorRate: number;
    batchesSent: number;
    averageBatchSize: number;
    lastSentAt?: number;
}
export interface ConsumerMetrics {
    messagesProcessed: number;
    messagesPerSecond: number;
    averageProcessingTime: number;
    errorRate: number;
    pendingMessages: number;
    lastProcessedAt?: number;
    consumerLag: number;
}
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
export interface Metrics {
    queues: Record<string, QueueStats>;
    producers: Record<string, ProducerMetrics>;
    consumers: Record<string, ConsumerMetrics>;
    cluster: ClusterMetrics;
    system: SystemMetrics;
    timestamp: number;
}
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
    timestamp: number;
    uptime: number;
}
export interface HealthCheck {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration: number;
    timestamp: number;
}
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
export interface IQueue<T = any> extends EventEmitter {
    readonly name: string;
    readonly config: any;
    send(message: Message<T>, options?: any): Promise<any>;
    sendBatch(messages: Message<T>[], options?: any): Promise<any>;
    purge(): Promise<number>;
    getLength(): Promise<number>;
    getInfo(): Promise<QueueInfo>;
    getStats(): Promise<QueueStats>;
    queryMessages(options?: MessageQueryOptions): Promise<MessageQueryResult<T>>;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
}
export interface IProducer<T = any> extends EventEmitter {
    readonly queue: IQueue<T>;
    readonly config: any;
    send(message: Message<T>, options?: any): Promise<any>;
    sendBatch(messages: Message<T>[], options?: any): Promise<any[]>;
    sendDelayed(message: Message<T>, delay: number, options?: any): Promise<any>;
    sendPriority(message: Message<T>, priority: number, options?: any): Promise<any>;
    getMetrics(): ProducerMetrics;
    resetMetrics(): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
}
export interface IConsumer<T = any> extends EventEmitter {
    readonly queue: IQueue<T>;
    readonly config: any;
    readonly groupName: string;
    readonly consumerName: string;
    consume(handler: any): Promise<void>;
    consumeBatch(handler: any): Promise<void>;
    pause(): void;
    resume(): void;
    getMetrics(): ConsumerMetrics;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
}
export interface IQueueManager extends EventEmitter {
    readonly config: any;
    createQueue(name: string, config?: any): Promise<IQueue>;
    getQueue(name: string): IQueue | null;
    deleteQueue(name: string): Promise<boolean>;
    listQueues(): string[];
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    healthCheck(): Promise<HealthStatus>;
    getMetrics(): Promise<Metrics>;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export interface IMonitor extends EventEmitter {
    readonly config: any;
    getMetrics(): Promise<Metrics>;
    getQueueMetrics(queueName: string): Promise<QueueStats>;
    getClusterMetrics(): Promise<ClusterMetrics>;
    healthCheck(): Promise<HealthStatus>;
    addAlert(alert: any): void;
    removeAlert(alertId: string): void;
    getAlerts(): AlertInfo[];
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
}
//# sourceMappingURL=queue.d.ts.map