import type { Logger } from '@stratix/core';
import { BaseRepository, sql } from '@stratix/database';
import { StudentAttendanceDetail } from 'src/types/api.js';
import type {
  IcalinkDatabase,
  IcalinkTeachingClass
} from '../types/database.js';

/**
 * 教学班表仓储实现
 * 负责查询教学班的学生和课程信息
 * 数据源：icalink_teaching_class 表
 */
export default class VTeachingClassRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_teaching_class',
  IcalinkTeachingClass
> {
  protected readonly tableName = 'icalink_teaching_class';
  protected readonly primaryKey = 'id'; // 使用自增id作为主键

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info(
      '✅ VTeachingClassRepository initialized (using icalink_teaching_class table)'
    );
  }

  /**
   * 分页查询教学班数据（关键字搜索版）
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键字（支持学号、姓名、学院、专业、班级、年级、课程编码、课程名称、开课单位）
   * @param sortField 排序字段
   * @param sortOrder 排序方向
   * @returns 分页结果
   */
  public async findWithPagination(params: {
    page: number;
    pageSize: number;
    searchKeyword?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: IcalinkTeachingClass[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page, pageSize, searchKeyword, sortField, sortOrder } = params;

    // 参数验证
    if (page < 1 || pageSize <= 0) {
      this.logger.warn('findWithPagination called with invalid parameters', {
        page,
        pageSize
      });
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    const offset = (page - 1) * pageSize;

    this.logger.debug(
      {
        page,
        pageSize,
        offset,
        searchKeyword,
        sortField,
        sortOrder
      },
      'Finding teaching class with pagination (keyword search)'
    );

    // 构建查询条件：关键字搜索所有支持的字段
    const buildQuery = (qb: any) => {
      let query = qb;

      // 关键字搜索：支持学号、姓名、学院、专业、班级、年级、课程编码、课程名称、开课单位
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = searchKeyword.trim();
        query = query.where((eb: any) =>
          eb.or([
            eb('student_id', 'like', `%${keyword}%`),
            eb('student_name', 'like', `%${keyword}%`),
            eb('school_name', 'like', `%${keyword}%`),
            eb('major_name', 'like', `%${keyword}%`),
            eb('class_name', 'like', `%${keyword}%`),
            eb('grade', 'like', `%${keyword}%`),
            eb('course_code', 'like', `%${keyword}%`),
            eb('course_name', 'like', `%${keyword}%`),
            eb('course_unit', 'like', `%${keyword}%`)
          ])
        );
      }

      return query;
    };

    // 查询总数
    const total = await this.count(buildQuery);

    // 查询数据
    const data = (await this.findMany(buildQuery, {
      orderBy: {
        field: sortField || 'id',
        direction: sortOrder || 'asc'
      },
      limit: pageSize,
      offset
    })) as IcalinkTeachingClass[];

    const totalPages = Math.ceil(total / pageSize);

    this.logger.debug(
      { total, dataCount: data.length, totalPages },
      'Pagination query completed'
    );

    return {
      data,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * 根据学生ID查询教学班信息
   * @param studentId 学生ID
   * @returns 教学班记录列表
   */
  public async findByStudentId(
    studentId: string
  ): Promise<IcalinkTeachingClass[]> {
    if (!studentId) {
      this.logger.warn('findByStudentId called with invalid studentId');
      return [];
    }

    this.logger.debug({ studentId }, 'Finding teaching class by student ID');

    const result = (await this.findMany((qb) =>
      qb.where('student_id', '=', studentId)
    )) as IcalinkTeachingClass[];

    return result;
  }

  /**
   * 根据课程代码查询教学班信息
   * @param courseCode 课程代码
   * @returns 教学班记录列表
   */
  public async findByCourseCode(
    courseCode: string
  ): Promise<IcalinkTeachingClass[]> {
    if (!courseCode) {
      this.logger.warn('findByCourseCode called with invalid courseCode');
      return [];
    }

    this.logger.debug({ courseCode }, 'Finding teaching class by course code');

    const result = (await this.findMany((qb) =>
      qb.where('course_code', '=', courseCode)
    )) as IcalinkTeachingClass[];

    return result;
  }

  /**
   * 获取总记录数
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<number> {
    this.logger.debug('Getting total count of teaching class');
    const count = await this.count();
    this.logger.debug({ count }, 'Total count retrieved');
    return count;
  }

  /**
   * 根据课程ID查询该课程的所有学生
   *
   * @param courseId 课程ID
   * @param courseCode 课程代码
   * @returns 学生列表
   */
  public async findStudentsByCourseId(
    courseId: number,
    courseCode: string
  ): Promise<
    Array<{
      student_id: string;
      student_name: string;
      class_name: string | null;
      major_name: string | null;
    }>
  > {
    const db = await this.getQueryConnection();

    // 从 icalink_teaching_class 表查询学生
    const query: any = db
      .selectFrom('icasync.icalink_teaching_class as tc' as any)
      .select([
        'tc.student_id',
        'tc.student_name',
        'tc.class_name',
        'tc.major_name'
      ])
      .where('tc.course_code' as any, '=', courseCode as any);

    const results = await query.execute();

    this.logger.debug(
      { courseId, courseCode, count: results.length },
      'Students found for course'
    );

    return results;
  }

  /**
   * 验证学生是否属于指定课程
   *
   * @param courseCode 课程代码
   * @param studentIds 学生ID列表
   * @returns 有效的学生ID列表
   */
  public async validateStudentsInCourse(
    courseCode: string,
    studentIds: string[]
  ): Promise<string[]> {
    if (studentIds.length === 0) {
      return [];
    }

    const db = await this.getQueryConnection();

    // 查询哪些学生属于该课程
    const query: any = db
      .selectFrom('icasync.icalink_teaching_class as tc' as any)
      .select('tc.student_id')
      .where('tc.course_code' as any, '=', courseCode as any)
      .where('tc.student_id' as any, 'in', studentIds as any);

    const results = await query.execute();

    const validStudentIds = results.map((r: any) => r.student_id);

    this.logger.debug(
      {
        courseCode,
        requestedCount: studentIds.length,
        validCount: validStudentIds.length
      },
      'Validated students in course'
    );

    return validStudentIds;
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
   * - icalink_teaching_class: 教学班表（获取学生基本信息）
   * - icalink_absent_student_relations: 缺勤记录表（获取缺勤状态）
   *
   * @param courseCode 课程代码（开课号）
   * @param semester 学期（已废弃，保留参数以保持接口兼容性）
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

    // ========== 查询1: 获取学生列表及其缺勤状态 ==========
    let query: any = db.selectFrom(
      'icasync.icalink_teaching_class as tc' as any
    );
    query = query.leftJoin(
      'icasync.icalink_absent_student_relations as asr',
      (join: any) =>
        join
          .onRef('asr.student_id', '=', 'tc.student_id')
          .on('asr.course_id', '=', courseId)
    );
    query = query.select([
      'tc.student_id',
      'tc.student_name',
      'tc.class_name',
      'tc.major_name',
      // 使用 COALESCE 将 NULL 转换为 'present'（出勤）
      sql<string>`COALESCE(asr.absence_type, 'present')`.as('absence_type')
    ]);
    query = query.where('tc.course_code', '=', courseCode);

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
    query = query.orderBy('tc.student_id', 'asc'); // 同一状态内按学号排序

    const results = await query.execute();

    // ========== 查询2: 计算统计信息 ==========
    let statsQuery: any = db.selectFrom(
      'icasync.icalink_teaching_class as tc' as any
    );
    statsQuery = statsQuery.leftJoin(
      'icasync.icalink_absent_student_relations as asr',
      (join: any) =>
        join
          .onRef('asr.student_id', '=', 'tc.student_id')
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
    statsQuery = statsQuery.where('tc.course_code', '=', courseCode);

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
      semester: semester || 'N/A (deprecated parameter)',
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

  /**
   * 查询未来课程的学生考勤详情
   * 数据源：v_attendance_future_details 视图
   *
   * @description
   * 该方法用于查询未来课程的学生列表及其考勤状态（主要是请假状态）
   * 视图会自动关联以下数据：
   * - icalink_teaching_class: 教学班成员
   * - icalink_attendance_records: 考勤记录（主要是请假记录）
   * - icalink_verification_windows: 签到窗口（用于判断状态）
   *
   * 可能的学生状态：
   * - 'absent': 默认状态（还未签到，也未请假）
   * - 'leave': 已批准的请假
   * - 'leave_pending': 待审批的请假
   *
   * @param courseId 课程ID
   * @returns 学生列表及统计信息
   */
  public async findStudentsWithFutureStatus(courseId: number): Promise<{
    students: Array<StudentAttendanceDetail>;
    stats: {
      total_count: number;
      leave_count: number;
    };
  }> {
    this.logger.debug(
      'Querying future course students from v_attendance_future_details',
      {
        courseId
      }
    );

    const db = await this.getQueryConnection();

    // 查询学生列表及其状态
    const query: any = db
      .selectFrom('icasync.v_attendance_future_details' as any)
      .where('attendance_course_id', '=', courseId)
      .select([
        'student_id',
        'student_name',
        'class_name',
        'major_name',
        'final_status as absence_type'
      ])
      .orderBy('student_id', 'asc');

    const results = await query.execute();

    this.logger.debug('Fetched future course students', {
      courseId,
      studentCount: results.length
    });

    // 计算统计信息
    const totalCount = results.length;
    const leaveCount = results.filter(
      (s: any) =>
        s.absence_type === 'leave' || s.absence_type === 'leave_pending'
    ).length;

    return {
      students: results.map((row: any) => ({
        student_id: row.student_id,
        student_name: row.student_name,
        class_name: row.class_name,
        major_name: row.major_name,
        absence_type: row.absence_type,
        checkin_time: null,
        checkin_location: null,
        checkin_latitude: null,
        checkin_longitude: null,
        checkin_accuracy: null,
        attendance_record_id: null,
        metadata: null
      })),
      stats: {
        total_count: totalCount,
        leave_count: leaveCount
      }
    };
  }
}
