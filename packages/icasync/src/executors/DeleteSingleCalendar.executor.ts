// @stratix/icasync 删除单个日历处理器
// 负责删除单个日历及其相关的参与者、日程等数据，并清理映射表记录

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type { ICalendarSyncService } from '../services/CalendarSyncService.js';

/**
 * 删除单个日历配置接口
 */
export interface DeleteSingleCalendarConfig {
  calendarId: string; // 日历ID
  kkh: string; // 课程号
  xnxq: string; // 学年学期
  deleteMode?: 'complete' | 'soft' | 'mapping-only'; // 删除模式
  cleanupMapping?: boolean; // 是否清理映射表记录
  deleteParticipants?: boolean; // 是否删除参与者
  deleteSchedules?: boolean; // 是否删除日程
  forceDelete?: boolean; // 是否强制删除
}

/**
 * 删除单个日历结果接口
 */
export interface DeleteSingleCalendarResult {
  calendarId: string; // 日历ID
  kkh: string; // 课程号
  xnxq: string; // 学年学期
  deleteMode: string; // 删除模式
  success: boolean; // 是否成功
  deletedItems: {
    calendar: boolean; // 日历是否删除
    participants: number; // 删除的参与者数量
    schedules: number; // 删除的日程数量
    mapping: boolean; // 映射记录是否删除
  };
  duration: number; // 执行时长(ms)
  error?: string; // 错误信息
}

/**
 * 删除单个日历处理器
 *
 * 功能：
 * 1. 根据配置删除指定的日历
 * 2. 可选择删除相关的参与者和日程数据
 * 3. 清理icasync_calendar_mapping表中的映射记录
 * 4. 支持多种删除模式（完全删除、软删除、仅删除映射）
 * 5. 提供详细的删除结果统计
 */
@Executor({
  name: 'deleteSingleCalendar',
  description: '删除单个日历处理器 - 删除指定日历及其相关数据',
  version: '1.0.0',
  tags: ['calendar', 'delete', 'cleanup', 'single'],
  category: 'icasync'
})
export default class DeleteSingleCalendarProcessor implements TaskExecutor {
  readonly name = 'deleteSingleCalendar';
  readonly description = '删除单个日历处理器';
  readonly version = '1.0.0';

  constructor(
    private calendarMappingRepository: ICalendarMappingRepository,
    private calendarSyncService: ICalendarSyncService,
    private logger: Logger
  ) {}

  /**
   * 执行删除单个日历任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as DeleteSingleCalendarConfig;

    this.logger.info('开始执行删除单个日历任务', {
      calendarId: config.calendarId,
      kkh: config.kkh,
      xnxq: config.xnxq,
      deleteMode: config.deleteMode || 'complete'
    });

    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return left(validation.error
        );
      }

      // 执行删除操作
      const result = await this.performDeleteSingleCalendar(config);
      result.duration = Date.now() - startTime;

      this.logger.info('删除单个日历任务完成', {
        calendarId: config.calendarId,
        kkh: config.kkh,
        success: result.success,
        deletedItems: result.deletedItems,
        duration: result.duration
      });

      return {
        success: result.success,
        data: result,
        error: result.error
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.logger.error('删除单个日历任务失败', {
        calendarId: config.calendarId,
        kkh: config.kkh,
        duration,
        error: errorMsg
      });

      return {
        success: false,
        error: errorMsg,
        data: {
          calendarId: config.calendarId,
          kkh: config.kkh,
          xnxq: config.xnxq,
          deleteMode: config.deleteMode || 'complete',
          success: false,
          deletedItems: {
            calendar: false,
            participants: 0,
            schedules: 0,
            mapping: false
          },
          duration,
          error: errorMsg
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: DeleteSingleCalendarConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.calendarId) {
      return { valid: false, error: '日历ID(calendarId)不能为空' };
    }

    if (!config.kkh) {
      return { valid: false, error: '课程号(kkh)不能为空' };
    }

    if (!config.xnxq) {
      return { valid: false, error: '学年学期(xnxq)不能为空' };
    }

    // 验证学年学期格式
    const xnxqPattern = /^\d{4}-\d{4}-[12]$/;
    if (!xnxqPattern.test(config.xnxq)) {
      return {
        valid: false,
        error: '学年学期格式不正确，应为YYYY-YYYY-N格式（如：2024-2025-1）'
      };
    }

    // 验证删除模式
    const validModes = ['complete', 'soft', 'mapping-only'];
    if (config.deleteMode && !validModes.includes(config.deleteMode)) {
      return {
        valid: false,
        error: `删除模式不正确，支持的模式：${validModes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * 执行删除单个日历操作
   */
  private async performDeleteSingleCalendar(
    config: DeleteSingleCalendarConfig
  ): Promise<DeleteSingleCalendarResult> {
    const deleteMode = config.deleteMode || 'complete';
    const result: DeleteSingleCalendarResult = {
      calendarId: config.calendarId,
      kkh: config.kkh,
      xnxq: config.xnxq,
      deleteMode,
      success: false,
      deletedItems: {
        calendar: false,
        participants: 0,
        schedules: 0,
        mapping: false
      },
      duration: 0
    };

    try {
      this.logger.info('开始删除日历数据', {
        calendarId: config.calendarId,
        kkh: config.kkh,
        deleteMode
      });

      // 根据删除模式执行不同的删除策略
      switch (deleteMode) {
        case 'complete':
          await this.performCompleteDelete(config, result);
          break;
        case 'soft':
          await this.performSoftDelete(config, result);
          break;
        case 'mapping-only':
          await this.performMappingOnlyDelete(config, result);
          break;
        default:
          throw new Error(`不支持的删除模式: ${deleteMode}`);
      }

      result.success = true;

      this.logger.info('日历删除操作完成', {
        calendarId: config.calendarId,
        kkh: config.kkh,
        deleteMode,
        deletedItems: result.deletedItems
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.error = errorMsg;
      result.success = false;

      this.logger.error('删除日历过程中发生错误', {
        calendarId: config.calendarId,
        kkh: config.kkh,
        deleteMode,
        error: errorMsg
      });

      return result;
    }
  }

  /**
   * 执行完全删除
   */
  private async performCompleteDelete(
    config: DeleteSingleCalendarConfig,
    result: DeleteSingleCalendarResult
  ): Promise<void> {
    // // 1. 删除日历相关数据（参与者、日程等）
    // if (config.deleteParticipants !== false) {
    //   const participantsResult = await this.calendarSyncService.deleteCalendarParticipants(
    //     config.calendarId
    //   );
    //   result.deletedItems.participants = participantsResult.deletedCount || 0;
    // }

    // if (config.deleteSchedules !== false) {
    //   const schedulesResult = await this.calendarSyncService.deleteCalendarSchedules(
    //     config.calendarId
    //   );
    //   result.deletedItems.schedules = schedulesResult.deletedCount || 0;
    // }

    // 2. 删除日历本身
    const calendarResult = await this.calendarSyncService.deleteCalendar(
      config.calendarId
    );
    result.deletedItems.calendar = calendarResult.success;

    // 3. 清理映射表记录
    if (config.cleanupMapping !== false) {
      const mappingResult =
        await this.calendarMappingRepository.deleteByCalendarId(
          config.calendarId
        );
      result.deletedItems.mapping = mappingResult.success;
    }
  }

  /**
   * 执行软删除
   */
  private async performSoftDelete(
    config: DeleteSingleCalendarConfig,
    result: DeleteSingleCalendarResult
  ): Promise<void> {
    // 软删除：只标记为删除状态，不实际删除数据
    const softDeleteResult = await this.calendarSyncService.softDeleteCalendar(
      config.calendarId
    );
    result.deletedItems.calendar = softDeleteResult.success;

    // 更新映射表状态
    if (config.cleanupMapping !== false) {
      const mappingResult = await this.calendarMappingRepository.markAsDeleted(
        config.calendarId
      );
      result.deletedItems.mapping = mappingResult.success;
    }
  }

  /**
   * 仅删除映射记录
   */
  private async performMappingOnlyDelete(
    config: DeleteSingleCalendarConfig,
    result: DeleteSingleCalendarResult
  ): Promise<void> {
    // 只删除映射表记录，保留实际的日历数据
    const mappingResult =
      await this.calendarMappingRepository.deleteByCalendarId(
        config.calendarId
      );
    result.deletedItems.mapping = mappingResult.success;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查依赖的服务是否可用
      if (!this.calendarMappingRepository || !this.calendarSyncService) {
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
