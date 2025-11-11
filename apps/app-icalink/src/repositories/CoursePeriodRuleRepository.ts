import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkCoursePeriodRule
} from '../types/database.js';
import type { ICoursePeriodRuleRepository } from './interfaces/ICoursePeriodRuleRepository.js';

/**
 * 课节规则仓储实现
 * 负责课节规则数据的持久化和查询
 */
export default class CoursePeriodRuleRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_course_period_rules',
    IcalinkCoursePeriodRule
  >
  implements ICoursePeriodRuleRepository
{
  protected readonly tableName = 'icalink_course_period_rules';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ CoursePeriodRuleRepository initialized');
  }

  public async findByPeriodId(
    periodId: number
  ): Promise<IcalinkCoursePeriodRule[]> {
    if (!periodId || periodId <= 0) {
      this.logger.warn('findByPeriodId called with invalid periodId');
      return [];
    }

    this.logger.debug({ periodId }, 'Finding rules by period ID');

    const result = (await this.findMany(
      (qb) => qb.where('period_id', '=', periodId),
      {
        orderBy: { field: 'priority', direction: 'asc' }
      }
    )) as unknown as IcalinkCoursePeriodRule[];

    this.logger.debug(
      { periodId, count: result.length },
      'Rules lookup completed'
    );

    return result;
  }

  public async findEnabledByPeriodId(
    periodId: number
  ): Promise<IcalinkCoursePeriodRule[]> {
    if (!periodId || periodId <= 0) {
      this.logger.warn('findEnabledByPeriodId called with invalid periodId');
      return [];
    }

    this.logger.debug({ periodId }, 'Finding enabled rules by period ID');

    const result = (await this.findMany(
      (qb) =>
        qb.where('period_id', '=', periodId).where('enabled', '=', true),
      {
        orderBy: { field: 'priority', direction: 'asc' }
      }
    )) as unknown as IcalinkCoursePeriodRule[];

    this.logger.debug(
      { periodId, count: result.length },
      'Enabled rules lookup completed'
    );

    return result;
  }

  public async deleteRule(ruleId: number): Promise<number> {
    if (!ruleId || ruleId <= 0) {
      this.logger.warn('deleteRule called with invalid ruleId');
      return 0;
    }

    this.logger.debug({ ruleId }, 'Deleting rule');

    const db = await this.getWriteConnection();

    const result = await db
      .deleteFrom(this.tableName)
      .where('id', '=', ruleId)
      .executeTakeFirst();

    const affectedRows = Number(result.numDeletedRows || 0);

    this.logger.debug({ ruleId, affectedRows }, 'Rule deleted successfully');

    return affectedRows;
  }

  public async deleteByPeriodId(periodId: number): Promise<number> {
    if (!periodId || periodId <= 0) {
      this.logger.warn('deleteByPeriodId called with invalid periodId');
      return 0;
    }

    this.logger.debug({ periodId }, 'Deleting rules by period ID');

    const db = await this.getWriteConnection();

    const result = await db
      .deleteFrom(this.tableName)
      .where('period_id', '=', periodId)
      .executeTakeFirst();

    const affectedRows = Number(result.numDeletedRows || 0);

    this.logger.debug(
      { periodId, affectedRows },
      'Rules deleted successfully'
    );

    return affectedRows;
  }
}

