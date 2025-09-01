// @wps/app-icalink 请假服务实现
// 基于 Stratix 框架的服务实现类

import type { Logger } from '@stratix/core';
import type { IAttendanceCourseRepository } from '../repositories/interfaces/IAttendanceCourseRepository.js';
import type { IAttendanceRecordRepository } from '../repositories/interfaces/IAttendanceRecordRepository.js';
import type { ILeaveApplicationRepository } from '../repositories/interfaces/ILeaveApplicationRepository.js';
import type { ILeaveApprovalRepository } from '../repositories/interfaces/ILeaveApprovalRepository.js';
import type { ILeaveAttachmentRepository } from '../repositories/interfaces/ILeaveAttachmentRepository.js';
import type {
  ApprovalRequest,
  ApprovalResponse,
  AttachmentsResponse,
  LeaveApplicationRequest,
  LeaveApplicationResponse,
  LeaveApplicationsResponse,
  LeaveQueryParams,
  UserInfo,
  WithdrawResponse
} from '../types/api.js';
import type { LeaveStatus, LeaveType } from '../types/database.js';
import { ApprovalResult, AttendanceStatus } from '../types/database.js';
import type { ServiceResult } from '../types/service.js';
import {
  isSuccessResult,
  ServiceErrorCode,
  wrapServiceCall
} from '../types/service.js';
import {
  formatDate,
  formatDateTime,
  formatLocalDateTime,
  getCurrentDateTime
} from '../utils/datetime.js';
import { extractOptionFromServiceResult } from '../utils/type-fixes.js';
import {
  validateDateRange,
  validateDateString,
  validateLeaveReason,
  validateLeaveType,
  validatePagination
} from '../utils/validation.js';
import type { ILeaveService } from './interfaces/ILeaveService.js';
import type { IUserService } from './interfaces/IUserService.js';

/**
 * 请假服务实现类
 * 实现ILeaveService接口，提供请假相关的业务逻辑
 */
export default class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveApplicationRepository: ILeaveApplicationRepository,
    private readonly leaveApprovalRepository: ILeaveApprovalRepository,
    private readonly leaveAttachmentRepository: ILeaveAttachmentRepository,
    private readonly attendanceRecordRepository: IAttendanceRecordRepository,
    private readonly attendanceCourseRepository: IAttendanceCourseRepository,
    private readonly userService: IUserService,
    private readonly logger: Logger
  ) {}

  /**
   * 查询请假信息
   */
  async queryLeaveApplications(
    userInfo: UserInfo,
    params: LeaveQueryParams
  ): Promise<ServiceResult<LeaveApplicationsResponse>> {
    return wrapServiceCall(async () => {
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
      } else if (userInfo.type === 'teacher') {
        conditions.teacher_id = userInfo.id;
        // 教师可以查询指定学生的记录
        if (params.student_id) {
          conditions.student_id = params.student_id;
        }
      }

      if (params.course_id) {
        conditions.course_id = params.course_id;
      }

      if (params.status && params.status !== 'all') {
        conditions.status = params.status as LeaveStatus;
      }

      // 查询请假申请
      const applicationsResult =
        await this.leaveApplicationRepository.findWithDetailsPaginated(
          conditions,
          {
            pagination: {
              page: paginationValidation.data.page,
              page_size: paginationValidation.data.pageSize
            },
            sort: { field: 'application_time', direction: 'desc' }
          }
        );

      if (!isSuccessResult(applicationsResult)) {
        throw new Error('查询请假申请失败');
      }

      // 转换为API响应格式
      const applications = await Promise.all(
        applicationsResult.data.data.map(async (app) => {
          // 通过course_id获取课程详细信息
          let courseInfo = null;

          try {
            const courseResult =
              await this.attendanceCourseRepository.findByCourseCode(
                app.course_id
              );

            if (
              isSuccessResult(courseResult) &&
              courseResult.data &&
              courseResult.data.length > 0
            ) {
              const course = courseResult.data[0]; // 取第一个课程

              // 创建课程开始和结束时间，确保不为空
              let courseStartTime: string = formatLocalDateTime(
                course.start_time
              );
              let courseEndTime: string = formatLocalDateTime(course.end_time);

              courseInfo = {
                kcmc: course.course_name,
                room_s: course.class_location || '',
                xm_s: course.teacher_names || '',
                jc_s: '', // 课节信息，可能需要从其他地方获取
                jxz: null, // 教学周，可能需要从其他地方获取
                lq: course.class_location || '',
                course_start_time: courseStartTime,
                course_end_time: courseEndTime
              };
            }
          } catch (error) {
            // 忽略课程查询错误，使用默认值
          }

          // 如果没有找到课程信息，创建一个默认的课程信息避免前端错误
          if (!courseInfo) {
            // 创建未来时间，确保撤回按钮可以显示
            let fallbackStartTime: string;
            let fallbackEndTime: string;

            if (app.class_date) {
              // 使用申请表中的日期，创建本地时间而不是UTC时间
              const classDate = new Date(app.class_date);
              classDate.setHours(8, 0, 0, 0); // 设置为本地时间08:00
              fallbackStartTime = formatLocalDateTime(classDate);

              classDate.setHours(10, 0, 0, 0); // 设置为本地时间10:00
              fallbackEndTime = formatLocalDateTime(classDate);
            } else {
              // 使用明天的时间作为默认值
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(9, 0, 0, 0);
              fallbackStartTime = formatLocalDateTime(tomorrow);

              tomorrow.setHours(11, 0, 0, 0);
              fallbackEndTime = formatLocalDateTime(tomorrow);
            }

            courseInfo = {
              kcmc: app.course_name || '未知课程',
              room_s: app.class_location || '',
              xm_s: app.teacher_name || '',
              jc_s: '',
              jxz: null,
              lq: app.class_location || '',
              course_start_time: fallbackStartTime,
              course_end_time: fallbackEndTime
            };
          }

          // 查询附件信息
          const attachmentsResult =
            await this.leaveAttachmentRepository.findByLeaveApplication(app.id);
          const attachments = isSuccessResult(attachmentsResult)
            ? attachmentsResult.data.map((attachment) => ({
                id: attachment.id.toString(),
                file_name: attachment.image_name,
                file_size: attachment.image_size,
                file_type: attachment.image_type,
                upload_time: formatDateTime(attachment.upload_time),
                // 预览URL - 使用缩略图
                thumbnail_url: `/api/icalink/v1/attendance/attachments/${attachment.id}/image?thumbnail=true`,
                // 预览URL - 原图
                preview_url: `/api/icalink/v1/attendance/attachments/${attachment.id}/image`,
                // 下载URL
                download_url: `/api/icalink/v1/attendance/attachments/${attachment.id}/download`
              }))
            : [];

          // 查询审批信息
          const approvalsResult =
            await this.leaveApprovalRepository.findByLeaveApplication(app.id);
          const approvals = isSuccessResult(approvalsResult)
            ? approvalsResult.data.map((approval) => ({
                id: approval.id.toString(),
                approver_id: approval.approver_id,
                approver_name: approval.approver_name,
                approval_result: this.mapApprovalResultToFrontend(
                  approval.approval_result
                ),
                approval_comment: approval.approval_comment || undefined,
                approval_time: approval.approval_time
                  ? formatDateTime(approval.approval_time)
                  : undefined
              }))
            : [];

          // 从审批信息中获取最新的审批结果
          let mappedStatus = 'pending'; // 默认状态

          if (approvals && approvals.length > 0) {
            // 获取最新的审批记录
            const latestApproval = approvals[approvals.length - 1];
            if (latestApproval && latestApproval.approval_result) {
              // 将前端格式的审批结果转换回枚举值
              const approvalResultEnum = this.mapFrontendToApprovalResult(
                latestApproval.approval_result as string
              );
              mappedStatus =
                this.mapApprovalResultToApplicationStatus(approvalResultEnum);
            }
          }

          return {
            id: Number(app.id), // 确保转换为数字
            student_id: app.student_id,
            student_name: app.student_name,
            course_id: app.course_id,
            course_name: app.course_name,
            teacher_id: app.teacher_id,
            teacher_name: app.teacher_name,
            leave_type: app.leave_type,
            leave_reason: app.leave_reason,
            status: mappedStatus, // 🔥 使用映射后的状态
            application_time: formatDateTime(app.application_time),
            approval_time: app.approval_time
              ? formatDateTime(app.approval_time)
              : undefined,
            approval_comment: app.approval_comment || undefined,
            has_attachments: (app.attachment_count || 0) > 0,
            class_date: app.class_date || '',
            class_time: app.class_time || '',
            course_info: courseInfo, // 添加课程信息
            // 返回实际的附件和审批数据
            attachments: attachments,
            approvals: approvals
          };
        })
      );

      const response: LeaveApplicationsResponse = {
        applications: applications as any,
        pagination: {
          total: applicationsResult.data.total,
          page: applicationsResult.data.page,
          page_size: applicationsResult.data.page_size,
          total_pages: applicationsResult.data.total_pages
        }
      };

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 学生请假申请
   */
  async submitLeaveApplication(
    studentInfo: UserInfo,
    request: LeaveApplicationRequest
  ): Promise<ServiceResult<LeaveApplicationResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        {
          studentId: studentInfo.id,
          attendanceRecordId: request.attendance_record_id
        },
        'Submit leave application started'
      );

      // 验证请假类型
      const leaveTypeValidation = validateLeaveType(request.leave_type);
      if (!isSuccessResult(leaveTypeValidation)) {
        throw new Error(leaveTypeValidation.error?.message);
      }

      // 验证请假原因
      const reasonValidation = validateLeaveReason(request.leave_reason);
      if (!isSuccessResult(reasonValidation)) {
        throw new Error(reasonValidation.error?.message);
      }

      // 根据external_id查找课程
      const courseResult =
        await this.attendanceCourseRepository.findByExternalId(
          request.attendance_record_id
        );
      if (!isSuccessResult(courseResult) || !courseResult.data) {
        throw new Error('课程不存在');
      }

      const course = courseResult.data;

      // 根据课程ID和学生ID查找签到记录，如果不存在则创建一个
      let attendanceRecord =
        await this.attendanceRecordRepository.findByCourseAndStudent(
          course.id,
          studentInfo.id
        );

      let record: any = null;

      if (attendanceRecord.success && attendanceRecord.data) {
        record = extractOptionFromServiceResult({
          success: true,
          data: attendanceRecord.data
        });

        this.logger.info(
          { recordId: (record as any)?.id, studentId: studentInfo.id },
          'Found existing attendance record for leave application'
        );
      } else {
        // 没有签到记录，需要创建一个，因为前端依赖这个记录来显示请假状态
        this.logger.info(
          { courseId: course.id, studentId: studentInfo.id },
          'Creating attendance record for leave application'
        );

        try {
          // 创建基础的签到记录
          const createRecordData = {
            attendance_course_id: course.id,
            student_id: studentInfo.id,
            student_name: studentInfo.name,
            class_name: '', // 可以从学生信息中获取，暂时为空
            major_name: '', // 可以从学生信息中获取，暂时为空
            status: AttendanceStatus.ABSENT, // 设置为缺勤，稍后会更新为请假
            created_by: studentInfo.id
          };

          const createResult =
            await this.attendanceRecordRepository.create(createRecordData);

          if (createResult.success && createResult.data) {
            // 修复record ID获取逻辑
            let recordId: number = 0;
            if (createResult.data) {
              if (typeof createResult.data === 'object') {
                recordId =
                  (createResult.data as any).id ||
                  (createResult.data as any).insertId ||
                  (createResult.data as any).value?.id ||
                  (createResult.data as any).value?.insertId ||
                  0;
              } else if (typeof createResult.data === 'number') {
                recordId = createResult.data;
              }
            }

            if (recordId === 0) {
              throw new Error('无法获取签到记录ID');
            }

            record = { ...createResult.data, id: recordId, insertId: recordId };
            this.logger.info(
              { recordId, studentId: studentInfo.id },
              'Successfully created attendance record for leave application'
            );
          } else {
            throw new Error('创建签到记录失败');
          }
        } catch (error) {
          this.logger.error(
            { error, courseId: course.id, studentId: studentInfo.id },
            'Failed to create attendance record for leave application'
          );
          throw new Error('创建签到记录失败，无法提交请假申请');
        }
      }

      // 检查是否已存在有效的请假申请（排除已取消的申请）
      if (record && (record as any).id) {
        const activeApplication =
          await this.leaveApplicationRepository.findActiveByAttendanceRecord(
            (record as any).id
          );
        if (isSuccessResult(activeApplication) && activeApplication.data) {
          const app = activeApplication.data;
          throw new Error(
            `该签到记录已存在有效的请假申请，当前状态：${app.status}`
          );
        }

        this.logger.info(
          { attendanceRecordId: (record as any).id },
          'No active leave application found, proceeding with new application'
        );
      }

      // 解析教师codes，支持多教师
      const teacherCodes = course.teacher_codes
        ? course.teacher_codes.split(',').map((code) => code.trim())
        : [];
      const teacherNames = course.teacher_names
        ? course.teacher_names.split(',').map((name) => name.trim())
        : [];

      // 如果只有一个教师，直接使用；如果有多个教师，使用逗号连接
      const primaryTeacherId =
        teacherCodes.length > 0 ? teacherCodes[0] : course.teacher_codes;
      const primaryTeacherName =
        teacherNames.length > 0 ? teacherNames[0] : course.teacher_names;

      // 创建请假申请
      const attendanceRecordId = (record as any).id || (record as any).insertId;
      if (!attendanceRecordId) {
        throw new Error('无法获取签到记录ID，请假申请创建失败');
      }

      const applicationData = {
        attendance_record_id: attendanceRecordId.toString(),
        student_id: studentInfo.id,
        student_name: studentInfo.name,
        course_id: course.course_code, // 使用课程的开课号
        course_name: course.course_name,
        teacher_id: primaryTeacherId, // 使用主要教师ID
        teacher_name: primaryTeacherName, // 使用主要教师姓名
        leave_type: request.leave_type as LeaveType,
        leave_reason: request.leave_reason,
        status: 'leave_pending' as LeaveStatus,
        application_time: getCurrentDateTime(),
        created_by: studentInfo.id
      };

      const createResult = await this.leaveApplicationRepository.create(
        applicationData as any
      );
      if (!createResult.success) {
        throw new Error('创建请假申请失败');
      }

      // 修复applicationId获取逻辑
      let applicationId: number = 0;
      if (createResult.data) {
        // 检查多种可能的ID字段
        if (typeof createResult.data === 'object') {
          applicationId =
            (createResult.data as any).id ||
            (createResult.data as any).insertId ||
            (createResult.data as any).value?.id ||
            (createResult.data as any).value?.insertId ||
            0;
        } else if (typeof createResult.data === 'number') {
          applicationId = createResult.data;
        }
      }

      if (applicationId === 0) {
        this.logger.error(
          { createResult: createResult.data },
          'Failed to get applicationId from create result'
        );
        throw new Error('无法获取请假申请ID，创建审批记录失败');
      }

      this.logger.info(
        { applicationId, createResultData: createResult.data },
        'Successfully created leave application and got ID'
      );

      // 为每个教师创建审批记录
      if (teacherCodes.length > 0) {
        this.logger.info(
          { applicationId, teacherCodes },
          'Creating approval records for multiple teachers'
        );

        for (let i = 0; i < teacherCodes.length; i++) {
          const teacherCode = teacherCodes[i];
          const teacherName = teacherNames[i] || teacherCode; // 如果没有对应的姓名，使用代码作为姓名

          const approvalData = {
            leave_application_id: applicationId,
            approver_id: teacherCode,
            approver_name: teacherName,
            approval_result: ApprovalResult.PENDING,
            approval_order: i + 1, // 审批顺序，从1开始
            is_final_approver: true, // 暂时都设为最终审批人，后续可以根据业务需求调整
            created_by: studentInfo.id
          };

          try {
            const approvalResult =
              await this.leaveApprovalRepository.create(approvalData);
            if (!approvalResult.success) {
              this.logger.warn(
                { teacherCode, teacherName, applicationId },
                'Failed to create approval record for teacher'
              );
            } else {
              this.logger.info(
                { teacherCode, teacherName, applicationId },
                'Successfully created approval record for teacher'
              );
            }
          } catch (error) {
            this.logger.error(
              { error, teacherCode, teacherName, applicationId },
              'Error creating approval record for teacher'
            );
          }
        }
      } else {
        // 如果没有解析出多个教师，为主要教师创建单个审批记录
        const approvalData = {
          leave_application_id: applicationId,
          approver_id: primaryTeacherId || course.teacher_codes || '',
          approver_name: primaryTeacherName || course.teacher_names || '',
          approval_result: ApprovalResult.PENDING,
          approval_order: 1,
          is_final_approver: true,
          created_by: studentInfo.id
        };

        try {
          await this.leaveApprovalRepository.create(approvalData);
          this.logger.info(
            { teacherId: primaryTeacherId, applicationId },
            'Successfully created single approval record'
          );
        } catch (error) {
          this.logger.error(
            { error, teacherId: primaryTeacherId, applicationId },
            'Error creating single approval record'
          );
        }
      }

      // 处理附件上传
      let attachmentIds: number[] = [];
      if (
        (request as any).attachments &&
        (request as any).attachments.length > 0
      ) {
        const attachmentResult = await this.uploadAttachments(
          applicationId,
          (request as any).attachments
        );
        if (isSuccessResult(attachmentResult)) {
          attachmentIds = attachmentResult.data;
        }
      }

      // 更新签到记录状态为请假待审批
      const recordId = (record as any).id || (record as any).insertId;
      await this.attendanceRecordRepository.update(recordId, {
        status: AttendanceStatus.LEAVE_PENDING, // 应该是 LEAVE_PENDING 而不是 LEAVE
        updated_by: studentInfo.id
      });

      const response: LeaveApplicationResponse = {
        application_id: Number(applicationId), // 确保转换为数字
        student_id: studentInfo.id,
        student_name: studentInfo.name,
        course_name: course.course_name,
        teacher_name: course.teacher_names,
        leave_type: request.leave_type,
        leave_reason: request.leave_reason,
        status: 'leave_pending' as any,
        application_time: formatDateTime(applicationData.application_time)
      } as any;

      this.logger.info(
        {
          applicationId,
          studentId: studentInfo.id
        },
        'Submit leave application completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 撤回请假申请
   */
  async withdrawLeaveApplication(
    applicationId: number,
    studentInfo: UserInfo
  ): Promise<ServiceResult<WithdrawResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { applicationId, studentId: studentInfo.id },
        'Withdraw leave application started'
      );

      // 查找请假申请
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const app = extractOptionFromServiceResult(application);
      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证权限
      if ((app as any)?.student_id !== studentInfo.id) {
        throw new Error('无权限撤回该请假申请');
      }

      // 检查状态是否允许撤回 - 只要在课程开始前，任何状态都可以撤回
      const allowedStatuses = ['leave_pending', 'leave', 'leave_rejected'];
      if (!allowedStatuses.includes((app as any)?.status)) {
        throw new Error('该请假申请无法撤回');
      }

      // 获取课程信息检查是否在课程开始前
      let canWithdraw = true;
      try {
        const courseResult =
          await this.attendanceCourseRepository.findByCourseCode(
            (app as any)?.course_id || ''
          );
        if (
          isSuccessResult(courseResult) &&
          courseResult.data &&
          courseResult.data.length > 0
        ) {
          const course = courseResult.data[0];
          const now = new Date();
          const courseStartTime = new Date(course.start_time);

          // 如果当前时间已经超过课程开始时间，不允许撤回
          if (now >= courseStartTime) {
            canWithdraw = false;
          }
        }
      } catch (error) {
        this.logger.warn(
          { applicationId, error },
          'Failed to check course time for withdraw, allowing withdrawal'
        );
        // 如果无法获取课程时间，允许撤回（兼容性考虑）
      }

      if (!canWithdraw) {
        throw new Error('课程已开始，无法撤回请假申请');
      }

      // 更新申请状态
      const updateResult = await this.leaveApplicationRepository.update(
        applicationId,
        {
          status: 'cancelled' as LeaveStatus,
          updated_by: studentInfo.id
        }
      );

      if (!updateResult.success) {
        throw new Error('撤回请假申请失败');
      }

      // 恢复签到记录状态
      await this.attendanceRecordRepository.update(
        (app as any)?.attendance_record_id || 0,
        {
          status: AttendanceStatus.ABSENT,
          updated_by: studentInfo.id
        }
      );

      // 更新所有相关的审批记录状态为cancelled
      try {
        const approvalRecords =
          await this.leaveApprovalRepository.findByLeaveApplication(
            applicationId
          );
        if (approvalRecords.success && approvalRecords.data) {
          const currentTime = getCurrentDateTime();
          for (const approval of approvalRecords.data) {
            if (approval.approval_result === ApprovalResult.PENDING) {
              await this.leaveApprovalRepository.update(approval.id, {
                approval_result: ApprovalResult.CANCELLED,
                approval_time: currentTime,
                approval_comment: '学生已撤回请假申请',
                updated_by: studentInfo.id
              });
            }
          }

          this.logger.info(
            { applicationId, approvalCount: approvalRecords.data.length },
            'Updated approval records status to cancelled'
          );
        }
      } catch (error) {
        this.logger.error(
          { error, applicationId },
          'Failed to update approval records during withdrawal'
        );
        // 不抛出错误，因为主要的撤回操作已经成功
      }

      const response = {
        application_id: Number(applicationId), // 确保转换为数字
        student_id: studentInfo.id,
        student_name: studentInfo.name,
        status: 'cancelled',
        withdraw_time: formatDateTime(getCurrentDateTime())
      } as any;

      this.logger.info(
        {
          applicationId,
          studentId: studentInfo.id
        },
        'Withdraw leave application completed'
      );

      return response;
    }, ServiceErrorCode.LEAVE_WITHDRAW_FAILED);
  }

  /**
   * 审批请假申请
   */
  async approveLeaveApplication(
    applicationId: number,
    teacherInfo: UserInfo,
    request: ApprovalRequest
  ): Promise<ServiceResult<ApprovalResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { applicationId, teacherId: teacherInfo.id },
        'Approve leave application started'
      );

      // 查找请假申请
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const app = extractOptionFromServiceResult({
        success: true,
        data: application.data
      });
      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证教师权限
      if ((app as any)?.teacher_id !== teacherInfo.id) {
        throw new Error('无权限审批该请假申请');
      }

      // 检查状态是否允许审批
      if ((app as any)?.status !== 'leave_pending') {
        throw new Error('只能审批待审批状态的请假申请');
      }

      const approvalTime = getCurrentDateTime();
      const newStatus =
        request.result === 'approved' ? 'leave' : 'leave_rejected';

      // 更新申请状态
      const updateResult = await this.leaveApplicationRepository.update(
        applicationId,
        {
          status: newStatus as LeaveStatus,
          approval_time: approvalTime,
          approval_comment: request.comment,
          updated_by: teacherInfo.id
        }
      );

      if (!updateResult.success) {
        throw new Error('审批请假申请失败');
      }

      // 更新签到记录状态
      const attendanceStatus =
        request.result === 'approved'
          ? AttendanceStatus.LEAVE
          : AttendanceStatus.ABSENT;
      await this.attendanceRecordRepository.update(
        (app as any)?.attendance_record_id || 0,
        {
          status: attendanceStatus,
          updated_by: teacherInfo.id
        }
      );

      // 更新审批记录状态
      try {
        const approvalRecords =
          await this.leaveApprovalRepository.findByLeaveApplication(
            applicationId
          );
        if (approvalRecords.success && approvalRecords.data) {
          this.logger.info(
            {
              applicationId,
              teacherId: teacherInfo.id,
              approvalRecordsCount: approvalRecords.data.length,
              approvalRecords: approvalRecords.data.map((a) => ({
                id: a.id,
                approver_id: a.approver_id,
                approval_result: a.approval_result
              }))
            },
            '🔥 DEBUGGING: Found approval records for update'
          );

          for (const approval of approvalRecords.data) {
            if (
              approval.approver_id === teacherInfo.id &&
              approval.approval_result === ApprovalResult.PENDING
            ) {
              const newApprovalResult =
                request.result === 'approved'
                  ? ApprovalResult.APPROVED
                  : ApprovalResult.REJECTED;

              this.logger.info(
                {
                  approvalId: approval.id,
                  oldResult: approval.approval_result,
                  newResult: newApprovalResult,
                  teacherId: teacherInfo.id
                },
                '🔥 DEBUGGING: Updating approval record'
              );

              await this.leaveApprovalRepository.update(approval.id, {
                approval_result: newApprovalResult,
                approval_time: approvalTime,
                approval_comment: request.comment,
                updated_by: teacherInfo.id
              });

              this.logger.info(
                {
                  approvalId: approval.id,
                  newResult: newApprovalResult
                },
                '🔥 DEBUGGING: Approval record updated successfully'
              );

              break; // 只更新当前教师的审批记录
            }
          }
        }
      } catch (error) {
        this.logger.error(
          { error, applicationId, teacherId: teacherInfo.id },
          'Failed to update approval record status'
        );
        // 不抛出错误，因为主要的审批操作已经成功
      }

      const response: ApprovalResponse = {
        application_id: Number(applicationId), // 确保转换为数字
        student_id: (app as any)?.student_id || '',
        student_name: (app as any)?.student_name || '',
        teacher_id: teacherInfo.id,
        teacher_name: teacherInfo.name,
        approved: (request as any)?.approved || false,
        status: newStatus,
        approval_time: formatDateTime(approvalTime),
        approval_comment: request.comment
      } as any;

      this.logger.info(
        {
          applicationId,
          teacherId: teacherInfo.id,
          approved: (request as any)?.approved || false
        },
        'Approve leave application completed'
      );

      return response;
    }, ServiceErrorCode.LEAVE_APPROVAL_FAILED);
  }

  /**
   * 查看请假申请附件
   */
  async getLeaveAttachments(
    applicationId: number,
    userInfo: UserInfo
  ): Promise<ServiceResult<AttachmentsResponse>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { applicationId, userId: userInfo.id },
        'Get leave attachments started'
      );

      // 查找请假申请
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const app = extractOptionFromServiceResult({
        success: true,
        data: application.data
      });
      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证权限
      if (
        userInfo.type === 'student' &&
        (app as any)?.student_id !== userInfo.id
      ) {
        throw new Error('无权限查看该请假申请的附件');
      } else if (
        userInfo.type === 'teacher' &&
        (app as any)?.teacher_id !== userInfo.id
      ) {
        throw new Error('无权限查看该请假申请的附件');
      }

      // 查询附件列表
      const attachmentsResult =
        await this.leaveAttachmentRepository.findByLeaveApplication(
          applicationId
        );
      if (!isSuccessResult(attachmentsResult)) {
        throw new Error('查询附件列表失败');
      }

      // 转换为API响应格式，统一字段名以匹配前端期望
      const attachments = attachmentsResult.data.map((attachment) => ({
        id: attachment.id.toString(),
        file_name: attachment.image_name,
        file_size: attachment.image_size,
        file_type: attachment.image_type,
        upload_time: formatDateTime(attachment.upload_time),
        // 预览URL - 使用缩略图
        thumbnail_url: `/api/icalink/v1/attendance/attachments/${attachment.id}/image?thumbnail=true`,
        // 预览URL - 原图
        preview_url: `/api/icalink/v1/attendance/attachments/${attachment.id}/image`,
        // 下载URL
        download_url: `/api/icalink/v1/attendance/attachments/${attachment.id}/download`
      }));

      const response: AttachmentsResponse = {
        application_id: applicationId,
        student_id: (app as any)?.student_id || '',
        student_name: (app as any)?.student_name || '',
        attachments,
        total_count: attachments.length,
        total_size: attachments.reduce(
          (sum, att) => sum + (att.file_size || 0),
          0
        )
      };

      this.logger.info(
        {
          applicationId,
          userId: userInfo.id,
          attachmentCount: attachments.length
        },
        'Get leave attachments completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 下载请假申请附件
   */
  async downloadLeaveAttachment(
    applicationId: number,
    attachmentId: number,
    userInfo: UserInfo,
    thumbnail?: boolean
  ): Promise<
    ServiceResult<{
      fileName: string;
      fileContent: Buffer;
      mimeType: string;
      fileSize: number;
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        {
          applicationId,
          attachmentId,
          userId: userInfo.id,
          thumbnail
        },
        'Download leave attachment started'
      );

      // 查找请假申请
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const app = extractOptionFromServiceResult({
        success: true,
        data: application.data
      });
      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证权限
      if (
        userInfo.type === 'student' &&
        (app as any)?.student_id !== userInfo.id
      ) {
        throw new Error('无权限下载该请假申请的附件');
      } else if (
        userInfo.type === 'teacher' &&
        (app as any)?.teacher_id !== userInfo.id
      ) {
        throw new Error('无权限下载该请假申请的附件');
      }

      // 查找附件
      const attachment =
        await this.leaveAttachmentRepository.findById(attachmentId);
      if (!attachment.success) {
        throw new Error('附件不存在');
      }

      const att = extractOptionFromServiceResult({
        success: true,
        data: attachment.data
      });
      if (!att) {
        throw new Error('附件不存在');
      }

      // 验证附件属于该申请
      if ((att as any)?.leave_application_id !== applicationId) {
        throw new Error('附件不属于该请假申请');
      }

      // 返回文件内容
      const fileContent =
        thumbnail && (att as any)?.thumbnail_content
          ? (att as any)?.thumbnail_content
          : (att as any)?.image_content;

      const fileName = thumbnail
        ? `thumbnail_${(att as any)?.image_name || 'attachment'}`
        : (att as any)?.image_name || 'attachment';

      const response = {
        fileName,
        fileContent,
        mimeType: (att as any)?.image_type || 'application/octet-stream',
        fileSize: fileContent?.length || 0
      };

      this.logger.info(
        {
          applicationId,
          attachmentId,
          userId: userInfo.id,
          fileSize: response.fileSize
        },
        'Download leave attachment completed'
      );

      return response;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 验证请假申请权限
   */
  async validateLeaveApplicationPermission(
    attendanceRecordId: number,
    studentId: string
  ): Promise<
    ServiceResult<{
      canApply: boolean;
      reason?: string;
      existingApplication?: {
        id: number;
        status: string;
        applicationTime: Date;
      };
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { attendanceRecordId, studentId },
        'Validate leave application permission started'
      );

      // 检查签到记录是否存在
      const attendanceRecord =
        await this.attendanceRecordRepository.findById(attendanceRecordId);
      if (!attendanceRecord.success) {
        return {
          canApply: false,
          reason: '签到记录不存在'
        };
      }

      const record = extractOptionFromServiceResult({
        success: true,
        data: attendanceRecord.data
      });
      if (!record) {
        return {
          canApply: false,
          reason: '签到记录不存在'
        };
      }

      // 验证学生是否有权限申请该记录的请假
      if ((record as any)?.student_id !== studentId) {
        return {
          canApply: false,
          reason: '无权限申请该签到记录的请假'
        };
      }

      // 检查是否已存在请假申请
      const existingApplication =
        await this.leaveApplicationRepository.findByAttendanceRecord(
          attendanceRecordId
        );
      if (isSuccessResult(existingApplication) && existingApplication.data) {
        const app = existingApplication.data;
        return {
          canApply: false,
          reason: '该签到记录已存在请假申请',
          existingApplication: {
            id: app.id,
            status: app.status,
            applicationTime: app.application_time
          }
        };
      }

      // 检查签到记录状态是否允许请假
      if ((record as any)?.status === 'present') {
        return {
          canApply: false,
          reason: '已签到的记录不能申请请假'
        };
      }

      return {
        canApply: true
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取学生的请假申请列表
   */
  async getLeaveApplicationsByStudent(
    studentId: string,
    options?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      const conditions: any = {
        student_id: studentId,
        status: options?.status,
        start_date: options?.startDate,
        end_date: options?.endDate
      };

      const queryOptions = {
        pagination:
          options?.page && options?.pageSize
            ? {
                page: options.page,
                page_size: options.pageSize
              }
            : undefined
      };

      const result =
        await this.leaveApplicationRepository.findWithDetailsPaginated(
          conditions,
          queryOptions
        );

      if (!isSuccessResult(result)) {
        throw new Error('获取学生请假申请列表失败');
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取教师的请假申请列表
   */
  async getLeaveApplicationsByTeacher(
    teacherId: string,
    options?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      // 首先通过审批记录查找该教师需要审批的申请
      const approvalConditions: any = {
        approver_id: teacherId
      };

      // 如果指定了状态筛选，需要映射到审批状态
      if (options?.status && options?.status !== 'all') {
        if (options?.status === 'pending') {
          approvalConditions.approval_result = ApprovalResult.PENDING;
        } else if (options?.status === 'approved') {
          approvalConditions.approval_result = ApprovalResult.APPROVED;
        } else if (options?.status === 'rejected') {
          approvalConditions.approval_result = ApprovalResult.REJECTED;
        } else if (options?.status.includes(',')) {
          // 处理多状态查询，如 'approved,rejected,cancelled'
          const statusList = options.status.split(',').map((s) => s.trim());
          const approvalResults = [];

          if (statusList.includes('approved')) {
            approvalResults.push(ApprovalResult.APPROVED);
          }
          if (statusList.includes('rejected')) {
            approvalResults.push(ApprovalResult.REJECTED);
          }
          if (statusList.includes('cancelled')) {
            approvalResults.push(ApprovalResult.CANCELLED);
          }

          // 使用IN查询支持多状态
          if (approvalResults.length > 0) {
            approvalConditions.approval_result_in = approvalResults;
          }
        }
      }

      const queryOptions = {
        pagination:
          options?.page && options?.pageSize
            ? {
                page: options.page,
                page_size: options.pageSize
              }
            : undefined
      };

      // 查询审批记录，包含详细信息
      const approvalResult =
        await this.leaveApprovalRepository.findWithDetailsPaginated(
          approvalConditions,
          queryOptions
        );

      if (!isSuccessResult(approvalResult)) {
        this.logger.error(
          { teacherId, error: approvalResult.error },
          'Failed to get teacher approval records'
        );
        throw new Error('获取教师审批记录失败');
      }

      // 检查返回数据的结构
      if (!approvalResult.data || !Array.isArray(approvalResult.data.data)) {
        this.logger.warn(
          { teacherId, approvalResultData: approvalResult.data.data },
          'Invalid approval result data structure'
        );

        return {
          data: [],
          total: 0,
          page: 1,
          page_size: options?.pageSize || 50,
          total_pages: 0
        };
      }

      // 将审批记录转换为请假申请格式，并去重（按application_id去重）
      const uniqueRecordsMap = new Map();
      approvalResult.data.data.forEach((record: any) => {
        const applicationId =
          record.application_id || record.leave_application_id;
        if (!uniqueRecordsMap.has(applicationId)) {
          uniqueRecordsMap.set(applicationId, record);
        }
      });

      const uniqueRecords = Array.from(uniqueRecordsMap.values());

      // 将审批记录转换为请假申请格式，以兼容现有接口
      const applications = await Promise.all(
        uniqueRecords.map(async (record: any) => {
          const applicationId =
            record.application_id || record.leave_application_id;

          // 查询附件信息
          const attachmentsResult =
            await this.leaveAttachmentRepository.findByLeaveApplication(
              applicationId
            );
          const attachments = isSuccessResult(attachmentsResult)
            ? attachmentsResult.data.map((attachment) => ({
                id: attachment.id.toString(),
                file_name: attachment.image_name,
                file_size: attachment.image_size,
                file_type: attachment.image_type,
                upload_time: formatDateTime(attachment.upload_time),
                // 预览URL - 使用缩略图
                thumbnail_url: `/api/icalink/v1/leave-attachments/${attachment.id}/download?thumbnail=true`,
                // 预览URL - 原图
                preview_url: `/api/icalink/v1/leave-attachments/${attachment.id}/download`,
                // 下载URL
                download_url: `/api/icalink/v1/leave-attachments/${attachment.id}/download`
              }))
            : [];

          const mappedStatus = this.mapApprovalResultToApplicationStatus(
            record.approval_result
          );

          return {
            id: applicationId,
            approval_id: record.approval_id,
            student_id: record.student_id || '',
            student_name: record.student_name || '',
            course_id: record.course_id || '',
            course_name: record.course_name || record.course_full_name || '',
            class_date: record.class_date || record.approval_created_at,
            class_time: record.class_time || '',
            class_location:
              record.class_location || record.course_location || '',
            teacher_name: record.teacher_name || record.course_teachers || '',
            leave_date: record.class_date || record.approval_created_at,
            leave_reason: record.leave_reason || '',
            leave_type: record.leave_type || '',
            status: mappedStatus,
            approval_comment: record.approval_comment,
            approval_time: record.approval_time,
            application_time:
              record.application_time || record.approval_created_at,
            student_info: {
              student_id: record.student_id || '',
              student_name: record.student_name || '',
              class_name: '', // 需要从其他地方获取
              major_name: '' // 需要从其他地方获取
            },
            teacher_info: {
              teacher_id: record.teacher_id || record.approver_id,
              teacher_name: record.teacher_name || record.approver_name,
              teacher_department: '' // 需要从其他地方获取
            },
            attachments: attachments, // 返回实际查询到的附件
            jxz: null // 教学周信息
          };
        })
      );

      return {
        data: applications,
        total: applications.length, // 使用去重后的实际数量
        page: approvalResult.data.page,
        page_size: approvalResult.data.page_size,
        total_pages: Math.ceil(
          applications.length / (approvalResult.data.page_size || 1)
        )
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 映射审批结果到前端格式
   */
  private mapApprovalResultToFrontend(
    approvalResult: ApprovalResult
  ): 'pending' | 'approved' | 'rejected' | 'cancelled' {
    switch (approvalResult) {
      case ApprovalResult.PENDING:
        return 'pending';
      case ApprovalResult.APPROVED:
        return 'approved';
      case ApprovalResult.REJECTED:
        return 'rejected';
      case ApprovalResult.CANCELLED:
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  /**
   * 将前端格式转换回审批结果枚举
   */
  private mapFrontendToApprovalResult(frontendResult: string): ApprovalResult {
    switch (frontendResult) {
      case 'pending':
        return ApprovalResult.PENDING;
      case 'approved':
        return ApprovalResult.APPROVED;
      case 'rejected':
        return ApprovalResult.REJECTED;
      case 'cancelled':
        return ApprovalResult.CANCELLED;
      default:
        return ApprovalResult.PENDING;
    }
  }

  /**
   * 将审批结果映射为申请状态
   */
  private mapApprovalResultToApplicationStatus(
    approvalResult: ApprovalResult
  ): string {
    switch (approvalResult) {
      case ApprovalResult.PENDING:
        return 'pending';
      case ApprovalResult.APPROVED:
        return 'approved';
      case ApprovalResult.REJECTED:
        return 'rejected';
      case ApprovalResult.CANCELLED:
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  /**
   * 获取审批记录
   */
  async getApprovalRecord(approvalId: number): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      const result = await this.leaveApprovalRepository.findById(approvalId);

      if (!result.success) {
        throw new Error('审批记录不存在');
      }

      const approval = extractOptionFromServiceResult({
        success: true,
        data: result.data
      });
      if (!approval) {
        throw new Error('审批记录不存在');
      }

      return approval;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取请假统计信息
   */
  async getLeaveStatistics(options?: {
    studentId?: string;
    teacherId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<
    ServiceResult<{
      totalApplications: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      cancelledCount: number;
      approvalRate: number;
    }>
  > {
    return wrapServiceCall(async () => {
      const conditions: any = {
        student_id: options?.studentId,
        teacher_id: options?.teacherId,
        start_date: options?.startDate,
        end_date: options?.endDate
      };

      // 获取总数
      const totalResult =
        await this.leaveApplicationRepository.countByConditions(conditions);
      if (!isSuccessResult(totalResult)) {
        throw new Error('获取请假申请总数失败');
      }

      // 获取各状态数量
      const pendingResult =
        await this.leaveApplicationRepository.countByConditions({
          ...conditions,
          status: 'leave_pending'
        });
      const approvedResult =
        await this.leaveApplicationRepository.countByConditions({
          ...conditions,
          status: 'leave'
        });
      const rejectedResult =
        await this.leaveApplicationRepository.countByConditions({
          ...conditions,
          status: 'leave_rejected'
        });
      const cancelledResult =
        await this.leaveApplicationRepository.countByConditions({
          ...conditions,
          status: 'cancelled'
        });

      const totalCount = totalResult.data as number;
      const approvedCount = isSuccessResult(approvedResult)
        ? (approvedResult.data as number)
        : 0;
      const approvalRate =
        totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

      return {
        totalApplications: totalCount,
        pendingCount: isSuccessResult(pendingResult)
          ? (pendingResult.data as number)
          : 0,
        approvedCount,
        rejectedCount: isSuccessResult(rejectedResult)
          ? (rejectedResult.data as number)
          : 0,
        cancelledCount: isSuccessResult(cancelledResult)
          ? (cancelledResult.data as number)
          : 0,
        approvalRate
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 发送请假申请通知
   */
  async notifyLeaveApplication(
    applicationId: number,
    notificationType: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { applicationId, notificationType },
        'Send leave application notification'
      );

      // 这里可以实现具体的通知逻辑
      // 比如发送邮件、短信、推送通知等
      // 暂时返回成功
      return true;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 自动审批请假申请
   */
  async autoApproveLeaveApplication(
    applicationId: number
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      this.logger.info({ applicationId }, 'Auto approve leave application');

      // 这里可以实现自动审批逻辑
      // 比如根据请假类型、时长等条件自动审批
      // 暂时返回false（不自动审批）
      return false;
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 验证请假申请撤回权限
   */
  async validateWithdrawPermission(
    applicationId: number,
    studentId: string
  ): Promise<
    ServiceResult<{
      canWithdraw: boolean;
      reason?: string;
      currentStatus?: string;
    }>
  > {
    return wrapServiceCall(async () => {
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        return {
          canWithdraw: false,
          reason: '请假申请不存在'
        };
      }

      const optionApp = application.data;
      if (!optionApp.some) {
        return {
          canWithdraw: false,
          reason: '请假申请不存在'
        };
      }

      const app = optionApp.value;

      if (!app) {
        return {
          canWithdraw: false,
          reason: '请假申请不存在'
        };
      }

      if (app.student_id !== studentId) {
        return {
          canWithdraw: false,
          reason: '无权限撤回该请假申请',
          currentStatus: app.status
        };
      }

      // 检查状态是否允许撤回 - 只要在课程开始前，任何状态都可以撤回
      const allowedStatuses = ['leave_pending', 'leave', 'leave_rejected'];
      if (!allowedStatuses.includes(app.status)) {
        return {
          canWithdraw: false,
          reason: '该请假申请无法撤回',
          currentStatus: app.status
        };
      }

      // 获取课程信息检查是否在课程开始前
      let canWithdraw = true;
      try {
        const courseResult =
          await this.attendanceCourseRepository.findByCourseCode(
            app.course_id || ''
          );
        if (
          isSuccessResult(courseResult) &&
          courseResult.data &&
          courseResult.data.length > 0
        ) {
          const course = courseResult.data[0];
          const now = new Date();
          const courseStartTime = new Date(course.start_time);

          // 如果当前时间已经超过课程开始时间，不允许撤回
          if (now >= courseStartTime) {
            canWithdraw = false;
          }
        }
      } catch (error) {
        // 如果无法获取课程时间，允许撤回（兼容性考虑）
      }

      if (!canWithdraw) {
        return {
          canWithdraw: false,
          reason: '课程已开始，无法撤回请假申请',
          currentStatus: app.status
        };
      }

      return {
        canWithdraw: true,
        currentStatus: app.status
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 验证请假审批权限
   */
  async validateApprovalPermission(
    applicationId: number,
    teacherId: string
  ): Promise<
    ServiceResult<{
      canApprove: boolean;
      reason?: string;
      currentStatus?: string;
      isAssignedTeacher?: boolean;
    }>
  > {
    return wrapServiceCall(async () => {
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        return {
          canApprove: false,
          reason: '请假申请不存在'
        };
      }

      const optionApp = application.data;
      if (!optionApp.some) {
        return {
          canApprove: false,
          reason: '请假申请不存在'
        };
      }

      const app = optionApp.value;

      if (!app) {
        return {
          canApprove: false,
          reason: '请假申请不存在'
        };
      }

      const isAssignedTeacher = app.teacher_id === teacherId;

      if (!isAssignedTeacher) {
        return {
          canApprove: false,
          reason: '无权限审批该请假申请',
          currentStatus: app.status,
          isAssignedTeacher: false
        };
      }

      if (app.status !== 'leave_pending') {
        return {
          canApprove: false,
          reason: '只能审批待审批状态的请假申请',
          currentStatus: app.status,
          isAssignedTeacher: true
        };
      }

      return {
        canApprove: true,
        currentStatus: app.status,
        isAssignedTeacher: true
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 处理请假申请附件
   */
  async processLeaveAttachments(
    applicationId: number,
    images: Array<{
      name: string;
      type: string;
      size: number;
      content: string; // Base64编码
    }>
  ): Promise<
    ServiceResult<{
      uploadedCount: number;
      totalSize: number;
      attachmentIds: number[];
      errors?: Array<{
        fileName: string;
        error: string;
      }>;
    }>
  > {
    return wrapServiceCall(async () => {
      const attachmentIds: number[] = [];
      const errors: Array<{ fileName: string; error: string }> = [];
      let totalSize = 0;

      for (const image of images) {
        try {
          // 验证文件类型
          if (!image.type.startsWith('image/')) {
            errors.push({
              fileName: image.name,
              error: '只支持图片文件'
            });
            continue;
          }

          // 验证文件大小
          if (image.size > 10 * 1024 * 1024) {
            // 10MB
            errors.push({
              fileName: image.name,
              error: '文件大小不能超过10MB'
            });
            continue;
          }

          // 解码Base64内容
          const fileContent = Buffer.from(image.content, 'base64');

          // 创建附件记录
          const createResult = await this.leaveAttachmentRepository.create({
            leave_application_id: applicationId,
            image_name: image.name,
            image_type: image.type as any,
            image_size: image.size,
            image_extension: '',
            image_content: fileContent,
            upload_time: getCurrentDateTime()
          });

          if (createResult.success && createResult.data) {
            // 处理不同的返回数据格式
            let attachmentId: number = 0;

            if (typeof createResult.data === 'number') {
              // 直接返回ID
              attachmentId = createResult.data;
            } else if (typeof createResult.data === 'object') {
              // 返回对象，尝试获取ID
              const data = createResult.data as any;
              attachmentId =
                data.id ||
                data.insertId ||
                data.value?.id ||
                data.value?.insertId ||
                0;
            }

            if (attachmentId > 0) {
              attachmentIds.push(attachmentId);
              totalSize += image.size;

              this.logger.debug(
                {
                  fileName: image.name,
                  attachmentId,
                  size: image.size
                },
                'Attachment uploaded successfully'
              );
            } else {
              this.logger.error(
                {
                  fileName: image.name,
                  createResultData: createResult.data
                },
                'Failed to get attachment ID from create result'
              );
              errors.push({
                fileName: image.name,
                error: '无法获取附件ID'
              });
            }
          } else {
            this.logger.error(
              {
                fileName: image.name,
                createResult
              },
              'Failed to create attachment record'
            );
            errors.push({
              fileName: image.name,
              error: '上传失败'
            });
          }
        } catch (error) {
          errors.push({
            fileName: image.name,
            error: error instanceof Error ? error.message : '处理失败'
          });
        }
      }

      return {
        uploadedCount: attachmentIds.length,
        totalSize,
        attachmentIds,
        errors: errors.length > 0 ? errors : undefined
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 生成附件缩略图
   */
  async generateThumbnail(attachmentId: number): Promise<
    ServiceResult<{
      success: boolean;
      thumbnailSize?: number;
    }>
  > {
    return wrapServiceCall(async () => {
      // 这里可以实现缩略图生成逻辑
      // 暂时返回成功
      return {
        success: true,
        thumbnailSize: 5120 // 5KB
      };
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 获取学生请假统计
   */
  async getStudentLeaveStatistics(
    studentId: string,
    semester?: string
  ): Promise<
    ServiceResult<{
      totalApplications: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      cancelledCount: number;
      approvalRate: number;
      leaveTypeDistribution: Record<string, number>;
      monthlyTrends: Array<{
        month: string;
        applicationCount: number;
        approvalRate: number;
      }>;
    }>
  > {
    return wrapServiceCall(async () => {
      const basicStats = await this.getLeaveStatistics({ studentId });
      if (!isSuccessResult(basicStats)) {
        throw new Error(basicStats.error?.message);
      }

      // 暂时返回模拟的额外数据
      return {
        ...basicStats.data,
        leaveTypeDistribution: {
          sick: 5,
          personal: 3,
          emergency: 1,
          other: 2
        },
        monthlyTrends: [
          { month: '2024-01', applicationCount: 2, approvalRate: 100 },
          { month: '2024-02', applicationCount: 3, approvalRate: 66.7 },
          { month: '2024-03', applicationCount: 1, approvalRate: 100 }
        ]
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取教师审批统计
   */
  async getTeacherApprovalStatistics(
    teacherId: string,
    semester?: string
  ): Promise<
    ServiceResult<{
      totalApplications: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      approvalRate: number;
      averageApprovalTimeHours: number;
      courseStats: Array<{
        courseId: string;
        courseName: string;
        applicationCount: number;
        approvalRate: number;
      }>;
    }>
  > {
    return wrapServiceCall(async () => {
      // 暂时返回模拟数据
      return {
        totalApplications: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        approvalRate: 0,
        averageApprovalTimeHours: 0,
        courseStats: []
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取待审批申请
   */
  async getPendingApprovals(
    teacherId: string,
    limit?: number
  ): Promise<
    ServiceResult<
      Array<{
        applicationId: number;
        studentId: string;
        studentName: string;
        courseName: string;
        leaveType: string;
        leaveReason: string;
        applicationTime: Date;
        classDate: Date;
        hasAttachments: boolean;
        urgencyLevel: 'low' | 'medium' | 'high';
      }>
    >
  > {
    return wrapServiceCall(async () => {
      const conditions: any = {
        teacher_id: teacherId,
        status: 'leave_pending'
      };

      const queryOptions = {
        pagination: limit
          ? {
              page: 1,
              page_size: limit
            }
          : undefined
      };

      const result =
        await this.leaveApplicationRepository.findWithDetailsPaginated(
          conditions,
          queryOptions
        );

      if (!isSuccessResult(result)) {
        throw new Error('获取待审批申请失败');
      }

      // 转换为接口要求的格式
      const applications = result.data.data.map((app) => ({
        applicationId: app.id,
        studentId: app.student_id,
        studentName: app.student_name,
        courseName: app.course_name || '',
        leaveType: app.leave_type,
        leaveReason: app.leave_reason,
        applicationTime: app.application_time,
        classDate: new Date(), // 需要从课程信息获取
        hasAttachments: (app.attachment_count || 0) > 0,
        urgencyLevel: 'medium' as const // 需要根据业务规则确定
      }));

      return applications;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 批量审批申请
   */
  async batchApproveApplications(
    applicationIds: number[],
    teacherId: string,
    result: 'approved' | 'rejected',
    comment?: string
  ): Promise<
    ServiceResult<{
      successCount: number;
      failedCount: number;
      results: Array<{
        applicationId: number;
        success: boolean;
        error?: string;
      }>;
    }>
  > {
    return wrapServiceCall(async () => {
      let successCount = 0;
      let failedCount = 0;
      const results: Array<{
        applicationId: number;
        success: boolean;
        error?: string;
      }> = [];

      // 创建教师用户信息
      const teacherInfo: UserInfo = {
        id: teacherId,
        type: 'teacher',
        name: '教师' // 这里需要从数据库获取真实姓名
      };

      for (const applicationId of applicationIds) {
        try {
          const approvalResult = await this.approveLeaveApplication(
            applicationId,
            teacherInfo,
            { result: result, comment }
          );

          if (isSuccessResult(approvalResult)) {
            successCount++;
            results.push({
              applicationId,
              success: true
            });
          } else {
            failedCount++;
            results.push({
              applicationId,
              success: false,
              error: approvalResult.error?.message || '审批失败'
            });
          }
        } catch (error) {
          failedCount++;
          results.push({
            applicationId,
            success: false,
            error: error instanceof Error ? error.message : '审批失败'
          });
        }
      }

      return {
        successCount,
        failedCount,
        results
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取请假申请详情
   */
  async getLeaveApplicationDetail(
    applicationId: number,
    userInfo: UserInfo
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      const application =
        await this.leaveApplicationRepository.findById(applicationId);
      if (!application.success) {
        throw new Error('请假申请不存在');
      }

      const optionApp = application.data;
      if (!optionApp.some) {
        throw new Error('请假申请不存在');
      }

      const app = optionApp.value;

      if (!app) {
        throw new Error('请假申请不存在');
      }

      // 验证权限
      if (userInfo.type === 'student' && app.student_id !== userInfo.id) {
        throw new Error('无权限查看该请假申请');
      } else if (
        userInfo.type === 'teacher' &&
        app.teacher_id !== userInfo.id
      ) {
        throw new Error('无权限查看该请假申请');
      }

      // 获取附件列表
      const attachmentsResult =
        await this.leaveAttachmentRepository.getAttachmentList(applicationId);
      const attachments = isSuccessResult(attachmentsResult)
        ? attachmentsResult.data
        : [];

      return {
        ...app,
        attachments: attachments.map((att) => ({
          id: att.id,
          name: att.image_name,
          size: att.image_size,
          type: att.image_type,
          uploadTime: formatDateTime(att.upload_time)
        }))
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 发送请假通知
   */
  async sendLeaveNotification(
    applicationId: number,
    notificationType: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  ): Promise<
    ServiceResult<{
      sent: boolean;
      recipients: string[];
      method: 'email' | 'sms' | 'push';
    }>
  > {
    return wrapServiceCall(async () => {
      // 这里可以实现具体的通知逻辑
      return {
        sent: true,
        recipients: ['student@example.com', 'teacher@example.com'],
        method: 'email' as const
      };
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 导出请假数据
   */
  async exportLeaveData(
    teacherId: string,
    startDate: Date,
    endDate: Date,
    format: 'excel' | 'csv' | 'pdf'
  ): Promise<
    ServiceResult<{
      fileName: string;
      fileContent: Buffer;
      mimeType: string;
    }>
  > {
    return wrapServiceCall(async () => {
      // 这里可以实现数据导出逻辑
      return {
        fileName: `leave_data_${formatDate(startDate)}_${formatDate(endDate)}.${format}`,
        fileContent: Buffer.from('mock data'),
        mimeType:
          format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : format === 'csv'
              ? 'text/csv'
              : 'application/pdf'
      };
    }, ServiceErrorCode.UNKNOWN_ERROR);
  }

  /**
   * 通过附件ID直接下载附件
   */
  async downloadAttachmentById(
    attachmentId: number,
    userInfo: UserInfo,
    thumbnail?: boolean
  ): Promise<
    ServiceResult<{
      fileName: string;
      fileContent: Buffer;
      mimeType: string;
      fileSize: number;
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { attachmentId, thumbnail },
        'Download attachment by ID started'
      );

      // 获取附件内容
      const attachmentResult =
        await this.leaveAttachmentRepository.getAttachmentContent(
          attachmentId,
          thumbnail
        );

      if (!isSuccessResult(attachmentResult) || !attachmentResult.data) {
        throw new Error('附件不存在或已被删除');
      }

      const attachment = attachmentResult.data;

      // 验证权限 - 需要检查用户是否有权限下载该附件
      // 这里可以通过附件关联的请假申请来验证权限
      // 暂时跳过权限验证

      return {
        fileName: attachment.fileName,
        fileContent: attachment.fileContent,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 上传附件
   */
  private async uploadAttachments(
    applicationId: number,
    attachments: any[]
  ): Promise<ServiceResult<number[]>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { applicationId, attachmentCount: attachments.length },
        'Processing leave application attachments'
      );

      // 转换附件数据格式以匹配processLeaveAttachments方法期望的格式
      const formattedAttachments = attachments.map((attachment: any) => ({
        name: attachment.file_name || attachment.name,
        type: attachment.file_type || attachment.type,
        size: attachment.file_size || attachment.size,
        content: attachment.file_content || attachment.content
      }));

      // 调用实际的附件处理方法
      const processResult = await this.processLeaveAttachments(
        applicationId,
        formattedAttachments
      );

      if (!isSuccessResult(processResult)) {
        throw new Error('附件处理失败');
      }

      this.logger.info(
        {
          applicationId,
          uploadedCount: processResult.data.uploadedCount,
          totalSize: processResult.data.totalSize,
          errors: processResult.data.errors?.length || 0
        },
        'Leave application attachments processed'
      );

      return processResult.data.attachmentIds;
    }, ServiceErrorCode.DATABASE_ERROR);
  }
}
