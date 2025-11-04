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
  orderBy?: string; // 排序字段（现在使用数据库层面排序）
  limit?: number; // 限制数量（保留用于向后兼容，但不在业务逻辑中使用以确保数据清理完整性）
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
  items: OldCalendarMapping[]; // 待删除的日历列表（工作流要求的字段名）
  totalCount: number; // 总数量
  fetchedCount: number; // 实际获取数量
  duration: number; // 执行时长(ms)
}

/**
 * 获取旧日历映射数据处理器
 *
 * 功能：
 * 1. 从icasync_calendar_mapping表获取指定学期的所有日历映射数据
 * 2. 使用数据库层面的ORDER BY进行排序（默认按创建时间倒序）
 * 3. 返回格式化的旧日历信息，供删除操作使用
 * 4. 确保返回所有数据以保证清理完整性（不再使用数量限制）
 * 5. 包含详细的性能监控和日志记录
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
        return left(validation.error
        );
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

      return right(result
      );
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
        xnxq: config.xnxq,
        orderBy: config.orderBy
      });

      // 记录查询开始时间
      const queryStartTime = Date.now();

      // 构建查询选项，使用数据库层面的排序
      const orderBy = config.orderBy || 'created_at DESC';
      const queryOptions = this.buildQueryOptions(orderBy);

      // 获取指定学期的所有日历映射（使用数据库排序）
      const mappingsResult =
        await this.calendarMappingRepository.findByXnxqWithOptions(
          config.xnxq,
          queryOptions
        );

      const queryDuration = Date.now() - queryStartTime;

      if (isLeft(mappingsResult)) {
        throw new Error(`获取日历映射失败: ${mappingsResult.error}`);
      }

      const mappings = mappingsResult.right;
      const totalCount = mappings.length;

      // 记录查询性能
      this.logger.info('成功获取日历映射数据', {
        xnxq: config.xnxq,
        totalCount,
        queryDuration,
        orderBy
      });

      // 性能警告：查询耗时超过阈值
      if (queryDuration > 1000) {
        this.logger.warn('数据库查询耗时较长', {
          xnxq: config.xnxq,
          queryDuration,
          totalCount,
          threshold: 1000
        });
      }

      // 转换为旧日历格式
      const transformStartTime = Date.now();

      const oldCalendars: OldCalendarMapping[] = mappings.map((mapping) => ({
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

      const transformDuration = Date.now() - transformStartTime;

      // 注意：移除了数量限制逻辑以确保数据清理的完整性
      // 原代码：if (config.limit && config.limit < oldCalendars.length) { ... }
      // 保留config.limit配置项以保持向后兼容，但不在业务逻辑中使用

      const fetchedCount = oldCalendars.length;

      this.logger.info('旧日历映射数据处理完成', {
        xnxq: config.xnxq,
        totalCount,
        fetchedCount,
        queryDuration,
        transformDuration,
        orderBy,
        usedDatabaseSorting: true
      });

      return {
        items: oldCalendars, // 工作流要求的字段名
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
   * 构建查询选项（将orderBy字符串转换为QueryOptions格式）
   */
  private buildQueryOptions(orderBy: string): {
    orderBy: { field: string; direction: 'asc' | 'desc' };
  } {
    const [field, direction] = orderBy.split(' ');
    const isDesc = direction?.toUpperCase() === 'DESC';

    // 映射字段名到数据库字段名
    let dbField: string;
    switch (field) {
      case 'created_at':
        dbField = 'created_at';
        break;
      case 'kkh':
        dbField = 'kkh';
        break;
      case 'calendar_name':
        dbField = 'calendar_name';
        break;
      default:
        dbField = 'created_at'; // 默认按创建时间排序
    }

    return {
      orderBy: {
        field: dbField,
        direction: isDesc ? 'desc' : 'asc'
      }
    };
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
