// @stratix/icasync 增量同步适配器
// 基于 @stratix/tasks 预定义工作流的适配器实现

import type { AwilixContainer, Logger } from '@stratix/core';
import type {
  IWorkflowAdapter,
  PaginatedResult,
  WorkflowAdapterResult,
  WorkflowInstance
} from '@stratix/tasks';
import type { IICAsyncMutexManager } from '../services/ICAsyncMutexManager.js';
import { SyncStatus, type SyncResult } from '../types/sync.js';

/**
 * 增量同步配置
 */
export interface IncrementalSyncConfig {
  readonly xnxq: string;
  readonly batchSize?: number;
  readonly timeout?: number;
  readonly lastSyncTime?: Date;
  readonly syncScope?: 'all' | 'courses' | 'students' | 'schedules';
}

/**
 * 扩展的工作流适配器接口，支持通过名称引用预定义工作流
 */
interface IExtendedWorkflowAdapter extends IWorkflowAdapter {
  createWorkflow(
    definition: any | { name: string; version?: string },
    inputs?: Record<string, any>,
    options?: any
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;

  executeWorkflow(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;
}

/**
 * 增量同步适配器
 * 注册名称：incrementalSync
 * 基于 @stratix/tasks 预定义工作流的适配器实现
 */
export default class IncrementalSyncAdapter {
  static adapterName = 'incrementalSync';

  private workflowAdapter: IExtendedWorkflowAdapter;
  private icasyncMutexManager: IICAsyncMutexManager;
  private logger: Logger;

  constructor(container: AwilixContainer) {
    // 使用 WorkflowAdapter 作为代理，而不是直接访问底层服务
    this.workflowAdapter = container.resolve('tasksWorkflow');
    // 使用新的ICAsync互斥管理器
    this.icasyncMutexManager = container.resolve('iCAsyncMutexManager');
    this.logger = container.resolve('logger');
  }

  /**
   * 执行增量同步
   */
  async executeIncrementalSync(
    config: IncrementalSyncConfig
  ): Promise<SyncResult> {
    this.logger.info(
      `[IncrementalSyncAdapter] Starting incremental sync for ${config.xnxq}`
    );

    try {
      // 使用新的ICAsync互斥管理器创建增量同步工作流
      const workflowDefinition = {
        name: 'incremental-sync-workflow',
        version: '1.0.0'
      } as any; // 简化处理，实际应该是完整的WorkflowDefinition

      const inputs = {
        xnxq: config.xnxq,
        batchSize: config.batchSize || 50,
        timeout: config.timeout ? `${config.timeout}ms` : '30m',
        lastSyncTime: config.lastSyncTime?.toISOString() || null,
        syncScope: config.syncScope || 'all',
        clearExisting: false,
        createAttendanceRecords: true,
        sendNotification: false
      };

      const options = {
        timeout: config.timeout || 1200000, // 20分钟默认超时
        externalId: `incremental-sync-${config.xnxq}-${Date.now()}`,
        businessKey: `incremental-sync-${config.xnxq}`,
        metadata: {
          syncType: 'incremental',
          xnxq: config.xnxq,
          syncScope: config.syncScope,
          startTime: new Date().toISOString()
        }
      };

      const workflowResult =
        await this.icasyncMutexManager.createMutexIncrementalSync(
          workflowDefinition,
          inputs,
          options
        );

      if (!workflowResult.success) {
        // 检查是否是因为存在冲突的实例而失败
        if (workflowResult.conflictingInstance) {
          const reasonType = workflowResult.reason || 'unknown';
          let message = '已存在运行中的同步任务';

          if (reasonType === 'type_mutex') {
            message = '该学期已有其他类型的同步正在执行，与增量同步互斥';
          }

          this.logger.warn(`[IncrementalSyncAdapter] 增量同步被业务规则阻止`, {
            xnxq: config.xnxq,
            reason: reasonType,
            conflictingInstanceId: workflowResult.conflictingInstance.id,
            ruleResult: workflowResult.ruleResult
          });

          return {
            status: SyncStatus.SKIPPED,
            processedCount: 0,
            successCount: 0,
            failedCount: 0,
            startTime: new Date(),
            endTime: new Date(),
            details: {
              reason: reasonType,
              message,
              conflictingInstanceId: workflowResult.conflictingInstance.id,
              ruleResult: workflowResult.ruleResult
            }
          };
        }

        throw new Error(`创建互斥工作流失败: ${workflowResult.error}`);
      }

      const workflowInstance = workflowResult.instance!;
      const workflowId = String(workflowInstance.id);
      this.logger.info(
        `[IncrementalSyncAdapter] 互斥工作流创建成功，ID: ${workflowId}`,
        {
          xnxq: config.xnxq,
          instanceId: workflowId,
          syncScope: config.syncScope
        }
      );

      // 执行工作流
      const executeResult =
        await this.workflowAdapter.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行工作流失败: ${executeResult.error}`);
      }

      this.logger.info(
        `[IncrementalSyncAdapter] Incremental sync completed for ${config.xnxq}`,
        { workflowId, xnxq: config.xnxq, syncScope: config.syncScope }
      );

      // 返回符合 SyncResult 接口的结果
      return {
        status: SyncStatus.COMPLETED,
        processedCount: 1,
        successCount: 1,
        failedCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        details: {
          workflowId,
          xnxq: config.xnxq,
          syncScope: config.syncScope,
          status: 'completed',
          data: executeResult.data
        }
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[IncrementalSyncAdapter] Incremental sync failed: ${errorMessage}`
      );

      return {
        status: SyncStatus.FAILED,
        processedCount: 0,
        successCount: 0,
        failedCount: 1,
        startTime: new Date(),
        endTime: new Date(),
        errors: [errorMessage],
        details: {
          error: errorMessage,
          xnxq: config.xnxq,
          syncScope: config.syncScope
        }
      };
    }
  }

  /**
   * 检查指定学年学期是否有正在运行的增量同步任务
   */
  async checkRunningIncrementalSync(xnxq: string): Promise<{
    isRunning: boolean;
    instance?: WorkflowInstance;
  }> {
    try {
      const runningInstances = await this.workflowAdapter.listWorkflowInstances(
        {
          status: 'running',
          businessKey: `incremental-sync-${xnxq}`,
          limit: 10
        }
      );

      if (!runningInstances.success) {
        throw new Error(`查询运行中实例失败: ${runningInstances.error}`);
      }

      const paginatedData =
        runningInstances.data as unknown as PaginatedResult<WorkflowInstance>;
      const instances = paginatedData?.items || [];
      const matchingInstance = instances.find((instance: WorkflowInstance) => {
        const inputXnxq = instance.inputData?.xnxq;
        return inputXnxq === xnxq;
      });

      return {
        isRunning: !!matchingInstance,
        instance: matchingInstance
      };
    } catch (error) {
      this.logger.error(
        `[IncrementalSyncAdapter] Failed to check running sync`,
        {
          xnxq,
          error
        }
      );
      return { isRunning: false };
    }
  }

  /**
   * 获取增量同步历史
   */
  async getSyncHistory(
    xnxq: string,
    limit: number = 10
  ): Promise<{
    success: boolean;
    instances?: WorkflowInstance[];
    error?: string;
  }> {
    try {
      const historyResult = await this.workflowAdapter.listWorkflowInstances({
        businessKey: `incremental-sync-${xnxq}`,
        limit,
        // 按创建时间倒序
        orderBy: 'created_at',
        orderDirection: 'desc'
      });

      if (!historyResult.success) {
        return {
          success: false,
          error: historyResult.error
        };
      }

      const paginatedHistoryData =
        historyResult.data as unknown as PaginatedResult<WorkflowInstance>;
      return {
        success: true,
        instances: paginatedHistoryData?.items || []
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[IncrementalSyncAdapter] Failed to get sync history`, {
        xnxq,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 取消正在运行的增量同步
   */
  async cancelIncrementalSync(xnxq: string): Promise<{
    success: boolean;
    cancelledInstances: number;
    error?: string;
  }> {
    try {
      const runningCheck = await this.checkRunningIncrementalSync(xnxq);

      if (!runningCheck.isRunning || !runningCheck.instance) {
        return {
          success: true,
          cancelledInstances: 0
        };
      }

      const cancelResult = await this.workflowAdapter.cancelWorkflow(
        String(runningCheck.instance.id)
      );

      if (!cancelResult.success) {
        return {
          success: false,
          cancelledInstances: 0,
          error: cancelResult.error
        };
      }

      this.logger.info(`[IncrementalSyncAdapter] Cancelled incremental sync`, {
        xnxq,
        instanceId: runningCheck.instance.id
      });

      return {
        success: true,
        cancelledInstances: 1
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[IncrementalSyncAdapter] Failed to cancel sync`, {
        xnxq,
        error: errorMessage
      });

      return {
        success: false,
        cancelledInstances: 0,
        error: errorMessage
      };
    }
  }
}
