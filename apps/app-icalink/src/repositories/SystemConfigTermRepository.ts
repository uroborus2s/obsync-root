import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { fromNullable, isSome, type Maybe } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  IcalinkSystemConfigTerm
} from '../types/database.js';
import type { ISystemConfigTermRepository } from './interfaces/ISystemConfigTermRepository.js';

/**
 * 学期配置仓储实现
 * 负责学期配置数据的持久化和查询
 */
export default class SystemConfigTermRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_system_config_terms',
    IcalinkSystemConfigTerm
  >
  implements ISystemConfigTermRepository
{
  protected readonly tableName = 'icalink_system_config_terms';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ SystemConfigTermRepository initialized');
  }

  public async findByTermCode(
    termCode: string
  ): Promise<Maybe<IcalinkSystemConfigTerm>> {
    if (!termCode || termCode.trim() === '') {
      this.logger.warn('findByTermCode called with empty termCode');
      return fromNullable<IcalinkSystemConfigTerm>(undefined);
    }

    this.logger.debug({ termCode }, 'Finding term by code');

    const result = (await this.findOne((qb) =>
      qb.where('term_code', '=', termCode)
    )) as unknown as Maybe<IcalinkSystemConfigTerm>;

    this.logger.debug(
      { termCode, found: isSome(result) },
      'Term lookup completed'
    );

    return result;
  }

  public async findAll(): Promise<IcalinkSystemConfigTerm[]> {
    this.logger.debug('Finding all terms');

    const result = (await this.findMany((qb) => qb, {
      orderBy: { field: 'start_date', direction: 'desc' }
    })) as unknown as IcalinkSystemConfigTerm[];

    this.logger.debug({ count: result.length }, 'All terms lookup completed');

    return result;
  }

  public async findActiveTerm(): Promise<Maybe<IcalinkSystemConfigTerm>> {
    this.logger.debug('Finding active term');

    const result = (await this.findOne((qb) =>
      qb.where('is_active', '=', true)
    )) as unknown as Maybe<IcalinkSystemConfigTerm>;

    this.logger.debug({ found: isSome(result) }, 'Active term lookup completed');

    return result;
  }

  public async setActiveTerm(termId: number): Promise<number> {
    if (!termId || termId <= 0) {
      this.logger.warn('setActiveTerm called with invalid termId');
      return 0;
    }

    this.logger.debug({ termId }, 'Setting active term');

    const db = await this.getWriteConnection();

    // 1. 将所有学期设置为非激活
    const deactivateResult = await db
      .updateTable(this.tableName)
      .set({ is_active: false as any })
      .execute();

    this.logger.debug(
      { deactivatedRows: deactivateResult.length },
      'Deactivated all terms'
    );

    // 2. 激活指定学期
    const activateResult = await db
      .updateTable(this.tableName)
      .set({ is_active: true as any })
      .where('id', '=', termId)
      .executeTakeFirst();

    const affectedRows = Number(activateResult.numUpdatedRows || 0);

    this.logger.debug(
      { termId, affectedRows },
      'Active term set successfully'
    );

    return affectedRows;
  }

  public async deleteTerm(termId: number): Promise<number> {
    if (!termId || termId <= 0) {
      this.logger.warn('deleteTerm called with invalid termId');
      return 0;
    }

    this.logger.debug({ termId }, 'Deleting term');

    const db = await this.getWriteConnection();

    const result = await db
      .deleteFrom(this.tableName)
      .where('id', '=', termId)
      .executeTakeFirst();

    const affectedRows = Number(result.numDeletedRows || 0);

    this.logger.debug({ termId, affectedRows }, 'Term deleted successfully');

    return affectedRows;
  }
}

