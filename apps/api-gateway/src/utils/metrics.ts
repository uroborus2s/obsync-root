/**
 * 性能监控和指标收集工具
 * 基于 prom-client 实现 Prometheus 指标
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Counter, Gauge, Histogram, register } from 'prom-client';

/**
 * 请求计数器
 */
export const requestCounter = new Counter({
  name: 'gateway_requests_total',
  help: 'Total number of requests',
  labelNames: ['method', 'route', 'status_code', 'service']
});

/**
 * 请求持续时间直方图
 */
export const requestDuration = new Histogram({
  name: 'gateway_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'route', 'service'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

/**
 * 代理请求计数器
 */
export const proxyRequestCounter = new Counter({
  name: 'gateway_proxy_requests_total',
  help: 'Total number of proxy requests',
  labelNames: ['service', 'status_code', 'error_type']
});

/**
 * 代理请求持续时间
 */
export const proxyRequestDuration = new Histogram({
  name: 'gateway_proxy_request_duration_seconds',
  help: 'Proxy request duration in seconds',
  labelNames: ['service'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

/**
 * 认证请求计数器
 */
export const authCounter = new Counter({
  name: 'gateway_auth_requests_total',
  help: 'Total number of authentication requests',
  labelNames: ['result', 'error_type']
});

/**
 * 认证持续时间
 */
export const authDuration = new Histogram({
  name: 'gateway_auth_duration_seconds',
  help: 'Authentication duration in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

/**
 * 活跃连接数
 */
export const activeConnections = new Gauge({
  name: 'gateway_active_connections',
  help: 'Number of active connections'
});

/**
 * 服务健康状态
 */
export const serviceHealth = new Gauge({
  name: 'gateway_service_health',
  help: 'Service health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['service']
});

/**
 * 缓存命中率
 */
export const cacheHitRate = new Counter({
  name: 'gateway_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type', 'result']
});

/**
 * 错误计数器
 */
export const errorCounter = new Counter({
  name: 'gateway_errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'service', 'route']
});

/**
 * 内存使用情况
 */
export const memoryUsage = new Gauge({
  name: 'gateway_memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});

/**
 * CPU 使用情况
 */
export const cpuUsage = new Gauge({
  name: 'gateway_cpu_usage_percent',
  help: 'CPU usage percentage'
});

/**
 * 🔧 修复：移除定时器，改为被动收集系统指标
 * 仅在请求时收集当前系统状态
 */
function collectCurrentSystemMetrics(): void {
  const memUsage = process.memoryUsage();
  memoryUsage.set({ type: 'rss' }, memUsage.rss);
  memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
  memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
  memoryUsage.set({ type: 'external' }, memUsage.external);

  // CPU 使用率（简化版本）
  const usage = process.cpuUsage();
  const totalUsage = usage.user + usage.system;
  cpuUsage.set(totalUsage / 1000000); // 转换为秒
}

/**
 * 初始化指标收集（仅注册指标，不启动定时器）
 */
export function initializeMetrics(): void {
  console.log('Metrics collection initialized (passive mode)');
}

/**
 * 🔧 修复：移除定时器清理函数（不再需要）
 */
export function cleanupMetrics(): void {
  console.log('Metrics cleanup completed (no timers to clean)');
}

/**
 * 创建请求监控中间件
 */
export function createMetricsMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    // 使用URL路径作为路由标识，去除查询参数
    const route = request.url.split('?')[0];

    // 增加活跃连接数
    activeConnections.inc();

    // 监听响应完成事件
    reply.raw.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = reply.statusCode.toString();

      // 记录请求指标
      requestCounter.inc({
        method: request.method,
        route,
        status_code: statusCode,
        service: 'gateway'
      });

      requestDuration.observe(
        {
          method: request.method,
          route,
          service: 'gateway'
        },
        duration
      );

      // 减少活跃连接数
      activeConnections.dec();

      // 记录错误
      if (reply.statusCode >= 400) {
        const errorType =
          reply.statusCode >= 500 ? 'server_error' : 'client_error';
        errorCounter.inc({
          error_type: errorType,
          service: 'gateway',
          route
        });
      }
    });
  };
}

/**
 * 记录代理请求指标
 */
export function recordProxyMetrics(
  service: string,
  duration: number,
  statusCode: number,
  error?: string
): void {
  const labels = {
    service,
    status_code: statusCode.toString(),
    error_type: error || 'none'
  };

  proxyRequestCounter.inc(labels);
  proxyRequestDuration.observe({ service }, duration / 1000);

  if (statusCode >= 400) {
    errorCounter.inc({
      error_type:
        statusCode >= 500 ? 'proxy_server_error' : 'proxy_client_error',
      service,
      route: 'proxy'
    });
  }
}

/**
 * 记录认证指标
 */
export function recordAuthMetrics(
  result: 'success' | 'failure',
  duration: number,
  errorType?: string
): void {
  authCounter.inc({
    result,
    error_type: errorType || 'none'
  });

  authDuration.observe(duration / 1000);
}

/**
 * 记录缓存指标
 */
export function recordCacheMetrics(
  cacheType: string,
  result: 'hit' | 'miss'
): void {
  cacheHitRate.inc({
    cache_type: cacheType,
    result
  });
}

/**
 * 更新服务健康状态指标
 */
export function updateServiceHealthMetric(
  service: string,
  isHealthy: boolean
): void {
  serviceHealth.set({ service }, isHealthy ? 1 : 0);
}

/**
 * 🔧 修复：获取所有指标（被动模式，请求时收集系统状态）
 */
export async function getMetrics(): Promise<string> {
  // 在返回指标前，收集当前系统状态
  collectCurrentSystemMetrics();
  return register.metrics();
}

/**
 * 创建指标端点处理器
 */
export function createMetricsHandler() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = await getMetrics();
      reply.type('text/plain').send(metrics);
    } catch (error) {
      request.log.error('Failed to get metrics', error);
      reply.code(500).send({
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
}

/**
 * 清理指标
 */
export function clearMetrics(): void {
  register.clear();
}
