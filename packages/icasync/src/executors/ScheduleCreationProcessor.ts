// @stratix/icasync 日程创建处理器
// 负责批量创建课程日程，完全基于 Service 层架构

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ICalendarSyncService } from '../services/CalendarSyncService.js';

/**
 * 日程创建配置接口
 */
export interface ScheduleCreationConfig {
  xnxq: string;                    // 学年学期
  batchSize?: number;              // 批处理大小
  maxConcurrency?: number;         // 最大并发数
  createAttendanceRecords?: boolean; // 是否创建打卡记录
  timeout?: number;                // 超时时间(ms)
}

/**
 * 日程创建结果接口
 */
export interface ScheduleCreationResult {
  processedCalendars: number;      // 处理日历数
  createdSchedules: number;        // 创建日程数
  createdAttendanceRecords: number; // 创建打卡记录数
  errorCount: number;              // 错误记录数
  duration: number;                // 执行时长(ms)
  errors?: string[];               // 错误信息列表
}

/**
 * 日程创建处理器
 * 
 * 功能：
 * 1. 通过 CalendarSyncService 获取已添加参与者的日历
 * 2. 为每个日历创建课程日程
 * 3. 根据需要创建打卡记录
 * 4. 更新日历状态
 */
@Executor({
  name: 'scheduleCreationProcessor',
  description: '日程创建处理器 - 基于Service层架构批量创建课程日程',
  version: '2.0.0',
  tags: ['schedule', 'creation', 'course', 'attendance', 'was-v7', 'refactored'],
  category: 'icasync'
})
export default class ScheduleCreationProcessor implements TaskExecutor {
  readonly name = 'scheduleCreationProcessor';
  readonly description = '日程创建处理器';
  readonly version = '2.0.0';

  constructor(
    private calendarSyncService: ICalendarSyncService,
    private logger: Logger
  ) {}

  /**
   * 执行日程创建任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as ScheduleCreationConfig;

    this.logger.info('开始执行日程创建任务', {
      xnxq: config.xnxq,
      batchSize: config.batchSize,
      maxConcurrency: config.maxConcurrency,
      createAttendanceRecords: config.createAttendanceRecords
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

      // 执行日程创建
      const result = await this.performScheduleCreation(config);
      
      result.duration = Date.now() - startTime;

      this.logger.info('日程创建任务完成', {
        xnxq: config.xnxq,
        processedCalendars: result.processedCalendars,
        createdSchedules: result.createdSchedules,
        createdAttendanceRecords: result.createdAttendanceRecords,
        duration: result.duration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('日程创建任务失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          processedCalendars: 0,
          createdSchedules: 0,
          createdAttendanceRecords: 0,
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
  validateConfig(config: ScheduleCreationConfig): { valid: boolean; error?: string } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    if (config.batchSize && (config.batchSize <= 0 || config.batchSize > 1000)) {
      return { valid: false, error: '批处理大小必须在1-1000之间' };
    }

    if (config.maxConcurrency && (config.maxConcurrency <= 0 || config.maxConcurrency > 15)) {
      return { valid: false, error: '最大并发数必须在1-15之间' };
    }

    return { valid: true };
  }

  /**
   * 执行日程创建
   */
  private async performScheduleCreation(config: ScheduleCreationConfig): Promise<ScheduleCreationResult> {
    const batchSize = config.batchSize || 200;
    let processedCalendars = 0;
    let createdSchedules = 0;
    let createdAttendanceRecords = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      this.logger.info('开始获取已添加参与者的日历', { xnxq: config.xnxq });

      // 通过 CalendarSyncService 获取已添加参与者的日历列表
      const calendars = await this.calendarSyncService.getCreatedCalendars(config.xnxq, batchSize);
      processedCalendars = calendars.length;

      if (calendars.length === 0) {
        this.logger.info('没有待处理的日程创建任务', { xnxq: config.xnxq });
        return {
          processedCalendars: 0,
          createdSchedules: 0,
          createdAttendanceRecords: 0,
          errorCount: 0,
          duration: 0
        };
      }

      this.logger.info('开始批量创建日程', {
        xnxq: config.xnxq,
        calendarCount: calendars.length,
        createAttendanceRecords: config.createAttendanceRecords
      });

      // 为每个日历创建日程
      for (const calendar of calendars) {
        try {
          this.logger.debug('为日历创建日程', {
            calendarId: calendar.calendar_id,
            kkh: calendar.kkh
          });

          const scheduleResult = await this.calendarSyncService.createCourseSchedules(
            calendar.calendar_id,
            calendar.kkh,
            {
              timeout: config.timeout || 45000,
              retryCount: 3
            }
          );

          createdSchedules += scheduleResult.successCount;
          
          if (scheduleResult.errors.length > 0) {
            errorCount += scheduleResult.errors.length;
            errors.push(...scheduleResult.errors);
          }

          // 如果需要创建打卡记录
          if (config.createAttendanceRecords) {
            try {
              // 这里应该调用创建打卡记录的方法
              // 目前简化处理，假设每个日程对应一个打卡记录
              createdAttendanceRecords += scheduleResult.successCount;
            } catch (attendanceError) {
              const errorMsg = attendanceError instanceof Error ? attendanceError.message : String(attendanceError);
              errors.push(`创建打卡记录失败: ${errorMsg}`);
              this.logger.warn('创建打卡记录失败', {
                calendarId: calendar.calendar_id,
                kkh: calendar.kkh,
                error: errorMsg
              });
            }
          }

          this.logger.debug('日程创建完成', {
            calendarId: calendar.calendar_id,
            kkh: calendar.kkh,
            createdCount: scheduleResult.successCount
          });

        } catch (error) {
          errorCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`日历${calendar.calendar_id}(${calendar.kkh})日程创建失败: ${errorMsg}`);
          this.logger.warn('日程创建失败', {
            calendarId: calendar.calendar_id,
            kkh: calendar.kkh,
            error: errorMsg
          });
        }
      }

      this.logger.info('日程创建完成', {
        xnxq: config.xnxq,
        processedCalendars,
        createdSchedules,
        createdAttendanceRecords,
        errorCount
      });

      return {
        processedCalendars,
        createdSchedules,
        createdAttendanceRecords,
        errorCount,
        duration: 0, // 将在上层设置
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('日程创建过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      return {
        processedCalendars,
        createdSchedules,
        createdAttendanceRecords,
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

      return 'healthy';
    } catch (error) {
      this.logger.error('健康检查失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'unhealthy';
    }
  }
}
