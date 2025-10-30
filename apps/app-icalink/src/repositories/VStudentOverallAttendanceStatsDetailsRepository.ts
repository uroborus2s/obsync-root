import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  VStudentOverallAttendanceStatsDetails
} from '../types/database.js';

/**
 * 学生历史统计详情视图仓储实现
 * 负责查询学生在每门课程的详细出勤统计数据
 */
export default class VStudentOverallAttendanceStatsDetailsRepository extends BaseRepository<
  IcalinkDatabase,
  'v_student_overall_attendance_stats_details',
  VStudentOverallAttendanceStatsDetails
> {
  protected readonly tableName = 'v_student_overall_attendance_stats_details';
  protected readonly primaryKey = 'student_id'; // 视图没有真正的主键，使用 student_id 作为逻辑主键

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info(
      '✅ VStudentOverallAttendanceStatsDetailsRepository initialized'
    );
  }

  /**
   * 分页查询学生课程统计详情数据
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键词（学号、姓名、课程代码、课程名称）
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
    data: VStudentOverallAttendanceStatsDetails[];
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
      { page, pageSize, offset, searchKeyword, teachingWeek, sortField, sortOrder },
      'Finding student course stats details with pagination'
    );

    // 构建查询条件
    const buildQuery = (qb: any) => {
      let query = qb;

      // 搜索条件：学号、姓名、课程代码、课程名称
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = `%${searchKeyword.trim()}%`;
        query = query.where((eb: any) =>
          eb.or([
            eb('student_id', 'like', keyword),
            eb('name', 'like', keyword),
            eb('course_code', 'like', keyword),
            eb('course_name', 'like', keyword)
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
        field: sortField || 'absence_rate',
        direction: sortOrder || 'desc'
      },
      limit: pageSize,
      offset
    })) as VStudentOverallAttendanceStatsDetails[];

    const totalPages = Math.ceil(total / pageSize);

    this.logger.debug(
      { total, dataCount: data.length, totalPages },
      'Query completed'
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
   * 根据学生ID查询所有课程统计详情
   * @param studentId 学生ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findByStudentId(
    studentId: string,
    page: number,
    pageSize: number
  ): Promise<{
    data: VStudentOverallAttendanceStatsDetails[];
    total: number;
  }> {
    if (!studentId) {
      this.logger.warn('findByStudentId called with invalid studentId');
      return { data: [], total: 0 };
    }

    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { studentId, page, pageSize },
      'Finding student course stats by student ID'
    );

    const buildQuery = (qb: any) => qb.where('student_id', '=', studentId);

    const total = await this.count(buildQuery);
    const data = (await this.findMany(buildQuery, {
      orderBy: { field: 'absence_rate', direction: 'desc' },
      limit: pageSize,
      offset
    })) as VStudentOverallAttendanceStatsDetails[];

    return { data, total };
  }

  /**
   * 根据课程代码查询所有学生统计详情
   * @param courseCode 课程代码
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findByCourseCode(
    courseCode: string,
    page: number,
    pageSize: number
  ): Promise<{
    data: VStudentOverallAttendanceStatsDetails[];
    total: number;
  }> {
    if (!courseCode) {
      this.logger.warn('findByCourseCode called with invalid courseCode');
      return { data: [], total: 0 };
    }

    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { courseCode, page, pageSize },
      'Finding student course stats by course code'
    );

    const buildQuery = (qb: any) => qb.where('course_code', '=', courseCode);

    const total = await this.count(buildQuery);
    const data = (await this.findMany(buildQuery, {
      orderBy: { field: 'absence_rate', direction: 'desc' },
      limit: pageSize,
      offset
    })) as VStudentOverallAttendanceStatsDetails[];

    return { data, total };
  }

  /**
   * 根据教学周查询统计详情
   * @param teachingWeek 教学周
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findByTeachingWeek(
    teachingWeek: number,
    page: number,
    pageSize: number
  ): Promise<{
    data: VStudentOverallAttendanceStatsDetails[];
    total: number;
  }> {
    if (!teachingWeek || teachingWeek <= 0) {
      this.logger.warn('findByTeachingWeek called with invalid teachingWeek');
      return { data: [], total: 0 };
    }

    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { teachingWeek, page, pageSize },
      'Finding student course stats by teaching week'
    );

    const buildQuery = (qb: any) =>
      qb.where('teaching_week', '=', teachingWeek);

    const total = await this.count(buildQuery);
    const data = (await this.findMany(buildQuery, {
      orderBy: { field: 'absence_rate', direction: 'desc' },
      limit: pageSize,
      offset
    })) as VStudentOverallAttendanceStatsDetails[];

    return { data, total };
  }

  /**
   * 获取总记录数
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<number> {
    this.logger.debug('Getting total count of student course stats details');
    const count = await this.count();
    this.logger.debug({ count }, 'Total count retrieved');
    return count;
  }
}

