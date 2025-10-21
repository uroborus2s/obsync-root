import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import LeaveService from '../services/LeaveService.js';
import type {
  ApiResponse,
  ApprovalRequest,
  LeaveApplicationRequest
} from '../types/api.js';
import { ServiceErrorCode } from '../types/service.js';
import { getTeacherIdentityFromRequest } from '../utils/user-identity.js';

@Controller()
export default class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  /**
   * 学生查询请假申请列表
   * GET /api/icalink/v1/attendance/leave-applications
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 请假申请列表
   *
   * @description
   * 业务逻辑：
   * 1. 验证学生身份（必须是学生）
   * 2. 查询该学生的所有请假申请
   * 3. 支持按状态筛选（leave_pending/leave/leave_rejected/all）
   * 4. 支持分页查询
   * 5. 支持按日期范围筛选
   * 6. 返回请假申请列表和统计信息
   *
   * HTTP 状态码：
   * - 200: 查询成功
   * - 400: 参数验证失败
   * - 403: 权限不足（非学生用户）
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/attendance/leave-applications')
  async getStudentLeaveApplications(
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
    // 1. 获取用户身份
    const userIdentity = (request as any).userIdentity;

    // 2. 验证学生身份
    if (!userIdentity || userIdentity.type !== 'student') {
      reply.status(403);
      return {
        success: false,
        message: '权限不足：只有学生可以查询自己的请假申请列表',
        code: String(ServiceErrorCode.UNAUTHORIZED)
      };
    }

    // 3. 调用服务层查询请假申请
    const result = await this.leaveService.queryLeaveApplications({
      studentId: userIdentity.userId,
      status: request.query.status as any,
      page: request.query.page,
      page_size: request.query.page_size,
      start_date: request.query.start_date,
      end_date: request.query.end_date
    });

    // 4. 错误处理
    if (isLeft(result)) {
      const { code, message } = result.left;
      let statusCode = 500;

      // 根据错误类型设置正确的 HTTP 状态码
      switch (code) {
        case String(ServiceErrorCode.VALIDATION_ERROR):
        case String(ServiceErrorCode.INVALID_PARAMETER):
          statusCode = 400;
          break;
        case String(ServiceErrorCode.DATABASE_ERROR):
        case String(ServiceErrorCode.UNKNOWN_ERROR):
          statusCode = 500;
          break;
        default:
          statusCode = 500;
      }

      reply.status(statusCode);
      return {
        success: false,
        message,
        code
      };
    }

    // 5. 返回成功响应
    return { success: true, message: '查询成功', data: result.right };
  }

  @Post('/api/icalink/v1/leave-applications')
  async submitLeaveApplication(
    request: FastifyRequest<{ Body: LeaveApplicationRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    const userIdentity = (request as any).userIdentity;
    const result = await this.leaveService.submitLeaveApplication(
      {
        userId: userIdentity.userId,
        userType: userIdentity.type || 'student',
        name: userIdentity.username
      },
      request.body
    );

    if (isLeft(result)) {
      reply.status(400);
      return {
        success: false,
        message: result.left.message,
        code: result.left.code
      };
    }

    reply.status(201);
    return { success: true, message: '请假申请提交成功', data: result.right };
  }

  /**
   * 撤回请假申请
   * POST /api/icalink/v1/leave-applications/:application_id/withdraw
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 撤回响应
   *
   * @description
   * 业务逻辑：
   * 1. 验证申请 ID 是否为有效数字
   * 2. 验证用户身份（必须已登录）
   * 3. 查找请假申请记录
   * 4. 验证申请归属（只能撤回自己的申请）
   * 5. 验证申请状态（只能撤回待审批的申请）
   * 6. 删除请假申请记录
   * 7. 返回撤回成功响应
   *
   * HTTP 状态码：
   * - 200: 撤回成功
   * - 400: 参数验证失败（申请 ID 无效）
   * - 401: 用户未认证
   * - 403: 权限不足（不是申请人）
   * - 404: 申请不存在
   * - 422: 业务验证失败（申请状态不允许撤回）
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/leave-applications/:application_id/withdraw')
  async withdrawLeaveApplication(
    request: FastifyRequest<{
      Params: { application_id: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    // 1. 参数验证
    const applicationId = parseInt(request.params.application_id, 10);
    if (isNaN(applicationId) || applicationId <= 0) {
      reply.status(400);
      return {
        success: false,
        message: '无效的申请ID',
        code: String(ServiceErrorCode.INVALID_PARAMETER)
      };
    }

    // 2. 用户认证检查
    const userIdentity = (request as any).userIdentity;
    if (!userIdentity) {
      reply.status(401);
      return {
        success: false,
        message: '用户未认证',
        code: String(ServiceErrorCode.UNAUTHORIZED)
      };
    }

    // 3. 调用服务层处理撤回
    const result = await this.leaveService.withdrawLeaveApplication(
      applicationId,
      {
        userId: userIdentity.userId,
        userType: userIdentity.type || 'student',
        name: userIdentity.username
      }
    );

    // 4. 错误处理
    if (isLeft(result)) {
      const { code, message } = result.left as any;
      let statusCode = 500; // Default to internal server error

      // 根据错误类型设置正确的 HTTP 状态码
      switch (code) {
        case String(ServiceErrorCode.UNAUTHORIZED):
        case String(ServiceErrorCode.FORBIDDEN):
          statusCode = 403;
          break;
        case String(ServiceErrorCode.RESOURCE_NOT_FOUND):
          statusCode = 404;
          break;
        case String(ServiceErrorCode.INVALID_OPERATION):
        case String(ServiceErrorCode.VALIDATION_ERROR):
          statusCode = 422;
          break;
        case String(ServiceErrorCode.INVALID_PARAMETER):
          statusCode = 400;
          break;
        case String(ServiceErrorCode.DATABASE_ERROR):
        case String(ServiceErrorCode.UNKNOWN_ERROR):
          statusCode = 500;
          break;
        default:
          statusCode = 500;
      }

      reply.status(statusCode);
      return { success: false, message, code };
    }

    // 5. 返回成功响应
    return { success: true, message: '请假申请撤回成功', data: result.right };
  }

  /**
   * 查询请假申请列表（教师端）
   * GET /api/icalink/v1/attendance/teacher-leave-applications
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 请假申请列表
   *
   * @description
   * 业务逻辑：
   * 1. 验证教师身份（必须是教师）
   * 2. 查询该教师授课课程的所有请假申请
   * 3. 支持按状态筛选（pending/approved/rejected/all）
   * 4. 支持分页查询
   * 5. 支持按日期范围筛选
   * 6. 返回请假申请列表和统计信息
   *
   * HTTP 状态码：
   * - 200: 查询成功
   * - 400: 参数验证失败
   * - 403: 权限不足（非教师用户）
   * - 500: 服务器内部错误
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
    // 1. 获取用户身份
    const userIdentity = (request as any).userIdentity;

    // 2. 验证教师身份
    if (!userIdentity || userIdentity.type !== 'teacher') {
      reply.status(403);
      return {
        success: false,
        message: '权限不足：只有教师可以查询请假申请列表',
        code: String(ServiceErrorCode.UNAUTHORIZED)
      };
    }

    // 3. 调用服务层查询请假申请
    const result = await this.leaveService.queryTeacherLeaveApplications({
      teacherId: userIdentity.userId,
      status: request.query.status,
      page: request.query.page,
      page_size: request.query.page_size,
      start_date: request.query.start_date,
      end_date: request.query.end_date
    });

    // 4. 错误处理
    if (isLeft(result)) {
      const { code, message } = result.left;
      let statusCode = 500;

      // 根据错误类型设置正确的 HTTP 状态码
      switch (code) {
        case String(ServiceErrorCode.VALIDATION_ERROR):
        case String(ServiceErrorCode.INVALID_PARAMETER):
          statusCode = 400;
          break;
        case String(ServiceErrorCode.DATABASE_ERROR):
        case String(ServiceErrorCode.UNKNOWN_ERROR):
          statusCode = 500;
          break;
        default:
          statusCode = 500;
      }

      reply.status(statusCode);
      return {
        success: false,
        message,
        code
      };
    }

    // 5. 返回成功响应
    return { success: true, message: '查询成功', data: result.right };
  }

  /**
   * 审批请假申请
   * POST /api/icalink/v1/attendance/teacher-approve-leave
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 审批响应
   *
   * @description
   * 业务逻辑：
   * 1. 验证教师身份（必须是教师）
   * 2. 验证审批记录 ID 是否有效
   * 3. 查找审批记录
   * 4. 验证教师是否有权限审批（是否为该课程的授课教师）
   * 5. 验证审批记录状态（只能审批待审批的记录）
   * 6. 更新审批记录状态
   * 7. 更新请假申请状态
   * 8. 如果批准，更新考勤记录状态为 leave
   * 9. 返回审批结果
   *
   * HTTP 状态码：
   * - 200: 审批成功
   * - 400: 参数验证失败
   * - 401: 用户未认证
   * - 403: 权限不足（非教师用户或不是该课程的授课教师）
   * - 404: 审批记录不存在
   * - 422: 业务验证失败（审批记录状态不允许审批）
   * - 500: 服务器内部错误
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
    const { approval_id, action, comment } = request.body;

    // 1. 教师身份验证
    let teacherInfo;
    try {
      teacherInfo = getTeacherIdentityFromRequest(request);
    } catch (error) {
      reply.status(403);
      return {
        success: false,
        message: error instanceof Error ? error.message : '教师身份验证失败',
        code: String(ServiceErrorCode.UNAUTHORIZED)
      };
    }

    // 2. 参数验证
    const approvalIdNum = parseInt(approval_id, 10);
    if (isNaN(approvalIdNum) || approvalIdNum <= 0) {
      reply.status(400);
      return {
        success: false,
        message: '无效的审批记录ID',
        code: String(ServiceErrorCode.INVALID_PARAMETER)
      };
    }

    // 3. 构建审批请求
    const approvalRequest: ApprovalRequest = {
      comment: comment,
      result: action === 'approve' ? 'approved' : 'rejected'
    };

    // 4. 调用服务层处理审批
    const result = await this.leaveService.approveLeaveApplication(
      approvalIdNum,
      teacherInfo,
      approvalRequest
    );

    // 5. 错误处理
    if (isLeft(result)) {
      const { code, message } = result.left as any;
      let statusCode = 500;

      // 根据错误类型设置正确的 HTTP 状态码
      switch (code) {
        case String(ServiceErrorCode.UNAUTHORIZED):
        case String(ServiceErrorCode.FORBIDDEN):
          statusCode = 403;
          break;
        case String(ServiceErrorCode.RESOURCE_NOT_FOUND):
          statusCode = 404;
          break;
        case String(ServiceErrorCode.INVALID_OPERATION):
          statusCode = 422;
          break;
        case String(ServiceErrorCode.VALIDATION_ERROR):
        case String(ServiceErrorCode.INVALID_PARAMETER):
          statusCode = 400;
          break;
        case String(ServiceErrorCode.DATABASE_ERROR):
        case String(ServiceErrorCode.UNKNOWN_ERROR):
          statusCode = 500;
          break;
        default:
          statusCode = 500;
      }

      reply.status(statusCode);
      return {
        success: false,
        message,
        code
      };
    }

    // 6. 返回成功响应
    return {
      success: true,
      message: `请假申请已${action === 'approve' ? '批准' : '拒绝'}`,
      data: result.right
    };
  }
}
