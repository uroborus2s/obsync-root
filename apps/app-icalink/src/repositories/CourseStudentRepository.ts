import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type { IcalinkDatabase, OutJwKcbXs } from '../types/database.js';

/**
 * 学生课程关联表 Repository
 * 负责查询教学班学生信息
 */
export default class CourseStudentRepository extends BaseRepository<
  IcalinkDatabase,
  'out_jw_kcb_xs',
  OutJwKcbXs
> {
  protected readonly tableName = 'out_jw_kcb_xs';
  protected readonly primaryKey = 'id'; // This may need adjustment.

  constructor(protected readonly logger: Logger) {
    super('syncdb'); // Use the 'syncdb' connection, consistent with other repositories.
    this.logger.info('✅ CourseStudentRepository initialized');
  }

  /**
   * 根据课程代码和学期查询学生ID列表
   */
  public async findStudentIdsByCourseCode(
    courseCode: string,
    semester: string
  ): Promise<string[]> {
    const results = (await this.findMany((qb) =>
      qb.where('kkh', '=', courseCode).where('xnxq', '=', semester)
    )) as unknown as OutJwKcbXs[];

    return results
      .map((r: OutJwKcbXs) => r.xh)
      .filter((xh: string | null | undefined): xh is string => !!xh);
  }

  /**
   * 查询教学班学生及其缺勤状态（用于历史课程）
   *
   * 使用 LEFT JOIN 关联以下表：
   * - out_xsxx: 学生信息表（获取姓名、班级、专业）
   * - icalink_absent_student_relations: 缺勤记录表（获取缺勤状态）
   *
   * @param courseCode 课程代码（开课号）
   * @param semester 学期
   * @param courseId 课程ID（用于关联缺勤记录）
   * @returns 学生列表及其缺勤状态和统计信息
   */
  public async findStudentsWithAttendanceStatus(
    courseCode: string,
    semester: string,
    courseId: number
  ): Promise<{
    students: Array<{
      student_id: string;
      student_name: string | null;
      class_name: string | null;
      major_name: string | null;
      absence_type: string | null;
      leave_reason: string | null;
    }>;
    stats: {
      total_count: number;
      checkin_count: number;
      absent_count: number;
      leave_count: number;
    };
  }> {
    const db = await this.getQueryConnection();

    const results = await db
      .selectFrom('out_jw_kcb_xs as cs')
      .leftJoin('out_xsxx as s', 's.xh', 'cs.xh')
      .leftJoin('icasync.icalink_absent_student_relations as asr', (join) =>
        join
          .onRef('asr.student_id', '=', 'cs.xh')
          .on('asr.course_id', '=', courseId)
      )
      .select([
        'cs.xh as student_id',
        's.xm as student_name',
        's.bjmc as class_name',
        's.zymc as major_name',
        'asr.absence_type'
      ])
      .where('cs.kkh', '=', courseCode)
      .where('cs.xnxq', '=', semester)
      .where('s.zt', 'in', ['add', 'update']) // 只查询有效学生
      .where('cs.zt', 'in', ['add', 'update']) // 只查询有效学生
      .orderBy('cs.xh', 'asc')
      .execute();

    // 计算统计信息
    const totalCount = results.length;
    let checkinCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    results.forEach((row) => {
      if (!row.absence_type) {
        // 没有缺勤记录，视为已签到
        checkinCount++;
      } else if (row.absence_type === 'absent') {
        absentCount++;
      } else if (row.absence_type === 'leave') {
        leaveCount++;
      }
    });

    this.logger.debug(
      {
        courseCode,
        semester,
        courseId,
        totalCount,
        checkinCount,
        absentCount,
        leaveCount
      },
      'Fetched students with attendance status and stats'
    );

    return {
      students: results as Array<{
        student_id: string;
        student_name: string | null;
        class_name: string | null;
        major_name: string | null;
        absence_type: string | null;
        leave_reason: string | null;
      }>,
      stats: {
        total_count: totalCount,
        checkin_count: checkinCount,
        absent_count: absentCount,
        leave_count: leaveCount
      }
    };
  }
}
