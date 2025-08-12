// @stratix/icasync 获取所有日历课程号处理器
// 负责获取当前学期所有需要同步的日历课程号列表

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';

/**
 * 获取所有日历配置接口
 */
export interface FetchAllCalendarsConfig {
  xnxq: string; // 学年学期
  includeInactive?: boolean; // 是否包含非活跃课程
  sortBy?: string; // 排序字段
  limit?: number; // 限制数量
}

/**
 * 日历课程信息接口
 */
export interface CalendarInfo {
  kkh: string; // 课程号
  name: string; // 课程名称
  xnxq: string; // 学年学期
  courseCount: number; // 该课程号下的课程数量
  active: boolean; // 是否活跃
}

/**
 * 获取所有日历结果接口
 */
export interface FetchAllCalendarsResult {
  calendars: CalendarInfo[]; // 日历列表
  totalCount: number; // 总数量
  activeCount: number; // 活跃数量
  inactiveCount: number; // 非活跃数量
  duration: number; // 执行时长(ms)
}

/**
 * 获取所有日历课程号处理器
 *
 * 功能：
 * 1. 从聚合表（juhe_renwu）获取指定学期的所有唯一课程号（kkh）
 * 2. 统计每个课程号的聚合任务数量和基本信息
 * 3. 按照指定字段排序（默认按课程号排序）
 * 4. 返回格式化的日历信息列表，供后续日历创建使用
 * 5. 支持过滤和数量限制
 *
 * 注意：此处理器依赖于数据聚合步骤的完成，应在聚合处理后执行
 */
@Executor({
  name: 'fetchAllCalendars',
  description:
    '获取所有日历课程号处理器 - 获取指定学期所有需要同步的日历课程号列表',
  version: '3.0.0',
  tags: ['fetch', 'calendar', 'course', 'kkh', 'v3.0'],
  category: 'icasync'
})
export default class FetchAllCalendars implements TaskExecutor {
  readonly name = 'fetchAllCalendars';
  readonly description = '获取所有日历课程号处理器';
  readonly version = '3.0.0';

  constructor(
    private juheRenwuRepository: IJuheRenwuRepository,
    private logger: Logger
  ) {}

  /**
   * 执行获取所有日历任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FetchAllCalendarsConfig;

    this.logger.info('开始获取所有日历课程号', {
      xnxq: config.xnxq,
      includeInactive: config.includeInactive,
      sortBy: config.sortBy,
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
      const result = await this.performFetchAllCalendars(config);

      result.duration = Date.now() - startTime;

      this.logger.info('获取所有日历课程号完成', {
        xnxq: config.xnxq,
        totalCount: result.totalCount,
        activeCount: result.activeCount,
        inactiveCount: result.inactiveCount,
        duration: result.duration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('获取所有日历课程号失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          calendars: [],
          totalCount: 0,
          activeCount: 0,
          inactiveCount: 0,
          duration
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: FetchAllCalendarsConfig): {
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
   * 执行获取所有日历操作
   */
  private async performFetchAllCalendars(
    config: FetchAllCalendarsConfig
  ): Promise<FetchAllCalendarsResult> {
    try {
      this.logger.info('开始从数据库获取课程号列表', {
        xnxq: config.xnxq
      });

      // 1. 从聚合表获取指定学期的所有唯一课程号
      const kkhListResult = await this.juheRenwuRepository.findDistinctCourses(
        config.xnxq
      );

      if (!kkhListResult.success) {
        throw new Error(`获取课程号列表失败: ${kkhListResult.error}`);
      }

      const kkhList = kkhListResult.data;
      this.logger.info('成功从聚合表获取课程号列表', {
        xnxq: config.xnxq,
        totalKkh: kkhList.length
      });

      // 2. 为每个课程号获取详细信息
      const calendars: CalendarInfo[] = [];

      for (const kkh of kkhList) {
        try {
          const calendarInfo = await this.getCalendarInfo(kkh, config.xnxq);

          // 根据配置过滤非活跃课程
          if (!config.includeInactive && !calendarInfo.active) {
            continue;
          }

          calendars.push(calendarInfo);
        } catch (error) {
          this.logger.warn('获取课程详细信息失败，跳过该课程', {
            kkh,
            xnxq: config.xnxq,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // 3. 排序处理
      const sortBy = config.sortBy || 'kkh';
      const sortedCalendars = this.sortCalendars(calendars, sortBy);

      // 4. 数量限制处理
      let finalCalendars = sortedCalendars;
      if (config.limit && config.limit < sortedCalendars.length) {
        finalCalendars = sortedCalendars.slice(0, config.limit);
      }

      // 5. 统计信息
      const activeCount = finalCalendars.filter((c) => c.active).length;
      const inactiveCount = finalCalendars.length - activeCount;

      this.logger.info('日历课程号处理完成', {
        xnxq: config.xnxq,
        totalCount: finalCalendars.length,
        activeCount,
        inactiveCount,
        sortBy
      });

      return {
        calendars: finalCalendars,
        totalCount: finalCalendars.length,
        activeCount,
        inactiveCount,
        duration: 0 // 将在上层设置
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('获取所有日历过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      throw error;
    }
  }

  /**
   * 获取课程详细信息
   */
  private async getCalendarInfo(
    kkh: string,
    xnxq: string
  ): Promise<CalendarInfo> {
    // 从聚合表获取该课程号下的所有聚合任务
    const tasksResult = await this.juheRenwuRepository.findByKkh(kkh);

    if (!tasksResult.success) {
      throw new Error(`获取课程详细信息失败: ${tasksResult.error}`);
    }

    // 过滤指定学期的任务
    const tasks = tasksResult.data.filter((task) => task.xnxq === xnxq);

    if (tasks.length === 0) {
      throw new Error(`课程号 ${kkh} 在学期 ${xnxq} 没有找到对应的聚合数据`);
    }

    // 使用第一个任务的信息作为基础信息
    const firstTask = tasks[0];

    // 判断课程是否活跃（有未处理或正在处理的任务）
    const hasActiveTasks = tasks.some((task) => {
      // gx_zt = '0' 表示未处理，null 也表示未处理
      return task.gx_zt === '0' || task.gx_zt === null;
    });

    return {
      kkh,
      name: firstTask.kcmc || `课程-${kkh}`, // 课程名称
      xnxq,
      courseCount: tasks.length, // 聚合任务数量
      active: hasActiveTasks
    };
  }

  /**
   * 排序日历列表
   */
  private sortCalendars(
    calendars: CalendarInfo[],
    sortBy: string
  ): CalendarInfo[] {
    const [field, direction] = sortBy.split(' ');
    const isDesc = direction?.toUpperCase() === 'DESC';

    return [...calendars].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'kkh':
          aValue = a.kkh;
          bValue = b.kkh;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'courseCount':
          aValue = a.courseCount;
          bValue = b.courseCount;
          break;
        case 'active':
          aValue = a.active ? 1 : 0;
          bValue = b.active ? 1 : 0;
          break;
        default:
          aValue = a.kkh;
          bValue = b.kkh;
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
      // 检查 JuheRenwuRepository 是否可用
      if (!this.juheRenwuRepository) {
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
