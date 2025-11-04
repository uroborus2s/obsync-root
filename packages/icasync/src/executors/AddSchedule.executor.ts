/**
 * 创建日程执行器
 *
 * 功能：
 * 1. 接收分组的日程数据和日历ID
 * 2. 调用WPS API批量创建日程
 * 3. 处理API调用失败、部分创建成功等情况
 */

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { WpsScheduleAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type { ICourseRawRepository } from '../repositories/CourseRawRepository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type {
  ScheduleData,
  WpsScheduleData
} from './FetchSchedulesExecutor.js';

/**
 * 创建日程配置接口
 */
export interface CreateSchedulesConfig {
  /** 开课号 */
  kkh: string;
  /** 学年学期 */
  xnxq: string;
  /** 日程数组（最多200个） */
  schedules: ScheduleData[];
  /** 批次索引（用于日志记录） */
  batch_index?: number;
}

/**
 * 创建日程结果接口
 */
export interface CreateSchedulesResult {
  /** 是否成功 */
  success: boolean;
  /** 日历ID */
  calendar_id: string;
  /** 处理的日程数量 */
  schedule_count: number;
  /** 成功创建的日程数量 */
  success_count: number;
  /** 批次索引 */
  batch_index?: number;
  /** 创建的日程详情 */
  created_schedules?: Array<{
    id: string;
    summary: string;
    start_time?: any;
    end_time?: any;
  }>;
  /** 错误信息 */
  error?: string;
  /** 执行时长(ms) */
  duration: number;
}

/**
 * 创建日程执行器
 */
@Executor({
  name: 'addSchedule',
  description: '创建日程执行器 - 将日程添加到指定日历',
  version: '1.0.0',
  category: 'icasync'
})
export default class AddScheduleExecutor implements TaskExecutor {
  readonly name = 'addSchedule';

  constructor(
    private wasV7ApiSchedule: WpsScheduleAdapter,
    private calendarMappingRepository: ICalendarMappingRepository,
    private juheRenwuRepository: IJuheRenwuRepository,
    private courseRawRepository: ICourseRawRepository,
    private logger: Logger
  ) {}

  /**
   * 执行创建日程任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as CreateSchedulesConfig;

    try {
      // 1. 验证输入参数
      const validationResult = this.validateInputParameters(config);
      if (!validationResult.valid) {
        return left({
          error: validationResult.error,
          duration: Date.now() - startTime
        });
      }

      const { kkh, xnxq, schedules, batch_index } = config;

      // 1.5. 根据kkh和xnxq获取calendarId
      this.logger.debug('查询日历映射', { kkh, xnxq });
      const mappingResult =
        await this.calendarMappingRepository.findByKkhAndXnxq(kkh, xnxq);

      if (!mappingResult.success || !mappingResult.right) {
        const errorMsg = !mappingResult.success
          ? (mappingResult as any).error
          : '未找到对应的日历映射记录';
        this.logger.error('未找到日历映射', {
          kkh,
          xnxq,
          error: errorMsg
        });
        return {
          success: false,
          error: `未找到开课号 ${kkh} 和学年学期 ${xnxq} 对应的日历映射: ${errorMsg}`,
          duration: Date.now() - startTime
        };
      }

      const calendar_id = mappingResult.right.calendar_id;
      this.logger.debug('找到日历映射', { kkh, xnxq, calendar_id });

      const batchInfo = batch_index ? `第 ${batch_index} 批` : '';
      this.logger.info(
        `开始创建日程${batchInfo}，日历ID: ${calendar_id}, 日程数量: ${schedules.length}`
      );

      // 2. 处理空日程列表
      if (schedules.length === 0) {
        const result: CreateSchedulesResult = {
          success: true,
          calendar_id,
          schedule_count: 0,
          success_count: 0,
          batch_index,
          created_schedules: [],
          duration: Date.now() - startTime
        };

        this.logger.info(`${batchInfo}日程列表为空，跳过创建`);
        return right(result);
      }

      const juheRenwuIds: number[] = [];
      const wpsSchedules = [] as WpsScheduleData[];
      schedules.forEach((schedule) => {
        juheRenwuIds.push(schedule.juheRenwuId);
        wpsSchedules.push({
          summary: schedule.summary,
          description: schedule.description,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          locations: schedule.locations,
          reminders: schedule.reminders
        });
      });

      // 3. 调用WPS API批量创建日程
      const createResult = await this.createSchedulesBatch(
        calendar_id,
        wpsSchedules
      );

      if (isLeft(createResult)) {
        const result: CreateSchedulesResult = {
          success: false,
          calendar_id,
          schedule_count: schedules.length,
          success_count: 0,
          batch_index,
          error: createResult.error,
          duration: Date.now() - startTime
        };

        this.logger.error(`${batchInfo}日程创建失败`, {
          calendar_id,
          kkh,
          xnxq,
          schedule_count: schedules.length,
          error: createResult.left
        });

        return {
          success: false,
          data: result,
          error: createResult.error,
          duration: result.duration
        };
      }

      // 4. 构造成功结果
      const result: CreateSchedulesResult = {
        success: true,
        calendar_id,
        schedule_count: schedules.length,
        success_count: createResult.right!.length,
        batch_index,
        created_schedules: createResult.right!,
        duration: Date.now() - startTime
      };

      // 5. 更新相关表的状态
      if (result.success_count > 0) {
        const updateResult =
          await this.updateStatusAfterScheduleCreation(juheRenwuIds);
        if (isLeft(updateResult)) {
          this.logger.warn('状态更新失败，但不影响主流程', {
            kkh,
            xnxq,
            error: updateResult.left
          });
        }
      }

      this.logger.info(`${batchInfo}日程创建完成`, {
        calendar_id,
        kkh,
        xnxq,
        schedule_count: schedules.length,
        success_count: result.success_count
      });

      return right(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('执行创建日程任务失败', {
        config,
        error: errorMessage
      });

      return {
        success: false,
        error: `执行失败: ${errorMessage}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 验证输入参数
   */
  private validateInputParameters(config: CreateSchedulesConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config) {
      return { valid: false, error: '配置参数不能为空' };
    }

    if (!config.kkh || typeof config.kkh !== 'string') {
      return { valid: false, error: '开课号(kkh)必须是非空字符串' };
    }

    if (!config.xnxq || typeof config.xnxq !== 'string') {
      return { valid: false, error: '学年学期(xnxq)必须是非空字符串' };
    }

    if (!Array.isArray(config.schedules)) {
      return { valid: false, error: '日程列表(schedules)必须是数组' };
    }

    // 验证日程数组长度
    if (config.schedules.length > 200) {
      return {
        valid: false,
        error: '单批次日程数量不能超过200个'
      };
    }

    // 验证日程数据格式
    for (let i = 0; i < config.schedules.length; i++) {
      const schedule = config.schedules[i];
      const validationError = this.validateScheduleData(schedule, i);
      if (validationError) {
        return {
          valid: false,
          error: validationError
        };
      }
    }

    return { valid: true };
  }

  /**
   * 验证单个日程数据
   */
  private validateScheduleData(
    schedule: WpsScheduleData,
    index: number
  ): string | null {
    if (!schedule || typeof schedule !== 'object') {
      return `第 ${index + 1} 个日程数据格式无效`;
    }

    if (!schedule.summary || typeof schedule.summary !== 'string') {
      return `第 ${index + 1} 个日程缺少标题(summary)`;
    }

    if (!schedule.start_time || !schedule.start_time.datetime) {
      return `第 ${index + 1} 个日程缺少开始时间(start_time.datetime)`;
    }

    if (!schedule.end_time || !schedule.end_time.datetime) {
      return `第 ${index + 1} 个日程缺少结束时间(end_time.datetime)`;
    }

    return null;
  }

  /**
   * 更新日程创建后的状态
   * 成功创建日程后，需要同时更新两个表的状态：
   * 1. juhe_renwu表：设置gx_zt='3'（日程已经才创建），更新gx_sj
   * 2. u_jw_kcb_cur表：使用反向查询找到对应的原始记录，设置gx_zt='1'（已处理），更新gx_sj
   */
  private async updateStatusAfterScheduleCreation(
    juheRenwuIds: number[]
  ): Promise<{
    success: boolean;
    juheRenwuUpdatedCount: number;
    courseRawUpdatedCount: number;
    error?: string;
  }> {
    if (!juheRenwuIds || juheRenwuIds.length === 0) {
      this.logger.warn('没有提供juhe_renwu_ids，跳过状态更新');
      return {
        success: true,
        juheRenwuUpdatedCount: 0,
        courseRawUpdatedCount: 0
      };
    }

    try {
      this.logger.info('开始更新日程创建后的状态', {
        juheRenwuIdsCount: juheRenwuIds.length,
        sampleIds: juheRenwuIds.slice(0, 5) // 只记录前5个ID作为样本
      });

      let juheRenwuUpdatedCount = 0;
      let courseRawUpdatedCount = 0;

      // 1. 更新 juhe_renwu 表状态
      this.logger.info('更新juhe_renwu表状态', {
        juheRenwuIdsCount: juheRenwuIds.length,
        newStatus: '3 (教师日历已推送)'
      });

      const juheUpdateResult =
        await this.juheRenwuRepository.updateSyncStatusBatch(
          juheRenwuIds,
          '3' // 3 = 日程已创建
        );

      if (isRight(juheUpdateResult)) {
        juheRenwuUpdatedCount = juheUpdateResult.right;
        this.logger.info('成功更新juhe_renwu表状态', {
          updatedCount: juheRenwuUpdatedCount,
          targetIds: juheRenwuIds.slice(0, 5)
        });
      } else {
        this.logger.error('更新juhe_renwu表状态失败', {
          error: juheUpdateResult.left,
          juheRenwuIds: juheRenwuIds.length
        });
        return {
          success: false,
          juheRenwuUpdatedCount: 0,
          courseRawUpdatedCount: 0,
          error: `更新juhe_renwu表状态失败: ${juheUpdateResult.error}`
        };
      }

      // 2. 更新对应的 u_jw_kcb_cur 表状态
      // 使用一条SQL完成查找和更新（性能最优）
      this.logger.info('使用一条SQL直接更新对应的u_jw_kcb_cur表状态', {
        juheRenwuIdsCount: juheRenwuIds.length,
        newStatus: '1 (已处理)'
      });

      const directUpdateResult =
        await this.courseRawRepository.updateOriginalCoursesByJuheRenwuIds(
          juheRenwuIds,
          '1' // 1 = 已处理
        );

      if (isRight(directUpdateResult)) {
        courseRawUpdatedCount = directUpdateResult.right;
        this.logger.info('u_jw_kcb_cur表状态更新完成', {
          juheRenwuIdsCount: juheRenwuIds.length,
          updatedCount: courseRawUpdatedCount
        });
      } else {
        this.logger.error('u_jw_kcb_cur表状态更新失败', {
          error: directUpdateResult.left
        });
        return {
          success: false,
          juheRenwuUpdatedCount,
          courseRawUpdatedCount: 0,
          error: `更新u_jw_kcb_cur表状态失败: ${directUpdateResult.error}`
        };
      }

      const finalResult = {
        success: true,
        juheRenwuUpdatedCount,
        courseRawUpdatedCount
      };

      this.logger.info('状态更新完成', finalResult);
      return finalResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('更新日程创建后状态异常', {
        juheRenwuIds: juheRenwuIds.length,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        juheRenwuUpdatedCount: 0,
        courseRawUpdatedCount: 0,
        error: `状态更新异常: ${errorMessage}`
      };
    }
  }

  /**
   * 调用WPS API批量创建日程
   */
  private async createSchedulesBatch(
    calendarId: string,
    schedules: WpsScheduleData[]
  ) {
    try {
      this.logger.debug('调用WPS API批量创建日程', {
        calendar_id: calendarId,
        schedule_count: schedules.length
      });

      // 调用WPS API
      const response = await this.wasV7ApiSchedule.batchCreateSchedules({
        calendar_id: calendarId,
        events: schedules
      });

      // 处理响应结果
      const createdSchedules =
        response.items?.map((event: any) => ({
          id: event.id,
          summary: event.summary,
          start_time: event.start_time,
          end_time: event.end_time
        })) || [];

      this.logger.debug('WPS API调用成功', {
        calendar_id: calendarId,
        requested_count: schedules.length,
        created_count: createdSchedules.length
      });

      return right(createdSchedules
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('WPS API调用失败', {
        calendar_id: calendarId,
        schedule_count: schedules.length,
        error: errorMessage
      });

      return left(errorMessage
      );
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      // 检查依赖服务是否可用
      if (!this.wasV7ApiSchedule) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}
