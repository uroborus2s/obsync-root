import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkCoursePeriodRuleCondition
} from '../types/database.js';
import type { ICoursePeriodRuleConditionRepository } from './interfaces/ICoursePeriodRuleConditionRepository.js';

/**
 * 规则条件仓储实现
 * 负责规则条件数据的持久化和查询
 */
export default class CoursePeriodRuleConditionRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_course_period_rule_conditions',
    IcalinkCoursePeriodRuleCondition
  >
  implements ICoursePeriodRuleConditionRepository
{
  protected readonly tableName = 'icalink_course_period_rule_conditions';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ CoursePeriodRuleConditionRepository initialized');
  }

  public async findByRuleId(
    ruleId: number
  ): Promise<IcalinkCoursePeriodRuleCondition[]> {
    if (!ruleId || ruleId <= 0) {
      this.logger.warn('findByRuleId called with invalid ruleId');
      return [];
    }

    this.logger.debug({ ruleId }, 'Finding conditions by rule ID');

    const result = (await this.findMany(
      (qb) => qb.where('rule_id', '=', ruleId),
      {
        orderBy: { field: 'group_no', direction: 'asc' }
      }
    )) as unknown as IcalinkCoursePeriodRuleCondition[];

    this.logger.debug(
      { ruleId, count: result.length },
      'Conditions lookup completed'
    );

    return result;
  }

  public async batchCreate(
    conditions: Array<
      Omit<IcalinkCoursePeriodRuleCondition, 'id' | 'created_at' | 'updated_at'>
    >
  ): Promise<number> {
    if (!conditions || conditions.length === 0) {
      this.logger.warn('batchCreate called with empty conditions');
      return 0;
    }

    this.logger.debug({ count: conditions.length }, 'Batch creating conditions');

    const db = await this.getWriteConnection();

    const result = await db
      .insertInto(this.tableName)
      .values(conditions as any)
      .execute();

    const affectedRows = result.length;

    this.logger.debug(
      { count: conditions.length, affectedRows },
      'Conditions batch created successfully'
    );

    return affectedRows;
  }

  public async deleteByRuleId(ruleId: number): Promise<number> {
    if (!ruleId || ruleId <= 0) {
      this.logger.warn('deleteByRuleId called with invalid ruleId');
      return 0;
    }

    this.logger.debug({ ruleId }, 'Deleting conditions by rule ID');

    const db = await this.getWriteConnection();

    const result = await db
      .deleteFrom(this.tableName)
      .where('rule_id', '=', ruleId)
      .executeTakeFirst();

    const affectedRows = Number(result.numDeletedRows || 0);

    this.logger.debug(
      { ruleId, affectedRows },
      'Conditions deleted successfully'
    );

    return affectedRows;
  }

  public async deleteByRuleIds(ruleIds: number[]): Promise<number> {
    if (!ruleIds || ruleIds.length === 0) {
      this.logger.warn('deleteByRuleIds called with empty ruleIds');
      return 0;
    }

    this.logger.debug({ count: ruleIds.length }, 'Batch deleting conditions by rule IDs');

    const db = await this.getWriteConnection();

    const result = await db
      .deleteFrom(this.tableName)
      .where('rule_id', 'in', ruleIds)
      .executeTakeFirst();

    const affectedRows = Number(result.numDeletedRows || 0);

    this.logger.debug(
      { count: ruleIds.length, affectedRows },
      'Conditions batch deleted successfully'
    );

    return affectedRows;
  }
}

