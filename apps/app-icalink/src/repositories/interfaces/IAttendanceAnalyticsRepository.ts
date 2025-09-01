import {
  AttendanceAnalyticsRequest,
  AttendanceRankingRequest,
  ClassAttendanceStats,
  ClassRanking,
  CourseAttendanceStats,
  CourseRanking,
  PaginatedAnalyticsResponse,
  StudentAttendanceStats,
  StudentRanking,
  TeacherAttendanceStats,
  TeacherRanking
} from '../../types/analytics.js';

export interface IAttendanceAnalyticsRepository {
  // 课程维度统计
  getCourseAttendanceStats(
    request: AttendanceAnalyticsRequest
  ): Promise<PaginatedAnalyticsResponse<CourseAttendanceStats>>;

  getCourseAttendanceStatsByKkh(
    kkh: string,
    request: AttendanceAnalyticsRequest
  ): Promise<CourseAttendanceStats | null>;

  // 教师维度统计
  getTeacherAttendanceStats(
    request: AttendanceAnalyticsRequest
  ): Promise<PaginatedAnalyticsResponse<TeacherAttendanceStats>>;

  getTeacherAttendanceStatsByTeacherId(
    teacherId: string,
    request: AttendanceAnalyticsRequest
  ): Promise<TeacherAttendanceStats | null>;

  // 学生维度统计
  getStudentAttendanceStats(
    request: AttendanceAnalyticsRequest
  ): Promise<PaginatedAnalyticsResponse<StudentAttendanceStats>>;

  getStudentAttendanceStatsByStudentId(
    studentId: string,
    request: AttendanceAnalyticsRequest
  ): Promise<StudentAttendanceStats | null>;

  // 教学班维度统计
  getClassAttendanceStats(
    request: AttendanceAnalyticsRequest
  ): Promise<PaginatedAnalyticsResponse<ClassAttendanceStats>>;

  getClassAttendanceStatsByClassName(
    className: string,
    request: AttendanceAnalyticsRequest
  ): Promise<ClassAttendanceStats | null>;

  // 排行榜功能
  getStudentRanking(
    request: AttendanceRankingRequest
  ): Promise<PaginatedAnalyticsResponse<StudentRanking>>;

  getCourseRanking(
    request: AttendanceRankingRequest
  ): Promise<PaginatedAnalyticsResponse<CourseRanking>>;

  getClassRanking(
    request: AttendanceRankingRequest
  ): Promise<PaginatedAnalyticsResponse<ClassRanking>>;

  getTeacherRanking(
    request: AttendanceRankingRequest
  ): Promise<PaginatedAnalyticsResponse<TeacherRanking>>;

  // 通用统计查询
  getOverallAttendanceStats(request: AttendanceAnalyticsRequest): Promise<{
    total_courses: number;
    total_students: number;
    total_classes: number;
    total_present: number;
    total_leave: number;
    total_absent: number;
    average_attendance_rate: number;
  }>;
}
