// @wps/app-icalink 请假控制器
// 基于 Stratix 框架的控制器实现

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Controller, Delete, Get, Post, Put } from '@stratix/core';
import type { ILeaveService } from '../services/interfaces/ILeaveService.js';
import type { IUserService } from '../services/interfaces/IUserService.js';
import type {
  ApiResponse,
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
import { ServiceErrorCode, isSuccessResult } from '../types/service.js';
import {
  getStudentIdentityFromRequest,
  getTeacherIdentityFromRequest,
  getUserIdentityWithTypeCheck
} from '../utils/user-identity.js';

/**
 * 请假控制器
 * 实现请假相关的API端点
 */
@Controller()
export default class LeaveController {
  constructor(
    private readonly leaveService: ILeaveService,
    private readonly userService: IUserService
  ) {}

  /**
   * API_01: 查询请假信息接口
   * GET /api/icalink/v1/leave-applications
   */
  @Get('/api/icalink/v1/leave-applications')
  async queryLeaveApplications(
    request: FastifyRequest<{
      Querystring: LeaveQueryParams;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<LeaveApplicationsResponse>> {
    try {
      const params = request.query;

      // 获取用户信息（支持学生和教师）
      let userInfo: UserInfo;
      try {
        userInfo = getUserIdentityWithTypeCheck(request, [
          'student',
          'teacher'
        ]);
      } catch (error) {
        reply.status(401);
        return {
          success: false,
          message: error instanceof Error ? error.message : '用户身份验证失败',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      // 验证用户权限
      const hasPermission = await this.userService.hasPermission(
        userInfo.id,
        userInfo.type,
        'canViewAttendance'
      );
      if (!isSuccessResult(hasPermission) || !hasPermission.data) {
        reply.status(403);
        return {
          success: false,
          message: '没有查看请假信息的权限',
          code: ServiceErrorCode.FORBIDDEN
        };
      }

      const result = await this.leaveService.queryLeaveApplications(
        userInfo,
        params
      );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '查询成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '查询失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * API_03: 学生请假申请接口
   * POST /api/icalink/v1/leave-applications
   */
  @Post('/api/icalink/v1/leave-applications')
  async submitLeaveApplication(
    request: FastifyRequest<{
      Body: LeaveApplicationRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<LeaveApplicationResponse>> {
    try {
      const applicationRequest = request.body;
      const userIdentity = (request as any).userIdentity;

      // // 检查提交请假权限
      // const hasPermission = await this.userService.hasPermission(
      //   studentInfo.id,
      //   'student',
      //   'canSubmitLeave'
      // );
      // if (!isSuccessResult(hasPermission) || !hasPermission.data) {
      //   reply.status(403);
      //   return {
      //     success: false,
      //     message: '没有提交请假申请的权限',
      //     code: ServiceErrorCode.FORBIDDEN
      //   };
      // }

      const result = await this.leaveService.submitLeaveApplication(
        {
          id: userIdentity.userId,
          type: userIdentity.type,
          name: userIdentity.username,
          className: userIdentity.className,
          majorName: userIdentity.majorName,
          collegeMame: userIdentity.collegeName
        },
        applicationRequest
      );

      if (isSuccessResult(result)) {
        reply.status(201);
        return {
          success: true,
          message: '请假申请提交成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '请假申请提交失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * API_04: 撤回请假申请接口 (原DELETE接口保持兼容)
   * DELETE /api/icalink/v1/leave-applications/:application_id
   * 注意：此接口不需要请求体，如果前端设置了Content-Type: application/json，请确保发送空的JSON对象 {}
   */
  @Delete('/api/icalink/v1/leave-applications/:application_id')
  async withdrawLeaveApplicationDelete(
    request: FastifyRequest<{
      Params: { application_id: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WithdrawResponse>> {
    try {
      const applicationId = parseInt(request.params.application_id);

      if (isNaN(applicationId)) {
        reply.status(400);
        return {
          success: false,
          message: '无效的申请ID',
          code: ServiceErrorCode.INVALID_PARAMETER
        };
      }

      // 获取学生身份信息
      let studentInfo: UserInfo;
      try {
        studentInfo = getStudentIdentityFromRequest(request);
      } catch (error) {
        reply.status(401);
        return {
          success: false,
          message: error instanceof Error ? error.message : '用户身份验证失败',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      // 验证学生身份
      const userValidation = await this.userService.validateUser(
        studentInfo.id,
        'student'
      );
      if (!isSuccessResult(userValidation) || !userValidation.data.isValid) {
        reply.status(401);
        return {
          success: false,
          message: '学生身份验证失败',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      const result = await this.leaveService.withdrawLeaveApplication(
        applicationId,
        studentInfo
      );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '请假申请撤回成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '请假申请撤回失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * API_04: 撤回请假申请接口 (新POST接口)
   * POST /api/icalink/v1/leave-applications/:application_id/withdraw
   */
  @Post('/api/icalink/v1/leave-applications/:application_id/withdraw')
  async withdrawLeaveApplication(
    request: FastifyRequest<{
      Params: { application_id: string };
      Body?: { reason?: string }; // 可选的撤回原因
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<WithdrawResponse>> {
    try {
      const applicationId = parseInt(request.params.application_id);

      if (isNaN(applicationId)) {
        reply.status(400);
        return {
          success: false,
          message: '无效的申请ID',
          code: ServiceErrorCode.INVALID_PARAMETER
        };
      }
      const userIdentity = (request as any).userIdentity;

      const result = await this.leaveService.withdrawLeaveApplication(
        applicationId,
        {
          id: userIdentity.userId,
          type: userIdentity.type,
          name: userIdentity.username
        }
      );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '请假申请撤回成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '请假申请撤回失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * 教师查询请假申请列表接口
   * GET /api/icalink/v1/attendance/teacher-leave-applications
   */
  @Get('/api/icalink/v1/attendance/teacher-leave-applications')
  async getTeacherLeaveApplications(
    request: FastifyRequest<{
      Querystring: {
        status?: string;
        page?: number;
        page_size?: number;
        start_date?: string;
        end_date?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const params = request.query;

      // 获取教师身份信息
      let teacherInfo: UserInfo;
      try {
        teacherInfo = getTeacherIdentityFromRequest(request);
      } catch (error) {
        reply.status(403);
        return {
          success: false,
          message: error instanceof Error ? error.message : '教师身份验证失败',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      // 获取教师的请假申请列表（包含统计信息）
      const result = await this.leaveService.getLeaveApplicationsByTeacher(
        teacherInfo.id,
        {
          status: params.status,
          page: params.page || 1,
          pageSize: params.page_size || 50,
          startDate: params.start_date
            ? new Date(params.start_date)
            : undefined,
          endDate: params.end_date ? new Date(params.end_date) : undefined
        }
      );

      if (!isSuccessResult(result)) {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '查询失败',
          code: result.error?.code
        };
      }

      // 获取统计信息
      const statsResult = await this.leaveService.getLeaveStatistics({
        teacherId: teacherInfo.id,
        startDate: params.start_date ? new Date(params.start_date) : undefined,
        endDate: params.end_date ? new Date(params.end_date) : undefined
      });

      const stats = isSuccessResult(statsResult)
        ? statsResult.data
        : {
            totalApplications: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            cancelledCount: 0
          };

      // 转换为前端期望的格式
      const applications = (result.data.data as any[]).map((app: any) => ({
        id: app.id.toString(),
        student_id: app.student_id,
        student_name: app.student_name,
        course_id: app.course_id || '',
        course_name: app.course_name,
        class_date: app.class_date || new Date().toISOString().split('T')[0],
        class_time: app.class_time || '09:00:00.000 - 10:30:00.000',
        class_location: app.class_location || '',
        teacher_name: app.teacher_name || teacherInfo.name,
        leave_date: app.class_date || new Date().toISOString().split('T')[0],
        leave_reason: app.leave_reason,
        leave_type: app.leave_type,
        status: app.status, // 直接使用服务层返回的状态，已经是正确格式
        approval_comment: app.approval_comment || null,
        approval_time: app.approval_time || null,
        application_time: app.application_time || app.created_at,
        approval_id: app.id.toString(), // 使用申请ID作为审批ID
        student_info: {
          student_id: app.student_id,
          student_name: app.student_name,
          class_name: app.class_name || '',
          major_name: app.major_name || ''
        },
        teacher_info: {
          teacher_id: teacherInfo.id,
          teacher_name: teacherInfo.name,
          teacher_department: ''
        },
        attachments: app.attachments || [],
        jxz: null
      }));

      return {
        success: true,
        message: '查询成功',
        data: {
          applications,
          total: (result.data.total as number) || applications.length,
          page: params.page || 1,
          page_size: params.page_size || 50,
          stats: {
            pending_count: (stats as any).pendingCount || 0,
            processed_count:
              ((stats as any).approvedCount || 0) +
              ((stats as any).rejectedCount || 0) +
              ((stats as any).cancelledCount || 0),
            approved_count: (stats as any).approvedCount || 0,
            rejected_count: (stats as any).rejectedCount || 0,
            cancelled_count: (stats as any).cancelledCount || 0,
            total_count: (stats as any).totalApplications || 0
          }
        }
      };
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * 教师审批请假申请接口
   * POST /api/icalink/v1/attendance/teacher-approve-leave
   */
  @Post('/api/icalink/v1/attendance/teacher-approve-leave')
  async teacherApproveLeave(
    request: FastifyRequest<{
      Body: {
        approval_id: string;
        action: 'approve' | 'reject';
        comment?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { approval_id, action, comment } = request.body;

      // 获取教师身份信息
      let teacherInfo: UserInfo;
      try {
        teacherInfo = getTeacherIdentityFromRequest(request);
      } catch (error) {
        reply.status(401);
        return {
          success: false,
          message: error instanceof Error ? error.message : '教师身份验证失败',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      // 🔥 修复：approval_id是审批记录ID，需要先获取对应的application_id
      const approvalIdNum = parseInt(approval_id);
      if (isNaN(approvalIdNum)) {
        reply.status(400);
        return {
          success: false,
          message: '无效的审批记录ID',
          code: ServiceErrorCode.INVALID_PARAMETER
        };
      }

      // 通过审批记录ID获取审批记录，从中提取application_id
      const approvalRecord =
        await this.leaveService.getApprovalRecord(approvalIdNum);
      if (!approvalRecord.success || !approvalRecord.data) {
        reply.status(404);
        return {
          success: false,
          message: '审批记录不存在',
          code: ServiceErrorCode.INVALID_PARAMETER
        };
      }

      const applicationId = approvalRecord.data.leave_application_id;

      // 执行审批操作
      const approvalRequest: ApprovalRequest = {
        comment: comment,
        result: action === 'approve' ? 'approved' : 'rejected'
      };

      const result = await this.leaveService.approveLeaveApplication(
        applicationId,
        teacherInfo,
        approvalRequest
      );

      if (!isSuccessResult(result)) {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '审批失败',
          code: result.error?.code
        };
      }

      return {
        success: true,
        message: `请假申请已${action === 'approve' ? '批准' : '拒绝'}`,
        data: {
          approval_id: approval_id,
          application_id: approval_id,
          action: action,
          final_status: action === 'approve' ? 'approved' : 'rejected',
          approval_time: new Date().toISOString(),
          approval_comment: comment
        }
      };
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * API_05: 审批请假申请接口
   * PUT /api/icalink/v1/leave-applications/:application_id/approval
   */
  @Put('/api/icalink/v1/leave-applications/:application_id/approval')
  async approveLeaveApplication(
    request: FastifyRequest<{
      Params: { application_id: string };
      Body: ApprovalRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<ApprovalResponse>> {
    try {
      const applicationId = parseInt(request.params.application_id);
      const approvalRequest = request.body;

      if (isNaN(applicationId)) {
        reply.status(400);
        return {
          success: false,
          message: '无效的申请ID',
          code: ServiceErrorCode.INVALID_PARAMETER
        };
      }

      // 获取教师身份信息
      let teacherInfo: UserInfo;
      try {
        teacherInfo = getTeacherIdentityFromRequest(request);
      } catch (error) {
        reply.status(401);
        return {
          success: false,
          message: error instanceof Error ? error.message : '用户身份验证失败',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      // 验证教师身份
      const userValidation = await this.userService.validateUser(
        teacherInfo.id,
        'teacher'
      );
      if (!isSuccessResult(userValidation) || !userValidation.data.isValid) {
        reply.status(401);
        return {
          success: false,
          message: '教师身份验证失败',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      // 检查审批权限
      const hasPermission = await this.userService.hasPermission(
        teacherInfo.id,
        'teacher',
        'canApproveLeave'
      );
      if (!isSuccessResult(hasPermission) || !hasPermission.data) {
        reply.status(403);
        return {
          success: false,
          message: '没有审批请假申请的权限',
          code: ServiceErrorCode.FORBIDDEN
        };
      }

      const result = await this.leaveService.approveLeaveApplication(
        applicationId,
        teacherInfo,
        approvalRequest
      );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '请假申请审批成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '请假申请审批失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * API_06: 查看请假申请附件接口
   * GET /api/icalink/v1/leave-applications/:application_id/attachments
   */
  @Get('/api/icalink/v1/leave-applications/:application_id/attachments')
  async getLeaveAttachments(
    request: FastifyRequest<{
      Params: { application_id: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<AttachmentsResponse>> {
    try {
      const applicationId = parseInt(request.params.application_id);

      if (isNaN(applicationId)) {
        reply.status(400);
        return {
          success: false,
          message: '无效的申请ID',
          code: ServiceErrorCode.INVALID_PARAMETER
        };
      }

      // 获取用户信息（支持学生和教师）
      let userInfo: UserInfo;
      try {
        userInfo = getUserIdentityWithTypeCheck(request, [
          'student',
          'teacher'
        ]);
      } catch (error) {
        reply.status(401);
        return {
          success: false,
          message: error instanceof Error ? error.message : '用户身份验证失败',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      const result = await this.leaveService.getLeaveAttachments(
        applicationId,
        userInfo
      );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '查询成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '查询失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * API_07: 下载请假申请附件接口
   * GET /api/icalink/v1/leave-attachments/:attachment_id/download
   */
  @Get('/api/icalink/v1/leave-attachments/:attachment_id/download')
  async downloadLeaveAttachment(
    request: FastifyRequest<{
      Params: { attachment_id: string };
      Querystring: { thumbnail?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const attachmentId = parseInt(request.params.attachment_id);
      const thumbnail = request.query.thumbnail === 'true';

      if (isNaN(attachmentId)) {
        reply.status(400).send({
          success: false,
          message: '无效的附件ID参数',
          code: ServiceErrorCode.VALIDATION_ERROR
        });
        return;
      }

      // 获取用户信息（支持学生和教师）
      let userInfo: UserInfo;
      try {
        userInfo = getUserIdentityWithTypeCheck(request, [
          'student',
          'teacher'
        ]);
      } catch (error) {
        reply.status(401).send({
          success: false,
          message: error instanceof Error ? error.message : '用户身份验证失败',
          code: ServiceErrorCode.UNAUTHORIZED
        });
        return;
      }

      // 由于API路径变更，需要先通过attachmentId获取applicationId
      // 这里需要调用一个新的方法来直接通过attachmentId下载
      const result = await this.leaveService.downloadAttachmentById(
        attachmentId,
        userInfo,
        thumbnail
      );

      if (isSuccessResult(result)) {
        const { fileName, fileContent, mimeType } = result.data;

        reply
          .header('Content-Type', mimeType)
          .header(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(fileName)}"`
          )
          .send(fileContent);
      } else {
        reply.status(400).send({
          success: false,
          message: result.error?.message || '下载失败',
          code: result.error?.code
        });
      }
    } catch (error) {
      reply.status(500).send({
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      });
    }
  }
}
