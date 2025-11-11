import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { isNone, type Maybe } from '@stratix/utils/functional';
import type {
  AttendanceExportStatus,
  IcalinkAttendanceExportRecord,
  TaskStatusUpdate
} from '../types/attendance-export.types.js';
import type { IcalinkDatabase } from '../types/database.js';

/**
 * 考勤数据导出记录仓储接口
 * 继承BaseRepository的所有方法
 */
export interface IAttendanceExportRecordRepository
  extends InstanceType<
    typeof BaseRepository<
      IcalinkDatabase,
      'icalink_attendance_export_records',
      IcalinkAttendanceExportRecord
    >
  > {
  /**
   * 根据任务ID查询记录
   */
  findByTaskId(taskId: string): Promise<Maybe<IcalinkAttendanceExportRecord>>;

  /**
   * 根据查询哈希查找已完成的记录（用于缓存判断）
   */
  findCompletedByQueryHash(
    queryHash: string
  ): Promise<Maybe<IcalinkAttendanceExportRecord>>;

  /**
   * 更新任务状态
   */
  updateTaskStatus(
    taskId: string,
    status: AttendanceExportStatus,
    updates?: TaskStatusUpdate
  ): Promise<void>;

  /**
   * 查询过期的记录
   */
  findExpiredRecords(): Promise<IcalinkAttendanceExportRecord[]>;

  /**
   * 删除过期记录
   */
  deleteExpiredRecords(): Promise<number>;
}

/**
 * 考勤数据导出记录仓储实现
 */
export default class AttendanceExportRecordRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_attendance_export_records',
    IcalinkAttendanceExportRecord
  >
  implements IAttendanceExportRecordRepository
{
  protected readonly tableName = 'icalink_attendance_export_records';
  protected readonly primaryKey = 'id';
  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AttendanceExportRecordRepository initialized');
  }

  /**
   * 根据任务ID查询记录
   */
  async findByTaskId(
    taskId: string
  ): Promise<Maybe<IcalinkAttendanceExportRecord>> {
    try {
      const recordMaybe = await this.findOne((qb) =>
        qb.where('task_id', '=', taskId)
      );

      if (isNone(recordMaybe)) {
        this.logger.debug('任务记录不存在', { taskId });
      }

      return recordMaybe;
    } catch (error) {
      this.logger.error('查询任务记录失败', { taskId, error });
      throw error;
    }
  }

  /**
   * 根据查询哈希查找已完成的记录（用于缓存判断）
   */
  async findCompletedByQueryHash(
    queryHash: string
  ): Promise<Maybe<IcalinkAttendanceExportRecord>> {
    try {
      const now = new Date();
      const recordMaybe = await this.findOne((qb) =>
        qb
          .where('query_hash', '=', queryHash)
          .where('status', '=', 'completed')
          .where('expires_at', '>', now)
          .orderBy('created_at', 'desc')
      );

      if (isNone(recordMaybe)) {
        this.logger.debug('未找到缓存记录', { queryHash });
      }

      return recordMaybe;
    } catch (error) {
      this.logger.error('查询缓存记录失败', { queryHash, error });
      throw error;
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    taskId: string,
    status: AttendanceExportStatus,
    updates?: TaskStatusUpdate
  ): Promise<void> {
    try {
      const updateData: any = { status };

      if (updates) {
        if (updates.progress !== undefined)
          updateData.progress = updates.progress;
        if (updates.error_message)
          updateData.error_message = updates.error_message;
        if (updates.file_path) updateData.file_path = updates.file_path;
        if (updates.file_size) updateData.file_size = updates.file_size;
        if (updates.record_count)
          updateData.record_count = updates.record_count;
        if (updates.completed_at)
          updateData.completed_at = updates.completed_at;
      }

      await this.updateMany(
        (qb) => qb.where('task_id', '=', taskId),
        updateData
      );

      this.logger.info('任务状态更新成功', { taskId, status, updates });
    } catch (error) {
      this.logger.error('更新任务状态失败', { taskId, status, error });
      throw error;
    }
  }

  /**
   * 查询过期的记录
   */
  async findExpiredRecords(): Promise<IcalinkAttendanceExportRecord[]> {
    try {
      const now = new Date();
      return await this.findMany((qb) => qb.where('expires_at', '<', now));
    } catch (error) {
      this.logger.error('查询过期记录失败', { error });
      throw error;
    }
  }

  /**
   * 删除过期记录
   */
  async deleteExpiredRecords(): Promise<number> {
    try {
      const now = new Date();
      const result = await this.deleteMany((qb) =>
        qb.where('expires_at', '<', now)
      );

      const deletedCount = result._tag === 'Right' ? result.right : 0;
      this.logger.info('删除过期记录成功', { deletedCount });

      return deletedCount;
    } catch (error) {
      this.logger.error('删除过期记录失败', { error });
      throw error;
    }
  }
}
