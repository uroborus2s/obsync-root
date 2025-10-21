// @wps/hltnlink 数据库Schema类型定义
// 基于Kysely ORM的数据库表结构定义

import type {
  Generated,
  Insertable,
  Selectable,
  Updateable
} from '@stratix/database';

/**
 * 日历状态枚举
 */
export type CalendarStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

/**
 * 权限类型枚举
 */
export type PermissionType = 'read' | 'write';

/**
 * 分享状态枚举
 */
export type ShareStatus = 'PENDING' | 'SHARED' | 'FAILED';

/**
 * 重复类型枚举
 */
export type RecurrenceType = 'NONE' | 'WEEKLY' | 'CUSTOM';

/**
 * 同步状态枚举
 */
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

/**
 * 日历表结构定义
 */
export interface CalendarTable {
  id?: string;
  wps_calendar_id: string;
  course_id: string;
  course_name: string;
  course_code: string | null;
  teacher_name: string;
  teacher_id: string;
  academic_year: string | null;
  semester: string | null;
  xnxq: string | null;
  metadata: string | null;
  status: CalendarStatus;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * 开课班表结构定义
 */
export interface CourseClassTable {
  id: Generated<number>;
  calendar_id: number;
  course_id: string;
  student_number: string;
  student_name: string;
  student_school: string | null;
  student_major: string | null;
  student_class: string | null;
  xnxq: string;
  wps_user_id: string | null;
  wps_email: string | null;
  permission_type: PermissionType;
  share_status: ShareStatus;
  extra_info: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * 日历课程表结构定义
 */
export interface CalendarScheduleTable {
  id: Generated<number>;
  calendar_id: number;
  course_id: string;
  wps_event_id: string | null;
  event_title: string;
  event_description: string | null;
  start_time: string;
  end_time: string;
  classroom: string | null;
  building: string | null;
  campus: string | null;
  week_number: number | null;
  weekday: number | null;
  class_period: string | null;
  class_time: string | null;
  xnxq: string;
  recurrence_type: RecurrenceType | null;
  sync_status: SyncStatus;
  metadata: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

// ========== 课程表定义 ==========

/**
 * 课程表结构
 */
export interface CoursesTable {
  id: Generated<number>;
  course_id: string;
  course_name: string;
  course_code: string;
  credits: number;
  semester: string;
  academic_year: string;
  instructor: string;
  instructor_id: string;
  course_type: string;
  department: string;
  schedule_time: string | null;
  classroom: string | null;
  status: 'active' | 'inactive' | 'cancelled';
  max_students: number | null;
  current_students: number | null;
  description: string | null;
  batch_id: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

/**
 * 选课表结构
 */
export interface CourseSelectionsTable {
  id: Generated<number>;
  selection_id: string;
  course_id: string;
  student_id: string;
  student_name: string;
  student_class: string;
  student_major: string;
  student_department: string;
  selection_time: string;
  status: 'selected' | 'confirmed' | 'dropped' | 'cancelled';
  grade: number | null;
  grade_level: string | null;
  is_passed: boolean | null;
  remarks: string | null;
  batch_id: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// ========== 源课程表定义 ==========

/**
 * 源课程表结构（来自外部API的原始数据）
 */
export interface SourceCoursesTable {
  /** 结束节次 */
  JSJC: string;
  /** 开始节次 */
  KSJC: string;
  /** 结束时间 */
  JSSJ: string;
  /** 上课周次 */
  SKZC: string;
  /** 教师工号 */
  JSGH: string;
  /** 教学任务ID */
  JXRWID: string;
  /** 课程名称 */
  KCMC: string;
  /** 行ID */
  ROW_ID: number;
  /** 开课学期码 */
  KKXQM: string;
  /** 星期几 */
  XQJ: string;
  /** 上课教室名称 */
  SKJSMC: string;
  /** 课程号 */
  KCH: string;
  /** 周状态 */
  ZZT: string;
  /** 单节值 */
  DJZ: string;
  /** 备注 */
  BZ: string;
  /** 课序号 */
  KXH: string;
  /** ID */
  ID: string;
  /** 教师姓名 */
  JSXM: string;
  /** 开始时间 */
  KSSJ: string;
  /** 教室号 */
  JSH: string;
  /** 批次ID */
  batch_id: string;
}

/**
 * 源选课表结构（来自外部API的原始数据）
 */
export interface SourceCourseSelectionsTable {
  id: Generated<number>;
  batch_id: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  // 其他字段将根据API数据动态创建
  [key: string]: any;
}

/**
 * 数据库Schema定义
 */
export interface HltnlinkDatabase {
  calendars: CalendarTable;
  course_classes: CourseClassTable;
  calendar_schedules: CalendarScheduleTable;
  courses: CoursesTable;
  course_selections: CourseSelectionsTable;
  source_courses: SourceCoursesTable;
  source_course_selections: SourceCourseSelectionsTable;
}

// ========== 类型别名定义 ==========

/**
 * Calendar 相关类型
 */
export type Calendar = Selectable<CalendarTable>;
export type NewCalendar = Insertable<CalendarTable>;
export type CalendarUpdate = Updateable<CalendarTable>;

/**
 * CourseClass 相关类型
 */
export type CourseClass = Selectable<CourseClassTable>;
export type NewCourseClass = Insertable<CourseClassTable>;
export type CourseClassUpdate = Updateable<CourseClassTable>;

/**
 * CalendarSchedule 相关类型
 */
export type CalendarSchedule = Selectable<CalendarScheduleTable>;
export type NewCalendarSchedule = Insertable<CalendarScheduleTable>;
export type CalendarScheduleUpdate = Updateable<CalendarScheduleTable>;

// ========== 查询选项类型 ==========

/**
 * 分页选项
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * 排序选项
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 查询选项
 */
export interface QueryOptions {
  pagination?: PaginationOptions;
  sort?: SortOptions[];
  limit?: number;
  offset?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ========== 过滤器类型 ==========

/**
 * Calendar 过滤器
 */
export interface CalendarFilter {
  status?: CalendarStatus;
  teacher_id?: string;
  course_id?: string;
  xnxq?: string;
  academic_year?: string;
  semester?: string;
}

/**
 * CourseClass 过滤器
 */
export interface CourseClassFilter {
  calendar_id?: number;
  course_id?: string;
  student_number?: string;
  xnxq?: string;
  share_status?: ShareStatus;
  permission_type?: PermissionType;
}

/**
 * CalendarSchedule 过滤器
 */
export interface CalendarScheduleFilter {
  calendar_id?: number;
  course_id?: string;
  xnxq?: string;
  sync_status?: SyncStatus;
  week_number?: number;
  weekday?: number;
  start_date?: string;
  end_date?: string;
}

// ========== 业务查询参数类型 ==========

/**
 * 按学期查询参数
 */
export interface SemesterQueryParams {
  xnxq: string;
}

/**
 * 按教师查询参数
 */
export interface TeacherQueryParams {
  teacher_id: string;
  xnxq?: string;
}

/**
 * 按课程查询参数
 */
export interface CourseQueryParams {
  course_id: string;
  xnxq?: string;
}

/**
 * 按学生查询参数
 */
export interface StudentQueryParams {
  student_number: string;
  xnxq?: string;
}

/**
 * 时间范围查询参数
 */
export interface TimeRangeQueryParams {
  start_time: string;
  end_time: string;
  xnxq?: string;
}
