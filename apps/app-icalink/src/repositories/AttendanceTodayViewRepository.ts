import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { fromNullable, Maybe } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  VAttendanceTodayDetails
} from '../types/database.js';

/**
 * AttendanceTodayViewRepository
 *
 * 负责访问 v_attendance_today_details 视图的仓储层
 * 该视图包含今日课程的学生考勤详情，包括学生基本信息和实时考勤状态
 *
 * @remarks
 * - 视图数据源：icasync_attendance_courses + icalink_teaching_class + icalink_attendance_records
 * - 仅包含 need_checkin = 1 的课程
 * - 仅包含当前教学周和当前星期的课程
 * - 自动计算 final_status（考勤最终状态）
 *
 * @example
 * ```typescript
 * const repository = container.resolve('attendanceTodayViewRepository');
 * const detail = await repository.findByExternalIdAndStudent('EXT123', 'STU001');
 * if (isSome(detail)) {
 *   console.log(detail.value.final_status);
 * }
 * ```
 */
export default class AttendanceTodayViewRepository extends BaseRepository<
  IcalinkDatabase,
  'v_attendance_today_details',
  VAttendanceTodayDetails
> {
  protected readonly tableName = 'v_attendance_today_details';
  // 视图没有传统意义上的主键，使用 external_id 作为标识
  protected readonly primaryKey = 'external_id';

  /**
   * 构造函数
   *
   * @param logger - Logger 实例，用于记录操作和错误
   *
   * @remarks
   * - 使用 'default' 连接配置
   * - 禁用自动建表（视图由数据库管理）
   */
  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AttendanceTodayViewRepository initialized');
  }

  /**
   * 根据课程外部ID和学生ID查找今日考勤详情
   *
   * @param externalId - 课程外部ID（来自 icasync_attendance_courses.external_id）
   * @param studentId - 学生ID（学号）
   * @returns 考勤详情的 Maybe 容器，不存在时返回 None
   *
   * @remarks
   * - 该方法用于学生端查询自己的考勤状态
   * - 返回完整的学生信息和考勤状态
   * - 如果学生不在该课程中或课程不在今日，返回 None
   *
   * @example
   * ```typescript
   * const detail = await repository.findByExternalIdAndStudent('EXT123', 'STU001');
   * if (isSome(detail)) {
   *   console.log(`学生: ${detail.value.student_name}`);
   *   console.log(`状态: ${detail.value.final_status}`);
   * } else {
   *   console.log('未找到考勤记录');
   * }
   * ```
   */
  public async findByExternalIdAndStudent(
    externalId: string,
    studentId: string
  ): Promise<Maybe<VAttendanceTodayDetails>> {
    // 参数验证
    if (!externalId || !studentId) {
      this.logger.warn(
        { externalId, studentId },
        'findByExternalIdAndStudent called with invalid parameters'
      );
      return fromNullable(null);
    }

    this.logger.debug(
      { externalId, studentId },
      'Finding today attendance detail by external_id and student_id'
    );

    // 使用 BaseRepository 的 findOne 方法
    const result = await this.findOne((qb) =>
      qb
        .where('external_id', '=', externalId)
        .where('student_id', '=', studentId)
    );

    return result;
  }

  /**
   * 根据课程外部ID查找所有学生的今日考勤详情
   *
   * @param externalId - 课程外部ID
   * @returns 考勤详情列表，错误时返回空数组
   *
   * @remarks
   * - 该方法用于教师端查询课程的所有学生考勤状态
   * - 结果按学生ID升序排序
   * - 如果课程不在今日或不存在，返回空数组
   *
   * @example
   * ```typescript
   * const details = await repository.findByExternalId('EXT123');
   * console.log(`共 ${details.length} 名学生`);
   * details.forEach(d => {
   *   console.log(`${d.student_name}: ${d.final_status}`);
   * });
   * ```
   */
  public async findByExternalId(
    externalId: string
  ): Promise<VAttendanceTodayDetails[]> {
    // 参数验证
    if (!externalId) {
      this.logger.warn('findByExternalId called with empty externalId');
      return [];
    }

    try {
      this.logger.debug(
        { externalId },
        'Finding today attendance details by external_id'
      );

      // 使用 BaseRepository 的 findMany 方法
      const results = await this.findMany(
        (qb) => qb.where('external_id', '=', externalId),
        {
          orderBy: { field: 'student_id', direction: 'asc' }
        }
      );

      return results;
    } catch (error) {
      this.logError('findByExternalId', error as Error, { externalId });
      return [];
    }
  }

  /**
   * 根据课程ID查找所有学生的今日考勤详情
   *
   * @param courseId - 课程ID（attendance_course_id）
   * @returns 考勤详情列表，错误时返回空数组
   *
   * @remarks
   * - 该方法用于通过课程ID查询考勤详情
   * - 结果按学生ID升序排序
   *
   * @example
   * ```typescript
   * const details = await repository.findByCourseId(123);
   * console.log(`课程 ${details[0]?.course_name} 共 ${details.length} 名学生`);
   * ```
   */
  public async findByCourseId(
    courseId: number
  ): Promise<VAttendanceTodayDetails[]> {
    // 参数验证
    if (!courseId || courseId <= 0) {
      this.logger.warn({ courseId }, 'findByCourseId called with invalid courseId');
      return [];
    }

    try {
      this.logger.debug(
        { courseId },
        'Finding today attendance details by course_id'
      );

      // 使用 BaseRepository 的 findMany 方法
      const results = await this.findMany(
        (qb) => qb.where('attendance_course_id', '=', courseId),
        {
          orderBy: { field: 'student_id', direction: 'asc' }
        }
      );

      return results;
    } catch (error) {
      this.logError('findByCourseId', error as Error, { courseId });
      return [];
    }
  }
}

