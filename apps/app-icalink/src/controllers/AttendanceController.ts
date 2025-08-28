// @wps/app-icalink 考勤控制器
// 基于 Stratix 框架的控制器实现

import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import type { IAttendanceCourseRepository } from '../repositories/interfaces/IAttendanceCourseRepository.js';
import type { IAttendanceRecordRepository } from '../repositories/interfaces/IAttendanceRecordRepository.js';
import type { IAttendanceService } from '../services/interfaces/IAttendanceService.js';
import type { ILeaveService } from '../services/interfaces/ILeaveService.js';
import type { IUserService } from '../services/interfaces/IUserService.js';
import type {
  ApiResponse,
  CheckinRequest,
  CheckinResponse,
  UserInfo
} from '../types/api.js';
import type { LeaveStatus } from '../types/database.js';
import { ServiceErrorCode, isSuccessResult } from '../types/service.js';

/**
 * 考勤控制器
 * 实现考勤相关的API端点
 */
@Controller()
export default class AttendanceController {
  constructor(
    private readonly logger: Logger,
    private readonly attendanceService: IAttendanceService,
    private readonly leaveService: ILeaveService,
    private readonly userService: IUserService,
    private readonly attendanceCourseRepository: IAttendanceCourseRepository,
    private readonly attendanceRecordRepository: IAttendanceRecordRepository
  ) {}

  /**
   * 用户认证状态检查接口
   * GET /api/icalink/v1/auth/status
   */
  @Get('/api/icalink/v1/auth/status')
  async checkAuthStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<{ user: UserInfo }>> {
    try {
      // 获取用户身份信息
      const userIdentity = (request as any).userIdentity;

      return {
        success: true,
        message: '用户已认证'
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
   * 合并接口：根据external_id获取课程信息和考勤数据
   * GET /api/icalink/v1/courses/external/:external_id/complete
   */
  @Get('/api/icalink/v1/courses/external/:external_id/complete')
  async getCourseCompleteData(
    request: FastifyRequest<{
      Params: { external_id: string };
      Querystring: { type?: 'student' | 'teacher' };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { external_id } = request.params;
      const { type = 'teacher' } = request.query;

      // 获取用户身份信息
      const userIdentity = (request as any).userIdentity;

      this.logger.info(
        { external_id, type, userIdentity },
        'Getting complete course data'
      );

      // 参数验证
      if (!external_id || typeof external_id !== 'string') {
        reply.status(400);
        return {
          success: false,
          message: '外部ID参数无效',
          code: 'INVALID_EXTERNAL_ID'
        };
      }
      const userInfo: UserInfo = {
        id: userIdentity.userId,
        type: userIdentity.userType,
        name: userIdentity.username || ''
      };

      // 调用服务层获取完整数据
      const result = await this.attendanceService.getCourseCompleteData(
        external_id,
        userInfo,
        type
      );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '获取课程完整数据成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取课程完整数据失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      this.logger.error(error, 'Failed to get complete course data');
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * 根据external_id获取课程信息接口
   * GET /api/icalink/v1/courses/external/:external_id
   */
  @Get('/api/icalink/v1/courses/external/:external_id')
  async getCourseByExternalId(
    request: FastifyRequest<{
      Params: { external_id: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { external_id } = request.params;

      // 获取用户身份信息
      const userIdentity = (request as any).userIdentity;

      this.logger.info(
        { external_id, userIdentity },
        'Getting course by external ID'
      );

      // 参数验证
      if (!external_id || typeof external_id !== 'string') {
        reply.status(400);
        return {
          success: false,
          message: '外部ID参数无效',
          code: 'INVALID_EXTERNAL_ID'
        };
      }

      // 调用AttendanceCourseRepository获取课程信息
      const courseResult =
        await this.attendanceCourseRepository.findByExternalId(external_id);

      if (!courseResult.success) {
        this.logger.error(
          { external_id, error: courseResult.error },
          'Failed to get course by external ID'
        );
        reply.status(500);
        return {
          success: false,
          message: courseResult.error?.message || '获取课程信息失败',
          code: 'COURSE_FETCH_ERROR'
        };
      }

      const course = courseResult.data;

      if (!course) {
        reply.status(404);
        return {
          success: false,
          message: '课程不存在',
          code: 'COURSE_NOT_FOUND'
        };
      }

      // 转换为API响应格式
      const courseInfo = {
        id: course.id,
        external_id: course.external_id,
        course_code: course.course_code,
        course_name: course.course_name,
        semester: course.semester,
        teaching_week: course.teaching_week,
        week_day: course.week_day,
        teacher_codes: course.teacher_codes,
        teacher_names: course.teacher_names,
        class_location: course.class_location,
        start_time: course.start_time.toISOString(),
        end_time: course.end_time.toISOString(),
        time_period: course.time_period,
        attendance_enabled: course.attendance_enabled,
        periods: course.periods,
        attendance_start_offset: course.attendance_start_offset,
        attendance_end_offset: course.attendance_end_offset,
        late_threshold: course.late_threshold,
        auto_absent_after: course.auto_absent_after,
        created_at: course.created_at.toISOString(),
        updated_at: course.updated_at.toISOString(),
        teacher_info:
          course.teacher_codes?.split(',').map((code, index) => ({
            teacher_id: code.trim(),
            teacher_name: course.teacher_names?.split(',')[index]?.trim() || '',
            department: undefined
          })) || []
      };

      this.logger.info(
        { external_id, courseId: course.id },
        'Course retrieved successfully'
      );

      return {
        success: true,
        message: '课程信息获取成功',
        data: courseInfo
      };
    } catch (error) {
      this.logger.error(error, 'Failed to get course by external ID');
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * API_02: 学生签到接口
   * POST /api/icalink/v1/attendance/:course_id/checkin
   */
  @Post('/api/icalink/v1/attendance/:course_id/checkin')
  async checkin(
    request: FastifyRequest<{
      Params: { course_id: string };
      Body: CheckinRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<CheckinResponse>> {
    try {
      const { course_id } = request.params;
      const checkinRequest = request.body;

      // 获取学生身份信息（直接从request.userIdentity）
      const userIdentity = (request as any).userIdentity;
      if (
        !userIdentity ||
        !userIdentity.userId ||
        userIdentity.userType !== 'student'
      ) {
        reply.status(403);
        return {
          success: false,
          message: '用户身份验证失败：需要学生权限',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      const studentInfo: UserInfo = {
        id: userIdentity.userId,
        type: 'student',
        name: userIdentity.username || ''
      };

      // 执行签到
      const result = await this.attendanceService.checkin(
        course_id,
        studentInfo,
        checkinRequest
      );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '签到成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '签到失败',
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
   * API_08: 课程历史考勤数据查询接口
   * GET /api/icalink/v1/courses/:kkh/attendance-history
   */
  @Get('/api/icalink/v1/courses/:kkh/attendance-history')
  async getAttendanceHistory(
    request: FastifyRequest<{
      Params: { kkh: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      // 获取用户信息（支持学生和教师）
      const userIdentity = (request as any).userIdentity;

      const userInfo: UserInfo = {
        id: userIdentity.userId,
        type: userIdentity.userType,
        name: userIdentity.username || ''
      };

      const result = await this.attendanceService.getAttendanceHistory(
        userInfo,
        request.query as any
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
   * API_09: 本次课学生考勤信息查询接口
   * GET /api/icalink/v1/courses/:course_id/current-attendance
   */
  @Get('/api/icalink/v1/courses/:course_id/current-attendance')
  async getCurrentAttendance(
    request: FastifyRequest<{
      Params: { course_id: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { course_id } = request.params;

      // 获取教师身份信息
      const userIdentity = (request as any).userIdentity;
      if (
        !userIdentity ||
        !userIdentity.userId ||
        userIdentity.userType !== 'teacher'
      ) {
        reply.status(401);
        return {
          success: false,
          message: '用户身份验证失败：需要教师权限',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      const teacherInfo: UserInfo = {
        id: userIdentity.userId,
        type: 'teacher',
        name: userIdentity.username || ''
      };

      const result = await this.attendanceService.getCurrentAttendance(
        course_id,
        teacherInfo
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
   * API_10: 本课程学生考勤记录统计接口
   * GET /api/icalink/v1/courses/:kkh/attendance-statistics
   */
  @Get('/api/icalink/v1/courses/:kkh/attendance-statistics')
  async getAttendanceStatistics(
    request: FastifyRequest<{
      Params: { kkh: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      // 获取教师身份信息
      const userIdentity = (request as any).userIdentity;
      if (
        !userIdentity ||
        !userIdentity.userId ||
        userIdentity.userType !== 'teacher'
      ) {
        reply.status(401);
        return {
          success: false,
          message: '用户身份验证失败：需要教师权限',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      const teacherInfo: UserInfo = {
        id: userIdentity.userId,
        type: 'teacher',
        name: userIdentity.username || ''
      };

      const result = await this.attendanceService.getAttendanceStatistics(
        teacherInfo,
        request.query as any
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
   * API_11: 课程历史考勤数据接口
   * GET /api/icalink/v1/attendance/course/{course_id}/history
   */
  @Get('/api/icalink/v1/attendance/course/:course_id/history')
  async getCourseAttendanceHistory(
    request: FastifyRequest<{
      Params: { course_id: string };
      Querystring: { xnxq?: string; start_date?: string; end_date?: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { course_id } = request.params;
      const { xnxq, start_date, end_date } = request.query;

      // 获取用户身份信息（支持学生和教师）
      const userIdentity = (request as any).userIdentity;

      const userInfo: UserInfo = {
        id: userIdentity.userId,
        type: userIdentity.userType,
        name: userIdentity.username || ''
      };

      this.logger.info(
        {
          course_id,
          xnxq,
          start_date,
          end_date,
          userId: userInfo.id,
          userType: userInfo.type
        },
        'Getting course attendance history'
      );

      // 调用服务层获取课程历史考勤数据
      const result =
        await this.attendanceService.getCourseAttendanceHistoryById(
          course_id,
          userInfo,
          { xnxq, start_date, end_date }
        );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '获取课程历史考勤数据成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取课程历史考勤数据失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      this.logger.error(error, 'Failed to get course attendance history');
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * API_12: 个人课程统计接口
   * GET /api/icalink/v1/attendance/course/{course_id}/stats
   */
  @Get('/api/icalink/v1/attendance/course/:course_id/stats')
  async getPersonalCourseStats(
    request: FastifyRequest<{
      Params: { course_id: string };
      Querystring: { xnxq?: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { course_id } = request.params;
      const { xnxq } = request.query;

      // 获取用户身份信息（仅支持教师）
      const userIdentity = (request as any).userIdentity;

      const userInfo: UserInfo = {
        id: userIdentity.userId,
        type: userIdentity.userType,
        name: userIdentity.username || ''
      };

      this.logger.info(
        { course_id, xnxq, userId: userInfo.id, userType: userInfo.type },
        'Getting personal course stats'
      );

      // 调用服务层获取个人课程统计数据
      const result = await this.attendanceService.getPersonalCourseStatsById(
        course_id,
        userInfo,
        { xnxq }
      );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '获取个人课程统计数据成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取个人课程统计数据失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      this.logger.error(error, 'Failed to get personal course stats');
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * 学生查询请假申请列表接口
   * GET /api/icalink/v1/attendance/leave-applications
   */
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
    try {
      // 获取用户身份信息 - 只允许学生访问
      const userIdentity = (request as any).userIdentity;
      if (
        !userIdentity ||
        !userIdentity.userId ||
        userIdentity.userType !== 'student'
      ) {
        reply.status(401);
        return {
          success: false,
          message: '用户身份验证失败：需要学生权限',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      const studentInfo: UserInfo = {
        id: userIdentity.userId,
        type: 'student',
        name: userIdentity.username || ''
      };

      const {
        status = 'all',
        page = 1,
        page_size = 50,
        start_date,
        end_date
      } = request.query;

      this.logger.info(
        {
          studentId: studentInfo.id,
          status,
          page,
          page_size
        },
        'Getting student leave applications'
      );

      // 调用请假服务获取申请列表
      const result = await this.leaveService.queryLeaveApplications(
        studentInfo,
        {
          status: status as LeaveStatus | 'all' | undefined,
          page,
          page_size,
          start_date,
          end_date
        }
      );

      if (isSuccessResult(result)) {
        // 计算统计信息
        const applications = result.data.applications || [];
        const stats = {
          total_count: applications.length,
          leave_pending_count: applications.filter(
            (app: any) => app.status === 'leave_pending'
          ).length,
          leave_count: applications.filter((app: any) => app.status === 'leave')
            .length,
          leave_rejected_count: applications.filter(
            (app: any) => app.status === 'leave_rejected'
          ).length
        };

        return {
          success: true,
          message: '获取请假申请列表成功',
          data: {
            applications: applications.map((app: any) => ({
              id: app.id,
              course_name: app.course_name,
              class_date: app.class_date,
              class_time: app.class_time,
              class_location: app.class_location,
              teacher_name: app.teacher_name,
              leave_type: app.leave_type,
              leave_reason: app.leave_reason,
              status: app.status,
              application_time: app.application_time,
              approval_time: app.approval_time,
              approval_comment: app.approval_comment,
              course_info: {
                kcmc: app.course_name,
                room_s: app.class_location,
                xm_s: app.teacher_name,
                jc_s: app.periods || '1-2',
                jxz: app.teaching_week || null,
                lq: app.building || null,
                course_start_time:
                  app.class_start_time ||
                  app.class_date +
                    ' ' +
                    (app.class_time?.split('-')[0] || '08:00'),
                course_end_time:
                  app.class_end_time ||
                  app.class_date +
                    ' ' +
                    (app.class_time?.split('-')[1] || '09:40')
              },
              attachments: app.attachments || [],
              approvals: app.approvals || []
            })),
            total: result.data.pagination?.total || applications.length,
            page: result.data.pagination?.page || page,
            page_size: result.data.pagination?.page_size || page_size,
            stats
          }
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取请假申请列表失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      this.logger.error(error, 'Failed to get student leave applications');
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * 学生撤回请假申请接口
   * POST /api/icalink/v1/attendance/withdraw-leave
   */
  @Post('/api/icalink/v1/attendance/withdraw-leave')
  async withdrawLeaveApplication(
    request: FastifyRequest<{
      Body: {
        attendance_record_id: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      // 获取用户身份信息 - 只允许学生访问
      const userIdentity = (request as any).userIdentity;
      if (
        !userIdentity ||
        !userIdentity.userId ||
        userIdentity.userType !== 'student'
      ) {
        reply.status(401);
        return {
          success: false,
          message: '用户身份验证失败：需要学生权限',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      const studentInfo: UserInfo = {
        id: userIdentity.userId,
        type: 'student',
        name: userIdentity.username || ''
      };

      const { attendance_record_id } = request.body;

      if (!attendance_record_id) {
        reply.status(400);
        return {
          success: false,
          message: '缺少必要参数：attendance_record_id',
          code: 'MISSING_REQUIRED_PARAMS'
        };
      }

      this.logger.info(
        {
          studentId: studentInfo.id,
          attendance_record_id
        },
        'Withdrawing leave application'
      );

      // 调用请假服务撤回申请
      const result = await this.leaveService.withdrawLeaveApplication(
        parseInt(attendance_record_id),
        studentInfo
      );

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '撤回请假申请成功',
          data: {
            deleted_attendance_id: attendance_record_id,
            cancelled_approval_ids: [],
            withdraw_time: new Date().toISOString()
          }
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '撤回请假申请失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      this.logger.error(error, 'Failed to withdraw leave application');
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * 获取整体考勤统计接口
   * GET /api/icalink/v1/attendance/overall-stats
   */
  @Get('/api/icalink/v1/attendance/overall-stats')
  async getOverallStats(
    request: FastifyRequest<{
      Querystring: {
        xnxq?: string;
        start_date?: string;
        end_date?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      // 获取用户身份信息
      const userIdentity = (request as any).userIdentity;
      if (
        !userIdentity ||
        !userIdentity.userId ||
        userIdentity.userType !== 'teacher'
      ) {
        reply.status(401);
        return {
          success: false,
          message: '用户身份验证失败：需要教师权限',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      const teacherInfo: UserInfo = {
        id: userIdentity.userId,
        type: 'teacher',
        name: userIdentity.username || ''
      };

      const { xnxq, start_date, end_date } = request.query;

      this.logger.info(
        {
          teacherId: teacherInfo.id,
          xnxq,
          start_date,
          end_date
        },
        'Getting overall attendance stats'
      );

      // 调用服务层获取整体统计
      const result = await this.attendanceService.getTeacherAttendanceOverview(
        teacherInfo.id,
        xnxq
      );

      if (isSuccessResult(result)) {
        // 转换为前端期望的格式
        return {
          success: true,
          message: '获取整体统计成功',
          data: {
            total_courses: result.data.totalCourses,
            class_size: result.data.totalStudents,
            average_attendance_rate: result.data.overallAttendanceRate / 100, // 转换为小数
            total_leave_count: 0, // 需要从统计中计算
            total_absent_count: 0 // 需要从统计中计算
          }
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取整体统计失败',
          code: result.error?.code
        };
      }
    } catch (error) {
      this.logger.error(error, 'Failed to get overall stats');
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * 获取班级考勤排名接口
   * GET /api/icalink/v1/attendance/class-ranking
   */
  @Get('/api/icalink/v1/attendance/class-ranking')
  async getClassAttendanceRanking(
    request: FastifyRequest<{
      Querystring: {
        xnxq?: string;
        bjmc?: string;
        limit?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      // 获取用户身份信息
      const userIdentity = (request as any).userIdentity;
      if (
        !userIdentity ||
        !userIdentity.userId ||
        userIdentity.userType !== 'teacher'
      ) {
        reply.status(401);
        return {
          success: false,
          message: '用户身份验证失败：需要教师权限',
          code: ServiceErrorCode.UNAUTHORIZED
        };
      }

      const teacherInfo: UserInfo = {
        id: userIdentity.userId,
        type: 'teacher',
        name: userIdentity.username || ''
      };

      const { xnxq, bjmc, limit = 10 } = request.query;

      this.logger.info(
        {
          teacherId: teacherInfo.id,
          xnxq,
          bjmc,
          limit
        },
        'Getting class attendance ranking'
      );

      // 获取教师的课程列表
      const coursesResult = await this.attendanceCourseRepository.findByTeacher(
        teacherInfo.id,
        xnxq
      );

      if (!isSuccessResult(coursesResult)) {
        return {
          success: true,
          message: '暂无数据',
          data: []
        };
      }

      const courses = coursesResult.data || [];
      const studentStatsMap = new Map();

      // 遍历每个课程，统计学生数据
      for (const course of courses) {
        const recordsResult =
          await this.attendanceRecordRepository.findByConditions({
            attendance_course_id: course.id
          });

        if (isSuccessResult(recordsResult) && recordsResult.data) {
          for (const record of recordsResult.data) {
            const studentId = record.student_id;

            if (!studentStatsMap.has(studentId)) {
              studentStatsMap.set(studentId, {
                student: {
                  xh: record.student_id,
                  xm: record.student_name,
                  bjmc: record.class_name || '',
                  zymc: record.major_name || ''
                },
                total_courses: 0,
                present_count: 0,
                leave_count: 0,
                absent_count: 0,
                attendance_rate: 0
              });
            }

            const stats = studentStatsMap.get(studentId);
            stats.total_courses++;

            switch (record.status) {
              case 'present':
                stats.present_count++;
                break;
              case 'leave':
              case 'leave_pending':
                stats.leave_count++;
                break;
              case 'absent':
                stats.absent_count++;
                break;
            }
          }
        }
      }

      // 计算出勤率并排序
      const ranking = Array.from(studentStatsMap.values())
        .map((stats: any) => ({
          ...stats,
          attendance_rate:
            stats.total_courses > 0
              ? stats.present_count / stats.total_courses
              : 0
        }))
        .sort((a: any, b: any) => b.attendance_rate - a.attendance_rate)
        .slice(0, limit);

      return {
        success: true,
        message: '获取班级排名成功',
        data: ranking
      };
    } catch (error) {
      this.logger.error(error, 'Failed to get class attendance ranking');
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      };
    }
  }

  /**
   * 导出考勤数据接口
   * GET /api/icalink/v1/attendance/export
   */
  @Get('/api/icalink/v1/attendance/export')
  async exportAttendanceData(
    request: FastifyRequest<{
      Querystring: {
        xnxq?: string;
        start_date?: string;
        end_date?: string;
        format?: 'csv' | 'excel' | 'pdf';
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 获取用户身份信息
      const userIdentity = (request as any).userIdentity;
      if (
        !userIdentity ||
        !userIdentity.userId ||
        userIdentity.userType !== 'teacher'
      ) {
        reply.status(401);
        reply.send({
          success: false,
          message: '用户身份验证失败：需要教师权限',
          code: ServiceErrorCode.UNAUTHORIZED
        });
        return;
      }

      const teacherInfo: UserInfo = {
        id: userIdentity.userId,
        type: 'teacher',
        name: userIdentity.username || ''
      };

      const { xnxq, start_date, end_date, format = 'excel' } = request.query;

      this.logger.info(
        {
          teacherId: teacherInfo.id,
          xnxq,
          start_date,
          end_date,
          format
        },
        'Exporting attendance data'
      );

      // 获取考勤数据进行导出
      const coursesResult = await this.attendanceCourseRepository.findByTeacher(
        teacherInfo.id,
        xnxq
      );

      if (!isSuccessResult(coursesResult)) {
        reply.status(400);
        reply.send({
          success: false,
          message: '获取课程数据失败',
          code: 'COURSE_FETCH_ERROR'
        });
        return;
      }

      // 构建CSV内容
      let csvContent = '课程名称,学生学号,学生姓名,班级,考勤状态,签到时间\n';

      const courses = coursesResult.data || [];
      for (const course of courses) {
        const recordsResult =
          await this.attendanceRecordRepository.findByConditions({
            attendance_course_id: course.id
          });

        if (isSuccessResult(recordsResult) && recordsResult.data) {
          for (const record of recordsResult.data) {
            const statusMap = {
              present: '出勤',
              absent: '缺勤',
              leave: '请假',
              leave_pending: '请假审批中',
              not_started: '未开始'
            };

            csvContent += `"${course.course_name}","${record.student_id}","${record.student_name}","${record.class_name || ''}","${statusMap[record.status as keyof typeof statusMap] || record.status}","${record.checkin_time ? record.checkin_time.toLocaleString() : ''}"\n`;
          }
        }
      }

      // 设置响应头
      const fileName = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

      // 添加BOM以支持Excel正确显示中文
      const bom = '\uFEFF';
      reply.send(bom + csvContent);
    } catch (error) {
      this.logger.error(error, 'Failed to export attendance data');
      reply.status(500);
      reply.send({
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      });
    }
  }

  /**
   * 查看请假附件图片接口
   * GET /api/icalink/v1/attendance/attachments/:id/image
   */
  @Get('/api/icalink/v1/attendance/attachments/:id/image')
  async getAttachmentImage(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { thumbnail?: boolean };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 获取用户身份信息
      const userIdentity = (request as any).userIdentity;
      if (
        !userIdentity ||
        !userIdentity.userId ||
        !['student', 'teacher'].includes(userIdentity.userType)
      ) {
        reply.status(401);
        reply.send({
          success: false,
          message: '用户身份验证失败：需要学生或教师权限',
          code: ServiceErrorCode.UNAUTHORIZED
        });
        return;
      }

      const userInfo: UserInfo = {
        id: userIdentity.userId,
        type: userIdentity.userType,
        name: userIdentity.username || ''
      };

      const { id } = request.params;
      const { thumbnail = false } = request.query;

      if (!id || isNaN(parseInt(id))) {
        reply.status(400);
        reply.send({
          success: false,
          message: '无效的附件ID',
          code: 'INVALID_ATTACHMENT_ID'
        });
        return;
      }

      this.logger.info(
        {
          userId: userInfo.id,
          userType: userInfo.type,
          attachmentId: id,
          thumbnail
        },
        'Getting attachment image'
      );

      // 调用请假服务下载附件
      const result = await this.leaveService.downloadAttachmentById(
        parseInt(id),
        userInfo,
        thumbnail
      );

      if (isSuccessResult(result)) {
        const { fileName, fileContent, mimeType } = result.data;

        // 设置响应头
        reply.header('Content-Type', mimeType);
        reply.header(
          'Content-Disposition',
          `inline; filename="${encodeURIComponent(fileName)}"`
        );
        reply.header('Cache-Control', 'public, max-age=3600');

        // 发送文件内容
        reply.send(fileContent);
      } else {
        reply.status(404);
        reply.send({
          success: false,
          message: result.error?.message || '附件不存在',
          code: result.error?.code
        });
      }
    } catch (error) {
      this.logger.error(error, 'Failed to get attachment image');
      reply.status(500);
      reply.send({
        success: false,
        message: '服务器内部错误',
        code: ServiceErrorCode.UNKNOWN_ERROR
      });
    }
  }
}
