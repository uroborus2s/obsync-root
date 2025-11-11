import type { Logger } from '@stratix/core';
import type CourseCheckinStatsRepository from '../repositories/CourseCheckinStatsRepository.js';
import type VCourseCheckinStatsSummaryRepository from '../repositories/VCourseCheckinStatsSummaryRepository.js';
import type { VCourseCheckinStatsSummary } from '../types/database.js';

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
 * 分页查询参数（课程级别）
 */
export interface SummaryPaginationParams {
  page: number;
  pageSize: number;
  classCode?: string; // 班级代码（用于树形结构的层级查询）
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
 * 课程汇总签到统计服务接口
 */
export interface IVCourseCheckinStatsSummaryService {
  findWithPagination(
    params: SummaryPaginationParams
  ): Promise<ServiceResult<PaginatedResult<VCourseCheckinStatsSummary>>>;
}

/**
 * 课程汇总签到统计服务实现
 * 负责处理课程级别签到统计数据的业务逻辑
 */
export default class VCourseCheckinStatsSummaryService
  implements IVCourseCheckinStatsSummaryService
{
  constructor(
    private readonly logger: Logger,
    private readonly vCourseCheckinStatsSummaryRepository: VCourseCheckinStatsSummaryRepository,
    private readonly courseCheckinStatsRepository: CourseCheckinStatsRepository
  ) {
    this.logger.info('✅ VCourseCheckinStatsSummaryService initialized');
  }

  /**
   * 分页查询课程汇总签到统计数据
   * @param params 查询参数
   * @returns 分页结果
   */
  public async findWithPagination(
    params: SummaryPaginationParams
  ): Promise<ServiceResult<PaginatedResult<VCourseCheckinStatsSummary>>> {
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

      this.logger.debug('Finding course summary stats with pagination', {
        params
      });

      // 调用Repository层查询数据
      const result =
        await this.vCourseCheckinStatsSummaryRepository.findWithPagination(
          params.page,
          params.pageSize,
          params.classCode,
          params.searchKeyword,
          params.sortField,
          params.sortOrder
        );

      // 为每条记录添加周度统计数据
      const dataWithWeeklyStats = await Promise.all(
        result.data.map(async (record) => {
          try {
            // 查询该课程的周度统计数据
            const weeklyData =
              await this.courseCheckinStatsRepository.findCourseWeeklyStats(
                record.course_code,
                record.semester
              );

            // 转换为前端需要的格式
            const weekly_stats = weeklyData.map((stat) => ({
              week: stat.teaching_week,
              expected: stat.expected_attendance,
              absent: stat.absent_count,
              absence_rate: stat.absence_rate
            }));

            return {
              ...record,
              weekly_stats
            };
          } catch (error: any) {
            this.logger.warn('Failed to fetch weekly stats for course', {
              courseCode: record.course_code,
              error: error.message
            });
            // 如果查询周度数据失败，返回不带 weekly_stats 的记录
            return record;
          }
        })
      );

      // 计算总页数
      const totalPages = Math.ceil(result.total / params.pageSize);

      return {
        success: true,
        data: {
          data: dataWithWeeklyStats,
          total: result.total,
          page: params.page,
          pageSize: params.pageSize,
          totalPages
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to find course summary stats with pagination', {
        error: error.message,
        stack: error.stack,
        params
      });

      return {
        success: false,
        error: 'Failed to query course summary stats data'
      };
    }
  }

  /**
   * 根据班级代码查询所有课程统计数据
   * @param classCode 班级代码
   * @returns 课程统计数据列表
   */
  public async findByClassCode(
    classCode: string
  ): Promise<ServiceResult<VCourseCheckinStatsSummary[]>> {
    try {
      if (!classCode) {
        return {
          success: false,
          error: 'Class code is required'
        };
      }

      this.logger.debug('Finding course summary stats by class code', {
        classCode
      });

      const data =
        await this.vCourseCheckinStatsSummaryRepository.findByClassCode(
          classCode
        );

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to find course summary stats by class code', {
        error: error.message,
        classCode
      });

      return {
        success: false,
        error: 'Failed to query course summary stats data'
      };
    }
  }

  /**
   * 根据课程代码查询统计数据
   * @param courseCode 课程代码
   * @returns 课程统计数据
   */
  public async findByCourseCode(
    courseCode: string
  ): Promise<ServiceResult<VCourseCheckinStatsSummary>> {
    try {
      if (!courseCode) {
        return {
          success: false,
          error: 'Course code is required'
        };
      }

      this.logger.debug('Finding course summary stats by course code', {
        courseCode
      });

      const data =
        await this.vCourseCheckinStatsSummaryRepository.findByCourseCode(
          courseCode
        );

      if (!data) {
        return {
          success: false,
          error: 'Course stats not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to find course summary stats by course code', {
        error: error.message,
        courseCode
      });

      return {
        success: false,
        error: 'Failed to query course summary stats data'
      };
    }
  }

  /**
   * 根据单位ID查询所有课程统计数据
   * @param unitId 单位ID
   * @returns 课程统计数据列表
   */
  public async findByUnitId(
    unitId: string
  ): Promise<ServiceResult<VCourseCheckinStatsSummary[]>> {
    try {
      if (!unitId) {
        return {
          success: false,
          error: 'Unit ID is required'
        };
      }

      this.logger.debug('Finding course summary stats by unit ID', { unitId });

      const data =
        await this.vCourseCheckinStatsSummaryRepository.findByUnitId(unitId);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to find course summary stats by unit ID', {
        error: error.message,
        unitId
      });

      return {
        success: false,
        error: 'Failed to query course summary stats data'
      };
    }
  }
}
