/**
 * 工作流调度仓储
 *
 * 提供工作流调度的数据访问方法
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
   * @param workflowDefinitionId 工作流定义ID
   * @returns 调度列表
   */
  findByWorkflowDefinitionId(
    workflowDefinitionId: number
  ): Promise<DatabaseResult<WorkflowSchedule[]>>;

  /**
   * 根据名称查找调度
   * @param name 调度名称
   * @returns 调度或null
   */
  findByName(name: string): Promise<DatabaseResult<WorkflowSchedule | null>>;

  /**
   * 查找启用的调度
   * @returns 启用的调度列表
   */
  findEnabledSchedules(): Promise<DatabaseResult<WorkflowSchedule[]>>;

  /**
   * 查找需要执行的调度
   * @param currentTime 当前时间
   * @returns 需要执行的调度列表
   */
  findSchedulesToRun(
    currentTime?: Date
  ): Promise<DatabaseResult<WorkflowSchedule[]>>;

  /**
   * 更新下次运行时间
   * @param id 调度ID
   * @param nextRunAt 下次运行时间
   * @returns 更新结果
   */
  updateNextRunTime(
    id: number,
    nextRunAt: Date
  ): Promise<DatabaseResult<WorkflowSchedule | null>>;

  /**
   * 更新上次运行时间
   * @param id 调度ID
   * @param lastRunAt 上次运行时间
   * @returns 更新结果
   */
  updateLastRunTime(
    id: number,
    lastRunAt: Date
  ): Promise<DatabaseResult<WorkflowSchedule | null>>;

  /**
   * 启用/禁用调度
   * @param id 调度ID
   * @param enabled 是否启用
   * @returns 更新结果
   */
  setEnabled(
    id: number,
    enabled: boolean
  ): Promise<DatabaseResult<WorkflowSchedule | null>>;

  /**
   * 根据时区查找调度
   * @param timezone 时区
   * @returns 调度列表
   */
  findByTimezone(timezone: string): Promise<DatabaseResult<WorkflowSchedule[]>>;

  /**
   * 获取调度统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<
    DatabaseResult<{
      totalSchedules: number;
      enabledSchedules: number;
      disabledSchedules: number;
      schedulesWithCron: number;
      schedulesWithoutCron: number;
    }>
  >;
}

/**
 * 工作流调度仓储实现
 */
export default class WorkflowScheduleRepository
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

  async findByWorkflowDefinitionId(
    workflowDefinitionId: number
  ): Promise<DatabaseResult<WorkflowSchedule[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('workflow_definition_id', '=', workflowDefinitionId)
        .orderBy('created_at', 'desc')
    );
  }

  async findByName(
    name: string
  ): Promise<DatabaseResult<WorkflowSchedule | null>> {
    return await this.findOneNullable((qb: any) => qb.where('name', '=', name));
  }

  async findEnabledSchedules(): Promise<DatabaseResult<WorkflowSchedule[]>> {
    return await this.findMany((qb: any) =>
      qb.where('is_enabled', '=', true).orderBy('next_run_at', 'asc')
    );
  }

  async findSchedulesToRun(
    currentTime: Date = new Date()
  ): Promise<DatabaseResult<WorkflowSchedule[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('is_enabled', '=', true)
        .where('next_run_at', '<=', currentTime)
        .whereNotNull('next_run_at')
        .orderBy('next_run_at', 'asc')
    );
  }

  async updateNextRunTime(
    id: number,
    nextRunAt: Date
  ): Promise<DatabaseResult<WorkflowSchedule | null>> {
    return await this.updateNullable(id, {
      next_run_at: nextRunAt,
      updated_at: new Date()
    });
  }

  async updateLastRunTime(
    id: number,
    lastRunAt: Date
  ): Promise<DatabaseResult<WorkflowSchedule | null>> {
    return await this.updateNullable(id, {
      last_run_at: lastRunAt,
      updated_at: new Date()
    });
  }

  async setEnabled(
    id: number,
    enabled: boolean
  ): Promise<DatabaseResult<WorkflowSchedule | null>> {
    return await this.updateNullable(id, {
      is_enabled: enabled,
      updated_at: new Date()
    });
  }

  async findByTimezone(
    timezone: string
  ): Promise<DatabaseResult<WorkflowSchedule[]>> {
    return await this.findMany((qb: any) =>
      qb.where('timezone', '=', timezone).orderBy('created_at', 'desc')
    );
  }

  async getStatistics(): Promise<
    DatabaseResult<{
      totalSchedules: number;
      enabledSchedules: number;
      disabledSchedules: number;
      schedulesWithCron: number;
      schedulesWithoutCron: number;
    }>
  > {
    try {
      const totalResult = await this.count();
      const enabledResult = await this.count((qb: any) =>
        qb.where('is_enabled', '=', true)
      );
      const disabledResult = await this.count((qb: any) =>
        qb.where('is_enabled', '=', false)
      );
      const withCronResult = await this.count((qb: any) =>
        qb.whereNotNull('cron_expression')
      );
      const withoutCronResult = await this.count((qb: any) =>
        qb.whereNull('cron_expression')
      );

      return {
        success: true,
        data: {
          totalSchedules: totalResult.success ? totalResult.data : 0,
          enabledSchedules: enabledResult.success ? enabledResult.data : 0,
          disabledSchedules: disabledResult.success ? disabledResult.data : 0,
          schedulesWithCron: withCronResult.success ? withCronResult.data : 0,
          schedulesWithoutCron: withoutCronResult.success
            ? withoutCronResult.data
            : 0
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
