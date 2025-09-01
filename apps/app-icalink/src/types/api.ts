// @wps/app-icalink API类型定义
// 基于接口文档的请求和响应类型定义

import {
  AttendanceStatus,
  ImageType,
  LeaveStatus,
  LeaveType
} from './database.js';

/**
 * 用户类型
 */
export type UserType = 'student' | 'teacher';

/**
 * 用户信息
 */
export interface UserInfo {
  id: string;
  type: UserType;
  name: string;
  className?: string;
  majorName?: string;
  collegeMame?: string;
}

/**
 * 通用响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> extends ApiResponse<T> {
  data: T & {
    pagination: PaginationInfo;
  };
}

// ==================== API_01: 查询请假信息接口 ====================

/**
 * 请假查询参数
 */
export interface LeaveQueryParams {
  status?: 'all' | LeaveStatus;
  start_date?: string;
  end_date?: string;
  course_id?: string;
  student_id?: string;
  page?: number;
  page_size?: number;
}

/**
 * 请假申请信息
 */
export interface LeaveApplicationInfo {
  id: number;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  class_name?: string;
  course_name?: string;
  teacher_name?: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  application_time: string;
  class_date: string;
  approval_time?: string;
  approval_comment?: string;
  has_attachments: boolean;
  attachment_count: number;
}

/**
 * 请假申请列表响应
 */
export interface LeaveApplicationsResponse {
  applications: LeaveApplicationInfo[];
  pagination: PaginationInfo;
}

// ==================== API_02: 学生签到接口 ====================

/**
 * 签到路径参数
 */
export interface CheckinPathParams {
  course_id: string;
}

/**
 * 签到请求
 */
export interface CheckinRequest {
  location?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  remark?: string;
}

/**
 * 坐标信息
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * 签到响应
 */
export interface CheckinResponse {
  record_id: number;
  student_id: string;
  student_name: string;
  course_name: string;
  status: 'present' | 'late';
  checkin_time: string;
  is_late: boolean;
  late_minutes?: number;
  location?: string;
  coordinates?: Coordinates;
}

// ==================== API_03: 学生请假申请接口 ====================

/**
 * 图片附件
 */
export interface ImageAttachment {
  name: string;
  type: ImageType;
  size: number;
  content: string; // Base64编码
}

/**
 * 请假申请请求
 */
export interface LeaveApplicationRequest {
  attendance_record_id: string;
  leave_type: LeaveType;
  leave_reason: string;
  images?: ImageAttachment[];
}

/**
 * 请假申请响应
 */
export interface LeaveApplicationResponse {
  application_id: number;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  course_name: string;
  teacher_name: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  application_time: string;
  class_date: string;
  uploaded_images: number;
}

// ==================== API_04: 撤回请假申请接口 ====================

/**
 * 撤回请假申请路径参数
 */
export interface WithdrawPathParams {
  application_id: string;
}

/**
 * 撤回请假申请响应
 */
export interface WithdrawResponse {
  application_id: number;
  student_id: string;
  student_name: string;
  course_name: string;
  previous_status: LeaveStatus;
  new_status: LeaveStatus;
  withdraw_time: string;
}

// ==================== API_05: 审批请假申请接口 ====================

/**
 * 审批路径参数
 */
export interface ApprovalPathParams {
  application_id: string;
}

/**
 * 审批请求
 */
export interface ApprovalRequest {
  result: 'approved' | 'rejected';
  comment?: string;
}

/**
 * 课程信息
 */
export interface CourseInfo {
  course_name: string;
  class_date: string;
}

/**
 * 审批响应
 */
export interface ApprovalResponse {
  application_id: number;
  student_id: string;
  student_name: string;
  teacher_id: string;
  teacher_name: string;
  approval_result: 'approved' | 'rejected';
  approval_time: string;
  approval_comment?: string;
  new_attendance_status: 'leave' | 'absent';
  course_info: CourseInfo;
}

// ==================== API_06: 查看请假申请附件接口 ====================

/**
 * 附件查看路径参数
 */
export interface AttachmentsPathParams {
  application_id: string;
}

/**
 * 附件信息
 */
export interface AttachmentInfo {
  id: string; // 改为string以匹配前端期望
  file_name: string; // 统一字段名
  file_size: number; // 统一字段名
  file_type: ImageType; // 统一字段名
  image_width?: number;
  image_height?: number;
  upload_time: string;
  download_url: string;
  thumbnail_url?: string;
  preview_url?: string; // 添加预览URL
}

/**
 * 附件列表响应
 */
export interface AttachmentsResponse {
  application_id: number;
  student_id: string;
  student_name: string;
  attachments: AttachmentInfo[];
  total_count: number;
  total_size: number;
}

// ==================== API_07: 下载请假申请附件接口 ====================

/**
 * 附件下载路径参数
 */
export interface AttachmentDownloadPathParams {
  application_id: string;
  attachment_id: string;
}

/**
 * 附件下载查询参数
 */
export interface AttachmentDownloadQuery {
  thumbnail?: 'true' | 'false';
}

// ==================== API_08: 课程历史考勤数据查询接口 ====================

/**
 * 历史考勤查询参数
 */
export interface AttendanceHistoryParams {
  course_id?: string;
  student_id?: string;
  start_date?: string;
  end_date?: string;
  status?: 'all' | AttendanceStatus;
  page?: number;
  page_size?: number;
}

/**
 * 历史考勤记录
 */
export interface AttendanceHistoryRecord {
  id: number;
  course_name: string;
  class_date: string;
  class_time: string;
  student_id: string;
  student_name: string;
  status: AttendanceStatus;
  checkin_time?: string;
  is_late: boolean;
  late_minutes?: number;
  leave_reason?: string;
  teacher_name: string;
}

/**
 * 历史考勤响应
 */
export interface AttendanceHistoryResponse {
  records: AttendanceHistoryRecord[];
  pagination: PaginationInfo;
  summary: {
    total_classes: number;
    present_count: number;
    late_count: number;
    absent_count: number;
    leave_count: number;
    attendance_rate: number;
  };
}

// ==================== API_09: 本次课学生考勤信息查询接口 ====================

/**
 * 当前考勤查询路径参数
 */
export interface CurrentAttendancePathParams {
  course_id: string;
}

/**
 * 学生考勤状态
 */
export interface StudentAttendanceStatus {
  student_id: string;
  student_name: string;
  class_name?: string;
  status: AttendanceStatus;
  checkin_time?: string;
  is_late: boolean;
  late_minutes?: number;
  leave_reason?: string;
  can_checkin: boolean;
  can_leave: boolean;
}

/**
 * 考勤统计
 */
export interface AttendanceStats {
  total_count: number;
  checkin_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
  not_started_count: number;
  attendance_rate: number;
}

/**
 * 当前考勤响应
 */
export interface CurrentAttendanceResponse {
  course_info: {
    course_id: string;
    course_name: string;
    class_date: string;
    class_time: string;
    teacher_name: string;
    class_location?: string;
  };
  attendance_window: {
    start_time: string;
    end_time: string;
    is_active: boolean;
  };
  students: StudentAttendanceStatus[];
  stats: AttendanceStats;
}

// ==================== API_10: 本课程学生考勤记录统计接口 ====================

/**
 * 考勤统计查询参数
 */
export interface AttendanceStatisticsParams {
  course_id: string;
  start_date?: string;
  end_date?: string;
  student_id?: string;
}

/**
 * 学生统计信息
 */
export interface StudentStatistics {
  student_id: string;
  student_name: string;
  class_name?: string;
  total_classes: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
  attendance_rate: number;
  recent_trend: 'improving' | 'declining' | 'stable';
}

/**
 * 考勤统计响应
 */
export interface AttendanceStatisticsResponse {
  course_info: {
    course_id: string;
    course_name: string;
    teacher_name: string;
    total_classes: number;
    date_range: {
      start_date: string;
      end_date: string;
    };
  };
  overall_stats: AttendanceStats;
  students: StudentStatistics[];
  trends: {
    daily_attendance: Array<{
      date: string;
      total_count: number;
      present_count: number;
      attendance_rate: number;
    }>;
    weekly_summary: Array<{
      week: string;
      attendance_rate: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  };
}
