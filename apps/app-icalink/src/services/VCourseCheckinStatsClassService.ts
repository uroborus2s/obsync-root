import type { Logger } from '@stratix/core';
import type VCourseCheckinStatsClassRepository from '../repositories/VCourseCheckinStatsClassRepository.js';
import type { VCourseCheckinStatsClass } from '../types/database.js';

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
 * 分页查询参数（班级级别）
 */
export interface ClassPaginationParams {
  page: number;
  pageSize: number;
  unitId?: string; // 单位ID（用于树形结构的层级查询）
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
 * 班级级别签到统计服务接口
 */
export interface IVCourseCheckinStatsClassService {
  findWithPagination(
    params: ClassPaginationParams
  ): Promise<ServiceResult<PaginatedResult<VCourseCheckinStatsClass>>>;
}

/**
 * 班级级别签到统计服务实现
 * 负责处理班级级别签到统计数据的业务逻辑
 */
export default class VCourseCheckinStatsClassService
  implements IVCourseCheckinStatsClassService
{
  constructor(
    private readonly logger: Logger,
    private readonly vCourseCheckinStatsClassRepository: VCourseCheckinStatsClassRepository
  ) {
    this.logger.info('✅ VCourseCheckinStatsClassService initialized');
  }

  /**
   * 分页查询班级级别签到统计数据
   * @param params 查询参数
   * @returns 分页结果
   */
  public async findWithPagination(
    params: ClassPaginationParams
  ): Promise<ServiceResult<PaginatedResult<VCourseCheckinStatsClass>>> {
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

      this.logger.debug('Finding class stats with pagination', { params });

      // 调用Repository层查询数据
      const result =
        await this.vCourseCheckinStatsClassRepository.findWithPagination(
          params.page,
          params.pageSize,
          params.unitId,
          params.searchKeyword,
          params.sortField,
          params.sortOrder
        );

      // 计算总页数
      const totalPages = Math.ceil(result.total / params.pageSize);

      return {
        success: true,
        data: {
          data: result.data,
          total: result.total,
          page: params.page,
          pageSize: params.pageSize,
          totalPages
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to find class stats with pagination', {
        error: error.message,
        stack: error.stack,
        params
      });

      return {
        success: false,
        error: 'Failed to query class stats data'
      };
    }
  }

  /**
   * 根据单位ID查询所有班级统计数据
   * @param unitId 单位ID
   * @returns 班级统计数据列表
   */
  public async findByUnitId(
    unitId: string
  ): Promise<ServiceResult<VCourseCheckinStatsClass[]>> {
    try {
      if (!unitId) {
        return {
          success: false,
          error: 'Unit ID is required'
        };
      }

      this.logger.debug('Finding class stats by unit ID', { unitId });

      const data =
        await this.vCourseCheckinStatsClassRepository.findByUnitId(unitId);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to find class stats by unit ID', {
        error: error.message,
        unitId
      });

      return {
        success: false,
        error: 'Failed to query class stats data'
      };
    }
  }

  /**
   * 根据班级代码查询统计数据
   * @param classCode 班级代码
   * @returns 班级统计数据
   */
  public async findByClassCode(
    classCode: string
  ): Promise<ServiceResult<VCourseCheckinStatsClass>> {
    try {
      if (!classCode) {
        return {
          success: false,
          error: 'Class code is required'
        };
      }

      this.logger.debug('Finding class stats by class code', { classCode });

      const data =
        await this.vCourseCheckinStatsClassRepository.findByClassCode(
          classCode
        );

      if (!data) {
        return {
          success: false,
          error: 'Class stats not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to find class stats by class code', {
        error: error.message,
        classCode
      });

      return {
        success: false,
        error: 'Failed to query class stats data'
      };
    }
  }
}

