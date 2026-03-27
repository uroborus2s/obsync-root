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
  IWorkflowExecutionService,
  IWorkflowInstanceService
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
  /** 是否按流程分组 */
  groupByWorkflow?: string | boolean;
  /** 是否只返回根实例（external_id为空） */
  rootInstancesOnly?: string | boolean;
}

/**
 * 流程分组查询参数
 */
interface WorkflowGroupQueryParams {
  /** 页码，默认1 */
  page?: number;
  /** 每页大小，默认20 */
  pageSize?: number;
  /** 状态过滤 */
  status?: WorkflowInstanceStatus;
  /** 搜索关键词 */
  search?: string;
  /** 工作流定义名称过滤 */
  workflowDefinitionName?: string;
  /** 排序字段 */
  sortBy?: 'name' | 'instanceCount' | 'latestActivity' | 'createdAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
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
    private readonly workflowDefinitionService: IWorkflowDefinitionService,
    private readonly workflowInstanceService: IWorkflowInstanceService
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
        startedBefore,
        groupByWorkflow,
        rootInstancesOnly
      } = request.query;

      // 解析分页参数，确保类型正确
      const { page, pageSize } = this.parsePaginationParams(request.query);

      // 构建查询过滤器
      const filters: any = {};
      if (status) {
        filters.status = Array.isArray(status) ? status : [status];
      }
      if (workflowDefinitionId) {
        filters.workflowDefinitionId = workflowDefinitionId;
      }
      if (instanceType) {
        filters.instanceType = instanceType;
      }
      if (businessKey) {
        filters.businessKey = businessKey;
      }
      if (externalId) {
        filters.externalId = externalId;
      }

      // 新增：根实例过滤（external_id为空）
      if (rootInstancesOnly === 'true' || rootInstancesOnly === true) {
        filters.externalId = null; // 只查询external_id为空的根实例
      }

      // 新增：分组查询处理（暂时跳过，使用独立的分组接口）
      // if (groupByWorkflow === 'true' || groupByWorkflow === true) {
      //   // 如果是分组查询，重定向到分组接口
      //   return this.getWorkflowGroups(request as any, reply);
      // }

      // 修复时间范围过滤器的字段名映射
      if (startedAfter || startedBefore) {
        filters.startedAt = {};
        if (startedAfter) {
          filters.startedAt.from = new Date(startedAfter);
        }
        if (startedBefore) {
          filters.startedAt.to = new Date(startedBefore);
        }
      }

      // 构建分页参数
      const pagination = { page, pageSize };

      // 添加调试日志
      console.log('🔍 WorkflowInstanceController - Query filters:', filters);
      console.log('🔍 WorkflowInstanceController - Pagination:', pagination);

      // 调用服务层查询工作流实例
      const result = await this.workflowInstanceService.findMany(
        filters,
        pagination
      );

      if (!result.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to get workflow instances',
          result.error
        );
      }

      const paginatedData = result.data || {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      };

      const response: PaginatedResponse<WorkflowInstance> = {
        items: paginatedData.items,
        total: paginatedData.total,
        page: paginatedData.page,
        pageSize: paginatedData.pageSize,
        totalPages: paginatedData.totalPages,
        hasNext: paginatedData.hasNext,
        hasPrev: paginatedData.hasPrev
      };

      this.sendSuccessResponse(reply, 200, response);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 获取流程分组列表
   * GET /api/workflows/instances/groups
   */
  @Get('/api/workflows/instances/groups')
  async getWorkflowGroups(
    request: FastifyRequest<{ Querystring: WorkflowGroupQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        status,
        search,
        workflowDefinitionName,
        sortBy = 'latestActivity',
        sortOrder = 'desc'
      } = request.query;

      // 解析分页参数
      const { page, pageSize } = this.parsePaginationParams(request.query);

      // 构建查询过滤器
      const filters: any = {
        externalId: null // 只查询根实例
      };

      if (status) {
        filters.status = Array.isArray(status) ? status : [status];
      }

      if (search) {
        filters.search = search;
      }

      if (workflowDefinitionName) {
        filters.workflowDefinitionName = workflowDefinitionName;
      }

      // 调用服务层获取分组数据
      const result = await this.workflowInstanceService.getWorkflowGroups(
        filters,
        { page, pageSize, sortBy, sortOrder }
      );

      if (!result.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to get workflow groups',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, result.data);
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

      const result = await this.workflowInstanceService.getById(id);

      if (!result.success) {
        if (
          result.error?.includes('not found') ||
          result.error?.includes('Not found')
        ) {
          return this.sendErrorResponse(
            reply,
            404,
            'Workflow instance not found'
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to get workflow instance',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, result.data);
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
   * 获取工作流实例的节点实例（包含子节点层次结构）
   * GET /api/workflows/instances/:id/nodes?nodeId=xxx
   *
   * 如果提供nodeId查询参数，返回指定节点及其所有子节点；
   * 如果不提供nodeId，返回所有顶级节点，如果节点有子节点（如循环节点的子任务），
   * 会在节点的children字段中包含完整的子节点信息
   */
  @Get('/api/workflows/instances/:id/nodes')
  async getNodeInstances(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { nodeId?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid instance ID');
      }

      const nodeId = request.query.nodeId;

      const result = await this.workflowInstanceService.getNodeInstances(
        id,
        nodeId
      );

      if (!result.success) {
        if (
          result.error?.includes('not found') ||
          result.error?.includes('Not found')
        ) {
          return this.sendErrorResponse(
            reply,
            404,
            nodeId ? 'Node not found' : 'Workflow instance not found',
            result.error
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to get node instances',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, result.data);
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
