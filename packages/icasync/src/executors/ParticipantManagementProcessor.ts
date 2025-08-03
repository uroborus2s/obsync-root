// @stratix/icasync 参与者管理处理器
// 负责批量添加日历参与者，完全基于 Service 层架构

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ICalendarSyncService } from '../services/CalendarSyncService.js';

/**
 * 参与者管理配置接口
 */
export interface ParticipantManagementConfig {
  xnxq: string;                    // 学年学期
  batchSize?: number;              // 批处理大小
  maxConcurrency?: number;         // 最大并发数
  timeout?: number;                // 超时时间(ms)
}

/**
 * 参与者管理结果接口
 */
export interface ParticipantManagementResult {
  processedCalendars: number;      // 处理日历数
  addedParticipants: number;       // 添加参与者数
  errorCount: number;              // 错误记录数
  duration: number;                // 执行时长(ms)
  errors?: string[];               // 错误信息列表
}

/**
 * 参与者管理处理器
 * 
 * 功能：
 * 1. 通过 CalendarSyncService 获取已创建的日历
 * 2. 为每个日历添加参与者（教师和学生）
 * 3. 处理添加结果和错误信息
 * 4. 更新日历状态
 */
@Executor({
  name: 'participantManagementProcessor',
  description: '参与者管理处理器 - 基于Service层架构批量添加日历参与者',
  version: '2.0.0', // 版本升级，反映完整重构
  tags: ['participant', 'calendar', 'permission', 'was-v7', 'refactored'],
  category: 'icasync'
})
export default class ParticipantManagementProcessor implements TaskExecutor {
  readonly name = 'participantManagementProcessor';
  readonly description = '参与者管理处理器';
  readonly version = '2.0.0';

  constructor(
    private calendarSyncService: ICalendarSyncService,
    private logger: Logger
  ) {}

  /**
   * 执行参与者管理任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as ParticipantManagementConfig;

    this.logger.info('开始执行参与者管理任务', {
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

      // 执行参与者管理
      const result = await this.performParticipantManagement(config);
      
      result.duration = Date.now() - startTime;

      this.logger.info('参与者管理任务完成', {
        xnxq: config.xnxq,
        processedCalendars: result.processedCalendars,
        addedParticipants: result.addedParticipants,
        duration: result.duration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('参与者管理任务失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          processedCalendars: 0,
          addedParticipants: 0,
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
  validateConfig(config: ParticipantManagementConfig): { valid: boolean; error?: string } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    if (config.batchSize && (config.batchSize <= 0 || config.batchSize > 500)) {
      return { valid: false, error: '批处理大小必须在1-500之间' };
    }

    if (config.maxConcurrency && (config.maxConcurrency <= 0 || config.maxConcurrency > 20)) {
      return { valid: false, error: '最大并发数必须在1-20之间' };
    }

    return { valid: true };
  }

  /**
   * 执行参与者管理
   */
  private async performParticipantManagement(config: ParticipantManagementConfig): Promise<ParticipantManagementResult> {
    const batchSize = config.batchSize || 100;
    let processedCalendars = 0;
    let addedParticipants = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      this.logger.info('开始获取已创建的日历', { xnxq: config.xnxq });

      // 通过 CalendarSyncService 获取已创建的日历列表
      const calendars = await this.calendarSyncService.getCreatedCalendars(config.xnxq, batchSize);
      processedCalendars = calendars.length;

      if (calendars.length === 0) {
        this.logger.info('没有待处理的参与者管理任务', { xnxq: config.xnxq });
        return {
          processedCalendars: 0,
          addedParticipants: 0,
          errorCount: 0,
          duration: 0
        };
      }

      this.logger.info('开始批量添加参与者', {
        xnxq: config.xnxq,
        calendarCount: calendars.length
      });

      // 为每个日历添加参与者
      for (const calendar of calendars) {
        try {
          this.logger.debug('为日历添加参与者', {
            calendarId: calendar.calendar_id,
            kkh: calendar.kkh
          });

          const participantResult = await this.calendarSyncService.addCalendarParticipants(
            calendar.calendar_id,
            calendar.kkh,
            {
              timeout: config.timeout || 30000,
              retryCount: 3
            }
          );

          addedParticipants += participantResult.addedCount;
          
          if (participantResult.errors.length > 0) {
            errorCount += participantResult.errors.length;
            errors.push(...participantResult.errors);
          }

          this.logger.debug('参与者添加完成', {
            calendarId: calendar.calendar_id,
            kkh: calendar.kkh,
            addedCount: participantResult.addedCount
          });

        } catch (error) {
          errorCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`日历${calendar.calendar_id}(${calendar.kkh})参与者添加失败: ${errorMsg}`);
          this.logger.warn('参与者添加失败', {
            calendarId: calendar.calendar_id,
            kkh: calendar.kkh,
            error: errorMsg
          });
        }
      }

      this.logger.info('参与者管理完成', {
        xnxq: config.xnxq,
        processedCalendars,
        addedParticipants,
        errorCount
      });

      return {
        processedCalendars,
        addedParticipants,
        errorCount,
        duration: 0, // 将在上层设置
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('参与者管理过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      return {
        processedCalendars,
        addedParticipants,
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
