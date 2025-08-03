// @stratix/icasync 状态管理服务
// 负责更新任务和课程的同步状态

import { Logger } from '@stratix/core';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { ICourseAggregationService } from './CourseAggregationService.js';

/**
 * 状态更新配置
 */
export interface StatusUpdateConfig {
  markAsCompleted?: boolean; // 是否标记为完成
  updateTimestamp?: boolean; // 是否更新时间戳
  batchSize?: number; // 批处理大小
}

/**
 * 状态更新结果
 */
export interface StatusUpdateResult {
  updatedTasks: number; // 更新任务数
  updatedCourses: number; // 更新课程数
  errorCount: number; // 错误记录数
  errors: string[]; // 错误信息列表
}

/**
 * 状态管理服务接口
 */
export interface IStatusManagementService {
  /**
   * 更新学期任务状态
   */
  updateSemesterTaskStatus(
    xnxq: string,
    config?: StatusUpdateConfig
  ): Promise<StatusUpdateResult>;

  /**
   * 更新课程同步状态
   */
  updateCourseSyncStatus(
    xnxq: string,
    config?: StatusUpdateConfig
  ): Promise<StatusUpdateResult>;

  /**
   * 批量更新任务状态
   */
  updateTaskStatusBatch(
    taskIds: number[],
    status: string,
    config?: StatusUpdateConfig
  ): Promise<StatusUpdateResult>;

  /**
   * 获取同步状态统计
   */
  getSyncStatusStats(xnxq: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    pendingTasks: number;
  }>;
}

/**
 * 状态管理服务实现
 */
export default class StatusManagementService
  implements IStatusManagementService
{
  constructor(
    private readonly juheRenwuRepository: IJuheRenwuRepository,
    private readonly courseAggregationService: ICourseAggregationService,
    private readonly logger: Logger
  ) {}

  /**
   * 更新学期任务状态
   */
  async updateSemesterTaskStatus(
    xnxq: string,
    config: StatusUpdateConfig = {}
  ): Promise<StatusUpdateResult> {
    const result: StatusUpdateResult = {
      updatedTasks: 0,
      updatedCourses: 0,
      errorCount: 0,
      errors: []
    };

    try {
      this.logger.info(`开始更新学期任务状态，学年学期: ${xnxq}`);

      // 获取需要更新状态的任务
      const tasksResult = await this.juheRenwuRepository.findByXnxq(xnxq);
      if (!tasksResult.success || !tasksResult.data) {
        const errorMessage = tasksResult.success
          ? 'No data returned'
          : 'Query failed';
        throw new Error(`获取学期任务失败: ${errorMessage}`);
      }

      const tasks = tasksResult.data;
      const batchSize = config.batchSize || 100;

      // 批量更新任务状态
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const taskIds = batch
          .map((task) => task.id)
          .filter(Boolean) as number[];

        if (taskIds.length > 0) {
          try {
            const updateResult =
              await this.juheRenwuRepository.updateSyncStatusBatch(
                taskIds,
                config.markAsCompleted ? '3' : '2' // 3=已完成, 2=已同步
              );

            if (updateResult.success) {
              result.updatedTasks += taskIds.length;
            } else {
              result.errorCount += taskIds.length;
              result.errors.push(
                `批量更新任务状态失败: ${updateResult.error || 'Unknown error'}`
              );
            }
          } catch (error) {
            result.errorCount += taskIds.length;
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            result.errors.push(`批量更新任务状态异常: ${errorMsg}`);
          }
        }
      }

      this.logger.info(`学期任务状态更新完成`, {
        xnxq,
        updatedTasks: result.updatedTasks,
        errorCount: result.errorCount
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`更新学期任务状态失败: ${errorMsg}`);
      result.errorCount++;
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * 更新课程同步状态
   */
  async updateCourseSyncStatus(
    xnxq: string,
    config: StatusUpdateConfig = {}
  ): Promise<StatusUpdateResult> {
    const result: StatusUpdateResult = {
      updatedTasks: 0,
      updatedCourses: 0,
      errorCount: 0,
      errors: []
    };

    try {
      this.logger.info(`开始更新课程同步状态，学年学期: ${xnxq}`);

      // 通过 CourseAggregationService 更新课程状态
      // 这里可以调用相应的方法来标记课程为已同步状态
      // 由于当前 CourseAggregationService 接口中没有这个方法，我们先记录日志
      this.logger.info(`课程同步状态更新功能待实现，学年学期: ${xnxq}`);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`更新课程同步状态失败: ${errorMsg}`);
      result.errorCount++;
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * 批量更新任务状态
   */
  async updateTaskStatusBatch(
    taskIds: number[],
    status: string,
    config: StatusUpdateConfig = {}
  ): Promise<StatusUpdateResult> {
    const result: StatusUpdateResult = {
      updatedTasks: 0,
      updatedCourses: 0,
      errorCount: 0,
      errors: []
    };

    try {
      this.logger.info(`开始批量更新任务状态`, {
        taskCount: taskIds.length,
        status
      });

      const updateResult = await this.juheRenwuRepository.updateSyncStatusBatch(
        taskIds,
        status
      );

      if (updateResult.success) {
        result.updatedTasks = taskIds.length;
        this.logger.info(`批量更新任务状态成功`, {
          updatedCount: result.updatedTasks,
          status
        });
      } else {
        result.errorCount = taskIds.length;
        result.errors.push(`批量更新失败: ${updateResult.error?.message}`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`批量更新任务状态失败: ${errorMsg}`);
      result.errorCount = taskIds.length;
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * 获取同步状态统计
   */
  async getSyncStatusStats(xnxq: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    pendingTasks: number;
  }> {
    try {
      this.logger.info(`获取同步状态统计，学年学期: ${xnxq}`);

      const tasksResult = await this.juheRenwuRepository.findByXnxq(xnxq);
      if (!tasksResult.success || !tasksResult.data) {
        const errorMessage = tasksResult.success
          ? 'No data returned'
          : 'Query failed';
        throw new Error(`获取学期任务失败: ${errorMessage}`);
      }

      const tasks = tasksResult.data;
      const stats = {
        totalTasks: tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0
      };

      // 统计各种状态的任务数量
      for (const task of tasks) {
        switch (task.gx_zt) {
          case '3':
            stats.completedTasks++;
            break;
          case '4':
            stats.failedTasks++;
            break;
          default:
            stats.pendingTasks++;
            break;
        }
      }

      this.logger.info(`同步状态统计完成`, { xnxq, ...stats });
      return stats;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`获取同步状态统计失败: ${errorMsg}`);
      return {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0
      };
    }
  }
}
