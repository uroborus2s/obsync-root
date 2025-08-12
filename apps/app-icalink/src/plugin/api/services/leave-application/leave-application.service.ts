/**
 * 请假申请服务
 * 处理请假申请的业务逻辑
 */

import { Logger } from '@stratix/core';
import { AttendanceRepository } from '../../repositories/attendance-repository.js';
import {
  ApplicationStatus,
  LeaveApplicationRepository,
  LeaveType
} from '../../repositories/leave-application-repository.js';
import { StudentAttendanceRepository } from '../../repositories/student-attendance-repository.js';
import { StudentInfoRepository } from '../../repositories/student-info-repository.js';
import { AttendanceStatus } from '../../types/attendance.js';
import type {
  ApproveLeaveApplicationRequest,
  CreateLeaveApplicationRequest,
  LeaveApplication,
  LeaveApplicationListResponse,
  LeaveApplicationQueryParams,
  LeaveApplicationResponse,
  LeaveApplicationStatistics
} from '../../types/leave-application.js';

/**
 * 请假申请服务类
 */
export class LeaveApplicationService {
  constructor(
    private readonly leaveApplicationRepo: LeaveApplicationRepository,
    private readonly attendanceRepo: AttendanceRepository,
    private readonly studentAttendanceRepo: StudentAttendanceRepository,
    private readonly studentInfoRepo: StudentInfoRepository,
    private readonly log: Logger
  ) {}

  /**
   * 创建请假申请
   */
  async createLeaveApplication(
    request: CreateLeaveApplicationRequest
  ): Promise<LeaveApplicationResponse> {
    try {
      this.log.debug(
        {
          studentId: request.student_id,
          attendanceRecordId: request.student_attendance_record_id
        },
        '开始创建请假申请'
      );

      // 获取学生考勤记录
      const studentAttendance =
        await this.studentAttendanceRepo.getStudentAttendanceById(
          request.student_attendance_record_id
        );

      if (!studentAttendance) {
        return {
          success: false,
          message: '学生考勤记录不存在'
        };
      }

      // 检查学生是否已经签到
      if (studentAttendance.status === AttendanceStatus.PRESENT) {
        return {
          success: false,
          message: '您已经签到，无法申请请假'
        };
      }

      // 获取考勤记录
      const attendanceRecord = await this.attendanceRepo.getAttendanceRecord(
        studentAttendance.attendance_record_id
      );

      if (!attendanceRecord) {
        return {
          success: false,
          message: '考勤记录不存在'
        };
      }

      // 获取学生信息
      const studentInfo = await this.studentInfoRepo.findByXh(
        request.student_id
      );
      if (!studentInfo) {
        return {
          success: false,
          message: '学生信息不存在'
        };
      }

      // 检查是否已有相同课程的请假申请
      const classDate = new Date(attendanceRecord.rq);
      const hasExisting =
        await this.leaveApplicationRepo.hasExistingLeaveApplication(
          request.student_id,
          attendanceRecord.kkh,
          classDate
        );

      if (hasExisting) {
        return {
          success: false,
          message: '您已经为该课程提交过请假申请'
        };
      }

      // 创建请假申请
      const leaveApplication =
        await this.leaveApplicationRepo.createLeaveApplication({
          student_id: request.student_id,
          student_name: studentInfo.xm || '',
          student_attendance_record_id: request.student_attendance_record_id,
          kkh: attendanceRecord.kkh,
          xnxq: attendanceRecord.xnxq,
          course_name: attendanceRecord.kcmc,
          class_date: classDate,
          class_time: `${attendanceRecord.sj_f}-${attendanceRecord.sj_t}`,
          class_location: '', // 需要从课程信息中获取
          teacher_id: '', // 需要从课程信息中获取
          teacher_name: '', // 需要从课程信息中获取
          leave_type: request.leave_type,
          leave_date: new Date(request.leave_date),
          leave_reason: request.leave_reason
        });

      // 更新学生考勤状态为请假
      await this.studentAttendanceRepo.updateStudentAttendance(
        request.student_attendance_record_id,
        {
          status: AttendanceStatus.LEAVE,
          leave_reason: request.leave_reason,
          leave_time: new Date()
        }
      );

      // 更新考勤记录统计
      const stats = await this.studentAttendanceRepo.getAttendanceStats(
        attendanceRecord.id
      );
      await this.attendanceRepo.updateAttendanceRecord(attendanceRecord.id, {
        checkin_count: stats.present_count,
        absent_count: stats.absent_count,
        leave_count: stats.leave_count
      });

      this.log.info(
        {
          applicationId: leaveApplication.id,
          studentId: request.student_id,
          kkh: attendanceRecord.kkh
        },
        '请假申请创建成功'
      );

      return {
        success: true,
        message: '请假申请提交成功',
        data: this.convertToLeaveApplication(leaveApplication)
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          studentId: request.student_id
        },
        '创建请假申请失败'
      );

      return {
        success: false,
        message: error instanceof Error ? error.message : '创建请假申请失败'
      };
    }
  }

  /**
   * 获取学生的请假申请列表
   */
  async getStudentLeaveApplications(
    studentId: string,
    params: LeaveApplicationQueryParams = {}
  ): Promise<LeaveApplicationListResponse> {
    try {
      this.log.debug({ studentId, params }, '获取学生请假申请列表');

      const page = params.page || 1;
      const pageSize = params.page_size || 20;
      const offset = (page - 1) * pageSize;

      const conditions = {
        student_id: studentId,
        status: params.status,
        leave_type: params.leave_type,
        class_date_start: params.start_date
          ? new Date(params.start_date)
          : undefined,
        class_date_end: params.end_date ? new Date(params.end_date) : undefined
      };

      const applications =
        await this.leaveApplicationRepo.findLeaveApplications(
          conditions,
          pageSize,
          offset
        );

      // 获取总数（简化实现，实际应该有专门的计数方法）
      const allApplications =
        await this.leaveApplicationRepo.findLeaveApplications(conditions);
      const total = allApplications.length;

      return {
        success: true,
        data: {
          applications: applications.map((app) =>
            this.convertToLeaveApplication(app)
          ),
          total,
          page,
          page_size: pageSize
        }
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          studentId
        },
        '获取学生请假申请列表失败'
      );

      return {
        success: false,
        message: error instanceof Error ? error.message : '获取请假申请列表失败'
      };
    }
  }

  /**
   * 获取教师待审批的请假申请
   */
  async getTeacherPendingApplications(
    teacherId: string,
    params: LeaveApplicationQueryParams = {}
  ): Promise<LeaveApplicationListResponse> {
    try {
      this.log.debug({ teacherId, params }, '获取教师待审批请假申请');

      const page = params.page || 1;
      const pageSize = params.page_size || 20;
      const offset = (page - 1) * pageSize;

      const applications =
        await this.leaveApplicationRepo.getTeacherPendingApplications(
          teacherId,
          pageSize,
          offset
        );

      // 获取总数
      const allPendingApplications =
        await this.leaveApplicationRepo.getTeacherPendingApplications(
          teacherId,
          1000, // 大数值获取所有记录
          0
        );
      const total = allPendingApplications.length;

      return {
        success: true,
        data: {
          applications: applications.map((app) =>
            this.convertToLeaveApplication(app)
          ),
          total,
          page,
          page_size: pageSize
        }
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          teacherId
        },
        '获取教师待审批请假申请失败'
      );

      return {
        success: false,
        message:
          error instanceof Error ? error.message : '获取待审批请假申请失败'
      };
    }
  }

  /**
   * 审批请假申请
   */
  async approveLeaveApplication(
    request: ApproveLeaveApplicationRequest
  ): Promise<LeaveApplicationResponse> {
    try {
      this.log.debug(
        { applicationId: request.application_id, action: request.action },
        '开始审批请假申请'
      );

      // 获取请假申请
      const application =
        await this.leaveApplicationRepo.getLeaveApplicationById(
          request.application_id
        );

      if (!application) {
        return {
          success: false,
          message: '请假申请不存在'
        };
      }

      if (application.status !== ApplicationStatus.PENDING) {
        return {
          success: false,
          message: '该申请已经被处理过了'
        };
      }

      // 执行审批操作
      if (request.action === 'approve') {
        await this.leaveApplicationRepo.approveLeaveApplication(
          request.application_id
        );
      } else {
        await this.leaveApplicationRepo.rejectLeaveApplication(
          request.application_id
        );
      }

      // 获取更新后的申请
      const updatedApplication =
        await this.leaveApplicationRepo.getLeaveApplicationById(
          request.application_id
        );

      this.log.info(
        {
          applicationId: request.application_id,
          action: request.action,
          studentId: application.student_id
        },
        '请假申请审批完成'
      );

      return {
        success: true,
        message:
          request.action === 'approve' ? '请假申请已批准' : '请假申请已拒绝',
        data: updatedApplication
          ? this.convertToLeaveApplication(updatedApplication)
          : undefined
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          applicationId: request.application_id
        },
        '审批请假申请失败'
      );

      return {
        success: false,
        message: error instanceof Error ? error.message : '审批请假申请失败'
      };
    }
  }

  /**
   * 获取请假申请统计
   */
  async getLeaveApplicationStatistics(
    params: Partial<LeaveApplicationQueryParams> = {}
  ): Promise<LeaveApplicationStatistics> {
    try {
      this.log.debug({ params }, '获取请假申请统计');

      const conditions = {
        teacher_id: params.teacher_id,
        kkh: params.kkh,
        xnxq: params.xnxq,
        class_date_start: params.start_date
          ? new Date(params.start_date)
          : undefined,
        class_date_end: params.end_date ? new Date(params.end_date) : undefined
      };

      const stats =
        await this.leaveApplicationRepo.getLeaveApplicationStats(conditions);

      const approvalRate =
        stats.total_count > 0
          ? (stats.approved_count / stats.total_count) * 100
          : 0;

      return {
        total_count: stats.total_count,
        pending_count: stats.pending_count,
        approved_count: stats.approved_count,
        rejected_count: stats.rejected_count,
        sick_leave_count: stats.sick_leave_count,
        personal_leave_count: stats.personal_leave_count,
        emergency_leave_count: stats.emergency_leave_count,
        other_leave_count: stats.other_leave_count,
        approval_rate: Math.round(approvalRate * 100) / 100
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          params
        },
        '获取请假申请统计失败'
      );

      throw error;
    }
  }

  /**
   * 撤销请假申请
   */
  async cancelLeaveApplication(
    applicationId: string,
    studentId: string
  ): Promise<LeaveApplicationResponse> {
    try {
      this.log.debug({ applicationId, studentId }, '开始撤销请假申请');

      // 获取请假申请
      const application =
        await this.leaveApplicationRepo.getLeaveApplicationById(applicationId);

      if (!application) {
        return {
          success: false,
          message: '请假申请不存在'
        };
      }

      if (application.student_id !== studentId) {
        return {
          success: false,
          message: '无权限操作该请假申请'
        };
      }

      if (application.status !== ApplicationStatus.PENDING) {
        return {
          success: false,
          message: '只能撤销待审批的请假申请'
        };
      }

      // 删除请假申请
      await this.leaveApplicationRepo.deleteLeaveApplication(applicationId);

      // 恢复学生考勤状态
      await this.studentAttendanceRepo.updateStudentAttendance(
        application.student_attendance_record_id,
        {
          status: AttendanceStatus.ABSENT,
          leave_reason: undefined,
          leave_time: undefined
        }
      );

      // 更新考勤记录统计
      const attendanceRecord = await this.attendanceRepo.getAttendanceRecord(
        application.student_attendance_record_id
      );
      if (attendanceRecord) {
        const stats = await this.studentAttendanceRepo.getAttendanceStats(
          attendanceRecord.id
        );
        await this.attendanceRepo.updateAttendanceRecord(attendanceRecord.id, {
          checkin_count: stats.present_count,
          absent_count: stats.absent_count,
          leave_count: stats.leave_count
        });
      }

      this.log.info({ applicationId, studentId }, '请假申请撤销成功');

      return {
        success: true,
        message: '请假申请已撤销'
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          applicationId,
          studentId
        },
        '撤销请假申请失败'
      );

      return {
        success: false,
        message: error instanceof Error ? error.message : '撤销请假申请失败'
      };
    }
  }

  /**
   * 转换实体为业务对象
   */
  private convertToLeaveApplication(entity: any): LeaveApplication {
    return {
      id: entity.id,
      student_id: entity.student_id,
      student_name: entity.student_name,
      student_attendance_record_id: entity.student_attendance_record_id,
      kkh: entity.kkh,
      xnxq: entity.xnxq,
      course_name: entity.course_name,
      class_date: entity.class_date,
      class_time: entity.class_time,
      class_location: entity.class_location,
      teacher_id: entity.teacher_id,
      teacher_name: entity.teacher_name,
      leave_type: entity.leave_type as LeaveType,
      leave_date: entity.leave_date,
      leave_reason: entity.leave_reason,
      application_time: entity.application_time,
      status: entity.status as ApplicationStatus,
      created_at: entity.created_at,
      updated_at: entity.updated_at
    };
  }

  /**
   * 工厂方法创建服务实例
   */
  static create(
    leaveApplicationRepo: LeaveApplicationRepository,
    attendanceRepo: AttendanceRepository,
    studentAttendanceRepo: StudentAttendanceRepository,
    studentInfoRepo: StudentInfoRepository,
    log: Logger
  ): LeaveApplicationService {
    return new LeaveApplicationService(
      leaveApplicationRepo,
      attendanceRepo,
      studentAttendanceRepo,
      studentInfoRepo,
      log
    );
  }
}
