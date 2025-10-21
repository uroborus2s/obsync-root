// @wps/hltnlink Calendar Repository 实现
// 基于Stratix框架的Repository层实现

import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DatabaseErrorHandler,
  type DatabaseResult
} from '@stratix/database';

import type {
  Calendar,
  CalendarFilter,
  CalendarStatus,
  CalendarUpdate,
  HltnlinkDatabase,
  NewCalendar,
  PaginatedResult,
  QueryOptions,
  SemesterQueryParams,
  TeacherQueryParams
} from '../types/database.schema.js';
import type { ICalendarRepository } from './interfaces/ICalendarRepository.js';
import { calendarTableSchema } from './schemas/calendar-schema.js';

/**
 * Calendar Repository 实现类
 * 继承BaseRepository并实现ICalendarRepository接口
 */
export default class CalendarRepository
  extends BaseRepository<
    HltnlinkDatabase,
    'calendars',
    Calendar,
    NewCalendar,
    CalendarUpdate
  >
  implements ICalendarRepository
{
  protected readonly tableName = 'calendars' as const;
  protected readonly primaryKey = 'id';

  // 表结构定义 - 用于自动表创建
  protected readonly tableSchema = calendarTableSchema;

  constructor(protected readonly logger: Logger) {
    super('default', { enabled: true });
  }

  // ========== 基础查询方法 ==========

  async findByWpsCalendarId(
    wpsCalendarId: string
  ): Promise<DatabaseResult<Calendar | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('wps_calendar_id', '=', wpsCalendarId)
        .executeTakeFirst();

      this.logOperation('findByWpsCalendarId', { wpsCalendarId });
      return result || null;
    }, 'calendar-repository-find-by-wps-id');
  }

  async findByCourseId(
    courseId: string,
    xnxq?: string
  ): Promise<DatabaseResult<Calendar | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('course_id', '=', courseId);

      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      const result = await query.executeTakeFirst();

      this.logOperation('findByCourseId', { courseId, xnxq });
      return result || null;
    }, 'calendar-repository-find-by-course-id');
  }

  async findByTeacherId(
    params: TeacherQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('teacher_id', '=', params.teacher_id);

      if (params.xnxq) {
        query = query.where('xnxq', '=', params.xnxq);
      }

      // 应用排序
      if (options?.sort) {
        for (const sort of options.sort) {
          query = query.orderBy(sort.field as any, sort.direction);
        }
      } else {
        query = query.orderBy('created_at', 'desc');
      }

      // 应用分页
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query.execute();

      this.logOperation('findByTeacherId', { params, options });
      return results;
    }, 'calendar-repository-find-by-teacher-id');
  }

  async findBySemester(
    params: SemesterQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('xnxq', '=', params.xnxq);

      // 应用排序
      if (options?.sort) {
        for (const sort of options.sort) {
          query = query.orderBy(sort.field as any, sort.direction);
        }
      } else {
        query = query
          .orderBy('teacher_name', 'asc')
          .orderBy('course_name', 'asc');
      }

      // 应用分页
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query.execute();

      this.logOperation('findBySemester', { params, options });
      return results;
    }, 'calendar-repository-find-by-semester');
  }

  // ========== 高级查询方法 ==========

  async findByFilter(
    filter: CalendarFilter,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection.selectFrom(this.tableName).selectAll();

      // 应用过滤条件
      if (filter.status) {
        query = query.where('status', '=', filter.status);
      }
      if (filter.teacher_id) {
        query = query.where('teacher_id', '=', filter.teacher_id);
      }
      if (filter.course_id) {
        query = query.where('course_id', '=', filter.course_id);
      }
      if (filter.xnxq) {
        query = query.where('xnxq', '=', filter.xnxq);
      }
      if (filter.academic_year) {
        query = query.where('academic_year', '=', filter.academic_year);
      }
      if (filter.semester) {
        query = query.where('semester', '=', filter.semester);
      }

      // 应用排序
      if (options?.sort) {
        for (const sort of options.sort) {
          query = query.orderBy(sort.field as any, sort.direction);
        }
      } else {
        query = query.orderBy('created_at', 'desc');
      }

      // 应用分页
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query.execute();

      this.logOperation('findByFilter', { filter, options });
      return results;
    }, 'calendar-repository-find-by-filter');
  }

  async findPaginated(
    filter?: CalendarFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<DatabaseResult<PaginatedResult<Calendar>>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const offset = (page - 1) * limit;

      // 构建基础查询
      let baseQuery = connection.selectFrom(this.tableName);

      // 应用过滤条件
      if (filter) {
        if (filter.status) {
          baseQuery = baseQuery.where('status', '=', filter.status);
        }
        if (filter.teacher_id) {
          baseQuery = baseQuery.where('teacher_id', '=', filter.teacher_id);
        }
        if (filter.course_id) {
          baseQuery = baseQuery.where('course_id', '=', filter.course_id);
        }
        if (filter.xnxq) {
          baseQuery = baseQuery.where('xnxq', '=', filter.xnxq);
        }
        if (filter.academic_year) {
          baseQuery = baseQuery.where(
            'academic_year',
            '=',
            filter.academic_year
          );
        }
        if (filter.semester) {
          baseQuery = baseQuery.where('semester', '=', filter.semester);
        }
      }

      // 获取总数
      const totalResult = await baseQuery
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst();
      const total = Number(totalResult?.count || 0);

      // 获取数据
      const data = await baseQuery
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      const result: PaginatedResult<Calendar> = {
        data,
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrevious: page > 1
      };

      this.logOperation('findPaginated', { filter, page, limit, total });
      return result;
    }, 'calendar-repository-find-paginated');
  }

  // ========== 业务查询方法 ==========

  async findActiveCalendars(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>> {
    const filter: CalendarFilter = { status: 'ACTIVE' };
    if (xnxq) {
      filter.xnxq = xnxq;
    }
    return this.findByFilter(filter, options);
  }

  async findByStatus(
    status: CalendarStatus,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<Calendar[]>> {
    const filter: CalendarFilter = { status };
    if (xnxq) {
      filter.xnxq = xnxq;
    }
    return this.findByFilter(filter, options);
  }

  async existsByCourseAndSemester(
    courseId: string,
    xnxq: string
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .select('id')
        .where('course_id', '=', courseId)
        .where('xnxq', '=', xnxq)
        .executeTakeFirst();

      this.logOperation('existsByCourseAndSemester', { courseId, xnxq });
      return !!result;
    }, 'calendar-repository-exists-by-course-semester');
  }

  async existsByWpsCalendarId(
    wpsCalendarId: string
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .select('id')
        .where('wps_calendar_id', '=', wpsCalendarId)
        .executeTakeFirst();

      this.logOperation('existsByWpsCalendarId', { wpsCalendarId });
      return !!result;
    }, 'calendar-repository-exists-by-wps-id');
  }

  // ========== 批量操作方法 ==========

  async updateStatusBatch(
    calendarIds: string[],
    status: CalendarStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getWriteConnection();
      const result = await connection
        .updateTable(this.tableName)
        .set({
          status,
          updated_at: new Date().toISOString()
        })
        .where('id', 'in', calendarIds)
        .execute();

      const updatedCount = Number(result[0]?.numUpdatedRows || 0);
      this.logOperation('updateStatusBatch', {
        calendarIds,
        status,
        updatedCount
      });
      return updatedCount;
    }, 'calendar-repository-update-status-batch');
  }

  async updateStatusBySemester(
    xnxq: string,
    status: CalendarStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getWriteConnection();
      const result = await connection
        .updateTable(this.tableName)
        .set({
          status,
          updated_at: new Date().toISOString()
        })
        .where('xnxq', '=', xnxq)
        .execute();

      const updatedCount = Number(result[0]?.numUpdatedRows || 0);
      this.logOperation('updateStatusBySemester', {
        xnxq,
        status,
        updatedCount
      });
      return updatedCount;
    }, 'calendar-repository-update-status-by-semester');
  }

  // ========== 统计查询方法 ==========

  async countBySemester(
    xnxq: string,
    status?: CalendarStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select((eb) => eb.fn.count('id').as('count'))
        .where('xnxq', '=', xnxq);

      if (status) {
        query = query.where('status', '=', status);
      }

      const result = await query.executeTakeFirst();
      const count = Number(result?.count || 0);

      this.logOperation('countBySemester', { xnxq, status, count });
      return count;
    }, 'calendar-repository-count-by-semester');
  }

  async countByTeacher(
    teacherId: string,
    xnxq?: string
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select((eb) => eb.fn.count('id').as('count'))
        .where('teacher_id', '=', teacherId);

      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      const result = await query.executeTakeFirst();
      const count = Number(result?.count || 0);

      this.logOperation('countByTeacher', { teacherId, xnxq, count });
      return count;
    }, 'calendar-repository-count-by-teacher');
  }

  async getDistinctSemesters(): Promise<DatabaseResult<string[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const results = await connection
        .selectFrom(this.tableName)
        .select('xnxq')
        .distinct()
        .where('xnxq', 'is not', null)
        .orderBy('xnxq', 'desc')
        .execute();

      const semesters = results
        .map((row) => row.xnxq)
        .filter((xnxq): xnxq is string => xnxq !== null);

      this.logOperation('getDistinctSemesters', { count: semesters.length });
      return semesters;
    }, 'calendar-repository-get-distinct-semesters');
  }

  async getTeachersBySemester(xnxq: string): Promise<
    DatabaseResult<
      Array<{
        teacher_id: string;
        teacher_name: string;
        calendar_count: number;
      }>
    >
  > {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const results = await connection
        .selectFrom(this.tableName)
        .select([
          'teacher_id',
          'teacher_name',
          (eb) => eb.fn.count('id').as('calendar_count')
        ])
        .where('xnxq', '=', xnxq)
        .groupBy(['teacher_id', 'teacher_name'])
        .orderBy('teacher_name', 'asc')
        .execute();

      const teachers = results.map((row) => ({
        teacher_id: row.teacher_id,
        teacher_name: row.teacher_name,
        calendar_count: Number(row.calendar_count)
      }));

      this.logOperation('getTeachersBySemester', {
        xnxq,
        count: teachers.length
      });
      return teachers;
    }, 'calendar-repository-get-teachers-by-semester');
  }
}
