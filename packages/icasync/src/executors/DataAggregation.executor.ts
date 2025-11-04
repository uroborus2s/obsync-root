// @stratix/icasync 数据聚合处理器
// 负责聚合课程数据，完全基于 Service 层架构

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { IAttendanceCoursesRepository } from '../repositories/AttendanceCoursesRepository.js';
import type { ICourseAggregationService } from '../services/CourseAggregationService.js';

/**
 * 数据聚合配置接口
 */
export interface DataAggregationConfig {
  xnxq: string; // 学年学期
  batchSize?: number; // 批处理大小
  syncType?: 'full' | 'Increment'; // 是否清理现有数据
  forceSync?: boolean; // 是否增量模式
}

/**
 * 数据聚合结果接口
 */
export interface DataAggregationResult {
  processedRecords: number; // 处理记录数
  aggregatedCourses: number; // 聚合课程数
  createdTasks: number; // 创建任务数
  errorCount: number; // 错误记录数
  duration: number; // 执行时长(ms)
  errors?: string[]; // 错误信息列表
}

/**
 * 数据聚合处理器
 *
 * 功能：
 * 1. 通过 CourseAggregationService 获取原始课程数据
 * 2. 清理现有聚合数据（全量模式）
 * 3. 按批次聚合课程信息
 * 4. 生成待同步的任务列表
 */
@Executor({
  name: 'dataAggregationProcessor',
  description: '数据聚合处理器 - 基于Service层架构聚合课程数据',
  version: '2.0.0',
  tags: ['data', 'aggregation', 'course', 'preprocessing', 'refactored'],
  category: 'icasync'
})
export default class DataAggregationProcessor implements TaskExecutor {
  readonly name = 'dataAggregationProcessor';
  readonly description = '数据聚合处理器';
  readonly version = '3.0.0';

  constructor(
    private courseAggregationService: ICourseAggregationService,
    private attendanceCoursesRepository: IAttendanceCoursesRepository,
    private logger: Logger
  ) {}

  /**
   * 执行数据聚合任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as DataAggregationConfig;

    this.logger.info('开始执行数据聚合任务', {
      xnxq: config.xnxq,
      batchSize: config.batchSize,
      syncType: config.syncType,
      forceSync: config.forceSync
    });

    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return left(validation.error
        );
      }

      // 执行数据聚合
      const result = await this.performDataAggregation(config);

      result.duration = Date.now() - startTime;

      this.logger.info('数据聚合任务完成', {
        xnxq: config.xnxq,
        processedRecords: result.processedRecords,
        aggregatedCourses: result.aggregatedCourses,
        createdTasks: result.createdTasks,
        duration: result.duration
      });

      return right(result
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('数据聚合任务失败', {
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
          createdTasks: 0,
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
  validateConfig(config: DataAggregationConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
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
   * 执行数据聚合
   */
  private async performDataAggregation(
    config: DataAggregationConfig
  ): Promise<DataAggregationResult> {
    let processedRecords = 0;
    let aggregatedCourses = 0;
    let createdTasks = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      this.logger.info('开始数据聚合', {
        xnxq: config.xnxq,
        syncType: config.syncType || false
      });

      if (config.syncType === 'full') {
        // 先清空聚合表
        const clearResult =
          await this.courseAggregationService.clearAggregationTable();
        if (clearResult._tag === 'Left') {
          throw new Error(`清空聚合表失败: ${clearResult.left}`);
        }
        this.logger.info('聚合表清空完成', {
          clearedCount: clearResult.right
        });

        // 清空签到课程表（全量同步时）
        await this.clearAttendanceCoursesForFullSync(config.xnxq);
      }

      /// 增量聚合模式：直接执行聚合并写入（不清空表）
      this.logger.info('执行增量数据聚合', { xnxq: config.xnxq });

      const aggregationResult =
        await this.courseAggregationService.executeAggregationAndSave(
          config.xnxq
        );

      if (aggregationResult._tag === 'Left') {
        throw new Error(`增量聚合失败: ${aggregationResult.left}`);
      }

      const result = aggregationResult.right;
      processedRecords = result.processedKkhs.length;
      aggregatedCourses = result.successCount;
      createdTasks = result.successCount;

      this.logger.info('数据聚合完成', {
        xnxq: config.xnxq,
        processedRecords,
        aggregatedCourses,
        createdTasks,
        errorCount
      });

      return {
        processedRecords,
        aggregatedCourses,
        createdTasks,
        errorCount,
        duration: 0, // 将在上层设置
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('数据聚合过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      errors.push(errorMsg);
      errorCount++;

      return {
        processedRecords,
        aggregatedCourses,
        createdTasks,
        errorCount,
        duration: 0,
        errors
      };
    }
  }

  /**
   * 全量同步时清理签到课程数据
   * 软删除所有签到课程记录
   */
  private async clearAttendanceCoursesForFullSync(
    currentSemester: string
  ): Promise<void> {
    try {
      this.logger.info('开始全量清理签到课程数据', { currentSemester });

      // 软删除所有签到课程记录（全量同步时清空所有数据）
      const result =
        await this.attendanceCoursesRepository.softDeleteAll(
          'system-full-sync'
        );

      if (isRight(result)) {
        this.logger.info(`成功软删除 ${result.right} 条签到课程记录`, {
          deletedCount: result.right
        });
      } else {
        this.logger.error('软删除签到课程记录失败', {
          error: result
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('清理签到课程数据失败', {
        currentSemester,
        error: errorMessage
      });
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查 CourseAggregationService 和 AttendanceCoursesRepository 是否可用
      if (!this.courseAggregationService || !this.attendanceCoursesRepository) {
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
