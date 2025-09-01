// @wps/app-icalink 考勤服务接口
// 基于 Stratix 框架的服务接口定义

import type {
  AttendanceHistoryParams,
  AttendanceHistoryResponse,
  AttendanceStatisticsParams,
  AttendanceStatisticsResponse,
  CheckinRequest,
  CheckinResponse,
  CurrentAttendanceResponse,
  UserInfo
} from '../../types/api.js';
import type { ServiceResult } from '../../types/service.js';

/**
 * 考勤服务接口
 * 提供考勤相关的业务逻辑处理
 */
export interface IAttendanceService {
  /**
   * 获取学生考勤记录
   * @param courseId 课程ID（external_id）
   * @param studentInfo 学生信息
   * @returns 学生考勤记录
   */
  getStudentAttendanceRecord(
    courseId: string,
    studentInfo: UserInfo
  ): Promise<
    ServiceResult<{
      course: {
        kcmc: string;
        course_start_time: string;
        course_end_time: string;
        room_s: string;
        xm_s: string;
        jc_s: string;
        jxz?: number;
        lq?: string;
        status: 'not_started' | 'in_progress' | 'finished';
      };
      student: {
        xh: string;
        xm: string;
        bjmc?: string;
        zymc?: string;
      };
      attendance_status: {
        is_checked_in: boolean;
        status?:
          | 'not_started'
          | 'present'
          | 'absent'
          | 'leave'
          | 'pending_approval'
          | 'leave_pending';
        checkin_time?: string;
        can_checkin: boolean;
        can_leave: boolean;
        auto_start_time: string;
        auto_close_time: string;
      };
      stats: {
        total_count: number;
        checkin_count: number;
        late_count: number;
        absent_count: number;
        leave_count: number;
      };
    }>
  >;

  /**
   * 获取教师考勤记录
   * @param courseId 课程ID（external_id）
   * @param teacherInfo 教师信息
   * @returns 教师考勤记录
   */
  getTeacherAttendanceRecord(
    courseId: string,
    teacherInfo: UserInfo
  ): Promise<
    ServiceResult<{
      course: {
        kcmc: string;
        room_s: string;
        xm_s: string;
        jc_s: string;
        jxz?: number;
        lq?: string;
      };
      student: {
        xh: string;
        xm: string;
        bjmc: string;
        zymc: string;
      };
      attendance_status: {
        is_checked_in: boolean;
        status?: 'not_started' | 'active' | 'finished';
        checkin_time?: string;
        can_checkin: boolean;
        can_leave: boolean;
        auto_start_time: string;
        auto_close_time: string;
      };
      course_status: {
        status: 'not_started' | 'in_progress' | 'finished';
        course_start_time: string;
        course_end_time: string;
      };
      stats: {
        total_count: number;
        checkin_count: number;
        late_count: number;
        absent_count: number;
        leave_count: number;
      };
      student_details?: Array<{
        xh: string;
        xm: string;
        bjmc?: string;
        zymc?: string;
        status:
          | 'not_started'
          | 'present'
          | 'absent'
          | 'leave'
          | 'leave_pending';
        checkin_time?: string;
        leave_time?: string;
        leave_reason?: string;
        location?: string;
        ip_address?: string;
      }>;
    }>
  >;

  /**
   * 获取课程完整数据（合并课程信息和考勤数据）
   * @param externalId 外部课程ID
   * @param userInfo 用户信息
   * @param type 用户类型
   * @returns 完整的课程和考勤数据
   */
  getCourseCompleteData(
    externalId: string,
    userInfo: UserInfo,
    type: 'student' | 'teacher'
  ): Promise<ServiceResult<any>>;

  /**
   * 学生签到
   * @param courseId 课程ID
   * @param studentInfo 学生信息
   * @param request 签到请求
   * @returns 签到响应
   */
  checkin(
    courseId: string,
    studentInfo: UserInfo,
    request: CheckinRequest
  ): Promise<ServiceResult<CheckinResponse>>;

  /**
   * 查询课程历史考勤数据
   * @param userInfo 用户信息
   * @param params 查询参数
   * @returns 历史考勤响应
   */
  getAttendanceHistory(
    userInfo: UserInfo,
    params: AttendanceHistoryParams
  ): Promise<ServiceResult<AttendanceHistoryResponse>>;

  /**
   * 查询本次课学生考勤信息
   * @param courseId 课程ID
   * @param teacherInfo 教师信息
   * @returns 当前考勤响应
   */
  getCurrentAttendance(
    courseId: string,
    teacherInfo: UserInfo
  ): Promise<ServiceResult<CurrentAttendanceResponse>>;

  /**
   * 查询本课程学生考勤记录统计
   * @param teacherInfo 教师信息
   * @param params 统计参数
   * @returns 考勤统计响应
   */
  getAttendanceStatistics(
    teacherInfo: UserInfo,
    params: AttendanceStatisticsParams
  ): Promise<ServiceResult<AttendanceStatisticsResponse>>;

  /**
   * 验证签到权限
   * @param courseId 课程ID
   * @param studentId 学生ID
   * @returns 是否有权限签到
   */
  validateCheckinPermission(
    courseId: string,
    studentId: string
  ): Promise<
    ServiceResult<{
      canCheckin: boolean;
      reason?: string;
      attendanceWindow?: {
        startTime: Date;
        endTime: Date;
        isActive: boolean;
      };
    }>
  >;

  /**
   * 检查签到时间窗口
   * @param courseId 课程ID
   * @returns 签到时间窗口信息
   */
  getCheckinWindow(courseId: string): Promise<
    ServiceResult<{
      startTime: Date;
      endTime: Date;
      isActive: boolean;
      lateThreshold?: number;
      autoAbsentAfter?: number;
    }>
  >;

  /**
   * 计算签到状态
   * @param courseId 课程ID
   * @param checkinTime 签到时间
   * @returns 签到状态信息
   */
  calculateCheckinStatus(
    courseId: string,
    checkinTime: Date
  ): Promise<
    ServiceResult<{
      status: 'present' | 'late' | 'absent';
      isLate: boolean;
      lateMinutes?: number;
    }>
  >;

  /**
   * 自动标记缺勤
   * @param courseId 课程ID
   * @returns 标记结果
   */
  autoMarkAbsent(courseId: string): Promise<
    ServiceResult<{
      markedCount: number;
      studentIds: string[];
    }>
  >;

  /**
   * 获取学生考勤概览
   * @param studentId 学生ID
   * @param semester 学期（可选）
   * @returns 考勤概览
   */
  getStudentAttendanceOverview(
    studentId: string,
    semester?: string
  ): Promise<
    ServiceResult<{
      totalCourses: number;
      totalClasses: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      leaveCount: number;
      attendanceRate: number;
      recentTrend: 'improving' | 'declining' | 'stable';
    }>
  >;

  /**
   * 获取教师课程考勤概览
   * @param teacherId 教师ID
   * @param semester 学期（可选）
   * @returns 考勤概览
   */
  getTeacherAttendanceOverview(
    teacherId: string,
    semester?: string
  ): Promise<
    ServiceResult<{
      totalCourses: number;
      totalStudents: number;
      totalClasses: number;
      overallAttendanceRate: number;
      courseStats: Array<{
        courseId: string;
        courseName: string;
        studentCount: number;
        attendanceRate: number;
      }>;
    }>
  >;

  /**
   * 验证坐标位置
   * @param courseId 课程ID
   * @param latitude 纬度
   * @param longitude 经度
   * @param accuracy 精度
   * @returns 位置验证结果
   */
  validateLocation(
    courseId: string,
    latitude: number,
    longitude: number,
    accuracy: number
  ): Promise<
    ServiceResult<{
      isValid: boolean;
      distance?: number;
      allowedRadius?: number;
      reason?: string;
    }>
  >;

  /**
   * 获取考勤趋势分析
   * @param courseId 课程ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 趋势分析结果
   */
  getAttendanceTrends(
    courseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    ServiceResult<{
      dailyTrends: Array<{
        date: string;
        totalStudents: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        leaveCount: number;
        attendanceRate: number;
      }>;
      weeklyTrends: Array<{
        week: string;
        attendanceRate: number;
        trend: 'up' | 'down' | 'stable';
      }>;
      overallTrend: 'improving' | 'declining' | 'stable';
    }>
  >;

  /**
   * 导出考勤数据
   * @param courseId 课程ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param format 导出格式
   * @returns 导出结果
   */
  exportAttendanceData(
    courseId: string,
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'excel' | 'pdf'
  ): Promise<
    ServiceResult<{
      fileName: string;
      fileContent: Buffer;
      mimeType: string;
    }>
  >;

  /**
   * 获取课程历史考勤数据
   * @param kkh 课程号
   * @param userInfo 用户信息
   * @param params 查询参数
   * @returns 课程历史考勤数据
   */
  getCourseAttendanceHistory(
    kkh: string,
    userInfo: UserInfo,
    params?: { xnxq?: string; start_date?: string; end_date?: string }
  ): Promise<
    ServiceResult<{
      course_info: {
        kkh: string;
        course_name: string;
        xnxq: string;
        teachers: string;
      };
      attendance_history: Array<{
        attendance_record_id: string;
        class_date: string;
        class_time: string;
        class_period: string;
        teaching_week?: number;
        classroom?: string;
        total_students: number;
        present_count: number;
        leave_count: number;
        absent_count: number;
        attendance_rate: number;
        course_status: 'not_started' | 'in_progress' | 'finished';
        created_at: string;
      }>;
      overall_stats: {
        total_classes: number;
        average_attendance_rate: number;
        total_students: number;
        total_present: number;
        total_leave: number;
        total_absent: number;
      };
    }>
  >;

  /**
   * 获取个人课程统计
   * @param kkh 课程号
   * @param userInfo 用户信息
   * @param params 查询参数
   * @returns 个人课程统计数据
   */
  getPersonalCourseStats(
    kkh: string,
    userInfo: UserInfo,
    params?: { xnxq?: string }
  ): Promise<
    ServiceResult<{
      course_info: {
        kkh: string;
        course_name: string;
        xnxq: string;
        total_classes: number;
        total_students: number;
        overall_attendance_rate: number;
        teachers: string;
      };
      student_stats: Array<{
        xh: string;
        xm: string;
        bjmc?: string;
        zymc?: string;
        attendance_rate: number;
        present_count: number;
        absent_count: number;
        leave_count: number;
        total_classes: number;
        recent_records: Array<{
          class_date: string;
          status:
            | 'not_started'
            | 'present'
            | 'absent'
            | 'leave'
            | 'pending_approval'
            | 'leave_pending';
          checkin_time?: string;
          leave_reason?: string;
        }>;
      }>;
    }>
  >;

  /**
   * 获取课程历史考勤数据（通过课程ID）
   * @param courseId 课程ID
   * @param userInfo 用户信息
   * @param params 查询参数
   * @returns 课程历史考勤数据
   */
  getCourseAttendanceHistoryById(
    courseId: string,
    userInfo: UserInfo,
    params?: { xnxq?: string; start_date?: string; end_date?: string }
  ): Promise<
    ServiceResult<{
      course_info: {
        kkh: string;
        course_name: string;
        xnxq: string;
        teachers: Array<{ gh: string; xm: string }>;
      };
      attendance_history: Array<{
        attendance_record_id: string;
        class_date: string;
        class_time: string;
        class_period: string;
        teaching_week?: number;
        classroom?: string;
        total_students: number;
        present_count: number;
        leave_count: number;
        absent_count: number;
        attendance_rate: number;
        course_status: 'not_started' | 'in_progress' | 'finished';
        created_at: string;
      }>;
      overall_stats: {
        total_classes: number;
        average_attendance_rate: number;
        total_students: number;
        total_present: number;
        total_leave: number;
        total_absent: number;
      };
    }>
  >;

  /**
   * 获取个人课程统计数据
   * @param courseId 课程ID（external_id）
   * @param userInfo 用户信息
   * @param params 查询参数
   * @returns 个人课程统计数据
   */
  getPersonalCourseStatsById(
    courseId: string,
    userInfo: UserInfo,
    params?: { xnxq?: string }
  ): Promise<
    ServiceResult<{
      course_info: {
        kkh: string;
        course_name: string;
        xnxq: string;
        total_classes: number;
        total_students: number;
        overall_attendance_rate: number;
        teachers: string;
      };
      student_stats: Array<{
        xh: string;
        xm: string;
        bjmc?: string;
        zymc?: string;
        attendance_rate: number;
        present_count: number;
        absent_count: number;
        leave_count: number;
        total_classes: number;
        recent_records: Array<{
          class_date: string;
          status:
            | 'not_started'
            | 'present'
            | 'absent'
            | 'leave'
            | 'pending_approval'
            | 'leave_pending';
          checkin_time?: string;
          leave_reason?: string;
        }>;
      }>;
    }>
  >;

  /**
   * 获取系统级别的全局统计数据
   * @returns 系统全局统计数据
   */
  getSystemOverallStats(): Promise<
    ServiceResult<{
      total_courses: number;
      total_students: number;
      attendance_enabled_courses: number;
      total_attendance_capacity: number;
      average_attendance_rate: number;
      active_courses_today: number;
      total_checkin_records: number;
    }>
  >;
}
