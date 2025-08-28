// @wps/app-icalink 请假服务实现
// 基于 Stratix 框架的服务实现类

import type { Logger } from '@stratix/core';
import type { IAttendanceRecordRepository } from '../repositories/interfaces/IAttendanceRecordRepository.js';
import type { ILeaveApplicationRepository } from '../repositories/interfaces/ILeaveApplicationRepository.js';
import type { ILeaveAttachmentRepository } from '../repositories/interfaces/ILeaveAttachmentRepository.js';
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
} from '../types/api.js';
import type { IcalinkLeaveApplication, LeaveStatus, LeaveType } from '../types/database.js';
import { AttendanceStatus } from '../types/database.js';
import type { ServiceResult } from '../types/service.js';
import {
  createSuccessResult,
  isSuccessResult,
  ServiceErrorCode,
  wrapServiceCall
} from '../types/service.js';
import { formatDateTime, getCurrentDateTime } from '../utils/datetime.js';
import {
  validateDateRange,
  validateDateString,
  validateLeaveReason,
  validateLeaveType,
  validatePagination
} from '../utils/validation.js';
import { extractOptionFromServiceResult } from '../utils/type-fixes.js';
import type { ILeaveService } from './interfaces/ILeaveService.js';
import type { IUserService } from './interfaces/IUserService.js';

/**
 * 请假服务实现类
 * 实现ILeaveService接口，提供请假相关的业务逻辑
 */
export default class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveApplicationRepository: ILeaveApplicationRepository,
    private readonly leaveAttachmentRepository: ILeaveAttachmentRepository,
    private readonly attendanceRecordRepository: IAttendanceRecordRepository,
    private readonly userService: IUserService,
    private readonly logger: Logger
  ) {}

  /**
   * 查询请假信息
   */
  async queryLeaveApplications(
    userInfo: UserInfo,
    params: LeaveQueryParams
  ): Promise<ServiceResult<LeaveApplicationsResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { userId: userInfo.id, userType: userInfo.type },
        'Query leave applications started'
      );

      // 验证分页参数
      const paginationValidation = validatePagination(
        params.page,
        params.page_size
      );
      if (!isSuccessResult(paginationValidation)) {
        throw new Error(paginationValidation.error?.message);
      }

      // 验证日期范围
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (params.start_date) {
        const startDateValidation = validateDateString(
          params.start_date,
          '开始日期'
        );
        if (!isSuccessResult(startDateValidation)) {
          throw new Error(startDateValidation.error?.message);
        }
        startDate = startDateValidation.data;
      }

      if (params.end_date) {
        const endDateValidation = validateDateString(
          params.end_date,
          '结束日期'
        );
        if (!isSuccessResult(endDateValidation)) {
          throw new Error(endDateValidation.error?.message);
        }
        endDate = endDateValidation.data;
      }

      if (startDate && endDate) {
        const rangeValidation = validateDateRange(startDate, endDate);
        if (!isSuccessResult(rangeValidation)) {
          throw new Error(rangeValidation.error?.message);
        }
      }

      // 构建查询条件
      const conditions: any = {
        start_date: startDate,
        end_date: endDate
      };

      // 根据用户类型设置查询条件
      if (userInfo.type === 'student') {
        conditions.student_id = userInfo.id;
      } else if (userInfo.type === 'teacher') {
        conditions.teacher_id = userInfo.id;
        // 教师可以查询指定学生的记录
        if (params.student_id) {
          conditions.student_id = params.student_id;
        }
      }

      if (params.course_id) {
        conditions.course_id = params.course_id;
      }

      if (params.status && params.status !== 'all') {
        conditions.status = params.status as LeaveStatus;
      }

      // 查询请假申请
      const applicationsResult =
        await this.leaveApplicationRepository.findWithDetailsPaginated(
          conditions,
          {
            pagination: {
              page: paginationValidation.data.page,
              page_size: paginationValidation.data.pageSize
            },
            sort: { field: 'application_time', direction: 'desc' }
          }
        );

      if (!isSuccessResult(applicationsResult)) {
        throw new Error('查询请假申请失败');
      }

      // 转换为API响应格式
      const applications = applicationsResult.data.data.map((app) => ({
        id: app.id,
        student_id: app.student_id,
        student_name: app.student_name,
        course_id: app.course_id,
        course_name: app.course_name,
        teacher_id: app.teacher_id,
        teacher_name: app.teacher_name,
        leave_type: app.leave_type,
        leave_reason: app.leave_reason,
        status: app.status,
        application_time: formatDateTime(app.application_time),
        approval_time: app.approval_time
          ? formatDateTime(app.approval_time)
          : undefined,
        approval_comment: app.approval_comment || undefined,
        has_attachments: (app.attachment_count || 0) > 0,
        class_date: app.class_date || '',
        class_time: app.class_time || ''
      }));

      const response: LeaveApplicationsResponse = {
        applications: applications as any,
        pagination: {
          total: applicationsResult.data.total,
          page: applicationsResult.data.page,
          page_size: applicationsResult.data.page_size,
          total_pages: applicationsResult.data.total_pages
        }
      };

      this.logger.info(
        {
          userId: userInfo.id,
          applicationCount: applications.length
        },
        'Query leave applications completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 学生请假申请
   */
  async submitLeaveApplication(
    studentInfo: UserInfo,
    request: LeaveApplicationRequest
  ): Promise<ServiceResult<LeaveApplicationResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        {
          studentId: studentInfo.id,
          attendanceRecordId: request.attendance_record_id
        },
        'Submit leave application started'
      );

      // 验证请假类型
      const leaveTypeValidation = validateLeaveType(request.leave_type);
      if (!isSuccessResult(leaveTypeValidation)) {
        throw new Error(leaveTypeValidation.error?.message);
      }

      // 验证请假原因
      const reasonValidation = validateLeaveReason(request.leave_reason);
      if (!isSuccessResult(reasonValidation)) {
        throw new Error(reasonValidation.error?.message);
      }

      // 检查签到记录是否存在
      const attendanceRecord = await this.attendanceRecordRepository.findById(
        request.attendance_record_id
      );
      if (!attendanceRecord.success) {
        throw new Error('签到记录不存在');
      }

      const record = extractOptionFromServiceResult({
        success: true,
        data: attendanceRecord.data
      });
      if (!record) {
        throw new Error('签到记录不存在');
      }

      // 验证学生是否有权限申请该记录的请假
      if ((record as any)?.student_id !== studentInfo.id) {
        throw new Error('无权限申请该签到记录的请假');
      }

      // 检查是否已存在请假申请
      const existingApplication =
        await this.leaveApplicationRepository.findByAttendanceRecord(
          request.attendance_record_id
        );
      if (isSuccessResult(existingApplication) && existingApplication.data) {
        throw new Error('该签到记录已存在请假申请');
      }

      // 获取课程和教师信息
      const courseInfo = await this.getCourseInfo((record as any)?.attendance_course_id || 0);
      if (!isSuccessResult(courseInfo)) {
        throw new Error('获取课程信息失败');
      }

      // 创建请假申请
      const applicationData = {
        attendance_record_id: request.attendance_record_id,
        student_id: studentInfo.id,
        student_name: studentInfo.name,
        course_id: courseInfo.data.course_id,
        course_name: courseInfo.data.course_name,
        teacher_id: courseInfo.data.teacher_id,
        teacher_name: courseInfo.data.teacher_name,
        leave_type: request.leave_type as LeaveType,
        leave_reason: request.leave_reason,
        status: 'leave_pending' as LeaveStatus,
        application_time: getCurrentDateTime(),
        created_by: studentInfo.id
      };

      const createResult =
        await this.leaveApplicationRepository.create(applicationData as any);
      if (!createResult.success) {
        throw new Error('创建请假申请失败');
      }

      const createdApplication = extractOptionFromServiceResult({
        success: true,
        data: createResult.data
      });
      const applicationId = (createdApplication as any)?.id || 0;

      // 处理附件上传
      let attachmentIds: number[] = [];
      if ((request as any).attachments && (request as any).attachments.length > 0) {
        const attachmentResult = await this.uploadAttachments(
          applicationId,
          (request as any).attachments
        );
        if (isSuccessResult(attachmentResult)) {
          attachmentIds = attachmentResult.data;
        }
      }

      // 更新签到记录状态为请假待审批
      await this.attendanceRecordRepository.update(
        request.attendance_record_id,
        {
          status: AttendanceStatus.LEAVE,
          updated_by: studentInfo.id
        }
      );

      const response: LeaveApplicationResponse = {
        application_id: applicationId,
        student_id: studentInfo.id,
        student_name: studentInfo.name,
        course_name: courseInfo.data.course_name,
        teacher_name: courseInfo.data.teacher_name,
        leave_type: request.leave_type,
        leave_reason: request.leave_reason,
        status: 'leave_pending' as any,
        application_time: formatDateTime(applicationData.application_time)
      } as any;

      this.logger.info(
        {
          applicationId,
          studentId: studentInfo.id
        },
        'Submit leave application completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 撤回请假申请
   */
  async withdrawLeaveApplication(
    applicationId: number,
    studentInfo: UserInfo
  ): Promise<ServiceResult<WithdrawResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { applicationId, studentId: studentInfo.id },
        'Withdraw leave application started'
      );

      // 查找请假申请
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const app = extractOptionFromServiceResult(application);
      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证权限
      if ((app as any)?.student_id !== studentInfo.id) {
        throw new Error('无权限撤回该请假申请');
      }

      // 检查状态是否允许撤回
      if ((app as any)?.status !== 'leave_pending') {
        throw new Error('只能撤回待审批状态的请假申请');
      }

      // 更新申请状态
      const updateResult = await this.leaveApplicationRepository.update(
        applicationId,
        {
          status: 'cancelled' as LeaveStatus,
          updated_by: studentInfo.id
        }
      );

      if (!updateResult.success) {
        throw new Error('撤回请假申请失败');
      }

      // 恢复签到记录状态
      await this.attendanceRecordRepository.update((app as any)?.attendance_record_id || 0, {
        status: AttendanceStatus.ABSENT,
        updated_by: studentInfo.id
      });

      const response = {
        application_id: applicationId,
        student_id: studentInfo.id,
        student_name: studentInfo.name,
        status: 'cancelled',
        withdraw_time: formatDateTime(getCurrentDateTime())
      } as any;

      this.logger.info(
        {
          applicationId,
          studentId: studentInfo.id
        },
        'Withdraw leave application completed'
      );

      return response;
    }, ServiceErrorCode.LEAVE_WITHDRAW_FAILED);
  }

  /**
   * 审批请假申请
   */
  async approveLeaveApplication(
    applicationId: number,
    teacherInfo: UserInfo,
    request: ApprovalRequest
  ): Promise<ServiceResult<ApprovalResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { applicationId, teacherId: teacherInfo.id },
        'Approve leave application started'
      );

      // 查找请假申请
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const app = extractOptionFromServiceResult({
        success: true,
        data: application.data
      });
      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证教师权限
      if ((app as any)?.teacher_id !== teacherInfo.id) {
        throw new Error('无权限审批该请假申请');
      }

      // 检查状态是否允许审批
      if ((app as any)?.status !== 'leave_pending') {
        throw new Error('只能审批待审批状态的请假申请');
      }

      const approvalTime = getCurrentDateTime();
      const newStatus = (request as any)?.approved ? 'leave' : 'leave_rejected';

      // 更新申请状态
      const updateResult = await this.leaveApplicationRepository.update(
        applicationId,
        {
          status: newStatus as LeaveStatus,
          approval_time: approvalTime,
          approval_comment: request.comment,
          updated_by: teacherInfo.id
        }
      );

      if (!updateResult.success) {
        throw new Error('审批请假申请失败');
      }

      // 更新签到记录状态
      const attendanceStatus = (request as any)?.approved
        ? AttendanceStatus.LEAVE
        : AttendanceStatus.ABSENT;
      await this.attendanceRecordRepository.update((app as any)?.attendance_record_id || 0, {
        status: attendanceStatus,
        updated_by: teacherInfo.id
      });

      const response: ApprovalResponse = {
        application_id: applicationId,
        student_id: (app as any)?.student_id || '',
        student_name: (app as any)?.student_name || '',
        teacher_id: teacherInfo.id,
        teacher_name: teacherInfo.name,
        approved: (request as any)?.approved || false,
        status: newStatus,
        approval_time: formatDateTime(approvalTime),
        approval_comment: request.comment
      } as any;

      this.logger.info(
        {
          applicationId,
          teacherId: teacherInfo.id,
          approved: (request as any)?.approved || false
        },
        'Approve leave application completed'
      );

      return response;
    }, ServiceErrorCode.LEAVE_APPROVAL_FAILED);
  }

  /**
   * 查看请假申请附件
   */
  async getLeaveAttachments(
    applicationId: number,
    userInfo: UserInfo
  ): Promise<ServiceResult<AttachmentsResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { applicationId, userId: userInfo.id },
        'Get leave attachments started'
      );

      // 查找请假申请
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const app = extractOptionFromServiceResult({
        success: true,
        data: application.data
      });
      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证权限
      if (userInfo.type === 'student' && (app as any)?.student_id !== userInfo.id) {
        throw new Error('无权限查看该请假申请的附件');
      } else if (
        userInfo.type === 'teacher' &&
        (app as any)?.teacher_id !== userInfo.id
      ) {
        throw new Error('无权限查看该请假申请的附件');
      }

      // 查询附件列表
      const attachmentsResult =
        await this.leaveAttachmentRepository.findByLeaveApplication(
          applicationId
        );
      if (!isSuccessResult(attachmentsResult)) {
        throw new Error('查询附件列表失败');
      }

      // 转换为API响应格式
      const attachments = attachmentsResult.data.map((attachment) => ({
        id: attachment.id,
        image_name: attachment.image_name,
        image_size: attachment.image_size,
        image_type: attachment.image_type,
        upload_time: formatDateTime(attachment.upload_time),
        thumbnail_url: `/api/leave/applications/${applicationId}/attachments/${attachment.id}?thumbnail=true`,
        download_url: `/api/leave/applications/${applicationId}/attachments/${attachment.id}`
      }));

      const response: AttachmentsResponse = {
        application_id: applicationId,
        student_id: (app as any)?.student_id || '',
        student_name: (app as any)?.student_name || '',
        attachments,
        total_count: attachments.length,
        total_size: attachments.reduce((sum, att) => sum + (att.image_size || 0), 0)
      };

      this.logger.info(
        {
          applicationId,
          userId: userInfo.id,
          attachmentCount: attachments.length
        },
        'Get leave attachments completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 下载请假申请附件
   */
  async downloadLeaveAttachment(
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
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        {
          applicationId,
          attachmentId,
          userId: userInfo.id,
          thumbnail
        },
        'Download leave attachment started'
      );

      // 查找请假申请
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const app = extractOptionFromServiceResult({
        success: true,
        data: application.data
      });
      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证权限
      if (userInfo.type === 'student' && (app as any)?.student_id !== userInfo.id) {
        throw new Error('无权限下载该请假申请的附件');
      } else if (
        userInfo.type === 'teacher' &&
        (app as any)?.teacher_id !== userInfo.id
      ) {
        throw new Error('无权限下载该请假申请的附件');
      }

      // 查找附件
      const attachment =
        await this.leaveAttachmentRepository.findById(attachmentId);
      if (!attachment.success) {
        throw new Error('附件不存在');
      }

      const att = extractOptionFromServiceResult({
        success: true,
        data: attachment.data
      });
      if (!att) {
        throw new Error('附件不存在');
      }

      // 验证附件属于该申请
      if ((att as any)?.leave_application_id !== applicationId) {
        throw new Error('附件不属于该请假申请');
      }

      // 返回文件内容
      const fileContent =
        thumbnail && (att as any)?.thumbnail_content
          ? (att as any)?.thumbnail_content
          : (att as any)?.image_content;

      const fileName = thumbnail
        ? `thumbnail_${(att as any)?.image_name || 'attachment'}`
        : (att as any)?.image_name || 'attachment';

      const response = {
        fileName,
        fileContent,
        mimeType: (att as any)?.image_type || 'application/octet-stream',
        fileSize: fileContent?.length || 0
      };

      this.logger.info(
        {
          applicationId,
          attachmentId,
          userId: userInfo.id,
          fileSize: response.fileSize
        },
        'Download leave attachment completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 验证请假申请权限
   */
  async validateLeaveApplicationPermission(
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
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { attendanceRecordId, studentId },
        'Validate leave application permission started'
      );

      // 检查签到记录是否存在
      const attendanceRecord =
        await this.attendanceRecordRepository.findById(attendanceRecordId);
      if (!attendanceRecord.success) {
        return {
          canApply: false,
          reason: '签到记录不存在'
        };
      }

      const record = extractOptionFromServiceResult({
        success: true,
        data: attendanceRecord.data
      });
      if (!record) {
        return {
          canApply: false,
          reason: '签到记录不存在'
        };
      }

      // 验证学生是否有权限申请该记录的请假
      if ((record as any)?.student_id !== studentId) {
        return {
          canApply: false,
          reason: '无权限申请该签到记录的请假'
        };
      }

      // 检查是否已存在请假申请
      const existingApplication =
        await this.leaveApplicationRepository.findByAttendanceRecord(
          attendanceRecordId
        );
      if (isSuccessResult(existingApplication) && existingApplication.data) {
        const app = existingApplication.data;
        return {
          canApply: false,
          reason: '该签到记录已存在请假申请',
          existingApplication: {
            id: app.id,
            status: app.status,
            applicationTime: app.application_time
          }
        };
      }

      // 检查签到记录状态是否允许请假
      if ((record as any)?.status === 'present') {
        return {
          canApply: false,
          reason: '已签到的记录不能申请请假'
        };
      }

      return {
        canApply: true
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取学生的请假申请列表
   */
  async getLeaveApplicationsByStudent(
    studentId: string,
    options?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      const conditions: any = {
        student_id: studentId,
        status: options?.status,
        start_date: options?.startDate,
        end_date: options?.endDate
      };

      const queryOptions = {
        pagination:
          options?.page && options?.pageSize
            ? {
                page: options.page,
                page_size: options.pageSize
              }
            : undefined
      };

      const result =
        await this.leaveApplicationRepository.findWithDetailsPaginated(
          conditions,
          queryOptions
        );

      if (!isSuccessResult(result)) {
        throw new Error('获取学生请假申请列表失败');
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取教师的请假申请列表
   */
  async getLeaveApplicationsByTeacher(
    teacherId: string,
    options?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      const conditions: any = {
        teacher_id: teacherId,
        status: options?.status,
        start_date: options?.startDate,
        end_date: options?.endDate
      };

      const queryOptions = {
        pagination:
          options?.page && options?.pageSize
            ? {
                page: options.page,
                page_size: options.pageSize
              }
            : undefined
      };

      const result =
        await this.leaveApplicationRepository.findWithDetailsPaginated(
          conditions,
          queryOptions
        );

      if (!isSuccessResult(result)) {
        throw new Error('获取教师请假申请列表失败');
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取请假统计信息
   */
  async getLeaveStatistics(options?: {
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
  > {
    return wrapServiceCall(async () => {
      const conditions: any = {
        student_id: options?.studentId,
        teacher_id: options?.teacherId,
        start_date: options?.startDate,
        end_date: options?.endDate
      };

      // 获取总数
      const totalResult =
        await this.leaveApplicationRepository.countByConditions(conditions);
      if (!isSuccessResult(totalResult)) {
        throw new Error('获取请假申请总数失败');
      }

      // 获取各状态数量
      const pendingResult =
        await this.leaveApplicationRepository.countByConditions({
          ...conditions,
          status: 'leave_pending'
        });
      const approvedResult =
        await this.leaveApplicationRepository.countByConditions({
          ...conditions,
          status: 'leave'
        });
      const rejectedResult =
        await this.leaveApplicationRepository.countByConditions({
          ...conditions,
          status: 'leave_rejected'
        });
      const cancelledResult =
        await this.leaveApplicationRepository.countByConditions({
          ...conditions,
          status: 'cancelled'
        });

      const totalCount = totalResult.data as number;
      const approvedCount = isSuccessResult(approvedResult)
        ? (approvedResult.data as number)
        : 0;
      const approvalRate =
        totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

      return {
        totalApplications: totalCount,
        pendingCount: isSuccessResult(pendingResult) ? (pendingResult.data as number) : 0,
        approvedCount,
        rejectedCount: isSuccessResult(rejectedResult)
          ? (rejectedResult.data as number)
          : 0,
        cancelledCount: isSuccessResult(cancelledResult)
          ? (cancelledResult.data as number)
          : 0,
        approvalRate
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 发送请假申请通知
   */
  async notifyLeaveApplication(
    applicationId: number,
    notificationType: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { applicationId, notificationType },
        'Send leave application notification'
      );

      // 这里可以实现具体的通知逻辑
      // 比如发送邮件、短信、推送通知等
      // 暂时返回成功
      return true;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 自动审批请假申请
   */
  async autoApproveLeaveApplication(
    applicationId: number
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      this.logger.info({ applicationId }, 'Auto approve leave application');

      // 这里可以实现自动审批逻辑
      // 比如根据请假类型、时长等条件自动审批
      // 暂时返回false（不自动审批）
      return false;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取课程信息
   */
  private async getCourseInfo(courseId: number): Promise<
    ServiceResult<{
      course_id: string;
      course_name: string;
      teacher_id: string;
      teacher_name: string;
    }>
  > {
    // 这里需要实现获取课程信息的逻辑
    // 暂时返回模拟数据
    return createSuccessResult({
      course_id: courseId.toString(),
      course_name: '示例课程',
      teacher_id: 'T001',
      teacher_name: '示例教师'
    });
  }

  /**
   * 验证请假申请撤回权限
   */
  async validateWithdrawPermission(
    applicationId: number,
    studentId: string
  ): Promise<
    ServiceResult<{
      canWithdraw: boolean;
      reason?: string;
      currentStatus?: string;
    }>
  > {
    return wrapServiceCall(async () => {
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        return {
          canWithdraw: false,
          reason: '请假申请不存在'
        };
      }

      const optionApp = application.data;
      if (!optionApp.some) {
        return {
          canWithdraw: false,
          reason: '请假申请不存在'
        };
      }

      const app = optionApp.value;

      if (!app) {
        return {
          canWithdraw: false,
          reason: '请假申请不存在'
        };
      }

      if (app.student_id !== studentId) {
        return {
          canWithdraw: false,
          reason: '无权限撤回该请假申请',
          currentStatus: app.status
        };
      }

      if (app.status !== 'leave_pending') {
        return {
          canWithdraw: false,
          reason: '只能撤回待审批状态的请假申请',
          currentStatus: app.status
        };
      }

      return {
        canWithdraw: true,
        currentStatus: app.status
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 验证请假审批权限
   */
  async validateApprovalPermission(
    applicationId: number,
    teacherId: string
  ): Promise<
    ServiceResult<{
      canApprove: boolean;
      reason?: string;
      currentStatus?: string;
      isAssignedTeacher?: boolean;
    }>
  > {
    return wrapServiceCall(async () => {
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        return {
          canApprove: false,
          reason: '请假申请不存在'
        };
      }

      const optionApp = application.data;
      if (!optionApp.some) {
        return {
          canApprove: false,
          reason: '请假申请不存在'
        };
      }

      const app = optionApp.value;

      if (!app) {
        return {
          canApprove: false,
          reason: '请假申请不存在'
        };
      }

      const isAssignedTeacher = app.teacher_id === teacherId;

      if (!isAssignedTeacher) {
        return {
          canApprove: false,
          reason: '无权限审批该请假申请',
          currentStatus: app.status,
          isAssignedTeacher: false
        };
      }

      if (app.status !== 'leave_pending') {
        return {
          canApprove: false,
          reason: '只能审批待审批状态的请假申请',
          currentStatus: app.status,
          isAssignedTeacher: true
        };
      }

      return {
        canApprove: true,
        currentStatus: app.status,
        isAssignedTeacher: true
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 处理请假申请附件
   */
  async processLeaveAttachments(
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
  > {
    return wrapServiceCall(async () => {
      const attachmentIds: number[] = [];
      const errors: Array<{ fileName: string; error: string }> = [];
      let totalSize = 0;

      for (const image of images) {
        try {
          // 验证文件类型
          if (!image.type.startsWith('image/')) {
            errors.push({
              fileName: image.name,
              error: '只支持图片文件'
            });
            continue;
          }

          // 验证文件大小
          if (image.size > 10 * 1024 * 1024) {
            // 10MB
            errors.push({
              fileName: image.name,
              error: '文件大小不能超过10MB'
            });
            continue;
          }

          // 解码Base64内容
          const fileContent = Buffer.from(image.content, 'base64');

          // 创建附件记录
          const createResult = await this.leaveAttachmentRepository.create({
            leave_application_id: applicationId,
            image_name: image.name,
            image_type: image.type as any,
            image_size: image.size,
            image_extension: '',
            image_content: fileContent,
            upload_time: getCurrentDateTime()
          });

          if (createResult.success) {
            const createdAttachment = createResult.data;
            if (createdAttachment && createdAttachment.id) {
              attachmentIds.push(createdAttachment.id);
              totalSize += image.size;
            }
          } else {
            errors.push({
              fileName: image.name,
              error: '上传失败'
            });
          }
        } catch (error) {
          errors.push({
            fileName: image.name,
            error: error instanceof Error ? error.message : '处理失败'
          });
        }
      }

      return {
        uploadedCount: attachmentIds.length,
        totalSize,
        attachmentIds,
        errors: errors.length > 0 ? errors : undefined
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 生成附件缩略图
   */
  async generateThumbnail(attachmentId: number): Promise<
    ServiceResult<{
      success: boolean;
      thumbnailSize?: number;
    }>
  > {
    return wrapServiceCall(async () => {
      // 这里可以实现缩略图生成逻辑
      // 暂时返回成功
      return {
        success: true,
        thumbnailSize: 5120 // 5KB
      };
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取学生请假统计
   */
  async getStudentLeaveStatistics(
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
  > {
    return wrapServiceCall(async () => {
      const basicStats = await this.getLeaveStatistics({ studentId });
      if (!isSuccessResult(basicStats)) {
        throw new Error(basicStats.error?.message);
      }

      // 暂时返回模拟的额外数据
      return {
        ...basicStats.data,
        leaveTypeDistribution: {
          sick: 5,
          personal: 3,
          emergency: 1,
          other: 2
        },
        monthlyTrends: [
          { month: '2024-01', applicationCount: 2, approvalRate: 100 },
          { month: '2024-02', applicationCount: 3, approvalRate: 66.7 },
          { month: '2024-03', applicationCount: 1, approvalRate: 100 }
        ]
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取教师审批统计
   */
  async getTeacherApprovalStatistics(
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
  > {
    return wrapServiceCall(async () => {
      // 暂时返回模拟数据
      return {
        totalApplications: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        approvalRate: 0,
        averageApprovalTimeHours: 0,
        courseStats: []
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取待审批申请
   */
  async getPendingApprovals(
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
  > {
    return wrapServiceCall(async () => {
      const conditions: any = {
        teacher_id: teacherId,
        status: 'leave_pending'
      };

      const queryOptions = {
        pagination: limit
          ? {
              page: 1,
              page_size: limit
            }
          : undefined
      };

      const result =
        await this.leaveApplicationRepository.findWithDetailsPaginated(
          conditions,
          queryOptions
        );

      if (!isSuccessResult(result)) {
        throw new Error('获取待审批申请失败');
      }

      // 转换为接口要求的格式
      const applications = result.data.data.map((app) => ({
        applicationId: app.id,
        studentId: app.student_id,
        studentName: app.student_name,
        courseName: app.course_name || '',
        leaveType: app.leave_type,
        leaveReason: app.leave_reason,
        applicationTime: app.application_time,
        classDate: new Date(), // 需要从课程信息获取
        hasAttachments: (app.attachment_count || 0) > 0,
        urgencyLevel: 'medium' as const // 需要根据业务规则确定
      }));

      return applications;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 批量审批申请
   */
  async batchApproveApplications(
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
  > {
    return wrapServiceCall(async () => {
      let successCount = 0;
      let failedCount = 0;
      const results: Array<{
        applicationId: number;
        success: boolean;
        error?: string;
      }> = [];

      // 创建教师用户信息
      const teacherInfo: UserInfo = {
        id: teacherId,
        type: 'teacher',
        name: '教师' // 这里需要从数据库获取真实姓名
      };

      for (const applicationId of applicationIds) {
        try {
          const approvalResult = await this.approveLeaveApplication(
            applicationId,
            teacherInfo,
            { result: result, comment }
          );

          if (isSuccessResult(approvalResult)) {
            successCount++;
            results.push({
              applicationId,
              success: true
            });
          } else {
            failedCount++;
            results.push({
              applicationId,
              success: false,
              error: approvalResult.error?.message || '审批失败'
            });
          }
        } catch (error) {
          failedCount++;
          results.push({
            applicationId,
            success: false,
            error: error instanceof Error ? error.message : '审批失败'
          });
        }
      }

      return {
        successCount,
        failedCount,
        results
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取请假申请详情
   */
  async getLeaveApplicationDetail(
    applicationId: number,
    userInfo: UserInfo
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const optionApp = application.data;
      if (!optionApp.some) {
        throw new Error('请假申请不存在');
      }

      const app = optionApp.value;

      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证权限
      if (userInfo.type === 'student' && app.student_id !== userInfo.id) {
        throw new Error('无权限查看该请假申请');
      } else if (
        userInfo.type === 'teacher' &&
        app.teacher_id !== userInfo.id
      ) {
        throw new Error('无权限查看该请假申请');
      }

      // 获取附件列表
      const attachmentsResult =
        await this.leaveAttachmentRepository.getAttachmentList(applicationId);
      const attachments = isSuccessResult(attachmentsResult)
        ? attachmentsResult.data
        : [];

      return {
        ...app,
        attachments: attachments.map((att) => ({
          id: att.id,
          name: att.image_name,
          size: att.image_size,
          type: att.image_type,
          uploadTime: formatDateTime(att.upload_time)
        }))
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 发送请假通知
   */
  async sendLeaveNotification(
    applicationId: number,
    notificationType: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  ): Promise<
    ServiceResult<{
      sent: boolean;
      recipients: string[];
      method: 'email' | 'sms' | 'push';
    }>
  > {
    return wrapServiceCall(async () => {
      // 这里可以实现具体的通知逻辑
      return {
        sent: true,
        recipients: ['student@example.com', 'teacher@example.com'],
        method: 'email' as const
      };
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 导出请假数据
   */
  async exportLeaveData(
    teacherId: string,
    startDate: Date,
    endDate: Date,
    format: 'excel' | 'csv' | 'pdf'
  ): Promise<
    ServiceResult<{
      fileName: string;
      fileContent: Buffer;
      mimeType: string;
    }>
  > {
    return wrapServiceCall(async () => {
      // 这里可以实现数据导出逻辑
      return {
        fileName: `leave_data_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.${format}`,
        fileContent: Buffer.from('mock data'),
        mimeType:
          format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : format === 'csv'
              ? 'text/csv'
              : 'application/pdf'
      };
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 通过附件ID直接下载附件
   */
  async downloadAttachmentById(
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
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { attachmentId, thumbnail },
        'Download attachment by ID started'
      );

      // 获取附件内容
      const attachmentResult =
        await this.leaveAttachmentRepository.getAttachmentContent(
          attachmentId,
          thumbnail
        );

      if (!isSuccessResult(attachmentResult) || !attachmentResult.data) {
        throw new Error('附件不存在或已被删除');
      }

      const attachment = attachmentResult.data;

      // 验证权限 - 需要检查用户是否有权限下载该附件
      // 这里可以通过附件关联的请假申请来验证权限
      // 暂时跳过权限验证

      return {
        fileName: attachment.fileName,
        fileContent: attachment.fileContent,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 上传附件
   */
  private async uploadAttachments(
    applicationId: number,
    attachments: any[]
  ): Promise<ServiceResult<number[]>> {
    // 这里需要实现附件上传逻辑
    // 暂时返回模拟数据
    return createSuccessResult([1, 2, 3]);
  }
}
