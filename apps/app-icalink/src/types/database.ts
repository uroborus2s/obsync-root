// import type { ColumnType } from 'kysely';
type ColumnType<
  SelectType,
  InsertType = SelectType,
  UpdateType = SelectType
> = SelectType;

// @wps/app-icalink 数据库类型定义
// 基于 Stratix 框架的数据库实体接口定义

/**
 * 签到状态枚举
 */
export enum AttendanceStatus {
  NOT_STARTED = 'unstarted',
  PRESENT = 'present',
  ABSENT = 'absent',
  LEAVE = 'leave',
  PENDING_APPROVAL = 'pending_approval',
  LEAVE_PENDING = 'leave_pending',
  LEAVE_REJECTED = 'leave_rejected',
  LATE = 'late',
  TRUANT = 'truant'
}

/**
 * 请假类型枚举
 */
export enum LeaveType {
  SICK = 'sick',
  PERSONAL = 'personal',
  EMERGENCY = 'emergency',
  OTHER = 'other'
}

/**
 * 请假状态枚举
 */
export enum LeaveStatus {
  LEAVE_PENDING = 'leave_pending',
  LEAVE = 'leave',
  LEAVE_REJECTED = 'leave_rejected',
  CANCELLED = 'cancelled'
}

/**
 * 审批结果枚举
 */
export enum ApprovalResult {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

/**
 * 图片类型枚举
 */
export enum ImageType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  GIF = 'image/gif',
  WEBP = 'image/webp'
}

/**
 * 配置类型枚举
 */
export enum ConfigType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array'
}

/**
 * 学生签到记录表实体
 */
export interface IcalinkAttendanceRecord {
  id: ColumnType<number, number | undefined, number>;
  attendance_course_id: number;
  student_id: string;
  student_name: string;
  class_name?: string;
  major_name?: string;
  status: AttendanceStatus;
  checkin_time?: Date;
  checkin_location?: string;
  checkin_latitude?: number;
  checkin_longitude?: number;
  checkin_accuracy?: number;
  ip_address?: string;
  user_agent?: string;
  is_late: boolean;
  late_minutes?: number;
  remark?: string;
  created_at: ColumnType<Date, string, string>;
  updated_at: ColumnType<Date, string, string>;
  created_by?: string;
  updated_by?: string;
  metadata?: any;
  // v7 新增字段
  last_checkin_source?: 'regular' | 'window' | 'manual';
  last_checkin_reason?: string;
  manual_override_by?: string;
  manual_override_time?: Date;
  manual_override_reason?: string;
  auto_marked_at?: Date;
  window_id?: string;
}

/**
 * 请假申请表实体
 */
export interface IcalinkLeaveApplication {
  id: ColumnType<number, number | undefined, number>;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  teacher_id: string;
  teacher_name: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  application_time: Date;
  approval_time?: Date;
  approval_comment?: string;
  created_at: ColumnType<Date, string, string>;
  updated_at: ColumnType<Date, string, string>;
  created_by?: string;
  updated_by?: string;
  metadata?: any;
}

/**
 * 请假申请附件表实体
 */
export interface IcalinkLeaveAttachment {
  id: ColumnType<number, number | undefined, number>;
  leave_application_id: number;
  image_name: string;
  image_size: number;
  image_type: ImageType;
  image_extension: string;
  image_content?: Buffer | null;
  image_width?: number;
  image_height?: number;
  thumbnail_content?: Buffer;
  upload_time: Date;
  created_at: ColumnType<Date, string, string>;
  updated_at: ColumnType<Date, string, string>;
  created_by?: string;
  metadata?: any;
}

/**
 * 请假审批记录表实体
 */
export interface IcalinkLeaveApproval {
  id: ColumnType<number, number | undefined, number>;
  leave_application_id: number;
  approver_id: string;
  approver_name: string;
  approver_department?: string;
  approval_result: ApprovalResult;
  approval_comment?: string;
  approval_time?: Date;
  approval_order: number;
  is_final_approver: boolean;
  created_at: ColumnType<Date, string, string>;
  updated_at: ColumnType<Date, string, string>;
  created_by?: string;
  updated_by?: string;
  metadata?: any;
}

/**
 * 系统配置表实体
 */
export interface IcalinkSystemConfig {
  id: ColumnType<number, number | undefined, number>;
  config_key: string;
  config_value?: string;
  config_type: ConfigType;
  config_group: string;
  description?: string;
  is_system: boolean;
  is_encrypted: boolean;
  created_at: ColumnType<Date, string, string>;
  updated_at: ColumnType<Date, string, string>;
  created_by?: string;
  updated_by?: string;
}

/**
 * 考勤课程表实体（现有表）
 */
export interface IcasyncAttendanceCourse {
  id: ColumnType<number, number | undefined, number>;
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
  attendance_enabled: boolean;
  attendance_start_offset?: number;
  attendance_end_offset?: number;
  late_threshold?: number;
  auto_absent_after?: number;
  created_at: ColumnType<Date, string, string>;
  updated_at: ColumnType<Date, string, string>;
  created_by?: string;
  updated_by?: string;
  deleted_at?: Date;
  deleted_by?: string;
  metadata?: any;
}

/**
 * 学生信息表实体（现有表）
 */
export interface OutXsxx {
  id: string;
  xm?: string;
  xh?: string;
  xydm?: string;
  xymc?: string;
  zydm?: string;
  zymc?: string;
  bjdm?: string;
  bjmc?: string;
  xb?: string;
  mz?: string;
  sfzh?: string;
  sjh?: string;
  sznj?: string;
  rxnf?: string;
  email?: string;
  lx?: number;
  update_time?: Date;
  ykth?: string;
  sj?: string;
  zt?: string;
}

/**
 * 教师信息表实体（现有表）
 */
export interface OutJsxx {
  id: string;
  xm?: string;
  gh?: string;
  ssdwdm?: string;
  ssdwmc?: string;
  zgxw?: string;
  zgxl?: string;
  zc?: string;
  xb?: string;
  sjh?: string;
  email?: string;
  update_time?: Date;
  ykth?: string;
  sj?: string;
  zt?: string;
}

/**
 * 学生课程关联表实体（现有表）
 */
export interface OutJwKcbXs {
  kkh?: string;
  xh?: string;
  xnxq?: string;
  kcbh?: string;
  pyfadm?: string;
  xsyd?: string;
  xgxklbdm?: string;
  sj?: string;
  zt?: string;
}

// =====================================================
// v7 业务视图实体
// =====================================================

export interface VAttendanceRealtimeDetails {
  attendance_course_id: number;
  external_id: string;
  course_code: string;
  course_name: string;
  created_at: Date;
  student_id: string;
  student_name: string;
  class_name: string | null;
  major_name: string | null;
  school_name: string | null;
  teaching_week: number | null;
  week_day: number | null;
  periods: string | null;
  time_period: string | null;
  start_time: Date;
  end_time: Date;
  teacher_names: string | null;
  teacher_codes: string | null;
  semester: string;
  class_location: string | null;
  final_status: string;
  // 签到相关字段
  status: string;
  checkin_time: Date | null;
  is_late: boolean;
  late_minutes: number | null;
  leave_reason: string | null;
}

export interface VAttendanceHistoryDetails {
  course_id: number;
  course_code: string;
  student_id: string;
  student_name: string;
  student_class_name: string | null;
  final_status: string;
  semester: string | null;
  teaching_week: number | null;
  week_day: number | null;
  periods: string | null;
}

// =====================================================
// RBAC权限管理系统表实体
// =====================================================

/**
 * 角色表实体
 */
export interface RbacRole {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_system: number;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 权限表实体
 */
export interface RbacPermission {
  id: number;
  name: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
  is_system: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 角色权限关联表实体
 */
export interface RbacRolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  created_at: Date;
  created_by: string | null;
}

/**
 * 用户角色关联表实体
 */
export interface RbacUserRole {
  id: number;
  user_id: string;
  user_type: 'student' | 'teacher';
  role_id: number;
  created_at: Date;
  created_by: string | null;
}

/**
 * 菜单表实体
 */
export interface RbacMenu {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  parent_id: number | null;
  permission_code: string | null;
  sort_order: number;
  is_visible: number;
  menu_type: 'group' | 'item' | 'link';
  external_link: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 缺勤学生关系表实体（历史最终状态）
 */
export interface IcalinkAbsentStudentRelation {
  id: ColumnType<number, number | undefined, number>;
  course_stats_id: number;
  course_id: number;
  course_code: string;
  course_name: string;
  student_id: string;
  student_name: string;
  school_name: string | null;
  class_name: string | null;
  major_name: string | null;
  absence_type: 'absent' | 'truant' | 'leave' | 'leave_pending';
  stat_date: Date;
  semester: string;
  teaching_week: number;
  week_day: number;
  periods: string | null;
  time_period: string;
  leave_reason: string | null;
  created_at: ColumnType<Date, string, string>;
  updated_at: ColumnType<Date, string, string>;
}

/**
 * 签到窗口表实体
 */
export interface IcalinkVerificationWindow {
  id: ColumnType<number, number | undefined, number>;
  window_id: string;
  course_id?: number;
  verification_round: number;
  open_time: Date;
  close_time?: Date;
  opened_by?: string;
  status?: 'open' | 'closed' | 'cancelled' | 'expired';
  duration_minutes: number;
  expected_checkin_count?: number;
  actual_checkin_count?: number;
  created_at?: ColumnType<Date, string, string>;
  updated_at?: ColumnType<Date, string, string>;
}

/**
 * 数据库表结构定义
 */
export interface IcalinkDatabase {
  // 考勤相关表
  icalink_attendance_records: IcalinkAttendanceRecord;
  icalink_leave_applications: IcalinkLeaveApplication;
  icalink_leave_attachments: IcalinkLeaveAttachment;
  icalink_leave_approvals: IcalinkLeaveApproval;
  icalink_system_configs: IcalinkSystemConfig;
  icasync_attendance_courses: IcasyncAttendanceCourse;
  icalink_absent_student_relations: IcalinkAbsentStudentRelation;
  icalink_verification_windows: IcalinkVerificationWindow;

  // 考勤相关视图
  v_attendance_realtime_details: VAttendanceRealtimeDetails;
  v_attendance_history_details: VAttendanceHistoryDetails;

  // RBAC权限管理表
  rbac_roles: RbacRole;
  rbac_permissions: RbacPermission;
  rbac_role_permissions: RbacRolePermission;
  rbac_user_roles: RbacUserRole;
  rbac_menus: RbacMenu;

  // 用户信息表
  out_xsxx: OutXsxx;
  out_jsxx: OutJsxx;
  out_jw_kcb_xs: OutJwKcbXs;
}
