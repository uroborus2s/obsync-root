/**
 * 指标收集和统计
 */
import { EventEmitter } from 'events';
import { ConsumerMetrics, ProducerMetrics, QueueStats } from '../types/index.js';
export interface MetricDataPoint {
    timestamp: number;
    value: number;
    labels?: Record<string, string>;
}
export interface TimeSeries {
    name: string;
    dataPoints: MetricDataPoint[];
    maxDataPoints: number;
}
export interface MetricsCollector {
    collect(): Promise<Record<string, number>>;
    getName(): string;
    getLabels(): Record<string, string>;
}
export declare class MetricsAggregator extends EventEmitter {
    private readonly config;
    private timeSeries;
    private collectors;
    private logger;
    private collectionInterval?;
    private isCollecting;
    constructor(config?: {
        collectionInterval?: number;
        maxDataPoints?: number;
        enableAutoCollection?: boolean;
    });
    /**
     * 启动指标收集
     */
    start(): void;
    /**
     * 停止指标收集
     */
    stop(): void;
    /**
     * 注册指标收集器
     */
    registerCollector(collector: MetricsCollector): void;
    /**
     * 注销指标收集器
     */
    unregisterCollector(name: string): void;
    /**
     * 记录指标值
     */
    recordMetric(name: string, value: number, labels?: Record<string, string>, timestamp?: number): void;
    /**
     * 收集所有指标
     */
    collectAll(): Promise<void>;
    /**
     * 获取指标时间序列
     */
    getTimeSeries(name: string): TimeSeries | undefined;
    /**
     * 获取所有时间序列
     */
    getAllTimeSeries(): Map<string, TimeSeries>;
    /**
     * 获取最新指标值
     */
    getLatestMetric(name: string): MetricDataPoint | undefined;
    /**
     * 获取指标统计信息
     */
    getMetricStats(name: string, timeRange?: {
        start: number;
        end: number;
    }): {
        count: number;
        min: number;
        max: number;
        avg: number;
        sum: number;
    } | undefined;
    /**
     * 清除指标数据
     */
    clearMetrics(name?: string): void;
    /**
     * 导出指标数据
     */
    exportMetrics(format?: 'json' | 'prometheus'): string;
    /**
     * 导出JSON格式
     */
    private exportJsonFormat;
    /**
     * 导出Prometheus格式
     */
    private exportPrometheusFormat;
}
export declare class QueueMetricsCollector implements MetricsCollector {
    private queueName;
    private getQueueStats;
    constructor(queueName: string, getQueueStats: () => Promise<QueueStats>);
    collect(): Promise<Record<string, number>>;
    getName(): string;
    getLabels(): Record<string, string>;
}
export declare class SystemMetricsCollector implements MetricsCollector {
    collect(): Promise<Record<string, number>>;
    getName(): string;
    getLabels(): Record<string, string>;
    private measureEventLoopLag;
}
export declare class ProducerMetricsCollector implements MetricsCollector {
    private producerName;
    private getProducerMetrics;
    constructor(producerName: string, getProducerMetrics: () => ProducerMetrics);
    collect(): Promise<Record<string, number>>;
    getName(): string;
    getLabels(): Record<string, string>;
}
export declare class ConsumerMetricsCollector implements MetricsCollector {
    private consumerName;
    private getConsumerMetrics;
    constructor(consumerName: string, getConsumerMetrics: () => ConsumerMetrics);
    collect(): Promise<Record<string, number>>;
    getName(): string;
    getLabels(): Record<string, string>;
}
export declare const createMetricsAggregator: (config?: {
    collectionInterval?: number;
    maxDataPoints?: number;
    enableAutoCollection?: boolean;
}) => MetricsAggregator;
//# sourceMappingURL=metrics.d.ts.map