// @wps/hltnlink 日历创建服务
// 负责从源课程数据创建WPS日历

import { type Logger } from '@stratix/core';
import type { DatabaseResult } from '@stratix/database';
import { WpsCalendarAdapter } from '@stratix/was-v7';
import type CalendarRepository from '../repositories/CalendarRepository.js';
import type SourceCourseRepository from '../repositories/SourceCourseRepository.js';
import type { NewCalendar } from '../types/database.schema.js';

/**
 * 日历创建结果接口
 */
export interface CalendarCreationResult {
  /** 总处理的课程序号数量 */
  totalCourseSequences: number;
  /** 成功创建的日历数量 */
  successfulCalendars: number;
  /** 失败的课程序号列表 */
  failedCourseSequences: Array<{
    courseSequence: string;
    courseName: string;
    teacherName: string;
    error: string;
  }>;
  /** 跳过的课程序号（已存在日历） */
  skippedCourseSequences: Array<{
    courseSequence: string;
    courseName: string;
    reason: string;
  }>;
  /** 处理耗时（毫秒） */
  duration: number;
  /** 创建的日历详情 */
  createdCalendars: Array<{
    courseSequence: string;
    courseName: string;
    teacherName: string;
    wpsCalendarId: string;
  }>;
}

/**
 * 课程序号信息接口
 */
export interface CourseSequenceInfo {
  /** 课程序号 */
  KXH: string;
  /** 课程名称 */
  KCMC: string;
  /** 教师姓名 */
  JSXM: string;
  /** 教师工号 */
  JSGH: string;
  /** 课程号 */
  KCH: string;
  /** 学期码 */
  KKXQM: string;
}

/**
 * WPS API配置接口
 */
export interface WpsApiConfig {
  /** API基础URL */
  baseUrl: string;
  /** 应用ID */
  appId: string;
  /** 应用密钥 */
  appSecret: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
}

/**
 * WPS日历创建响应接口
 */
export interface WpsCalendarCreateResponse {
  /** 是否成功 */
  success: boolean;
  /** WPS日历ID */
  calendarId?: string;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
}

/**
 * 日历创建服务
 * 负责从源课程数据查询课程序号，并为每个序号创建WPS日历
 */
export default class CalendarCreationService {
  constructor(
    private readonly wasV7ApiCalendar: WpsCalendarAdapter,
    private readonly calendarRepository: CalendarRepository,
    private readonly sourceCourseRepository: SourceCourseRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 从源课程数据创建日历
   * @param batchId 批次ID
   * @param semester 学期码（KKXQM）
   * @returns 日历创建结果
   */
  async createCalendarsFromCourses(
    batchId: string,
    semester: string
  ): Promise<DatabaseResult<CalendarCreationResult>> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting calendar creation from courses', {
        batchId,
        semester
      });

      // 1. 查询唯一的课程序号
      const courseSequencesResult = await this.getUniqueCourseSequences(
        batchId,
        semester
      );

      if (!courseSequencesResult.success) {
        return {
          success: false,
          error: courseSequencesResult.error
        };
      }

      const courseSequences = courseSequencesResult.data;
      this.logger.info(
        `Found ${courseSequences.length} unique course sequences`
      );

      if (courseSequences.length === 0) {
        return {
          success: true,
          data: {
            totalCourseSequences: 0,
            successfulCalendars: 0,
            failedCourseSequences: [],
            skippedCourseSequences: [],
            duration: Date.now() - startTime,
            createdCalendars: []
          }
        };
      }

      // 2. 为每个课程序号创建日历
      const result = await this.createCalendarsForSequences(
        courseSequences,
        semester
      );

      const totalDuration = Date.now() - startTime;
      result.duration = totalDuration;

      this.logger.info('Calendar creation completed', {
        totalCourseSequences: result.totalCourseSequences,
        successfulCalendars: result.successfulCalendars,
        failedCount: result.failedCourseSequences.length,
        skippedCount: result.skippedCourseSequences.length,
        duration: totalDuration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Calendar creation failed', error);
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 查询唯一的课程序号
   * @param batchId 批次ID
   * @param semester 学期码
   * @returns 课程序号信息列表
   */
  private async getUniqueCourseSequences(
    batchId: string,
    semester: string
  ): Promise<DatabaseResult<CourseSequenceInfo[]>> {
    try {
      // 使用SourceCourseRepository的新方法直接获取唯一课程序号
      const result =
        await this.sourceCourseRepository.findCourseSequencesBySemester(
          batchId,
          semester
        );

      if (!result.success) {
        return result;
      }

      this.logger.info(
        `Query returned ${result.data.length} unique course sequences`
      );

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('Failed to query unique course sequences', error);
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 为课程序号列表创建日历
   * @param courseSequences 课程序号信息列表
   * @param semester 学期码
   * @returns 创建结果
   */
  private async createCalendarsForSequences(
    courseSequences: CourseSequenceInfo[],
    semester: string
  ): Promise<CalendarCreationResult> {
    const result: CalendarCreationResult = {
      totalCourseSequences: courseSequences.length,
      successfulCalendars: 0,
      failedCourseSequences: [],
      skippedCourseSequences: [],
      duration: 0,
      createdCalendars: []
    };

    for (const courseInfo of courseSequences) {
      try {
        // 检查是否已存在日历
        const existingCalendar = await this.calendarRepository.findByCourseId(
          courseInfo.KXH,
          semester
        );

        if (existingCalendar.success && existingCalendar.data) {
          result.skippedCourseSequences.push({
            courseSequence: courseInfo.KXH,
            courseName: courseInfo.KCMC,
            reason: 'Calendar already exists'
          });
          continue;
        }

        // 创建WPS日历
        const wpsResult = await this.wasV7ApiCalendar.createCalendar({
          summary: courseInfo.KCMC
        });

        if (!wpsResult || !wpsResult.id) {
          result.failedCourseSequences.push({
            courseSequence: courseInfo.KXH,
            courseName: courseInfo.KCMC,
            teacherName: courseInfo.JSXM,
            error: 'WPS API returned invalid response'
          });
          continue;
        }

        // 保存到数据库
        const calendarData: NewCalendar = {
          wps_calendar_id: wpsResult.id,
          course_id: courseInfo.KXH,
          course_name: courseInfo.KCMC,
          teacher_id: courseInfo.JSGH,
          teacher_name: courseInfo.JSXM,
          xnxq: courseInfo.KKXQM,
          status: 'ACTIVE'
        };

        const saveResult = await this.calendarRepository.create(calendarData);

        if (!saveResult.success) {
          result.failedCourseSequences.push({
            courseSequence: courseInfo.KXH,
            courseName: courseInfo.KCMC,
            teacherName: courseInfo.JSXM,
            error: `Database save failed: ${saveResult.error}`
          });
          continue;
        }

        // 成功创建
        result.successfulCalendars++;
        result.createdCalendars.push({
          courseSequence: courseInfo.KXH,
          courseName: courseInfo.KCMC,
          teacherName: courseInfo.JSXM,
          wpsCalendarId: wpsResult.id
        });

        this.logger.info(
          `Successfully created calendar for course ${courseInfo.KXH}`
        );

        // 添加延迟以避免API限流
        await this.delay(100);
      } catch (error) {
        result.failedCourseSequences.push({
          courseSequence: courseInfo.KXH,
          courseName: courseInfo.KCMC,
          teacherName: courseInfo.JSXM,
          error: `Unexpected error: ${error}`
        });
      }
    }

    return result;
  }

  /**
   * 获取创建统计信息
   * @param semester 学期码
   * @returns 统计信息
   */
  async getCreationStatistics(semester: string): Promise<
    DatabaseResult<{
      totalCalendars: number;
      activeSemesterCalendars: number;
      recentCreations: number;
    }>
  > {
    try {
      // 获取总日历数量
      const totalResult =
        await this.calendarRepository.countBySemester(semester);
      if (!totalResult.success) {
        return totalResult;
      }

      // 获取活跃状态的日历数量
      const activeResult = await this.calendarRepository.countBySemester(
        semester,
        'ACTIVE'
      );
      if (!activeResult.success) {
        return activeResult;
      }

      // 获取最近24小时创建的日历数量 - 使用简单的计数方法
      const recentCreations = 0; // 暂时设为0，可以后续通过其他方式实现

      return {
        success: true,
        data: {
          totalCalendars: totalResult.data,
          activeSemesterCalendars: activeResult.data,
          recentCreations: recentCreations
        }
      };
    } catch (error) {
      this.logger.error('Failed to get creation statistics', error);
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 批量删除指定学期的日历
   * @param semester 学期码
   * @param dryRun 是否为试运行（不实际删除）
   * @returns 删除结果
   */
  async deleteCalendarsBySemester(
    semester: string,
    dryRun: boolean = true
  ): Promise<
    DatabaseResult<{
      totalFound: number;
      deletedCount: number;
      failedDeletions: Array<{
        calendarId: number;
        wpsCalendarId: string;
        error: string;
      }>;
    }>
  > {
    try {
      this.logger.info(
        `${dryRun ? 'Dry run: ' : ''}Deleting calendars for semester ${semester}`
      );

      // 查找指定学期的所有日历
      const calendarsResult = await this.calendarRepository.findBySemester({
        xnxq: semester
      });

      if (!calendarsResult.success) {
        return calendarsResult;
      }

      const calendars = calendarsResult.data;
      const result = {
        totalFound: calendars.length,
        deletedCount: 0,
        failedDeletions: [] as Array<{
          calendarId: number;
          wpsCalendarId: string;
          error: string;
        }>
      };

      if (dryRun) {
        this.logger.info(
          `Dry run: Found ${calendars.length} calendars to delete`
        );
        return {
          success: true,
          data: result
        };
      }

      // 逐个删除日历
      for (const calendar of calendars) {
        try {
          // 模拟从WPS删除
          await this.delay(100);

          // 从数据库删除
          const deleteResult = await this.calendarRepository.delete(
            calendar.id!
          );

          if (deleteResult.success) {
            result.deletedCount++;
            this.logger.debug(`Deleted calendar ${calendar.id}`);
          } else {
            result.failedDeletions.push({
              calendarId: parseInt(calendar.id!) || 0,
              wpsCalendarId: calendar.wps_calendar_id,
              error: `Database deletion failed: ${deleteResult.error}`
            });
          }

          // 添加延迟避免过快处理
          await this.delay(50);
        } catch (error: any) {
          result.failedDeletions.push({
            calendarId: parseInt(calendar.id!) || 0,
            wpsCalendarId: calendar.wps_calendar_id,
            error: error.message
          });
        }
      }

      this.logger.info(
        `Calendar deletion completed: ${result.deletedCount}/${result.totalFound} successful`
      );

      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Failed to delete calendars by semester', error);
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 测试WPS API连接
   */
  async testWpsApiConnection(): Promise<boolean> {
    try {
      // 这里应该调用WPS API的健康检查接口
      // 暂时返回true作为模拟
      return true;
    } catch (error) {
      this.logger.error('WPS API connection test failed', error);
      return false;
    }
  }

  /**
   * 延迟工具方法
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
