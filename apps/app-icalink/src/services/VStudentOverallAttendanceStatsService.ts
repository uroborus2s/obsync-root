import type { Logger } from '@stratix/core';
import {
  isSome,
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import type VStudentOverallAttendanceStatsRepository from '../repositories/VStudentOverallAttendanceStatsRepository.js';
import type { VStudentOverallAttendanceStats } from '../types/database.js';
import { ServiceErrorCode, type ServiceError } from '../types/service.js';

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  searchKeyword?: string;
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
 * 学生历史统计服务接口
 */
export interface IVStudentOverallAttendanceStatsService {
  findWithPagination(
    params: PaginationParams
  ): Promise<
    Either<ServiceError, PaginatedResult<VStudentOverallAttendanceStats>>
  >;
}

/**
 * 学生历史统计服务实现
 * 负责处理学生整体出勤统计数据的业务逻辑
 */
export default class VStudentOverallAttendanceStatsService
  implements IVStudentOverallAttendanceStatsService
{
  constructor(
    private readonly logger: Logger,
    private readonly vStudentOverallAttendanceStatsRepository: VStudentOverallAttendanceStatsRepository
  ) {
    this.logger.info('✅ VStudentOverallAttendanceStatsService initialized');
  }

  /**
   * 分页查询学生历史统计数据
   * @param params 查询参数
   * @returns 分页结果
   */
  public async findWithPagination(
    params: PaginationParams
  ): Promise<
    Either<ServiceError, PaginatedResult<VStudentOverallAttendanceStats>>
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

      this.logger.debug(
        'Finding student overall attendance stats with pagination',
        { params }
      );

      // 调用Repository层查询数据
      const result =
        await this.vStudentOverallAttendanceStatsRepository.findWithPagination({
          page: params.page,
          pageSize: params.pageSize,
          searchKeyword: params.searchKeyword,
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
      this.logger.error('Failed to find student overall attendance stats', {
        error: error.message,
        stack: error.stack,
        params
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to query student overall attendance stats',
        details: error.message
      });
    }
  }

  /**
   * 根据学生ID查询统计数据
   * @param studentId 学生ID
   * @returns 统计数据
   */
  public async findByStudentId(
    studentId: string
  ): Promise<Either<ServiceError, VStudentOverallAttendanceStats | undefined>> {
    try {
      if (!studentId) {
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Student ID is required'
        });
      }

      this.logger.debug('Finding student stats by student ID', { studentId });

      const maybeResult =
        await this.vStudentOverallAttendanceStatsRepository.findByStudentId(
          studentId
        );

      // 将 Maybe 类型转换为 undefined
      const result = isSome(maybeResult)
        ? (maybeResult.value ?? undefined)
        : undefined;

      return right(result);
    } catch (error: any) {
      this.logger.error('Failed to find student stats by student ID', {
        error: error.message,
        studentId
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to query student stats',
        details: error.message
      });
    }
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
  ): Promise<
    Either<ServiceError, PaginatedResult<VStudentOverallAttendanceStats>>
  > {
    try {
      if (!className) {
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Class name is required'
        });
      }

      if (page < 1 || pageSize <= 0 || pageSize > 100) {
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Invalid pagination parameters'
        });
      }

      this.logger.debug('Finding student stats by class name', {
        className,
        page,
        pageSize
      });

      const result =
        await this.vStudentOverallAttendanceStatsRepository.findByClassName(
          className,
          page,
          pageSize
        );

      const totalPages = Math.ceil(result.total / pageSize);

      return right({
        data: result.data,
        total: result.total,
        page,
        pageSize,
        totalPages
      });
    } catch (error: any) {
      this.logger.error('Failed to find student stats by class name', {
        error: error.message,
        className
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to query student stats',
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
      this.logger.debug(
        'Getting total count of student overall attendance stats'
      );

      const count =
        await this.vStudentOverallAttendanceStatsRepository.getTotalCount();

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
}
