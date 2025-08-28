// @stratix/icasync 数据库类型定义
// 基于数据库schema定义的TypeScript类型

import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable
} from '@stratix/database';

/**
 * 数据库同步状态枚举
 */
export type DatabaseSyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';

/**
 * 扩展同步状态枚举（包含删除状态）
 */
export type ExtendedSyncStatus = DatabaseSyncStatus | 'deleted';

/**
 * 用户类型枚举
 */
export type UserType = 'student' | 'teacher';

/**
 * 权限角色枚举
 */
export type PermissionRole = 'reader' | 'writer' | 'owner';

/**
 * 任务类型枚举
 */
export type TaskType = 'full_sync' | 'incremental_sync' | 'user_sync';

/**
 * 任务状态枚举
 */
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * 课程日历映射表
 */
export interface CalendarMappingTable {
  id: Generated<number>;
  kkh: string;
  xnxq: string;
  calendar_id: string;
  calendar_name: string | null;
  is_deleted: ColumnType<boolean, boolean | undefined, boolean>;
  deleted_at: ColumnType<Date | null, string | undefined, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  metadata: ColumnType<
    Record<string, any> | null,
    string | null,
    string | null
  >;
}

/**
 * 日程映射表
 */
export interface ScheduleMappingTable {
  id: Generated<number>;
  juhe_renwu_id: number;
  kkh: string;
  calendar_id: string;
  schedule_id: string;
  schedule_summary: string | null;
  sync_status: ExtendedSyncStatus;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  metadata: ColumnType<
    Record<string, any> | null,
    string | null,
    string | null
  >;
}

/**
 * 签到课程表
 */
export interface AttendanceCoursesTable {
  id: Generated<number>;
  juhe_renwu_id: number;
  external_id: string;
  course_code: string;
  course_name: string;
  semester: string;
  teaching_week: number;
  week_day: number;
  teacher_codes: string | null;
  teacher_names: string | null;
  class_location: string | null;
  start_time: ColumnType<Date, string, string>;
  end_time: ColumnType<Date, string, string>;
  periods: string | null;
  time_period: string;
  attendance_enabled: number;
  attendance_start_offset: number | null;
  attendance_end_offset: number | null;
  late_threshold: number | null;
  auto_absent_after: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: ColumnType<Date | null, string | null, string | null>;
  deleted_by: string | null;
  metadata: ColumnType<
    Record<string, any> | null,
    string | null,
    string | null
  >;
}

/**
 * 原始课程表（现有表 u_jw_kcb_cur）
 */
export interface CourseRawTable {
  kkh: string | null; // 开课号
  xnxq: string | null; // 学年学期
  jxz: number | null; // 教学周（1-20）
  zc: number | null; // 周次（星期1-星期日）
  jc: number | null; // 节次（1-10）
  lq: string | null; // 楼群
  room: string | null; // 房间
  xq: string | null; // 校区
  ghs: string | null; // 工号组
  lc: string | null; // 楼层
  rq: string | null; // 日期
  st: string | null; // 开始时间
  ed: string | null; // 结束时间
  sj: string | null; // 来源库时间
  zt: string | null; // 来源库状态标识（add、update、delete）
  gx_sj: string | null; // 目标库更新时间
  gx_zt: string | null; // 目标库更新状态
  kcmc: string | null; // 课程名称
  xms: string | null; // 教师姓名组
  sfdk: string | null; // 是否打卡(打卡，不打卡)
}

/**
 * 聚合任务表（现有表 juhe_renwu）
 */
export interface JuheRenwuTable {
  id: Generated<number>;
  kkh: string | null; // 开课号
  xnxq: string | null; // 学年学期
  jxz: number | null; // 教学周
  zc: number | null; // 周次
  rq: string; // 日期
  kcmc: string | null; // 课程名称
  sfdk: string | null; // 是否打卡（是否生成学生日历）
  jc_s: string | null; // 节次合并
  room_s: string | null; // 上课教室合并（一般都是同一教室）
  gh_s: string | null; // 教师组号，推送教师课表日历的依据
  xm_s: string | null; // 教师组姓名，推送学生课表日历直接取此
  lq: string | null; // 教学楼
  sj_f: string; // 开始时间
  sj_t: string; // 结束时间
  sjd: string; // 时间段（1-4为am，4-10为pm）
  gx_sj: string | null; // 更新时间，给杨经理用
  gx_zt: string | null; // 更新状态，给杨经理用(0未处理，1教师日历已经推送，2学生日历已经推送，3软删除未处理，4软删除处理完毕)
}

/**
 * 学生信息表（现有表 out_xsxx）
 */
export interface StudentInfoTable {
  id: string; // 主键ID
  xm: string | null; // 姓名
  xh: string | null; // 学号
  xydm: string | null; // 学院代码
  xymc: string | null; // 学院名称
  zydm: string | null; // 专业代码
  zymc: string | null; // 专业名称
  bjdm: string | null; // 班级代码
  bjmc: string | null; // 班级名称
  xb: string | null; // 性别
  mz: string | null; // 民族
  sfzh: string | null; // 身份证号
  sjh: string | null; // 手机号
  sznj: string | null; // 所在年级
  rxnf: string | null; // 入学年份
  email: string | null; // 邮箱
  lx: number | null; // 类型 1本科生 2研究生
  update_time: ColumnType<Date, string | undefined, string> | null; // 更新时间
  ykth: string | null; // 一卡通号
  sj: string | null; // 来源库时间
  zt: string | null; // 状态标识
}

/**
 * 教师信息表（现有表 out_jsxx）
 */
export interface TeacherInfoTable {
  id: string; // 主键ID
  xm: string | null; // 姓名
  gh: string | null; // 工号
  ssdwdm: string | null; // 所属单位代码
  ssdwmc: string | null; // 所属单位名称
  zgxw: string | null; // 最高学位
  zgxl: string | null; // 最高学历
  zc: string | null; // 职称
  xb: string | null; // 性别
  sjh: string | null; // 手机号
  email: string | null; // 邮箱
  update_time: ColumnType<Date, string | undefined, string> | null; // 更新时间
  ykth: string | null; // 一卡通号
  sj: string | null; // 来源库时间
  zt: string | null; // 状态标识
}

/**
 * 学生课程关联表（现有表 out_jw_kcb_xs）
 */
export interface StudentCourseTable {
  kkh: string | null; // 开课号
  xh: string | null; // 学生编号
  xnxq: string | null; // 学年学期
  kcbh: string | null; // 课程编号
  pyfadm: string | null; // 培养方案代码
  xsyd: string | null; // 学生异动标识
  xgxklbdm: string | null; // 校公选课类别代码
  sj: string | null; // 来源库时间
  zt: string | null; // 状态标识
}

/**
 * Icasync 数据库接口
 */
export interface IcasyncDatabase {
  // icasync 专用表
  icasync_calendar_mapping: CalendarMappingTable;
  icasync_schedule_mapping: ScheduleMappingTable;
  icasync_attendance_courses: AttendanceCoursesTable;

  // 现有系统表
  u_jw_kcb_cur: CourseRawTable;
  juhe_renwu: JuheRenwuTable;
  out_xsxx: StudentInfoTable;
  out_jsxx: TeacherInfoTable;
  out_jw_kcb_xs: StudentCourseTable;
}

// 类型别名定义
export type CalendarMapping = Selectable<CalendarMappingTable>;
export type NewCalendarMapping = Insertable<CalendarMappingTable>;
export type CalendarMappingUpdate = Updateable<CalendarMappingTable>;

export type ScheduleMapping = Selectable<ScheduleMappingTable>;
export type NewScheduleMapping = Insertable<ScheduleMappingTable>;
export type ScheduleMappingUpdate = Updateable<ScheduleMappingTable>;

export type AttendanceCourse = Selectable<AttendanceCoursesTable>;
export type NewAttendanceCourse = Insertable<AttendanceCoursesTable>;
export type AttendanceCourseUpdate = Updateable<AttendanceCoursesTable>;

export type CourseRaw = Selectable<CourseRawTable>;
export type NewCourseRaw = Insertable<CourseRawTable>;
export type CourseRawUpdate = Updateable<CourseRawTable>;

export type JuheRenwu = Selectable<JuheRenwuTable>;
export type NewJuheRenwu = Insertable<JuheRenwuTable>;
export type JuheRenwuUpdate = Updateable<JuheRenwuTable>;

export type StudentInfo = Selectable<StudentInfoTable>;
export type NewStudentInfo = Insertable<StudentInfoTable>;
export type StudentInfoUpdate = Updateable<StudentInfoTable>;

export type TeacherInfo = Selectable<TeacherInfoTable>;
export type NewTeacherInfo = Insertable<TeacherInfoTable>;
export type TeacherInfoUpdate = Updateable<TeacherInfoTable>;

export type StudentCourse = Selectable<StudentCourseTable>;
export type NewStudentCourse = Insertable<StudentCourseTable>;
export type StudentCourseUpdate = Updateable<StudentCourseTable>;

/**
 * 业务数据类型
 */
export interface ClassInfo {
  bjdm: string;
  bjmc: string;
  studentCount: number;
}

export interface UserInfo {
  userCode: string;
  userName: string;
  userType: UserType;
  collegeCode?: string;
  collegeName?: string;
  majorCode?: string;
  majorName?: string;
  classCode?: string;
  className?: string;
  phone?: string;
  email?: string;
}

export interface CourseChange {
  kkh: string;
  rq: string;
  changeType: 'add' | 'update' | 'delete';
}

export interface DatabaseSyncSummary {
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  duration: number;
  errors: string[];
}

export interface UserSyncSummary {
  totalUsers: number;
  syncedUsers: number;
  failedUsers: number;
  newUsers: number;
  updatedUsers: number;
}

export interface DatabaseUserSyncStatus {
  lastSyncTime: Date | null;
  totalUsers: number;
  pendingUsers: number;
  syncedUsers: number;
  failedUsers: number;
}
