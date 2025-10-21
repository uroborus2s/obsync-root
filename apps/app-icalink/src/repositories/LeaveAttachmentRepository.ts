import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkLeaveAttachment
} from '../types/database.js';

const schema = SchemaBuilder.create('icalink_leave_attachments')
  .addPrimaryKey('id')
  .addForeignKey('leave_application_id', 'icalink_leave_applications')
  .addColumn('image_name', DataColumnType.STRING, { nullable: false })
  .addColumn('image_size', DataColumnType.INTEGER, { nullable: false })
  .addColumn('image_type', DataColumnType.STRING, { nullable: false })
  .addColumn('image_extension', DataColumnType.STRING, { nullable: false })
  .addColumn('image_content', DataColumnType.BLOB, { nullable: true })
  .addColumn('image_width', DataColumnType.INTEGER, { nullable: true })
  .addColumn('image_height', DataColumnType.INTEGER, { nullable: true })
  .addColumn('thumbnail_content', DataColumnType.BLOB, { nullable: true })
  .addColumn('upload_time', DataColumnType.TIMESTAMP, { nullable: false })
  .addColumn('created_by', DataColumnType.STRING, { nullable: true })
  .addColumn('metadata', DataColumnType.JSON, { nullable: true })
  .setComment('请假申请附件表')
  .build();

export default class LeaveAttachmentRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_leave_attachments',
  IcalinkLeaveAttachment
> {
  protected readonly tableName = 'icalink_leave_attachments';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ LeaveAttachmentRepository initialized');
  }
}
