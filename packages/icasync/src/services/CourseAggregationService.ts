// @stratix/icasync 课程聚合服务
// 基于 SQL 的高效聚合策略重构版本

import type { Logger } from '@stratix/core';
import {
  Either,
  eitherLeft as left,
  eitherRight as right
} from '@stratix/utils/functional';
import type { ICourseRawRepository } from '../repositories/CourseRawRepository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';

/**
 * 聚合配置接口
 */
export interface AggregationConfig {
  /** 学年学期 */
  xnxq: string;
  /** 是否只处理需要打卡的课程 */
  onlyCheckInRequired?: boolean;
  /** 批处理大小 */
  batchSize?: number;
}

/**
 * 聚合结果接口
 */
export interface AggregationResult {
  /** 成功聚合的任务数量 */
  successCount: number;
  /** 失败的任务数量 */
  failureCount: number;
  /** 处理的开课号列表 */
  processedKkhs: string[];
  /** 错误信息 */
  errors: string[];
}

/**
 * 课程聚合服务接口
 * 重构版本：简化为两个核心函数的高效聚合策略
 */
export interface ICourseAggregationService {
  /**
   * 清空聚合表
   * 专门负责清空 juhe_renwu 聚合表
   */
  clearAggregationTable(): Promise<Either<string, number>>;

  /**
   * 执行 SQL 聚合并写入聚合表
   * 从 u_jw_kcb_cur 表聚合数据并写入 juhe_renwu 表
   */
  executeAggregationAndSave(
    xnxq: string
  ): Promise<Either<string, AggregationResult>>;

  /**
   * 验证聚合数据的完整性
   */
  validateAggregation(xnxq: string): Promise<Either<string, boolean>>;
}

/**
 * 课程聚合服务实现
 * 重构版本：基于 SQL 的高效聚合策略
 */
export default class CourseAggregationService
  implements ICourseAggregationService
{
  constructor(
    private readonly courseRawRepository: ICourseRawRepository,
    private readonly juheRenwuRepository: IJuheRenwuRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 清空聚合表
   * 专门负责清空 juhe_renwu 聚合表
   */
  async clearAggregationTable(): Promise<Either<string, number>> {
    try {
      const startTime = Date.now();

      this.logger.info('开始清空聚合表');

      const clearResult = await this.juheRenwuRepository.clearAllTasks();
      if (!clearResult.success) {
        return left(`清空聚合表失败: ${clearResult.error}`);
      }

      const duration = Date.now() - startTime;
      this.logger.info('清空聚合表完成', {
        clearedCount: clearResult.data,
        duration
      });

      return right(clearResult.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('清空聚合表失败', { error: errorMessage });
      return left(`清空聚合表失败: ${errorMessage}`);
    }
  }

  /**
   * 执行 SQL 聚合并写入聚合表
   * 从 u_jw_kcb_cur 表聚合数据并写入 juhe_renwu 表
   */
  async executeAggregationAndSave(
    xnxq: string
  ): Promise<Either<string, AggregationResult>> {
    try {
      const startTime = Date.now();

      this.logger.info('开始执行 SQL 聚合并写入', { xnxq });

      // 1. 执行优化的 SQL 聚合查询（只处理未处理的数据）
      const aggregationResult =
        await this.courseRawRepository.executeFullAggregationSql(xnxq);
      if (!aggregationResult.success) {
        return left(`SQL 聚合查询失败: ${aggregationResult.error}`);
      }

      const aggregatedData = aggregationResult.data;
      this.logger.info('SQL 聚合查询完成', {
        xnxq,
        aggregatedCount: aggregatedData.length
      });

      // 2. 批量插入聚合数据到 juhe_renwu 表
      const insertResult =
        await this.juheRenwuRepository.insertAggregatedDataBatch(
          aggregatedData
        );
      if (!insertResult.success) {
        return left(`批量插入聚合数据失败: ${insertResult.error}`);
      }

      const duration = Date.now() - startTime;
      const result: AggregationResult = {
        successCount: insertResult.data,
        failureCount: 0,
        processedKkhs: [`聚合了 ${aggregatedData.length} 条数据`],
        errors: []
      };

      this.logger.info('SQL 聚合并写入完成', {
        xnxq,
        successCount: result.successCount,
        duration
      });

      return right(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('SQL 聚合并写入失败', { xnxq, error: errorMessage });
      return left(`SQL 聚合并写入失败: ${errorMessage}`);
    }
  }

  /**
   * 验证聚合数据的完整性
   */
  async validateAggregation(xnxq: string): Promise<Either<string, boolean>> {
    try {
      this.logger.info('开始验证聚合数据完整性', { xnxq });

      // 获取原始数据统计
      const rawCountResult = await this.courseRawRepository.countByXnxq(xnxq);
      if (!rawCountResult.success) {
        return left(`统计原始课程数据失败: ${rawCountResult.error}`);
      }

      // 获取聚合数据统计
      const aggregatedCountResult =
        await this.juheRenwuRepository.countByXnxq(xnxq);
      if (!aggregatedCountResult.success) {
        return left(`统计聚合任务数据失败: ${aggregatedCountResult.error}`);
      }

      const rawCount = rawCountResult.data;
      const aggregatedCount = aggregatedCountResult.data;

      // 验证数据完整性
      // 聚合后的数据应该少于原始数据（因为进行了合并）但不应该为0
      const isValid = aggregatedCount > 0 && aggregatedCount <= rawCount;

      this.logger.info('聚合数据完整性验证完成', {
        xnxq,
        rawCount,
        aggregatedCount,
        isValid
      });

      return right(isValid);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('验证聚合数据完整性失败', {
        xnxq,
        error: errorMessage
      });
      return left(`验证聚合数据完整性失败: ${errorMessage}`);
    }
  }
}
