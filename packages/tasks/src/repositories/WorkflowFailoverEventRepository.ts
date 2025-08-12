/**
 * 工作流故障转移事件仓储
 *
 * 提供工作流故障转移事件的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type {
  NewWorkflowFailoverEvent,
  WorkflowFailoverEvent,
  WorkflowFailoverEventUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 故障转移状态类型
 */
export type FailoverStatus =
  | 'initiated'
  | 'in_progress'
  | 'completed'
  | 'failed';

/**
 * 工作流故障转移事件仓储接口
 */
export interface IWorkflowFailoverEventRepository {
  /**
   * 根据事件ID查找故障转移事件
   * @param eventId 事件ID
   * @returns 故障转移事件或null
   */
  findByEventId(
    eventId: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent | null>>;

  /**
   * 根据故障引擎ID查找故障转移事件
   * @param failedEngineId 故障引擎ID
   * @returns 故障转移事件列表
   */
  findByFailedEngineId(
    failedEngineId: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>>;

  /**
   * 根据接管引擎ID查找故障转移事件
   * @param takeoverEngineId 接管引擎ID
   * @returns 故障转移事件列表
   */
  findByTakeoverEngineId(
    takeoverEngineId: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>>;

  /**
   * 根据状态查找故障转移事件
   * @param status 故障转移状态
   * @returns 故障转移事件列表
   */
  findByStatus(
    status: FailoverStatus
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>>;

  /**
   * 查找进行中的故障转移事件
   * @returns 进行中的故障转移事件列表
   */
  findActiveFailovers(): Promise<DatabaseResult<WorkflowFailoverEvent[]>>;

  /**
   * 根据时间范围查找故障转移事件
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 故障转移事件列表
   */
  findByTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>>;

  /**
   * 查找影响特定工作流的故障转移事件
   * @param workflowInstanceId 工作流实例ID
   * @returns 故障转移事件列表
   */
  findByAffectedWorkflow(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>>;

  /**
   * 创建故障转移事件
   * @param data 故障转移事件数据
   * @returns 创建的故障转移事件
   */
  createFailoverEvent(
    data: NewWorkflowFailoverEvent
  ): Promise<DatabaseResult<WorkflowFailoverEvent>>;

  /**
   * 更新故障转移状态
   * @param eventId 事件ID
   * @param status 新状态
   * @param additionalData 额外数据
   * @returns 更新的故障转移事件
   */
  updateStatus(
    eventId: string,
    status: FailoverStatus,
    additionalData?: Partial<WorkflowFailoverEventUpdate>
  ): Promise<DatabaseResult<WorkflowFailoverEvent | null>>;

  /**
   * 完成故障转移
   * @param eventId 事件ID
   * @returns 更新的故障转移事件
   */
  completeFailover(
    eventId: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent | null>>;

  /**
   * 标记故障转移失败
   * @param eventId 事件ID
   * @param reason 失败原因
   * @returns 更新的故障转移事件
   */
  markFailoverFailed(
    eventId: string,
    reason: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent | null>>;

  /**
   * 获取故障转移统计信息
   * @param engineId 引擎ID（可选）
   * @returns 统计信息
   */
  getStatistics(engineId?: string): Promise<
    DatabaseResult<{
      totalFailovers: number;
      completedFailovers: number;
      failedFailovers: number;
      activeFailovers: number;
      averageRecoveryTime: number;
      mostAffectedEngine: string | null;
    }>
  >;
}

/**
 * 工作流故障转移事件仓储实现
 */
export default class WorkflowFailoverEventRepository
  extends BaseTasksRepository<
    'workflow_failover_events',
    WorkflowFailoverEvent,
    NewWorkflowFailoverEvent,
    WorkflowFailoverEventUpdate
  >
  implements IWorkflowFailoverEventRepository
{
  protected readonly tableName = 'workflow_failover_events' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByEventId(
    eventId: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent | null>> {
    return await this.findOneNullable((qb: any) =>
      qb.where('event_id', '=', eventId)
    );
  }

  async findByFailedEngineId(
    failedEngineId: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('failed_engine_id', '=', failedEngineId)
        .orderBy('failover_at', 'desc')
    );
  }

  async findByTakeoverEngineId(
    takeoverEngineId: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('takeover_engine_id', '=', takeoverEngineId)
        .orderBy('failover_at', 'desc')
    );
  }

  async findByStatus(
    status: FailoverStatus
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>> {
    return await this.findMany((qb: any) =>
      qb.where('status', '=', status).orderBy('failover_at', 'desc')
    );
  }

  async findActiveFailovers(): Promise<
    DatabaseResult<WorkflowFailoverEvent[]>
  > {
    return await this.findMany((qb: any) =>
      qb
        .whereIn('status', ['initiated', 'in_progress'])
        .orderBy('failover_at', 'asc')
    );
  }

  async findByTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('failover_at', '>=', startTime)
        .where('failover_at', '<=', endTime)
        .orderBy('failover_at', 'desc')
    );
  }

  async findByAffectedWorkflow(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowFailoverEvent[]>> {
    return await this.findMany((qb: any) =>
      qb
        .whereRaw('JSON_CONTAINS(affected_workflows, ?)', [
          workflowInstanceId.toString()
        ])
        .orderBy('failover_at', 'desc')
    );
  }

  async createFailoverEvent(
    data: NewWorkflowFailoverEvent
  ): Promise<DatabaseResult<WorkflowFailoverEvent>> {
    const createData = {
      ...data,
      failover_at: new Date(),
      status: 'initiated' as FailoverStatus
    };

    this.logger.warn('Creating failover event', {
      eventId: data.event_id,
      failedEngineId: data.failed_engine_id,
      takeoverEngineId: data.takeover_engine_id,
      reason: data.failover_reason
    });

    return await this.create(createData);
  }

  async updateStatus(
    eventId: string,
    status: FailoverStatus,
    additionalData?: Partial<WorkflowFailoverEventUpdate>
  ): Promise<DatabaseResult<WorkflowFailoverEvent | null>> {
    const updateData: WorkflowFailoverEventUpdate = {
      status,
      updated_at: new Date(),
      ...additionalData
    };

    // 根据状态设置相应的时间戳
    if (status === 'completed' && !additionalData?.recovery_completed_at) {
      updateData.recovery_completed_at = new Date();
    }

    const result = await this.updateMany(
      (qb: any) => qb.where('event_id', '=', eventId),
      updateData
    );

    if (result.success && result.data > 0) {
      this.logger.info('Failover event status updated', {
        eventId,
        status
      });
      return await this.findByEventId(eventId);
    }

    return {
      success: false,
      error: 'Failover event not found' as any
    };
  }

  async completeFailover(
    eventId: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent | null>> {
    return await this.updateStatus(eventId, 'completed', {
      recovery_completed_at: new Date()
    });
  }

  async markFailoverFailed(
    eventId: string,
    reason: string
  ): Promise<DatabaseResult<WorkflowFailoverEvent | null>> {
    // 获取当前事件以更新失败原因
    const currentEvent = await this.findByEventId(eventId);
    if (!currentEvent.success || !currentEvent.data) {
      return {
        success: false,
        error: 'Failover event not found' as any
      };
    }

    const updatedReason = `${currentEvent.data.failover_reason}; Failed: ${reason}`;

    return await this.updateStatus(eventId, 'failed', {
      failover_reason: updatedReason
    });
  }

  async getStatistics(engineId?: string): Promise<
    DatabaseResult<{
      totalFailovers: number;
      completedFailovers: number;
      failedFailovers: number;
      activeFailovers: number;
      averageRecoveryTime: number;
      mostAffectedEngine: string | null;
    }>
  > {
    try {
      const baseQuery = (qb: any) => {
        if (engineId) {
          return qb.where((subQb: any) =>
            subQb
              .where('failed_engine_id', '=', engineId)
              .orWhere('takeover_engine_id', '=', engineId)
          );
        }
        return qb;
      };

      const totalResult = await this.count(baseQuery);
      const completedResult = await this.count((qb: any) =>
        baseQuery(qb).where('status', '=', 'completed')
      );
      const failedResult = await this.count((qb: any) =>
        baseQuery(qb).where('status', '=', 'failed')
      );
      const activeResult = await this.count((qb: any) =>
        baseQuery(qb).whereIn('status', ['initiated', 'in_progress'])
      );

      // 暂时返回0，实际计算平均恢复时间需要更复杂的查询
      const avgRecoveryResult = {
        success: true,
        data: [{ avg_recovery_time: 0 }]
      };

      // 查找最受影响的引擎
      const mostAffectedResult = await this.databaseApi.executeQuery(
        async (db) => {
          return await db
            .selectFrom(this.tableName)
            .select('failed_engine_id')
            .select(db.fn.count('id').as('failure_count'))
            .groupBy('failed_engine_id')
            .orderBy('failure_count', 'desc')
            .limit(1)
            .execute();
        }
      );

      const averageRecoveryTime =
        avgRecoveryResult.success &&
        avgRecoveryResult.data?.[0]?.avg_recovery_time
          ? Number(avgRecoveryResult.data[0].avg_recovery_time)
          : 0;

      const mostAffectedEngine =
        mostAffectedResult.success &&
        mostAffectedResult.data?.[0]?.failed_engine_id
          ? mostAffectedResult.data[0].failed_engine_id
          : null;

      return {
        success: true,
        data: {
          totalFailovers: totalResult.success ? totalResult.data : 0,
          completedFailovers: completedResult.success
            ? completedResult.data
            : 0,
          failedFailovers: failedResult.success ? failedResult.data : 0,
          activeFailovers: activeResult.success ? activeResult.data : 0,
          averageRecoveryTime,
          mostAffectedEngine
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
