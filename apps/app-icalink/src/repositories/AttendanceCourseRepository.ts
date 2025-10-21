import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import { fromNullable, isSome, type Maybe } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  IcasyncAttendanceCourse
} from '../types/database.js';
import type { IAttendanceCourseRepository } from './interfaces/IAttendanceCourseRepository.js';

const schema = SchemaBuilder.create('icasync_attendance_courses')
  .addPrimaryKey('id')
  .addColumn('juhe_renwu_id', DataColumnType.INTEGER, { nullable: true })
  .addColumn('external_id', DataColumnType.STRING, { nullable: false })
  .addColumn('course_code', DataColumnType.STRING, { nullable: false })
  .addColumn('course_name', DataColumnType.STRING, { nullable: false })
  .addColumn('semester', DataColumnType.STRING, { nullable: false })
  .addColumn('teaching_week', DataColumnType.INTEGER, { nullable: true })
  .addColumn('week_day', DataColumnType.INTEGER, { nullable: true })
  .addColumn('teacher_codes', DataColumnType.STRING, { nullable: true })
  .addColumn('teacher_names', DataColumnType.STRING, { nullable: true })
  .addColumn('class_location', DataColumnType.STRING, { nullable: true })
  .addColumn('start_time', DataColumnType.TIMESTAMP, { nullable: false })
  .addColumn('end_time', DataColumnType.TIMESTAMP, { nullable: false })
  .addColumn('periods', DataColumnType.STRING, { nullable: true })
  .addColumn('time_period', DataColumnType.STRING, { nullable: true })
  .addColumn('attendance_enabled', DataColumnType.BOOLEAN, {
    defaultValue: false
  })
  .addColumn('attendance_start_offset', DataColumnType.INTEGER, {
    nullable: true
  })
  .addColumn('attendance_end_offset', DataColumnType.INTEGER, {
    nullable: true
  })
  .addColumn('late_threshold', DataColumnType.INTEGER, { nullable: true })
  .addColumn('auto_absent_after', DataColumnType.INTEGER, { nullable: true })
  .addColumn('deleted_at', DataColumnType.TIMESTAMP, { nullable: true })
  .addColumn('deleted_by', DataColumnType.STRING, { nullable: true })
  .addColumn('metadata', DataColumnType.JSON, { nullable: true })
  .addIndex('idx_ac_external_id', ['external_id'])
  .addIndex('idx_ac_course_code', ['course_code'])
  .addIndex('idx_ac_semester', ['semester'])
  .setComment('考勤课程表')
  .build();

/**
 * 考勤课程仓储实现
 * 负责考勤课程数据的持久化和查询
 */
export default class AttendanceCourseRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icasync_attendance_courses',
    IcasyncAttendanceCourse
  >
  implements IAttendanceCourseRepository
{
  protected readonly tableName = 'icasync_attendance_courses';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AttendanceCourseRepository initialized');
  }

  /**
   * 根据外部ID查找考勤课程
   * @param externalId 外部ID
   * @returns 考勤课程实体（可能不存在）
   */
  public async findByExternalId(
    externalId: string
  ): Promise<Maybe<IcasyncAttendanceCourse>> {
    // 参数验证
    if (!externalId || externalId.trim() === '') {
      this.logger.warn('findByExternalId called with empty externalId');
      return fromNullable<IcasyncAttendanceCourse>(undefined);
    }

    this.logger.debug({ externalId }, 'Finding course by external_id');

    // 使用 BaseRepository 的 findOne 方法
    const result = (await this.findOne((qb) =>
      qb.where('external_id', '=', externalId).where('deleted_at', 'is', null)
    )) as unknown as Maybe<IcasyncAttendanceCourse>;

    this.logger.debug(
      { externalId, found: isSome(result) },
      'Course lookup completed'
    );

    return result;
  }

  /**
   * 根据课程代码和学期查找考勤课程列表
   * @param courseCode 课程代码
   * @param semester 学期
   * @returns 考勤课程列表
   */
  public async findByCourseCode(
    courseCode: string,
    semester: string
  ): Promise<IcasyncAttendanceCourse[]> {
    // 参数验证
    if (!courseCode || !semester) {
      this.logger.warn('findByCourseCode called with invalid parameters');
      return [];
    }

    this.logger.debug({ courseCode, semester }, 'Finding courses by code');

    const result = (await this.findMany(
      (qb) =>
        qb
          .where('course_code', '=', courseCode)
          .where('semester', '=', semester)
          .where('deleted_at', 'is', null),
      {
        orderBy: { field: 'start_time', direction: 'asc' }
      }
    )) as unknown as IcasyncAttendanceCourse[];

    return result;
  }

  /**
   * 根据学期查找所有考勤课程
   * @param semester 学期
   * @returns 考勤课程列表
   */
  public async findBySemester(
    semester: string
  ): Promise<IcasyncAttendanceCourse[]> {
    if (!semester) {
      this.logger.warn('findBySemester called with empty semester');
      return [];
    }

    this.logger.debug({ semester }, 'Finding courses by semester');

    const result = (await this.findMany(
      (qb) =>
        qb.where('semester', '=', semester).where('deleted_at', 'is', null),
      {
        orderBy: { field: 'start_time', direction: 'asc' }
      }
    )) as unknown as IcasyncAttendanceCourse[];

    return result;
  }

  /**
   * 根据教师代码和学期查找考勤课程
   * @param teacherCode 教师代码
   * @param semester 学期
   * @returns 考勤课程列表
   */
  public async findByTeacherCode(
    teacherCode: string,
    semester: string
  ): Promise<IcasyncAttendanceCourse[]> {
    if (!teacherCode || !semester) {
      this.logger.warn('findByTeacherCode called with invalid parameters');
      return [];
    }

    this.logger.debug({ teacherCode, semester }, 'Finding courses by teacher');

    const result = (await this.findMany(
      (qb) =>
        qb
          .where('teacher_codes', 'like', `%${teacherCode}%`)
          .where('semester', '=', semester)
          .where('deleted_at', 'is', null),
      {
        orderBy: { field: 'start_time', direction: 'asc' }
      }
    )) as unknown as IcasyncAttendanceCourse[];

    return result;
  }
}
