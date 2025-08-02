// @stratix/database 健康检查控制器
// 提供数据库连接健康状态检查的 REST API

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Controller, Get, RESOLVER } from '@stratix/core';
import DatabaseManager from '../core/database-manager.js';
import { DatabaseErrorHandler } from '../utils/error-handler.js';

/**
 * 健康检查响应接口
 */
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'error';
  connections?: Array<{
    name: string;
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
  }>;
  timestamp: string;
  plugin: string;
  architecture: string;
}

/**
 * 错误响应接口
 */
interface ErrorResponse {
  status: 'error';
  error: string;
  timestamp: string;
  plugin: string;
}

/**
 * 数据库健康检查控制器
 *
 * 提供数据库连接状态检查的 REST API 端点
 * 支持单个连接和所有连接的健康检查
 */
@Controller()
export default class HealthController {
  /**
   * Awilix 内联解析器配置
   */
  static [RESOLVER] = {};

  constructor(private readonly databaseManager: DatabaseManager) {}

  /**
   * 检查所有数据库连接的健康状态
   *
   * @route GET /health
   * @returns {HealthCheckResponse | ErrorResponse} 健康检查结果
   */
  @Get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            connections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                  responseTime: { type: 'number' },
                  error: { type: 'string' }
                }
              }
            },
            timestamp: { type: 'string' },
            plugin: { type: 'string' },
            architecture: { type: 'string' }
          }
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['error', 'unhealthy'] },
            error: { type: 'string' },
            timestamp: { type: 'string' },
            plugin: { type: 'string' }
          }
        }
      }
    }
  })
  async checkAllHealth(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<HealthCheckResponse | ErrorResponse> {
    const healthCheckResult = await DatabaseErrorHandler.execute(async () => {
      // 执行健康检查
      const healthResult = await this.databaseManager.checkAllHealth();

      if (!healthResult.success) {
        throw new Error(healthResult.error?.message || 'Health check failed');
      }

      // 转换健康检查结果为控制器期望的格式
      const connections = healthResult.data.map((health, index) => ({
        name: `connection-${index}`, // 可以根据实际需要调整命名
        status: health.healthy ? ('healthy' as const) : ('unhealthy' as const),
        responseTime: health.responseTime,
        error: health.error
      }));

      return {
        success: true,
        data: connections
      };
    }, 'health-check-all');

    if (!healthCheckResult.success) {
      const errorResponse: ErrorResponse = {
        status: 'error',
        error: healthCheckResult.error?.message || 'Health check failed',
        timestamp: new Date().toISOString(),
        plugin: 'database'
      };

      return reply.code(503).send(errorResponse);
    }

    const health = healthCheckResult.data;
    const allHealthy =
      health.success && health.data.every((h: any) => h.status === 'healthy');

    const response: HealthCheckResponse = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      connections: health.success ? health.data : [],
      timestamp: new Date().toISOString(),
      plugin: 'database',
      architecture: 'functional'
    };

    return reply.code(allHealthy ? 200 : 503).send(response);
  }

  /**
   * 检查指定数据库连接的健康状态
   *
   * @route GET /health/:connectionName
   * @returns {HealthCheckResponse | ErrorResponse} 健康检查结果
   */
  @Get('/health/:connectionName', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionName: { type: 'string', minLength: 1 }
        },
        required: ['connectionName']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            connections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                  responseTime: { type: 'number' },
                  error: { type: 'string' }
                }
              }
            },
            timestamp: { type: 'string' },
            plugin: { type: 'string' },
            architecture: { type: 'string' }
          }
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['error', 'unhealthy'] },
            error: { type: 'string' },
            timestamp: { type: 'string' },
            plugin: { type: 'string' }
          }
        }
      }
    }
  })
  async checkConnectionHealth(
    request: FastifyRequest<{ Params: { connectionName: string } }>,
    reply: FastifyReply
  ): Promise<HealthCheckResponse | ErrorResponse> {
    const { connectionName } = request.params;

    const healthCheckResult = await DatabaseErrorHandler.execute(async () => {
      // 首先检查连接是否存在
      if (!this.databaseManager.hasConnection(connectionName)) {
        throw new Error(`Connection '${connectionName}' not found`);
      }

      // 获取连接并执行健康检查
      const connection: import('kysely').Kysely<any> =
        await this.databaseManager.getConnection(connectionName);
      const startTime = Date.now();

      try {
        // 执行简单的健康检查查询
        await connection
          .selectFrom('information_schema.tables' as any)
          .limit(1)
          .execute();

        const responseTime = Date.now() - startTime;

        return {
          success: true,
          data: [
            {
              name: connectionName,
              status: 'healthy' as const,
              responseTime
            }
          ]
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;

        return {
          success: true,
          data: [
            {
              name: connectionName,
              status: 'unhealthy' as const,
              responseTime,
              error: error instanceof Error ? error.message : String(error)
            }
          ]
        };
      }
    }, 'health-check-connection');

    if (!healthCheckResult.success) {
      const errorResponse: ErrorResponse = {
        status: 'error',
        error:
          healthCheckResult.error?.message ||
          `Health check failed for connection: ${connectionName}`,
        timestamp: new Date().toISOString(),
        plugin: 'database'
      };

      return reply.code(503).send(errorResponse);
    }

    const health = healthCheckResult.data;
    const isHealthy =
      health.success && health.data.every((h: any) => h.status === 'healthy');

    const response: HealthCheckResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      connections: health.success ? health.data : [],
      timestamp: new Date().toISOString(),
      plugin: 'database',
      architecture: 'functional'
    };

    return reply.code(isHealthy ? 200 : 503).send(response);
  }

  /**
   * 获取数据库连接统计信息
   *
   * @route GET /health/stats
   * @returns {object} 连接统计信息
   */
  @Get('/health/stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            totalConnections: { type: 'number' },
            activeConnections: { type: 'number' },
            timestamp: { type: 'string' },
            plugin: { type: 'string' },
            architecture: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['error'] },
            error: { type: 'string' },
            timestamp: { type: 'string' },
            plugin: { type: 'string' }
          }
        }
      }
    }
  })
  async getConnectionStats(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> {
    const statsResult = await DatabaseErrorHandler.execute(async () => {
      // 获取真实的连接统计信息
      const connectionStats = this.databaseManager.getConnectionStats();
      const preCreationStatus = this.databaseManager.getPreCreationStatus();

      return {
        totalConnections: connectionStats.size,
        activeConnections: Array.from(connectionStats.values()).filter(
          (stat) => stat.status === 'connected'
        ).length,
        preCreationCompleted: preCreationStatus.completed,
        preCreationStartTime: preCreationStatus.startTime
          ? new Date(preCreationStatus.startTime).toISOString()
          : undefined,
        preCreationDuration: preCreationStatus.duration,
        preCreationErrors: preCreationStatus.errors,
        timestamp: new Date().toISOString(),
        plugin: 'database',
        architecture: 'functional'
      };
    }, 'health-stats');

    if (!statsResult.success) {
      return reply.code(500).send({
        status: 'error',
        error: statsResult.error?.message || 'Failed to get connection stats',
        timestamp: new Date().toISOString(),
        plugin: 'database'
      });
    }

    return reply.code(200).send(statsResult.data);
  }
}
