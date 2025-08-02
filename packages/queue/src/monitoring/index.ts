/**
 * 监控模块统一导出
 */

// 指标收集 - 具体导出避免循环依赖
export {
  ConsumerMetricsCollector,
  createMetricsAggregator,
  MetricsAggregator,
  ProducerMetricsCollector,
  QueueMetricsCollector,
  SystemMetricsCollector
} from './metrics.js';

// 健康检查
export {
  BaseHealthCheck,
  createHealthMonitor,
  EventLoopHealthCheck,
  HealthMonitor,
  MemoryHealthCheck,
  QueueHealthCheck,
  RedisHealthCheck
} from './health.js';

// 告警系统
export { AlertManager } from './alerts.js';

// 性能监控
export {
  PerformanceMonitor,
  PerformanceWindow,
  withPerformanceMonitoring
} from './performance.js';

// 重新导出主要类型 - 从正确的模块导出
export type {
  MetricDataPoint,
  MetricsCollector,
  TimeSeries
} from './metrics.js';

export type {
  HealthCheckConfig,
  HealthCheckItem,
  HealthCheckResult
} from './health.js';
