import {
  Controller,
  FastifyReply,
  FastifyRequest,
  Logger,
  Post
} from '@stratix/core';
import { FullSyncAdapter } from '@stratix/icasync';
import { ITasksWorkflowAdapter } from '@stratix/tasks';

/**
 * 全量同步请求体
 */
interface FullSyncRequest {
  /** 学年学期标识，格式：YYYY-YYYY-S（如：2024-2025-1） */
  xnxq: string;
  /** 是否强制同步，默认false */
  forceSync?: boolean;
  /** 批处理大小，默认1000 */
  batchSize?: number;
  /** 业务键，用于实例锁检查 */
  businessKey?: string;
}

/**
 * 删除旧日历请求体
 */
interface DeleteOldCalendarsRequest {
  /** 学年学期标识，格式：YYYY-YYYY-S（如：2024-2025-1） */
  xnxq: string;
  /** 是否包含非活跃日历，默认true */
  includeInactive?: boolean;
  /** 排序方式，默认按创建时间倒序 */
  orderBy?: string;
  /** 限制数量，默认10000 */
  limit?: number;
  /** 业务键，用于实例锁检查 */
  businessKey?: string;
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

@Controller()
export default class WorkflowController {
  constructor(
    private readonly icasyncFullSync: FullSyncAdapter,
    private readonly tasksWorkflow: ITasksWorkflowAdapter,
    private readonly logger: Logger
  ) {}

  @Post('/api/workflows/icasync/fullsync')
  async startFullSyncWorkflow(
    request: FastifyRequest<{ Body: FullSyncRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { xnxq, forceSync, batchSize } = request.body;

      // 验证必需参数
      if (!xnxq) {
        return this.sendErrorResponse(
          reply,
          400,
          'Missing required field: xnxq'
        );
      }

      this.logger.info('启动全量同步工作流', { xnxq, forceSync, batchSize });

      // 调用全量同步适配器
      const syncResult = await this.icasyncFullSync.startManualSync({
        xnxq
      });

      this.logger.info('全量同步工作流启动结果', { syncResult });

      // 返回成功响应
      this.sendSuccessResponse(reply, 200, {
        message: '全量同步工作流启动成功',
        syncResult
      });
    } catch (error) {
      this.logger.error('启动全量同步工作流失败', { error });
      this.sendErrorResponse(reply, 500, '启动全量同步工作流失败', error);
    }
  }

  @Post('/api/workflows/icasync/deletecalendars')
  async startDeleteOldCalendarsWorkflow(
    request: FastifyRequest<{ Body: DeleteOldCalendarsRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        xnxq,
        includeInactive = true,
        orderBy = 'created_at DESC',
        limit = 10000,
        businessKey
      } = request.body;

      // 验证必需参数
      if (!xnxq) {
        return this.sendErrorResponse(
          reply,
          400,
          'Missing required field: xnxq'
        );
      }

      this.logger.info('启动删除旧日历工作流', {
        xnxq,
        includeInactive,
        orderBy,
        limit
      });

      // 准备工作流选项
      const workflowOptions = {
        workflowName: 'delete-old-calendar-workflow',
        workflowVersion: '1.0.0',
        businessKey: businessKey || `delete-old-calendars-${xnxq}`,
        inputData: {
          xnxq,
          includeInactive,
          orderBy,
          limit,
          triggeredBy: 'manual',
          triggeredAt: new Date().toISOString()
        },
        contextData: {
          instanceType: 'delete-old-calendars',
          createdBy: 'manual-trigger',
          syncMode: 'manual',
          priority: 'normal' as const
        }
      };

      this.logger.debug('准备启动删除旧日历工作流', { workflowOptions });

      // 使用工作流适配器启动工作流
      const workflowResult = await this.tasksWorkflow.startWorkflowByName(
        workflowOptions.workflowName,
        workflowOptions
      );

      if (!workflowResult.success) {
        this.logger.error('启动删除旧日历工作流失败', {
          error: workflowResult.error,
          errorDetails: workflowResult.errorDetails
        });

        return this.sendErrorResponse(
          reply,
          500,
          '启动删除旧日历工作流失败',
          workflowResult.error
        );
      }

      const workflowInstance = workflowResult.data;

      this.logger.info('删除旧日历工作流启动成功', {
        instanceId: workflowInstance?.id,
        workflowName: workflowInstance?.name,
        status: workflowInstance?.status
      });

      // 返回成功响应
      this.sendSuccessResponse(reply, 200, {
        message: '删除旧日历工作流启动成功',
        workflowInstance: {
          id: workflowInstance?.id,
          name: workflowInstance?.name,
          status: workflowInstance?.status,
          startedAt: workflowInstance?.startedAt,
          inputData: workflowOptions.inputData
        }
      });
    } catch (error) {
      this.logger.error('启动删除旧日历工作流失败', { error });
      this.sendErrorResponse(reply, 500, '启动删除旧日历工作流失败', error);
    }
  }

  /**
   * 发送成功响应
   */
  private sendSuccessResponse<T>(
    reply: FastifyReply,
    statusCode: number,
    data: T
  ): void {
    const response: ApiResponse<T> = {
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
