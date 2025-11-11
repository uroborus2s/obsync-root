/**
 * 课程日历API服务
 */
import type {
  ApiResponse,
  BatchAddParticipantResult,
  BatchSyncResult,
  CalendarParticipantsResponse,
  CalendarSyncResult,
  CourseCalendarTreeNode,
  CourseDetail,
  ICalendarCourseItem,
  IcasyncAttendanceCourse,
  PaginatedResponse,
  UserCoursesResponse,
} from '@/types/course-calendar.types'
import { apiClient } from '@/lib/api-client'

/**
 * 获取课程日历树形结构
 */
export async function getCourseCalendarTree(): Promise<CourseCalendarTreeNode> {
  const response = await apiClient.get<ApiResponse<CourseCalendarTreeNode>>(
    '/api/icalink/v1/course-calendar/tree'
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '获取课程日历树失败')
  }
  return response.data
}

/**
 * 获取日历参与者列表
 */
export async function getCalendarParticipants(
  calendarId: string
): Promise<CalendarParticipantsResponse> {
  const response = await apiClient.get<
    ApiResponse<CalendarParticipantsResponse>
  >(`/api/icalink/v1/course-calendar/${calendarId}/participants`)
  if (!response.success || !response.data) {
    throw new Error(response.message || '获取日历参与者失败')
  }
  return response.data
}

/**
 * 获取课程详情列表
 */
export async function getCourseDetails(
  calendarId: string
): Promise<CourseDetail[]> {
  const response = await apiClient.get<ApiResponse<CourseDetail[]>>(
    `/api/icalink/v1/course-calendar/${calendarId}/courses`
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '获取课程详情失败')
  }
  return response.data
}

/**
 * 获取日历-课程关联列表（主列表）
 * @param page 页码（从1开始）
 * @param pageSize 每页数量
 * @param search 搜索关键词（可选）
 */
export async function getCalendarCourses(
  page: number = 1,
  pageSize: number = 20,
  search?: string
): Promise<PaginatedResponse<ICalendarCourseItem>> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  })
  if (search) {
    params.append('search', search)
  }

  const response = await apiClient.get<
    ApiResponse<PaginatedResponse<ICalendarCourseItem>>
  >(`/api/icalink/v1/course-calendar/courses?${params.toString()}`)

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取日历课程列表失败')
  }
  return response.data
}

/**
 * 获取课程的课节列表
 * @param courseCode 课程代码
 * @param page 页码（从1开始）
 * @param pageSize 每页数量
 */
export async function getCourseSessions(
  courseCode: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<IcasyncAttendanceCourse>> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  })

  const response = await apiClient.get<
    ApiResponse<PaginatedResponse<IcasyncAttendanceCourse>>
  >(
    `/api/icalink/v1/course-calendar/courses/${courseCode}/sessions?${params.toString()}`
  )

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取课节列表失败')
  }
  return response.data
}

/**
 * 获取课程分享人列表（包含教学班总数）
 * @param calendarId 日历ID
 */
export async function getCourseShareParticipants(
  calendarId: string
): Promise<CalendarParticipantsResponse> {
  const response = await apiClient.get<
    ApiResponse<CalendarParticipantsResponse>
  >(`/api/icalink/v1/course-calendar/${calendarId}/share-participants`)

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取分享人列表失败')
  }
  return response.data
}

/**
 * 同步日历参与者
 * @param calendarId 日历ID
 */
export async function syncCalendarParticipants(
  calendarId: string
): Promise<CalendarSyncResult> {
  const response = await apiClient.post<ApiResponse<CalendarSyncResult>>(
    `/api/icalink/v1/course-calendar/${calendarId}/sync-participants`
  )

  if (!response.success || !response.data) {
    throw new Error(response.message || '同步日历参与者失败')
  }
  return response.data
}

/**
 * 批量同步所有日历的参与者权限
 */
export async function syncAllCalendarParticipants(): Promise<BatchSyncResult> {
  const response = await apiClient.post<ApiResponse<BatchSyncResult>>(
    '/api/icalink/v1/course-calendar/sync-all-participants'
  )

  if (!response.success || !response.data) {
    throw new Error(response.message || '批量同步日历参与者失败')
  }
  return response.data
}

/**
 * 获取指定用户的所有课程列表
 * @param userType 用户类型（teacher 或 student）
 * @param userId 学号或工号
 */
export async function getUserCourses(
  userType: 'teacher' | 'student',
  userId: string
): Promise<UserCoursesResponse> {
  const params = new URLSearchParams({
    user_type: userType,
    user_id: userId,
  })

  const response = await apiClient.get<ApiResponse<UserCoursesResponse>>(
    `/api/icalink/v1/course-calendar/user-courses?${params.toString()}`
  )

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取用户课程列表失败')
  }
  return response.data
}

/**
 * 批量将用户添加到多个日历的权限中
 * @param userType 用户类型（teacher 或 student）
 * @param userId 学号或工号
 * @param calendarIds 日历 ID 列表
 */
export async function batchAddParticipant(
  userType: 'teacher' | 'student',
  userId: string,
  calendarIds: string[]
): Promise<BatchAddParticipantResult> {
  const response = await apiClient.post<ApiResponse<BatchAddParticipantResult>>(
    '/api/icalink/v1/course-calendar/batch-add-participant',
    {
      userType,
      userId,
      calendarIds,
    }
  )

  if (!response.success || !response.data) {
    throw new Error(response.message || '批量添加参与者失败')
  }
  return response.data
}
