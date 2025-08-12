/**
 * 工作流执行日志控制器
 * 专门处理工作流执行日志的查询和管理
 */

import {
  Controller,
  Get,
  type FastifyReply,
  type FastifyRequest,
  type Logger
} from '@stratix/core';
import type {
  IWorkflowExecutionLogRepository,
  LogQueryOptions
} from '../repositories/WorkflowExecutionLogRepository.js';
import type { WorkflowExecutionLog } from '../types/database.js';

/**
 * 统一的 API 响应格式
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  code?: string;
  /** 时间戳 */
  timestamp: string;
  /** 请求ID */
  requestId?: string;
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页大小 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
}

/**
 * 执行日志查询参数
 */
export interface ExecutionLogQueryParams {
  /** 页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 工作流实例ID */
  workflowInstanceId?: number;
  /** 任务节点ID */
  taskNodeId?: number;
  /** 节点ID */
  nodeId?: string;
  /** 日志级别 */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** 引擎实例ID */
  engineInstanceId?: string;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 关键词搜索 */
  keyword?: string;
  /** 排序字段 */
  sortBy?: 'id' | 'timestamp' | 'level';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 工作流执行日志控制器
 */
@Controller()
export default class WorkflowExecutionLogController {
  constructor(
    private readonly workflowExecutionLogRepository: IWorkflowExecutionLogRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取执行日志列表
   */
  @Get('/api/workflows/logs', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: '页码'
          },
          pageSize: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: '每页大小'
          },
          workflowInstanceId: {
            type: 'integer',
            minimum: 1,
            description: '工作流实例ID'
          },
          taskNodeId: {
            type: 'integer',
            minimum: 1,
            description: '任务节点ID'
          },
          nodeId: {
            type: 'string',
            description: '节点ID'
          },
          level: {
            type: 'string',
            enum: ['debug', 'info', 'warn', 'error'],
            description: '日志级别'
          },
          engineInstanceId: {
            type: 'string',
            description: '引擎实例ID'
          },
          startTime: {
            type: 'string',
            format: 'date-time',
            description: '开始时间'
          },
          endTime: {
            type: 'string',
            format: 'date-time',
            description: '结束时间'
          },
          keyword: {
            type: 'string',
            description: '关键词搜索'
          },
          sortBy: {
            type: 'string',
            enum: ['id', 'timestamp', 'level'],
            default: 'timestamp',
            description: '排序字段'
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
            description: '排序方向'
          }
        }
      }
    }
  })
  async getExecutionLogs(
    request: FastifyRequest<{ Querystring: ExecutionLogQueryParams }>,
    reply: FastifyReply
  ): Promise<ApiResponse<PaginatedResponse<WorkflowExecutionLog>>> {
    const requestId = this.generateRequestId();

    try {
      const {
        page = 1,
        pageSize = 20,
        workflowInstanceId,
        taskNodeId,
        nodeId,
        level,
        engineInstanceId,
        startTime,
        endTime,
        keyword,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = request.query;

      this.logger.info('查询工作流执行日志', {
        requestId,
        page,
        pageSize,
        workflowInstanceId,
        level,
        keyword
      });

      const queryOptions: LogQueryOptions = {
        pagination: {
          page,
          limit: pageSize,
          offset: (page - 1) * pageSize
        },
        sort: {
          field: sortBy || 'timestamp',
          order: sortOrder || 'desc'
        }
      };

      if (workflowInstanceId)
        queryOptions.workflowInstanceId = workflowInstanceId;
      if (taskNodeId) queryOptions.taskNodeId = taskNodeId;
      if (nodeId) queryOptions.nodeId = nodeId;
      if (level) queryOptions.level = level;
      if (engineInstanceId) queryOptions.engineInstanceId = engineInstanceId;
      if (startTime) queryOptions.startTime = new Date(startTime);
      if (endTime) queryOptions.endTime = new Date(endTime);

      let result;
      if (keyword) {
        result = await this.workflowExecutionLogRepository.searchLogs(
          keyword,
          queryOptions
        );
      } else if (workflowInstanceId) {
        result =
          await this.workflowExecutionLogRepository.findByWorkflowInstanceId(
            workflowInstanceId,
            queryOptions
          );
      } else if (taskNodeId) {
        result = await this.workflowExecutionLogRepository.findByTaskNodeId(
          taskNodeId,
          queryOptions
        );
      } else if (nodeId) {
        result = await this.workflowExecutionLogRepository.findByNodeId(
          nodeId,
          queryOptions
        );
      } else {
        // 如果没有特定条件，使用时间范围查询（查询所有）
        const now = new Date();
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        result = await this.workflowExecutionLogRepository.findByTimeRange(
          oneYearAgo,
          now,
          queryOptions
        );
      }

      if (!result.success) {
        return reply.code(500).send({
          success: false,
          error: result.error || '查询执行日志失败',
          code: 'GET_EXECUTION_LOGS_FAILED',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const logs = result.data || [];
      const total = logs.length;
      const totalPages = Math.ceil(total / pageSize);

      const paginatedResponse: PaginatedResponse<WorkflowExecutionLog> = {
        items: logs,
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      };

      return reply.code(200).send({
        success: true,
        data: paginatedResponse,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('查询工作流执行日志失败', {
        requestId,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 根据工作流实例ID获取执行日志
   */
  @Get('/api/workflows/logs/instance/:instanceId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          instanceId: { type: 'string', description: '工作流实例ID' }
        },
        required: ['instanceId']
      },
      querystring: {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            enum: ['debug', 'info', 'warn', 'error'],
            description: '日志级别筛选'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 1000,
            default: 100,
            description: '返回记录数限制'
          }
        }
      }
    }
  })
  async getLogsByInstanceId(
    request: FastifyRequest<{
      Params: { instanceId: string };
      Querystring: { level?: string; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowExecutionLog[]>> {
    const requestId = this.generateRequestId();

    try {
      const { instanceId } = request.params;
      const { level, limit = 100 } = request.query;

      this.logger.info('根据实例ID查询执行日志', {
        requestId,
        instanceId,
        level,
        limit
      });

      const queryOptions: LogQueryOptions = {
        pagination: {
          page: 1,
          limit: limit || 100
        },
        sort: {
          field: 'timestamp',
          order: 'desc'
        }
      };

      if (level) {
        queryOptions.level = level as any;
      }

      const result =
        await this.workflowExecutionLogRepository.findByWorkflowInstanceId(
          Number(instanceId),
          queryOptions
        );

      if (!result.success) {
        return reply.code(500).send({
          success: false,
          error: result.error || '查询执行日志失败',
          code: 'GET_LOGS_BY_INSTANCE_FAILED',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      return reply.code(200).send({
        success: true,
        data: result.data || [],
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('根据实例ID查询执行日志失败', {
        requestId,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 获取日志统计信息
   */
  @Get('/api/workflows/logs/statistics', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          workflowInstanceId: {
            type: 'integer',
            minimum: 1,
            description: '工作流实例ID（可选）'
          }
        }
      }
    }
  })
  async getLogStatistics(
    request: FastifyRequest<{ Querystring: { workflowInstanceId?: number } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    const requestId = this.generateRequestId();

    try {
      const { workflowInstanceId } = request.query;

      this.logger.info('获取日志统计信息', { requestId, workflowInstanceId });

      const result =
        await this.workflowExecutionLogRepository.getStatistics(
          workflowInstanceId
        );

      if (!result.success) {
        return reply.code(500).send({
          success: false,
          error: result.error || '获取日志统计信息失败',
          code: 'GET_LOG_STATISTICS_FAILED',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      return reply.code(200).send({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取日志统计信息失败', {
        requestId,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
