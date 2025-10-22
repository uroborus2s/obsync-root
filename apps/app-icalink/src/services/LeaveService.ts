import type { Logger, ServiceError } from '@stratix/core';
import {
  isLeft,
  isNone,
  isSome,
  eitherLeft as left,
  eitherRight as right,
  type Either,
  type Maybe
} from '@stratix/utils/functional';
import AttendanceCourseRepository from '../repositories/AttendanceCourseRepository.js';
import AttendanceRecordRepository from '../repositories/AttendanceRecordRepository.js';
import LeaveApplicationRepository from '../repositories/LeaveApplicationRepository.js';
import LeaveApprovalRepository from '../repositories/LeaveApprovalRepository.js';
import LeaveAttachmentRepository from '../repositories/LeaveAttachmentRepository.js';
import StudentRepository from '../repositories/StudentRepository.js';
import type {
  ApprovalRequest,
  ApprovalResponse,
  LeaveApplicationRequest,
  LeaveApplicationResponse,
  QueryStudentLeaveApplicationsDTO,
  QueryStudentLeaveApplicationsVO,
  QueryTeacherLeaveApplicationsDTO,
  QueryTeacherLeaveApplicationsVO,
  StudentLeaveApplicationItemVO,
  StudentLeaveApplicationStatsVO,
  TeacherLeaveApplicationItemVO,
  TeacherLeaveApplicationStatsVO,
  UserInfo,
  WithdrawResponse
} from '../types/api.js';
import {
  ApprovalResult,
  AttendanceStatus,
  type IcalinkAttendanceRecord,
  type IcalinkLeaveApplication,
  type IcasyncAttendanceCourse,
  type LeaveStatus
} from '../types/database.js';
import { ServiceErrorCode } from '../types/service.js';
import { formatDateTime, getCurrentDateTime } from '../utils/datetime.js';
import type OsspStorageService from './OsspStorageService.js';

export default class LeaveService {
  constructor(
    private readonly leaveApplicationRepository: LeaveApplicationRepository,
    private readonly leaveApprovalRepository: LeaveApprovalRepository,
    private readonly leaveAttachmentRepository: LeaveAttachmentRepository,
    private readonly attendanceRecordRepository: AttendanceRecordRepository,
    private readonly attendanceCourseRepository: AttendanceCourseRepository,
    private readonly studentRepository: StudentRepository,
    private readonly osspStorageService: OsspStorageService,
    private readonly logger: Logger
  ) {}

  public async submitLeaveApplication(
    studentInfo: UserInfo,
    request: LeaveApplicationRequest
  ): Promise<Either<ServiceError, LeaveApplicationResponse>> {
    this.logger.info(
      { studentId: studentInfo.userId },
      'Submitting leave application'
    );
    try {
      // 1. 根据 attendance_record_id 查找或创建考勤记录
      const recordId = parseInt(request.attendance_record_id, 10);
      let recordMaybe = (await this.attendanceRecordRepository.findOne((qb) =>
        qb.where('id', '=', recordId)
      )) as unknown as Maybe<IcalinkAttendanceRecord>;

      let record: IcalinkAttendanceRecord;
      let course: IcasyncAttendanceCourse;

      if (isNone(recordMaybe)) {
        // 考勤记录不存在，可能是学生还没签到
        // 尝试通过 course_id 查找课程，然后创建考勤记录
        this.logger.info(
          { recordId, studentId: studentInfo.userId },
          'Attendance record not found, attempting to create one'
        );

        // 尝试将 attendance_record_id 作为 course_id 来查找课程
        const courseMaybe = (await this.attendanceCourseRepository.findOne(
          (qb) => qb.where('id', '=', recordId)
        )) as unknown as Maybe<IcasyncAttendanceCourse>;

        if (isNone(courseMaybe)) {
          return left({
            code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
            message: '课程不存在，无法提交请假申请'
          });
        }

        course = courseMaybe.value;

        // 先检查是否已存在该学生的考勤记录（避免唯一约束冲突）
        const existingRecordMaybe =
          (await this.attendanceRecordRepository.findOne((qb) =>
            qb
              .where('attendance_course_id', '=', course.id)
              .where('student_id', '=', studentInfo.userId)
          )) as unknown as Maybe<IcalinkAttendanceRecord>;

        if (isSome(existingRecordMaybe)) {
          // 已存在考勤记录，直接使用
          record = existingRecordMaybe.value;
          this.logger.info(
            { recordId: record.id, studentId: studentInfo.userId },
            'Found existing attendance record for leave application'
          );
        } else {
          // 查询学生信息以获取班级和专业
          const studentMaybe = await this.studentRepository.findOne((qb) =>
            qb.where('xh', '=', studentInfo.userId)
          );

          const studentData =
            studentMaybe && isSome(studentMaybe) ? studentMaybe.value : null;

          // 创建考勤记录
          const newRecordResult = await this.attendanceRecordRepository.create({
            attendance_course_id: course.id,
            student_id: studentInfo.userId,
            student_name: studentInfo.name,
            class_name: studentData?.bjmc || '',
            major_name: studentData?.zymc || '',
            status: 'leave_pending' as AttendanceStatus,
            created_by: studentInfo.userId
          } as any);

          if (isLeft(newRecordResult)) {
            return left({
              code: String(ServiceErrorCode.INTERNAL_ERROR),
              message: '创建考勤记录失败',
              details: newRecordResult.left
            });
          }

          record = newRecordResult.right as unknown as IcalinkAttendanceRecord;
          this.logger.info(
            { recordId: record.id, studentId: studentInfo.userId },
            'Created new attendance record for leave application'
          );
        }
      } else {
        record = recordMaybe.value;

        // 2. 查找课程信息
        const courseMaybe = (await this.attendanceCourseRepository.findOne(
          (qb) => qb.where('id', '=', record.attendance_course_id)
        )) as unknown as Maybe<IcasyncAttendanceCourse>;

        if (isNone(courseMaybe)) {
          return left({
            code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
            message: '课程不存在'
          });
        }

        course = courseMaybe.value;
      }

      // 3. 创建请假申请
      const teacherCodes = course.teacher_codes?.split(',') || [];
      const teacherNames = course.teacher_names?.split(',') || [];

      const applicationResult = await this.leaveApplicationRepository.create({
        attendance_record_id: record.id,
        student_id: studentInfo.userId,
        student_name: studentInfo.name,
        course_id: course.course_code,
        course_name: course.course_name,
        teacher_id: teacherCodes[0] || '',
        teacher_name: teacherNames[0] || '',
        leave_type: request.leave_type,
        leave_reason: request.leave_reason,
        status: 'leave_pending' as LeaveStatus,
        application_time: getCurrentDateTime()
      } as any);

      if (isLeft(applicationResult)) {
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '创建请假申请失败',
          details: applicationResult.left
        });
      }

      const application = applicationResult.right;

      // 4. 创建审批记录
      const approvalResult = await this.leaveApprovalRepository.create({
        leave_application_id: application.id,
        approver_id: teacherCodes[0] || '',
        approver_name: teacherNames[0] || '',
        approval_result: 'pending' as ApprovalResult,
        approval_order: 1,
        is_final_approver: true
      } as any);

      if (isLeft(approvalResult)) {
        this.logger.warn(
          { applicationId: application.id },
          'Failed to create approval record, but application was created'
        );
      }

      // 5. 处理附件上传（如果有）
      let uploadedCount = 0;
      if (request.images && request.images.length > 0) {
        const attachmentResult = await this.processLeaveAttachments(
          application.id,
          request.images
        );

        if (isLeft(attachmentResult)) {
          this.logger.warn(
            { applicationId: application.id, error: attachmentResult.left },
            'Failed to process attachments, but application was created'
          );
        } else {
          uploadedCount = attachmentResult.right.uploadedCount;
          this.logger.info(
            {
              applicationId: application.id,
              uploadedCount,
              totalSize: attachmentResult.right.totalSize
            },
            'Attachments processed successfully'
          );
        }
      }

      // 6. 返回完整的响应
      return right({
        application_id: application.id,
        attendance_record_id: record.id,
        student_id: studentInfo.userId,
        student_name: studentInfo.name,
        course_name: course.course_name,
        teacher_name: teacherNames[0] || '',
        leave_type: request.leave_type,
        leave_reason: request.leave_reason,
        status: application.status,
        application_time: application.application_time.toISOString(),
        uploaded_images: uploadedCount
      });
    } catch (error) {
      this.logger.error(error, 'Failed to submit leave application');
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '提交请假申请失败'
      });
    }
  }

  public async withdrawLeaveApplication(
    applicationId: number,
    studentInfo: UserInfo
  ): Promise<Either<ServiceError, WithdrawResponse>> {
    this.logger.info(
      { applicationId, studentId: studentInfo.userId },
      'Withdrawing leave application'
    );
    try {
      const appMaybe = (await this.leaveApplicationRepository.findOne((qb) =>
        qb.where('id', '=', applicationId)
      )) as unknown as Maybe<IcalinkLeaveApplication>;
      if (isNone(appMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '请假申请不存在'
        });
      }
      const application = appMaybe.value;
      if (application.student_id !== studentInfo.userId) {
        return left({
          code: String(ServiceErrorCode.PERMISSION_DENIED),
          message: '无权撤回此请假申请'
        });
      }
      if (application.status !== 'leave_pending') {
        return left({
          code: String(ServiceErrorCode.INVALID_OPERATION),
          message: '只能撤回待审批的请假申请'
        });
      }

      const previousStatus = application.status;

      const updateResult = await this.leaveApplicationRepository.update(
        applicationId,
        { status: 'withdrawn' as LeaveStatus } as any
      );
      if (isLeft(updateResult)) {
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '撤回请假申请失败',
          details: updateResult.left
        });
      }

      return right({
        application_id: applicationId,
        student_id: application.student_id,
        student_name: application.student_name,
        course_name: application.course_name,
        previous_status: previousStatus,
        new_status: 'withdrawn' as LeaveStatus,
        withdraw_time: getCurrentDateTime().toISOString()
      });
    } catch (error) {
      this.logger.error(error, 'Failed to withdraw leave application');
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '撤回请假申请失败'
      });
    }
  }

  public async approveLeaveApplication(
    approvalId: number,
    teacherInfo: UserInfo,
    request: ApprovalRequest
  ): Promise<Either<ServiceError, ApprovalResponse>> {
    this.logger.info(
      { approvalId, teacherId: teacherInfo.userId, result: request.result },
      'Approving leave application'
    );
    try {
      // 1. 查找审批记录
      const approvalMaybe = (await this.leaveApprovalRepository.findOne((qb) =>
        qb.where('id', '=', approvalId)
      )) as unknown as Maybe<any>;

      if (isNone(approvalMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '审批记录不存在'
        });
      }

      const approval = approvalMaybe.value;

      // 2. 验证审批记录状态
      if (approval.approval_result !== 'pending') {
        return left({
          code: String(ServiceErrorCode.INVALID_OPERATION),
          message: '该审批记录已处理，不能重复审批'
        });
      }

      // 3. 验证审批人权限
      if (approval.approver_id !== teacherInfo.userId) {
        return left({
          code: String(ServiceErrorCode.PERMISSION_DENIED),
          message: '无权审批此请假申请'
        });
      }

      // 4. 查找请假申请
      const applicationId = approval.leave_application_id;
      const appMaybe = (await this.leaveApplicationRepository.findOne((qb) =>
        qb.where('id', '=', applicationId)
      )) as unknown as Maybe<IcalinkLeaveApplication>;

      if (isNone(appMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '请假申请不存在'
        });
      }

      const application = appMaybe.value;

      if (application.status !== 'leave_pending') {
        return left({
          code: String(ServiceErrorCode.INVALID_OPERATION),
          message: '只能审批待审批的请假申请'
        });
      }

      const approvalTime = getCurrentDateTime();

      // 5. 更新审批记录
      const approvalUpdateResult = await this.leaveApprovalRepository.update(
        approvalId,
        {
          approval_result: request.result as ApprovalResult,
          approval_comment: request.comment || '',
          approval_time: approvalTime
        } as any
      );

      if (isLeft(approvalUpdateResult)) {
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '更新审批记录失败',
          details: approvalUpdateResult.left
        });
      }

      // 6. 更新请假申请状态
      const newStatus =
        request.result === 'approved'
          ? ('leave' as LeaveStatus)
          : ('leave_rejected' as LeaveStatus);

      const updateResult = await this.leaveApplicationRepository.update(
        applicationId,
        {
          status: newStatus,
          approval_time: approvalTime,
          approval_comment: request.comment || ''
        } as any
      );

      if (isLeft(updateResult)) {
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '更新请假申请状态失败',
          details: updateResult.left
        });
      }

      // 7. 更新考勤记录状态
      const newAttendanceStatus =
        request.result === 'approved'
          ? AttendanceStatus.LEAVE
          : AttendanceStatus.ABSENT;

      if (request.result === 'approved') {
        const recordUpdateResult = await this.attendanceRecordRepository.update(
          application.attendance_record_id,
          { status: newAttendanceStatus } as any
        );

        if (isLeft(recordUpdateResult)) {
          this.logger.warn(
            { recordId: application.attendance_record_id },
            'Failed to update attendance record status'
          );
        }
      }

      // 8. 返回审批结果
      return right({
        application_id: applicationId,
        approval_id: approvalId,
        student_id: application.student_id,
        student_name: application.student_name,
        teacher_id: teacherInfo.userId,
        teacher_name: teacherInfo.name,
        approval_result: request.result,
        approval_time: approvalTime.toISOString(),
        approval_comment: request.comment,
        new_attendance_status: newAttendanceStatus,
        course_info: {
          course_name: application.course_name
        }
      });
    } catch (error) {
      this.logger.error(error, 'Failed to approve leave application');
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '审批请假申请失败'
      });
    }
  }

  /**
   * 处理请假申请附件上传
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
    Either<
      ServiceError,
      {
        uploadedCount: number;
        totalSize: number;
        attachmentIds: number[];
        errors?: Array<{
          fileName: string;
          error: string;
        }>;
      }
    >
  > {
    try {
      const errors: Array<{ fileName: string; error: string }> = [];
      let totalSize = 0;
      const attachmentIds: number[] = [];
      const bucketName = 'leave-attachments';

      this.logger.info(
        { applicationId, imageCount: images.length },
        'Processing leave attachments with OSS storage'
      );

      // 逐一处理每个文件
      for (const image of images) {
        try {
          // 1. 验证文件
          if (!image.type.startsWith('image/')) {
            throw new Error('只支持图片文件');
          }
          const fileContent = Buffer.from(image.content, 'base64');
          const extension = image.name.split('.').pop() || 'jpg';
          totalSize += fileContent.length;

          // 2. 创建数据库记录（不保存图片内容）
          const createResult = await this.leaveAttachmentRepository.create({
            leave_application_id: applicationId,
            image_name: image.name,
            image_type: image.type as any,
            image_size: fileContent.length,
            image_extension: extension,
            upload_time: getCurrentDateTime(),
            metadata: {
              storage_type: 'oss',
              original_filename: image.name,
              created_at: new Date().toISOString()
            } as any
          } as any);

          if (isLeft(createResult)) {
            throw new Error('创建附件数据库记录失败');
          }

          // 3. 获取新创建的附件ID
          let attachmentId: number = 0;
          const data = createResult.right as any;
          if (typeof data === 'number') {
            attachmentId = data;
          } else if (typeof data === 'object') {
            attachmentId =
              data.id ||
              data.insertId ||
              data.value?.id ||
              data.value?.insertId ||
              0;
          }

          if (attachmentId === 0) {
            this.logger.error({ createResult }, 'Failed to get attachmentId');
            throw new Error('创建附件记录后无法获取ID');
          }

          // 4. 上传到 OSS
          const uploadResult = await this.osspStorageService.uploadImage(
            bucketName,
            fileContent,
            {
              fileName: image.name,
              mimeType: image.type,
              extension: extension,
              generateThumbnail: true,
              metadata: {
                'application-id': String(applicationId),
                'attachment-id': String(attachmentId)
              }
            }
          );

          if (isLeft(uploadResult)) {
            throw new Error(uploadResult.left.message || 'OSS 上传失败');
          }

          // 5. 更新数据库记录，保存 OSS 信息到 metadata
          const ossMetadata = {
            storage_type: 'oss',
            original_filename: image.name,
            created_at: new Date().toISOString(),
            oss: {
              bucket_name: bucketName,
              object_path: uploadResult.right.objectPath,
              thumbnail_path: uploadResult.right.thumbnailPath,
              etag: uploadResult.right.etag,
              version_id: uploadResult.right.versionId,
              uploaded_at: new Date().toISOString()
            }
          };

          await this.leaveAttachmentRepository.update(attachmentId, {
            metadata: ossMetadata as any
          } as any);

          attachmentIds.push(attachmentId);

          this.logger.info(
            {
              fileName: image.name,
              attachmentId,
              size: fileContent.length,
              objectPath: uploadResult.right.objectPath
            },
            'Attachment processed successfully'
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : '未知错误';
          errors.push({
            fileName: image.name,
            error: errorMessage
          });
          this.logger.error(
            { fileName: image.name, error: errorMessage },
            'Failed to process an attachment'
          );
        }
      }

      this.logger.info(
        {
          applicationId,
          uploadedCount: attachmentIds.length,
          failedCount: errors.length,
          totalSize
        },
        'Leave attachments processing completed'
      );

      return right({
        uploadedCount: attachmentIds.length,
        totalSize,
        attachmentIds,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      this.logger.error(
        { error, applicationId },
        'Failed to process attachments'
      );
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '处理附件失败'
      });
    }
  }

  /**
   * 通过附件 ID 下载附件
   */
  async downloadAttachmentById(
    attachmentId: number,
    userInfo: UserInfo,
    thumbnail?: boolean
  ): Promise<
    Either<
      ServiceError,
      {
        fileName: string;
        fileContent: Buffer;
        mimeType: string;
        fileSize: number;
      }
    >
  > {
    try {
      this.logger.info(
        { attachmentId, thumbnail },
        'Downloading attachment by ID'
      );

      // 1. 获取附件记录
      const attachmentMaybe = (await this.leaveAttachmentRepository.findOne(
        (qb) => qb.where('id', '=', attachmentId)
      )) as unknown as Maybe<any>;

      if (isNone(attachmentMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '附件不存在或已被删除'
        });
      }

      const record = attachmentMaybe.value;

      // 2. 验证权限（暂时跳过）
      this.logger.debug({ userInfo }, 'User permission check for download');

      // 3. 从 metadata 读取存储信息
      const metadata = record.metadata || {};
      const storageType = metadata.storage_type || 'database';
      const ossInfo = metadata.oss;

      // 4. 如果是 OSS 存储且有 OSS 信息，从 OSS 下载
      if (storageType === 'oss' && ossInfo) {
        const ossObjectPath = thumbnail
          ? ossInfo.thumbnail_path
          : ossInfo.object_path;

        if (!ossObjectPath) {
          this.logger.warn(
            { attachmentId, thumbnail },
            'OSS path not found, falling back to database'
          );
          return this.downloadFromDatabase(record, thumbnail);
        }

        this.logger.info(
          { attachmentId, storageType, ossObjectPath },
          'Downloading from OSS'
        );

        const bucketName = ossInfo.bucket_name || 'leave-attachments';

        // 从 OSS 下载
        const downloadResult = await this.osspStorageService.downloadImage(
          bucketName,
          ossObjectPath
        );

        if (isLeft(downloadResult)) {
          // OSS 下载失败，降级到数据库
          this.logger.warn(
            { attachmentId, error: downloadResult.left.message },
            'OSS download failed, falling back to database'
          );
          return this.downloadFromDatabase(record, thumbnail);
        }

        return right({
          fileName: downloadResult.right.fileName,
          fileContent: downloadResult.right.fileContent,
          mimeType: downloadResult.right.mimeType,
          fileSize: downloadResult.right.fileSize
        });
      }

      // 5. 从数据库下载
      this.logger.info(
        { attachmentId, storageType },
        'Downloading from database'
      );
      return this.downloadFromDatabase(record, thumbnail);
    } catch (error) {
      this.logger.error(
        { error, attachmentId },
        'Failed to download attachment'
      );
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '下载附件失败'
      });
    }
  }

  /**
   * 从数据库下载附件（兼容旧数据）
   */
  private downloadFromDatabase(
    record: any,
    thumbnail?: boolean
  ): Either<
    ServiceError,
    {
      fileName: string;
      fileContent: Buffer;
      mimeType: string;
      fileSize: number;
    }
  > {
    const imageContent = thumbnail
      ? record.thumbnail_content
      : record.image_content;

    if (!imageContent || imageContent.length === 0) {
      return left({
        code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
        message: '附件内容不存在'
      });
    }

    return right({
      fileName: record.image_name,
      fileContent: imageContent,
      mimeType: record.image_type,
      fileSize: imageContent.length
    });
  }

  /**
   * 学生查询请假申请列表
   */
  async queryLeaveApplications(
    dto: QueryStudentLeaveApplicationsDTO
  ): Promise<Either<ServiceError, QueryStudentLeaveApplicationsVO>> {
    this.logger.debug({ dto }, 'Querying student leave applications');

    const {
      studentId,
      status,
      page = 1,
      page_size = 10,
      start_date,
      end_date
    } = dto;

    // 1. 参数验证
    if (!studentId || studentId.trim() === '') {
      return left({
        code: String(ServiceErrorCode.VALIDATION_FAILED),
        message: '学生ID不能为空'
      });
    }

    if (page < 1) {
      return left({
        code: String(ServiceErrorCode.VALIDATION_FAILED),
        message: '页码必须大于0'
      });
    }

    if (page_size < 1 || page_size > 100) {
      return left({
        code: String(ServiceErrorCode.VALIDATION_FAILED),
        message: '每页数量必须在1-100之间'
      });
    }

    try {
      // 2. 构建查询条件
      const applications = (await this.leaveApplicationRepository.findMany(
        (qb) => {
          let query = qb.where('student_id', '=', studentId);

          // 状态过滤
          if (status && status !== 'all') {
            query = query.where('status', '=', status);
          }

          // 日期范围过滤
          if (start_date) {
            query = query.where('application_time', '>=', new Date(start_date));
          }
          if (end_date) {
            query = query.where('application_time', '<=', new Date(end_date));
          }

          // 排序：最新的在前
          query = query.orderBy('application_time', 'desc');

          // 分页
          const offset = (page - 1) * page_size;
          query = query.limit(page_size).offset(offset);

          return query;
        }
      )) as unknown as any[];

      // 3. 获取附件数量
      const applicationIds = applications.map((app) => app.id);
      const attachmentCounts: Record<number, number> = {};

      if (applicationIds.length > 0) {
        const attachments = (await this.leaveAttachmentRepository.findMany(
          (qb) => qb.where('leave_application_id', 'in', applicationIds)
        )) as unknown as any[];

        attachments.forEach((att: any) => {
          const appId = att.leave_application_id;
          attachmentCounts[appId] = (attachmentCounts[appId] || 0) + 1;
        });
      }

      // 4. 获取课程详细信息并构建 VO
      const items: StudentLeaveApplicationItemVO[] = await Promise.all(
        applications.map(async (app: any) => {
          // 查找课程详细信息
          const courseMaybe = (await this.attendanceCourseRepository.findOne(
            (qb) => qb.where('course_code', '=', app.course_id)
          )) as unknown as Maybe<IcasyncAttendanceCourse>;

          const course = isNone(courseMaybe) ? null : courseMaybe.value;

          const attachmentCount = attachmentCounts[app.id] || 0;

          return {
            // 基本请假申请信息
            id: app.id,
            student_id: app.student_id,
            student_name: app.student_name,
            course_id: app.course_id,
            course_name: app.course_name,
            teacher_id: app.teacher_id,
            teacher_name: app.teacher_name,
            leave_type: app.leave_type,
            leave_reason: app.leave_reason,
            status: app.status,
            application_time: formatDateTime(app.application_time),
            approval_time: app.approval_time
              ? formatDateTime(app.approval_time)
              : undefined,
            approval_comment: app.approval_comment || undefined,
            created_at: formatDateTime(app.created_at),
            updated_at: formatDateTime(app.updated_at),

            // 课程详细信息
            course_detail_id: course?.id,
            semester: course?.semester,
            teaching_week: course?.teaching_week,
            week_day: course?.week_day,
            teacher_codes: course?.teacher_codes || undefined,
            teacher_names: course?.teacher_names || undefined,
            class_location: course?.class_location || undefined,
            start_time: course?.start_time
              ? formatDateTime(course.start_time)
              : undefined,
            end_time: course?.end_time
              ? formatDateTime(course.end_time)
              : undefined,
            periods: course?.periods || undefined,
            time_period: course?.time_period || undefined,

            // 附件信息
            attachment_count: attachmentCount,
            has_attachments: attachmentCount > 0
          };
        })
      );

      // 5. 计算统计信息
      const allApplications = (await this.leaveApplicationRepository.findMany(
        (qb) => {
          let query = qb.where('student_id', '=', studentId);

          // 日期范围过滤（统计也要应用相同的日期过滤）
          if (start_date) {
            query = query.where('application_time', '>=', new Date(start_date));
          }
          if (end_date) {
            query = query.where('application_time', '<=', new Date(end_date));
          }

          return query;
        }
      )) as unknown as any[];

      const stats: StudentLeaveApplicationStatsVO = {
        total_count: allApplications.length,
        leave_pending_count: allApplications.filter(
          (app) => app.status === 'leave_pending'
        ).length,
        leave_count: allApplications.filter((app) => app.status === 'leave')
          .length,
        leave_rejected_count: allApplications.filter(
          (app) => app.status === 'leave_rejected'
        ).length
      };

      // 6. 计算总数（用于分页）
      const total =
        status && status !== 'all'
          ? allApplications.filter((app) => app.status === status).length
          : allApplications.length;

      this.logger.info(
        { studentId, status, page, page_size, total, itemCount: items.length },
        'Successfully queried student leave applications'
      );

      return right({
        data: items,
        stats,
        page,
        page_size,
        total
      });
    } catch (error) {
      this.logger.error(
        { error, studentId, status },
        'Failed to query student leave applications'
      );

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: error instanceof Error ? error.message : '查询请假申请失败'
      });
    }
  }

  /**
   * 教师查询请假申请列表
   */
  async queryTeacherLeaveApplications(
    dto: QueryTeacherLeaveApplicationsDTO
  ): Promise<Either<ServiceError, QueryTeacherLeaveApplicationsVO>> {
    this.logger.debug({ dto }, 'Querying teacher leave applications');

    const {
      teacherId,
      status,
      page = 1,
      page_size = 10,
      start_date,
      end_date
    } = dto;

    // 1. 参数验证
    if (!teacherId || teacherId.trim() === '') {
      return left({
        code: String(ServiceErrorCode.VALIDATION_ERROR),
        message: '教师ID不能为空'
      });
    }

    if (page < 1) {
      return left({
        code: String(ServiceErrorCode.VALIDATION_ERROR),
        message: '页码必须大于0'
      });
    }

    if (page_size < 1 || page_size > 100) {
      return left({
        code: String(ServiceErrorCode.VALIDATION_ERROR),
        message: '每页大小必须在1-100之间'
      });
    }

    try {
      // 2. 查找教师授课的所有课程
      const courses = await this.attendanceCourseRepository.findByTeacherCode(
        teacherId,
        '' // 不限制学期，查询所有学期
      );

      if (courses.length === 0) {
        // 教师没有授课课程，返回空列表
        return right({
          applications: [],
          total: 0,
          page,
          page_size,
          stats: {
            pending_count: 0,
            processed_count: 0,
            approved_count: 0,
            rejected_count: 0,
            cancelled_count: 0,
            total_count: 0
          }
        });
      }

      // 3. 提取课程ID列表
      const courseIds = courses.map((c) => c.external_id);

      // 4. 构建查询条件
      const db = await (
        this.leaveApplicationRepository as any
      ).getQueryConnection();
      let query = db
        .selectFrom('icalink_leave_applications as la')
        .innerJoin(
          'icalink_leave_approvals as lap',
          'la.id',
          'lap.leave_application_id'
        )
        .where('la.course_id', 'in', courseIds)
        .where('la.deleted_at', 'is', null);

      // 5. 状态筛选
      if (status && status !== 'all') {
        const statusArray = Array.isArray(status)
          ? status
          : status.split(',').map((s) => s.trim());

        if (statusArray.length > 0) {
          query = query.where('lap.approval_result', 'in', statusArray);
        }
      }

      // 6. 日期范围筛选
      if (start_date) {
        query = query.where('la.application_time', '>=', start_date);
      }
      if (end_date) {
        query = query.where('la.application_time', '<=', end_date);
      }

      // 7. 查询总数
      const countResult = await query
        .select(({ fn }: any) => fn.countAll().as('count'))
        .executeTakeFirst();

      const total = Number((countResult as any)?.count || 0);

      if (total === 0) {
        return right({
          applications: [],
          total: 0,
          page,
          page_size,
          stats: {
            pending_count: 0,
            processed_count: 0,
            approved_count: 0,
            rejected_count: 0,
            cancelled_count: 0,
            total_count: 0
          }
        });
      }

      // 8. 分页查询
      const offset = (page - 1) * page_size;
      const applications = await query
        .selectAll('la')
        .select([
          'lap.id as approval_record_id',
          'lap.approval_id',
          'lap.approval_result',
          'lap.approval_comment',
          'lap.approval_time'
        ])
        .orderBy('la.application_time', 'desc')
        .limit(page_size)
        .offset(offset)
        .execute();

      // 9. 查询附件数量
      const applicationIds = applications.map((app: any) => app.id);
      const attachmentCounts: Record<number, number> = {};

      if (applicationIds.length > 0) {
        const attachmentCountResults = await db
          .selectFrom('icalink_leave_attachments')
          .select([
            'leave_application_id',
            ({ fn }: any) => fn.countAll().as('count')
          ])
          .where('leave_application_id', 'in', applicationIds)
          .where('deleted_at', 'is', null)
          .groupBy('leave_application_id')
          .execute();

        attachmentCountResults.forEach((row: any) => {
          attachmentCounts[row.leave_application_id] = Number(row.count);
        });
      }

      // 10. 查询课程详细信息
      const courseMap = new Map(courses.map((c) => [c.external_id, c]));

      // 11. 构建响应数据
      const items: TeacherLeaveApplicationItemVO[] = applications.map(
        (app: any) => {
          const course = courseMap.get(app.course_id);
          const attachmentCount = attachmentCounts[app.id] || 0;

          // 提取教师信息
          const teacherCodes = course?.teacher_codes?.split(',') || [];
          const teacherNames = course?.teacher_names?.split(',') || [];
          const teacherIndex = teacherCodes.indexOf(teacherId);
          const teacherName =
            teacherIndex >= 0 ? teacherNames[teacherIndex] : app.teacher_name;

          return {
            // 基本请假申请信息
            id: app.id,
            approval_id: app.approval_id,
            student_id: app.student_id,
            student_name: app.student_name,
            course_id: app.course_id,
            course_name: app.course_name,
            teacher_name: teacherName,
            leave_type: app.leave_type,
            leave_reason: app.leave_reason,
            status: app.status,
            approval_comment: app.approval_comment || undefined,
            approval_time: app.approval_time
              ? formatDateTime(app.approval_time)
              : undefined,
            application_time: formatDateTime(app.application_time),
            approval_result: app.approval_result,
            approval_record_id: app.approval_record_id,

            // 课程详细信息
            start_time: course ? formatDateTime(course.start_time) : undefined,
            end_time: course ? formatDateTime(course.end_time) : undefined,
            teaching_week: course?.teaching_week || undefined,
            periods: course?.periods || undefined,
            leave_date: course ? formatDateTime(course.start_time) : undefined,

            // 教师信息
            teacher_info: {
              teacher_id: teacherId,
              teacher_name: teacherName,
              teacher_department: undefined // 可以从教师信息表获取
            },

            // 附件信息
            attachment_count: attachmentCount
          };
        }
      );

      // 12. 计算统计信息
      const statsQuery = await db
        .selectFrom('icalink_leave_applications as la')
        .innerJoin(
          'icalink_leave_approvals as lap',
          'la.id',
          'lap.leave_application_id'
        )
        .where('la.course_id', 'in', courseIds)
        .where('la.deleted_at', 'is', null)
        .select([
          'lap.approval_result',
          ({ fn }: any) => fn.countAll().as('count')
        ])
        .groupBy('lap.approval_result')
        .execute();

      const stats: TeacherLeaveApplicationStatsVO = {
        pending_count: 0,
        processed_count: 0,
        approved_count: 0,
        rejected_count: 0,
        cancelled_count: 0,
        total_count: total
      };

      statsQuery.forEach((row: any) => {
        const count = Number(row.count);
        switch (row.approval_result) {
          case 'pending':
            stats.pending_count = count;
            break;
          case 'approved':
            stats.approved_count = count;
            stats.processed_count += count;
            break;
          case 'rejected':
            stats.rejected_count = count;
            stats.processed_count += count;
            break;
          case 'cancelled':
            stats.cancelled_count = count;
            break;
        }
      });

      // 13. 返回结果
      const vo: QueryTeacherLeaveApplicationsVO = {
        applications: items,
        total,
        page,
        page_size,
        stats
      };

      return right(vo);
    } catch (error) {
      this.logger.error(
        { error, teacherId, status },
        'Failed to query teacher leave applications'
      );

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: error instanceof Error ? error.message : '查询教师请假申请失败'
      });
    }
  }
}
