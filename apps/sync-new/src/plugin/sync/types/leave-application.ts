/**
 * 请假申请相关类型定义
 */

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
 * 申请状态枚举
 */
export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

/**
 * 请假申请信息
 */
export interface LeaveApplication {
  /** 申请ID */
  id: string;
  /** 学生学号 */
  student_id: string;
  /** 学生姓名 */
  student_name: string;
  /** 关联学生考勤记录ID */
  student_attendance_record_id: string;
  /** 开课号 */
  kkh: string;
  /** 学年学期 */
  xnxq: string;
  /** 课程名称 */
  course_name: string;
  /** 上课日期 */
  class_date: Date;
  /** 上课时间 */
  class_time: string;
  /** 上课地点 */
  class_location?: string;
  /** 任课教师工号 */
  teacher_id: string;
  /** 任课教师姓名 */
  teacher_name: string;
  /** 请假类型 */
  leave_type: LeaveType;
  /** 请假日期 */
  leave_date: Date;
  /** 请假原因 */
  leave_reason: string;
  /** 申请时间 */
  application_time: Date;
  /** 申请状态 */
  status: ApplicationStatus;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
}

/**
 * 创建请假申请请求
 */
export interface CreateLeaveApplicationRequest {
  /** 学生学号 */
  student_id: string;
  /** 学生考勤记录ID */
  student_attendance_record_id: string;
  /** 请假类型 */
  leave_type: LeaveType;
  /** 请假日期 */
  leave_date: string; // ISO 8601 格式
  /** 请假原因 */
  leave_reason: string;
}

/**
 * 请假申请响应
 */
export interface LeaveApplicationResponse {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 申请数据 */
  data?: LeaveApplication;
}

/**
 * 请假申请列表响应
 */
export interface LeaveApplicationListResponse {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message?: string;
  /** 申请列表 */
  data?: {
    /** 申请列表 */
    applications: LeaveApplication[];
    /** 总数 */
    total: number;
    /** 当前页 */
    page: number;
    /** 每页大小 */
    page_size: number;
  };
}

/**
 * 审批请假申请请求
 */
export interface ApproveLeaveApplicationRequest {
  /** 申请ID */
  application_id: string;
  /** 审批结果 */
  action: 'approve' | 'reject';
  /** 审批意见 */
  comment?: string;
}

/**
 * 请假申请统计
 */
export interface LeaveApplicationStatistics {
  /** 总申请数 */
  total_count: number;
  /** 待审批数 */
  pending_count: number;
  /** 已批准数 */
  approved_count: number;
  /** 已拒绝数 */
  rejected_count: number;
  /** 病假数 */
  sick_leave_count: number;
  /** 事假数 */
  personal_leave_count: number;
  /** 紧急事假数 */
  emergency_leave_count: number;
  /** 其他请假数 */
  other_leave_count: number;
  /** 批准率 */
  approval_rate: number;
}

/**
 * 请假申请查询参数
 */
export interface LeaveApplicationQueryParams {
  /** 学生学号 */
  student_id?: string;
  /** 教师工号 */
  teacher_id?: string;
  /** 开课号 */
  kkh?: string;
  /** 学年学期 */
  xnxq?: string;
  /** 申请状态 */
  status?: ApplicationStatus;
  /** 请假类型 */
  leave_type?: LeaveType;
  /** 开始日期 */
  start_date?: string;
  /** 结束日期 */
  end_date?: string;
  /** 页码 */
  page?: number;
  /** 每页大小 */
  page_size?: number;
}

/**
 * 学生请假申请详情
 */
export interface StudentLeaveApplicationDetail {
  /** 申请信息 */
  application: LeaveApplication;
  /** 课程信息 */
  course_info: {
    /** 课程名称 */
    course_name: string;
    /** 上课时间 */
    class_time: string;
    /** 上课地点 */
    class_location?: string;
    /** 任课教师 */
    teacher_name: string;
  };
  /** 是否可以修改 */
  can_modify: boolean;
  /** 是否可以撤销 */
  can_cancel: boolean;
}

/**
 * 教师审批列表项
 */
export interface TeacherApprovalItem {
  /** 申请信息 */
  application: LeaveApplication;
  /** 学生信息 */
  student_info: {
    /** 学号 */
    student_id: string;
    /** 姓名 */
    student_name: string;
    /** 班级 */
    class_name?: string;
  };
  /** 申请天数 */
  days_requested: number;
  /** 是否紧急 */
  is_urgent: boolean;
}

/**
 * 请假申请通知
 */
export interface LeaveApplicationNotification {
  /** 通知ID */
  id: string;
  /** 申请ID */
  application_id: string;
  /** 通知类型 */
  type: 'new_application' | 'approved' | 'rejected' | 'cancelled';
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 接收者ID */
  recipient_id: string;
  /** 是否已读 */
  is_read: boolean;
  /** 创建时间 */
  created_at: Date;
}

/**
 * 请假申请验证规则
 */
export interface LeaveApplicationValidationRules {
  /** 最大请假天数 */
  max_leave_days: number;
  /** 提前申请天数 */
  advance_days_required: number;
  /** 是否需要证明材料 */
  requires_documentation: boolean;
  /** 允许的请假类型 */
  allowed_leave_types: LeaveType[];
}

/**
 * 请假申请审批历史
 */
export interface LeaveApplicationApprovalHistory {
  /** 历史ID */
  id: string;
  /** 申请ID */
  application_id: string;
  /** 操作类型 */
  action: 'submit' | 'approve' | 'reject' | 'modify' | 'cancel';
  /** 操作人ID */
  operator_id: string;
  /** 操作人姓名 */
  operator_name: string;
  /** 操作时间 */
  operation_time: Date;
  /** 备注 */
  comment?: string;
}
