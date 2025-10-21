/**
 * 考勤状态枚举
 */
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LEAVE = 'leave',
  LATE = 'late',
  EARLY = 'early',
}

/**
 * 课程状态枚举
 */
export enum CourseStatus {
  NOT_STARTED = 'not_started', // 未开始
  IN_PROGRESS = 'in_progress', // 进行中
  FINISHED = 'finished', // 已结束
}

/**
 * 考勤记录接口
 */
export interface AttendanceRecord {
  /** 记录ID */
  id: string
  /** 开课号 */
  kkh: string
  /** 学年学期 */
  xnxq: string
  /** 教学周 */
  jxz?: number | null
  /** 周次 */
  zc?: number | null
  /** 日期 */
  rq: string
  /** 节次串 */
  jc_s: string
  /** 课程名称 */
  kcmc: string
  /** 开始时间 */
  sj_f: string
  /** 结束时间 */
  sj_t: string
  /** 时间段 */
  sjd: 'am' | 'pm'
  /** 总人数 */
  total_count: number
  /** 签到人数 */
  checkin_count: number
  /** 旷课人数 */
  absent_count: number
  /** 请假人数 */
  leave_count: number
  /** 签到URL */
  checkin_url?: string
  /** 请假URL */
  leave_url?: string
  /** 签到令牌 */
  checkin_token?: string
  /** 状态 */
  status: 'active' | 'closed'
  /** 自动开始时间 */
  auto_start_time?: string
  /** 自动关闭时间 */
  auto_close_time?: string
  /** 楼群或相关标识 */
  lq?: string
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 学生考勤记录接口
 */
export interface StudentAttendanceRecord {
  /** 记录ID */
  id: string
  /** 考勤记录ID */
  attendance_record_id: string
  /** 学号 */
  student_id: string
  /** 学生姓名 */
  student_name: string
  /** 签到状态 */
  status: AttendanceStatus
  /** 签到时间 */
  checkin_time?: string
  /** 位置信息 */
  location?: string
  /** 纬度 */
  latitude?: number
  /** 经度 */
  longitude?: number
  /** 定位精度 */
  accuracy?: number
  /** 备注 */
  remark?: string
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 课程信息接口
 */
export interface CourseInfo {
  /** 课程名称 */
  kcmc: string
  /** 开课号 */
  kkh: string
  /** 学年学期 */
  xnxq: string
  /** 教学周 */
  jxz?: number | null
  /** 周次 */
  zc?: number | null
  /** 日期 */
  rq: string
  /** 节次串 */
  jc_s: string
  /** 开始时间 */
  sj_f: string
  /** 结束时间 */
  sj_t: string
  /** 教室 */
  room_s?: string
  /** 教师姓名 */
  xm_s?: string
  /** 楼区 */
  lq?: string | null
  /** 课程状态 */
  status: CourseStatus
  /** 课程开始时间 */
  course_start_time: string
  /** 课程结束时间 */
  course_end_time: string
}

/**
 * 学生信息接口
 */
export interface StudentInfo {
  /** 学号 */
  xh: string
  /** 姓名 */
  xm: string
  /** 班级名称 */
  bjmc?: string
  /** 专业名称 */
  zymc?: string
}

/**
 * 考勤统计接口
 */
export interface AttendanceStats {
  /** 总课程节数 */
  total_courses: number
  /** 班级人数 */
  class_size: number
  /** 平均出勤率 */
  average_attendance_rate: number
  /** 总请假次数 */
  total_leave_count: number
  /** 总缺勤次数 */
  total_absent_count: number
}

/**
 * 学生个人考勤统计接口
 */
export interface StudentPersonalStats {
  /** 学生信息 */
  student: StudentInfo
  /** 总课程节数 */
  total_courses: number
  /** 签到次数 */
  present_count: number
  /** 请假次数 */
  leave_count: number
  /** 缺勤次数 */
  absent_count: number
  /** 出勤率 */
  attendance_rate: number
  /** 最近记录 */
  recent_record?: {
    /** 日期 */
    date: string
    /** 状态 */
    status: AttendanceStatus
  }
}

/**
 * 课程维度统计（与后端保持一致）
 */
export interface CourseAttendanceStats {
  /** 课程代码 */
  course_code: string
  /** 课程名称 */
  course_name: string
  /** 学期 */
  semester: string
  /** 教师姓名 */
  teacher_names: string
  /** 教师工号列表 */
  teacher_codes: string
  /** 总课次数 */
  class_count: number
  /** 应签到人数 */
  total_should_attend: number
  /** 实际出勤人数 */
  actual_attended: number
  /** 请假人数 */
  leave_count: number
  /** 缺勤人数 */
  absent_count: number
  /** 出勤率 */
  attendance_rate: number
  /** 最近上课时间 */
  last_class_time?: Date
}

/**
 * 学生维度统计（与后端保持一致）
 */
export interface StudentAttendanceStats {
  /** 学号 */
  student_id: string
  /** 姓名 */
  student_name: string
  /** 班级 */
  class_name?: string
  /** 专业 */
  major_name?: string
  /** 选课数量 */
  course_count: number
  /** 应签到人数 */
  total_should_attend: number
  /** 实际出勤人数 */
  actual_attended: number
  /** 请假人数 */
  leave_count: number
  /** 缺勤人数 */
  absent_count: number
  /** 出勤率 */
  attendance_rate: number
  /** 最近签到时间 */
  last_checkin_time?: Date
}

/**
 * 课程考勤详情接口
 */
export interface CourseAttendanceDetail {
  /** 课程信息 */
  course: CourseInfo
  /** 考勤记录 */
  attendance_record: AttendanceRecord
  /** 学生考勤列表 */
  student_attendances: StudentAttendanceRecord[]
  /** 统计信息 */
  stats: {
    /** 总人数 */
    total_count: number
    /** 已签到人数 */
    checkin_count: number
    /** 迟到人数 */
    late_count: number
    /** 旷课人数 */
    absent_count: number
    /** 请假人数 */
    leave_count: number
    /** 出勤率 */
    attendance_rate: number
  }
}

/**
 * 历史考勤记录接口
 */
export interface HistoricalAttendanceRecord {
  /** 周次 */
  week: number
  /** 状态 */
  status: 'finished' | 'not_started'
  /** 日期 */
  date: string
  /** 节次 */
  period: string
  /** 出勤率 */
  attendance_rate?: number
  /** 统计信息 */
  stats: {
    /** 总人数 */
    total_count: number
    /** 签到人数 */
    present_count: number
    /** 请假人数 */
    leave_count: number
    /** 缺勤人数 */
    absent_count: number
  }
}

/**
 * 考勤查询参数接口
 */
export interface AttendanceQueryParams {
  /** 学年学期 */
  xnxq?: string
  /** 开课号 */
  kkh?: string
  /** 学号 */
  student_id?: string
  /** 开始日期 */
  start_date?: string
  /** 结束日期 */
  end_date?: string
  /** 页码 */
  page?: number
  /** 每页大小 */
  page_size?: number
  /** 排序字段 */
  sort_by?: string
  /** 排序顺序 */
  sort_order?: 'asc' | 'desc'
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[]
  /** 总数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页大小 */
  page_size: number
  /** 总页数 */
  total_pages: number
  /** 是否有下一页 */
  has_next: boolean
  /** 是否有上一页 */
  has_prev: boolean
}

/**
 * API响应接口
 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean
  /** 消息 */
  message?: string
  /** 数据 */
  data?: T
}

// ========== 任务列表相关类型 ==========

/**
 * 任务列表查询参数
 */
export interface TaskListQueryParams {
  /** 教师工号 */
  teacher_id?: string
  /** 学生学号 */
  student_id?: string
  /** 学年学期 */
  xnxq?: string
  /** 开始日期 */
  start_date?: string
  /** 结束日期 */
  end_date?: string
  /** 课程状态 */
  status?: 'not_started' | 'in_progress' | 'finished' | 'all'
  /** 页码 */
  page?: number
  /** 每页大小 */
  page_size?: number
}

/**
 * 任务详情接口
 */
export interface TaskDetail {
  /** 任务ID */
  task_id: string
  /** 课程信息 */
  course: {
    /** 开课号 */
    kkh: string
    /** 课程名称 */
    kcmc: string
    /** 学年学期 */
    xnxq: string
    /** 上课日期 */
    rq: string
    /** 开始时间 */
    sj_f: string
    /** 结束时间 */
    sj_t: string
    /** 节次 */
    jc_s: string
    /** 教室 */
    room_s: string
    /** 教学周 */
    jxz?: number
    /** 楼群 */
    lq?: string
  }
  /** 教师信息 */
  teachers: Array<{
    /** 工号 */
    gh: string
    /** 姓名 */
    xm: string
    /** 部门 */
    ssdwmc?: string
  }>
  /** 考勤状态 */
  attendance_status: {
    /** 考勤状态 */
    status: 'active' | 'closed'
    /** 总人数 */
    total_count: number
    /** 已签到人数 */
    checkin_count: number
    /** 请假人数 */
    leave_count: number
    /** 旷课人数 */
    absent_count: number
    /** 签到率 */
    checkin_rate: number
  }
  /** 课程状态 */
  course_status: 'not_started' | 'in_progress' | 'finished'
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

// ========== 打卡数据相关类型 ==========

/**
 * 打卡记录查询参数
 */
export interface AttendanceDataQueryParams {
  /** 考勤记录ID */
  attendance_record_id?: string
  /** 开课号 */
  kkh?: string
  /** 学年学期 */
  xnxq?: string
  /** 开始日期 */
  start_date?: string
  /** 结束日期 */
  end_date?: string
  /** 学生学号 */
  student_id?: string
  /** 教师工号 */
  teacher_id?: string
  /** 签到状态 */
  status?: AttendanceStatus | 'all'
  /** 页码 */
  page?: number
  /** 每页大小 */
  page_size?: number
}

/**
 * 打卡记录详情接口
 */
export interface AttendanceDetailRecord {
  /** 记录ID */
  id: string
  /** 考勤记录ID */
  attendance_record_id: string
  /** 学生信息 */
  student: {
    /** 学号 */
    xh: string
    /** 姓名 */
    xm: string
    /** 班级 */
    bjmc?: string
    /** 专业 */
    zymc?: string
  }
  /** 课程信息 */
  course: {
    /** 开课号 */
    kkh: string
    /** 课程名称 */
    kcmc: string
    /** 上课日期 */
    rq: string
    /** 开始时间 */
    sj_f: string
    /** 结束时间 */
    sj_t: string
    /** 教室 */
    room_s: string
    /** 节次 */
    jc_s: string
  }
  /** 签到状态 */
  status: AttendanceStatus
  /** 签到时间 */
  checkin_time?: string
  /** 位置信息 */
  location?: string
  /** 经纬度 */
  coordinates?: {
    latitude: number
    longitude: number
    accuracy?: number
  }
  /** 备注 */
  remark?: string
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 新的数据查询接口请求体
 */
export interface DataQueryParams {
  studentId?: string
  teacherName?: string
  week?: number
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
}

/**
 * 新的数据查询接口响应体
 */
export interface DataQueryRecord {
  id: string
  status: 'present' | 'absent' | 'leave' | 'late'
  checkin_time: string | null
  note: string | null
  student: {
    xh: string
    xm: string
    bjmc: string | null
    college_name: string | null
    major_name: string | null
  }
  course: {
    kcmc: string
    location: string | null
    lesson: string
    start_time: string
    end_time: string
  }
}

// ========== 课程维度签到统计相关类型 ==========

/**
 * 课程维度签到统计详细信息（与后端API保持一致）
 */
export interface CourseAttendanceStatistics {
  /** 课程ID */
  courseId: number
  /** 课程名称 */
  courseName: string
  /** 课次信息 (格式：日期 上课时间-下课时间) */
  sessionInfo: string
  /** 周次 */
  weekNumber: number
  /** 任课教师 */
  teacher: string
  /** 上课学生数量 */
  totalStudents: number
  /** 状态 (未开始/进行中/已结束) */
  status: string
  /** 签到数量 */
  checkedInCount: number
  /** 请假中数量 (请假申请未审批) */
  leavePendingCount: number
  /** 请假数量 (请假申请已审批) */
  leaveApprovedCount: number
  /** 缺勤数量 */
  absentCount: number
  /** 签到率 (签到数量/总学生数量 * 100) */
  checkinRate: number
  /** 出勤率 ((签到数量+请假数量)/总学生数量 * 100) */
  attendanceRate: number
}

/**
 * 课程维度签到统计查询条件
 */
export interface CourseAttendanceStatsQuery {
  /** 学期筛选 */
  semester?: string
  /** 开始时间筛选 */
  start_time?: string
  /** 结束时间筛选 */
  end_time?: string
  /** 教师工号筛选 */
  teacher_code?: string
  /** 课程名称筛选 (支持模糊匹配) */
  course_name?: string
  /** 分页参数 */
  page?: number
  /** 每页大小 */
  page_size?: number
  /** 排序字段 */
  sort_by?: 'start_time' | 'checkin_rate' | 'attendance_rate' | 'total_students'
  /** 排序方向 */
  sort_order?: 'asc' | 'desc'
}

/**
 * 课程维度签到统计API响应
 */
export interface CourseAttendanceStatsResponse {
  /** 统计数据列表 */
  data: CourseAttendanceStatistics[]
  /** 总记录数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页大小 */
  page_size: number
  /** 总页数 */
  total_pages: number
  /** 是否有下一页 */
  has_next: boolean
  /** 是否有上一页 */
  has_prev: boolean
}
