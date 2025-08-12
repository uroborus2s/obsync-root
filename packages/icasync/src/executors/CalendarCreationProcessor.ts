// @stratix/icasync 日历创建处理器
// 负责批量创建课程日历，通过 Service 层完成业务逻辑

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { ICalendarSyncService } from '../services/CalendarSyncService.js';
import type { ICourseAggregationService } from '../services/CourseAggregationService.js';

/**
 * 日历创建配置接口
 */
export interface CalendarCreationConfig {
  xnxq: string; // 学年学期
  batchSize?: number; // 批处理大小
  maxConcurrency?: number; // 最大并发数
  timeout?: number; // 超时时间(ms)
  retryCount?: number; // 重试次数
}

/**
 * 日历创建结果接口
 */
export interface CalendarCreationResult {
  processedCount: number; // 处理课程数
  createdCount: number; // 创建日历数
  errorCount: number; // 错误记录数
  duration: number; // 执行时长(ms)
  errors?: string[]; // 错误信息列表
}

/**
 * 日历创建处理器
 *
 * 功能：
 * 1. 通过 CourseAggregationService 获取待处理的课程
 * 2. 通过 CalendarSyncService 批量创建日历
 * 3. 处理创建结果和错误信息
 * 4. 更新任务状态
 */
@Executor({
  name: 'calendarCreationProcessor',
  description: '日历创建处理器 - 基于Service层架构批量创建课程日历',
  version: '2.0.0',
  tags: ['calendar', 'creation', 'course', 'was-v7', 'refactored'],
  category: 'icasync'
})
export default class CalendarCreationProcessor implements TaskExecutor {
  readonly name = 'calendarCreationProcessor';
  readonly description = '日历创建处理器';
  readonly version = '2.0.0';

  constructor(
    private calendarSyncService: ICalendarSyncService,
    private courseAggregationService: ICourseAggregationService,
    private juheRenwuRepository: IJuheRenwuRepository,
    private logger: Logger
  ) {}

  /**
   * 执行日历创建任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as CalendarCreationConfig;

    this.logger.info('开始执行日历创建任务', {
      xnxq: config.xnxq,
      batchSize: config.batchSize,
      maxConcurrency: config.maxConcurrency
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

      // 执行日历创建
      const result = await this.performCalendarCreation(config);

      result.duration = Date.now() - startTime;

      this.logger.info('日历创建任务完成', {
        xnxq: config.xnxq,
        processedCount: result.processedCount,
        createdCount: result.createdCount,
        errorCount: result.errorCount,
        duration: result.duration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('日历创建任务失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          processedCount: 0,
          createdCount: 0,
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
  validateConfig(config: CalendarCreationConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    if (
      config.batchSize &&
      (config.batchSize <= 0 || config.batchSize > 1000)
    ) {
      return { valid: false, error: '批处理大小必须在1-1000之间' };
    }

    if (
      config.maxConcurrency &&
      (config.maxConcurrency <= 0 || config.maxConcurrency > 50)
    ) {
      return { valid: false, error: '最大并发数必须在1-50之间' };
    }

    if (config.timeout && config.timeout < 1000) {
      return { valid: false, error: '超时时间不能少于1000毫秒' };
    }

    return { valid: true };
  }

  /**
   * 执行日历创建
   */
  private async performCalendarCreation(
    config: CalendarCreationConfig
  ): Promise<CalendarCreationResult> {
    const batchSize = config.batchSize || 50;
    let processedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // 1. 从聚合表获取不重复的课程列表
      this.logger.info('开始从聚合表获取课程数据', { xnxq: config.xnxq });

      const distinctCoursesResult =
        await this.juheRenwuRepository.findDistinctCourses(config.xnxq);
      if (!distinctCoursesResult.success) {
        throw new Error(`获取不重复课程失败: ${distinctCoursesResult.error}`);
      }

      const distinctCourses = distinctCoursesResult.data;
      processedCount = distinctCourses.length;

      if (distinctCourses.length === 0) {
        this.logger.info('没有待处理的日历创建任务', { xnxq: config.xnxq });
        return {
          processedCount: 0,
          createdCount: 0,
          errorCount: 0,
          duration: 0
        };
      }

      this.logger.info('获取到课程数据', {
        xnxq: config.xnxq,
        distinctCourseCount: distinctCourses.length
      });

      // 2. 获取用于日历创建的详细课程数据
      const coursesForCalendarResult =
        await this.juheRenwuRepository.findCoursesForCalendarCreation(
          config.xnxq
        );
      if (!coursesForCalendarResult.success) {
        throw new Error(
          `获取日历创建课程数据失败: ${coursesForCalendarResult.error}`
        );
      }

      const coursesForCalendar = coursesForCalendarResult.data;
      this.logger.info('获取到详细课程数据', {
        xnxq: config.xnxq,
        totalCourseEvents: coursesForCalendar.length
      });

      // 3. 通过 CalendarSyncService 批量创建日历
      this.logger.info('开始批量创建日历', {
        xnxq: config.xnxq,
        courseCount: distinctCourses.length,
        eventCount: coursesForCalendar.length,
        batchSize
      });

      const calendarResult =
        await this.calendarSyncService.createCourseCalendarsBatch(
          distinctCourses,
          config.xnxq,
          {
            batchSize,
            timeout: config.timeout || 30000,
            retryCount: config.retryCount || 3
          }
        );

      createdCount = calendarResult.successCount;
      errorCount = calendarResult.failedCount;

      if (calendarResult.errors.length > 0) {
        errors.push(...calendarResult.errors);
        this.logger.warn('部分日历创建失败', {
          xnxq: config.xnxq,
          errorCount: calendarResult.errors.length,
          errors: calendarResult.errors.slice(0, 5) // 只记录前5个错误
        });
      }

      this.logger.info('日历创建完成', {
        xnxq: config.xnxq,
        processedCount,
        createdCount,
        errorCount
      });

      return {
        processedCount,
        createdCount,
        errorCount,
        duration: 0, // 将在上层设置
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('日历创建过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      return {
        processedCount,
        createdCount,
        errorCount: errorCount + 1,
        duration: 0,
        errors: [errorMsg]
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查 CalendarSyncService 是否可用
      if (!this.calendarSyncService) {
        return 'unhealthy';
      }

      // 检查 CourseAggregationService 是否可用
      if (!this.courseAggregationService) {
        return 'unhealthy';
      }

      // 检查 JuheRenwuRepository 是否可用
      if (!this.juheRenwuRepository) {
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
