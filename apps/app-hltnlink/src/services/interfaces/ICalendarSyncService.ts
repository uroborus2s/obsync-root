// @wps/hltnlink 课表到WPS日程同步服务接口定义
// 基于Stratix框架的Service层接口规范

import type {
  CalendarInfo,
  CalendarSyncParams,
  CalendarSyncResult,
  CourseScheduleData,
  PermissionData,
  ServiceResult,
  WpsRecurrenceRule,
  WpsScheduleCreateParams
} from '../../types/calendar-sync.js';

/**
 * 课表到WPS日程同步服务接口
 * 定义从课表数据到WPS日程的完整同步流程
 */
export interface ICalendarSyncService {
  // ========== 核心同步方法 ==========

  /**
   * 执行完整的课表到WPS日程同步流程
   * @param params 同步参数
   * @param progressCallback 进度回调函数
   * @returns 同步结果
   */
  syncCalendarSchedules(
    params: CalendarSyncParams
  ): Promise<ServiceResult<CalendarSyncResult>>;

  /**
   * 为单个日历执行同步
   * @param calendarInfo 日历信息
   * @param params 同步参数
   * @returns 同步结果
   */
  syncSingleCalendar(
    calendarInfo: CalendarInfo,
    params: CalendarSyncParams
  ): Promise<
    ServiceResult<{
      permissionResult: any;
      scheduleResult: any;
    }>
  >;

  // ========== 数据获取方法 ==========

  /**
   * 获取需要同步的日历数据
   * @param semester 学期码
   * @returns 日历数据列表
   */
  getCalendarsForSync(semester: string): Promise<ServiceResult<CalendarInfo[]>>;

  /**
   * 获取指定课程的权限数据（学生ID列表）
   * @param courseSequence 课程序号
   * @param batchId 批次ID
   * @param semester 学期码
   * @returns 权限数据列表
   */
  getPermissionData(
    courseSequence: string,
    batchId: string,
    semester: string
  ): Promise<ServiceResult<PermissionData[]>>;

  /**
   * 获取指定课程的日程数据
   * @param courseSequence 课程序号
   * @param batchId 批次ID
   * @param semester 学期码
   * @returns 日程数据列表
   */
  getScheduleData(
    courseSequence: string,
    batchId: string,
    semester: string
  ): Promise<ServiceResult<CourseScheduleData[]>>;

  // ========== WPS API操作方法 ==========

  /**
   * 批量添加日历权限
   * @param calendarId WPS日历ID
   * @param studentIds 学生ID列表
   * @returns 添加结果
   */
  addCalendarPermissions(
    calendarId: string,
    studentIds: string[]
  ): Promise<
    ServiceResult<{
      successful: number;
      failed: number;
      errors: string[];
    }>
  >;

  /**
   * 创建WPS日程
   * @param scheduleParams 日程创建参数
   * @returns 创建结果
   */
  createWpsSchedule(scheduleParams: WpsScheduleCreateParams): Promise<
    ServiceResult<{
      eventId: string;
      success: boolean;
    }>
  >;

  /**
   * 批量创建WPS日程
   * @param calendarId 日历ID
   * @param schedules 日程数据列表
   * @returns 批量创建结果
   */
  batchCreateWpsSchedules(
    calendarId: string,
    schedules: CourseScheduleData[]
  ): Promise<
    ServiceResult<{
      successful: number;
      failed: number;
      errors: string[];
    }>
  >;

  // ========== 数据转换方法 ==========

  /**
   * 将课程数据转换为WPS日程格式
   * @param courseData 课程数据
   * @param calendarId 日历ID
   * @returns WPS日程创建参数
   */
  convertCourseToWpsSchedule(
    courseData: CourseScheduleData,
    calendarId: string
  ): WpsScheduleCreateParams;

  /**
   * 解析上课周次字符串
   * @param weeksString 周次字符串（如："1-16周"）
   * @returns 周次数组
   */
  parseWeeksString(weeksString: string): number[];

  /**
   * 生成重复规则（对象格式）
   * @param weekday 星期几
   * @param weeks 周次数组
   * @param startDate 开始日期
   * @param semester 学期码
   * @param endTime 结束时间（用于计算until_date）
   * @param startTime 开始时间（用于计算排除日期的具体时间）
   * @returns WPS API对象格式的重复规则
   */
  generateRecurrenceRuleObject(
    weekday: number,
    weeks: number[],
    startDate: Date,
    semester: string,
    endTime?: string,
    startTime?: string
  ): WpsRecurrenceRule;

  /**
   * 生成重复规则（字符串数组格式）
   * @param weekday 星期几
   * @param weeks 周次数组
   * @param startDate 开始日期
   * @param semester 学期码
   * @returns RFC 5545格式的重复规则字符串数组
   */
  generateRecurrenceRule(
    weekday: number,
    weeks: number[],
    startDate: Date,
    semester: string
  ): string[];

  // ========== 工具方法 ==========

  /**
   * 验证同步参数
   * @param params 同步参数
   * @returns 验证结果
   */
  validateSyncParams(params: CalendarSyncParams): ServiceResult<boolean>;

  /**
   * 测试WPS API连接
   * @returns 连接测试结果
   */
  testWpsApiConnection(): Promise<ServiceResult<boolean>>;

  /**
   * 获取同步统计信息
   * @param batchId 批次ID
   * @param semester 学期码
   * @returns 统计信息
   */
  getSyncStatistics(
    batchId: string,
    semester: string
  ): Promise<
    ServiceResult<{
      totalCalendars: number;
      syncedCalendars: number;
      totalPermissions: number;
      totalSchedules: number;
      lastSyncTime?: Date;
    }>
  >;

  /**
   * 清理失败的同步数据
   * @param batchId 批次ID
   * @param semester 学期码
   * @returns 清理结果
   */
  cleanupFailedSync(
    batchId: string,
    semester: string
  ): Promise<
    ServiceResult<{
      cleanedPermissions: number;
      cleanedSchedules: number;
    }>
  >;

  // ========== 错误处理方法 ==========

  /**
   * 处理API错误
   * @param error 错误对象
   * @param context 错误上下文
   * @returns 处理后的错误信息
   */
  handleApiError(error: any, context: string): ServiceResult<never>;

  /**
   * 处理数据库错误
   * @param error 错误对象
   * @param context 错误上下文
   * @returns 处理后的错误信息
   */
  handleDatabaseError(error: any, context: string): ServiceResult<never>;

  /**
   * 重试操作
   * @param operation 操作函数
   * @param maxRetries 最大重试次数
   * @param delayMs 重试间隔
   * @returns 操作结果
   */
  retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delayMs: number
  ): Promise<T>;
}
