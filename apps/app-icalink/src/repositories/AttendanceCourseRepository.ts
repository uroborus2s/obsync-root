// @wps/app-icalink 考勤课程仓储实现
// 基于 Stratix 框架的仓储实现类

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { BaseRepository, sql } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcasyncAttendanceCourse
} from '../types/database.js';
import type {
  PaginatedResult,
  QueryOptions,
  ServiceResult
} from '../types/service.js';
import { ServiceErrorCode, wrapServiceCall } from '../types/service.js';
import {
  convertToPaginatedResult,
  extractOptionFromServiceResult
} from '../utils/type-fixes.js';
import type {
  AttendanceCourseQueryConditions,
  AttendanceCourseStats,
  AttendanceCourseWithDetails,
  CreateAttendanceCourseData,
  IAttendanceCourseRepository,
  UpdateAttendanceCourseData
} from './interfaces/IAttendanceCourseRepository.js';

/**
 * 考勤课程仓储实现类
 * 继承BaseRepository，实现IAttendanceCourseRepository接口
 */
export default class AttendanceCourseRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icasync_attendance_courses',
    IcasyncAttendanceCourse,
    CreateAttendanceCourseData,
    UpdateAttendanceCourseData
  >
  implements IAttendanceCourseRepository
{
  protected readonly tableName = 'icasync_attendance_courses' as const;
  protected readonly primaryKey = 'id';

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 根据外部ID查找课程
   */
  async findByExternalId(
    externalId: string
  ): Promise<ServiceResult<IcasyncAttendanceCourse | null>> {
    return wrapServiceCall(async () => {
      const result = await this.findOne((qb) =>
        qb.where('external_id', '=', externalId)
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find course by external ID'
        );
      }

      return extractOptionFromServiceResult<IcasyncAttendanceCourse>(result);
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据课程代码查找课程
   */
  async findByCourseCode(
    courseCode: string,
    semester?: string
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany((qb) => {
        let query = qb.where('course_code', '=', courseCode);

        if (semester) {
          query = query.where('semester', '=', semester);
        }

        return query;
      });

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find courses by course code'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据开课号查找课程
   */
  async findByKkh(
    kkh: string
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany((qb) =>
        qb.where('course_code', '=', kkh)
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find courses by kkh'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据学期查找课程
   */
  async findBySemester(
    semester: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany(
        (qb) => qb.where('semester', '=', semester),
        options
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find courses by semester'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据教师查找课程
   */
  async findByTeacher(
    teacherCode: string,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany((qb) => {
        let query = qb.where('teacher_codes', 'like', `%${teacherCode}%`);

        if (semester) {
          query = query.where('semester', '=', semester);
        }

        return query;
      }, options);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find courses by teacher'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据条件查询课程
   */
  async findByConditions(
    conditions: AttendanceCourseQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany((qb) => {
        let query = qb;

        if (conditions.course_code) {
          query = query.where('course_code', '=', conditions.course_code);
        }

        if (conditions.course_name) {
          query = query.where(
            'course_name',
            'like',
            `%${conditions.course_name}%`
          );
        }

        if (conditions.semester) {
          query = query.where('semester', '=', conditions.semester);
        }

        if (conditions.teaching_week) {
          query = query.where('teaching_week', '=', conditions.teaching_week);
        }

        if (conditions.week_day) {
          query = query.where('week_day', '=', conditions.week_day);
        }

        if (conditions.teacher_codes) {
          query = query.where(
            'teacher_codes',
            'like',
            `%${conditions.teacher_codes}%`
          );
        }

        if (conditions.attendance_enabled !== undefined) {
          query = query.where(
            'attendance_enabled',
            '=',
            conditions.attendance_enabled
          );
        }

        if (conditions.start_date) {
          query = query.where('start_time', '>=', conditions.start_date);
        }

        if (conditions.end_date) {
          query = query.where('end_time', '<=', conditions.end_date);
        }

        if (conditions.deleted === false) {
          query = query.whereNull('deleted_at');
        } else if (conditions.deleted === true) {
          query = query.whereNotNull('deleted_at');
        }

        return query;
      }, options);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find courses by conditions'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 分页查询课程
   */
  async findByConditionsPaginated(
    conditions: AttendanceCourseQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<IcasyncAttendanceCourse>>> {
    return wrapServiceCall(async () => {
      const result = await this.paginate((qb) => {
        let query = qb;

        if (conditions.course_code) {
          query = query.where('course_code', '=', conditions.course_code);
        }

        if (conditions.course_name) {
          query = query.where(
            'course_name',
            'like',
            `%${conditions.course_name}%`
          );
        }

        if (conditions.semester) {
          query = query.where('semester', '=', conditions.semester);
        }

        if (conditions.teaching_week) {
          query = query.where('teaching_week', '=', conditions.teaching_week);
        }

        if (conditions.week_day) {
          query = query.where('week_day', '=', conditions.week_day);
        }

        if (conditions.teacher_codes) {
          query = query.where(
            'teacher_codes',
            'like',
            `%${conditions.teacher_codes}%`
          );
        }

        if (conditions.attendance_enabled !== undefined) {
          query = query.where(
            'attendance_enabled',
            '=',
            conditions.attendance_enabled
          );
        }

        if (conditions.start_date) {
          query = query.where('start_time', '>=', conditions.start_date);
        }

        if (conditions.end_date) {
          query = query.where('end_time', '<=', conditions.end_date);
        }

        if (conditions.deleted === false) {
          query = query.whereNull('deleted_at');
        } else if (conditions.deleted === true) {
          query = query.whereNotNull('deleted_at');
        }

        return query;
      }, options?.pagination as any);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to paginate courses by conditions'
        );
      }

      return convertToPaginatedResult<IcasyncAttendanceCourse>(result.data);
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 查询课程详细信息（包含关联数据）
   */
  async findWithDetails(
    conditions: AttendanceCourseQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<AttendanceCourseWithDetails[]>> {
    return wrapServiceCall(async () => {
      // 先获取基础课程数据
      const basicResult = await this.findByConditions(conditions, options);

      if (!basicResult.success) {
        throw new Error(
          basicResult.error?.message || 'Failed to find courses with details'
        );
      }

      // 转换为详细信息格式
      const detailsData: AttendanceCourseWithDetails[] = (
        basicResult.data || []
      ).map((course) => ({
        ...course,
        student_count: 0, // 需要实现关联查询
        attendance_count: 0,
        attendance_rate: 0,
        teacher_info:
          course.teacher_codes?.split(',').map((code, index) => ({
            teacher_id: code.trim(),
            teacher_name: course.teacher_names?.split(',')[index]?.trim() || '',
            department: undefined
          })) || []
      }));

      return detailsData;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取启用考勤的课程
   */
  async getEnabledCourses(
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>> {
    return this.findByConditions(
      {
        attendance_enabled: true,
        semester,
        deleted: false
      },
      options
    );
  }

  /**
   * 获取当前活跃的课程
   */
  async getActiveCourses(
    currentTime?: Date
  ): Promise<ServiceResult<AttendanceCourseWithDetails[]>> {
    const now = currentTime || new Date();

    return this.findWithDetails({
      attendance_enabled: true,
      deleted: false
      // 这里需要添加时间范围查询逻辑
    });
  }

  /**
   * 根据时间范围查找课程
   */
  async findByTimeRange(
    startTime: Date,
    endTime: Date,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>> {
    return this.findByConditions(
      {
        start_date: startTime,
        end_date: endTime,
        deleted: false
      },
      options
    );
  }

  /**
   * 根据教学周查找课程
   */
  async findByTeachingWeek(
    teachingWeek: number,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>> {
    return this.findByConditions(
      {
        teaching_week: teachingWeek,
        semester,
        deleted: false
      },
      options
    );
  }

  /**
   * 根据星期几查找课程
   */
  async findByWeekDay(
    weekDay: number,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcasyncAttendanceCourse[]>> {
    return this.findByConditions(
      {
        week_day: weekDay,
        semester,
        deleted: false
      },
      options
    );
  }

  /**
   * 统计课程信息
   */
  async getStatistics(
    conditions?: AttendanceCourseQueryConditions
  ): Promise<ServiceResult<AttendanceCourseStats>> {
    return wrapServiceCall(async () => {
      // 这里需要使用聚合查询来统计各种状态的数量
      // 暂时返回模拟数据，后续实现具体的统计逻辑
      const stats: AttendanceCourseStats = {
        total_count: 0,
        enabled_count: 0,
        disabled_count: 0,
        active_count: 0,
        completed_count: 0,
        average_attendance_rate: 0
      };

      return stats;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 启用/禁用课程考勤
   */
  async updateAttendanceEnabled(
    id: number,
    enabled: boolean,
    updatedBy?: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.update(id, {
        attendance_enabled: enabled,
        updated_by: updatedBy,
        updated_at: new Date()
      } as UpdateAttendanceCourseData);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to update attendance enabled status'
        );
      }

      return result.data !== null;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 批量启用/禁用课程考勤
   */
  async updateAttendanceEnabledBatch(
    ids: number[],
    enabled: boolean,
    updatedBy?: string
  ): Promise<ServiceResult<number>> {
    return wrapServiceCall(async () => {
      const result = await this.updateMany((qb) => qb.whereIn('id', ids), {
        attendance_enabled: enabled,
        updated_by: updatedBy,
        updated_at: new Date()
      } as UpdateAttendanceCourseData);

      if (!result.success) {
        throw new Error(
          result.error?.message ||
            'Failed to batch update attendance enabled status'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 更新课程时间
   */
  async updateCourseTime(
    id: number,
    startTime: Date,
    endTime: Date,
    updatedBy?: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.update(id, {
        start_time: startTime,
        end_time: endTime,
        updated_by: updatedBy,
        updated_at: new Date()
      } as UpdateAttendanceCourseData);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to update course time'
        );
      }

      return result.data !== null;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 软删除课程
   */
  async softDelete(
    id: number,
    deletedBy?: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.update(id, {
        deleted_at: new Date(),
        deleted_by: deletedBy,
        updated_by: deletedBy
      } as any);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to soft delete course'
        );
      }

      return result.data !== null;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 恢复软删除的课程
   */
  async restore(
    id: number,
    restoredBy?: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.update(id, {
        deleted_at: null,
        deleted_by: null,
        updated_by: restoredBy
      } as any);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to restore course');
      }

      return result.data !== null;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 检查课程是否存在
   */
  async existsByCourseInfo(
    courseCode: string,
    semester: string,
    teachingWeek: number,
    weekDay: number
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.exists((qb) =>
        qb
          .where('course_code', '=', courseCode)
          .where('semester', '=', semester)
          .where('teaching_week', '=', teachingWeek)
          .where('week_day', '=', weekDay)
          .whereNull('deleted_at')
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to check course existence'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取课程的学生数量
   */
  async getStudentCount(courseId: number): Promise<ServiceResult<number>> {
    return wrapServiceCall(async () => {
      // 这里需要关联查询学生课程表
      // 暂时返回0，后续实现
      return 0;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取课程的考勤统计
   */
  async getAttendanceStats(courseId: number): Promise<
    ServiceResult<{
      total_students: number;
      total_records: number;
      present_count: number;
      late_count: number;
      absent_count: number;
      leave_count: number;
      attendance_rate: number;
    }>
  > {
    return wrapServiceCall(async () => {
      // 这里需要关联查询考勤记录表
      // 暂时返回模拟数据
      return {
        total_students: 0,
        total_records: 0,
        present_count: 0,
        late_count: 0,
        absent_count: 0,
        leave_count: 0,
        attendance_rate: 0
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 搜索课程
   */
  async searchCourses(
    keyword: string,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<AttendanceCourseWithDetails[]>> {
    return this.findWithDetails(
      {
        course_name: keyword,
        semester,
        deleted: false
      },
      options
    );
  }

  /**
   * 根据外部ID获取课程的开课号(kkh)
   */
  async getKkhByExternalId(
    externalId: string
  ): Promise<ServiceResult<string | null>> {
    return wrapServiceCall(async () => {
      this.logger.info({ externalId }, 'Getting kkh by external ID');

      const result = await this.findByExternalId(externalId);
      if (!result.success || !result.data) {
        this.logger.warn({ externalId }, 'Course not found by external ID');
        return null;
      }

      // 从课程代码中提取开课号，这里假设course_code就是kkh
      // 如果有其他逻辑需要调整
      return result.data.course_code;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取课程历史考勤数据
   */
  async getCourseAttendanceHistory(
    kkh: string,
    semester?: string,
    startDate?: string,
    endDate?: string
  ): Promise<
    ServiceResult<{
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
        total_students: number;
        present_count: number;
        leave_count: number;
        absent_count: number;
        attendance_rate: number;
        status: 'active' | 'closed';
        course_status: 'not_started' | 'in_progress' | 'finished';
        created_at: string;
      }>;
      overall_stats: {
        total_classes: number;
        average_attendance_rate: number;
        total_students: number;
        total_present: number;
        total_leave: number;
        total_absent: number;
      };
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info(
        { kkh, semester, startDate, endDate },
        'Getting course attendance history'
      );

      // 使用advancedQuery执行原生SQL查询
      const historyResult = await this.advancedQuery(async (db) => {
        // 构建基础查询 - 使用sql模板字面量进行参数化查询
        let query = sql`
          SELECT
            c.course_code as kkh,
            c.course_name,
            c.semester as xnxq,
            c.teacher_names,
            c.teacher_codes,
            c.id as course_id,
            c.start_time,
            c.end_time,
            c.teaching_week,
            c.class_location,
            c.periods,
            DATE(c.start_time) as class_date,
            TIME(c.start_time) as class_time,
            COUNT(DISTINCT ar.student_id) as total_students,
            COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
            COUNT(CASE WHEN ar.status = 'leave' THEN 1 END) as leave_count,
            COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
            CASE
              WHEN COUNT(DISTINCT ar.student_id) > 0
              THEN ROUND(COUNT(CASE WHEN ar.status = 'present' THEN 1 END) * 100.0 / COUNT(DISTINCT ar.student_id), 2)
              ELSE 0
            END as attendance_rate,
            CASE
              WHEN NOW() < c.start_time THEN 'not_started'
              WHEN NOW() BETWEEN c.start_time AND c.end_time THEN 'in_progress'
              ELSE 'finished'
            END as course_status,
            c.created_at
          FROM icasync_attendance_courses c
          LEFT JOIN icalink_attendance_records ar ON c.id = ar.attendance_course_id
          WHERE c.course_code = ${kkh}
            AND c.deleted_at IS NULL
        `;

        // 动态添加条件
        if (semester) {
          query = sql`${query} AND c.semester = ${semester}`;
        }

        if (startDate) {
          query = sql`${query} AND DATE(c.start_time) >= ${startDate}`;
        }

        if (endDate) {
          query = sql`${query} AND DATE(c.start_time) <= ${endDate}`;
        }

        // 添加分组和排序
        query = sql`${query}
          GROUP BY c.id, c.course_code, c.course_name, c.semester, c.teacher_names,
                   c.teacher_codes, c.start_time, c.end_time, c.teaching_week,
                   c.class_location, c.periods, c.created_at
          ORDER BY c.start_time DESC
        `;

        const result = await query.execute(db);
        return result.rows;
      });

      if (!historyResult.success || !historyResult.data) {
        throw new Error('Failed to query course attendance history');
      }

      const historyData = historyResult.data;

      // 如果没有数据，返回空结果
      if (historyData.length === 0) {
        return {
          course_info: {
            kkh,
            course_name: '',
            xnxq: semester || '',
            teachers: []
          },
          attendance_history: [],
          overall_stats: {
            total_classes: 0,
            average_attendance_rate: 0,
            total_students: 0,
            total_present: 0,
            total_leave: 0,
            total_absent: 0
          }
        };
      }

      // 获取课程基本信息（从第一条记录）
      const firstRecord = historyData[0] as any;
      const courseInfo = {
        kkh: firstRecord.kkh as string,
        course_name: firstRecord.course_name as string,
        xnxq: firstRecord.xnxq as string,
        teachers: this.parseTeachers(
          firstRecord.teacher_codes as string,
          firstRecord.teacher_names as string
        )
      };

      // 处理历史记录
      const attendanceHistory = historyData.map((record: any) => ({
        attendance_record_id: (record.course_id as number).toString(),
        class_date: record.class_date as string,
        class_time: record.class_time as string,
        class_period: (record.periods as string) || '',
        teaching_week: (record.teaching_week as number) || undefined,
        classroom: (record.class_location as string) || undefined,
        total_students: (record.total_students as number) || 0,
        present_count: (record.present_count as number) || 0,
        leave_count: (record.leave_count as number) || 0,
        absent_count: (record.absent_count as number) || 0,
        attendance_rate: (record.attendance_rate as number) || 0,
        status: 'closed' as const, // 历史记录都是已结束的
        course_status: ((record.course_status as string) === 'finished'
          ? 'finished'
          : (record.course_status as string) === 'in_progress'
            ? 'in_progress'
            : 'not_started') as 'not_started' | 'in_progress' | 'finished',
        created_at: record.created_at as string
      }));

      // 计算总体统计
      const overallStats = {
        total_classes: historyData.length,
        average_attendance_rate:
          historyData.length > 0
            ? Math.round(
                ((historyData.reduce(
                  (sum: number, record: any) =>
                    sum + ((record.attendance_rate as number) || 0),
                  0
                ) as number) /
                  historyData.length) *
                  100
              ) / 100
            : 0,
        total_students: Math.max(
          ...historyData.map(
            (record: any) => (record.total_students as number) || 0
          ),
          0
        ),
        total_present: historyData.reduce(
          (sum: number, record: any) =>
            sum + ((record.present_count as number) || 0),
          0
        ) as number,
        total_leave: historyData.reduce(
          (sum: number, record: any) =>
            sum + ((record.leave_count as number) || 0),
          0
        ) as number,
        total_absent: historyData.reduce(
          (sum: number, record: any) =>
            sum + ((record.absent_count as number) || 0),
          0
        ) as number
      };

      return {
        course_info: courseInfo,
        attendance_history: attendanceHistory,
        overall_stats: overallStats
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取个人课程统计数据
   */
  async getPersonalCourseStats(
    kkh: string,
    semester?: string
  ): Promise<
    ServiceResult<{
      course_info: {
        kkh: string;
        course_name: string;
        xnxq: string;
        total_classes: number;
        total_students: number;
        overall_attendance_rate: number;
        teachers: string;
        teacher_codes: string;
      };
      student_stats: Array<{
        xh: string;
        xm: string;
        bjmc?: string;
        zymc?: string;
        attendance_rate: number;
        present_count: number;
        absent_count: number;
        leave_count: number;
        total_classes: number;
        recent_records: Array<{
          class_date: string;
          status:
            | 'not_started'
            | 'present'
            | 'absent'
            | 'leave'
            | 'pending_approval'
            | 'leave_pending';
          checkin_time?: string;
          leave_reason?: string;
        }>;
      }>;
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info({ kkh, semester }, 'Getting personal course stats');

      // 首先获取课程基本信息（仅从default数据库查询）
      const courseInfoResult = await this.advancedQuery(async (db) => {
        let query = sql`
          SELECT
            c.course_code as kkh,
            c.course_name,
            c.semester as xnxq,
            c.teacher_names,
            c.teacher_codes,
            COUNT(DISTINCT c.id) as total_classes
          FROM icasync_attendance_courses c
          WHERE c.course_code = ${kkh}
            AND c.deleted_at IS NULL
        `;

        if (semester) {
          query = sql`${query} AND c.semester = ${semester}`;
        }

        query = sql`${query} GROUP BY c.course_code, c.course_name, c.semester, c.teacher_names, c.teacher_codes`;

        const result = await query.execute(db);
        return result.rows;
      });

      if (
        !courseInfoResult.success ||
        !courseInfoResult.data ||
        courseInfoResult.data.length === 0
      ) {
        throw new Error('Course not found');
      }

      const courseInfo = courseInfoResult.data[0] as any;

      // 第一步：从syncdb数据库获取选课学生列表
      const enrolledStudentsResult = await this.advancedQuery(async (db) => {
        let query = sql`
          SELECT DISTINCT
            s.xh,
            s.xm,
            s.bjmc,
            s.zymc
          FROM out_jw_kcb_xs kcb
          INNER JOIN out_xsxx s ON kcb.xh = s.xh
          WHERE kcb.kkh = ${kkh}
            AND (s.zt IS NULL OR (s.zt != '毕业' AND s.zt != '退学'))
        `;

        if (semester) {
          query = sql`${query} AND kcb.xnxq = ${semester}`;
        }

        query = sql`${query} ORDER BY s.xh ASC`;

        const result = await query.execute(db);
        return result.rows;
      }, { connectionName: 'syncdb' });

      if (!enrolledStudentsResult.success) {
        throw new Error('Failed to query enrolled students');
      }

      const enrolledStudents = (enrolledStudentsResult.data as any[]) || [];
      
      if (enrolledStudents.length === 0) {
        // 如果没有选课学生，返回空结果
        return {
          course_info: {
            kkh: courseInfo.kkh,
            course_name: courseInfo.course_name,
            xnxq: courseInfo.xnxq,
            total_classes: courseInfo.total_classes || 0,
            total_students: 0,
            overall_attendance_rate: 0,
            teachers: courseInfo.teacher_names || '',
            teacher_codes: courseInfo.teacher_codes || ''
          },
          student_stats: []
        };
      }

      // 第二步：为每个学生查询考勤统计数据
      const studentStats = await Promise.all(
        enrolledStudents.map(async (student) => {
          // 查询学生的考勤统计
          const attendanceStatsResult = await this.advancedQuery(async (db) => {
            let query = sql`
              SELECT
                COUNT(ar.id) as total_classes,
                COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN ar.status = 'leave' THEN 1 END) as leave_count,
                CASE
                  WHEN COUNT(ar.id) > 0
                  THEN ROUND(COUNT(CASE WHEN ar.status = 'present' THEN 1 END) * 100.0 / COUNT(ar.id), 2)
                  ELSE 0
                END as attendance_rate
              FROM icalink_attendance_records ar
              INNER JOIN icasync_attendance_courses c ON ar.attendance_course_id = c.id
              WHERE ar.student_id = ${student.xh}
                AND c.course_code = ${kkh}
                AND c.deleted_at IS NULL
            `;

            if (semester) {
              query = sql`${query} AND c.semester = ${semester}`;
            }

            const result = await query.execute(db);
            return result.rows;
          });

          // 查询学生的最近考勤记录
          const recentResult = await this.advancedQuery(async (db) => {
            let query = sql`
              SELECT
                DATE(c.start_time) as class_date,
                ar.status,
                ar.checkin_time,
                la.leave_reason
              FROM icalink_attendance_records ar
              INNER JOIN icasync_attendance_courses c ON ar.attendance_course_id = c.id
              LEFT JOIN icalink_leave_applications la ON ar.id = la.attendance_record_id
              WHERE ar.student_id = ${student.xh}
                AND c.course_code = ${kkh}
                AND c.deleted_at IS NULL
            `;

            if (semester) {
              query = sql`${query} AND c.semester = ${semester}`;
            }

            query = sql`${query} ORDER BY c.start_time DESC LIMIT 5`;

            const result = await query.execute(db);
            return result.rows;
          });

          // 处理考勤统计数据
          const statsData = attendanceStatsResult.success && attendanceStatsResult.data && attendanceStatsResult.data.length > 0
            ? attendanceStatsResult.data[0] as any
            : {
                total_classes: 0,
                present_count: 0,
                absent_count: 0,
                leave_count: 0,
                attendance_rate: 0
              };

          // 处理最近考勤记录
          const recentRecords = (
            recentResult.success ? recentResult.data : []
          ) as any[];

          return {
            xh: student.xh,
            xm: student.xm || '',
            bjmc: student.bjmc || '',
            zymc: student.zymc || '',
            attendance_rate: Number(statsData.attendance_rate) || 0,
            present_count: Number(statsData.present_count) || 0,
            absent_count: Number(statsData.absent_count) || 0,
            leave_count: Number(statsData.leave_count) || 0,
            total_classes: Number(statsData.total_classes) || 0,
            recent_records: recentRecords.map((record) => ({
              class_date: record.class_date,
              status: record.status || 'not_started',
              checkin_time: record.checkin_time,
              leave_reason: record.leave_reason
            }))
          };
        })
      );

      // 计算总体统计
      const totalStudents = enrolledStudents.length;
      const studentsWithAttendance = studentStats.filter(s => s.total_classes > 0);
      const overallAttendanceRate = studentsWithAttendance.length > 0
        ? Math.round(
            studentsWithAttendance.reduce((sum, student) => sum + student.attendance_rate, 0) / 
            studentsWithAttendance.length * 100
          ) / 100
        : 0;

      return {
        course_info: {
          kkh: courseInfo.kkh,
          course_name: courseInfo.course_name,
          xnxq: courseInfo.xnxq,
          total_classes: courseInfo.total_classes || 0,
          total_students: totalStudents,
          overall_attendance_rate: overallAttendanceRate,
          teachers: courseInfo.teacher_names || '',
          teacher_codes: courseInfo.teacher_codes || ''
        },
        student_stats: studentStats
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 解析教师信息
   * @private
   */
  private parseTeachers(
    teacherCodes?: string,
    teacherNames?: string
  ): Array<{ gh: string; xm: string }> {
    if (!teacherCodes || !teacherNames) {
      return [];
    }

    const codes = teacherCodes.split(',').map((code) => code.trim());
    const names = teacherNames.split(',').map((name) => name.trim());

    return codes.map((code, index) => ({
      gh: code,
      xm: names[index] || ''
    }));
  }
}
