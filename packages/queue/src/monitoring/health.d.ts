/**
 * 健康检查和系统状态监控
 */
import { EventEmitter } from 'events';
import { HealthStatus } from '../types/index.js';
import { Logger } from '../utils/index.js';
export interface HealthCheckItem {
    name: string;
    check(): Promise<HealthCheckResult>;
    getTimeout(): number;
    isRequired(): boolean;
}
export interface HealthCheckResult {
    healthy: boolean;
    message?: string;
    details?: any;
    duration?: number;
    timestamp: number;
}
export interface HealthCheckConfig {
    timeout?: number;
    required?: boolean;
    interval?: number;
    retries?: number;
}
export declare abstract class BaseHealthCheck implements HealthCheckItem {
    readonly name: string;
    protected logger: Logger;
    protected timeout: number;
    protected required: boolean;
    constructor(name: string, config?: HealthCheckConfig);
    abstract check(): Promise<HealthCheckResult>;
    getTimeout(): number;
    isRequired(): boolean;
    /**
     * 带超时的健康检查
     */
    protected checkWithTimeout(): Promise<HealthCheckResult>;
    /**
     * 创建超时Promise
     */
    private createTimeoutPromise;
}
export declare class RedisHealthCheck extends BaseHealthCheck {
    private getConnection;
    constructor(getConnection: () => any, config?: HealthCheckConfig);
    check(): Promise<HealthCheckResult>;
}
export declare class QueueHealthCheck extends BaseHealthCheck {
    private queueName;
    private getQueueInfo;
    constructor(queueName: string, getQueueInfo: () => Promise<any>, config?: HealthCheckConfig);
    check(): Promise<HealthCheckResult>;
}
export declare class MemoryHealthCheck extends BaseHealthCheck {
    private maxMemoryUsage;
    constructor(maxMemoryUsage?: number, // 90%
    config?: HealthCheckConfig);
    check(): Promise<HealthCheckResult>;
}
export declare class EventLoopHealthCheck extends BaseHealthCheck {
    private maxLag;
    constructor(maxLag?: number, // 100ms
    config?: HealthCheckConfig);
    check(): Promise<HealthCheckResult>;
    private measureEventLoopLag;
}
export declare class HealthMonitor extends EventEmitter {
    private readonly config;
    private healthChecks;
    private lastResults;
    private logger;
    private monitorInterval?;
    private isMonitoring;
    constructor(config?: {
        checkInterval?: number;
        enableAutoCheck?: boolean;
    });
    /**
     * 启动健康监控
     */
    start(): void;
    /**
     * 停止健康监控
     */
    stop(): void;
    /**
     * 注册健康检查
     */
    registerCheck(healthCheck: HealthCheckItem): void;
    /**
     * 注销健康检查
     */
    unregisterCheck(name: string): void;
    /**
     * 执行所有健康检查
     */
    checkAll(): Promise<HealthStatus>;
    /**
     * 执行单个健康检查
     */
    checkOne(name: string): Promise<HealthCheckResult | null>;
    /**
     * 获取最后的健康检查结果
     */
    getLastResults(): Map<string, HealthCheckResult>;
    /**
     * 获取特定检查的最后结果
     */
    getLastResult(name: string): HealthCheckResult | undefined;
    /**
     * 执行健康检查
     */
    private executeHealthCheck;
    /**
     * 创建超时Promise
     */
    private createTimeoutPromise;
    /**
     * 计算整体健康状态
     */
    private calculateOverallHealth;
}
export declare const createHealthMonitor: (config?: {
    checkInterval?: number;
    enableAutoCheck?: boolean;
}) => HealthMonitor;
//# sourceMappingURL=health.d.ts.map