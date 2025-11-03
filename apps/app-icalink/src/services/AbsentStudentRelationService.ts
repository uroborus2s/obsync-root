import type { Logger } from '@stratix/core';
import {
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import type AbsentStudentRelationRepository from '../repositories/AbsentStudentRelationRepository.js';
import type { IcalinkAbsentStudentRelation } from '../types/database.js';
import { ServiceErrorCode, type ServiceError } from '../types/service.js';

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  searchKeyword?: string;
  teachingWeek?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页查询结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 缺勤学生关系服务接口
 */
export interface IAbsentStudentRelationService {
  findWithPagination(
    params: PaginationParams
  ): Promise<
    Either<ServiceError, PaginatedResult<IcalinkAbsentStudentRelation>>
  >;
}

/**
 * 缺勤学生关系服务实现
 * 负责处理缺勤历史明细数据的业务逻辑
 */
export default class AbsentStudentRelationService
  implements IAbsentStudentRelationService
{
  constructor(
    private readonly logger: Logger,
    private readonly absentStudentRelationRepository: AbsentStudentRelationRepository
  ) {
    this.logger.info('✅ AbsentStudentRelationService initialized');
  }

  /**
   * 分页查询缺勤历史明细数据
   * @param params 查询参数
   * @returns 分页结果
   */
  public async findWithPagination(
    params: PaginationParams
  ): Promise<
    Either<ServiceError, PaginatedResult<IcalinkAbsentStudentRelation>>
  > {
    try {
      // 参数验证
      if (!params.page || params.page < 1) {
        this.logger.warn('Invalid page parameter', { page: params.page });
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Invalid page parameter, must be >= 1'
        });
      }

      if (!params.pageSize || params.pageSize <= 0 || params.pageSize > 100) {
        this.logger.warn('Invalid pageSize parameter', {
          pageSize: params.pageSize
        });
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Invalid pageSize parameter, must be between 1 and 100'
        });
      }

      this.logger.debug('Finding absent student relations with pagination', {
        params
      });

      // 调用Repository层查询数据
      const result =
        await this.absentStudentRelationRepository.findWithPagination({
          page: params.page,
          pageSize: params.pageSize,
          searchKeyword: params.searchKeyword,
          teachingWeek: params.teachingWeek,
          sortField: params.sortField,
          sortOrder: params.sortOrder
        });

      this.logger.debug('Query completed', {
        total: result.total,
        dataCount: result.data.length
      });

      return right({
        data: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages
      });
    } catch (error: any) {
      this.logger.error('Failed to find absent student relations', {
        error: error.message,
        stack: error.stack,
        params
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to query absent student relations',
        details: error.message
      });
    }
  }

  /**
   * 根据学生ID查询缺勤记录
   * @param studentId 学生ID
   * @returns 缺勤记录列表
   */
  public async findByStudentId(
    studentId: string
  ): Promise<Either<ServiceError, IcalinkAbsentStudentRelation[]>> {
    try {
      if (!studentId) {
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Student ID is required'
        });
      }

      this.logger.debug('Finding absent relations by student ID', {
        studentId
      });

      const result = await this.absentStudentRelationRepository.findMany((qb) =>
        qb.where('student_id', '=', studentId)
      );

      return right(result);
    } catch (error: any) {
      this.logger.error('Failed to find absent relations by student ID', {
        error: error.message,
        studentId
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to query absent relations',
        details: error.message
      });
    }
  }

  /**
   * 根据课程ID查询缺勤记录
   * @param courseId 课程ID
   * @returns 缺勤记录列表
   */
  public async findByCourseId(
    courseId: number
  ): Promise<Either<ServiceError, IcalinkAbsentStudentRelation[]>> {
    try {
      if (!courseId || courseId <= 0) {
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Valid course ID is required'
        });
      }

      this.logger.debug('Finding absent relations by course ID', { courseId });

      const result = await this.absentStudentRelationRepository.findMany((qb) =>
        qb.where('course_id', '=', courseId)
      );

      return right(result);
    } catch (error: any) {
      this.logger.error('Failed to find absent relations by course ID', {
        error: error.message,
        courseId
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to query absent relations',
        details: error.message
      });
    }
  }

  /**
   * 获取总记录数
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<Either<ServiceError, number>> {
    try {
      this.logger.debug('Getting total count of absent student relations');

      const count = await this.absentStudentRelationRepository.count();

      return right(count);
    } catch (error: any) {
      this.logger.error('Failed to get total count', {
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to get total count',
        details: error.message
      });
    }
  }

  /**
   * 根据学生ID和课程代码查询缺勤记录详情
   * @param studentId 学生ID
   * @param courseCode 课程代码
   * @param absenceType 缺勤类型过滤（可选）：'absent', 'leave', 'truant', 'leave_and_pending'
   * @param sortField 排序字段（默认：teaching_week）
   * @param sortOrder 排序方向（默认：asc）
   * @returns 缺勤记录列表
   */
  public async findByStudentAndCourse(
    studentId: string,
    courseCode: string,
    absenceType?: 'absent' | 'leave' | 'truant' | 'leave_and_pending',
    sortField: string = 'teaching_week',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<Either<ServiceError, IcalinkAbsentStudentRelation[]>> {
    try {
      // 参数验证
      if (!studentId || !courseCode) {
        this.logger.warn('Invalid parameters for findByStudentAndCourse', {
          studentId,
          courseCode
        });
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Student ID and course code are required'
        });
      }

      this.logger.debug('Finding absent records by student and course', {
        studentId,
        courseCode,
        absenceType,
        sortField,
        sortOrder
      });

      const result =
        await this.absentStudentRelationRepository.findByStudentAndCourse(
          studentId,
          courseCode,
          absenceType,
          sortField,
          sortOrder
        );

      this.logger.debug('Query completed', {
        studentId,
        courseCode,
        absenceType,
        count: result.length
      });

      return right(result);
    } catch (error: any) {
      this.logger.error('Failed to find absent records by student and course', {
        error: error.message,
        stack: error.stack,
        studentId,
        courseCode,
        absenceType
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to query absent records',
        details: error.message
      });
    }
  }
}
