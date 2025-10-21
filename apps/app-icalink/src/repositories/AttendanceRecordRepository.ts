import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import { isNone } from '@stratix/utils/functional';
import type {
  IcalinkAttendanceRecord,
  IcalinkDatabase
} from '../types/database.js';

const schema = SchemaBuilder.create('icalink_attendance_records')
  .addPrimaryKey('id')
  .addForeignKey('attendance_course_id', 'icasync_attendance_courses')
  .addColumn('student_id', DataColumnType.STRING, { nullable: false })
  .addColumn('student_name', DataColumnType.STRING, { nullable: false })
  .addColumn('class_name', DataColumnType.STRING, { nullable: true })
  .addColumn('major_name', DataColumnType.STRING, { nullable: true })
  .addColumn('status', DataColumnType.STRING, { nullable: false })
  .addColumn('checkin_time', DataColumnType.TIMESTAMP, { nullable: true })
  .addColumn('checkin_location', DataColumnType.STRING, { nullable: true })
  .addColumn('checkin_latitude', DataColumnType.DECIMAL, {
    precision: 10,
    scale: 7,
    nullable: true
  })
  .addColumn('checkin_longitude', DataColumnType.DECIMAL, {
    precision: 10,
    scale: 7,
    nullable: true
  })
  .addColumn('checkin_accuracy', DataColumnType.FLOAT, { nullable: true })
  .addColumn('ip_address', DataColumnType.STRING, { nullable: true })
  .addColumn('user_agent', DataColumnType.STRING, { nullable: true })
  .addColumn('is_late', DataColumnType.BOOLEAN, {
    defaultValue: false,
    nullable: false
  })
  .addColumn('late_minutes', DataColumnType.INTEGER, { nullable: true })
  .addColumn('remark', DataColumnType.TEXT, { nullable: true })
  .addColumn('created_by', DataColumnType.STRING, { nullable: true })
  .addColumn('updated_by', DataColumnType.STRING, { nullable: true })
  .addColumn('metadata', DataColumnType.JSON, { nullable: true })
  .addIndex('idx_attendance_record_course_student', [
    'attendance_course_id',
    'student_id'
  ])
  .addIndex('idx_attendance_record_student', ['student_id'])
  .setComment('学生签到记录表')
  .build();

export default class AttendanceRecordRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_attendance_records',
  IcalinkAttendanceRecord
> {
  protected readonly tableName = 'icalink_attendance_records';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

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
}
