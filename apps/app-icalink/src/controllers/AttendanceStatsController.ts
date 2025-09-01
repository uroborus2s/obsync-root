// @wps/app-icalink 签到统计控制器
// 提供签到数据统计相关的HTTP接口

import { Controller, Get, FastifyReply, FastifyRequest } from '@stratix/core';
import { IAttendanceStatsService } from '../services/interfaces/IAttendanceStatsService.js';
import { ApiResponse } from '../types/api.js';
import { AttendanceStatsQuery } from '../types/attendance-stats.types.js';
import { ServiceErrorCode, isSuccessResult } from '../types/service.js';

/**
 * 签到统计控制器
 * 提供各种维度的签到数据统计HTTP接口
 */
@Controller()
export default class AttendanceStatsController {
  constructor(
    private readonly attendanceStatsService: IAttendanceStatsService
  ) {}

  /**
   * 获取课程维度的出勤统计
   * GET /api/icalink/v1/attendance/stats/courses
   */
  @Get('/api/icalink/v1/attendance/stats/courses')
  async getCourseStats(
    request: FastifyRequest<{
      Querystring: {
        semester?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        page_size?: number;
        sort_by?: 'attendance_rate' | 'class_count' | 'last_class_time';
        sort_order?: 'asc' | 'desc';
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const query: AttendanceStatsQuery = {
        semester: request.query.semester,
        start_date: request.query.start_date
          ? new Date(request.query.start_date)
          : undefined,
        end_date: request.query.end_date
          ? new Date(request.query.end_date)
          : undefined,
        page: request.query.page || 1,
        page_size: request.query.page_size || 20,
        sort_by: request.query.sort_by || 'attendance_rate',
        sort_order: request.query.sort_order || 'desc'
      };

      const result =
        await this.attendanceStatsService.getCourseAttendanceStats(query);

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '课程出勤统计获取成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取课程出勤统计失败',
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
   * 获取教师维度的出勤统计
   * GET /api/icalink/v1/attendance/stats/teachers
   */
  @Get('/api/icalink/v1/attendance/stats/teachers')
  async getTeacherStats(
    request: FastifyRequest<{
      Querystring: {
        semester?: string;
        start_date?: string;
        end_date?: string;
        teacher_code?: string;
        page?: number;
        page_size?: number;
        sort_by?: 'attendance_rate' | 'class_count' | 'course_count';
        sort_order?: 'asc' | 'desc';
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const query: AttendanceStatsQuery = {
        semester: request.query.semester,
        start_date: request.query.start_date
          ? new Date(request.query.start_date)
          : undefined,
        end_date: request.query.end_date
          ? new Date(request.query.end_date)
          : undefined,
        teacher_code: request.query.teacher_code,
        page: request.query.page || 1,
        page_size: request.query.page_size || 20,
        sort_by: request.query.sort_by || 'attendance_rate',
        sort_order: request.query.sort_order || 'desc'
      };

      const result =
        await this.attendanceStatsService.getTeacherAttendanceStats(query);

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '教师出勤统计获取成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取教师出勤统计失败',
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
   * 获取学生维度的出勤统计
   * GET /api/icalink/v1/attendance/stats/students
   */
  @Get('/api/icalink/v1/attendance/stats/students')
  async getStudentStats(
    request: FastifyRequest<{
      Querystring: {
        semester?: string;
        start_date?: string;
        end_date?: string;
        course_code?: string;
        student_id?: string;
        page?: number;
        page_size?: number;
        sort_by?: 'attendance_rate' | 'course_count';
        sort_order?: 'asc' | 'desc';
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const query: AttendanceStatsQuery = {
        semester: request.query.semester,
        start_date: request.query.start_date
          ? new Date(request.query.start_date)
          : undefined,
        end_date: request.query.end_date
          ? new Date(request.query.end_date)
          : undefined,
        course_code: request.query.course_code,
        student_id: request.query.student_id,
        page: request.query.page || 1,
        page_size: request.query.page_size || 20,
        sort_by: request.query.sort_by || 'attendance_rate',
        sort_order: request.query.sort_order || 'desc'
      };

      const result =
        await this.attendanceStatsService.getStudentAttendanceStats(query);

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '学生出勤统计获取成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取学生出勤统计失败',
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
   * 获取整体出勤统计概览
   * GET /api/icalink/v1/attendance/stats/overview
   */
  @Get('/api/icalink/v1/attendance/stats/overview')
  async getOverallStats(
    request: FastifyRequest<{
      Querystring: {
        semester?: string;
        start_date?: string;
        end_date?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const query: AttendanceStatsQuery = {
        semester: request.query.semester,
        start_date: request.query.start_date
          ? new Date(request.query.start_date)
          : undefined,
        end_date: request.query.end_date
          ? new Date(request.query.end_date)
          : undefined
      };

      const result =
        await this.attendanceStatsService.getOverallAttendanceStats(query);

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '整体出勤统计获取成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取整体出勤统计失败',
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
   * 获取出勤率计算说明
   * GET /api/icalink/v1/attendance/stats/explanation
   */
  @Get('/api/icalink/v1/attendance/stats/explanation')
  async getExplanation(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const result =
        await this.attendanceStatsService.getAttendanceRateExplanation();

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '出勤率计算说明获取成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取出勤率计算说明失败',
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
   * 获取学生出勤率排行榜
   * GET /api/icalink/v1/attendance/stats/rankings/students
   */
  @Get('/api/icalink/v1/attendance/stats/rankings/students')
  async getStudentRankings(
    request: FastifyRequest<{
      Querystring: {
        semester?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        page_size?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const query: AttendanceStatsQuery = {
        semester: request.query.semester,
        start_date: request.query.start_date
          ? new Date(request.query.start_date)
          : undefined,
        end_date: request.query.end_date
          ? new Date(request.query.end_date)
          : undefined,
        page: request.query.page || 1,
        page_size: request.query.page_size || 50
      };

      const result =
        await this.attendanceStatsService.getStudentAttendanceRankings(query);

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '学生出勤率排行榜获取成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取学生出勤率排行榜失败',
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
   * 获取课程出勤率排行榜
   * GET /api/icalink/v1/attendance/stats/rankings/courses
   */
  @Get('/api/icalink/v1/attendance/stats/rankings/courses')
  async getCourseRankings(
    request: FastifyRequest<{
      Querystring: {
        semester?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        page_size?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const query: AttendanceStatsQuery = {
        semester: request.query.semester,
        start_date: request.query.start_date
          ? new Date(request.query.start_date)
          : undefined,
        end_date: request.query.end_date
          ? new Date(request.query.end_date)
          : undefined,
        page: request.query.page || 1,
        page_size: request.query.page_size || 50
      };

      const result =
        await this.attendanceStatsService.getCourseAttendanceRankings(query);

      if (isSuccessResult(result)) {
        return {
          success: true,
          message: '课程出勤率排行榜获取成功',
          data: result.data
        };
      } else {
        reply.status(400);
        return {
          success: false,
          message: result.error?.message || '获取课程出勤率排行榜失败',
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
}
