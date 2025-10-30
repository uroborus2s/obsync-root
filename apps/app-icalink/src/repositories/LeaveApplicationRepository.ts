import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import {
  fromNullable,
  maybeNone as none,
  type Maybe
} from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  IcalinkLeaveApplication
} from '../types/database.js';

/**
 * 附件信息
 */
export interface LeaveAttachmentInfo {
  /** 附件 ID */
  id: number;
  /** 图片名称 */
  image_name: string;
  /** 图片大小（字节） */
  image_size: number;
  /** 元数据（包含文件路径等信息） */
  metadata: string;
}

/**
 * 请假申请详情（包含审批记录和附件信息）
 */
export interface LeaveApplicationWithDetails {
  // 考勤记录信息
  attendance_record_id: number;
  student_name: string;
  student_id: string;
  class_name: string;
  major_name: string;
  course_id: number;

  // 请假申请信息
  application_id: number;
  leave_type: string;
  leave_reason: string;
  application_time: Date;
  approval_comment?: string;

  // 审批信息
  approver_id: string;
  approver_name: string;
  approval_result: string;
  leave_approval_id: number;

  // 附件列表
  attachments: LeaveAttachmentInfo[];
}

export default class LeaveApplicationRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_leave_applications',
  IcalinkLeaveApplication
> {
  protected readonly tableName = 'icalink_leave_applications';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ LeaveApplicationRepository initialized');
  }

  /**
   * 查询指定学生在指定课程中、指定教师需要审批的待审批请假申请
   *
   * @param params 查询参数
   * @param params.studentId 学生 ID
   * @param params.courseId 课程 ID
   * @param params.approverId 审批人 ID（教师 ID）
   * @returns Maybe<LeaveApplicationWithDetails> - 请假申请详情（包含审批记录和附件列表），如果没有找到则返回 None
   *
   * @description
   * 使用多表关联查询获取请假申请详情：
   * 1. 关联考勤记录表（icalink_attendance_records）
   * 2. 关联请假申请表（icalink_leave_applications）
   * 3. 关联审批记录表（icalink_leave_approvals）
   * 4. 左关联附件表（icalink_leave_attachments）- 因为请假申请可能没有附件
   * 5. 筛选条件：考勤状态为 leave_pending、课程 ID 匹配、学生 ID 匹配、审批人 ID 匹配
   * 6. 处理一对多关系：一个请假申请可能有多个附件
   */
  public async findPendingByStudentAndCourse(params: {
    studentId: string;
    courseId: string;
    approverId: string;
  }): Promise<Maybe<LeaveApplicationWithDetails>> {
    const { studentId, courseId, approverId } = params;

    this.logger.debug(
      { studentId, courseId, approverId },
      'Querying pending leave application by student and course'
    );

    try {
      const db = await this.getQueryConnection();

      // 查询请假申请及附件（一对多关系）
      const rows = (await db
        .selectFrom('icalink_attendance_records as iar')
        // 关联请假申请表
        .innerJoin(
          'icalink_leave_applications as ila',
          'ila.attendance_record_id',
          'iar.id'
        )
        // 关联审批记录表
        .innerJoin(
          'icalink_leave_approvals as ilap',
          'ilap.leave_application_id',
          'ila.id'
        )
        // 左关联附件表（可能没有附件）
        .leftJoin(
          'icalink_leave_attachments as ilat',
          'ilat.leave_application_id',
          'ila.id'
        )
        // WHERE 条件
        .where(({ eb }: any) => eb('iar.status', '=', 'leave_pending')) // 考勤状态为待审批
        .where('iar.attendance_course_id', '=', parseInt(courseId, 10)) // 课程 ID 匹配
        .where('iar.student_id', '=', studentId) // 学生 ID 匹配
        .where('ilap.approver_id', '=', approverId) // 审批人为当前教师
        // 选择字段
        .select([
          // 考勤记录信息
          'iar.id as attendance_record_id',
          'iar.student_name',
          'iar.student_id',
          'iar.class_name',
          'iar.major_name',
          'iar.attendance_course_id as course_id',
          // 请假申请信息
          'ila.id as application_id',
          'ila.leave_type',
          'ila.leave_reason',
          'ila.application_time',
          'ila.approval_comment',
          // 审批信息
          'ilap.approver_id',
          'ilap.approver_name',
          'ilap.approval_result',
          'ilap.id as leave_approval_id',
          // 附件信息
          'ilat.id as leave_attachment_id',
          'ilat.image_size',
          'ilat.image_name',
          'ilat.metadata'
        ])
        .execute()) as any[];

      if (!rows || rows.length === 0) {
        this.logger.debug(
          { studentId, courseId, approverId },
          'No pending leave application found'
        );
        return none;
      }

      // 处理一对多关系：合并附件列表
      const firstRow = rows[0];
      const attachments: LeaveAttachmentInfo[] = [];

      for (const row of rows) {
        // 如果有附件 ID，则添加到附件列表
        if (row.leave_attachment_id) {
          attachments.push({
            id: row.leave_attachment_id,
            image_name: row.image_name || '',
            image_size: row.image_size || 0,
            metadata: row.metadata || '{}'
          });
        }
      }

      // 构建返回对象
      const result: LeaveApplicationWithDetails = {
        // 考勤记录信息
        attendance_record_id: firstRow.attendance_record_id,
        student_name: firstRow.student_name || '',
        student_id: firstRow.student_id,
        class_name: firstRow.class_name || '',
        major_name: firstRow.major_name || '',
        course_id: firstRow.course_id,
        // 请假申请信息
        application_id: firstRow.application_id,
        leave_type: firstRow.leave_type || '',
        leave_reason: firstRow.leave_reason || '',
        application_time: firstRow.application_time,
        approval_comment: firstRow.approval_comment || undefined,
        // 审批信息
        approver_id: firstRow.approver_id || '',
        approver_name: firstRow.approver_name || '',
        approval_result: firstRow.approval_result || '',
        leave_approval_id: firstRow.leave_approval_id,
        // 附件列表
        attachments
      };

      this.logger.debug(
        {
          applicationId: result.application_id,
          approvalId: result.leave_approval_id,
          attachmentCount: attachments.length
        },
        'Found pending leave application with attachments'
      );

      return fromNullable(result);
    } catch (error) {
      this.logger.error(
        { error, studentId, courseId, approverId },
        'Failed to query pending leave application'
      );
      throw error;
    }
  }

  public async findFutureLeaveByCourseAndStudents(
    courseCode: string,
    studentIds: string[],
    classDate: Date
  ): Promise<IcalinkLeaveApplication[]> {
    if (studentIds.length === 0) {
      return [];
    }

    const results = (await this.findMany((qb) =>
      qb
        .where('course_id', '=', courseCode) // Assuming course_id is the course_code
        .where('student_id', 'in', studentIds)
        .where('class_date', '=', classDate)
        .where('status', 'in', ['leave', 'leave_pending'])
    )) as unknown as IcalinkLeaveApplication[];

    return results;
  }
}
