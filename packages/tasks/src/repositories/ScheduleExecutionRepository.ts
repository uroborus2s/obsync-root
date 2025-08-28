/**
 * 定时任务执行历史仓储实现 - 简化版本
 *
 * 实现定时任务执行历史的数据访问逻辑
 * 版本: v3.0.0-enhanced
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { QueryError } from '@stratix/database';
import type { IScheduleExecutionRepository } from '../interfaces/schedule.interfaces.js';
import type { PaginatedResult } from '../types/business.js';
import type {
  NewWorkflowScheduleExecution,
  WorkflowScheduleExecutionsTable,
  WorkflowScheduleExecutionUpdate
} from '../types/database.js';
import type {
  NewScheduleExecutionData,
  ScheduleExecution,
  ScheduleExecutionStats,
  ScheduleExecutionUpdateData,
  ScheduleQueryOptions
} from '../types/schedule.types.js';

/**
 * 定时任务执行历史仓储实现 - 简化版本
 */
export default class ScheduleExecutionRepository
  implements IScheduleExecutionRepository
{
  protected readonly tableName = 'workflow_schedule_executions' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {}

  /**
   * 转换数据库结果类型
   */
  private async convertDatabaseResult<T>(
    operation: () => Promise<DatabaseResult<T>>
  ): Promise<DatabaseResult<T>> {
    try {
      const result = await operation();
      return result; // 直接返回原始结果，保持错误类型
    } catch (error) {
      this.logger.error('Database operation failed', { error });
      // 创建一个符合DatabaseError接口的错误对象
      const dbError = new QueryError(
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        success: false,
        error: dbError
      };
    }
  }

  /**
   * 创建执行记录
   */
  async create(
    data: NewScheduleExecutionData
  ): Promise<DatabaseResult<ScheduleExecution>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const executionData: NewWorkflowScheduleExecution = {
          schedule_id: data.schedule_id,
          workflow_instance_id: data.workflow_instance_id ?? null,
          status: data.status,
          started_at: data.started_at,
          completed_at: data.completed_at ?? null,
          duration_ms: data.duration_ms ?? null,
          error_message: data.error_message ?? null,
          trigger_time: data.trigger_time
        };

        const result = await db
          .insertInto(this.tableName)
          .values(executionData)
          .returningAll()
          .executeTakeFirst();

        if (!result) {
          throw new Error('Failed to create schedule execution');
        }

        return this.mapToBusinessEntity(result);
      });
    });
  }

  /**
   * 更新执行记录
   */
  async update(
    id: number,
    data: ScheduleExecutionUpdateData
  ): Promise<DatabaseResult<ScheduleExecution>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const updateData: Partial<WorkflowScheduleExecutionUpdate> = {};

        if (data.workflow_instance_id !== undefined) {
          updateData.workflow_instance_id = data.workflow_instance_id;
        }
        if (data.status !== undefined) updateData.status = data.status;
        if (data.completed_at !== undefined)
          updateData.completed_at = data.completed_at;
        if (data.duration_ms !== undefined)
          updateData.duration_ms = data.duration_ms;
        if (data.error_message !== undefined)
          updateData.error_message = data.error_message;

        const result = await db
          .updateTable(this.tableName)
          .set(updateData)
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst();

        if (!result) {
          throw new Error('Schedule execution not found or update failed');
        }

        return this.mapToBusinessEntity(result);
      });
    });
  }

  /**
   * 根据ID查找执行记录
   */
  async findById(id: number): Promise<DatabaseResult<ScheduleExecution>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const result = await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst();

        if (!result) {
          throw new Error('Schedule execution not found');
        }

        return this.mapToBusinessEntity(result);
      });
    });
  }

  /**
   * 根据定时任务ID查找执行历史
   */
  async findByScheduleId(
    scheduleId: number,
    options?: ScheduleQueryOptions
  ): Promise<DatabaseResult<PaginatedResult<ScheduleExecution>>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const { page = 1, pageSize = 50 } = options || {};

        const offset = (page - 1) * pageSize;

        const results = await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('schedule_id', '=', scheduleId)
          .orderBy('started_at', 'desc')
          .limit(pageSize)
          .offset(offset)
          .execute();

        // 简化的总数计算
        const total = results.length;
        const totalPages = Math.ceil(total / pageSize);

        return {
          items: results.map((result: any) => this.mapToBusinessEntity(result)),
          total,
          page,
          pageSize,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        };
      });
    });
  }

  /**
   * 获取执行统计 - 简化实现
   */
  async getExecutionStats(
    scheduleId: number
  ): Promise<DatabaseResult<ScheduleExecutionStats>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const results = await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('schedule_id', '=', scheduleId)
          .execute();

        const totalExecutions = results.length;
        const successCount = results.filter(
          (r: any) => r.status === 'success'
        ).length;
        const failedCount = results.filter(
          (r: any) => r.status === 'failed'
        ).length;
        const timeoutCount = results.filter(
          (r: any) => r.status === 'timeout'
        ).length;
        const successRate =
          totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;

        // 计算平均执行时长
        const durations = results
          .filter((r: any) => r.duration_ms !== null)
          .map((r: any) => r.duration_ms);
        const averageDurationMs =
          durations.length > 0
            ? Math.round(
                durations.reduce((a: number, b: number) => a + b, 0) /
                  durations.length
              )
            : 0;

        // 获取最后执行时间
        const lastExecutionAt =
          results.length > 0
            ? new Date(
                Math.max(
                  ...results.map((r: any) => new Date(r.started_at).getTime())
                )
              )
            : undefined;

        return {
          totalExecutions,
          successCount,
          failedCount,
          timeoutCount,
          successRate,
          averageDurationMs,
          lastExecutionAt,
          nextExecutionAt: undefined // 需要从schedules表获取
        };
      });
    });
  }

  /**
   * 清理过期的执行记录
   */
  async cleanupOldExecutions(
    retentionDays: number
  ): Promise<DatabaseResult<number>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await db
          .deleteFrom(this.tableName)
          .where('created_at', '<', cutoffDate)
          .executeTakeFirst();

        const deletedCount = Number(result.numDeletedRows);

        this.logger.info('Cleaned up old schedule executions', {
          retentionDays,
          cutoffDate,
          deletedCount
        });

        return deletedCount;
      });
    });
  }

  /**
   * 获取正在运行的执行记录
   */
  async findRunningExecutions(): Promise<DatabaseResult<ScheduleExecution[]>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const results = await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('status', '=', 'running')
          .orderBy('started_at', 'asc')
          .execute();

        return results.map((result: any) => this.mapToBusinessEntity(result));
      });
    });
  }

  /**
   * 将数据库实体映射为业务实体
   */
  private mapToBusinessEntity(
    dbEntity: WorkflowScheduleExecutionsTable | any
  ): ScheduleExecution {
    return {
      id: dbEntity.id,
      scheduleId: dbEntity.schedule_id,
      workflowInstanceId: dbEntity.workflow_instance_id,
      status: dbEntity.status,
      startedAt: dbEntity.started_at,
      completedAt: dbEntity.completed_at,
      durationMs: dbEntity.duration_ms,
      errorMessage: dbEntity.error_message,
      triggerTime: dbEntity.trigger_time,
      createdAt: dbEntity.created_at
    };
  }
}
