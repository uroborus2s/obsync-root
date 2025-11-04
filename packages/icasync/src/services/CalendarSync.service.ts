// @stratix/icasync 日历同步服务
// 负责日历创建、删除、参与者管理等核心业务逻辑

import { Logger, type ServiceError } from '@stratix/core';
import {
  isLeft,
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import type { WpsCalendarAdapter, WpsScheduleAdapter } from '@stratix/was-v7';
import { WpsError } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMapping.repository.js';

/**
 * 日历同步配置
 */
export interface CalendarSyncConfig {
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * 日历同步结果
 */
export interface CalendarSyncResult {
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 处理的总数量 */
  totalCount: number;
  /** 错误信息 */
  errors: string[];
  /** 创建的日历ID列表 */
  createdCalendarIds: string[];
  /** 删除的日历ID列表 */
  deletedCalendarIds: string[];
}

/**
 * 参与者同步结果
 */
export interface ParticipantSyncResult {
  /** 成功添加的参与者数量 */
  addedCount: number;
  /** 成功删除的参与者数量 */
  removedCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 错误信息 */
  errors: string[];
}

/**
 * 日历同步服务接口
 */
export interface ICalendarSyncService {
  /**
   * 删除指定日历
   */
  deleteCalendar(calendarId: string): Promise<Either<ServiceError, void>>;

  /**
   * 软删除指定日历
   */
  softDeleteCalendar(calendarId: string): Promise<Either<ServiceError, void>>;
}

/**
 * 日历信息接口
 */
export interface CalendarInfo {
  id: number; // 映射表ID
  kkh: string; // 开课号
  calendar_id: string; // WAS V7日历ID
  calendar_name: string; // 日历名称
  status: string; // 状态
  teacher_ids?: string; // 教师ID列表
  class_codes?: string; // 班级代码列表
  created_at: Date; // 创建时间
  updated_at: Date; // 更新时间
}

/**
 * 日历同步服务实现
 *
 * 注意：根据Stratix框架架构原则，Service层通过依赖注入获取适配器，
 * 但不直接引用适配器类型，而是通过容器解析获得
 */
export default class CalendarSyncService implements ICalendarSyncService {
  constructor(
    private readonly calendarMappingRepository: ICalendarMappingRepository,
    private readonly logger: Logger,
    // 通过依赖注入获取WAS V7适配器
    private readonly wasV7ApiCalendar: WpsCalendarAdapter,
    private readonly wasV7ApiSchedule: WpsScheduleAdapter
  ) {}

  /**
   * 删除指定日历
   */
  async deleteCalendar(
    calendarId: string
  ): Promise<Either<ServiceError, void>> {
    try {
      this.logger.info(`开始删除日历，日历ID: ${calendarId}`);

      // 调用WPS API删除日历
      await this.wasV7ApiCalendar.deleteCalendar({
        calendar_id: calendarId
      });

      this.logger.info(`删除日历完成，日历ID: ${calendarId}`);

      return right(undefined);
    } catch (error) {
      // 检查是否为WPS API错误
      if (error instanceof WpsError) {
        const wpsError = error as WpsError;

        // 检查是否为HTTP 400错误且响应数据中data字段为"calendarID"
        if (
          wpsError.httpStatus === 400 &&
          wpsError.originalError &&
          wpsError.originalError.right === 'calendarID'
        ) {
          this.logger.info(
            `日历ID不存在，视为删除成功，日历ID: ${calendarId}`,
            {
              calendarId,
              errorCode: wpsError.code,
              httpStatus: wpsError.httpStatus,
              errorData: wpsError.originalError
            }
          );

          return right(undefined);
        }
      }

      // 其他类型的错误正常抛出
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.left('删除日历失败', {
        calendarId,
        error: errorMsg,
        errorDetails:
          error instanceof WpsError
            ? {
                code: (error as WpsError).code,
                httpStatus: (error as WpsError).httpStatus,
                originalError: (error as WpsError).originalError
              }
            : error
      });

      return left({
        code: 'CALENDAR_DELETE_FAILED',
        message: errorMsg,
        details: error
      });
    }
  }

  /**
   * 软删除指定日历
   */
  async softDeleteCalendar(
    calendarId: string
  ): Promise<Either<ServiceError, void>> {
    try {
      this.logger.info(`开始软删除日历，日历ID: ${calendarId}`);

      // 更新映射表，标记为已删除
      const mappingResult =
        await this.calendarMappingRepository.findByCalendarId(calendarId);

      if (isLeft(mappingResult) || !mappingResult.right) {
        return left({
          code: 'CALENDAR_MAPPING_NOT_FOUND',
          message: `未找到日历映射记录: ${calendarId}`
        });
      }

      const updateResult = await this.calendarMappingRepository.updateNullable(
        mappingResult.right.id,
        {
          is_deleted: true,
          deleted_at: new Date().toISOString()
        }
      );

      if (isLeft(updateResult)) {
        return left({
          code: 'CALENDAR_UPDATE_FAILED',
          message: `更新映射记录失败: ${updateResult.left}`
        });
      }

      this.logger.info(`软删除日历完成，日历ID: ${calendarId}`);

      return right(undefined);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.left('软删除日历失败', {
        calendarId,
        error: errorMsg
      });

      return left({
        code: 'CALENDAR_SOFT_DELETE_FAILED',
        message: errorMsg,
        details: error
      });
    }
  }

  /**
   * 删除日程
   */
  async deleteSchedule(
    calendarId: string,
    scheduleId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.info('开始删除日程', { calendarId, scheduleId });

      // TODO: 调用WPS Schedule API删除日程
      // await this.wasV7ApiSchedule.deleteSchedule(calendarId, scheduleId);

      // 临时模拟实现，实际应该调用WPS API
      this.logger.info('日程删除成功（模拟）', {
        calendarId,
        scheduleId
      });

      return {
        success: true
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.left('删除日程异常', {
        calendarId,
        scheduleId,
        error: errorMsg
      });

      return {
        success: false,
        error: errorMsg
      };
    }
  }
}
