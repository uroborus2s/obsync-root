// @stratix/icasync 同步任务记录仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type {
  DatabaseSyncSummary,
  NewSyncTaskRecord,
  SyncTaskRecord,
  SyncTaskRecordUpdate,
  TaskStatus,
  TaskType
} from '../types/database.js';
import { BaseIcasyncRepository } from './base/BaseIcasyncRepository.js';

/**
 * 同步任务记录仓储接口
 */
export interface ISyncTaskRepository {
  // 基础操作
  findByIdNullable(id: number): Promise<DatabaseResult<SyncTaskRecord | null>>;
  create(data: NewSyncTaskRecord): Promise<DatabaseResult<SyncTaskRecord>>;
  updateNullable(
    id: number,
    data: SyncTaskRecordUpdate
  ): Promise<DatabaseResult<SyncTaskRecord | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;
  findMany(
    filter?: any,
    options?: any
  ): Promise<DatabaseResult<SyncTaskRecord[]>>;
  count(filter?: any): Promise<DatabaseResult<number>>;

  // 业务查询方法
  findByTaskType(taskType: TaskType): Promise<DatabaseResult<SyncTaskRecord[]>>;
  findByStatus(status: TaskStatus): Promise<DatabaseResult<SyncTaskRecord[]>>;
  findByXnxq(xnxq: string): Promise<DatabaseResult<SyncTaskRecord[]>>;
  findByTaskTreeId(
    taskTreeId: string
  ): Promise<DatabaseResult<SyncTaskRecord | null>>;
  findLatestTask(
    taskType?: TaskType
  ): Promise<DatabaseResult<SyncTaskRecord | null>>;
  findRunningTasks(): Promise<DatabaseResult<SyncTaskRecord[]>>;
  findCompletedTasks(limit?: number): Promise<DatabaseResult<SyncTaskRecord[]>>;
  findFailedTasks(): Promise<DatabaseResult<SyncTaskRecord[]>>;

  // 状态管理
  updateStatus(
    id: number,
    status: TaskStatus
  ): Promise<DatabaseResult<SyncTaskRecord | null>>;
  updateProgress(
    id: number,
    progress: number
  ): Promise<DatabaseResult<SyncTaskRecord | null>>;
  updateTaskCounts(
    id: number,
    totalItems: number,
    processedItems: number,
    failedItems: number
  ): Promise<DatabaseResult<SyncTaskRecord | null>>;
  markTaskStarted(id: number): Promise<DatabaseResult<SyncTaskRecord | null>>;
  markTaskCompleted(
    id: number,
    summary?: DatabaseSyncSummary
  ): Promise<DatabaseResult<SyncTaskRecord | null>>;
  markTaskFailed(
    id: number,
    errorMessage: string
  ): Promise<DatabaseResult<SyncTaskRecord | null>>;

  // 查询操作
  findTasksByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<DatabaseResult<SyncTaskRecord[]>>;
  findLongRunningTasks(
    thresholdMinutes: number
  ): Promise<DatabaseResult<SyncTaskRecord[]>>;
  findTasksWithErrors(): Promise<DatabaseResult<SyncTaskRecord[]>>;

  // 统计查询
  countByTaskType(taskType: TaskType): Promise<DatabaseResult<number>>;
  countByStatus(status: TaskStatus): Promise<DatabaseResult<number>>;
  countByXnxq(xnxq: string): Promise<DatabaseResult<number>>;
  getTaskStatistics(days?: number): Promise<
    DatabaseResult<{
      total: number;
      completed: number;
      failed: number;
      running: number;
      successRate: number;
    }>
  >;

  // 清理操作
  deleteOldTasks(daysOld: number): Promise<DatabaseResult<number>>;
  deleteTasksByStatus(status: TaskStatus): Promise<DatabaseResult<number>>;
  deleteTasksByXnxq(xnxq: string): Promise<DatabaseResult<number>>;
}

/**
 * 同步任务记录仓储实现
 */
export default class SyncTaskRepository
  extends BaseIcasyncRepository<
    'icasync_sync_tasks',
    SyncTaskRecord,
    NewSyncTaskRecord,
    SyncTaskRecordUpdate
  >
  implements ISyncTaskRepository
{
  protected readonly tableName = 'icasync_sync_tasks' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
  }

  /**
   * 根据任务类型查找任务
   */
  async findByTaskType(
    taskType: TaskType
  ): Promise<DatabaseResult<SyncTaskRecord[]>> {
    if (!this.validateTaskType(taskType)) {
      throw new Error(`Invalid task type: ${taskType}`);
    }

    return await this.findMany(
      (qb: any) => qb.where('task_type', '=', taskType),
      {
        orderBy: 'created_at',
        order: 'desc'
      }
    );
  }

  /**
   * 根据任务状态查找任务
   */
  async findByStatus(
    status: TaskStatus
  ): Promise<DatabaseResult<SyncTaskRecord[]>> {
    if (!this.validateTaskStatus(status)) {
      throw new Error(`Invalid task status: ${status}`);
    }

    return await this.findMany((qb: any) => qb.where('status', '=', status), {
      orderBy: 'created_at',
      order: 'desc'
    });
  }

  /**
   * 根据学年学期查找任务
   */
  async findByXnxq(xnxq: string): Promise<DatabaseResult<SyncTaskRecord[]>> {
    this.validateXnxq(xnxq);

    return await this.findMany((qb: any) => qb.where('xnxq', '=', xnxq), {
      orderBy: 'created_at',
      order: 'desc'
    });
  }

  /**
   * 根据任务树ID查找任务
   */
  async findByTaskTreeId(
    taskTreeId: string
  ): Promise<DatabaseResult<SyncTaskRecord | null>> {
    if (!taskTreeId) {
      throw new Error('Task tree ID cannot be empty');
    }

    return await this.findOneNullable((eb: any) =>
      eb('task_tree_id', '=', taskTreeId)
    );
  }

  /**
   * 查找最新的任务（可按类型过滤）
   */
  async findLatestTask(
    taskType?: TaskType
  ): Promise<DatabaseResult<SyncTaskRecord | null>> {
    if (taskType) {
      if (!this.validateTaskType(taskType)) {
        throw new Error(`Invalid task type: ${taskType}`);
      }

      const result = await this.findMany(
        (qb: any) => qb.where('task_type', '=', taskType),
        {
          orderBy: 'created_at',
          order: 'desc',
          limit: 1
        }
      );

      if (result.success) {
        return {
          success: true,
          data: result.data.length > 0 ? result.data[0] : null
        };
      }
      return result as DatabaseResult<SyncTaskRecord | null>;
    }

    const result = await this.findMany(() => true, {
      orderBy: 'created_at',
      order: 'desc',
      limit: 1
    });

    if (result.success) {
      return {
        success: true,
        data: result.data.length > 0 ? result.data[0] : null
      };
    }
    return result as DatabaseResult<SyncTaskRecord | null>;
  }

  /**
   * 查找正在运行的任务
   */
  async findRunningTasks(): Promise<DatabaseResult<SyncTaskRecord[]>> {
    return await this.findByStatus('running');
  }

  /**
   * 查找已完成的任务
   */
  async findCompletedTasks(
    limit: number = 50
  ): Promise<DatabaseResult<SyncTaskRecord[]>> {
    return await this.findMany(
      (qb: any) => qb.where('status', '=', 'completed'),
      {
        orderBy: 'end_time',
        order: 'desc',
        limit
      }
    );
  }

  /**
   * 查找失败的任务
   */
  async findFailedTasks(): Promise<DatabaseResult<SyncTaskRecord[]>> {
    return await this.findByStatus('failed');
  }

  /**
   * 更新任务状态
   */
  async updateStatus(
    id: number,
    status: TaskStatus
  ): Promise<DatabaseResult<SyncTaskRecord | null>> {
    if (!this.validateTaskStatus(status)) {
      throw new Error(`Invalid task status: ${status}`);
    }

    const updateData = this.buildUpdateData({
      status
    });

    const result = await super.update(id, updateData as SyncTaskRecordUpdate);
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }
    return result as DatabaseResult<SyncTaskRecord | null>;
  }

  /**
   * 更新任务进度
   */
  async updateProgress(
    id: number,
    progress: number
  ): Promise<DatabaseResult<SyncTaskRecord | null>> {
    if (!this.validateProgress(progress)) {
      throw new Error(`Invalid progress value: ${progress}`);
    }

    const updateData = this.buildUpdateData({
      progress
    });

    const result = await super.update(id, updateData as SyncTaskRecordUpdate);
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }
    return result as DatabaseResult<SyncTaskRecord | null>;
  }

  /**
   * 更新任务计数
   */
  async updateTaskCounts(
    id: number,
    totalItems: number,
    processedItems: number,
    failedItems: number
  ): Promise<DatabaseResult<SyncTaskRecord | null>> {
    if (totalItems < 0 || processedItems < 0 || failedItems < 0) {
      throw new Error('Task counts cannot be negative');
    }

    if (processedItems > totalItems) {
      throw new Error('Processed items cannot exceed total items');
    }

    const updateData = this.buildUpdateData({
      total_items: totalItems,
      processed_items: processedItems,
      failed_items: failedItems
    });

    const result = await super.update(id, updateData as SyncTaskRecordUpdate);
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }
    return result as DatabaseResult<SyncTaskRecord | null>;
  }

  /**
   * 标记任务开始
   */
  async markTaskStarted(
    id: number
  ): Promise<DatabaseResult<SyncTaskRecord | null>> {
    const updateData = this.buildUpdateData({
      status: 'running',
      start_time: this.getCurrentTimestamp()
    });

    const result = await super.update(id, updateData as SyncTaskRecordUpdate);
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }
    return result as DatabaseResult<SyncTaskRecord | null>;
  }

  /**
   * 标记任务完成
   */
  async markTaskCompleted(
    id: number,
    summary?: DatabaseSyncSummary
  ): Promise<DatabaseResult<SyncTaskRecord | null>> {
    const updateData = this.buildUpdateData({
      status: 'completed',
      end_time: this.getCurrentTimestamp(),
      progress: 100,
      result_summary: summary ? this.serializeJsonField(summary) : undefined
    });

    const result = await super.update(id, updateData as SyncTaskRecordUpdate);
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }
    return result as DatabaseResult<SyncTaskRecord | null>;
  }

  /**
   * 标记任务失败
   */
  async markTaskFailed(
    id: number,
    errorMessage: string
  ): Promise<DatabaseResult<SyncTaskRecord | null>> {
    const updateData = this.buildUpdateData({
      status: 'failed',
      end_time: this.getCurrentTimestamp(),
      error_message: errorMessage
    });

    const result = await super.update(id, updateData as SyncTaskRecordUpdate);
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }
    return result as DatabaseResult<SyncTaskRecord | null>;
  }

  /**
   * 根据日期范围查找任务
   */
  async findTasksByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<DatabaseResult<SyncTaskRecord[]>> {
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    return await this.findMany(
      (eb: any) =>
        eb.and([
          eb('created_at', '>=', startDate),
          eb('created_at', '<=', endDate)
        ]),
      { orderBy: { field: 'created_at', direction: 'desc' } }
    );
  }

  /**
   * 查找长时间运行的任务
   */
  async findLongRunningTasks(
    thresholdMinutes: number
  ): Promise<DatabaseResult<SyncTaskRecord[]>> {
    if (thresholdMinutes <= 0) {
      throw new Error('Threshold minutes must be positive');
    }

    const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    return await this.findMany(
      (eb: any) =>
        eb.and([
          eb('status', '=', 'running'),
          eb('start_time', '<=', thresholdTime)
        ]),
      { orderBy: { field: 'start_time', direction: 'asc' } }
    );
  }

  /**
   * 查找有错误的任务
   */
  async findTasksWithErrors(): Promise<DatabaseResult<SyncTaskRecord[]>> {
    return await this.findMany(
      (qb: any) => qb.where('error_message', 'is not', null),
      {
        orderBy: 'created_at',
        order: 'desc'
      }
    );
  }

  /**
   * 统计指定任务类型的任务数量
   */
  async countByTaskType(taskType: TaskType): Promise<DatabaseResult<number>> {
    if (!this.validateTaskType(taskType)) {
      throw new Error(`Invalid task type: ${taskType}`);
    }

    return await this.count((qb: any) => qb.where('task_type', '=', taskType));
  }

  /**
   * 统计指定状态的任务数量
   */
  async countByStatus(status: TaskStatus): Promise<DatabaseResult<number>> {
    if (!this.validateTaskStatus(status)) {
      throw new Error(`Invalid task status: ${status}`);
    }

    return await this.count((qb: any) => qb.where('status', '=', status));
  }

  /**
   * 统计指定学年学期的任务数量
   */
  async countByXnxq(xnxq: string): Promise<DatabaseResult<number>> {
    this.validateXnxq(xnxq);

    return await this.count((qb: any) => qb.where('xnxq', '=', xnxq));
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStatistics(days: number = 30): Promise<
    DatabaseResult<{
      total: number;
      completed: number;
      failed: number;
      running: number;
      successRate: number;
    }>
  > {
    if (days <= 0) {
      throw new Error('Days must be positive');
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      // 这里需要使用原始SQL查询来获取统计信息
      // 由于BaseRepository可能不直接支持复杂的聚合查询，
      // 我们先用简单的方法实现
      const tasksResult = await this.findTasksByDateRange(
        startDate,
        new Date()
      );

      if (!tasksResult.success) {
        return {
          success: false,
          error:
            (tasksResult as any).error || new Error('Failed to fetch tasks')
        };
      }

      const tasks = tasksResult.data;
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const failed = tasks.filter((t) => t.status === 'failed').length;
      const running = tasks.filter((t) => t.status === 'running').length;
      const successRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        success: true,
        data: {
          total,
          completed,
          failed,
          running,
          successRate: Math.round(successRate * 100) / 100
        }
      };
    } catch (error) {
      this.handleDatabaseError('getTaskStatistics', error, { days });
    }
  }

  /**
   * 删除旧任务
   */
  async deleteOldTasks(daysOld: number): Promise<DatabaseResult<number>> {
    if (daysOld <= 0) {
      throw new Error('Days old must be positive');
    }

    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    return await this.deleteMany({
      created_at: cutoffDate
    } as any); // 这里需要特殊处理日期比较
  }

  /**
   * 删除指定状态的任务
   */
  async deleteTasksByStatus(
    status: TaskStatus
  ): Promise<DatabaseResult<number>> {
    if (!this.validateTaskStatus(status)) {
      throw new Error(`Invalid task status: ${status}`);
    }

    return await this.deleteMany((qb: any) => qb.where('status', '=', status));
  }

  /**
   * 删除指定学年学期的任务
   */
  async deleteTasksByXnxq(xnxq: string): Promise<DatabaseResult<number>> {
    this.validateXnxq(xnxq);

    return await this.deleteMany((qb: any) => qb.where('xnxq', '=', xnxq));
  }

  /**
   * 创建同步任务（重写以添加验证）
   */
  async create(
    data: NewSyncTaskRecord
  ): Promise<DatabaseResult<SyncTaskRecord>> {
    // 验证必需字段
    this.validateRequired(data, ['task_type']);

    // 验证字段格式
    if (!this.validateTaskType(data.task_type)) {
      throw new Error(`Invalid task type: ${data.task_type}`);
    }

    if (data.xnxq) {
      this.validateXnxq(data.xnxq);
    }

    if (data.status && !this.validateTaskStatus(data.status)) {
      throw new Error(`Invalid task status: ${data.status}`);
    }

    if (data.progress !== undefined && !this.validateProgress(data.progress)) {
      throw new Error(`Invalid progress value: ${data.progress}`);
    }

    const createData = this.buildCreateData({
      ...data,
      status: data.status || 'pending',
      progress: data.progress || 0,
      total_items: data.total_items || 0,
      processed_items: data.processed_items || 0,
      failed_items: data.failed_items || 0
    });

    this.logOperation('create', { task_type: data.task_type, xnxq: data.xnxq });

    return await super.create(createData as NewSyncTaskRecord);
  }

  /**
   * 删除同步任务（重写以添加日志）
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    this.logOperation('delete', { id });

    return await super.delete(id);
  }
}
