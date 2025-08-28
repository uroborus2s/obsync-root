/**
 * 监控统计控制器
 *
 * 提供工作流执行统计、性能指标、错误率等监控接口
 * 基于Stratix框架规范实现
 * 版本: v3.0.0-controllers
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Controller, Get } from '@stratix/core';
import type {
  IExecutionLogRepository,
  ITasksWorkflowAdapter,
  IWorkflowInstanceRepository
} from '../interfaces/index.js';

/**
 * 统计查询参数
 */
interface StatsQueryParams {
  /** 工作流定义ID过滤 */
  workflowDefinitionId?: number;
  /** 开始时间 */
  startDate?: string;
  /** 结束时间 */
  endDate?: string;
  /** 时间范围类型 */
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year';
  /** 分组方式 */
  groupBy?: 'status' | 'definition' | 'date' | 'hour';
}

/**
 * 性能指标查询参数
 */
interface PerformanceQueryParams {
  /** 工作流定义ID过滤 */
  workflowDefinitionId?: number;
  /** 时间范围 */
  timeRange?: 'hour' | 'day' | 'week' | 'month';
  /** 指标类型 */
  metrics?: string[];
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
 * 工作流执行统计
 */
interface WorkflowExecutionStats {
  /** 总实例数 */
  totalInstances: number;
  /** 运行中实例数 */
  runningInstances: number;
  /** 已完成实例数 */
  completedInstances: number;
  /** 失败实例数 */
  failedInstances: number;
  /** 中断实例数 */
  interruptedInstances: number;
  /** 成功率 */
  successRate: number;
  /** 平均执行时间（秒） */
  averageExecutionTime: number;
  /** 按状态分组统计 */
  statusBreakdown: Record<string, number>;
  /** 按工作流定义分组统计 */
  definitionBreakdown: Array<{
    definitionId: number;
    definitionName: string;
    count: number;
    successRate: number;
  }>;
}

/**
 * 性能指标
 */
interface PerformanceMetrics {
  /** 吞吐量（每小时处理的实例数） */
  throughput: {
    current: number;
    average: number;
    peak: number;
  };
  /** 响应时间统计 */
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
    max: number;
  };
  /** 资源使用情况 */
  resourceUsage: {
    activeConnections: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  /** 错误率统计 */
  errorRate: {
    total: number;
    percentage: number;
    byType: Record<string, number>;
  };
}

/**
 * 系统健康状态
 */
interface SystemHealth {
  /** 整体状态 */
  status: 'healthy' | 'warning' | 'critical';
  /** 各组件状态 */
  components: {
    database: 'healthy' | 'warning' | 'critical';
    scheduler: 'healthy' | 'warning' | 'critical';
    executor: 'healthy' | 'warning' | 'critical';
  };
  /** 运行时间 */
  uptime: number;
  /** 最后检查时间 */
  lastCheck: string;
  /** 详细信息 */
  details: {
    totalWorkflows: number;
    activeSchedules: number;
    runningInstances: number;
    queuedTasks: number;
  };
}

/**
 * 趋势数据
 */
interface TrendData {
  /** 时间点 */
  timestamp: string;
  /** 数值 */
  value: number;
  /** 标签 */
  label?: string;
}

/**
 * 监控统计控制器
 */
@Controller()
export default class MonitoringController {
  constructor(
    private readonly workflowAdapter: ITasksWorkflowAdapter,
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly executionLogRepository: IExecutionLogRepository
  ) {}

  /**
   * 获取工作流执行统计
   * GET /api/workflows/monitoring/stats
   */
  @Get('/api/workflows/monitoring/stats')
  async getExecutionStats(
    request: FastifyRequest<{ Querystring: StatsQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workflowDefinitionId, startDate, endDate, timeRange, groupBy } =
        request.query;

      // 构建时间范围
      const timeRangeFilter = this.buildTimeRange(
        startDate,
        endDate,
        timeRange
      );

      // 获取基础统计
      const statsResult = await this.workflowInstanceRepository.getStatistics();
      if (!statsResult.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch statistics',
          statsResult.error
        );
      }

      // 获取工作流统计（通过适配器）
      const workflowStatsResult = await this.workflowAdapter.getWorkflowStats(
        workflowDefinitionId,
        timeRangeFilter
      );

      const stats: WorkflowExecutionStats = {
        totalInstances: statsResult.data?.totalCount || 0,
        runningInstances: statsResult.data?.runningCount || 0,
        completedInstances: statsResult.data?.completedCount || 0,
        failedInstances: statsResult.data?.failedCount || 0,
        interruptedInstances: statsResult.data?.pausedCount || 0,
        successRate: this.calculateSuccessRate(
          statsResult.data?.completedCount || 0,
          statsResult.data?.totalCount || 0
        ),
        averageExecutionTime:
          workflowStatsResult.data?.averageExecutionTime || 0,
        statusBreakdown: {
          pending: 0,
          running: statsResult.data?.runningCount || 0,
          completed: statsResult.data?.completedCount || 0,
          failed: statsResult.data?.failedCount || 0,
          interrupted: statsResult.data?.pausedCount || 0
        },
        definitionBreakdown: [] // TODO: 实现按定义分组统计
      };

      this.sendSuccessResponse(reply, 200, stats);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取性能指标
   * GET /api/workflows/monitoring/performance
   */
  @Get('/api/workflows/monitoring/performance')
  async getPerformanceMetrics(
    request: FastifyRequest<{ Querystring: PerformanceQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        workflowDefinitionId,
        timeRange = 'hour',
        metrics = ['throughput', 'responseTime', 'errorRate']
      } = request.query;

      // TODO: 实现性能指标收集逻辑
      const performanceMetrics: PerformanceMetrics = {
        throughput: {
          current: 0,
          average: 0,
          peak: 0
        },
        responseTime: {
          p50: 0,
          p95: 0,
          p99: 0,
          average: 0,
          max: 0
        },
        resourceUsage: {
          activeConnections: 0,
          memoryUsage: 0,
          cpuUsage: 0
        },
        errorRate: {
          total: 0,
          percentage: 0,
          byType: {}
        }
      };

      this.sendSuccessResponse(reply, 200, performanceMetrics);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取系统健康状态
   * GET /api/workflows/monitoring/health
   */
  @Get('/api/workflows/monitoring/health')
  async getSystemHealth(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 获取基础统计
      const statsResult = await this.workflowInstanceRepository.getStatistics();

      // TODO: 实现各组件健康检查
      const health: SystemHealth = {
        status: 'healthy',
        components: {
          database: 'healthy',
          scheduler: 'healthy',
          executor: 'healthy'
        },
        uptime: process.uptime(),
        lastCheck: new Date().toISOString(),
        details: {
          totalWorkflows: statsResult.success
            ? statsResult.data?.totalCount || 0
            : 0,
          activeSchedules: 0, // TODO: 从调度器获取
          runningInstances: statsResult.success
            ? statsResult.data?.runningCount || 0
            : 0,
          queuedTasks: 0 // TODO: 从队列获取
        }
      };

      this.sendSuccessResponse(reply, 200, health);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取执行趋势数据
   * GET /api/workflows/monitoring/trends
   */
  @Get('/api/workflows/monitoring/trends')
  async getExecutionTrends(
    request: FastifyRequest<{
      Querystring: {
        metric: 'executions' | 'success_rate' | 'avg_duration' | 'error_rate';
        timeRange?: 'hour' | 'day' | 'week' | 'month';
        workflowDefinitionId?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { metric, timeRange = 'day', workflowDefinitionId } = request.query;

      if (!metric) {
        return this.sendErrorResponse(
          reply,
          400,
          'Missing required parameter: metric'
        );
      }

      // TODO: 实现趋势数据查询逻辑
      const trendData: TrendData[] = [];

      this.sendSuccessResponse(reply, 200, {
        metric,
        timeRange,
        data: trendData
      });
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取错误分析
   * GET /api/workflows/monitoring/errors
   */
  @Get('/api/workflows/monitoring/errors')
  async getErrorAnalysis(
    request: FastifyRequest<{
      Querystring: {
        timeRange?: 'hour' | 'day' | 'week' | 'month';
        workflowDefinitionId?: number;
        limit?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        timeRange = 'day',
        workflowDefinitionId,
        limit = 100
      } = request.query;

      // 获取错误日志统计
      const logStatsResult = await this.executionLogRepository.getLogStats();

      if (!logStatsResult.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch error statistics',
          logStatsResult.error
        );
      }

      // TODO: 实现详细的错误分析
      const errorAnalysis = {
        summary: {
          totalErrors: logStatsResult.data?.byLevel?.error || 0,
          errorRate: 0, // TODO: 计算错误率
          topErrors: [], // TODO: 获取最常见错误
          recentErrors: logStatsResult.data?.recentCount || 0
        },
        breakdown: logStatsResult.data?.byLevel || {},
        trends: [] // TODO: 错误趋势数据
      };

      this.sendSuccessResponse(reply, 200, errorAnalysis);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取实时监控数据
   * GET /api/workflows/monitoring/realtime
   */
  @Get('/api/workflows/monitoring/realtime')
  async getRealtimeData(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 获取实时统计
      const statsResult = await this.workflowInstanceRepository.getStatistics();

      const realtimeData = {
        timestamp: new Date().toISOString(),
        activeInstances: statsResult.success
          ? statsResult.data?.runningCount || 0
          : 0,
        queuedTasks: 0, // TODO: 从队列获取
        throughput: 0, // TODO: 计算当前吞吐量
        errorRate: 0, // TODO: 计算当前错误率
        systemLoad: {
          cpu: 0, // TODO: 获取CPU使用率
          memory: process.memoryUsage(),
          connections: 0 // TODO: 获取数据库连接数
        }
      };

      this.sendSuccessResponse(reply, 200, realtimeData);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 构建时间范围过滤器
   */
  private buildTimeRange(
    startDate?: string,
    endDate?: string,
    timeRange?: string
  ): { start: Date; end: Date } | undefined {
    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    if (timeRange) {
      const end = new Date();
      const start = new Date();

      switch (timeRange) {
        case 'hour':
          start.setHours(start.getHours() - 1);
          break;
        case 'day':
          start.setDate(start.getDate() - 1);
          break;
        case 'week':
          start.setDate(start.getDate() - 7);
          break;
        case 'month':
          start.setMonth(start.getMonth() - 1);
          break;
        case 'year':
          start.setFullYear(start.getFullYear() - 1);
          break;
      }

      return { start, end };
    }

    return undefined;
  }

  /**
   * 计算成功率
   */
  private calculateSuccessRate(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100 * 100) / 100; // 保留两位小数
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
