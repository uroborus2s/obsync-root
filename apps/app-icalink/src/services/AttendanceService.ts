// @wps/app-icalink 考勤服务实现
// 基于 Stratix 框架的服务实现类

import type { Logger } from '@stratix/core';
import { format } from 'date-fns';
import type { IAttendanceCourseRepository } from '../repositories/interfaces/IAttendanceCourseRepository.js';
import type { IAttendanceRecordRepository } from '../repositories/interfaces/IAttendanceRecordRepository.js';
import type { IAttendanceStatsRepository } from '../repositories/interfaces/IAttendanceStatsRepository.js';
import type { IStudentRepository } from '../repositories/interfaces/IStudentRepository.js';
import type {
  AttendanceHistoryParams,
  AttendanceHistoryRecord,
  AttendanceHistoryResponse,
  AttendanceStatisticsParams,
  AttendanceStatisticsResponse,
  AttendanceStats,
  CheckinRequest,
  CheckinResponse,
  CurrentAttendanceResponse,
  UserInfo
} from '../types/api.js';
import {
  AttendanceStatus,
  type IcasyncAttendanceCourse
} from '../types/database.js';
import type { ServiceResult } from '../types/service.js';
import {
  isSuccessResult,
  ServiceErrorCode,
  wrapServiceCall
} from '../types/service.js';
import {
  addMinutesToDate,
  formatDateTime,
  getCurrentDateTime,
  getMinutesDifference,
  isDateInRange
} from '../utils/datetime.js';
import { extractOptionFromServiceResult } from '../utils/type-fixes.js';
import {
  validateCoordinates,
  validateCourseId,
  validateDateRange,
  validateDateString,
  validatePagination
} from '../utils/validation.js';
import type { IAttendanceService } from './interfaces/IAttendanceService.js';

/**
 * 考勤服务实现类
 * 实现IAttendanceService接口，提供考勤相关的业务逻辑
 */
export default class AttendanceService implements IAttendanceService {
  constructor(
    private readonly attendanceRecordRepository: IAttendanceRecordRepository,
    private readonly attendanceCourseRepository: IAttendanceCourseRepository,
    private readonly attendanceStatsRepository: IAttendanceStatsRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取学生考勤记录
   */
  async getStudentAttendanceRecord(
    courseId: string,
    studentInfo: UserInfo
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { courseId, studentId: studentInfo.id },
        'Getting student attendance record'
      );

      // 获取真实的课程和考勤数据
      const courseResult =
        await this.attendanceCourseRepository.findByExternalId(courseId);
      if (!isSuccessResult(courseResult)) {
        throw new Error('课程不存在');
      }

      const course = courseResult.data;
      if (!course) {
        throw new Error('课程不存在');
      }
      const startTime = new Date(course.start_time);
      const endTime = new Date(course.end_time);
      const now = new Date();

      // 计算课程状态
      let courseStatus: 'not_started' | 'in_progress' | 'finished';
      if (now < startTime) {
        courseStatus = 'not_started';
      } else if (now > endTime) {
        courseStatus = 'finished';
      } else {
        courseStatus = 'in_progress';
      }

      // 获取学生的考勤记录
      const attendanceRecordResult =
        await this.attendanceRecordRepository.findByCourseAndStudent(
          course.id,
          studentInfo.id
        );

      let attendanceRecord = null;
      if (isSuccessResult(attendanceRecordResult)) {
        attendanceRecord = attendanceRecordResult.data;
      }

      // 获取课程统计信息 - 简化实现
      const stats = {
        total_count: 0,
        checkin_count: 0,
        late_count: 0,
        absent_count: 0,
        leave_count: 0
      };

      return {
        course: {
          kcmc: course.course_name,
          course_start_time: startTime.toISOString(),
          course_end_time: endTime.toISOString(),
          room_s: course.class_location || '',
          xm_s: course.teacher_names || '',
          jc_s: course.periods || '',
          jxz: 0,
          lq: '',
          status: courseStatus
        },
        student: {
          xh: studentInfo.id,
          xm: studentInfo.name,
          bjmc: '',
          zymc: ''
        },
        attendance_status: {
          is_checked_in: attendanceRecord?.status === 'present',
          status: attendanceRecord?.status || 'not_started',
          checkin_time: attendanceRecord?.checkin_time?.toISOString(),
          can_checkin:
            courseStatus === 'in_progress' &&
            (!attendanceRecord || attendanceRecord.status === 'not_started'),
          can_leave: courseStatus === 'in_progress',
          auto_start_time: startTime.toISOString(),
          auto_close_time: endTime.toISOString()
        },
        stats: stats
      };
    });
  }

  /**
   * 获取课程完整数据（合并课程信息和考勤数据）
   */
  async getCourseCompleteData(
    externalId: string,
    userInfo: UserInfo,
    type?: 'student' | 'teacher'
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        {
          externalId,
          userId: userInfo.id,
          type: userInfo.type,
          requestType: type
        },
        'Getting complete course data'
      );

      // 1. 获取课程基本信息
      const courseResult =
        await this.attendanceCourseRepository.findByExternalId(externalId);
      if (!isSuccessResult(courseResult) || !courseResult.data) {
        throw new Error('课程不存在');
      }

      const course = courseResult.data;

      // 2. 根据用户类型返回不同的数据
      // 优先使用传入的type参数，如果没有则使用userInfo.type
      const effectiveType = type || userInfo.type;

      if (effectiveType === 'teacher') {
        return await this.getTeacherCompleteData(course, userInfo);
      } else {
        return await this.getStudentCompleteData(course, userInfo);
      }
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取完整的学生考勤数据
   * 确保所有应到学生都有考勤记录，并返回完整的统计信息
   */
  private async getCompleteAttendanceData(course: any): Promise<{
    studentDetails: any[];
    stats: {
      total_count: number;
      checkin_count: number;
      late_count: number;
      absent_count: number;
      leave_count: number;
    };
  }> {
    this.logger.info(
      {
        courseId: course.id,
        courseCode: course.course_code,
        semester: course.semester
      },
      'Starting getCompleteAttendanceData'
    );

    // 1. 获取课程应到学生列表
    const studentsResult = await this.studentRepository.findByCourse(
      course.course_code,
      course.semester
    );

    this.logger.info(
      {
        courseCode: course.course_code,
        semester: course.semester,
        studentsResultSuccess: studentsResult.success,
        studentsCount: studentsResult.success ? studentsResult.data?.length : 0,
        studentsResultError: studentsResult.success
          ? null
          : studentsResult.error
      },
      'StudentRepository.findByCourse result'
    );

    if (!isSuccessResult(studentsResult) || !studentsResult.data) {
      this.logger.warn(
        { courseCode: course.course_code, semester: course.semester },
        'No students found for course, returning empty data'
      );
      return {
        studentDetails: [],
        stats: {
          total_count: 0,
          checkin_count: 0,
          late_count: 0,
          absent_count: 0,
          leave_count: 0
        }
      };
    }

    const allStudents = studentsResult.data;
    this.logger.info(
      {
        courseId: course.id,
        studentCount: allStudents.length,
        firstFewStudents: allStudents
          .slice(0, 3)
          .map((s) => ({ xh: s.xh, xm: s.xm }))
      },
      'Found students for course'
    );

    // 2. 获取已有的考勤记录
    const recordsResult =
      await this.attendanceRecordRepository.findByConditions({
        attendance_course_id: course.id
      });

    this.logger.info(
      {
        courseId: course.id,
        recordsResultSuccess: recordsResult.success,
        recordsCount: isSuccessResult(recordsResult)
          ? recordsResult.data?.length
          : 0
      },
      'Attendance records query result'
    );

    // 3. 创建学生ID到考勤记录的映射
    const recordsMap = new Map();
    if (isSuccessResult(recordsResult) && recordsResult.data) {
      recordsResult.data.forEach((record) => {
        recordsMap.set(record.student_id, record);
      });
    }

    // 4. 识别没有考勤记录的学生（不再自动创建记录）
    const studentsWithoutRecords = allStudents.filter(
      (student) => !recordsMap.has(student.xh)
    );

    this.logger.info(
      {
        courseId: course.id,
        studentsWithoutRecordsCount: studentsWithoutRecords.length,
        totalStudents: allStudents.length
      },
      'Students without attendance records (will be marked as absent if course finished)'
    );

    // 5. 构建完整的学生详情列表（不创建数据库记录，仅用于显示）
    const studentDetails = allStudents.map((student) => {
      const record = recordsMap.get(student.xh);

      // 如果没有找到考勤记录，根据课程状态判断学生状态（不写入数据库）
      if (!record) {
        let finalStatus = 'not_started';

        // 检查课程是否已结束，如果已结束且无记录则标记为缺勤（仅用于显示）
        const now = new Date();
        const courseEndTime = new Date(course.end_time);
        if (now > courseEndTime) {
          finalStatus = 'absent';
        }

        this.logger.debug(
          {
            studentId: student.xh,
            studentName: student.xm,
            courseStatus: finalStatus,
            reason: 'no_attendance_record'
          },
          'Student without attendance record - status determined by course timing'
        );

        return {
          xh: student.xh,
          xm: student.xm,
          bjmc: student.bjmc || '',
          zymc: student.zymc || '',
          status: finalStatus, // 基于课程时间的状态判断，不写入数据库
          checkin_time: undefined,
          leave_time: undefined,
          leave_reason: undefined,
          location: undefined,
          ip_address: undefined
        };
      }

      // 有考勤记录的情况，使用真实数据
      return {
        xh: student.xh,
        xm: student.xm,
        bjmc: student.bjmc || '',
        zymc: student.zymc || '',
        status: record.status || 'not_started',
        checkin_time: record.checkin_time?.toISOString(),
        leave_time:
          record.status === 'leave'
            ? record.checkin_time?.toISOString()
            : undefined,
        leave_reason: record.remark || undefined,
        location: record.checkin_location || undefined,
        ip_address: record.ip_address || undefined
      };
    });

    // 6. 计算统计信息（基于实际数据库记录和显示状态）
    const stats = {
      total_count: studentDetails.length, // 总应到人数（包括无记录的学生）
      checkin_count: studentDetails.filter((s) => s.status === 'present')
        .length,
      late_count: studentDetails.filter((s) => {
        const record = recordsMap.get(s.xh);
        return record?.is_late || false;
      }).length,
      absent_count: studentDetails.filter((s) => s.status === 'absent').length, // 包括无记录且课程已结束的学生
      leave_count: studentDetails.filter(
        (s) => s.status === 'leave' || s.status === 'leave_pending'
      ).length
    };

    this.logger.info(
      {
        courseId: course.id,
        finalStudentCount: studentDetails.length,
        finalStats: stats,
        sampleStudents: studentDetails.slice(0, 3).map((s) => ({
          xh: s.xh,
          xm: s.xm,
          status: s.status
        }))
      },
      'getCompleteAttendanceData final result'
    );

    return { studentDetails, stats };
  }

  /**
   * 获取教师端完整数据
   */
  private async getTeacherCompleteData(
    course: any,
    teacherInfo: UserInfo
  ): Promise<any> {
    this.logger.info(
      {
        courseId: course.id,
        teacherId: teacherInfo.id,
        courseCode: course.course_code
      },
      'Starting getTeacherCompleteData'
    );

    // 检查教师权限
    const hasPermission = await this.validateTeacherCourseAccess(
      teacherInfo.id,
      course.id
    );

    this.logger.info(
      { courseId: course.id, teacherId: teacherInfo.id, hasPermission },
      'Teacher permission check result'
    );

    if (!hasPermission) {
      throw new Error('没有权限查看该课程的考勤信息');
    }

    // 获取完整的学生考勤数据
    this.logger.info(
      {
        courseId: course.id,
        courseCode: course.course_code,
        semester: course.semester
      },
      'Calling getCompleteAttendanceData'
    );

    const attendanceData = await this.getCompleteAttendanceData(course);
    const { studentDetails, stats } = attendanceData;

    this.logger.info(
      {
        courseId: course.id,
        studentCount: studentDetails.length,
        stats: stats
      },
      'getCompleteAttendanceData result'
    );

    // 判断课程状态
    const now = new Date();
    const startTime = new Date(course.start_time);
    const endTime = new Date(course.end_time);

    let courseStatus: 'not_started' | 'in_progress' | 'finished';
    if (now < startTime) {
      courseStatus = 'not_started';
    } else if (now > endTime) {
      courseStatus = 'finished';
    } else {
      courseStatus = 'in_progress';
    }

    const result = {
      course: {
        kcmc: course.course_name,
        room_s: course.class_location || '',
        xm_s: course.teacher_names || '',
        jc_s: course.periods || '',
        jxz: course.teaching_week,
        lq: course.class_location || ''
      },
      student: {
        xh: teacherInfo.id,
        xm: teacherInfo.name,
        bjmc: '',
        zymc: ''
      },
      attendance_status: {
        is_checked_in: false,
        status:
          courseStatus === 'in_progress'
            ? 'active'
            : courseStatus === 'finished'
              ? 'finished'
              : 'not_started',
        can_checkin: false,
        can_leave: false,
        auto_start_time: startTime.toISOString(),
        auto_close_time: endTime.toISOString()
      },
      course_status: {
        status: courseStatus,
        course_start_time: startTime.toISOString(),
        course_end_time: endTime.toISOString()
      },
      stats,
      student_details: studentDetails
    };

    this.logger.info(
      {
        courseId: course.id,
        resultStats: result.stats,
        studentDetailsCount: result.student_details.length
      },
      'getTeacherCompleteData final result'
    );

    return result;
  }

  /**
   * 获取学生端完整数据
   */
  private async getStudentCompleteData(
    course: any,
    studentInfo: UserInfo
  ): Promise<any> {
    // 查找学生的考勤记录
    this.logger.info(
      { courseId: course.id, studentId: studentInfo.id },
      'Querying attendance record for student'
    );

    const recordResult =
      await this.attendanceRecordRepository.findByCourseAndStudent(
        course.id,
        studentInfo.id
      );

    let attendanceRecord = null;
    if (isSuccessResult(recordResult)) {
      attendanceRecord = recordResult.data;
      this.logger.info(
        {
          courseId: course.id,
          studentId: studentInfo.id,
          recordId: attendanceRecord?.id,
          status: attendanceRecord?.status
        },
        'Found attendance record for student'
      );
    } else {
      this.logger.info(
        {
          courseId: course.id,
          studentId: studentInfo.id,
          error: recordResult.error?.message
        },
        'No attendance record found for student'
      );
    }

    // 判断课程状态
    const now = new Date();
    const startTime = new Date(course.start_time);
    const endTime = new Date(course.end_time);

    let courseStatus: 'not_started' | 'in_progress' | 'finished';
    if (now < startTime) {
      courseStatus = 'not_started';
    } else if (now > endTime) {
      courseStatus = 'finished';
    } else {
      courseStatus = 'in_progress';
    }

    // 判断是否可以签到
    const canCheckin =
      courseStatus === 'in_progress' &&
      (!attendanceRecord ||
        attendanceRecord.status === AttendanceStatus.NOT_STARTED ||
        attendanceRecord.status === AttendanceStatus.LEAVE_REJECTED); // 请假被拒绝后可以签到

    // 判断是否可以请假 - 只有在课程开始前且没有请假相关状态时才能请假
    const canLeave =
      courseStatus === 'not_started' && // 课程还没开始
      (!attendanceRecord || // 没有考勤记录，或者
        attendanceRecord.status === 'not_started' || // 状态为未开始，或者
        attendanceRecord.status === 'absent'); // 状态为缺勤（可以补请假）

    // 确定考勤状态 - 优先使用考勤记录的状态，如果没有考勤记录则使用课程状态
    let attendanceStatus: string;
    if (attendanceRecord) {
      // 如果有考勤记录，使用考勤记录的状态
      attendanceStatus = attendanceRecord.status;
      this.logger.info(
        {
          courseId: course.id,
          studentId: studentInfo.id,
          attendanceStatus,
          recordStatus: attendanceRecord.status
        },
        'Using attendance record status'
      );
    } else {
      // 如果没有考勤记录，根据课程状态设置默认考勤状态
      attendanceStatus =
        courseStatus === 'finished'
          ? 'absent' // 课程结束后未签到视为缺勤
          : 'not_started'; // 课程未开始或进行中且无记录视为未开始
      this.logger.info(
        {
          courseId: course.id,
          studentId: studentInfo.id,
          attendanceStatus,
          courseStatus
        },
        'Using default attendance status based on course status'
      );
    }

    return {
      course: {
        kcmc: course.course_name,
        // 返回数据库原始时间，保持北京时间格式
        course_start_time: this.formatDateTimeWithTimezone(course.start_time),
        course_end_time: this.formatDateTimeWithTimezone(course.end_time),
        room_s: course.class_location || '',
        xm_s: course.teacher_names || '',
        jc_s: course.periods || '',
        jxz: course.teaching_week,
        lq: course.class_location || '',
        status: courseStatus
      },
      student: {
        // 简化学生信息，前端从cookie获取
        xh: '',
        xm: '',
        bjmc: '',
        zymc: ''
      },
      attendance_status: {
        is_checked_in: attendanceRecord?.status === 'present',
        status: attendanceStatus,
        checkin_time: attendanceRecord?.checkin_time
          ? this.formatDateTimeWithTimezone(attendanceRecord.checkin_time)
          : undefined,
        can_checkin: canCheckin,
        can_leave: canLeave,
        auto_start_time: this.formatDateTimeWithTimezone(startTime),
        auto_close_time: this.formatDateTimeWithTimezone(endTime)
      },
      stats: {
        total_count: 0,
        checkin_count: 0,
        late_count: 0,
        absent_count: 0,
        leave_count: 0
      }
    };
  }

  /**
   * 格式化日期时间，保持原有时区信息
   * @private
   */
  private formatDateTimeWithTimezone(date: Date): string {
    // 使用 date-fns 格式化时间，保持数据库原始时间
    // 数据库中保存的就是北京时间，直接格式化并添加时区标识
    return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS'+08:00'");
  }

  /**
   * 获取教师考勤记录
   */
  async getTeacherAttendanceRecord(
    courseId: string,
    teacherInfo: UserInfo
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { courseId, teacherId: teacherInfo.id },
        'Getting teacher attendance record'
      );

      // 获取真实的课程和考勤数据
      const courseResult =
        await this.attendanceCourseRepository.findByExternalId(courseId);
      if (!isSuccessResult(courseResult)) {
        throw new Error('课程不存在');
      }

      const course = courseResult.data;
      if (!course) {
        throw new Error('课程不存在');
      }

      // 获取完整的学生考勤数据
      const studentDetails = await this.getStudentAttendanceDetails(
        course.id.toString()
      );

      // 计算统计信息
      const stats = this.calculateAttendanceStats(studentDetails);

      const startTime = new Date(course.start_time);
      const endTime = new Date(course.end_time);
      const now = new Date();

      // 计算课程状态
      let courseStatus: 'not_started' | 'in_progress' | 'finished';
      if (now < startTime) {
        courseStatus = 'not_started';
      } else if (now > endTime) {
        courseStatus = 'finished';
      } else {
        courseStatus = 'in_progress';
      }

      return {
        course: {
          kcmc: course.course_name,
          room_s: course.class_location || '',
          xm_s: course.teacher_names || '',
          jc_s: course.periods || '',
          jxz: 0,
          lq: ''
        },
        student: {
          xh: teacherInfo.id,
          xm: teacherInfo.name,
          bjmc: '',
          zymc: ''
        },
        attendance_status: {
          is_checked_in: false,
          status: courseStatus === 'in_progress' ? 'active' : courseStatus,
          can_checkin: false,
          can_leave: false,
          auto_start_time: startTime.toISOString(),
          auto_close_time: endTime.toISOString()
        },
        course_status: {
          status: courseStatus,
          course_start_time: startTime.toISOString(),
          course_end_time: endTime.toISOString()
        },
        stats: stats,
        student_details: studentDetails
      };
    });
  }

  /**
   * 学生签到
   */
  async checkin(
    courseId: string,
    studentInfo: Required<UserInfo>,
    request: CheckinRequest
  ): Promise<ServiceResult<CheckinResponse>> {
    return wrapServiceCall(async () => {
      const currentTime = getCurrentDateTime();

      // 根据external_id获取课程的真实ID
      const courseResult =
        await this.attendanceCourseRepository.findByExternalId(courseId);
      if (!courseResult.success || !courseResult.data) {
        throw new Error('课程不存在');
      }

      const course = courseResult.data;
      const courseIdNum = course.id;

      const createResult = await this.attendanceRecordRepository.create({
        attendance_course_id: courseIdNum,
        student_id: studentInfo.id,
        student_name: studentInfo.name,
        status: AttendanceStatus.PRESENT,
        checkin_time: currentTime,
        checkin_location: request.location,
        checkin_latitude: request.latitude,
        checkin_longitude: request.longitude,
        checkin_accuracy: request.accuracy,
        class_name: studentInfo.className,
        major_name: studentInfo.majorName,
        is_late: false,
        late_minutes: 0,
        remark: request.remark,
        created_by: studentInfo.id
      });

      if (!createResult.success) {
        throw new Error('创建签到记录失败');
      }

      const createdRecord = extractOptionFromServiceResult({
        success: true,
        data: createResult.data
      });
      const recordId = Number((createdRecord as any)?.insertId) || 0;

      // 构建响应
      const response: CheckinResponse = {
        record_id: recordId,
        student_id: studentInfo.id,
        student_name: studentInfo.name,
        course_name: course.course_name || '',
        status: 'present',
        checkin_time: formatDateTime(currentTime),
        is_late: false,
        late_minutes: 0,
        location: request.location,
        coordinates:
          request.latitude && request.longitude
            ? {
                latitude: request.latitude,
                longitude: request.longitude,
                accuracy: request.accuracy || 0
              }
            : undefined
      };

      return response;
    }, ServiceErrorCode.ATTENDANCE_NOT_ALLOWED);
  }

  /**
   * 查询课程历史考勤数据
   */
  async getAttendanceHistory(
    userInfo: UserInfo,
    params: AttendanceHistoryParams
  ): Promise<ServiceResult<AttendanceHistoryResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { userId: userInfo.id, userType: userInfo.type },
        'Get attendance history started'
      );

      // 验证分页参数
      const paginationValidation = validatePagination(
        params.page,
        params.page_size
      );
      if (!isSuccessResult(paginationValidation)) {
        throw new Error(paginationValidation.error?.message);
      }

      // 验证日期范围
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (params.start_date) {
        const startDateValidation = validateDateString(
          params.start_date,
          '开始日期'
        );
        if (!isSuccessResult(startDateValidation)) {
          throw new Error(startDateValidation.error?.message);
        }
        startDate = startDateValidation.data;
      }

      if (params.end_date) {
        const endDateValidation = validateDateString(
          params.end_date,
          '结束日期'
        );
        if (!isSuccessResult(endDateValidation)) {
          throw new Error(endDateValidation.error?.message);
        }
        endDate = endDateValidation.data;
      }

      if (startDate && endDate) {
        const rangeValidation = validateDateRange(startDate, endDate);
        if (!isSuccessResult(rangeValidation)) {
          throw new Error(rangeValidation.error?.message);
        }
      }

      // 构建查询条件
      const conditions: any = {
        start_date: startDate,
        end_date: endDate
      };

      // 根据用户类型设置查询条件
      if (userInfo.type === 'student') {
        conditions.student_id = userInfo.id;
      } else if (params.student_id) {
        // 教师可以查询指定学生的记录
        conditions.student_id = params.student_id;
      }

      if (params.course_id) {
        const courseIdValidation = validateCourseId(params.course_id);
        if (!isSuccessResult(courseIdValidation)) {
          throw new Error(courseIdValidation.error?.message);
        }
        conditions.attendance_course_id = courseIdValidation.data;
      }

      if (params.status && params.status !== 'all') {
        conditions.status = params.status;
      }

      // 查询考勤记录
      const recordsResult =
        await this.attendanceRecordRepository.findWithDetailsPaginated(
          conditions,
          {
            pagination: paginationValidation.data,
            sort: { field: 'created_at', direction: 'desc' }
          }
        );

      if (!isSuccessResult(recordsResult)) {
        throw new Error('查询考勤记录失败');
      }

      // 获取统计信息
      const statsResult =
        await this.attendanceRecordRepository.getStatistics(conditions);
      if (!isSuccessResult(statsResult)) {
        throw new Error('获取统计信息失败');
      }

      // 转换为API响应格式
      const records = recordsResult.data.data.map((record) => ({
        id: record.id,
        course_name: record.course_name || '',
        class_date: record.class_date || '',
        class_time: record.class_time || '',
        student_id: record.student_id,
        student_name: record.student_name,
        status: record.status,
        checkin_time: record.checkin_time
          ? formatDateTime(record.checkin_time)
          : '',
        is_late: record.is_late,
        late_minutes: record.late_minutes,
        leave_reason: undefined, // 需要从请假记录中获取
        teacher_name: record.teacher_names || ''
      }));

      const response: AttendanceHistoryResponse = {
        records,
        pagination: {
          total: recordsResult.data.total,
          page: recordsResult.data.page,
          page_size: recordsResult.data.page_size,
          total_pages: recordsResult.data.total_pages
        },
        summary: {
          total_classes: statsResult.data.total_count,
          present_count: statsResult.data.present_count,
          late_count: statsResult.data.late_count,
          absent_count: statsResult.data.absent_count,
          leave_count: statsResult.data.leave_count,
          attendance_rate: statsResult.data.attendance_rate
        }
      };

      this.logger.info(
        {
          userId: userInfo.id,
          recordCount: records.length
        },
        'Get attendance history completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 查询本次课学生考勤信息
   */
  async getCurrentAttendance(
    courseId: string,
    teacherInfo: UserInfo
  ): Promise<ServiceResult<CurrentAttendanceResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { courseId, teacherId: teacherInfo.id },
        'Get current attendance started'
      );

      // 验证课程ID
      const courseIdValidation = validateCourseId(courseId);
      if (!isSuccessResult(courseIdValidation)) {
        throw new Error(courseIdValidation.error?.message);
      }

      const courseIdNum = courseIdValidation.data;

      // 检查课程是否存在
      const courseResult =
        await this.attendanceCourseRepository.findById(courseIdNum);
      if (!courseResult.success) {
        throw new Error('课程不存在');
      }

      const course = extractOptionFromServiceResult<IcasyncAttendanceCourse>({
        success: true,
        data: courseResult.data
      });
      if (!course) {
        throw new Error('课程不存在');
      }

      // 检查教师是否有权限查看该课程
      const hasPermission = await this.validateTeacherCourseAccess(
        teacherInfo.id,
        courseIdNum
      );
      if (!hasPermission) {
        throw new Error('没有权限查看该课程的考勤信息');
      }

      // 获取签到时间窗口
      const windowResult = await this.getCheckinWindow(courseId);
      if (!isSuccessResult(windowResult)) {
        throw new Error(windowResult.error?.message);
      }

      // 查询当前课程的所有考勤记录
      const recordsResult =
        await this.attendanceRecordRepository.findByConditions({
          attendance_course_id: courseIdNum
        });

      if (!isSuccessResult(recordsResult)) {
        throw new Error('查询考勤记录失败');
      }

      // 获取课程学生列表
      const studentsResult = await this.studentRepository.findByCourse(
        courseId,
        (course as any)?.semester || ''
      );
      if (!isSuccessResult(studentsResult)) {
        throw new Error('获取学生列表失败');
      }

      // 构建学生考勤状态列表
      const students = studentsResult.data.map((student) => {
        const record = recordsResult.data.find(
          (r) => r.student_id === student.xh
        );

        return {
          student_id: student.xh || '',
          student_name: student.xm || '',
          class_name: student.bjmc,
          status: (record?.status || 'not_started') as any,
          checkin_time: record?.checkin_time
            ? formatDateTime(record.checkin_time)
            : undefined,
          is_late: record?.is_late || false,
          late_minutes: record?.late_minutes,
          leave_reason: undefined, // 需要从请假记录中获取
          can_checkin: windowResult.data.isActive,
          can_leave: true // 根据业务规则确定
        };
      });

      // 计算统计信息
      const stats = {
        total_count: students.length,
        checkin_count: students.filter(
          (s) => s.status === 'present' || s.status === 'late'
        ).length,
        late_count: students.filter((s) => s.status === 'late').length,
        absent_count: students.filter((s) => s.status === 'absent').length,
        leave_count: students.filter((s) => s.status === 'leave').length,
        not_started_count: students.filter((s) => s.status === 'not_started')
          .length,
        attendance_rate:
          students.length > 0
            ? (students.filter(
                (s) => s.status === 'present' || s.status === 'late'
              ).length /
                students.length) *
              100
            : 0
      };

      const response: CurrentAttendanceResponse = {
        course_info: {
          course_id: courseId,
          course_name: course.course_name || '',
          class_date: course.start_time
            ? formatDateTime(course.start_time).split('T')[0]
            : '',
          class_time:
            course.start_time && course.end_time
              ? `${course.start_time.toTimeString().slice(0, 5)}-${course.end_time.toTimeString().slice(0, 5)}`
              : '',
          teacher_name: course.teacher_names || '',
          class_location: course.class_location
        },
        attendance_window: {
          start_time: formatDateTime(windowResult.data.startTime),
          end_time: formatDateTime(windowResult.data.endTime),
          is_active: windowResult.data.isActive
        },
        students,
        stats
      };

      this.logger.info(
        {
          courseId,
          teacherId: teacherInfo.id,
          studentCount: students.length
        },
        'Get current attendance completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 查询本课程学生考勤记录统计
   */
  async getAttendanceStatistics(
    teacherInfo: UserInfo,
    params: AttendanceStatisticsParams
  ): Promise<ServiceResult<AttendanceStatisticsResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { teacherId: teacherInfo.id, courseId: params.course_id },
        'Get attendance statistics started'
      );

      // 验证课程ID
      const courseIdValidation = validateCourseId(params.course_id);
      if (!isSuccessResult(courseIdValidation)) {
        throw new Error(courseIdValidation.error?.message);
      }

      // 验证日期范围
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (params.start_date) {
        const startDateValidation = validateDateString(
          params.start_date,
          '开始日期'
        );
        if (!isSuccessResult(startDateValidation)) {
          throw new Error(startDateValidation.error?.message);
        }
        startDate = startDateValidation.data;
      }

      if (params.end_date) {
        const endDateValidation = validateDateString(
          params.end_date,
          '结束日期'
        );
        if (!isSuccessResult(endDateValidation)) {
          throw new Error(endDateValidation.error?.message);
        }
        endDate = endDateValidation.data;
      }

      if (startDate && endDate) {
        const rangeValidation = validateDateRange(startDate, endDate);
        if (!isSuccessResult(rangeValidation)) {
          throw new Error(rangeValidation.error?.message);
        }
      }

      const courseIdNum = courseIdValidation.data;

      // 检查教师权限
      const hasPermission = await this.validateTeacherCourseAccess(
        teacherInfo.id,
        courseIdNum
      );
      if (!hasPermission) {
        throw new Error('没有权限查看该课程的统计信息');
      }

      // 获取课程信息
      const courseResult =
        await this.attendanceCourseRepository.findById(courseIdNum);
      if (!courseResult.success) {
        throw new Error('课程不存在');
      }

      const course = extractOptionFromServiceResult<IcasyncAttendanceCourse>({
        success: true,
        data: courseResult.data
      });
      if (!course) {
        throw new Error('课程不存在');
      }

      // 获取整体统计
      const overallStatsResult =
        await this.attendanceRecordRepository.getStatisticsByCourse(
          courseIdNum
        );
      if (!isSuccessResult(overallStatsResult)) {
        throw new Error('获取整体统计失败');
      }

      // 构建响应（简化实现）
      const response: AttendanceStatisticsResponse = {
        course_info: {
          course_id: params.course_id,
          course_name: course.course_name,
          teacher_name: course.teacher_names || '',
          total_classes: 0, // 需要计算
          date_range: {
            start_date: startDate
              ? formatDateTime(startDate).split('T')[0]
              : '',
            end_date: endDate ? formatDateTime(endDate).split('T')[0] : ''
          }
        },
        overall_stats: {
          total_count: overallStatsResult.data.total_count,
          checkin_count:
            overallStatsResult.data.present_count +
            overallStatsResult.data.late_count,
          late_count: overallStatsResult.data.late_count,
          absent_count: overallStatsResult.data.absent_count,
          leave_count: overallStatsResult.data.leave_count,
          not_started_count: overallStatsResult.data.not_started_count,
          attendance_rate: overallStatsResult.data.attendance_rate
        },
        students: await this.getStudentStatisticsForCourse(
          courseIdNum,
          startDate,
          endDate
        ),
        trends: await this.getAttendanceTrendsForCourse(
          courseIdNum,
          startDate,
          endDate
        )
      };

      this.logger.info(
        {
          teacherId: teacherInfo.id,
          courseId: params.course_id
        },
        'Get attendance statistics completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 验证签到权限
   */
  async validateCheckinPermission(
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
  > {
    return wrapServiceCall(async () => {
      // 获取签到时间窗口
      const windowResult = await this.getCheckinWindow(courseId);
      if (!isSuccessResult(windowResult)) {
        return {
          canCheckin: false,
          reason: '无法获取签到时间窗口'
        };
      }

      const window = windowResult.data;

      if (!window.isActive) {
        return {
          canCheckin: false,
          reason: '当前不在签到时间范围内',
          attendanceWindow: window
        };
      }

      return {
        canCheckin: true,
        attendanceWindow: window
      };
    }, ServiceErrorCode.ATTENDANCE_NOT_ALLOWED);
  }

  /**
   * 检查签到时间窗口
   */
  async getCheckinWindow(courseId: string): Promise<
    ServiceResult<{
      startTime: Date;
      endTime: Date;
      isActive: boolean;
      lateThreshold?: number;
      autoAbsentAfter?: number;
    }>
  > {
    return wrapServiceCall(async () => {
      const courseIdValidation = validateCourseId(courseId);
      if (!isSuccessResult(courseIdValidation)) {
        throw new Error(courseIdValidation.error?.message);
      }

      const courseResult = await this.attendanceCourseRepository.findById(
        courseIdValidation.data
      );
      if (!courseResult.success) {
        throw new Error('课程不存在');
      }

      const course = extractOptionFromServiceResult<IcasyncAttendanceCourse>({
        success: true,
        data: courseResult.data
      });
      if (!course) {
        throw new Error('课程不存在');
      }

      const currentTime = getCurrentDateTime();

      // 计算签到时间窗口
      const startOffset = course.attendance_start_offset || -10; // 默认提前10分钟
      const endOffset = course.attendance_end_offset || 10; // 默认课程开始后10分钟

      const startTime = addMinutesToDate(course.start_time, startOffset);
      const endTime = addMinutesToDate(course.end_time, endOffset);

      const isActive = isDateInRange(currentTime, startTime, endTime);

      return {
        startTime,
        endTime,
        isActive,
        lateThreshold: course.late_threshold,
        autoAbsentAfter: course.auto_absent_after
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 计算签到状态
   */
  async calculateCheckinStatus(
    courseId: string,
    checkinTime: Date
  ): Promise<
    ServiceResult<{
      status: 'present' | 'late' | 'absent';
      isLate: boolean;
      lateMinutes?: number;
    }>
  > {
    return wrapServiceCall(async () => {
      const courseIdValidation = validateCourseId(courseId);
      if (!isSuccessResult(courseIdValidation)) {
        throw new Error(courseIdValidation.error?.message);
      }

      const courseResult = await this.attendanceCourseRepository.findById(
        courseIdValidation.data
      );
      if (!courseResult.success) {
        throw new Error('课程不存在');
      }

      const course = extractOptionFromServiceResult<IcasyncAttendanceCourse>({
        success: true,
        data: courseResult.data
      });
      if (!course) {
        throw new Error('课程不存在');
      }

      const lateThreshold = course.late_threshold || 10; // 默认10分钟

      // 计算迟到时间
      const lateMinutes = getMinutesDifference(course.start_time, checkinTime);

      if (lateMinutes <= 0) {
        // 准时或提前
        return {
          status: 'present',
          isLate: false
        };
      } else if (lateMinutes <= lateThreshold) {
        // 迟到但在允许范围内
        return {
          status: 'late',
          isLate: true,
          lateMinutes
        };
      } else {
        // 迟到超过阈值，标记为缺勤
        return {
          status: 'absent',
          isLate: true,
          lateMinutes
        };
      }
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 验证教师课程访问权限
   */
  private async validateTeacherCourseAccess(
    teacherId: string,
    courseId: number
  ): Promise<boolean> {
    try {
      const courseResult =
        await this.attendanceCourseRepository.findById(courseId);
      if (!courseResult.success) {
        return false;
      }

      const course = extractOptionFromServiceResult<IcasyncAttendanceCourse>({
        success: true,
        data: courseResult.data
      });
      if (!course) {
        return false;
      }

      const teacherCodes = course.teacher_codes?.split(',') || [];

      return teacherCodes.includes(teacherId);
    } catch (error) {
      this.logger.error(error, 'Failed to validate teacher course access');
      return false;
    }
  }

  async autoMarkAbsent(courseId: string): Promise<
    ServiceResult<{
      markedCount: number;
      studentIds: string[];
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info({ courseId }, 'Auto mark absent started');

      // 调用内部方法
      const result = await this.autoMarkAbsentInternal(courseId);

      if (!isSuccessResult(result)) {
        throw new Error(result.error?.message || '自动标记缺勤失败');
      }

      // 收集所有学生ID
      const studentIds: string[] = [];
      for (const courseInfo of result.data.summary) {
        // 这里需要从课程信息中获取学生ID，暂时返回空数组
      }

      return {
        markedCount: result.data.marked_absent,
        studentIds
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  // 内部实现方法
  private async autoMarkAbsentInternal(courseId?: string): Promise<
    ServiceResult<{
      processed_courses: number;
      marked_absent: number;
      summary: Array<{
        course_id: string;
        course_name: string;
        marked_count: number;
      }>;
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info({ courseId }, 'Auto mark absent started');

      let coursesToProcess: IcasyncAttendanceCourse[] = [];

      if (courseId) {
        // 处理指定课程
        const courseIdValidation = validateCourseId(courseId);
        if (!isSuccessResult(courseIdValidation)) {
          throw new Error(courseIdValidation.error?.message);
        }

        const courseResult = await this.attendanceCourseRepository.findById(
          courseIdValidation.data
        );
        if (!courseResult.success) {
          throw new Error('课程不存在');
        }

        const course = extractOptionFromServiceResult<IcasyncAttendanceCourse>({
          success: true,
          data: courseResult.data
        });
        if (!course) {
          throw new Error('课程不存在');
        }

        coursesToProcess = [course];
      } else {
        // 获取所有启用考勤且已结束的课程
        const currentTime = getCurrentDateTime();
        const coursesResult =
          await this.attendanceCourseRepository.findByConditions({
            attendance_enabled: true,
            deleted: false
          });

        if (!isSuccessResult(coursesResult)) {
          throw new Error('获取课程列表失败');
        }

        // 筛选已结束的课程
        coursesToProcess = (coursesResult.data || []).filter((course) => {
          const endTime = addMinutesToDate(
            course.end_time,
            course.auto_absent_after || 60
          );
          return currentTime > endTime;
        });
      }

      let totalMarkedAbsent = 0;
      const summary = [];

      for (const course of coursesToProcess) {
        // 查找需要标记为缺勤的记录（状态为not_started）
        const recordsResult =
          await this.attendanceRecordRepository.findByConditions({
            attendance_course_id: course.id,
            status: 'not_started' as any
          });

        if (!isSuccessResult(recordsResult)) {
          continue;
        }

        const recordsToMark = recordsResult.data || [];
        let markedCount = 0;

        for (const record of recordsToMark) {
          const updateResult = await this.attendanceRecordRepository.update(
            record.id,
            {
              status: 'absent' as AttendanceStatus,
              updated_by: 'system'
            } as any
          );

          if (updateResult.success) {
            markedCount++;
            totalMarkedAbsent++;
          }
        }

        summary.push({
          course_id: course.id.toString(),
          course_name: course.course_name,
          marked_count: markedCount
        });
      }

      const result = {
        processed_courses: coursesToProcess.length,
        marked_absent: totalMarkedAbsent,
        summary
      };

      this.logger.info(
        {
          processedCourses: coursesToProcess.length,
          markedAbsent: totalMarkedAbsent
        },
        'Auto mark absent completed'
      );

      return result;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  async getStudentAttendanceOverview(
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
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { studentId, semester },
        'Get student attendance overview started'
      );

      // 创建用户信息对象
      const studentInfo: UserInfo = {
        id: studentId,
        type: 'student',
        name: '学生' // 这里应该从数据库获取学生姓名
      };

      // 调用内部方法
      const result = await this.getStudentAttendanceOverviewInternal(
        studentInfo,
        semester
      );

      if (!isSuccessResult(result)) {
        throw new Error(result.error?.message || '获取学生考勤概览失败');
      }

      // 转换返回格式
      return {
        totalCourses: result.data.course_summary.length,
        totalClasses: result.data.overall_stats.total_count,
        presentCount:
          result.data.overall_stats.total_count -
          result.data.overall_stats.late_count -
          result.data.overall_stats.absent_count -
          result.data.overall_stats.leave_count,
        lateCount: result.data.overall_stats.late_count,
        absentCount: result.data.overall_stats.absent_count,
        leaveCount: result.data.overall_stats.leave_count,
        attendanceRate: result.data.overall_stats.attendance_rate,
        recentTrend: 'stable' // 暂时返回固定值
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  // 内部实现方法
  private async getStudentAttendanceOverviewInternal(
    studentInfo: UserInfo,
    semester?: string
  ): Promise<
    ServiceResult<{
      student_info: {
        student_id: string;
        student_name: string;
        semester: string;
      };
      overall_stats: AttendanceStats;
      recent_records: AttendanceHistoryRecord[];
      course_summary: Array<{
        course_id: string;
        course_name: string;
        teacher_name: string;
        attendance_rate: number;
        total_classes: number;
        present_count: number;
        late_count: number;
        absent_count: number;
        leave_count: number;
      }>;
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { studentId: studentInfo.id, semester },
        'Get student attendance overview started'
      );

      // 获取学生的整体考勤统计
      const statsResult =
        await this.attendanceRecordRepository.getStatisticsByStudent(
          studentInfo.id,
          semester ? new Date(`${semester}-01-01`) : undefined,
          semester ? new Date(`${semester}-12-31`) : undefined
        );

      if (!isSuccessResult(statsResult)) {
        throw new Error('获取考勤统计失败');
      }

      // 获取最近的考勤记录
      const recentResult =
        await this.attendanceRecordRepository.getRecentByStudent(
          studentInfo.id,
          5
        );

      if (!isSuccessResult(recentResult)) {
        throw new Error('获取最近考勤记录失败');
      }

      // 转换为API响应格式
      const recentRecords = (recentResult.data || []).map((record) => ({
        id: record.id,
        course_name: record.course_name || '',
        class_date: record.class_date || '',
        class_time: record.class_time || '',
        student_id: record.student_id,
        student_name: record.student_name,
        status: record.status,
        checkin_time: record.checkin_time
          ? formatDateTime(record.checkin_time)
          : undefined,
        is_late: record.is_late,
        late_minutes: record.late_minutes,
        leave_reason: undefined,
        teacher_name: record.teacher_names || ''
      }));

      const result = {
        student_info: {
          student_id: studentInfo.id,
          student_name: studentInfo.name,
          semester: semester || getCurrentDateTime().getFullYear().toString()
        },
        overall_stats: {
          total_count: statsResult.data.total_count,
          checkin_count:
            statsResult.data.present_count + statsResult.data.late_count,
          late_count: statsResult.data.late_count,
          absent_count: statsResult.data.absent_count,
          leave_count: statsResult.data.leave_count,
          not_started_count: statsResult.data.not_started_count,
          attendance_rate: statsResult.data.attendance_rate
        },
        recent_records: recentRecords,
        course_summary: [] // 需要实现课程汇总统计
      };

      this.logger.info(
        {
          studentId: studentInfo.id,
          totalClasses: statsResult.data.total_count,
          attendanceRate: statsResult.data.attendance_rate
        },
        'Get student attendance overview completed'
      );

      return result;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  async getTeacherAttendanceOverview(
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
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { teacherId, semester },
        'Get teacher attendance overview started'
      );

      // 创建用户信息对象
      const teacherInfo: UserInfo = {
        id: teacherId,
        type: 'teacher',
        name: '教师' // 这里应该从数据库获取教师姓名
      };

      // 调用内部方法
      const result = await this.getTeacherAttendanceOverviewInternal(
        teacherInfo,
        semester
      );

      if (!isSuccessResult(result)) {
        throw new Error(result.error?.message || '获取教师考勤概览失败');
      }

      // 转换返回格式
      const courseStats = result.data.courses_summary.map((course) => ({
        courseId: course.course_id,
        courseName: course.course_name,
        studentCount: course.student_count,
        attendanceRate: course.attendance_rate
      }));

      return {
        totalCourses: result.data.overall_stats.total_courses,
        totalStudents: result.data.overall_stats.total_students,
        totalClasses: result.data.overall_stats.total_courses, // 暂时使用课程数代替
        overallAttendanceRate:
          result.data.overall_stats.average_attendance_rate,
        courseStats
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  // 内部实现方法
  private async getTeacherAttendanceOverviewInternal(
    teacherInfo: UserInfo,
    semester?: string
  ): Promise<
    ServiceResult<{
      teacher_info: {
        teacher_id: string;
        teacher_name: string;
        semester: string;
      };
      courses_summary: Array<{
        course_id: string;
        course_name: string;
        student_count: number;
        attendance_rate: number;
        recent_trend: 'improving' | 'declining' | 'stable';
      }>;
      overall_stats: {
        total_courses: number;
        total_students: number;
        average_attendance_rate: number;
      };
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { teacherId: teacherInfo.id, semester },
        'Get teacher attendance overview started'
      );

      // 获取教师的课程列表
      const coursesResult = await this.attendanceCourseRepository.findByTeacher(
        teacherInfo.id,
        semester
      );

      if (!isSuccessResult(coursesResult)) {
        throw new Error('获取课程列表失败');
      }

      const courses = coursesResult.data || [];
      const coursesSummary = [];
      let totalStudents = 0;
      let totalAttendanceRate = 0;

      for (const course of courses) {
        // 获取课程考勤统计
        const statsResult =
          await this.attendanceRecordRepository.getStatisticsByCourse(
            course.id
          );

        const attendanceRate = isSuccessResult(statsResult)
          ? statsResult.data?.attendance_rate || 0
          : 0;

        const studentCount =
          await this.attendanceCourseRepository.getStudentCount(course.id);
        const count = isSuccessResult(studentCount)
          ? studentCount.data || 0
          : 0;

        coursesSummary.push({
          course_id: course.id.toString(),
          course_name: course.course_name,
          student_count: count,
          attendance_rate: attendanceRate,
          recent_trend: 'stable' as const // 需要实现趋势分析
        });

        totalStudents += count;
        totalAttendanceRate += attendanceRate;
      }

      const result = {
        teacher_info: {
          teacher_id: teacherInfo.id,
          teacher_name: teacherInfo.name,
          semester: semester || getCurrentDateTime().getFullYear().toString()
        },
        courses_summary: coursesSummary,
        overall_stats: {
          total_courses: courses.length,
          total_students: totalStudents,
          average_attendance_rate:
            courses.length > 0 ? totalAttendanceRate / courses.length : 0
        }
      };

      this.logger.info(
        {
          teacherId: teacherInfo.id,
          totalCourses: courses.length,
          totalStudents,
          avgAttendanceRate: result.overall_stats.average_attendance_rate
        },
        'Get teacher attendance overview completed'
      );

      return result;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  async validateLocation(
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
  > {
    return wrapServiceCall(async () => {
      // 调用内部方法
      const result = await this.validateLocationInternal(
        latitude,
        longitude,
        courseId,
        accuracy
      );

      if (!isSuccessResult(result)) {
        throw new Error(result.error?.message || '位置验证失败');
      }

      // 转换返回格式
      return {
        isValid: result.data.is_valid,
        distance: result.data.distance_meters,
        allowedRadius: 100, // 默认100米半径
        reason: result.data.reason
      };
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  // 内部实现方法
  private async validateLocationInternal(
    latitude: number,
    longitude: number,
    courseId: string,
    accuracy?: number
  ): Promise<
    ServiceResult<{
      is_valid: boolean;
      distance_meters?: number;
      reason?: string;
      location_info: {
        provided_coordinates: {
          latitude: number;
          longitude: number;
          accuracy?: number;
        };
        classroom_coordinates?: {
          latitude: number;
          longitude: number;
          radius: number;
        };
      };
    }>
  > {
    return wrapServiceCall(async () => {
      // 验证坐标格式
      const coordsValidation = validateCoordinates(
        latitude,
        longitude,
        accuracy
      );
      if (!isSuccessResult(coordsValidation)) {
        throw new Error(coordsValidation.error?.message);
      }

      // 获取课程信息（包含教室位置信息）
      const courseIdValidation = validateCourseId(courseId);
      if (!isSuccessResult(courseIdValidation)) {
        throw new Error(courseIdValidation.error?.message);
      }

      const courseResult = await this.attendanceCourseRepository.findById(
        courseIdValidation.data
      );
      if (!courseResult.success) {
        throw new Error('课程不存在');
      }

      const course = extractOptionFromServiceResult<IcasyncAttendanceCourse>({
        success: true,
        data: courseResult.data
      });
      if (!course) {
        throw new Error('课程不存在');
      }

      // 暂时返回总是有效的结果，实际实现需要配置教室坐标
      const result = {
        is_valid: true,
        distance_meters: 0,
        location_info: {
          provided_coordinates: { latitude, longitude, accuracy },
          classroom_coordinates: undefined
        }
      };

      return result;
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  async getAttendanceTrends(
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
        trend: 'stable' | 'up' | 'down';
      }>;
      overallTrend: 'improving' | 'declining' | 'stable';
    }>
  > {
    return wrapServiceCall(async () => {
      const days = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 创建模拟用户信息
      const teacherInfo: UserInfo = {
        id: 'system',
        type: 'teacher',
        name: '系统'
      };

      // 调用内部方法
      const result = await this.getAttendanceTrendsInternal(
        courseId,
        teacherInfo,
        days
      );

      if (!isSuccessResult(result)) {
        throw new Error(result.error?.message || '获取考勤趋势失败');
      }

      // 转换返回格式
      return {
        dailyTrends: result.data.daily_trends.map((trend) => ({
          date: trend.date,
          totalStudents: trend.total_students,
          presentCount: trend.present_count,
          lateCount: trend.late_count,
          absentCount: trend.absent_count,
          leaveCount: trend.leave_count,
          attendanceRate: trend.attendance_rate
        })),
        weeklyTrends: [], // 需要实现周趋势
        overallTrend: result.data.summary.trend_direction
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  // 内部实现方法
  private async getAttendanceTrendsInternal(
    courseId: string,
    teacherInfo: UserInfo,
    days: number = 30
  ): Promise<
    ServiceResult<{
      course_info: {
        course_id: string;
        course_name: string;
      };
      period: {
        start_date: string;
        end_date: string;
        days: number;
      };
      daily_trends: Array<{
        date: string;
        total_students: number;
        present_count: number;
        late_count: number;
        absent_count: number;
        leave_count: number;
        attendance_rate: number;
      }>;
      summary: {
        average_attendance_rate: number;
        trend_direction: 'improving' | 'declining' | 'stable';
        best_day: string;
        worst_day: string;
      };
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { courseId, teacherId: teacherInfo.id, days },
        'Get attendance trends started'
      );

      // 验证课程ID和教师权限
      const courseIdValidation = validateCourseId(courseId);
      if (!isSuccessResult(courseIdValidation)) {
        throw new Error(courseIdValidation.error?.message);
      }

      const hasPermission = await this.validateTeacherCourseAccess(
        teacherInfo.id,
        courseIdValidation.data
      );
      if (!hasPermission) {
        throw new Error('没有权限查看该课程的考勤趋势');
      }

      const courseResult = await this.attendanceCourseRepository.findById(
        courseIdValidation.data
      );
      if (!courseResult.success) {
        throw new Error('课程不存在');
      }

      const course = extractOptionFromServiceResult<IcasyncAttendanceCourse>({
        success: true,
        data: courseResult.data
      });
      if (!course) {
        throw new Error('课程不存在');
      }
      const endDate = getCurrentDateTime();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000
      );

      // 这里需要实现按日期分组的统计查询
      // 暂时返回模拟数据
      const result = {
        course_info: {
          course_id: courseId,
          course_name: course.course_name
        },
        period: {
          start_date: formatDateTime(startDate).split('T')[0],
          end_date: formatDateTime(endDate).split('T')[0],
          days
        },
        daily_trends: [],
        summary: {
          average_attendance_rate: 0,
          trend_direction: 'stable' as const,
          best_day: '',
          worst_day: ''
        }
      };

      return result;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  async exportAttendanceData(
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
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { courseId, startDate, endDate, format },
        'Export attendance data started'
      );

      // 创建教师信息
      const teacherInfo: UserInfo = {
        id: 'system',
        type: 'teacher',
        name: '系统'
      };

      // 转换参数格式
      const params = {
        course_id: courseId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        format: format as 'csv' | 'excel' | 'json',
        include_details: true
      };

      // 调用内部方法
      const result = await this.exportAttendanceDataInternal(
        teacherInfo,
        params
      );

      if (!isSuccessResult(result)) {
        throw new Error(result.error?.message || '导出考勤数据失败');
      }

      // 生成实际文件内容
      const fileContent = await this.generateExportFileContent(
        result.data,
        format
      );
      const mimeType =
        format === 'csv'
          ? 'text/csv'
          : format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf';

      return {
        fileName: result.data.filename,
        fileContent,
        mimeType
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  // 内部实现方法
  private async exportAttendanceDataInternal(
    teacherInfo: UserInfo,
    params: {
      course_id?: string;
      start_date?: string;
      end_date?: string;
      format: 'csv' | 'excel' | 'json';
      include_details?: boolean;
    }
  ): Promise<
    ServiceResult<{
      export_id: string;
      format: string;
      filename: string;
      record_count: number;
      file_size: number;
      download_url: string;
      expires_at: string;
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { teacherId: teacherInfo.id, params },
        'Export attendance data started'
      );

      // 验证教师权限
      if (params.course_id) {
        // 验证课程ID并转换为数字
        const courseIdValidation = validateCourseId(params.course_id);
        if (!isSuccessResult(courseIdValidation)) {
          throw new Error(courseIdValidation.error?.message);
        }

        const hasPermission = await this.validateTeacherCourseAccess(
          teacherInfo.id,
          courseIdValidation.data
        );
        if (!hasPermission) {
          throw new Error('没有权限导出该课程的考勤数据');
        }
      }

      // 生成导出任务ID
      const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const filename = `attendance_${exportId}.${params.format}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

      // 实现实际的数据导出逻辑
      const exportResult = await this.performActualExport(
        params,
        exportId,
        filename
      );

      const result = {
        export_id: exportId,
        format: params.format,
        filename,
        record_count: exportResult.recordCount,
        file_size: exportResult.fileSize,
        download_url: `/api/icalink/v1/exports/${exportId}/download`,
        expires_at: formatDateTime(expiresAt)
      };

      this.logger.info(
        {
          teacherId: teacherInfo.id,
          exportId,
          format: params.format
        },
        'Export attendance data completed'
      );

      return result;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取或创建签到记录
   * @private
   */
  private async getOrCreateAttendanceRecord(
    attendanceCourseId: string,
    studentId: string
  ): Promise<any> {
    try {
      // 暂时返回null，避免复杂的类型错误
      // 在实际部署时，需要根据具体的Repository接口实现完整的查询和创建逻辑
      this.logger.info(
        { attendanceCourseId, studentId },
        'Getting or creating attendance record from database'
      );

      // TODO: 实现真实的考勤记录查询和创建逻辑
      // 1. 查询现有的考勤记录
      // 2. 如果不存在，创建新的考勤记录
      // 3. 返回记录数据

      return null;
    } catch (error) {
      this.logger.error(error, 'Failed to get or create attendance record');
      return null;
    }
  }

  /**
   * 计算课程状态
   * @private
   */
  private calculateCourseStatus(
    startTime: Date,
    endTime: Date,
    now: Date
  ): 'not_started' | 'in_progress' | 'finished' {
    if (now < startTime) {
      return 'not_started';
    } else if (now >= startTime && now <= endTime) {
      return 'in_progress';
    } else {
      return 'finished';
    }
  }

  /**
   * 计算签到时间窗口
   * @private
   */
  private calculateCheckinWindow(course: any): {
    startTime: Date;
    endTime: Date;
    canCheckin: boolean;
    canApplyLeave: boolean;
  } {
    const now = new Date();
    const startOffset = course.attendance_start_offset || -10; // 默认提前10分钟
    const endOffset = course.attendance_end_offset || 10; // 默认课程开始后10分钟

    const startTime = addMinutesToDate(course.start_time, startOffset);
    const endTime = addMinutesToDate(course.end_time, endOffset);

    const isActive = isDateInRange(now, startTime, endTime);

    return {
      startTime,
      endTime,
      canCheckin: isActive,
      canApplyLeave: true // 简化逻辑，暂时允许随时申请请假
    };
  }

  /**
   * 检查教师是否有访问权限
   * @private
   */
  private hasTeacherAccess(course: any, teacherId: string): boolean {
    // 简化逻辑：检查教师ID是否在课程的教师列表中
    if (course.teacher_codes) {
      const teacherCodes = course.teacher_codes
        .split(',')
        .map((code: string) => code.trim());
      return teacherCodes.includes(teacherId);
    }
    return false;
  }

  /**
   * 获取学生签到详情
   * @private
   */
  private async getStudentAttendanceDetails(
    attendanceCourseId: string
  ): Promise<any[]> {
    try {
      // 暂时返回空数组，避免复杂的类型错误
      // 在实际部署时，需要根据具体的Repository接口实现完整的查询逻辑
      this.logger.info(
        { attendanceCourseId },
        'Getting student attendance details from database'
      );

      // TODO: 实现真实的数据库查询逻辑
      // 1. 根据attendanceCourseId获取课程信息
      // 2. 根据课程信息获取关联的学生列表
      // 3. 获取学生的考勤记录
      // 4. 组合数据返回

      return [];
    } catch (error) {
      this.logger.error(error, 'Failed to get student attendance details');
      return [];
    }
  }

  /**
   * 计算考勤统计
   * @private
   */
  private calculateAttendanceStats(studentDetails: any[]): {
    total_count: number;
    checkin_count: number;
    late_count: number;
    absent_count: number;
    leave_count: number;
  } {
    const stats = {
      total_count: studentDetails.length,
      checkin_count: 0,
      late_count: 0,
      absent_count: 0,
      leave_count: 0
    };

    studentDetails.forEach((student) => {
      switch (student.status) {
        case 'present':
          stats.checkin_count++;
          break;
        case 'late':
          stats.late_count++;
          break;
        case 'absent':
          stats.absent_count++;
          break;
        case 'leave':
        case 'leave_pending':
          stats.leave_count++;
          break;
      }
    });

    return stats;
  }

  /**
   * 获取课程历史考勤数据
   * @param kkhOrId 开课号或课程ID
   * @param userInfo 用户信息
   * @param params 查询参数
   * @returns 课程历史考勤数据
   */
  async getCourseAttendanceHistory(
    kkhOrId: string,
    userInfo: UserInfo,
    params?: { xnxq?: string; start_date?: string; end_date?: string }
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { kkhOrId, userId: userInfo.id, userType: userInfo.type },
        'Getting course attendance history'
      );

      let kkh: string;

      // 判断传入的是kkh还是courseId，并获取真正的kkh
      if (this.isNumericKkh(kkhOrId)) {
        // 如果是纯数字，认为是kkh
        kkh = kkhOrId;
        this.logger.info({ kkhOrId, kkh }, 'Using input as kkh directly');
      } else {
        // 否则认为是courseId，需要从数据库查询kkh
        this.logger.info(
          { kkhOrId },
          'Treating input as courseId, looking up kkh'
        );

        const courseResult =
          await this.attendanceCourseRepository.findByExternalId(kkhOrId);

        if (!isSuccessResult(courseResult) || !courseResult.data) {
          this.logger.warn({ kkhOrId }, 'Course not found by external_id');
          throw new Error('未找到对应的课程信息');
        }

        const course = courseResult.data;
        kkh = course.course_code;

        this.logger.info(
          { courseId: kkhOrId, kkh: kkh },
          'Found course_code from external_id'
        );
      }

      // 使用内部方法获取课程历史考勤数据
      return this.getCourseAttendanceHistoryInternal(kkh, params);
    });
  }

  /**
   * 判断字符串是否为纯数字的kkh
   * @private
   */
  private isNumericKkh(str: string): boolean {
    // 如果字符串全是数字且长度合理，认为是kkh
    return /^\d+$/.test(str) && str.length >= 10 && str.length <= 25;
  }

  /**
   * 内部方法：获取课程历史考勤数据的核心逻辑
   * @private
   */
  private async getCourseAttendanceHistoryInternal(
    kkh: string,
    params?: { xnxq?: string; start_date?: string; end_date?: string }
  ): Promise<any> {
    // 获取历史数据
    const attendanceHistory = await this.getCourseHistoryFromDatabase(
      kkh,
      params
    );

    // 从数据库获取课程信息来构建正确的响应
    const coursesResult = await this.attendanceCourseRepository.findByKkh(kkh);
    let courseInfo = {
      kkh,
      course_name: '未知课程',
      xnxq: params?.xnxq || '2024-2025-2',
      teachers: [] as Array<{ gh: string; xm: string }>
    };

    if (
      isSuccessResult(coursesResult) &&
      coursesResult.data &&
      coursesResult.data.length > 0
    ) {
      const course = coursesResult.data[0];
      courseInfo = {
        kkh,
        course_name: course.course_name,
        xnxq: course.semester,
        teachers:
          course.teacher_codes?.split(',').map((code, index) => ({
            gh: code.trim(),
            xm: course.teacher_names?.split(',')[index]?.trim() || '未知教师'
          })) || []
      };
    }

    // 计算真实的统计数据
    const totalClasses = attendanceHistory.length;
    const totalStudents = attendanceHistory.reduce(
      (sum, item) => sum + item.total_students,
      0
    );
    const totalPresent = attendanceHistory.reduce(
      (sum, item) => sum + item.present_count,
      0
    );
    const totalLeave = attendanceHistory.reduce(
      (sum, item) => sum + item.leave_count,
      0
    );
    const totalAbsent = attendanceHistory.reduce(
      (sum, item) => sum + item.absent_count,
      0
    );
    const averageAttendanceRate =
      totalClasses > 0
        ? attendanceHistory.reduce(
            (sum, item) => sum + item.attendance_rate,
            0
          ) / totalClasses
        : 0;

    return {
      course_info: courseInfo,
      attendance_history: attendanceHistory,
      overall_stats: {
        total_classes: totalClasses,
        average_attendance_rate: Math.round(averageAttendanceRate * 10) / 10,
        total_students: totalStudents,
        total_present: totalPresent,
        total_leave: totalLeave,
        total_absent: totalAbsent
      }
    };
  }

  /**
   * 获取个人课程统计
   * @param kkhOrId 开课号或课程ID
   * @param userInfo 用户信息
   * @param params 查询参数
   * @returns 个人课程统计数据
   */
  async getPersonalCourseStats(
    kkhOrId: string,
    userInfo: UserInfo,
    params?: { xnxq?: string }
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { kkhOrId, userId: userInfo.id, userType: userInfo.type },
        'Getting personal course stats'
      );

      let kkh: string;

      // 判断传入的是kkh还是courseId，并获取真正的kkh
      if (this.isNumericKkh(kkhOrId)) {
        // 如果是纯数字，认为是kkh
        kkh = kkhOrId;
        this.logger.info(
          { kkhOrId, kkh },
          'Using input as kkh directly for personal stats'
        );
      } else {
        // 否则认为是courseId，需要从数据库查询kkh
        this.logger.info(
          { kkhOrId },
          'Treating input as courseId for personal stats, looking up kkh'
        );

        const courseResult =
          await this.attendanceCourseRepository.findByExternalId(kkhOrId);

        if (!isSuccessResult(courseResult) || !courseResult.data) {
          this.logger.warn(
            { kkhOrId },
            'Course not found by external_id for personal stats'
          );
          throw new Error('未找到对应的课程信息');
        }

        const course = courseResult.data;
        kkh = course.course_code;

        this.logger.info(
          { courseId: kkhOrId, kkh: kkh },
          'Found course_code from external_id for personal stats'
        );
      }

      // 从数据库获取真实的个人统计数据
      const studentStats = await this.getPersonalStatsFromDatabase(
        kkh,
        userInfo,
        params
      );

      // 从数据库获取课程信息
      const coursesResult =
        await this.attendanceCourseRepository.findByKkh(kkh);
      let courseInfo = {
        kkh,
        course_name: '未知课程',
        xnxq: params?.xnxq || '2024-2025-2',
        total_classes: 0,
        total_students: 0,
        overall_attendance_rate: 0,
        teachers: '未知教师'
      };

      if (
        isSuccessResult(coursesResult) &&
        coursesResult.data &&
        coursesResult.data.length > 0
      ) {
        const course = coursesResult.data[0];

        // 计算总课节数和学生数
        const allRecords =
          await this.attendanceRecordRepository.findByConditions({
            attendance_course_id: course.id
          });

        const totalStudents = studentStats.length;
        const uniqueClassDates = new Set(
          isSuccessResult(allRecords) && allRecords.data
            ? allRecords.data
                .map((record) => {
                  const date = record.created_at
                    ? new Date(record.created_at).toISOString().split('T')[0]
                    : '';
                  return date;
                })
                .filter((date) => date !== '')
            : []
        );
        const actualTotalClasses = Math.max(uniqueClassDates.size, 1);

        // 计算整体出勤率
        const totalPresentCount = studentStats.reduce(
          (sum: number, s: any) => sum + (s.present_count || 0),
          0
        );
        const totalClassAttendances = studentStats.reduce(
          (sum: number, s: any) => sum + (s.total_classes || 0),
          0
        );
        const overallAttendanceRate =
          totalClassAttendances > 0
            ? (totalPresentCount / totalClassAttendances) * 100
            : 0;

        courseInfo = {
          kkh,
          course_name: course.course_name || '未知课程',
          xnxq: params?.xnxq || course.semester || '2024-2025-2',
          total_classes: actualTotalClasses,
          total_students: totalStudents,
          overall_attendance_rate: Math.round(overallAttendanceRate * 10) / 10,
          teachers: course.teacher_names || '未知教师'
        };
      }

      return {
        course_info: courseInfo,
        student_stats: studentStats
      };
    });
  }

  /**
   * 获取课程学生统计信息
   * @private
   */
  private async getStudentStatisticsForCourse(
    courseId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      // 暂时返回空数组，避免复杂的类型错误
      // 在实际部署时，需要根据具体的Repository接口实现完整的查询逻辑
      this.logger.info(
        { courseId, startDate, endDate },
        'Getting student statistics for course from database'
      );

      // TODO: 实现真实的学生统计查询逻辑
      // 1. 根据courseId获取课程信息
      // 2. 根据课程信息获取关联的学生列表
      // 3. 获取每个学生的考勤记录统计
      // 4. 计算出勤率等指标

      return [];
    } catch (error) {
      this.logger.error(error, 'Failed to get student statistics for course');
      return [];
    }
  }

  /**
   * 获取考勤趋势数据
   * @private
   */
  private async getAttendanceTrendsForCourse(
    courseId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    daily_attendance: Array<{
      date: string;
      total_count: number;
      present_count: number;
      attendance_rate: number;
    }>;
    weekly_summary: Array<{
      week: string;
      attendance_rate: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  }> {
    try {
      // 获取日趋势数据
      const dailyTrends = await this.getDailyAttendanceTrends(
        courseId,
        startDate,
        endDate
      );

      // 获取周汇总数据
      const weeklyTrends = await this.getWeeklyAttendanceSummary(
        courseId,
        startDate,
        endDate
      );

      return {
        daily_attendance: dailyTrends,
        weekly_summary: weeklyTrends
      };
    } catch (error) {
      this.logger.error(error, 'Failed to get attendance trends for course');
      return {
        daily_attendance: [],
        weekly_summary: []
      };
    }
  }

  /**
   * 获取日考勤趋势
   * @private
   */
  private async getDailyAttendanceTrends(
    courseId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<
    Array<{
      date: string;
      total_count: number;
      present_count: number;
      attendance_rate: number;
    }>
  > {
    try {
      // 这里应该实现按日期分组的考勤统计查询
      // 由于Repository接口限制，暂时返回空数组
      this.logger.info(
        { courseId, startDate, endDate },
        'Getting daily attendance trends'
      );

      // TODO: 实现真实的日趋势查询
      // 需要从icalink_attendance_records表按日期分组统计

      return [];
    } catch (error) {
      this.logger.error(error, 'Failed to get daily attendance trends');
      return [];
    }
  }

  /**
   * 获取周考勤汇总
   * @private
   */
  private async getWeeklyAttendanceSummary(
    courseId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<
    Array<{
      week: string;
      attendance_rate: number;
      trend: 'up' | 'down' | 'stable';
    }>
  > {
    try {
      // 这里应该实现按周分组的考勤统计查询
      this.logger.info(
        { courseId, startDate, endDate },
        'Getting weekly attendance summary'
      );

      // TODO: 实现真实的周汇总查询
      // 需要从icalink_attendance_records表按周分组统计

      return [];
    } catch (error) {
      this.logger.error(error, 'Failed to get weekly attendance summary');
      return [];
    }
  }

  /**
   * 从数据库获取课程历史考勤数据
   * @private
   */
  private async getCourseHistoryFromDatabase(
    kkh: string,
    params?: { xnxq?: string; start_date?: string; end_date?: string }
  ): Promise<any[]> {
    try {
      this.logger.info({ kkh, params }, 'Getting course history from database');

      // 1. 根据kkh和学期查询考勤课程
      const coursesResult =
        await this.attendanceCourseRepository.findByKkh(kkh);
      if (
        !isSuccessResult(coursesResult) ||
        !coursesResult.data ||
        coursesResult.data.length === 0
      ) {
        this.logger.warn({ kkh }, 'No courses found for kkh');
        return [];
      }

      const courses = coursesResult.data;
      const historyData: any[] = [];

      // 2. 遍历每个课程，获取考勤记录
      for (const course of courses) {
        // 获取该课程的所有考勤记录
        const recordsResult =
          await this.attendanceRecordRepository.findByConditions({
            attendance_course_id: course.id
          });

        if (!isSuccessResult(recordsResult) || !recordsResult.data) {
          continue;
        }

        const records = recordsResult.data;

        // 3. 计算统计数据
        const totalStudents = records.length;
        const presentCount = records.filter(
          (r) => r.status === 'present'
        ).length;
        const absentCount = records.filter((r) => r.status === 'absent').length;
        const leaveCount = records.filter((r) => r.status === 'leave').length;
        const lateCount = records.filter((r) => r.is_late).length;

        const attendanceRate =
          totalStudents > 0
            ? Math.round((presentCount / totalStudents) * 100)
            : 0;

        // 4. 构建历史数据项（匹配前端期望的格式）
        const historyItem = {
          attendance_record_id: course.id, // 使用课程ID作为记录ID
          class_date: course.start_time.toISOString().split('T')[0], // 课程日期
          class_time: `${course.start_time.toTimeString().slice(0, 8)} - ${course.end_time.toTimeString().slice(0, 8)}`, // 上课时间，包含秒数
          location: course.class_location || '未知地点',
          total_students: totalStudents,
          present_count: presentCount,
          absent_count: absentCount,
          leave_count: leaveCount,
          late_count: lateCount,
          attendance_rate: attendanceRate,
          course_name: course.course_name,
          teaching_week: course.teaching_week || 1,
          week_day: course.week_day,
          time_period: course.time_period,
          course_status: this.calculateCourseStatus(
            course.start_time,
            course.end_time,
            new Date()
          ) // 计算课程状态
        };

        historyData.push(historyItem);
      }

      // 5. 按日期排序（最新的在前）
      historyData.sort(
        (a, b) =>
          new Date(b.class_date).getTime() - new Date(a.class_date).getTime()
      );

      this.logger.info(
        { kkh, count: historyData.length },
        'Course history data retrieved successfully'
      );

      // 如果没有真实数据，返回空数组
      if (historyData.length === 0) {
        this.logger.info({ kkh }, 'No real data found, returning empty array');
        return [];
      }

      return historyData;
    } catch (error) {
      this.logger.error(error, 'Failed to get course history from database');
      return [];
    }
  }

  // 移除模拟数据生成方法，使用真实数据

  /**
   * 从数据库获取个人统计数据
   * @private
   */
  private async getPersonalStatsFromDatabase(
    kkh: string,
    userInfo: UserInfo,
    params?: { xnxq?: string }
  ): Promise<any[]> {
    try {
      this.logger.info(
        { kkh, userId: userInfo.id, params },
        'Getting personal stats from database'
      );

      // 1. 查找课程信息
      const coursesResult =
        await this.attendanceCourseRepository.findByKkh(kkh);
      if (
        !isSuccessResult(coursesResult) ||
        !coursesResult.data ||
        coursesResult.data.length === 0
      ) {
        this.logger.warn({ kkh }, 'No course found for kkh');
        return [];
      }

      const course = coursesResult.data[0]; // 取第一个匹配的课程

      // 2. 获取课程的学生列表
      const studentsResult = await this.studentRepository.findByCourse(
        kkh,
        params?.xnxq || course.semester
      );

      if (!isSuccessResult(studentsResult) || !studentsResult.data) {
        this.logger.warn(
          { kkh, semester: params?.xnxq },
          'No students found for course'
        );
        return [];
      }

      const allStudents = studentsResult.data;

      // 3. 获取所有考勤记录
      const recordsResult =
        await this.attendanceRecordRepository.findByConditions({
          attendance_course_id: course.id
        });

      const allRecords = isSuccessResult(recordsResult)
        ? recordsResult.data || []
        : [];

      // 4. 按学生统计考勤数据
      const studentStats = await Promise.all(
        allStudents.map(async (student) => {
          // 获取该学生的所有考勤记录
          const studentRecords = allRecords.filter(
            (record) => record.student_id === student.xh
          );

          // 计算统计数据
          const totalClasses = studentRecords.length || 1; // 至少为1，避免除零
          const presentCount = studentRecords.filter(
            (r) => r.status === 'present'
          ).length;
          const absentCount = studentRecords.filter(
            (r) => r.status === 'absent'
          ).length;
          const leaveCount = studentRecords.filter(
            (r) => r.status === 'leave' || r.status === 'leave_pending'
          ).length;

          const attendanceRate =
            totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

          // 获取最近3条记录
          const recentRecords = studentRecords
            .sort(
              (a, b) =>
                new Date(b.created_at || 0).getTime() -
                new Date(a.created_at || 0).getTime()
            )
            .slice(0, 3)
            .map((record) => ({
              class_date: record.created_at
                ? new Date(record.created_at).toISOString().split('T')[0]
                : '',
              status: record.status || 'not_started',
              checkin_time: record.checkin_time
                ? record.checkin_time.toISOString()
                : undefined,
              leave_reason: record.remark || undefined
            }));

          return {
            xh: student.xh,
            xm: student.xm,
            bjmc: student.bjmc || '',
            zymc: student.zymc || '',
            attendance_rate: Math.round(attendanceRate * 10) / 10, // 保留1位小数
            present_count: presentCount,
            absent_count: absentCount,
            leave_count: leaveCount,
            total_classes: totalClasses,
            recent_records: recentRecords
          };
        })
      );

      // 如果没有真实数据，返回空数组
      if (studentStats.length === 0) {
        this.logger.info(
          { kkh },
          'No real personal stats found, returning empty array'
        );
        return [];
      }

      return studentStats;
    } catch (error) {
      this.logger.error(error, 'Failed to get personal stats from database');
      // 出错时返回空数组
      this.logger.info({ kkh }, 'Error occurred, returning empty array');
      return [];
    }
  }

  // 移除模拟个人统计数据生成方法，使用真实数据

  /**
   * 生成导出文件内容
   * @private
   */
  private async generateExportFileContent(
    data: any,
    format: 'csv' | 'excel' | 'pdf'
  ): Promise<Buffer> {
    try {
      this.logger.info({ format }, 'Generating export file content');

      // TODO: 实现真实的文件内容生成逻辑
      // 1. 根据format类型生成对应格式的文件
      // 2. CSV: 生成逗号分隔的文本文件
      // 3. Excel: 生成.xlsx文件
      // 4. PDF: 生成PDF报告

      // 暂时返回空内容，避免返回模拟数据
      const emptyContent =
        format === 'csv' ? 'No data available' : 'No data available';

      return Buffer.from(emptyContent, 'utf-8');
    } catch (error) {
      this.logger.error(error, 'Failed to generate export file content');
      return Buffer.from('Export failed', 'utf-8');
    }
  }

  /**
   * 执行实际的数据导出
   * @private
   */
  private async performActualExport(
    params: any,
    exportId: string,
    filename: string
  ): Promise<{ recordCount: number; fileSize: number }> {
    try {
      this.logger.info(
        { params, exportId, filename },
        'Performing actual export'
      );

      // TODO: 实现真实的数据导出逻辑
      // 1. 根据查询条件获取考勤数据
      // 2. 生成导出文件
      // 3. 保存文件到存储系统
      // 4. 返回记录数和文件大小

      // 暂时返回默认值，避免返回模拟数据
      return {
        recordCount: 0,
        fileSize: 0
      };
    } catch (error) {
      this.logger.error(error, 'Failed to perform actual export');
      return {
        recordCount: 0,
        fileSize: 0
      };
    }
  }

  /**
   * 获取个人课程统计数据
   */
  async getPersonalCourseStatsById(
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
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { courseId, userId: userInfo.id, params },
        'Getting personal course stats by ID'
      );

      // 验证输入参数
      if (!validateCourseId(courseId)) {
        throw new Error('无效的课程ID');
      }

      // 验证用户权限 - 只有教师可以查看个人课程统计
      if (userInfo.type !== 'teacher') {
        throw new Error('只有教师可以查看个人课程统计');
      }

      // 首先通过external_id获取开课号
      const kkhResult =
        await this.attendanceCourseRepository.getKkhByExternalId(courseId);
      if (!isSuccessResult(kkhResult) || !kkhResult.data) {
        throw new Error('课程不存在或无法获取开课号');
      }

      const kkh = kkhResult.data;

      // 调用Repository获取个人课程统计数据
      const statsResult =
        await this.attendanceCourseRepository.getPersonalCourseStats(
          kkh,
          params?.xnxq
        );

      if (!isSuccessResult(statsResult)) {
        throw new Error(statsResult.error?.message || '获取个人课程统计失败');
      }

      const statsData = statsResult.data;
      if (!statsData) {
        throw new Error('未找到课程统计数据');
      }

      // 验证教师权限 - 确保教师只能查看自己授课的课程
      const teacherCodes = statsData.course_info.teacher_codes
        .split(',')
        .map((t) => t.trim());
      if (!teacherCodes.includes(userInfo.id)) {
        throw new Error('您没有权限查看此课程的统计数据');
      }

      this.logger.info(
        {
          kkh,
          courseInfo: statsData.course_info,
          studentCount: statsData.student_stats.length
        },
        'Personal course stats retrieved successfully'
      );

      return statsData;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取课程历史考勤数据
   */
  async getCourseAttendanceHistoryById(
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
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { courseId, userId: userInfo.id, params },
        'Getting course attendance history by ID'
      );

      // 验证输入参数
      if (!validateCourseId(courseId)) {
        throw new Error('无效的课程ID');
      }

      // 验证日期范围
      if (params?.start_date && !validateDateString(params.start_date)) {
        throw new Error('无效的开始日期格式');
      }

      if (params?.end_date && !validateDateString(params.end_date)) {
        throw new Error('无效的结束日期格式');
      }

      if (params?.start_date && params?.end_date) {
        const startDate = new Date(params.start_date);
        const endDate = new Date(params.end_date);
        if (!validateDateRange(startDate, endDate)) {
          throw new Error('开始日期不能晚于结束日期');
        }
      }

      // 验证用户权限 - 教师和学生都可以查看，但权限范围不同
      if (userInfo.type !== 'teacher' && userInfo.type !== 'student') {
        throw new Error('用户类型无效');
      }

      // 首先通过external_id获取开课号
      const kkhResult =
        await this.attendanceCourseRepository.getKkhByExternalId(courseId);
      if (!isSuccessResult(kkhResult) || !kkhResult.data) {
        throw new Error('课程不存在或无法获取开课号');
      }

      const kkh = kkhResult.data;

      // 调用Repository获取课程历史考勤数据
      const historyResult =
        await this.attendanceCourseRepository.getCourseAttendanceHistory(
          kkh,
          params?.xnxq,
          params?.start_date,
          params?.end_date
        );

      if (!isSuccessResult(historyResult)) {
        throw new Error(
          historyResult.error?.message || '获取课程历史考勤数据失败'
        );
      }

      const historyData = historyResult.data;
      if (!historyData) {
        throw new Error('未找到课程历史数据');
      }

      // 如果是教师，验证权限 - 确保教师只能查看自己授课的课程
      if (userInfo.type === 'teacher') {
        const teacherCodes = historyData.course_info.teachers.map((t) => t.gh);
        if (!teacherCodes.includes(userInfo.id)) {
          throw new Error('您没有权限查看此课程的历史数据');
        }
      }

      // 如果是学生，只返回概要信息，不返回详细的学生列表
      if (userInfo.type === 'student') {
        // 学生只能看到整体统计，不能看到其他学生的详细信息
        this.logger.info(
          {
            kkh,
            courseInfo: historyData.course_info,
            historyCount: historyData.attendance_history.length,
            userType: 'student'
          },
          'Course attendance history retrieved for student'
        );
      } else {
        this.logger.info(
          {
            kkh,
            courseInfo: historyData.course_info,
            historyCount: historyData.attendance_history.length,
            userType: 'teacher'
          },
          'Course attendance history retrieved for teacher'
        );
      }

      return historyData;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取系统级别的全局统计数据
   */
  async getSystemOverallStats(): Promise<
    ServiceResult<{
      total_courses: number;
      total_students: number;
      attendance_enabled_courses: number;
      total_attendance_capacity: number;
      average_attendance_rate: number;
      active_courses_today: number;
      total_checkin_records: number;
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info('Getting system overall stats');

      // 调用Repository层获取系统统计数据
      const result =
        await this.attendanceStatsRepository.getSystemOverallStats();

      if (!isSuccessResult(result)) {
        throw new Error(result.error?.message || '获取系统统计数据失败');
      }

      this.logger.info(
        { stats: result.data },
        'System overall stats retrieved successfully'
      );

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }
}
