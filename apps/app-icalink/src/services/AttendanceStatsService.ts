// @wps/app-icalink 签到统计服务实现
// 实现签到数据统计相关的业务逻辑

import { Logger } from '@stratix/core';
import { IAttendanceStatsRepository } from '../repositories/interfaces/IAttendanceStatsRepository.js';
import {
  AttendanceRateExplanation,
  AttendanceStatsQuery,
  AttendanceStatsResponse,
  CourseAttendanceStats,
  RankingItem,
  StudentAttendanceStats,
  TeacherAttendanceStats
} from '../types/attendance-stats.types.js';
import {
  ServiceErrorCode,
  ServiceResult,
  wrapServiceCall
} from '../types/service.js';
import { IAttendanceStatsService } from './interfaces/IAttendanceStatsService.js';

/**
 * 签到统计服务实现类
 * 实现IAttendanceStatsService接口，提供签到数据统计业务逻辑
 */
export default class AttendanceStatsService implements IAttendanceStatsService {
  constructor(
    private readonly attendanceStatsRepository: IAttendanceStatsRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取课程维度的出勤统计
   */
  async getCourseAttendanceStats(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<CourseAttendanceStats>>> {
    return wrapServiceCall(async () => {
      // 验证查询参数
      const validationResult = await this.validateQuery(query);
      if (!validationResult.success) {
        throw new Error(
          validationResult.error?.message || 'Invalid query parameters'
        );
      }

      // 调用Repository层获取数据
      const result =
        await this.attendanceStatsRepository.getCourseAttendanceStats(query);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get course attendance stats'
        );
      }

      if (!result.data) {
        throw new Error('No data returned from repository');
      }

      // 添加出勤率计算说明
      const response = result.data;
      if (!response.explanation) {
        response.explanation = await this.getAttendanceRateExplanationData();
      }

      this.logger.info('Course attendance stats retrieved successfully', {
        query,
        resultCount: response.data?.length || 0
      });

      return response;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取教师维度的出勤统计
   */
  async getTeacherAttendanceStats(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<TeacherAttendanceStats>>> {
    return wrapServiceCall(async () => {
      const validationResult = await this.validateQuery(query);
      if (!validationResult.success) {
        throw new Error(
          validationResult.error?.message || 'Invalid query parameters'
        );
      }

      const result =
        await this.attendanceStatsRepository.getTeacherAttendanceStats(query);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get teacher attendance stats'
        );
      }

      if (!result.data) {
        throw new Error('No data returned from repository');
      }

      this.logger.info('Teacher attendance stats retrieved successfully', {
        query,
        resultCount: result.data.data?.length || 0
      });

      return result.data;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取学生维度的出勤统计
   */
  async getStudentAttendanceStats(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<StudentAttendanceStats>>> {
    return wrapServiceCall(async () => {
      const validationResult = await this.validateQuery(query);
      if (!validationResult.success) {
        throw new Error(
          validationResult.error?.message || 'Invalid query parameters'
        );
      }

      const result =
        await this.attendanceStatsRepository.getStudentAttendanceStats(query);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get student attendance stats'
        );
      }

      if (!result.data) {
        throw new Error('No data returned from repository');
      }

      this.logger.info('Student attendance stats retrieved successfully', {
        query,
        resultCount: result.data.data?.length || 0
      });

      return result.data;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取学生出勤率排行榜
   */
  async getStudentAttendanceRankings(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<RankingItem>>> {
    return wrapServiceCall(async () => {
      const validationResult = await this.validateQuery(query);
      if (!validationResult.success) {
        throw new Error(
          validationResult.error?.message || 'Invalid query parameters'
        );
      }

      const result =
        await this.attendanceStatsRepository.getStudentAttendanceRankings(
          query
        );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get student attendance rankings'
        );
      }

      if (!result.data) {
        throw new Error('No data returned from repository');
      }

      this.logger.info('Student attendance rankings retrieved successfully', {
        query,
        resultCount: result.data.data?.length || 0
      });

      return result.data;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取课程出勤率排行榜
   */
  async getCourseAttendanceRankings(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<RankingItem>>> {
    return wrapServiceCall(async () => {
      const validationResult = await this.validateQuery(query);
      if (!validationResult.success) {
        throw new Error(
          validationResult.error?.message || 'Invalid query parameters'
        );
      }

      const result =
        await this.attendanceStatsRepository.getCourseAttendanceRankings(query);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get course attendance rankings'
        );
      }

      if (!result.data) {
        throw new Error('No data returned from repository');
      }

      this.logger.info('Course attendance rankings retrieved successfully', {
        query,
        resultCount: result.data.data?.length || 0
      });

      return result.data;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取整体出勤统计概览
   */
  async getOverallAttendanceStats(query: AttendanceStatsQuery): Promise<
    ServiceResult<{
      total_courses: number;
      total_students: number;
      total_classes: number;
      overall_attendance_rate: number;
      trend_data: Array<{
        date: string;
        attendance_rate: number;
        class_count: number;
      }>;
    }>
  > {
    return wrapServiceCall(async () => {
      const validationResult = await this.validateQuery(query);
      if (!validationResult.success) {
        throw new Error(
          validationResult.error?.message || 'Invalid query parameters'
        );
      }

      const result =
        await this.attendanceStatsRepository.getOverallAttendanceStats(query);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get overall attendance stats'
        );
      }

      if (!result.data) {
        throw new Error('No data returned from repository');
      }

      this.logger.info('Overall attendance stats retrieved successfully', {
        query,
        totalCourses: result.data.total_courses || 0,
        totalStudents: result.data.total_students || 0,
        overallRate: result.data.overall_attendance_rate || 0
      });

      return result.data;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取出勤率计算说明
   */
  async getAttendanceRateExplanation(): Promise<
    ServiceResult<AttendanceRateExplanation>
  > {
    return wrapServiceCall(async () => {
      return this.getAttendanceRateExplanationData();
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 验证查询参数
   */
  async validateQuery(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      // 验证分页参数
      if (query.page && query.page < 1) {
        throw new Error('页码必须大于0');
      }

      if (query.page_size && (query.page_size < 1 || query.page_size > 1000)) {
        throw new Error('每页大小必须在1-1000之间');
      }

      // 验证日期参数
      if (
        query.start_date &&
        query.end_date &&
        query.start_date > query.end_date
      ) {
        throw new Error('开始日期不能晚于结束日期');
      }

      // 验证排序参数
      if (
        query.sort_by &&
        ![
          'attendance_rate',
          'class_count',
          'course_count',
          'last_class_time'
        ].includes(query.sort_by)
      ) {
        throw new Error('无效的排序字段');
      }

      if (query.sort_order && !['asc', 'desc'].includes(query.sort_order)) {
        throw new Error('无效的排序方向');
      }

      return true;
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 获取出勤率计算说明数据
   */
  private getAttendanceRateExplanationData(): AttendanceRateExplanation {
    return {
      formula: '出勤率 = (实际出勤人数 + 请假人数) / 应签到人数 × 100%',
      description:
        '实际出勤人数包括正常签到和迟到签到的学生，请假人数为已批准请假的学生，应签到人数为选课学生总数',
      status_explanation: {
        present: '正常签到 - 在规定时间内完成签到，计入出勤',
        late: '迟到签到 - 超过规定时间但在允许范围内签到，计入出勤',
        leave: '请假 - 已批准的请假申请，计入出勤',
        absent: '缺勤 - 未签到且未请假，不计入出勤'
      }
    };
  }
}
