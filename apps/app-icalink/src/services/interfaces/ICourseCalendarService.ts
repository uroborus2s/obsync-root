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
  /** 参与者列表 */
  participants: CalendarParticipant[];
  /** 教学班学生总数 */
  totalStudents: number;
  /** 已有权限数 */
  existingPermissions: number;
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
  /** 失败数 */
  failedCount: number;
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
   * 根据日历ID获取课程分享人列表（通过WPS API，包含教学班总数）
   * @param calendarId 日历ID
   * @returns 分享人列表和教学班总数
   */
  getCourseShareParticipants(
    calendarId: string
  ): Promise<ServiceResult<CalendarParticipantsResponse>>;

  /**
   * 同步日历参与者（将教学班学生批量添加到日历权限中）
   * @param calendarId 日历ID
   * @returns 同步结果统计
   */
  syncCalendarParticipants(
    calendarId: string
  ): Promise<ServiceResult<CalendarSyncResult>>;
}
