import type { Logger } from '@stratix/core';
import { BaseRepository, sql } from '@stratix/database';
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
   * @param teachingWeek 教学周筛选
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   */
  public async findWithPagination(
    page: number,
    pageSize: number,
    searchKeyword?: string,
    teachingWeek?: number,
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
      teachingWeek,
      sortField,
      sortOrder
    });

    // 如果指定了教学周，需要从原始表查询并分组
    if (teachingWeek !== undefined) {
      return this.findByTeachingWeek(
        page,
        pageSize,
        teachingWeek,
        searchKeyword,
        sortField,
        sortOrder
      );
    }

    // 构建查询条件（查询视图）
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
   * 按教学周查询单位级别统计数据（从原始表查询并分组）
   * @param page 页码
   * @param pageSize 每页数量
   * @param teachingWeek 教学周
   * @param searchKeyword 搜索关键词
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   */
  private async findByTeachingWeek(
    page: number,
    pageSize: number,
    teachingWeek: number,
    searchKeyword?: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: VCourseCheckinStatsUnit[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;
    const connection = await this.getQueryConnection();

    // 构建查询条件
    const baseConditions = sql`teaching_week = ${teachingWeek} AND need_checkin = 1`;
    const searchConditions = searchKeyword
      ? sql`AND (course_unit LIKE ${'%' + searchKeyword + '%'} OR course_unit_id LIKE ${'%' + searchKeyword + '%'} OR semester LIKE ${'%' + searchKeyword + '%'})`
      : sql``;

    // 查询总数
    const countQuery = sql<{ total: number }>`
      SELECT COUNT(DISTINCT course_unit_id) as total
      FROM icalink_course_checkin_stats
      WHERE ${baseConditions}
        ${searchConditions}
    `.compile(connection);

    const countResult = await connection.executeQuery(countQuery);
    const total = (countResult.rows[0] as { total: number })?.total || 0;

    // 构建 ORDER BY 子句
    const orderByField = sortField || 'start_time';
    const orderByDirection = sortOrder || 'DESC';

    // 查询数据
    const dataQuery = sql<VCourseCheckinStatsUnit>`
      SELECT
        course_unit_id,
        MAX(course_unit) AS course_unit,
        MAX(semester) AS semester,
        MIN(teaching_week) AS start_week,
        MAX(teaching_week) AS end_week,
        MIN(DATE(start_time)) AS start_time,
        MAX(DATE(end_time)) AS end_time,
        COUNT(DISTINCT course_code) AS course_code_count,
        COUNT(DISTINCT teaching_class_code) AS teaching_class_code_count,
        SUM(total_should_attend) AS total_should_attend,
        SUM(absent_count) AS total_absent,
        SUM(truant_count) AS total_truant,
        CASE
          WHEN SUM(total_should_attend) = 0 THEN 0
          ELSE (SUM(absent_count) + SUM(truant_count)) / SUM(total_should_attend)
        END AS absence_rate,
        CASE
          WHEN SUM(total_should_attend) = 0 THEN 0
          ELSE SUM(truant_count) / SUM(total_should_attend)
        END AS truancy_rate
      FROM icalink_course_checkin_stats
      WHERE ${baseConditions}
        ${searchConditions}
      GROUP BY course_unit_id
      ORDER BY ${sql.raw(orderByField)} ${sql.raw(orderByDirection)}
      LIMIT ${pageSize} OFFSET ${offset}
    `.compile(connection);

    const dataResult = await connection.executeQuery(dataQuery);
    const data = dataResult.rows as VCourseCheckinStatsUnit[];

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
