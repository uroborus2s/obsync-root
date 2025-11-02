import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { isSome } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  VCourseCheckinStatsClass
} from '../types/database.js';

/**
 * 班级级别签到统计视图仓储实现
 * 负责查询班级级别的课程签到统计数据
 */
export default class VCourseCheckinStatsClassRepository extends BaseRepository<
  IcalinkDatabase,
  'v_course_checkin_stats_class',
  VCourseCheckinStatsClass
> {
  protected readonly tableName = 'v_course_checkin_stats_class';
  protected readonly primaryKey = 'teaching_class_code'; // 视图没有真正的主键，使用 teaching_class_code 作为逻辑主键

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ VCourseCheckinStatsClassRepository initialized');
  }

  /**
   * 分页查询班级级别统计数据
   * @param page 页码
   * @param pageSize 每页数量
   * @param unitId 单位ID（筛选条件）
   * @param searchKeyword 搜索关键词（班级代码、课程名称）
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   */
  public async findWithPagination(
    page: number,
    pageSize: number,
    unitId?: string,
    searchKeyword?: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: VCourseCheckinStatsClass[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;

    this.logger.debug('Finding class stats with pagination', {
      page,
      pageSize,
      unitId,
      searchKeyword,
      sortField,
      sortOrder
    });

    // 构建查询条件
    const buildQuery = (qb: any) => {
      let query = qb;

      // 单位ID筛选（必需参数，用于树形结构的层级查询）
      if (unitId) {
        query = query.where('course_unit_id', '=', unitId);
      }

      // 搜索条件：班级代码、课程名称
      if (searchKeyword) {
        query = query.where((eb: any) =>
          eb.or([
            eb('teaching_class_code', 'like', `%${searchKeyword}%`),
            eb('course_name', 'like', `%${searchKeyword}%`),
            eb('course_unit', 'like', `%${searchKeyword}%`),
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
    })) as VCourseCheckinStatsClass[];

    return { data, total };
  }

  /**
   * 根据单位ID查询所有班级统计数据
   * @param unitId 单位ID
   * @returns 班级统计数据列表
   */
  public async findByUnitId(
    unitId: string
  ): Promise<VCourseCheckinStatsClass[]> {
    if (!unitId) {
      this.logger.warn('findByUnitId called with invalid unitId');
      return [];
    }

    this.logger.debug({ unitId }, 'Finding class stats by unit ID');

    const data = (await this.findMany(
      (qb) => qb.where('course_unit_id', '=', unitId),
      {
        orderBy: { field: 'teaching_class_code', direction: 'asc' }
      }
    )) as VCourseCheckinStatsClass[];

    return data;
  }

  /**
   * 根据班级代码查询统计数据
   * @param classCode 班级代码
   * @returns 班级统计数据
   */
  public async findByClassCode(
    classCode: string
  ): Promise<VCourseCheckinStatsClass | null> {
    if (!classCode) {
      this.logger.warn('findByClassCode called with invalid classCode');
      return null;
    }

    this.logger.debug({ classCode }, 'Finding class stats by class code');

    const result = await this.findOne((qb) =>
      qb.where('teaching_class_code', '=', classCode)
    );

    if (isSome(result)) {
      return result.value as VCourseCheckinStatsClass;
    }

    return null;
  }

  /**
   * 获取总记录数
   * @param unitId 单位ID（可选）
   * @returns 总记录数
   */
  public async getTotalCount(unitId?: string): Promise<number> {
    if (unitId) {
      return await this.count((qb) => qb.where('course_unit_id', '=', unitId));
    }
    return await this.count();
  }
}
