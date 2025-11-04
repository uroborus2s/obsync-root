// @stratix/icasync 增量数据聚合处理器
// 专门用于增量同步的数据聚合处理，聚合u_jw_kcb_cur并插入juhe_renwu表记录

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ICourseAggregationService } from '../services/CourseAggregationService.js';

/**
 * 增量数据聚合配置接口
 */
export interface IncrementalDataAggregationConfig {
  xnxq: string; // 学年学期
  syncType: 'incremental'; // 同步类型（增量）
  batchSize?: number; // 批处理大小
  forceSync?: boolean; // 是否强制同步
}

/**
 * 增量数据聚合结果接口
 */
export interface IncrementalDataAggregationResult {
  processedRecords: number; // 处理的记录数
  aggregatedCourses: number; // 聚合的课程数
  createdJuheRenwu: number; // 创建的juhe_renwu记录数
  processedKkhs: string[]; // 处理的开课号列表
  successCount: number; // 成功处理数
  errorCount: number; // 错误记录数
  duration: number; // 执行时长(ms)
  errors?: string[]; // 错误信息列表
}

/**
 * 增量数据聚合处理器
 *
 * 功能：
 * 1. 从u_jw_kcb_cur表获取未处理的数据（gt_zt为空或null）
 * 2. 对这些数据进行聚合处理
 * 3. 将聚合结果插入到juhe_renwu表中
 * 4. 不清空现有数据，只处理新的增量部分
 * 
 * 这是增量同步工作流的第三个节点
 */
@Executor({
  name: 'incrementalDataAggregationProcessor',
  description: '增量数据聚合处理器 - 专门用于增量同步的数据聚合',
  version: '1.0.0',
  tags: ['incremental', 'aggregation', 'data', 'course'],
  category: 'icasync'
})
export default class IncrementalDataAggregationProcessor implements TaskExecutor {
  readonly name = 'incrementalDataAggregationProcessor';
  readonly description = '增量数据聚合处理器';
  readonly version = '1.0.0';

  constructor(
    private courseAggregationService: ICourseAggregationService,
    private logger: Logger
  ) {}

  /**
   * 执行增量数据聚合任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as IncrementalDataAggregationConfig;

    this.logger.info('开始执行增量数据聚合任务', {
      xnxq: config.xnxq,
      syncType: config.syncType,
      batchSize: config.batchSize,
      forceSync: config.forceSync
    });

    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return left(validation.error
        );
      }

      // 执行增量数据聚合
      const result = await this.performIncrementalDataAggregation(config);

      result.duration = Date.now() - startTime;

      this.logger.info('增量数据聚合任务完成', {
        xnxq: config.xnxq,
        processedRecords: result.processedRecords,
        aggregatedCourses: result.aggregatedCourses,
        createdJuheRenwu: result.createdJuheRenwu,
        successCount: result.successCount,
        errorCount: result.errorCount,
        duration: result.duration
      });

      return right(result
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('增量数据聚合任务失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          processedRecords: 0,
          aggregatedCourses: 0,
          createdJuheRenwu: 0,
          processedKkhs: [],
          successCount: 0,
          errorCount: 1,
          duration,
          errors: [error instanceof Error ? error.message : String(error)]
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: IncrementalDataAggregationConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    if (config.syncType !== 'incremental') {
      return { valid: false, error: '同步类型必须为incremental' };
    }

    if (
      config.batchSize &&
      (config.batchSize <= 0 || config.batchSize > 10000)
    ) {
      return { valid: false, error: '批处理大小必须在1-10000之间' };
    }

    return { valid: true };
  }

  /**
   * 执行增量数据聚合
   */
  private async performIncrementalDataAggregation(
    config: IncrementalDataAggregationConfig
  ): Promise<IncrementalDataAggregationResult> {
    let processedRecords = 0;
    let aggregatedCourses = 0;
    let createdJuheRenwu = 0;
    let processedKkhs: string[] = [];
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      this.logger.info('开始增量数据聚合', {
        xnxq: config.xnxq,
        syncType: config.syncType
      });

      // 增量聚合模式：直接执行聚合并写入（不清空表）
      this.logger.info('执行增量数据聚合', { xnxq: config.xnxq });

      const aggregationResult =
        await this.courseAggregationService.executeAggregationAndSave(
          config.xnxq
        );

      if (aggregationResult._tag === 'Left') {
        throw new Error(`增量聚合失败: ${aggregationResult.left}`);
      }

      const result = aggregationResult.right;
      processedKkhs = result.processedKkhs;
      processedRecords = result.processedKkhs.length;
      aggregatedCourses = result.successCount;
      createdJuheRenwu = result.successCount;
      successCount = result.successCount;
      errorCount = result.failureCount; // 使用failureCount而不是errorCount

      // 记录错误信息（如果有）
      if (result.errors && result.errors.length > 0) {
        errors.push(...result.errors);
      }

      this.logger.info('增量数据聚合完成', {
        xnxq: config.xnxq,
        processedRecords,
        aggregatedCourses,
        createdJuheRenwu,
        successCount,
        errorCount,
        processedKkhsCount: processedKkhs.length,
        sampleKkhs: processedKkhs.slice(0, 5)
      });

      return {
        processedRecords,
        aggregatedCourses,
        createdJuheRenwu,
        processedKkhs,
        successCount,
        errorCount,
        duration: 0, // 将在上层设置
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('增量数据聚合过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      errors.push(errorMsg);
      errorCount++;

      return {
        processedRecords,
        aggregatedCourses,
        createdJuheRenwu,
        processedKkhs,
        successCount,
        errorCount,
        duration: 0,
        errors
      };
    }
  }

  /**
   * 获取聚合统计信息（可选功能）
   */
  private async getAggregationStats(xnxq: string): Promise<{
    totalRecords: number;
    processedRecords: number;
    pendingRecords: number;
  }> {
    try {
      this.logger.debug('获取聚合统计信息', { xnxq });

      // 这里可以调用CourseAggregationService的统计方法
      // 当前简化返回基本信息
      return {
        totalRecords: 0,
        processedRecords: 0,
        pendingRecords: 0
      };
    } catch (error) {
      this.logger.error('获取聚合统计信息失败', {
        xnxq,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        totalRecords: 0,
        processedRecords: 0,
        pendingRecords: 0
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查 CourseAggregationService 是否可用
      if (!this.courseAggregationService) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      this.logger.error('健康检查失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'unhealthy';
    }
  }
}