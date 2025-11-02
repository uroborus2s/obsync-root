import type { Logger } from '@stratix/core';
import type VCourseCheckinStatsUnitRepository from '../repositories/VCourseCheckinStatsUnitRepository.js';
import type { VCourseCheckinStatsUnit } from '../types/database.js';

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
 * 单位级别签到统计服务接口
 */
export interface IVCourseCheckinStatsUnitService {
  findWithPagination(
    params: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<VCourseCheckinStatsUnit>>>;
}

/**
 * 单位级别签到统计服务实现
 * 负责处理单位级别签到统计数据的业务逻辑
 */
export default class VCourseCheckinStatsUnitService
  implements IVCourseCheckinStatsUnitService
{
  constructor(
    private readonly logger: Logger,
    private readonly vCourseCheckinStatsUnitRepository: VCourseCheckinStatsUnitRepository
  ) {
    this.logger.info('✅ VCourseCheckinStatsUnitService initialized');
  }

  /**
   * 分页查询单位级别签到统计数据
   * @param params 查询参数
   * @returns 分页结果
   */
  public async findWithPagination(
    params: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<VCourseCheckinStatsUnit>>> {
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

      this.logger.debug('Finding unit stats with pagination', { params });

      // 调用Repository层查询数据
      const result =
        await this.vCourseCheckinStatsUnitRepository.findWithPagination(
          params.page,
          params.pageSize,
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
      this.logger.error('Failed to find unit stats with pagination', {
        error: error.message,
        stack: error.stack,
        params
      });

      return {
        success: false,
        error: 'Failed to query unit stats data'
      };
    }
  }

  /**
   * 根据单位ID查询统计数据
   * @param unitId 单位ID
   * @returns 单位统计数据
   */
  public async findByUnitId(
    unitId: string
  ): Promise<ServiceResult<VCourseCheckinStatsUnit>> {
    try {
      if (!unitId) {
        return {
          success: false,
          error: 'Unit ID is required'
        };
      }

      this.logger.debug('Finding unit stats by unit ID', { unitId });

      const data =
        await this.vCourseCheckinStatsUnitRepository.findByUnitId(unitId);

      if (!data) {
        return {
          success: false,
          error: 'Unit stats not found'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to find unit stats by unit ID', {
        error: error.message,
        unitId
      });

      return {
        success: false,
        error: 'Failed to query unit stats data'
      };
    }
  }

  /**
   * 获取所有单位列表（用于树形结构）
   * @returns 单位列表
   */
  public async findAllUnits(): Promise<
    ServiceResult<VCourseCheckinStatsUnit[]>
  > {
    try {
      this.logger.debug('Finding all units');

      const data = await this.vCourseCheckinStatsUnitRepository.findAllUnits();

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to find all units', {
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to query units data'
      };
    }
  }
}

