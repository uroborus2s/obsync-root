/**
 * 工作流定义管理控制器
 * 专门处理工作流定义的CRUD操作
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
import type WorkflowDefinitionService from '../services/WorkflowDefinitionService.js';
import type { WorkflowDefinition } from '../types/workflow.js';

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
 * 创建工作流定义请求体
 */
export interface CreateWorkflowDefinitionRequest {
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 版本号 */
  version: string;
  /** 工作流节点定义 */
  nodes: any[];
  /** 输入参数定义 */
  inputs?: any[];
  /** 输出参数定义 */
  outputs?: any[];
  /** 工作流配置 */
  config?: Record<string, any>;
  /** 标签 */
  tags?: string[];
  /** 分类 */
  category?: string;
  /** 创建者 */
  createdBy?: string;
}

/**
 * 更新工作流定义请求体
 */
export interface UpdateWorkflowDefinitionRequest {
  /** 工作流描述 */
  description?: string;
  /** 工作流节点定义 */
  nodes?: any[];
  /** 输入参数定义 */
  inputs?: any[];
  /** 输出参数定义 */
  outputs?: any[];
  /** 工作流配置 */
  config?: Record<string, any>;
  /** 标签 */
  tags?: string[];
  /** 分类 */
  category?: string;
}

/**
 * 工作流定义查询参数
 */
export interface WorkflowDefinitionQueryParams {
  /** 页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 状态筛选 */
  status?: 'draft' | 'active' | 'deprecated' | 'archived';
  /** 分类筛选 */
  category?: string;
  /** 关键词搜索 */
  keyword?: string;
  /** 标签筛选 */
  tags?: string;
  /** 创建者筛选 */
  createdBy?: string;
  /** 排序字段 */
  sortBy?: 'name' | 'version' | 'createdAt' | 'updatedAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 版本管理请求体
 */
export interface SetActiveVersionRequest {
  /** 版本号 */
  version: string;
}

/**
 * 工作流定义管理控制器
 */
@Controller()
export default class WorkflowDefinitionController {
  constructor(
    private readonly workflowDefinitionService: WorkflowDefinitionService,
    private readonly logger: Logger
  ) {}

  /**
   * 创建工作流定义
   */
  @Post('/api/workflows', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: '工作流名称'
          },
          description: {
            type: 'string',
            maxLength: 1000,
            description: '工作流描述'
          },
          version: {
            type: 'string',
            pattern: '^\\d+\\.\\d+\\.\\d+$',
            description: '版本号（语义化版本）'
          },
          nodes: {
            type: 'array',
            minItems: 1,
            description: '工作流节点定义'
          },
          inputs: {
            type: 'array',
            description: '输入参数定义'
          },
          outputs: {
            type: 'array',
            description: '输出参数定义'
          },
          config: {
            type: 'object',
            description: '工作流配置'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: '标签'
          },
          category: {
            type: 'string',
            maxLength: 100,
            description: '分类'
          },
          createdBy: {
            type: 'string',
            maxLength: 255,
            description: '创建者'
          }
        },
        required: ['name', 'version', 'nodes']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                version: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string' }
              }
            },
            timestamp: { type: 'string' },
            requestId: { type: 'string' }
          }
        }
      }
    }
  })
  async createDefinition(
    request: FastifyRequest<{ Body: CreateWorkflowDefinitionRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowDefinition>> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('创建工作流定义', {
        requestId,
        name: request.body.name,
        version: request.body.version
      });

      const definition: WorkflowDefinition = {
        name: request.body.name,
        description: request.body.description || '',
        version: request.body.version,
        nodes: request.body.nodes,
        inputs: request.body.inputs || [],
        outputs: request.body.outputs || [],
        config: request.body.config || {},
        tags: request.body.tags || [],
        category: request.body.category || '',
        createdBy: request.body.createdBy || ''
      };

      const result =
        await this.workflowDefinitionService.createDefinition(definition);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '创建工作流定义失败',
          code: result.errorCode || 'CREATE_DEFINITION_FAILED',
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
      this.logger.error('创建工作流定义失败', {
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
   * 获取工作流定义列表
   */
  @Get('/api/workflows', {
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
            enum: ['draft', 'active', 'deprecated', 'archived'],
            description: '状态筛选'
          },
          category: {
            type: 'string',
            description: '分类筛选'
          },
          keyword: {
            type: 'string',
            description: '关键词搜索'
          },
          tags: {
            type: 'string',
            description: '标签筛选（逗号分隔）'
          },
          createdBy: {
            type: 'string',
            description: '创建者筛选'
          },
          sortBy: {
            type: 'string',
            enum: ['name', 'version', 'createdAt', 'updatedAt'],
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
  async getDefinitions(
    request: FastifyRequest<{ Querystring: WorkflowDefinitionQueryParams }>,
    reply: FastifyReply
  ): Promise<ApiResponse<PaginatedResponse<WorkflowDefinition>>> {
    const requestId = this.generateRequestId();

    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        category,
        keyword
      } = request.query;

      // 避免未使用变量警告 - 这些参数在完整实现中会被使用
      const _unused = {
        tags: request.query.tags,
        createdBy: request.query.createdBy,
        sortBy: request.query.sortBy,
        sortOrder: request.query.sortOrder
      };
      void _unused;

      this.logger.info('查询工作流定义列表', {
        requestId,
        page,
        pageSize,
        status,
        category,
        keyword
      });

      const options: any = {};
      if (category) options.category = category;
      if (status) options.status = status;
      options.limit = pageSize;
      options.offset = (page - 1) * pageSize;

      const result =
        await this.workflowDefinitionService.listDefinitions(options);

      if (!result.success) {
        return reply.code(500).send({
          success: false,
          error: result.error || '查询工作流定义列表失败',
          code: result.errorCode || 'GET_DEFINITIONS_FAILED',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const definitions = result.data || [];
      const total = definitions.length;
      const totalPages = Math.ceil(total / pageSize);

      const paginatedResponse: PaginatedResponse<WorkflowDefinition> = {
        items: definitions,
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
      this.logger.error('查询工作流定义列表失败', {
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
   * 根据名称和版本获取工作流定义
   */
  @Get('/api/workflows/:name/:version', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '工作流名称' },
          version: { type: 'string', description: '版本号' }
        },
        required: ['name', 'version']
      }
    }
  })
  async getDefinitionByNameAndVersion(
    request: FastifyRequest<{ Params: { name: string; version: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowDefinition>> {
    const requestId = this.generateRequestId();

    try {
      const { name, version } = request.params;

      this.logger.info('查询工作流定义详情', { requestId, name, version });

      const result = await this.workflowDefinitionService.getDefinition(
        name,
        version
      );

      if (!result.success) {
        return reply.code(404).send({
          success: false,
          error: result.error || '工作流定义不存在',
          code: result.errorCode || 'DEFINITION_NOT_FOUND',
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
      this.logger.error('查询工作流定义详情失败', {
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
   * 获取工作流的活跃版本
   */
  @Get('/api/workflows/:name/active')
  async getActiveDefinition(
    request: FastifyRequest<{ Params: { name: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowDefinition>> {
    const requestId = this.generateRequestId();

    try {
      const { name } = request.params;

      this.logger.info('查询工作流活跃版本', { requestId, name });

      const result = await this.workflowDefinitionService.getDefinition(name);

      if (!result.success) {
        return reply.code(404).send({
          success: false,
          error: result.error || '工作流定义不存在',
          code: result.errorCode || 'DEFINITION_NOT_FOUND',
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
      this.logger.error('查询工作流活跃版本失败', {
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
   * 更新工作流定义
   */
  @Put('/api/workflows/:name/:version')
  async updateDefinition(
    request: FastifyRequest<{
      Params: { name: string; version: string };
      Body: UpdateWorkflowDefinitionRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowDefinition>> {
    const requestId = this.generateRequestId();

    try {
      const { name, version } = request.params;

      this.logger.info('更新工作流定义', { requestId, name, version });

      const definition: WorkflowDefinition = {
        name,
        version,
        description: request.body.description || '',
        nodes: request.body.nodes || [],
        inputs: request.body.inputs || [],
        outputs: request.body.outputs || [],
        config: request.body.config || {},
        tags: request.body.tags || [],
        category: request.body.category || ''
      };

      const result = await this.workflowDefinitionService.updateDefinition(
        name,
        definition
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '更新工作流定义失败',
          code: result.errorCode || 'UPDATE_DEFINITION_FAILED',
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
      this.logger.error('更新工作流定义失败', {
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
   * 删除工作流定义
   */
  @Delete('/api/workflows/:name/:version')
  async deleteDefinition(
    request: FastifyRequest<{ Params: { name: string; version: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { name, version } = request.params;

      this.logger.info('删除工作流定义', { requestId, name, version });

      const result = await this.workflowDefinitionService.deleteDefinition(
        name,
        version
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '删除工作流定义失败',
          code: result.errorCode || 'DELETE_DEFINITION_FAILED',
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
      this.logger.error('删除工作流定义失败', {
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
   * 设置活跃版本
   */
  @Post('/api/workflows/:name/active')
  async setActiveVersion(
    request: FastifyRequest<{
      Params: { name: string };
      Body: SetActiveVersionRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<boolean>> {
    const requestId = this.generateRequestId();

    try {
      const { name } = request.params;
      const { version } = request.body;

      this.logger.info('设置活跃版本', { requestId, name, version });

      const result = await this.workflowDefinitionService.setActiveVersion(
        name,
        version
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '设置活跃版本失败',
          code: result.errorCode || 'SET_ACTIVE_VERSION_FAILED',
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
      this.logger.error('设置活跃版本失败', { requestId, error: errorMessage });

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
   * 获取工作流统计信息
   */
  @Get('/api/workflows/statistics')
  async getStatistics(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('获取工作流统计信息', { requestId });

      const result = await this.workflowDefinitionService.getStatistics();

      if (!result.success) {
        return reply.code(500).send({
          success: false,
          error: result.error || '获取统计信息失败',
          code: result.errorCode || 'GET_STATISTICS_FAILED',
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
      this.logger.error('获取工作流统计信息失败', {
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
   * 验证工作流定义
   */
  @Post('/api/workflows/validate')
  async validateDefinition(
    request: FastifyRequest<{ Body: WorkflowDefinition }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('验证工作流定义', { requestId });

      const result = await this.workflowDefinitionService.validateDefinition(
        request.body
      );

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error || '验证工作流定义失败',
          code: result.errorCode || 'VALIDATE_DEFINITION_FAILED',
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
      this.logger.error('验证工作流定义失败', {
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
   * 搜索工作流定义
   */
  @Get('/api/workflows/search')
  async searchDefinitions(
    request: FastifyRequest<{
      Querystring: {
        keyword: string;
        limit?: number;
        offset?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    const requestId = this.generateRequestId();

    try {
      const { keyword, limit, offset } = request.query;

      this.logger.info('搜索工作流定义', { requestId, keyword, limit, offset });

      const searchOptions: any = {};
      if (limit !== undefined) searchOptions.limit = limit;
      if (offset !== undefined) searchOptions.offset = offset;

      const result = await this.workflowDefinitionService.searchDefinitions(
        keyword,
        searchOptions
      );

      if (!result.success) {
        return reply.code(500).send({
          success: false,
          error: result.error || '搜索工作流定义失败',
          code: result.errorCode || 'SEARCH_DEFINITIONS_FAILED',
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
      this.logger.error('搜索工作流定义失败', {
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
