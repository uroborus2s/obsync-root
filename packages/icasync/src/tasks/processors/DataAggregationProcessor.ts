// @stratix/icasync 数据聚合任务处理器
// 负责课程数据的聚合处理

import { Logger } from '@stratix/core';
import type { ICourseRawRepository } from '../../repositories/CourseRawRepository.js';
import type { IJuheRenwuRepository } from '../../repositories/JuheRenwuRepository.js';
import type {
  IcasyncTaskProcessor,
  TaskExecutionContext,
  TaskExecutionResult,
  TaskConfig,
  ValidationResult,
  TaskMetrics
} from '../types/task-types.js';
import { IcasyncTaskType } from '../types/task-types.js';

/**
 * 数据聚合任务配置
 */
export interface DataAggregationConfig extends TaskConfig {
  /** 学年学期 */
  xnxq: string;
  /** 是否使用原生 SQL 聚合 */
  useNativeSQL?: boolean;
  /** 批处理大小 */
  batchSize?: number;
  /** 是否增量模式 */
  incrementalMode?: boolean;
  /** 是否清理现有数据 */
  clearExistingData?: boolean;
}

/**
 * 数据聚合任务处理器
 * 
 * 功能：
 * 1. 从 u_jw_kcb_cur 表聚合课程数据到 juhe_renwu 表
 * 2. 支持全量聚合和增量聚合
 * 3. 支持原生 SQL 聚合和应用层聚合
 * 4. 提供详细的进度监控和错误处理
 */
export class DataAggregationProcessor implements IcasyncTaskProcessor {
  readonly name = 'DataAggregationProcessor';
  readonly type = IcasyncTaskType.DATA_AGGREGATION;
  readonly supportsBatch = true;
  readonly supportsParallel = false; // 数据聚合需要串行执行以保证一致性

  constructor(
    private readonly courseRawRepository: ICourseRawRepository,
    private readonly juheRenwuRepository: IJuheRenwuRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 执行数据聚合任务
   */
  async execute(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    const config = context.config as DataAggregationConfig;
    const { xnxq, useNativeSQL = true, incrementalMode = false, clearExistingData = false } = config;

    this.logger.info('开始执行数据聚合任务', {
      taskId: context.taskId,
      xnxq,
      useNativeSQL,
      incrementalMode,
      clearExistingData
    });

    try {
      let aggregationResult;
      let totalProcessed = 0;

      // 1. 清理现有数据（如果需要）
      if (clearExistingData && !incrementalMode) {
        this.logger.info('清理现有聚合数据', { xnxq });
        const clearResult = await this.juheRenwuRepository.clearTasksByXnxq(xnxq);
        if (!clearResult.success) {
          throw new Error(`清理现有数据失败: ${clearResult.error}`);
        }
        this.logger.info('现有数据清理完成', { clearedCount: clearResult.data });
      }

      // 2. 执行数据聚合
      if (incrementalMode) {
        // 增量聚合：只处理变更的数据
        aggregationResult = await this.executeIncrementalAggregation(config);
      } else if (useNativeSQL) {
        // 全量聚合：使用原生 SQL
        aggregationResult = await this.executeNativeSqlAggregation(config);
      } else {
        // 全量聚合：使用应用层逻辑
        aggregationResult = await this.executeApplicationAggregation(config);
      }

      if (!aggregationResult.success) {
        throw new Error(aggregationResult.error);
      }

      totalProcessed = aggregationResult.data.count;

      // 3. 验证聚合结果
      const validationResult = await this.validateAggregationResult(xnxq, totalProcessed);
      if (!validationResult.valid) {
        this.logger.warn('聚合结果验证失败', { 
          errors: validationResult.errors,
          totalProcessed 
        });
      }

      const duration = Date.now() - startTime;
      const metrics: TaskMetrics = {
        duration,
        recordsProcessed: totalProcessed,
        memoryUsed: process.memoryUsage().heapUsed,
        customMetrics: {
          aggregationMethod: useNativeSQL ? 'native_sql' : 'application',
          validationPassed: validationResult.valid,
          processingRate: totalProcessed / (duration / 1000) // 记录/秒
        }
      };

      this.logger.info('数据聚合任务完成', {
        taskId: context.taskId,
        totalProcessed,
        duration,
        processingRate: metrics.customMetrics.processingRate
      });

      return {
        success: true,
        data: {
          aggregatedCount: totalProcessed,
          method: useNativeSQL ? 'native_sql' : 'application',
          validationPassed: validationResult.valid
        },
        progress: 100,
        metrics
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error('数据聚合任务失败', {
        taskId: context.taskId,
        error: errorMessage,
        duration,
        config
      });

      return {
        success: false,
        error: errorMessage,
        progress: 0,
        metrics: {
          duration,
          recordsProcessed: 0,
          memoryUsed: process.memoryUsage().heapUsed,
          customMetrics: {
            errorType: this.classifyError(error),
            retryable: this.isRetryableError(error)
          }
        }
      };
    }
  }

  /**
   * 验证任务配置
   */
  async validate(config: TaskConfig): Promise<ValidationResult> {
    const aggregationConfig = config as DataAggregationConfig;
    const errors: string[] = [];

    // 验证学年学期格式
    if (!aggregationConfig.xnxq) {
      errors.push('xnxq is required');
    } else if (!/^\d{4}-\d{4}-[12]$/.test(aggregationConfig.xnxq)) {
      errors.push('Invalid xnxq format, expected: YYYY-YYYY-[1|2]');
    }

    // 验证批处理大小
    if (aggregationConfig.batchSize && aggregationConfig.batchSize <= 0) {
      errors.push('batchSize must be positive');
    }

    // 验证数据库连接
    try {
      const connectionTest = await this.courseRawRepository.findMany(
        (qb: any) => qb.limit(1)
      );
      if (!connectionTest.success) {
        errors.push('Database connection test failed');
      }
    } catch (error) {
      errors.push(`Database connection error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 估算任务进度
   */
  async estimateProgress(context: TaskExecutionContext): Promise<number> {
    const config = context.config as DataAggregationConfig;
    const { xnxq } = config;

    try {
      // 获取总记录数
      const totalCountResult = await this.courseRawRepository.countByXnxq(xnxq);
      if (!totalCountResult.success) {
        return 0;
      }

      const totalRecords = totalCountResult.data;
      const processedRecords = context.data?.processedRecords || 0;

      if (totalRecords === 0) {
        return 100;
      }

      return Math.min(100, Math.round((processedRecords / totalRecords) * 100));
    } catch (error) {
      this.logger.warn('进度估算失败', { error: error.message });
      return 0;
    }
  }

  /**
   * 执行原生 SQL 聚合
   */
  private async executeNativeSqlAggregation(config: DataAggregationConfig) {
    const { xnxq } = config;
    
    this.logger.info('使用原生 SQL 执行数据聚合', { xnxq });
    
    return await this.courseRawRepository.aggregateCourseDataWithSql(
      xnxq,
      this.juheRenwuRepository
    );
  }

  /**
   * 执行应用层聚合
   */
  private async executeApplicationAggregation(config: DataAggregationConfig) {
    const { xnxq, batchSize = 1000 } = config;
    
    this.logger.info('使用应用层逻辑执行数据聚合', { xnxq, batchSize });
    
    // 这里调用现有的应用层聚合逻辑
    // 实际实现需要从 CourseScheduleSyncService 中提取相关逻辑
    throw new Error('Application aggregation not implemented yet');
  }

  /**
   * 执行增量聚合
   */
  private async executeIncrementalAggregation(config: DataAggregationConfig) {
    const { xnxq } = config;
    
    this.logger.info('执行增量数据聚合', { xnxq });
    
    // 增量聚合逻辑：
    // 1. 检测变更的课程数据
    // 2. 只聚合变更的部分
    // 3. 更新或插入到 juhe_renwu 表
    
    throw new Error('Incremental aggregation not implemented yet');
  }

  /**
   * 验证聚合结果
   */
  private async validateAggregationResult(xnxq: string, expectedCount: number): Promise<ValidationResult> {
    try {
      // 验证聚合数据的完整性
      const actualCountResult = await this.juheRenwuRepository.countByXnxq(xnxq);
      if (!actualCountResult.success) {
        return {
          valid: false,
          errors: ['Failed to count aggregated records']
        };
      }

      const actualCount = actualCountResult.data;
      const errors: string[] = [];

      // 检查记录数是否匹配
      if (actualCount !== expectedCount) {
        errors.push(`Record count mismatch: expected ${expectedCount}, actual ${actualCount}`);
      }

      // 检查数据质量
      const qualityCheckResult = await this.performDataQualityCheck(xnxq);
      if (!qualityCheckResult.valid) {
        errors.push(...qualityCheckResult.errors);
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }

  /**
   * 执行数据质量检查
   */
  private async performDataQualityCheck(xnxq: string): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // 检查是否有必填字段为空的记录
      const nullCheckResult = await this.juheRenwuRepository.findMany(
        (qb: any) => qb
          .where('xnxq', '=', xnxq)
          .where((eb: any) => eb.or([
            eb('kkh', 'is', null),
            eb('kcmc', 'is', null),
            eb('rq', 'is', null)
          ]))
          .limit(1)
      );

      if (nullCheckResult.success && nullCheckResult.data.length > 0) {
        errors.push('Found records with null required fields');
      }

      // 检查时间格式是否正确
      const timeFormatCheckResult = await this.juheRenwuRepository.findMany(
        (qb: any) => qb
          .where('xnxq', '=', xnxq)
          .where((eb: any) => eb.or([
            eb('sj_f', 'not like', '__:__'),
            eb('sj_z', 'not like', '__:__')
          ]))
          .limit(1)
      );

      if (timeFormatCheckResult.success && timeFormatCheckResult.data.length > 0) {
        errors.push('Found records with invalid time format');
      }

    } catch (error) {
      errors.push(`Quality check error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: any): string {
    if (error.message?.includes('connection')) {
      return 'database_connection';
    }
    if (error.message?.includes('timeout')) {
      return 'timeout';
    }
    if (error.message?.includes('validation')) {
      return 'validation';
    }
    return 'unknown';
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    
    // 网络和连接错误通常可以重试
    if (errorMessage.includes('connection') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('network')) {
      return true;
    }
    
    // 验证错误通常不可重试
    if (errorMessage.includes('validation') || 
        errorMessage.includes('invalid')) {
      return false;
    }
    
    // 默认可重试
    return true;
  }
}
