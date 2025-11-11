import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkCoursePeriod
} from '../types/database.js';
import type { ICoursePeriodRepository } from './interfaces/ICoursePeriodRepository.js';

/**
 * 课节配置仓储实现
 * 负责课节配置数据的持久化和查询
 */
export default class CoursePeriodRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_course_periods',
    IcalinkCoursePeriod
  >
  implements ICoursePeriodRepository
{
  protected readonly tableName = 'icalink_course_periods';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ CoursePeriodRepository initialized');
  }

  public async findByTermId(termId: number): Promise<IcalinkCoursePeriod[]> {
    if (!termId || termId <= 0) {
      this.logger.warn('findByTermId called with invalid termId');
      return [];
    }

    this.logger.debug({ termId }, 'Finding periods by term ID');

    const result = (await this.findMany(
      (qb) => qb.where('term_id', '=', termId),
      {
        orderBy: { field: 'period_no', direction: 'asc' }
      }
    )) as unknown as IcalinkCoursePeriod[];

    this.logger.debug(
      { termId, count: result.length },
      'Periods lookup completed'
    );

    return result;
  }

  public async findByTermIdAndPeriodNo(
    termId: number,
    periodNo: number
  ): Promise<IcalinkCoursePeriod[]> {
    if (!termId || termId <= 0 || !periodNo || periodNo <= 0) {
      this.logger.warn(
        'findByTermIdAndPeriodNo called with invalid parameters'
      );
      return [];
    }

    this.logger.debug({ termId, periodNo }, 'Finding periods by term and period number');

    const result = (await this.findMany((qb) =>
      qb.where('term_id', '=', termId).where('period_no', '=', periodNo)
    )) as unknown as IcalinkCoursePeriod[];

    this.logger.debug(
      { termId, periodNo, count: result.length },
      'Periods lookup completed'
    );

    return result;
  }

  public async batchCreate(
    periods: Array<Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<number> {
    if (!periods || periods.length === 0) {
      this.logger.warn('batchCreate called with empty periods');
      return 0;
    }

    this.logger.debug({ count: periods.length }, 'Batch creating periods');

    const db = await this.getWriteConnection();

    const result = await db
      .insertInto(this.tableName)
      .values(periods as any)
      .execute();

    const affectedRows = result.length;

    this.logger.debug(
      { count: periods.length, affectedRows },
      'Periods batch created successfully'
    );

    return affectedRows;
  }

  public async deleteByTermId(termId: number): Promise<number> {
    if (!termId || termId <= 0) {
      this.logger.warn('deleteByTermId called with invalid termId');
      return 0;
    }

    this.logger.debug({ termId }, 'Deleting periods by term ID');

    const db = await this.getWriteConnection();

    const result = await db
      .deleteFrom(this.tableName)
      .where('term_id', '=', termId)
      .executeTakeFirst();

    const affectedRows = Number(result.numDeletedRows || 0);

    this.logger.debug(
      { termId, affectedRows },
      'Periods deleted successfully'
    );

    return affectedRows;
  }

  public async copyToTerm(
    sourceTermId: number,
    targetTermId: number
  ): Promise<number> {
    if (!sourceTermId || sourceTermId <= 0 || !targetTermId || targetTermId <= 0) {
      this.logger.warn('copyToTerm called with invalid parameters');
      return 0;
    }

    this.logger.debug(
      { sourceTermId, targetTermId },
      'Copying periods to another term'
    );

    // 1. 查询源学期的所有课节
    const sourcePeriods = await this.findByTermId(sourceTermId);

    if (sourcePeriods.length === 0) {
      this.logger.warn({ sourceTermId }, 'No periods found in source term');
      return 0;
    }

    // 2. 构建目标学期的课节数据
    const targetPeriods = sourcePeriods.map((period) => ({
      term_id: targetTermId,
      period_no: period.period_no,
      name: period.name,
      default_start_time: period.default_start_time,
      default_end_time: period.default_end_time,
      is_active: period.is_active,
      remark: period.remark
    }));

    // 3. 批量创建
    const affectedRows = await this.batchCreate(targetPeriods);

    this.logger.debug(
      { sourceTermId, targetTermId, affectedRows },
      'Periods copied successfully'
    );

    return affectedRows;
  }
}

