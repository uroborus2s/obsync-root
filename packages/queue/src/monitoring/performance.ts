/**
 * 性能监控器
 * 提供队列系统的性能监控和分析功能
 */

import { EventEmitter } from 'events';
import { createLogger, Logger } from '../utils/index.js';
import type { MetricsCollector } from './metrics.js';

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  // 吞吐量指标
  throughput: {
    messagesPerSecond: number;
    bytesPerSecond: number;
    peakMessagesPerSecond: number;
    averageMessagesPerSecond: number;
  };

  // 延迟指标
  latency: {
    p50: number; // 50th percentile
    p95: number; // 95th percentile
    p99: number; // 99th percentile
    average: number;
    max: number;
  };

  // 资源使用指标
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    connectionCount: number;
    queueDepth: number;
  };

  // 错误率指标
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
export class PerformanceWindow {
  private samples: PerformanceSample[] = [];
  private readonly maxSamples: number;
  private readonly windowDuration: number;

  constructor(maxSamples = 10000, windowDuration = 300000) {
    // 5分钟窗口
    this.maxSamples = maxSamples;
    this.windowDuration = windowDuration;
  }

  /**
   * 添加性能样本
   */
  addSample(sample: PerformanceSample): void {
    this.samples.push(sample);

    // 清理过期样本
    this.cleanup();

    // 限制样本数量
    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(-this.maxSamples);
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    const now = Date.now();
    const recentSamples = this.samples.filter(
      (sample) => now - sample.timestamp <= this.windowDuration
    );

    return {
      throughput: this.calculateThroughput(recentSamples),
      latency: this.calculateLatency(recentSamples),
      resources: this.calculateResourceUsage(recentSamples),
      errorRate: this.calculateErrorRate(recentSamples)
    };
  }

  /**
   * 计算吞吐量指标
   */
  private calculateThroughput(
    samples: PerformanceSample[]
  ): PerformanceMetrics['throughput'] {
    if (samples.length === 0) {
      return {
        messagesPerSecond: 0,
        bytesPerSecond: 0,
        peakMessagesPerSecond: 0,
        averageMessagesPerSecond: 0
      };
    }

    const timeSpan = this.windowDuration / 1000; // 转换为秒
    const messageCount = samples.length;
    const messagesPerSecond = messageCount / timeSpan;

    // 计算字节数（如果有的话）
    const totalBytes = samples.reduce((sum, sample) => {
      return sum + (sample.metadata?.bytes || 0);
    }, 0);
    const bytesPerSecond = totalBytes / timeSpan;

    // 计算峰值（每秒钟的最大消息数）
    const secondBuckets = new Map<number, number>();
    samples.forEach((sample) => {
      const second = Math.floor(sample.timestamp / 1000);
      secondBuckets.set(second, (secondBuckets.get(second) || 0) + 1);
    });
    const peakMessagesPerSecond = Math.max(
      ...Array.from(secondBuckets.values()),
      0
    );

    return {
      messagesPerSecond,
      bytesPerSecond,
      peakMessagesPerSecond,
      averageMessagesPerSecond: messagesPerSecond
    };
  }

  /**
   * 计算延迟指标
   */
  private calculateLatency(
    samples: PerformanceSample[]
  ): PerformanceMetrics['latency'] {
    if (samples.length === 0) {
      return { p50: 0, p95: 0, p99: 0, average: 0, max: 0 };
    }

    const durations = samples.map((s) => s.duration).sort((a, b) => a - b);
    const count = durations.length;

    return {
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
      average: durations.reduce((sum, d) => sum + d, 0) / count,
      max: durations[count - 1] || 0
    };
  }

  /**
   * 计算资源使用指标
   */
  private calculateResourceUsage(
    samples: PerformanceSample[]
  ): PerformanceMetrics['resources'] {
    // 这里应该从系统监控中获取实际的资源使用情况
    // 目前返回模拟数据
    return {
      cpuUsage: process.cpuUsage().user / 1000000, // 转换为秒
      memoryUsage: process.memoryUsage().heapUsed,
      connectionCount: samples.length > 0 ? 1 : 0, // 简化实现
      queueDepth: samples.filter((s) => s.operation === 'enqueue').length
    };
  }

  /**
   * 计算错误率指标
   */
  private calculateErrorRate(
    samples: PerformanceSample[]
  ): PerformanceMetrics['errorRate'] {
    const totalSamples = samples.length;
    const errorSamples = samples.filter((s) => !s.success);
    const errorCount = errorSamples.length;

    const byType: Record<string, number> = {};
    errorSamples.forEach((sample) => {
      const errorType = sample.error || 'unknown';
      byType[errorType] = (byType[errorType] || 0) + 1;
    });

    return {
      total: errorCount,
      percentage: totalSamples > 0 ? (errorCount / totalSamples) * 100 : 0,
      byType
    };
  }

  /**
   * 计算百分位数
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * 清理过期样本
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.windowDuration;
    this.samples = this.samples.filter((sample) => sample.timestamp >= cutoff);
  }
}

/**
 * 性能监控器
 */
export class PerformanceMonitor
  extends EventEmitter
  implements MetricsCollector
{
  private window: PerformanceWindow;
  private logger: Logger;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    private readonly config: {
      windowDuration?: number;
      maxSamples?: number;
      reportingInterval?: number;
    } = {}
  ) {
    super();

    this.window = new PerformanceWindow(
      config.maxSamples || 10000,
      config.windowDuration || 300000
    );

    this.logger = createLogger({
      level: 1,
      format: 'json'
    });
  }

  /**
   * 启动性能监控
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.logger.info('Starting performance monitoring...');

    const reportingInterval = this.config.reportingInterval || 60000; // 1分钟
    this.monitoringInterval = setInterval(() => {
      const metrics = this.window.getMetrics();
      this.emit('metrics', metrics);
    }, reportingInterval);

    this.isMonitoring = true;
    this.emit('started');
  }

  /**
   * 停止性能监控
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.info('Stopping performance monitoring...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.isMonitoring = false;
    this.emit('stopped');
  }

  /**
   * 记录操作性能
   */
  recordOperation(
    operation: string,
    duration: number,
    success: boolean,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    const sample: PerformanceSample = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
      error,
      metadata
    };

    this.window.addSample(sample);
  }

  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): PerformanceMetrics {
    return this.window.getMetrics();
  }

  /**
   * 实现MetricsCollector接口
   */
  async collect(): Promise<Record<string, number>> {
    const metrics = this.getCurrentMetrics();

    return {
      'performance.throughput.messages_per_second':
        metrics.throughput.messagesPerSecond,
      'performance.throughput.bytes_per_second':
        metrics.throughput.bytesPerSecond,
      'performance.throughput.peak_messages_per_second':
        metrics.throughput.peakMessagesPerSecond,
      'performance.latency.p50': metrics.latency.p50,
      'performance.latency.p95': metrics.latency.p95,
      'performance.latency.p99': metrics.latency.p99,
      'performance.latency.average': metrics.latency.average,
      'performance.latency.max': metrics.latency.max,
      'performance.resources.cpu_usage': metrics.resources.cpuUsage,
      'performance.resources.memory_usage': metrics.resources.memoryUsage,
      'performance.resources.connection_count':
        metrics.resources.connectionCount,
      'performance.resources.queue_depth': metrics.resources.queueDepth,
      'performance.error_rate.total': metrics.errorRate.total,
      'performance.error_rate.percentage': metrics.errorRate.percentage
    };
  }

  getName(): string {
    return 'performance-monitor';
  }

  getLabels(): Record<string, string> {
    return {
      component: 'queue',
      monitor_type: 'performance'
    };
  }
}

/**
 * 性能装饰器 - 用于自动记录函数执行性能
 */
export function withPerformanceMonitoring(
  monitor: PerformanceMonitor,
  operationName: string
) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      let success = true;
      let error: string | undefined;

      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        throw err;
      } finally {
        const duration = Date.now() - startTime;
        monitor.recordOperation(operationName, duration, success, error);
      }
    } as T;

    return descriptor;
  };
}
