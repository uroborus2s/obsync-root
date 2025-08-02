/**
 * Redis连接管理
 */
import { EventEmitter } from 'events';
import { Cluster, Redis } from 'ioredis';
import { RedisConnectionConfig } from '../types/index.js';
export interface ConnectionPoolOptions {
    min?: number;
    max?: number;
    acquireTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    reapIntervalMillis?: number;
}
export interface ConnectionInfo {
    id: string;
    type: 'single' | 'cluster';
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
    host?: string;
    port?: number;
    nodes?: Array<{
        host: string;
        port: number;
    }>;
    createdAt: number;
    lastUsed: number;
    errorCount: number;
}
export declare class RedisConnectionManager extends EventEmitter {
    private connections;
    private connectionInfo;
    private config;
    private logger;
    private isConnected;
    private reconnectTimer?;
    constructor(config: RedisConnectionConfig);
    /**
     * 连接到Redis
     */
    connect(): Promise<void>;
    /**
     * 断开连接
     */
    disconnect(): Promise<void>;
    /**
     * 获取连接
     */
    getConnection(name?: string): Redis | Cluster;
    /**
     * 创建新连接
     */
    createConnection(name: string, config?: Partial<RedisConnectionConfig>): Promise<Redis | Cluster>;
    /**
     * 移除连接
     */
    removeConnection(name: string): Promise<void>;
    /**
     * 检查连接健康状态
     */
    healthCheck(): Promise<boolean>;
    /**
     * 获取连接信息
     */
    getConnectionInfo(): ConnectionInfo[];
    /**
     * 是否已连接
     */
    isConnectionHealthy(): boolean;
    /**
     * 连接到集群
     */
    private connectCluster;
    /**
     * 连接到单个Redis实例
     */
    private connectSingle;
    /**
     * 创建集群连接
     */
    private createClusterConnection;
    /**
     * 创建单个连接
     */
    private createSingleConnection;
    /**
     * 设置集群事件处理器
     */
    private setupClusterEventHandlers;
    /**
     * 设置单个连接事件处理器
     */
    private setupSingleEventHandlers;
    /**
     * 等待连接建立
     */
    private waitForConnection;
    /**
     * 更新连接状态
     */
    private updateConnectionStatus;
    /**
     * 增加错误计数
     */
    private incrementErrorCount;
    /**
     * 调度重连
     */
    private scheduleReconnect;
}
//# sourceMappingURL=connection.d.ts.map