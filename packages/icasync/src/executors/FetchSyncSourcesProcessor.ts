/**
 * 获取同步数据源处理器
 *
 * 功能：
 * 1. 从聚合表获取按日历分组的同步数据
 * 2. 为每个日历组准备参与者、日程、权限等数据
 * 3. 支持多循环工作流的数据源准备
 * 4. 优化数据结构以提升并行处理效率
 */

import type { Logger } from '@stratix/core';
import {
  type ExecutionContext,
  type ExecutionResult,
  type TaskExecutor
} from '@stratix/tasks';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';

// 定义验证结果类型
interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * 同步数据源配置
 */
export interface FetchSyncSourcesConfig {
  /** 学年学期 */
  xnxq: string;
  /** 是否包含日历数据 */
  includeCalendars?: boolean;
  /** 是否包含用户数据 */
  includeUsers?: boolean;
  /** 是否包含日程数据 */
  includeSchedules?: boolean;
  /** 分组方式 */
  groupBy?: 'calendar' | 'department' | 'course';
  /** 最大分组数量 */
  maxGroups?: number;
  /** 每组最大项目数 */
  maxItemsPerGroup?: number;
}

/**
 * 日历组数据结构
 */
export interface CalendarGroupData {
  /** 日历信息 */
  calendar: {
    kkh: string;
    name: string;
    xnxq: string;
    courseInfo: any;
  };
  /** 参与者列表 */
  participants: Array<{
    userId: string;
    userName: string;
    role: string;
    permissions: string[];
    userInfo: any;
  }>;
  /** 日程列表 */
  schedules: Array<{
    scheduleId: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string;
    attachments?: any[];
    scheduleInfo: any;
  }>;
  /** 权限配置 */
  permissions: Array<{
    permissionId: string;
    type: string;
    target: string;
    level: string;
    config: any;
  }>;
  /** 统计信息 */
  stats: {
    participantCount: number;
    scheduleCount: number;
    permissionCount: number;
    estimatedProcessingTime: number;
  };
}

/**
 * 同步数据源输出
 */
export interface FetchSyncSourcesOutput {
  /** 日历组列表 */
  calendarGroups: CalendarGroupData[];
  /** 总体统计 */
  summary: {
    totalCalendars: number;
    totalParticipants: number;
    totalSchedules: number;
    totalPermissions: number;
    estimatedTotalTime: number;
  };
  /** 处理建议 */
  recommendations: {
    suggestedConcurrency: number;
    suggestedBatchSize: number;
    estimatedMemoryUsage: string;
  };
}

/**
 * 获取同步数据源处理器
 */
export default class FetchSyncSourcesProcessor implements TaskExecutor {
  readonly name = 'fetchSyncSources';
  readonly description =
    '获取多循环同步工作流的数据源，按日历分组准备参与者、日程、权限数据';
  readonly version = '1.0.0';
  readonly tags = ['sync', 'data-source', 'multi-loop', 'calendar-group'];
  constructor(
    private juheRenwuRepository: IJuheRenwuRepository,
    private logger: Logger
  ) {}

  /**
   * 执行数据源获取
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const config = context.config as FetchSyncSourcesConfig;

      // 验证配置
      this.internalValidateConfig(config);

      this.logger.info('开始获取同步数据源', {
        xnxq: config.xnxq,
        groupBy: config.groupBy,
        maxGroups: config.maxGroups
      });

      // 1. 获取所有需要同步的课程
      const coursesResult = await this.juheRenwuRepository.findDistinctCourses(
        config.xnxq
      );
      if (!coursesResult.success) {
        throw new Error(`获取课程列表失败: ${coursesResult.error}`);
      }

      const courses = coursesResult.data;
      this.logger.info(`找到 ${courses.length} 个课程需要同步`);

      // 2. 为每个课程构建日历组数据
      const calendarGroups: CalendarGroupData[] = [];
      let totalParticipants = 0;
      let totalSchedules = 0;
      let totalPermissions = 0;

      for (const course of courses.slice(0, config.maxGroups)) {
        const groupData = await this.buildCalendarGroupData(course, config);
        calendarGroups.push(groupData);

        totalParticipants += groupData.stats.participantCount;
        totalSchedules += groupData.stats.scheduleCount;
        totalPermissions += groupData.stats.permissionCount;
      }

      // 3. 生成处理建议
      const recommendations = this.generateRecommendations(calendarGroups);

      // 4. 构建输出结果
      const output: FetchSyncSourcesOutput = {
        calendarGroups,
        summary: {
          totalCalendars: calendarGroups.length,
          totalParticipants,
          totalSchedules,
          totalPermissions,
          estimatedTotalTime: calendarGroups.reduce(
            (sum, group) => sum + group.stats.estimatedProcessingTime,
            0
          )
        },
        recommendations
      };

      const duration = Date.now() - startTime;
      this.logger.info('同步数据源获取完成', {
        totalGroups: calendarGroups.length,
        totalParticipants,
        totalSchedules,
        duration: `${duration}ms`,
        recommendations
      });

      return {
        success: true,
        data: output
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('获取同步数据源失败', {
        error: errorMessage,
        duration: `${duration}ms`,
        config: context.config
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 构建单个日历组的数据
   */
  private async buildCalendarGroupData(
    course: any,
    config: FetchSyncSourcesConfig
  ): Promise<CalendarGroupData> {
    // 获取该课程的所有聚合数据
    const tasksResult = await this.juheRenwuRepository.findByKkh(course.kkh);
    if (!tasksResult.success) {
      throw new Error(
        `获取课程 ${course.kkh} 的数据失败: ${tasksResult.error}`
      );
    }

    const tasks = tasksResult.data.filter((task) => task.xnxq === config.xnxq);

    // 构建参与者数据
    const participants = this.extractParticipants(tasks, config);

    // 构建日程数据
    const schedules = this.extractSchedules(tasks, config);

    // 构建权限数据
    const permissions = this.extractPermissions(tasks, config);

    // 计算统计信息
    const stats = {
      participantCount: participants.length,
      scheduleCount: schedules.length,
      permissionCount: permissions.length,
      estimatedProcessingTime: this.estimateProcessingTime(
        participants,
        schedules,
        permissions
      )
    };

    return {
      calendar: {
        kkh: course.kkh,
        name: course.kcmc || `课程-${course.kkh}`,
        xnxq: config.xnxq,
        courseInfo: course
      },
      participants,
      schedules,
      permissions,
      stats
    };
  }

  /**
   * 提取参与者数据
   */
  private extractParticipants(
    tasks: any[],
    config: FetchSyncSourcesConfig
  ): any[] {
    if (!config.includeUsers) return [];

    const participantMap = new Map();

    for (const task of tasks) {
      // 从聚合数据中提取参与者信息
      const participants = this.parseParticipantsFromTask(task);
      for (const participant of participants) {
        if (!participantMap.has(participant.userId)) {
          participantMap.set(participant.userId, participant);
        }
      }
    }

    return Array.from(participantMap.values()).slice(
      0,
      config.maxItemsPerGroup
    );
  }

  /**
   * 提取日程数据
   */
  private extractSchedules(
    tasks: any[],
    config: FetchSyncSourcesConfig
  ): any[] {
    if (!config.includeSchedules) return [];

    const schedules = [];

    for (const task of tasks) {
      // 从聚合数据中提取日程信息
      const taskSchedules = this.parseSchedulesFromTask(task);
      schedules.push(...taskSchedules);
    }

    return schedules.slice(0, config.maxItemsPerGroup);
  }

  /**
   * 提取权限数据
   */
  private extractPermissions(
    _tasks: any[],
    _config: FetchSyncSourcesConfig
  ): any[] {
    // 生成默认权限配置
    return [
      {
        permissionId: 'default-read',
        type: 'calendar',
        target: 'all-participants',
        level: 'read',
        config: { inherited: true }
      },
      {
        permissionId: 'teacher-write',
        type: 'calendar',
        target: 'teachers',
        level: 'write',
        config: { inherited: false }
      }
    ];
  }

  /**
   * 从任务中解析参与者
   */
  private parseParticipantsFromTask(task: any): any[] {
    // 实现参与者解析逻辑
    return [
      {
        userId: task.gh || 'unknown',
        userName: task.xm || '未知用户',
        role: task.jsxm || 'participant',
        permissions: ['read'],
        userInfo: task
      }
    ];
  }

  /**
   * 从任务中解析日程
   */
  private parseSchedulesFromTask(task: any): any[] {
    // 实现日程解析逻辑
    return [
      {
        scheduleId: `${task.id}_schedule`,
        title: task.kcmc || '课程',
        startTime: task.kssj || '',
        endTime: task.jssj || '',
        location: task.jsdd || '',
        scheduleInfo: task
      }
    ];
  }

  /**
   * 估算处理时间
   */
  private estimateProcessingTime(
    participants: any[],
    schedules: any[],
    permissions: any[]
  ): number {
    // 基于数据量估算处理时间（毫秒）
    return (
      participants.length * 100 +
      schedules.length * 150 +
      permissions.length * 50
    );
  }

  /**
   * 生成处理建议
   */
  private generateRecommendations(calendarGroups: CalendarGroupData[]): any {
    const totalItems = calendarGroups.reduce(
      (sum, group) =>
        sum + group.stats.participantCount + group.stats.scheduleCount,
      0
    );

    return {
      suggestedConcurrency: Math.min(
        Math.max(Math.floor(totalItems / 100), 2),
        10
      ),
      suggestedBatchSize: Math.min(
        Math.max(Math.floor(totalItems / 50), 10),
        100
      ),
      estimatedMemoryUsage: `${Math.ceil(totalItems * 0.5)}MB`
    };
  }

  /**
   * 验证配置
   */
  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.xnxq) {
      errors.push('学年学期参数 xnxq 是必需的');
    } else if (!/^\d{4}-\d{4}-[12]$/.test(config.xnxq)) {
      errors.push('学年学期格式不正确，应为：YYYY-YYYY-S');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 内部验证配置（抛出异常）
   */
  private internalValidateConfig(config: FetchSyncSourcesConfig): void {
    const result = this.validateConfig(config);
    if (!result.valid && result.errors) {
      throw new Error(result.errors.join('; '));
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      if (!this.juheRenwuRepository) {
        return 'unhealthy';
      }
      return 'healthy';
    } catch (error) {
      this.logger.error('健康检查失败', error);
      return 'unhealthy';
    }
  }
}
