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
import type {
  LeaveApplicationRequest,
  LeaveApplicationResponse,
  QueryStudentLeaveApplicationsDTO,
  QueryStudentLeaveApplicationsVO,
  StudentLeaveApplicationItemVO,
  StudentLeaveApplicationStatsVO,
  UserInfo,
  WithdrawResponse
} from '../types/api.js';
import {
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
    private readonly osspStorageService: OsspStorageService,
    private readonly logger: Logger
  ) {}

  public async submitLeaveApplication(
    studentInfo: UserInfo,
    request: LeaveApplicationRequest
  ): Promise<Either<ServiceError, LeaveApplicationResponse>> {
    this.logger.info(
      { studentId: request.student_id },
      'Submitting leave application'
    );
    try {
      // 1. 将 course_id 参数作为课程 ID 来查找课程
      const courseId = parseInt(request.course_id, 10);
      const courseMaybe = (await this.attendanceCourseRepository.findOne((qb) =>
        qb.where('id', '=', courseId)
      )) as unknown as Maybe<IcasyncAttendanceCourse>;

      if (isNone(courseMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '课程不存在，无法提交请假申请'
        });
      }

      const course = courseMaybe.value;

      // 2. 检查是否已存在请假记录（一节课只能有一次请假）
      const existingRecordMaybe =
        (await this.attendanceRecordRepository.findOne((qb) =>
          qb
            .where('attendance_course_id', '=', course.id)
            .where('student_id', '=', request.student_id)
            .where('status', 'in', ['leave_pending', 'leave'])
        )) as unknown as Maybe<IcalinkAttendanceRecord>;

      if (isSome(existingRecordMaybe)) {
        return left({
          code: String(ServiceErrorCode.INVALID_OPERATION),
          message: '该课程已有请假记录，不能重复请假'
        });
      }

      // 5. 解析教师列表
      const teacherCodes =
        course.teacher_codes
          ?.split(',')
          .map((t) => t.trim())
          .filter((t) => t) || [];
      const teacherNames =
        course.teacher_names
          ?.split(',')
          .map((t) => t.trim())
          .filter((t) => t) || [];

      // 确保至少有一位教师
      if (teacherCodes.length === 0) {
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: '课程没有授课教师，无法提交请假申请'
        });
      }

      // 6. 验证附件数量和大小限制
      if (request.images && request.images.length > 10) {
        return left({
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: '附件数量不能超过10个'
        });
      }

      const currentTime = getCurrentDateTime();

      // 7. 使用事务创建所有记录
      // 注意：由于 BaseRepository 不直接支持事务，我们需要手动处理
      // 如果任何步骤失败，后续步骤不会执行，保证数据一致性

      // 7.1 创建考勤记录（状态为 leave_pending）
      const newRecordResult = await this.attendanceRecordRepository.create({
        attendance_course_id: course.id,
        student_id: request.student_id,
        student_name: request.student_name,
        class_name: request.class_name,
        major_name: request.major_name,
        status: 'leave_pending' as AttendanceStatus,
        last_checkin_reason: request.leave_reason,
        created_by: request.student_id
      } as any);

      if (isLeft(newRecordResult)) {
        // 检查是否是唯一约束冲突
        const error = newRecordResult.left;
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'ER_DUP_ENTRY'
        ) {
          return left({
            code: String(ServiceErrorCode.INVALID_OPERATION),
            message: '该课程已有考勤记录，不能重复请假'
          });
        }

        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '创建考勤记录失败',
          details: newRecordResult.left
        });
      }

      const record =
        newRecordResult.right as unknown as IcalinkAttendanceRecord;
      this.logger.info(
        {
          recordId: record.id,
          studentId: studentInfo.userId,
          courseId: course.id
        },
        'Created new attendance record for leave application'
      );

      // 7.2 创建请假申请记录
      const applicationResult = await this.leaveApplicationRepository.create({
        attendance_record_id: record.id,
        student_id: request.student_id,
        student_name: request.student_name,
        course_id: course.course_code,
        course_name: course.course_name,
        teacher_id: course.teacher_codes,
        teacher_name: course.teacher_names,
        leave_type: request.leave_type,
        leave_reason: request.leave_reason,
        status: 'leave_pending' as LeaveStatus,
        application_time: currentTime
      } as any);

      if (isLeft(applicationResult)) {
        // 如果创建请假申请失败，删除已创建的考勤记录（回滚）
        await this.attendanceRecordRepository.delete(record.id);
        this.logger.error(
          { recordId: record.id },
          'Rolled back attendance record due to application creation failure'
        );

        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '创建请假申请失败',
          details: applicationResult.left
        });
      }

      const application = applicationResult.right;

      // 7.3 批量创建审批记录
      const approvalPromises = teacherCodes.map((teacherCode, index) => {
        return this.leaveApprovalRepository.create({
          leave_application_id: application.id,
          approver_id: teacherCode,
          approver_name: teacherNames[index] || teacherCode,
          approval_result: 'pending' as any, // 空字符串表示待审批
          approval_comment: '',
          approval_time: null,
          approval_order: index + 1,
          is_final_approver: index === teacherCodes.length - 1
        } as any);
      });

      const approvalResults = await Promise.all(approvalPromises);

      // 检查是否有审批记录创建失败
      const failedApprovals = approvalResults.filter(isLeft);
      if (failedApprovals.length > 0) {
        // 如果有审批记录创建失败，回滚所有操作
        await this.leaveApplicationRepository.delete(application.id);
        await this.attendanceRecordRepository.delete(record.id);
        this.logger.error(
          {
            applicationId: application.id,
            recordId: record.id,
            failedCount: failedApprovals.length
          },
          'Rolled back all records due to approval creation failure'
        );

        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '创建审批记录失败'
        });
      }

      this.logger.info(
        {
          applicationId: application.id,
          teacherCount: teacherCodes.length,
          successCount: approvalResults.filter((r) => !isLeft(r)).length
        },
        'Created approval records for all teachers'
      );

      // 7.4 处理附件上传（如果有）
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
          // 附件上传失败不影响整体流程，只记录警告
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

      // 8. 返回完整的响应
      return right({
        application_id: application.id,
        attendance_record_id: record.id,
        student_id: request.student_id,
        student_name: request.student_name,
        course_name: course.course_name,
        teacher_name: teacherNames[0] || '',
        leave_type: request.leave_type,
        leave_reason: request.leave_reason,
        status: application.status,
        application_time: application.application_time.toISOString(),
        approval_count: teacherCodes.length,
        attachment_count: uploadedCount,
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

  /**
   * 撤回请假申请（旧版本，通过 application_id）
   * @deprecated 使用 withdrawLeaveApplicationByRecordId 代替
   */
  public async withdrawLeaveApplicationLegacy(
    applicationId: number,
    studentInfo: UserInfo
  ): Promise<Either<ServiceError, WithdrawResponse>> {
    this.logger.info(
      { applicationId, studentId: studentInfo.userId },
      'Withdrawing leave application (legacy)'
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

      // 放宽状态限制：允许撤回待审批和已批准的请假申请
      if (
        application.status !== 'leave_pending' &&
        application.status !== 'leave'
      ) {
        return left({
          code: String(ServiceErrorCode.INVALID_OPERATION),
          message: '只能撤回待审批或已批准的请假申请'
        });
      }

      const previousStatus = application.status;

      // 删除考勤记录（撤回请假直接删除记录）
      const deleteResult = await this.attendanceRecordRepository.delete(
        application.attendance_record_id
      );

      if (isLeft(deleteResult)) {
        this.logger.error(
          {
            recordId: application.attendance_record_id,
            error: deleteResult.left
          },
          'Failed to delete attendance record after withdraw'
        );
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '删除考勤记录失败',
          details: deleteResult.left
        });
      }

      this.logger.info(
        {
          recordId: application.attendance_record_id,
          applicationId,
          previousStatus
        },
        'Attendance record deleted after leave withdrawal'
      );

      return right({
        application_id: applicationId,
        student_id: application.student_id,
        student_name: application.student_name,
        course_name: application.course_name,
        previous_status: previousStatus,
        new_status: previousStatus, // 状态保持不变
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

  /**
   * 撤回请假申请（新版本，通过 attendance_record_id）
   *
   * @param attendanceRecordId - 考勤记录ID
   * @param studentInfo - 学生信息
   * @returns 撤回结果
   *
   * @remarks
   * - 直接通过考勤记录ID删除记录，无需查询请假申请表
   * - 验证记录归属：只能撤回自己的考勤记录
   * - 验证记录状态：只能撤回 leave 或 leave_pending 状态的记录
   * - 删除考勤记录后，相关的请假申请记录会通过数据库级联删除
   */
  public async withdrawLeaveApplicationByRecordId(
    attendanceRecordId: number,
    studentInfo: UserInfo
  ): Promise<Either<ServiceError, WithdrawResponse>> {
    this.logger.info(
      { attendanceRecordId, studentId: studentInfo.userId },
      'Withdrawing leave application by record ID'
    );

    try {
      // 1. 查找考勤记录
      const recordMaybe =
        await this.attendanceRecordRepository.findById(attendanceRecordId);

      if (isNone(recordMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '考勤记录不存在'
        });
      }

      const record = recordMaybe.value;

      // 2. 验证记录归属
      if (record.student_id !== studentInfo.userId) {
        return left({
          code: String(ServiceErrorCode.PERMISSION_DENIED),
          message: '无权撤回此考勤记录'
        });
      }

      // 3. 验证记录状态
      if (record.status !== 'leave' && record.status !== 'leave_pending') {
        return left({
          code: String(ServiceErrorCode.INVALID_OPERATION),
          message: '只能撤回请假状态的考勤记录'
        });
      }

      const previousStatus = record.status;

      // 4. 删除考勤记录
      const deleteResult =
        await this.attendanceRecordRepository.delete(attendanceRecordId);

      if (isLeft(deleteResult)) {
        this.logger.error(
          {
            recordId: attendanceRecordId,
            error: deleteResult.left
          },
          'Failed to delete attendance record'
        );
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: '删除考勤记录失败',
          details: deleteResult.left
        });
      }

      this.logger.info(
        {
          recordId: attendanceRecordId,
          studentId: studentInfo.userId,
          previousStatus
        },
        'Attendance record deleted successfully'
      );

      // 5. 返回成功响应
      return right({
        attendance_record_id: attendanceRecordId,
        student_id: record.student_id,
        student_name: studentInfo.name,
        course_name: '', // 考勤记录中没有课程名称，可以从课程表查询
        previous_status: previousStatus,
        new_status: 'unstarted', // 撤回后状态变为未开始
        withdraw_time: getCurrentDateTime().toISOString()
      });
    } catch (error) {
      this.logger.error(
        error,
        'Failed to withdraw leave application by record ID'
      );
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '撤回请假申请失败'
      });
    }
  }

  public async approveLeaveApplication(
    attendanceRecordId: number,
    action: 'approve' | 'reject',
    comment?: string
  ): Promise<Either<ServiceError, { message: string }>> {
    this.logger.info(
      { attendanceRecordId, action, comment },
      'Processing leave approval'
    );

    try {
      // 1. 查找考勤记录
      const recordMaybe = (await this.attendanceRecordRepository.findOne((qb) =>
        qb.where('id', '=', attendanceRecordId)
      )) as unknown as Maybe<any>;

      if (isNone(recordMaybe)) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: '考勤记录不存在'
        });
      }

      // 2. 根据审批结果处理考勤记录
      if (action === 'approve') {
        // 审批通过：更新考勤记录状态为 leave
        const updateResult = await this.attendanceRecordRepository.update(
          attendanceRecordId,
          { status: AttendanceStatus.LEAVE } as any
        );

        if (isLeft(updateResult)) {
          this.logger.error(
            { recordId: attendanceRecordId },
            'Failed to update attendance record status'
          );
          return left({
            code: String(ServiceErrorCode.DATABASE_ERROR),
            message: '更新考勤记录失败'
          });
        }

        this.logger.info(
          { recordId: attendanceRecordId, newStatus: AttendanceStatus.LEAVE },
          'Attendance record status updated to leave'
        );
      } else {
        // 审批拒绝：删除考勤记录
        const deleteResult =
          await this.attendanceRecordRepository.delete(attendanceRecordId);

        if (isLeft(deleteResult)) {
          this.logger.error(
            { recordId: attendanceRecordId },
            'Failed to delete attendance record'
          );
          return left({
            code: String(ServiceErrorCode.DATABASE_ERROR),
            message: '删除考勤记录失败'
          });
        }

        this.logger.info(
          { recordId: attendanceRecordId },
          'Attendance record deleted after rejection'
        );
      }

      return right({
        message: `请假申请已${action === 'approve' ? '批准' : '拒绝'}`
      });
    } catch (error) {
      this.logger.error(error, 'Failed to process leave approval');
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '处理审批失败'
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
   * 教师查询指定学生在指定课程的待审批请假申请
   * 用于前端点击"审批"按钮后获取请假申请详情
   * @param teacherId 教师 ID（从登录态获取）
   * @param studentId 学生 ID
   * @param courseId 课程 ID
   * @returns 请假申请详情列表（包装成数组格式）
   */
  async queryPendingLeaveApplicationByStudentAndCourse(
    teacherId: string,
    studentId: string,
    courseId: string
  ): Promise<Either<ServiceError, any>> {
    this.logger.debug(
      { teacherId, studentId, courseId },
      'Querying pending leave application by student and course'
    );

    // 1. 参数验证
    if (!teacherId || teacherId.trim() === '') {
      return left({
        code: String(ServiceErrorCode.VALIDATION_ERROR),
        message: '教师ID不能为空'
      });
    }

    if (!studentId || studentId.trim() === '') {
      return left({
        code: String(ServiceErrorCode.VALIDATION_ERROR),
        message: '学生ID不能为空'
      });
    }

    if (!courseId || courseId.trim() === '') {
      return left({
        code: String(ServiceErrorCode.VALIDATION_ERROR),
        message: '课程ID不能为空'
      });
    }

    try {
      // 2. 调用 Repository 层查询
      const applicationMaybe =
        await this.leaveApplicationRepository.findPendingByStudentAndCourse({
          studentId,
          courseId,
          approverId: teacherId
        });

      // 3. 如果没有找到，返回空数组
      if (isNone(applicationMaybe)) {
        this.logger.debug(
          { teacherId, studentId, courseId },
          'No pending leave application found'
        );
        return right({ applications: [] });
      }

      // 4. 直接返回 Repository 的字段
      const application = applicationMaybe.value;

      this.logger.debug(
        {
          applicationId: application.application_id,
          approvalId: application.leave_approval_id,
          attendanceRecordId: application.attendance_record_id,
          attachmentCount: application.attachments.length
        },
        'Found pending leave application'
      );

      // 5. 返回结果（包装成数组）
      return right(application);
    } catch (error) {
      this.logger.error(
        { error, teacherId, studentId, courseId },
        'Failed to query pending leave application'
      );

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: error instanceof Error ? error.message : '查询请假申请详情失败'
      });
    }
  }
}
