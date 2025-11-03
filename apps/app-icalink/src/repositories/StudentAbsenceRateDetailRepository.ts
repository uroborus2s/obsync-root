import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkStudentAbsenceRateDetail
} from '../types/database.js';

/**
 * 学生缺勤率明细表仓储实现
 * 负责查询学生课程级别的缺勤率详细数据（每个学生每门课一条记录）
 */
export default class StudentAbsenceRateDetailRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_student_absence_rate_detail',
  IcalinkStudentAbsenceRateDetail
> {
  protected readonly tableName = 'icalink_student_absence_rate_detail';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ StudentAbsenceRateDetailRepository initialized');
  }

  /**
   * 根据学生ID查询该学生所有课程的缺勤详情
   * @param studentId 学生ID
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 学生课程缺勤详情列表
   */
  public async findByStudentId(
    studentId: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<IcalinkStudentAbsenceRateDetail[]> {
    if (!studentId) {
      this.logger.warn('findByStudentId called with invalid studentId');
      return [];
    }

    this.logger.debug(
      { studentId, sortField, sortOrder },
      'Finding student absence rate details by student ID'
    );

    const data = (await this.findMany(
      (qb) => qb.where('student_id', '=', studentId),
      {
        orderBy: sortField
          ? { field: sortField as any, direction: sortOrder || 'desc' }
          : { field: 'absence_rate', direction: 'desc' }
      }
    )) as IcalinkStudentAbsenceRateDetail[];

    return data;
  }

  /**
   * 根据学生ID和课程代码查询缺勤详情
   * @param studentId 学生ID
   * @param courseCode 课程代码
   * @returns 学生课程缺勤详情
   */
  public async findByStudentAndCourse(
    studentId: string,
    courseCode: string
  ): Promise<IcalinkStudentAbsenceRateDetail | null> {
    if (!studentId || !courseCode) {
      this.logger.warn('findByStudentAndCourse called with invalid parameters');
      return null;
    }

    this.logger.debug(
      { studentId, courseCode },
      'Finding student absence rate detail by student ID and course code'
    );

    const result = await this.findOne((qb) =>
      qb
        .where('student_id', '=', studentId)
        .where('course_code', '=', courseCode)
    );

    if (result && (result as any).isSome && (result as any).isSome()) {
      return (result as any).value as IcalinkStudentAbsenceRateDetail;
    }

    return result as unknown as IcalinkStudentAbsenceRateDetail | null;
  }

  /**
   * 根据班级ID查询所有学生的课程缺勤详情
   * @param classId 班级ID
   * @param page 页码
   * @param pageSize 每页数量
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   */
  public async findByClassId(
    classId: string,
    page: number = 1,
    pageSize: number = 20,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: IcalinkStudentAbsenceRateDetail[];
    total: number;
  }> {
    if (!classId) {
      this.logger.warn('findByClassId called with invalid classId');
      return { data: [], total: 0 };
    }

    const offset = (page - 1) * pageSize;

    this.logger.debug(
      { classId, page, pageSize, sortField, sortOrder },
      'Finding student absence rate details by class ID'
    );

    const buildQuery = (qb: any) => qb.where('class_id', '=', classId);

    // 查询总数
    const total = await this.count(buildQuery);

    // 查询数据
    const data = (await this.findMany(buildQuery, {
      orderBy: sortField
        ? { field: sortField as any, direction: sortOrder || 'desc' }
        : { field: 'absence_rate', direction: 'desc' },
      limit: pageSize,
      offset
    })) as IcalinkStudentAbsenceRateDetail[];

    return { data, total };
  }

  /**
   * 根据学院ID查询所有学生的课程缺勤详情
   * @param schoolId 学院ID
   * @param limit 返回数量限制
   * @returns 学生课程缺勤详情列表
   */
  public async findBySchoolId(
    schoolId: string,
    limit: number = 100
  ): Promise<IcalinkStudentAbsenceRateDetail[]> {
    if (!schoolId) {
      this.logger.warn('findBySchoolId called with invalid schoolId');
      return [];
    }

    this.logger.debug(
      { schoolId, limit },
      'Finding student absence rate details by school ID'
    );

    const data = (await this.findMany(
      (qb) => qb.where('school_id', '=', schoolId),
      {
        orderBy: { field: 'absence_rate', direction: 'desc' },
        limit
      }
    )) as IcalinkStudentAbsenceRateDetail[];

    return data;
  }

  /**
   * 获取高缺勤率课程列表（缺勤率超过指定阈值）
   * @param threshold 缺勤率阈值（0-1之间的小数）
   * @param limit 返回数量限制
   * @returns 高缺勤率课程列表
   */
  public async findHighAbsenceRateCourses(
    threshold: number = 0.3,
    limit: number = 100
  ): Promise<IcalinkStudentAbsenceRateDetail[]> {
    this.logger.debug(
      { threshold, limit },
      'Finding high absence rate courses'
    );

    const data = (await this.findMany(
      (qb) => qb.where('absence_rate', '>=', threshold),
      {
        orderBy: { field: 'absence_rate', direction: 'desc' },
        limit
      }
    )) as IcalinkStudentAbsenceRateDetail[];

    return data;
  }
}
