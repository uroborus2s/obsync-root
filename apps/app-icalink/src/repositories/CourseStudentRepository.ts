import type { Logger } from '@stratix/core';
import { BaseRepository, sql } from '@stratix/database';
import { StudentAttendanceDetail } from 'src/types/api.js';
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
   * 查询教学班学生及其实时考勤状态（用于当前课程）
   *
   * 数据源：
   * 1. icalink_teaching_class 表：教学班成员（主表）
   * 2. v_attendance_today_details 视图：当天考勤状态
   * 3. icalink_attendance_records 表：考勤详细信息（包括 metadata）
   *
   * 查询逻辑：
   * - 从 icalink_teaching_class 表获取教学班的所有学生成员（基于 course_code）
   * - LEFT JOIN v_attendance_today_details 视图获取考勤状态（基于 student_id 和 attendance_course_id）
   * - LEFT JOIN icalink_attendance_records 表获取详细信息（包括 metadata、签到时间、位置等）
   * - 确保即使学生未签到也能显示在列表中（使用 LEFT JOIN）
   *
   * @param courseId 课程ID（用于关联 v_attendance_today_details 视图）
   * @param courseCode 课程代码（用于查询 icalink_teaching_class）
   * @returns 学生列表及其实时考勤状态和统计信息
   */
  public async findStudentsWithRealtimeStatus(
    courseId: number,
    courseCode: string
  ): Promise<{
    students: Array<StudentAttendanceDetail>;
    stats: {
      total_count: number;
      checkin_count: number;
      absent_count: number;
      leave_count: number;
      truant_count: number;
    };
  }> {
    const db = await this.getQueryConnection();

    // 使用 any 类型来处理跨数据库 JOIN 的类型问题
    // Kysely 的类型系统不支持跨数据库表引用，因此需要使用类型断言

    // ========== 查询1: 获取学生列表及其考勤状态 ==========

    // 1. 从 icalink_teaching_class 表开始（获取教学班成员）
    let studentsQuery: any = db.selectFrom(
      'icasync.icalink_teaching_class as tc' as any
    );

    // 2. LEFT JOIN v_attendance_today_details 视图获取考勤状态
    // 关联条件：student_id 和 attendance_course_id
    studentsQuery = studentsQuery.leftJoin(
      'icasync.v_attendance_today_details as vatd',
      (join: any) =>
        join
          .onRef('tc.student_id', '=', 'vatd.student_id')
          .on('vatd.attendance_course_id', '=', courseId)
    );

    // 3. LEFT JOIN icalink_attendance_records 表获取详细信息（包括 metadata）
    studentsQuery = studentsQuery.leftJoin(
      'icasync.icalink_attendance_records as ar',
      (join: any) => join.onRef('ar.id', '=', 'vatd.attendance_record_id')
    );

    // 4. SELECT 字段（只选择学生相关字段，不包含聚合函数）
    studentsQuery = studentsQuery.select([
      'tc.student_id',
      'tc.student_name',
      'tc.class_name',
      'tc.major_name',
      // 使用 COALESCE 将 NULL 转换为 'absent'（缺勤）
      // 当前课程中，如果没有考勤记录，默认为缺勤
      sql<string>`COALESCE(vatd.final_status, 'absent')`.as('absence_type'),
      'ar.id as attendance_record_id',
      'ar.checkin_time',
      'ar.checkin_location',
      'ar.checkin_latitude',
      'ar.checkin_longitude',
      'ar.checkin_accuracy',
      'ar.metadata'
    ]);

    // 5. WHERE 条件：只查询指定课程代码的学生
    studentsQuery = studentsQuery.where('tc.course_code', '=', courseCode);

    // 6. 按考勤状态排序：pending_approval 优先，然后是其他状态
    // 排序规则：pending_approval(1), leave_pending(2), truant(3), absent(4), leave(5), present(6)
    studentsQuery = studentsQuery.orderBy(
      sql`CASE
        WHEN COALESCE(vatd.final_status, 'absent') = 'pending_approval' THEN 1
        WHEN COALESCE(vatd.final_status, 'absent') = 'leave_pending' THEN 2
        WHEN COALESCE(vatd.final_status, 'absent') = 'truant' THEN 3
        WHEN COALESCE(vatd.final_status, 'absent') = 'absent' THEN 4
        WHEN COALESCE(vatd.final_status, 'absent') = 'leave' THEN 5
        WHEN COALESCE(vatd.final_status, 'absent') = 'present' THEN 6
        ELSE 7
      END`,
      'asc'
    );
    studentsQuery = studentsQuery.orderBy('tc.student_id', 'asc'); // 同一状态内按学号排序

    // 执行学生列表查询
    const students = await studentsQuery.execute();

    // ========== 查询2: 计算统计信息 ==========

    let statsQuery: any = db.selectFrom(
      'icasync.icalink_teaching_class as tc' as any
    );

    statsQuery = statsQuery.leftJoin(
      'icasync.v_attendance_today_details as vatd',
      (join: any) =>
        join
          .onRef('tc.student_id', '=', 'vatd.student_id')
          .on('vatd.attendance_course_id', '=', courseId)
    );

    statsQuery = statsQuery.select([
      sql<number>`COUNT(*)`.as('total_count'),
      sql<number>`SUM(CASE WHEN COALESCE(vatd.final_status, 'absent') = 'present' THEN 1 ELSE 0 END)`.as(
        'checkin_count'
      ),
      sql<number>`SUM(CASE WHEN COALESCE(vatd.final_status, 'absent') = 'truant' THEN 1 ELSE 0 END)`.as(
        'truant_count'
      ),
      sql<number>`SUM(CASE WHEN COALESCE(vatd.final_status, 'absent') IN ('absent', 'pending_approval') THEN 1 ELSE 0 END)`.as(
        'absent_count'
      ),
      sql<number>`SUM(CASE WHEN COALESCE(vatd.final_status, 'absent') IN ('leave', 'leave_pending') THEN 1 ELSE 0 END)`.as(
        'leave_count'
      )
    ]);

    statsQuery = statsQuery.where('tc.course_code', '=', courseCode);

    // 执行统计查询
    const statsResult = await statsQuery.execute();
    const stats = statsResult[0] || {
      total_count: 0,
      checkin_count: 0,
      absent_count: 0,
      leave_count: 0,
      truant_count: 0
    };

    this.logger.debug(
      {
        courseId,
        courseCode,
        totalCount: stats.total_count,
        checkinCount: stats.checkin_count,
        absentCount: stats.absent_count,
        leaveCount: stats.leave_count,
        truantCount: stats.truant_count
      },
      'Fetched students with realtime attendance status and stats'
    );

    // 解析 metadata 字段（从 JSON 字符串转换为对象）
    const studentsWithParsedMetadata = students.map((student: any) => {
      if (student.metadata && typeof student.metadata === 'string') {
        try {
          student.metadata = JSON.parse(student.metadata);
        } catch (error) {
          this.logger.warn(
            { studentId: student.student_id, error },
            'Failed to parse metadata JSON'
          );
          student.metadata = null;
        }
      }
      return student;
    });

    return {
      students: studentsWithParsedMetadata,
      stats: {
        total_count: Number(stats.total_count),
        checkin_count: Number(stats.checkin_count),
        absent_count: Number(stats.absent_count),
        leave_count: Number(stats.leave_count),
        truant_count: Number(stats.truant_count)
      }
    };
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
    students: Array<StudentAttendanceDetail>;
    stats: {
      total_count: number;
      checkin_count: number;
      absent_count: number;
      leave_count: number;
      truant_count: number;
    };
  }> {
    const db = await this.getQueryConnection();

    // 使用 any 类型来处理跨数据库 JOIN 的类型问题
    // Kysely 的类型系统不支持跨数据库表引用，因此需要使用类型断言
    let query: any = db.selectFrom('out_jw_kcb_xs as cs');
    query = query.leftJoin('out_xsxx as s', 's.xh', 'cs.xh');
    query = query.leftJoin(
      'icasync.icalink_absent_student_relations as asr',
      (join: any) =>
        join
          .onRef('asr.student_id', '=', 'cs.xh')
          .on('asr.course_id', '=', courseId)
    );
    query = query.select([
      'cs.xh as student_id',
      's.xm as student_name',
      's.bjmc as class_name',
      's.zymc as major_name',
      // 使用 COALESCE 将 NULL 转换为 'present'（出勤）
      sql<string>`COALESCE(asr.absence_type, 'present')`.as('absence_type')
    ]);
    query = query.where('cs.kkh', '=', courseCode);
    query = query.where('cs.xnxq', '=', semester);
    query = query.where('s.zt', 'in', ['add', 'update']); // 只查询有效学生
    query = query.where('cs.zt', 'in', ['add', 'update']); // 只查询有效学生

    // 按考勤状态排序：旷课、缺勤、请假、请假未审批的排在前面
    // 排序规则：truant, absent, leave, leave_pending, late, present
    query = query.orderBy(
      sql`CASE
        WHEN COALESCE(asr.absence_type, 'present') = 'truant' THEN 1
        WHEN COALESCE(asr.absence_type, 'present') = 'absent' THEN 2
        WHEN COALESCE(asr.absence_type, 'present') = 'leave_pending' THEN 3
        WHEN COALESCE(asr.absence_type, 'present') = 'leave' THEN 4
        WHEN COALESCE(asr.absence_type, 'present') = 'present' THEN 5
        ELSE 7
      END`,
      'asc'
    );
    query = query.orderBy('cs.xh', 'asc'); // 同一状态内按学号排序

    const results = await query.execute();

    // 在 SQL 中计算统计信息
    let statsQuery: any = db.selectFrom('out_jw_kcb_xs as cs');
    statsQuery = statsQuery.leftJoin('out_xsxx as s', 's.xh', 'cs.xh');
    statsQuery = statsQuery.leftJoin(
      'icasync.icalink_absent_student_relations as asr',
      (join: any) =>
        join
          .onRef('asr.student_id', '=', 'cs.xh')
          .on('asr.course_id', '=', courseId)
    );
    statsQuery = statsQuery.select([
      sql<number>`COUNT(*)`.as('total_count'),
      sql<number>`SUM(CASE WHEN asr.absence_type IS NULL OR asr.absence_type = 'present' THEN 1 ELSE 0 END)`.as(
        'checkin_count'
      ),
      sql<number>`SUM(CASE WHEN asr.absence_type = 'absent' THEN 1 ELSE 0 END)`.as(
        'absent_count'
      ),
      sql<number>`SUM(CASE WHEN asr.absence_type = 'truant' THEN 1 ELSE 0 END)`.as(
        'truant_count'
      ),
      sql<number>`SUM(CASE WHEN asr.absence_type = 'leave' or asr.absence_type = 'leave_pending' THEN 1 ELSE 0 END)`.as(
        'leave_count'
      )
    ]);
    statsQuery = statsQuery.where('cs.kkh', '=', courseCode);
    statsQuery = statsQuery.where('cs.xnxq', '=', semester);
    statsQuery = statsQuery.where('s.zt', 'in', ['add', 'update']);
    statsQuery = statsQuery.where('cs.zt', 'in', ['add', 'update']);

    const statsResult = await statsQuery.execute();
    const stats = statsResult[0] || {
      total_count: 0,
      checkin_count: 0,
      absent_count: 0,
      truant_count: 0,
      leave_count: 0
    };

    this.logger.debug('Fetched students with attendance status and stats', {
      courseCode,
      semester,
      courseId,
      totalCount: stats.total_count,
      checkinCount: stats.checkin_count,
      absentCount: stats.absent_count,
      truantCount: stats.truant_count,
      leaveCount: stats.leave_count
    });

    return {
      students: results,
      stats: {
        total_count: Number(stats.total_count),
        checkin_count: Number(stats.checkin_count),
        absent_count: Number(stats.absent_count),
        leave_count: Number(stats.leave_count),
        truant_count: Number(stats.truant_count)
      }
    };
  }
}
