/**
 * 代理状态监控控制器
 * 提供代理功能的状态监控和管理接口
 */

import {
  Controller,
  Get,
  type FastifyReply,
  type FastifyRequest,
  type Logger
} from '@stratix/core';

/**
 * 代理状态监控控制器
 */
@Controller()
export default class ProxyStatusController {
  constructor(private logger: Logger) {
    this.logger.info('✅ ProxyStatusController initialized');
  }

  /**
   * 获取代理状态
   */
  @Get('/proxy/status')
  async getProxyStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const status = {
        initialized: true,
        services: [
          {
            name: 'tasks',
            prefix: '/api/tasks',
            upstream: `${process.env.TASKS_SERVICE_PROTOCOL || 'http'}://${process.env.TASKS_SERVICE_HOST || 'localhost'}:${process.env.TASKS_SERVICE_PORT || '3001'}`,
            status: 'active',
            timeout: parseInt(process.env.TASKS_SERVICE_TIMEOUT || '30000'),
            retries: parseInt(process.env.TASKS_SERVICE_RETRIES || '3')
          }
        ],
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'development',
          TASKS_SERVICE_HOST: process.env.TASKS_SERVICE_HOST || 'localhost',
          TASKS_SERVICE_PORT: process.env.TASKS_SERVICE_PORT || '3001',
          TASKS_SERVICE_PROTOCOL: process.env.TASKS_SERVICE_PROTOCOL || 'http'
        },
        configuration: {
          enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
          enableResponseLogging: process.env.ENABLE_RESPONSE_LOGGING === 'true',
          proxyTimeout: process.env.PROXY_TIMEOUT || '30000',
          proxyRetries: process.env.PROXY_RETRIES || '3'
        },
        timestamp: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: status
      });
    } catch (error) {
      this.logger.error('Failed to get proxy status', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get proxy status',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取已注册的服务列表
   */
  @Get('/proxy/services')
  async getRegisteredServices(request: FastifyRequest, reply: FastifyReply) {
    try {
      const services = [
        {
          name: 'tasks',
          prefix: '/api/tasks',
          upstream: `${process.env.TASKS_SERVICE_PROTOCOL || 'http'}://${process.env.TASKS_SERVICE_HOST || 'localhost'}:${process.env.TASKS_SERVICE_PORT || '3001'}`,
          requireAuth: true,
          timeout: parseInt(process.env.TASKS_SERVICE_TIMEOUT || '30000'),
          retries: parseInt(process.env.TASKS_SERVICE_RETRIES || '3'),
          httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          status: 'active'
        }
      ];

      return reply.send({
        success: true,
        data: {
          services,
          count: services.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to get registered services', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get registered services',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取特定服务的配置
   */
  @Get('/services/:serviceName/config')
  async getServiceConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { serviceName } = request.params as { serviceName: string };

      if (serviceName === 'tasks') {
        const config = {
          name: 'tasks',
          prefix: '/api/tasks',
          upstream: `${process.env.TASKS_SERVICE_PROTOCOL || 'http'}://${process.env.TASKS_SERVICE_HOST || 'localhost'}:${process.env.TASKS_SERVICE_PORT || '3001'}`,
          requireAuth: true,
          timeout: parseInt(process.env.TASKS_SERVICE_TIMEOUT || '30000'),
          retries: parseInt(process.env.TASKS_SERVICE_RETRIES || '3'),
          httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          rewritePrefix: '/api/tasks',
          headers: {
            'x-forwarded-by': 'stratix-gateway',
            'x-service-version': '1.0.0'
          }
        };

        return reply.send({
          success: true,
          data: config
        });
      }

      return reply.code(404).send({
        success: false,
        error: 'SERVICE_NOT_FOUND',
        message: `Service '${serviceName}' not found`
      });
    } catch (error) {
      this.logger.error('Failed to get service config', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get service config',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取服务健康状态
   */
  @Get('/proxy/health')
  async getServicesHealth(request: FastifyRequest, reply: FastifyReply) {
    try {
      const healthResults: Record<string, any> = {};

      // Tasks服务健康检查
      const tasksUpstream = `${process.env.TASKS_SERVICE_PROTOCOL || 'http'}://${process.env.TASKS_SERVICE_HOST || 'localhost'}:${process.env.TASKS_SERVICE_PORT || '3001'}`;

      healthResults['tasks'] = {
        status: 'unknown',
        upstream: tasksUpstream,
        lastCheck: new Date().toISOString(),
        message:
          'Health check not implemented yet - use direct service health endpoints'
      };

      return reply.send({
        success: true,
        data: {
          services: healthResults,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Failed to check services health', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to check services health',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取代理配置信息
   */
  @Get('/proxy/config')
  async getProxyConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = {
        proxy: {
          timeout: parseInt(process.env.PROXY_TIMEOUT || '30000'),
          retries: parseInt(process.env.PROXY_RETRIES || '3'),
          enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
          enableResponseLogging: process.env.ENABLE_RESPONSE_LOGGING === 'true'
        },
        services: {
          tasks: {
            host: process.env.TASKS_SERVICE_HOST || 'localhost',
            port: parseInt(process.env.TASKS_SERVICE_PORT || '3001'),
            protocol: process.env.TASKS_SERVICE_PROTOCOL || 'http',
            timeout: parseInt(process.env.TASKS_SERVICE_TIMEOUT || '30000'),
            retries: parseInt(process.env.TASKS_SERVICE_RETRIES || '3')
          }
        },
        authentication: {
          enabled: true,
          whitelistPaths: [
            '/health',
            '/metrics',
            '/status',
            '/docs',
            '/swagger',
            '/api/auth/*'
          ]
        },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: config
      });
    } catch (error) {
      this.logger.error('Failed to get proxy config', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get proxy config',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
