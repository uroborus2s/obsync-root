/**
 * 队列管理器 - 统一管理所有队列实例
 */
import { EventEmitter } from 'events';
import { HealthStatus, IQueue, IQueueManager, Metrics, QueueConfig, QueueManagerConfig } from '../types/index.js';
export declare class QueueManager extends EventEmitter implements IQueueManager {
    readonly config: QueueManagerConfig;
    private connectionManager;
    private queues;
    private logger;
    private isStarted;
    private healthCheckInterval?;
    private metricsInterval?;
    constructor(config: QueueManagerConfig);
    /**
     * 连接到Redis
     */
    connect(): Promise<void>;
    /**
     * 断开Redis连接
     */
    disconnect(): Promise<void>;
    /**
     * 检查是否已连接
     */
    isConnected(): boolean;
    /**
     * 创建队列
     */
    createQueue(name: string, config?: QueueConfig): Promise<IQueue>;
    /**
     * 获取队列
     */
    getQueue(name: string): IQueue | null;
    /**
     * 删除队列
     */
    deleteQueue(name: string): Promise<boolean>;
    /**
     * 列出所有队列名称
     */
    listQueues(): string[];
    /**
     * 启动队列管理器
     */
    start(): Promise<void>;
    /**
     * 停止队列管理器
     */
    stop(): Promise<void>;
    /**
     * 健康检查
     */
    healthCheck(): Promise<HealthStatus>;
    /**
     * 获取指标
     */
    getMetrics(): Promise<Metrics>;
    /**
     * 验证配置
     */
    private validateConfig;
    /**
     * 验证队列名称
     */
    private validateQueueName;
    /**
     * 设置连接事件监听
     */
    private setupConnectionEvents;
    /**
     * 设置队列事件监听
     */
    private setupQueueEvents;
    /**
     * 启动所有队列
     */
    private startAllQueues;
    /**
     * 停止所有队列
     */
    private stopAllQueues;
    /**
     * 启动健康检查
     */
    private startHealthCheck;
    /**
     * 停止健康检查
     */
    private stopHealthCheck;
    /**
     * 启动指标收集
     */
    private startMetricsCollection;
    /**
     * 停止指标收集
     */
    private stopMetricsCollection;
}
//# sourceMappingURL=queue-manager.d.ts.map