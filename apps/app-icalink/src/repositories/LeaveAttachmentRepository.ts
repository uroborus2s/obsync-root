import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkLeaveAttachment
} from '../types/database.js';

export default class LeaveAttachmentRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_leave_attachments',
  IcalinkLeaveAttachment
> {
  protected readonly tableName = 'icalink_leave_attachments';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ LeaveAttachmentRepository initialized');
  }
}
