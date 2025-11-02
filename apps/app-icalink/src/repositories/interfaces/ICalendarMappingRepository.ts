import type { Maybe } from '@stratix/utils/functional';

/**
 * 日历映射实体接口
 */
export interface ICalendarMapping {
  id: number;
  kkh: string;
  xnxq: string;
  calendar_id: string;
  calendar_name: string | null;
  is_deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any> | null;
}

/**
 * 日历-课程关联列表项（主列表数据）
 * 包含日历映射信息和课程基本信息
 */
export interface ICalendarCourseItem {
  // 课程基本信息（来自 v_course_checkin_stats_summary）
  course_code: string;
  course_name: string;
  semester: string;
  class_location: string | null;
  teacher_name: string | null;
  teacher_codes: string | null;
  course_unit_id: string;
  course_unit: string;
  teaching_class_code: string;
  start_week: number;
  end_week: number;
  start_time: Date;
  end_time: Date;

  // 统计信息（来自关联查询）
  total_students: number | null; // 学生总数（来自 icalink_teaching_class）
  total_sessions: number | null; // 课节总数（来自 icasync_attendance_courses）

  // 日历信息（来自 icasync_calendar_mapping）
  calendar_id: string;
  calendar_name: string | null;
}

/**
 * 日历映射仓储接口
 * 负责课程日历映射数据的持久化和查询
 */
export interface ICalendarMappingRepository {
  /**
   * 查询所有未删除的日历映射
   * @returns 日历映射列表
   */
  findAllActive(): Promise<ICalendarMapping[]>;

  /**
   * 根据日历ID查询日历映射
   * @param calendarId 日历ID
   * @returns 日历映射实体（可能不存在）
   */
  findByCalendarId(calendarId: string): Promise<Maybe<ICalendarMapping>>;

  /**
   * 根据开课号和学年学期查询日历映射
   * @param kkh 开课号
   * @param xnxq 学年学期
   * @returns 日历映射实体（可能不存在）
   */
  findByKkhAndXnxq(kkh: string, xnxq: string): Promise<Maybe<ICalendarMapping>>;

  /**
   * 根据学年学期查询所有未删除的日历映射
   * @param xnxq 学年学期
   * @returns 日历映射列表
   */
  findByXnxq(xnxq: string): Promise<ICalendarMapping[]>;

  /**
   * 分页查询日历-课程关联列表（主列表）
   * 关联 icasync_calendar_mapping 和 v_course_checkin_stats_summary
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键词（可选，支持课程代码、课程名称、教师姓名、教师代码）
   * @returns 日历-课程关联列表
   */
  findCalendarCoursesWithPagination(
    page: number,
    pageSize: number,
    searchKeyword?: string
  ): Promise<ICalendarCourseItem[]>;

  /**
   * 获取日历-课程关联列表的总数
   * @param searchKeyword 搜索关键词（可选）
   * @returns 总记录数
   */
  getCalendarCoursesTotalCount(searchKeyword?: string): Promise<number>;
}
