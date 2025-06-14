/**
 * 请假申请仓库
 * 处理请假申请记录的数据库操作
 */

import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { randomUUID } from 'crypto';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, LeaveApplicationEntity } from './types.js';

/**
 * 请假类型枚举
 */
export enum LeaveType {
  SICK = 'sick',
  PERSONAL = 'personal',
  EMERGENCY = 'emergency',
  OTHER = 'other'
}

/**
 * 申请状态枚举
 */
export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

/**
 * 创建请假申请参数
 */
export interface CreateLeaveApplicationParams {
  student_id: string;
  student_name: string;
  student_attendance_record_id: string;
  kkh: string;
  xnxq: string;
  course_name: string;
  class_date: Date;
  class_time: string;
  class_location?: string;
  teacher_id: string;
  teacher_name: string;
  leave_type: LeaveType;
  leave_date: Date;
  leave_reason: string;
  application_time?: Date;
}

/**
 * 更新请假申请参数
 */
export interface UpdateLeaveApplicationParams {
  leave_type?: LeaveType;
  leave_date?: Date;
  leave_reason?: string;
  status?: ApplicationStatus;
}

/**
 * 查询请假申请条件
 */
export interface LeaveApplicationQueryConditions {
  student_id?: string;
  teacher_id?: string;
  kkh?: string;
  xnxq?: string;
  status?: ApplicationStatus;
  leave_type?: LeaveType;
  class_date_start?: Date;
  class_date_end?: Date;
  application_time_start?: Date;
  application_time_end?: Date;
}

/**
 * 请假申请统计结果
 */
export interface LeaveApplicationStats {
  total_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  sick_leave_count: number;
  personal_leave_count: number;
  emergency_leave_count: number;
  other_leave_count: number;
}

/**
 * 请假申请仓库类
 */
export class LeaveApplicationRepository extends BaseRepository {
  constructor(db: Kysely<ExtendedDatabase>, log: Logger) {
    super(db, log);
  }

  /**
   * 创建请假申请
   */
  async createLeaveApplication(
    params: CreateLeaveApplicationParams
  ): Promise<LeaveApplicationEntity> {
    try {
      const id = randomUUID();
      const now = new Date();
      const applicationTime = params.application_time || now;

      this.log.debug(
        {
          studentId: params.student_id,
          kkh: params.kkh,
          leaveType: params.leave_type
        },
        '创建请假申请'
      );

      await this.db
        .insertInto('icalink_leave_applications')
        .values({
          id,
          student_id: params.student_id,
          student_name: params.student_name,
          student_attendance_record_id: params.student_attendance_record_id,
          kkh: params.kkh,
          xnxq: params.xnxq,
          course_name: params.course_name,
          class_date: params.class_date,
          class_time: params.class_time,
          class_location: params.class_location || null,
          teacher_id: params.teacher_id,
          teacher_name: params.teacher_name,
          leave_type: params.leave_type,
          leave_date: params.leave_date,
          leave_reason: params.leave_reason,
          application_time: applicationTime,
          status: ApplicationStatus.PENDING,
          created_at: now,
          updated_at: now
        })
        .execute();

      const createdRecord = await this.getLeaveApplicationById(id);
      if (!createdRecord) {
        throw new Error('创建请假申请后无法获取记录');
      }

      this.log.info(
        {
          id,
          studentId: params.student_id,
          kkh: params.kkh,
          leaveType: params.leave_type
        },
        '请假申请创建成功'
      );

      return createdRecord;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          studentId: params.student_id,
          kkh: params.kkh
        },
        '创建请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 根据ID获取请假申请
   */
  async getLeaveApplicationById(
    id: string
  ): Promise<LeaveApplicationEntity | null> {
    try {
      this.log.debug({ id }, '根据ID获取请假申请');

      const result = await this.db
        .selectFrom('icalink_leave_applications')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!result) {
        this.log.debug({ id }, '请假申请不存在');
        return null;
      }

      this.log.debug({ id, studentId: result.student_id }, '获取请假申请成功');
      return result as LeaveApplicationEntity;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id
        },
        '获取请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 根据学生考勤记录ID获取请假申请
   */
  async getLeaveApplicationByAttendanceRecordId(
    attendanceRecordId: string
  ): Promise<LeaveApplicationEntity | null> {
    try {
      this.log.debug({ attendanceRecordId }, '根据考勤记录ID获取请假申请');

      const result = await this.db
        .selectFrom('icalink_leave_applications')
        .selectAll()
        .where('student_attendance_record_id', '=', attendanceRecordId)
        .executeTakeFirst();

      if (!result) {
        this.log.debug({ attendanceRecordId }, '请假申请不存在');
        return null;
      }

      this.log.debug(
        { attendanceRecordId, studentId: result.student_id },
        '获取请假申请成功'
      );
      return result as LeaveApplicationEntity;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId
        },
        '获取请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 根据条件查询请假申请
   */
  async findLeaveApplications(
    conditions: LeaveApplicationQueryConditions,
    limit?: number,
    offset?: number
  ): Promise<LeaveApplicationEntity[]> {
    try {
      this.log.debug({ conditions, limit, offset }, '查询请假申请');

      let query = this.db.selectFrom('icalink_leave_applications').selectAll();

      // 添加查询条件
      if (conditions.student_id) {
        query = query.where('student_id', '=', conditions.student_id);
      }
      if (conditions.teacher_id) {
        query = query.where('teacher_id', '=', conditions.teacher_id);
      }
      if (conditions.kkh) {
        query = query.where('kkh', '=', conditions.kkh);
      }
      if (conditions.xnxq) {
        query = query.where('xnxq', '=', conditions.xnxq);
      }
      if (conditions.status) {
        query = query.where('status', '=', conditions.status);
      }
      if (conditions.leave_type) {
        query = query.where('leave_type', '=', conditions.leave_type);
      }
      if (conditions.class_date_start) {
        query = query.where('class_date', '>=', conditions.class_date_start);
      }
      if (conditions.class_date_end) {
        query = query.where('class_date', '<=', conditions.class_date_end);
      }
      if (conditions.application_time_start) {
        query = query.where(
          'application_time',
          '>=',
          conditions.application_time_start
        );
      }
      if (conditions.application_time_end) {
        query = query.where(
          'application_time',
          '<=',
          conditions.application_time_end
        );
      }

      // 添加排序
      query = query.orderBy('application_time', 'desc');

      // 添加分页
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.offset(offset);
      }

      const results = await query.execute();

      this.log.debug({ conditions, count: results.length }, '查询请假申请完成');

      return results as LeaveApplicationEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          conditions
        },
        '查询请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 更新请假申请
   */
  async updateLeaveApplication(
    id: string,
    updates: UpdateLeaveApplicationParams
  ): Promise<void> {
    try {
      this.log.debug({ id, updates }, '更新请假申请');

      const result = await this.db
        .updateTable('icalink_leave_applications')
        .set({
          ...updates,
          updated_at: new Date()
        })
        .where('id', '=', id)
        .execute();

      if (result.length === 0) {
        throw new Error('请假申请不存在或更新失败');
      }

      this.log.info({ id }, '请假申请更新成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id,
          updates
        },
        '更新请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 删除请假申请
   */
  async deleteLeaveApplication(id: string): Promise<void> {
    try {
      this.log.debug({ id }, '删除请假申请');

      const result = await this.db
        .deleteFrom('icalink_leave_applications')
        .where('id', '=', id)
        .execute();

      if (result.length === 0) {
        throw new Error('请假申请不存在或删除失败');
      }

      this.log.info({ id }, '请假申请删除成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id
        },
        '删除请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 批准请假申请
   */
  async approveLeaveApplication(id: string): Promise<void> {
    try {
      this.log.debug({ id }, '批准请假申请');

      await this.updateLeaveApplication(id, {
        status: ApplicationStatus.APPROVED
      });

      this.log.info({ id }, '请假申请批准成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id
        },
        '批准请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 拒绝请假申请
   */
  async rejectLeaveApplication(id: string): Promise<void> {
    try {
      this.log.debug({ id }, '拒绝请假申请');

      await this.updateLeaveApplication(id, {
        status: ApplicationStatus.REJECTED
      });

      this.log.info({ id }, '请假申请拒绝成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id
        },
        '拒绝请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 获取请假申请统计
   */
  async getLeaveApplicationStats(
    conditions?: Partial<LeaveApplicationQueryConditions>
  ): Promise<LeaveApplicationStats> {
    try {
      this.log.debug({ conditions }, '获取请假申请统计');

      let query = this.db
        .selectFrom('icalink_leave_applications')
        .select(['status', 'leave_type', this.db.fn.count('id').as('count')]);

      // 添加查询条件
      if (conditions?.teacher_id) {
        query = query.where('teacher_id', '=', conditions.teacher_id);
      }
      if (conditions?.kkh) {
        query = query.where('kkh', '=', conditions.kkh);
      }
      if (conditions?.xnxq) {
        query = query.where('xnxq', '=', conditions.xnxq);
      }
      if (conditions?.class_date_start) {
        query = query.where('class_date', '>=', conditions.class_date_start);
      }
      if (conditions?.class_date_end) {
        query = query.where('class_date', '<=', conditions.class_date_end);
      }

      const stats = await query.groupBy(['status', 'leave_type']).execute();

      let totalCount = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      let sickLeaveCount = 0;
      let personalLeaveCount = 0;
      let emergencyLeaveCount = 0;
      let otherLeaveCount = 0;

      stats.forEach((stat: any) => {
        const count = Number(stat.count);
        totalCount += count;

        // 按状态统计
        switch (stat.status) {
          case ApplicationStatus.PENDING:
            pendingCount += count;
            break;
          case ApplicationStatus.APPROVED:
            approvedCount += count;
            break;
          case ApplicationStatus.REJECTED:
            rejectedCount += count;
            break;
        }

        // 按请假类型统计
        switch (stat.leave_type) {
          case LeaveType.SICK:
            sickLeaveCount += count;
            break;
          case LeaveType.PERSONAL:
            personalLeaveCount += count;
            break;
          case LeaveType.EMERGENCY:
            emergencyLeaveCount += count;
            break;
          case LeaveType.OTHER:
            otherLeaveCount += count;
            break;
        }
      });

      const result: LeaveApplicationStats = {
        total_count: totalCount,
        pending_count: pendingCount,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        sick_leave_count: sickLeaveCount,
        personal_leave_count: personalLeaveCount,
        emergency_leave_count: emergencyLeaveCount,
        other_leave_count: otherLeaveCount
      };

      this.log.debug({ conditions, stats: result }, '获取请假申请统计完成');

      return result;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          conditions
        },
        '获取请假申请统计失败'
      );
      throw error;
    }
  }

  /**
   * 获取学生的请假申请历史
   */
  async getStudentLeaveApplicationHistory(
    studentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<LeaveApplicationEntity[]> {
    try {
      this.log.debug({ studentId, limit, offset }, '获取学生请假申请历史');

      const results = await this.db
        .selectFrom('icalink_leave_applications')
        .selectAll()
        .where('student_id', '=', studentId)
        .orderBy('application_time', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      this.log.debug(
        { studentId, count: results.length },
        '获取学生请假申请历史完成'
      );

      return results as LeaveApplicationEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          studentId
        },
        '获取学生请假申请历史失败'
      );
      throw error;
    }
  }

  /**
   * 获取教师需要审批的请假申请
   */
  async getTeacherPendingApplications(
    teacherId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<LeaveApplicationEntity[]> {
    try {
      this.log.debug({ teacherId, limit, offset }, '获取教师待审批请假申请');

      const results = await this.db
        .selectFrom('icalink_leave_applications')
        .selectAll()
        .where('teacher_id', '=', teacherId)
        .where('status', '=', ApplicationStatus.PENDING)
        .orderBy('application_time', 'asc')
        .limit(limit)
        .offset(offset)
        .execute();

      this.log.debug(
        { teacherId, count: results.length },
        '获取教师待审批请假申请完成'
      );

      return results as LeaveApplicationEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          teacherId
        },
        '获取教师待审批请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 检查学生是否已有相同课程的请假申请
   */
  async hasExistingLeaveApplication(
    studentId: string,
    kkh: string,
    classDate: Date
  ): Promise<boolean> {
    try {
      this.log.debug(
        { studentId, kkh, classDate },
        '检查是否存在相同课程的请假申请'
      );

      const result = await this.db
        .selectFrom('icalink_leave_applications')
        .select('id')
        .where('student_id', '=', studentId)
        .where('kkh', '=', kkh)
        .where('class_date', '=', classDate)
        .where('status', 'in', [
          ApplicationStatus.PENDING,
          ApplicationStatus.APPROVED
        ])
        .executeTakeFirst();

      const exists = result !== undefined;

      this.log.debug({ studentId, kkh, classDate, exists }, '检查请假申请完成');

      return exists;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          studentId,
          kkh,
          classDate
        },
        '检查请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 批量创建请假申请
   */
  async batchCreateLeaveApplications(
    applications: CreateLeaveApplicationParams[]
  ): Promise<LeaveApplicationEntity[]> {
    try {
      this.log.debug({ count: applications.length }, '批量创建请假申请');

      const now = new Date();
      const records = applications.map((app) => ({
        id: randomUUID(),
        student_id: app.student_id,
        student_name: app.student_name,
        student_attendance_record_id: app.student_attendance_record_id,
        kkh: app.kkh,
        xnxq: app.xnxq,
        course_name: app.course_name,
        class_date: app.class_date,
        class_time: app.class_time,
        class_location: app.class_location || null,
        teacher_id: app.teacher_id,
        teacher_name: app.teacher_name,
        leave_type: app.leave_type,
        leave_date: app.leave_date,
        leave_reason: app.leave_reason,
        application_time: app.application_time || now,
        status: ApplicationStatus.PENDING,
        created_at: now,
        updated_at: now
      }));

      await this.db
        .insertInto('icalink_leave_applications')
        .values(records)
        .execute();

      this.log.info({ createdCount: records.length }, '批量创建请假申请成功');

      return records as LeaveApplicationEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          count: applications.length
        },
        '批量创建请假申请失败'
      );
      throw error;
    }
  }
}
