import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { Maybe } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  VAttendanceRealtimeDetails
} from '../types/database.js';

export default class AttendanceViewRepository extends BaseRepository<
  IcalinkDatabase,
  'v_attendance_realtime_details',
  VAttendanceRealtimeDetails
> {
  protected readonly tableName = 'v_attendance_realtime_details';
  // Views do not have a primary key in the same way as tables.
  protected readonly primaryKey = 'external_id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AttendanceViewRepository initialized');
  }

  /**
   * 查找指定时间前 24 小时内的考勤详情
   *
   * @param time - 结束时间
   * @param filters - 可选过滤条件（courseId, studentId, status）
   * @returns 考勤详情列表（错误时返回空数组）
   */
  public async findRecentAttendances(
    time: Date,
    filters: {
      courseId?: number;
      studentId?: string;
      status?: string;
    }
  ): Promise<VAttendanceRealtimeDetails[]> {
    try {
      this.logger.info(
        { time, filters },
        'Finding recent attendance details from view'
      );

      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom('v_attendance_realtime_details')
        .selectAll();

      // 设置 24 小时时间窗口
      const startTime = new Date(time.getTime() - 24 * 60 * 60 * 1000);
      query = query
        .where('start_time', '<', time)
        .where('start_time', '>=', startTime);

      // 应用可选过滤条件
      if (filters.courseId) {
        query = query.where('attendance_course_id', '=', filters.courseId);
      }
      if (filters.studentId) {
        query = query.where('student_id', '=', filters.studentId);
      }
      if (filters.status) {
        query = query.where('final_status', '=', filters.status);
      }

      const results = await query.execute();
      return results as VAttendanceRealtimeDetails[];
    } catch (error) {
      this.logError('findRecentAttendances', error as Error, { time, filters });
      return [];
    }
  }

  /**
   * 根据 external_id 和 student_id 查找考勤详情
   *
   * @param externalId - 课程外部ID
   * @param studentId - 学生ID
   * @returns 考勤详情（不存在时返回 undefined）
   */
  public async findByExternalIdAndStudent(
    externalId: string,
    studentId: string
  ): Promise<Maybe<VAttendanceRealtimeDetails>> {
    if (!externalId || !studentId) {
      this.logger.warn(
        'findByExternalIdAndStudent called with invalid parameters'
      );
    }

    this.logger.debug(
      { externalId, studentId },
      'Finding attendance detail by external_id and student_id'
    );

    const result = await this.findOne((qb) =>
      qb
        .clearSelect()
        .select(['final_status'])
        .where('external_id', '=', externalId)
        .where('student_id', '=', studentId)
    );

    return result;
  }

  /**
   * 根据 external_id 查找所有学生的考勤详情
   *
   * @param externalId - 课程外部ID
   * @returns 考勤详情列表（错误时返回空数组）
   */
  public async findByExternalId(
    externalId: string
  ): Promise<VAttendanceRealtimeDetails[]> {
    if (!externalId) {
      this.logger.warn('findByExternalId called with empty externalId');
      return [];
    }

    try {
      this.logger.debug(
        { externalId },
        'Finding attendance details by external_id'
      );

      const connection = await this.getQueryConnection();
      const results = await connection
        .selectFrom('v_attendance_realtime_details')
        .selectAll()
        .where('external_id', '=', externalId)
        .orderBy('student_id', 'asc')
        .execute();

      return results as VAttendanceRealtimeDetails[];
    } catch (error) {
      this.logError('findByExternalId', error as Error, { externalId });
      return [];
    }
  }
}
