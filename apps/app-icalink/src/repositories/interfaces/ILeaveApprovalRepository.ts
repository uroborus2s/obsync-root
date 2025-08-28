// @wps/app-icalink 请假审批仓储接口
// 基于 Stratix 框架的仓储接口定义

import { BaseRepository } from '@stratix/database';
import type { 
  IcalinkLeaveApproval, 
  IcalinkDatabase, 
  ApprovalResult 
} from '../../types/database.js';
import type { 
  ServiceResult, 
  PaginatedResult, 
  QueryOptions 
} from '../../types/service.js';

/**
 * 请假审批查询条件
 */
export interface LeaveApprovalQueryConditions {
  leave_application_id?: number;
  approver_id?: string;
  approval_result?: ApprovalResult;
  approval_start_date?: Date;
  approval_end_date?: Date;
  is_final_approver?: boolean;
}

/**
 * 请假审批创建数据
 */
export interface CreateLeaveApprovalData {
  leave_application_id: number;
  approver_id: string;
  approver_name: string;
  approver_department?: string;
  approval_result?: ApprovalResult;
  approval_comment?: string;
  approval_time?: Date;
  approval_order?: number;
  is_final_approver?: boolean;
  created_by?: string;
  metadata?: any;
}

/**
 * 请假审批更新数据
 */
export interface UpdateLeaveApprovalData {
  approval_result?: ApprovalResult;
  approval_comment?: string;
  approval_time?: Date;
  updated_by?: string;
  metadata?: any;
}

/**
 * 审批统计信息
 */
export interface ApprovalStats {
  total_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  cancelled_count: number;
  approval_rate: number;
  average_approval_time_hours: number;
}

/**
 * 审批详细信息（包含关联数据）
 */
export interface LeaveApprovalWithDetails extends IcalinkLeaveApproval {
  application_info?: {
    student_id?: string;
    student_name?: string;
    course_name?: string;
    leave_type?: string;
    leave_reason?: string;
    application_time?: Date;
    class_date?: Date;
  };
  approver_info?: {
    department?: string;
    title?: string;
    email?: string;
  };
}

/**
 * 请假审批仓储接口
 * 继承基础仓储接口，提供请假审批相关的数据访问方法
 */
export interface ILeaveApprovalRepository extends InstanceType<typeof BaseRepository<
  IcalinkDatabase,
  'icalink_leave_approvals',
  IcalinkLeaveApproval,
  CreateLeaveApprovalData,
  UpdateLeaveApprovalData
>> {
  /**
   * 根据请假申请ID查找审批记录
   * @param leaveApplicationId 请假申请ID
   * @param options 查询选项
   * @returns 审批记录列表
   */
  findByLeaveApplication(
    leaveApplicationId: number,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApproval[]>>;

  /**
   * 根据审批人ID查找审批记录
   * @param approverId 审批人ID
   * @param options 查询选项
   * @returns 审批记录列表
   */
  findByApprover(
    approverId: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApproval[]>>;

  /**
   * 根据条件查询审批记录
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 审批记录列表
   */
  findByConditions(
    conditions: LeaveApprovalQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApproval[]>>;

  /**
   * 分页查询审批记录
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的审批记录列表
   */
  findByConditionsPaginated(
    conditions: LeaveApprovalQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<IcalinkLeaveApproval>>>;

  /**
   * 查询审批记录详细信息（包含关联数据）
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 审批记录详细信息列表
   */
  findWithDetails(
    conditions: LeaveApprovalQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<LeaveApprovalWithDetails[]>>;

  /**
   * 分页查询审批记录详细信息
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的审批记录详细信息列表
   */
  findWithDetailsPaginated(
    conditions: LeaveApprovalQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<LeaveApprovalWithDetails>>>;

  /**
   * 获取最终审批记录
   * @param leaveApplicationId 请假申请ID
   * @returns 最终审批记录或null
   */
  getFinalApproval(
    leaveApplicationId: number
  ): Promise<ServiceResult<IcalinkLeaveApproval | null>>;

  /**
   * 获取待审批的记录
   * @param approverId 审批人ID（可选）
   * @param options 查询选项
   * @returns 待审批的记录列表
   */
  getPendingApprovals(
    approverId?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<LeaveApprovalWithDetails[]>>;

  /**
   * 统计审批记录
   * @param conditions 查询条件
   * @returns 统计信息
   */
  getStatistics(
    conditions?: LeaveApprovalQueryConditions
  ): Promise<ServiceResult<ApprovalStats>>;

  /**
   * 根据审批人ID统计审批记录
   * @param approverId 审批人ID
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 统计信息
   */
  getStatisticsByApprover(
    approverId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<ApprovalStats>>;

  /**
   * 检查审批人是否有权限审批指定申请
   * @param leaveApplicationId 请假申请ID
   * @param approverId 审批人ID
   * @returns 是否有权限
   */
  canApprove(
    leaveApplicationId: number,
    approverId: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 检查申请是否已被审批
   * @param leaveApplicationId 请假申请ID
   * @returns 是否已审批
   */
  isApproved(
    leaveApplicationId: number
  ): Promise<ServiceResult<boolean>>;

  /**
   * 检查申请是否被拒绝
   * @param leaveApplicationId 请假申请ID
   * @returns 是否被拒绝
   */
  isRejected(
    leaveApplicationId: number
  ): Promise<ServiceResult<boolean>>;

  /**
   * 更新审批结果
   * @param id 审批记录ID
   * @param result 审批结果
   * @param comment 审批意见（可选）
   * @param updatedBy 更新人
   * @returns 更新后的审批记录
   */
  updateApprovalResult(
    id: number,
    result: ApprovalResult,
    comment?: string,
    updatedBy?: string
  ): Promise<ServiceResult<IcalinkLeaveApproval>>;

  /**
   * 批量更新审批结果
   * @param ids 审批记录ID数组
   * @param result 审批结果
   * @param comment 审批意见（可选）
   * @param updatedBy 更新人
   * @returns 更新的记录数量
   */
  updateApprovalResultBatch(
    ids: number[],
    result: ApprovalResult,
    comment?: string,
    updatedBy?: string
  ): Promise<ServiceResult<number>>;

  /**
   * 获取审批历史
   * @param leaveApplicationId 请假申请ID
   * @returns 审批历史列表
   */
  getApprovalHistory(
    leaveApplicationId: number
  ): Promise<ServiceResult<LeaveApprovalWithDetails[]>>;

  /**
   * 获取审批人的最近审批记录
   * @param approverId 审批人ID
   * @param limit 记录数量限制
   * @returns 最近的审批记录列表
   */
  getRecentByApprover(
    approverId: string,
    limit?: number
  ): Promise<ServiceResult<LeaveApprovalWithDetails[]>>;

  /**
   * 根据时间范围查询审批记录
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param options 查询选项
   * @returns 审批记录列表
   */
  findByApprovalDateRange(
    startDate: Date,
    endDate: Date,
    options?: QueryOptions
  ): Promise<ServiceResult<LeaveApprovalWithDetails[]>>;

  /**
   * 获取超时未审批的记录
   * @param hours 超时小时数（默认24小时）
   * @returns 超时未审批的记录列表
   */
  getOverdueApprovals(
    hours?: number
  ): Promise<ServiceResult<LeaveApprovalWithDetails[]>>;

  /**
   * 计算平均审批时间
   * @param approverId 审批人ID（可选）
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 平均审批时间（小时）
   */
  getAverageApprovalTime(
    approverId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<number>>;

  /**
   * 获取审批效率统计
   * @param approverId 审批人ID（可选）
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 审批效率统计
   */
  getApprovalEfficiencyStats(
    approverId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<{
    total_approvals: number;
    avg_approval_time_hours: number;
    fastest_approval_hours: number;
    slowest_approval_hours: number;
    approval_rate: number;
    on_time_rate: number; // 24小时内审批的比例
  }>>;
}
