// @wps/app-icalink 数据库类型定义
// 基于 Stratix 框架的数据库实体接口定义

/**
 * 签到状态枚举
 */
export enum AttendanceStatus {
  NOT_STARTED = 'not_started',
  PRESENT = 'present',
  ABSENT = 'absent',
  LEAVE = 'leave',
  PENDING_APPROVAL = 'pending_approval',
  LEAVE_PENDING = 'leave_pending',
  LATE = 'late'
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
  id: number;
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
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  metadata?: any;
}

/**
 * 请假申请表实体
 */
export interface IcalinkLeaveApplication {
  id: number;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  class_date: Date;
  class_time: string;
  class_location?: string;
  teacher_id: string;
  teacher_name: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  application_time: Date;
  approval_time?: Date;
  approval_comment?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  metadata?: any;
}

/**
 * 请假申请附件表实体
 */
export interface IcalinkLeaveAttachment {
  id: number;
  leave_application_id: number;
  image_name: string;
  image_size: number;
  image_type: ImageType;
  image_extension: string;
  image_content: Buffer;
  image_width?: number;
  image_height?: number;
  thumbnail_content?: Buffer;
  upload_time: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  metadata?: any;
}

/**
 * 请假审批记录表实体
 */
export interface IcalinkLeaveApproval {
  id: number;
  leave_application_id: number;
  approver_id: string;
  approver_name: string;
  approver_department?: string;
  approval_result: ApprovalResult;
  approval_comment?: string;
  approval_time?: Date;
  approval_order: number;
  is_final_approver: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  metadata?: any;
}

/**
 * 系统配置表实体
 */
export interface IcalinkSystemConfig {
  id: number;
  config_key: string;
  config_value?: string;
  config_type: ConfigType;
  config_group: string;
  description?: string;
  is_system: boolean;
  is_encrypted: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

/**
 * 考勤课程表实体（现有表）
 */
export interface IcasyncAttendanceCourse {
  id: number;
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
  created_at: Date;
  updated_at: Date;
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

// 学生和教师信息使用现有的 out_xsxx 和 out_jsxx 表
// 课程信息使用现有的 icasync_attendance_courses 表

/**
 * 数据库表结构定义
 */
export interface IcalinkDatabase {
  icalink_attendance_records: IcalinkAttendanceRecord;
  icalink_leave_applications: IcalinkLeaveApplication;
  icalink_leave_attachments: IcalinkLeaveAttachment;
  icalink_leave_approvals: IcalinkLeaveApproval;
  icalink_system_configs: IcalinkSystemConfig;
  icasync_attendance_courses: IcasyncAttendanceCourse;
  out_xsxx: OutXsxx;
  out_jsxx: OutJsxx;
  out_jw_kcb_xs: OutJwKcbXs;
}
