import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { isSome } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  VStudentAbsenceRateSummary
} from '../types/database.js';

/**
 * 学生缺勤率汇总视图仓储实现
 * 负责查询学生级别的缺勤率统计数据（每个学生一条记录）
 */
export default class VStudentAbsenceRateSummaryRepository extends BaseRepository<
  IcalinkDatabase,
  'v_student_absence_rate_summary',
  VStudentAbsenceRateSummary
> {
  protected readonly tableName = 'v_student_absence_rate_summary';
  protected readonly primaryKey = 'student_id'; // 视图没有真正的主键，使用 student_id 作为逻辑主键

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ VStudentAbsenceRateSummaryRepository initialized');
  }

  /**
   * 分页查询学生缺勤率汇总数据
   * @param page 页码
   * @param pageSize 每页数量
   * @param exDeptId 外部部门ID（从组织架构树获取，用于提取学院ID和班级ID）
   * @param searchKeyword 搜索关键词（学生ID、学生姓名）
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   *
   * @remarks
   * 查询逻辑：
   * 1. 从 ex_dept_id 截取头两个字符作为学院ID
   * 2. ex_dept_id 去掉头两个字符后的剩余部分 = 年级 + 专业ID + 班级ID 的组合
   * 3. 查询条件：学院ID + 年级 + 专业ID + 班级ID 的组合字符串 = ex_dept_id 去掉头两个字符后的剩余部分
   */
  public async findWithPagination(
    page: number,
    pageSize: number,
    exDeptId?: string,
    searchKeyword?: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: VStudentAbsenceRateSummary[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;

    this.logger.debug('Finding student absence rate summary with pagination', {
      page,
      pageSize,
      exDeptId,
      searchKeyword,
      sortField,
      sortOrder
    });

    // 构建查询条件
    const buildQuery = (qb: any) => {
      let query = qb;

      // 如果提供了 ex_dept_id，则进行班级级别的筛选
      if (exDeptId && exDeptId.length > 2) {
        // 提取剩余部分（年级 + 专业ID + 班级ID）
        const remainingPart = exDeptId.substring(2);

        this.logger.debug('Extracted IDs from ex_dept_id', {
          exDeptId,
          remainingPart
        });

        // 使用 SQL 拼接字段进行匹配
        // CONCAT(grade, major_id, class_id) = remainingPart
        query = query.where((eb: any) =>
          eb(
            eb.fn('CONCAT', ['school_id', 'grade', 'major_id', 'class_id']),
            '=',
            remainingPart
          )
        );
      }

      // 搜索条件：学生ID、学生姓名
      if (searchKeyword) {
        query = query.where((eb: any) =>
          eb.or([
            eb('student_id', 'like', `%${searchKeyword}%`),
            eb('student_name', 'like', `%${searchKeyword}%`)
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
        : { field: 'overall_absence_rate', direction: 'desc' },
      limit: pageSize,
      offset
    })) as VStudentAbsenceRateSummary[];

    return { data, total };
  }

  /**
   * 根据班级ID查询所有学生缺勤率统计数据
   * @param classId 班级ID
   * @returns 学生缺勤率统计数据列表
   */
  public async findByClassId(
    classId: string
  ): Promise<VStudentAbsenceRateSummary[]> {
    if (!classId) {
      this.logger.warn('findByClassId called with invalid classId');
      return [];
    }

    this.logger.debug(
      { classId },
      'Finding student absence rate summary by class ID'
    );

    const data = (await this.findMany(
      (qb) => qb.where('class_id', '=', classId),
      {
        orderBy: { field: 'overall_absence_rate', direction: 'desc' }
      }
    )) as VStudentAbsenceRateSummary[];

    return data;
  }

  /**
   * 根据学生ID查询缺勤率统计数据
   * @param studentId 学生ID
   * @returns 学生缺勤率统计数据
   */
  public async findByStudentId(
    studentId: string
  ): Promise<VStudentAbsenceRateSummary | null> {
    if (!studentId) {
      this.logger.warn('findByStudentId called with invalid studentId');
      return null;
    }

    this.logger.debug(
      { studentId },
      'Finding student absence rate summary by student ID'
    );

    const result = await this.findOne((qb) =>
      qb.where('student_id', '=', studentId)
    );

    if (isSome(result)) {
      return result.value as VStudentAbsenceRateSummary;
    }

    return null;
  }

  /**
   * 根据学校ID查询所有学生缺勤率统计数据
   * @param schoolId 学校ID
   * @returns 学生缺勤率统计数据列表
   */
  public async findBySchoolId(
    schoolId: string
  ): Promise<VStudentAbsenceRateSummary[]> {
    if (!schoolId) {
      this.logger.warn('findBySchoolId called with invalid schoolId');
      return [];
    }

    this.logger.debug(
      { schoolId },
      'Finding student absence rate summary by school ID'
    );

    const data = (await this.findMany(
      (qb) => qb.where('school_id', '=', schoolId),
      {
        orderBy: { field: 'overall_absence_rate', direction: 'desc' }
      }
    )) as VStudentAbsenceRateSummary[];

    return data;
  }

  /**
   * 获取总记录数
   * @param classId 班级ID（可选）
   * @returns 总记录数
   */
  public async getTotalCount(classId?: string): Promise<number> {
    if (classId) {
      return await this.count((qb) => qb.where('class_id', '=', classId));
    }
    return await this.count();
  }

  /**
   * 获取高缺勤率学生列表（缺勤率超过指定阈值）
   * @param threshold 缺勤率阈值（0-1之间的小数）
   * @param limit 返回数量限制
   * @returns 高缺勤率学生列表
   */
  public async findHighAbsenceRateStudents(
    threshold: number = 0.3,
    limit: number = 100
  ): Promise<VStudentAbsenceRateSummary[]> {
    this.logger.debug(
      { threshold, limit },
      'Finding high absence rate students'
    );

    const data = (await this.findMany(
      (qb) => qb.where('overall_absence_rate', '>=', threshold),
      {
        orderBy: { field: 'overall_absence_rate', direction: 'desc' },
        limit
      }
    )) as VStudentAbsenceRateSummary[];

    return data;
  }
}
