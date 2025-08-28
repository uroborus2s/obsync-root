/**
 * 定时任务相关接口定义
 *
 * 定义定时任务系统的服务接口
 * 版本: v3.0.0-enhanced
 */

import type { DatabaseResult } from '@stratix/database';
import type { PaginatedResult, ServiceResult } from '../types/business.js';
import type {
  CronValidationResult,
  NewScheduleData,
  NewScheduleExecutionData,
  Schedule,
  ScheduleConfig,
  ScheduleExecution,
  ScheduleExecutionStats,
  ScheduleExecutionUpdateData,
  ScheduleQueryOptions,
  SchedulerStatus,
  ScheduleUpdateData
} from '../types/schedule.types.js';

/**
 * 定时任务服务接口
 */
export interface IScheduleService {
  /**
   * 创建定时任务
   */
  createSchedule(config: ScheduleConfig): Promise<ServiceResult<Schedule>>;

  /**
   * 更新定时任务
   */
  updateSchedule(
    id: number,
    updates: Partial<ScheduleConfig>
  ): Promise<ServiceResult<Schedule>>;

  /**
   * 删除定时任务
   */
  deleteSchedule(id: number): Promise<ServiceResult<boolean>>;

  /**
   * 获取定时任务详情
   */
  getSchedule(id: number): Promise<ServiceResult<Schedule>>;

  /**
   * 获取定时任务列表
   */
  getSchedules(
    options?: ScheduleQueryOptions
  ): Promise<ServiceResult<PaginatedResult<Schedule>>>;

  /**
   * 启用/禁用定时任务
   */
  toggleSchedule(id: number, enabled: boolean): Promise<ServiceResult<boolean>>;

  /**
   * 手动触发定时任务
   */
  triggerSchedule(id: number): Promise<ServiceResult<string>>;

  /**
   * 获取执行历史
   */
  getExecutionHistory(
    scheduleId: number,
    options?: ScheduleQueryOptions
  ): Promise<ServiceResult<PaginatedResult<ScheduleExecution>>>;

  /**
   * 获取执行统计
   */
  getExecutionStats(
    scheduleId: number
  ): Promise<ServiceResult<ScheduleExecutionStats>>;

  /**
   * 验证Cron表达式
   */
  validateCronExpression(
    expression: string,
    timezone?: string
  ): CronValidationResult;

  /**
   * 计算下次执行时间
   */
  calculateNextRunTime(expression: string, timezone?: string): Date | null;
}

/**
 * 定时任务仓储接口
 */
export interface IScheduleRepository {
  /**
   * 创建定时任务
   */
  create(data: NewScheduleData): Promise<DatabaseResult<Schedule>>;

  /**
   * 更新定时任务
   */
  update(
    id: number,
    data: ScheduleUpdateData
  ): Promise<DatabaseResult<Schedule>>;

  /**
   * 删除定时任务
   */
  delete(id: number): Promise<DatabaseResult<boolean>>;

  /**
   * 根据ID查找定时任务
   */
  findById(id: number): Promise<DatabaseResult<Schedule>>;

  /**
   * 根据名称查找定时任务
   */
  findByName(name: string): Promise<DatabaseResult<Schedule>>;

  /**
   * 查找到期的定时任务
   */
  findDueSchedules(): Promise<DatabaseResult<Schedule[]>>;

  /**
   * 根据工作流定义ID查找定时任务
   */
  findByWorkflowDefinition(
    workflowDefinitionId: number
  ): Promise<DatabaseResult<Schedule[]>>;

  /**
   * 分页查询定时任务
   */
  findWithPagination(
    options: ScheduleQueryOptions
  ): Promise<DatabaseResult<PaginatedResult<Schedule>>>;

  /**
   * 更新下次执行时间
   */
  updateNextRunTime(
    id: number,
    nextRunAt: Date
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 批量更新下次执行时间
   */
  batchUpdateNextRunTime(
    updates: Array<{ id: number; nextRunAt: Date }>
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 获取统计信息
   */
  getStats(): Promise<
    DatabaseResult<{
      total: number;
      enabled: number;
      disabled: number;
    }>
  >;
}

/**
 * 定时任务执行历史仓储接口
 */
export interface IScheduleExecutionRepository {
  /**
   * 创建执行记录
   */
  create(
    data: NewScheduleExecutionData
  ): Promise<DatabaseResult<ScheduleExecution>>;

  /**
   * 更新执行记录
   */
  update(
    id: number,
    data: ScheduleExecutionUpdateData
  ): Promise<DatabaseResult<ScheduleExecution>>;

  /**
   * 根据ID查找执行记录
   */
  findById(id: number): Promise<DatabaseResult<ScheduleExecution>>;

  /**
   * 根据定时任务ID查找执行历史
   */
  findByScheduleId(
    scheduleId: number,
    options?: ScheduleQueryOptions
  ): Promise<DatabaseResult<PaginatedResult<ScheduleExecution>>>;

  /**
   * 获取执行统计
   */
  getExecutionStats(
    scheduleId: number
  ): Promise<DatabaseResult<ScheduleExecutionStats>>;

  /**
   * 清理过期的执行记录
   */
  cleanupOldExecutions(retentionDays: number): Promise<DatabaseResult<number>>;

  /**
   * 获取正在运行的执行记录
   */
  findRunningExecutions(): Promise<DatabaseResult<ScheduleExecution[]>>;
}

/**
 * 增强的调度器服务接口
 */
export interface ISchedulerService {
  /**
   * 启动调度器
   */
  onReady(): Promise<ServiceResult<boolean>>;

  /**
   * 停止调度器
   */
  onClose(): Promise<ServiceResult<boolean>>;

  /**
   * 获取调度器状态
   */
  getStatus(): SchedulerStatus;

  /**
   * 手动触发扫描
   */
  triggerScan(): Promise<ServiceResult<boolean>>;

  /**
   * 重新加载定时任务配置
   */
  reloadSchedules(): Promise<ServiceResult<boolean>>;

  /**
   * 暂停调度器
   */
  pause(): Promise<ServiceResult<boolean>>;

  /**
   * 恢复调度器
   */
  resume(): Promise<ServiceResult<boolean>>;

  /**
   * 创建并添加定时任务
   */
  createSchedule(config: ScheduleConfig): Promise<ServiceResult<Schedule>>;

  /**
   * 添加任务到调度队列
   */
  addSchedule(schedule: Schedule): void;

  /**
   * 更新调度队列中的任务
   */
  updateSchedule(schedule: Schedule): void;

  /**
   * 从调度队列中删除任务
   */
  deleteSchedule(scheduleId: number): void;
}

/**
 * Cron工具接口
 */
export interface ICronUtils {
  /**
   * 验证Cron表达式
   */
  isValidCronExpression(expression: string): boolean;

  /**
   * 解析Cron表达式
   */
  parseCronExpression(expression: string, timezone?: string): any;

  /**
   * 计算下次执行时间
   */
  getNextExecutionTime(expression: string, timezone?: string): Date | null;

  /**
   * 计算多个下次执行时间
   */
  getNextExecutionTimes(
    expression: string,
    count: number,
    timezone?: string
  ): Date[];

  /**
   * 获取Cron表达式描述
   */
  getCronDescription(expression: string): string;
}
