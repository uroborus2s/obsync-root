import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import type {
  IcalinkAttendanceRecordHistory,
  IcalinkDatabase
} from '../types/database.js';

const schema = SchemaBuilder.create('icalink_attendance_records_history')
  .addPrimaryKey('id')
  .addColumn('attendance_course_id', DataColumnType.BIGINT, {
    nullable: false
  })
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
  .addColumn('archived_at', DataColumnType.TIMESTAMP, { nullable: false })
  .addIndex('idx_attendance_history_course_student', [
    'attendance_course_id',
    'student_id'
  ])
  .addIndex('idx_attendance_history_student', ['student_id'])
  .setComment('学生签到历史记录表-存储历史课程的签到数据')
  .build();

/**
 * 考勤历史记录 Repository
 * 用于操作 icalink_attendance_records_history 表
 */
export default class AttendanceRecordHistoryRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_attendance_records_history',
  IcalinkAttendanceRecordHistory
> {
  protected readonly tableName = 'icalink_attendance_records_history';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AttendanceRecordHistoryRepository initialized');
  }
}
