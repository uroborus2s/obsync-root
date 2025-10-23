import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkAbsentStudentRelation,
  IcalinkDatabase
} from '../types/database.js';

/**
 * 缺勤学生关系仓储实现
 * 负责查询历史课程的最终缺勤状态
 */
export default class VTeachingClassRepository extends BaseRepository<
  IcalinkDatabase,
  'v_teaching_class',
  any
> {
  protected readonly tableName = 'v_teaching_class';
  protected readonly primaryKey = '';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AbsentStudentRelationRepository initialized');
  }

  /**
   * 获取总记录数
   * 使用 BaseRepository 提供的 count() 方法
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<number> {
    this.logger.debug('Getting total count of absent student relations');

    // 使用 BaseRepository 的 count() 方法，不传条件则统计所有记录
    const count = await this.count();

    this.logger.debug({ count }, 'Total count retrieved');

    return count;
  }

  /**
   * 分页查询缺勤记录
   * 使用 BaseRepository 提供的 findMany() 方法配合查询选项
   * @param offset 偏移量（从0开始）
   * @param limit 每页数量
   * @returns 缺勤记录列表
   */
  public async findWithPagination(
    offset: number,
    limit: number
  ): Promise<IcalinkAbsentStudentRelation[]> {
    // 参数验证
    if (offset < 0 || limit <= 0) {
      this.logger.warn('findWithPagination called with invalid parameters', {
        offset,
        limit
      });
      return [];
    }

    this.logger.debug(
      { offset, limit },
      'Finding absent relations with pagination'
    );

    // 使用 BaseRepository 的 findMany() 方法
    // 不传 criteria 参数表示查询所有记录
    // 通过 options 配置排序、分页
    const result = (await this.findMany(undefined, {
      orderBy: { field: 'id', direction: 'asc' }, // 按 ID 升序，确保顺序一致
      limit,
      offset
    })) as unknown as IcalinkAbsentStudentRelation[];

    this.logger.debug(
      { offset, limit, count: result.length },
      'Pagination query completed'
    );

    return result;
  }

  /**
   * 查询 ID 大于指定值的记录（用于增量同步）
   * @param lastId 上次同步的最大 ID
   * @param limit 每批数量
   * @returns 缺勤记录列表
   */
  public async findByIdGreaterThan(
    lastId: number,
    limit: number
  ): Promise<IcalinkAbsentStudentRelation[]> {
    // 参数验证
    if (lastId < 0 || limit <= 0) {
      this.logger.warn('findByIdGreaterThan called with invalid parameters', {
        lastId,
        limit
      });
      return [];
    }

    this.logger.debug(
      { lastId, limit },
      'Finding absent relations with id greater than'
    );

    // 查询 id > lastId 的记录，按 ID 升序排序
    const result = (await this.findMany((qb) => qb.where('id', '>', lastId), {
      orderBy: { field: 'id', direction: 'asc' },
      limit
    })) as unknown as IcalinkAbsentStudentRelation[];

    this.logger.debug(
      { lastId, limit, count: result.length },
      'Query by id greater than completed'
    );

    return result;
  }

  /**
   * 获取最大 ID（用于确定同步起点）
   * @returns 最大 ID，如果表为空则返回 0
   */
  public async getMaxId(): Promise<number> {
    this.logger.debug('Getting max id of absent student relations');

    try {
      // 查询最大 ID 的记录
      const result = (await this.findMany(undefined, {
        orderBy: { field: 'id', direction: 'desc' },
        limit: 1
      })) as unknown as IcalinkAbsentStudentRelation[];

      if (result.length > 0) {
        const maxId = result[0].id;
        this.logger.debug({ maxId }, 'Max id retrieved');
        return maxId;
      }

      this.logger.debug('No records found, returning 0');
      return 0;
    } catch (error: any) {
      this.logger.error('Failed to get max id', error);
      return 0;
    }
  }
}
