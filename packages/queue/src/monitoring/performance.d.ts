/**
 * 性能监控器
 * 提供队列系统的性能监控和分析功能
 */
import { EventEmitter } from 'events';
import type { MetricsCollector } from './metrics.js';
/**
 * 性能指标
 */
export interface PerformanceMetrics {
    throughput: {
        messagesPerSecond: number;
        bytesPerSecond: number;
        peakMessagesPerSecond: number;
        averageMessagesPerSecond: number;
    };
    latency: {
        p50: number;
        p95: number;
        p99: number;
        average: number;
        max: number;
    };
    resources: {
        cpuUsage: number;
        memoryUsage: number;
        connectionCount: number;
        queueDepth: number;
    };
    errorRate: {
        total: number;
        percentage: number;
        byType: Record<string, number>;
    };
}
/**
 * 性能样本
 */
export interface PerformanceSample {
    timestamp: number;
    operation: string;
    duration: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}
/**
 * 性能统计窗口
 */
export declare class PerformanceWindow {
    private samples;
    private readonly maxSamples;
    private readonly windowDuration;
    constructor(maxSamples?: number, windowDuration?: number);
    /**
     * 添加性能样本
     */
    addSample(sample: PerformanceSample): void;
    /**
     * 获取性能指标
     */
    getMetrics(): PerformanceMetrics;
    /**
     * 计算吞吐量指标
     */
    private calculateThroughput;
    /**
     * 计算延迟指标
     */
    private calculateLatency;
    /**
     * 计算资源使用指标
     */
    private calculateResourceUsage;
    /**
     * 计算错误率指标
     */
    private calculateErrorRate;
    /**
     * 计算百分位数
     */
    private percentile;
    /**
     * 清理过期样本
     */
    private cleanup;
}
/**
 * 性能监控器
 */
export declare class PerformanceMonitor extends EventEmitter implements MetricsCollector {
    private readonly config;
    private window;
    private logger;
    private isMonitoring;
    private monitoringInterval?;
    constructor(config?: {
        windowDuration?: number;
        maxSamples?: number;
        reportingInterval?: number;
    });
    /**
     * 启动性能监控
     */
    start(): void;
    /**
     * 停止性能监控
     */
    stop(): void;
    /**
     * 记录操作性能
     */
    recordOperation(operation: string, duration: number, success: boolean, error?: string, metadata?: Record<string, any>): void;
    /**
     * 获取当前性能指标
     */
    getCurrentMetrics(): PerformanceMetrics;
    /**
     * 实现MetricsCollector接口
     */
    collect(): Promise<Record<string, number>>;
    getName(): string;
    getLabels(): Record<string, string>;
}
/**
 * 性能装饰器 - 用于自动记录函数执行性能
 */
export declare function withPerformanceMonitoring(monitor: PerformanceMonitor, operationName: string): <T extends (...args: any[]) => Promise<any>>(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T>;
//# sourceMappingURL=performance.d.ts.map