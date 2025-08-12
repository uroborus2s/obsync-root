// @stratix/icasync 同步控制器
// 提供同步操作的 HTTP REST API 接口

import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Delete, Get, Post } from '@stratix/core';
import type {
  ISyncWorkflowService,
  SyncWorkflowConfig,
  WorkflowExecutionResult
} from '../services/SyncWorkflowService.js';

/**
 * 全量同步请求体
 */
export interface FullSyncRequest {
  /** 学年学期 */
  xnxq: string;
  /** 是否强制同步（忽略时间戳检查） */
  forceSync?: boolean;
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 是否并行执行 */
  parallel?: boolean;
}

/**
 * 增量同步请求体
 */
export interface IncrementalSyncRequest {
  /** 学年学期 */
  xnxq: string;
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * 日历创建请求体
 */
export interface CalendarCreationRequest {
  /** 开课号列表 */
  kkhList: string[];
  /** 学年学期 */
  xnxq: string;
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 日历删除请求体
 */
export interface CalendarDeletionRequest {
  /** 开课号列表 */
  kkhList: string[];
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
}

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
}

/**
 * 同步控制器
 *
 * 提供课程表同步相关的 HTTP API 接口
 */
@Controller()
export default class SyncController {
  constructor(
    private readonly syncWorkflowService: ISyncWorkflowService,
    private readonly logger: Logger
  ) {}

  /**
   * 执行全量同步
   */
  @Post('/sync/full', {
    schema: {
      body: {
        type: 'object',
        properties: {
          xnxq: {
            type: 'string',
            pattern: '^\\d{4}-\\d{4}-[12]$',
            description: '学年学期，格式：YYYY-YYYY-S'
          },
          batchSize: {
            type: 'number',
            minimum: 1,
            maximum: 1000,
            description: '批处理大小'
          },
          timeout: {
            type: 'number',
            minimum: 1000,
            description: '超时时间（毫秒）'
          },
          maxConcurrency: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: '最大并发数'
          },
          retryCount: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: '重试次数'
          },
          parallel: {
            type: 'boolean',
            description: '是否并行执行'
          }
        },
        required: ['xnxq']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                workflowId: { type: 'string' },
                status: { type: 'string' },
                startTime: { type: 'string' },
                totalTasks: { type: 'number' }
              }
            },
            timestamp: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async executeFullSync(
    request: FastifyRequest<{ Body: FullSyncRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowExecutionResult>> {
    const startTime = Date.now();

    try {
      this.logger.info('收到全量同步请求', {
        requestBody: request.body,
        xnxq: request.body.xnxq,
        forceSync: request.body.forceSync,
        batchSize: request.body.batchSize,
        timeout: request.body.timeout
      });

      // 构建同步配置
      const config: SyncWorkflowConfig = {
        xnxq: request.body.xnxq,
        syncType: 'full',
        forceSync: request.body.forceSync || false, // ✅ 添加forceSync参数
        batchSize: request.body.batchSize || 100,
        timeout: request.body.timeout || 1800000, // 30分钟
        maxConcurrency: request.body.maxConcurrency || 3,
        retryCount: request.body.retryCount || 3,
        parallel: request.body.parallel || false
      };

      // 执行全量同步工作流
      const result =
        await this.syncWorkflowService.executeFullSyncWorkflow(config);

      this.logger.info('全量同步工作流执行完成', {
        workflowId: result.workflowId,
        status: result.status,
        duration: Date.now() - startTime
      });

      return reply.code(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('全量同步执行失败', {
        xnxq: request.body.xnxq,
        error: errorMessage,
        duration: Date.now() - startTime
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'FULL_SYNC_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 执行增量同步
   */
  @Post('/sync/incremental', {
    schema: {
      body: {
        type: 'object',
        properties: {
          xnxq: {
            type: 'string',
            pattern: '^\\d{4}-\\d{4}-[12]$',
            description: '学年学期，格式：YYYY-YYYY-S'
          },
          batchSize: {
            type: 'number',
            minimum: 1,
            maximum: 1000,
            description: '批处理大小'
          },
          timeout: {
            type: 'number',
            minimum: 1000,
            description: '超时时间（毫秒）'
          },
          maxConcurrency: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: '最大并发数'
          },
          retryCount: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: '重试次数'
          }
        },
        required: ['xnxq']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                workflowId: { type: 'string' },
                status: { type: 'string' },
                startTime: { type: 'string' },
                totalTasks: { type: 'number' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async executeIncrementalSync(
    request: FastifyRequest<{ Body: IncrementalSyncRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WorkflowExecutionResult>> {
    const startTime = Date.now();

    try {
      this.logger.info('收到增量同步请求', {
        xnxq: request.body.xnxq,
        batchSize: request.body.batchSize
      });

      // 构建同步配置
      const config: SyncWorkflowConfig = {
        xnxq: request.body.xnxq,
        syncType: 'incremental',
        batchSize: request.body.batchSize || 50,
        timeout: request.body.timeout || 900000, // 15分钟
        maxConcurrency: request.body.maxConcurrency || 3,
        retryCount: request.body.retryCount || 3,
        parallel: true // 增量同步默认并行
      };

      // 执行增量同步工作流
      const result =
        await this.syncWorkflowService.executeIncrementalSyncWorkflow(config);

      this.logger.info('增量同步工作流执行完成', {
        workflowId: result.workflowId,
        status: result.status,
        duration: Date.now() - startTime
      });

      return reply.code(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('增量同步执行失败', {
        xnxq: request.body.xnxq,
        error: errorMessage,
        duration: Date.now() - startTime
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'INCREMENTAL_SYNC_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取同步状态
   */
  @Get('/sync/status/:workflowId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: '工作流ID'
          }
        },
        required: ['workflowId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                workflowId: { type: 'string' },
                status: { type: 'string' },
                progress: { type: 'number' },
                totalTasks: { type: 'number' },
                completedTasks: { type: 'number' },
                failedTasks: { type: 'number' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async getSyncStatus(
    request: FastifyRequest<{ Params: { workflowId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { workflowId } = request.params;

      this.logger.info('查询工作流状态', { workflowId });

      const status =
        await this.syncWorkflowService.getWorkflowStatus(workflowId);

      return reply.code(200).send({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('查询工作流状态失败', {
        workflowId: request.params.workflowId,
        error: errorMessage
      });

      return reply.code(404).send({
        success: false,
        error: errorMessage,
        code: 'WORKFLOW_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 取消同步任务
   */
  @Delete('/sync/:workflowId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: '工作流ID'
          }
        },
        required: ['workflowId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                cancelled: { type: 'boolean' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async cancelSync(
    request: FastifyRequest<{ Params: { workflowId: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { workflowId } = request.params;

      this.logger.info('取消工作流执行', { workflowId });

      const cancelled =
        await this.syncWorkflowService.cancelWorkflow(workflowId);

      return reply.code(200).send({
        success: true,
        data: { cancelled },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('取消工作流失败', {
        workflowId: request.params.workflowId,
        error: errorMessage
      });

      return reply.code(500).send({
        success: false,
        error: errorMessage,
        code: 'CANCEL_WORKFLOW_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 生命周期方法：控制器就绪
   */
  async onReady(): Promise<void> {
    this.logger.info('SyncController 已就绪');
  }

  /**
   * 生命周期方法：控制器关闭
   */
  async onClose(): Promise<void> {
    this.logger.info('SyncController 正在关闭');
  }
}
