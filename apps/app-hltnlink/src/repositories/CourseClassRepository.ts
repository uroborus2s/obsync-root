// @wps/hltnlink CourseClass Repository 实现
// 基于Stratix框架的Repository层实现

import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DatabaseErrorHandler,
  type DatabaseResult
} from '@stratix/database';
import type {
  CourseClass,
  CourseClassFilter,
  CourseClassUpdate,
  CourseQueryParams,
  HltnlinkDatabase,
  NewCourseClass,
  PaginatedResult,
  PermissionType,
  QueryOptions,
  SemesterQueryParams,
  ShareStatus,
  StudentQueryParams
} from '../types/database.schema.js';
import type { ICourseClassRepository } from './interfaces/ICourseClassRepository.js';
import { courseClassTableSchema } from './schemas/course-class-schema.js';

/**
 * CourseClass Repository 实现类
 * 继承BaseRepository并实现ICourseClassRepository接口
 */
export class CourseClassRepository
  extends BaseRepository<
    HltnlinkDatabase,
    'course_classes',
    CourseClass,
    NewCourseClass,
    CourseClassUpdate
  >
  implements ICourseClassRepository
{
  protected readonly tableName = 'course_classes' as const;
  protected readonly primaryKey = 'id';

  // 表结构定义 - 用于自动表创建
  protected readonly tableSchema = courseClassTableSchema;

  constructor(protected readonly logger: Logger) {
    super();
  }

  // ========== 基础查询方法 ==========

  async findByCalendarId(
    calendarId: number,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('calendar_id', '=', calendarId);

      // 应用排序
      if (options?.sort) {
        for (const sort of options.sort) {
          query = query.orderBy(sort.field as any, sort.direction);
        }
      } else {
        query = query.orderBy('student_name', 'asc');
      }

      // 应用分页
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query.execute();

      this.logOperation('findByCalendarId', { calendarId, options });
      return results;
    }, 'course-class-repository-find-by-calendar-id');
  }

  async findByCourseId(
    params: CourseQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('course_id', '=', params.course_id);

      if (params.xnxq) {
        query = query.where('xnxq', '=', params.xnxq);
      }

      // 应用排序
      if (options?.sort) {
        for (const sort of options.sort) {
          query = query.orderBy(sort.field as any, sort.direction);
        }
      } else {
        query = query.orderBy('student_name', 'asc');
      }

      // 应用分页
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query.execute();

      this.logOperation('findByCourseId', { params, options });
      return results;
    }, 'course-class-repository-find-by-course-id');
  }

  async findByStudentNumber(
    params: StudentQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('student_number', '=', params.student_number);

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

      this.logOperation('findByStudentNumber', { params, options });
      return results;
    }, 'course-class-repository-find-by-student-number');
  }

  async findBySemester(
    params: SemesterQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>> {
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
          .orderBy('course_id', 'asc')
          .orderBy('student_name', 'asc');
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
    }, 'course-class-repository-find-by-semester');
  }

  // ========== 高级查询方法 ==========

  async findByFilter(
    filter: CourseClassFilter,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection.selectFrom(this.tableName).selectAll();

      // 应用过滤条件
      if (filter.calendar_id) {
        query = query.where('calendar_id', '=', filter.calendar_id);
      }
      if (filter.course_id) {
        query = query.where('course_id', '=', filter.course_id);
      }
      if (filter.student_number) {
        query = query.where('student_number', '=', filter.student_number);
      }
      if (filter.xnxq) {
        query = query.where('xnxq', '=', filter.xnxq);
      }
      if (filter.share_status) {
        query = query.where('share_status', '=', filter.share_status);
      }
      if (filter.permission_type) {
        query = query.where('permission_type', '=', filter.permission_type);
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
    }, 'course-class-repository-find-by-filter');
  }

  async findPaginated(
    filter?: CourseClassFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<DatabaseResult<PaginatedResult<CourseClass>>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const offset = (page - 1) * limit;

      // 构建基础查询
      let baseQuery = connection.selectFrom(this.tableName);

      // 应用过滤条件
      if (filter) {
        if (filter.calendar_id) {
          baseQuery = baseQuery.where('calendar_id', '=', filter.calendar_id);
        }
        if (filter.course_id) {
          baseQuery = baseQuery.where('course_id', '=', filter.course_id);
        }
        if (filter.student_number) {
          baseQuery = baseQuery.where(
            'student_number',
            '=',
            filter.student_number
          );
        }
        if (filter.xnxq) {
          baseQuery = baseQuery.where('xnxq', '=', filter.xnxq);
        }
        if (filter.share_status) {
          baseQuery = baseQuery.where('share_status', '=', filter.share_status);
        }
        if (filter.permission_type) {
          baseQuery = baseQuery.where(
            'permission_type',
            '=',
            filter.permission_type
          );
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

      const result: PaginatedResult<CourseClass> = {
        data,
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrevious: page > 1
      };

      this.logOperation('findPaginated', { filter, page, limit, total });
      return result;
    }, 'course-class-repository-find-paginated');
  }

  // ========== 业务查询方法 ==========

  async findByShareStatus(
    shareStatus: ShareStatus,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>> {
    const filter: CourseClassFilter = { share_status: shareStatus };
    if (xnxq) {
      filter.xnxq = xnxq;
    }
    return this.findByFilter(filter, options);
  }

  async findByPermissionType(
    permissionType: PermissionType,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>> {
    const filter: CourseClassFilter = { permission_type: permissionType };
    if (xnxq) {
      filter.xnxq = xnxq;
    }
    return this.findByFilter(filter, options);
  }

  async findPendingShares(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>> {
    return this.findByShareStatus('PENDING', xnxq, options);
  }

  async findFailedShares(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CourseClass[]>> {
    return this.findByShareStatus('FAILED', xnxq, options);
  }

  async existsByCalendarAndStudent(
    calendarId: number,
    studentNumber: string
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .select('id')
        .where('calendar_id', '=', calendarId)
        .where('student_number', '=', studentNumber)
        .executeTakeFirst();

      this.logOperation('existsByCalendarAndStudent', {
        calendarId,
        studentNumber
      });
      return !!result;
    }, 'course-class-repository-exists-by-calendar-student');
  }

  async existsByCourseAndStudent(
    courseId: string,
    studentNumber: string,
    xnxq: string
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .select('id')
        .where('course_id', '=', courseId)
        .where('student_number', '=', studentNumber)
        .where('xnxq', '=', xnxq)
        .executeTakeFirst();

      this.logOperation('existsByCourseAndStudent', {
        courseId,
        studentNumber,
        xnxq
      });
      return !!result;
    }, 'course-class-repository-exists-by-course-student');
  }

  // ========== 批量操作方法 ==========

  async updateShareStatusBatch(
    ids: number[],
    shareStatus: ShareStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getWriteConnection();
      const result = await connection
        .updateTable(this.tableName)
        .set({
          share_status: shareStatus,
          updated_at: new Date().toISOString()
        })
        .where('id', 'in', ids)
        .execute();

      const updatedCount = Number(result[0]?.numUpdatedRows || 0);
      this.logOperation('updateShareStatusBatch', {
        ids,
        shareStatus,
        updatedCount
      });
      return updatedCount;
    }, 'course-class-repository-update-share-status-batch');
  }

  async updateWpsUserInfoBatch(
    updates: Array<{
      id: number;
      wps_user_id?: string;
      wps_email?: string;
    }>
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getWriteConnection();
      let totalUpdated = 0;

      // 使用事务批量更新
      await connection.transaction().execute(async (trx) => {
        for (const update of updates) {
          const updateData: Partial<CourseClassUpdate> = {
            updated_at: new Date().toISOString()
          };

          if (update.wps_user_id !== undefined) {
            updateData.wps_user_id = update.wps_user_id;
          }
          if (update.wps_email !== undefined) {
            updateData.wps_email = update.wps_email;
          }

          const result = await trx
            .updateTable(this.tableName)
            .set(updateData)
            .where('id', '=', update.id)
            .execute();

          totalUpdated += Number(result[0]?.numUpdatedRows || 0);
        }
      });

      this.logOperation('updateWpsUserInfoBatch', {
        updateCount: updates.length,
        totalUpdated
      });
      return totalUpdated;
    }, 'course-class-repository-update-wps-user-info-batch');
  }

  async deleteByCalendarId(
    calendarId: number
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getWriteConnection();
      const result = await connection
        .deleteFrom(this.tableName)
        .where('calendar_id', '=', calendarId)
        .execute();

      const deletedCount = Number(result[0]?.numDeletedRows || 0);
      this.logOperation('deleteByCalendarId', { calendarId, deletedCount });
      return deletedCount;
    }, 'course-class-repository-delete-by-calendar-id');
  }

  // ========== 统计查询方法 ==========

  async countByCalendar(
    calendarId: number,
    shareStatus?: ShareStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select((eb) => eb.fn.count('id').as('count'))
        .where('calendar_id', '=', calendarId);

      if (shareStatus) {
        query = query.where('share_status', '=', shareStatus);
      }

      const result = await query.executeTakeFirst();
      const count = Number(result?.count || 0);

      this.logOperation('countByCalendar', { calendarId, shareStatus, count });
      return count;
    }, 'course-class-repository-count-by-calendar');
  }

  async countByCourse(
    courseId: string,
    xnxq: string,
    shareStatus?: ShareStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select((eb) => eb.fn.count('id').as('count'))
        .where('course_id', '=', courseId)
        .where('xnxq', '=', xnxq);

      if (shareStatus) {
        query = query.where('share_status', '=', shareStatus);
      }

      const result = await query.executeTakeFirst();
      const count = Number(result?.count || 0);

      this.logOperation('countByCourse', {
        courseId,
        xnxq,
        shareStatus,
        count
      });
      return count;
    }, 'course-class-repository-count-by-course');
  }

  async countBySemester(
    xnxq: string,
    shareStatus?: ShareStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select((eb) => eb.fn.count('id').as('count'))
        .where('xnxq', '=', xnxq);

      if (shareStatus) {
        query = query.where('share_status', '=', shareStatus);
      }

      const result = await query.executeTakeFirst();
      const count = Number(result?.count || 0);

      this.logOperation('countBySemester', { xnxq, shareStatus, count });
      return count;
    }, 'course-class-repository-count-by-semester');
  }

  async getShareStatusStats(xnxq?: string): Promise<
    DatabaseResult<
      Array<{
        share_status: ShareStatus;
        count: number;
      }>
    >
  > {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select(['share_status', (eb) => eb.fn.count('id').as('count')])
        .groupBy('share_status');

      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      const results = await query.execute();
      const stats = results.map((row) => ({
        share_status: row.share_status,
        count: Number(row.count)
      }));

      this.logOperation('getShareStatusStats', {
        xnxq,
        statsCount: stats.length
      });
      return stats;
    }, 'course-class-repository-get-share-status-stats');
  }

  async getStudentsByCalendar(calendarId: number): Promise<
    DatabaseResult<
      Array<{
        student_number: string;
        student_name: string;
        student_school?: string;
        student_major?: string;
        student_class?: string;
      }>
    >
  > {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const results = await connection
        .selectFrom(this.tableName)
        .select([
          'student_number',
          'student_name',
          'student_school',
          'student_major',
          'student_class'
        ])
        .where('calendar_id', '=', calendarId)
        .groupBy([
          'student_number',
          'student_name',
          'student_school',
          'student_major',
          'student_class'
        ])
        .orderBy('student_name', 'asc')
        .execute();

      const students = results.map((row) => ({
        student_number: row.student_number,
        student_name: row.student_name,
        student_school: row.student_school || undefined,
        student_major: row.student_major || undefined,
        student_class: row.student_class || undefined
      }));

      this.logOperation('getStudentsByCalendar', {
        calendarId,
        count: students.length
      });
      return students;
    }, 'course-class-repository-get-students-by-calendar');
  }

  async getCoursesBySemester(xnxq: string): Promise<
    DatabaseResult<
      Array<{
        course_id: string;
        student_count: number;
      }>
    >
  > {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const results = await connection
        .selectFrom(this.tableName)
        .select(['course_id', (eb) => eb.fn.count('id').as('student_count')])
        .where('xnxq', '=', xnxq)
        .groupBy('course_id')
        .orderBy('course_id', 'asc')
        .execute();

      const courses = results.map((row) => ({
        course_id: row.course_id,
        student_count: Number(row.student_count)
      }));

      this.logOperation('getCoursesBySemester', {
        xnxq,
        count: courses.length
      });
      return courses;
    }, 'course-class-repository-get-courses-by-semester');
  }
}
