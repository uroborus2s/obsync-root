/**
 * 工作流实例管理控制器
 * 专门处理工作流实例的生命周期管理
 */

import {
  Controller,
  Delete,
  Get,
  Post,
  type FastifyReply,
  type FastifyRequest,
  type Logger
} from '@stratix/core';
import type { IWorkflowInstanceService } from '../services/WorkflowInstanceService.js';
import type { NewWorkflowInstanceTable } from '../types/database.js';
import type { WorkflowInstance, WorkflowStatus } from '../types/workflow.js';

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
 * 创建工作流实例请求体
 */
export interface CreateWorkflowInstanceRequest {
  /** 工作流定义ID */
  workflowDefinitionId: number;
  /** 实例名称 */
  name: string;
  /** 外部ID */
  externalId?: string;
  /** 输入数据 */
  inputData?: Record<string, any>;
  /** 业务键 */
  businessKey?: string;
  /** 互斥键 */
  mutexKey?: string;
  /** 优先级 */
  priority?: number;
  /** 调度时间 */
  scheduledAt?: string;
  /** 创建者 */
  createdBy?: string;
}

/**
 * 更新工作流实例请求体
 */
export interface UpdateWorkflowInstanceRequest {
  /** 实例名称 */
  name?: string;
  /** 输入数据 */
  inputData?: Record<string, any>;
  /** 上下文数据 */
  contextData?: Record<string, any>;
  /** 优先级 */
  priority?: number;
  /** 调度时间 */
  scheduledAt?: string;
}

/**
 * 工作流实例查询参数
 */
export interface WorkflowInstanceQueryParams {
  /** 页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 状态筛选 */
  status?: WorkflowStatus | WorkflowStatus[];
  /** 工作流定义ID筛选 */
  workflowDefinitionId?: number;
  /** 业务键筛选 */
  businessKey?: string;
  /** 创建者筛选 */
  createdBy?: string;
  /** 开始时间范围 */
  startTimeFrom?: string;
  /** 结束时间范围 */
  startTimeTo?: string;
  /** 排序字段 */
  sortBy?:
    | 'id'
    | 'name'
    | 'status'
    | 'priority'
    | 'createdAt'
    | 'startedAt'
    | 'completedAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 操作请求体
 */
export interface InstanceOperationRequest {
  /** 操作原因 */
  reason?: string;
}

/**
 * 工作流实例管理控制器
 */
@Controller()
export default class WorkflowInstanceController {
  constructor(
    private readonly workflowInstanceService: IWorkflowInstanceService,
    private readonly logger: Logger
  ) {}

  /**
   * 创建工作流实例
   */
  @Post('/api/workflows/instances', {
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
            description: '实例名称'
          },
          externalId: {
            type: 'string',
            maxLength: 255,
            description: '外部ID'
          },
          inputData: {
            type: 'object',
            description: '输入数据'
          },
          businessKey: {
            type: 'string',
            maxLength: 255,
            description: '业务键'
          },
          mutexKey: {
            type: 'string',
            maxLength: 255,
            description: '互斥键'
          },
          priority: {
            type: 'number',
            minimum: 0,
            maximum: 10,
            default: 5,
            description: '优先级'
          },
          scheduledAt: {
            type: 'string',
            format: 'date-time',
            description: '调度时间'
          },
          createdBy: {
            type: 'string',
            maxLength: 255,
            description: '创建者'
          }
        },
        required: ['workflowDefinitionId', 'name']
      }
    }
  })
  async createInstance(
    request: FastifyRequest<{ Body: CreateWorkflowInstanceRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowInstance>> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('创建工作流实例', {
        requestId,
        workflowDefinitionId: request.body.workflowDefinitionId,
        name: request.body.name
      });

      const instanceData: NewWorkflowInstanceTable = {
        workflow_definition_id: request.body.workflowDefinitionId,
        name: request.body.name,
        external_id: request.body.externalId || null,
        status: 'pending' as WorkflowStatus,
        input_data: request.body.inputData || null,
        output_data: null,
        context_data: null,
        business_key: request.body.businessKey || null,
        mutex_key: request.body.mutexKey || null,
        started_at: null,
        completed_at: null,
        paused_at: null,
        error_message: null,
        error_details: null,
        retry_count: 0,
        max_retries: 3,
        priority: request.body.priority || 5,
        scheduled_at: request.body.scheduledAt
          ? new Date(request.body.scheduledAt)
          : null,
        current_node_id: null,
        completed_nodes: null,
        failed_nodes: null,
        lock_owner: null,
        lock_acquired_at: null,
        last_heartbeat: null,
        assigned_engine_id: null,
        assignment_strategy: null,
        created_by: request.body.createdBy || null
      };

      const result =
        await this.workflowInstanceService.createInstance(instanceData);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '创建工作流实例失败',
          code: result.errorCode || 'CREATE_INSTANCE_FAILED',
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
      this.logger.error('创建工作流实例失败', {
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
   * 获取工作流实例列表
   */
  @Get('/api/workflows/instances', {
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
          status: {
            type: 'string',
            enum: [
              'pending',
              'running',
              'completed',
              'failed',
              'cancelled',
              'paused'
            ],
            description: '状态筛选'
          },
          workflowDefinitionId: {
            type: 'integer',
            minimum: 1,
            description: '工作流定义ID筛选'
          },
          businessKey: {
            type: 'string',
            description: '业务键筛选'
          },
          createdBy: {
            type: 'string',
            description: '创建者筛选'
          },
          startTimeFrom: {
            type: 'string',
            format: 'date-time',
            description: '开始时间范围（起始）'
          },
          startTimeTo: {
            type: 'string',
            format: 'date-time',
            description: '开始时间范围（结束）'
          },
          sortBy: {
            type: 'string',
            enum: [
              'id',
              'name',
              'status',
              'priority',
              'createdAt',
              'startedAt',
              'completedAt'
            ],
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
  async getInstances(
    request: FastifyRequest<{ Querystring: WorkflowInstanceQueryParams }>,
    reply: FastifyReply
  ): Promise<ApiResponse<PaginatedResponse<WorkflowInstance>>> {
    const requestId = this.generateRequestId();

    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        workflowDefinitionId,
        businessKey,
        createdBy,
        startTimeFrom,
        startTimeTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = request.query;

      this.logger.info('查询工作流实例列表', {
        requestId,
        page,
        pageSize,
        status,
        workflowDefinitionId,
        businessKey
      });

      const queryOptions: any = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy,
        sortOrder
      };

      if (status) queryOptions.status = status;
      if (workflowDefinitionId)
        queryOptions.workflowDefinitionId = workflowDefinitionId;
      if (businessKey) queryOptions.businessKey = businessKey;
      if (createdBy) queryOptions.createdBy = createdBy;
      if (startTimeFrom) queryOptions.startTimeFrom = new Date(startTimeFrom);
      if (startTimeTo) queryOptions.startTimeTo = new Date(startTimeTo);

      const result =
        await this.workflowInstanceService.queryInstances(queryOptions);

      if (!result.success) {
        return reply.code(500).send({
          success: false,
          error: result.error || '查询工作流实例列表失败',
          code: result.errorCode || 'GET_INSTANCES_FAILED',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const instances = result.data || [];
      const total = instances.length;
      const totalPages = Math.ceil(total / pageSize);

      const paginatedResponse: PaginatedResponse<WorkflowInstance> = {
        items: instances,
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
      this.logger.error('查询工作流实例列表失败', {
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
   * 根据ID获取工作流实例详情
   */
  @Get('/api/workflows/instances/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '实例ID' }
        },
        required: ['id']
      }
    }
  })
  async getInstanceById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowInstance>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;

      this.logger.info('查询工作流实例详情', { requestId, id });

      const result = await this.workflowInstanceService.getInstanceById(
        Number(id)
      );

      if (!result.success) {
        return reply.code(404).send({
          success: false,
          error: result.error || '工作流实例不存在',
          code: result.errorCode || 'INSTANCE_NOT_FOUND',
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
      this.logger.error('查询工作流实例详情失败', {
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
   * 启动工作流实例
   */
  @Post('/api/workflows/instances/:id/start', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '实例ID' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            maxLength: 500,
            description: '启动原因'
          }
        }
      }
    }
  })
  async startInstance(
    request: FastifyRequest<{
      Params: { id: string };
      Body: InstanceOperationRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;
      const { reason } = request.body || {};

      this.logger.info('启动工作流实例', { requestId, id, reason });

      const result = await this.workflowInstanceService.executeInstance(id);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '启动工作流实例失败',
          code: result.errorCode || 'START_INSTANCE_FAILED',
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
      this.logger.error('启动工作流实例失败', {
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
   * 暂停工作流实例
   */
  @Post('/api/workflows/instances/:id/pause')
  async pauseInstance(
    request: FastifyRequest<{
      Params: { id: string };
      Body: InstanceOperationRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;
      const { reason } = request.body || {};

      this.logger.info('暂停工作流实例', { requestId, id, reason });

      const result = await this.workflowInstanceService.pauseInstance(id);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '暂停工作流实例失败',
          code: result.errorCode || 'PAUSE_INSTANCE_FAILED',
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
      this.logger.error('暂停工作流实例失败', {
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
   * 恢复工作流实例
   */
  @Post('/api/workflows/instances/:id/resume')
  async resumeInstance(
    request: FastifyRequest<{
      Params: { id: string };
      Body: InstanceOperationRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;
      const { reason } = request.body || {};

      this.logger.info('恢复工作流实例', { requestId, id, reason });

      const result = await this.workflowInstanceService.resumeInstance(id);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '恢复工作流实例失败',
          code: result.errorCode || 'RESUME_INSTANCE_FAILED',
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
      this.logger.error('恢复工作流实例失败', {
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
   * 取消工作流实例
   */
  @Post('/api/workflows/instances/:id/cancel')
  async cancelInstance(
    request: FastifyRequest<{
      Params: { id: string };
      Body: InstanceOperationRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;
      const { reason } = request.body || {};

      this.logger.info('取消工作流实例', { requestId, id, reason });

      const result = await this.workflowInstanceService.terminateInstance(
        id,
        reason
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '取消工作流实例失败',
          code: result.errorCode || 'CANCEL_INSTANCE_FAILED',
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
      this.logger.error('取消工作流实例失败', {
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
   * 删除工作流实例
   */
  @Delete('/api/workflows/instances/:id')
  async deleteInstance(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { id } = request.params;

      this.logger.info('删除工作流实例', { requestId, id });

      const result = await this.workflowInstanceService.deleteInstance(
        Number(id)
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '删除工作流实例失败',
          code: result.errorCode || 'DELETE_INSTANCE_FAILED',
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
      this.logger.error('删除工作流实例失败', {
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
   * 获取工作流实例统计信息
   */
  @Get('/api/workflows/instances/statistics')
  async getInstanceStatistics(
    request: FastifyRequest<{ Querystring: { workflowDefinitionId?: number } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    const requestId = this.generateRequestId();

    try {
      const { workflowDefinitionId } = request.query;

      this.logger.info('获取工作流实例统计信息', {
        requestId,
        workflowDefinitionId
      });

      const result =
        await this.workflowInstanceService.getInstanceStatistics(
          workflowDefinitionId
        );

      if (!result.success) {
        return reply.code(500).send({
          success: false,
          error: result.error || '获取实例统计信息失败',
          code: result.errorCode || 'GET_INSTANCE_STATISTICS_FAILED',
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
      this.logger.error('获取工作流实例统计信息失败', {
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
