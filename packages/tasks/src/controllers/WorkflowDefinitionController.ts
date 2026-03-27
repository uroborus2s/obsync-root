/**
 * 工作流定义管理控制器
 *
 * 提供工作流定义的完整CRUD操作接口
 * 基于Stratix框架规范实现
 * 版本: v3.0.0-controllers
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Controller, Delete, Get, Post, Put } from '@stratix/core';
import type { IWorkflowDefinitionService } from '../interfaces/index.js';
import type {
  NewWorkflowDefinitionTable,
  PaginationOptions,
  WorkflowDefinitionTableUpdate
} from '../types/index.js';

/**
 * 工作流定义查询参数
 */
interface WorkflowDefinitionQueryParams {
  /** 页码，默认1 */
  page?: number;
  /** 每页大小，默认20 */
  pageSize?: number;
  /** 状态过滤 */
  status?: 'draft' | 'active' | 'deprecated' | 'archived';
  /** 分类过滤 */
  category?: string;
  /** 是否活跃 */
  isActive?: boolean;
  /** 搜索关键词 */
  search?: string;
}

/**
 * 创建工作流定义请求体
 */
interface CreateWorkflowDefinitionRequest {
  /** 工作流名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 显示名称 */
  displayName?: string;
  /** 描述 */
  description?: string;
  /** 工作流定义结构 */
  definition: any;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 状态 */
  status?: 'draft' | 'active' | 'deprecated' | 'archived';
  /** 是否活跃 */
  isActive?: boolean;
  /** 超时时间（秒） */
  timeoutSeconds?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（秒） */
  retryDelaySeconds?: number;
}

/**
 * 更新工作流定义请求体
 */
interface UpdateWorkflowDefinitionRequest {
  /** 显示名称 */
  displayName?: string;
  /** 描述 */
  description?: string;
  /** 工作流定义结构 */
  definition?: any;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 状态 */
  status?: 'draft' | 'active' | 'deprecated' | 'archived';
  /** 是否活跃 */
  isActive?: boolean;
  /** 超时时间（秒） */
  timeoutSeconds?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（秒） */
  retryDelaySeconds?: number;
}

/**
 * 工作流定义验证请求体
 */
interface ValidateWorkflowDefinitionRequest {
  /** 工作流定义结构 */
  definition: any;
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
 * 工作流定义管理控制器
 */
@Controller()
export default class WorkflowDefinitionController {
  constructor(
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
   * 获取工作流定义列表
   * GET /api/workflows/definitions
   */
  @Get('/api/workflows/definitions')
  async getDefinitions(
    request: FastifyRequest<{ Querystring: WorkflowDefinitionQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { status, category, isActive, search } = request.query;

      // 解析分页参数，确保类型正确
      const { page, pageSize } = this.parsePaginationParams(request.query);

      // 构建过滤条件
      const filters: any = {};
      if (status) filters.status = status;
      if (category) filters.category = category;
      if (isActive !== undefined) filters.isActive = isActive;
      if (search) filters.search = search;

      // 构建分页选项
      const pagination: PaginationOptions = {
        page,
        pageSize
      };

      const result = await this.workflowDefinitionService.findMany(
        filters,
        pagination
      );

      if (!result.success) {
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch workflow definitions',
          result.error
        );
      }

      // 直接返回Service层的分页结果
      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 根据ID获取工作流定义
   * GET /api/workflows/definitions/:id
   */
  @Get('/api/workflows/definitions/:id')
  async getDefinitionById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid definition ID');
      }

      const result = await this.workflowDefinitionService.getById(id);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(
            reply,
            404,
            'Workflow definition not found'
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch workflow definition',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 根据名称获取活跃的工作流定义
   * GET /api/workflows/definitions/by-name/:name
   */
  @Get('/api/workflows/definitions/by-name/:name')
  async getActiveDefinitionByName(
    request: FastifyRequest<{ Params: { name: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { name } = request.params;

      const result = await this.workflowDefinitionService.getActiveByName(name);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(
            reply,
            404,
            'Active workflow definition not found'
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch workflow definition',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 根据名称和版本获取工作流定义
   * GET /api/workflows/definitions/name/:name/version/:version
   */
  @Get('/api/workflows/definitions/by-name/:name/version/:version')
  async getDefinitionByNameAndVersion(
    request: FastifyRequest<{ Params: { name: string; version: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { name, version } = request.params;

      const result = await this.workflowDefinitionService.getByNameAndVersion(
        name,
        version
      );

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(
            reply,
            404,
            'Workflow definition not found'
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to fetch workflow definition',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 创建工作流定义
   * POST /api/workflows/definitions
   */
  @Post('/api/workflows/definitions')
  async createDefinition(
    request: FastifyRequest<{ Body: CreateWorkflowDefinitionRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        name,
        version,
        displayName,
        description,
        definition,
        category,
        tags,
        status = 'draft',
        isActive = false,
        timeoutSeconds,
        maxRetries = 3,
        retryDelaySeconds = 5
      } = request.body;

      // 基本验证
      if (!name || !version || !definition) {
        return this.sendErrorResponse(
          reply,
          400,
          'Missing required fields: name, version, definition'
        );
      }

      // 构建创建数据
      const createData: NewWorkflowDefinitionTable = {
        name,
        version,
        display_name: displayName || null,
        description: description || null,
        definition,
        category: category || null,
        tags: tags || null,
        status,
        is_active: isActive,
        timeout_seconds: timeoutSeconds || null,
        max_retries: maxRetries,
        retry_delay_seconds: retryDelaySeconds,
        created_by: null // TODO: 从认证信息中获取
      };

      const result = await this.workflowDefinitionService.create(createData);

      if (!result.success) {
        if (result.error?.includes('already exists')) {
          return this.sendErrorResponse(
            reply,
            409,
            'Workflow definition already exists',
            result.error
          );
        }
        if (result.error?.includes('validation failed')) {
          return this.sendErrorResponse(
            reply,
            400,
            'Workflow definition validation failed',
            result.error
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to create workflow definition',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 201, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 更新工作流定义
   * PUT /api/workflows/definitions/:id
   */
  @Put('/api/workflows/definitions/:id')
  async updateDefinition(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateWorkflowDefinitionRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid definition ID');
      }

      const {
        displayName,
        description,
        definition,
        category,
        tags,
        status,
        isActive,
        timeoutSeconds,
        maxRetries,
        retryDelaySeconds
      } = request.body;

      // 构建更新数据
      const updateData: WorkflowDefinitionTableUpdate = {};
      if (displayName !== undefined) updateData.display_name = displayName;
      if (description !== undefined) updateData.description = description;
      if (definition !== undefined) updateData.definition = definition;
      if (category !== undefined) updateData.category = category;
      if (tags !== undefined) updateData.tags = tags;
      if (status !== undefined) updateData.status = status;
      if (isActive !== undefined) updateData.is_active = isActive;
      if (timeoutSeconds !== undefined)
        updateData.timeout_seconds = timeoutSeconds;
      if (maxRetries !== undefined) updateData.max_retries = maxRetries;
      if (retryDelaySeconds !== undefined)
        updateData.retry_delay_seconds = retryDelaySeconds;

      const result = await this.workflowDefinitionService.update(
        id,
        updateData
      );

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(
            reply,
            404,
            'Workflow definition not found'
          );
        }
        if (result.error?.includes('validation failed')) {
          return this.sendErrorResponse(
            reply,
            400,
            'Workflow definition validation failed',
            result.error
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to update workflow definition',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, result.data);
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 删除工作流定义
   * DELETE /api/workflows/definitions/:id
   */
  @Delete('/api/workflows/definitions/:id')
  async deleteDefinition(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return this.sendErrorResponse(reply, 400, 'Invalid definition ID');
      }

      const result = await this.workflowDefinitionService.delete(id);

      if (!result.success) {
        if (result.error?.includes('not found')) {
          return this.sendErrorResponse(
            reply,
            404,
            'Workflow definition not found'
          );
        }
        return this.sendErrorResponse(
          reply,
          500,
          'Failed to delete workflow definition',
          result.error
        );
      }

      this.sendSuccessResponse(reply, 200, { deleted: true });
    } catch (error) {
      this.sendErrorResponse(reply, 500, 'Internal server error', error);
    }
  }

  /**
   * 验证工作流定义
   * POST /api/workflows/definitions/validate
   */
  @Post('/api/workflows/definitions/validate')
  async validateDefinition(
    request: FastifyRequest<{ Body: ValidateWorkflowDefinitionRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { definition } = request.body;

      if (!definition) {
        return this.sendErrorResponse(
          reply,
          400,
          'Missing required field: definition'
        );
      }

      const result = await this.workflowDefinitionService.validate(definition);

      if (!result.success) {
        return this.sendSuccessResponse(reply, 200, {
          valid: false,
          errors: result.error
        });
      }

      this.sendSuccessResponse(reply, 200, {
        valid: true,
        message: 'Workflow definition is valid'
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
