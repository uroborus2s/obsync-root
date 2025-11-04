// @stratix/icasync 课程聚合服务
// 基于 SQL 的高效聚合策略重构版本

import type { Logger } from '@stratix/core';
import {
  isLeft,
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import type { ICourseRawRepository } from '../repositories/CourseRaw.repository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwu.repository.js';

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
      if (isLeft(clearResult)) {
        return left(`清空聚合表失败: ${clearResult.left}`);
      }

      const duration = Date.now() - startTime;
      this.logger.info('清空聚合表完成', {
        clearedCount: clearResult.right,
        duration
      });

      return right(clearResult.right);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left('清空聚合表失败', { error: errorMessage });
      return left(`清空聚合表失败: ${errorMessage}`);
    }
  }

  /**
   * 执行增量聚合操作
   * 只处理新增或变更的数据（gx_zt IS NULL），不清空现有聚合数据
   * 清空操作由上层调用方决定是否执行
   */
  async executeIncrementalAggregation(
    xnxq: string
  ): Promise<Either<string, AggregationResult>> {
    try {
      const startTime = Date.now();
      this.logger.info('开始执行增量聚合', { xnxq });

      // 使用原子化的聚合插入操作
      const atomicResult =
        await this.juheRenwuRepository.executeAtomicAggregationInsert(xnxq);
      if (isLeft(atomicResult)) {
        return left(`增量聚合失败: ${atomicResult.left}`);
      }

      const duration = Date.now() - startTime;
      const result: AggregationResult = {
        successCount: atomicResult.right,
        failureCount: 0,
        processedKkhs: [`增量聚合了 ${atomicResult.right} 条新数据`],
        errors: []
      };

      this.logger.info('增量聚合完成', {
        xnxq,
        successCount: result.successCount,
        duration,
        performance: {
          recordsPerSecond: Math.round(atomicResult.right / (duration / 1000)),
          totalDurationMs: duration,
          operation: 'incremental_aggregate',
          memoryEfficient: true,
          transactional: true
        }
      });

      return right(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left('增量聚合失败', {
        xnxq,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      return left(`增量聚合失败: ${errorMessage}`);
    }
  }

  /**
   * 执行 SQL 聚合并写入聚合表
   * 从 u_jw_kcb_cur 表聚合数据并写入 juhe_renwu 表
   * 使用 INSERT INTO ... SELECT 原子操作，只处理未处理的数据
   */
  async executeAggregationAndSave(
    xnxq: string
  ): Promise<Either<string, AggregationResult>> {
    try {
      const startTime = Date.now();
      this.logger.info('开始执行 SQL 聚合并写入', { xnxq });

      // 使用原子化的聚合插入操作
      const atomicResult =
        await this.juheRenwuRepository.executeAtomicAggregationInsert(xnxq);
      if (isLeft(atomicResult)) {
        return left(`聚合插入失败: ${atomicResult.left}`);
      }

      const insertedCount = atomicResult.right;
      const duration = Date.now() - startTime;

      const result: AggregationResult = {
        successCount: insertedCount,
        failureCount: 0,
        processedKkhs: [`聚合了 ${insertedCount} 条数据`],
        errors: []
      };

      this.logger.info('SQL 聚合并写入完成', {
        xnxq,
        successCount: result.successCount,
        duration,
        performance: {
          recordsPerSecond: Math.round(insertedCount / (duration / 1000)),
          totalDurationMs: duration,
          operation: 'atomic_aggregate_insert',
          memoryEfficient: true,
          transactional: true
        }
      });

      return right(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left('SQL 聚合并写入失败', {
        xnxq,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
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
      if (isLeft(rawCountResult)) {
        return left(`统计原始课程数据失败: ${rawCountResult.left}`);
      }

      // 获取聚合数据统计
      const aggregatedCountResult =
        await this.juheRenwuRepository.countByXnxq(xnxq);
      if (isLeft(aggregatedCountResult)) {
        return left(`统计聚合任务数据失败: ${aggregatedCountResult.left}`);
      }

      const rawCount = rawCountResult.right;
      const aggregatedCount = aggregatedCountResult.right;

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
      this.logger.left('验证聚合数据完整性失败', {
        xnxq,
        error: errorMessage
      });
      return left(`验证聚合数据完整性失败: ${errorMessage}`);
    }
  }
}
