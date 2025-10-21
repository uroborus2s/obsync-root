// @wps/app-icalink 签到统计服务接口
// 定义签到数据统计相关的业务逻辑接口

import type { ServiceError } from '@stratix/core';
import type { Either } from '@stratix/utils/functional';
import {
  AttendanceRateExplanation,
  AttendanceStatsQuery,
  AttendanceStatsResponse,
  CourseAttendanceStats,
  RankingItem,
  StudentAttendanceStats,
  TeacherAttendanceStats
} from '../../types/attendance-stats.types.js';

/**
 * 签到统计服务接口
 * 提供各种维度的签到数据统计业务逻辑
 */
export interface IAttendanceStatsService {
  /**
   * 获取课程维度的出勤统计
   * @param query 查询条件
   * @returns 课程出勤统计数据
   */
  getCourseAttendanceStats(
    query: AttendanceStatsQuery
  ): Promise<
    Either<ServiceError, AttendanceStatsResponse<CourseAttendanceStats>>
  >;

  /**
   * 获取教师维度的出勤统计
   * @param query 查询条件
   * @returns 教师出勤统计数据
   */
  getTeacherAttendanceStats(
    query: AttendanceStatsQuery
  ): Promise<
    Either<ServiceError, AttendanceStatsResponse<TeacherAttendanceStats>>
  >;

  /**
   * 获取学生维度的出勤统计
   * @param query 查询条件
   * @returns 学生出勤统计数据
   */
  getStudentAttendanceStats(
    query: AttendanceStatsQuery
  ): Promise<
    Either<ServiceError, AttendanceStatsResponse<StudentAttendanceStats>>
  >;

  /**
   * 获取学生出勤率排行榜
   * @param query 查询条件
   * @returns 学生出勤率排行数据
   */
  getStudentAttendanceRankings(
    query: AttendanceStatsQuery
  ): Promise<Either<ServiceError, AttendanceStatsResponse<RankingItem>>>;

  /**
   * 获取课程出勤率排行榜
   * @param query 查询条件
   * @returns 课程出勤率排行数据
   */
  getCourseAttendanceRankings(
    query: AttendanceStatsQuery
  ): Promise<Either<ServiceError, AttendanceStatsResponse<RankingItem>>>;

  /**
   * 获取整体出勤统计概览
   * @param query 查询条件
   * @returns 整体统计数据
   */
  getOverallAttendanceStats(query: AttendanceStatsQuery): Promise<
    Either<
      ServiceError,
      {
        total_courses: number;
        total_students: number;
        total_classes: number;
        overall_attendance_rate: number;
        trend_data: Array<{
          date: string;
          attendance_rate: number;
          class_count: number;
        }>;
      }
    >
  >;

  /**
   * 获取出勤率计算说明
   * @returns 出勤率计算规则说明
   */
  getAttendanceRateExplanation(): Promise<
    Either<ServiceError, AttendanceRateExplanation>
  >;

  /**
   * 验证查询参数
   * @param query 查询条件
   * @returns 验证结果
   */
  validateQuery(
    query: AttendanceStatsQuery
  ): Promise<Either<ServiceError, boolean>>;
  /**
   * @description Archives and summarizes daily attendance data for a given date.
   * This is the main entry point for the daily cron job.
   * @param date - The target date in 'YYYY-MM-DD' format.
   */
  archiveAndSummarizeDailyData(date: string): Promise<
    Either<
      ServiceError,
      {
        processedCourses: number;
        archivedRecords: bigint;
        deletedRecords: bigint;
      }
    >
  >;
}
