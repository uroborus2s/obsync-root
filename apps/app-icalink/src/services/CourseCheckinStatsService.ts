import type { Logger } from '@stratix/core';
import type { IcalinkCourseCheckinStats } from '../types/database.js';
import type CourseCheckinStatsRepository from '../repositories/CourseCheckinStatsRepository.js';

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
 * 课程签到统计服务接口
 */
export interface ICourseCheckinStatsService {
  findWithPagination(
    params: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<IcalinkCourseCheckinStats>>>;
}

/**
 * 课程签到统计服务实现
 * 负责处理课程历史统计数据的业务逻辑
 */
export default class CourseCheckinStatsService
  implements ICourseCheckinStatsService
{
  constructor(
    private readonly logger: Logger,
    private readonly courseCheckinStatsRepository: CourseCheckinStatsRepository
  ) {
    this.logger.info('✅ CourseCheckinStatsService initialized');
  }

  /**
   * 分页查询课程签到统计数据
   * @param params 查询参数
   * @returns 分页结果
   */
  public async findWithPagination(
    params: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<IcalinkCourseCheckinStats>>> {
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

      this.logger.debug('Finding course checkin stats with pagination', {
        params
      });

      // 调用Repository层查询数据
      const result =
        await this.courseCheckinStatsRepository.findWithPagination({
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
      this.logger.error('Failed to find course checkin stats', {
        error: error.message,
        stack: error.stack,
        params
      });

      return {
        success: false,
        error: 'Failed to query course checkin stats',
        message: error.message
      };
    }
  }

  /**
   * 根据课程代码查询统计记录
   * @param courseCode 课程代码
   * @returns 统计记录列表
   */
  public async findByCourseCode(
    courseCode: string
  ): Promise<ServiceResult<IcalinkCourseCheckinStats[]>> {
    try {
      if (!courseCode) {
        return {
          success: false,
          error: 'Course code is required'
        };
      }

      this.logger.debug('Finding course stats by course code', { courseCode });

      const result =
        await this.courseCheckinStatsRepository.findByCourseCode(courseCode);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      this.logger.error('Failed to find course stats by course code', {
        error: error.message,
        courseCode
      });

      return {
        success: false,
        error: 'Failed to query course stats',
        message: error.message
      };
    }
  }

  /**
   * 根据日期范围查询统计记录
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 统计记录列表
   */
  public async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResult<IcalinkCourseCheckinStats[]>> {
    try {
      if (!startDate || !endDate) {
        return {
          success: false,
          error: 'Start date and end date are required'
        };
      }

      if (startDate > endDate) {
        return {
          success: false,
          error: 'Start date must be before or equal to end date'
        };
      }

      this.logger.debug('Finding course stats by date range', {
        startDate,
        endDate
      });

      const result = await this.courseCheckinStatsRepository.findByDateRange(
        startDate,
        endDate
      );

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      this.logger.error('Failed to find course stats by date range', {
        error: error.message,
        startDate,
        endDate
      });

      return {
        success: false,
        error: 'Failed to query course stats',
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
      this.logger.debug('Getting total count of course checkin stats');

      const count = await this.courseCheckinStatsRepository.getTotalCount();

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

