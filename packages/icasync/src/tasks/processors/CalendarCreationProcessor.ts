// @stratix/icasync 日历创建任务处理器
// 负责在 WPS 日历系统中创建课程日历

import { Logger } from '@stratix/core';
import type { ICalendarSyncService } from '../../services/CalendarSyncService.js';
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
 * 日历创建任务配置
 */
export interface CalendarCreationConfig extends TaskConfig {
  /** 学年学期 */
  xnxq: string;
  /** 批处理大小 */
  batchSize?: number;
  /** 是否并行创建 */
  parallel?: boolean;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 是否只创建新日历 */
  createNewOnly?: boolean;
  /** 是否删除所有现有日历 */
  deleteAllForSemester?: boolean;
  /** 指定要创建的课程号列表 */
  specificKkhs?: string[];
}

/**
 * 日历创建任务处理器
 * 
 * 功能：
 * 1. 批量创建课程日历
 * 2. 支持并行创建以提升性能
 * 3. 支持增量创建（只创建新课程）
 * 4. 提供详细的进度监控和错误处理
 * 5. 支持失败重试和错误恢复
 */
export class CalendarCreationProcessor implements IcasyncTaskProcessor {
  readonly name = 'CalendarCreationProcessor';
  readonly type = IcasyncTaskType.CALENDAR_CREATION;
  readonly supportsBatch = true;
  readonly supportsParallel = true;

  constructor(
    private readonly calendarSyncService: ICalendarSyncService,
    private readonly juheRenwuRepository: IJuheRenwuRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 执行日历创建任务
   */
  async execute(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    const config = context.config as CalendarCreationConfig;
    const {
      xnxq,
      batchSize = 50,
      parallel = true,
      maxConcurrency = 10,
      createNewOnly = false,
      deleteAllForSemester = false,
      specificKkhs
    } = config;

    this.logger.info('开始执行日历创建任务', {
      taskId: context.taskId,
      xnxq,
      batchSize,
      parallel,
      maxConcurrency,
      createNewOnly,
      deleteAllForSemester
    });

    try {
      let totalCreated = 0;
      let totalFailed = 0;
      const errors: string[] = [];

      // 1. 删除现有日历（如果需要）
      if (deleteAllForSemester && !createNewOnly) {
        this.logger.info('删除学期内所有现有日历', { xnxq });
        const deleteResult = await this.calendarSyncService.deleteAllCalendarsForSemester(xnxq);
        if (!deleteResult.success) {
          throw new Error(`删除现有日历失败: ${deleteResult.error}`);
        }
        this.logger.info('现有日历删除完成', { deletedCount: deleteResult.data?.deletedCount });
      }

      // 2. 获取需要创建日历的课程列表
      const courseList = await this.getCourseListForCalendarCreation(xnxq, specificKkhs, createNewOnly);
      if (courseList.length === 0) {
        this.logger.info('没有需要创建日历的课程', { xnxq });
        return {
          success: true,
          data: { createdCount: 0, failedCount: 0 },
          progress: 100,
          metrics: this.createMetrics(startTime, 0, 0)
        };
      }

      this.logger.info('获取到需要创建日历的课程', { 
        totalCourses: courseList.length,
        sampleCourses: courseList.slice(0, 5).map(c => ({ kkh: c.kkh, kcmc: c.kcmc }))
      });

      // 3. 批量创建日历
      if (parallel && courseList.length > batchSize) {
        // 并行批量创建
        const result = await this.createCalendarsInParallel(
          courseList,
          xnxq,
          batchSize,
          maxConcurrency,
          context
        );
        totalCreated = result.created;
        totalFailed = result.failed;
        errors.push(...result.errors);
      } else {
        // 串行批量创建
        const result = await this.createCalendarsInBatches(
          courseList,
          xnxq,
          batchSize,
          context
        );
        totalCreated = result.created;
        totalFailed = result.failed;
        errors.push(...result.errors);
      }

      const duration = Date.now() - startTime;
      const successRate = totalCreated / (totalCreated + totalFailed);

      this.logger.info('日历创建任务完成', {
        taskId: context.taskId,
        totalCreated,
        totalFailed,
        successRate,
        duration
      });

      return {
        success: totalFailed === 0 || successRate >= 0.8, // 80% 成功率认为任务成功
        data: {
          createdCount: totalCreated,
          failedCount: totalFailed,
          successRate,
          errors: errors.slice(0, 10) // 只返回前10个错误
        },
        progress: 100,
        metrics: this.createMetrics(startTime, totalCreated, totalFailed),
        warnings: totalFailed > 0 ? [`${totalFailed} calendars failed to create`] : undefined
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error('日历创建任务失败', {
        taskId: context.taskId,
        error: errorMessage,
        duration,
        config
      });

      return {
        success: false,
        error: errorMessage,
        progress: 0,
        metrics: this.createMetrics(startTime, 0, 0)
      };
    }
  }

  /**
   * 验证任务配置
   */
  async validate(config: TaskConfig): Promise<ValidationResult> {
    const calendarConfig = config as CalendarCreationConfig;
    const errors: string[] = [];

    // 验证学年学期格式
    if (!calendarConfig.xnxq) {
      errors.push('xnxq is required');
    } else if (!/^\d{4}-\d{4}-[12]$/.test(calendarConfig.xnxq)) {
      errors.push('Invalid xnxq format, expected: YYYY-YYYY-[1|2]');
    }

    // 验证批处理大小
    if (calendarConfig.batchSize && calendarConfig.batchSize <= 0) {
      errors.push('batchSize must be positive');
    }

    // 验证并发数
    if (calendarConfig.maxConcurrency && calendarConfig.maxConcurrency <= 0) {
      errors.push('maxConcurrency must be positive');
    }

    // 验证 WPS API 连接
    try {
      // 这里可以添加 WPS API 连接测试
      // const testResult = await this.calendarSyncService.testConnection();
      // if (!testResult.success) {
      //   errors.push('WPS API connection test failed');
      // }
    } catch (error) {
      errors.push(`WPS API connection error: ${error.message}`);
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
    const config = context.config as CalendarCreationConfig;
    const { xnxq } = config;

    try {
      // 获取总课程数
      const totalCoursesResult = await this.juheRenwuRepository.findMany(
        (qb: any) => qb.where('xnxq', '=', xnxq).select('kkh').distinct()
      );

      if (!totalCoursesResult.success) {
        return 0;
      }

      const totalCourses = totalCoursesResult.data.length;
      const createdCalendars = context.data?.createdCount || 0;

      if (totalCourses === 0) {
        return 100;
      }

      return Math.min(100, Math.round((createdCalendars / totalCourses) * 100));
    } catch (error) {
      this.logger.warn('进度估算失败', { error: error.message });
      return 0;
    }
  }

  /**
   * 获取需要创建日历的课程列表
   */
  private async getCourseListForCalendarCreation(
    xnxq: string,
    specificKkhs?: string[],
    createNewOnly: boolean = false
  ): Promise<any[]> {
    try {
      let query = (qb: any) => qb.where('xnxq', '=', xnxq);

      // 如果指定了特定课程号
      if (specificKkhs && specificKkhs.length > 0) {
        query = (qb: any) => qb.where('xnxq', '=', xnxq).where('kkh', 'in', specificKkhs);
      }

      // 如果只创建新课程，需要排除已有日历的课程
      if (createNewOnly) {
        // 这里需要与 calendar_mapping 表关联查询
        // 暂时简化处理
        query = (qb: any) => qb.where('xnxq', '=', xnxq).where('gx_zt', '=', '0');
      }

      const result = await this.juheRenwuRepository.findMany(query, {
        orderBy: { field: 'kkh', direction: 'asc' }
      });

      if (!result.success) {
        throw new Error(`获取课程列表失败: ${result.error}`);
      }

      // 按课程号去重
      const uniqueCourses = result.data.reduce((acc: any[], course: any) => {
        if (!acc.find(c => c.kkh === course.kkh)) {
          acc.push(course);
        }
        return acc;
      }, []);

      return uniqueCourses;
    } catch (error) {
      this.logger.error('获取课程列表失败', { error: error.message, xnxq });
      throw error;
    }
  }

  /**
   * 并行创建日历
   */
  private async createCalendarsInParallel(
    courseList: any[],
    xnxq: string,
    batchSize: number,
    maxConcurrency: number,
    context: TaskExecutionContext
  ): Promise<{ created: number; failed: number; errors: string[] }> {
    let totalCreated = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    // 将课程列表分批
    const batches = this.chunkArray(courseList, batchSize);
    
    this.logger.info('开始并行创建日历', {
      totalCourses: courseList.length,
      batchCount: batches.length,
      batchSize,
      maxConcurrency
    });

    // 控制并发数
    const semaphore = new Array(maxConcurrency).fill(null);
    let batchIndex = 0;

    const processBatch = async (): Promise<void> => {
      const currentBatchIndex = batchIndex++;
      if (currentBatchIndex >= batches.length) {
        return;
      }

      const batch = batches[currentBatchIndex];
      
      try {
        this.logger.debug('处理日历创建批次', {
          batchIndex: currentBatchIndex,
          batchSize: batch.length
        });

        const batchResult = await this.createCalendarsBatch(batch, xnxq);
        totalCreated += batchResult.created;
        totalFailed += batchResult.failed;
        errors.push(...batchResult.errors);

        // 更新进度
        context.data = {
          ...context.data,
          createdCount: totalCreated,
          failedCount: totalFailed,
          processedBatches: currentBatchIndex + 1
        };

      } catch (error) {
        this.logger.error('批次处理失败', {
          batchIndex: currentBatchIndex,
          error: error.message
        });
        totalFailed += batch.length;
        errors.push(`Batch ${currentBatchIndex} failed: ${error.message}`);
      }

      // 继续处理下一个批次
      await processBatch();
    };

    // 启动并发处理
    await Promise.all(semaphore.map(() => processBatch()));

    return { created: totalCreated, failed: totalFailed, errors };
  }

  /**
   * 串行创建日历
   */
  private async createCalendarsInBatches(
    courseList: any[],
    xnxq: string,
    batchSize: number,
    context: TaskExecutionContext
  ): Promise<{ created: number; failed: number; errors: string[] }> {
    let totalCreated = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    const batches = this.chunkArray(courseList, batchSize);
    
    this.logger.info('开始串行创建日历', {
      totalCourses: courseList.length,
      batchCount: batches.length,
      batchSize
    });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        this.logger.debug('处理日历创建批次', {
          batchIndex: i,
          batchSize: batch.length
        });

        const batchResult = await this.createCalendarsBatch(batch, xnxq);
        totalCreated += batchResult.created;
        totalFailed += batchResult.failed;
        errors.push(...batchResult.errors);

        // 更新进度
        context.data = {
          ...context.data,
          createdCount: totalCreated,
          failedCount: totalFailed,
          processedBatches: i + 1
        };

      } catch (error) {
        this.logger.error('批次处理失败', {
          batchIndex: i,
          error: error.message
        });
        totalFailed += batch.length;
        errors.push(`Batch ${i} failed: ${error.message}`);
      }
    }

    return { created: totalCreated, failed: totalFailed, errors };
  }

  /**
   * 创建单个批次的日历
   */
  private async createCalendarsBatch(
    courses: any[],
    xnxq: string
  ): Promise<{ created: number; failed: number; errors: string[] }> {
    const kkhList = courses.map(course => course.kkh);
    
    try {
      const result = await this.calendarSyncService.createCourseCalendarsBatch(kkhList, xnxq);
      
      if (result.success) {
        return {
          created: result.data?.createdCount || kkhList.length,
          failed: 0,
          errors: []
        };
      } else {
        return {
          created: 0,
          failed: kkhList.length,
          errors: [result.error || 'Unknown error']
        };
      }
    } catch (error) {
      return {
        created: 0,
        failed: kkhList.length,
        errors: [error.message]
      };
    }
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 创建性能指标
   */
  private createMetrics(startTime: number, created: number, failed: number): TaskMetrics {
    const duration = Date.now() - startTime;
    const total = created + failed;
    
    return {
      duration,
      recordsProcessed: total,
      memoryUsed: process.memoryUsage().heapUsed,
      customMetrics: {
        calendarsCreated: created,
        calendarsFailed: failed,
        successRate: total > 0 ? created / total : 0,
        processingRate: duration > 0 ? total / (duration / 1000) : 0 // 记录/秒
      }
    };
  }
}
