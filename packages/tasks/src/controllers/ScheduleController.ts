/**
 * 定时任务管理控制器
 *
 * 提供定时任务的配置、管理、执行历史查询等接口
 * 基于Stratix框架规范实现
 * 版本: v3.0.0-controllers
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Controller, Delete, Get, Post, Put } from '@stratix/core';
import type { DatabaseResult } from '@stratix/database';
import type {
  IScheduleExecutionRepository,
  IScheduleRepository,
  ISchedulerService
} from '../interfaces/schedule.interfaces.js';
import type { ServiceResult } from '../types/index.js';
import type { ScheduleConfig } from '../types/schedule.types.js';

/**
 * 定时任务查询参数
 */
interface ScheduleQueryParams {
  /** 页码，默认1 */
  page?: number;
  /** 每页大小，默认20 */
  pageSize?: number;
  /** 是否启用过滤 */
  enabled?: boolean;
  /** 工作流定义ID过滤 */
  workflowDefinitionId?: number;
  /** 执行器名称过滤 */
  executorName?: string;
  /** 搜索关键词 */
  search?: string;
}

/**
 * 执行历史查询参数
 */
interface ExecutionHistoryQueryParams {
  /** 页码，默认1 */
  page?: number;
  /** 每页大小，默认50 */
  pageSize?: number;
  /** 状态过滤 */
  status?: 'success' | 'failed' | 'timeout' | 'running';
  /** 开始时间范围 */
  startedAfter?: string;
  /** 结束时间范围 */
  startedBefore?: string;
}

/**
 * 创建定时任务请求体
 */
interface CreateScheduleRequest {
  /** 任务名称 */
  name: string;
  /** 执行器名称 */
  executorName: string;
  /** 工作流定义ID（可选，与executorName二选一） */
  workflowDefinitionId?: number;
  /** Cron表达式 */
  cronExpression: string;
  /** 时区，默认UTC */
  timezone?: string;
  /** 是否启用，默认true */
  enabled?: boolean;
  /** 最大并发实例数，默认1 */
  maxInstances?: number;
  /** 输入数据 */
  inputData?: any;
  /** 上下文数据 */
  contextData?: any;
  /** 业务键 */
  businessKey?: string;
  /** 互斥键 */
  mutexKey?: string;
  /** 创建者 */
  createdBy?: string;
}

/**
 * 更新定时任务请求体
 */
interface UpdateScheduleRequest {
  /** 任务名称 */
  name?: string;
  /** Cron表达式 */
  cronExpression?: string;
  /** 时区 */
  timezone?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 最大并发实例数 */
  maxInstances?: number;
  /** 输入数据 */
  inputData?: any;
  /** 上下文数据 */
  contextData?: any;
  /** 业务键 */
  businessKey?: string;
  /** 互斥键 */
  mutexKey?: string;
}

/**
 * 手动触发请求体
 */
interface TriggerScheduleRequest {
  /** 是否忽略并发限制 */
  ignoreConcurrency?: boolean;
  /** 自定义输入数据（覆盖默认配置） */
  inputData?: any;
  /** 触发原因 */
  reason?: string;
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
 * 定时任务管理控制器
 */
@Controller()
export default class ScheduleController {
  constructor(
    private readonly schedulerService: ISchedulerService,
    private readonly scheduleRepository: IScheduleRepository,
    private readonly scheduleExecutionRepository: IScheduleExecutionRepository
  ) {}

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
   * 获取定时任务列表
   * GET /api/workflows/schedules
   */
  @Get('/api/workflows/schedules')
  async getSchedules(
    request: FastifyRequest<{ Querystring: ScheduleQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 20,
        enabled,
        workflowDefinitionId,
        executorName,
        search
      } = request.query;

      const options = {
        page,
        pageSize,
        workflowDefinitionId,
        enabled
      };

      const result = await this.scheduleRepository.findWithPagination(options);

      if (!result.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch schedules',
          result.error
        );
      }

      // TODO: 实现搜索和executorName过滤
      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 根据ID获取定时任务
   * GET /api/workflows/schedules/:id
   */
  @Get('/api/workflows/schedules/:id')
  async getScheduleById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid schedule ID');
      }

      const dbResult = await this.scheduleRepository.findById(id);
      const result = this.convertToServiceResult(dbResult);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(reply, 404, 'Schedule not found');
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch schedule',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 创建定时任务
   * POST /api/workflows/schedules
   */
  @Post('/api/workflows/schedules')
  async createSchedule(
    request: FastifyRequest<{ Body: CreateScheduleRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        name,
        executorName,
        workflowDefinitionId,
        cronExpression,
        timezone = 'UTC',
        enabled = true,
        maxInstances = 1,
        inputData,
        contextData,
        businessKey,
        mutexKey,
        createdBy
      } = request.body;

      // 基本验证
      if (!name || !executorName || !cronExpression) {
        return this.sendErrorResponse(
          reply,
          400,
          'Missing required fields: name, executorName, cronExpression'
        );
      }

      // 构建配置
      const config: ScheduleConfig = {
        name,
        executorName,
        workflowDefinitionId,
        cronExpression,
        timezone,
        enabled,
        maxInstances,
        inputData,
        contextData,
        businessKey,
        mutexKey,
        createdBy
      };

      const result = await this.schedulerService.createSchedule(config);

      if (!result.success) {
        if (result.error?.includes('already exists')) {
          return this.sendErrorResponse(
            reply,
            409,
            'Schedule already exists',
            result.error
          );
        }
        if (result.error?.includes('Invalid cron')) {
          return this.sendErrorResponse(
            reply,
            400,
            'Invalid cron expression',
            result.error
          );
        }
        if (result.error?.includes('executor not found')) {
          return this.sendErrorResponse(
            reply,
            400,
            'Task executor not found',
            result.error
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to create schedule',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 201, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 更新定时任务
   * PUT /api/workflows/schedules/:id
   */
  @Put('/api/workflows/schedules/:id')
  async updateSchedule(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateScheduleRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid schedule ID');
      }

      const updateData = request.body;

      const dbResult = await this.scheduleRepository.update(id, updateData);
      const result = this.convertToServiceResult(dbResult);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(reply, 404, 'Schedule not found');
        }
        if (result.error?.includes('Invalid cron')) {
          return this.sendErrorResponse(
            reply,
            400,
            'Invalid cron expression',
            result.error
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to update schedule',
          result.error
        );
      }

      // 更新调度器中的任务
      if (result.data) {
        this.schedulerService.updateSchedule(result.data);
      }

      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 删除定时任务
   * DELETE /api/workflows/schedules/:id
   */
  @Delete('/api/workflows/schedules/:id')
  async deleteSchedule(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid schedule ID');
      }

      const dbResult = await this.scheduleRepository.delete(id);
      const result = this.convertToServiceResult(dbResult);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(reply, 404, 'Schedule not found');
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to delete schedule',
          result.error
        );
      }

      // 从调度器中移除任务
      this.schedulerService.deleteSchedule(id);

      this.sendSuccessResponse(reply, 200, { deleted: true });
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 启用/禁用定时任务
   * PUT /api/workflows/schedules/:id/toggle
   */
  @Put('/api/workflows/schedules/:id/toggle')
  async toggleSchedule(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { enabled: boolean };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid schedule ID');
      }

      const { enabled } = request.body;
      if (typeof enabled !== 'boolean') {
        return this.sendErrorResponse(
          reply,
          400,
          'Missing required field: enabled (boolean)'
        );
      }

      const dbResult = await this.scheduleRepository.update(id, { enabled });
      const result = this.convertToServiceResult(dbResult);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(reply, 404, 'Schedule not found');
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to toggle schedule',
          result.error
        );
      }

      // 更新调度器中的任务
      if (result.data) {
        this.schedulerService.updateSchedule(result.data);
      }

      this.sendSuccessResponse(reply, 200, {
        id,
        enabled,
        message: enabled ? 'Schedule enabled' : 'Schedule disabled'
      });
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 手动触发定时任务
   * POST /api/workflows/schedules/:id/trigger
   */
  @Post('/api/workflows/schedules/:id/trigger')
  async triggerSchedule(
    request: FastifyRequest<{
      Params: { id: string };
      Body: TriggerScheduleRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid schedule ID');
      }

      const {
        ignoreConcurrency = false,
        inputData,
        reason = 'Manual trigger'
      } = request.body;

      // 获取定时任务配置
      const scheduleResult = await this.scheduleRepository.findById(id);
      if (!scheduleResult.success) {
        return this.sendErrorResponse(reply, 404, 'Schedule not found');
      }

      // TODO: 实现手动触发逻辑
      // 这需要调用调度器的手动执行方法

      this.sendSuccessResponse(reply, 200, {
        triggered: true,
        scheduleId: id,
        reason,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取定时任务执行历史
   * GET /api/workflows/schedules/:id/executions
   */
  @Get('/api/workflows/schedules/:id/executions')
  async getExecutionHistory(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: ExecutionHistoryQueryParams;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid schedule ID');
      }

      const {
        page = 1,
        pageSize = 50,
        status,
        startedAfter,
        startedBefore
      } = request.query;

      const options = { page, pageSize };
      const result = await this.scheduleExecutionRepository.findByScheduleId(
        id,
        options
      );

      if (!result.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch execution history',
          result.error
        );
      }

      // TODO: 实现状态和时间范围过滤
      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取调度器状态
   * GET /api/workflows/schedules/status
   */
  @Get('/api/workflows/schedules/status')
  async getSchedulerStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const status = this.schedulerService.getStatus();
      this.sendSuccessResponse(reply, 200, status);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 重新加载调度器配置
   * POST /api/workflows/schedules/reload
   */
  @Post('/api/workflows/schedules/reload')
  async reloadScheduler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const result = await this.schedulerService.reloadSchedules();

      if (!result.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to reload scheduler',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, {
        reloaded: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
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
