// @stratix/icasync 获取旧日历映射数据处理器
// 负责获取当前学期的所有旧日历映射数据，用于后续删除操作

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';

/**
 * 获取旧日历映射配置接口
 */
export interface FetchOldCalendarMappingsConfig {
  xnxq: string; // 学年学期
  includeInactive?: boolean; // 是否包含非活跃日历
  orderBy?: string; // 排序字段
  limit?: number; // 限制数量
}

/**
 * 旧日历映射数据接口
 */
export interface OldCalendarMapping {
  id: number;
  calendarId: string;
  kkh: string;
  calendarName: string;
  xnxq: string;
  createdAt: string;
  status?: string;
}

/**
 * 获取旧日历映射结果接口
 */
export interface FetchOldCalendarMappingsResult {
  calendarsToDelete: OldCalendarMapping[]; // 待删除的日历列表（工作流要求的字段名）
  oldCalendars: OldCalendarMapping[]; // 旧日历列表（向后兼容）
  totalCount: number; // 总数量
  fetchedCount: number; // 实际获取数量
  duration: number; // 执行时长(ms)
}

/**
 * 获取旧日历映射数据处理器
 *
 * 功能：
 * 1. 从icasync_calendar_mapping表获取指定学期的所有日历映射数据
 * 2. 按照指定顺序排序（默认按创建时间倒序）
 * 3. 返回格式化的旧日历信息，供删除操作使用
 * 4. 支持过滤条件和数量限制
 */
@Executor({
  name: 'fetchOldCalendarMappings',
  description: '获取旧日历映射数据处理器 - 获取指定学期的所有旧日历映射数据',
  version: '3.0.0',
  tags: ['fetch', 'calendar', 'mapping', 'old-data', 'v3.0'],
  category: 'icasync'
})
export default class FetchOldCalendarMappingsProcessor implements TaskExecutor {
  readonly name = 'fetchOldCalendarMappings';
  readonly description = '获取旧日历映射数据处理器';
  readonly version = '3.0.0';

  constructor(
    private calendarMappingRepository: ICalendarMappingRepository,
    private logger: Logger
  ) {}

  /**
   * 执行获取旧日历映射数据任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FetchOldCalendarMappingsConfig;

    this.logger.info('开始获取旧日历映射数据', {
      xnxq: config.xnxq,
      includeInactive: config.includeInactive,
      orderBy: config.orderBy,
      limit: config.limit
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

      // 执行获取操作
      const result = await this.performFetchOldCalendarMappings(config);

      result.duration = Date.now() - startTime;

      this.logger.info('获取旧日历映射数据完成', {
        xnxq: config.xnxq,
        totalCount: result.totalCount,
        fetchedCount: result.fetchedCount,
        duration: result.duration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('获取旧日历映射数据失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          calendarsToDelete: [], // 工作流要求的字段名
          oldCalendars: [], // 向后兼容
          totalCount: 0,
          fetchedCount: 0,
          duration
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: FetchOldCalendarMappingsConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    if (!this.isValidXnxq(config.xnxq)) {
      return { valid: false, error: '学年学期格式不正确，应为：YYYY-YYYY-N' };
    }

    if (config.limit && (config.limit <= 0 || config.limit > 10000)) {
      return { valid: false, error: '限制数量必须在1-10000之间' };
    }

    return { valid: true };
  }

  /**
   * 执行获取旧日历映射数据
   */
  private async performFetchOldCalendarMappings(
    config: FetchOldCalendarMappingsConfig
  ): Promise<FetchOldCalendarMappingsResult> {
    try {
      this.logger.info('开始从数据库获取旧日历映射数据', {
        xnxq: config.xnxq
      });

      // 获取指定学期的所有日历映射
      const mappingsResult = await this.calendarMappingRepository.findByXnxq(
        config.xnxq
      );

      if (!mappingsResult.success) {
        throw new Error(`获取日历映射失败: ${mappingsResult.error}`);
      }

      const mappings = mappingsResult.data;
      const totalCount = mappings.length;

      this.logger.info('成功获取日历映射数据', {
        xnxq: config.xnxq,
        totalCount
      });

      // 转换为旧日历格式
      let oldCalendars: OldCalendarMapping[] = mappings.map((mapping) => ({
        id: mapping.id,
        calendarId: mapping.calendar_id,
        kkh: mapping.kkh,
        calendarName: mapping.calendar_name || `课程-${mapping.kkh}`,
        xnxq: mapping.xnxq,
        createdAt: mapping.created_at
          ? mapping.created_at.toISOString()
          : new Date().toISOString(),
        status: 'unknown' // sync_status field doesn't exist in current schema
      }));

      // 排序处理
      const orderBy = config.orderBy || 'created_at DESC';
      oldCalendars = this.sortCalendars(oldCalendars, orderBy);

      // 数量限制处理
      if (config.limit && config.limit < oldCalendars.length) {
        oldCalendars = oldCalendars.slice(0, config.limit);
      }

      const fetchedCount = oldCalendars.length;

      this.logger.info('旧日历映射数据处理完成', {
        xnxq: config.xnxq,
        totalCount,
        fetchedCount,
        orderBy
      });

      return {
        calendarsToDelete: oldCalendars, // 工作流要求的字段名
        oldCalendars, // 向后兼容
        totalCount,
        fetchedCount,
        duration: 0 // 将在上层设置
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('获取旧日历映射数据过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      throw error;
    }
  }

  /**
   * 排序日历列表
   */
  private sortCalendars(
    calendars: OldCalendarMapping[],
    orderBy: string
  ): OldCalendarMapping[] {
    const [field, direction] = orderBy.split(' ');
    const isDesc = direction?.toUpperCase() === 'DESC';

    return [...calendars].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'created_at':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'kkh':
          aValue = a.kkh;
          bValue = b.kkh;
          break;
        case 'calendar_name':
          aValue = a.calendarName;
          bValue = b.calendarName;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (aValue < bValue) return isDesc ? 1 : -1;
      if (aValue > bValue) return isDesc ? -1 : 1;
      return 0;
    });
  }

  /**
   * 验证学年学期格式
   */
  private isValidXnxq(xnxq: string): boolean {
    const pattern = /^\d{4}-\d{4}-[12]$/;
    return pattern.test(xnxq);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查 CalendarMappingRepository 是否可用
      if (!this.calendarMappingRepository) {
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
