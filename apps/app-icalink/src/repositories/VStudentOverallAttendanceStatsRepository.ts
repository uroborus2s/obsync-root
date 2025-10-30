import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { fromNullable, Maybe } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  VStudentOverallAttendanceStats
} from '../types/database.js';

/**
 * 学生历史统计视图仓储实现
 * 负责查询学生的整体出勤统计数据
 */
export default class VStudentOverallAttendanceStatsRepository extends BaseRepository<
  IcalinkDatabase,
  'v_student_overall_attendance_stats',
  VStudentOverallAttendanceStats
> {
  protected readonly tableName = 'v_student_overall_attendance_stats';
  protected readonly primaryKey = 'student_id'; // 视图没有真正的主键，使用 student_id 作为逻辑主键

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ VStudentOverallAttendanceStatsRepository initialized');
  }

  /**
   * 分页查询学生统计数据
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键词（学号、姓名、学院名称、班级名称）
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   */
  public async findWithPagination(params: {
    page: number;
    pageSize: number;
    searchKeyword?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: VStudentOverallAttendanceStats[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page, pageSize, searchKeyword, sortField, sortOrder } = params;

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
      { page, pageSize, offset, searchKeyword, sortField, sortOrder },
      'Finding student stats with pagination'
    );

    // 构建查询条件
    const buildQuery = (qb: any) => {
      let query = qb;

      // 搜索条件：学号、姓名、学院名称、班级名称
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = `%${searchKeyword.trim()}%`;
        query = query.where((eb: any) =>
          eb.or([
            eb('student_id', 'like', keyword),
            eb('name', 'like', keyword),
            eb('school_name', 'like', keyword),
            eb('class_name', 'like', keyword)
          ])
        );
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
    })) as VStudentOverallAttendanceStats[];

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
   * 根据学生ID查询统计数据
   * @param studentId 学生ID
   * @returns 学生统计数据
   */
  public async findByStudentId(
    studentId: string
  ): Promise<Maybe<VStudentOverallAttendanceStats | null>> {
    if (!studentId) {
      this.logger.warn('findByStudentId called with invalid studentId');
      return fromNullable<VStudentOverallAttendanceStats>(undefined);
    }

    this.logger.debug({ studentId }, 'Finding student stats by student ID');

    const result = (await this.findOne((qb) =>
      qb.where('student_id', '=', studentId)
    )) as unknown as Maybe<VStudentOverallAttendanceStats>;

    return result;
  }

  /**
   * 根据班级名称查询统计数据
   * @param className 班级名称
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findByClassName(
    className: string,
    page: number,
    pageSize: number
  ): Promise<{
    data: VStudentOverallAttendanceStats[];
    total: number;
  }> {
    if (!className) {
      this.logger.warn('findByClassName called with invalid className');
      return { data: [], total: 0 };
    }

    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { className, page, pageSize },
      'Finding student stats by class name'
    );

    const buildQuery = (qb: any) => qb.where('class_name', '=', className);

    const total = await this.count(buildQuery);
    const data = (await this.findMany(buildQuery, {
      orderBy: { field: 'absence_rate', direction: 'desc' },
      limit: pageSize,
      offset
    })) as VStudentOverallAttendanceStats[];

    return { data, total };
  }

  /**
   * 根据学院名称查询统计数据
   * @param schoolName 学院名称
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findBySchoolName(
    schoolName: string,
    page: number,
    pageSize: number
  ): Promise<{
    data: VStudentOverallAttendanceStats[];
    total: number;
  }> {
    if (!schoolName) {
      this.logger.warn('findBySchoolName called with invalid schoolName');
      return { data: [], total: 0 };
    }

    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { schoolName, page, pageSize },
      'Finding student stats by school name'
    );

    const buildQuery = (qb: any) => qb.where('school_name', '=', schoolName);

    const total = await this.count(buildQuery);
    const data = (await this.findMany(buildQuery, {
      orderBy: { field: 'absence_rate', direction: 'desc' },
      limit: pageSize,
      offset
    })) as VStudentOverallAttendanceStats[];

    return { data, total };
  }

  /**
   * 查询缺勤率高于指定值的学生
   * @param minAbsenceRate 最小缺勤率
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findByAbsenceRateGreaterThan(
    minAbsenceRate: number,
    page: number,
    pageSize: number
  ): Promise<{
    data: VStudentOverallAttendanceStats[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { minAbsenceRate, page, pageSize },
      'Finding students with high absence rate'
    );

    const buildQuery = (qb: any) =>
      qb.where('absence_rate', '>=', minAbsenceRate);

    const total = await this.count(buildQuery);
    const data = (await this.findMany(buildQuery, {
      orderBy: { field: 'absence_rate', direction: 'desc' },
      limit: pageSize,
      offset
    })) as VStudentOverallAttendanceStats[];

    return { data, total };
  }

  /**
   * 获取总记录数
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<number> {
    this.logger.debug('Getting total count of student stats');
    const count = await this.count();
    this.logger.debug({ count }, 'Total count retrieved');
    return count;
  }
}
