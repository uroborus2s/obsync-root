/**
 * 代理管理器
 * 统一管理所有代理服务的配置、状态和监控
 */

import type {
  GatewayStatus,
  ProxyError,
  ProxyErrorType,
  ProxyServiceConfig,
  ServiceHealth
} from '../types/gateway.js';
import { healthCheckManager } from '../utils/healthCheck.js';
import { updateServiceHealthMetric } from '../utils/metrics.js';

/**
 * 代理管理器类
 */
export class ProxyManager {
  private services: Map<string, ProxyServiceConfig> = new Map();
  private serviceStatus: Map<string, ServiceHealth> = new Map();

  /**
   * 注册代理服务
   */
  registerService(config: ProxyServiceConfig): void {
    this.services.set(config.name, config);

    // 初始化服务状态
    this.serviceStatus.set(config.name, {
      name: config.name,
      status: 'unknown',
      lastCheck: new Date().toISOString()
    });

    // 注册健康检查
    if (config.healthCheck) {
      healthCheckManager.registerService({
        name: config.name,
        url: config.healthCheck.url,
        timeout: config.healthCheck.timeout,
        interval: config.healthCheck.interval,
        retries: config.healthCheck.retries,
        expectedStatus: config.healthCheck.expectedStatus,
        headers: config.healthCheck.headers
      });
    }

    console.log(`Proxy service registered: ${config.name}`);
  }

  /**
   * 获取服务配置
   */
  getServiceConfig(serviceName: string): ProxyServiceConfig | undefined {
    return this.services.get(serviceName);
  }

  /**
   * 获取所有服务配置
   */
  getAllServices(): Map<string, ProxyServiceConfig> {
    return new Map(this.services);
  }

  /**
   * 获取所有服务配置（数组形式）
   */
  getAllServicesArray(): ProxyServiceConfig[] {
    return Array.from(this.services.values());
  }

  /**
   * 获取服务健康状态
   */
  getServiceHealth(serviceName: string): ServiceHealth | undefined {
    return healthCheckManager.getServiceHealth(serviceName);
  }

  /**
   * 获取所有服务健康状态
   */
  getAllServicesHealth(): ServiceHealth[] {
    return healthCheckManager.getAllServicesHealth();
  }

  /**
   * 检查服务是否健康
   */
  isServiceHealthy(serviceName: string): boolean {
    const health = this.getServiceHealth(serviceName);
    return health?.status === 'healthy';
  }

  /**
   * 获取网关整体状态
   */
  getGatewayStatus(): GatewayStatus {
    const services = this.getAllServicesHealth();
    const healthyServices = services.filter((s) => s.status === 'healthy');

    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (healthyServices.length === services.length) {
      status = 'healthy';
    } else if (healthyServices.length === 0) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.GATEWAY_VERSION || '1.0.0',
      services,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        pid: process.pid
      }
    };
  }

  /**
   * 更新服务健康状态
   */
  updateServiceHealth(serviceName: string, health: ServiceHealth): void {
    this.serviceStatus.set(serviceName, health);

    // 更新监控指标
    updateServiceHealthMetric(serviceName, health.status === 'healthy');
  }

  /**
   * 创建代理错误
   */
  createProxyError(
    type: ProxyErrorType,
    message: string,
    service: string,
    statusCode: number,
    originalError?: Error
  ): ProxyError {
    return {
      type,
      message,
      service,
      statusCode,
      originalError,
      retryAfter: this.getRetryAfter(type)
    };
  }

  /**
   * 获取重试建议时间
   */
  private getRetryAfter(errorType: ProxyErrorType): number | undefined {
    switch (errorType) {
      case 'CONNECTION_REFUSED':
      case 'SERVICE_UNAVAILABLE':
        return 30; // 30秒后重试
      case 'TIMEOUT':
        return 10; // 10秒后重试
      case 'RATE_LIMIT_EXCEEDED':
        return 60; // 1分钟后重试
      case 'CIRCUIT_BREAKER_OPEN':
        return 120; // 2分钟后重试
      default:
        return undefined;
    }
  }

  /**
   * 验证服务配置
   */
  validateServiceConfig(config: ProxyServiceConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.name) {
      errors.push('Service name is required');
    }

    if (!config.upstream) {
      errors.push('Upstream URL is required');
    } else {
      try {
        new URL(config.upstream);
      } catch {
        errors.push('Invalid upstream URL format');
      }
    }

    if (!config.prefix) {
      errors.push('Prefix is required');
    }

    if (config.timeout <= 0) {
      errors.push('Timeout must be greater than 0');
    }

    if (config.retries < 0) {
      errors.push('Retries must be non-negative');
    }

    if (!Array.isArray(config.httpMethods) || config.httpMethods.length === 0) {
      errors.push('At least one HTTP method must be specified');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats(serviceName: string): {
    name: string;
    isRegistered: boolean;
    isHealthy: boolean;
    lastHealthCheck?: string;
    responseTime?: number;
    uptime?: number;
  } {
    const config = this.getServiceConfig(serviceName);
    const health = this.getServiceHealth(serviceName);

    return {
      name: serviceName,
      isRegistered: !!config,
      isHealthy: health?.status === 'healthy',
      lastHealthCheck: health?.lastCheck,
      responseTime: health?.responseTime,
      uptime: health?.uptime
    };
  }

  /**
   * 注销服务
   */
  unregisterService(serviceName: string): boolean {
    const existed = this.services.has(serviceName);

    this.services.delete(serviceName);
    this.serviceStatus.delete(serviceName);
    healthCheckManager.unregisterService(serviceName);

    if (existed) {
      console.log(`Proxy service unregistered: ${serviceName}`);
    }

    return existed;
  }

  /**
   * 获取服务数量
   */
  getServiceCount(): number {
    return this.services.size;
  }

  /**
   * 清理所有服务
   */
  shutdown(): void {
    for (const serviceName of this.services.keys()) {
      this.unregisterService(serviceName);
    }
    console.log('Proxy manager shutdown completed');
  }
}

/**
 * 全局代理管理器实例
 */
export const proxyManager = new ProxyManager();

/**
 * 初始化默认代理服务
 */
export function initializeProxyServices(): void {
  // Tasks服务
  proxyManager.registerService({
    name: 'workflows',
    upstream: `${process.env.TASKS_SERVICE_PROTOCOL || 'http'}://${process.env.TASKS_SERVICE_HOST || 'localhost'}:${process.env.TASKS_SERVICE_PORT || '3001'}`,
    prefix: '/api/workflows',
    rewritePrefix: '/api/workflows',
    requireAuth: true,
    timeout: parseInt(process.env.TASKS_SERVICE_TIMEOUT || '30000'),
    retries: parseInt(process.env.TASKS_SERVICE_RETRIES || '3'),
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers: {
      'x-forwarded-by': 'stratix-gateway'
    },
    healthCheck: {
      url: `${process.env.TASKS_SERVICE_PROTOCOL || 'http'}://${process.env.TASKS_SERVICE_HOST || 'localhost'}:${process.env.TASKS_SERVICE_PORT || '3001'}/health`,
      interval: 30000,
      timeout: 5000,
      retries: 3,
      expectedStatus: 200
    }
  });

  // 用户服务
  proxyManager.registerService({
    name: 'users',
    upstream: `${process.env.USER_SERVICE_PROTOCOL || 'http'}://${process.env.USER_SERVICE_HOST || 'localhost'}:${process.env.USER_SERVICE_PORT || '3002'}`,
    prefix: '/api/users',
    rewritePrefix: '/api/users',
    requireAuth: true,
    timeout: parseInt(process.env.USER_SERVICE_TIMEOUT || '30000'),
    retries: parseInt(process.env.USER_SERVICE_RETRIES || '3'),
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers: {
      'x-forwarded-by': 'stratix-gateway'
    },
    healthCheck: {
      url: `${process.env.USER_SERVICE_PROTOCOL || 'http'}://${process.env.USER_SERVICE_HOST || 'localhost'}:${process.env.USER_SERVICE_PORT || '3002'}/health`,
      interval: 30000,
      timeout: 5000,
      retries: 3,
      expectedStatus: 200
    }
  });

  console.log('Default proxy services initialized');
}
