import type { Logger } from '@stratix/core';
import type StudentAbsenceRateDetailRepository from '../repositories/StudentAbsenceRateDetailRepository.js';
import type { IcalinkStudentAbsenceRateDetail } from '../types/database.js';

/**
 * 学生缺勤率明细服务接口
 */
export interface IStudentAbsenceRateDetailService {
  /**
   * 根据学生ID查询该学生所有课程的缺勤详情
   */
  findByStudentId(
    studentId: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<IcalinkStudentAbsenceRateDetail[]>;

  /**
   * 根据学生ID和课程代码查询缺勤详情
   */
  findByStudentAndCourse(
    studentId: string,
    courseCode: string
  ): Promise<IcalinkStudentAbsenceRateDetail | null>;

  /**
   * 根据班级ID查询所有学生的课程缺勤详情（分页）
   */
  findByClassId(
    classId: string,
    page: number,
    pageSize: number,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    data: IcalinkStudentAbsenceRateDetail[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;

  /**
   * 根据课程代码查询所有学生的缺勤详情
   */
  findByCourseCode(
    courseCode: string,
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<IcalinkStudentAbsenceRateDetail[]>;
}

/**
 * 学生缺勤率明细服务实现
 * 负责学生课程级别缺勤率详细数据的业务逻辑处理
 */
export default class StudentAbsenceRateDetailService
  implements IStudentAbsenceRateDetailService
{
  constructor(
    private readonly logger: Logger,
    private readonly studentAbsenceRateDetailRepository: StudentAbsenceRateDetailRepository
  ) {
    this.logger.info('✅ StudentAbsenceRateDetailService initialized');
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
      this.logger.warn('findByStudentId called with empty studentId');
      return [];
    }

    this.logger.debug(
      { studentId, sortField, sortOrder },
      'Finding student absence rate details by student ID'
    );

    try {
      return await this.studentAbsenceRateDetailRepository.findByStudentId(
        studentId,
        sortField,
        sortOrder
      );
    } catch (error) {
      this.logger.error(
        'Failed to find student absence rate details by student ID',
        error
      );
      throw error;
    }
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

    try {
      return await this.studentAbsenceRateDetailRepository.findByStudentAndCourse(
        studentId,
        courseCode
      );
    } catch (error) {
      this.logger.error(
        'Failed to find student absence rate detail by student ID and course code',
        error
      );
      throw error;
    }
  }

  /**
   * 根据班级ID查询所有学生的课程缺勤详情（分页）
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
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    if (!classId) {
      this.logger.warn('findByClassId called with empty classId');
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    // 参数验证
    if (page < 1) {
      this.logger.warn('Invalid page number, using default value 1');
      page = 1;
    }

    if (pageSize < 1 || pageSize > 100) {
      this.logger.warn('Invalid page size, using default value 20');
      pageSize = 20;
    }

    this.logger.debug(
      { classId, page, pageSize, sortField, sortOrder },
      'Finding student absence rate details by class ID'
    );

    try {
      const result =
        await this.studentAbsenceRateDetailRepository.findByClassId(
          classId,
          page,
          pageSize,
          sortField,
          sortOrder
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
      this.logger.error(
        'Failed to find student absence rate details by class ID',
        error
      );
      throw error;
    }
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
      this.logger.warn('findByCourseCode called with empty courseCode');
      return [];
    }

    this.logger.debug(
      { courseCode, sortField, sortOrder },
      'Finding student absence rate details by course code'
    );

    try {
      return await this.studentAbsenceRateDetailRepository.findByCourseCode(
        courseCode,
        sortField,
        sortOrder
      );
    } catch (error) {
      this.logger.error(
        'Failed to find student absence rate details by course code',
        error
      );
      throw error;
    }
  }
}
