import type { Logger } from '@stratix/core';
import { BaseRepository, sql } from '@stratix/database';
import { differenceInDays, parseISO } from 'date-fns';
import type {
  ClassWeeklyAttendanceStats,
  CollegeWeeklyAttendanceStats,
  CourseWeeklyAttendanceStats
} from '../types/attendance-stats.types.js';
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
        qb
          .where('stat_date', '>=', startDate)
          .where('stat_date', '<=', endDate),
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

  /**
   * 获取当前教学周
   * @returns 当前教学周信息
   *
   * @remarks
   * - 从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   */
  public async getCurrentTeachingWeek(): Promise<{
    currentWeek: number;
    termStartDate: string;
  }> {
    this.logger.debug('Getting current teaching week');

    try {
      // 获取数据库连接
      const connection = await this.getQueryConnection();

      // 1. 从 icalink_system_configs 表获取学期开始日期
      const configQuery = sql<{ config_value: string }>`
        SELECT config_value
        FROM icalink_system_configs
        WHERE config_key = 'term.start_date'
        LIMIT 1
      `.compile(connection);

      const configResult = await connection.executeQuery(configQuery);

      // 如果没有找到学期开始日期配置，抛出错误
      if (configResult.rows.length === 0) {
        this.logger.error('Term start date config not found');
        throw new Error('未找到学期开始日期配置');
      }

      const row = configResult.rows[0] as { config_value: string };
      const termStartDate = parseISO(row.config_value);

      // 2. 使用 date-fns 计算当前教学周
      const now = new Date();
      const daysDiff = differenceInDays(now, termStartDate);
      const currentWeek = Math.floor(daysDiff / 7) + 1;

      // 限制当前周在 1-18 之间
      const limitedCurrentWeek = Math.max(1, Math.min(currentWeek, 18));

      this.logger.debug('Calculated current teaching week', {
        termStartDate: row.config_value,
        daysDiff,
        currentWeek: limitedCurrentWeek
      });

      return {
        currentWeek: limitedCurrentWeek,
        termStartDate: row.config_value
      };
    } catch (error: any) {
      this.logger.error('Failed to get current teaching week', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 查询学院周度签到统计数据（自动计算当前周并查询到上周）
   * @param courseUnitId 学院ID（必需）
   * @param semester 学期（可选）
   * @returns 周度统计数据数组
   *
   * @remarks
   * - 自动从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   * - 查询范围：第1周到上周（当前周 - 1）
   * - 使用单次 SQL 查询，按 teaching_week 分组聚合数据
   * - 只统计需要签到的课程（need_checkin = 1）
   */
  public async findCollegeWeeklyStats(
    courseUnitId: string,
    semester?: string
  ): Promise<CollegeWeeklyAttendanceStats[]> {
    if (!courseUnitId) {
      this.logger.warn(
        'findCollegeWeeklyStats called with invalid courseUnitId'
      );
      return [];
    }

    this.logger.debug('Finding college weekly stats', {
      courseUnitId,
      semester
    });

    try {
      // 获取数据库连接
      const connection = await this.getQueryConnection();

      // 1. 从 icalink_system_configs 表获取学期开始日期
      const configQuery = sql<{ config_value: string }>`
        SELECT config_value
        FROM icalink_system_configs
        WHERE config_key = 'term.start_date'
        LIMIT 1
      `.compile(connection);

      const configResult = await connection.executeQuery(configQuery);

      // 如果没有找到学期开始日期配置，抛出错误
      if (configResult.rows.length === 0) {
        this.logger.error('Term start date config not found');
        throw new Error('未找到学期开始日期配置');
      }

      const row = configResult.rows[0] as { config_value: string };
      const termStartDate = parseISO(row.config_value);

      // 2. 使用 date-fns 计算当前教学周
      const now = new Date();
      const daysDiff = differenceInDays(now, termStartDate);
      const currentWeek = Math.floor(daysDiff / 7) + 1;

      // 限制当前周在 1-18 之间
      const limitedCurrentWeek = Math.max(1, Math.min(currentWeek, 18));

      // 3. 计算查询截止周（上周）
      const endWeek = limitedCurrentWeek - 1;

      // 如果截止周 < 1，返回空数组
      if (endWeek < 1) {
        this.logger.info('Current week is too early, no data available', {
          currentWeek: limitedCurrentWeek,
          endWeek
        });
        return [];
      }

      this.logger.debug('Calculated teaching week range', {
        termStartDate: row.config_value,
        daysDiff,
        currentWeek: limitedCurrentWeek,
        queryEndWeek: endWeek
      });

      // 4. 构建并执行查询 SQL（按教学周分组聚合）
      const query = sql<CollegeWeeklyAttendanceStats>`
        SELECT
          teaching_week,
          SUM(total_should_attend) AS expected_attendance,
          SUM(absent_count) AS absent_count,
          SUM(truant_count) AS truant_count,
          SUM(leave_count) AS leave_count,
          SUM(present_count) AS present_count,
          CASE
            WHEN SUM(total_should_attend) = 0 THEN 0
            ELSE SUM(absent_count) / SUM(total_should_attend)
          END AS absence_rate,
          CASE
            WHEN SUM(total_should_attend) = 0 THEN 0
            ELSE SUM(truant_count) / SUM(total_should_attend)
          END AS truant_rate
        FROM icalink_course_checkin_stats
        WHERE course_unit_id = ${courseUnitId}
          AND need_checkin = 1
          ${semester ? sql`AND semester = ${semester}` : sql``}
          AND teaching_week >= 1
          AND teaching_week <= ${endWeek}
        GROUP BY teaching_week
        ORDER BY teaching_week ASC
      `.compile(connection);

      // 5. 执行查询
      const result = await connection.executeQuery(query);

      this.logger.debug(
        { courseUnitId, semester, count: result.rows.length },
        'College weekly stats query completed'
      );

      return result.rows as CollegeWeeklyAttendanceStats[];
    } catch (error: any) {
      this.logger.error('Failed to find college weekly stats', {
        error: error.message,
        stack: error.stack,
        courseUnitId,
        semester
      });
      throw error;
    }
  }

  /**
   * 查询教学班周度签到统计数据
   * - 从配置表获取学期开始日期
   * - 根据当前日期计算当前教学周
   * - 查询范围：第1周到上周（当前周 - 1）
   * - 使用单次 SQL 查询，按 teaching_week 分组聚合数据
   * - 只统计需要签到的课程（need_checkin = 1）
   */
  public async findClassWeeklyStats(
    teachingClassCode: string,
    semester?: string
  ): Promise<ClassWeeklyAttendanceStats[]> {
    if (!teachingClassCode) {
      this.logger.warn(
        'findClassWeeklyStats called with invalid teachingClassCode'
      );
      return [];
    }

    this.logger.debug('Finding class weekly stats', {
      teachingClassCode,
      semester
    });

    try {
      // 获取数据库连接
      const connection = await this.getQueryConnection();

      // 1. 从 icalink_system_configs 表获取学期开始日期
      const configQuery = sql<{ config_value: string }>`
        SELECT config_value
        FROM icalink_system_configs
        WHERE config_key = 'term.start_date'
        LIMIT 1
      `.compile(connection);

      const configResult = await connection.executeQuery(configQuery);

      // 如果没有找到学期开始日期配置，抛出错误
      if (configResult.rows.length === 0) {
        this.logger.error('Term start date config not found');
        throw new Error('未找到学期开始日期配置');
      }

      const row = configResult.rows[0] as { config_value: string };
      const termStartDate = parseISO(row.config_value);

      // 2. 使用 date-fns 计算当前教学周
      const now = new Date();
      const daysDiff = differenceInDays(now, termStartDate);
      const currentWeek = Math.floor(daysDiff / 7) + 1;

      // 限制当前周在 1-18 之间
      const limitedCurrentWeek = Math.max(1, Math.min(currentWeek, 18));

      // 3. 计算查询截止周（上周）
      const endWeek = limitedCurrentWeek - 1;

      // 如果截止周 < 1，返回空数组
      if (endWeek < 1) {
        this.logger.info('Current week is too early, no data available', {
          currentWeek: limitedCurrentWeek,
          endWeek
        });
        return [];
      }

      this.logger.debug('Calculated teaching week range', {
        termStartDate: row.config_value,
        daysDiff,
        currentWeek: limitedCurrentWeek,
        queryEndWeek: endWeek
      });

      // 4. 构建并执行查询 SQL（按教学周分组聚合）
      const query = sql<ClassWeeklyAttendanceStats>`
        SELECT
          teaching_week,
          SUM(total_should_attend) AS expected_attendance,
          SUM(absent_count) AS absent_count,
          SUM(truant_count) AS truant_count,
          SUM(leave_count) AS leave_count,
          SUM(present_count) AS present_count,
          CASE
            WHEN SUM(total_should_attend) = 0 THEN 0
            ELSE SUM(absent_count) / SUM(total_should_attend)
          END AS absence_rate,
          CASE
            WHEN SUM(total_should_attend) = 0 THEN 0
            ELSE SUM(truant_count) / SUM(total_should_attend)
          END AS truant_rate
        FROM icalink_course_checkin_stats
        WHERE teaching_class_code = ${teachingClassCode}
          AND need_checkin = 1
          ${semester ? sql`AND semester = ${semester}` : sql``}
          AND teaching_week >= 1
          AND teaching_week <= ${endWeek}
        GROUP BY teaching_week
        ORDER BY teaching_week ASC
      `.compile(connection);

      // 5. 执行查询
      const result = await connection.executeQuery(query);

      this.logger.debug(
        { teachingClassCode, semester, count: result.rows.length },
        'Class weekly stats query completed'
      );

      return result.rows as ClassWeeklyAttendanceStats[];
    } catch (error: any) {
      this.logger.error('Failed to find class weekly stats', {
        error: error.message,
        stack: error.stack,
        teachingClassCode,
        semester
      });
      throw error;
    }
  }

  /**
   * 查询课程周度签到统计数据
   * - 从配置表获取学期开始日期
   * - 根据当前日期计算当前教学周
   * - 查询范围：第1周到上周（当前周 - 1）
   * - 使用单次 SQL 查询，按 teaching_week 分组聚合数据
   * - 只统计需要签到的课程（need_checkin = 1）
   */
  public async findCourseWeeklyStats(
    courseCode: string,
    semester?: string
  ): Promise<CourseWeeklyAttendanceStats[]> {
    if (!courseCode) {
      this.logger.warn('findCourseWeeklyStats called with invalid courseCode');
      return [];
    }

    this.logger.debug('Finding course weekly stats', {
      courseCode,
      semester
    });

    try {
      // 获取数据库连接
      const connection = await this.getQueryConnection();

      // 1. 从 icalink_system_configs 表获取学期开始日期
      const configQuery = sql<{ config_value: string }>`
        SELECT config_value
        FROM icalink_system_configs
        WHERE config_key = 'term.start_date'
        LIMIT 1
      `.compile(connection);

      const configResult = await connection.executeQuery(configQuery);

      // 如果没有找到学期开始日期配置，抛出错误
      if (configResult.rows.length === 0) {
        this.logger.error('Term start date config not found');
        throw new Error('未找到学期开始日期配置');
      }

      const row = configResult.rows[0] as { config_value: string };
      const termStartDate = parseISO(row.config_value);

      // 2. 使用 date-fns 计算当前教学周
      const now = new Date();
      const daysDiff = differenceInDays(now, termStartDate);
      const currentWeek = Math.floor(daysDiff / 7) + 1;

      // 限制当前周在 1-18 之间
      const limitedCurrentWeek = Math.max(1, Math.min(currentWeek, 18));

      // 3. 计算查询截止周（上周）
      const endWeek = limitedCurrentWeek - 1;

      // 如果截止周 < 1，返回空数组
      if (endWeek < 1) {
        this.logger.info('Current week is too early, no data available', {
          currentWeek: limitedCurrentWeek,
          endWeek
        });
        return [];
      }

      this.logger.debug('Calculated teaching week range', {
        termStartDate: row.config_value,
        daysDiff,
        currentWeek: limitedCurrentWeek,
        queryEndWeek: endWeek
      });

      // 4. 构建并执行查询 SQL（按教学周分组聚合）
      const query = sql<CourseWeeklyAttendanceStats>`
        SELECT
          teaching_week,
          SUM(total_should_attend) AS expected_attendance,
          SUM(absent_count) AS absent_count,
          SUM(truant_count) AS truant_count,
          SUM(leave_count) AS leave_count,
          SUM(present_count) AS present_count,
          CASE
            WHEN SUM(total_should_attend) = 0 THEN 0
            ELSE SUM(absent_count) / SUM(total_should_attend)
          END AS absence_rate,
          CASE
            WHEN SUM(total_should_attend) = 0 THEN 0
            ELSE SUM(truant_count) / SUM(total_should_attend)
          END AS truant_rate
        FROM icalink_course_checkin_stats
        WHERE course_code = ${courseCode}
          AND need_checkin = 1
          ${semester ? sql`AND semester = ${semester}` : sql``}
          AND teaching_week >= 1
          AND teaching_week <= ${endWeek}
        GROUP BY teaching_week
        ORDER BY teaching_week ASC
      `.compile(connection);

      // 5. 执行查询
      const result = await connection.executeQuery(query);

      this.logger.debug(
        { courseCode, semester, count: result.rows.length },
        'Course weekly stats query completed'
      );

      return result.rows as CourseWeeklyAttendanceStats[];
    } catch (error: any) {
      this.logger.error('Failed to find course weekly stats', {
        error: error.message,
        stack: error.stack,
        courseCode,
        semester
      });
      throw error;
    }
  }
}
