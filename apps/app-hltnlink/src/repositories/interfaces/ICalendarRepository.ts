// @wps/hltnlink Calendar Repository 接口定义
// 基于Stratix框架的Repository层接口契约

import type { DatabaseResult } from '@stratix/database';
import type {
  Calendar,
  CalendarFilter,
  CalendarStatus,
  CourseQueryParams,
  HltnlinkDatabase,
  NewCalendar,
  CalendarUpdate,
  PaginatedResult,
  QueryOptions,
  SemesterQueryParams,
  TeacherQueryParams
} from '../../types/database.schema.js';
import type { IRepository } from '@stratix/database';

/**
 * Calendar Repository 接口
 * 定义日历数据访问层的所有方法
 */
export interface ICalendarRepository extends IRepository<
  HltnlinkDatabase,
  'calendars',
  Calendar,
  NewCalendar,
  CalendarUpdate
> {
  // ========== 基础查询方法 ==========

  /**
   * 根据WPS日历ID查找日历
   * @param wpsCalendarId WPS日历ID
   * @returns 日历记录或null
   */
  findByWpsCalendarId(wpsCalendarId: string): Promise<DatabaseResult<Calendar | null>>;

  /**
   * 根据课程ID查找日历
   * @param courseId 课程ID
   * @param xnxq 学年学期（可选）
   * @returns 日历记录或null
   */
  findByCourseId(courseId: string, xnxq?: string): Promise<DatabaseResult<Calendar | null>>;

  /**
   * 根据教师ID查找日历列表
   * @param params 教师查询参数
   * @param options 查询选项
   * @returns 日历列表
   */
  findByTeacherId(
    params: TeacherQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>>;

  /**
   * 根据学年学期查找日历列表
   * @param params 学期查询参数
   * @param options 查询选项
   * @returns 日历列表
   */
  findBySemester(
    params: SemesterQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>>;

  // ========== 高级查询方法 ==========

  /**
   * 根据过滤条件查找日历
   * @param filter 过滤条件
   * @param options 查询选项
   * @returns 日历列表
   */
  findByFilter(
    filter: CalendarFilter,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>>;

  /**
   * 分页查询日历
   * @param filter 过滤条件（可选）
   * @param page 页码
   * @param limit 每页数量
   * @returns 分页结果
   */
  findPaginated(
    filter?: CalendarFilter,
    page?: number,
    limit?: number
  ): Promise<DatabaseResult<PaginatedResult<Calendar>>>;

  // ========== 业务查询方法 ==========

  /**
   * 查找活跃状态的日历
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 活跃日历列表
   */
  findActiveCalendars(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>>;

  /**
   * 查找指定状态的日历
   * @param status 日历状态
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 指定状态的日历列表
   */
  findByStatus(
    status: CalendarStatus,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>>;

  /**
   * 检查课程在指定学期是否已有日历
   * @param courseId 课程ID
   * @param xnxq 学年学期
   * @returns 是否存在
   */
  existsByCourseAndSemester(
    courseId: string,
    xnxq: string
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 检查WPS日历ID是否已存在
   * @param wpsCalendarId WPS日历ID
   * @returns 是否存在
   */
  existsByWpsCalendarId(wpsCalendarId: string): Promise<DatabaseResult<boolean>>;

  // ========== 批量操作方法 ==========

  /**
   * 批量创建日历
   * @param calendars 日历数据数组
   * @returns 创建的日历列表
   */
  createMany(calendars: NewCalendar[]): Promise<DatabaseResult<Calendar[]>>;

  /**
   * 批量更新日历状态
   * @param calendarIds 日历ID数组
   * @param status 新状态
   * @returns 更新的记录数
   */
  updateStatusBatch(
    calendarIds: string[],
    status: CalendarStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 根据学期批量更新状态
   * @param xnxq 学年学期
   * @param status 新状态
   * @returns 更新的记录数
   */
  updateStatusBySemester(
    xnxq: string,
    status: CalendarStatus
  ): Promise<DatabaseResult<number>>;

  // ========== 统计查询方法 ==========

  /**
   * 统计指定学期的日历数量
   * @param xnxq 学年学期
   * @param status 状态（可选）
   * @returns 日历数量
   */
  countBySemester(
    xnxq: string,
    status?: CalendarStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 统计指定教师的日历数量
   * @param teacherId 教师ID
   * @param xnxq 学年学期（可选）
   * @returns 日历数量
   */
  countByTeacher(
    teacherId: string,
    xnxq?: string
  ): Promise<DatabaseResult<number>>;

  /**
   * 获取所有学年学期列表
   * @returns 学年学期列表
   */
  getDistinctSemesters(): Promise<DatabaseResult<string[]>>;

  /**
   * 获取指定学期的所有教师列表
   * @param xnxq 学年学期
   * @returns 教师列表
   */
  getTeachersBySemester(xnxq: string): Promise<DatabaseResult<Array<{
    teacher_id: string;
    teacher_name: string;
    calendar_count: number;
  }>>>;
}
