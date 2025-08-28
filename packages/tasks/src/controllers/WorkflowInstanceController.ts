/**
 * 工作流实例控制器
 *
 * 提供工作流实例的启动、停止、查询等操作接口
 * 基于Stratix框架规范实现
 * 版本: v3.0.0-controllers
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import type {
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowOptions
} from '../types/index.js';

import type {
  IWorkflowDefinitionService,
  IWorkflowExecutionService
} from '../interfaces/index.js';

/**
 * 工作流实例查询参数
 */
interface WorkflowInstanceQueryParams {
  /** 页码，默认1 */
  page?: number;
  /** 每页大小，默认20 */
  pageSize?: number;
  /** 状态过滤 */
  status?: WorkflowInstanceStatus | WorkflowInstanceStatus[];
  /** 工作流定义ID过滤 */
  workflowDefinitionId?: number;
  /** 实例类型过滤 */
  instanceType?: string;
  /** 业务键过滤 */
  businessKey?: string;
  /** 外部ID过滤 */
  externalId?: string;
  /** 开始时间范围 */
  startedAfter?: string;
  /** 结束时间范围 */
  startedBefore?: string;
}

/**
 * 启动工作流请求体
 */
interface StartWorkflowRequest {
  /** 工作流定义ID */
  workflowDefinitionId?: number;
  /** 工作流名称（可替代definitionId） */
  workflowName?: string;
  /** 工作流版本（与workflowName配合使用） */
  workflowVersion?: string;
  /** 输入数据 */
  inputData?: Record<string, any>;
  /** 上下文数据 */
  contextData?: {
    /** 实例类型 */
    instanceType?: string;
    /** 外部ID */
    externalId?: string;
    /** 创建者 */
    createdBy?: string;
    /** 优先级 */
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    /** 其他上下文信息 */
    [key: string]: any;
  };
  /** 业务键 */
  businessKey?: string;
  /** 互斥键 */
  mutexKey?: string;
  /** 是否恢复模式 */
  resume?: boolean;
}

/**
 * 停止工作流请求体
 */
interface StopWorkflowRequest {
  /** 停止原因 */
  reason?: string;
  /** 是否强制停止 */
  force?: boolean;
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
 * 工作流状态响应
 */
interface WorkflowStatusResponse {
  instanceId: number;
  status: WorkflowInstanceStatus;
  currentNodeId?: string;
  startedAt?: Date;
  completedAt?: Date;
  interruptedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  progress?: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    percentage: number;
  };
}

/**
 * 工作流实例控制器
 */
@Controller()
export default class WorkflowInstanceController {
  constructor(
    private readonly workflowExecutionService: IWorkflowExecutionService,
    private readonly workflowDefinitionService: IWorkflowDefinitionService
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
      Math.min(100, parseInt(query.pageSize as string) || 20)
    );
    return { page, pageSize };
  }

  /**
   * 获取工作流实例列表
   * GET /api/workflows/instances
   */
  @Get('/api/workflows/instances')
  async getInstances(
    request: FastifyRequest<{ Querystring: WorkflowInstanceQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        status,
        workflowDefinitionId,
        instanceType,
        businessKey,
        externalId,
        startedAfter,
        startedBefore
      } = request.query;

      // 解析分页参数，确保类型正确
      const { page, pageSize } = this.parsePaginationParams(request.query);

      // TODO: 实现实例查询逻辑
      // 这里需要调用WorkflowInstanceService的查询方法
      // 由于当前Service层没有直接的查询接口，需要通过Repository层实现

      const response: PaginatedResponse<WorkflowInstance> = {
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
   * 根据ID获取工作流实例
   * GET /api/workflows/instances/:id
   */
  @Get('/api/workflows/instances/:id')
  async getInstanceById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid instance ID');
      }

      // TODO: 实现通过WorkflowInstanceService获取实例详情
      // const result = await this.workflowInstanceService.getById(id);

      this.sendErrorResponse(reply, 501, 'Not implemented yet');
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 启动工作流
   * POST /api/workflows/instances/start
   */
  @Post('/api/workflows/instances/start')
  async startWorkflow(
    request: FastifyRequest<{ Body: StartWorkflowRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        workflowDefinitionId,
        workflowName,
        workflowVersion,
        inputData,
        contextData,
        businessKey,
        mutexKey,
        resume = false
      } = request.body;

      // 验证必需参数
      if (!workflowDefinitionId && !workflowName) {
        return this.sendErrorResponse(
          reply,
          400,
          'Either workflowDefinitionId or workflowName is required'
        );
      }

      // 获取工作流定义
      let definitionResult;
      if (workflowDefinitionId) {
        definitionResult =
          await this.workflowDefinitionService.getById(workflowDefinitionId);
      } else if (workflowName) {
        if (workflowVersion) {
          definitionResult =
            await this.workflowDefinitionService.getByNameAndVersion(
              workflowName,
              workflowVersion
            );
        } else {
          definitionResult =
            await this.workflowDefinitionService.getActiveByName(workflowName);
        }
      }

      if (!definitionResult?.success) {
        return this.sendErrorResponse(
          reply,
          404,
          'Workflow definition not found',
          definitionResult?.error
        );
      }

      // 构建工作流选项
      const workflowOptions: WorkflowOptions = {
        inputData: inputData || {},
        contextData,
        businessKey,
        mutexKey,
        resume
      };

      // 启动工作流
      const result = await this.workflowExecutionService.startWorkflow(
        definitionResult.data!,
        workflowOptions
      );

      if (!result.success) {
        if (result.error?.includes('lock')) {
          return this.sendErrorResponse(
            reply,
            409,
            'Workflow instance is locked',
            result.error
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to start workflow',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 201, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 停止工作流实例
   * POST /api/workflows/instances/:id/stop
   */
  @Post('/api/workflows/instances/:id/stop')
  async stopWorkflow(
    request: FastifyRequest<{
      Params: { id: string };
      Body: StopWorkflowRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid instance ID');
      }

      const { reason, force = false } = request.body;

      const result = await this.workflowExecutionService.stopWorkflow(
        id,
        reason
      );

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(
            reply,
            404,
            'Workflow instance not found'
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to stop workflow',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, {
        stopped: result.data,
        reason: reason || 'Manual stop',
        force
      });
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 恢复中断的工作流实例
   * POST /api/workflows/instances/:id/resume
   */
  @Post('/api/workflows/instances/:id/resume')
  async resumeWorkflow(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid instance ID');
      }

      const result = await this.workflowExecutionService.resumeWorkflow(id);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(
            reply,
            404,
            'Workflow instance not found'
          );
        }
        if (result.error?.includes('not interrupted')) {
          return this.sendErrorResponse(
            reply,
            400,
            'Workflow instance is not in interrupted state'
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to resume workflow',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, { resumed: true });
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取工作流实例状态
   * GET /api/workflows/instances/:id/status
   */
  @Get('/api/workflows/instances/:id/status')
  async getWorkflowStatus(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid instance ID');
      }

      const result = await this.workflowExecutionService.getWorkflowStatus(id);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(
            reply,
            404,
            'Workflow instance not found'
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to get workflow status',
          result.error
        );
      }

      // 构建状态响应
      const statusResponse: WorkflowStatusResponse = {
        ...result.data,
        // TODO: 添加进度计算逻辑
        progress: {
          totalNodes: 0,
          completedNodes: 0,
          failedNodes: 0,
          percentage: 0
        }
      };

      this.sendSuccessResponse(reply, 200, statusResponse);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 批量操作工作流实例
   * POST /api/workflows/instances/batch
   */
  @Post('/api/workflows/instances/batch')
  async batchOperation(
    request: FastifyRequest<{
      Body: {
        action: 'stop' | 'resume' | 'delete';
        instanceIds: number[];
        reason?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { action, instanceIds, reason } = request.body;

      if (!action || !instanceIds || instanceIds.length === 0) {
        return this.sendErrorResponse(
          reply,
          400,
          'Missing required fields: action, instanceIds'
        );
      }

      const results = [];
      for (const instanceId of instanceIds) {
        try {
          let result;
          switch (action) {
            case 'stop':
              result = await this.workflowExecutionService.stopWorkflow(
                instanceId,
                reason
              );
              break;
            case 'resume':
              result =
                await this.workflowExecutionService.resumeWorkflow(instanceId);
              break;
            default:
              result = { success: false, error: 'Unsupported action' };
          }

          results.push({
            instanceId,
            success: result.success,
            error: result.error
          });
        } catch (error) {
          results.push({
            instanceId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      this.sendSuccessResponse(reply, 200, {
        action,
        total: results.length,
        success: successCount,
        failed: failureCount,
        results
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
