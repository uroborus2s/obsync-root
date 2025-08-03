/**
 * 工作流实例仓储
 *
 * 提供工作流实例的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type { QueryOptions } from '../types/common.js';
import type {
  NewWorkflowInstance,
  WorkflowInstance,
  WorkflowInstanceUpdate
} from '../types/database.js';
import type { WorkflowStatus } from '../types/workflow.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 工作流实例查询选项
 */
export interface WorkflowInstanceQueryOptions extends QueryOptions {
  includeCompleted?: boolean;
  includeFailed?: boolean;
  priority?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 工作流实例仓储接口
 */
export interface IWorkflowInstanceRepository {
  /**
   * 根据ID查找工作流实例
   * @param id 实例ID
   * @returns 工作流实例或null
   */
  findByIdNullable(
    id: number
  ): Promise<DatabaseResult<WorkflowInstance | null>>;

  /**
   * 根据外部ID查找工作流实例
   * @param externalId 外部ID
   * @returns 工作流实例或null
   */
  findByExternalId(
    externalId: string
  ): Promise<DatabaseResult<WorkflowInstance | null>>;

  /**
   * 根据工作流定义ID查找实例
   * @param workflowDefinitionId 工作流定义ID
   * @param options 查询选项
   * @returns 工作流实例列表
   */
  findByWorkflowDefinitionId(
    workflowDefinitionId: number,
    options?: WorkflowInstanceQueryOptions
  ): Promise<DatabaseResult<WorkflowInstance[]>>;

  /**
   * 根据状态查找工作流实例
   * @param status 状态或状态列表
   * @param options 查询选项
   * @returns 工作流实例列表
   */
  findByStatus(
    status: WorkflowStatus | WorkflowStatus[],
    options?: WorkflowInstanceQueryOptions
  ): Promise<DatabaseResult<WorkflowInstance[]>>;

  /**
   * 查找需要调度的工作流实例
   * @param limit 限制数量
   * @returns 工作流实例列表
   */
  findScheduledInstances(
    limit?: number
  ): Promise<DatabaseResult<WorkflowInstance[]>>;

  /**
   * 查找中断的工作流实例
   * @param options 查询选项
   * @returns 工作流实例列表
   */
  findInterruptedInstances(
    options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowInstance[]>>;

  /**
   * 查找长时间运行的工作流实例
   * @param thresholdMinutes 阈值（分钟）
   * @param options 查询选项
   * @returns 工作流实例列表
   */
  findLongRunningInstances(
    thresholdMinutes: number,
    options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowInstance[]>>;

  /**
   * 更新工作流状态
   * @param id 实例ID
   * @param status 新状态
   * @param additionalData 额外数据
   * @returns 更新的实例
   */
  updateStatus(
    id: number,
    status: WorkflowStatus,
    additionalData?: Partial<WorkflowInstanceUpdate>
  ): Promise<DatabaseResult<WorkflowInstance | null>>;

  /**
   * 批量更新状态
   * @param ids ID列表
   * @param status 新状态
   * @returns 更新的记录数
   */
  batchUpdateStatus(
    ids: number[],
    status: WorkflowStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<
    DatabaseResult<{
      totalCount: number;
      runningCount: number;
      completedCount: number;
      failedCount: number;
      pausedCount: number;
    }>
  >;
}

/**
 * 工作流实例仓储实现
 */
export default class WorkflowInstanceRepository
  extends BaseTasksRepository<
    'workflow_instances',
    WorkflowInstance,
    NewWorkflowInstance,
    WorkflowInstanceUpdate
  >
  implements IWorkflowInstanceRepository
{
  protected readonly tableName = 'workflow_instances' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByExternalId(
    externalId: string
  ): Promise<DatabaseResult<WorkflowInstance | null>> {
    return await this.findOneNullable((qb: any) =>
      qb.where('external_id', externalId)
    );
  }

  async findByWorkflowDefinitionId(
    workflowDefinitionId: number,
    options?: WorkflowInstanceQueryOptions
  ): Promise<DatabaseResult<WorkflowInstance[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('workflow_definition_id', workflowDefinitionId);

      if (options?.includeCompleted === false) {
        qb = qb.whereNot('status', 'completed');
      }

      if (options?.includeFailed === false) {
        qb = qb.whereNot('status', 'failed');
      }

      if (options?.priority !== undefined) {
        qb = qb.where('priority', options.priority);
      }

      if (options?.startDate) {
        qb = qb.where('created_at', '>=', options.startDate);
      }

      if (options?.endDate) {
        qb = qb.where('created_at', '<=', options.endDate);
      }

      return qb;
    });
  }

  async findByStatus(
    status: WorkflowStatus | WorkflowStatus[],
    _options?: WorkflowInstanceQueryOptions
  ): Promise<DatabaseResult<WorkflowInstance[]>> {
    return await this.findMany(this.queryByStatus(status));
  }

  async findScheduledInstances(
    limit = 100
  ): Promise<DatabaseResult<WorkflowInstance[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('status', 'scheduled')
        .where('scheduled_at', '<=', new Date())
        .orderBy('scheduled_at', 'asc')
        .limit(limit)
    );
  }

  async findInterruptedInstances(
    _options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowInstance[]>> {
    return await this.findMany((qb: any) =>
      qb.whereIn('status', ['paused', 'failed', 'cancelled'])
    );
  }

  async findLongRunningInstances(
    thresholdMinutes: number,
    _options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowInstance[]>> {
    const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    return await this.findMany((qb: any) =>
      qb.where('status', 'running').where('started_at', '<=', thresholdTime)
    );
  }

  async updateStatus(
    id: number,
    status: WorkflowStatus,
    additionalData?: Partial<WorkflowInstanceUpdate>
  ): Promise<DatabaseResult<WorkflowInstance | null>> {
    const updateData: WorkflowInstanceUpdate = {
      status,
      updated_at: new Date(),
      ...additionalData
    };

    // 根据状态设置相应的时间戳
    if (status === 'running' && !additionalData?.started_at) {
      updateData.started_at = new Date();
    } else if (status === 'completed' && !additionalData?.completed_at) {
      updateData.completed_at = new Date();
    } else if (status === 'paused' && !additionalData?.paused_at) {
      updateData.paused_at = new Date();
    }

    return await this.updateNullable(id, updateData);
  }

  async batchUpdateStatus(
    ids: number[],
    status: WorkflowStatus
  ): Promise<DatabaseResult<number>> {
    return await super.batchUpdateStatus(ids, status, {
      updated_at: new Date()
    });
  }

  async getStatistics(): Promise<
    DatabaseResult<{
      totalCount: number;
      runningCount: number;
      completedCount: number;
      failedCount: number;
      pausedCount: number;
    }>
  > {
    try {
      const totalCountResult = await this.count();
      const runningCountResult = await this.count((qb: any) =>
        qb.where('status', 'running')
      );
      const completedCountResult = await this.count((qb: any) =>
        qb.where('status', 'completed')
      );
      const failedCountResult = await this.count((qb: any) =>
        qb.where('status', 'failed')
      );
      const pausedCountResult = await this.count((qb: any) =>
        qb.where('status', 'paused')
      );

      return {
        success: true,
        data: {
          totalCount: totalCountResult.success ? totalCountResult.data : 0,
          runningCount: runningCountResult.success
            ? runningCountResult.data
            : 0,
          completedCount: completedCountResult.success
            ? completedCountResult.data
            : 0,
          failedCount: failedCountResult.success ? failedCountResult.data : 0,
          pausedCount: pausedCountResult.success ? pausedCountResult.data : 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as any
      };
    }
  }
}
