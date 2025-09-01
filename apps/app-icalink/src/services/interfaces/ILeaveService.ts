// @wps/app-icalink 请假服务接口
// 基于 Stratix 框架的服务接口定义

import type {
  ApprovalRequest,
  ApprovalResponse,
  AttachmentsResponse,
  LeaveApplicationRequest,
  LeaveApplicationResponse,
  LeaveApplicationsResponse,
  LeaveQueryParams,
  UserInfo,
  WithdrawResponse
} from '../../types/api.js';
import type { ServiceResult } from '../../types/service.js';

/**
 * 请假服务接口
 * 提供请假相关的业务逻辑处理
 */
export interface ILeaveService {
  /**
   * 查询请假信息
   * @param userInfo 用户信息
   * @param params 查询参数
   * @returns 请假申请列表响应
   */
  queryLeaveApplications(
    userInfo: UserInfo,
    params: LeaveQueryParams
  ): Promise<ServiceResult<LeaveApplicationsResponse>>;

  /**
   * 学生请假申请
   * @param studentInfo 学生信息
   * @param request 请假申请请求
   * @returns 请假申请响应
   */
  submitLeaveApplication(
    studentInfo: UserInfo,
    request: LeaveApplicationRequest
  ): Promise<ServiceResult<LeaveApplicationResponse>>;

  /**
   * 撤回请假申请
   * @param applicationId 申请ID
   * @param studentInfo 学生信息
   * @returns 撤回响应
   */
  withdrawLeaveApplication(
    applicationId: number,
    studentInfo: UserInfo
  ): Promise<ServiceResult<WithdrawResponse>>;

  /**
   * 审批请假申请
   * @param applicationId 申请ID
   * @param teacherInfo 教师信息
   * @param request 审批请求
   * @returns 审批响应
   */
  approveLeaveApplication(
    applicationId: number,
    teacherInfo: UserInfo,
    request: ApprovalRequest
  ): Promise<ServiceResult<ApprovalResponse>>;

  /**
   * 查看请假申请附件
   * @param applicationId 申请ID
   * @param userInfo 用户信息
   * @returns 附件列表响应
   */
  getLeaveAttachments(
    applicationId: number,
    userInfo: UserInfo
  ): Promise<ServiceResult<AttachmentsResponse>>;

  /**
   * 下载请假申请附件
   * @param applicationId 申请ID
   * @param attachmentId 附件ID
   * @param userInfo 用户信息
   * @param thumbnail 是否为缩略图
   * @returns 附件内容
   */
  downloadLeaveAttachment(
    applicationId: number,
    attachmentId: number,
    userInfo: UserInfo,
    thumbnail?: boolean
  ): Promise<
    ServiceResult<{
      fileName: string;
      fileContent: Buffer;
      mimeType: string;
      fileSize: number;
    }>
  >;

  /**
   * 通过附件ID直接下载附件
   * @param attachmentId 附件ID
   * @param userInfo 用户信息
   * @param thumbnail 是否为缩略图
   * @returns 附件内容
   */
  downloadAttachmentById(
    attachmentId: number,
    userInfo: UserInfo,
    thumbnail?: boolean
  ): Promise<
    ServiceResult<{
      fileName: string;
      fileContent: Buffer;
      mimeType: string;
      fileSize: number;
    }>
  >;

  /**
   * 获取教师的请假申请列表
   * @param teacherId 教师ID
   * @param options 查询选项
   * @returns 请假申请列表
   */
  getLeaveApplicationsByTeacher(
    teacherId: string,
    options?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ServiceResult<any>>;

  /**
   * 获取请假统计信息
   * @param options 统计选项
   * @returns 统计信息
   */
  getLeaveStatistics(options?: {
    studentId?: string;
    teacherId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<
    ServiceResult<{
      totalApplications: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      cancelledCount: number;
      approvalRate: number;
    }>
  >;

  /**
   * 验证请假申请权限
   * @param attendanceRecordId 签到记录ID
   * @param studentId 学生ID
   * @returns 是否有权限申请请假
   */
  validateLeaveApplicationPermission(
    attendanceRecordId: number,
    studentId: string
  ): Promise<
    ServiceResult<{
      canApply: boolean;
      reason?: string;
      existingApplication?: {
        id: number;
        status: string;
        applicationTime: Date;
      };
    }>
  >;

  /**
   * 验证请假申请撤回权限
   * @param applicationId 申请ID
   * @param studentId 学生ID
   * @returns 是否可以撤回
   */
  validateWithdrawPermission(
    applicationId: number,
    studentId: string
  ): Promise<
    ServiceResult<{
      canWithdraw: boolean;
      reason?: string;
      currentStatus?: string;
    }>
  >;

  /**
   * 验证请假审批权限
   * @param applicationId 申请ID
   * @param teacherId 教师ID
   * @returns 是否可以审批
   */
  validateApprovalPermission(
    applicationId: number,
    teacherId: string
  ): Promise<
    ServiceResult<{
      canApprove: boolean;
      reason?: string;
      currentStatus?: string;
      isAssignedTeacher?: boolean;
    }>
  >;

  /**
   * 处理请假申请附件
   * @param applicationId 申请ID
   * @param images 图片附件数组
   * @returns 处理结果
   */
  processLeaveAttachments(
    applicationId: number,
    images: Array<{
      name: string;
      type: string;
      size: number;
      content: string; // Base64编码
    }>
  ): Promise<
    ServiceResult<{
      uploadedCount: number;
      totalSize: number;
      attachmentIds: number[];
      errors?: Array<{
        fileName: string;
        error: string;
      }>;
    }>
  >;

  /**
   * 生成附件缩略图
   * @param attachmentId 附件ID
   * @returns 生成结果
   */
  generateThumbnail(attachmentId: number): Promise<
    ServiceResult<{
      success: boolean;
      thumbnailSize?: number;
    }>
  >;

  /**
   * 获取学生请假统计
   * @param studentId 学生ID
   * @param semester 学期（可选）
   * @returns 请假统计
   */
  getStudentLeaveStatistics(
    studentId: string,
    semester?: string
  ): Promise<
    ServiceResult<{
      totalApplications: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      cancelledCount: number;
      approvalRate: number;
      leaveTypeDistribution: Record<string, number>;
      monthlyTrends: Array<{
        month: string;
        applicationCount: number;
        approvalRate: number;
      }>;
    }>
  >;

  /**
   * 获取教师审批统计
   * @param teacherId 教师ID
   * @param semester 学期（可选）
   * @returns 审批统计
   */
  getTeacherApprovalStatistics(
    teacherId: string,
    semester?: string
  ): Promise<
    ServiceResult<{
      totalApplications: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      approvalRate: number;
      averageApprovalTimeHours: number;
      courseStats: Array<{
        courseId: string;
        courseName: string;
        applicationCount: number;
        approvalRate: number;
      }>;
    }>
  >;

  /**
   * 获取待审批的请假申请
   * @param teacherId 教师ID
   * @param limit 数量限制
   * @returns 待审批申请列表
   */
  getPendingApprovals(
    teacherId: string,
    limit?: number
  ): Promise<
    ServiceResult<
      Array<{
        applicationId: number;
        studentId: string;
        studentName: string;
        courseName: string;
        leaveType: string;
        leaveReason: string;
        applicationTime: Date;
        classDate: Date;
        hasAttachments: boolean;
        urgencyLevel: 'low' | 'medium' | 'high';
      }>
    >
  >;

  /**
   * 批量审批请假申请
   * @param applicationIds 申请ID数组
   * @param teacherId 教师ID
   * @param result 审批结果
   * @param comment 审批意见
   * @returns 批量审批结果
   */
  batchApproveApplications(
    applicationIds: number[],
    teacherId: string,
    result: 'approved' | 'rejected',
    comment?: string
  ): Promise<
    ServiceResult<{
      successCount: number;
      failedCount: number;
      results: Array<{
        applicationId: number;
        success: boolean;
        error?: string;
      }>;
    }>
  >;

  /**
   * 发送请假通知
   * @param applicationId 申请ID
   * @param notificationType 通知类型
   * @returns 发送结果
   */
  sendLeaveNotification(
    applicationId: number,
    notificationType: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  ): Promise<
    ServiceResult<{
      sent: boolean;
      recipients: string[];
      method: 'email' | 'sms' | 'push';
    }>
  >;

  /**
   * 导出请假数据
   * @param teacherId 教师ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param format 导出格式
   * @returns 导出结果
   */
  exportLeaveData(
    teacherId: string,
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'excel' | 'pdf'
  ): Promise<
    ServiceResult<{
      fileName: string;
      fileContent: Buffer;
      mimeType: string;
    }>
  >;

  /**
   * 获取审批记录
   * @param approvalId 审批记录ID
   * @returns 审批记录
   */
  getApprovalRecord(approvalId: number): Promise<ServiceResult<any>>;
}
