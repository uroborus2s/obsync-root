// @stratix/icasync 状态更新处理器
// 负责更新任务和课程的同步状态，完全基于 Service 层架构

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { IStatusManagementService } from '../services/StatusManagementService.js';

/**
 * 状态更新配置接口
 */
export interface StatusUpdateConfig {
  xnxq: string;                    // 学年学期
  markAsCompleted?: boolean;       // 是否标记为完成
  updateTimestamp?: boolean;       // 是否更新时间戳
  batchSize?: number;              // 批处理大小
}

/**
 * 状态更新结果接口
 */
export interface StatusUpdateResult {
  updatedTasks: number;            // 更新任务数
  updatedCourses: number;          // 更新课程数
  errorCount: number;              // 错误记录数
  duration: number;                // 执行时长(ms)
  errors?: string[];               // 错误信息列表
  stats?: {                        // 状态统计
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    pendingTasks: number;
  };
}

/**
 * 状态更新处理器
 * 
 * 功能：
 * 1. 通过 StatusManagementService 更新任务状态
 * 2. 更新课程同步状态
 * 3. 生成状态统计报告
 * 4. 记录完成时间戳
 */
@Executor({
  name: 'statusUpdateProcessor',
  description: '状态更新处理器 - 基于Service层架构更新任务和课程状态',
  version: '2.0.0',
  tags: ['status', 'update', 'completion', 'sync', 'refactored'],
  category: 'icasync'
})
export default class StatusUpdateProcessor implements TaskExecutor {
  readonly name = 'statusUpdateProcessor';
  readonly description = '状态更新处理器';
  readonly version = '2.0.0';

  constructor(
    private statusManagementService: IStatusManagementService,
    private logger: Logger
  ) {}

  /**
   * 执行状态更新任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as StatusUpdateConfig;

    this.logger.info('开始执行状态更新任务', {
      xnxq: config.xnxq,
      markAsCompleted: config.markAsCompleted,
      updateTimestamp: config.updateTimestamp,
      batchSize: config.batchSize
    });

    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 执行状态更新
      const result = await this.performStatusUpdate(config);
      
      result.duration = Date.now() - startTime;

      this.logger.info('状态更新任务完成', {
        xnxq: config.xnxq,
        updatedTasks: result.updatedTasks,
        updatedCourses: result.updatedCourses,
        errorCount: result.errorCount,
        duration: result.duration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('状态更新任务失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          updatedTasks: 0,
          updatedCourses: 0,
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
  validateConfig(config: StatusUpdateConfig): { valid: boolean; error?: string } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    if (config.batchSize && (config.batchSize <= 0 || config.batchSize > 1000)) {
      return { valid: false, error: '批处理大小必须在1-1000之间' };
    }

    return { valid: true };
  }

  /**
   * 执行状态更新
   */
  private async performStatusUpdate(config: StatusUpdateConfig): Promise<StatusUpdateResult> {
    let totalUpdatedTasks = 0;
    let totalUpdatedCourses = 0;
    let totalErrorCount = 0;
    const allErrors: string[] = [];

    try {
      this.logger.info('开始更新任务状态', { xnxq: config.xnxq });

      // 1. 更新学期任务状态
      const taskUpdateResult = await this.statusManagementService.updateSemesterTaskStatus(
        config.xnxq,
        {
          markAsCompleted: config.markAsCompleted ?? true,
          updateTimestamp: config.updateTimestamp ?? true,
          batchSize: config.batchSize || 100
        }
      );

      totalUpdatedTasks += taskUpdateResult.updatedTasks;
      totalErrorCount += taskUpdateResult.errorCount;
      allErrors.push(...taskUpdateResult.errors);

      this.logger.info('任务状态更新完成', {
        xnxq: config.xnxq,
        updatedTasks: taskUpdateResult.updatedTasks,
        errorCount: taskUpdateResult.errorCount
      });

      // 2. 更新课程同步状态
      this.logger.info('开始更新课程同步状态', { xnxq: config.xnxq });

      const courseUpdateResult = await this.statusManagementService.updateCourseSyncStatus(
        config.xnxq,
        {
          markAsCompleted: config.markAsCompleted ?? true,
          updateTimestamp: config.updateTimestamp ?? true,
          batchSize: config.batchSize || 100
        }
      );

      totalUpdatedCourses += courseUpdateResult.updatedCourses;
      totalErrorCount += courseUpdateResult.errorCount;
      allErrors.push(...courseUpdateResult.errors);

      this.logger.info('课程同步状态更新完成', {
        xnxq: config.xnxq,
        updatedCourses: courseUpdateResult.updatedCourses,
        errorCount: courseUpdateResult.errorCount
      });

      // 3. 获取最终状态统计
      const stats = await this.statusManagementService.getSyncStatusStats(config.xnxq);

      this.logger.info('状态更新完成', {
        xnxq: config.xnxq,
        totalUpdatedTasks,
        totalUpdatedCourses,
        totalErrorCount,
        stats
      });

      return {
        updatedTasks: totalUpdatedTasks,
        updatedCourses: totalUpdatedCourses,
        errorCount: totalErrorCount,
        duration: 0, // 将在上层设置
        errors: allErrors.length > 0 ? allErrors : undefined,
        stats
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('状态更新过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      return {
        updatedTasks: totalUpdatedTasks,
        updatedCourses: totalUpdatedCourses,
        errorCount: totalErrorCount + 1,
        duration: 0,
        errors: [errorMsg, ...allErrors]
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查 StatusManagementService 是否可用
      if (!this.statusManagementService) {
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
