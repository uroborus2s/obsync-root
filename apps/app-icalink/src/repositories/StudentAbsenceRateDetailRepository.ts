import type { Logger } from '@stratix/core';
import { BaseRepository, sql } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkStudentAbsenceRateDetail,
  VStudentAbsenceRateSummary
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

  /**
   * 根据课程代码查询所有学生的缺勤详情
   * @param courseCode 课程代码
   * @param sortField 排序字段（默认：absence_rate）
   * @param sortOrder 排序方向（默认：desc）
   * @returns 学生课程缺勤详情列表
   */
  public async findByCourseCode(
    courseCode: string,
    sortField: string = 'absence_rate',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<IcalinkStudentAbsenceRateDetail[]> {
    if (!courseCode) {
      this.logger.warn('findByCourseCode called with invalid courseCode');
      return [];
    }

    this.logger.debug(
      { courseCode, sortField, sortOrder },
      'Finding student absence rate details by course code'
    );

    const data = (await this.findMany(
      (qb) => qb.where('course_code', '=', courseCode),
      {
        orderBy: { field: sortField as any, direction: sortOrder }
      }
    )) as IcalinkStudentAbsenceRateDetail[];

    this.logger.debug(
      { courseCode, count: data.length },
      'Found student absence rate details'
    );

    return data;
  }

  /**
   * 通用的学生缺勤统计查询方法（按学生维度聚合）
   * 替代原视图 v_student_absence_rate_summary 的查询逻辑
   *
   * @param options 查询选项
   * @returns 分页结果，包含学生缺勤统计数据
   *
   * @remarks
   * 该方法直接查询明细表 icalink_student_absence_rate_detail，
   * 在查询时进行实时聚合，避免视图全表扫描的性能问题。
   * 聚合逻辑与原视图定义完全一致。
   */
  public async findStudentSummary(options: {
    // 查询条件（所有字段都是可选的）
    studentId?: string; // 学号（精确匹配）
    studentName?: string; // 学生姓名（模糊匹配）
    classId?: string; // 班级ID（精确匹配）
    className?: string; // 班级名称（模糊匹配）
    schoolId?: string; // 学院ID（精确匹配）
    schoolName?: string; // 学院名称（模糊匹配）
    majorId?: string; // 专业ID（精确匹配）
    majorName?: string; // 专业名称（模糊匹配）
    grade?: string; // 年级（精确匹配）
    semester?: string; // 学期（精确匹配）
    minAbsenceRate?: number; // 最低缺勤率阈值

    // 分页参数
    page?: number; // 页码（默认1）
    pageSize?: number; // 每页数量（默认1000）

    // 排序参数
    sortField?: string; // 排序字段（默认 'overall_absence_rate'）
    sortOrder?: 'asc' | 'desc'; // 排序方向（默认 'desc'）
  }): Promise<{
    data: VStudentAbsenceRateSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      studentId,
      studentName,
      classId,
      className,
      schoolId,
      schoolName,
      majorId,
      majorName,
      grade,
      semester,
      minAbsenceRate,
      page = 1,
      pageSize = 1000,
      sortField = 'overall_absence_rate',
      sortOrder = 'desc'
    } = options;

    this.logger.debug('Finding student summary with options', options);

    // 构建 WHERE 条件
    const conditions: string[] = [];
    const params: any[] = [];

    if (studentId) {
      conditions.push('student_id = ?');
      params.push(studentId);
    }

    if (studentName) {
      conditions.push('student_name LIKE ?');
      params.push(`%${studentName}%`);
    }

    if (classId) {
      conditions.push('class_id = ?');
      params.push(classId);
    }

    if (className) {
      conditions.push('class_name LIKE ?');
      params.push(`%${className}%`);
    }

    if (schoolId) {
      conditions.push('school_id = ?');
      params.push(schoolId);
    }

    if (schoolName) {
      conditions.push('school_name LIKE ?');
      params.push(`%${schoolName}%`);
    }

    if (majorId) {
      conditions.push('major_id = ?');
      params.push(majorId);
    }

    if (majorName) {
      conditions.push('major_name LIKE ?');
      params.push(`%${majorName}%`);
    }

    if (grade) {
      conditions.push('grade = ?');
      params.push(grade);
    }

    if (semester) {
      conditions.push('semester = ?');
      params.push(semester);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // HAVING 子句（用于过滤聚合后的结果）
    const havingClause =
      minAbsenceRate !== undefined ? 'HAVING overall_absence_rate >= ?' : '';

    if (minAbsenceRate !== undefined) {
      params.push(minAbsenceRate);
    }

    // 分页参数
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    // 获取数据库连接
    const connection = await this.getQueryConnection();

    // 构建数据查询 SQL（与视图定义逻辑完全一致）
    const dataQuery = sql<VStudentAbsenceRateSummary>`
      SELECT
          student_id,
          MAX(student_name) AS student_name,
          semester,
          MAX(school_name) AS school_name,
          MAX(school_id) AS school_id,
          MAX(class_name) AS class_name,
          MAX(class_id) AS class_id,
          MAX(major_name) AS major_name,
          MAX(major_id) AS major_id,
          MAX(grade) AS grade,
          MAX(gender) AS gender,
          MAX(people) AS people,
          COUNT(DISTINCT course_code) AS total_courses,
          SUM(total_sessions) AS total_sessions,
          SUM(completed_sessions) AS completed_sessions,
          SUM(absent_count) AS total_absent_count,
          SUM(leave_count) AS total_leave_count,
          SUM(truant_count) AS total_truant_count,
          CASE
              WHEN SUM(completed_sessions) > 0 THEN
                  (SUM(absent_count) + SUM(truant_count)) / SUM(completed_sessions)
              ELSE 0
          END AS overall_absence_rate,
          CASE
              WHEN SUM(completed_sessions) > 0 THEN
                  SUM(truant_count) / SUM(completed_sessions)
              ELSE 0
          END AS overall_truant_rate,
          CASE
              WHEN SUM(completed_sessions) > 0 THEN
                  SUM(leave_count) / SUM(completed_sessions)
              ELSE 0
          END AS overall_leave_rate,
          AVG(absence_rate) AS avg_absence_rate,
          AVG(truant_rate) AS avg_truant_rate,
          AVG(leave_rate) AS avg_leave_rate,
          MAX(absence_rate) AS max_absence_rate,
          MAX(truant_rate) AS max_truant_rate,
          MAX(leave_rate) AS max_leave_rate,
          MAX(updated_at) AS last_updated_at
      FROM icalink_student_absence_rate_detail
      ${sql.raw(whereClause)}
      GROUP BY student_id, semester
      ${sql.raw(havingClause)}
      ORDER BY ${sql.raw(sortField)} ${sql.raw(sortOrder)}
      LIMIT ? OFFSET ?
    `.compile(connection);

    // 构建计数查询 SQL
    const countQuery = sql<{ count: number }>`
      SELECT COUNT(*) as count
      FROM (
          SELECT student_id, semester
          FROM icalink_student_absence_rate_detail
          ${sql.raw(whereClause)}
          GROUP BY student_id, semester
          ${sql.raw(havingClause)}
      ) AS subquery
    `.compile(connection);

    // 执行查询
    const [dataResult, countResult] = await Promise.all([
      connection.executeQuery({
        ...dataQuery,
        parameters: params
      }),
      connection.executeQuery({
        ...countQuery,
        parameters: params.slice(0, -2) // 移除 LIMIT 和 OFFSET 参数
      })
    ]);

    const data = dataResult.rows as VStudentAbsenceRateSummary[];
    const total = (countResult.rows[0] as any)?.count || 0;

    this.logger.debug(
      { total, page, pageSize, dataCount: data.length },
      'Found student summary'
    );

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 按班级ID查询学生缺勤统计（便捷方法）
   * @param classId 班级ID
   * @param searchKeyword 搜索关键词（学生姓名模糊匹配）
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findStudentSummaryByClassId(
    classId: string,
    searchKeyword?: string,
    page: number = 1,
    pageSize: number = 1000
  ): Promise<{
    data: VStudentAbsenceRateSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.findStudentSummary({
      classId,
      studentName: searchKeyword,
      page,
      pageSize,
      sortField: 'student_name',
      sortOrder: 'asc'
    });
  }

  /**
   * 按学号查询单个学生的缺勤统计（便捷方法）
   * @param studentId 学号
   * @returns 学生缺勤统计数据，如果不存在则返回 null
   */
  public async findStudentSummaryByStudentId(
    studentId: string
  ): Promise<VStudentAbsenceRateSummary | null> {
    const result = await this.findStudentSummary({
      studentId,
      page: 1,
      pageSize: 1
    });
    return result.data.length > 0 ? result.data[0] : null;
  }

  /**
   * 按学院ID查询学生缺勤统计（便捷方法）
   * @param schoolId 学院ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findStudentSummaryBySchoolId(
    schoolId: string,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{
    data: VStudentAbsenceRateSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.findStudentSummary({
      schoolId,
      page,
      pageSize,
      sortField: 'overall_absence_rate',
      sortOrder: 'desc'
    });
  }

  /**
   * 查询高缺勤率学生（便捷方法）
   * @param threshold 缺勤率阈值（0-1之间的小数，默认0.3即30%）
   * @param limit 返回数量限制
   * @returns 高缺勤率学生列表
   */
  public async findHighAbsenceRateStudentsSummary(
    threshold: number = 0.3,
    limit: number = 100
  ): Promise<VStudentAbsenceRateSummary[]> {
    const result = await this.findStudentSummary({
      minAbsenceRate: threshold,
      page: 1,
      pageSize: limit,
      sortField: 'overall_absence_rate',
      sortOrder: 'desc'
    });
    return result.data;
  }

  /**
   * 支持拆分参数的分页查询（便捷方法，兼容现有 Controller 调用）
   * @param collegeId 学院ID（4位）
   * @param grade 年级（4位）
   * @param majorId 专业ID（6位）
   * @param classId 班级ID（可变长度）
   * @param searchKeyword 搜索关键词（学生姓名模糊匹配）
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findStudentSummaryWithPagination(
    collegeId?: string,
    grade?: string,
    majorId?: string,
    classId?: string,
    searchKeyword?: string,
    sortField: string = 'overall_absence_rate',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    pageSize: number = 1000
  ): Promise<{
    data: VStudentAbsenceRateSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    // 构建查询选项
    const options: any = {
      studentName: searchKeyword,
      page,
      pageSize,
      sortField,
      sortOrder
    };

    // 添加可选的筛选条件
    if (collegeId) {
      options.schoolId = collegeId;
    }
    if (grade) {
      options.grade = grade;
    }
    if (majorId) {
      options.majorId = majorId;
    }
    if (classId) {
      options.classId = classId;
    }

    return this.findStudentSummary(options);
  }
}
