// @wps/hltnlink CourseClass Repository 接口定义
// 基于Stratix框架的Repository层接口契约

import type { DatabaseResult, IRepository } from '@stratix/database';
import type {
  CourseClass,
  CourseClassFilter,
  CourseClassUpdate,
  CourseQueryParams,
  HltnlinkDatabase,
  NewCourseClass,
  PaginatedResult,
  PermissionType,
  QueryOptions,
  SemesterQueryParams,
  ShareStatus,
  StudentQueryParams
} from '../../types/database.schema.js';

/**
 * CourseClass Repository 接口
 * 定义开课班数据访问层的所有方法
 */
export interface ICourseClassRepository
  extends IRepository<
    HltnlinkDatabase,
    'course_classes',
    CourseClass,
    NewCourseClass,
    CourseClassUpdate
  > {
  // ========== 基础查询方法 ==========

  /**
   * 根据日历ID查找开课班列表
   * @param calendarId 日历ID
   * @param options 查询选项
   * @returns 开课班列表
   */
  findByCalendarId(
    calendarId: number,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>>;

  /**
   * 根据课程ID查找开课班列表
   * @param params 课程查询参数
   * @param options 查询选项
   * @returns 开课班列表
   */
  findByCourseId(
    params: CourseQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>>;

  /**
   * 根据学生学号查找开课班列表
   * @param params 学生查询参数
   * @param options 查询选项
   * @returns 开课班列表
   */
  findByStudentNumber(
    params: StudentQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>>;

  /**
   * 根据学年学期查找开课班列表
   * @param params 学期查询参数
   * @param options 查询选项
   * @returns 开课班列表
   */
  findBySemester(
    params: SemesterQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>>;

  // ========== 高级查询方法 ==========

  /**
   * 根据过滤条件查找开课班
   * @param filter 过滤条件
   * @param options 查询选项
   * @returns 开课班列表
   */
  findByFilter(
    filter: CourseClassFilter,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>>;

  /**
   * 分页查询开课班
   * @param filter 过滤条件（可选）
   * @param page 页码
   * @param limit 每页数量
   * @returns 分页结果
   */
  findPaginated(
    filter?: CourseClassFilter,
    page?: number,
    limit?: number
  ): Promise<DatabaseResult<PaginatedResult<CourseClass>>>;

  // ========== 业务查询方法 ==========

  /**
   * 查找指定分享状态的开课班
   * @param shareStatus 分享状态
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 开课班列表
   */
  findByShareStatus(
    shareStatus: ShareStatus,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>>;

  /**
   * 查找指定权限类型的开课班
   * @param permissionType 权限类型
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 开课班列表
   */
  findByPermissionType(
    permissionType: PermissionType,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>>;

  /**
   * 查找待分享的开课班
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 待分享开课班列表
   */
  findPendingShares(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>>;

  /**
   * 查找分享失败的开课班
   * @param xnxq 学年学期（可选）
   * @param options 查询选项
   * @returns 分享失败开课班列表
   */
  findFailedShares(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>>;

  /**
   * 检查学生是否已在指定日历中
   * @param calendarId 日历ID
   * @param studentNumber 学生学号
   * @returns 是否存在
   */
  existsByCalendarAndStudent(
    calendarId: number,
    studentNumber: string
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 检查学生是否已选择指定课程
   * @param courseId 课程ID
   * @param studentNumber 学生学号
   * @param xnxq 学年学期
   * @returns 是否存在
   */
  existsByCourseAndStudent(
    courseId: string,
    studentNumber: string,
    xnxq: string
  ): Promise<DatabaseResult<boolean>>;

  // ========== 批量操作方法 ==========

  /**
   * 批量创建开课班记录
   * @param courseClasses 开课班数据数组
   * @returns 创建的开课班列表
   */
  createMany(
    courseClasses: NewCourseClass[]
  ): Promise<DatabaseResult<CourseClass[]>>;

  /**
   * 批量更新分享状态
   * @param ids 记录ID数组
   * @param shareStatus 新分享状态
   * @returns 更新的记录数
   */
  updateShareStatusBatch(
    ids: number[],
    shareStatus: ShareStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 批量更新WPS用户信息
   * @param updates 更新数据数组
   * @returns 更新的记录数
   */
  updateWpsUserInfoBatch(
    updates: Array<{
      id: number;
      wps_user_id?: string;
      wps_email?: string;
    }>
  ): Promise<DatabaseResult<number>>;

  /**
   * 根据日历ID批量删除开课班
   * @param calendarId 日历ID
   * @returns 删除的记录数
   */
  deleteByCalendarId(calendarId: number): Promise<DatabaseResult<number>>;

  // ========== 统计查询方法 ==========

  /**
   * 统计指定日历的学生数量
   * @param calendarId 日历ID
   * @param shareStatus 分享状态（可选）
   * @returns 学生数量
   */
  countByCalendar(
    calendarId: number,
    shareStatus?: ShareStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 统计指定课程的学生数量
   * @param courseId 课程ID
   * @param xnxq 学年学期
   * @param shareStatus 分享状态（可选）
   * @returns 学生数量
   */
  countByCourse(
    courseId: string,
    xnxq: string,
    shareStatus?: ShareStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 统计指定学期的开课班数量
   * @param xnxq 学年学期
   * @param shareStatus 分享状态（可选）
   * @returns 开课班数量
   */
  countBySemester(
    xnxq: string,
    shareStatus?: ShareStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 获取分享状态统计
   * @param xnxq 学年学期（可选）
   * @returns 分享状态统计
   */
  getShareStatusStats(xnxq?: string): Promise<
    DatabaseResult<
      Array<{
        share_status: ShareStatus;
        count: number;
      }>
    >
  >;

  /**
   * 获取指定日历的学生列表（去重）
   * @param calendarId 日历ID
   * @returns 学生列表
   */
  getStudentsByCalendar(calendarId: number): Promise<
    DatabaseResult<
      Array<{
        student_number: string;
        student_name: string;
        student_school?: string;
        student_major?: string;
        student_class?: string;
      }>
    >
  >;

  /**
   * 获取指定学期的课程列表（去重）
   * @param xnxq 学年学期
   * @returns 课程列表
   */
  getCoursesBySemester(xnxq: string): Promise<
    DatabaseResult<
      Array<{
        course_id: string;
        student_count: number;
      }>
    >
  >;
}
