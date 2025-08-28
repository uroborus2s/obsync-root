// @wps/app-icalink 考勤课程仓储接口
// 基于 Stratix 框架的仓储接口定义

import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcasyncAttendanceCourse
} from '../../types/database.js';
import type {
  PaginatedResult,
  QueryOptions,
  ServiceResult
} from '../../types/service.js';

/**
 * 考勤课程查询条件
 */
export interface AttendanceCourseQueryConditions {
  course_code?: string;
  course_name?: string;
  semester?: string;
  teaching_week?: number;
  week_day?: number;
  teacher_codes?: string;
  attendance_enabled?: boolean;
  start_date?: Date;
  end_date?: Date;
  deleted?: boolean;
}

/**
 * 考勤课程创建数据
 */
export interface CreateAttendanceCourseData {
  juhe_renwu_id: number;
  external_id: string;
  course_code: string;
  course_name: string;
  semester: string;
  teaching_week: number;
  week_day: number;
  teacher_codes?: string;
  teacher_names?: string;
  class_location?: string;
  start_time: Date;
  end_time: Date;
  periods?: string;
  time_period: string;
  attendance_enabled?: boolean;
  attendance_start_offset?: number;
  attendance_end_offset?: number;
  late_threshold?: number;
  auto_absent_after?: number;
  created_by?: string;
  metadata?: any;
}

/**
 * 考勤课程更新数据
 */
export interface UpdateAttendanceCourseData {
  course_name?: string;
  teacher_codes?: string;
  teacher_names?: string;
  class_location?: string;
  start_time?: Date;
  end_time?: Date;
  periods?: string;
  time_period?: string;
  attendance_enabled?: boolean;
  attendance_start_offset?: number;
  attendance_end_offset?: number;
  late_threshold?: number;
  auto_absent_after?: number;
  updated_by?: string;
  metadata?: any;
}

/**
 * 考勤课程详细信息（包含关联数据）
 */
export interface AttendanceCourseWithDetails extends IcasyncAttendanceCourse {
  student_count?: number;
  attendance_count?: number;
  attendance_rate?: number;
  teacher_info?: Array<{
    teacher_id: string;
    teacher_name: string;
    department?: string;
  }>;
}

/**
 * 考勤课程统计信息
 */
export interface AttendanceCourseStats {
  total_count: number;
  enabled_count: number;
  disabled_count: number;
  active_count: number;
  completed_count: number;
  average_attendance_rate: number;
}

/**
 * 考勤课程仓储接口
 * 继承基础仓储接口，提供考勤课程相关的数据访问方法
 */
export interface IAttendanceCourseRepository
  extends InstanceType<
    typeof BaseRepository<
      IcalinkDatabase,
      'icasync_attendance_courses',
      IcasyncAttendanceCourse,
      CreateAttendanceCourseData,
      UpdateAttendanceCourseData
    >
  > {
  /**
   * 根据外部ID查找课程
   * @param externalId 外部ID
   * @returns 课程信息或null
   */
  findByExternalId(
    externalId: string
  ): Promise<ServiceResult<IcasyncAttendanceCourse | null>>;

  /**
   * 根据课程代码查找课程
   * @param courseCode 课程代码
   * @param semester 学期（可选）
   * @returns 课程列表
   */
  findByCourseCode(
    courseCode: string,
    semester?: string
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>>;

  /**
   * 根据开课号查找课程
   * @param kkh 开课号
   * @returns 课程列表
   */
  findByKkh(kkh: string): Promise<ServiceResult<IcasyncAttendanceCourse[]>>;

  /**
   * 根据学期查找课程
   * @param semester 学期
   * @param options 查询选项
   * @returns 课程列表
   */
  findBySemester(
    semester: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>>;

  /**
   * 根据教师查找课程
   * @param teacherCode 教师工号
   * @param semester 学期（可选）
   * @param options 查询选项
   * @returns 课程列表
   */
  findByTeacher(
    teacherCode: string,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>>;

  /**
   * 根据条件查询课程
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 课程列表
   */
  findByConditions(
    conditions: AttendanceCourseQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>>;

  /**
   * 分页查询课程
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的课程列表
   */
  findByConditionsPaginated(
    conditions: AttendanceCourseQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<IcasyncAttendanceCourse>>>;

  /**
   * 查询课程详细信息（包含关联数据）
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 课程详细信息列表
   */
  findWithDetails(
    conditions: AttendanceCourseQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<AttendanceCourseWithDetails[]>>;

  /**
   * 获取启用考勤的课程
   * @param semester 学期（可选）
   * @param options 查询选项
   * @returns 启用考勤的课程列表
   */
  getEnabledCourses(
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>>;

  /**
   * 获取当前活跃的课程
   * @param currentTime 当前时间（可选，默认为当前时间）
   * @returns 活跃的课程列表
   */
  getActiveCourses(
    currentTime?: Date
  ): Promise<ServiceResult<AttendanceCourseWithDetails[]>>;

  /**
   * 根据时间范围查找课程
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param options 查询选项
   * @returns 课程列表
   */
  findByTimeRange(
    startTime: Date,
    endTime: Date,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>>;

  /**
   * 根据教学周查找课程
   * @param teachingWeek 教学周
   * @param semester 学期（可选）
   * @param options 查询选项
   * @returns 课程列表
   */
  findByTeachingWeek(
    teachingWeek: number,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>>;

  /**
   * 根据星期几查找课程
   * @param weekDay 星期几（1-7）
   * @param semester 学期（可选）
   * @param options 查询选项
   * @returns 课程列表
   */
  findByWeekDay(
    weekDay: number,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>>;

  /**
   * 统计课程信息
   * @param conditions 查询条件
   * @returns 统计信息
   */
  getStatistics(
    conditions?: AttendanceCourseQueryConditions
  ): Promise<ServiceResult<AttendanceCourseStats>>;

  /**
   * 启用/禁用课程考勤
   * @param id 课程ID
   * @param enabled 是否启用
   * @param updatedBy 更新人
   * @returns 是否更新成功
   */
  updateAttendanceEnabled(
    id: number,
    enabled: boolean,
    updatedBy?: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 批量启用/禁用课程考勤
   * @param ids 课程ID数组
   * @param enabled 是否启用
   * @param updatedBy 更新人
   * @returns 更新的记录数量
   */
  updateAttendanceEnabledBatch(
    ids: number[],
    enabled: boolean,
    updatedBy?: string
  ): Promise<ServiceResult<number>>;

  /**
   * 更新课程时间
   * @param id 课程ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param updatedBy 更新人
   * @returns 是否更新成功
   */
  updateCourseTime(
    id: number,
    startTime: Date,
    endTime: Date,
    updatedBy?: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 软删除课程
   * @param id 课程ID
   * @param deletedBy 删除人
   * @returns 是否删除成功
   */
  softDelete(id: number, deletedBy?: string): Promise<ServiceResult<boolean>>;

  /**
   * 恢复软删除的课程
   * @param id 课程ID
   * @param restoredBy 恢复人
   * @returns 是否恢复成功
   */
  restore(id: number, restoredBy?: string): Promise<ServiceResult<boolean>>;

  /**
   * 检查课程是否存在
   * @param courseCode 课程代码
   * @param semester 学期
   * @param teachingWeek 教学周
   * @param weekDay 星期几
   * @returns 是否存在
   */
  existsByCourseInfo(
    courseCode: string,
    semester: string,
    teachingWeek: number,
    weekDay: number
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取课程的学生数量
   * @param courseId 课程ID
   * @returns 学生数量
   */
  getStudentCount(courseId: number): Promise<ServiceResult<number>>;

  /**
   * 获取课程的考勤统计
   * @param courseId 课程ID
   * @returns 考勤统计
   */
  getAttendanceStats(courseId: number): Promise<
    ServiceResult<{
      total_students: number;
      total_records: number;
      present_count: number;
      late_count: number;
      absent_count: number;
      leave_count: number;
      attendance_rate: number;
    }>
  >;

  /**
   * 搜索课程
   * @param keyword 关键词
   * @param semester 学期（可选）
   * @param options 查询选项
   * @returns 匹配的课程列表
   */
  searchCourses(
    keyword: string,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<AttendanceCourseWithDetails[]>>;

  /**
   * 根据外部ID获取课程的开课号(kkh)
   * @param externalId 外部ID
   * @returns 开课号或null
   */
  getKkhByExternalId(externalId: string): Promise<ServiceResult<string | null>>;

  /**
   * 获取课程历史考勤数据
   * @param kkh 开课号
   * @param semester 学期（可选）
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 课程历史考勤数据
   */
  getCourseAttendanceHistory(
    kkh: string,
    semester?: string,
    startDate?: string,
    endDate?: string
  ): Promise<
    ServiceResult<{
      course_info: {
        kkh: string;
        course_name: string;
        xnxq: string;
        teachers: Array<{
          gh: string;
          xm: string;
        }>;
      };
      attendance_history: Array<{
        attendance_record_id: string;
        class_date: string;
        class_time: string;
        class_period: string;
        teaching_week?: number;
        classroom?: string;
        total_students: number;
        present_count: number;
        leave_count: number;
        absent_count: number;
        attendance_rate: number;
        status: 'active' | 'closed';
        course_status: 'not_started' | 'in_progress' | 'finished';
        created_at: string;
      }>;
      overall_stats: {
        total_classes: number;
        average_attendance_rate: number;
        total_students: number;
        total_present: number;
        total_leave: number;
        total_absent: number;
      };
    }>
  >;

  /**
   * 获取个人课程统计数据
   * @param kkh 开课号
   * @param semester 学期（可选）
   * @returns 个人课程统计数据
   */
  getPersonalCourseStats(
    kkh: string,
    semester?: string
  ): Promise<
    ServiceResult<{
      course_info: {
        kkh: string;
        course_name: string;
        xnxq: string;
        total_classes: number;
        total_students: number;
        overall_attendance_rate: number;
        teachers: string;
        teacher_codes: string;
      };
      student_stats: Array<{
        xh: string;
        xm: string;
        bjmc?: string;
        zymc?: string;
        attendance_rate: number;
        present_count: number;
        absent_count: number;
        leave_count: number;
        total_classes: number;
        recent_records: Array<{
          class_date: string;
          status:
            | 'not_started'
            | 'present'
            | 'absent'
            | 'leave'
            | 'pending_approval'
            | 'leave_pending';
          checkin_time?: string;
          leave_reason?: string;
        }>;
      }>;
    }>
  >;
}
