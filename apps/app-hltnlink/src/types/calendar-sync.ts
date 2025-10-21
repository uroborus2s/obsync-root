// @wps/hltnlink 课表到WPS日程同步服务类型定义
// 基于Stratix框架的Service层类型定义

// ========== 同步参数类型 ==========

/**
 * 课表同步参数
 */
export interface CalendarSyncParams {
  /** 批次ID */
  batchId: string;
  /** 学期码 */
  semester: string;
  /** 课程批次ID（用于获取课程数据） */
  courseBatchId?: string;
  /** 选课批次ID（用于获取权限数据） */
  selectionBatchId?: string;
  /** 是否强制重新同步 */
  forceSync?: boolean;
  /** 同步选项 */
  options?: CalendarSyncOptions;
}

/**
 * 同步选项
 */
export interface CalendarSyncOptions {
  /** 是否同步权限 */
  syncPermissions?: boolean;
  /** 是否同步日程 */
  syncSchedules?: boolean;
  /** 批量操作大小 */
  batchSize?: number;
  /** 操作间隔（毫秒） */
  delayMs?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

// ========== 日历数据类型 ==========

/**
 * 日历信息
 */
export interface CalendarInfo {
  /** 日历ID */
  calendarId: string;
  /** WPS日历ID */
  wpsCalendarId: string;
  /** 课程ID */
  courseId: string;
  /** 课程名称 */
  courseName: string;
  /** 教师ID */
  teacherId: string;
  /** 教师姓名 */
  teacherName: string;
  /** 学期 */
  semester: string;
}

/**
 * 权限数据
 */
export interface PermissionData {
  /** 学生ID */
  studentId: string;
  /** 课程序号 */
  courseSequence: string;
  /** 学期码 */
  semester: string;
  /** 批次ID */
  batchId: string;
}

/**
 * 课程日程数据
 */
export interface CourseScheduleData {
  /** 课程序号 */
  courseSequence: string;
  /** 课程名称 */
  courseName: string;
  /** 教师姓名 */
  teacherName: string;
  /** 教师工号 */
  teacherCode: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 星期几 */
  weekday: string;
  /** 上课周次 */
  weeks: string;
  /** 教室 */
  classroom: string;
  /** 学期码 */
  semester: string;
  /** 批次ID */
  batchId: string;
}

// ========== WPS API数据类型 ==========

/**
 * WPS重复规则排除日期
 */
export interface WpsExcludeDate {
  /** 日期，格式为 "yyyy-mm-dd" */
  date?: string;
  /** 日期时间，格式为 RFC3339 */
  datetime?: string;
}

/**
 * WPS重复规则结束日期
 */
export interface WpsUntilDate {
  /** 日期，格式为 "yyyy-mm-dd" */
  date?: string;
  /** 日期时间，格式为 RFC3339 */
  datetime?: string;
}

/**
 * WPS重复规则（对象格式）
 */
export interface WpsRecurrenceRule {
  /** 重复频率：YEARLY/MONTHLY/WEEKLY/DAILY */
  freq: 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY';
  /** 周几，如 MO(周一), TU, WE, TH, FR, SA, SU(周日) */
  by_day?: string[];
  /** 一年的哪几个月 */
  by_month?: number[];
  /** 一个月的哪几天 */
  by_month_day?: number[];
  /** 重复次数 */
  count?: number;
  /** 重复间隔 */
  interval?: number;
  /** 排除日期 */
  exdate?: WpsExcludeDate[];
  /** 重复规则的结束日期 */
  until_date?: WpsUntilDate;
}

/**
 * WPS日程创建参数
 */
export interface WpsScheduleCreateParams {
  /** 日历ID */
  calendarId: string;
  /** 事件标题 */
  summary: string;
  /** 事件描述 */
  description?: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 重复规则（支持RFC 5545字符串数组或对象格式） */
  recurrence?: string[] | WpsRecurrenceRule;
  /** 位置 */
  location?: string;
  /** 提醒设置 */
  reminders?: { minutes: number }[];
}

/**
 * WPS权限添加参数
 */
export interface WpsPermissionAddParams {
  /** 日历ID */
  calendarId: string;
  /** 用户ID列表 */
  userIds: string[];
  /** 权限类型 */
  role?: 'reader' | 'writer' | 'owner';
}

// ========== 同步结果类型 ==========

/**
 * 同步结果
 */
export interface CalendarSyncResult {
  /** 是否成功 */
  success: boolean;
  /** 处理的日历数量 */
  totalCalendars: number;
  /** 成功处理的日历数量 */
  successfulCalendars: number;
  /** 失败的日历数量 */
  failedCalendars: number;
  /** 权限同步结果 */
  permissionResults: PermissionSyncResult[];
  /** 日程同步结果 */
  scheduleResults: ScheduleSyncResult[];
  /** 错误信息 */
  errors: SyncError[];
  /** 执行时间（毫秒） */
  duration: number;
  /** 详细统计 */
  statistics: SyncStatistics;
}

/**
 * 权限同步结果
 */
export interface PermissionSyncResult {
  /** 日历ID */
  calendarId: string;
  /** 课程序号 */
  courseSequence: string;
  /** 添加的权限数量 */
  addedPermissions: number;
  /** 失败的权限数量 */
  failedPermissions: number;
  /** 错误信息 */
  errors: string[];
}

/**
 * 日程同步结果
 */
export interface ScheduleSyncResult {
  /** 日历ID */
  calendarId: string;
  /** 课程序号 */
  courseSequence: string;
  /** 创建的日程数量 */
  createdSchedules: number;
  /** 失败的日程数量 */
  failedSchedules: number;
  /** 错误信息 */
  errors: string[];
}

/**
 * 同步错误
 */
export interface SyncError {
  /** 错误类型 */
  type:
    | 'CALENDAR_NOT_FOUND'
    | 'PERMISSION_FAILED'
    | 'SCHEDULE_FAILED'
    | 'API_ERROR'
    | 'DATABASE_ERROR';
  /** 错误消息 */
  message: string;
  /** 相关的日历ID */
  calendarId?: string;
  /** 相关的课程序号 */
  courseSequence?: string;
  /** 错误详情 */
  details?: any;
}

/**
 * 同步统计
 */
export interface SyncStatistics {
  /** 总权限数量 */
  totalPermissions: number;
  /** 成功权限数量 */
  successfulPermissions: number;
  /** 总日程数量 */
  totalSchedules: number;
  /** 成功日程数量 */
  successfulSchedules: number;
  /** API调用次数 */
  apiCalls: number;
  /** 数据库操作次数 */
  dbOperations: number;
}

// ========== 进度回调类型 ==========

/**
 * 同步进度信息
 */
export interface SyncProgress {
  /** 当前步骤 */
  step:
    | 'FETCHING_CALENDARS'
    | 'SYNCING_PERMISSIONS'
    | 'SYNCING_SCHEDULES'
    | 'COMPLETED';
  /** 当前处理的日历索引 */
  currentCalendar: number;
  /** 总日历数量 */
  totalCalendars: number;
  /** 进度百分比 */
  percentage: number;
  /** 当前处理的课程序号 */
  currentCourseSequence?: string;
  /** 消息 */
  message?: string;
}

/**
 * 进度回调函数类型
 */
export type SyncProgressCallback = (progress: SyncProgress) => void;

// ========== 服务结果类型 ==========

/**
 * 服务执行结果
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  message?: string;
}

/**
 * 服务错误信息
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

// ========== 权限批次处理类型 ==========

/**
 * 权限批次处理结果
 */
export interface PermissionBatchResult {
  /** 批次编号 */
  batchNumber: number;
  /** 用户数量 */
  userCount: number;
  /** 成功添加的权限数量 */
  successCount: number;
  /** 失败的权限数量 */
  failureCount: number;
  /** 跳过的用户数量（不存在的用户） */
  skippedCount: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 不存在的用户ID列表 */
  nonExistentUserIds?: string[];
}

/**
 * 权限添加详细结果
 */
export interface PermissionAddResult {
  /** 总成功数量 */
  totalSuccessful: number;
  /** 总失败数量 */
  totalFailed: number;
  /** 总跳过数量 */
  totalSkipped: number;
  /** 批次结果列表 */
  batchResults: PermissionBatchResult[];
  /** 错误信息列表 */
  errors: string[];
  /** 处理的批次数量 */
  batchCount: number;
}
