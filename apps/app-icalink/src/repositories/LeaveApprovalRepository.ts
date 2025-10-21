import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkLeaveApproval
} from '../types/database.js';

const schema = SchemaBuilder.create('icalink_leave_approvals')
  .addPrimaryKey('id')
  .addForeignKey('leave_application_id', 'icalink_leave_applications')
  .addColumn('approver_id', DataColumnType.STRING, { nullable: false })
  .addColumn('approver_name', DataColumnType.STRING, { nullable: false })
  .addColumn('approver_department', DataColumnType.STRING, { nullable: true })
  .addColumn('approval_result', DataColumnType.STRING, { nullable: false })
  .addColumn('approval_comment', DataColumnType.TEXT, { nullable: true })
  .addColumn('approval_time', DataColumnType.TIMESTAMP, { nullable: true })
  .addColumn('approval_order', DataColumnType.INTEGER, { nullable: false })
  .addColumn('is_final_approver', DataColumnType.BOOLEAN, {
    defaultValue: false,
    nullable: false
  })
  .addColumn('created_by', DataColumnType.STRING, { nullable: true })
  .addColumn('updated_by', DataColumnType.STRING, { nullable: true })
  .addColumn('metadata', DataColumnType.JSON, { nullable: true })
  .addIndex('idx_approval_application_id', ['leave_application_id'])
  .addIndex('idx_approval_approver_id', ['approver_id'])
  .setComment('请假审批记录表')
  .build();

export default class LeaveApprovalRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_leave_approvals',
  IcalinkLeaveApproval
> {
  protected readonly tableName = 'icalink_leave_approvals';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ LeaveApprovalRepository initialized');
  }
}
