import type { Logger } from '@stratix/core';
import type VTeachingClassRepository from '../repositories/VTeachingClassRepository.js';
import type { IcalinkTeachingClass } from '../types/database.js';

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
 * 教学班服务接口
 */
export interface IVTeachingClassService {
  findWithPagination(
    params: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<IcalinkTeachingClass>>>;
}

/**
 * 教学班服务实现
 * 负责处理教学班数据的业务逻辑
 */
export default class VTeachingClassService implements IVTeachingClassService {
  constructor(
    private readonly logger: Logger,
    private readonly vTeachingClassRepository: VTeachingClassRepository
  ) {
    this.logger.info('✅ VTeachingClassService initialized');
  }

  /**
   * 分页查询教学班数据
   * @param params 查询参数
   * @returns 分页结果
   */
  public async findWithPagination(
    params: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<IcalinkTeachingClass>>> {
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

      this.logger.debug('Finding teaching class with pagination', { params });

      // 调用Repository层查询数据
      const result = await this.vTeachingClassRepository.findWithPagination({
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
      this.logger.error('Failed to find teaching class', {
        error: error.message,
        stack: error.stack,
        params
      });

      return {
        success: false,
        error: 'Failed to query teaching class',
        message: error.message
      };
    }
  }

  /**
   * 根据学生ID查询教学班信息
   * @param studentId 学生ID
   * @returns 教学班记录列表
   */
  public async findByStudentId(
    studentId: string
  ): Promise<ServiceResult<IcalinkTeachingClass[]>> {
    try {
      if (!studentId) {
        return {
          success: false,
          error: 'Student ID is required'
        };
      }

      this.logger.debug('Finding teaching class by student ID', { studentId });

      const result =
        await this.vTeachingClassRepository.findByStudentId(studentId);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      this.logger.error('Failed to find teaching class by student ID', {
        error: error.message,
        studentId
      });

      return {
        success: false,
        error: 'Failed to query teaching class',
        message: error.message
      };
    }
  }

  /**
   * 根据课程代码查询教学班信息
   * @param courseCode 课程代码
   * @returns 教学班记录列表
   */
  public async findByCourseCode(
    courseCode: string
  ): Promise<ServiceResult<IcalinkTeachingClass[]>> {
    try {
      if (!courseCode) {
        return {
          success: false,
          error: 'Course code is required'
        };
      }

      this.logger.debug('Finding teaching class by course code', {
        courseCode
      });

      const result =
        await this.vTeachingClassRepository.findByCourseCode(courseCode);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      this.logger.error('Failed to find teaching class by course code', {
        error: error.message,
        courseCode
      });

      return {
        success: false,
        error: 'Failed to query teaching class',
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
      this.logger.debug('Getting total count of teaching class');

      const count = await this.vTeachingClassRepository.getTotalCount();

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
