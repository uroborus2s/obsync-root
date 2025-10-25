import type { Logger } from '@stratix/core';
import { BaseRepository, DataColumnType, SchemaBuilder } from '@stratix/database';
import { isSome, type Maybe } from '@stratix/utils/functional';
import type { IcalinkDatabase } from '../types/database.js';
import type { VStudentSemesterAttendanceStats } from '../types/student-attendance-stats.types.js';

/**
 * 学生学期考勤统计视图 Schema 定义
 */
const schema = SchemaBuilder.create('v_student_semester_attendance_stats')
  .addColumn('student_id', DataColumnType.STRING, { nullable: false })
  .addColumn('student_name', DataColumnType.STRING, { nullable: false })
  .addColumn('school_name', DataColumnType.STRING, { nullable: true })
  .addColumn('class_name', DataColumnType.STRING, { nullable: true })
  .addColumn('major_name', DataColumnType.STRING, { nullable: true })
  .addColumn('semester', DataColumnType.STRING, { nullable: false })
  .addColumn('total_courses', DataColumnType.INTEGER, { nullable: false })
  .addColumn('completed_courses', DataColumnType.INTEGER, { nullable: false })
  .addColumn('absence_count', DataColumnType.INTEGER, { nullable: false })
  .addColumn('leave_count', DataColumnType.INTEGER, { nullable: false })
  .addColumn('attendance_count', DataColumnType.INTEGER, { nullable: false })
  .addColumn('attendance_rate', DataColumnType.DECIMAL, { nullable: false })
  .setComment('学生学期考勤统计视图')
  .build();

/**
 * 学生考勤统计仓储实现
 * 负责查询学生本学期的课程和考勤统计数据
 */
export default class StudentAttendanceStatsRepository extends BaseRepository<
  IcalinkDatabase,
  'v_student_semester_attendance_stats',
  VStudentSemesterAttendanceStats
> {
  protected readonly tableName = 'v_student_semester_attendance_stats';
  protected readonly primaryKey = 'student_id'; // 视图没有真正的主键，使用 student_id 作为逻辑主键
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ StudentAttendanceStatsRepository initialized');
  }

  /**
   * 根据学生ID和学期查询考勤统计
   * @param studentId 学生ID
   * @param semester 学期（可选）
   * @returns 考勤统计数据
   */
  public async findByStudentAndSemester(
    studentId: string,
    semester?: string
  ): Promise<VStudentSemesterAttendanceStats | null> {
    // 参数验证
    if (!studentId) {
      this.logger.warn('findByStudentAndSemester called with empty studentId');
      return null;
    }

    this.logger.debug(
      { studentId, semester },
      'Finding attendance stats by student and semester'
    );

    try {
      const resultMaybe = (await this.findOne((qb) => {
        let query = qb.where('student_id', '=', studentId);
        
        if (semester) {
          query = query.where('semester', '=', semester);
        }
        
        // 如果没有指定学期，按学期降序排序，取最新的一条
        if (!semester) {
          query = query.orderBy('semester', 'desc');
        }
        
        return query;
      })) as unknown as Maybe<VStudentSemesterAttendanceStats>;

      if (isSome(resultMaybe)) {
        return resultMaybe.value;
      }

      return null;
    } catch (error) {
      this.logError('findByStudentAndSemester', error as Error, {
        studentId,
        semester
      });
      return null;
    }
  }

  /**
   * 根据学生ID查询所有学期的考勤统计
   * @param studentId 学生ID
   * @returns 考勤统计数据列表
   */
  public async findAllSemestersByStudent(
    studentId: string
  ): Promise<VStudentSemesterAttendanceStats[]> {
    if (!studentId) {
      this.logger.warn('findAllSemestersByStudent called with empty studentId');
      return [];
    }

    this.logger.debug({ studentId }, 'Finding all semester stats by student');

    try {
      const results = (await this.findMany(
        (qb) => qb.where('student_id', '=', studentId),
        {
          orderBy: { field: 'semester', direction: 'desc' }
        }
      )) as unknown as VStudentSemesterAttendanceStats[];

      return results;
    } catch (error) {
      this.logError('findAllSemestersByStudent', error as Error, { studentId });
      return [];
    }
  }

  /**
   * 根据班级和学期查询考勤统计
   * @param className 班级名称
   * @param semester 学期
   * @returns 考勤统计数据列表
   */
  public async findByClassAndSemester(
    className: string,
    semester: string
  ): Promise<VStudentSemesterAttendanceStats[]> {
    if (!className || !semester) {
      this.logger.warn(
        'findByClassAndSemester called with invalid parameters'
      );
      return [];
    }

    this.logger.debug(
      { className, semester },
      'Finding attendance stats by class and semester'
    );

    try {
      const results = (await this.findMany(
        (qb) =>
          qb
            .where('class_name', '=', className)
            .where('semester', '=', semester),
        {
          orderBy: { field: 'attendance_rate', direction: 'desc' }
        }
      )) as unknown as VStudentSemesterAttendanceStats[];

      return results;
    } catch (error) {
      this.logError('findByClassAndSemester', error as Error, {
        className,
        semester
      });
      return [];
    }
  }
}

