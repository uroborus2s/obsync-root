import type { Logger } from '@stratix/core';
import type { VStudentOverallAttendanceStatsDetails } from '../types/database.js';
import type VStudentOverallAttendanceStatsDetailsRepository from '../repositories/VStudentOverallAttendanceStatsDetailsRepository.js';

/**
 * 服务执行结果
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

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
 * 学生历史统计详情服务接口
 */
export interface IVStudentOverallAttendanceStatsDetailsService {
  findWithPagination(
    params: PaginationParams
  ): Promise<
    ServiceResult<PaginatedResult<VStudentOverallAttendanceStatsDetails>>
  >;
}

/**
 * 学生历史统计详情服务实现
 * 负责处理学生课程级别出勤统计详情数据的业务逻辑
 */
export default class VStudentOverallAttendanceStatsDetailsService
  implements IVStudentOverallAttendanceStatsDetailsService
{
  constructor(
    private readonly logger: Logger,
    private readonly vStudentOverallAttendanceStatsDetailsRepository: VStudentOverallAttendanceStatsDetailsRepository
  ) {
    this.logger.info(
      '✅ VStudentOverallAttendanceStatsDetailsService initialized'
    );
  }

  /**
   * 分页查询学生历史统计详情数据
   * @param params 查询参数
   * @returns 分页结果
   */
  public async findWithPagination(
    params: PaginationParams
  ): Promise<
    ServiceResult<PaginatedResult<VStudentOverallAttendanceStatsDetails>>
  > {
    try {
      // 参数验证
      if (!params.page || params.page < 1) {
        this.logger.warn('Invalid page parameter', { page: params.page });
        return {
          success: false,
          error: 'Invalid page parameter, must be >= 1'
        };
      }

      if (!params.pageSize || params.pageSize <= 0 || params.pageSize > 100) {
        this.logger.warn('Invalid pageSize parameter', {
          pageSize: params.pageSize
        });
        return {
          success: false,
          error: 'Invalid pageSize parameter, must be between 1 and 100'
        };
      }

      this.logger.debug(
        'Finding student overall attendance stats details with pagination',
        { params }
      );

      // 调用Repository层查询数据
      const result =
        await this.vStudentOverallAttendanceStatsDetailsRepository.findWithPagination(
          {
            page: params.page,
            pageSize: params.pageSize,
            searchKeyword: params.searchKeyword,
            teachingWeek: params.teachingWeek,
            sortField: params.sortField,
            sortOrder: params.sortOrder
          }
        );

      this.logger.debug('Query completed', {
        total: result.total,
        dataCount: result.data.length
      });

      return {
        success: true,
        data: {
          data: result.data,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      };
    } catch (error: any) {
      this.logger.error(
        'Failed to find student overall attendance stats details',
        {
          error: error.message,
          stack: error.stack,
          params
        }
      );

      return {
        success: false,
        error: 'Failed to query student overall attendance stats details',
        message: error.message
      };
    }
  }

  /**
   * 根据学生ID查询课程统计详情
   * @param studentId 学生ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findByStudentId(
    studentId: string,
    page: number,
    pageSize: number
  ): Promise<
    ServiceResult<PaginatedResult<VStudentOverallAttendanceStatsDetails>>
  > {
    try {
      if (!studentId) {
        return {
          success: false,
          error: 'Student ID is required'
        };
      }

      if (page < 1 || pageSize <= 0 || pageSize > 100) {
        return {
          success: false,
          error: 'Invalid pagination parameters'
        };
      }

      this.logger.debug('Finding student course stats by student ID', {
        studentId,
        page,
        pageSize
      });

      const result =
        await this.vStudentOverallAttendanceStatsDetailsRepository.findByStudentId(
          studentId,
          page,
          pageSize
        );

      const totalPages = Math.ceil(result.total / pageSize);

      return {
        success: true,
        data: {
          data: result.data,
          total: result.total,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to find student course stats by student ID', {
        error: error.message,
        studentId
      });

      return {
        success: false,
        error: 'Failed to query student course stats',
        message: error.message
      };
    }
  }

  /**
   * 根据课程代码查询学生统计详情
   * @param courseCode 课程代码
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  public async findByCourseCode(
    courseCode: string,
    page: number,
    pageSize: number
  ): Promise<
    ServiceResult<PaginatedResult<VStudentOverallAttendanceStatsDetails>>
  > {
    try {
      if (!courseCode) {
        return {
          success: false,
          error: 'Course code is required'
        };
      }

      if (page < 1 || pageSize <= 0 || pageSize > 100) {
        return {
          success: false,
          error: 'Invalid pagination parameters'
        };
      }

      this.logger.debug('Finding student course stats by course code', {
        courseCode,
        page,
        pageSize
      });

      const result =
        await this.vStudentOverallAttendanceStatsDetailsRepository.findByCourseCode(
          courseCode,
          page,
          pageSize
        );

      const totalPages = Math.ceil(result.total / pageSize);

      return {
        success: true,
        data: {
          data: result.data,
          total: result.total,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to find student course stats by course code', {
        error: error.message,
        courseCode
      });

      return {
        success: false,
        error: 'Failed to query student course stats',
        message: error.message
      };
    }
  }

  /**
   * 获取总记录数
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<ServiceResult<number>> {
    try {
      this.logger.debug(
        'Getting total count of student overall attendance stats details'
      );

      const count =
        await this.vStudentOverallAttendanceStatsDetailsRepository.getTotalCount();

      return {
        success: true,
        data: count
      };
    } catch (error: any) {
      this.logger.error('Failed to get total count', {
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to get total count',
        message: error.message
      };
    }
  }
}

