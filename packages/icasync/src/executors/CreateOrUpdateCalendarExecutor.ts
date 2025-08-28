// @stratix/icasync 创建或更新日历执行器
// 负责创建或更新单个课程日历，支持强制更新和增量更新模式

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type { NewCalendarMapping } from '../types/database.js';

/**
 * 创建或更新日历配置接口
 */
export interface CreateOrUpdateCalendarConfig {
  /** 学年学期 */
  xnxq: string;
  /** 课程名称 */
  kcmc: string;
  /** 开课号 */
  kkh: string;
  /** 日历ID */
  calendarId: string;
  /** 日历描述（可选） */
  description?: string;
  /** 时区（可选，默认为Asia/Shanghai） */
  timeZone?: string;
  /** 额外的元数据（可选） */
  metadata?: Record<string, any>;
}

/**
 * 创建或更新日历结果接口
 */
export interface CreateOrUpdateCalendarResult {
  /** 日历ID */
  calendarId: string;
  /** 操作类型：created | skipped */
  operation: 'created' | 'skipped';
  /** 错误信息 */
  error?: string;
  /** 详细信息 */
  details?: {
    existingCalendarId?: string;
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
    private wasV7ApiCalendar: WpsCalendarAdapter,
    private calendarMappingRepository: ICalendarMappingRepository,
    private logger: Logger
  ) {}

  /**
   * 执行创建日历任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as CreateOrUpdateCalendarConfig;

    try {
      // 1. 验证输入参数
      const validationResult = this.validateInputParameters(config);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          duration: Date.now() - startTime
        };
      }

      const {
        kcmc,
        kkh,
        description,
        xnxq,
        timeZone = 'Asia/Shanghai',
        metadata
      } = config;

      this.logger.info(`开始创建日历，课程名称: ${kcmc}, 开课号: ${kkh}`);

      // 2. 检查是否已存在日历映射
      const existingMapping = await this.checkExistingMapping(kkh);
      if (existingMapping) {
        const result: CreateOrUpdateCalendarResult = {
          calendarId: existingMapping.calendar_id,
          operation: 'skipped',
          details: {
            existingCalendarId: existingMapping.calendar_id,
            metadata: existingMapping.metadata
              ? typeof existingMapping.metadata === 'string'
                ? JSON.parse(existingMapping.metadata)
                : existingMapping.metadata
              : undefined
          },
          duration: Date.now() - startTime
        };

        this.logger.info(
          `日历已存在，跳过创建，日历ID: ${existingMapping.calendar_id}`
        );

        return {
          success: true,
          data: result,
          duration: result.duration
        };
      }

      // 3. 调用WPS API创建日历
      const calendarParams = {
        summary: `${kcmc}`
      };

      this.logger.debug('调用WPS API创建日历', calendarParams);
      const calendar =
        await this.wasV7ApiCalendar.createCalendar(calendarParams);

      this.logger.info(
        `WPS日历创建成功，ID: ${calendar.id}, 名称: ${calendar.summary}`
      );

      // 4. 保存映射关系到数据库
      const mappingData: NewCalendarMapping = {
        kkh,
        xnxq: xnxq, // 暂时为空，可以后续扩展
        calendar_id: calendar.id,
        calendar_name: calendar.summary,
        is_deleted: false,
        metadata: JSON.stringify({
          course_name: kcmc,
          description: description || `课程: ${kcmc}\n开课号: ${kkh}`,
          time_zone: timeZone,
          created_by: 'createOrUpdateCalendar_executor',
          created_at: new Date().toISOString(),
          ...metadata
        })
      };

      const saveResult =
        await this.calendarMappingRepository.create(mappingData);
      if (!saveResult.success) {
        this.logger.error('保存日历映射失败', {
          kkh,
          calendarId: calendar.id,
          error: saveResult.error
        });

        // 尝试删除已创建的日历
        try {
          await this.wasV7ApiCalendar.deleteCalendar({
            calendar_id: calendar.id
          });
          this.logger.info('已回滚删除创建的日历', { calendarId: calendar.id });
        } catch (deleteError) {
          this.logger.warn('回滚删除日历失败', {
            calendarId: calendar.id,
            deleteError
          });
        }

        return {
          success: false,
          error: `保存日历映射失败: ${saveResult.error}`,
          duration: Date.now() - startTime
        };
      }

      this.logger.info('日历映射保存成功', {
        kkh,
        calendarId: calendar.id,
        mappingId: saveResult.data!.id
      });

      // 5. 返回成功结果
      const result: CreateOrUpdateCalendarResult = {
        calendarId: calendar.id,
        operation: 'created',
        details: {
          metadata: {
            course_name: kcmc,
            created_by: 'createOrUpdateCalendar_executor',
            mapping_id: saveResult.data!.id,
            ...metadata
          }
        },
        duration: Date.now() - startTime
      };

      this.logger.info(`日历创建完成，日历ID: ${calendar.id}`);

      return {
        success: true,
        data: result,
        duration: result.duration
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('执行创建日历任务失败', {
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
  private validateInputParameters(config: CreateOrUpdateCalendarConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config) {
      return { valid: false, error: '配置参数不能为空' };
    }

    if (!config.kcmc || typeof config.kcmc !== 'string') {
      return { valid: false, error: '课程名称(kcmc)必须是非空字符串' };
    }

    if (!config.kkh || typeof config.kkh !== 'string') {
      return { valid: false, error: '开课号(kkh)必须是非空字符串' };
    }

    // 验证开课号格式（基本格式检查）
    if (config.kkh.length < 3 || config.kkh.length > 40) {
      return {
        valid: false,
        error: '开课号长度应在3-20个字符之间'
      };
    }

    // 验证课程名称长度
    if (config.kcmc.length < 1 || config.kcmc.length > 100) {
      return {
        valid: false,
        error: '课程名称长度应在1-100个字符之间'
      };
    }

    return { valid: true };
  }

  /**
   * 检查是否已存在日历映射
   */
  private async checkExistingMapping(kkh: string) {
    try {
      const result = await this.calendarMappingRepository.findByKkh(kkh);
      return result.success ? result.data : null;
    } catch (error) {
      this.logger.warn(`检查现有日历映射时出错，开课号: ${kkh}`, error);
      return null;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      // 检查依赖服务是否可用
      if (!this.wasV7ApiCalendar || !this.calendarMappingRepository) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}
