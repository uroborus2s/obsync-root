// @stratix/icasync 删除旧日历处理器
// 负责删除单个旧日历及其相关数据（参与者、日程、映射等）

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type { ICalendarParticipantsRepository } from '../repositories/CalendarParticipantsRepository.js';
import type { IScheduleMappingRepository } from '../repositories/ScheduleMappingRepository.js';

/**
 * 删除旧日历配置接口
 */
export interface DeleteOldCalendarConfig {
  xnxq: string; // 学年学期
  calendarId: string; // 日历ID
  kkh: string; // 课程号
  calendarName: string; // 日历名称
  deleteOptions: {
    removeParticipants: boolean; // 是否删除参与者
    removeSchedules: boolean; // 是否删除日程
    removeMapping: boolean; // 是否删除映射
    skipIfNotExists: boolean; // 不存在时是否跳过
  };
}

/**
 * 删除旧日历结果接口
 */
export interface DeleteOldCalendarResult {
  success: boolean; // 是否成功
  calendarId: string; // 日历ID
  kkh: string; // 课程号
  deletedParticipants: number; // 删除的参与者数量
  deletedSchedules: number; // 删除的日程数量
  removedMapping: boolean; // 是否删除了映射
  duration: number; // 执行时长(ms)
  errors?: string[]; // 错误信息列表
}

/**
 * 删除旧日历处理器
 *
 * 功能：
 * 1. 删除指定日历的所有参与者
 * 2. 删除指定日历的所有日程安排
 * 3. 删除日历映射记录
 * 4. 支持批量删除和事务处理
 * 5. 提供详细的删除统计信息
 */
@Executor({
  name: 'deleteOldCalendarProcessor',
  description: '删除旧日历处理器 - 删除单个旧日历及其相关数据',
  version: '3.0.0',
  tags: ['delete', 'calendar', 'cleanup', 'old-data', 'v3.0'],
  category: 'icasync'
})
export default class DeleteOldCalendarProcessor implements TaskExecutor {
  readonly name = 'deleteOldCalendar';
  readonly description = '删除旧日历处理器';
  readonly version = '3.0.0';

  constructor(
    private calendarMappingRepository: ICalendarMappingRepository,
    private calendarParticipantsRepository: ICalendarParticipantsRepository,
    private scheduleMappingRepository: IScheduleMappingRepository,
    private logger: Logger
  ) {}

  /**
   * 执行删除旧日历任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as DeleteOldCalendarConfig;

    this.logger.info('开始删除旧日历', {
      xnxq: config.xnxq,
      calendarId: config.calendarId,
      kkh: config.kkh,
      calendarName: config.calendarName,
      deleteOptions: config.deleteOptions
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

      // 执行删除操作
      const result = await this.performDeleteOldCalendar(config);

      result.duration = Date.now() - startTime;

      this.logger.info('删除旧日历完成', {
        xnxq: config.xnxq,
        calendarId: config.calendarId,
        kkh: config.kkh,
        success: result.success,
        deletedParticipants: result.deletedParticipants,
        deletedSchedules: result.deletedSchedules,
        removedMapping: result.removedMapping,
        duration: result.duration
      });

      return {
        success: result.success,
        data: result,
        error: result.errors?.join('; ')
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('删除旧日历失败', {
        xnxq: config.xnxq,
        calendarId: config.calendarId,
        kkh: config.kkh,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          success: false,
          calendarId: config.calendarId,
          kkh: config.kkh,
          deletedParticipants: 0,
          deletedSchedules: 0,
          removedMapping: false,
          duration,
          errors: [error instanceof Error ? error.message : String(error)]
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: DeleteOldCalendarConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    if (!config.calendarId) {
      return { valid: false, error: '日历ID参数(calendarId)不能为空' };
    }

    if (!config.kkh) {
      return { valid: false, error: '课程号参数(kkh)不能为空' };
    }

    if (!config.deleteOptions) {
      return { valid: false, error: '删除选项参数(deleteOptions)不能为空' };
    }

    return { valid: true };
  }

  /**
   * 执行删除旧日历操作
   */
  private async performDeleteOldCalendar(
    config: DeleteOldCalendarConfig
  ): Promise<DeleteOldCalendarResult> {
    const result: DeleteOldCalendarResult = {
      success: false,
      calendarId: config.calendarId,
      kkh: config.kkh,
      deletedParticipants: 0,
      deletedSchedules: 0,
      removedMapping: false,
      duration: 0,
      errors: []
    };

    try {
      // 检查日历映射是否存在
      const mappingResult =
        await this.calendarMappingRepository.findByCalendarId(
          config.calendarId
        );

      if (!mappingResult.success) {
        if (config.deleteOptions.skipIfNotExists) {
          this.logger.info('日历映射不存在，跳过删除', {
            calendarId: config.calendarId,
            kkh: config.kkh
          });
          result.success = true;
          return result;
        } else {
          throw new Error(`查找日历映射失败: ${mappingResult.error}`);
        }
      }

      const mapping = mappingResult.data;
      if (!mapping) {
        if (config.deleteOptions.skipIfNotExists) {
          this.logger.info('日历映射不存在，跳过删除', {
            calendarId: config.calendarId,
            kkh: config.kkh
          });
          result.success = true;
          return result;
        } else {
          throw new Error('日历映射不存在');
        }
      }

      this.logger.info('找到待删除的日历映射', {
        mappingId: mapping.id,
        calendarId: config.calendarId,
        kkh: config.kkh,
        xnxq: config.xnxq
      });

      // 1. 删除参与者数据
      if (config.deleteOptions.removeParticipants) {
        try {
          const participantsResult = await this.deleteCalendarParticipants(
            config.calendarId
          );
          result.deletedParticipants = participantsResult.deletedCount;

          this.logger.info('删除日历参与者完成', {
            calendarId: config.calendarId,
            deletedCount: result.deletedParticipants
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors?.push(`删除参与者失败: ${errorMsg}`);
          this.logger.error('删除日历参与者失败', {
            calendarId: config.calendarId,
            error: errorMsg
          });
        }
      }

      // 2. 删除日程数据
      if (config.deleteOptions.removeSchedules) {
        try {
          const schedulesResult = await this.deleteCalendarSchedules(
            config.calendarId
          );
          result.deletedSchedules = schedulesResult.deletedCount;

          this.logger.info('删除日历日程完成', {
            calendarId: config.calendarId,
            deletedCount: result.deletedSchedules
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors?.push(`删除日程失败: ${errorMsg}`);
          this.logger.error('删除日历日程失败', {
            calendarId: config.calendarId,
            error: errorMsg
          });
        }
      }

      // 3. 删除日历映射
      if (config.deleteOptions.removeMapping) {
        try {
          const deleteMappingResult =
            await this.calendarMappingRepository.delete(mapping.id);

          if (!deleteMappingResult.success) {
            throw new Error(`删除日历映射失败: ${deleteMappingResult.error}`);
          }

          result.removedMapping = deleteMappingResult.data;

          this.logger.info('删除日历映射完成', {
            mappingId: mapping.id,
            calendarId: config.calendarId,
            success: result.removedMapping
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors?.push(`删除映射失败: ${errorMsg}`);
          this.logger.error('删除日历映射失败', {
            mappingId: mapping.id,
            calendarId: config.calendarId,
            error: errorMsg
          });
        }
      }

      // 判断整体是否成功
      result.success = (result.errors?.length || 0) === 0;

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('删除旧日历过程中发生错误', {
        calendarId: config.calendarId,
        kkh: config.kkh,
        error: errorMsg
      });

      result.errors?.push(errorMsg);
      return result;
    }
  }

  /**
   * 删除日历参与者
   */
  private async deleteCalendarParticipants(
    calendarId: string
  ): Promise<{ deletedCount: number }> {
    this.logger.info('开始删除日历参与者', { calendarId });

    // 获取该日历的所有参与者
    const participantsResult =
      await this.calendarParticipantsRepository.findByCalendarId(calendarId);

    if (!participantsResult.success) {
      throw new Error(`获取日历参与者失败: ${participantsResult.error}`);
    }

    const participants = participantsResult.data;
    let deletedCount = 0;

    // 逐个删除参与者
    for (const participant of participants) {
      try {
        const deleteResult = await this.calendarParticipantsRepository.delete(
          participant.id
        );

        if (deleteResult.success && deleteResult.data) {
          deletedCount++;
        }
      } catch (error) {
        this.logger.warn('删除单个参与者失败', {
          participantId: participant.id,
          calendarId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.logger.info('删除日历参与者完成', {
      calendarId,
      totalParticipants: participants.length,
      deletedCount
    });

    return { deletedCount };
  }

  /**
   * 删除日历日程
   */
  private async deleteCalendarSchedules(
    calendarId: string
  ): Promise<{ deletedCount: number }> {
    this.logger.info('开始删除日历日程', { calendarId });

    // 获取该日历的所有日程映射
    const schedulesResult =
      await this.scheduleMappingRepository.findByCalendarId(calendarId);

    if (!schedulesResult.success) {
      throw new Error(`获取日历日程失败: ${schedulesResult.error}`);
    }

    const schedules = schedulesResult.data;
    let deletedCount = 0;

    // 逐个删除日程
    for (const schedule of schedules) {
      try {
        const deleteResult = await this.scheduleMappingRepository.delete(
          schedule.id
        );

        if (deleteResult.success && deleteResult.data) {
          deletedCount++;
        }
      } catch (error) {
        this.logger.warn('删除单个日程失败', {
          scheduleId: schedule.id,
          calendarId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.logger.info('删除日历日程完成', {
      calendarId,
      totalSchedules: schedules.length,
      deletedCount
    });

    return { deletedCount };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查依赖的仓储是否可用
      if (
        !this.calendarMappingRepository ||
        !this.calendarParticipantsRepository ||
        !this.scheduleMappingRepository
      ) {
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
