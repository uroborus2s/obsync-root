/**
 * 工作流调度仓储
 *
 * 负责工作流调度配置的数据访问操作
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type {
  NewWorkflowSchedule,
  WorkflowSchedule,
  WorkflowScheduleUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 工作流调度仓储接口
 */
export interface IWorkflowScheduleRepository {
  /**
   * 根据工作流定义ID查找调度
   */
  findByWorkflowDefinitionId(
    workflowDefinitionId: number
  ): Promise<DatabaseResult<WorkflowSchedule[]>>;

  /**
   * 根据名称查找调度
   */
  findByName(name: string): Promise<DatabaseResult<WorkflowSchedule | null>>;

  /**
   * 查找所有启用的调度
   */
  findEnabled(): Promise<DatabaseResult<WorkflowSchedule[]>>;

  /**
   * 查找需要执行的调度（下次执行时间已到）
   */
  findDueSchedules(): Promise<DatabaseResult<WorkflowSchedule[]>>;

  /**
   * 根据时区查找调度
   */
  findByTimezone(timezone: string): Promise<DatabaseResult<WorkflowSchedule[]>>;

  /**
   * 创建调度
   */
  /**
   * 更新调度状态
   */
  updateStatus(
    id: number,
    isEnabled: boolean
  ): Promise<DatabaseResult<WorkflowSchedule>>;

  /**
   * 更新下次执行时间
   */
  updateNextRunTime(
    id: number,
    nextRunAt: Date
  ): Promise<DatabaseResult<WorkflowSchedule>>;

  /**
   * 更新最后执行时间
   */
  updateLastRunTime(
    id: number,
    lastRunAt: Date
  ): Promise<DatabaseResult<WorkflowSchedule>>;

  /**
   * 更新Cron表达式
   */
  updateCronExpression(
    id: number,
    cronExpression: string
  ): Promise<DatabaseResult<WorkflowSchedule>>;

  /**
   * 删除调度
   */
  deleteSchedule(id: number): Promise<DatabaseResult<boolean>>;
}

/**
 * 工作流调度仓储实现
 */
export class WorkflowScheduleRepository
  extends BaseTasksRepository<
    'workflow_schedules',
    WorkflowSchedule,
    NewWorkflowSchedule,
    WorkflowScheduleUpdate
  >
  implements IWorkflowScheduleRepository
{
  protected readonly tableName = 'workflow_schedules' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 根据工作流定义ID查找调度
   */
  async findByWorkflowDefinitionId(
    workflowDefinitionId: number
  ): Promise<DatabaseResult<WorkflowSchedule[]>> {
    const whereExpression = (qb: any) =>
      qb.where('workflow_definition_id', '=', workflowDefinitionId);

    return await this.findMany(whereExpression, {
      orderBy: { field: 'created_at', direction: 'desc' }
    });
  }

  /**
   * 根据名称查找调度
   */
  async findByName(
    name: string
  ): Promise<DatabaseResult<WorkflowSchedule | null>> {
    return await this.findOneNullable({ name });
  }

  /**
   * 查找所有启用的调度
   */
  async findEnabled(): Promise<DatabaseResult<WorkflowSchedule[]>> {
    const whereExpression = (qb: any) => qb.where('is_enabled', '=', true);

    return await this.findMany(whereExpression, {
      orderBy: { field: 'next_run_at', direction: 'asc' }
    });
  }

  /**
   * 查找需要执行的调度（下次执行时间已到）
   */
  async findDueSchedules(): Promise<DatabaseResult<WorkflowSchedule[]>> {
    const now = new Date();
    const whereExpression = (qb: any) =>
      qb.where('is_enabled', '=', true).where('next_run_at', '<=', now);

    return await this.findMany(whereExpression, {
      orderBy: { field: 'next_run_at', direction: 'asc' }
    });
  }

  /**
   * 根据时区查找调度
   */
  async findByTimezone(
    timezone: string
  ): Promise<DatabaseResult<WorkflowSchedule[]>> {
    const whereExpression = (qb: any) => qb.where('timezone', '=', timezone);

    return await this.findMany(whereExpression, {
      orderBy: { field: 'created_at', direction: 'desc' }
    });
  }

  /**
   * 更新调度状态
   */
  async updateStatus(
    id: number,
    isEnabled: boolean
  ): Promise<DatabaseResult<WorkflowSchedule>> {
    const updateData = {
      is_enabled: isEnabled,
      updated_at: new Date()
    };

    const result = await this.updateNullable(id, updateData);

    if (result.success && result.data) {
      this.logger.info('Schedule status updated', {
        id,
        isEnabled,
        scheduleId: result.data.id
      });
    }

    return result as DatabaseResult<WorkflowSchedule>;
  }

  /**
   * 更新下次执行时间
   */
  async updateNextRunTime(
    id: number,
    nextRunAt: Date
  ): Promise<DatabaseResult<WorkflowSchedule>> {
    const updateData = {
      next_run_at: nextRunAt,
      updated_at: new Date()
    };

    return (await this.updateNullable(
      id,
      updateData
    )) as DatabaseResult<WorkflowSchedule>;
  }

  /**
   * 更新最后执行时间
   */
  async updateLastRunTime(
    id: number,
    lastRunAt: Date
  ): Promise<DatabaseResult<WorkflowSchedule>> {
    const updateData = {
      last_run_at: lastRunAt,
      updated_at: new Date()
    };

    return (await this.updateNullable(
      id,
      updateData
    )) as DatabaseResult<WorkflowSchedule>;
  }

  /**
   * 更新Cron表达式
   */
  async updateCronExpression(
    id: number,
    cronExpression: string
  ): Promise<DatabaseResult<WorkflowSchedule>> {
    const updateData = {
      cron_expression: cronExpression,
      updated_at: new Date()
    };

    const result = await this.updateNullable(id, updateData);

    if (result.success && result.data) {
      this.logger.info('Schedule cron expression updated', {
        id,
        cronExpression
      });
    }

    return result as DatabaseResult<WorkflowSchedule>;
  }

  /**
   * 删除调度
   */
  async deleteSchedule(id: number): Promise<DatabaseResult<boolean>> {
    const result = await this.delete(id);

    if (result.success && result.data) {
      this.logger.info('Schedule deleted successfully', { id });
    }

    return result;
  }
}
