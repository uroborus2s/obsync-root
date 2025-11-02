import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkTeachingClass
} from '../types/database.js';

/**
 * 教学班表仓储实现
 * 负责查询教学班的学生和课程信息
 * 数据源：icalink_teaching_class 表
 */
export default class VTeachingClassRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_teaching_class',
  IcalinkTeachingClass
> {
  protected readonly tableName = 'icalink_teaching_class';
  protected readonly primaryKey = 'id'; // 使用自增id作为主键

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info(
      '✅ VTeachingClassRepository initialized (using icalink_teaching_class table)'
    );
  }

  /**
   * 分页查询教学班数据（关键字搜索版）
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键字（支持学号、姓名、学院、专业、班级、年级、课程编码、课程名称、开课单位）
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
    data: IcalinkTeachingClass[];
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
      {
        page,
        pageSize,
        offset,
        searchKeyword,
        sortField,
        sortOrder
      },
      'Finding teaching class with pagination (keyword search)'
    );

    // 构建查询条件：关键字搜索所有支持的字段
    const buildQuery = (qb: any) => {
      let query = qb;

      // 关键字搜索：支持学号、姓名、学院、专业、班级、年级、课程编码、课程名称、开课单位
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = searchKeyword.trim();
        query = query.where((eb: any) =>
          eb.or([
            eb('student_id', 'like', `%${keyword}%`),
            eb('student_name', 'like', `%${keyword}%`),
            eb('school_name', 'like', `%${keyword}%`),
            eb('major_name', 'like', `%${keyword}%`),
            eb('class_name', 'like', `%${keyword}%`),
            eb('grade', 'like', `%${keyword}%`),
            eb('course_code', 'like', `%${keyword}%`),
            eb('course_name', 'like', `%${keyword}%`),
            eb('course_unit', 'like', `%${keyword}%`)
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
        field: sortField || 'id',
        direction: sortOrder || 'asc'
      },
      limit: pageSize,
      offset
    })) as IcalinkTeachingClass[];

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
   * 根据学生ID查询教学班信息
   * @param studentId 学生ID
   * @returns 教学班记录列表
   */
  public async findByStudentId(
    studentId: string
  ): Promise<IcalinkTeachingClass[]> {
    if (!studentId) {
      this.logger.warn('findByStudentId called with invalid studentId');
      return [];
    }

    this.logger.debug({ studentId }, 'Finding teaching class by student ID');

    const result = (await this.findMany((qb) =>
      qb.where('student_id', '=', studentId)
    )) as IcalinkTeachingClass[];

    return result;
  }

  /**
   * 根据课程代码查询教学班信息
   * @param courseCode 课程代码
   * @returns 教学班记录列表
   */
  public async findByCourseCode(
    courseCode: string
  ): Promise<IcalinkTeachingClass[]> {
    if (!courseCode) {
      this.logger.warn('findByCourseCode called with invalid courseCode');
      return [];
    }

    this.logger.debug({ courseCode }, 'Finding teaching class by course code');

    const result = (await this.findMany((qb) =>
      qb.where('course_code', '=', courseCode)
    )) as IcalinkTeachingClass[];

    return result;
  }

  /**
   * 获取总记录数
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<number> {
    this.logger.debug('Getting total count of teaching class');
    const count = await this.count();
    this.logger.debug({ count }, 'Total count retrieved');
    return count;
  }
}
