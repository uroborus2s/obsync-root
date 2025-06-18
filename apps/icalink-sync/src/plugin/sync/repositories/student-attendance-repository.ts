/**
 * 学生签到仓库
 * 处理学生签到记录的数据库操作
 */

import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { randomUUID } from 'crypto';
import { AttendanceStatus } from '../types/attendance.js';
import { calculateCourseTimeAndStatus } from '../utils/time.js';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, StudentAttendanceEntity } from './types.js';

/**
 * 创建学生签到记录参数
 */
export interface CreateStudentAttendanceParams {
  attendance_record_id: string;
  xh: string;
  xm: string;
  status: AttendanceStatus;
  checkin_time?: Date;
  location_id: string;
  leave_reason?: string;
  leave_type?: 'sick' | 'personal' | 'emergency' | 'other'; // 请假类型
  leave_time?: Date;
  approver_id?: string; // 审批人ID(教师工号)
  approver_name?: string; // 审批人姓名
  approved_time?: Date; // 审批时间
  latitude?: number; // 纬度
  longitude?: number; // 经度
  accuracy?: number; // 定位精度
  remark?: string; // 备注
  ip_address?: string;
  user_agent?: string;
}

/**
 * 更新学生签到记录参数
 */
export interface UpdateStudentAttendanceParams {
  status?: AttendanceStatus;
  checkin_time?: Date;
  location_id?: string;
  leave_reason?: string;
  leave_type?: 'sick' | 'personal' | 'emergency' | 'other'; // 请假类型
  leave_time?: Date;
  approver_id?: string; // 审批人ID(教师工号)
  approver_name?: string; // 审批人姓名
  ip_address?: string;
  user_agent?: string;
}

/**
 * 查询学生签到记录条件
 */
export interface StudentAttendanceQueryConditions {
  attendance_record_id?: string;
  xh?: string;
  status?: AttendanceStatus;
  checkin_time_start?: Date;
  checkin_time_end?: Date;
}

/**
 * 学生签到统计结果
 */
export interface StudentAttendanceStats {
  total_count: number;
  present_count: number;
  absent_count: number;
  leave_count: number;
  present_rate: number;
}

/**
 * 学生签到仓库类
 */
export class StudentAttendanceRepository extends BaseRepository {
  constructor(db: Kysely<ExtendedDatabase>, log: Logger) {
    super(db, log);
  }

  /**
   * 创建学生签到记录
   */
  async createStudentAttendance(
    params: CreateStudentAttendanceParams
  ): Promise<StudentAttendanceEntity> {
    try {
      const id = randomUUID();
      const now = new Date();

      this.log.debug(
        {
          attendanceRecordId: params.attendance_record_id,
          studentId: params.xh,
          status: params.status
        },
        '创建学生签到记录'
      );

      await this.db
        .insertInto('icalink_student_attendance')
        .values({
          id,
          attendance_record_id: params.attendance_record_id,
          xh: params.xh,
          xm: params.xm,
          status: params.status,
          checkin_time: params.checkin_time || null,
          location_id: params.location_id,
          leave_reason: params.leave_reason || null,
          leave_type: params.leave_type || null,
          leave_time: params.leave_time || null,
          approver_id: params.approver_id || null,
          approver_name: params.approver_name || null,
          approved_time: params.approved_time || null,
          latitude: params.latitude || null,
          longitude: params.longitude || null,
          accuracy: params.accuracy || null,
          remark: params.remark || null,
          ip_address: params.ip_address || null,
          user_agent: params.user_agent || null,
          created_at: now
        })
        .execute();

      const createdRecord = await this.getStudentAttendanceById(id);
      if (!createdRecord) {
        throw new Error('创建学生签到记录后无法获取记录');
      }

      this.log.info(
        {
          id,
          attendanceRecordId: params.attendance_record_id,
          studentId: params.xh,
          status: params.status
        },
        '学生签到记录创建成功'
      );

      return createdRecord;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId: params.attendance_record_id,
          studentId: params.xh
        },
        '创建学生签到记录失败'
      );
      throw error;
    }
  }

  /**
   * 根据ID获取学生签到记录
   */
  async getStudentAttendanceById(
    id: string
  ): Promise<StudentAttendanceEntity | null> {
    try {
      this.log.debug({ id }, '根据ID获取学生签到记录');

      const result = await this.db
        .selectFrom('icalink_student_attendance')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!result) {
        this.log.debug({ id }, '学生签到记录不存在');
        return null;
      }

      this.log.debug({ id, studentId: result.xh }, '获取学生签到记录成功');
      return result as StudentAttendanceEntity;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id
        },
        '获取学生签到记录失败'
      );
      throw error;
    }
  }

  /**
   * 根据考勤记录ID和学号获取学生签到记录
   */
  async getStudentAttendanceByRecordAndStudent(
    attendanceRecordId: string,
    studentId: string
  ): Promise<StudentAttendanceEntity | null> {
    try {
      this.log.debug(
        { attendanceRecordId, studentId },
        '根据考勤记录ID和学号获取学生签到记录'
      );

      const result = await this.db
        .selectFrom('icalink_student_attendance')
        .selectAll()
        .where('attendance_record_id', '=', attendanceRecordId)
        .where('xh', '=', studentId)
        .executeTakeFirst();

      if (!result) {
        this.log.debug({ attendanceRecordId, studentId }, '学生签到记录不存在');
        return null;
      }

      this.log.debug({ attendanceRecordId, studentId }, '获取学生签到记录成功');
      return result as StudentAttendanceEntity;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId,
          studentId
        },
        '获取学生签到记录失败'
      );
      throw error;
    }
  }

  /**
   * 根据条件查询学生签到记录
   */
  async findStudentAttendances(
    conditions: StudentAttendanceQueryConditions,
    limit?: number,
    offset?: number
  ): Promise<StudentAttendanceEntity[]> {
    try {
      this.log.debug({ conditions, limit, offset }, '查询学生签到记录');

      let query = this.db.selectFrom('icalink_student_attendance').selectAll();

      // 添加查询条件
      if (conditions.attendance_record_id) {
        query = query.where(
          'attendance_record_id',
          '=',
          conditions.attendance_record_id
        );
      }
      if (conditions.xh) {
        query = query.where('xh', '=', conditions.xh);
      }
      if (conditions.status) {
        query = query.where('status', '=', conditions.status);
      }
      if (conditions.checkin_time_start) {
        query = query.where(
          'checkin_time',
          '>=',
          conditions.checkin_time_start
        );
      }
      if (conditions.checkin_time_end) {
        query = query.where('checkin_time', '<=', conditions.checkin_time_end);
      }

      // 添加排序
      query = query.orderBy('created_at', 'desc');

      // 添加分页
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.offset(offset);
      }

      const results = await query.execute();

      this.log.debug(
        { conditions, count: results.length },
        '查询学生签到记录完成'
      );

      return results as StudentAttendanceEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          conditions
        },
        '查询学生签到记录失败'
      );
      throw error;
    }
  }

  /**
   * 更新学生签到记录
   */
  async updateStudentAttendance(
    id: string,
    updates: UpdateStudentAttendanceParams
  ): Promise<void> {
    try {
      this.log.debug({ id, updates }, '更新学生签到记录');

      const result = await this.db
        .updateTable('icalink_student_attendance')
        .set(updates)
        .where('id', '=', id)
        .execute();

      if (result.length === 0) {
        throw new Error('学生签到记录不存在或更新失败');
      }

      this.log.info({ id }, '学生签到记录更新成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id,
          updates
        },
        '更新学生签到记录失败'
      );
      throw error;
    }
  }

  /**
   * 删除学生签到记录
   */
  async deleteStudentAttendance(id: string): Promise<void> {
    try {
      this.log.debug({ id }, '删除学生签到记录');

      const result = await this.db
        .deleteFrom('icalink_student_attendance')
        .where('id', '=', id)
        .execute();

      if (result.length === 0) {
        throw new Error('学生签到记录不存在或删除失败');
      }

      this.log.info({ id }, '学生签到记录删除成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id
        },
        '删除学生签到记录失败'
      );
      throw error;
    }
  }

  /**
   * 获取考勤统计信息
   */
  async getAttendanceStats(
    attendanceRecordId: string
  ): Promise<StudentAttendanceStats> {
    try {
      this.log.debug({ attendanceRecordId }, '获取考勤统计');

      // 首先获取考勤记录信息
      const attendanceRecord = await this.db
        .selectFrom('icalink_attendance_records')
        .select(['kkh', 'xnxq'])
        .where('id', '=', attendanceRecordId)
        .executeTakeFirst();

      if (!attendanceRecord) {
        this.log.warn({ attendanceRecordId }, '考勤记录不存在');
        return {
          total_count: 0,
          present_count: 0,
          absent_count: 0,
          leave_count: 0,
          present_rate: 0
        };
      }

      // 获取这门课的总学生数
      const totalStudentsResult = await this.db
        .selectFrom('out_jw_kcb_xs')
        .select([this.db.fn.count('xh').as('total')])
        .where('kkh', '=', attendanceRecord.kkh)
        .where('xnxq', '=', attendanceRecord.xnxq)
        .executeTakeFirst();

      const totalCount = Number(totalStudentsResult?.total || 0);

      // 获取已有签到记录的统计
      const stats = await this.db
        .selectFrom('icalink_student_attendance')
        .select(['status', this.db.fn.count('id').as('count')])
        .where('attendance_record_id', '=', attendanceRecordId)
        .groupBy('status')
        .execute();

      let presentCount = 0;
      let leaveCount = 0;
      let recordedCount = 0; // 已有记录的学生数

      stats.forEach((stat: any) => {
        const count = Number(stat.count);
        recordedCount += count;

        switch (stat.status) {
          case 'present':
          case 'pending_approval': // 待审批的签到也算作已签到
            presentCount += count;
            break;
          case 'leave':
          case 'leave_pending': // 待审批的请假也算作请假
            leaveCount += count;
            break;
          // absent 状态的学生已经在数据库中有记录了
        }
      });

      // 没有记录的学生默认为旷课
      const absentCount = totalCount - presentCount - leaveCount;

      const presentRate =
        totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

      const result: StudentAttendanceStats = {
        total_count: totalCount,
        present_count: presentCount,
        absent_count: absentCount,
        leave_count: leaveCount,
        present_rate: Math.round(presentRate * 100) / 100
      };

      this.log.debug(
        {
          attendanceRecordId,
          stats: result,
          recordedStudents: recordedCount,
          totalStudents: totalCount
        },
        '获取考勤统计完成'
      );

      return result;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId
        },
        '获取考勤统计失败'
      );
      throw error;
    }
  }

  /**
   * 批量创建学生签到记录
   */
  async batchCreateStudentAttendances(
    attendanceRecordId: string,
    students: Array<{
      xh: string;
      xm: string;
      location_id: string;
    }>,
    defaultStatus: AttendanceStatus = AttendanceStatus.ABSENT
  ): Promise<StudentAttendanceEntity[]> {
    try {
      this.log.debug(
        {
          attendanceRecordId,
          studentCount: students.length,
          defaultStatus
        },
        '批量创建学生签到记录'
      );

      const now = new Date();
      const records = students.map((student) => ({
        id: randomUUID(),
        attendance_record_id: attendanceRecordId,
        xh: student.xh,
        xm: student.xm,
        status: defaultStatus,
        checkin_time: null,
        location_id: student.location_id,
        leave_reason: null,
        leave_time: null,
        approver_id: null,
        approver_name: null,
        ip_address: null,
        user_agent: null,
        created_at: now
      }));

      await this.db
        .insertInto('icalink_student_attendance')
        .values(records)
        .execute();

      this.log.info(
        {
          attendanceRecordId,
          createdCount: records.length
        },
        '批量创建学生签到记录成功'
      );

      return records as StudentAttendanceEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId,
          studentCount: students.length
        },
        '批量创建学生签到记录失败'
      );
      throw error;
    }
  }

  /**
   * 获取学生的签到历史记录
   */
  async getStudentAttendanceHistory(
    studentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StudentAttendanceEntity[]> {
    try {
      this.log.debug({ studentId, limit, offset }, '获取学生签到历史记录');

      const results = await this.db
        .selectFrom('icalink_student_attendance')
        .selectAll()
        .where('xh', '=', studentId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      this.log.debug(
        { studentId, count: results.length },
        '获取学生签到历史记录完成'
      );

      return results as StudentAttendanceEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          studentId
        },
        '获取学生签到历史记录失败'
      );
      throw error;
    }
  }

  /**
   * 检查学生是否已签到
   */
  async isStudentCheckedIn(
    attendanceRecordId: string,
    studentId: string
  ): Promise<boolean> {
    try {
      const record = await this.getStudentAttendanceByRecordAndStudent(
        attendanceRecordId,
        studentId
      );

      return record !== null && record.status === AttendanceStatus.PRESENT;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId,
          studentId
        },
        '检查学生签到状态失败'
      );
      throw error;
    }
  }

  /**
   * 获取考勤记录的签到学生列表
   */
  async getCheckedInStudents(
    attendanceRecordId: string
  ): Promise<StudentAttendanceEntity[]> {
    try {
      this.log.debug({ attendanceRecordId }, '获取已签到学生列表');

      const results = await this.db
        .selectFrom('icalink_student_attendance')
        .selectAll()
        .where('attendance_record_id', '=', attendanceRecordId)
        .where('status', '=', AttendanceStatus.PRESENT)
        .orderBy('checkin_time', 'asc')
        .execute();

      this.log.debug(
        { attendanceRecordId, count: results.length },
        '获取已签到学生列表完成'
      );

      return results as StudentAttendanceEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId
        },
        '获取已签到学生列表失败'
      );
      throw error;
    }
  }

  /**
   * 获取考勤记录的所有学生打卡详情（包含学生基本信息）
   */
  async getAttendanceRecordWithStudentDetails(
    attendanceRecordId: string
  ): Promise<
    Array<{
      id: string;
      xh: string;
      xm: string;
      bjmc?: string;
      zymc?: string;
      status: AttendanceStatus;
      checkin_time?: Date;
      leave_time?: Date;
      leave_reason?: string;
      location_id?: string;
      ip_address?: string;
      user_agent?: string;
      created_at: Date;
    }>
  > {
    try {
      this.log.debug({ attendanceRecordId }, '获取考勤记录的所有学生打卡详情');

      // 首先获取考勤记录信息
      const attendanceRecord = await this.db
        .selectFrom('icalink_attendance_records')
        .select(['kkh', 'xnxq'])
        .where('id', '=', attendanceRecordId)
        .executeTakeFirst();

      if (!attendanceRecord) {
        this.log.warn({ attendanceRecordId }, '考勤记录不存在');
        return [];
      }

      // 查询这门课的所有学生（从学生课表中获取）
      const courseStudents = await this.db
        .selectFrom('out_jw_kcb_xs')
        .innerJoin('out_xsxx', 'out_jw_kcb_xs.xh', 'out_xsxx.xh')
        .select([
          'out_jw_kcb_xs.xh',
          'out_xsxx.xm',
          'out_xsxx.bjmc',
          'out_xsxx.zymc'
        ])
        .where('out_jw_kcb_xs.kkh', '=', attendanceRecord.kkh)
        .where('out_jw_kcb_xs.xnxq', '=', attendanceRecord.xnxq)
        .execute();

      // 查询已有的签到记录
      const existingAttendances = await this.db
        .selectFrom('icalink_student_attendance')
        .selectAll()
        .where('attendance_record_id', '=', attendanceRecordId)
        .execute();

      // 创建签到记录映射
      const attendanceMap = new Map();
      existingAttendances.forEach((attendance: any) => {
        attendanceMap.set(attendance.xh, attendance);
      });

      // 合并学生信息和签到记录
      const results = courseStudents.map((student: any) => {
        const attendance = attendanceMap.get(student.xh);

        if (attendance) {
          // 有签到记录的学生
          return {
            id: attendance.id,
            xh: student.xh,
            xm: student.xm || attendance.xm,
            bjmc: student.bjmc || undefined,
            zymc: student.zymc || undefined,
            status: attendance.status as AttendanceStatus,
            checkin_time: attendance.checkin_time || undefined,
            leave_time: attendance.leave_time || undefined,
            leave_reason: attendance.leave_reason || undefined,
            location_id: attendance.location_id || undefined,
            ip_address: attendance.ip_address || undefined,
            user_agent: attendance.user_agent || undefined,
            created_at: attendance.created_at
          };
        } else {
          // 没有签到记录的学生，默认为旷课状态
          return {
            id: '', // 没有签到记录ID
            xh: student.xh,
            xm: student.xm,
            bjmc: student.bjmc || undefined,
            zymc: student.zymc || undefined,
            status: AttendanceStatus.ABSENT,
            checkin_time: undefined,
            leave_time: undefined,
            leave_reason: undefined,
            location_id: undefined,
            ip_address: undefined,
            user_agent: undefined,
            created_at: new Date() // 使用当前时间作为默认值
          };
        }
      });

      // 按状态和姓名排序
      results.sort((a, b) => {
        // 首先按状态排序：present, leave, absent
        const statusOrder: Record<string, number> = {
          present: 1,
          leave: 2,
          leave_pending: 3,
          pending_approval: 4,
          absent: 5
        };
        const statusDiff =
          (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
        if (statusDiff !== 0) return statusDiff;

        // 然后按姓名排序
        return a.xm.localeCompare(b.xm);
      });

      this.log.debug(
        {
          attendanceRecordId,
          totalStudents: courseStudents.length,
          withAttendance: existingAttendances.length,
          resultCount: results.length
        },
        '获取考勤记录的所有学生打卡详情完成'
      );

      return results;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId
        },
        '获取考勤记录的所有学生打卡详情失败'
      );
      throw error;
    }
  }

  /**
   * 获取学生请假申请记录
   */
  async getStudentLeaveApplications(
    studentId: string,
    status?: 'all' | 'leave_pending' | 'leave' | 'leave_rejected',
    startDate?: Date,
    endDate?: Date,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    applications: Array<{
      id: string;
      course_name: string;
      class_date: string;
      class_time: string;
      class_location?: string;
      teacher_name: string;
      leave_type: string;
      leave_reason: string;
      application_time: string;
      status: 'leave_pending' | 'leave' | 'leave_rejected';
      approval_time?: string;
      approval_comment?: string;
      course_info: {
        kcmc: string;
        room_s: string;
        xm_s: string;
        jc_s: string;
        jxz: number | null;
        lq: string | null;
        course_start_time: string;
        course_end_time: string;
      };
      attachments: Array<{
        id: string;
        file_name: string;
        file_size: number;
        file_type: string;
        upload_time: string;
      }>;
      approvals: Array<{
        id: string;
        approver_id: string;
        approver_name: string;
        approval_result: 'pending' | 'approved' | 'rejected' | 'cancelled';
        approval_comment?: string;
        approval_time?: string;
      }>;
    }>;
    total: number;
  }> {
    try {
      this.log.debug(
        { studentId, status, startDate, endDate, limit, offset },
        '查询学生请假审批记录'
      );

      // 获取总数 - 创建单独的计数查询（移除有问题的LEFT JOIN）
      let countQuery = this.db
        .selectFrom('icalink_student_attendance')
        .innerJoin(
          'icalink_attendance_records',
          'icalink_student_attendance.attendance_record_id',
          'icalink_attendance_records.id'
        )
        .where('icalink_student_attendance.xh', '=', studentId)
        .where('icalink_student_attendance.leave_reason', 'is not', null)
        .where('icalink_student_attendance.leave_reason', '!=', '');

      // 应用相同的筛选条件
      if (status && status !== 'all') {
        countQuery = countQuery.where(
          'icalink_student_attendance.status',
          '=',
          status
        );
      }

      if (startDate) {
        countQuery = countQuery.where(
          'icalink_attendance_records.rq',
          '>=',
          startDate.toISOString().split('T')[0]
        );
      }
      if (endDate) {
        countQuery = countQuery.where(
          'icalink_attendance_records.rq',
          '<=',
          endDate.toISOString().split('T')[0]
        );
      }

      const countResult = await countQuery
        .select(this.db.fn.count('icalink_student_attendance.id').as('total'))
        .executeTakeFirst();
      const total = Number(countResult?.total || 0);

      // 获取分页数据 - 创建单独的数据查询
      let dataQuery = this.db
        .selectFrom('icalink_student_attendance')
        .innerJoin(
          'icalink_attendance_records',
          'icalink_student_attendance.attendance_record_id',
          'icalink_attendance_records.id'
        )
        .select([
          'icalink_student_attendance.id',
          'icalink_attendance_records.kcmc as course_name',
          'icalink_attendance_records.rq as class_date',
          'icalink_attendance_records.sj_f as start_time',
          'icalink_attendance_records.sj_t as end_time',
          'icalink_attendance_records.kkh',
          'icalink_attendance_records.xnxq',
          'icalink_attendance_records.jxz',
          'icalink_attendance_records.jc_s',
          'icalink_attendance_records.lq',
          'icalink_attendance_records.sjd',
          'icalink_student_attendance.approver_name as teacher_name',
          'icalink_student_attendance.leave_reason',
          'icalink_student_attendance.leave_type',
          'icalink_student_attendance.leave_time as application_time',
          'icalink_student_attendance.status',
          'icalink_student_attendance.created_at'
        ])
        .where('icalink_student_attendance.xh', '=', studentId)
        .where('icalink_student_attendance.leave_reason', 'is not', null)
        .where('icalink_student_attendance.leave_reason', '!=', '');

      // 应用相同的筛选条件
      if (status && status !== 'all') {
        dataQuery = dataQuery.where(
          'icalink_student_attendance.status',
          '=',
          status
        );
      }

      if (startDate) {
        dataQuery = dataQuery.where(
          'icalink_attendance_records.rq',
          '>=',
          startDate.toISOString().split('T')[0]
        );
      }
      if (endDate) {
        dataQuery = dataQuery.where(
          'icalink_attendance_records.rq',
          '<=',
          endDate.toISOString().split('T')[0]
        );
      }

      const results = await dataQuery
        .orderBy('icalink_student_attendance.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      // 获取教室信息的映射
      const courseIds = [...new Set(results.map((r) => r.kkh))];
      const classLocationMap = new Map<string, string>();

      if (courseIds.length > 0) {
        const locationResults = await this.db
          .selectFrom('u_jw_kcb_cur')
          .select(['kkh', 'room'])
          .where('kkh', 'in', courseIds)
          .groupBy(['kkh', 'room'])
          .execute();

        locationResults.forEach((loc) => {
          if (loc.room && !classLocationMap.has(loc.kkh)) {
            classLocationMap.set(loc.kkh, loc.room);
          }
        });
      }

      // 获取完整的课程信息 - 从聚合任务表获取
      const courseInfoMap = new Map<string, any>();
      if (results.length > 0) {
        const courseQueries = results.map((result: any) => ({
          kkh: result.kkh,
          xnxq: result.xnxq,
          rq: result.class_date,
          sjd: result.sjd
        }));

        // 批量查询聚合任务表获取完整课程信息
        for (const query of courseQueries) {
          const key = `${query.kkh}_${query.rq}_${query.sjd}`;
          if (!courseInfoMap.has(key)) {
            try {
              const courseAggregateResults = await this.db
                .selectFrom('juhe_renwu')
                .select([
                  'kkh',
                  'kcmc',
                  'room_s',
                  'xm_s',
                  'jc_s',
                  'jxz',
                  'lq',
                  'sj_f',
                  'sj_t',
                  'rq'
                ])
                .where('kkh', '=', query.kkh)
                .where('xnxq', '=', query.xnxq)
                .where('rq', '=', query.rq)
                .where('sjd', '=', query.sjd)
                .executeTakeFirst();

              if (courseAggregateResults) {
                courseInfoMap.set(key, courseAggregateResults);
              }
            } catch (error) {
              this.log.warn(
                {
                  error: error instanceof Error ? error.message : String(error),
                  query
                },
                '获取聚合课程信息失败，使用默认值'
              );
            }
          }
        }
      }

      // 获取所有请假申请的附件信息
      const applicationIds = results.map((r) => r.id);
      const attachmentsMap = new Map<
        string,
        Array<{
          id: string;
          file_name: string;
          file_size: number;
          file_type: string;
          upload_time: string;
        }>
      >();

      if (applicationIds.length > 0) {
        try {
          const attachmentResults = await this.db
            .selectFrom('icalink_leave_attachments')
            .select([
              'id',
              'application_id',
              'file_name',
              'file_size',
              'file_type',
              'upload_time'
            ])
            .where('application_id', 'in', applicationIds)
            .execute();

          // 按申请ID分组附件
          attachmentResults.forEach((attachment) => {
            if (!attachmentsMap.has(attachment.application_id)) {
              attachmentsMap.set(attachment.application_id, []);
            }
            attachmentsMap.get(attachment.application_id)!.push({
              id: attachment.id,
              file_name: attachment.file_name,
              file_size: attachment.file_size,
              file_type: attachment.file_type,
              upload_time: attachment.upload_time.toISOString()
            });
          });
        } catch (error) {
          this.log.warn(
            {
              error: error instanceof Error ? error.message : String(error),
              applicationIds
            },
            '获取请假申请附件信息失败'
          );
        }
      }

      // 获取所有请假申请的审批信息
      const approvalsMap = new Map<
        string,
        Array<{
          id: string;
          approver_id: string;
          approver_name: string;
          approval_result: 'pending' | 'approved' | 'rejected' | 'cancelled';
          approval_comment?: string;
          approval_time?: string;
        }>
      >();

      if (applicationIds.length > 0) {
        try {
          const approvalResults = await this.db
            .selectFrom('icalink_leave_approvals')
            .select([
              'id',
              'application_id',
              'approver_id',
              'approver_name',
              'approval_result',
              'approval_comment',
              'approval_time'
            ])
            .where('application_id', 'in', applicationIds)
            .execute();

          // 按申请ID分组审批记录
          approvalResults.forEach((approval) => {
            if (!approvalsMap.has(approval.application_id)) {
              approvalsMap.set(approval.application_id, []);
            }
            approvalsMap.get(approval.application_id)!.push({
              id: approval.id,
              approver_id: approval.approver_id,
              approver_name: approval.approver_name,
              approval_result: approval.approval_result,
              approval_comment: approval.approval_comment || undefined,
              approval_time: approval.approval_time?.toISOString() || undefined
            });
          });
        } catch (error) {
          this.log.warn(
            {
              error: error instanceof Error ? error.message : String(error),
              applicationIds
            },
            '获取请假申请审批信息失败'
          );
        }
      }

      const applications = results.map((result: any) => {
        // 直接使用数据库中的状态
        let applicationStatus: 'leave_pending' | 'leave' | 'leave_rejected';
        if (result.status === 'leave_pending') {
          applicationStatus = 'leave_pending';
        } else if (result.status === 'leave') {
          applicationStatus = 'leave';
        } else if (result.status === 'leave_rejected') {
          applicationStatus = 'leave_rejected';
        } else {
          // 其他状态但有请假原因的，认为是被拒绝的
          applicationStatus = 'leave_rejected';
        }

        // 使用数据库中的请假类型，如果为空则默认为'other'
        const leaveType = result.leave_type || 'other';

        // 获取完整的课程信息
        const courseKey = `${result.kkh}_${result.class_date}_${result.sjd}`;
        const courseInfo = courseInfoMap.get(courseKey);

        // 构建课程开始和结束时间 - 使用工具函数
        const classDate = result.class_date;
        const startTime = result.start_time;
        const endTime = result.end_time;

        const { courseStartTime, courseEndTime } = calculateCourseTimeAndStatus(
          classDate,
          startTime,
          endTime
        );

        return {
          id: result.id,
          course_name: result.course_name,
          class_date: result.class_date,
          class_time: `${result.start_time} - ${result.end_time}`,
          class_location: classLocationMap.get(result.kkh) || undefined,
          teacher_name: result.teacher_name || '',
          leave_type: leaveType,
          leave_reason: result.leave_reason || '',
          application_time:
            result.application_time?.toISOString() ||
            result.created_at.toISOString(),
          status: applicationStatus,
          approval_time:
            applicationStatus !== 'leave_pending'
              ? result.application_time?.toISOString() ||
                result.created_at.toISOString()
              : undefined,
          approval_comment: undefined, // 当前数据结构中没有审批意见
          course_info: {
            kcmc: courseInfo?.kcmc || result.course_name,
            room_s:
              courseInfo?.room_s || classLocationMap.get(result.kkh) || '',
            xm_s: courseInfo?.xm_s || result.teacher_name || '',
            jc_s: courseInfo?.jc_s || result.jc_s || '',
            jxz: courseInfo?.jxz ? parseInt(courseInfo.jxz) : result.jxz,
            lq: courseInfo?.lq || result.lq || null,
            course_start_time: courseStartTime.toISOString(),
            course_end_time: courseEndTime.toISOString()
          },
          attachments: attachmentsMap.get(result.id) || [],
          approvals: approvalsMap.get(result.id) || []
        };
      });

      this.log.debug(
        { studentId, total, count: applications.length },
        '查询学生请假审批记录完成'
      );

      return { applications, total };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          studentId
        },
        '查询学生请假审批记录失败'
      );
      throw error;
    }
  }

  /**
   * 获取学生请假审批统计信息
   */
  async getStudentLeaveApplicationStats(
    studentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total_count: number;
    leave_pending_count: number;
    leave_count: number;
    leave_rejected_count: number;
  }> {
    try {
      this.log.debug(
        { studentId, startDate, endDate },
        '获取学生请假审批统计信息'
      );

      let query = this.db
        .selectFrom('icalink_student_attendance')
        .innerJoin(
          'icalink_attendance_records',
          'icalink_student_attendance.attendance_record_id',
          'icalink_attendance_records.id'
        )
        .where('icalink_student_attendance.xh', '=', studentId)
        .where('icalink_student_attendance.leave_reason', 'is not', null)
        .where('icalink_student_attendance.leave_reason', '!=', '');

      // 日期范围筛选
      if (startDate) {
        query = query.where(
          'icalink_attendance_records.rq',
          '>=',
          startDate.toISOString().split('T')[0]
        );
      }
      if (endDate) {
        query = query.where(
          'icalink_attendance_records.rq',
          '<=',
          endDate.toISOString().split('T')[0]
        );
      }

      const results = await query
        .select([
          'icalink_student_attendance.status',
          this.db.fn.count('icalink_student_attendance.id').as('count')
        ])
        .groupBy('icalink_student_attendance.status')
        .execute();

      let totalCount = 0;
      let leavePendingCount = 0;
      let leaveCount = 0;
      let leaveRejectedCount = 0;

      results.forEach((result: any) => {
        const count = Number(result.count);
        totalCount += count;

        if (result.status === 'leave_pending') {
          leavePendingCount = count;
        } else if (result.status === 'leave') {
          leaveCount = count;
        } else if (result.status === 'leave_rejected') {
          leaveRejectedCount = count;
        } else {
          // 其他状态但有请假原因的，认为是被拒绝的
          leaveRejectedCount += count;
        }
      });

      this.log.debug(
        {
          studentId,
          totalCount,
          leavePendingCount,
          leaveCount,
          leaveRejectedCount
        },
        '获取学生请假审批统计信息完成'
      );

      return {
        total_count: totalCount,
        leave_pending_count: leavePendingCount,
        leave_count: leaveCount,
        leave_rejected_count: leaveRejectedCount
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          studentId
        },
        '获取学生请假审批统计信息失败'
      );
      throw error;
    }
  }

  /**
   * 教师查询请假申请记录
   */
  async getTeacherLeaveApplications(
    teacherId: string,
    status?: 'pending' | 'processed',
    startDate?: Date,
    endDate?: Date,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    applications: Array<{
      id: string;
      student: {
        student_id: string;
        student_name: string;
        class_name?: string;
      };
      course: {
        course_name: string;
        class_time: string;
        class_location?: string;
        kcmc: string;
        room_s: string;
        xm_s: string;
        jc_s: string;
        jxz: number | null;
        lq: string | null;
        course_start_time: string;
        course_end_time: string;
      };
      leave_info: {
        leave_type: string;
        leave_date: string;
        leave_reason: string;
      };
      application_time: string;
      status: 'pending' | 'approved' | 'rejected';
      approval_time?: string;
      approval_comment?: string;
    }>;
    total: number;
  }> {
    try {
      this.log.debug(
        { teacherId, status, startDate, endDate, limit, offset },
        '教师查询请假申请记录'
      );

      // 构建查询条件 - 查询所有有请假原因的记录（表示这是请假申请）
      let query = this.db
        .selectFrom('icalink_student_attendance')
        .innerJoin(
          'icalink_attendance_records',
          'icalink_student_attendance.attendance_record_id',
          'icalink_attendance_records.id'
        )
        .leftJoin('out_xsxx', 'icalink_student_attendance.xh', 'out_xsxx.xh')
        .leftJoin('juhe_renwu', (join) =>
          join
            .onRef('juhe_renwu.kkh', '=', 'icalink_attendance_records.kkh')
            .onRef('juhe_renwu.rq', '=', 'icalink_attendance_records.rq')
            .onRef('juhe_renwu.sj_f', '=', 'icalink_attendance_records.sj_f')
        )
        .select([
          'icalink_student_attendance.id',
          'icalink_student_attendance.xh as student_id',
          'icalink_student_attendance.xm as student_name',
          'out_xsxx.bjmc as class_name',
          'icalink_attendance_records.kcmc as course_name',
          'icalink_attendance_records.rq as class_date',
          'icalink_attendance_records.sj_f as start_time',
          'icalink_attendance_records.sj_t as end_time',
          'icalink_attendance_records.kkh',
          'icalink_attendance_records.xnxq',
          'icalink_attendance_records.jxz',
          'icalink_attendance_records.jc_s',
          'icalink_attendance_records.lq',
          'icalink_attendance_records.sjd',
          'juhe_renwu.room_s as class_location',
          'icalink_student_attendance.leave_reason',
          'icalink_student_attendance.leave_time as application_time',
          'icalink_student_attendance.status',
          'icalink_student_attendance.created_at'
        ])
        .where('icalink_student_attendance.leave_reason', 'is not', null)
        .where('icalink_student_attendance.leave_reason', '!=', '');

      // 教师筛选条件 - 通过课程关联查找该教师的课程
      // 由于当前数据结构中approver_id可能没有正确设置，我们通过课程表来查找
      const teacherCoursesQuery = this.db
        .selectFrom('juhe_renwu')
        .select('kkh')
        .where('gh_s', 'like', `%${teacherId}%`)
        .distinct();

      const teacherCourses = await teacherCoursesQuery.execute();
      const courseIds = teacherCourses.map((course) => course.kkh);

      if (courseIds.length === 0) {
        this.log.info({ teacherId }, '该教师没有关联的课程');
        return { applications: [], total: 0 };
      }

      query = query.where('icalink_attendance_records.kkh', 'in', courseIds);

      // 状态筛选
      if (status) {
        if (status === 'pending') {
          query = query.where(
            'icalink_student_attendance.status',
            '=',
            'leave_pending'
          );
        } else if (status === 'processed') {
          query = query.where('icalink_student_attendance.status', 'in', [
            'leave',
            'absent'
          ]);
        }
      }

      // 日期范围筛选
      if (startDate) {
        query = query.where(
          'icalink_attendance_records.rq',
          '>=',
          startDate.toISOString().split('T')[0]
        );
      }
      if (endDate) {
        query = query.where(
          'icalink_attendance_records.rq',
          '<=',
          endDate.toISOString().split('T')[0]
        );
      }

      // 获取总数 - 创建单独的计数查询
      let countQuery = this.db
        .selectFrom('icalink_student_attendance')
        .innerJoin(
          'icalink_attendance_records',
          'icalink_student_attendance.attendance_record_id',
          'icalink_attendance_records.id'
        )
        .where('icalink_student_attendance.leave_reason', 'is not', null)
        .where('icalink_student_attendance.leave_reason', '!=', '')
        .where('icalink_attendance_records.kkh', 'in', courseIds);

      // 应用相同的筛选条件
      if (status) {
        if (status === 'pending') {
          countQuery = countQuery.where(
            'icalink_student_attendance.status',
            '=',
            'leave_pending'
          );
        } else if (status === 'processed') {
          countQuery = countQuery.where(
            'icalink_student_attendance.status',
            'in',
            ['leave', 'absent']
          );
        }
      }

      if (startDate) {
        countQuery = countQuery.where(
          'icalink_attendance_records.rq',
          '>=',
          startDate.toISOString().split('T')[0]
        );
      }
      if (endDate) {
        countQuery = countQuery.where(
          'icalink_attendance_records.rq',
          '<=',
          endDate.toISOString().split('T')[0]
        );
      }

      const countResult = await countQuery
        .select(this.db.fn.count('icalink_student_attendance.id').as('total'))
        .executeTakeFirst();
      const total = Number(countResult?.total || 0);

      this.log.info(
        { teacherId, total, courseCount: courseIds.length },
        '查询到的请假申请总数'
      );

      // 如果没有数据，直接返回空结果
      if (total === 0) {
        this.log.info({ teacherId }, '该教师没有待审批的请假申请');
        return { applications: [], total: 0 };
      }

      // 获取分页数据 - 重新构建数据查询
      let dataQuery = this.db
        .selectFrom('icalink_student_attendance')
        .innerJoin(
          'icalink_attendance_records',
          'icalink_student_attendance.attendance_record_id',
          'icalink_attendance_records.id'
        )
        .leftJoin('out_xsxx', 'icalink_student_attendance.xh', 'out_xsxx.xh')
        .leftJoin('juhe_renwu', (join) =>
          join
            .onRef('juhe_renwu.kkh', '=', 'icalink_attendance_records.kkh')
            .onRef('juhe_renwu.rq', '=', 'icalink_attendance_records.rq')
            .onRef('juhe_renwu.sj_f', '=', 'icalink_attendance_records.sj_f')
        )
        .select([
          'icalink_student_attendance.id',
          'icalink_student_attendance.xh as student_id',
          'icalink_student_attendance.xm as student_name',
          'out_xsxx.bjmc as class_name',
          'icalink_attendance_records.kcmc as course_name',
          'icalink_attendance_records.rq as class_date',
          'icalink_attendance_records.sj_f as start_time',
          'icalink_attendance_records.sj_t as end_time',
          'icalink_attendance_records.kkh',
          'icalink_attendance_records.xnxq',
          'icalink_attendance_records.jxz',
          'icalink_attendance_records.jc_s',
          'icalink_attendance_records.lq',
          'icalink_attendance_records.sjd',
          'juhe_renwu.room_s as class_location',
          'icalink_student_attendance.leave_reason',
          'icalink_student_attendance.leave_time as application_time',
          'icalink_student_attendance.status',
          'icalink_student_attendance.created_at'
        ])
        .where('icalink_student_attendance.leave_reason', 'is not', null)
        .where('icalink_student_attendance.leave_reason', '!=', '')
        .where('icalink_attendance_records.kkh', 'in', courseIds);

      // 应用相同的筛选条件
      if (status) {
        if (status === 'pending') {
          dataQuery = dataQuery.where(
            'icalink_student_attendance.status',
            '=',
            'leave_pending'
          );
        } else if (status === 'processed') {
          dataQuery = dataQuery.where(
            'icalink_student_attendance.status',
            'in',
            ['leave', 'absent']
          );
        }
      }

      if (startDate) {
        dataQuery = dataQuery.where(
          'icalink_attendance_records.rq',
          '>=',
          startDate.toISOString().split('T')[0]
        );
      }
      if (endDate) {
        dataQuery = dataQuery.where(
          'icalink_attendance_records.rq',
          '<=',
          endDate.toISOString().split('T')[0]
        );
      }

      const results = await dataQuery
        .orderBy('icalink_student_attendance.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      this.log.debug(
        {
          teacherId,
          resultCount: results.length,
          sampleResults: results.slice(0, 2).map((r) => ({
            id: r.id,
            student_id: r.student_id,
            student_name: r.student_name,
            status: r.status,
            leave_reason: r.leave_reason?.substring(0, 20)
          }))
        },
        '查询结果详情'
      );

      // 获取完整的课程信息 - 从聚合任务表获取
      const courseInfoMap = new Map<string, any>();
      if (results.length > 0) {
        const courseQueries = results.map((result: any) => ({
          kkh: result.kkh,
          xnxq: result.xnxq,
          rq: result.class_date,
          sjd: result.sjd
        }));

        // 批量查询聚合任务表获取完整课程信息
        for (const query of courseQueries) {
          const key = `${query.kkh}_${query.rq}_${query.sjd}`;
          if (!courseInfoMap.has(key)) {
            try {
              const courseAggregateResults = await this.db
                .selectFrom('juhe_renwu')
                .select([
                  'kkh',
                  'kcmc',
                  'room_s',
                  'xm_s',
                  'jc_s',
                  'jxz',
                  'lq',
                  'sj_f',
                  'sj_t',
                  'rq'
                ])
                .where('kkh', '=', query.kkh)
                .where('xnxq', '=', query.xnxq)
                .where('rq', '=', query.rq)
                .where('sjd', '=', query.sjd)
                .executeTakeFirst();

              if (courseAggregateResults) {
                courseInfoMap.set(key, courseAggregateResults);
              }
            } catch (error) {
              this.log.warn(
                {
                  error: error instanceof Error ? error.message : String(error),
                  query
                },
                '获取聚合课程信息失败，使用默认值'
              );
            }
          }
        }
      }

      const applications = results.map((result: any) => {
        // 根据状态判断请假申请的实际状态
        let applicationStatus: 'pending' | 'approved' | 'rejected';
        if (result.status === 'leave_pending') {
          applicationStatus = 'pending';
        } else if (result.status === 'leave') {
          applicationStatus = 'approved';
        } else {
          // 其他状态但有请假原因的，认为是被拒绝的
          applicationStatus = 'rejected';
        }

        // 根据请假原因推断请假类型
        let leaveType = 'other';
        const reason = result.leave_reason?.toLowerCase() || '';
        if (
          reason.includes('病') ||
          reason.includes('sick') ||
          reason.includes('生病')
        ) {
          leaveType = 'sick';
        } else if (
          reason.includes('事') ||
          reason.includes('personal') ||
          reason.includes('家事')
        ) {
          leaveType = 'personal';
        } else if (
          reason.includes('急') ||
          reason.includes('emergency') ||
          reason.includes('紧急')
        ) {
          leaveType = 'emergency';
        }

        // 获取完整的课程信息
        const courseKey = `${result.kkh}_${result.class_date}_${result.sjd}`;
        const courseInfo = courseInfoMap.get(courseKey);

        // 构建课程开始和结束时间 - 使用工具函数
        const classDate = result.class_date;
        const startTime = result.start_time;
        const endTime = result.end_time;

        const { courseStartTime, courseEndTime } = calculateCourseTimeAndStatus(
          classDate,
          startTime,
          endTime
        );

        return {
          id: result.id,
          student: {
            student_id: result.student_id,
            student_name: result.student_name,
            class_name: result.class_name || undefined
          },
          course: {
            course_name: result.course_name || '未知课程',
            class_time: `${result.start_time || ''} - ${result.end_time || ''}`,
            class_location: result.class_location || undefined,
            kcmc: courseInfo?.kcmc || result.course_name || '未知课程',
            room_s: courseInfo?.room_s || result.class_location || '',
            xm_s: courseInfo?.xm_s || '',
            jc_s: courseInfo?.jc_s || result.jc_s || '',
            jxz: courseInfo?.jxz ? parseInt(courseInfo.jxz) : result.jxz,
            lq: courseInfo?.lq || result.lq || null,
            course_start_time: courseStartTime.toISOString(),
            course_end_time: courseEndTime.toISOString()
          },
          leave_info: {
            leave_type: leaveType,
            leave_date: result.class_date,
            leave_reason: result.leave_reason || ''
          },
          application_time:
            result.application_time?.toISOString() ||
            result.created_at.toISOString(),
          status: applicationStatus,
          approval_time:
            applicationStatus !== 'pending'
              ? result.application_time?.toISOString() ||
                result.created_at.toISOString()
              : undefined,
          approval_comment: undefined // 当前数据结构中没有审批意见
        };
      });

      this.log.debug(
        { teacherId, total, count: applications.length },
        '教师查询请假申请记录完成'
      );

      return { applications, total };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          teacherId,
          stack: error instanceof Error ? error.stack : undefined
        },
        '教师查询请假申请记录失败'
      );
      throw error;
    }
  }

  /**
   * 获取教师请假申请统计信息
   */
  async getTeacherLeaveApplicationStats(
    teacherId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    pending_count: number;
    processed_count: number;
    approved_count: number;
    rejected_count: number;
  }> {
    try {
      this.log.debug(
        { teacherId, startDate, endDate },
        '获取教师请假申请统计信息'
      );

      // 教师筛选条件 - 通过课程关联查找该教师的课程
      const teacherCoursesQuery = this.db
        .selectFrom('u_jw_kcb_cur')
        .select('kkh')
        .where('ghs', 'like', `%${teacherId}%`)
        .distinct();

      const teacherCourses = await teacherCoursesQuery.execute();
      const courseIds = teacherCourses.map((course) => course.kkh);

      if (courseIds.length === 0) {
        this.log.info({ teacherId }, '该教师没有关联的课程');
        return {
          pending_count: 0,
          processed_count: 0,
          approved_count: 0,
          rejected_count: 0
        };
      }

      let query = this.db
        .selectFrom('icalink_student_attendance')
        .innerJoin(
          'icalink_attendance_records',
          'icalink_student_attendance.attendance_record_id',
          'icalink_attendance_records.id'
        )
        .where('icalink_student_attendance.leave_reason', 'is not', null)
        .where('icalink_student_attendance.leave_reason', '!=', '')
        .where('icalink_attendance_records.kkh', 'in', courseIds);

      // 日期范围筛选
      if (startDate) {
        query = query.where(
          'icalink_attendance_records.rq',
          '>=',
          startDate.toISOString().split('T')[0]
        );
      }
      if (endDate) {
        query = query.where(
          'icalink_attendance_records.rq',
          '<=',
          endDate.toISOString().split('T')[0]
        );
      }

      const results = await query
        .select([
          'icalink_student_attendance.status',
          this.db.fn.count('icalink_student_attendance.id').as('count')
        ])
        .groupBy('icalink_student_attendance.status')
        .execute();

      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      results.forEach((result: any) => {
        const count = Number(result.count);

        if (result.status === 'leave_pending') {
          pendingCount = count;
        } else if (result.status === 'leave') {
          approvedCount = count;
        } else {
          // 其他状态但有请假原因的，认为是被拒绝的
          rejectedCount += count;
        }
      });

      const processedCount = approvedCount + rejectedCount;

      this.log.debug(
        {
          teacherId,
          pendingCount,
          processedCount,
          approvedCount,
          rejectedCount,
          courseCount: courseIds.length
        },
        '获取教师请假申请统计信息完成'
      );

      return {
        pending_count: pendingCount,
        processed_count: processedCount,
        approved_count: approvedCount,
        rejected_count: rejectedCount
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          teacherId
        },
        '获取教师请假申请统计信息失败'
      );
      throw error;
    }
  }

  /**
   * 获取课程历史考勤数据
   */
  async getCourseAttendanceHistory(
    kkh: string,
    xnxq?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    course_info: {
      kkh: string;
      course_name: string;
      xnxq: string;
      teachers: Array<{
        gh: string;
        xm: string;
      }>;
    };
    attendance_history: Array<{
      attendance_record_id: string;
      class_date: string;
      class_time: string;
      class_period: string;
      teaching_week?: number;
      classroom?: string;
      total_students: number | string;
      present_count: number | string;
      leave_count: number | string;
      absent_count: number | string;
      attendance_rate: number | string;
      status: 'active' | 'closed';
      course_status: 'not_started' | 'in_progress' | 'finished';
      created_at: string;
    }>;
    overall_stats: {
      total_classes: number;
      average_attendance_rate: number;
      total_students: number | string;
      total_present: number;
      total_leave: number;
      total_absent: number;
    };
  }> {
    try {
      this.log.info({ kkh, xnxq, startDate, endDate }, '获取课程历史考勤数据');

      // 构建查询条件
      let attendanceQuery = this.db
        .selectFrom('icalink_attendance_records')
        .select([
          'icalink_attendance_records.id',
          'icalink_attendance_records.kkh',
          'icalink_attendance_records.xnxq',
          'icalink_attendance_records.jxz',
          'icalink_attendance_records.kcmc',
          'icalink_attendance_records.rq',
          'icalink_attendance_records.sj_f',
          'icalink_attendance_records.sj_t',
          'icalink_attendance_records.jc_s',
          'icalink_attendance_records.status',
          'icalink_attendance_records.created_at'
        ])
        .where('icalink_attendance_records.kkh', '=', kkh);

      // 学年学期筛选
      if (xnxq) {
        attendanceQuery = attendanceQuery.where(
          'icalink_attendance_records.xnxq',
          '=',
          xnxq
        );
      }

      // 日期范围筛选
      if (startDate) {
        attendanceQuery = attendanceQuery.where(
          'icalink_attendance_records.rq',
          '>=',
          startDate.toISOString().split('T')[0]
        );
      }
      if (endDate) {
        attendanceQuery = attendanceQuery.where(
          'icalink_attendance_records.rq',
          '<=',
          endDate.toISOString().split('T')[0]
        );
      }

      // 按日期排序
      const attendanceRecords = await attendanceQuery
        .orderBy('icalink_attendance_records.rq', 'desc')
        .orderBy('icalink_attendance_records.sj_f', 'desc')
        .execute();

      if (attendanceRecords.length === 0) {
        this.log.info({ kkh }, '未找到该课程的考勤记录');
        throw new Error('未找到该课程的考勤记录');
      }

      // 获取课程基本信息
      const firstRecord = attendanceRecords[0];
      const courseInfo = {
        kkh: firstRecord.kkh,
        course_name: firstRecord.kcmc,
        xnxq: firstRecord.xnxq,
        teachers: [] as Array<{ gh: string; xm: string }>
      };

      // 处理每节课的考勤统计
      const attendanceHistory = [];
      let totalPresent = 0;
      let totalLeave = 0;
      let totalAbsent = 0;
      let totalAttendanceRate = 0;

      for (const record of attendanceRecords) {
        // 获取该节课的学生考勤统计
        const stats = await this.getAttendanceStats(record.id);

        // 判断课程实时状态
        const { courseStatus } = calculateCourseTimeAndStatus(
          record.rq,
          record.sj_f,
          record.sj_t
        );

        // 根据课程状态决定显示数字还是N/A
        const shouldShowNA =
          courseStatus === 'not_started' || courseStatus === 'in_progress';

        const attendanceRate =
          stats.total_count > 0 && !shouldShowNA
            ? Math.round(
                (stats.present_count / stats.total_count) * 100 * 100
              ) / 100
            : shouldShowNA
              ? 'N/A'
              : 0;

        const classStats = {
          attendance_record_id: record.id,
          class_date: record.rq,
          class_time: `${record.sj_f} - ${record.sj_t}`,
          class_period: record.jc_s || '',
          teaching_week: record.jxz || undefined,
          classroom: undefined,
          total_students: shouldShowNA ? 'N/A' : stats.total_count,
          present_count: shouldShowNA ? 'N/A' : stats.present_count,
          leave_count: shouldShowNA ? 'N/A' : stats.leave_count,
          absent_count: shouldShowNA ? 'N/A' : stats.absent_count,
          attendance_rate: attendanceRate,
          status: record.status as 'active' | 'closed',
          course_status: courseStatus,
          created_at: record.created_at.toISOString()
        };

        attendanceHistory.push(classStats);

        // 只有已结束的课程才计入累计统计
        if (courseStatus === 'finished') {
          totalPresent += stats.present_count;
          totalLeave += stats.leave_count;
          totalAbsent += stats.absent_count;
          if (typeof attendanceRate === 'number') {
            totalAttendanceRate += attendanceRate;
          }
        }
      }

      // 计算总体统计
      // 找到第一个已结束的课程来获取总学生数
      const finishedClass = attendanceHistory.find(
        (cls) => cls.course_status === 'finished'
      );

      const overallStats = {
        total_classes: attendanceRecords.length,
        average_attendance_rate:
          attendanceRecords.length > 0
            ? Math.round(
                (totalAttendanceRate / attendanceRecords.length) * 100
              ) / 100
            : 0,
        total_students: finishedClass
          ? finishedClass.total_students
          : attendanceHistory.length > 0
            ? attendanceHistory[0].total_students
            : 0,
        total_present: totalPresent,
        total_leave: totalLeave,
        total_absent: totalAbsent
      };

      this.log.info(
        {
          kkh,
          totalClasses: overallStats.total_classes,
          averageRate: overallStats.average_attendance_rate
        },
        '获取课程历史考勤数据完成'
      );

      return {
        course_info: courseInfo,
        attendance_history: attendanceHistory,
        overall_stats: overallStats
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          kkh,
          stack: error instanceof Error ? error.stack : undefined
        },
        '获取课程历史考勤数据失败'
      );
      throw error;
    }
  }

  /**
   * 教师审批请假申请
   */
  async approveLeaveApplication(
    applicationId: string,
    teacherId: string,
    action: 'approve' | 'reject',
    comment?: string
  ): Promise<{
    application_id: string;
    status: 'approved' | 'rejected';
    approval_time: string;
    approval_comment?: string;
    application_details: {
      course_name: string;
      class_date: string;
      class_time: string;
      class_location?: string;
      teacher_name: string;
      leave_type: string;
      leave_reason: string;
      application_time: string;
      student_info: {
        student_id: string;
        student_name: string;
        class_name?: string;
        major_name?: string;
      };
      teacher_info: {
        teacher_id: string;
        teacher_name: string;
      };
      attachments: Array<{
        id: string;
        file_name: string;
        file_size: number;
        file_type: string;
        upload_time: string;
      }>;
    };
  }> {
    try {
      this.log.debug(
        { applicationId, teacherId, action, comment },
        '教师审批请假申请'
      );

      // 检查申请是否存在且属于该教师审批
      const application = await this.db
        .selectFrom('icalink_student_attendance')
        .selectAll()
        .where('id', '=', applicationId)
        .where('approver_id', '=', teacherId)
        .where('status', '=', 'leave_pending')
        .executeTakeFirst();

      if (!application) {
        throw new Error('未找到待审批的请假申请或无权限审批');
      }

      const now = new Date();
      const newStatus = action === 'approve' ? 'leave' : 'leave_rejected';

      // 更新审批状态
      await this.db
        .updateTable('icalink_student_attendance')
        .set({
          status: newStatus,
          approved_time: now
        })
        .where('id', '=', applicationId)
        .execute();

      // 获取考勤记录信息
      const attendanceRecord = await this.db
        .selectFrom('icalink_attendance_records')
        .selectAll()
        .where('id', '=', application.attendance_record_id)
        .executeTakeFirst();

      if (!attendanceRecord) {
        throw new Error('未找到关联的考勤记录');
      }

      // 获取学生详细信息
      const studentInfo = await this.db
        .selectFrom('out_xsxx')
        .select(['xh', 'xm', 'bjmc', 'zymc'])
        .where('xh', '=', application.xh)
        .executeTakeFirst();

      // 获取教师详细信息
      const teacherInfo = await this.db
        .selectFrom('out_jsxx')
        .select(['gh', 'xm', 'ssdwmc'])
        .where('gh', '=', teacherId)
        .executeTakeFirst();

      // 获取课程详细信息（教室和时间）
      const courseSchedule = await this.db
        .selectFrom('u_jw_kcb_cur')
        .select('room')
        .select('st')
        .select('ed')
        .where('kkh', '=', attendanceRecord.kkh)
        .where('xnxq', '=', attendanceRecord.xnxq)
        .where('rq', '=', attendanceRecord.rq)
        .executeTakeFirst();

      // 获取附件信息
      const attachments = await this.db
        .selectFrom('icalink_leave_attachments')
        .select(['id', 'file_name', 'file_size', 'file_type', 'upload_time'])
        .where('application_id', '=', applicationId)
        .execute();

      this.log.info('教师审批请假申请成功:', {
        applicationId,
        teacherId,
        action,
        newStatus,
        studentId: application.xh,
        studentName: application.xm
      });

      // 构建课程时间字符串
      const classTime = courseSchedule
        ? `${courseSchedule.st} - ${courseSchedule.ed}`
        : `${attendanceRecord.sj_f} - ${attendanceRecord.sj_t}`;

      // 构建课程日期
      const classDate = new Date(attendanceRecord.rq).toISOString();

      return {
        application_id: applicationId,
        status: action === 'approve' ? 'approved' : 'rejected',
        approval_time: now.toISOString(),
        approval_comment: comment,
        application_details: {
          course_name: attendanceRecord.kcmc,
          class_date: classDate,
          class_time: classTime,
          class_location: courseSchedule?.room || '',
          teacher_name: teacherInfo?.xm || application.approver_name || '',
          leave_type: application.leave_type || 'personal',
          leave_reason: application.leave_reason || '',
          application_time: application.created_at
            ? new Date(application.created_at).toISOString()
            : '',
          student_info: {
            student_id: application.xh || '',
            student_name: application.xm || '',
            class_name: studentInfo?.bjmc || '',
            major_name: studentInfo?.zymc || ''
          },
          teacher_info: {
            teacher_id: teacherId,
            teacher_name: teacherInfo?.xm || application.approver_name || ''
          },
          attachments: attachments.map((att) => ({
            id: att.id,
            file_name: att.file_name,
            file_size: att.file_size || 0,
            file_type: att.file_type || '',
            upload_time: att.upload_time
              ? new Date(att.upload_time).toISOString()
              : ''
          }))
        }
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          applicationId,
          teacherId,
          action
        },
        '教师审批请假申请失败'
      );
      throw error;
    }
  }

  /**
   * 获取个人课程统计
   * 根据课程号统计每个学生的考勤信息
   */
  async getPersonalCourseStats(kkh: string, xnxq?: string): Promise<any> {
    try {
      this.log.info({ kkh, xnxq }, '获取个人课程统计');

      // 1. 获取课程基本信息
      let courseQuery = this.db
        .selectFrom('icalink_attendance_records')
        .select(['kkh', 'kcmc', 'xnxq'])
        .where('kkh', '=', kkh)
        .distinct();

      if (xnxq) {
        courseQuery = courseQuery.where('xnxq', '=', xnxq);
      }

      const courseInfo = await courseQuery.executeTakeFirst();

      if (!courseInfo) {
        throw new Error('未找到该课程信息');
      }

      // 2. 获取该课程的所有考勤记录
      let attendanceRecordsQuery = this.db
        .selectFrom('icalink_attendance_records')
        .select(['id', 'rq', 'sj_f', 'sj_t'])
        .where('kkh', '=', kkh);

      if (xnxq) {
        attendanceRecordsQuery = attendanceRecordsQuery.where(
          'xnxq',
          '=',
          xnxq
        );
      }

      const attendanceRecords = await attendanceRecordsQuery
        .orderBy('rq', 'desc')
        .execute();

      const totalClasses = attendanceRecords.length;

      // 3. 获取该课程的所有学生
      let studentsQuery = this.db
        .selectFrom('out_jw_kcb_xs')
        .innerJoin('out_xsxx', 'out_jw_kcb_xs.xh', 'out_xsxx.xh')
        .select([
          'out_jw_kcb_xs.xh',
          'out_xsxx.xm',
          'out_xsxx.bjmc',
          'out_xsxx.zymc'
        ])
        .where('out_jw_kcb_xs.kkh', '=', kkh);

      if (xnxq) {
        studentsQuery = studentsQuery.where('out_jw_kcb_xs.xnxq', '=', xnxq);
      }

      const students = await studentsQuery.execute();
      const totalStudents = students.length;

      // 4. 获取教师信息 - 获取一条记录里的ghs和xms名称
      const teacherRecord = await this.db
        .selectFrom('u_jw_kcb_cur')
        .select(['ghs', 'xms'])
        .where('kkh', '=', kkh)
        .executeTakeFirst();

      // 处理教师信息，如果ghs是用逗号分割的，则有多位授课教师
      let teachers = '';
      if (teacherRecord) {
        const ghsStr = String(teacherRecord.ghs || '');
        const xmsStr = String(teacherRecord.xms || '');

        if (ghsStr.includes(',')) {
          // 多位教师，使用教师姓名
          teachers = xmsStr;
        } else {
          // 单位教师，使用教师姓名
          teachers = xmsStr;
        }
      }

      // 5. 统计每个学生的考勤情况
      const studentStats = [];
      let totalPresentCount = 0;
      let totalAbsentCount = 0;
      let totalLeaveCount = 0;

      for (const student of students) {
        // 获取该学生的所有考勤记录
        const studentAttendanceRecords = await this.db
          .selectFrom('icalink_student_attendance')
          .leftJoin(
            'icalink_attendance_records',
            'icalink_student_attendance.attendance_record_id',
            'icalink_attendance_records.id'
          )
          .select([
            'icalink_student_attendance.status',
            'icalink_student_attendance.checkin_time',
            'icalink_student_attendance.leave_reason',
            'icalink_attendance_records.rq'
          ])
          .where('icalink_student_attendance.xh', '=', student.xh)
          .where('icalink_attendance_records.kkh', '=', kkh)
          .$if(!!xnxq, (qb) =>
            qb.where('icalink_attendance_records.xnxq', '=', xnxq!)
          )
          .orderBy('icalink_attendance_records.rq', 'desc')
          .execute();

        // 统计各种状态的次数
        let presentCount = 0;
        let absentCount = 0;
        let leaveCount = 0;

        // 计算缺勤次数（总课节数 - 有记录的课节数）
        const recordedClasses = studentAttendanceRecords.length;
        const unrecordedClasses = totalClasses - recordedClasses;
        absentCount += unrecordedClasses; // 没有记录的默认为旷课

        for (const record of studentAttendanceRecords) {
          switch (record.status) {
            case 'present':
              presentCount++;
              break;
            case 'leave':
            case 'leave_pending':
              leaveCount++;
              break;
            case 'absent':
            default:
              absentCount++;
              break;
          }
        }

        // 计算出勤率
        const attendanceRate =
          totalClasses > 0
            ? Math.round((presentCount / totalClasses) * 100 * 100) / 100
            : 0;

        // 获取最近的考勤记录（最多5条）
        const recentRecords = studentAttendanceRecords
          .slice(0, 5)
          .map((record) => ({
            class_date: String(record.rq || ''),
            status: String(record.status || 'absent'),
            checkin_time: record.checkin_time?.toISOString(),
            leave_reason: record.leave_reason || undefined
          }));

        studentStats.push({
          xh: String(student.xh),
          xm: String(student.xm || ''),
          bjmc: student.bjmc || undefined,
          zymc: student.zymc || undefined,
          attendance_rate: attendanceRate,
          present_count: presentCount,
          absent_count: absentCount,
          leave_count: leaveCount,
          total_classes: totalClasses,
          recent_records: recentRecords
        });

        // 累计总体统计
        totalPresentCount += presentCount;
        totalAbsentCount += absentCount;
        totalLeaveCount += leaveCount;
      }

      // 计算整体出勤率
      const totalExpectedAttendance = totalClasses * totalStudents;
      const overallAttendanceRate =
        totalExpectedAttendance > 0
          ? Math.round(
              (totalPresentCount / totalExpectedAttendance) * 100 * 100
            ) / 100
          : 0;

      // 按出勤率降序排序
      studentStats.sort((a, b) => b.attendance_rate - a.attendance_rate);

      const result = {
        course_info: {
          kkh: String(courseInfo.kkh),
          course_name: String(courseInfo.kcmc),
          xnxq: String(courseInfo.xnxq),
          total_classes: totalClasses,
          total_students: totalStudents,
          overall_attendance_rate: overallAttendanceRate,
          teachers: teachers
        },
        student_stats: studentStats
      };

      this.log.info('获取个人课程统计成功:', {
        kkh,
        courseName: courseInfo.kcmc,
        totalClasses,
        totalStudents,
        overallAttendanceRate,
        studentCount: studentStats.length
      });

      return result;
    } catch (error) {
      this.log.error('获取个人课程统计失败:', {
        error: error instanceof Error ? error.message : String(error),
        kkh,
        xnxq,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * 撤回学生请假申请
   * 删除学生签到记录，并将关联的审批记录状态改为cancelled
   */
  async withdrawStudentLeaveApplication(
    studentId: string,
    attendanceRecordId: string
  ): Promise<{
    success: boolean;
    message: string;
    deletedAttendanceId?: string;
    cancelledApprovalIds?: string[];
  }> {
    try {
      this.log.debug({ studentId, attendanceRecordId }, '开始撤回学生请假申请');

      // 1. 查找学生的签到记录
      const studentAttendance = await this.db
        .selectFrom('icalink_student_attendance')
        .selectAll()
        .where('xh', '=', studentId)
        .where('id', '=', attendanceRecordId)
        .executeTakeFirst();

      if (!studentAttendance) {
        return {
          success: false,
          message: '未找到对应的签到记录'
        };
      }

      // 2. 检查状态是否允许撤回
      const allowedStatuses = ['leave_pending', 'leave_rejected', 'leave'];
      if (!allowedStatuses.includes(studentAttendance.status)) {
        return {
          success: false,
          message: `当前状态 "${studentAttendance.status}" 不允许撤回，只有 "leave_pending"、"leave_rejected"、"leave" 状态可以撤回`
        };
      }

      // 3. 查找关联的审批记录
      const approvalRecords = await this.db
        .selectFrom('icalink_leave_approvals')
        .select(['id', 'approval_result'])
        .where('application_id', '=', studentAttendance.id)
        .execute();

      this.log.debug(
        {
          studentId,
          attendanceRecordId,
          studentAttendanceId: studentAttendance.id,
          currentStatus: studentAttendance.status,
          approvalCount: approvalRecords.length
        },
        '找到签到记录和审批记录'
      );

      // 4. 开始事务处理
      const result = await this.db.transaction().execute(async (trx) => {
        // 4.1 删除学生签到记录
        await trx
          .deleteFrom('icalink_student_attendance')
          .where('id', '=', studentAttendance.id)
          .execute();

        // 4.2 更新关联的审批记录状态为 cancelled
        const cancelledApprovalIds: string[] = [];
        if (approvalRecords.length > 0) {
          const approvalIds = approvalRecords.map((record) => record.id);

          await trx
            .updateTable('icalink_leave_approvals')
            .set({
              approval_result: 'cancelled',
              approval_time: new Date(),
              approval_comment: '学生撤回申请'
            })
            .where('id', 'in', approvalIds)
            .execute();

          cancelledApprovalIds.push(...approvalIds);
        }

        return {
          deletedAttendanceId: studentAttendance.id,
          cancelledApprovalIds
        };
      });

      this.log.info(
        {
          studentId,
          attendanceRecordId,
          deletedAttendanceId: result.deletedAttendanceId,
          cancelledApprovalCount: result.cancelledApprovalIds.length
        },
        '学生请假申请撤回成功'
      );

      return {
        success: true,
        message: '请假申请撤回成功',
        deletedAttendanceId: result.deletedAttendanceId,
        cancelledApprovalIds: result.cancelledApprovalIds
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          studentId,
          attendanceRecordId,
          stack: error instanceof Error ? error.stack : undefined
        },
        '撤回学生请假申请失败'
      );

      return {
        success: false,
        message: error instanceof Error ? error.message : '撤回请假申请失败'
      };
    }
  }
}
