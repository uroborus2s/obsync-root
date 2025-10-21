// @wps/hltnlink CalendarSchedule Repository 接口定义
// 基于Stratix框架的Repository层接口契约

import type { DatabaseResult } from '@stratix/database';
import type {
  CalendarSchedule,
  CalendarScheduleFilter,
  CourseQueryParams,
  HltnlinkDatabase,
  NewCalendarSchedule,
  CalendarScheduleUpdate,
  PaginatedResult,
  QueryOptions,
  RecurrenceType,
  SemesterQueryParams,
  SyncStatus,
  TimeRangeQueryParams
} from '../../types/database.schema.js';
import type { IRepository } from '@stratix/database';

/**
 * CalendarSchedule Repository 接口
 * 定义日历课程表数据访问层的所有方法
 */
export interface ICalendarScheduleRepository extends IRepository<
  HltnlinkDatabase,
  'calendar_schedules',
  CalendarSchedule,
  NewCalendarSchedule,
  CalendarScheduleUpdate
> {
  // ========== 基础查询方法 ==========

  /**
   * 根据日历ID查找课程表
   * @param calendarId 日历ID
   * @param options 查询选项
   * @returns 课程表列表
   */
  findByCalendarId(
    calendarId: number,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 根据课程ID查找课程表
   * @param params 课程查询参数
   * @param options 查询选项
   * @returns 课程表列表
   */
  findByCourseId(
    params: CourseQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 根据WPS事件ID查找课程表
   * @param wpsEventId WPS事件ID
   * @returns 课程表记录或null
   */
  findByWpsEventId(wpsEventId: string): Promise<DatabaseResult<CalendarSchedule | null>>;

  /**
   * 根据学年学期查找课程表
   * @param params 学期查询参数
   * @param options 查询选项
   * @returns 课程表列表
   */
  findBySemester(
    params: SemesterQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 根据时间范围查找课程表
   * @param params 时间范围查询参数
   * @param options 查询选项
   * @returns 课程表列表
   */
  findByTimeRange(
    params: TimeRangeQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  // ========== 高级查询方法 ==========

  /**
   * 根据过滤条件查找课程表
   * @param filter 过滤条件
   * @param options 查询选项
   * @returns 课程表列表
   */
  findByFilter(
    filter: CalendarScheduleFilter,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 分页查询课程表
   * @param filter 过滤条件（可选）
   * @param page 页码
   * @param limit 每页数量
   * @returns 分页结果
   */
  findPaginated(
    filter?: CalendarScheduleFilter,
    page?: number,
    limit?: number
  ): Promise<DatabaseResult<PaginatedResult<CalendarSchedule>>>;

  // ========== 业务查询方法 ==========

  /**
   * 查找指定同步状态的课程表
   * @param syncStatus 同步状态
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 课程表列表
   */
  findBySyncStatus(
    syncStatus: SyncStatus,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 查找指定重复类型的课程表
   * @param recurrenceType 重复类型
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 课程表列表
   */
  findByRecurrenceType(
    recurrenceType: RecurrenceType,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 查找待同步的课程表
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 待同步课程表列表
   */
  findPendingSync(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 查找同步失败的课程表
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 同步失败课程表列表
   */
  findFailedSync(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 根据星期和周次查找课程表
   * @param weekday 星期几（1-7）
   * @param weekNumber 周次（可选）
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 课程表列表
   */
  findByWeekdayAndWeek(
    weekday: number,
    weekNumber?: number,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 检查WPS事件ID是否已存在
   * @param wpsEventId WPS事件ID
   * @returns 是否存在
   */
  existsByWpsEventId(wpsEventId: string): Promise<DatabaseResult<boolean>>;

  /**
   * 检查指定时间段是否有冲突的课程
   * @param calendarId 日历ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param excludeId 排除的记录ID（可选）
   * @returns 是否有冲突
   */
  hasTimeConflict(
    calendarId: number,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<DatabaseResult<boolean>>;

  // ========== 批量操作方法 ==========

  /**
   * 批量创建课程表记录
   * @param schedules 课程表数据数组
   * @returns 创建的课程表列表
   */
  createMany(schedules: NewCalendarSchedule[]): Promise<DatabaseResult<CalendarSchedule[]>>;

  /**
   * 批量更新同步状态
   * @param ids 记录ID数组
   * @param syncStatus 新同步状态
   * @returns 更新的记录数
   */
  updateSyncStatusBatch(
    ids: number[],
    syncStatus: SyncStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 批量更新WPS事件ID
   * @param updates 更新数据数组
   * @returns 更新的记录数
   */
  updateWpsEventIdBatch(updates: Array<{
    id: number;
    wps_event_id: string;
  }>): Promise<DatabaseResult<number>>;

  /**
   * 根据日历ID批量删除课程表
   * @param calendarId 日历ID
   * @returns 删除的记录数
   */
  deleteByCalendarId(calendarId: number): Promise<DatabaseResult<number>>;

  /**
   * 根据课程ID和学期批量删除课程表
   * @param courseId 课程ID
   * @param xnxq 学年学期
   * @returns 删除的记录数
   */
  deleteByCourseAndSemester(
    courseId: string,
    xnxq: string
  ): Promise<DatabaseResult<number>>;

  // ========== 统计查询方法 ==========

  /**
   * 统计指定日历的课程表数量
   * @param calendarId 日历ID
   * @param syncStatus 同步状态（可选）
   * @returns 课程表数量
   */
  countByCalendar(
    calendarId: number,
    syncStatus?: SyncStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 统计指定课程的课程表数量
   * @param courseId 课程ID
   * @param xnxq 学年学期
   * @param syncStatus 同步状态（可选）
   * @returns 课程表数量
   */
  countByCourse(
    courseId: string,
    xnxq: string,
    syncStatus?: SyncStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 统计指定学期的课程表数量
   * @param xnxq 学年学期
   * @param syncStatus 同步状态（可选）
   * @returns 课程表数量
   */
  countBySemester(
    xnxq: string,
    syncStatus?: SyncStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 获取同步状态统计
   * @param xnxq 学年学期（可选）
   * @returns 同步状态统计
   */
  getSyncStatusStats(xnxq?: string): Promise<DatabaseResult<Array<{
    sync_status: SyncStatus;
    count: number;
  }>>>;

  /**
   * 获取指定日历的时间统计
   * @param calendarId 日历ID
   * @returns 时间统计
   */
  getTimeStatsByCalendar(calendarId: number): Promise<DatabaseResult<{
    total_schedules: number;
    earliest_time: string | null;
    latest_time: string | null;
    week_range: {
      min_week: number | null;
      max_week: number | null;
    };
  }>>;

  /**
   * 获取指定学期的周次分布
   * @param xnxq 学年学期
   * @returns 周次分布统计
   */
  getWeekDistribution(xnxq: string): Promise<DatabaseResult<Array<{
    week_number: number;
    schedule_count: number;
  }>>>;
}
