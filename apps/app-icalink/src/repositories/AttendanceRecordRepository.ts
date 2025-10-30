import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { isLeft, isNone } from '@stratix/utils/functional';
import type {
  IcalinkAttendanceRecord,
  IcalinkDatabase
} from '../types/database.js';

export default class AttendanceRecordRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_attendance_records',
  IcalinkAttendanceRecord
> {
  protected readonly tableName = 'icalink_attendance_records';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AttendanceRecordRepository initialized');
  }

  /**
   * 根据课程ID和学生ID查询当天的签到记录
   * @param courseId 课程ID
   * @param studentId 学生ID
   * @returns 签到记录列表
   */
  public async findByCourseAndStudent(
    courseId: number,
    studentId: string
  ): Promise<{
    id: number;
    checkin_time: Date | null;
    status: string;
    last_checkin_source: string;
    last_checkin_reason: string;
    window_id: string;
  } | null> {
    if (!courseId || !studentId) {
      this.logger.warn('findByCourseAndStudent called with invalid parameters');
      return null;
    }

    this.logger.debug(
      { courseId, studentId },
      'Finding latest attendance record by course and student'
    );

    // 使用 findOne 查询最新的一次签到记录
    const recordMaybe = await this.findOne((qb) =>
      qb
        .clearSelect()
        .select([
          'id',
          'checkin_time',
          'status',
          'last_checkin_source',
          'last_checkin_reason',
          'window_id'
        ])
        .where('attendance_course_id', '=', courseId)
        .where('student_id', '=', studentId)
        .where('status', '=', 'present')
        .orderBy('checkin_time', 'desc')
    );

    // 如果没有找到记录，返回 null
    if (isNone(recordMaybe)) {
      return null;
    }

    const record = recordMaybe.value;

    // 转换为需要的格式
    return {
      id: record.id,
      checkin_time: record.checkin_time ?? null,
      status: record.status,
      last_checkin_source: record.last_checkin_source || '',
      last_checkin_reason: record.last_checkin_reason || '',
      window_id: record.window_id || ''
    };
  }

  /**
   * 更新考勤记录状态
   * @param attendanceRecordId 考勤记录 ID
   * @param status 新状态
   * @returns 更新结果
   */
  public async updateStatus(
    attendanceRecordId: number,
    status: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.debug(
        { attendanceRecordId, status },
        'Updating attendance record status'
      );

      const result = await this.update(attendanceRecordId, { status } as any);

      if (isLeft(result)) {
        this.logger.error(
          { attendanceRecordId, status, error: result.left },
          'Failed to update attendance record status'
        );
        return { success: false, error: '更新考勤记录状态失败' };
      }

      this.logger.info(
        { attendanceRecordId, status },
        'Successfully updated attendance record status'
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        { error, attendanceRecordId, status },
        'Error updating attendance record status'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新考勤记录状态失败'
      };
    }
  }

  /**
   * 物理删除考勤记录
   * @param attendanceRecordId 考勤记录 ID
   * @returns 删除结果
   */
  public async deleteRecord(
    attendanceRecordId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.debug({ attendanceRecordId }, 'Deleting attendance record');

      const result = await this.delete(attendanceRecordId);

      if (isLeft(result)) {
        this.logger.error(
          { attendanceRecordId, error: result.left },
          'Failed to delete attendance record'
        );
        return { success: false, error: '删除考勤记录失败' };
      }

      this.logger.info(
        { attendanceRecordId },
        'Successfully deleted attendance record'
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        { error, attendanceRecordId },
        'Error deleting attendance record'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除考勤记录失败'
      };
    }
  }
}
