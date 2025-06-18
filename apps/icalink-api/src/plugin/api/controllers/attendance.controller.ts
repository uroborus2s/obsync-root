/**
 * 考勤签到控制器
 * 处理学生签到相关的业务逻辑
 */

import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from '@stratix/core';
import { AttendanceRepository } from '../repositories/attendance-repository.js';
import { CourseScheduleRepository } from '../repositories/course-schedule-repository.js';
import { LeaveApprovalRepository } from '../repositories/leave-approval-repository.js';
import { LeaveAttachmentRepository } from '../repositories/leave-attachment-repository.js';
import { StudentAttendanceRepository } from '../repositories/student-attendance-repository.js';
import { CourseScheduleEntity } from '../repositories/types.js';
import { CourseService } from '../services/course.service.js';
import { StudentService } from '../services/student.service.js';
import { TeacherService } from '../services/teacher.service.js';
import {
  AttendanceStatus,
  type AttachmentViewResponse,
  type CourseAttendanceHistoryResponse,
  type PersonalCourseStatsResponse,
  type StudentAttendanceSearchResponse,
  type StudentCheckInRequest,
  type StudentCheckInResponse,
  type StudentLeaveApplicationQueryResponse,
  type StudentLeaveRequest,
  type StudentLeaveResponse,
  type StudentWithdrawLeaveRequest,
  type StudentWithdrawLeaveResponse,
  type TeacherApprovalRequest,
  type TeacherApprovalResponse,
  type TeacherLeaveApplicationQueryResponse
} from '../types/attendance.js';
import type { JwtPayload } from '../utils/jwt.util.js';
import { calculateCourseTimeAndStatus } from '../utils/time.js';

/**
 * 获取学生签到记录接口
 */
const getStudentAttendanceRecord = async (
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { type?: 'student' | 'teacher' };
  }>,
  reply: FastifyReply
): Promise<StudentAttendanceSearchResponse> => {
  try {
    const { id } = request.params;
    const { type = 'student' } = request.query;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    // 验证参数
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: '缺少签到记录ID'
      });
    }

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少ex_user_id字段'
      });
    }

    // 从DI容器获取Repository实例
    const attendanceRepo =
      request.diScope.resolve<AttendanceRepository>('attendanceRepo');
    const studentAttendanceRepo =
      request.diScope.resolve<StudentAttendanceRepository>(
        'studentAttendanceRepo'
      );
    const courseScheduleRepo =
      request.diScope.resolve<CourseScheduleRepository>('courseScheduleRepo');

    // 获取考勤记录基本信息
    const attendanceRecord = await attendanceRepo.getAttendanceRecord(id);
    if (!attendanceRecord) {
      return reply.code(404).send({
        success: false,
        message: '未找到签到记录'
      });
    }

    // 获取课程详细信息（教室和教师信息）
    const courseSchedules = await courseScheduleRepo.findByKkh(
      attendanceRecord.kkh
    );
    const courseInfo =
      courseSchedules.find(
        (schedule: CourseScheduleEntity) =>
          schedule.rq === attendanceRecord.rq &&
          schedule.jc === parseInt(attendanceRecord.jc_s.split('-')[0] || '1')
      ) || courseSchedules[0]; // 如果找不到精确匹配，使用第一条记录

    // 根据type参数选择相应的服务
    let userInfo: any;
    let userType: string;
    let studentAttendance: any = null;

    if (type === 'teacher') {
      // 创建教师服务实例
      const createTeacher =
        request.diScope.resolve<(payload: JwtPayload) => TeacherService>(
          'createTeacher'
        );
      const teacherService = createTeacher(payload);

      try {
        const teacherData = await teacherService.getTeacherInfo();
        if (!teacherData) {
          return reply.code(404).send({
            success: false,
            message: '未找到教师信息'
          });
        }

        userInfo = {
          id: teacherData.gh,
          name: teacherData.xm,
          department: teacherData.ssdwmc,
          title: teacherData.zc
        };
        userType = 'teacher';
      } finally {
        teacherService.dispose();
      }
    } else {
      // 创建学生服务实例
      const createStudent =
        request.diScope.resolve<(payload: JwtPayload) => StudentService>(
          'createStudent'
        );
      const studentService = createStudent(payload);

      try {
        const studentData = await studentService.getStudentInfo();
        if (!studentData) {
          return reply.code(404).send({
            success: false,
            message: '未找到学生信息'
          });
        }

        userInfo = {
          id: studentData.xh,
          name: studentData.xm,
          className: studentData.bjmc,
          majorName: studentData.zymc
        };
        userType = 'student';

        // 获取该学生的签到记录
        if (studentData.xh) {
          studentAttendance =
            await studentAttendanceRepo.getStudentAttendanceByRecordAndStudent(
              id,
              studentData.xh
            );
        }
      } finally {
        studentService.dispose();
      }
    }

    // 获取考勤统计信息
    const stats = await studentAttendanceRepo.getAttendanceStats(id);

    request.log.info('获取签到记录:', {
      attendanceId: id,
      userType,
      userId: userInfo.id,
      userName: userInfo.name,
      isCheckedIn: studentAttendance?.status === 'present'
    });

    // 判断课程当前状态
    // 使用工具函数计算课程时间和状态
    const { courseStartTime, courseEndTime, courseStatus } =
      calculateCourseTimeAndStatus(
        attendanceRecord.rq,
        attendanceRecord.sj_f,
        attendanceRecord.sj_t
      );

    // 构建响应数据
    const response: StudentAttendanceSearchResponse = {
      success: true,
      data: {
        course: {
          kcmc: attendanceRecord.kcmc,
          course_start_time: courseStartTime.toISOString(),
          course_end_time: courseEndTime.toISOString(),
          room_s: courseInfo?.room || '',
          xm_s: courseInfo?.xms || '',
          jc_s: attendanceRecord.jc_s,
          jxz: attendanceRecord.jxz,
          lq: attendanceRecord.lq || courseInfo?.lq || null,
          status: courseStatus
        },
        student:
          type === 'teacher'
            ? {
                xh: 'TEACHER',
                xm: userInfo.name || '',
                bjmc: userInfo.department || '',
                zymc: userInfo.title || ''
              }
            : {
                xh: userInfo.id || '',
                xm: userInfo.name || '',
                bjmc: userInfo.className || '',
                zymc: userInfo.majorName || ''
              },
        attendance_status: (() => {
          if (type === 'teacher') {
            // 教师用户没有签到功能
            return {
              is_checked_in: false,
              can_checkin: false,
              can_leave: false,
              auto_start_time: attendanceRecord.auto_start_time || '',
              auto_close_time: attendanceRecord.auto_close_time || ''
            };
          }

          // 学生用户的签到状态逻辑
          const isAttendanceActive = attendanceRecord.status === 'active';
          const currentStatus = studentAttendance?.status;

          // 根据当前状态确定权限
          let canCheckin = false;
          let canLeave = false;

          if (isAttendanceActive) {
            switch (currentStatus) {
              case 'present':
                // 已签到，不能再签到或请假
                canCheckin = false;
                canLeave = false;
                break;
              case 'leave':
                // 已请假，不能再签到或请假
                canCheckin = false;
                canLeave = false;
                break;
              case 'absent':
              case undefined:
              case null:
                // 未签到或无记录，可以签到或请假
                canCheckin = true;
                canLeave = true;
                break;
              default:
                // 其他状态，保守处理，不允许操作
                canCheckin = false;
                canLeave = false;
                break;
            }
          }

          return {
            is_checked_in: currentStatus === 'present',
            status: currentStatus,
            checkin_time: studentAttendance?.checkin_time
              ? new Date(studentAttendance.checkin_time).toISOString()
              : undefined,
            can_checkin: canCheckin,
            can_leave: canLeave,
            auto_start_time: attendanceRecord.auto_start_time || '',
            auto_close_time: attendanceRecord.auto_close_time || ''
          };
        })(),
        stats: {
          total_count: stats.total_count,
          checkin_count: stats.present_count,
          late_count: 0, // 这个需要从其他地方计算或存储
          absent_count: stats.absent_count,
          leave_count: stats.leave_count
        }
      }
    };

    request.log.info('成功获取签到记录:', {
      attendanceId: id,
      userType,
      userId: userInfo.id,
      isCheckedIn: response.data?.attendance_status.is_checked_in
    });

    return response;
  } catch (error) {
    request.log.error('获取签到记录失败:', {
      error: error instanceof Error ? error.message : String(error),
      attendanceId: request.params.id,
      type: request.query.type,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '获取签到记录失败'
    });
  }
};

/**
 * 教师查看学生打卡详情接口
 */
const getTeacherAttendanceRecord = async (
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { type?: 'student' | 'teacher' };
  }>,
  reply: FastifyReply
): Promise<any> => {
  try {
    const { id } = request.params;
    const { type = 'teacher' } = request.query;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    // 验证参数
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: '缺少签到记录ID'
      });
    }

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少ex_user_id字段'
      });
    }

    // 只允许教师类型查询
    if (type !== 'teacher') {
      return reply.code(400).send({
        success: false,
        message: '此接口仅支持教师查询'
      });
    }

    // 从DI容器获取Repository实例
    const attendanceRepo =
      request.diScope.resolve<AttendanceRepository>('attendanceRepo');
    const studentAttendanceRepo =
      request.diScope.resolve<StudentAttendanceRepository>(
        'studentAttendanceRepo'
      );
    const courseScheduleRepo =
      request.diScope.resolve<CourseScheduleRepository>('courseScheduleRepo');

    // 获取考勤记录基本信息
    const attendanceRecord = await attendanceRepo.getAttendanceRecord(id);
    if (!attendanceRecord) {
      return reply.code(404).send({
        success: false,
        message: '未找到签到记录'
      });
    }

    // 获取课程详细信息（教室和教师信息）
    const courseSchedules = await courseScheduleRepo.findByKkh(
      attendanceRecord.kkh
    );
    const courseInfo =
      courseSchedules.find(
        (schedule: CourseScheduleEntity) =>
          schedule.rq === attendanceRecord.rq &&
          schedule.jc === parseInt(attendanceRecord.jc_s.split('-')[0] || '1')
      ) || courseSchedules[0]; // 如果找不到精确匹配，使用第一条记录

    // 创建教师服务实例
    const createTeacher =
      request.diScope.resolve<(payload: JwtPayload) => TeacherService>(
        'createTeacher'
      );
    const teacherService = createTeacher(payload);

    let teacherInfo: any;
    try {
      const teacherData = await teacherService.getTeacherInfo();
      if (!teacherData) {
        return reply.code(404).send({
          success: false,
          message: '未找到教师信息'
        });
      }

      teacherInfo = {
        gh: teacherData.gh,
        xm: teacherData.xm,
        ssdwmc: teacherData.ssdwmc,
        zc: teacherData.zc
      };
    } finally {
      teacherService.dispose();
    }

    // 获取考勤统计信息
    const stats = await studentAttendanceRepo.getAttendanceStats(id);

    // 获取所有学生的打卡详情
    const studentDetails =
      await studentAttendanceRepo.getAttendanceRecordWithStudentDetails(id);

    request.log.info('教师查看学生打卡详情:', {
      attendanceId: id,
      teacherId: teacherInfo.gh,
      teacherName: teacherInfo.xm,
      totalStudents: studentDetails.length,
      stats: {
        total: stats.total_count,
        present: stats.present_count,
        absent: stats.absent_count,
        leave: stats.leave_count
      }
    });

    // 获取当前时间
    const now = new Date();

    // 解析考勤时间
    let autoStartTime: Date | null = null;
    let autoCloseTime: Date | null = null;

    if (attendanceRecord.auto_start_time) {
      autoStartTime = new Date(attendanceRecord.auto_start_time);
    }

    if (attendanceRecord.auto_close_time) {
      autoCloseTime = new Date(attendanceRecord.auto_close_time);
    }

    // 计算课程状态和时间
    const { courseStartTime, courseEndTime, courseStatus } =
      calculateCourseTimeAndStatus(
        attendanceRecord.rq,
        attendanceRecord.sj_f,
        attendanceRecord.sj_t
      );

    // 构建响应数据 - 兼容前端期望的格式
    const response = {
      success: true,
      data: {
        course: {
          kcmc: attendanceRecord.kcmc,
          room_s: courseInfo?.room || '',
          xm_s: courseInfo?.xms || '',
          jc_s: attendanceRecord.jc_s,
          jxz: attendanceRecord?.jxz,
          lq: courseInfo?.lq
        },
        student: {
          xh: teacherInfo.gh || '',
          xm: teacherInfo.xm || '',
          bjmc: teacherInfo.ssdwmc || '',
          zymc: teacherInfo.zc || ''
        },
        attendance_status: {
          is_checked_in: false, // 教师不需要签到
          status: attendanceRecord.status,
          can_checkin: false,
          can_leave: false,
          auto_start_time: attendanceRecord.auto_start_time || '',
          auto_close_time: attendanceRecord.auto_close_time || ''
        },
        course_status: {
          status: courseStatus,
          course_start_time: courseStartTime.toISOString(),
          course_end_time: courseEndTime.toISOString()
        },
        stats: {
          total_count: stats.total_count,
          checkin_count: stats.present_count,
          late_count: 0, // 这个需要从其他地方计算或存储
          absent_count: stats.absent_count,
          leave_count: stats.leave_count
        },
        student_details: studentDetails.map((student: any) => {
          // 计算学生的实际考勤状态
          let actualStatus: string = student.status;

          // 如果学生没有签到/请假记录，根据时间判断状态
          if (!student.id || student.status === 'absent') {
            if (autoStartTime && now < autoStartTime) {
              // 当前时间在开始时间之前，状态为未开始
              actualStatus = 'not_started';
            } else if (autoCloseTime && now > autoCloseTime) {
              // 当前时间在结束时间之后，状态为缺勤
              actualStatus = 'absent';
            } else {
              // 在考勤时间窗口内但没有记录，状态为缺勤
              actualStatus = 'absent';
            }
          }

          return {
            xh: student.xh,
            xm: student.xm,
            bjmc: student.bjmc,
            zymc: student.zymc,
            status: actualStatus,
            checkin_time: student.checkin_time
              ? new Date(student.checkin_time).toISOString()
              : undefined,
            leave_time: student.leave_time
              ? new Date(student.leave_time).toISOString()
              : undefined,
            leave_reason: student.leave_reason || undefined,
            location: student.location_id || undefined,
            ip_address: student.ip_address || undefined
          };
        })
      }
    };

    request.log.info('成功获取教师学生打卡详情:', {
      attendanceId: id,
      teacherId: teacherInfo.gh,
      studentCount: studentDetails.length,
      checkinRate: stats.present_count / stats.total_count
    });

    return response;
  } catch (error) {
    request.log.error('获取教师学生打卡详情失败:', {
      error: error instanceof Error ? error.message : String(error),
      attendanceId: request.params.id,
      type: request.query.type,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '获取学生打卡详情失败'
    });
  }
};

/**
 * 学生签到接口
 */
const studentCheckIn = async (
  request: FastifyRequest<{
    Params: { attendance_record_id: string };
    Body: StudentCheckInRequest;
  }>,
  reply: FastifyReply
): Promise<StudentCheckInResponse> => {
  try {
    const { attendance_record_id } = request.params;
    const { location, latitude, longitude, accuracy, remark } = request.body;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    // 验证参数
    if (!attendance_record_id) {
      return reply.code(400).send({
        success: false,
        message: '缺少考勤记录ID'
      });
    }

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    // 从DI容器获取Repository实例
    const attendanceRepo =
      request.diScope.resolve<AttendanceRepository>('attendanceRepo');
    const studentAttendanceRepo =
      request.diScope.resolve<StudentAttendanceRepository>(
        'studentAttendanceRepo'
      );

    // 创建学生服务实例
    const createStudent =
      request.diScope.resolve<(payload: JwtPayload) => StudentService>(
        'createStudent'
      );
    const studentService = createStudent(payload);

    let studentInfo: any;
    try {
      studentInfo = await studentService.getStudentInfo();
      if (!studentInfo) {
        return reply.code(404).send({
          success: false,
          message: '未找到学生信息'
        });
      }
    } finally {
      studentService.dispose();
    }

    // 获取考勤记录
    const attendanceRecord =
      await attendanceRepo.getAttendanceRecord(attendance_record_id);
    if (!attendanceRecord) {
      return reply.code(404).send({
        success: false,
        message: '未找到考勤记录'
      });
    }

    // 检查考勤记录状态
    if (attendanceRecord.status !== 'active') {
      return reply.code(400).send({
        success: false,
        message: '考勤记录已关闭，无法签到'
      });
    }

    // 检查是否已经签到
    const existingAttendance =
      await studentAttendanceRepo.getStudentAttendanceByRecordAndStudent(
        attendance_record_id,
        studentInfo.xh
      );

    if (existingAttendance) {
      return reply.code(400).send({
        success: false,
        message: '您已经签到过了'
      });
    }

    // 创建课程服务实例获取授课教师信息
    const courseService = new CourseService(
      request.diScope.resolve('db'),
      request.log
    );

    const primaryTeacher =
      await courseService.getPrimaryCourseTeacher(attendance_record_id);

    // 创建签到记录，直接设置为出勤状态，无需审批
    const newAttendance = await studentAttendanceRepo.createStudentAttendance({
      attendance_record_id,
      xh: studentInfo.xh,
      xm: studentInfo.xm,
      status: AttendanceStatus.PRESENT,
      checkin_time: new Date(),
      location_id: location || '',
      approver_id: primaryTeacher?.gh || null,
      approver_name: primaryTeacher?.xm || null,
      approved_time: new Date(), // 自动设置审批时间
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || null,
      latitude: latitude || null,
      longitude: longitude || null,
      accuracy: accuracy || null,
      remark: remark || null
    });

    request.log.info('学生签到成功:', {
      attendanceRecordId: attendance_record_id,
      studentId: studentInfo.xh,
      studentName: studentInfo.xm,
      location,
      latitude,
      longitude,
      accuracy,
      ip: request.ip
    });

    const response: StudentCheckInResponse = {
      success: true,
      message: '签到成功',
      data: {
        id: newAttendance.id,
        status: AttendanceStatus.PRESENT,
        checkin_time: newAttendance.checkin_time?.toISOString(),
        approved_time: newAttendance.approved_time?.toISOString(),
        approver: primaryTeacher
          ? {
              id: primaryTeacher.gh,
              name: primaryTeacher.xm
            }
          : undefined
      }
    };

    return response;
  } catch (error) {
    request.log.error('学生签到失败:', {
      error: error instanceof Error ? error.message : String(error),
      attendanceRecordId: request.body.attendance_record_id,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '签到失败，请稍后重试'
    });
  }
};

/**
 * 学生请假接口
 */
const studentLeave = async (
  request: FastifyRequest<{
    Body: StudentLeaveRequest;
  }>,
  reply: FastifyReply
): Promise<StudentLeaveResponse> => {
  try {
    const { attendance_record_id, leave_reason, leave_type, attachments } =
      request.body;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    // 验证参数
    if (!attendance_record_id) {
      return reply.code(400).send({
        success: false,
        message: '缺少考勤记录ID'
      });
    }

    if (!leave_reason || leave_reason.trim().length === 0) {
      return reply.code(400).send({
        success: false,
        message: '请填写请假原因'
      });
    }

    // 验证请假类型
    if (
      leave_type &&
      !['sick', 'personal', 'emergency', 'other'].includes(leave_type)
    ) {
      return reply.code(400).send({
        success: false,
        message: '请假类型无效'
      });
    }

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    // 验证附件
    if (attachments && attachments.length > 0) {
      // 验证附件数量
      if (attachments.length > 3) {
        return reply.code(400).send({
          success: false,
          message: '最多只能上传3个附件'
        });
      }

      // 验证每个附件
      for (const attachment of attachments) {
        // 验证文件大小（5MB限制）
        if (attachment.file_size > 5 * 1024 * 1024) {
          return reply.code(400).send({
            success: false,
            message: `文件 ${attachment.file_name} 大小超过5MB限制`
          });
        }

        // 验证文件类型
        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'application/pdf'
        ];
        if (!allowedTypes.includes(attachment.file_type)) {
          return reply.code(400).send({
            success: false,
            message: `文件 ${attachment.file_name} 类型不支持`
          });
        }

        // 验证Base64内容
        if (
          !attachment.file_content ||
          attachment.file_content.trim().length === 0
        ) {
          return reply.code(400).send({
            success: false,
            message: `文件 ${attachment.file_name} 内容为空`
          });
        }
      }
    }

    // 从DI容器获取Repository实例
    const attendanceRepo =
      request.diScope.resolve<AttendanceRepository>('attendanceRepo');
    const studentAttendanceRepo =
      request.diScope.resolve<StudentAttendanceRepository>(
        'studentAttendanceRepo'
      );

    // 创建学生服务实例
    const createStudent =
      request.diScope.resolve<(payload: JwtPayload) => StudentService>(
        'createStudent'
      );
    const studentService = createStudent(payload);

    let studentInfo: any;
    try {
      studentInfo = await studentService.getStudentInfo();
      if (!studentInfo) {
        return reply.code(404).send({
          success: false,
          message: '未找到学生信息'
        });
      }
    } finally {
      studentService.dispose();
    }

    // 获取考勤记录
    const attendanceRecord =
      await attendanceRepo.getAttendanceRecord(attendance_record_id);
    if (!attendanceRecord) {
      return reply.code(404).send({
        success: false,
        message: '未找到考勤记录'
      });
    }

    // 检查考勤记录状态
    if (attendanceRecord.status !== 'active') {
      return reply.code(400).send({
        success: false,
        message: '考勤记录已关闭，无法请假'
      });
    }

    // 检查是否已经有签到记录
    const existingAttendance =
      await studentAttendanceRepo.getStudentAttendanceByRecordAndStudent(
        attendance_record_id,
        studentInfo.xh
      );

    if (existingAttendance) {
      return reply.code(400).send({
        success: false,
        message: '您已经有签到记录了，无法请假'
      });
    }

    // 创建课程服务实例获取授课教师信息
    const courseService = new CourseService(
      request.diScope.resolve('db'),
      request.log
    );

    // 获取所有授课教师信息
    const allTeachers =
      await courseService.getCourseTeachers(attendance_record_id);
    const primaryTeacher = allTeachers.length > 0 ? allTeachers[0] : null;

    // 创建请假记录，状态为请假申请待审批
    const newLeaveRecord = await studentAttendanceRepo.createStudentAttendance({
      attendance_record_id,
      xh: studentInfo.xh,
      xm: studentInfo.xm,
      status: AttendanceStatus.LEAVE_PENDING,
      leave_time: new Date(),
      leave_reason: leave_reason.trim(),
      leave_type: leave_type || 'sick', // 默认为病假
      location_id: '',
      approver_id: primaryTeacher?.gh || null,
      approver_name: primaryTeacher?.xm || null,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || null
    });

    // 为每位授课教师创建审批记录
    if (allTeachers.length > 0) {
      try {
        const leaveApprovalRepo = request.diScope.resolve('leaveApprovalRepo');

        // 为每位教师创建待审批记录
        const teacherApprovals = allTeachers.map((teacher) => ({
          approver_id: teacher.gh,
          approver_name: teacher.xm
        }));

        await leaveApprovalRepo.batchCreateLeaveApprovals(
          newLeaveRecord.id,
          teacherApprovals
        );

        request.log.info('教师审批记录创建成功:', {
          attendanceRecordId: attendance_record_id,
          studentId: studentInfo.xh,
          teacherCount: allTeachers.length,
          teachers: allTeachers.map((t) => ({ gh: t.gh, xm: t.xm }))
        });
      } catch (approvalError) {
        request.log.error('创建教师审批记录失败:', {
          error:
            approvalError instanceof Error
              ? approvalError.message
              : String(approvalError),
          attendanceRecordId: attendance_record_id,
          studentId: studentInfo.xh,
          teacherCount: allTeachers.length
        });

        // 审批记录创建失败不影响请假申请，只记录日志
      }
    }

    // 处理附件上传
    if (attachments && attachments.length > 0) {
      try {
        // 转换附件数据
        const attachmentParams = attachments.map(
          (attachment: {
            file_name: string;
            file_content: string;
            file_size: number;
            file_type: string;
          }) => ({
            application_id: newLeaveRecord.id, // 使用学生考勤记录ID作为申请ID
            file_name: attachment.file_name,
            file_content: Buffer.from(attachment.file_content, 'base64'),
            file_size: attachment.file_size,
            file_type: attachment.file_type,
            storage_type: 'database' as const
          })
        );

        const leaveAttachmentRepo =
          request.diScope.resolve<LeaveAttachmentRepository>(
            'leaveAttachmentRepo'
          );
        // 批量创建附件
        await leaveAttachmentRepo.batchCreateLeaveAttachments(attachmentParams);

        request.log.info('请假附件上传成功:', {
          attendanceRecordId: attendance_record_id,
          studentId: studentInfo.xh,
          attachmentCount: attachments.length
        });
      } catch (attachmentError) {
        request.log.error('请假附件上传失败:', {
          error:
            attachmentError instanceof Error
              ? attachmentError.message
              : String(attachmentError),
          attendanceRecordId: attendance_record_id,
          studentId: studentInfo.xh
        });

        // 附件上传失败不影响请假申请，只记录日志
      }
    }

    request.log.info('学生请假申请成功:', {
      attendanceRecordId: attendance_record_id,
      studentId: studentInfo.xh,
      studentName: studentInfo.xm,
      leaveReason: leave_reason,
      leaveType: leave_type,
      teacherCount: allTeachers.length,
      teachers: allTeachers.map((t) => ({ gh: t.gh, xm: t.xm })),
      attachmentCount: attachments?.length || 0,
      ip: request.ip
    });

    const response: StudentLeaveResponse = {
      success: true,
      message: `请假申请提交成功，已发送给${allTeachers.length}位授课教师审批`,
      data: {
        id: newLeaveRecord.id,
        status: AttendanceStatus.LEAVE_PENDING,
        leave_time: newLeaveRecord.leave_time?.toISOString(),
        leave_reason: leave_reason.trim(),
        approver: primaryTeacher
          ? {
              id: primaryTeacher.gh,
              name: primaryTeacher.xm
            }
          : undefined
      }
    };

    return response;
  } catch (error) {
    request.log.error('学生请假申请失败:', {
      error: error instanceof Error ? error.message : String(error),
      attendanceRecordId: request.body.attendance_record_id,
      leaveReason: request.body.leave_reason,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '请假申请失败，请稍后重试'
    });
  }
};

/**
 * 学生查询请假审批记录接口
 */
const getStudentLeaveApplications = async (
  request: FastifyRequest<{
    Querystring: {
      status?: 'all' | 'leave_pending' | 'leave' | 'leave_rejected';
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
    };
  }>,
  reply: FastifyReply
): Promise<StudentLeaveApplicationQueryResponse> => {
  try {
    const {
      status = 'all',
      page = 1,
      page_size = 20,
      start_date,
      end_date
    } = request.query;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    // 创建学生服务实例
    const createStudent =
      request.diScope.resolve<(payload: JwtPayload) => StudentService>(
        'createStudent'
      );
    const studentService = createStudent(payload);

    let studentInfo: any;
    try {
      studentInfo = await studentService.getStudentInfo();
      if (!studentInfo) {
        return reply.code(404).send({
          success: false,
          message: '未找到学生信息'
        });
      }
    } finally {
      studentService.dispose();
    }

    // 从DI容器获取Repository实例
    const studentAttendanceRepo =
      request.diScope.resolve<StudentAttendanceRepository>(
        'studentAttendanceRepo'
      );

    // 解析日期参数
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (start_date) {
      startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return reply.code(400).send({
          success: false,
          message: '开始日期格式不正确'
        });
      }
    }

    if (end_date) {
      endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return reply.code(400).send({
          success: false,
          message: '结束日期格式不正确'
        });
      }
    }

    // 计算分页参数
    const limit = Math.min(Math.max(page_size, 1), 100); // 限制每页最多100条
    const offset = Math.max((page - 1) * limit, 0);

    // 查询请假申请记录
    const { applications, total } =
      await studentAttendanceRepo.getStudentLeaveApplications(
        studentInfo.xh,
        status,
        startDate,
        endDate,
        limit,
        offset
      );

    // 获取统计信息
    const stats = await studentAttendanceRepo.getStudentLeaveApplicationStats(
      studentInfo.xh,
      startDate,
      endDate
    );

    request.log.info('查询学生请假审批记录:', {
      studentId: studentInfo.xh,
      studentName: studentInfo.xm,
      status,
      page,
      pageSize: limit,
      total,
      startDate: start_date,
      endDate: end_date
    });

    const response = {
      success: true,
      data: {
        applications,
        total,
        page,
        page_size: limit,
        stats
      }
    };

    return response;
  } catch (error) {
    request.log.error('查询学生请假审批记录失败:', {
      error: error instanceof Error ? error.message : String(error),
      query: request.query,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '查询请假审批记录失败，请稍后重试'
    });
  }
};

/**
 * 教师查询请假单接口
 */
const getTeacherLeaveApplications = async (
  request: FastifyRequest<{
    Querystring: {
      status?: string | string[]; // 支持单个状态或多个状态数组
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
    };
  }>,
  reply: FastifyReply
): Promise<TeacherLeaveApplicationQueryResponse> => {
  try {
    const {
      status,
      page = 1,
      page_size = 20,
      start_date,
      end_date
    } = request.query;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    // 创建教师服务实例
    const createTeacher =
      request.diScope.resolve<(payload: JwtPayload) => TeacherService>(
        'createTeacher'
      );
    const teacherService = createTeacher(payload);

    let teacherInfo: any;
    try {
      teacherInfo = await teacherService.getTeacherInfo();
      if (!teacherInfo) {
        return reply.code(404).send({
          success: false,
          message: '未找到教师信息'
        });
      }
    } finally {
      teacherService.dispose();
    }

    // 从DI容器获取Repository实例
    const leaveApprovalRepo =
      request.diScope.resolve<LeaveApprovalRepository>('leaveApprovalRepo');

    // 处理状态参数，支持多状态查询
    let statusFilter: string[] | undefined;
    if (status) {
      if (Array.isArray(status)) {
        statusFilter = status.filter((s) =>
          ['pending', 'approved', 'rejected', 'cancelled'].includes(s)
        );
      } else if (typeof status === 'string') {
        // 支持逗号分隔的状态字符串
        const statusArray = status.split(',').map((s) => s.trim());
        statusFilter = statusArray.filter((s) =>
          ['pending', 'approved', 'rejected', 'cancelled'].includes(s)
        );
      }
    }

    // 获取教师的所有审批记录
    const allApplications = await leaveApprovalRepo.getTeacherApprovals(
      teacherInfo.gh
    );

    // 添加调试日志
    request.log.info('教师审批记录查询结果:', {
      teacherId: teacherInfo.gh,
      totalApplications: allApplications.length,
      statusFilter,
      sampleApplications: allApplications.slice(0, 2).map((app: any) => ({
        approval_id: app.id,
        application_id: app.application_id,
        student_name: app.student_name,
        approval_result: app.approval_result
      }))
    });

    // 根据状态过滤
    let applications = allApplications;
    if (statusFilter && statusFilter.length > 0) {
      applications = allApplications.filter((app: any) =>
        statusFilter!.includes(app.approval_result)
      );
    }

    // 添加过滤后的调试日志
    request.log.info('状态过滤后的结果:', {
      teacherId: teacherInfo.gh,
      beforeFilter: allApplications.length,
      afterFilter: applications.length,
      statusFilter
    });

    // 获取统计信息
    const stats = await leaveApprovalRepo.getTeacherApprovalStats(
      teacherInfo.gh
    );

    // 应用日期过滤
    let filteredApplications = applications;
    if (start_date || end_date) {
      const startDate = start_date ? new Date(start_date) : null;
      const endDate = end_date ? new Date(end_date) : null;

      filteredApplications = applications.filter((app: any) => {
        const appDate = new Date(app.leave_date);
        if (startDate && appDate < startDate) return false;
        if (endDate && appDate > endDate) return false;
        return true;
      });
    }

    // 应用分页
    const limit = Math.min(Math.max(page_size, 1), 100);
    const offset = Math.max((page - 1) * limit, 0);
    const total = filteredApplications.length;
    const paginatedApplications = filteredApplications.slice(
      offset,
      offset + limit
    );

    // 转换数据格式
    const formattedApplications = paginatedApplications.map((app: any) => ({
      id: app.application_id,
      student_id: app.student_id,
      student_name: app.student_name,
      course_id: app.course_id,
      course_name: app.course_name,
      class_date: app.leave_date,
      class_time: app.class_time,
      class_location: app.class_location || '',
      teacher_name: app.teacher_name || app.approver_name,
      leave_date: app.leave_date,
      leave_reason: app.leave_reason,
      leave_type: app.leave_type,
      status: app.approval_result,
      approval_comment: app.approval_comment,
      approval_time: app.approval_time,
      application_time: app.application_time,
      approval_id: app.id,
      // 添加新的课程信息字段
      lq: app.lq || '', // 楼群
      room_s: app.room_s || '', // 教室
      jxz: app.jxz || null, // 教学周
      course_start_time: app.course_start_time || '', // 课程开始时间
      course_end_time: app.course_end_time || '', // 课程结束时间
      // 添加完整的学生信息
      student_info: {
        student_id: app.student_id,
        student_name: app.student_name,
        class_name: app.class_name || '',
        major_name: app.major_name || ''
      },
      // 添加完整的教师信息
      teacher_info: {
        teacher_id: app.approver_id,
        teacher_name: app.teacher_name || app.approver_name,
        teacher_department: app.teacher_department || ''
      },
      // 添加附件信息
      attachments: app.attachments || []
    }));

    request.log.info('教师查询请假单:', {
      teacherId: teacherInfo.gh,
      teacherName: teacherInfo.xm,
      status,
      page,
      pageSize: limit,
      total,
      startDate: start_date,
      endDate: end_date
    });

    const response: TeacherLeaveApplicationQueryResponse = {
      success: true,
      data: {
        applications: formattedApplications,
        total,
        page,
        page_size: limit,
        stats: {
          pending_count: stats.pending_count,
          processed_count:
            stats.approved_count + stats.rejected_count + stats.cancelled_count,
          approved_count: stats.approved_count,
          rejected_count: stats.rejected_count,
          cancelled_count: stats.cancelled_count,
          total_count: stats.total_count
        }
      }
    };

    return response;
  } catch (error) {
    request.log.error('教师查询请假单失败:', {
      error: error instanceof Error ? error.message : String(error),
      query: request.query,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '查询请假单失败，请稍后重试'
    });
  }
};

/**
 * 教师审批请假单接口
 */
const teacherApproveLeave = async (
  request: FastifyRequest<{
    Body: TeacherApprovalRequest;
  }>,
  reply: FastifyReply
): Promise<TeacherApprovalResponse> => {
  try {
    const { approval_id, action, comment } = request.body;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    // 验证参数
    if (!approval_id) {
      return reply.code(400).send({
        success: false,
        message: '缺少审批记录ID'
      });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return reply.code(400).send({
        success: false,
        message: '审批动作无效，必须是approve或reject'
      });
    }

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    // 创建教师服务实例
    const createTeacher =
      request.diScope.resolve<(payload: JwtPayload) => TeacherService>(
        'createTeacher'
      );
    const teacherService = createTeacher(payload);

    let teacherInfo: any;
    try {
      teacherInfo = await teacherService.getTeacherInfo();
      if (!teacherInfo) {
        return reply.code(404).send({
          success: false,
          message: '未找到教师信息'
        });
      }
    } finally {
      teacherService.dispose();
    }

    // 从DI容器获取Repository实例
    const leaveApprovalRepo =
      request.diScope.resolve<LeaveApprovalRepository>('leaveApprovalRepo');

    // 验证审批权限
    const approval = await leaveApprovalRepo.getApprovalByIdAndApprover(
      approval_id,
      teacherInfo.gh
    );

    if (!approval) {
      return reply.code(403).send({
        success: false,
        message: '审批记录不存在或无权限审批'
      });
    }

    // 执行审批操作
    const result = await leaveApprovalRepo.processApproval(
      approval_id,
      action,
      comment
    );

    request.log.info('教师审批请假单成功:', {
      approvalId: approval_id,
      applicationId: result.application_id,
      teacherId: teacherInfo.gh,
      teacherName: teacherInfo.xm,
      action,
      comment,
      ip: request.ip
    });

    const response: TeacherApprovalResponse = {
      success: true,
      message: action === 'approve' ? '请假申请已批准' : '请假申请已拒绝',
      data: result
    };

    return response;
  } catch (error) {
    request.log.error('教师审批请假单失败:', {
      error: error instanceof Error ? error.message : String(error),
      approvalId: request.body.approval_id,
      action: request.body.action,
      stack: error instanceof Error ? error.stack : undefined
    });

    // 根据错误类型返回不同的状态码
    if (error instanceof Error && error.message.includes('未找到')) {
      return reply.code(404).send({
        success: false,
        message: error.message
      });
    }

    if (error instanceof Error && error.message.includes('无权限')) {
      return reply.code(403).send({
        success: false,
        message: error.message
      });
    }

    return reply.code(500).send({
      success: false,
      message: '审批请假单失败，请稍后重试'
    });
  }
};

/**
 * 查看请假申请附件接口
 */
const viewLeaveAttachment = async (
  request: FastifyRequest<{
    Params: { attachmentId: string };
  }>,
  reply: FastifyReply
): Promise<AttachmentViewResponse> => {
  try {
    const { attachmentId } = request.params;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    if (!attachmentId) {
      return reply.code(400).send({
        success: false,
        message: '缺少附件ID'
      });
    }

    // 创建附件Repository实例
    const leaveAttachmentRepo = new LeaveAttachmentRepository(
      request.diScope.resolve('db'),
      request.log
    );

    // 查询附件信息
    const attachment =
      await leaveAttachmentRepo.getLeaveAttachmentById(attachmentId);

    if (!attachment) {
      return reply.code(404).send({
        success: false,
        message: '附件不存在'
      });
    }

    // 验证用户权限（简化版本，实际应该检查用户是否有权限查看该附件）
    // 这里可以根据业务需求添加更复杂的权限验证逻辑

    request.log.info('查看请假申请附件:', {
      attachmentId,
      fileName: attachment.file_name,
      userId: payload.userId,
      storageType: attachment.storage_type
    });

    let fileContent: string | undefined;

    // 如果是数据库存储，返回Base64编码的内容
    if (attachment.storage_type === 'database' && attachment.file_content) {
      fileContent = attachment.file_content.toString('base64');
    }

    const response: AttachmentViewResponse = {
      success: true,
      data: {
        id: attachment.id,
        file_name: attachment.file_name,
        file_size: attachment.file_size,
        file_type: attachment.file_type,
        file_content: fileContent,
        file_url: `/api/attendance/attachments/${attachmentId}/download`
      }
    };

    return response;
  } catch (error) {
    request.log.error('查看请假申请附件失败:', {
      error: error instanceof Error ? error.message : String(error),
      attachmentId: request.params.attachmentId,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '查看附件失败，请稍后重试'
    });
  }
};

/**
 * 下载请假申请附件接口
 */
const downloadLeaveAttachment = async (
  request: FastifyRequest<{
    Params: { attachmentId: string };
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { attachmentId } = request.params;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    // 创建附件Repository实例
    const leaveAttachmentRepo = new LeaveAttachmentRepository(
      request.diScope.resolve('db'),
      request.log
    );

    // 查询附件信息
    const attachment =
      await leaveAttachmentRepo.getLeaveAttachmentById(attachmentId);

    if (!attachment) {
      return reply.code(404).send({
        success: false,
        message: '附件不存在'
      });
    }

    // 验证用户权限
    // 这里应该添加权限验证逻辑

    request.log.info('下载请假申请附件:', {
      attachmentId,
      fileName: attachment.file_name,
      userId: payload.userId,
      storageType: attachment.storage_type
    });

    // 设置响应头
    reply.header('Content-Type', attachment.file_type);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.file_name)}"`
    );
    reply.header('Content-Length', attachment.file_size.toString());

    // 根据存储类型返回文件内容
    if (attachment.storage_type === 'database' && attachment.file_content) {
      // 从数据库返回二进制内容
      reply.send(attachment.file_content);
    } else if (attachment.storage_type === 'file' && attachment.file_path) {
      // 从文件系统读取文件
      const fs = await import('fs');
      const path = await import('path');

      try {
        const filePath = path.join(
          process.cwd(),
          'uploads',
          attachment.file_path
        );
        const fileStream = fs.createReadStream(filePath);
        reply.send(fileStream);
      } catch (fileError) {
        request.log.error('读取附件文件失败:', {
          error:
            fileError instanceof Error ? fileError.message : String(fileError),
          filePath: attachment.file_path
        });

        return reply.code(404).send({
          success: false,
          message: '附件文件不存在'
        });
      }
    } else {
      return reply.code(404).send({
        success: false,
        message: '附件内容不存在'
      });
    }
  } catch (error) {
    request.log.error('下载请假申请附件失败:', {
      error: error instanceof Error ? error.message : String(error),
      attachmentId: request.params.attachmentId,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '下载附件失败，请稍后重试'
    });
  }
};

/**
 * 获取请假申请图片接口 - 直接返回图片二进制数据
 */
const getLeaveAttachmentImage = async (
  request: FastifyRequest<{
    Params: { attachmentId: string };
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { attachmentId } = request.params;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    // 创建附件Repository实例
    const leaveAttachmentRepo = new LeaveAttachmentRepository(
      request.diScope.resolve('db'),
      request.log
    );

    // 查询附件信息
    const attachment =
      await leaveAttachmentRepo.getLeaveAttachmentById(attachmentId);

    if (!attachment) {
      return reply.code(404).send({
        success: false,
        message: '附件不存在'
      });
    }

    // 验证文件类型是否为图片
    if (!attachment.file_type.startsWith('image/')) {
      return reply.code(400).send({
        success: false,
        message: '该附件不是图片文件'
      });
    }

    request.log.info('获取请假申请图片:', {
      attachmentId,
      fileName: attachment.file_name,
      userId: payload.userId,
      fileType: attachment.file_type,
      storageType: attachment.storage_type
    });

    // 设置响应头
    reply.header('Content-Type', attachment.file_type);
    reply.header('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    reply.header('Content-Length', attachment.file_size.toString());

    // 根据存储类型返回文件内容
    if (attachment.storage_type === 'database' && attachment.file_content) {
      // 从数据库返回二进制内容
      reply.send(attachment.file_content);
    } else if (attachment.storage_type === 'file' && attachment.file_path) {
      // 从文件系统读取文件
      const fs = await import('fs');
      const path = await import('path');

      try {
        const filePath = path.join(
          process.cwd(),
          'uploads',
          attachment.file_path
        );
        const fileStream = fs.createReadStream(filePath);
        reply.send(fileStream);
      } catch (fileError) {
        request.log.error('读取附件文件失败:', {
          error:
            fileError instanceof Error ? fileError.message : String(fileError),
          filePath: attachment.file_path
        });

        return reply.code(404).send({
          success: false,
          message: '附件文件不存在'
        });
      }
    } else {
      return reply.code(404).send({
        success: false,
        message: '附件内容不存在'
      });
    }
  } catch (error) {
    request.log.error('获取请假申请图片失败:', {
      error: error instanceof Error ? error.message : String(error),
      attachmentId: request.params.attachmentId,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '获取图片失败，请稍后重试'
    });
  }
};

/**
 * 获取课程历史考勤数据接口
 */
const getCourseAttendanceHistory = async (
  request: FastifyRequest<{
    Params: { kkh: string };
    Querystring: {
      xnxq?: string;
      start_date?: string;
      end_date?: string;
    };
  }>,
  reply: FastifyReply
): Promise<CourseAttendanceHistoryResponse> => {
  try {
    const { kkh } = request.params;
    const { xnxq, start_date, end_date } = request.query;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    // 验证参数
    if (!kkh) {
      return reply.code(400).send({
        success: false,
        message: '缺少课程号'
      });
    }

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    // 创建教师服务实例验证权限
    const createTeacher =
      request.diScope.resolve<(payload: JwtPayload) => TeacherService>(
        'createTeacher'
      );
    const teacherService = createTeacher(payload);

    let teacherInfo: any;
    try {
      teacherInfo = await teacherService.getTeacherInfo();
      if (!teacherInfo) {
        return reply.code(404).send({
          success: false,
          message: '未找到教师信息'
        });
      }
    } finally {
      teacherService.dispose();
    }

    // 从DI容器获取Repository实例
    const studentAttendanceRepo =
      request.diScope.resolve<StudentAttendanceRepository>(
        'studentAttendanceRepo'
      );

    // 解析日期参数
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (start_date) {
      startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return reply.code(400).send({
          success: false,
          message: '开始日期格式不正确'
        });
      }
    }

    if (end_date) {
      endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return reply.code(400).send({
          success: false,
          message: '结束日期格式不正确'
        });
      }
    }

    // 获取课程历史考勤数据
    const historyData = await studentAttendanceRepo.getCourseAttendanceHistory(
      kkh,
      xnxq,
      startDate,
      endDate
    );

    request.log.info('获取课程历史考勤数据:', {
      kkh,
      teacherId: teacherInfo.gh,
      teacherName: teacherInfo.xm,
      xnxq,
      totalClasses: historyData.overall_stats.total_classes,
      averageRate: historyData.overall_stats.average_attendance_rate,
      startDate: start_date,
      endDate: end_date
    });

    const response: CourseAttendanceHistoryResponse = {
      success: true,
      data: historyData
    };

    return response;
  } catch (error) {
    request.log.error('获取课程历史考勤数据失败:', {
      error: error instanceof Error ? error.message : String(error),
      kkh: request.params.kkh,
      query: request.query,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '获取课程历史考勤数据失败，请稍后重试'
    });
  }
};

/**
 * 获取个人课程统计接口
 */
const getPersonalCourseStats = async (
  request: FastifyRequest<{
    Params: { kkh: string };
    Querystring: { xnxq?: string };
  }>,
  reply: FastifyReply
): Promise<any> => {
  try {
    const { kkh } = request.params;
    const { xnxq } = request.query;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    // 验证参数
    if (!kkh) {
      return reply.code(400).send({
        success: false,
        message: '缺少课程号参数'
      });
    }

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少ex_user_id字段'
      });
    }

    // 创建教师服务实例验证权限
    const createTeacher =
      request.diScope.resolve<(payload: JwtPayload) => TeacherService>(
        'createTeacher'
      );
    const teacherService = createTeacher(payload);

    let teacherInfo: any;
    try {
      teacherInfo = await teacherService.getTeacherInfo();
      if (!teacherInfo) {
        return reply.code(404).send({
          success: false,
          message: '未找到教师信息'
        });
      }
    } finally {
      teacherService.dispose();
    }

    // 从DI容器获取Repository实例
    const studentAttendanceRepo =
      request.diScope.resolve<StudentAttendanceRepository>(
        'studentAttendanceRepo'
      );

    // 获取个人课程统计数据
    const statsData = await studentAttendanceRepo.getPersonalCourseStats(
      kkh,
      xnxq
    );

    request.log.info('获取个人课程统计成功:', {
      kkh,
      xnxq,
      teacherId: teacherInfo.gh,
      teacherName: teacherInfo.xm,
      totalClasses: statsData.course_info.total_classes,
      totalStudents: statsData.course_info.total_students,
      overallAttendanceRate: statsData.course_info.overall_attendance_rate,
      studentCount: statsData.student_stats.length
    });

    const response: PersonalCourseStatsResponse = {
      success: true,
      data: statsData
    };

    return response;
  } catch (error) {
    request.log.error('获取个人课程统计失败:', {
      error: error instanceof Error ? error.message : String(error),
      kkh: request.params.kkh,
      query: request.query,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '获取个人课程统计失败，请稍后重试'
    });
  }
};

/**
 * 学生撤回请假申请接口
 */
const studentWithdrawLeave = async (
  request: FastifyRequest<{
    Body: StudentWithdrawLeaveRequest;
  }>,
  reply: FastifyReply
): Promise<StudentWithdrawLeaveResponse> => {
  try {
    const { attendance_record_id } = request.body;

    // 从DI容器中获取JWT payload
    const payload = request.diScope.resolve<JwtPayload>('userPayload');

    // 验证参数
    if (!attendance_record_id) {
      return reply.code(400).send({
        success: false,
        message: '缺少考勤记录ID'
      });
    }

    if (!payload.userId) {
      return reply.code(400).send({
        success: false,
        message: 'JWT令牌中缺少用户ID'
      });
    }

    // 创建学生服务实例
    const createStudent =
      request.diScope.resolve<(payload: JwtPayload) => StudentService>(
        'createStudent'
      );
    const studentService = createStudent(payload);

    let studentInfo: any;
    try {
      studentInfo = await studentService.getStudentInfo();
      if (!studentInfo) {
        return reply.code(404).send({
          success: false,
          message: '未找到学生信息'
        });
      }
    } finally {
      studentService.dispose();
    }

    // 从DI容器获取Repository实例
    const studentAttendanceRepo =
      request.diScope.resolve<StudentAttendanceRepository>(
        'studentAttendanceRepo'
      );

    // 执行撤回操作
    const withdrawResult =
      await studentAttendanceRepo.withdrawStudentLeaveApplication(
        studentInfo.xh,
        attendance_record_id
      );

    if (!withdrawResult.success) {
      return reply.code(400).send({
        success: false,
        message: withdrawResult.message
      });
    }

    request.log.info('学生撤回请假申请成功:', {
      studentId: studentInfo.xh,
      studentName: studentInfo.xm,
      attendanceRecordId: attendance_record_id,
      deletedAttendanceId: withdrawResult.deletedAttendanceId,
      cancelledApprovalCount: withdrawResult.cancelledApprovalIds?.length || 0
    });

    const response: StudentWithdrawLeaveResponse = {
      success: true,
      message: '请假申请撤回成功',
      data: {
        deleted_attendance_id: withdrawResult.deletedAttendanceId!,
        cancelled_approval_ids: withdrawResult.cancelledApprovalIds || [],
        withdraw_time: new Date().toISOString()
      }
    };

    return response;
  } catch (error) {
    request.log.error('学生撤回请假申请失败:', {
      error: error instanceof Error ? error.message : String(error),
      attendanceRecordId: request.body.attendance_record_id,
      stack: error instanceof Error ? error.stack : undefined
    });

    return reply.code(500).send({
      success: false,
      message: '撤回请假申请失败，请稍后重试'
    });
  }
};

/**
 * 注册考勤相关路由
 */
export async function attendanceController(
  fastify: FastifyInstance
): Promise<void> {
  // 获取签到记录 - 根据type参数决定返回学生视图还是教师视图
  fastify.get('/api/attendance/:id/record', {
    handler: async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { type?: 'student' | 'teacher' };
      }>,
      reply: FastifyReply
    ) => {
      const { type = 'student' } = request.query;

      if (type === 'teacher') {
        return getTeacherAttendanceRecord(request, reply);
      } else {
        return getStudentAttendanceRecord(request, reply);
      }
    }
  });

  // 学生签到接口
  fastify.post('/api/attendance/:attendance_record_id/checkin', {
    handler: studentCheckIn
  });

  // 学生请假接口
  fastify.post('/api/attendance/leave', {
    handler: studentLeave
  });

  // 学生撤回请假申请接口
  fastify.post('/api/attendance/withdraw-leave', {
    handler: studentWithdrawLeave
  });

  // 学生查询请假审批记录接口
  fastify.get('/api/attendance/leave-applications', {
    handler: getStudentLeaveApplications
  });

  // 教师查询请假单接口
  fastify.get('/api/attendance/teacher-leave-applications', {
    handler: getTeacherLeaveApplications
  });

  // 教师审批请假单接口
  fastify.post('/api/attendance/teacher-approve-leave', {
    handler: teacherApproveLeave
  });

  // 查看请假申请附件接口
  fastify.get('/api/attendance/attachments/:attachmentId/view', {
    handler: viewLeaveAttachment
  });

  // 下载请假申请附件接口
  fastify.get('/api/attendance/attachments/:attachmentId/download', {
    handler: downloadLeaveAttachment
  });

  // 获取请假申请图片接口 - 直接返回图片二进制数据
  fastify.get('/api/attendance/attachments/:attachmentId/image', {
    handler: getLeaveAttachmentImage
  });

  // 获取课程历史考勤数据接口
  fastify.get('/api/attendance/course/:kkh/history', {
    handler: getCourseAttendanceHistory
  });

  // 获取个人课程统计接口
  fastify.get('/api/attendance/course/:kkh/stats', {
    handler: getPersonalCourseStats
  });
}
