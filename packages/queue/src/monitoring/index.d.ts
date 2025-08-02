/**
 * 监控模块统一导出
 */
export { ConsumerMetricsCollector, createMetricsAggregator, MetricsAggregator, ProducerMetricsCollector, QueueMetricsCollector, SystemMetricsCollector } from './metrics.js';
export { BaseHealthCheck, createHealthMonitor, EventLoopHealthCheck, HealthMonitor, MemoryHealthCheck, QueueHealthCheck, RedisHealthCheck } from './health.js';
export { AlertManager } from './alerts.js';
export { PerformanceMonitor, PerformanceWindow, withPerformanceMonitoring } from './performance.js';
export type { MetricDataPoint, MetricsCollector, TimeSeries } from './metrics.js';
export type { HealthCheckConfig, HealthCheckItem, HealthCheckResult } from './health.js';
//# sourceMappingURL=index.d.ts.map