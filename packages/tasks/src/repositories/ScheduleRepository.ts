/**
 * 定时任务仓储实现 - 简化版本
 *
 * 实现定时任务的数据访问逻辑
 * 版本: v3.0.0-enhanced
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { QueryError } from '@stratix/database';
import type { IScheduleRepository } from '../interfaces/schedule.interfaces.js';
import type { PaginatedResult } from '../types/business.js';
import type {
  NewWorkflowSchedule,
  WorkflowSchedulesTable,
  WorkflowScheduleUpdate
} from '../types/database.js';
import type {
  NewScheduleData,
  Schedule,
  ScheduleQueryOptions,
  ScheduleUpdateData
} from '../types/schedule.types.js';

/**
 * 定时任务仓储实现 - 简化版本
 */
export default class ScheduleRepository implements IScheduleRepository {
  protected readonly tableName = 'workflow_schedules' as const;

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
   * 创建定时任务
   */
  async create(data: NewScheduleData): Promise<DatabaseResult<Schedule>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const scheduleData: NewWorkflowSchedule = {
          name: data.name,
          executor_name: data.executor_name,
          workflow_definition_id: data.workflow_definition_id ?? null,
          cron_expression: data.cron_expression,
          timezone: data.timezone,
          enabled: data.enabled,
          input_data: data.input_data ?? null,
          context_data: data.context_data ?? null,
          business_key: data.business_key ?? null,
          mutex_key: data.mutex_key ?? null,
          created_by: data.created_by ?? null
        };

        const result = await db
          .insertInto(this.tableName)
          .values(scheduleData)
          .returningAll()
          .executeTakeFirst();

        if (!result) {
          throw new Error('Failed to create schedule');
        }

        return this.mapToBusinessEntity(result);
      });
    });
  }

  /**
   * 更新定时任务
   */
  async update(
    id: number,
    data: ScheduleUpdateData
  ): Promise<DatabaseResult<Schedule>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const updateData: Partial<WorkflowScheduleUpdate> = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.executor_name !== undefined)
          updateData.executor_name = data.executor_name;
        if (data.cron_expression !== undefined)
          updateData.cron_expression = data.cron_expression;
        if (data.timezone !== undefined) updateData.timezone = data.timezone;
        if (data.enabled !== undefined) updateData.enabled = data.enabled;
        if (data.input_data !== undefined)
          updateData.input_data = data.input_data;
        if (data.context_data !== undefined)
          updateData.context_data = data.context_data;
        if (data.business_key !== undefined)
          updateData.business_key = data.business_key;
        if (data.mutex_key !== undefined) updateData.mutex_key = data.mutex_key;

        const result = await db
          .updateTable(this.tableName)
          .set(updateData)
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst();

        if (!result) {
          throw new Error('Schedule not found or update failed');
        }

        return this.mapToBusinessEntity(result);
      });
    });
  }

  /**
   * 删除定时任务
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const result = await db
          .deleteFrom(this.tableName)
          .where('id', '=', id)
          .executeTakeFirst();

        return Number(result.numDeletedRows) > 0;
      });
    });
  }

  /**
   * 根据ID查找定时任务
   */
  async findById(id: number): Promise<DatabaseResult<Schedule>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const result = await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst();

        if (!result) {
          throw new Error('Schedule not found');
        }

        return this.mapToBusinessEntity(result);
      });
    });
  }

  /**
   * 根据名称查找定时任务
   */
  async findByName(name: string): Promise<DatabaseResult<Schedule>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const result = await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('name', '=', name)
          .executeTakeFirst();

        if (!result) {
          throw new Error('Schedule not found');
        }

        return this.mapToBusinessEntity(result);
      });
    });
  }

  /**
   * 查找到期的定时任务
   */
  async findDueSchedules(): Promise<DatabaseResult<Schedule[]>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const now = new Date();
        const results = await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('enabled', '=', true)
          .where('next_run_at', '<=', now)
          .orderBy('next_run_at', 'asc')
          .execute();

        return results.map((result: any) => this.mapToBusinessEntity(result));
      });
    });
  }

  /**
   * 根据工作流定义ID查找定时任务
   */
  async findByWorkflowDefinition(
    workflowDefinitionId: number
  ): Promise<DatabaseResult<Schedule[]>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const results = await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('workflow_definition_id', '=', workflowDefinitionId)
          .orderBy('created_at', 'desc')
          .execute();

        return results.map((result: any) => this.mapToBusinessEntity(result));
      });
    });
  }

  /**
   * 分页查询定时任务 - 简化实现
   */
  async findWithPagination(
    options: ScheduleQueryOptions
  ): Promise<DatabaseResult<PaginatedResult<Schedule>>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const {
          page = 1,
          pageSize = 20,
          workflowDefinitionId,
          enabled
        } = options;

        const offset = (page - 1) * pageSize;

        // 构建基础查询
        let query = db.selectFrom(this.tableName);

        // 添加过滤条件
        if (workflowDefinitionId !== undefined) {
          query = query.where(
            'workflow_definition_id',
            '=',
            workflowDefinitionId
          );
        }
        if (enabled !== undefined) {
          query = query.where('enabled', '=', enabled);
        }

        // 获取数据
        const results = await query
          .selectAll()
          .orderBy('created_at', 'desc')
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
   * 更新下次执行时间
   */
  async updateNextRunTime(
    id: number,
    nextRunAt: Date
  ): Promise<DatabaseResult<boolean>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const result = await db
          .updateTable(this.tableName)
          .set({ next_run_at: nextRunAt })
          .where('id', '=', id)
          .executeTakeFirst();

        return Number(result.numUpdatedRows) > 0;
      });
    });
  }

  /**
   * 批量更新下次执行时间 - 简化实现
   */
  async batchUpdateNextRunTime(
    updates: Array<{ id: number; nextRunAt: Date }>
  ): Promise<DatabaseResult<boolean>> {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.transaction(async (trx) => {
        for (const update of updates) {
          await trx
            .updateTable(this.tableName)
            .set({ next_run_at: update.nextRunAt })
            .where('id', '=', update.id)
            .execute();
        }
        return true;
      });
    });
  }

  /**
   * 获取统计信息 - 简化实现
   */
  async getStats(): Promise<
    DatabaseResult<{ total: number; enabled: number; disabled: number }>
  > {
    return await this.convertDatabaseResult(async () => {
      return await this.databaseApi.executeQuery(async (db) => {
        const results = await db
          .selectFrom(this.tableName)
          .selectAll()
          .execute();

        const total = results.length;
        const enabled = results.filter((r: any) => r.enabled).length;
        const disabled = total - enabled;

        return { total, enabled, disabled };
      });
    });
  }

  /**
   * 将数据库实体映射为业务实体
   */
  private mapToBusinessEntity(
    dbEntity: WorkflowSchedulesTable | any
  ): Schedule {
    return {
      id: dbEntity.id,
      name: dbEntity.name,
      executorName: dbEntity.executor_name,
      workflowDefinitionId: dbEntity.workflow_definition_id || undefined,
      cronExpression: dbEntity.cron_expression,
      timezone: dbEntity.timezone,
      enabled: dbEntity.enabled,
      inputData: dbEntity.input_data,
      contextData: dbEntity.context_data,
      businessKey: dbEntity.business_key || undefined,
      mutexKey: dbEntity.mutex_key || undefined,
      nextRunAt: dbEntity.next_run_at || undefined,
      lastRunAt: dbEntity.last_run_at || undefined,
      lastRunStatus: dbEntity.last_run_status || undefined,
      createdAt: dbEntity.created_at,
      updatedAt: dbEntity.updated_at,
      createdBy: dbEntity.created_by || undefined
    };
  }
}
