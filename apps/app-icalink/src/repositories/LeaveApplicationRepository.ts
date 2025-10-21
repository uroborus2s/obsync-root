import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkLeaveApplication
} from '../types/database.js';

const schema = SchemaBuilder.create('icalink_leave_applications')
  .addPrimaryKey('id')
  .addForeignKey('attendance_record_id', 'icalink_attendance_records')
  .addColumn('student_id', DataColumnType.STRING, { nullable: false })
  .addColumn('student_name', DataColumnType.STRING, { nullable: false })
  .addColumn('course_id', DataColumnType.STRING, { nullable: false })
  .addColumn('course_name', DataColumnType.STRING, { nullable: false })
  .addColumn('class_date', DataColumnType.DATE, { nullable: false })
  .addColumn('class_time', DataColumnType.STRING, { nullable: false })
  .addColumn('class_location', DataColumnType.STRING, { nullable: true })
  .addColumn('teacher_id', DataColumnType.STRING, { nullable: false })
  .addColumn('teacher_name', DataColumnType.STRING, { nullable: false })
  .addColumn('leave_type', DataColumnType.STRING, { nullable: false })
  .addColumn('leave_reason', DataColumnType.TEXT, { nullable: false })
  .addColumn('status', DataColumnType.STRING, { nullable: false })
  .addColumn('application_time', DataColumnType.TIMESTAMP, { nullable: false })
  .addColumn('approval_time', DataColumnType.TIMESTAMP, { nullable: true })
  .addColumn('approval_comment', DataColumnType.TEXT, { nullable: true })
  .addColumn('created_by', DataColumnType.STRING, { nullable: true })
  .addColumn('updated_by', DataColumnType.STRING, { nullable: true })
  .addColumn('metadata', DataColumnType.JSON, { nullable: true })
  .addIndex('idx_leave_student_id', ['student_id'])
  .addIndex('idx_leave_teacher_id', ['teacher_id'])
  .addIndex('idx_leave_course_id', ['course_id'])
  .addIndex('idx_leave_status', ['status'])
  .setComment('请假申请表')
  .build();

export default class LeaveApplicationRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_leave_applications',
  IcalinkLeaveApplication
> {
  protected readonly tableName = 'icalink_leave_applications';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ LeaveApplicationRepository initialized');
  }

  public async findFutureLeaveByCourseAndStudents(
    courseCode: string,
    studentIds: string[],
    classDate: Date
  ): Promise<IcalinkLeaveApplication[]> {
    if (studentIds.length === 0) {
      return [];
    }

    const results = (await this.findMany((qb) =>
      qb
        .where('course_id', '=', courseCode) // Assuming course_id is the course_code
        .where('student_id', 'in', studentIds)
        .where('class_date', '=', classDate)
        .where('status', 'in', ['leave', 'leave_pending'])
    )) as unknown as IcalinkLeaveApplication[];

    return results;
  }
}
