/**
 * 考勤仓库
 * 处理考勤相关的数据库操作
 */

import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { AttendanceRecord } from '../types/attendance.js';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase } from './types.js';

/**
 * 考勤记录数据
 */
interface AttendanceRecordData {
  id: string;
  kkh: string;
  xnxq: string;
  jxz?: number | null; // 教学周
  zc?: number | null; // 周次
  rq: string;
  lq?: string; // 楼群或相关标识
  jc_s: string;
  kcmc: string;
  sj_f: string;
  sj_t: string;
  sjd: 'am' | 'pm';
  total_count: number;
  checkin_count: number;
  absent_count: number;
  leave_count: number;
  checkin_url?: string;
  leave_url?: string;
  checkin_token?: string;
  status: 'active' | 'closed';
  auto_start_time?: string;
  auto_close_time?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 考勤仓库类
 */
export class AttendanceRepository extends BaseRepository {
  constructor(db: Kysely<ExtendedDatabase>, log: Logger) {
    super(db, log);
  }

  /**
   * 创建考勤记录
   * 创建前先检查ID是否已存在，如果存在则返回现有记录
   */
  async createAttendanceRecord(
    data: AttendanceRecordData
  ): Promise<AttendanceRecord> {
    try {
      this.log.debug({ taskId: data.id, kkh: data.kkh }, '创建考勤记录');

      // 先检查ID是否已存在
      const existingRecord = await this.getAttendanceRecord(data.id);

      if (existingRecord) {
        this.log.info(
          {
            taskId: data.id,
            kkh: data.kkh
          },
          '考勤记录ID已存在，返回现有记录'
        );
        return existingRecord;
      }

      // ID不存在则创建新记录
      await this.db
        .insertInto('icalink_attendance_records')
        .values({
          id: data.id,
          kkh: data.kkh,
          xnxq: data.xnxq,
          jxz: data.jxz || null,
          zc: data.zc || null,
          rq: data.rq,
          jc_s: data.jc_s,
          kcmc: data.kcmc,
          sj_f: data.sj_f,
          sj_t: data.sj_t,
          sjd: data.sjd,
          lq: data.lq || null,
          total_count: data.total_count,
          checkin_count: data.checkin_count,
          absent_count: data.absent_count,
          leave_count: data.leave_count,
          checkin_url: data.checkin_url || null,
          leave_url: data.leave_url || null,
          checkin_token: data.checkin_token || null,
          status: data.status,
          auto_start_time: data.auto_start_time || null,
          auto_close_time: data.auto_close_time || null,
          created_at: data.created_at,
          updated_at: data.updated_at
        })
        .execute();

      this.log.info({ taskId: data.id, kkh: data.kkh }, '考勤记录创建成功');
      return this.convertToAttendanceRecord(data);
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          taskId: data.id,
          kkh: data.kkh
        },
        '创建考勤记录失败'
      );
      throw error;
    }
  }

  /**
   * 根据ID获取考勤记录
   */
  async getAttendanceRecord(id: string): Promise<AttendanceRecord | null> {
    try {
      this.log.debug({ id }, '获取考勤记录');

      const result = await this.db
        .selectFrom('icalink_attendance_records')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!result) {
        this.log.debug({ id }, '考勤记录不存在');
        return null;
      }

      this.log.debug({ id, kkh: result.kkh }, '获取考勤记录成功');
      return this.convertToAttendanceRecord(result as any);
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id
        },
        '获取考勤记录失败'
      );
      throw error;
    }
  }

  /**
   * 检查考勤记录ID是否存在
   */
  async checkAttendanceRecordExists(id: string): Promise<boolean> {
    const record = await this.getAttendanceRecord(id);
    return record !== null;
  }

  /**
   * 根据条件查询考勤记录
   */
  async findAttendanceRecords(conditions: {
    kkh?: string;
    xnxq?: string;
    rq?: string;
    status?: 'active' | 'closed';
  }): Promise<AttendanceRecord[]> {
    try {
      this.log.debug({ conditions }, '查询考勤记录');

      let query = this.db.selectFrom('icalink_attendance_records').selectAll();

      if (conditions.kkh) {
        query = query.where('kkh', '=', conditions.kkh);
      }
      if (conditions.xnxq) {
        query = query.where('xnxq', '=', conditions.xnxq);
      }
      if (conditions.rq) {
        query = query.where('rq', '=', conditions.rq);
      }
      if (conditions.status) {
        query = query.where('status', '=', conditions.status);
      }

      const results = await query.orderBy('created_at', 'desc').execute();

      this.log.debug({ conditions, count: results.length }, '查询考勤记录完成');

      return results.map((result) =>
        this.convertToAttendanceRecord(result as any)
      );
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          conditions
        },
        '查询考勤记录失败'
      );
      throw error;
    }
  }

  /**
   * 更新考勤记录
   */
  async updateAttendanceRecord(
    id: string,
    updates: Partial<AttendanceRecordData>
  ): Promise<void> {
    try {
      this.log.debug({ id, updates }, '更新考勤记录');

      await this.db
        .updateTable('icalink_attendance_records')
        .set({
          ...updates,
          updated_at: new Date()
        })
        .where('id', '=', id)
        .execute();

      this.log.info({ id }, '考勤记录更新成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id,
          updates
        },
        '更新考勤记录失败'
      );
      throw error;
    }
  }

  /**
   * 获取考勤统计
   */
  async getAttendanceStats(
    attendanceRecordId: string
  ): Promise<{ [key: string]: number }> {
    try {
      this.log.debug({ attendanceRecordId }, '获取考勤统计');

      const stats = await this.db
        .selectFrom('icalink_student_attendance')
        .select(['status', this.db.fn.count('id').as('count')])
        .where('attendance_record_id', '=', attendanceRecordId)
        .groupBy('status')
        .execute();

      const result: { [key: string]: number } = {};
      stats.forEach((stat: any) => {
        result[stat.status] = Number(stat.count);
      });

      this.log.debug({ attendanceRecordId, stats: result }, '获取考勤统计完成');

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
   * 更新考勤记录统计
   */
  async updateAttendanceStats(attendanceRecordId: string): Promise<void> {
    try {
      this.log.debug({ attendanceRecordId }, '更新考勤统计');

      const stats = await this.getAttendanceStats(attendanceRecordId);

      let checkinCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      Object.entries(stats).forEach(([status, count]) => {
        switch (status) {
          case 'present':
            checkinCount += count;
            break;
          case 'absent':
            absentCount += count;
            break;
          case 'leave':
            leaveCount += count;
            break;
        }
      });

      await this.updateAttendanceRecord(attendanceRecordId, {
        checkin_count: checkinCount,
        absent_count: absentCount,
        leave_count: leaveCount
      });

      this.log.info({ attendanceRecordId }, '考勤统计更新成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId
        },
        '更新考勤统计失败'
      );
      throw error;
    }
  }

  /**
   * 关闭考勤记录
   */
  async closeAttendanceRecord(attendanceRecordId: string): Promise<void> {
    try {
      this.log.debug({ attendanceRecordId }, '关闭考勤记录');

      await this.updateAttendanceRecord(attendanceRecordId, {
        status: 'closed'
      });

      this.log.info({ attendanceRecordId }, '考勤记录关闭成功');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          attendanceRecordId
        },
        '关闭考勤记录失败'
      );
      throw error;
    }
  }

  /**
   * 转换为考勤记录对象
   */
  private convertToAttendanceRecord(data: any): AttendanceRecord {
    return {
      id: data.id,
      kkh: data.kkh,
      xnxq: data.xnxq,
      jxz: data.jxz,
      zc: data.zc,
      rq: data.rq,
      lq: data.lq,
      jc_s: data.jc_s,
      kcmc: data.kcmc,
      sj_f: data.sj_f,
      sj_t: data.sj_t,
      sjd: data.sjd,
      total_count: data.total_count,
      checkin_count: data.checkin_count,
      absent_count: data.absent_count,
      leave_count: data.leave_count,
      checkin_url: data.checkin_url,
      leave_url: data.leave_url,
      checkin_token: data.checkin_token,
      status: data.status,
      auto_start_time: data.auto_start_time,
      auto_close_time: data.auto_close_time,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}
