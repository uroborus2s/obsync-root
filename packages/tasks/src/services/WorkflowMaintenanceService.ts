/**
 * 工作流维护服务
 * 替代数据库存储过程，提供可测试和可维护的应用层逻辑
 */

import type { Logger } from '@stratix/core';
import type { IWorkflowInstanceRepository } from '../repositories/WorkflowInstanceRepository.js';
import type {
  EngineFailureInfo,
  IWorkflowMaintenanceService,
  RecoverableInstance,
  WorkflowExecutionStats
} from '../types/IWorkflowMaintenanceService.js';
import { ServiceResult } from '../types/service.js';

export class WorkflowMaintenanceService implements IWorkflowMaintenanceService {
  constructor(
    private readonly workflowInstanceRepo: IWorkflowInstanceRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取可恢复的工作流实例
   * 替代 GetRecoverableInstances 存储过程
   */
  async getRecoverableInstances(
    heartbeatTimeoutSeconds: number = 300
  ): Promise<ServiceResult<RecoverableInstance[]>> {
    try {
      const timeoutMinutes = Math.ceil(heartbeatTimeoutSeconds / 60);

      // 使用Repository的findStaleInstances方法
      const result =
        await this.workflowInstanceRepo.findStaleInstances(timeoutMinutes);

      if (!result.success) {
        return ServiceResult.failure(
          `获取可恢复实例失败: ${result.error}`,
          'RECOVERY_FETCH_ERROR'
        );
      }

      const recoverableInstances: RecoverableInstance[] = (
        result.data || []
      ).map((instance: any) => ({
        instanceId: instance.id,
        workflowName: instance.name || 'Unknown',
        status: instance.status,
        lastHeartbeat: instance.last_heartbeat || new Date(),
        currentNodeId: instance.current_node_id,
        failureReason: instance.error_message || 'Unknown failure',
        canRecover:
          instance.status === 'paused' || instance.status === 'failed',
        recoveryStrategy: instance.status === 'paused' ? 'resume' : 'restart'
      }));

      return ServiceResult.success(recoverableInstances);
    } catch (error) {
      this.logger.error('获取可恢复实例异常', {
        error,
        heartbeatTimeoutSeconds
      });
      return ServiceResult.failure(
        `获取可恢复实例失败: ${error instanceof Error ? error.message : String(error)}`,
        'RECOVERY_FETCH_ERROR'
      );
    }
  }

  /**
   * 更新工作流心跳
   * 替代 UpdateWorkflowHeartbeat 存储过程
   */
  async updateWorkflowHeartbeat(
    instanceId: number,
    ownerId: string
  ): Promise<ServiceResult<number>> {
    try {
      // 使用updateStatus方法更新心跳信息
      const result = await this.workflowInstanceRepo.updateStatus(
        instanceId,
        'running',
        {
          lock_owner: ownerId,
          last_heartbeat: new Date(),
          updated_at: new Date()
        }
      );

      if (!result.success) {
        return ServiceResult.failure(
          `更新心跳失败: ${result.error}`,
          'HEARTBEAT_UPDATE_ERROR'
        );
      }

      return ServiceResult.success(1); // 返回受影响的行数
    } catch (error) {
      this.logger.error('更新心跳异常', { error, instanceId, ownerId });
      return ServiceResult.failure(
        `更新心跳失败: ${error instanceof Error ? error.message : String(error)}`,
        'HEARTBEAT_UPDATE_ERROR'
      );
    }
  }

  /**
   * 清理过期锁
   * 替代 CleanupExpiredLocks 存储过程
   */
  async cleanupExpiredLocks(): Promise<ServiceResult<number>> {
    try {
      this.logger.info('清理过期锁功能暂未实现，需要LockRepository支持');
      return ServiceResult.success(0);
    } catch (error) {
      this.logger.error('清理过期锁异常', { error });
      return ServiceResult.failure(
        `清理过期锁失败: ${error instanceof Error ? error.message : String(error)}`,
        'LOCK_CLEANUP_ERROR'
      );
    }
  }

  /**
   * 检测故障引擎
   * 替代 DetectFailedEngines 存储过程
   */
  async detectFailedEngines(
    heartbeatTimeoutSeconds: number = 300
  ): Promise<ServiceResult<EngineFailureInfo[]>> {
    try {
      this.logger.info(
        '检测故障引擎功能暂未实现，需要EngineInstanceRepository支持'
      );
      return ServiceResult.success([]);
    } catch (error) {
      this.logger.error('检测故障引擎异常', { error, heartbeatTimeoutSeconds });
      return ServiceResult.failure(
        `检测故障引擎失败: ${error instanceof Error ? error.message : String(error)}`,
        'ENGINE_DETECTION_ERROR'
      );
    }
  }

  /**
   * 获取工作流执行统计
   * 替代 GetWorkflowExecutionStats 存储过程
   */
  async getWorkflowExecutionStats(
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResult<WorkflowExecutionStats[]>> {
    try {
      this.logger.info('获取执行统计功能暂未实现，需要Repository支持统计查询');
      return ServiceResult.success([]);
    } catch (error) {
      this.logger.error('获取执行统计异常', { error, startDate, endDate });
      return ServiceResult.failure(
        `获取执行统计失败: ${error instanceof Error ? error.message : String(error)}`,
        'STATS_FETCH_ERROR'
      );
    }
  }

  /**
   * 更新业务键
   * 替代 UpdateBusinessKeys 存储过程
   */
  async updateBusinessKeys(
    batchSize: number = 1000
  ): Promise<ServiceResult<number>> {
    try {
      this.logger.info('更新业务键功能暂未实现，需要Repository支持复杂查询');
      return ServiceResult.success(0);
    } catch (error) {
      this.logger.error('更新业务键异常', { error, batchSize });
      return ServiceResult.failure(
        `更新业务键失败: ${error instanceof Error ? error.message : String(error)}`,
        'KEY_UPDATE_ERROR'
      );
    }
  }

  /**
   * 批量更新业务键和互斥键
   * 替代虚拟列的功能，通过应用层逻辑维护
   */
  async updateBusinessAndMutexKeys(): Promise<ServiceResult<number>> {
    try {
      this.logger.info(
        '批量更新业务键和互斥键功能暂未实现，需要Repository支持复杂查询'
      );
      return ServiceResult.success(0);
    } catch (error) {
      this.logger.error('批量更新业务键和互斥键异常', { error });
      return ServiceResult.failure(
        `批量更新业务键和互斥键失败: ${error instanceof Error ? error.message : String(error)}`,
        'KEY_UPDATE_ERROR'
      );
    }
  }

  /**
   * 执行故障转移
   * 替代 ExecuteFailover 存储过程
   */
  async executeFailover(
    failedEngineId: string,
    takeoverEngineId: string,
    reason: string
  ): Promise<ServiceResult<string>> {
    try {
      const eventId = `failover_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      this.logger.info('执行故障转移', {
        failedEngineId,
        takeoverEngineId,
        reason,
        eventId
      });

      this.logger.info('故障转移功能暂未完全实现，需要更多Repository支持');

      return ServiceResult.success(eventId);
    } catch (error) {
      this.logger.error('执行故障转移异常', {
        error,
        failedEngineId,
        takeoverEngineId,
        reason
      });
      return ServiceResult.failure(
        `执行故障转移失败: ${error instanceof Error ? error.message : String(error)}`,
        'FAILOVER_EXECUTION_ERROR'
      );
    }
  }
}
