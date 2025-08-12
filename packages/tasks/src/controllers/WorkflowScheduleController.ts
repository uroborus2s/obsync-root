/**
 * 工作流定时任务配置控制器
 * 专门处理工作流定时调度的配置和管理
 */

import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  type FastifyReply,
  type FastifyRequest,
  type Logger
} from '@stratix/core';
import type { IWorkflowScheduleRepository } from '../repositories/WorkflowScheduleRepository.js';
import type {
  NewWorkflowSchedule,
  WorkflowSchedule
} from '../types/database.js';

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
 * 创建定时任务请求体
 */
export interface CreateScheduleRequest {
  /** 工作流定义ID */
  workflowDefinitionId: number;
  /** 调度名称 */
  name: string;
  /** 调度描述 */
  description?: string;
  /** Cron表达式 */
  cronExpression: string;
  /** 时区 */
  timezone?: string;
  /** 输入数据 */
  inputData?: Record<string, any>;
  /** 是否启用 */
  enabled?: boolean;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 最大运行实例数 */
  maxInstances?: number;
  /** 创建者 */
  createdBy?: string;
}

/**
 * 更新定时任务请求体
 */
export interface UpdateScheduleRequest {
  /** 调度名称 */
  name?: string;
  /** 调度描述 */
  description?: string;
  /** Cron表达式 */
  cronExpression?: string;
  /** 时区 */
  timezone?: string;
  /** 输入数据 */
  inputData?: Record<string, any>;
  /** 是否启用 */
  enabled?: boolean;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 最大运行实例数 */
  maxInstances?: number;
}

/**
 * 定时任务查询参数
 */
export interface ScheduleQueryParams {
  /** 页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 工作流定义ID筛选 */
  workflowDefinitionId?: number;
  /** 启用状态筛选 */
  enabled?: boolean;
  /** 创建者筛选 */
  createdBy?: string;
  /** 排序字段 */
  sortBy?: 'id' | 'name' | 'nextRunTime' | 'createdAt' | 'updatedAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 工作流定时任务配置控制器
 */
@Controller()
export default class WorkflowScheduleController {
  constructor(
    private readonly workflowScheduleRepository: IWorkflowScheduleRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 创建定时任务
   */
  @Post('/api/workflows/schedules', {
    schema: {
      body: {
        type: 'object',
        properties: {
          workflowDefinitionId: {
            type: 'number',
            minimum: 1,
            description: '工作流定义ID'
          },
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: '调度名称'
          },
          description: {
            type: 'string',
            maxLength: 1000,
            description: '调度描述'
          },
          cronExpression: {
            type: 'string',
            minLength: 1,
            description: 'Cron表达式'
          },
          timezone: {
            type: 'string',
            default: 'Asia/Shanghai',
            description: '时区'
          },
          inputData: {
            type: 'object',
            description: '输入数据'
          },
          enabled: {
            type: 'boolean',
            default: true,
            description: '是否启用'
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
          maxInstances: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            default: 1,
            description: '最大运行实例数'
          },
          createdBy: {
            type: 'string',
            maxLength: 255,
            description: '创建者'
          }
        },
        required: ['workflowDefinitionId', 'name', 'cronExpression']
      }
    }
  })
  async createSchedule(
    request: FastifyRequest<{ Body: CreateScheduleRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowSchedule>> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('创建工作流定时任务', {
        requestId,
        workflowDefinitionId: request.body.workflowDefinitionId,
        name: request.body.name,
        cronExpression: request.body.cronExpression
      });

      const scheduleData: NewWorkflowSchedule = {
        workflow_definition_id: request.body.workflowDefinitionId,
        name: request.body.name,
        cron_expression: request.body.cronExpression,
        timezone: request.body.timezone || 'Asia/Shanghai',
        is_enabled: request.body.enabled !== false,
        next_run_at: null, // 这里应该根据cron表达式计算
        last_run_at: null,
        max_instances: request.body.maxInstances || 1,
        input_data: request.body.inputData || null,
        created_by: request.body.createdBy || null
      };

      // 使用 BaseTasksRepository 的 create 方法需要通过类型转换
      const result = await (this.workflowScheduleRepository as any).create(
        scheduleData
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '创建定时任务失败',
          code: 'CREATE_SCHEDULE_FAILED',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      return reply.code(201).send({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('创建工作流定时任务失败', {
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
   * 获取定时任务列表
   */
  @Get('/api/workflows/schedules', {
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
          workflowDefinitionId: {
            type: 'integer',
            minimum: 1,
            description: '工作流定义ID筛选'
          },
          enabled: {
            type: 'boolean',
            description: '启用状态筛选'
          },
          createdBy: {
            type: 'string',
            description: '创建者筛选'
          },
          sortBy: {
            type: 'string',
            enum: ['id', 'name', 'nextRunTime', 'createdAt', 'updatedAt'],
            default: 'createdAt',
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
  async getSchedules(
    request: FastifyRequest<{ Querystring: ScheduleQueryParams }>,
    reply: FastifyReply
  ): Promise<ApiResponse<PaginatedResponse<WorkflowSchedule>>> {
    const requestId = this.generateRequestId();

    try {
      const {
        page = 1,
        pageSize = 20,
        workflowDefinitionId,
        enabled,
        createdBy,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = request.query;

      this.logger.info('查询工作流定时任务列表', {
        requestId,
        page,
        pageSize,
        workflowDefinitionId,
        enabled
      });

      const queryOptions: any = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy,
        sortOrder
      };

      if (workflowDefinitionId)
        queryOptions.workflowDefinitionId = workflowDefinitionId;
      if (enabled !== undefined) queryOptions.enabled = enabled;
      if (createdBy) queryOptions.createdBy = createdBy;

      const result = await (this.workflowScheduleRepository as any).findAll(
        queryOptions
      );

      if (!result.success) {
        return reply.code(500).send({
          success: false,
          error: result.error || '查询定时任务列表失败',
          code: 'GET_SCHEDULES_FAILED',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const schedules = result.data || [];
      const total = schedules.length;
      const totalPages = Math.ceil(total / pageSize);

      const paginatedResponse: PaginatedResponse<WorkflowSchedule> = {
        items: schedules,
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
      this.logger.error('查询工作流定时任务列表失败', {
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
   * 根据ID获取定时任务详情
   */
  @Get('/api/workflows/schedules/:id')
  async getScheduleById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowSchedule>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;

      this.logger.info('查询定时任务详情', { requestId, id });

      const result = await (
        this.workflowScheduleRepository as any
      ).findByIdNullable(Number(id));

      if (!result.success || !result.data) {
        return reply.code(404).send({
          success: false,
          error: '定时任务不存在',
          code: 'SCHEDULE_NOT_FOUND',
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
      this.logger.error('查询定时任务详情失败', {
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
   * 更新定时任务
   */
  @Put('/api/workflows/schedules/:id')
  async updateSchedule(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateScheduleRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowSchedule>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;

      this.logger.info('更新工作流定时任务', { requestId, id });

      const updateData: any = {};
      if (request.body.name !== undefined) updateData.name = request.body.name;
      if (request.body.description !== undefined)
        updateData.description = request.body.description;
      if (request.body.cronExpression !== undefined)
        updateData.cron_expression = request.body.cronExpression;
      if (request.body.timezone !== undefined)
        updateData.timezone = request.body.timezone;
      if (request.body.inputData !== undefined)
        updateData.input_data = request.body.inputData;
      if (request.body.enabled !== undefined)
        updateData.enabled = request.body.enabled;
      if (request.body.startTime !== undefined)
        updateData.start_time = request.body.startTime
          ? new Date(request.body.startTime)
          : null;
      if (request.body.endTime !== undefined)
        updateData.end_time = request.body.endTime
          ? new Date(request.body.endTime)
          : null;
      if (request.body.maxInstances !== undefined)
        updateData.max_instances = request.body.maxInstances;

      const result = await (this.workflowScheduleRepository as any).update(
        Number(id),
        updateData
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '更新定时任务失败',
          code: 'UPDATE_SCHEDULE_FAILED',
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
      this.logger.error('更新工作流定时任务失败', {
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
   * 删除定时任务
   */
  @Delete('/api/workflows/schedules/:id')
  async deleteSchedule(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;

      this.logger.info('删除工作流定时任务', { requestId, id });

      const result = await (this.workflowScheduleRepository as any).delete(
        Number(id)
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '删除定时任务失败',
          code: 'DELETE_SCHEDULE_FAILED',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      return reply.code(200).send({
        success: true,
        data: true,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('删除工作流定时任务失败', {
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
   * 启用/禁用定时任务
   */
  @Post('/api/workflows/schedules/:id/toggle')
  async toggleSchedule(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { enabled: boolean };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;
      const { enabled } = request.body;

      this.logger.info('切换定时任务状态', { requestId, id, enabled });

      const result = await (this.workflowScheduleRepository as any).update(
        Number(id),
        { is_enabled: enabled }
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '切换定时任务状态失败',
          code: 'TOGGLE_SCHEDULE_FAILED',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      return reply.code(200).send({
        success: true,
        data: true,
        timestamp: new Date().toISOString(),
        requestId
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('切换定时任务状态失败', {
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
