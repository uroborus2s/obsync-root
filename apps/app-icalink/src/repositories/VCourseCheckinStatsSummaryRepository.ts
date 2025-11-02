import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { isSome } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  VCourseCheckinStatsSummary
} from '../types/database.js';

/**
 * 课程汇总签到统计视图仓储实现
 * 负责查询课程级别的签到统计数据
 */
export default class VCourseCheckinStatsSummaryRepository extends BaseRepository<
  IcalinkDatabase,
  'v_course_checkin_stats_summary',
  VCourseCheckinStatsSummary
> {
  protected readonly tableName = 'v_course_checkin_stats_summary';
  protected readonly primaryKey = 'course_code'; // 视图没有真正的主键，使用 course_code 作为逻辑主键

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ VCourseCheckinStatsSummaryRepository initialized');
  }

  /**
   * 分页查询课程汇总统计数据
   * @param page 页码
   * @param pageSize 每页数量
   * @param classCode 班级代码（筛选条件）
   * @param searchKeyword 搜索关键词（课程代码、课程名称、教师名称）
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   */
  public async findWithPagination(
    page: number,
    pageSize: number,
    classCode?: string,
    searchKeyword?: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: VCourseCheckinStatsSummary[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;

    this.logger.debug('Finding course summary stats with pagination', {
      page,
      pageSize,
      classCode,
      searchKeyword,
      sortField,
      sortOrder
    });

    // 构建查询条件
    const buildQuery = (qb: any) => {
      let query = qb;

      // 班级代码筛选（必需参数，用于树形结构的层级查询）
      if (classCode) {
        query = query.where('teaching_class_code', '=', classCode);
      }

      // 搜索条件：课程代码、课程名称、教师名称
      if (searchKeyword) {
        query = query.where((eb: any) =>
          eb.or([
            eb('course_code', 'like', `%${searchKeyword}%`),
            eb('course_name', 'like', `%${searchKeyword}%`),
            eb('teacher_name', 'like', `%${searchKeyword}%`),
            eb('class_location', 'like', `%${searchKeyword}%`),
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
    })) as VCourseCheckinStatsSummary[];

    return { data, total };
  }

  /**
   * 根据班级代码查询所有课程统计数据
   * @param classCode 班级代码
   * @returns 课程统计数据列表
   */
  public async findByClassCode(
    classCode: string
  ): Promise<VCourseCheckinStatsSummary[]> {
    if (!classCode) {
      this.logger.warn('findByClassCode called with invalid classCode');
      return [];
    }

    this.logger.debug(
      { classCode },
      'Finding course summary stats by class code'
    );

    const data = (await this.findMany(
      (qb) => qb.where('teaching_class_code', '=', classCode),
      {
        orderBy: { field: 'course_code', direction: 'asc' }
      }
    )) as VCourseCheckinStatsSummary[];

    return data;
  }

  /**
   * 根据课程代码查询统计数据
   * @param courseCode 课程代码
   * @returns 课程统计数据
   */
  public async findByCourseCode(
    courseCode: string
  ): Promise<VCourseCheckinStatsSummary | null> {
    if (!courseCode) {
      this.logger.warn('findByCourseCode called with invalid courseCode');
      return null;
    }

    this.logger.debug(
      { courseCode },
      'Finding course summary stats by course code'
    );

    const result = await this.findOne((qb) =>
      qb.where('course_code', '=', courseCode)
    );

    if (isSome(result)) {
      return result.value as VCourseCheckinStatsSummary;
    }

    return null;
  }

  /**
   * 根据单位ID查询所有课程统计数据
   * @param unitId 单位ID
   * @returns 课程统计数据列表
   */
  public async findByUnitId(
    unitId: string
  ): Promise<VCourseCheckinStatsSummary[]> {
    if (!unitId) {
      this.logger.warn('findByUnitId called with invalid unitId');
      return [];
    }

    this.logger.debug({ unitId }, 'Finding course summary stats by unit ID');

    const data = (await this.findMany(
      (qb) => qb.where('course_unit_id', '=', unitId),
      {
        orderBy: { field: 'course_code', direction: 'asc' }
      }
    )) as VCourseCheckinStatsSummary[];

    return data;
  }

  /**
   * 获取总记录数
   * @param classCode 班级代码（可选）
   * @returns 总记录数
   */
  public async getTotalCount(classCode?: string): Promise<number> {
    if (classCode) {
      return await this.count((qb) =>
        qb.where('teaching_class_code', '=', classCode)
      );
    }
    return await this.count();
  }
}
