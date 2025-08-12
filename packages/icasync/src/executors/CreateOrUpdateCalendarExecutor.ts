// @stratix/icasync 创建或更新日历执行器
// 负责创建或更新单个课程日历，支持强制更新和增量更新模式

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
 * 创建或更新日历配置接口
 */
export interface CreateOrUpdateCalendarConfig {
  /** 开课号 */
  kkh: string;
  /** 日历名称（可选，如果不提供则从课程信息生成） */
  name?: string;
  /** 学年学期 */
  xnxq: string;
  /** 是否强制更新（删除现有日历重新创建） */
  forceUpdate?: boolean;
  /** 日历数据（可选的额外数据） */
  calendarData?: {
    description?: string;
    timeZone?: string;
    metadata?: Record<string, any>;
  };
  /** 同步配置 */
  syncConfig?: {
    batchSize?: number;
    timeout?: number;
    retryCount?: number;
  };
}

/**
 * 创建或更新日历结果接口
 */
export interface CreateOrUpdateCalendarResult {
  /** 是否成功 */
  success: boolean;
  /** 日历ID */
  calendarId?: string;
  /** 日历名称 */
  calendarName?: string;
  /** 开课号 */
  kkh: string;
  /** 学年学期 */
  xnxq: string;
  /** 操作类型：created | updated | skipped */
  operation: 'created' | 'updated' | 'skipped';
  /** 是否为新创建的日历 */
  isNewCalendar: boolean;
  /** 错误信息 */
  error?: string;
  /** 详细信息 */
  details?: {
    existingCalendarId?: string;
    participantCount?: number;
    scheduleCount?: number;
    metadata?: Record<string, any>;
  };
  /** 执行时长(ms) */
  duration: number;
}

/**
 * 创建或更新日历执行器
 *
 * 功能：
 * 1. 检查指定开课号的日历是否已存在
 * 2. 根据配置决定是创建新日历还是更新现有日历
 * 3. 支持强制更新模式（删除重建）
 * 4. 支持增量更新模式（保留现有数据）
 * 5. 返回详细的操作结果和日历信息
 * 6. 处理各种异常情况和错误恢复
 */
@Executor({
  name: 'createOrUpdateCalendar',
  description: '创建或更新日历执行器 - 创建或更新单个课程日历',
  version: '1.0.0',
  tags: ['calendar', 'create', 'update', 'course', 'sync'],
  category: 'icasync'
})
export default class CreateOrUpdateCalendarExecutor implements TaskExecutor {
  readonly name = 'createOrUpdateCalendar';
  readonly description = '创建或更新日历执行器';
  readonly version = '1.0.0';

  constructor(
    private calendarSyncService: ICalendarSyncService,
    private calendarMappingRepository: ICalendarMappingRepository,
    private logger: Logger
  ) {}

  /**
   * 执行创建或更新日历任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as CreateOrUpdateCalendarConfig;

    // 验证配置
    const validationResult = this.validateConfig(config);
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error,
        duration: Date.now() - startTime
      };
    }

    const { kkh, xnxq, forceUpdate = false, calendarData, syncConfig } = config;

    try {
      this.logger.info(
        `开始创建或更新日历，开课号: ${kkh}, 学年学期: ${xnxq}, 强制更新: ${forceUpdate}`
      );

      // 1. 检查现有日历
      const existingCalendar = await this.checkExistingCalendar(kkh, xnxq);

      let result: CreateOrUpdateCalendarResult;

      if (existingCalendar && !forceUpdate) {
        // 存在日历且不强制更新，返回现有日历信息
        result = {
          success: true,
          calendarId: existingCalendar.calendar_id,
          calendarName: existingCalendar.calendar_name || undefined,
          kkh,
          xnxq,
          operation: 'skipped',
          isNewCalendar: false,
          details: {
            existingCalendarId: existingCalendar.calendar_id,
            metadata: existingCalendar.metadata
              ? typeof existingCalendar.metadata === 'string'
                ? JSON.parse(existingCalendar.metadata)
                : existingCalendar.metadata
              : undefined
          },
          duration: Date.now() - startTime
        };

        this.logger.info(
          `日历已存在，跳过创建，日历ID: ${existingCalendar.calendar_id}`
        );
      } else {
        // 创建或重新创建日历
        const operation = existingCalendar ? 'updated' : 'created';

        // 调用日历同步服务创建日历
        const syncResult = await this.calendarSyncService.createCourseCalendar(
          kkh,
          xnxq,
          syncConfig
        );

        if (
          syncResult.successCount > 0 &&
          syncResult.createdCalendarIds.length > 0
        ) {
          const createdCalendarId = syncResult.createdCalendarIds[0];

          result = {
            success: true,
            calendarId: createdCalendarId,
            calendarName: config.name || `课程日历 (${kkh})`,
            kkh,
            xnxq,
            operation,
            isNewCalendar: !existingCalendar,
            details: {
              existingCalendarId: existingCalendar?.calendar_id,
              metadata: {
                created_by: 'createOrUpdateCalendar_executor',
                force_update: forceUpdate,
                sync_config: syncConfig
              }
            },
            duration: Date.now() - startTime
          };

          this.logger.info(
            `日历${operation === 'created' ? '创建' : '更新'}成功，日历ID: ${createdCalendarId}`
          );
        } else {
          // 创建失败
          const errorMessage =
            syncResult.errors.length > 0
              ? syncResult.errors.join(', ')
              : '未知错误';

          result = {
            success: false,
            kkh,
            xnxq,
            operation: existingCalendar ? 'updated' : 'created',
            isNewCalendar: false,
            error: `日历创建失败: ${errorMessage}`,
            duration: Date.now() - startTime
          };

          this.logger.error(
            `日历创建失败，开课号: ${kkh}, 错误: ${errorMessage}`
          );
        }
      }

      return {
        success: result.success,
        data: result,
        error: result.error,
        duration: result.duration
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`创建或更新日历执行器异常，开课号: ${kkh}`, error);

      const result: CreateOrUpdateCalendarResult = {
        success: false,
        kkh,
        xnxq,
        operation: 'created',
        isNewCalendar: false,
        error: `执行器异常: ${errorMessage}`,
        duration: Date.now() - startTime
      };

      return {
        success: false,
        data: result,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: CreateOrUpdateCalendarConfig): {
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

    // 验证开课号格式（基本格式检查）
    if (!/^[A-Za-z0-9_-]+$/.test(config.kkh)) {
      return {
        valid: false,
        error: '开课号格式无效，只能包含字母、数字、下划线和连字符'
      };
    }

    // 验证学年学期格式（例如：2024-2025-1）
    if (!/^\d{4}-\d{4}-[12]$/.test(config.xnxq)) {
      return {
        valid: false,
        error: '学年学期格式无效，应为YYYY-YYYY-N格式（如：2024-2025-1）'
      };
    }

    return { valid: true };
  }

  /**
   * 检查现有日历
   */
  private async checkExistingCalendar(kkh: string, xnxq: string) {
    try {
      const result = await this.calendarMappingRepository.findByKkhAndXnxq(
        kkh,
        xnxq
      );
      return result.success ? result.data : null;
    } catch (error) {
      this.logger.warn(`检查现有日历时出错，开课号: ${kkh}`, error);
      return null;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      // 检查依赖服务是否可用
      if (!this.calendarSyncService || !this.calendarMappingRepository) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}
