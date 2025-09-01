// @wps/app-icalink 签到统计仓储实现
// 实现签到数据统计相关的数据访问方法

import { Logger } from '@stratix/core';
import { BaseRepository, DatabaseAPI, sql } from '@stratix/database';
import {
  AttendanceStatsQuery,
  AttendanceStatsResponse,
  CourseAttendanceStats,
  RankingItem,
  StudentAttendanceStats,
  TeacherAttendanceStats
} from '../types/attendance-stats.types.js';
import { IcalinkDatabase } from '../types/database.js';
import {
  ServiceErrorCode,
  ServiceResult,
  wrapServiceCall
} from '../types/service.js';
import { IAttendanceStatsRepository } from './interfaces/IAttendanceStatsRepository.js';

/**
 * 签到统计仓储实现类
 * 继承BaseRepository，实现IAttendanceStatsRepository接口
 */
export default class AttendanceStatsRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_attendance_records',
    any,
    any,
    any
  >
  implements IAttendanceStatsRepository
{
  protected readonly tableName = 'icalink_attendance_records' as const;
  protected readonly primaryKey = 'id';

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 获取课程维度的出勤统计
   */
  async getCourseAttendanceStats(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<CourseAttendanceStats>>> {
    return wrapServiceCall(async () => {
      const {
        semester,
        start_date,
        end_date,
        page = 1,
        page_size = 20,
        sort_by = 'attendance_rate',
        sort_order = 'desc'
      } = query;

      const result = await this.advancedQuery(async (db) => {
        let baseQuery = sql`
          SELECT
            c.course_code,
            c.course_name,
            c.semester,
            c.teacher_names,
            c.teacher_codes,
            COUNT(DISTINCT c.id) as class_count,
            COUNT(DISTINCT kcb.xh) as total_should_attend,
            COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as actual_attended,
            COUNT(CASE WHEN ar.status = 'leave' THEN 1 END) as leave_count,
            COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
            CASE
              WHEN COUNT(DISTINCT kcb.xh) > 0
              THEN ROUND(
                (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) +
                 COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 /
                (COUNT(DISTINCT c.id) * COUNT(DISTINCT kcb.xh)), 2
              )
              ELSE 0
            END as attendance_rate,
            MAX(c.start_time) as last_class_time
          FROM icasync_attendance_courses c
          LEFT JOIN out_jw_kcb_xs kcb ON c.course_code = kcb.kkh
          LEFT JOIN icalink_attendance_records ar ON c.id = ar.attendance_course_id
          WHERE c.deleted_at IS NULL
        `;

        // 添加筛选条件
        if (semester) {
          baseQuery = sql`${baseQuery} AND c.semester = ${semester}`;
        }
        if (start_date) {
          baseQuery = sql`${baseQuery} AND c.start_time >= ${start_date}`;
        }
        if (end_date) {
          baseQuery = sql`${baseQuery} AND c.start_time <= ${end_date}`;
        }

        baseQuery = sql`${baseQuery} GROUP BY c.course_code, c.course_name, c.semester, c.teacher_names, c.teacher_codes`;

        // 添加排序
        const sortField =
          sort_by === 'attendance_rate'
            ? 'attendance_rate'
            : sort_by === 'class_count'
              ? 'class_count'
              : sort_by === 'last_class_time'
                ? 'last_class_time'
                : 'attendance_rate';
        baseQuery = sql`${baseQuery} ORDER BY ${sql.raw(sortField)} ${sql.raw(sort_order.toUpperCase())}`;

        // 添加分页
        const offset = (page - 1) * page_size;
        baseQuery = sql`${baseQuery} LIMIT ${sql.raw(page_size.toString())} OFFSET ${sql.raw(offset.toString())}`;

        const result = await baseQuery.execute(db);
        return result.rows;
      });

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get course attendance stats'
        );
      }

      // 获取总数
      const countResult = await this.advancedQuery(async (db) => {
        let countQuery = sql`
          SELECT COUNT(DISTINCT c.course_code) as total
          FROM icasync_attendance_courses c
          WHERE c.deleted_at IS NULL
        `;

        if (semester) {
          countQuery = sql`${countQuery} AND c.semester = ${semester}`;
        }
        if (start_date) {
          countQuery = sql`${countQuery} AND c.start_time >= ${start_date}`;
        }
        if (end_date) {
          countQuery = sql`${countQuery} AND c.start_time <= ${end_date}`;
        }

        const result = await countQuery.execute(db);
        return (result.rows[0] as any)?.total || 0;
      });

      const total = countResult.success ? countResult.data : 0;

      const data: CourseAttendanceStats[] = (result.data || []).map(
        (row: any) => ({
          course_code: row.course_code,
          course_name: row.course_name,
          semester: row.semester,
          teacher_names: row.teacher_names,
          teacher_codes: row.teacher_codes,
          class_count: Number(row.class_count),
          total_should_attend: Number(row.total_should_attend),
          actual_attended: Number(row.actual_attended),
          leave_count: Number(row.leave_count),
          absent_count: Number(row.absent_count),
          attendance_rate: Number(row.attendance_rate),
          last_class_time: row.last_class_time
            ? new Date(row.last_class_time)
            : undefined
        })
      );

      return {
        data,
        total,
        page,
        page_size,
        explanation: {
          formula: '出勤率 = (实际出勤人数 + 请假人数) / 应签到人数 × 100%',
          description:
            '实际出勤人数包括正常签到和迟到签到的学生，请假人数为已批准请假的学生',
          status_explanation: {
            present: '正常签到',
            late: '迟到签到（计入出勤）',
            leave: '请假（计入出勤）',
            absent: '缺勤（不计入出勤）'
          }
        }
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取教师维度的出勤统计
   */
  async getTeacherAttendanceStats(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<TeacherAttendanceStats>>> {
    return wrapServiceCall(async () => {
      // 实现教师维度统计查询
      // 由于教师可能教授多门课程，需要按教师工号分组统计
      const {
        semester,
        start_date,
        end_date,
        page = 1,
        page_size = 20,
        sort_by = 'attendance_rate',
        sort_order = 'desc'
      } = query;

      const result = await this.advancedQuery(async (db) => {
        let baseQuery = sql`
          SELECT
            SUBSTRING_INDEX(SUBSTRING_INDEX(c.teacher_codes, ',', numbers.n), ',', -1) as teacher_code,
            SUBSTRING_INDEX(SUBSTRING_INDEX(c.teacher_names, ',', numbers.n), ',', -1) as teacher_name,
            COUNT(DISTINCT c.course_code) as course_count,
            COUNT(DISTINCT c.id) as class_count,
            COUNT(DISTINCT kcb.xh) as total_should_attend,
            COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as actual_attended,
            COUNT(CASE WHEN ar.status = 'leave' THEN 1 END) as leave_count,
            COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
            CASE
              WHEN COUNT(DISTINCT kcb.xh) > 0
              THEN ROUND(
                (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) +
                 COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 /
                (COUNT(DISTINCT c.id) * COUNT(DISTINCT kcb.xh)), 2
              )
              ELSE 0
            END as attendance_rate
          FROM icasync_attendance_courses c
          CROSS JOIN (
            SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
          ) numbers
          LEFT JOIN out_jw_kcb_xs kcb ON c.course_code = kcb.kkh
          LEFT JOIN icalink_attendance_records ar ON c.id = ar.attendance_course_id
          WHERE c.deleted_at IS NULL
            AND CHAR_LENGTH(c.teacher_codes) - CHAR_LENGTH(REPLACE(c.teacher_codes, ',', '')) >= numbers.n - 1
        `;

        // 添加筛选条件
        if (semester) {
          baseQuery = sql`${baseQuery} AND c.semester = ${semester}`;
        }
        if (start_date) {
          baseQuery = sql`${baseQuery} AND c.start_time >= ${start_date}`;
        }
        if (end_date) {
          baseQuery = sql`${baseQuery} AND c.start_time <= ${end_date}`;
        }

        baseQuery = sql`${baseQuery} GROUP BY teacher_code, teacher_name`;

        // 添加排序
        const sortField =
          sort_by === 'attendance_rate'
            ? 'attendance_rate'
            : sort_by === 'class_count'
              ? 'class_count'
              : sort_by === 'course_count'
                ? 'course_count'
                : 'attendance_rate';
        baseQuery = sql`${baseQuery} ORDER BY ${sql.raw(sortField)} ${sql.raw(sort_order.toUpperCase())}`;

        // 添加分页
        const offset = (page - 1) * page_size;
        baseQuery = sql`${baseQuery} LIMIT ${sql.raw(page_size.toString())} OFFSET ${sql.raw(offset.toString())}`;

        const result = await baseQuery.execute(db);
        return result.rows;
      });

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get teacher attendance stats'
        );
      }

      const data: TeacherAttendanceStats[] = (result.data || []).map(
        (row: any) => ({
          teacher_code: row.teacher_code?.trim(),
          teacher_name: row.teacher_name?.trim(),
          course_count: Number(row.course_count),
          class_count: Number(row.class_count),
          total_should_attend: Number(row.total_should_attend),
          actual_attended: Number(row.actual_attended),
          leave_count: Number(row.leave_count),
          absent_count: Number(row.absent_count),
          attendance_rate: Number(row.attendance_rate)
        })
      );

      return {
        data,
        total: data.length,
        page,
        page_size
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取学生维度的出勤统计
   */
  async getStudentAttendanceStats(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<StudentAttendanceStats>>> {
    return wrapServiceCall(async () => {
      const {
        semester,
        start_date,
        end_date,
        course_code,
        page = 1,
        page_size = 20,
        sort_by = 'attendance_rate',
        sort_order = 'desc'
      } = query;

      const result = await this.advancedQuery(async (db) => {
        let baseQuery = sql`
          SELECT
            s.xh as student_id,
            s.xm as student_name,
            s.bjmc as class_name,
            s.zymc as major_name,
            COUNT(DISTINCT c.course_code) as course_count,
            COUNT(DISTINCT c.id) as total_should_attend,
            COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as actual_attended,
            COUNT(CASE WHEN ar.status = 'leave' THEN 1 END) as leave_count,
            COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
            CASE
              WHEN COUNT(DISTINCT c.id) > 0
              THEN ROUND(
                (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) +
                 COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 /
                COUNT(DISTINCT c.id), 2
              )
              ELSE 0
            END as attendance_rate,
            MAX(ar.checkin_time) as last_checkin_time
          FROM out_xsxx s
          INNER JOIN out_jw_kcb_xs kcb ON s.xh = kcb.xh
          INNER JOIN icasync_attendance_courses c ON kcb.kkh = c.course_code
          LEFT JOIN icalink_attendance_records ar ON (c.id = ar.attendance_course_id AND s.xh = ar.student_id)
          WHERE c.deleted_at IS NULL
        `;

        // 添加筛选条件
        if (semester) {
          baseQuery = sql`${baseQuery} AND c.semester = ${semester}`;
        }
        if (start_date) {
          baseQuery = sql`${baseQuery} AND c.start_time >= ${start_date}`;
        }
        if (end_date) {
          baseQuery = sql`${baseQuery} AND c.start_time <= ${end_date}`;
        }
        if (course_code) {
          baseQuery = sql`${baseQuery} AND c.course_code = ${course_code}`;
        }

        baseQuery = sql`${baseQuery} GROUP BY s.xh, s.xm, s.bjmc, s.zymc`;

        // 添加排序
        const sortField =
          sort_by === 'attendance_rate'
            ? 'attendance_rate'
            : sort_by === 'course_count'
              ? 'course_count'
              : 'attendance_rate';
        baseQuery = sql`${baseQuery} ORDER BY ${sql.raw(sortField)} ${sql.raw(sort_order.toUpperCase())}`;

        // 添加分页
        const offset = (page - 1) * page_size;
        baseQuery = sql`${baseQuery} LIMIT ${sql.raw(page_size.toString())} OFFSET ${sql.raw(offset.toString())}`;

        const result = await baseQuery.execute(db);
        return result.rows;
      });

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get student attendance stats'
        );
      }

      const data: StudentAttendanceStats[] = (result.data || []).map(
        (row: any) => ({
          student_id: row.student_id,
          student_name: row.student_name,
          class_name: row.class_name,
          major_name: row.major_name,
          course_count: Number(row.course_count),
          total_should_attend: Number(row.total_should_attend),
          actual_attended: Number(row.actual_attended),
          leave_count: Number(row.leave_count),
          absent_count: Number(row.absent_count),
          attendance_rate: Number(row.attendance_rate),
          last_checkin_time: row.last_checkin_time
            ? new Date(row.last_checkin_time)
            : undefined
        })
      );

      return {
        data,
        total: data.length,
        page,
        page_size
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取学生出勤率排行榜
   */
  async getStudentAttendanceRankings(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<RankingItem>>> {
    return wrapServiceCall(async () => {
      const {
        semester,
        start_date,
        end_date,
        page = 1,
        page_size = 50
      } = query;

      const result = await this.advancedQuery(async (db) => {
        let baseQuery = sql`
          SELECT
            s.xh as id,
            s.xm as name,
            CONCAT(s.bjmc, ' - ', s.zymc) as extra_info,
            COUNT(DISTINCT c.id) as total_count,
            CASE
              WHEN COUNT(DISTINCT c.id) > 0
              THEN ROUND(
                (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) +
                 COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 /
                COUNT(DISTINCT c.id), 2
              )
              ELSE 0
            END as attendance_rate
          FROM out_xsxx s
          INNER JOIN out_jw_kcb_xs kcb ON s.xh = kcb.xh
          INNER JOIN icasync_attendance_courses c ON kcb.kkh = c.course_code
          LEFT JOIN icalink_attendance_records ar ON (c.id = ar.attendance_course_id AND s.xh = ar.student_id)
          WHERE c.deleted_at IS NULL
        `;

        // 添加筛选条件
        if (semester) {
          baseQuery = sql`${baseQuery} AND c.semester = ${semester}`;
        }
        if (start_date) {
          baseQuery = sql`${baseQuery} AND c.start_time >= ${start_date}`;
        }
        if (end_date) {
          baseQuery = sql`${baseQuery} AND c.start_time <= ${end_date}`;
        }

        baseQuery = sql`${baseQuery}
          GROUP BY s.xh, s.xm, s.bjmc, s.zymc
          ORDER BY attendance_rate DESC, total_count DESC
        `;

        // 添加分页
        const offset = (page - 1) * page_size;
        baseQuery = sql`${baseQuery} LIMIT ${sql.raw(page_size.toString())} OFFSET ${sql.raw(offset.toString())}`;

        const result = await baseQuery.execute(db);
        return result.rows;
      });

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get student attendance rankings'
        );
      }

      const data: RankingItem[] = (result.data || []).map(
        (row: any, index: number) => ({
          rank: (page - 1) * page_size + index + 1,
          id: row.id,
          name: row.name,
          attendance_rate: Number(row.attendance_rate),
          total_count: Number(row.total_count),
          extra_info: row.extra_info
        })
      );

      return {
        data,
        total: data.length,
        page,
        page_size
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }
  /**
   * 获取课程出勤率排行榜
   */
  async getCourseAttendanceRankings(
    query: AttendanceStatsQuery
  ): Promise<ServiceResult<AttendanceStatsResponse<RankingItem>>> {
    return wrapServiceCall(async () => {
      const {
        semester,
        start_date,
        end_date,
        page = 1,
        page_size = 50
      } = query;

      const result = await this.advancedQuery(async (db) => {
        let baseQuery = sql`
          SELECT
            c.course_code as id,
            c.course_name as name,
            CONCAT(c.teacher_names, ' - ', c.semester) as extra_info,
            COUNT(DISTINCT c.id) as total_count,
            CASE
              WHEN COUNT(DISTINCT kcb.xh) > 0
              THEN ROUND(
                (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) +
                 COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 /
                (COUNT(DISTINCT c.id) * COUNT(DISTINCT kcb.xh)), 2
              )
              ELSE 0
            END as attendance_rate
          FROM icasync_attendance_courses c
          LEFT JOIN out_jw_kcb_xs kcb ON c.course_code = kcb.kkh
          LEFT JOIN icalink_attendance_records ar ON c.id = ar.attendance_course_id
          WHERE c.deleted_at IS NULL
        `;

        // 添加筛选条件
        if (semester) {
          baseQuery = sql`${baseQuery} AND c.semester = ${semester}`;
        }
        if (start_date) {
          baseQuery = sql`${baseQuery} AND c.start_time >= ${start_date}`;
        }
        if (end_date) {
          baseQuery = sql`${baseQuery} AND c.start_time <= ${end_date}`;
        }

        baseQuery = sql`${baseQuery}
          GROUP BY c.course_code, c.course_name, c.teacher_names, c.semester
          ORDER BY attendance_rate DESC, total_count DESC
        `;

        // 添加分页
        const offset = (page - 1) * page_size;
        baseQuery = sql`${baseQuery} LIMIT ${sql.raw(page_size.toString())} OFFSET ${sql.raw(offset.toString())}`;

        const result = await baseQuery.execute(db);
        return result.rows;
      });

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to get course attendance rankings'
        );
      }

      const data: RankingItem[] = (result.data || []).map(
        (row: any, index: number) => ({
          rank: (page - 1) * page_size + index + 1,
          id: row.id,
          name: row.name,
          attendance_rate: Number(row.attendance_rate),
          total_count: Number(row.total_count),
          extra_info: row.extra_info
        })
      );

      return {
        data,
        total: data.length,
        page,
        page_size
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取整体出勤统计概览
   */
  async getOverallAttendanceStats(query: AttendanceStatsQuery): Promise<
    ServiceResult<{
      total_courses: number;
      total_students: number;
      total_classes: number;
      overall_attendance_rate: number;
      trend_data: Array<{
        date: string;
        attendance_rate: number;
        class_count: number;
      }>;
    }>
  > {
    return wrapServiceCall(async () => {
      const { semester, start_date, end_date } = query;

      // 获取整体统计数据
      const overallResult = await this.advancedQuery(async (db) => {
        let baseQuery = sql`
          SELECT
            COUNT(DISTINCT c.course_code) as total_courses,
            COUNT(DISTINCT kcb.xh) as total_students,
            COUNT(DISTINCT c.id) as total_classes,
            CASE
              WHEN COUNT(DISTINCT c.id) > 0 AND COUNT(DISTINCT kcb.xh) > 0
              THEN ROUND(
                (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) +
                 COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 /
                (COUNT(DISTINCT c.id) * COUNT(DISTINCT kcb.xh)), 2
              )
              ELSE 0
            END as overall_attendance_rate
          FROM icasync_attendance_courses c
          LEFT JOIN out_jw_kcb_xs kcb ON c.course_code = kcb.kkh
          LEFT JOIN icalink_attendance_records ar ON c.id = ar.attendance_course_id
          WHERE c.deleted_at IS NULL
        `;

        // 添加筛选条件
        if (semester) {
          baseQuery = sql`${baseQuery} AND c.semester = ${semester}`;
        }
        if (start_date) {
          baseQuery = sql`${baseQuery} AND c.start_time >= ${start_date}`;
        }
        if (end_date) {
          baseQuery = sql`${baseQuery} AND c.start_time <= ${end_date}`;
        }

        const result = await baseQuery.execute(db);
        return result.rows[0];
      });

      // 获取趋势数据（按日期分组）
      const trendResult = await this.advancedQuery(async (db) => {
        let trendQuery = sql`
          SELECT
            DATE(c.start_time) as date,
            COUNT(DISTINCT c.id) as class_count,
            CASE
              WHEN COUNT(DISTINCT c.id) > 0 AND COUNT(DISTINCT kcb.xh) > 0
              THEN ROUND(
                (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) +
                 COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 /
                (COUNT(DISTINCT c.id) * COUNT(DISTINCT kcb.xh)), 2
              )
              ELSE 0
            END as attendance_rate
          FROM icasync_attendance_courses c
          LEFT JOIN out_jw_kcb_xs kcb ON c.course_code = kcb.kkh
          LEFT JOIN icalink_attendance_records ar ON c.id = ar.attendance_course_id
          WHERE c.deleted_at IS NULL
        `;

        // 添加筛选条件
        if (semester) {
          trendQuery = sql`${trendQuery} AND c.semester = ${semester}`;
        }
        if (start_date) {
          trendQuery = sql`${trendQuery} AND c.start_time >= ${start_date}`;
        }
        if (end_date) {
          trendQuery = sql`${trendQuery} AND c.start_time <= ${end_date}`;
        }

        trendQuery = sql`${trendQuery}
          GROUP BY DATE(c.start_time)
          ORDER BY DATE(c.start_time) DESC
          LIMIT 30
        `;

        const result = await trendQuery.execute(db);
        return result.rows;
      });

      if (!overallResult.success || !trendResult.success) {
        throw new Error('Failed to get overall attendance stats');
      }

      const overall = (overallResult.data as any) || {};
      const trend = (trendResult.data || []).map((row: any) => ({
        date: row.date,
        attendance_rate: Number(row.attendance_rate),
        class_count: Number(row.class_count)
      }));

      return {
        total_courses: Number(overall.total_courses) || 0,
        total_students: Number(overall.total_students) || 0,
        total_classes: Number(overall.total_classes) || 0,
        overall_attendance_rate: Number(overall.overall_attendance_rate) || 0,
        trend_data: trend
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取系统级别的全局统计数据
   */
  async getSystemOverallStats(): Promise<
    ServiceResult<{
      total_courses: number;
      total_students: number;
      attendance_enabled_courses: number;
      total_attendance_capacity: number;
      average_attendance_rate: number;
      active_courses_today: number;
      total_checkin_records: number;
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info('Getting system overall stats');

      // 1. 获取系统课程总数
      const totalCoursesResult = await sql`
        SELECT COUNT(DISTINCT kkh) as total_courses
        FROM icasync_calendar_mapping
      `;

      // 2. 获取系统学生总数
      const totalStudentsResult = await sql`
        SELECT COUNT(*) as total_students
        FROM out_xsxx
        WHERE zt IS NULL OR zt NOT IN ('毕业', '退学')
      `;

      // 3. 获取开启考勤的课程数
      const attendanceEnabledCoursesResult = await sql`
        SELECT COUNT(DISTINCT course_code) as attendance_enabled_courses
        FROM icasync_attendance_courses
        WHERE attendance_enabled = true
      `;

      // 4. 计算总考勤人次（所有开启考勤课程的学生数之和）
      const totalAttendanceCapacityResult = await sql`
        SELECT COALESCE(SUM(student_count), 0) as total_attendance_capacity
        FROM (
          SELECT kkh, COUNT(DISTINCT xh) as student_count
          FROM out_jw_kcb_xs
          WHERE kkh IN (
            SELECT DISTINCT course_code
            FROM icasync_attendance_courses
            WHERE attendance_enabled = true
          )
          GROUP BY kkh
        ) course_students
      `;

      // 5. 计算系统整体出勤率
      const overallAttendanceRateResult = await sql`
        SELECT
          CASE
            WHEN COUNT(ar.id) > 0 THEN
              ROUND(
                (SUM(
                  CASE
                    WHEN ar.status = 'present' THEN 1
                    ELSE 0
                  END
                )::numeric / COUNT(ar.id)::numeric) * 100,
                2
              )
            ELSE 0
          END as average_attendance_rate
        FROM icalink_attendance_records ar
        INNER JOIN icasync_attendance_courses c ON ar.attendance_course_id = c.id
        WHERE c.attendance_enabled = true
      `;

      // 6. 获取今日活跃课程数
      const today = new Date().toISOString().split('T')[0];
      const activeCoursesTodayResult = await sql`
        SELECT COUNT(DISTINCT c.id) as active_courses_today
        FROM icasync_attendance_courses c
        INNER JOIN icalink_attendance_records ar ON c.id = ar.attendance_course_id
        WHERE c.attendance_enabled = true
          AND DATE(ar.created_at) = ${today}
      `;

      // 7. 获取总签到记录数
      const totalCheckinRecordsResult = await sql`
        SELECT COUNT(*) as total_checkin_records
        FROM icalink_attendance_records ar
        INNER JOIN icasync_attendance_courses c ON ar.attendance_course_id = c.id
        WHERE c.attendance_enabled = true
          AND ar.status IN ('present', 'late')
      `;

      const stats = {
        total_courses: Number(
          (totalCoursesResult as any)[0]?.total_courses || 0
        ),
        total_students: Number(
          (totalStudentsResult as any)[0]?.total_students || 0
        ),
        attendance_enabled_courses: Number(
          (attendanceEnabledCoursesResult as any)[0]
            ?.attendance_enabled_courses || 0
        ),
        total_attendance_capacity: Number(
          (totalAttendanceCapacityResult as any)[0]
            ?.total_attendance_capacity || 0
        ),
        average_attendance_rate: Number(
          (overallAttendanceRateResult as any)[0]?.average_attendance_rate || 0
        ),
        active_courses_today: Number(
          (activeCoursesTodayResult as any)[0]?.active_courses_today || 0
        ),
        total_checkin_records: Number(
          (totalCheckinRecordsResult as any)[0]?.total_checkin_records || 0
        )
      };

      this.logger.info({ stats }, 'System overall stats calculated');

      return stats;
    });
  }
}
