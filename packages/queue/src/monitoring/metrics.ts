/**
 * 指标收集和统计
 */

import { EventEmitter } from 'events';
import {
  ConsumerMetrics,
  ProducerMetrics,
  QueueStats
} from '../types/index.js';
import { createLogger, Logger } from '../utils/index.js';

// 指标数据点
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

// 时间序列指标
export interface TimeSeries {
  name: string;
  dataPoints: MetricDataPoint[];
  maxDataPoints: number;
}

// 指标收集器接口
export interface MetricsCollector {
  collect(): Promise<Record<string, number>>;
  getName(): string;
  getLabels(): Record<string, string>;
}

// 指标聚合器
export class MetricsAggregator extends EventEmitter {
  private timeSeries: Map<string, TimeSeries> = new Map();
  private collectors: Map<string, MetricsCollector> = new Map();
  private logger: Logger;
  private collectionInterval?: NodeJS.Timeout;
  private isCollecting = false;

  constructor(
    private readonly config: {
      collectionInterval?: number;
      maxDataPoints?: number;
      enableAutoCollection?: boolean;
    } = {}
  ) {
    super();

    this.logger = createLogger({
      level: 1,
      format: 'json'
    });

    // 默认配置
    this.config = {
      collectionInterval: 10000, // 10秒
      maxDataPoints: 1000,
      enableAutoCollection: true,
      ...config
    };
  }

  /**
   * 启动指标收集
   */
  start(): void {
    if (this.isCollecting) {
      return;
    }

    this.logger.info('Starting metrics collection...');

    if (this.config.enableAutoCollection) {
      this.collectionInterval = setInterval(() => {
        this.collectAll().catch((error) => {
          this.logger.error('Metrics collection failed', error);
        });
      }, this.config.collectionInterval);
    }

    this.isCollecting = true;
    this.emit('started');
  }

  /**
   * 停止指标收集
   */
  stop(): void {
    if (!this.isCollecting) {
      return;
    }

    this.logger.info('Stopping metrics collection...');

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }

    this.isCollecting = false;
    this.emit('stopped');
  }

  /**
   * 注册指标收集器
   */
  registerCollector(collector: MetricsCollector): void {
    const name = collector.getName();
    this.collectors.set(name, collector);
    this.logger.debug(`Registered metrics collector: ${name}`);
  }

  /**
   * 注销指标收集器
   */
  unregisterCollector(name: string): void {
    this.collectors.delete(name);
    this.logger.debug(`Unregistered metrics collector: ${name}`);
  }

  /**
   * 记录指标值
   */
  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
    timestamp?: number
  ): void {
    const dataPoint: MetricDataPoint = {
      timestamp: timestamp || Date.now(),
      value,
      labels
    };

    let series = this.timeSeries.get(name);
    if (!series) {
      series = {
        name,
        dataPoints: [],
        maxDataPoints: this.config.maxDataPoints || 1000
      };
      this.timeSeries.set(name, series);
    }

    series.dataPoints.push(dataPoint);

    // 限制数据点数量
    if (series.dataPoints.length > series.maxDataPoints) {
      series.dataPoints.shift();
    }

    this.emit('metric-recorded', { name, dataPoint });
  }

  /**
   * 收集所有指标
   */
  async collectAll(): Promise<void> {
    const timestamp = Date.now();

    for (const [name, collector] of this.collectors) {
      try {
        const metrics = await collector.collect();
        const labels = collector.getLabels();

        for (const [metricName, value] of Object.entries(metrics)) {
          const fullName = `${name}.${metricName}`;
          this.recordMetric(fullName, value, labels, timestamp);
        }
      } catch (error) {
        this.logger.error(
          `Failed to collect metrics from ${name}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    this.emit('collection-completed', {
      timestamp,
      collectorCount: this.collectors.size
    });
  }

  /**
   * 获取指标时间序列
   */
  getTimeSeries(name: string): TimeSeries | undefined {
    return this.timeSeries.get(name);
  }

  /**
   * 获取所有时间序列
   */
  getAllTimeSeries(): Map<string, TimeSeries> {
    return new Map(this.timeSeries);
  }

  /**
   * 获取最新指标值
   */
  getLatestMetric(name: string): MetricDataPoint | undefined {
    const series = this.timeSeries.get(name);
    if (!series || series.dataPoints.length === 0) {
      return undefined;
    }
    return series.dataPoints[series.dataPoints.length - 1];
  }

  /**
   * 获取指标统计信息
   */
  getMetricStats(
    name: string,
    timeRange?: { start: number; end: number }
  ):
    | {
        count: number;
        min: number;
        max: number;
        avg: number;
        sum: number;
      }
    | undefined {
    const series = this.timeSeries.get(name);
    if (!series || series.dataPoints.length === 0) {
      return undefined;
    }

    let dataPoints = series.dataPoints;

    // 过滤时间范围
    if (timeRange) {
      dataPoints = dataPoints.filter(
        (point) =>
          point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
      );
    }

    if (dataPoints.length === 0) {
      return undefined;
    }

    const values = dataPoints.map((point) => point.value);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      sum
    };
  }

  /**
   * 清除指标数据
   */
  clearMetrics(name?: string): void {
    if (name) {
      this.timeSeries.delete(name);
    } else {
      this.timeSeries.clear();
    }
  }

  /**
   * 导出指标数据
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusFormat();
    }

    return this.exportJsonFormat();
  }

  /**
   * 导出JSON格式
   */
  private exportJsonFormat(): string {
    const data: Record<string, any> = {};

    for (const [name, series] of this.timeSeries) {
      data[name] = {
        name: series.name,
        dataPoints: series.dataPoints,
        latest: this.getLatestMetric(name),
        stats: this.getMetricStats(name)
      };
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * 导出Prometheus格式
   */
  private exportPrometheusFormat(): string {
    const lines: string[] = [];

    for (const [name, series] of this.timeSeries) {
      const latest = this.getLatestMetric(name);
      if (!latest) continue;

      const metricName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      let line = `${metricName}`;

      if (latest.labels && Object.keys(latest.labels).length > 0) {
        const labelPairs = Object.entries(latest.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        line += `{${labelPairs}}`;
      }

      line += ` ${latest.value} ${latest.timestamp}`;
      lines.push(line);
    }

    return lines.join('\n');
  }
}

// 队列指标收集器
export class QueueMetricsCollector implements MetricsCollector {
  constructor(
    private queueName: string,
    private getQueueStats: () => Promise<QueueStats>
  ) {}

  async collect(): Promise<Record<string, number>> {
    const stats = await this.getQueueStats();

    return {
      messages_total: stats.total,
      messages_pending: stats.pending,
      messages_processing: stats.processing,
      messages_completed: stats.completed,
      messages_failed: stats.failed,
      messages_retrying: stats.retrying,
      messages_dead_letter: stats.deadLetter,
      throughput_sent: stats.throughput.sent,
      throughput_processed: stats.throughput.processed,
      throughput_failed: stats.throughput.failed,
      latency_p50: stats.latency.p50,
      latency_p95: stats.latency.p95,
      latency_p99: stats.latency.p99,
      latency_avg: stats.latency.avg,
      consumers_active: stats.consumers.active,
      consumers_idle: stats.consumers.idle,
      consumers_total: stats.consumers.total,
      memory_used: stats.memory.used,
      memory_peak: stats.memory.peak
    };
  }

  getName(): string {
    return `queue_${this.queueName}`;
  }

  getLabels(): Record<string, string> {
    return {
      queue: this.queueName,
      type: 'queue'
    };
  }
}

// 系统指标收集器
export class SystemMetricsCollector implements MetricsCollector {
  async collect(): Promise<Record<string, number>> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory_rss: memUsage.rss,
      memory_heap_used: memUsage.heapUsed,
      memory_heap_total: memUsage.heapTotal,
      memory_external: memUsage.external,
      cpu_user: cpuUsage.user,
      cpu_system: cpuUsage.system,
      uptime: process.uptime(),
      event_loop_lag: await this.measureEventLoopLag()
    };
  }

  getName(): string {
    return 'system';
  }

  getLabels(): Record<string, string> {
    return {
      type: 'system',
      node_version: process.version,
      platform: process.platform
    };
  }

  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6; // 转换为毫秒
        resolve(lag);
      });
    });
  }
}

// 生产者指标收集器
export class ProducerMetricsCollector implements MetricsCollector {
  constructor(
    private producerName: string,
    private getProducerMetrics: () => ProducerMetrics
  ) {}

  async collect(): Promise<Record<string, number>> {
    const metrics = this.getProducerMetrics();

    return {
      messages_sent: metrics.messagesSent,
      messages_per_second: metrics.messagesPerSecond,
      average_latency: metrics.averageLatency,
      error_rate: metrics.errorRate,
      batches_sent: metrics.batchesSent,
      average_batch_size: metrics.averageBatchSize,
      last_sent_at: metrics.lastSentAt || 0
    };
  }

  getName(): string {
    return `producer_${this.producerName}`;
  }

  getLabels(): Record<string, string> {
    return {
      producer: this.producerName,
      type: 'producer'
    };
  }
}

// 消费者指标收集器
export class ConsumerMetricsCollector implements MetricsCollector {
  constructor(
    private consumerName: string,
    private getConsumerMetrics: () => ConsumerMetrics
  ) {}

  async collect(): Promise<Record<string, number>> {
    const metrics = this.getConsumerMetrics();

    return {
      messages_processed: metrics.messagesProcessed,
      messages_per_second: metrics.messagesPerSecond,
      average_processing_time: metrics.averageProcessingTime,
      error_rate: metrics.errorRate,
      pending_messages: metrics.pendingMessages,
      consumer_lag: metrics.consumerLag,
      last_processed_at: metrics.lastProcessedAt || 0
    };
  }

  getName(): string {
    return `consumer_${this.consumerName}`;
  }

  getLabels(): Record<string, string> {
    return {
      consumer: this.consumerName,
      type: 'consumer'
    };
  }
}

// 便捷函数
export const createMetricsAggregator = (config?: {
  collectionInterval?: number;
  maxDataPoints?: number;
  enableAutoCollection?: boolean;
}): MetricsAggregator => {
  return new MetricsAggregator(config);
};
