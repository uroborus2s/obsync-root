/**
 * 监控插件
 * 初始化健康检查和指标收集
 */

import type { FastifyInstance } from '@stratix/core';
import {
  createHealthCheckHandler,
  initializeHealthChecks
} from '../utils/healthCheck.js';
import {
  createMetricsHandler,
  createMetricsMiddleware,
  initializeMetrics
} from '../utils/metrics.js';

/**
 * 监控插件
 */
export default async function monitoringPlugin(
  fastify: FastifyInstance,
  options: any
) {
  // 初始化指标收集
  initializeMetrics();

  // 初始化健康检查
  initializeHealthChecks();

  // 添加指标中间件
  fastify.addHook('onRequest', createMetricsMiddleware());

  // 注册健康检查路由
  fastify.get('/health', createHealthCheckHandler());

  // 🔧 新增：简化的健康检查端点（仅检查网关自身状态）
  fastify.get('/health/simple', async (request, reply) => {
    try {
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.GATEWAY_VERSION || '1.0.0'
      });
    } catch (error) {
      request.log.error('Simple health check error', error);
      return reply.code(500).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 注册指标路由
  fastify.get('/metrics', createMetricsHandler());

  // 注册详细健康检查路由
  fastify.get('/health/detailed', async (request, reply) => {
    try {
      const { healthCheckManager } = await import('../utils/healthCheck.js');
      const services = healthCheckManager.getAllServicesHealth();

      return reply.send({
        timestamp: new Date().toISOString(),
        services,
        gateway: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.GATEWAY_VERSION || '1.0.0',
          nodeVersion: process.version,
          platform: process.platform
        }
      });
    } catch (error) {
      request.log.error('Detailed health check error', error);
      return reply.code(500).send({
        error: 'Health check failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 注册服务状态路由
  fastify.get('/status', async (request, reply) => {
    try {
      const { healthCheckManager } = await import('../utils/healthCheck.js');
      const services = healthCheckManager.getAllServicesHealth();
      const overallStatus = services.every(
        (service) => service.status === 'healthy'
      )
        ? 'healthy'
        : 'degraded';

      return reply.send({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: services.map((service) => ({
          name: service.name,
          status: service.status,
          lastCheck: service.lastCheck
        }))
      });
    } catch (error) {
      request.log.error('Status check error', error);
      return reply.code(500).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 🔧 修复：应用关闭时的清理机制（移除不必要的metrics清理）
  fastify.addHook('onClose', async () => {
    try {
      // 清理健康检查定时器
      const { healthCheckManager } = await import('../utils/healthCheck.js');
      healthCheckManager.shutdown();

      fastify.log.info('Monitoring plugin cleanup completed');
    } catch (error) {
      fastify.log.error('Monitoring plugin cleanup failed:', error);
    }
  });

  fastify.log.info('Monitoring plugin initialized');
}
