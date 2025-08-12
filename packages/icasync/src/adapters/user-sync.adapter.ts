// @stratix/icasync 用户同步适配器
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
 * 用户同步配置
 */
export interface UserSyncConfig {
  readonly xnxq: string;
  readonly userIds?: string[];
  readonly userType?: 'student' | 'teacher' | 'all';
  readonly batchSize?: number;
  readonly timeout?: number;
  readonly syncScope?: 'profile' | 'courses' | 'schedules' | 'all';
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
 * 用户同步适配器
 * 注册名称：userSync
 * 基于 @stratix/tasks 预定义工作流的适配器实现
 */
export default class UserSyncAdapter {
  static adapterName = 'userSync';

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
   * 执行用户同步
   */
  async executeUserSync(config: UserSyncConfig): Promise<SyncResult> {
    this.logger.info(
      `[UserSyncAdapter] Starting user sync for ${config.xnxq}`,
      {
        userType: config.userType,
        userCount: config.userIds?.length || 0,
        syncScope: config.syncScope
      }
    );

    try {
      // 使用新的ICAsync互斥管理器创建用户同步工作流
      const workflowDefinition = {
        name: 'user-sync-workflow',
        version: '1.0.0'
      } as any; // 简化处理，实际应该是完整的WorkflowDefinition

      const inputs = {
        xnxq: config.xnxq,
        userIds: config.userIds || [],
        userType: config.userType || 'all',
        batchSize: config.batchSize || 20,
        timeout: config.timeout ? `${config.timeout}ms` : '15m',
        syncScope: config.syncScope || 'all',
        clearExisting: false,
        createAttendanceRecords: false,
        sendNotification: true
      };

      const options = {
        timeout: config.timeout || 900000, // 15分钟默认超时
        externalId: `user-sync-${config.xnxq}-${Date.now()}`,
        businessKey: `user-sync-${config.xnxq}`,
        metadata: {
          syncType: 'user',
          xnxq: config.xnxq,
          userType: config.userType,
          syncScope: config.syncScope,
          userCount: config.userIds?.length || 0,
          startTime: new Date().toISOString()
        }
      };

      const workflowResult = await this.icasyncMutexManager.createMutexUserSync(
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
            message = '该学期已有其他类型的同步正在执行，与用户同步互斥';
          }

          this.logger.warn(`[UserSyncAdapter] 用户同步被业务规则阻止`, {
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
        `[UserSyncAdapter] 互斥工作流创建成功，ID: ${workflowId}`,
        {
          xnxq: config.xnxq,
          instanceId: workflowId,
          userType: config.userType,
          userCount: config.userIds?.length || 0
        }
      );

      // 执行工作流
      const executeResult =
        await this.workflowAdapter.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行工作流失败: ${executeResult.error}`);
      }

      this.logger.info(
        `[UserSyncAdapter] User sync completed for ${config.xnxq}`,
        {
          workflowId,
          xnxq: config.xnxq,
          userType: config.userType,
          userCount: config.userIds?.length || 0
        }
      );

      // 返回符合 SyncResult 接口的结果
      return {
        status: SyncStatus.COMPLETED,
        processedCount: config.userIds?.length || 0,
        successCount: config.userIds?.length || 0,
        failedCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        details: {
          workflowId,
          xnxq: config.xnxq,
          userType: config.userType,
          syncScope: config.syncScope,
          userCount: config.userIds?.length || 0,
          status: 'completed',
          data: executeResult.data
        }
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[UserSyncAdapter] User sync failed: ${errorMessage}`);

      return {
        status: SyncStatus.FAILED,
        processedCount: 0,
        successCount: 0,
        failedCount: config.userIds?.length || 1,
        startTime: new Date(),
        endTime: new Date(),
        errors: [errorMessage],
        details: {
          error: errorMessage,
          xnxq: config.xnxq,
          userType: config.userType,
          syncScope: config.syncScope,
          userCount: config.userIds?.length || 0
        }
      };
    }
  }

  /**
   * 批量用户同步
   */
  async executeBatchUserSync(
    xnxq: string,
    userIds: string[],
    options?: {
      userType?: 'student' | 'teacher';
      batchSize?: number;
      timeout?: number;
      syncScope?: 'profile' | 'courses' | 'schedules' | 'all';
    }
  ): Promise<SyncResult> {
    const config: UserSyncConfig = {
      xnxq,
      userIds,
      userType: options?.userType || 'all',
      batchSize: options?.batchSize || 20,
      timeout: options?.timeout,
      syncScope: options?.syncScope || 'all'
    };

    return this.executeUserSync(config);
  }

  /**
   * 单个用户同步
   */
  async executeSingleUserSync(
    xnxq: string,
    userId: string,
    options?: {
      userType?: 'student' | 'teacher';
      syncScope?: 'profile' | 'courses' | 'schedules' | 'all';
    }
  ): Promise<SyncResult> {
    const config: UserSyncConfig = {
      xnxq,
      userIds: [userId],
      userType: options?.userType || 'all',
      batchSize: 1,
      timeout: 300000, // 5分钟
      syncScope: options?.syncScope || 'all'
    };

    return this.executeUserSync(config);
  }

  /**
   * 检查指定学年学期是否有正在运行的用户同步任务
   */
  async checkRunningUserSync(xnxq: string): Promise<{
    isRunning: boolean;
    instance?: WorkflowInstance;
  }> {
    try {
      const runningInstances = await this.workflowAdapter.listWorkflowInstances(
        {
          status: 'running',
          businessKey: `user-sync-${xnxq}`,
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
      this.logger.error(`[UserSyncAdapter] Failed to check running sync`, {
        xnxq,
        error
      });
      return { isRunning: false };
    }
  }

  /**
   * 取消正在运行的用户同步
   */
  async cancelUserSync(xnxq: string): Promise<{
    success: boolean;
    cancelledInstances: number;
    error?: string;
  }> {
    try {
      const runningCheck = await this.checkRunningUserSync(xnxq);

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

      this.logger.info(`[UserSyncAdapter] Cancelled user sync`, {
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
      this.logger.error(`[UserSyncAdapter] Failed to cancel sync`, {
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
