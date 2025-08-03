/**
 * 网关控制器
 * 负责网关管理和代理路由的注册
 */

import { Controller, Get } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Logger } from '@stratix/core';
import type { IProxyService } from '../services/ProxyService.js';
import type { IAuthMiddleware } from '../middlewares/AuthMiddleware.js';

@Controller()
export default class GatewayController {
  constructor(
    private proxyService: IProxyService,
    private authMiddleware: IAuthMiddleware,
    private logger: Logger
  ) {}

  /**
   * 网关状态检查
   */
  @Get('/api/gateway/status')
  async getGatewayStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const proxyHealth = await this.proxyService.healthCheck();
      const whitelistPaths = this.authMiddleware.getWhitelistPaths();

      const status = {
        gateway: {
          status: 'healthy',
          version: '1.0.0',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        },
        proxy: {
          healthy: proxyHealth.healthy,
          routes: proxyHealth.routes,
          message: proxyHealth.message
        },
        auth: {
          whitelistPaths: whitelistPaths.length,
          paths: whitelistPaths
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage(),
          pid: process.pid
        }
      };

      this.logger.debug('Gateway status requested', {
        requestId: (request as any).requestId,
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
   * 获取代理路由信息
   */
  @Get('/api/gateway/routes')
  async getProxyRoutes(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 这里需要从配置中获取路由信息
      // 由于ProxyService中没有直接暴露路由配置，我们需要添加这个方法
      const routeInfo = {
        total: 0,
        enabled: 0,
        routes: []
      };

      this.logger.debug('Proxy routes requested', {
        requestId: (request as any).requestId,
        ip: request.ip
      });

      return reply.send({
        success: true,
        data: routeInfo
      });

    } catch (error) {
      this.logger.error('Failed to get proxy routes:', error);
      
      return reply.code(500).send({
        success: false,
        error: 'ROUTES_ERROR',
        message: '获取代理路由失败'
      });
    }
  }

  /**
   * 网关配置信息
   */
  @Get('/api/gateway/config')
  async getGatewayConfig(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 返回脱敏的配置信息
      const config = {
        auth: {
          enabled: true,
          cookieName: 'wps_jwt_token',
          whitelistPaths: this.authMiddleware.getWhitelistPaths()
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
        requestId: (request as any).requestId,
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
  async getGatewayMetrics(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
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
        requestId: (request as any).requestId,
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
   * 生命周期方法 - 控制器就绪
   */
  async onReady(): Promise<void> {
    this.logger.info('✅ GatewayController is ready');
  }

  /**
   * 生命周期方法 - 控制器关闭
   */
  async onClose(): Promise<void> {
    this.logger.info('🔄 GatewayController is closing');
  }
}
