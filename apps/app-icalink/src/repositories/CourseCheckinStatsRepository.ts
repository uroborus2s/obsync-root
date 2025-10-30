import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkCourseCheckinStats,
  IcalinkDatabase
} from '../types/database.js';

/**
 * 课程签到统计表仓储实现
 * 负责查询课程的历史签到统计数据
 */
export default class CourseCheckinStatsRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_course_checkin_stats',
  IcalinkCourseCheckinStats
> {
  protected readonly tableName = 'icalink_course_checkin_stats';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ CourseCheckinStatsRepository initialized');
  }

  /**
   * 分页查询课程签到统计数据（增强版）
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键词（课程名称、课程代码、教师姓名、教师工号）
   * @param teachingWeek 教学周筛选
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   */
  public async findWithPagination(params: {
    page: number;
    pageSize: number;
    searchKeyword?: string;
    teachingWeek?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: IcalinkCourseCheckinStats[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const {
      page,
      pageSize,
      searchKeyword,
      teachingWeek,
      sortField,
      sortOrder
    } = params;

    // 参数验证
    if (page < 1 || pageSize <= 0) {
      this.logger.warn('findWithPagination called with invalid parameters', {
        page,
        pageSize
      });
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    const offset = (page - 1) * pageSize;

    this.logger.debug(
      {
        page,
        pageSize,
        offset,
        searchKeyword,
        teachingWeek,
        sortField,
        sortOrder
      },
      'Finding course checkin stats with pagination'
    );

    // 构建查询条件
    const buildQuery = (qb: any) => {
      let query = qb;

      // 搜索条件：课程名称、课程代码、教师姓名、教师工号
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = `%${searchKeyword.trim()}%`;
        query = query.where((eb: any) =>
          eb.or([
            eb('course_name', 'like', keyword),
            eb('course_code', 'like', keyword),
            eb('teacher_name', 'like', keyword),
            eb('teacher_codes', 'like', keyword)
          ])
        );
      }

      // 教学周筛选
      if (teachingWeek !== undefined && teachingWeek > 0) {
        query = query.where('teaching_week', '=', teachingWeek);
      }

      return query;
    };

    // 查询总数
    const total = await this.count(buildQuery);

    // 查询数据
    const data = (await this.findMany(buildQuery, {
      orderBy: {
        field: sortField || 'stat_date',
        direction: sortOrder || 'desc'
      },
      limit: pageSize,
      offset
    })) as unknown as IcalinkCourseCheckinStats[];

    const totalPages = Math.ceil(total / pageSize);

    this.logger.debug(
      { total, dataCount: data.length, totalPages },
      'Pagination query completed'
    );

    return {
      data,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * 根据课程代码查找统计记录
   * @param courseCode 课程代码
   * @returns 统计记录列表
   */
  public async findByCourseCode(
    courseCode: string
  ): Promise<IcalinkCourseCheckinStats[]> {
    if (!courseCode) {
      this.logger.warn('findByCourseCode called with invalid courseCode');
      return [];
    }

    this.logger.debug({ courseCode }, 'Finding course stats by course code');

    const result = (await this.findMany(
      (qb) => qb.where('course_code', '=', courseCode),
      {
        orderBy: { field: 'stat_date', direction: 'desc' }
      }
    )) as unknown as IcalinkCourseCheckinStats[];

    return result;
  }

  /**
   * 根据日期范围查找统计记录
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 统计记录列表
   */
  public async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<IcalinkCourseCheckinStats[]> {
    if (!startDate || !endDate) {
      this.logger.warn('findByDateRange called with invalid parameters');
      return [];
    }

    this.logger.debug(
      { startDate, endDate },
      'Finding course stats by date range'
    );

    const result = (await this.findMany(
      (qb) =>
        qb.where('stat_date', '>=', startDate).where('stat_date', '<=', endDate),
      {
        orderBy: { field: 'stat_date', direction: 'desc' }
      }
    )) as unknown as IcalinkCourseCheckinStats[];

    return result;
  }

  /**
   * 获取总记录数
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<number> {
    this.logger.debug('Getting total count of course checkin stats');
    const count = await this.count();
    this.logger.debug({ count }, 'Total count retrieved');
    return count;
  }

  /**
   * 查询 ID 大于指定值的记录（用于增量同步）
   * @param lastId 上次同步的最大 ID
   * @param limit 每批数量
   * @returns 统计记录列表
   */
  public async findByIdGreaterThan(
    lastId: number,
    limit: number
  ): Promise<IcalinkCourseCheckinStats[]> {
    if (lastId < 0 || limit <= 0) {
      this.logger.warn('findByIdGreaterThan called with invalid parameters', {
        lastId,
        limit
      });
      return [];
    }

    this.logger.debug(
      { lastId, limit },
      'Finding course stats with id greater than'
    );

    const result = (await this.findMany((qb) => qb.where('id', '>', lastId), {
      orderBy: { field: 'id', direction: 'asc' },
      limit
    })) as unknown as IcalinkCourseCheckinStats[];

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
    this.logger.debug('Getting max id of course checkin stats');

    try {
      const result = (await this.findMany(undefined, {
        orderBy: { field: 'id', direction: 'desc' },
        limit: 1
      })) as unknown as IcalinkCourseCheckinStats[];

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

