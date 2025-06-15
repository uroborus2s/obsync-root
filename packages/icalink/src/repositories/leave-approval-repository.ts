/**
 * 请假审批仓库
 * 处理请假审批记录的数据库操作
 */

import { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { sql } from '@stratix/database';
import { randomUUID } from 'crypto';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, LeaveApprovalEntity } from './types.js';

/**
 * 创建请假审批记录参数
 */
export interface CreateLeaveApprovalParams {
  application_id: string;
  approver_id: string;
  approver_name: string;
  approval_result?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approval_comment?: string;
  approval_time?: Date;
}

/**
 * 请假审批仓库类
 */
export class LeaveApprovalRepository extends BaseRepository {
  constructor(db: Kysely<ExtendedDatabase>, log: Logger) {
    super(db, log);
  }

  /**
   * 创建请假审批记录
   */
  async createLeaveApproval(
    params: CreateLeaveApprovalParams
  ): Promise<LeaveApprovalEntity> {
    try {
      const id = randomUUID();
      const now = new Date();

      this.log.debug(
        {
          applicationId: params.application_id,
          approverId: params.approver_id,
          result: params.approval_result
        },
        '创建请假审批记录'
      );

      await this.db
        .insertInto('icalink_leave_approvals')
        .values({
          id,
          application_id: params.application_id,
          approver_id: params.approver_id,
          approver_name: params.approver_name,
          approval_result: params.approval_result || 'pending',
          approval_comment: params.approval_comment || null,
          approval_time: params.approval_time || null,
          created_at: now
        })
        .execute();

      const createdRecord = await this.getLeaveApprovalById(id);
      if (!createdRecord) {
        throw new Error('创建请假审批记录后无法获取记录');
      }

      this.log.info(
        {
          id,
          applicationId: params.application_id,
          approverId: params.approver_id,
          result: params.approval_result
        },
        '请假审批记录创建成功'
      );

      return createdRecord;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          applicationId: params.application_id,
          approverId: params.approver_id
        },
        '创建请假审批记录失败'
      );
      throw error;
    }
  }

  /**
   * 批量创建请假审批记录
   */
  async batchCreateLeaveApprovals(
    applicationId: string,
    teachers: Array<{
      approver_id: string;
      approver_name: string;
    }>
  ): Promise<LeaveApprovalEntity[]> {
    try {
      this.log.debug(
        {
          applicationId,
          teacherCount: teachers.length,
          teachers: teachers.map((t) => ({
            id: t.approver_id,
            name: t.approver_name
          }))
        },
        '批量创建请假审批记录'
      );

      const now = new Date();
      const approvals: LeaveApprovalEntity[] = [];

      // 为每位教师创建一条待审批记录
      for (const teacher of teachers) {
        const approval = await this.createLeaveApproval({
          application_id: applicationId,
          approver_id: teacher.approver_id,
          approver_name: teacher.approver_name,
          approval_result: 'pending', // 初始状态设为待审批
          approval_comment: undefined,
          approval_time: undefined // 待审批状态时不设置审批时间
        });
        approvals.push(approval);
      }

      this.log.info(
        {
          applicationId,
          teacherCount: teachers.length,
          createdCount: approvals.length
        },
        '批量创建请假审批记录成功'
      );

      return approvals;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          applicationId,
          teacherCount: teachers.length
        },
        '批量创建请假审批记录失败'
      );
      throw error;
    }
  }

  /**
   * 根据ID获取请假审批记录
   */
  async getLeaveApprovalById(id: string): Promise<LeaveApprovalEntity | null> {
    try {
      this.log.debug({ id }, '根据ID获取请假审批记录');

      const result = await this.db
        .selectFrom('icalink_leave_approvals')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!result) {
        this.log.debug({ id }, '请假审批记录不存在');
        return null;
      }

      this.log.debug(
        { id, approverId: result.approver_id },
        '获取请假审批记录成功'
      );
      return result as LeaveApprovalEntity;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id
        },
        '获取请假审批记录失败'
      );
      throw error;
    }
  }

  /**
   * 根据申请ID获取所有审批记录
   */
  async getLeaveApprovalsByApplicationId(
    applicationId: string
  ): Promise<LeaveApprovalEntity[]> {
    try {
      this.log.debug({ applicationId }, '根据申请ID获取审批记录');

      const results = await this.db
        .selectFrom('icalink_leave_approvals')
        .selectAll()
        .where('application_id', '=', applicationId)
        .orderBy('created_at', 'asc')
        .execute();

      this.log.debug(
        { applicationId, count: results.length },
        '获取审批记录成功'
      );

      return results as LeaveApprovalEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          applicationId
        },
        '获取审批记录失败'
      );
      throw error;
    }
  }

  /**
   * 根据审批人ID获取待审批记录
   */
  async getPendingApprovalsByApproverId(
    approverId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<LeaveApprovalEntity[]> {
    try {
      this.log.debug(
        { approverId, limit, offset },
        '根据审批人ID获取待审批记录'
      );

      const results = await this.db
        .selectFrom('icalink_leave_approvals')
        .selectAll()
        .where('approver_id', '=', approverId)
        .where('approval_result', '=', 'pending') // 只查询待审批的记录
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      this.log.debug(
        { approverId, count: results.length },
        '获取待审批记录成功'
      );

      return results as LeaveApprovalEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          approverId
        },
        '获取待审批记录失败'
      );
      throw error;
    }
  }

  /**
   * 更新审批结果
   */
  async updateApprovalResult(
    id: string,
    result: 'approved' | 'rejected' | 'cancelled',
    comment?: string,
    approvalTime?: Date
  ): Promise<void> {
    try {
      this.log.debug({ id, result, comment }, '更新审批结果');

      await this.db
        .updateTable('icalink_leave_approvals')
        .set({
          approval_result: result,
          approval_comment: comment || null,
          approval_time: approvalTime || new Date()
        })
        .where('id', '=', id)
        .execute();

      this.log.info({ id, result }, '更新审批结果成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id,
          result
        },
        '更新审批结果失败'
      );
      throw error;
    }
  }

  /**
   * 删除审批记录
   */
  async deleteLeaveApproval(id: string): Promise<void> {
    try {
      this.log.debug({ id }, '删除审批记录');

      await this.db
        .deleteFrom('icalink_leave_approvals')
        .where('id', '=', id)
        .execute();

      this.log.info({ id }, '删除审批记录成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id
        },
        '删除审批记录失败'
      );
      throw error;
    }
  }

  /**
   * 获取教师审批记录
   */
  async getTeacherApprovals(teacherId: string): Promise<any[]> {
    try {
      this.log.debug({ teacherId }, '获取教师审批记录');

      // 使用 sql 模板字符串执行查询，获取完整信息
      // 添加DISTINCT避免JOIN导致的重复记录
      const results = await sql`
        SELECT DISTINCT
          la.id,
          la.application_id,
          la.approver_id,
          la.approver_name,
          la.approval_result,
          la.approval_comment,
          la.approval_time,
          la.created_at,
          sa.xh as student_id,
          sa.xm as student_name,
          ar.kkh as course_id,
          ar.kcmc as course_name,
          ar.rq as leave_date,
          ar.sj_f as class_start_time,
          ar.sj_t as class_end_time,
          sa.leave_reason,
          sa.leave_type,
          sa.status as attendance_status,
          sa.created_at as application_time,
          -- 学生详细信息
          xs.bjmc as class_name,
          xs.zymc as major_name,
          -- 教师详细信息  
          js.xm as teacher_name,
          js.ssdwmc as teacher_department
        FROM icalink_leave_approvals la
        INNER JOIN icalink_student_attendance sa ON la.application_id = sa.id
        INNER JOIN icalink_attendance_records ar ON sa.attendance_record_id = ar.id
        LEFT JOIN out_xsxx xs ON sa.xh = xs.xh
        LEFT JOIN out_jsxx js ON la.approver_id = js.gh
        WHERE la.approver_id = ${teacherId}
        ORDER BY la.created_at DESC
      `.execute(this.db);

      // 添加调试日志
      this.log.info('查询结果详情:', {
        teacherId,
        totalRows: results.rows.length,
        sampleData: results.rows.slice(0, 2).map((row: any) => ({
          approval_id: row.id,
          application_id: row.application_id,
          student_name: row.student_name,
          course_name: row.course_name,
          approval_result: row.approval_result
        }))
      });

      // 为每个申请获取附件信息和课程详细信息
      const applicationsWithAttachments = await Promise.all(
        (results.rows as any[]).map(async (app) => {
          // 获取附件信息
          const attachments = await this.db
            .selectFrom('icalink_leave_attachments')
            .select([
              'id',
              'file_name',
              'file_size',
              'file_type',
              'upload_time'
            ])
            .where('application_id', '=', app.application_id)
            .execute();

          // 获取课程详细信息（教室和时间）
          let courseDetail = null;
          if (app.leave_date && app.course_id) {
            // 安全处理日期格式
            let dateStr = '';
            if (typeof app.leave_date === 'string') {
              dateStr = app.leave_date.includes('T')
                ? app.leave_date.split('T')[0]
                : app.leave_date;
            } else if (app.leave_date instanceof Date) {
              dateStr = app.leave_date.toISOString().split('T')[0];
            } else {
              dateStr = String(app.leave_date).split('T')[0];
            }

            // 添加日期格式调试
            this.log.info('日期处理:', {
              original_leave_date: app.leave_date,
              processed_dateStr: dateStr,
              leave_date_type: typeof app.leave_date
            });

            // 使用juhe_renwu表匹配课程，需要kkh、rq、sj_f三个字段
            courseDetail = await this.db
              .selectFrom('juhe_renwu')
              .select([
                'room_s as room',
                'sj_f as st',
                'sj_t as ed',
                'jxz', // 教学周
                'lq', // 楼群
                'kcmc' // 课程名称
              ])
              .where('kkh', '=', app.course_id)
              .where('rq', '=', dateStr)
              .where('sj_f', '=', app.class_start_time)
              .executeTakeFirst(); // 只取第一条记录

            // 添加调试日志
            this.log.info('课程详细信息查询(juhe_renwu):', {
              course_id: app.course_id,
              dateStr,
              class_start_time: app.class_start_time,
              courseDetail,
              hasDetail: !!courseDetail,
              queryConditions: {
                kkh: app.course_id,
                rq: dateStr,
                sj_f: app.class_start_time
              }
            });

            // 如果没有找到课程详细信息，尝试查询是否存在该课程的任何记录
            if (!courseDetail) {
              const anyCourseRecord = await this.db
                .selectFrom('juhe_renwu')
                .select(['kkh', 'rq', 'sj_f', 'room_s'])
                .where('kkh', '=', app.course_id)
                .limit(3)
                .execute();

              this.log.info('该课程的所有记录(juhe_renwu):', {
                course_id: app.course_id,
                allRecords: anyCourseRecord
              });
            }
          }

          // 计算课程开始和结束时间
          let courseStartTime = '';
          let courseEndTime = '';
          if (app.leave_date && courseDetail?.st && courseDetail?.ed) {
            const dateStr = app.leave_date.includes('T')
              ? app.leave_date.split('T')[0]
              : app.leave_date;

            // 将时间字符串转换为完整的ISO时间
            courseStartTime = `${dateStr}T${courseDetail.st}:00.000Z`;
            courseEndTime = `${dateStr}T${courseDetail.ed}:00.000Z`;
          }

          const result = {
            ...app,
            // 构建完整的课程时间
            class_time:
              courseDetail?.st && courseDetail?.ed
                ? `${courseDetail.st} - ${courseDetail.ed}`
                : `${app.class_start_time} - ${app.class_end_time}`,
            // 添加课程地点信息
            class_location: courseDetail?.room || '',
            lq: courseDetail?.lq || '', // 楼群
            room_s: courseDetail?.room || '', // 教室（使用room字段）
            // 添加教学周
            jxz: courseDetail?.jxz || null, // 教学周
            // 添加课程开始和结束时间
            course_start_time: courseStartTime,
            course_end_time: courseEndTime,
            // 添加附件信息
            attachments: attachments.map((att) => ({
              id: att.id,
              file_name: att.file_name,
              file_size: att.file_size || 0,
              file_type: att.file_type || '',
              upload_time: att.upload_time
                ? new Date(att.upload_time).toISOString()
                : ''
            })),
            // 格式化日期
            leave_date: app.leave_date
              ? new Date(app.leave_date).toISOString()
              : '',
            application_time: app.application_time
              ? new Date(app.application_time).toISOString()
              : '',
            approval_time: app.approval_time
              ? new Date(app.approval_time).toISOString()
              : null
          };

          // 添加调试日志查看最终返回的数据
          this.log.info('最终返回数据:', {
            id: result.id,
            student_name: result.student_name,
            course_name: result.course_name,
            lq: result.lq,
            room_s: result.room_s,
            jxz: result.jxz,
            course_start_time: result.course_start_time,
            course_end_time: result.course_end_time,
            class_location: result.class_location
          });

          return result;
        })
      );

      this.log.debug(
        { teacherId, count: applicationsWithAttachments.length },
        '获取教师审批记录成功'
      );

      return applicationsWithAttachments;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          teacherId
        },
        '获取教师审批记录失败'
      );
      throw error;
    }
  }

  /**
   * 获取教师审批统计
   */
  async getTeacherApprovalStats(teacherId: string): Promise<{
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    cancelled_count: number;
    total_count: number;
  }> {
    try {
      this.log.debug({ teacherId }, '获取教师审批统计');

      const results = await sql`
        SELECT 
          SUM(CASE WHEN approval_result = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN approval_result = 'approved' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN approval_result = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
          SUM(CASE WHEN approval_result = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
          COUNT(*) as total_count
        FROM icalink_leave_approvals 
        WHERE approver_id = ${teacherId}
      `.execute(this.db);

      const result = (results.rows as any[])[0] || {};

      const stats = {
        pending_count: parseInt(String(result.pending_count || 0)),
        approved_count: parseInt(String(result.approved_count || 0)),
        rejected_count: parseInt(String(result.rejected_count || 0)),
        cancelled_count: parseInt(String(result.cancelled_count || 0)),
        total_count: parseInt(String(result.total_count || 0))
      };

      this.log.debug({ teacherId, stats }, '获取教师审批统计成功');

      return stats;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          teacherId
        },
        '获取教师审批统计失败'
      );
      throw error;
    }
  }

  /**
   * 处理教师审批
   * 更新审批记录，并根据所有审批记录的状态更新请假单状态
   */
  async processApproval(
    approvalId: string,
    action: 'approve' | 'reject',
    comment?: string
  ): Promise<{
    approval_id: string;
    application_id: string;
    action: 'approve' | 'reject';
    final_status: 'pending' | 'approved' | 'rejected';
    approval_time: string;
    approval_comment?: string;
  }> {
    try {
      this.log.debug({ approvalId, action, comment }, '处理教师审批');

      // 1. 获取审批记录
      const approval = await this.getLeaveApprovalById(approvalId);
      if (!approval) {
        throw new Error('审批记录不存在');
      }

      if (approval.approval_result !== 'pending') {
        throw new Error('该审批记录已处理，无法重复审批');
      }

      const now = new Date();
      const approvalResult = action === 'approve' ? 'approved' : 'rejected';

      // 2. 更新当前审批记录
      await this.updateApprovalResult(approvalId, approvalResult, comment, now);

      // 3. 获取该请假申请的所有审批记录
      const allApprovals = await this.getLeaveApprovalsByApplicationId(
        approval.application_id
      );

      // 4. 分析所有审批记录的状态
      let finalStatus: 'pending' | 'approved' | 'rejected' = 'pending';
      let hasPending = false;
      let hasRejected = false;
      let allProcessed = true;

      for (const approvalRecord of allApprovals) {
        if (approvalRecord.id === approvalId) {
          // 使用最新的审批结果
          if (approvalResult === 'rejected') {
            hasRejected = true;
          }
        } else {
          if (approvalRecord.approval_result === 'pending') {
            hasPending = true;
            allProcessed = false;
          } else if (approvalRecord.approval_result === 'rejected') {
            hasRejected = true;
          }
        }
      }

      // 5. 确定最终状态
      if (hasPending) {
        // 还有待审批的记录，保持pending状态
        finalStatus = 'pending';
      } else if (hasRejected) {
        // 有拒绝的记录，最终状态为拒绝
        finalStatus = 'rejected';
      } else if (allProcessed) {
        // 所有记录都已处理且没有拒绝，最终状态为通过
        finalStatus = 'approved';
      }

      // 6. 更新请假单状态（如果需要）
      if (finalStatus !== 'pending') {
        await this.updateLeaveApplicationStatus(
          approval.application_id,
          finalStatus
        );
      }

      this.log.info(
        {
          approvalId,
          applicationId: approval.application_id,
          action,
          finalStatus,
          hasPending,
          hasRejected,
          allProcessed
        },
        '教师审批处理完成'
      );

      return {
        approval_id: approvalId,
        application_id: approval.application_id,
        action,
        final_status: finalStatus,
        approval_time: now.toISOString(),
        approval_comment: comment
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          approvalId,
          action
        },
        '处理教师审批失败'
      );
      throw error;
    }
  }

  /**
   * 更新请假申请状态
   * 注意：这里假设请假申请存储在icalink_student_attendance表中
   */
  private async updateLeaveApplicationStatus(
    applicationId: string,
    status: 'approved' | 'rejected'
  ): Promise<void> {
    try {
      this.log.debug({ applicationId, status }, '更新请假申请状态');

      // 根据最终状态确定学生考勤状态
      const attendanceStatus =
        status === 'approved' ? 'leave' : 'leave_rejected';

      await this.db
        .updateTable('icalink_student_attendance')
        .set({
          status: attendanceStatus,
          approved_time: new Date()
        })
        .where('id', '=', applicationId)
        .execute();

      this.log.info(
        { applicationId, status, attendanceStatus },
        '请假申请状态更新成功'
      );
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          applicationId,
          status
        },
        '更新请假申请状态失败'
      );
      throw error;
    }
  }

  /**
   * 根据审批记录ID和审批人ID获取审批记录
   * 用于权限验证
   */
  async getApprovalByIdAndApprover(
    approvalId: string,
    approverId: string
  ): Promise<LeaveApprovalEntity | null> {
    try {
      this.log.debug({ approvalId, approverId }, '根据ID和审批人获取审批记录');

      const result = await this.db
        .selectFrom('icalink_leave_approvals')
        .selectAll()
        .where('id', '=', approvalId)
        .where('approver_id', '=', approverId)
        .executeTakeFirst();

      if (!result) {
        this.log.debug({ approvalId, approverId }, '审批记录不存在或无权限');
        return null;
      }

      this.log.debug(
        { approvalId, approverId, applicationId: result.application_id },
        '获取审批记录成功'
      );
      return result as LeaveApprovalEntity;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          approvalId,
          approverId
        },
        '获取审批记录失败'
      );
      throw error;
    }
  }
}
