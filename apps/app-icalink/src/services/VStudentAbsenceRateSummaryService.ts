import type { Logger } from '@stratix/core';
import type StudentAbsenceRateDetailRepository from '../repositories/StudentAbsenceRateDetailRepository.js';
import type { VStudentAbsenceRateSummary } from '../types/database.js';

/**
 * 学生缺勤率汇总服务接口
 */
export interface IVStudentAbsenceRateSummaryService {
  /**
   * 分页查询学生缺勤率汇总数据
   * @param page 页码
   * @param pageSize 每页数量
   * @param collegeId 学院ID（4位）
   * @param grade 年级（4位）
   * @param majorId 专业ID（6位）
   * @param classId 班级ID（可变长度）
   * @param searchKeyword 搜索关键词
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   */
  findWithPagination(
    page: number,
    pageSize: number,
    collegeId?: string,
    grade?: string,
    majorId?: string,
    classId?: string,
    searchKeyword?: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: VStudentAbsenceRateSummary[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;

  /**
   * 根据班级ID查询所有学生缺勤率统计数据
   * @param classId 班级ID
   * @param searchKeyword 搜索关键词（学生ID或学生姓名）
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   */
  findByClassId(
    classId: string,
    searchKeyword?: string,
    page?: number,
    pageSize?: number
  ): Promise<VStudentAbsenceRateSummary[]>;

  /**
   * 根据学生ID查询缺勤率统计数据
   */
  findByStudentId(
    studentId: string
  ): Promise<VStudentAbsenceRateSummary | null>;

  /**
   * 获取高缺勤率学生列表
   */
  findHighAbsenceRateStudents(
    threshold?: number,
    limit?: number
  ): Promise<VStudentAbsenceRateSummary[]>;
}

/**
 * 学生缺勤率汇总服务实现
 * 负责学生缺勤率统计数据的业务逻辑处理
 */
export default class VStudentAbsenceRateSummaryService
  implements IVStudentAbsenceRateSummaryService
{
  constructor(
    private readonly logger: Logger,
    private readonly studentAbsenceRateDetailRepository: StudentAbsenceRateDetailRepository
  ) {
    this.logger.info('✅ VStudentAbsenceRateSummaryService initialized');
  }

  /**
   * 分页查询学生缺勤率汇总数据
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param collegeId 学院ID（4位）
   * @param grade 年级（4位）
   * @param majorId 专业ID（6位）
   * @param classId 班级ID（可变长度）
   * @param searchKeyword 搜索关键词
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   *
   * @remarks
   * 前端将 ex_dept_id 拆分后传递各个参数，后端进行组合查询
   */
  public async findWithPagination(
    page: number = 1,
    pageSize: number = 20,
    collegeId?: string,
    grade?: string,
    majorId?: string,
    classId?: string,
    searchKeyword?: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: VStudentAbsenceRateSummary[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    // 参数验证
    if (page < 1) {
      this.logger.warn('Invalid page number, using default value 1');
      page = 1;
    }

    if (pageSize < 1 || pageSize > 100) {
      this.logger.warn('Invalid page size, using default value 20');
      pageSize = 20;
    }

    this.logger.debug('Finding student absence rate summary with pagination', {
      page,
      pageSize,
      collegeId,
      grade,
      majorId,
      classId,
      searchKeyword,
      sortField,
      sortOrder
    });

    try {
      const result =
        await this.studentAbsenceRateDetailRepository.findStudentSummaryWithPagination(
          collegeId,
          grade,
          majorId,
          classId,
          searchKeyword,
          sortField,
          sortOrder,
          page,
          pageSize
        );

      const totalPages = Math.ceil(result.total / pageSize);

      return {
        data: result.data,
        total: result.total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      this.logger.error('Failed to find student absence rate summary', error);
      throw error;
    }
  }

  /**
   * 根据班级ID查询所有学生缺勤率统计数据
   * @param classId 班级ID
   * @param searchKeyword 搜索关键词（学生ID或学生姓名）
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @returns 学生缺勤率统计数据列表
   *
   * @remarks
   * 性能优化：直接查询明细表，避免视图全表扫描
   */
  public async findByClassId(
    classId: string,
    searchKeyword?: string,
    page: number = 1,
    pageSize: number = 1000
  ): Promise<VStudentAbsenceRateSummary[]> {
    if (!classId) {
      this.logger.warn('findByClassId called with empty classId');
      return [];
    }

    this.logger.debug(
      { classId, searchKeyword, page, pageSize },
      'Finding student absence rate summary by class ID (optimized)'
    );

    try {
      const result =
        await this.studentAbsenceRateDetailRepository.findStudentSummaryByClassId(
          classId,
          searchKeyword,
          page,
          pageSize
        );
      return result.data;
    } catch (error) {
      this.logger.error(
        'Failed to find student absence rate summary by class ID',
        error
      );
      throw error;
    }
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
      this.logger.warn('findByStudentId called with empty studentId');
      return null;
    }

    this.logger.debug(
      { studentId },
      'Finding student absence rate summary by student ID'
    );

    try {
      return await this.studentAbsenceRateDetailRepository.findStudentSummaryByStudentId(
        studentId
      );
    } catch (error) {
      this.logger.error(
        'Failed to find student absence rate summary by student ID',
        error
      );
      throw error;
    }
  }

  /**
   * 获取高缺勤率学生列表（缺勤率超过指定阈值）
   * @param threshold 缺勤率阈值（0-1之间的小数，默认0.3即30%）
   * @param limit 返回数量限制（默认100）
   * @returns 高缺勤率学生列表
   */
  public async findHighAbsenceRateStudents(
    threshold: number = 0.3,
    limit: number = 100
  ): Promise<VStudentAbsenceRateSummary[]> {
    // 参数验证
    if (threshold < 0 || threshold > 1) {
      this.logger.warn('Invalid threshold, using default value 0.3');
      threshold = 0.3;
    }

    if (limit < 1 || limit > 1000) {
      this.logger.warn('Invalid limit, using default value 100');
      limit = 100;
    }

    this.logger.debug(
      { threshold, limit },
      'Finding high absence rate students'
    );

    try {
      return await this.studentAbsenceRateDetailRepository.findHighAbsenceRateStudentsSummary(
        threshold,
        limit
      );
    } catch (error) {
      this.logger.error('Failed to find high absence rate students', error);
      throw error;
    }
  }
}
