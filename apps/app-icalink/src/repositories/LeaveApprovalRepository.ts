import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkLeaveApproval
} from '../types/database.js';

export default class LeaveApprovalRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_leave_approvals',
  IcalinkLeaveApproval
> {
  protected readonly tableName = 'icalink_leave_approvals';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ LeaveApprovalRepository initialized');
  }
}
