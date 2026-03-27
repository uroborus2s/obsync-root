/**
 * 执行日志查询控制器
 *
 * 提供工作流执行日志的查询和分析接口
 * 基于Stratix框架规范实现
 * 版本: v3.0.0-controllers
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Controller, Delete, Get } from '@stratix/core';
import type { DatabaseResult } from '@stratix/database';
import type { IExecutionLogRepository } from '../interfaces/index.js';
import type {
  PaginationOptions,
  ServiceResult,
  WorkflowExecutionLog
} from '../types/index.js';

/**
 * 日志查询参数
 */
interface LogQueryParams {
  /** 页码，默认1 */
  page?: number;
  /** 每页大小，默认50 */
  pageSize?: number;
  /** 工作流实例ID过滤 */
  workflowInstanceId?: number;
  /** 节点实例ID过滤 */
  nodeInstanceId?: number;
  /** 日志级别过滤 */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 搜索关键词 */
  search?: string;
  /** 排序字段 */
  sortBy?: 'timestamp' | 'level' | 'workflow_instance_id';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 日志统计查询参数
 */
interface LogStatsQueryParams {
  /** 工作流实例ID过滤 */
  workflowInstanceId?: number;
  /** 时间范围 */
  timeRange?: 'hour' | 'day' | 'week' | 'month';
  /** 分组方式 */
  groupBy?: 'level' | 'workflow' | 'node' | 'hour' | 'day';
}

/**
 * 统一响应格式
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorDetails?: any;
  timestamp: string;
}

/**
 * 分页响应格式
 */
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 日志统计信息
 */
interface LogStatistics {
  /** 总日志数 */
  total: number;
  /** 按级别分组统计 */
  byLevel: Record<string, number>;
  /** 最近日志数（最近1小时） */
  recentCount: number;
  /** 错误率 */
  errorRate: number;
  /** 时间范围内的趋势数据 */
  trends?: Array<{
    timestamp: string;
    count: number;
    level?: string;
  }>;
}

/**
 * 日志分析结果
 */
interface LogAnalysis {
  /** 常见错误模式 */
  commonErrors: Array<{
    pattern: string;
    count: number;
    percentage: number;
    examples: string[];
  }>;
  /** 性能问题 */
  performanceIssues: Array<{
    type: 'slow_execution' | 'timeout' | 'retry';
    count: number;
    affectedWorkflows: string[];
  }>;
  /** 异常节点 */
  problematicNodes: Array<{
    nodeId: string;
    errorCount: number;
    errorRate: number;
    lastError: string;
  }>;
}

/**
 * 执行日志查询控制器
 */
@Controller()
export default class ExecutionLogController {
  constructor(
    private readonly executionLogRepository: IExecutionLogRepository
  ) {}

  /**
   * 解析分页参数，确保类型正确
   */
  private parsePaginationParams(query: any): {
    page: number;
    pageSize: number;
  } {
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(query.pageSize as string) || 50)
    );
    return { page, pageSize };
  }

  /**
   * 转换DatabaseResult为ServiceResult
   */
  private convertToServiceResult<T>(
    dbResult: DatabaseResult<T>
  ): ServiceResult<T> {
    return dbResult.success
      ? {
          success: true,
          data: dbResult.data
        }
      : {
          success: false,
          error: String(dbResult.error)
        };
  }

  /**
   * 获取执行日志列表
   * GET /api/workflows/logs
   */
  @Get('/api/workflows/logs')
  async getLogs(
    request: FastifyRequest<{ Querystring: LogQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        workflowInstanceId,
        nodeInstanceId,
        level,
        startTime,
        endTime,
        search,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = request.query;

      // 解析分页参数，确保类型正确
      const { page, pageSize } = this.parsePaginationParams(request.query);
      const pagination: PaginationOptions = { page, pageSize };

      let dbResult;

      // 根据查询条件选择不同的查询方法
      if (workflowInstanceId) {
        dbResult = await this.executionLogRepository.findByWorkflowInstanceId(
          workflowInstanceId,
          pagination
        );
      } else if (nodeInstanceId) {
        dbResult = await this.executionLogRepository.findByNodeInstanceId(
          nodeInstanceId,
          pagination
        );
      } else if (level) {
        dbResult = await this.executionLogRepository.findByLevel(
          level,
          pagination
        );
      } else {
        // 获取所有日志（需要实现通用查询方法）
        dbResult = await this.executionLogRepository.findAllLogs(pagination);
      }

      // 转换DatabaseResult为ServiceResult
      const result = this.convertToServiceResult(dbResult);

      if (!result.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch logs',
          result.error
        );
      }

      // TODO: 实现时间范围过滤、搜索和排序
      const logs = result.data || [];

      const response: PaginatedResponse<WorkflowExecutionLog> = {
        items: logs,
        total: logs.length, // TODO: 获取真实的总数
        page,
        pageSize,
        totalPages: Math.ceil(logs.length / pageSize),
        hasNext: page * pageSize < logs.length,
        hasPrev: page > 1
      };

      this.sendSuccessResponse(reply, 200, response);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 根据ID获取日志详情
   * GET /api/workflows/logs/:id
   */
  @Get('/api/workflows/logs/:id')
  async getLogById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid log ID');
      }

      const dbResult = await this.executionLogRepository.findLogById(id);
      const result = this.convertToServiceResult(dbResult);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(reply, 404, 'Log not found');
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch log',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取日志统计信息
   * GET /api/workflows/logs/statistics
   */
  @Get('/api/workflows/logs/statistics')
  async getLogStatistics(
    request: FastifyRequest<{ Querystring: LogStatsQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        workflowInstanceId,
        timeRange = 'day',
        groupBy = 'level'
      } = request.query;

      const dbResult = await this.executionLogRepository.getLogStats();
      const result = this.convertToServiceResult(dbResult);

      if (!result.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch log statistics',
          result.error
        );
      }

      const stats: LogStatistics = {
        total: result.data?.total || 0,
        byLevel: result.data?.byLevel || {},
        recentCount: result.data?.recentCount || 0,
        errorRate: this.calculateErrorRate(
          result.data?.byLevel?.error || 0,
          result.data?.total || 0
        )
        // TODO: 添加趋势数据
      };

      this.sendSuccessResponse(reply, 200, stats);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取错误日志分析
   * GET /api/workflows/logs/analysis
   */
  @Get('/api/workflows/logs/analysis')
  async getLogAnalysis(
    request: FastifyRequest<{
      Querystring: {
        workflowInstanceId?: number;
        timeRange?: 'hour' | 'day' | 'week' | 'month';
        limit?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        workflowInstanceId,
        timeRange = 'day',
        limit = 100
      } = request.query;

      // 获取错误日志
      const errorLogsDbResult =
        await this.executionLogRepository.findByLevel('error');
      const errorLogsResult = this.convertToServiceResult(errorLogsDbResult);

      if (!errorLogsResult.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch error logs',
          errorLogsResult.error
        );
      }

      // TODO: 实现日志分析逻辑
      const analysis: LogAnalysis = {
        commonErrors: [],
        performanceIssues: [],
        problematicNodes: []
      };

      this.sendSuccessResponse(reply, 200, analysis);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 搜索日志
   * GET /api/workflows/logs/search
   */
  @Get('/api/workflows/logs/search')
  async searchLogs(
    request: FastifyRequest<{
      Querystring: {
        query: string;
        page?: number;
        pageSize?: number;
        level?: string;
        workflowInstanceId?: number;
        startTime?: string;
        endTime?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { query, level, workflowInstanceId, startTime, endTime } =
        request.query;

      if (!query) {
        return this.sendErrorResponse(
          reply,
          400,
          'Missing required parameter: query'
        );
      }

      // 解析分页参数，确保类型正确
      const { page, pageSize } = this.parsePaginationParams(request.query);

      // TODO: 实现全文搜索逻辑
      // 这需要在Repository层添加搜索方法

      const response: PaginatedResponse<WorkflowExecutionLog> = {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      };

      this.sendSuccessResponse(reply, 200, response);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 导出日志
   * GET /api/workflows/logs/export
   */
  @Get('/api/workflows/logs/export')
  async exportLogs(
    request: FastifyRequest<{
      Querystring: {
        format?: 'json' | 'csv' | 'txt';
        workflowInstanceId?: number;
        level?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        format = 'json',
        workflowInstanceId,
        level,
        startTime,
        endTime,
        limit = 1000
      } = request.query;

      // 获取日志数据
      let dbResult;

      if (workflowInstanceId) {
        dbResult = await this.executionLogRepository.findByWorkflowInstanceId(
          workflowInstanceId,
          { page: 1, pageSize: limit }
        );
      } else if (level) {
        dbResult = await this.executionLogRepository.findByLevel(level as any, {
          page: 1,
          pageSize: limit
        });
      } else {
        dbResult = await this.executionLogRepository.findAllLogs({
          page: 1,
          pageSize: limit
        });
      }

      const result = this.convertToServiceResult(dbResult);

      if (!result.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch logs for export',
          result.error
        );
      }

      const logs = result.data || [];

      // 根据格式导出
      switch (format) {
        case 'csv':
          const csv = this.convertToCSV(logs);
          reply.header('Content-Type', 'text/csv');
          reply.header(
            'Content-Disposition',
            'attachment; filename="workflow_logs.csv"'
          );
          reply.send(csv);
          break;

        case 'txt':
          const txt = this.convertToText(logs);
          reply.header('Content-Type', 'text/plain');
          reply.header(
            'Content-Disposition',
            'attachment; filename="workflow_logs.txt"'
          );
          reply.send(txt);
          break;

        case 'json':
        default:
          reply.header('Content-Type', 'application/json');
          reply.header(
            'Content-Disposition',
            'attachment; filename="workflow_logs.json"'
          );
          this.sendSuccessResponse(reply, 200, logs);
          break;
      }
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 清理过期日志
   * DELETE /api/workflows/logs/cleanup
   */
  @Delete('/api/workflows/logs/cleanup')
  async cleanupLogs(
    request: FastifyRequest<{
      Querystring: {
        retentionDays?: number;
        dryRun?: boolean;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { retentionDays = 30, dryRun = true } = request.query;

      // TODO: 实现日志清理逻辑
      // 这需要在Repository层添加清理方法

      const result = {
        dryRun,
        retentionDays,
        estimatedDeletions: 0,
        actualDeletions: dryRun ? 0 : 0
      };

      this.sendSuccessResponse(reply, 200, result);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(errorCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    return Math.round((errorCount / totalCount) * 100 * 100) / 100; // 保留两位小数
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(logs: WorkflowExecutionLog[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'ID',
      'Timestamp',
      'Level',
      'Message',
      'Workflow Instance ID',
      'Node Instance ID'
    ];
    const rows = logs.map((log) => [
      log.id,
      log.timestamp,
      log.level,
      `"${log.message.replace(/"/g, '""')}"`, // 转义双引号
      log.workflow_instance_id || '',
      log.node_instance_id || ''
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * 转换为文本格式
   */
  private convertToText(logs: WorkflowExecutionLog[]): string {
    return logs
      .map(
        (log) => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
      )
      .join('\n');
  }

  /**
   * 发送成功响应
   */
  private sendSuccessResponse(
    reply: FastifyReply,
    statusCode: number,
    data: any
  ): void {
    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    reply.status(statusCode).send(response);
  }

  /**
   * 发送错误响应
   */
  private sendErrorResponse(
    reply: FastifyReply,
    statusCode: number,
    error: string,
    errorDetails?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      error,
      errorDetails,
      timestamp: new Date().toISOString()
    };
    reply.status(statusCode).send(response);
  }
}
