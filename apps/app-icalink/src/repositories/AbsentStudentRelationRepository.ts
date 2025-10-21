import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import { isSome, type Maybe } from '@stratix/utils/functional';
import type {
  IcalinkAbsentStudentRelation,
  IcalinkDatabase
} from '../types/database.js';

/**
 * 缺勤学生关系表 Schema 定义
 */
const schema = new SchemaBuilder('icalink_absent_student_relations')
  .addColumn('id', DataColumnType.BIGINT, {
    primaryKey: true,
    autoIncrement: true
  })
  .addColumn('course_stats_id', DataColumnType.BIGINT, { nullable: false })
  .addColumn('course_id', DataColumnType.BIGINT, { nullable: false })
  .addColumn('course_code', DataColumnType.STRING, { nullable: false })
  .addColumn('course_name', DataColumnType.STRING, { nullable: false })
  .addColumn('student_id', DataColumnType.STRING, { nullable: false })
  .addColumn('student_name', DataColumnType.STRING, { nullable: false })
  .addColumn('school_name', DataColumnType.STRING, { nullable: true })
  .addColumn('class_name', DataColumnType.STRING, { nullable: true })
  .addColumn('major_name', DataColumnType.STRING, { nullable: true })
  .addColumn('absence_type', DataColumnType.STRING, {
    nullable: false
  })
  .addColumn('stat_date', DataColumnType.DATE, { nullable: false })
  .addColumn('semester', DataColumnType.STRING, { nullable: false })
  .addColumn('teaching_week', DataColumnType.INTEGER, { nullable: false })
  .addColumn('week_day', DataColumnType.INTEGER, { nullable: false })
  .addColumn('periods', DataColumnType.STRING, { nullable: true })
  .addColumn('time_period', DataColumnType.STRING, { nullable: false })
  .addColumn('created_at', DataColumnType.TIMESTAMP, { nullable: false })
  .addColumn('updated_at', DataColumnType.TIMESTAMP, { nullable: false })
  .addIndex('idx_asr_course_student', ['course_id', 'student_id'])
  .addIndex('idx_asr_student_semester', ['student_id', 'semester'])
  .addIndex('idx_asr_stat_date', ['stat_date'])
  .setComment('缺勤学生关系表-存储历史课程的最终缺勤状态')
  .build();

/**
 * 缺勤学生关系仓储实现
 * 负责查询历史课程的最终缺勤状态
 */
export default class AbsentStudentRelationRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_absent_student_relations',
  IcalinkAbsentStudentRelation
> {
  protected readonly tableName = 'icalink_absent_student_relations';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AbsentStudentRelationRepository initialized');
  }

  /**
   * 根据课程ID和学生ID查找缺勤记录
   * @param courseId 课程ID（icasync_attendance_courses.id）
   * @param studentId 学生ID
   * @returns 缺勤记录（可能不存在）
   */
  public async findByCourseAndStudent(
    courseId: number,
    studentId: string
  ): Promise<IcalinkAbsentStudentRelation | undefined> {
    if (!courseId || !studentId) {
      this.logger.warn('findByCourseAndStudent called with invalid parameters');
      return undefined;
    }

    this.logger.debug(
      { courseId, studentId },
      'Finding absent relation by course and student'
    );

    const result = (await this.findOne((qb) =>
      qb.where('id', '=', courseId).where('student_id', '=', studentId)
    )) as unknown as Maybe<IcalinkAbsentStudentRelation>;

    return isSome(result) ? result.value : undefined;
  }

  /**
   * 根据学生ID和学期查找所有缺勤记录
   * @param studentId 学生ID
   * @param semester 学期
   * @returns 缺勤记录列表
   */
  public async findByStudentAndSemester(
    studentId: string,
    semester: string
  ): Promise<IcalinkAbsentStudentRelation[]> {
    if (!studentId || !semester) {
      this.logger.warn(
        'findByStudentAndSemester called with invalid parameters'
      );
      return [];
    }

    this.logger.debug(
      { studentId, semester },
      'Finding absent relations by student and semester'
    );

    const result = (await this.findMany(
      (qb) =>
        qb.where('student_id', '=', studentId).where('semester', '=', semester),
      {
        orderBy: { field: 'stat_date', direction: 'desc' }
      }
    )) as unknown as IcalinkAbsentStudentRelation[];

    return result;
  }

  /**
   * 根据课程ID查找所有缺勤记录
   * @param courseId 课程ID
   * @returns 缺勤记录列表
   */
  public async findByCourse(
    courseId: number
  ): Promise<IcalinkAbsentStudentRelation[]> {
    if (!courseId) {
      this.logger.warn('findByCourse called with invalid courseId');
      return [];
    }

    this.logger.debug({ courseId }, 'Finding absent relations by course');

    const result = (await this.findMany(
      (qb) => qb.where('course_id', '=', courseId),
      {
        orderBy: { field: 'student_id', direction: 'asc' }
      }
    )) as unknown as IcalinkAbsentStudentRelation[];

    return result;
  }

  /**
   * 根据日期范围查找缺勤记录
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param studentId 学生ID（可选）
   * @returns 缺勤记录列表
   */
  public async findByDateRange(
    startDate: Date,
    endDate: Date,
    studentId?: string
  ): Promise<IcalinkAbsentStudentRelation[]> {
    if (!startDate || !endDate) {
      this.logger.warn('findByDateRange called with invalid parameters');
      return [];
    }

    this.logger.debug(
      { startDate, endDate, studentId },
      'Finding absent relations by date range'
    );

    const result = (await this.findMany(
      (qb) => {
        let query = qb
          .where('stat_date', '>=', startDate)
          .where('stat_date', '<=', endDate);

        if (studentId) {
          query = query.where('student_id', '=', studentId);
        }

        return query;
      },
      {
        orderBy: { field: 'stat_date', direction: 'desc' }
      }
    )) as unknown as IcalinkAbsentStudentRelation[];

    return result;
  }
}
