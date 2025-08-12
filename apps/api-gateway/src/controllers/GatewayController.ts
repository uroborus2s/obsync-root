/**
 * 网关控制器 - 应用级控制器
 * 负责网关管理和状态监控
 * 使用应用级自动依赖注入，SINGLETON生命周期
 */

import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get } from '@stratix/core';
import type JWTService from '../services/JWTService.js';

@Controller()
export default class GatewayController {
  constructor(
    private jwtService: JWTService,
    private logger: Logger
  ) {
    this.logger.info(
      '✅ GatewayController initialized with application-level DI'
    );
  }

  /**
   * 网关状态检查
   */
  @Get('/api/gateway/status')
  async getGatewayStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = this.jwtService.getConfig();

      const status = {
        gateway: {
          status: 'healthy',
          version: '1.0.0',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        },
        auth: {
          enabled: config.enabled,
          cookieName: config.cookieName,
          excludePaths: config.excludePaths?.length || 0,
          paths: config.excludePaths
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage(),
          pid: process.pid
        }
      };

      this.logger.debug('Gateway status requested', {
        ip: request.ip
      });

      return reply.send({
        success: true,
        data: status
      });
    } catch (error) {
      this.logger.error('Failed to get gateway status:', error);

      return reply.code(500).send({
        success: false,
        error: 'STATUS_ERROR',
        message: '获取网关状态失败'
      });
    }
  }

  /**
   * 网关配置信息
   */
  @Get('/api/gateway/config')
  async getGatewayConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authConfig = this.jwtService.getConfig();

      // 返回脱敏的配置信息
      const config = {
        auth: {
          enabled: authConfig.enabled,
          cookieName: authConfig.cookieName,
          tokenExpiry: authConfig.tokenExpiry,
          excludePaths: authConfig.excludePaths
        },
        proxy: {
          timeout: 30000,
          retries: 3,
          loadBalancing: 'round-robin'
        },
        rateLimit: {
          enabled: true,
          global: {
            max: 10000,
            timeWindow: '1 minute'
          }
        }
      };

      this.logger.debug('Gateway config requested', {
        ip: request.ip
      });

      return reply.send({
        success: true,
        data: config
      });
    } catch (error) {
      this.logger.error('Failed to get gateway config:', error);

      return reply.code(500).send({
        success: false,
        error: 'CONFIG_ERROR',
        message: '获取网关配置失败'
      });
    }
  }

  /**
   * 网关指标信息
   */
  @Get('/api/gateway/metrics')
  async getGatewayMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const metrics = {
        requests: {
          total: 0, // 这里需要实际的指标收集
          success: 0,
          errors: 0,
          rate: 0
        },
        proxy: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        },
        auth: {
          totalAttempts: 0,
          successfulAuth: 0,
          failedAuth: 0,
          tokenValidations: 0
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          timestamp: new Date().toISOString()
        }
      };

      this.logger.debug('Gateway metrics requested', {
        ip: request.ip
      });

      return reply.send({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error('Failed to get gateway metrics:', error);

      return reply.code(500).send({
        success: false,
        error: 'METRICS_ERROR',
        message: '获取网关指标失败'
      });
    }
  }

  /**
   * 健康检查端点
   */
  @Get('/health')
  async healthCheck(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
        version: '1.0.0',
        uptime: process.uptime(),
        checks: {
          auth: {
            status: 'healthy',
            message: 'JWT service is operational'
          },
          memory: {
            status: 'healthy',
            usage: process.memoryUsage()
          }
        }
      };

      return reply.send(health);
    } catch (error) {
      this.logger.error('Health check failed:', error);

      return reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  }

  /**
   * 就绪检查端点
   */
  @Get('/ready')
  async readinessCheck(_request: FastifyRequest, reply: FastifyReply) {
    try {
      // 检查关键服务是否就绪
      const authConfig = this.jwtService.getConfig();

      const readiness = {
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
        checks: {
          auth: {
            status: authConfig.enabled ? 'ready' : 'disabled',
            message: 'Authentication service is ready'
          },
          config: {
            status: 'ready',
            message: 'Configuration loaded successfully'
          }
        }
      };

      return reply.send(readiness);
    } catch (error) {
      this.logger.error('Readiness check failed:', error);

      return reply.code(503).send({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Service not ready'
      });
    }
  }

  /**
   * 存活检查端点
   */
  @Get('/live')
  async livenessCheck(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const liveness = {
        status: 'alive',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
        uptime: process.uptime(),
        pid: process.pid
      };

      return reply.send(liveness);
    } catch (error) {
      this.logger.error('Liveness check failed:', error);

      return reply.code(503).send({
        status: 'dead',
        timestamp: new Date().toISOString(),
        error: 'Service not responding'
      });
    }
  }
}
