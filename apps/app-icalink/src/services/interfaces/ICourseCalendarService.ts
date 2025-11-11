import type { ICalendarCourseItem } from '../../repositories/interfaces/ICalendarMappingRepository.js';
import type { IcasyncAttendanceCourse } from '../../types/database.js';
import type { PaginatedResult, ServiceResult } from '../../types/service.js';

/**
 * 课程日历树节点类型
 * 只包含两级：root（根节点）和 calendar（日历节点）
 */
export type CourseCalendarTreeNodeType = 'root' | 'calendar';

/**
 * 课程日历树节点
 * 树形结构采用两级结构：根节点 → 日历列表
 */
export interface CourseCalendarTreeNode {
  /** 节点ID */
  id: string;
  /** 节点标签 */
  label: string;
  /** 节点类型 */
  type: CourseCalendarTreeNodeType;
  /** 日历ID（仅calendar类型） */
  calendarId?: string;
  /** 开课号（仅calendar类型） */
  kkh?: string;
  /** 学年学期（仅calendar类型） */
  xnxq?: string;
  /** 子节点（仅root类型有子节点） */
  children?: CourseCalendarTreeNode[];
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 课程详情信息
 */
export interface CourseDetail {
  /** 课程ID */
  id: number;
  /** 聚合任务ID */
  juheRenwuId: number;
  /** 外部ID */
  externalId: string;
  /** 课程代码 */
  courseCode: string;
  /** 课程名称 */
  courseName: string;
  /** 学年学期 */
  semester: string;
  /** 教学周 */
  teachingWeek: number;
  /** 周次 */
  weekDay: number;
  /** 教师工号列表 */
  teacherCodes: string | null;
  /** 教师姓名列表 */
  teacherNames: string | null;
  /** 上课地点 */
  classLocation: string | null;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 节次 */
  periods: string | null;
  /** 时间段 */
  timePeriod: string;
  /** 是否启用签到 */
  attendanceEnabled: boolean;
  /** 签到开始偏移 */
  attendanceStartOffset: number | null;
  /** 签到结束偏移 */
  attendanceEndOffset: number | null;
  /** 迟到阈值 */
  lateThreshold: number | null;
  /** 自动缺勤时间 */
  autoAbsentAfter: number | null;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 创建人 */
  createdBy: string | null;
  /** 更新人 */
  updatedBy: string | null;
  /** 元数据 */
  metadata: Record<string, any> | null;
}

/**
 * 日历参与者信息（增强版，包含学生详细信息）
 */
export interface CalendarParticipant {
  /** 权限ID */
  id: string;
  /** 日历ID */
  calendarId: string;
  /** 用户ID */
  userId: string;
  /** 权限角色 */
  role: 'owner' | 'writer' | 'reader' | 'free_busy_reader';
  /** 学生姓名（从 icalink_teaching_class 表查询） */
  studentName?: string | null;
  /** 学院（从 icalink_teaching_class 表查询） */
  schoolName?: string | null;
  /** 专业（从 icalink_teaching_class 表查询） */
  majorName?: string | null;
  /** 班级（从 icalink_teaching_class 表查询） */
  className?: string | null;
}

/**
 * 日历参与者列表响应（包含教学班总数和已有权限数）
 */
export interface CalendarParticipantsResponse {
  /** 参与者列表（当前 WPS 中的权限列表） */
  participants: CalendarParticipant[];
  /** 教学班学生总数（预期应该有权限的总人数，包括学生和教师） */
  totalStudents: number;
  /** 已有权限数（当前 WPS 中的权限数量） */
  existingPermissions: number;
  /** 需要添加的权限数量 */
  toAddCount: number;
  /** 需要删除的权限数量 */
  toDeleteCount: number;
  /** 是否需要同步（toAddCount > 0 或 toDeleteCount > 0） */
  needsSync: boolean;
}

/**
 * 日历参与者同步结果
 */
export interface CalendarSyncResult {
  /** 教学班总学生数 */
  totalStudents: number;
  /** 已有权限数 */
  existingPermissions: number;
  /** 新增权限数 */
  addedCount: number;
  /** 删除权限数 */
  removedCount: number;
  /** 失败数 */
  failedCount: number;
}

/**
 * 单个日历同步详情
 */
export interface CalendarSyncDetail {
  /** 日历ID */
  calendarId: string;
  /** 开课号 */
  courseCode: string;
  /** 是否同步成功 */
  success: boolean;
  /** 新增的权限数量 */
  addedCount?: number;
  /** 删除的权限数量 */
  removedCount?: number;
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 批量同步结果
 */
export interface BatchSyncResult {
  /** 总日历数量 */
  totalCalendars: number;
  /** 成功同步的日历数量 */
  successCount: number;
  /** 失败的日历数量 */
  failedCount: number;
  /** 总共新增的权限数量 */
  totalAddedPermissions: number;
  /** 总共删除的权限数量 */
  totalRemovedPermissions: number;
  /** 每个日历的详细同步结果 */
  details: CalendarSyncDetail[];
}

/**
 * 用户课程项
 */
export interface UserCourseItem {
  /** 课程代码 */
  courseCode: string;
  /** 课程名称 */
  courseName: string;
  /** 学期 */
  semester: string;
  /** 教师姓名 */
  teacherName: string | null;
  /** 上课地点 */
  classLocation: string | null;
  /** 日历ID */
  calendarId: string;
  /** 教学班代码 */
  teachingClassCode: string;
  /** 开课单位 */
  courseUnit: string | null;
}

/**
 * 用户课程列表响应
 */
export interface UserCoursesResponse {
  /** 用户类型 */
  userType: 'teacher' | 'student';
  /** 用户ID（学号或工号） */
  userId: string;
  /** 用户姓名 */
  userName: string | null;
  /** 课程列表 */
  courses: UserCourseItem[];
}

/**
 * 批量添加参与者详情
 */
export interface BatchAddParticipantDetail {
  /** 日历ID */
  calendarId: string;
  /** 是否成功 */
  success: boolean;
  /** 消息（失败原因或跳过原因） */
  message?: string;
}

/**
 * 批量添加参与者结果
 */
export interface BatchAddParticipantResult {
  /** 总日历数 */
  totalCalendars: number;
  /** 成功添加的日历数 */
  successCount: number;
  /** 失败的日历数 */
  failedCount: number;
  /** 已存在权限，跳过的日历数 */
  skippedCount: number;
  /** 详细结果 */
  details: BatchAddParticipantDetail[];
}

/**
 * 课程日历服务接口
 */
export interface ICourseCalendarService {
  /**
   * 获取课程日历树形结构
   * @returns 树形结构数据
   */
  getCourseCalendarTree(): Promise<ServiceResult<CourseCalendarTreeNode>>;

  /**
   * 根据日历ID获取日历参与者列表（包含教学班总数）
   * @param calendarId 日历ID
   * @returns 参与者列表和教学班总数
   */
  getCalendarParticipants(
    calendarId: string
  ): Promise<ServiceResult<CalendarParticipantsResponse>>;

  /**
   * 根据日历ID获取课程详情列表
   * @param calendarId 日历ID
   * @returns 课程详情列表
   */
  getCourseDetailsByCalendarId(
    calendarId: string
  ): Promise<ServiceResult<CourseDetail[]>>;

  /**
   * 分页查询日历-课程关联列表（主列表）
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键词（可选）
   * @returns 分页结果
   */
  getCalendarCoursesWithPagination(
    page: number,
    pageSize: number,
    searchKeyword?: string
  ): Promise<ServiceResult<PaginatedResult<ICalendarCourseItem>>>;

  /**
   * 根据课程代码分页查询课节列表
   * @param courseCode 课程代码
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  getCourseSessionsByCourseCode(
    courseCode: string,
    page: number,
    pageSize: number
  ): Promise<ServiceResult<PaginatedResult<IcasyncAttendanceCourse>>>;

  /**
   * 同步日历参与者（将教学班学生批量添加到日历权限中，并删除多余权限）
   * @param calendarId 日历ID
   * @returns 同步结果统计
   */
  syncCalendarParticipants(
    calendarId: string
  ): Promise<ServiceResult<CalendarSyncResult>>;

  /**
   * 批量同步所有日历的参与者权限
   * @returns 批量同步结果统计
   */
  syncAllCalendarParticipants(): Promise<ServiceResult<BatchSyncResult>>;

  /**
   * 获取指定用户的所有课程列表
   * @param userType 用户类型（teacher 或 student）
   * @param userId 学号或工号
   * @returns 用户的课程列表
   */
  getUserCourses(
    userType: 'teacher' | 'student',
    userId: string
  ): Promise<ServiceResult<UserCoursesResponse>>;

  /**
   * 批量将用户添加到多个日历的权限中
   * @param userType 用户类型（teacher 或 student）
   * @param userId 学号或工号
   * @param calendarIds 日历 ID 列表
   * @returns 批量操作结果
   */
  batchAddParticipant(
    userType: 'teacher' | 'student',
    userId: string,
    calendarIds: string[]
  ): Promise<ServiceResult<BatchAddParticipantResult>>;
}
