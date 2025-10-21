import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import AttendanceService from '../services/AttendanceService.js';
import LeaveService from '../services/LeaveService.js';
import type {
  ApiResponse,
  CheckinDTO,
  CheckinRequest,
  CheckinResponse,
  CreateVerificationWindowRequest,
  CreateVerificationWindowResponse
} from '../types/api.js';
import { ServiceErrorCode } from '../types/service.js';
import { getTeacherIdentityFromRequest } from '../utils/user-identity.js';

@Controller()
export default class AttendanceController {
  constructor(
    private readonly logger: Logger,
    private readonly attendanceService: AttendanceService,
    private readonly leaveService: LeaveService
  ) {}

  @Get('/api/icalink/v1/auth/status')
  async checkAuthStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    return {
      success: true,
      message: '用户已认证'
    };
  }

  /**
   * 获取课程完整数据
   * GET /api/icalink/v1/courses/external/:external_id/complete
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 课程完整数据（学生视图或教师视图）
   *
   * @description
   * 业务逻辑：
   * 1. 根据 external_id 查找课程
   * 2. 根据 type 参数返回不同的视图：
   *    - type=student: 学生视图（单个学生的签到状态）
   *    - type=teacher: 教师视图（所有学生的签到状态列表）
   * 3. 根据课程日期类型采用不同的数据源和业务逻辑：
   *    - 历史课程（课程日期 < 当天）：从 icalink_absent_student_relations 表获取最终状态
   *    - 当前课程（课程日期 = 当天）：从 v_attendance_realtime_details 视图获取实时状态
   *    - 未来课程（课程日期 > 当天）：从 v_attendance_realtime_details 视图获取状态（仅限特定状态）
   *
   * 教师视图特殊逻辑：
   * - 历史课程：不允许创建签到窗口
   * - 当前课程：
   *   - 查询最新签到窗口信息
   *   - 计算是否可以创建新窗口（时间条件：课程开始后 10 分钟至课程结束时间）
   *   - 窗口条件：不在上一个窗口的有效时间内（窗口开启后 2 分钟内）
   * - 未来课程：不允许创建签到窗口，只展示请假相关状态
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数验证失败
   * - 403: 权限不足
   * - 404: 课程不存在
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/courses/external/:external_id/complete')
  async getCourseCompleteData(
    request: FastifyRequest<{
      Params: { external_id: string };
      Querystring: { type?: 'student' | 'teacher' };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    const { external_id } = request.params;
    const { type = 'teacher' } = request.query;
    const userIdentity = (request as any).userIdentity;

    // 调用服务层
    const result = await this.attendanceService.getCourseCompleteData({
      externalId: external_id,
      userInfo: userIdentity,
      type
    });

    // 处理错误
    if (isLeft(result)) {
      const error = result.left;

      // 根据错误类型设置正确的 HTTP 状态码
      if (error.code === 'RESOURCE_NOT_FOUND') {
        reply.status(404);
      } else if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
        reply.status(403);
      } else if (error.code === 'DATABASE_ERROR') {
        reply.status(500);
      } else {
        reply.status(400);
      }

      return {
        success: false,
        message: error.message,
        code: error.code
      };
    }

    // 返回成功结果
    return {
      success: true,
      message: '获取课程完整数据成功',
      data: result.right
    };
  }

  /**
   * 学生签到
   * POST /api/icalink/v1/attendance/:course_id/checkin
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 签到响应
   *
   * @description
   * 业务逻辑：
   * 1. 验证用户身份（必须是学生）
   * 2. 验证课程是否存在
   * 3. 验证学生是否注册了该课程
   * 4. 验证签到时间窗口（窗口签到或自主签到）
   * 5. 将签到任务加入消息队列（异步处理）
   * 6. 队列处理器会进行：
   *    - 幂等性检查（防止重复签到）
   *    - 迟到判定（根据签到时间）
   *    - 位置验证（可选）
   *    - 创建或更新考勤记录
   *
   * HTTP 状态码：
   * - 202: 签到请求已接受处理（异步处理）
   * - 401: 用户未认证
   * - 403: 权限不足（非学生用户）
   * - 404: 课程不存在
   * - 422: 验证失败（学生未注册课程、不在签到时间窗口等）
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/attendance/:course_id/checkin')
  async checkin(
    request: FastifyRequest<{
      Params: { course_id: string };
      Body: CheckinRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<CheckinResponse>> {
    const { course_id } = request.params;
    const userIdentity = (request as any).userIdentity;

    // 1. 用户认证检查
    if (!userIdentity) {
      reply.status(401);
      return {
        success: false,
        message: '用户未认证',
        code: String(ServiceErrorCode.UNAUTHORIZED)
      };
    }

    // 2. 构建签到 DTO
    const checkinDto: CheckinDTO = {
      courseExtId: course_id,
      studentInfo: userIdentity,
      checkinData: request.body
    };

    // 3. 调用服务层处理签到
    const result = await this.attendanceService.checkin(checkinDto);

    // 4. 错误处理
    if (isLeft(result)) {
      const { code, message } = result.left;
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
        case String(ServiceErrorCode.VALIDATION_ERROR):
        case String(ServiceErrorCode.INVALID_OPERATION):
          statusCode = 422;
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

    // 5. 返回成功响应（202 Accepted - 异步处理）
    reply.status(200);
    return { success: true, message: '签到成功', data: result.right };
  }

  // Disabled - AttendanceStatsRepository removed
  // @Get('/api/icalink/v1/attendance/course/:course_id/history')
  // async getCourseAttendanceHistory(
  //   request: FastifyRequest<{
  //     Params: { course_id: string };
  //     Querystring: { xnxq?: string; start_date?: string; end_date?: string };
  //   }>,
  //   reply: FastifyReply
  // ): Promise<ApiResponse<any>> {
  //   const { course_id } = request.params;
  //   const userIdentity = (request as any).userIdentity;

  //   const result = await this.attendanceService.getCourseAttendanceHistoryById(
  //     course_id,
  //     userIdentity,
  //     request.query
  //   );

  //   if (isLeft(result)) {
  //     reply.status(400);
  //     return {
  //       success: false,
  //       message: result.left.message,
  //       code: result.left.code
  //     };
  //   }

  //   return {
  //     success: true,
  //     message: '获取课程历史考勤数据成功',
  //     data: result.right
  //   };
  // }

  // Disabled - AttendanceStatsRepository removed
  // @Get('/api/icalink/v1/attendance/course/:course_id/stats')
  // async getPersonalCourseStats(
  //   request: FastifyRequest<{
  //     Params: { course_id: string };
  //     Querystring: { xnxq?: string };
  //   }>,
  //   reply: FastifyReply
  // ): Promise<ApiResponse<any>> {
  //   const { course_id } = request.params;
  //   const userIdentity = (request as any).userIdentity;

  //   if (userIdentity?.userType !== 'teacher') {
  //     reply.status(403);
  //     return {
  //       success: false,
  //       message: '只有教师可以查看个人课程统计',
  //       code: String(ServiceErrorCode.UNAUTHORIZED)
  //     };
  //   }

  //   const result = await this.attendanceService.getPersonalCourseStatsById(
  //     course_id,
  //     userIdentity,
  //     request.query
  //   );

  //   if (isLeft(result)) {
  //     reply.status(400);
  //     return {
  //       success: false,
  //       message: result.left.message,
  //       code: result.left.code
  //     };
  //   }

  //   return {
  //     success: true,
  //     message: '获取个人课程统计数据成功',
  //     data: result.right
  //   };
  // }

  @Get('/api/icalink/v1/attendance/leave-applications')
  async getStudentLeaveApplications(
    request: FastifyRequest<{
      Querystring: {
        status?: 'leave_pending' | 'leave' | 'leave_rejected' | 'all';
        page?: number;
        page_size?: number;
        start_date?: string;
        end_date?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    const userIdentity = (request as any).userIdentity;
    if (userIdentity?.userType !== 'student') {
      reply.status(401);
      return {
        success: false,
        message: '用户身份验证失败：需要学生权限',
        code: String(ServiceErrorCode.UNAUTHORIZED)
      };
    }

    const result = await this.leaveService.queryLeaveApplications({
      studentId: userIdentity.id,
      status: request.query.status,
      page: request.query.page,
      page_size: request.query.page_size,
      start_date: request.query.start_date,
      end_date: request.query.end_date
    });

    if (isLeft(result)) {
      reply.status(400);
      const error = result.left as any;
      return {
        success: false,
        message: error.message,
        code: error.code
      };
    }

    return {
      success: true,
      message: '获取请假申请列表成功',
      data: result.right
    };
  }

  /**
   * 查看请假附件图片
   * GET /api/icalink/v1/attendance/attachments/:id/image
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 图片二进制数据（Blob）
   *
   * @description
   * 业务逻辑：
   * 1. 验证附件 ID 是否为有效数字
   * 2. 从 icalink_leave_attachments 表获取附件记录
   * 3. 根据存储类型（OSS 或数据库）获取图片数据
   * 4. 返回图片二进制数据，设置正确的 Content-Type 和缓存头
   *
   * HTTP 状态码：
   * - 200: 成功返回图片
   * - 400: 参数验证失败（ID 无效）
   * - 401: 用户未认证
   * - 403: 无权限访问此附件
   * - 404: 附件不存在
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/attendance/attachments/:id/image')
  async getAttachmentImage(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { thumbnail?: boolean };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const userIdentity = (request as any).userIdentity;
    const { id } = request.params;

    // 1. 参数验证
    const attachmentId = parseInt(id, 10);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      reply.status(400).send({
        success: false,
        message: '附件ID无效',
        code: ServiceErrorCode.VALIDATION_ERROR
      });
      return;
    }

    // 2. 用户认证检查
    if (!userIdentity) {
      reply.status(401).send({
        success: false,
        message: '用户未认证',
        code: ServiceErrorCode.UNAUTHORIZED
      });
      return;
    }

    // 3. 调用服务层获取附件
    const result = await this.leaveService.downloadAttachmentById(
      attachmentId,
      userIdentity,
      request.query.thumbnail
    );

    // 4. 错误处理
    if (isLeft(result)) {
      const error = result.left as any;

      // 根据错误类型设置正确的 HTTP 状态码
      if (error.code === String(ServiceErrorCode.RESOURCE_NOT_FOUND)) {
        reply.status(404);
      } else if (
        error.code === String(ServiceErrorCode.UNAUTHORIZED) ||
        error.code === String(ServiceErrorCode.FORBIDDEN)
      ) {
        reply.status(403);
      } else if (error.code === String(ServiceErrorCode.STORAGE_ERROR)) {
        reply.status(500);
      } else {
        reply.status(400);
      }

      reply.send({
        success: false,
        message: error.message,
        code: error.code
      });
      return;
    }

    // 5. 返回图片二进制数据
    const { fileName, fileContent, mimeType, fileSize } = result.right;
    reply.raw.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': fileSize.toString()
    });
    reply.raw.end(fileContent);
  }

  @Get('/api/icalink/v1/attendance/attachments/:id/download')
  async downloadAttachmentFile(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { thumbnail?: boolean };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const userIdentity = (request as any).userIdentity;
    const { id } = request.params;

    const result = await this.leaveService.downloadAttachmentById(
      parseInt(id, 10),
      userIdentity,
      request.query.thumbnail
    );

    if (isLeft(result)) {
      const error = result.left as any;
      reply.status(404).send({ success: false, message: error.message });
      return;
    }

    const { fileName, fileContent, mimeType } = result.right;
    const downloadFileName = request.query.thumbnail
      ? `thumbnail_${fileName}`
      : fileName;

    reply.raw.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(
        downloadFileName
      )}"`,
      'Content-Length': fileContent.length.toString()
    });
    reply.raw.end(fileContent);
  }

  /**
   * 创建签到窗口
   * POST /api/icalink/v1/courses/:course_id/verification-window
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 创建签到窗口响应
   *
   * @description
   * 业务逻辑：
   * 1. 验证教师身份（必须是教师）
   * 2. 验证课程 ID 是否有效
   * 3. 验证教师是否为该课程的授课教师
   * 4. 验证时间条件（课程开始后 10 分钟至课程结束时间）
   * 5. 检查是否已有活跃的签到窗口
   * 6. 获取验证轮次（自动递增）
   * 7. 统计预期签到人数
   * 8. 创建签到窗口记录
   * 9. 返回创建结果
   *
   * HTTP 状态码：
   * - 201: 创建成功
   * - 400: 参数验证失败
   * - 403: 权限不足（非教师用户或不是该课程的授课教师）
   * - 404: 课程不存在
   * - 422: 业务验证失败（时间条件不满足、已有活跃窗口等）
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/courses/:course_id/verification-window')
  async createVerificationWindow(
    request: FastifyRequest<{
      Params: { course_id: string };
      Body: CreateVerificationWindowRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<CreateVerificationWindowResponse>> {
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
    const courseId = parseInt(request.params.course_id, 10);
    if (isNaN(courseId) || courseId <= 0) {
      reply.status(400);
      return {
        success: false,
        message: '无效的课程ID',
        code: String(ServiceErrorCode.INVALID_PARAMETER)
      };
    }

    // 3. 调用服务层创建签到窗口
    const result = await this.attendanceService.createVerificationWindow(
      courseId,
      teacherInfo.userId,
      request.body
    );

    // 4. 错误处理
    if (isLeft(result)) {
      const { code, message } = result.left;
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

    // 5. 返回成功响应
    reply.status(201);
    return {
      success: true,
      message: '签到窗口创建成功',
      data: result.right
    };
  }
}
