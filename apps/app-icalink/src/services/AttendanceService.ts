import type { Logger, ServiceError } from '@stratix/core';
import type { IQueueAdapter } from '@stratix/queue';
import {
  isLeft,
  isNone,
  isSome,
  eitherLeft as left,
  eitherRight as right,
  type Either,
  type Maybe
} from '@stratix/utils/functional';

import AbsentStudentRelationRepository from '../repositories/AbsentStudentRelationRepository.js';
import AttendanceCourseRepository from '../repositories/AttendanceCourseRepository.js';
import AttendanceRecordRepository from '../repositories/AttendanceRecordRepository.js';
import AttendanceTodayViewRepository from '../repositories/AttendanceTodayViewRepository.js';
import AttendanceViewRepository from '../repositories/AttendanceViewRepository.js';
import ContactRepository from '../repositories/ContactRepository.js';
import CourseStudentRepository from '../repositories/CourseStudentRepository.js';
import LeaveApplicationRepository from '../repositories/LeaveApplicationRepository.js';
import VerificationWindowRepository from '../repositories/VerificationWindowRepository.js';

import { isAfter, isBefore, isEqual, startOfDay } from 'date-fns';
import type {
  CheckinDTO,
  CheckinResponse,
  CreateVerificationWindowRequest,
  CreateVerificationWindowResponse,
  GetCourseCompleteDataDTO,
  StudentAttendanceDetail,
  StudentCourseDataVO,
  TeacherCourseCompleteDataVO,
  TeacherInfo,
  UpdateCourseCheckinSettingDTO,
  UpdateCourseCheckinSettingResponse,
  UserInfo
} from '../types/api.js';
import type {
  AttendanceStatus,
  IcalinkAttendanceRecord,
  IcasyncAttendanceCourse
} from '../types/database.js';
import { ServiceErrorCode } from '../types/service.js';
import { formatDateTimeWithTimezone } from '../utils/datetime.js';
import type { IAttendanceService } from './interfaces/IAttendanceService.js';

// 定义考勤统计类型
interface AttendanceStats {
  total_count: number;
  checkin_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
  unstarted_count: number;
  attendance_rate: number;
}

export default class AttendanceService implements IAttendanceService {
  constructor(
    private readonly logger: Logger,
    private readonly queueClient: IQueueAdapter,
    private readonly contactRepository: ContactRepository,
    private readonly courseStudentRepository: CourseStudentRepository,
    private readonly attendanceCourseRepository: AttendanceCourseRepository,
    private readonly attendanceRecordRepository: AttendanceRecordRepository,
    private readonly attendanceViewRepository: AttendanceViewRepository,
    private readonly attendanceTodayViewRepository: AttendanceTodayViewRepository,
    private readonly leaveApplicationRepository: LeaveApplicationRepository,
    private readonly absentStudentRelationRepository: AbsentStudentRelationRepository,
    private readonly verificationWindowRepository: VerificationWindowRepository
  ) {}

  onReady() {
    // 注册签到队列 Worker
    this.logger.info('Registering checkin queue worker...');

    this.queueClient.process('checkin', async (job) => {
      this.logger.info(`🔄 Worker received job ${job.id}`, {
        jobId: job.id,
        data: job.data
      });

      try {
        const result = await this.processCheckinJob(job.data);
        this.logger.info(`✅ Job ${job.id} completed successfully`, result);
        return result;
      } catch (error) {
        this.logger.error(`❌ Job ${job.id} failed:`, error);
        throw error;
      }
    });

    this.logger.info('✅ Checkin queue worker registered successfully');
  }

  /**
   * 获取消息队列中失败的签到
   * @param page 页码
   * @param pageSize 每页数量
   */
  public async getFailedCheckinJobs(
    page: number,
    pageSize: number = 20
  ): Promise<Either<ServiceError, any>> {
    try {
      const queue = this.queueClient.getQueue('checkin');
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      const failedJobs = await queue.getFailed(start, end);
      const totalFailed = await queue.getFailedCount();

      return right({
        total: totalFailed,
        page,
        pageSize,
        data: failedJobs.map((job) => ({
          id: job.id,
          data: job.data,
          failedReason: job.failedReason,
          processedOn: job.processedOn
        }))
      });
    } catch (error) {
      this.logger.error('Failed to get failed checkin jobs', error);
      return left({
        code: String(ServiceErrorCode.UNKNOWN_ERROR),
        message: 'Failed to get failed checkin jobs'
      });
    }
  }

  /**
   * 获取消息队列中失败的签到
   *
   */

  /**
   * 获取课程完整数据
   * @param dto 请求参数
   * @returns 课程完整数据（学生视图或教师视图）
   */
  public async getCourseCompleteData(
    dto: GetCourseCompleteDataDTO
  ): Promise<
    Either<ServiceError, StudentCourseDataVO | TeacherCourseCompleteDataVO>
  > {
    const { externalId, userInfo, type } = dto;

    this.logger.debug({ externalId, type }, 'Getting course complete data');

    // 1. 查找课程
    const courseMaybe =
      await this.attendanceCourseRepository.findByExternalId(externalId);

    if (isNone(courseMaybe)) {
      return left({
        code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
        message: 'Course not found'
      });
    }

    const course = courseMaybe.value;

    // 2. 根据用户类型返回不同的视图
    if (type === 'student') {
      return this.buildStudentView(course, userInfo);
    } else {
      return this.buildTeacherView(course, userInfo);
    }
  }

  private compareDate(dbData: Date | string) {
    const date = dbData instanceof Date ? dbData : new Date(dbData);
    const day = startOfDay(date);
    const today = startOfDay(new Date());

    if (isEqual(day, today)) return 'equal'; // 等于今天
    if (isBefore(day, today)) return 'less'; // 小于今天（过去的日期）
    if (isAfter(day, today)) return 'greater'; // 大于今天（未来的日期）
  }

  /**
   * 构建学生视图（新版本 - 支持三种课程日期类型）
   */
  private async buildStudentView(
    course: IcasyncAttendanceCourse,
    userInfo: UserInfo
  ): Promise<Either<ServiceError, StudentCourseDataVO>> {
    const isToday = this.compareDate(course.start_time);

    this.logger.debug(
      {
        courseId: course.id,
        studentId: userInfo.userId,
        isToday
      },
      'Building student view'
    );

    // 判断课程日期类型
    if (isToday === 'less') {
      // 历史课程：从 icalink_absent_student_relations 表获取最终状态
      return this.buildHistoricalStudentView(course, userInfo);
    } else if (isToday === 'equal') {
      // 当前课程：从 v_attendance_realtime_details 视图获取实时状态
      return this.buildCurrentStudentView(course, userInfo);
    } else {
      // 未来课程：从 v_attendance_realtime_details 视图获取状态（仅限特定状态）
      return this.buildFutureStudentView(course, userInfo);
    }
  }

  /**
   * 构建历史课程的学生视图
   * 数据源：icalink_absent_student_relations 表（已包含学生完整信息）
   */
  private async buildHistoricalStudentView(
    course: IcasyncAttendanceCourse,
    userInfo: UserInfo
  ): Promise<Either<ServiceError, StudentCourseDataVO>> {
    this.logger.debug(
      { courseId: course.id, studentId: userInfo.userId },
      'Building historical student view'
    );

    // 查询历史缺勤记录（icalink_absent_student_relations 表已包含学生信息）
    const absentRecord =
      await this.absentStudentRelationRepository.findByCourseAndStudent(
        course.id,
        userInfo.userId
      );

    // 确定签到状态和学生信息
    let status: AttendanceStatus;
    let studentInfo: {
      xh: string;
      xm: string;
      bjmc: string;
      zymc: string;
    };

    if (absentRecord) {
      // 有缺勤记录：使用记录中的状态和学生信息
      status = absentRecord.absence_type as AttendanceStatus;
      studentInfo = {
        xh: absentRecord.student_id,
        xm: absentRecord.student_name || '',
        bjmc: absentRecord.class_name || '',
        zymc: absentRecord.major_name || ''
      };
    } else {
      // 没有缺勤记录：说明是正常出勤，需要从 icalink_contacts 表获取学生信息
      const contact = await this.contactRepository.findByUserId(
        userInfo.userId
      );

      if (!contact) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: 'Student contact not found'
        });
      }

      status = 'present' as AttendanceStatus;
      studentInfo = {
        xh: contact.user_id,
        xm: contact.user_name || '',
        bjmc: contact.class_name || '',
        zymc: contact.major_name || ''
      };
    }

    const vo: StudentCourseDataVO = {
      id: course.id,
      course: {
        external_id: course.external_id,
        kcmc: course.course_name,
        course_start_time: formatDateTimeWithTimezone(
          new Date(course.start_time)
        ),
        course_end_time: formatDateTimeWithTimezone(new Date(course.end_time)),
        room_s: course.class_location || '',
        xm_s: course.teacher_names || '',
        jc_s: course.periods || '',
        jxz: course.teaching_week,
        lq: '', // 楼区信息暂时为空
        rq: formatDateTimeWithTimezone(new Date(course.start_time)).split(
          'T'
        )[0],
        need_checkin: course.need_checkin // 0: 无需签到, 1: 需要签到
      },
      student: studentInfo,
      final_status: status
    };

    return right(vo);
  }

  /**
   * 构建当前课程的学生视图
   * 数据源：v_attendance_today_details 视图（单一数据源）
   */
  private async buildCurrentStudentView(
    course: any,
    userInfo: UserInfo
  ): Promise<Either<ServiceError, StudentCourseDataVO>> {
    this.logger.debug(
      { courseId: course.id, studentId: userInfo.userId },
      'Building current student view from v_attendance_today_details'
    );

    // 从 v_attendance_today_details 视图查询学生考勤详情
    // 该视图已包含学生基本信息和实时考勤状态
    const todayDetailMaybe =
      await this.attendanceTodayViewRepository.findByExternalIdAndStudent(
        course.external_id,
        userInfo.userId
      );

    if (isNone(todayDetailMaybe)) {
      return left({
        code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
        message: 'Student attendance detail not found in today view'
      });
    }

    const todayDetail = todayDetailMaybe.value;

    const status: AttendanceStatus =
      todayDetail.final_status as AttendanceStatus;

    // 查询最新签到窗口
    const latestWindow =
      await this.verificationWindowRepository.findLatestByCourse(course.id);

    // 查询当天的签到记录（用于获取详细的签到信息）
    const attendanceRecords =
      await this.attendanceRecordRepository.findByCourseAndStudent(
        course.id,
        userInfo.userId
      );

    // 构建 verification_windows 对象
    let verificationWindows:
      | {
          id: number;
          window_id: string;
          course_id: number;
          verification_round: number;
          open_time: string;
          duration_minutes: number;
          attendance_record?: {
            id: number;
            checkin_time: string;
            status: string;
            last_checkin_source: string;
            last_checkin_reason: string;
            window_id: string;
          };
        }
      | undefined;

    if (latestWindow) {
      verificationWindows = {
        ...latestWindow,
        open_time: formatDateTimeWithTimezone(new Date(latestWindow.open_time)),
        attendance_record: attendanceRecords
          ? {
              id: attendanceRecords.id,
              checkin_time: attendanceRecords.checkin_time
                ? formatDateTimeWithTimezone(
                    new Date(attendanceRecords.checkin_time)
                  )
                : '',
              status: attendanceRecords.status,
              last_checkin_source: attendanceRecords.last_checkin_source,
              last_checkin_reason: attendanceRecords.last_checkin_reason,
              window_id: attendanceRecords.window_id
            }
          : undefined
      };
    }

    const vo: StudentCourseDataVO = {
      id: course.id,
      attendance_record_id: todayDetail.attendance_record_id || undefined, // 从视图获取考勤记录ID
      course: {
        external_id: course.external_id,
        kcmc: course.course_name,
        course_start_time: formatDateTimeWithTimezone(
          new Date(course.start_time)
        ),
        course_end_time: formatDateTimeWithTimezone(new Date(course.end_time)),
        room_s: course.class_location || '',
        xm_s: course.teacher_names || '',
        jc_s: course.periods || '',
        jxz: course.teaching_week,
        lq: course.class_location || '', // 楼区信息暂时为空
        rq: formatDateTimeWithTimezone(new Date(course.start_time)).split(
          'T'
        )[0],
        need_checkin: course.need_checkin // 0: 无需签到, 1: 需要签到
      },
      student: {
        xh: todayDetail.student_id,
        xm: todayDetail.student_name || '',
        bjmc: todayDetail.class_name || '',
        zymc: todayDetail.major_name || ''
      },
      live_status: status,
      verification_windows: verificationWindows
    };

    return right(vo);
  }

  /**
   * 构建未来课程的学生视图
   * 数据源：v_attendance_realtime_details 视图（仅限特定状态）
   */
  private async buildFutureStudentView(
    course: any,
    userInfo: UserInfo
  ): Promise<Either<ServiceError, StudentCourseDataVO>> {
    this.logger.debug(
      { courseId: course.id, studentId: userInfo.userId },
      'Building future student view'
    );

    // 查询学生信息（从 icalink_contacts 表）
    const contact = await this.contactRepository.findByUserId(userInfo.userId);

    if (!contact) {
      return left({
        code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
        message: 'Student contact not found'
      });
    }

    // 查询实时考勤状态
    const realtimeDetail =
      await this.attendanceViewRepository.findByExternalIdAndStudent(
        course.external_id,
        userInfo.userId
      );

    // 未来课程只允许以下状态：leave, leave_pending, unstarted
    let status: AttendanceStatus = 'unstarted' as AttendanceStatus;
    if (isNone(realtimeDetail)) {
      // 没有实时详情，保持默认状态
      status = 'unstarted' as AttendanceStatus;
    } else {
      const detailStatus = realtimeDetail.value.final_status;
      if (detailStatus === 'leave' || detailStatus === 'leave_pending') {
        status = detailStatus as AttendanceStatus;
      }
    }

    // 查询考勤记录（用于请假和撤回请假）
    const attendanceRecords =
      await this.attendanceRecordRepository.findByCourseAndStudent(
        course.id,
        userInfo.userId
      );

    const vo: StudentCourseDataVO = {
      id: course.id,
      attendance_record_id: attendanceRecords?.id, // 考勤记录ID，用于请假申请和撤回请假
      course: {
        external_id: course.external_id,
        kcmc: course.course_name,
        course_start_time: formatDateTimeWithTimezone(
          new Date(course.start_time)
        ),
        course_end_time: formatDateTimeWithTimezone(new Date(course.end_time)),
        room_s: course.class_location || '',
        xm_s: course.teacher_names || '',
        jc_s: course.periods || '',
        jxz: course.teaching_week,
        lq: '', // 楼区信息暂时为空
        rq: formatDateTimeWithTimezone(new Date(course.start_time)).split(
          'T'
        )[0],
        need_checkin: course.need_checkin // 0: 无需签到, 1: 需要签到
      },
      student: {
        xh: contact.user_id,
        xm: contact.user_name || '',
        bjmc: contact.class_name || '',
        zymc: contact.major_name || ''
      },
      pending_status: status
    };

    return right(vo);
  }

  /**
   * 计算是否可以签到
   * 规则：
   * 1. 窗口签到时间：窗口开始时间后的 2 分钟内
   * 2. 自主签到时间：课程开始时间前 10 分钟到课程开始时间后 10 分钟
   * 3. 特殊状态：如果学生状态为"请假"或"请假未审批"，则不能签到
   */
  private calculateCanCheckin(
    now: Date,
    courseStartTime: Date,
    currentStatus: AttendanceStatus,
    latestWindow: any
  ): boolean {
    // 如果已经请假或请假待审批，不能签到
    if (currentStatus === 'leave' || currentStatus === 'leave_pending') {
      return false;
    }

    // 如果已经签到，不能再次签到
    if (currentStatus === 'present' || currentStatus === 'late') {
      return false;
    }

    // 检查窗口签到时间
    if (latestWindow && latestWindow.status === 'open') {
      const windowOpenTime = new Date(latestWindow.open_time);
      const windowValidUntil = new Date(
        windowOpenTime.getTime() + 2 * 60 * 1000
      ); // 窗口开始后 2 分钟内
      if (now >= windowOpenTime && now <= windowValidUntil) {
        return true;
      }
    }

    // 检查自主签到时间
    const selfCheckinStart = new Date(
      courseStartTime.getTime() - 10 * 60 * 1000
    ); // 课程开始前 10 分钟
    const selfCheckinEnd = new Date(courseStartTime.getTime() + 10 * 60 * 1000); // 课程开始后 10 分钟
    if (now >= selfCheckinStart && now <= selfCheckinEnd) {
      return true;
    }

    return false;
  }

  /**
   * 构建教师视图（新版本 - 支持三种课程日期类型）
   */
  private async buildTeacherView(
    course: IcasyncAttendanceCourse,
    _userInfo: UserInfo
  ): Promise<Either<ServiceError, TeacherCourseCompleteDataVO>> {
    const isToday = this.compareDate(course.start_time);

    this.logger.debug(
      {
        courseId: course.id,
        isToday
      },
      'Building student view'
    );

    // 判断课程日期类型
    if (isToday === 'less') {
      // 历史课程：从 icalink_absent_student_relations 表获取最终状态
      return this.buildHistoricalTeacherView(course);
    } else if (isToday === 'equal') {
      // 当前课程：从 v_attendance_realtime_details 视图获取实时状态
      return this.buildCurrentTeacherView(course);
    } else {
      // 未来课程：从 v_attendance_realtime_details 视图获取状态（仅限特定状态）
      return this.buildFutureTeacherView(course);
    }
  }

  /**
   * 构建历史课程的教师视图
   * 数据源：icalink_absent_student_relations 表
   * 优化：通过 Repository 层查询，使用单条 SQL + LEFT JOIN 关联缺勤记录表
   */
  private async buildHistoricalTeacherView(
    course: IcasyncAttendanceCourse
  ): Promise<Either<ServiceError, TeacherCourseCompleteDataVO>> {
    this.logger.debug(
      { courseId: course.id },
      'Building historical teacher view'
    );

    // 通过 Repository 层查询教学班学生及其缺勤状态
    // Repository 使用 LEFT JOIN 关联以下表：
    // - out_xsxx: 学生信息表（获取姓名、班级、专业）
    // - icalink_absent_student_relations: 缺勤记录表（获取缺勤状态）
    const result =
      await this.courseStudentRepository.findStudentsWithAttendanceStatus(
        course.course_code,
        course.semester,
        course.id
      );

    const studentsWithStatus = result.students;
    const repositoryStats = result.stats;

    this.logger.debug(
      {
        courseId: course.id,
        studentCount: studentsWithStatus.length,
        stats: repositoryStats
      },
      'Fetched students with attendance status from repository'
    );

    // 历史课程不允许创建签到窗口
    const vo: TeacherCourseCompleteDataVO = {
      course,
      students: result.students,
      stats: result.stats,
      status: 'final'
    };

    return right(vo);
  }

  /**
   * 构建当前课程的教师视图
   * 数据源：v_attendance_realtime_details 视图 + icalink_verification_windows 表
   */
  private async buildCurrentTeacherView(
    course: IcasyncAttendanceCourse
  ): Promise<Either<ServiceError, TeacherCourseCompleteDataVO>> {
    this.logger.debug({ courseId: course.id }, 'Building current teacher view');

    // 1. 通过 Repository 查询教学班学生及其实时考勤状态
    // 这个方法会关联 out_jw_kcb_xs、out_xsxx 和 v_attendance_realtime_details
    // 并按考勤状态排序（缺勤、请假、旷课的放在前面）
    const result =
      await this.courseStudentRepository.findStudentsWithRealtimeStatus(
        course.course_code,
        course.semester,
        course.external_id
      );

    const studentsWithStatus = result.students;
    const repositoryStats = result.stats;

    this.logger.debug(
      {
        courseId: course.id,
        studentCount: studentsWithStatus.length,
        stats: repositoryStats
      },
      'Fetched students with realtime attendance status from repository'
    );

    // 2. 查询最新的签到窗口
    const latestWindow =
      await this.verificationWindowRepository.findLatestByCourse(course.id);

    // 3. 构建签到窗口信息
    let attendanceWindow = undefined;

    if (latestWindow) {
      attendanceWindow = {
        id: latestWindow.id,
        open_time: latestWindow.open_time.toISOString(),
        window_id: latestWindow.window_id,
        course_id: latestWindow.course_id,
        external_id: course.external_id,
        duration_minutes: latestWindow.duration_minutes
      };
    }

    const vo: TeacherCourseCompleteDataVO = {
      course,
      students: studentsWithStatus,
      stats: repositoryStats,
      status: 'in_progress',
      attendance_window: attendanceWindow
    };

    return right(vo);
  }

  /**
   * 构建未来课程的教师视图
   * 数据源：v_attendance_realtime_details 视图
   *
   * @description
   * 未来课程的教师视图需要显示：
   * 1. 教学班的所有学生列表
   * 2. 学生的请假状态（如果有提前请假）
   * 3. 统计信息（总人数、请假人数等）
   *
   * 数据来源：
   * - 教学班学生：通过 CourseStudentRepository 查询
   * - 请假状态：通过 v_attendance_realtime_details 视图获取（视图会自动关联 icalink_attendance_records 表）
   */
  private async buildFutureTeacherView(
    course: IcasyncAttendanceCourse
  ): Promise<Either<ServiceError, TeacherCourseCompleteDataVO>> {
    this.logger.debug({ courseId: course.id }, 'Building future teacher view');

    // 1. 通过 Repository 查询教学班学生及其实时考勤状态
    // 这个方法会关联 out_jw_kcb_xs、out_xsxx 和 v_attendance_realtime_details
    // 对于未来课程，v_attendance_realtime_details 视图会显示学生的请假状态（如果有提前请假）
    const result =
      await this.courseStudentRepository.findStudentsWithRealtimeStatus(
        course.course_code,
        course.semester,
        course.external_id
      );

    const { students: studentsWithStatus, stats: repositoryStats } = result;

    this.logger.debug(
      {
        courseId: course.id,
        totalStudents: repositoryStats.total_count,
        leaveCount: repositoryStats.leave_count
      },
      'Fetched future course students with leave status'
    );

    // 2. 构建返回数据
    // 对于未来课程，学生的状态可能是：
    // - 'absent': 默认状态（还未签到）
    // - 'leave': 已批准的请假
    // - 'leave_pending': 待审批的请假
    const vo: TeacherCourseCompleteDataVO = {
      course,
      students: studentsWithStatus.map((student) => ({
        ...student,
        absence_type: 'unstarted' as AttendanceStatus
      })),
      stats: {
        total_count: repositoryStats.total_count,
        checkin_count: 0, // 未来课程还未开始签到
        absent_count: 0,
        leave_count: repositoryStats.leave_count,
        truant_count: 0
      },
      status: 'not_started'
    };

    return right(vo);
  }

  /**
   * 计算教师视图的统计信息
   */
  private calculateTeacherStats(
    students: StudentAttendanceDetail[]
  ): AttendanceStats {
    const totalCount = students.length;
    const checkinCount = students.filter(
      (s) => s.absence_type === 'present' || s.absence_type === 'late'
    ).length;
    const lateCount = students.filter((s) => s.absence_type === 'late').length;
    const absentCount = students.filter(
      (s) => s.absence_type === 'absent'
    ).length;
    const leaveCount = students.filter(
      (s) => s.absence_type === 'leave' || s.absence_type === 'leave_pending'
    ).length;
    const unstartedCount = students.filter(
      (s) => s.absence_type === 'unstarted'
    ).length;

    return {
      total_count: totalCount,
      checkin_count: checkinCount,
      late_count: lateCount,
      absent_count: absentCount,
      leave_count: leaveCount,
      unstarted_count: unstartedCount,
      attendance_rate: totalCount > 0 ? (checkinCount / totalCount) * 100 : 0
    };
  }

  /**
   * 解析教师信息
   */
  private parseTeacherInfo(
    teacherCode: string,
    teacherName: string
  ): TeacherInfo[] {
    if (!teacherCode || !teacherName) {
      return [];
    }

    const codes = teacherCode.split(',');
    const names = teacherName.split(',');

    return codes.map((code, index) => ({
      teacher_id: code.trim(),
      teacher_name: names[index]?.trim() || ''
    }));
  }

  /**
   * 学生签到
   * @param dto 签到 DTO
   * @returns 签到响应
   *
   * @description
   * 优化后的签到接口（性能优化版本）：
   * 1. 移除课程存在性校验（高频请求优化）
   * 2. 移除选课关系校验（高频请求优化）
   * 3. 移除时间窗口校验（改为异步校验）
   * 4. 移除幂等性校验（改为异步校验）
   * 5. 仅进行基本参数验证和权限验证
   * 6. 快速将任务加入队列，由队列 Worker 异步处理所有校验和业务逻辑
   */
  public async checkin(
    dto: CheckinDTO
  ): Promise<Either<ServiceError, CheckinResponse>> {
    const { courseExtId, studentInfo, checkinData } = dto;

    this.logger.debug(
      { courseExtId, studentId: studentInfo.userId },
      'Processing checkin request'
    );

    // 1. 权限验证：确保用户是学生
    if (studentInfo.userType !== 'student') {
      return left({
        code: String(ServiceErrorCode.PERMISSION_DENIED),
        message: '用户身份验证失败：需要学生权限'
      });
    }

    // 2. 验证必填字段
    if (!checkinData.course_start_time) {
      return left({
        code: String(ServiceErrorCode.VALIDATION_FAILED),
        message: '缺少课程开始时间参数'
      });
    }

    // 3. 判断是否为照片签到（通过 photo_url 字段判断）
    const isPhotoCheckin = !!checkinData.photo_url;

    // 4. 记录签到时间（用户点击签到按钮的时间）
    const checkinTime = new Date();

    // 5. 判断签到类型（窗口签到 vs 自主签到）
    const isWindowCheckin = !!(
      checkinData.window_id &&
      checkinData.window_open_time &&
      checkinData.window_close_time
    );

    // 6. 生成唯一的 jobId（用于队列幂等性）
    // 包含时分秒，允许同一天多次签到（例如：多节课程）
    const jobId = `checkin_${courseExtId}_${studentInfo.userId}_${checkinTime.toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

    // 7. 将签到任务加入队列（异步处理）
    // 所有校验逻辑（时间窗口、幂等性）都在队列 Worker 中异步完成
    this.logger.info('Queueing check-in job', {
      courseExtId,
      studentId: studentInfo.userId,
      jobId,
      isPhotoCheckin
    });

    try {
      await this.queueClient.add(
        'checkin',
        {
          courseExtId, // 使用外部课程 ID
          studentInfo,
          checkinData, // 包含完整的时间窗口信息
          checkinTime: checkinTime.toISOString(),
          isWindowCheckin // 传递签到时间（加入队列的时间）
        },
        {
          jobId // 使用 jobId 实现队列级别的幂等性
        }
      );

      return right({
        status: 'queued',
        message: '签到请求已接受处理'
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to queue check-in job');
      return left({
        code: String(ServiceErrorCode.UNKNOWN_ERROR),
        message: '签到任务入队失败'
      });
    }
  }

  /**
   * 处理签到队列任务
   * @param data 队列任务数据
   * @returns 处理结果
   *
   * @description
   * 在消息队列 Worker 中异步处理签到逻辑：
   * 1. 时间窗口校验（异步）
   * 2. 幂等性校验（异步）
   * 3. 查询课程和选课关系（异步校验）
   * 4. 查询学生信息（获取班级、专业等）
   * 5. 准备签到数据（位置、时间等）
   * 6. 处理窗口期签到的特殊逻辑
   * 7. 创建新的签到记录（业务规则：只新增，不更新）
   *
   * @note
   * - 时间窗口校验和幂等性校验从同步接口移至异步队列处理
   * - 签到时间是用户点击签到按钮的时间（加入队列的时间），不是队列处理的时间
   * - 业务规则：签到只新增记录，不会更新已有记录
   */
  private async processCheckinJob(data: any): Promise<any> {
    const {
      courseExtId,
      studentInfo,
      checkinData,
      checkinTime,
      isWindowCheckin
    } = data;

    this.logger.info(
      { courseExtId, studentId: studentInfo.userId, isWindowCheckin },
      'Processing checkin job from queue'
    );

    try {
      // 1. 判断是否为照片签到（通过photo_url字段判断）
      const isPhotoCheckin = !!checkinData.photo_url;

      // 2. 时间窗口校验（异步）
      // 照片签到跳过时间窗口校验，因为是位置校验失败后的补救措施
      // 使用传入的签到时间和时间窗口参数进行验证
      const checkinDateTime = new Date(checkinTime);
      const courseStartTime = new Date(checkinData.course_start_time);

      let timeWindowValid = false;

      if (isPhotoCheckin) {
        // 照片签到：跳过时间窗口校验，直接通过
        timeWindowValid = true;
        this.logger.info(
          {
            studentId: studentInfo.userId,
            photoUrl: checkinData.photo_url
          },
          'Photo checkin - skipping time window validation'
        );
      } else if (isWindowCheckin) {
        // 窗口期签到：检查签到时间是否在窗口时间范围内
        const windowOpenTime = new Date(checkinData.window_open_time);
        const windowCloseTime = new Date(checkinData.window_close_time);

        if (
          checkinDateTime >= windowOpenTime &&
          checkinDateTime <= windowCloseTime
        ) {
          timeWindowValid = true;
        }

        this.logger.debug(
          {
            checkinTime: checkinDateTime.toISOString(),
            windowOpenTime: windowOpenTime.toISOString(),
            windowCloseTime: windowCloseTime.toISOString(),
            valid: timeWindowValid
          },
          'Window checkin time validation'
        );
      } else {
        // 自主签到：检查签到时间是否在课程开始前10分钟至课程开始后10分钟内
        const selfCheckinStart = new Date(
          courseStartTime.getTime() - 10 * 60 * 1000
        );
        const selfCheckinEnd = new Date(
          courseStartTime.getTime() + 10 * 60 * 1000
        );

        if (
          checkinDateTime >= selfCheckinStart &&
          checkinDateTime <= selfCheckinEnd
        ) {
          timeWindowValid = true;
        }

        this.logger.debug(
          {
            checkinTime: checkinDateTime.toISOString(),
            selfCheckinStart: selfCheckinStart.toISOString(),
            selfCheckinEnd: selfCheckinEnd.toISOString(),
            valid: timeWindowValid
          },
          'Self checkin time validation'
        );
      }

      if (!timeWindowValid) {
        this.logger.warn(
          {
            courseExtId,
            studentId: studentInfo.userId,
            checkinTime: checkinDateTime.toISOString(),
            isWindowCheckin
          },
          'Checkin time not in valid window - rejecting'
        );
        throw new Error('当前不在签到时间窗口内');
      }

      // 2. 查询课程信息（需要先获取内部 course.id 用于后续查询）
      const courseMaybe =
        await this.attendanceCourseRepository.findById(courseExtId);

      if (isNone(courseMaybe)) {
        this.logger.error(
          { courseExtId },
          'Course not found in queue processing'
        );
        throw new Error('Course not found');
      }

      const course = courseMaybe.value;

      // 3. 幂等性校验（异步）
      // 检查是否已存在相同的签到记录（基于课程内部ID、学生、签到时间）
      const existingRecordMaybe = await this.attendanceRecordRepository.findOne(
        (qb) =>
          qb
            .where('attendance_course_id', '=', course.id)
            .where('student_id', '=', studentInfo.userId)
            .where('checkin_time', '=', checkinDateTime)
      );

      if (isSome(existingRecordMaybe)) {
        this.logger.warn(
          {
            courseId: course.id,
            courseExtId,
            studentId: studentInfo.userId,
            checkinTime: checkinDateTime.toISOString()
          },
          'Duplicate checkin record detected - skipping'
        );
        // 返回成功，但不创建新记录（幂等性保证）
        return {
          success: true,
          message: 'Checkin already processed (idempotent)',
          data: {
            courseId: course.id,
            studentId: studentInfo.userId,
            isDuplicate: true
          }
        };
      }

      // 4. 验证选课关系（在队列中异步校验）
      const enrollmentMaybe = await this.courseStudentRepository.findOne((qb) =>
        qb
          .clearSelect()
          .select(['xh'])
          .where('kkh', '=', course.course_code)
          .where('xh', '=', studentInfo.userId)
          .where('zt', 'in', ['add', 'update'])
      );

      if (isNone(enrollmentMaybe)) {
        this.logger.error(
          { courseId: course.id, studentId: studentInfo.userId },
          'Student not enrolled in course'
        );
        throw new Error('Student not enrolled in course');
      }

      // 5. 查询学生信息（从 icalink_contacts 表获取班级、专业等信息）
      const contact = await this.contactRepository.findByUserId(
        studentInfo.userId
      );

      const studentData = contact
        ? {
            id: contact.user_id,
            xm: contact.user_name,
            bjmc: contact.class_name,
            zymc: contact.major_name
          }
        : null;

      // 6. 准备签到数据
      // isPhotoCheckin 已在前面定义
      const checkinRecordData: Partial<IcalinkAttendanceRecord> = {
        checkin_time: checkinDateTime,
        checkin_location: checkinData.location,
        checkin_latitude: checkinData.latitude,
        checkin_longitude: checkinData.longitude,
        checkin_accuracy: checkinData.accuracy,
        remark: checkinData.remark,
        // 照片签到设置为待审批状态，正常签到设置为已签到状态
        status: isPhotoCheckin
          ? ('pending_approval' as AttendanceStatus)
          : ('present' as AttendanceStatus),
        updated_by: studentInfo.userId
      };

      // 7. 处理照片签到的特殊逻辑
      if (isPhotoCheckin && checkinData.photo_url) {
        // 照片签到：将照片URL和位置偏移距离保存到 metadata 字段
        checkinRecordData.metadata = {
          photo_url: checkinData.photo_url,
          location_offset_distance:
            checkinData.location_offset_distance || null,
          reason: '位置校验失败，使用照片签到'
        };
        checkinRecordData.last_checkin_source = 'photo';
        checkinRecordData.last_checkin_reason = '位置校验失败，使用照片签到';

        this.logger.info(
          {
            studentId: studentInfo.userId,
            photoUrl: checkinData.photo_url,
            locationOffsetDistance: checkinData.location_offset_distance
          },
          'Photo checkin processed - pending approval'
        );
      } else if (isWindowCheckin && checkinData.window_id) {
        // 9. 处理窗口期签到的特殊逻辑
        // 查询窗口信息
        const window = await this.verificationWindowRepository.findByWindowId(
          checkinData.window_id
        );

        if (window) {
          // 窗口期签到：更新窗口相关字段
          checkinRecordData.window_id = checkinData.window_id;
          checkinRecordData.last_checkin_source = 'window';
          // 注意：verification_status、verification_round、last_verification_time 字段
          // 在当前数据库表结构中不存在，需要先添加这些字段才能使用
          // 暂时注释掉，等待数据库迁移完成后再启用
          // checkinRecordData.verification_status = 'verified';
          // checkinRecordData.verification_round = window.verification_round;
          // checkinRecordData.last_verification_time = new Date();

          this.logger.info(
            {
              windowId: checkinData.window_id,
              verificationRound: window.verification_round
            },
            'Window checkin processed'
          );
        } else {
          this.logger.warn(
            { windowId: checkinData.window_id },
            'Window not found, treating as regular checkin'
          );
          checkinRecordData.last_checkin_source = 'regular';
        }
      } else {
        // 正常签到
        checkinRecordData.last_checkin_source = 'regular';
      }

      // 8. 写入签到数据到数据库
      // 业务规则：签到只新增记录，不会更新已有记录
      // 幂等性通过 BullMQ 的 jobId 机制保证，相同 jobId 的任务只会被处理一次
      const newRecord = {
        attendance_course_id: course.id,
        student_id: studentInfo.userId,
        student_name: studentData?.xm || studentInfo.userName || '',
        class_name: studentData?.bjmc || '',
        major_name: studentData?.zymc || '',
        ...checkinRecordData,
        created_by: studentInfo.userId
      } as any;

      const createResult =
        await this.attendanceRecordRepository.create(newRecord);

      if (isLeft(createResult)) {
        this.logger.error(
          {
            courseId: course.id,
            studentId: studentInfo.userId,
            error: createResult.left
          },
          'Failed to create attendance record'
        );
        throw new Error('Failed to create attendance record');
      }

      this.logger.info(
        { courseId: course.id, studentId: studentInfo.userId },
        'Attendance record created successfully'
      );

      return {
        success: true,
        message: 'Checkin processed successfully',
        data: {
          courseId: course.id,
          studentId: studentInfo.userId,
          status: checkinRecordData.status,
          isWindowCheckin
        }
      };
    } catch (error) {
      this.logger.error(
        { error, courseExtId, studentId: studentInfo.userId },
        'Failed to process checkin job'
      );
      throw error;
    }
  }

  // Disabled - AttendanceStatsRepository removed
  // public async getCourseAttendanceHistoryById(
  //   courseId: string,
  //   userInfo: UserInfo,
  //   params: { xnxq?: string; start_date?: string; end_date?: string }
  // ): Promise<Either<ServiceError, any>> {
  //   const courseResult = await this.attendanceCourseRepository.findOne((qb) =>
  //     qb.where('external_id', '=', courseId)
  //   );
  //   if (isLeft(courseResult)) return left(courseResult.left);

  //   const course = courseResult.right.value;
  //   if (!course)
  //     return left({
  //       code: ServiceErrorCode.RESOURCE_NOT_FOUND,
  //       message: 'course not found'
  //     });

  //   const statsResult =
  //     await this.attendanceStatsRepository.getCourseAttendanceStats({
  //       ...params,
  //       course_code: course.course_code
  //     });
  //   if (isLeft(statsResult)) return left(statsResult.left);

  //   return right({
  //     course_info: {},
  //     attendance_history: statsResult.right,
  //     overall_stats: {}
  //   });
  // }

  // Disabled - AttendanceStatsRepository removed
  // public async getPersonalCourseStatsById(
  //   courseId: string,
  //   userInfo: UserInfo,
  //   params: { xnxq?: string }
  // ): Promise<Either<ServiceError, any>> {
  //   const courseResult = await this.attendanceCourseRepository.findOne((qb) =>
  //     qb.where('external_id', '=', courseId)
  //   );
  //   if (isLeft(courseResult)) return left(courseResult.left);

  //   const course = courseResult.right.value;
  //   if (!course)
  //     return left({
  //       code: ServiceErrorCode.RESOURCE_NOT_FOUND,
  //       message: 'course not found'
  //     });

  //   const statsResult =
  //     await this.attendanceStatsRepository.getStudentAttendanceStats({
  //       ...params,
  //       course_code: course.course_code
  //     });
  //   if (isLeft(statsResult)) return left(statsResult.left);

  //   return right({ course_info: {}, student_stats: statsResult.right });
  // }

  /**
   * 创建签到窗口
   * @param courseId 课程 ID（内部 ID）
   * @param teacherId 教师 ID
   * @param request 创建请求
   * @returns 创建结果
   */
  public async createVerificationWindow(
    courseId: number,
    teacherId: string,
    request: CreateVerificationWindowRequest
  ): Promise<Either<ServiceError, CreateVerificationWindowResponse>> {
    this.logger.info(
      { courseId, teacherId, request },
      'Creating verification window'
    );

    // 1. 验证课程是否存在
    const courseMaybe = (await this.attendanceCourseRepository.findOne((qb) =>
      qb.where('id', '=', courseId)
    )) as unknown as Maybe<any>;

    if (isNone(courseMaybe)) {
      return left({
        code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
        message: '课程不存在'
      });
    }

    const course = courseMaybe.value;

    // 2. 验证教师权限（检查是否为该课程的授课教师）
    const teacherCodes =
      course.teacher_codes?.split(',').map((c: string) => c.trim()) || [];
    if (!teacherCodes.includes(teacherId)) {
      this.logger.warn(
        { courseId, teacherId, teacherCodes },
        'Teacher not authorized to create window'
      );
      return left({
        code: String(ServiceErrorCode.FORBIDDEN),
        message: '您不是该课程的授课教师，无权创建签到窗口'
      });
    }

    // 3. 验证时间条件（课程开始后 10 分钟至课程结束时间）
    const now = new Date();
    const courseStartTime = new Date(course.start_time);
    const courseEndTime = new Date(course.end_time);
    const windowCreateStart = new Date(
      courseStartTime.getTime() + 10 * 60 * 1000
    );

    if (now < windowCreateStart) {
      return left({
        code: String(ServiceErrorCode.INVALID_OPERATION),
        message: '课程开始后 10 分钟才能创建签到窗口'
      });
    }

    if (now > courseEndTime) {
      return left({
        code: String(ServiceErrorCode.INVALID_OPERATION),
        message: '课程已结束，无法创建签到窗口'
      });
    }

    // 4. 检查是否已有活跃的签到窗口
    const activeWindow =
      await this.verificationWindowRepository.findActiveByCourse(courseId);

    if (activeWindow) {
      const windowValidEnd = new Date(
        new Date(activeWindow.open_time).getTime() + 2 * 60 * 1000
      );

      if (now < windowValidEnd) {
        return left({
          code: String(ServiceErrorCode.INVALID_OPERATION),
          message: '已存在活跃的签到窗口，请等待当前窗口结束后再创建'
        });
      }
    }

    // 5. 获取验证轮次
    const maxRound =
      await this.verificationWindowRepository.getMaxVerificationRound(courseId);
    const currentRound = maxRound + 1;

    // 7. 创建签到窗口记录
    const durationMinutes = request.duration_minutes || 2; // 默认 2 分钟
    const startTime = now;
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
    const windowId = `vw_${courseId}_${currentRound}_${Date.now()}`;

    const createResult = await this.verificationWindowRepository.create({
      window_id: windowId,
      course_id: courseId,
      external_id: course.external_id,
      verification_round: currentRound,
      open_time: startTime,
      close_time: endTime,
      opened_by: teacherId,
      status: 'open',
      duration_minutes: durationMinutes,
      actual_checkin_count: 0
    } as any);

    if (isLeft(createResult)) {
      this.logger.error(
        { error: createResult.left },
        'Failed to create verification window'
      );
      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: '创建签到窗口失败'
      });
    }

    this.logger.info(
      {
        windowId,
        courseId,
        verificationRound: currentRound
      },
      'Verification window created successfully'
    );

    // 8. 返回创建结果
    return right({
      window_id: windowId,
      verification_round: currentRound,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'open',
      message: `签到窗口已创建（第 ${currentRound} 轮），有效时间 ${durationMinutes} 分钟`
    });
  }

  /**
   * 教师补卡
   * @param courseId 课程ID
   * @param teacherId 教师ID
   * @param studentId 学生ID
   * @param reason 补卡原因
   * @returns 补卡结果
   *
   * @description
   * 教师为学生手动补卡的业务逻辑：
   * 1. 验证课程是否存在
   * 2. 验证教师权限（是否为该课程的授课教师）
   * 3. 验证学生是否注册了该课程
   * 4. 查询学生信息（班级、专业等）
   * 5. 每次补卡都创建新的签到记录（不更新已有记录）
   * 6. 记录补卡人、补卡时间、补卡原因
   */
  public async teacherManualCheckin(
    courseId: number,
    teacherId: string,
    studentId: string,
    reason?: string
  ): Promise<Either<ServiceError, { record_id: number; message: string }>> {
    this.logger.info(
      { courseId, teacherId, studentId },
      'Teacher manual checkin request'
    );

    // 1. 验证课程是否存在
    const courseMaybe = (await this.attendanceCourseRepository.findOne((qb) =>
      qb.where('id', '=', courseId).where('deleted_at', 'is', null)
    )) as unknown as Maybe<IcasyncAttendanceCourse>;

    if (isNone(courseMaybe)) {
      this.logger.warn({ courseId }, 'Course not found');
      return left({
        code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
        message: '课程不存在'
      });
    }

    const course = courseMaybe.value;

    // 2. 验证教师权限（检查是否为该课程的授课教师）
    const teacherCodes =
      course.teacher_codes?.split(',').map((c: string) => c.trim()) || [];
    if (!teacherCodes.includes(teacherId)) {
      this.logger.warn(
        { courseId, teacherId, teacherCodes },
        'Teacher not authorized for this course'
      );
      return left({
        code: String(ServiceErrorCode.FORBIDDEN),
        message: '您不是该课程的授课教师，无权为学生补卡'
      });
    }

    // 3. 验证学生是否注册了该课程
    const enrollmentMaybe = await this.courseStudentRepository.findOne((qb) =>
      qb
        .where('kkh', '=', course.course_code)
        .where('xh', '=', studentId)
        .where('zt', 'in', ['add', 'update'])
    );

    if (isNone(enrollmentMaybe)) {
      this.logger.warn(
        { courseId, studentId },
        'Student not enrolled in this course'
      );
      return left({
        code: String(ServiceErrorCode.VALIDATION_FAILED),
        message: '该学生未注册此课程'
      });
    }

    // 4. 查询学生信息（从 icalink_contacts 表）
    const contact = await this.contactRepository.findByUserId(studentId);

    const studentData = contact
      ? {
          xm: contact.user_name,
          bjmc: contact.class_name,
          zymc: contact.major_name
        }
      : null;

    // 5. 每次补卡都创建新记录（不检查已有记录）
    const now = new Date();
    const manualOverrideTime = now;

    const newRecord = {
      attendance_course_id: courseId,
      student_id: studentId,
      student_name: studentData?.xm || '',
      class_name: studentData?.bjmc || '',
      major_name: studentData?.zymc || '',
      status: 'present' as AttendanceStatus,
      checkin_time: manualOverrideTime,
      checkin_location: '教师补卡',
      is_late: false,
      last_checkin_source: 'manual',
      last_checkin_reason: reason || '教师补卡',
      manual_override_by: teacherId,
      manual_override_time: manualOverrideTime,
      manual_override_reason: reason || '教师补卡',
      created_by: teacherId
    } as any;

    const createResult =
      await this.attendanceRecordRepository.create(newRecord);

    if (isLeft(createResult)) {
      this.logger.error(
        { error: createResult.left },
        'Failed to create attendance record'
      );
      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: '创建签到记录失败'
      });
    }

    const recordId = createResult.right.id;

    this.logger.info(
      { recordId, courseId, studentId, teacherId },
      'Attendance record created by teacher manual checkin'
    );

    return right({
      record_id: recordId,
      message: '补卡成功'
    });
  }

  /**
   * 审批照片签到
   *
   * 教师审批学生的照片签到记录：
   * - approved: 将状态从 pending_approval 改为 present 或 late
   * - rejected: 将状态从 pending_approval 改为 absent
   *
   * @param recordId - 签到记录ID
   * @param action - 审批动作：approved/rejected
   * @param teacherId - 教师ID
   * @param remark - 审批备注
   */
  async approvePhotoCheckin(
    recordId: number,
    action: 'approved' | 'rejected',
    teacherId: string,
    remark?: string
  ): Promise<Either<ServiceError, { record_id: number; message: string }>> {
    try {
      this.logger.info(
        { recordId, action, teacherId },
        'Approving photo checkin'
      );

      // 1. 查询签到记录
      const recordMaybe =
        await this.attendanceRecordRepository.findById(recordId);

      if (isNone(recordMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '签到记录不存在'
        });
      }

      const record = recordMaybe.value;

      // 2. 验证记录状态（只能审批 pending_approval 状态的记录）
      if (record.status !== 'pending_approval') {
        return left({
          code: String(ServiceErrorCode.VALIDATION_FAILED),
          message: `签到记录状态不是待审批状态，当前状态：${record.status}`
        });
      }

      // 3. 验证是否为照片签到（检查 metadata 中是否有 photo_url）
      const metadata = record.metadata as any;
      if (!metadata || !metadata.photo_url) {
        return left({
          code: String(ServiceErrorCode.VALIDATION_FAILED),
          message: '该签到记录不是照片签到'
        });
      }

      // 4. 准备更新数据
      let newStatus: AttendanceStatus;
      let approvalRemark: string;

      if (action === 'approved') {
        // 审批通过：设置为 present（暂不判断迟到，统一设为 present）
        newStatus = 'present' as AttendanceStatus;
        approvalRemark = remark || '照片签到审批通过';
      } else {
        // 审批拒绝：设置为 absent
        newStatus = 'absent' as AttendanceStatus;
        approvalRemark = remark || '照片签到审批拒绝';
      }

      // 5. 更新签到记录
      const updateData: Partial<IcalinkAttendanceRecord> = {
        status: newStatus,
        remark: approvalRemark,
        updated_by: teacherId,
        manual_override_by: teacherId,
        manual_override_time: new Date(),
        manual_override_reason: approvalRemark
      };

      const updateResult = await this.attendanceRecordRepository.update(
        recordId,
        updateData
      );

      if (isLeft(updateResult)) {
        this.logger.error(
          { recordId, error: updateResult.left },
          'Failed to update attendance record'
        );
        return left({
          code: String(ServiceErrorCode.DATABASE_ERROR),
          message: '更新签到记录失败'
        });
      }

      this.logger.info(
        { recordId, action, newStatus, teacherId },
        'Photo checkin approved successfully'
      );

      return right({
        record_id: recordId,
        message: action === 'approved' ? '审批通过' : '审批拒绝'
      });
    } catch (error) {
      this.logger.error(
        { error, recordId, action },
        'Failed to approve photo checkin'
      );
      return left({
        code: String(ServiceErrorCode.UNKNOWN_ERROR),
        message: '审批照片签到失败'
      });
    }
  }

  /**
   * 更新课程签到设置
   * @param dto - 更新课程签到设置 DTO
   * @returns 更新结果
   */
  public async updateCourseCheckinSetting(
    dto: UpdateCourseCheckinSettingDTO
  ): Promise<Either<ServiceError, UpdateCourseCheckinSettingResponse>> {
    const { courseId, needCheckin, userInfo } = dto;

    try {
      this.logger.debug(
        { courseId, needCheckin, userId: userInfo.userId },
        'Updating course checkin setting'
      );

      // 1. 查询课程信息
      const courseMaybe = await this.attendanceCourseRepository.findOne((qb) =>
        qb.where('id', '=', courseId)
      );

      if (isNone(courseMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: 'Course not found'
        });
      }

      const course = courseMaybe.value;

      // 2. 权限验证：检查用户是否是该课程的授课教师
      if (userInfo.userType !== 'teacher') {
        return left({
          code: String(ServiceErrorCode.PERMISSION_DENIED),
          message: 'Only teachers can update course checkin settings'
        });
      }

      // 检查教师工号是否在课程的教师列表中
      const teacherCodes = course.teacher_codes?.split(',') || [];
      if (!teacherCodes.includes(userInfo.userId)) {
        return left({
          code: String(ServiceErrorCode.PERMISSION_DENIED),
          message: 'You are not authorized to update this course'
        });
      }

      // 3. 课程状态验证：只允许未开始的课程修改签到设置
      const now = new Date();
      const courseStartTime = new Date(course.start_time);

      if (isBefore(now, courseStartTime) === false) {
        return left({
          code: String(ServiceErrorCode.BUSINESS_RULE_VIOLATION),
          message:
            'Only courses that have not started can update checkin settings'
        });
      }

      // 4. 更新课程的 need_checkin 字段
      const updateData: Partial<IcasyncAttendanceCourse> = {
        need_checkin: needCheckin,
        updated_by: userInfo.userId
      };

      const updateResult = await this.attendanceCourseRepository.update(
        courseId,
        updateData
      );

      if (isLeft(updateResult)) {
        this.logger.error(
          { courseId, error: updateResult.left },
          'Failed to update course checkin setting'
        );
        return left({
          code: String(ServiceErrorCode.DATABASE_ERROR),
          message: 'Failed to update course checkin setting'
        });
      }

      this.logger.info(
        { courseId, needCheckin, userId: userInfo.userId },
        'Course checkin setting updated successfully'
      );

      return right({
        course_id: courseId,
        need_checkin: needCheckin,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(
        { error, courseId, needCheckin },
        'Failed to update course checkin setting'
      );
      return left({
        code: String(ServiceErrorCode.UNKNOWN_ERROR),
        message: 'Failed to update course checkin setting'
      });
    }
  }
}
