import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { isSome, type Maybe } from '@stratix/utils/functional';
import type {
  IcalinkAbsentStudentRelation,
  IcalinkDatabase
} from '../types/database.js';

/**
 * 缺勤学生关系仓储实现
 * 负责查询历史课程的最终缺勤状态
 */
export default class AbsentStudentRelationRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_absent_student_relations',
  IcalinkAbsentStudentRelation
> {
  protected readonly tableName = 'icalink_absent_student_relations';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AbsentStudentRelationRepository initialized');
  }

  /**
   * 根据课程ID和学生ID查找缺勤记录
   * @param courseId 课程ID（icasync_attendance_courses.id）
   * @param studentId 学生ID
   * @returns 缺勤记录（可能不存在）
   */
  public async findByCourseAndStudent(
    courseId: number,
    studentId: string
  ): Promise<IcalinkAbsentStudentRelation | undefined> {
    if (!courseId || !studentId) {
      this.logger.warn('findByCourseAndStudent called with invalid parameters');
      return undefined;
    }

    this.logger.debug(
      { courseId, studentId },
      'Finding absent relation by course and student'
    );

    const result = (await this.findOne((qb) =>
      qb.where('course_id', '=', courseId).where('student_id', '=', studentId)
    )) as unknown as Maybe<IcalinkAbsentStudentRelation>;

    return isSome(result) ? result.value : undefined;
  }

  /**
   * 根据学生ID和学期查找所有缺勤记录
   * @param studentId 学生ID
   * @param semester 学期
   * @returns 缺勤记录列表
   */
  public async findByStudentAndSemester(
    studentId: string,
    semester: string
  ): Promise<IcalinkAbsentStudentRelation[]> {
    if (!studentId || !semester) {
      this.logger.warn(
        'findByStudentAndSemester called with invalid parameters'
      );
      return [];
    }

    this.logger.debug(
      { studentId, semester },
      'Finding absent relations by student and semester'
    );

    const result = (await this.findMany(
      (qb) =>
        qb.where('student_id', '=', studentId).where('semester', '=', semester),
      {
        orderBy: { field: 'stat_date', direction: 'desc' }
      }
    )) as unknown as IcalinkAbsentStudentRelation[];

    return result;
  }

  /**
   * 根据课程ID查找所有缺勤记录
   * @param courseId 课程ID
   * @returns 缺勤记录列表
   */
  public async findByCourse(
    courseId: number
  ): Promise<IcalinkAbsentStudentRelation[]> {
    if (!courseId) {
      this.logger.warn('findByCourse called with invalid courseId');
      return [];
    }

    this.logger.debug({ courseId }, 'Finding absent relations by course');

    const result = (await this.findMany(
      (qb) => qb.where('course_id', '=', courseId),
      {
        orderBy: { field: 'student_id', direction: 'asc' }
      }
    )) as unknown as IcalinkAbsentStudentRelation[];

    return result;
  }

  /**
   * 根据日期范围查找缺勤记录
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param studentId 学生ID（可选）
   * @returns 缺勤记录列表
   */
  public async findByDateRange(
    startDate: Date,
    endDate: Date,
    studentId?: string
  ): Promise<IcalinkAbsentStudentRelation[]> {
    if (!startDate || !endDate) {
      this.logger.warn('findByDateRange called with invalid parameters');
      return [];
    }

    this.logger.debug(
      { startDate, endDate, studentId },
      'Finding absent relations by date range'
    );

    const result = (await this.findMany(
      (qb) => {
        let query = qb
          .where('stat_date', '>=', startDate)
          .where('stat_date', '<=', endDate);

        if (studentId) {
          query = query.where('student_id', '=', studentId);
        }

        return query;
      },
      {
        orderBy: { field: 'stat_date', direction: 'desc' }
      }
    )) as unknown as IcalinkAbsentStudentRelation[];

    return result;
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
   * 分页查询缺勤记录（增强版）
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键词（学生姓名、学生ID、课程名称、课程代码、缺勤类型）
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
    data: IcalinkAbsentStudentRelation[];
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
      'Finding absent relations with pagination'
    );

    // 构建查询条件
    const buildQuery = (qb: any) => {
      let query = qb;

      // 搜索条件：学生姓名、学生ID、课程名称、课程代码、缺勤类型
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = `%${searchKeyword.trim()}%`;
        query = query.where((eb: any) =>
          eb.or([
            eb('student_name', 'like', keyword),
            eb('student_id', 'like', keyword),
            eb('course_name', 'like', keyword),
            eb('course_code', 'like', keyword),
            eb('absence_type', 'like', keyword)
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
    })) as unknown as IcalinkAbsentStudentRelation[];

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
