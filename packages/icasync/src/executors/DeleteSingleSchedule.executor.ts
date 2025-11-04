// @stratix/icasync 删除单个日程处理器
// 用于增量同步工作流中删除单个WPS日程的处理器

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import { WpsScheduleAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { IScheduleMappingRepository } from '../repositories/ScheduleMappingRepository.js';
import type { ICalendarSyncService } from '../services/CalendarSyncService.js';

/**
 * 删除单个日程配置接口
 */
export interface DeleteSingleScheduleConfig {
  juheRenwuId: number; // 聚合任务ID
  kkh: string; // 开课号
  rq: string; // 日期
  startTime: string; // 开始时间
  endTime: string; // 结束时间
  courseName: string; // 课程名称
  dryRun?: boolean; // 是否仅测试运行
}

/**
 * 删除单个日程结果接口
 */
export interface DeleteSingleScheduleResult {
  juheRenwuId: number; // 聚合任务ID
  kkh: string; // 开课号
  calendarId?: string; // 日历ID
  scheduleId?: string; // 日程ID
  deleteOperations: {
    wpsScheduleDeleted: boolean; // WPS日程是否删除成功
    mappingDeleted: boolean; // 映射记录是否删除成功
    juheRenwuUpdated: boolean; // juhe_renwu状态是否更新成功
  };
  duration: number; // 执行时长(ms)
  dryRun: boolean; // 是否为测试运行
  error?: string; // 错误信息
}

/**
 * 删除单个日程处理器
 *
 * 功能：
 * 1. 根据juhe_renwu记录信息查找对应的日历ID
 * 2. 查找对应的schedule_mapping记录
 * 3. 删除WPS日程
 * 4. 删除映射记录
 * 5. 将juhe_renwu记录状态更新为'2'（已删除）
 *
 * 这是增量同步工作流第二步的子节点处理器
 */
@Executor({
  name: 'deleteSingleScheduleProcessor',
  description: '删除单个日程处理器 - 用于增量同步中删除单个WPS日程',
  version: '1.0.0',
  tags: ['delete', 'schedule', 'single', 'incremental'],
  category: 'icasync'
})
export default class DeleteSingleScheduleProcessor implements TaskExecutor {
  readonly name = 'deleteSingleScheduleProcessor';
  readonly description = '删除单个日程处理器';
  readonly version = '1.0.0';

  constructor(
    private scheduleMappingRepository: IScheduleMappingRepository,
    private juheRenwuRepository: IJuheRenwuRepository,
    private calendarMappingRepository: ICalendarMappingRepository,
    private calendarSyncService: ICalendarSyncService,
    private logger: Logger,
    private wasV7ApiSchedule: WpsScheduleAdapter
  ) {}

  /**
   * 执行删除单个日程任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as DeleteSingleScheduleConfig;

    this.logger.info('开始执行删除单个日程任务', {
      juheRenwuId: config.juheRenwuId,
      kkh: config.kkh,
      rq: config.rq,
      courseName: config.courseName,
      dryRun: config.dryRun
    });

    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return left(validation.error
        );
      }

      // 执行删除单个日程
      const result = await this.performDeleteSingleSchedule(config);

      result.duration = Date.now() - startTime;

      this.logger.info('删除单个日程任务完成', {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh,
        calendarId: result.calendarId,
        scheduleId: result.scheduleId,
        deleteOperations: result.deleteOperations,
        duration: result.duration,
        dryRun: result.dryRun,
        success: !result.error
      });

      return {
        success: !result.error,
        data: result,
        error: result.error
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('删除单个日程任务失败', {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh,
        duration,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        data: {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          deleteOperations: {
            wpsScheduleDeleted: false,
            mappingDeleted: false,
            juheRenwuUpdated: false
          },
          duration,
          dryRun: config.dryRun || false,
          error: errorMessage
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: DeleteSingleScheduleConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.juheRenwuId || config.juheRenwuId <= 0) {
      return { valid: false, error: '聚合任务ID不能为空且必须为正数' };
    }

    if (!config.kkh) {
      return { valid: false, error: '开课号不能为空' };
    }

    if (!config.rq) {
      return { valid: false, error: '日期不能为空' };
    }

    if (!config.startTime || !config.endTime) {
      return { valid: false, error: '开始时间和结束时间不能为空' };
    }

    if (!config.courseName) {
      return { valid: false, error: '课程名称不能为空' };
    }

    return { valid: true };
  }

  /**
   * 执行删除单个日程
   */
  private async performDeleteSingleSchedule(
    config: DeleteSingleScheduleConfig
  ): Promise<DeleteSingleScheduleResult> {
    let calendarId: string | undefined;
    let scheduleId: string | undefined;

    const deleteOperations = {
      wpsScheduleDeleted: false,
      mappingDeleted: false,
      juheRenwuUpdated: false
    };

    let error: string | undefined;

    try {
      this.logger.debug('开始删除单个日程', {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh,
        dryRun: config.dryRun
      });

      // 1. 查找日历映射获取日历ID
      const calendarMappingResult =
        await this.calendarMappingRepository.findByKkh(config.kkh);
      if (!calendarMappingResult.success || !calendarMappingResult.right) {
        const errorMsg = `未找到开课号${config.kkh}对应的日历映射`;
        this.logger.warn(errorMsg, {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh
        });
        error = errorMsg;
      } else {
        calendarId = calendarMappingResult.right.calendar_id;
        this.logger.debug('找到日历映射', {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          calendarId
        });
      }

      // 2. 查找日程映射记录
      const scheduleListResult = await this.wasV7ApiSchedule.getScheduleList({
        calendar_id: calendarId!,
        start_time: config.startTime,
        end_time: config.endTime
      });
      const scheduleList = scheduleListResult.items;
      if (!scheduleList || scheduleList.length === 0) {
        const errorMsg = `未找到聚合任务${config.juheRenwuId}对应的日程映射`;
        this.logger.warn(errorMsg, { juheRenwuId: config.juheRenwuId });

        // 如果没有找到映射记录，直接更新juhe_renwu状态
        if (!config.dryRun) {
          const updateResult = await this.updateJuheRenwuStatus(
            config.juheRenwuId,
            '2'
          );
          deleteOperations.juheRenwuUpdated = updateResult;
        } else {
          deleteOperations.juheRenwuUpdated = true;
          this.logger.debug('[测试运行] 将更新juhe_renwu状态', {
            juheRenwuId: config.juheRenwuId,
            newStatus: '2'
          });
        }

        error = errorMsg;
        return {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          calendarId,
          scheduleId,
          deleteOperations,
          duration: 0, // 将在上层设置
          dryRun: config.dryRun || false,
          error
        };
      } else {
        for (const schedule of scheduleList) {
          try {
            if (!config.dryRun && schedule.summary === config.courseName) {
              scheduleId = schedule.id;
              this.logger.debug('找到对应的日程', {
                juheRenwuId: config.juheRenwuId,
                scheduleId
              });
              await this.wasV7ApiSchedule.deleteSchedule({
                calendar_id: calendarId!,
                event_id: scheduleId!
              });
              deleteOperations.wpsScheduleDeleted = true;
            } else {
              this.logger.warn('未找到对应的日程', {
                juheRenwuId: config.juheRenwuId,
                courseName: config.courseName
              });
              deleteOperations.wpsScheduleDeleted = false;
            }
            await this.updateJuheRenwuStatus(config.juheRenwuId, '2');
          } catch (error) {
            this.logger.error('删除日程异常', {
              juheRenwuId: config.juheRenwuId,
              error: error instanceof Error ? error.message : String(error)
            });
            deleteOperations.wpsScheduleDeleted = false;
          }
        }

        return {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          calendarId,
          scheduleId,
          deleteOperations,
          duration: 0, // 将在上层设置
          dryRun: config.dryRun || false,
          error
        };
      }
    } catch (processError) {
      const errorMsg = `处理删除单个日程时发生错误: ${processError instanceof Error ? processError.message : String(processError)}`;
      this.logger.error(errorMsg, {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh
      });

      return {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh,
        calendarId,
        scheduleId,
        deleteOperations,
        duration: 0,
        dryRun: config.dryRun || false,
        error: errorMsg
      };
    }
  }

  /**
   * 更新juhe_renwu记录状态
   */
  private async updateJuheRenwuStatus(
    juheRenwuId: number,
    newStatus: string
  ): Promise<boolean> {
    try {
      const updateResult = await this.juheRenwuRepository.updateGxZtById(
        juheRenwuId,
        newStatus
      );
      if (isRight(updateResult)) {
        this.logger.debug('juhe_renwu状态更新成功', {
          juheRenwuId,
          newStatus
        });
        return true;
      } else {
        this.logger.error('juhe_renwu状态更新失败', {
          juheRenwuId,
          newStatus,
          error: updateResult.left
        });
        return false;
      }
    } catch (error) {
      this.logger.error('更新juhe_renwu状态时发生异常', {
        juheRenwuId,
        newStatus,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查所有依赖服务是否可用
      if (
        !this.scheduleMappingRepository ||
        !this.juheRenwuRepository ||
        !this.calendarMappingRepository ||
        !this.calendarSyncService
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
