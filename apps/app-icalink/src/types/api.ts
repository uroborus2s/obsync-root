// @wps/app-icalink API类型定义
// 基于接口文档的请求和响应类型定义

import {
  AttendanceStatus,
  IcasyncAttendanceCourse,
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
  userId: string;
  userType: UserType;
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
 * 学生查询请假申请 DTO
 */
export interface QueryStudentLeaveApplicationsDTO {
  studentId: string;
  status?: 'leave_pending' | 'leave' | 'leave_rejected' | 'all';
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
}

/**
 * 学生请假申请项 VO
 */
export interface StudentLeaveApplicationItemVO {
  // 基本请假申请信息
  id: number;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  teacher_id: string;
  teacher_name: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  application_time: string;
  approval_time?: string;
  approval_comment?: string;
  created_at: string;
  updated_at: string;

  // 课程详细信息
  course_detail_id?: number;
  semester?: string;
  teaching_week?: number;
  week_day?: number;
  teacher_codes?: string;
  teacher_names?: string;
  class_location?: string;
  start_time?: string;
  end_time?: string;
  periods?: string;
  time_period?: string;

  // 附件信息
  attachment_count: number;
  has_attachments: boolean;
}

/**
 * 学生请假申请统计 VO
 */
export interface StudentLeaveApplicationStatsVO {
  total_count: number;
  leave_pending_count: number;
  leave_count: number;
  leave_rejected_count: number;
}

/**
 * 学生查询请假申请响应 VO
 */
export interface QueryStudentLeaveApplicationsVO {
  data: StudentLeaveApplicationItemVO[];
  stats: StudentLeaveApplicationStatsVO;
  page: number;
  page_size: number;
  total: number;
}

/**
 * 请假查询参数（旧版，保留兼容性）
 * @deprecated 使用 QueryStudentLeaveApplicationsDTO 替代
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
 * 请假申请信息（旧版，保留兼容性）
 * @deprecated 使用 StudentLeaveApplicationItemVO 替代
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
 * Checkin DTO
 */
export interface CheckinDTO {
  courseExtId: string;
  studentInfo: Required<UserInfo>;
  checkinData: CheckinRequest;
}

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
  // 新增字段 - 用于优化签到性能
  course_start_time: string; // 课程开始时间（ISO 8601格式）
  window_id?: string; // 窗口ID（窗口期签到时必填）
  window_open_time?: string; // 窗口开启时间（ISO 8601格式）
  window_close_time?: string; // 窗口关闭时间（ISO 8601格式）
  // 照片签到相关字段（位置校验失败时使用）
  photo_url?: string; // 图片OSS路径（照片签到时必填，存储在metadata中）
  location_offset_distance?: number; // 位置偏移距离（米），记录实际距离签到点的距离
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
  status: 'queued';
  message: string;
}

// ==================== API_02: 教师查询请假申请接口 ====================

/**
 * 教师请假申请项 VO
 * 用于教师查询待审批的请假申请详情
 */
export interface TeacherLeaveApplicationItemVO {
  // 基本请假申请信息
  id: number;
  approval_id: string;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  teacher_name: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  approval_comment?: string;
  approval_time?: string;
  application_time: string;
  approval_result: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approval_record_id: number;

  // 课程详细信息
  start_time?: string;
  end_time?: string;
  teaching_week?: number;
  periods?: string;
  leave_date?: string;

  // 教师信息
  teacher_info?: {
    teacher_id: string;
    teacher_name: string;
    teacher_department?: string;
  };

  // 附件信息
  attachments?: Array<{
    id: number;
    leave_application_id: number;
    file_name: string;
    file_size: number;
    file_type: string;
    upload_time: string;
  }>;
  attachment_count: number;
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
  course_id: string;
  leave_type: LeaveType;
  leave_reason: string;
  images?: ImageAttachment[];
  // 学生信息（由前端传递，不从数据库查询）
  student_id: string; // 学号
  student_name: string; // 姓名
  class_name: string; // 班级
  major_name: string; // 专业
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
  approval_count: number;
  attachment_count: number;
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

// ==================== 创建签到窗口接口 ====================

/**
 * 创建签到窗口请求
 */
export interface CreateVerificationWindowRequest {
  duration_minutes?: number; // 窗口持续时间（分钟），默认 2 分钟
}

/**
 * 创建签到窗口响应
 */
export interface CreateVerificationWindowResponse {
  window_id: string;
  verification_round: number;
  start_time: string;
  end_time: string;
  status: 'open';
  message: string;
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
  unstarted_count: number;
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

// ==================== API_11: 获取课程完整数据接口 ====================

/**
 * 获取课程完整数据 DTO
 */
/**
 * 获取课程完整数据 DTO
 */
export interface GetCourseCompleteDataDTO {
  externalId: string;
  userInfo: UserInfo;
  type: 'student' | 'teacher';
}

/**
 * 学生课程数据 VO（用于学生端）
 * 匹配前端 AttendanceData 接口
 */
export interface StudentCourseDataVO {
  id: number;
  attendance_record_id?: number; // 考勤记录ID，用于请假申请和撤回请假
  course: {
    external_id: string;
    kcmc: string; // 课程名称
    course_start_time: string;
    course_end_time: string;
    room_s: string; // 教室
    xm_s: string; // 教师姓名
    jc_s: string; // 节次
    jxz: number; // 教学周
    lq: string; // 楼区
    rq?: string;
    need_checkin: number; // 0: 无需签到, 1: 需要签到
  };
  student: {
    xh: string; // 学号
    xm: string; // 姓名
    bjmc: string; // 班级名称
    zymc: string; // 专业名称
  };
  final_status?: AttendanceStatus;
  pending_status?: AttendanceStatus;
  live_status?: AttendanceStatus;
  verification_windows?: {
    id: number;
    window_id: string;
    course_id: number;
    verification_round: number;
    open_time: string;
    duration_minutes: number;
    attendance_record?: {
      id: number;
      checkin_time: string;
      status: string;
      last_checkin_source: string;
      last_checkin_reason: string;
      window_id: string;
    };
  };
}

/**
 * 教师信息
 */
export interface TeacherInfo {
  teacher_id: string;
  teacher_name: string;
}

/**
 * 学生考勤详情
 */
export interface StudentAttendanceDetail {
  student_id: string;
  student_name: string | null;
  class_name: string | null;
  major_name: string | null;
  absence_type: AttendanceStatus;
  checkin_time?: string | Date | null;
}

/**
 * 学生视图 - 课程完整数据响应
 */
export interface StudentCourseCompleteDataVO {
  course_info: {
    external_id: string;
    course_code: string;
    course_name: string;
    semester: string;
    teaching_week: number;
    week_day: number;
    class_location?: string;
    start_time: string;
    end_time: string;
    periods?: string;
    time_period: string;
  };
  teacher_info: TeacherInfo[];
  my_attendance: {
    status: AttendanceStatus;
    checkin_time?: string;
    is_late: boolean;
    late_minutes?: number;
    leave_reason?: string;
    can_checkin: boolean;
    can_leave: boolean;
  };
  attendance_window: {
    start_time: string;
    end_time: string;
    is_active: boolean;
  };
}

/**
 * 教师视图 - 课程完整数据响应
 */
export interface TeacherCourseCompleteDataVO {
  course: IcasyncAttendanceCourse;
  students: StudentAttendanceDetail[];
  stats: {
    total_count: number;
    checkin_count: number;
    absent_count: number;
    leave_count: number;
    truant_count: number;
  };
  status: 'not_started' | 'in_progress' | 'final';
  attendance_window?: {
    id: number;
    open_time: string;
    window_id: string;
    course_id: number;
    external_id: string;
    duration_minutes: number;
  };
}

/**
 * 更新课程签到设置 DTO
 */
export interface UpdateCourseCheckinSettingDTO {
  courseId: number;
  needCheckin: 0 | 1;
  userInfo: UserInfo;
}

/**
 * 更新课程签到设置响应
 */
export interface UpdateCourseCheckinSettingResponse {
  course_id: number;
  need_checkin: 0 | 1;
  updated_at: string;
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

/**
 * 教师补卡请求
 */
export interface TeacherManualCheckinRequest {
  student_id: string;
  reason?: string;
}

/**
 * 教师补卡响应
 */
export interface TeacherManualCheckinResponse {
  success: boolean;
  message: string;
  record_id?: number;
}

// ============================================
// OSS 相关接口
// ============================================

/**
 * OSS 预签名上传请求
 */
export interface OssPresignedUploadRequest {
  /** 文件名 */
  fileName: string;
  /** MIME 类型 */
  mimeType: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 业务类型 */
  businessType: 'checkin' | 'leave' | 'other';
}

/**
 * OSS 预签名上传响应
 */
export interface OssPresignedUploadResponse {
  /** 预签名上传 URL */
  uploadUrl: string;
  /** 对象路径（上传成功后的文件路径） */
  objectPath: string;
  /** URL 过期时间（秒） */
  expiresIn: number;
  /** 存储桶名称 */
  bucketName: string;
}

// ============================================
// 照片签到审批相关接口
// ============================================

/**
 * 审批照片签到请求
 */
export interface ApprovePhotoCheckinRequest {
  /** 签到记录ID */
  recordId: number;
  /** 审批结果：approved-通过，rejected-拒绝 */
  action: 'approved' | 'rejected';
  /** 审批备注（拒绝时必填） */
  remark?: string;
}

/**
 * 审批照片签到响应
 */
export interface ApprovePhotoCheckinResponse {
  success: boolean;
  message: string;
  /** 更新后的签到记录ID */
  recordId?: number;
}
