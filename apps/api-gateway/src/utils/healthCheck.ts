/**
 * 健康检查工具
 * 用于监控后端服务的健康状态
 */

import type { FastifyRequest, FastifyReply } from '@stratix/core';

/**
 * 服务健康状态接口
 */
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  lastCheck: string;
  uptime?: number;
}

/**
 * 健康检查配置接口
 */
export interface HealthCheckConfig {
  name: string;
  url: string;
  timeout: number;
  interval: number;
  retries: number;
  expectedStatus?: number;
  headers?: Record<string, string>;
}

/**
 * 健康检查管理器
 */
export class HealthCheckManager {
  private services: Map<string, ServiceHealth> = new Map();
  private configs: Map<string, HealthCheckConfig> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 注册服务健康检查
   */
  registerService(config: HealthCheckConfig): void {
    this.configs.set(config.name, config);
    this.services.set(config.name, {
      name: config.name,
      status: 'unknown',
      lastCheck: new Date().toISOString()
    });

    // 启动定期健康检查
    this.startPeriodicCheck(config);
  }

  /**
   * 获取服务健康状态
   */
  getServiceHealth(serviceName: string): ServiceHealth | undefined {
    return this.services.get(serviceName);
  }

  /**
   * 获取所有服务健康状态
   */
  getAllServicesHealth(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  /**
   * 手动检查服务健康状态
   */
  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const config = this.configs.get(serviceName);
    if (!config) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    const startTime = Date.now();
    let health: ServiceHealth = {
      name: serviceName,
      status: 'unknown',
      lastCheck: new Date().toISOString()
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(config.url, {
        method: 'GET',
        headers: config.headers || {},
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const expectedStatus = config.expectedStatus || 200;

      if (response.status === expectedStatus) {
        health = {
          name: serviceName,
          status: 'healthy',
          responseTime,
          lastCheck: new Date().toISOString()
        };
      } else {
        health = {
          name: serviceName,
          status: 'unhealthy',
          responseTime,
          error: `Unexpected status code: ${response.status}`,
          lastCheck: new Date().toISOString()
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      health = {
        name: serviceName,
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
        lastCheck: new Date().toISOString()
      };
    }

    this.services.set(serviceName, health);
    return health;
  }

  /**
   * 启动定期健康检查
   */
  private startPeriodicCheck(config: HealthCheckConfig): void {
    // 清除现有的定时器
    const existingInterval = this.intervals.get(config.name);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // 启动新的定时器
    const interval = setInterval(async () => {
      try {
        await this.checkServiceHealth(config.name);
      } catch (error) {
        console.error(`Health check failed for ${config.name}:`, error);
      }
    }, config.interval);

    this.intervals.set(config.name, interval);

    // 立即执行一次检查
    this.checkServiceHealth(config.name).catch(error => {
      console.error(`Initial health check failed for ${config.name}:`, error);
    });
  }

  /**
   * 停止服务健康检查
   */
  unregisterService(serviceName: string): void {
    const interval = this.intervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(serviceName);
    }
    this.configs.delete(serviceName);
    this.services.delete(serviceName);
  }

  /**
   * 停止所有健康检查
   */
  shutdown(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.configs.clear();
    this.services.clear();
  }
}

/**
 * 全局健康检查管理器实例
 */
export const healthCheckManager = new HealthCheckManager();

/**
 * 初始化默认服务健康检查
 */
export function initializeHealthChecks(): void {
  // Tasks服务健康检查
  healthCheckManager.registerService({
    name: 'tasks',
    url: `${process.env.TASKS_SERVICE_PROTOCOL || 'http'}://${process.env.TASKS_SERVICE_HOST || 'localhost'}:${process.env.TASKS_SERVICE_PORT || '3001'}/health`,
    timeout: 5000,
    interval: 30000, // 30秒检查一次
    retries: 3,
    expectedStatus: 200
  });

  // 用户服务健康检查
  healthCheckManager.registerService({
    name: 'users',
    url: `${process.env.USER_SERVICE_PROTOCOL || 'http'}://${process.env.USER_SERVICE_HOST || 'localhost'}:${process.env.USER_SERVICE_PORT || '3002'}/health`,
    timeout: 5000,
    interval: 30000,
    retries: 3,
    expectedStatus: 200
  });
}

/**
 * 创建健康检查路由处理器
 */
export function createHealthCheckHandler() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const allServices = healthCheckManager.getAllServicesHealth();
      const overallStatus = allServices.every(service => service.status === 'healthy') ? 'healthy' : 'unhealthy';

      const response = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: allServices,
        gateway: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.GATEWAY_VERSION || '1.0.0'
        }
      };

      const statusCode = overallStatus === 'healthy' ? 200 : 503;
      return reply.code(statusCode).send(response);
    } catch (error) {
      request.log.error('Health check error', error);
      return reply.code(500).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}
