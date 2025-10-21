// @wps/hltnlink 日历创建服务接口定义
// 定义日历创建服务的契约

import type { DatabaseResult } from '@stratix/database';

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
    calendarId: string | number;
  }>;
}

/**
 * 日历创建统计信息接口
 */
export interface CalendarCreationStatistics {
  /** 总日历数量 */
  totalCalendars: number;
  /** 活跃状态的学期日历数量 */
  activeSemesterCalendars: number;
  /** 最近24小时创建的日历数量 */
  recentCreations: number;
}

/**
 * 日历删除结果接口
 */
export interface CalendarDeletionResult {
  /** 找到的日历总数 */
  totalFound: number;
  /** 成功删除的数量 */
  deletedCount: number;
  /** 删除失败的日历列表 */
  failedDeletions: Array<{
    calendarId: string | number;
    wpsCalendarId: string;
    error: string;
  }>;
}

/**
 * 日历创建服务接口
 * 定义从源课程数据创建WPS日历的所有方法
 */
export interface ICalendarCreationService {
  // ========== 核心功能方法 ==========

  /**
   * 从源课程数据创建日历
   * @param batchId 批次ID
   * @param semester 学期码（KKXQM）
   * @returns 日历创建结果
   */
  createCalendarsFromCourses(
    batchId: string,
    semester: string
  ): Promise<DatabaseResult<CalendarCreationResult>>;

  // ========== 连接测试方法 ==========

  /**
   * 测试WPS API连接
   * @returns 是否连接成功
   */
  testWpsApiConnection(): Promise<boolean>;

  // ========== 统计查询方法 ==========

  /**
   * 获取创建统计信息
   * @param semester 学期码
   * @returns 统计信息
   */
  getCreationStatistics(
    semester: string
  ): Promise<DatabaseResult<CalendarCreationStatistics>>;

  // ========== 管理方法 ==========

  /**
   * 批量删除指定学期的日历
   * @param semester 学期码
   * @param dryRun 是否为试运行（不实际删除）
   * @returns 删除结果
   */
  deleteCalendarsBySemester(
    semester: string,
    dryRun?: boolean
  ): Promise<DatabaseResult<CalendarDeletionResult>>;
}
