// @wps/app-icalink 请假申请仓储接口
// 基于 Stratix 框架的仓储接口定义

import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkLeaveApplication,
  LeaveStatus,
  LeaveType
} from '../../types/database.js';
import type {
  PaginatedResult,
  QueryOptions,
  ServiceResult
} from '../../types/service.js';

/**
 * 请假申请查询条件
 */
export interface LeaveApplicationQueryConditions {
  student_id?: string;
  teacher_id?: string;
  course_id?: string;
  status?: LeaveStatus;
  leave_type?: LeaveType;
  start_date?: Date;
  end_date?: Date;
  application_start_date?: Date;
  application_end_date?: Date;
}

/**
 * 请假申请创建数据
 */
export interface CreateLeaveApplicationData {
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
  status?: LeaveStatus;
  application_time?: Date;
  created_by?: string;
  metadata?: any;
}

/**
 * 请假申请更新数据
 */
export interface UpdateLeaveApplicationData {
  leave_type?: LeaveType;
  leave_reason?: string;
  status?: LeaveStatus;
  approval_time?: Date;
  approval_comment?: string;
  updated_by?: string;
  metadata?: any;
}

/**
 * 请假申请详细信息（包含关联数据）
 */
export interface LeaveApplicationWithDetails extends IcalinkLeaveApplication {
  attachment_count?: number;
  has_attachments?: boolean;
  approval_info?: {
    approver_id?: string;
    approver_name?: string;
    approval_result?: string;
    approval_time?: Date;
    approval_comment?: string;
  };
  attendance_info?: {
    current_status?: string;
    checkin_time?: Date;
    is_late?: boolean;
  };
}

/**
 * 请假申请统计信息
 */
export interface LeaveApplicationStats {
  total_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  cancelled_count: number;
  approval_rate: number;
}

/**
 * 请假申请仓储接口
 * 提供请假申请相关的数据访问方法
 */
export interface ILeaveApplicationRepository
  extends InstanceType<typeof BaseRepository<
    IcalinkDatabase,
    'icalink_leave_applications',
    IcalinkLeaveApplication,
    CreateLeaveApplicationData,
    UpdateLeaveApplicationData
  >> {
  /**
   * 根据签到记录ID查找请假申请
   * @param attendanceRecordId 签到记录ID
   * @returns 请假申请或null
   */
  findByAttendanceRecord(
    attendanceRecordId: number
  ): Promise<ServiceResult<IcalinkLeaveApplication | null>>;

  /**
   * 根据学生ID查找请假申请
   * @param studentId 学生ID
   * @param options 查询选项
   * @returns 请假申请列表
   */
  findByStudent(
    studentId: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>>;

  /**
   * 根据教师ID查找请假申请
   * @param teacherId 教师ID
   * @param options 查询选项
   * @returns 请假申请列表
   */
  findByTeacher(
    teacherId: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>>;

  /**
   * 根据条件查询请假申请
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 请假申请列表
   */
  findByConditions(
    conditions: LeaveApplicationQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>>;

  /**
   * 分页查询请假申请
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的请假申请列表
   */
  findByConditionsPaginated(
    conditions: LeaveApplicationQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<IcalinkLeaveApplication>>>;

  /**
   * 查询请假申请详细信息（包含关联数据）
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 请假申请详细信息列表
   */
  findWithDetails(
    conditions: LeaveApplicationQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<LeaveApplicationWithDetails[]>>;

  /**
   * 分页查询请假申请详细信息
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的请假申请详细信息列表
   */
  findWithDetailsPaginated(
    conditions: LeaveApplicationQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<LeaveApplicationWithDetails>>>;

  /**
   * 根据条件统计请假申请数量
   * @param conditions 查询条件
   * @returns 统计数量
   */
  countByConditions(
    conditions: LeaveApplicationQueryConditions
  ): Promise<ServiceResult<number>>;

  /**
   * 统计请假申请
   * @param conditions 查询条件
   * @returns 统计信息
   */
  getStatistics(
    conditions: LeaveApplicationQueryConditions
  ): Promise<ServiceResult<LeaveApplicationStats>>;

  /**
   * 根据学生ID统计请假申请
   * @param studentId 学生ID
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 统计信息
   */
  getStatisticsByStudent(
    studentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<LeaveApplicationStats>>;

  /**
   * 根据教师ID统计请假申请
   * @param teacherId 教师ID
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 统计信息
   */
  getStatisticsByTeacher(
    teacherId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<LeaveApplicationStats>>;

  /**
   * 根据课程ID统计请假申请
   * @param courseId 课程ID
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 统计信息
   */
  getStatisticsByCourse(
    courseId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<LeaveApplicationStats>>;

  /**
   * 检查学生是否已有待审批的请假申请
   * @param studentId 学生ID
   * @param courseId 课程ID（可选）
   * @returns 是否存在待审批申请
   */
  hasPendingApplication(
    studentId: string,
    courseId?: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取待审批的请假申请
   * @param teacherId 教师ID（可选）
   * @param options 查询选项
   * @returns 待审批的请假申请列表
   */
  getPendingApplications(
    teacherId?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<LeaveApplicationWithDetails[]>>;

  /**
   * 更新请假申请状态
   * @param id 申请ID
   * @param status 新状态
   * @param approvalComment 审批意见（可选）
   * @param updatedBy 更新人
   * @returns 更新后的请假申请
   */
  updateStatus(
    id: number,
    status: LeaveStatus,
    approvalComment?: string,
    updatedBy?: string
  ): Promise<ServiceResult<IcalinkLeaveApplication>>;

  /**
   * 批量更新请假申请状态
   * @param ids 申请ID数组
   * @param status 新状态
   * @param approvalComment 审批意见（可选）
   * @param updatedBy 更新人
   * @returns 更新的记录数量
   */
  updateStatusBatch(
    ids: number[],
    status: LeaveStatus,
    approvalComment?: string,
    updatedBy?: string
  ): Promise<ServiceResult<number>>;

  /**
   * 检查请假申请是否可以撤回
   * @param id 申请ID
   * @param studentId 学生ID
   * @returns 是否可以撤回
   */
  canWithdraw(id: number, studentId: string): Promise<ServiceResult<boolean>>;

  /**
   * 检查请假申请是否可以审批
   * @param id 申请ID
   * @param teacherId 教师ID
   * @returns 是否可以审批
   */
  canApprove(id: number, teacherId: string): Promise<ServiceResult<boolean>>;

  /**
   * 获取学生的最近请假申请
   * @param studentId 学生ID
   * @param limit 记录数量限制
   * @returns 最近的请假申请列表
   */
  getRecentByStudent(
    studentId: string,
    limit?: number
  ): Promise<ServiceResult<LeaveApplicationWithDetails[]>>;

  /**
   * 获取教师的最近请假申请
   * @param teacherId 教师ID
   * @param limit 记录数量限制
   * @returns 最近的请假申请列表
   */
  getRecentByTeacher(
    teacherId: string,
    limit?: number
  ): Promise<ServiceResult<LeaveApplicationWithDetails[]>>;

  /**
   * 根据时间范围查询请假申请
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param options 查询选项
   * @returns 请假申请列表
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: QueryOptions
  ): Promise<ServiceResult<LeaveApplicationWithDetails[]>>;

  /**
   * 获取即将到期的请假申请（需要审批的）
   * @param hours 小时数（默认24小时）
   * @returns 即将到期的请假申请列表
   */
  getExpiringApplications(
    hours?: number
  ): Promise<ServiceResult<LeaveApplicationWithDetails[]>>;
}
