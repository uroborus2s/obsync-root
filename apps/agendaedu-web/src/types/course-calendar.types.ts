/**
 * 课程日历相关类型定义
 */

/**
 * 课程日历树节点类型
 * 只包含两级：root（根节点）和 calendar（日历节点）
 */
export type CourseCalendarTreeNodeType = 'root' | 'calendar'

/**
 * 课程日历树节点
 * 树形结构采用两级结构：根节点 → 日历列表
 */
export interface CourseCalendarTreeNode {
  /** 节点ID */
  id: string
  /** 节点标签 */
  label: string
  /** 节点类型 */
  type: CourseCalendarTreeNodeType
  /** 日历ID（仅calendar类型） */
  calendarId?: string
  /** 开课号（仅calendar类型） */
  kkh?: string
  /** 学年学期（仅calendar类型） */
  xnxq?: string
  /** 子节点（仅root类型有子节点） */
  children?: CourseCalendarTreeNode[]
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 课程详情信息
 */
export interface CourseDetail {
  /** 课程ID */
  id: number
  /** 聚合任务ID */
  juheRenwuId: number
  /** 外部ID */
  externalId: string
  /** 课程代码 */
  courseCode: string
  /** 课程名称 */
  courseName: string
  /** 学年学期 */
  semester: string
  /** 教学周 */
  teachingWeek: number
  /** 周次 */
  weekDay: number
  /** 教师工号列表 */
  teacherCodes: string | null
  /** 教师姓名列表 */
  teacherNames: string | null
  /** 上课地点 */
  classLocation: string | null
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 节次 */
  periods: string | null
  /** 时间段 */
  timePeriod: string
  /** 是否启用签到 */
  attendanceEnabled: boolean
  /** 签到开始偏移 */
  attendanceStartOffset: number | null
  /** 签到结束偏移 */
  attendanceEndOffset: number | null
  /** 迟到阈值 */
  lateThreshold: number | null
  /** 自动缺勤时间 */
  autoAbsentAfter: number | null
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 创建人 */
  createdBy: string | null
  /** 更新人 */
  updatedBy: string | null
  /** 元数据 */
  metadata: Record<string, any> | null
}

/**
 * 日历参与者信息（增强版，包含学生详细信息）
 */
export interface CalendarParticipant {
  /** 权限ID */
  id: string
  /** 日历ID */
  calendarId: string
  /** 用户ID */
  userId: string
  /** 权限角色 */
  role: 'owner' | 'writer' | 'reader' | 'free_busy_reader'
  /** 学生姓名（从 icalink_teaching_class 表查询） */
  studentName?: string | null
  /** 学院（从 icalink_teaching_class 表查询） */
  schoolName?: string | null
  /** 专业（从 icalink_teaching_class 表查询） */
  majorName?: string | null
  /** 班级（从 icalink_teaching_class 表查询） */
  className?: string | null
}

/**
 * 日历参与者列表响应（包含教学班总数和已有权限数）
 */
export interface CalendarParticipantsResponse {
  /** 参与者列表 */
  participants: CalendarParticipant[]
  /** 教学班学生总数 */
  totalStudents: number
  /** 已有权限数 */
  existingPermissions: number
}

/**
 * 日历参与者同步结果
 */
export interface CalendarSyncResult {
  /** 教学班总学生数 */
  totalStudents: number
  /** 已有权限数 */
  existingPermissions: number
  /** 新增权限数 */
  addedCount: number
  /** 失败数 */
  failedCount: number
}

/**
 * API响应类型
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  code?: string
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  data: T[]
  /** 总记录数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  page_size: number
  /** 总页数 */
  total_pages: number
  /** 是否有下一页 */
  has_next: boolean
  /** 是否有上一页 */
  has_prev: boolean
}

/**
 * 日历-课程关联列表项（主列表）
 * 来自 icasync_calendar_mapping ⋈ v_course_checkin_stats_summary
 * ⋈ icalink_teaching_class ⋈ icasync_attendance_courses
 */
export interface ICalendarCourseItem {
  // 课程基本信息（来自 v_course_checkin_stats_summary）
  /** 课程代码 */
  course_code: string
  /** 课程名称 */
  course_name: string
  /** 学期 */
  semester: string
  /** 上课地点 */
  class_location: string | null
  /** 教师姓名 */
  teacher_name: string | null
  /** 教师代码（多个用逗号分隔） */
  teacher_codes: string | null
  /** 课程单位ID */
  course_unit_id: string
  /** 课程单位 */
  course_unit: string
  /** 教学班代码 */
  teaching_class_code: string
  /** 开始周 */
  start_week: number
  /** 结束周 */
  end_week: number
  /** 开始时间 */
  start_time: Date
  /** 结束时间 */
  end_time: Date

  // 统计信息（来自关联查询）
  /** 学生总数（来自 icalink_teaching_class） */
  total_students: number | null
  /** 课节总数（来自 icasync_attendance_courses） */
  total_sessions: number | null

  // 日历信息（来自 icasync_calendar_mapping）
  /** 日历ID */
  calendar_id: string
  /** 日历名称 */
  calendar_name: string | null
}

/**
 * 考勤课程（课节）信息
 * 来自 icasync_attendance_courses 表
 */
export interface IcasyncAttendanceCourse {
  /** 主键ID */
  id: number
  /** 课程代码 */
  course_code: string
  /** 课程名称 */
  course_name: string
  /** 学期 */
  semester: string
  /** 外部ID */
  external_id: string | null
  /** 开始时间 */
  start_time: string
  /** 结束时间 */
  end_time: string
  /** 上课地点 */
  class_location: string | null
  /** 教师工号列表 */
  teacher_codes: string | null
  /** 教师姓名列表 */
  teacher_names: string | null
  /** 教学周 */
  teaching_week: number
  /** 星期几（1-7） */
  week_day: number
  /** 节次 */
  periods: string | null
  /** 时间段 */
  time_period: string
  /** 是否启用签到 */
  attendance_enabled: boolean
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
  /** 删除时间 */
  deleted_at: string | null
}
