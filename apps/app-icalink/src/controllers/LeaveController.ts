import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import LeaveService from '../services/LeaveService.js';
import type { LeaveApplicationRequest } from '../types/api.js';
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
  ): Promise<void> {
    try {
      // 1. 获取用户身份
      const userIdentity = (request as any).userIdentity;

      // 2. 验证学生身份
      if (!userIdentity || userIdentity.userType !== 'student') {
        return reply.status(403).send({
          success: false,
          message: '权限不足：只有学生可以查询自己的请假申请列表',
          code: String(ServiceErrorCode.UNAUTHORIZED)
        });
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

        return reply.status(statusCode).send({
          success: false,
          message,
          code
        });
      }

      // 5. 返回成功响应
      return reply
        .status(200)
        .send({ success: true, message: '查询成功', data: result.right });
    } catch (error: any) {
      if (!reply.sent) {
        return reply.status(500).send({
          success: false,
          message: '服务器内部错误',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  }

  @Post('/api/icalink/v1/leave-applications')
  async submitLeaveApplication(
    request: FastifyRequest<{ Body: LeaveApplicationRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userIdentity = (request as any).userIdentity;
      const result = await this.leaveService.submitLeaveApplication(
        {
          userId: userIdentity.userId,
          userType: userIdentity.userType || 'student',
          name: userIdentity.username
        },
        request.body
      );

      if (isLeft(result)) {
        return reply.status(400).send({
          success: false,
          message: result.left.message,
          code: result.left.code
        });
      }

      return reply.status(201).send({
        success: true,
        message: '请假申请提交成功',
        data: result.right
      });
    } catch (error: any) {
      if (!reply.sent) {
        return reply.status(500).send({
          success: false,
          message: '服务器内部错误',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
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
  ): Promise<void> {
    try {
      // 1. 参数验证
      const applicationId = parseInt(request.params.application_id, 10);
      if (isNaN(applicationId) || applicationId <= 0) {
        return reply.status(400).send({
          success: false,
          message: '无效的申请ID',
          code: String(ServiceErrorCode.INVALID_PARAMETER)
        });
      }

      // 2. 用户认证检查
      const userIdentity = (request as any).userIdentity;
      if (!userIdentity) {
        return reply.status(401).send({
          success: false,
          message: '用户未认证',
          code: String(ServiceErrorCode.UNAUTHORIZED)
        });
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

        return reply.status(statusCode).send({ success: false, message, code });
      }

      // 5. 返回成功响应
      return reply.status(200).send({
        success: true,
        message: '请假申请撤回成功',
        data: result.right
      });
    } catch (error: any) {
      if (!reply.sent) {
        return reply.status(500).send({
          success: false,
          message: '服务器内部错误',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  }

  /**
   * 教师查询待审批的请假申请详情
   * GET /icalink/v1/attendance/teacher-leave-applications
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 待审批的请假申请详情
   *
   * @description
   * 业务逻辑：
   * 1. 从登录态获取教师 ID
   * 2. 从查询参数获取学生 ID 和课程 ID
   * 3. 调用 Service 层查询该学生在该课程中、当前教师需要审批的待审批请假申请
   * 4. 返回请假申请详情（包含附件信息）
   *
   * HTTP 状态码：
   * - 200: 查询成功
   * - 400: 参数验证失败
   * - 403: 权限不足（非教师用户）
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/attendance/teacher-leave-applications')
  async getTeacherPendingLeaveApplication(
    request: FastifyRequest<{
      Querystring: {
        student_id: string;
        course_id: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { student_id, course_id } = request.query;

      // 1. 教师身份验证
      let teacherInfo;
      try {
        teacherInfo = getTeacherIdentityFromRequest(request);
      } catch (error) {
        return reply.status(403).send({
          success: false,
          message: error instanceof Error ? error.message : '教师身份验证失败',
          code: String(ServiceErrorCode.UNAUTHORIZED)
        });
      }

      // 2. 参数验证
      if (!student_id || student_id.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '学生ID不能为空',
          code: String(ServiceErrorCode.INVALID_PARAMETER)
        });
      }

      if (!course_id || course_id.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '课程ID不能为空',
          code: String(ServiceErrorCode.INVALID_PARAMETER)
        });
      }

      // 3. 调用服务层查询待审批的请假申请
      const result =
        await this.leaveService.queryPendingLeaveApplicationByStudentAndCourse(
          teacherInfo.userId,
          student_id,
          course_id
        );

      // 4. 错误处理
      if (isLeft(result)) {
        const { code, message } = result.left as any;
        let statusCode = 500;

        // 根据错误类型设置正确的 HTTP 状态码
        switch (code) {
          case String(ServiceErrorCode.VALIDATION_ERROR):
          case String(ServiceErrorCode.INVALID_PARAMETER):
            statusCode = 400;
            break;
          case String(ServiceErrorCode.UNAUTHORIZED):
          case String(ServiceErrorCode.FORBIDDEN):
            statusCode = 403;
            break;
          case String(ServiceErrorCode.RESOURCE_NOT_FOUND):
            statusCode = 404;
            break;
          case String(ServiceErrorCode.DATABASE_ERROR):
          case String(ServiceErrorCode.UNKNOWN_ERROR):
            statusCode = 500;
            break;
          default:
            statusCode = 500;
        }

        return reply.status(statusCode).send({
          success: false,
          message,
          code
        });
      }

      // 5. 返回成功响应
      return reply.status(200).send({
        success: true,
        data: result.right
      });
    } catch (error: any) {
      if (!reply.sent) {
        return reply.status(500).send({
          success: false,
          message: '服务器内部错误',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
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
        attendance_record_id: string;
        action: 'approve' | 'reject';
        comment?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { attendance_record_id, action, comment } = request.body;

      // 1. 教师身份验证
      let teacherInfo;
      try {
        teacherInfo = getTeacherIdentityFromRequest(request);
      } catch (error) {
        return reply.status(403).send({
          success: false,
          message: error instanceof Error ? error.message : '教师身份验证失败',
          code: String(ServiceErrorCode.UNAUTHORIZED)
        });
      }

      // 2. 参数验证
      const recordId = parseInt(attendance_record_id, 10);
      if (isNaN(recordId) || recordId <= 0) {
        return reply.status(400).send({
          success: false,
          message: '无效的考勤记录ID',
          code: String(ServiceErrorCode.INVALID_PARAMETER)
        });
      }

      // 3. 调用服务层处理审批
      const result = await this.leaveService.approveLeaveApplication(
        recordId,
        action,
        comment
      );

      // 4. 错误处理
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

        return reply.status(statusCode).send({
          success: false,
          message,
          code
        });
      }

      // 5. 返回成功响应
      return reply.status(200).send({
        success: true,
        message: `请假申请已${action === 'approve' ? '批准' : '拒绝'}`,
        data: result.right
      });
    } catch (error: any) {
      if (!reply.sent) {
        return reply.status(500).send({
          success: false,
          message: '服务器内部错误',
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
    }
  }
}
