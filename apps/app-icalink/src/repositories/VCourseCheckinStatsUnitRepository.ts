import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { isSome } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  VCourseCheckinStatsUnit
} from '../types/database.js';

/**
 * 单位级别签到统计视图仓储实现
 * 负责查询单位级别的课程签到统计数据
 */
export default class VCourseCheckinStatsUnitRepository extends BaseRepository<
  IcalinkDatabase,
  'v_course_checkin_stats_unit',
  VCourseCheckinStatsUnit
> {
  protected readonly tableName = 'v_course_checkin_stats_unit';
  protected readonly primaryKey = 'course_unit_id'; // 视图没有真正的主键，使用 course_unit_id 作为逻辑主键

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ VCourseCheckinStatsUnitRepository initialized');
  }

  /**
   * 分页查询单位级别统计数据
   * @param page 页码
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键词（单位名称）
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   */
  public async findWithPagination(
    page: number,
    pageSize: number,
    searchKeyword?: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: VCourseCheckinStatsUnit[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;

    this.logger.debug('Finding unit stats with pagination', {
      page,
      pageSize,
      searchKeyword,
      sortField,
      sortOrder
    });

    // 构建查询条件
    const buildQuery = (qb: any) => {
      let query = qb;

      // 搜索条件：单位名称
      if (searchKeyword) {
        query = query.where((eb: any) =>
          eb.or([
            eb('course_unit', 'like', `%${searchKeyword}%`),
            eb('course_unit_id', 'like', `%${searchKeyword}%`),
            eb('semester', 'like', `%${searchKeyword}%`)
          ])
        );
      }

      return query;
    };

    // 查询总数
    const total = await this.count(buildQuery);

    // 查询数据
    const data = (await this.findMany(buildQuery, {
      orderBy: sortField
        ? { field: sortField as any, direction: sortOrder || 'desc' }
        : { field: 'start_time', direction: 'desc' },
      limit: pageSize,
      offset
    })) as VCourseCheckinStatsUnit[];

    return { data, total };
  }

  /**
   * 根据单位ID查询统计数据
   * @param unitId 单位ID
   * @returns 单位统计数据
   */
  public async findByUnitId(
    unitId: string
  ): Promise<VCourseCheckinStatsUnit | null> {
    if (!unitId) {
      this.logger.warn('findByUnitId called with invalid unitId');
      return null;
    }

    this.logger.debug({ unitId }, 'Finding unit stats by unit ID');

    const result = await this.findOne((qb) =>
      qb.where('course_unit_id', '=', unitId)
    );

    if (isSome(result)) {
      return result.value as VCourseCheckinStatsUnit;
    }

    return null;
  }

  /**
   * 获取所有单位列表（用于树形结构）
   * @returns 单位列表
   */
  public async findAllUnits(): Promise<VCourseCheckinStatsUnit[]> {
    this.logger.debug('Finding all units');

    const data = (await this.findAll({
      orderBy: { field: 'course_unit', direction: 'asc' }
    })) as VCourseCheckinStatsUnit[];

    return data;
  }

  /**
   * 获取总记录数
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<number> {
    return await this.count();
  }
}
