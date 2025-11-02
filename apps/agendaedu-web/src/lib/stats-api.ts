import { apiClient } from './api-client'

/**
 * 分页查询参数
 */
export interface StatsQueryParams {
  page?: number
  pageSize?: number
  searchKeyword?: string
  teachingWeek?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 教学班表查询参数（关键字搜索）
 */
export interface TeachingClassQueryParams {
  page?: number
  pageSize?: number
  searchKeyword?: string
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分页响应结果
 */
export interface PaginatedStatsResponse<T> {
  success: boolean
  data: {
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  error?: string
}

/**
 * 缺勤历史明细记录
 */
export interface AbsentStudentRelation {
  id: number
  course_checkin_stats_id: number
  course_id: number
  course_code: string
  course_name: string
  student_id: string
  student_name: string
  school_name: string
  class_name: string
  major_name: string
  absence_type: string
  semester: string
  teaching_week: number
  weekday: number
  period: number
  time_slot: string
  leave_reason: string | null
  created_at: string
  updated_at: string
}

/**
 * 课程历史统计记录
 */
export interface CourseCheckinStats {
  id: number
  stat_date: string
  course_id: number
  external_id: string
  course_code: string
  course_name: string
  location: string
  teacher_name: string
  teacher_codes: string
  semester: string
  teaching_week: number
  weekday: number
  time_slot: string
  period: number
  start_time: string
  end_time: string
  expected_count: number
  actual_count: number
  absent_count: number
  truant_count: number
  leave_count: number
  leave_pending_count: number
}

/**
 * 教学班记录（对应 icalink_teaching_class 表）
 */
export interface TeachingClass {
  id: number
  student_id: string | null
  student_name: string | null
  school_name: string | null
  school_id: string | null
  major_id: string | null
  major_name: string | null
  class_id: string | null
  class_name: string | null
  grade: string | null
  gender: string | null
  people: string | null
  course_code: string
  teaching_class_code: string
  course_name: string
  course_unit_id: string | null
  course_unit: string | null
}

/**
 * 学生历史统计记录
 */
export interface StudentOverallAttendanceStats {
  student_id: string
  name: string
  school_name: string
  major_name: string
  class_name: string
  total_sessions: number
  completed_sessions: number
  absent_count: number
  leave_count: number
  truant_count: number
  absence_rate: number
}

/**
 * 学生历史统计详情记录
 */
export interface StudentOverallAttendanceStatsDetails {
  student_id: string
  name: string
  school_name: string
  major_name: string
  class_name: string
  course_code: string
  course_name: string
  semester: string
  teaching_week: number
  weekday: number
  time_slot: string
  period: number
  start_time: string
  end_time: string
  location: string
  teacher_name: string
  teacher_codes: string
  expected_count: number
  actual_count: number
  absent_count: number
  truant_count: number
  leave_count: number
  leave_pending_count: number
  absence_rate: number
}

/**
 * 单位级别签到统计记录
 */
export interface CourseCheckinStatsUnit {
  course_unit_id: string
  course_unit: string
  semester: string
  start_week: number
  end_week: number
  start_time: Date
  end_time: Date
  course_code_count: number
  teaching_class_code_count: number
  total_should_attend: number
  total_absent: number
  total_truant: number
  absence_rate: number
  truancy_rate: number
}

/**
 * 班级级别签到统计记录
 */
export interface CourseCheckinStatsClass {
  teaching_class_code: string
  course_name: string
  semester: string
  course_unit_id: string
  course_unit: string
  start_week: number
  end_week: number
  start_time: Date
  end_time: Date
  course_code_count: number
  total_should_attend: number
  total_absent: number
  total_truant: number
  absence_rate: number
  truancy_rate: number
}

/**
 * 课程汇总签到统计记录
 */
export interface CourseCheckinStatsSummary {
  course_code: string
  course_name: string
  semester: string
  class_location: string | null
  teacher_name: string | null
  teacher_codes: string | null
  course_unit_id: string
  course_unit: string
  teaching_class_code: string
  start_week: number
  end_week: number
  start_time: Date
  end_time: Date
  total_should_attend: number
  total_absent: number
  total_truant: number
  absence_rate: number
  truancy_rate: number
}

/**
 * 统计数据API服务类
 * 提供所有统计数据相关的API调用方法
 */
export class StatsApiService {
  /**
   * 查询缺勤历史明细数据
   */
  async getAbsentHistory(
    params: StatsQueryParams
  ): Promise<PaginatedStatsResponse<AbsentStudentRelation>> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params.searchKeyword)
      queryParams.append('searchKeyword', params.searchKeyword)
    if (params.teachingWeek)
      queryParams.append('teachingWeek', params.teachingWeek.toString())
    if (params.sortField) queryParams.append('sortField', params.sortField)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    return apiClient.get(
      `/api/icalink/v1/stats/absent-history?${queryParams.toString()}`
    )
  }

  /**
   * 查询课程历史统计数据
   */
  async getCourseStats(
    params: StatsQueryParams
  ): Promise<PaginatedStatsResponse<CourseCheckinStats>> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params.searchKeyword)
      queryParams.append('searchKeyword', params.searchKeyword)
    if (params.teachingWeek)
      queryParams.append('teachingWeek', params.teachingWeek.toString())
    if (params.sortField) queryParams.append('sortField', params.sortField)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    return apiClient.get(
      `/api/icalink/v1/stats/course-stats?${queryParams.toString()}`
    )
  }

  /**
   * 查询教学班数据
   * @param params 查询参数
   */
  async getTeachingClass(
    params: TeachingClassQueryParams
  ): Promise<PaginatedStatsResponse<TeachingClass>> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params.searchKeyword)
      queryParams.append('searchKeyword', params.searchKeyword)
    if (params.sortField) queryParams.append('sortField', params.sortField)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    return apiClient.get(
      `/api/icalink/v1/stats/teaching-class?${queryParams.toString()}`
    )
  }

  /**
   * 查询学生历史统计数据
   */
  async getStudentStats(
    params: StatsQueryParams
  ): Promise<PaginatedStatsResponse<StudentOverallAttendanceStats>> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params.searchKeyword)
      queryParams.append('searchKeyword', params.searchKeyword)
    if (params.sortField) queryParams.append('sortField', params.sortField)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    return apiClient.get(
      `/api/icalink/v1/stats/student-stats?${queryParams.toString()}`
    )
  }

  /**
   * 查询学生历史统计详情数据
   */
  async getStudentStatsDetails(
    params: StatsQueryParams
  ): Promise<PaginatedStatsResponse<StudentOverallAttendanceStatsDetails>> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params.searchKeyword)
      queryParams.append('searchKeyword', params.searchKeyword)
    if (params.teachingWeek)
      queryParams.append('teachingWeek', params.teachingWeek.toString())
    if (params.sortField) queryParams.append('sortField', params.sortField)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    return apiClient.get(
      `/api/icalink/v1/stats/student-stats-details?${queryParams.toString()}`
    )
  }

  /**
   * 查询单位级别签到统计数据
   */
  async getCourseStatsUnit(
    params: StatsQueryParams
  ): Promise<PaginatedStatsResponse<CourseCheckinStatsUnit>> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params.searchKeyword)
      queryParams.append('searchKeyword', params.searchKeyword)
    if (params.sortField) queryParams.append('sortField', params.sortField)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    return apiClient.get(
      `/api/icalink/v1/stats/course-stats-unit?${queryParams.toString()}`
    )
  }

  /**
   * 查询班级级别签到统计数据
   * @param params 查询参数
   * @param unitId 单位ID（用于树形结构的层级查询）
   */
  async getCourseStatsClass(
    params: StatsQueryParams & { unitId?: string }
  ): Promise<PaginatedStatsResponse<CourseCheckinStatsClass>> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params.unitId) queryParams.append('unitId', params.unitId)
    if (params.searchKeyword)
      queryParams.append('searchKeyword', params.searchKeyword)
    if (params.sortField) queryParams.append('sortField', params.sortField)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    return apiClient.get(
      `/api/icalink/v1/stats/course-stats-class?${queryParams.toString()}`
    )
  }

  /**
   * 查询课程汇总签到统计数据
   * @param params 查询参数
   * @param classCode 班级代码（用于树形结构的层级查询）
   */
  async getCourseStatsSummary(
    params: StatsQueryParams & { classCode?: string }
  ): Promise<PaginatedStatsResponse<CourseCheckinStatsSummary>> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params.classCode) queryParams.append('classCode', params.classCode)
    if (params.searchKeyword)
      queryParams.append('searchKeyword', params.searchKeyword)
    if (params.sortField) queryParams.append('sortField', params.sortField)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    return apiClient.get(
      `/api/icalink/v1/stats/course-stats-summary?${queryParams.toString()}`
    )
  }
}

// 创建全局实例
export const statsApiService = new StatsApiService()
