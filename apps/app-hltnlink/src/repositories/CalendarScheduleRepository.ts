// @wps/hltnlink CalendarSchedule Repository 实现
// 基于Stratix框架的Repository层实现

import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DatabaseErrorHandler,
  type DatabaseResult
} from '@stratix/database';
import type {
  CalendarSchedule,
  CalendarScheduleFilter,
  CalendarScheduleUpdate,
  CourseQueryParams,
  HltnlinkDatabase,
  NewCalendarSchedule,
  PaginatedResult,
  QueryOptions,
  RecurrenceType,
  SemesterQueryParams,
  SyncStatus,
  TimeRangeQueryParams
} from '../types/database.schema.js';
import type { ICalendarScheduleRepository } from './interfaces/ICalendarScheduleRepository.js';
import { calendarScheduleTableSchema } from './schemas/calendar-schedule-schema.js';

/**
 * CalendarSchedule Repository 实现类
 * 继承BaseRepository并实现ICalendarScheduleRepository接口
 */
export class CalendarScheduleRepository
  extends BaseRepository<
    HltnlinkDatabase,
    'calendar_schedules',
    CalendarSchedule,
    NewCalendarSchedule,
    CalendarScheduleUpdate
  >
  implements ICalendarScheduleRepository
{
  protected readonly tableName = 'calendar_schedules' as const;
  protected readonly primaryKey = 'id';

  // 表结构定义 - 用于自动表创建
  protected readonly tableSchema = calendarScheduleTableSchema;

  constructor(protected logger: Logger) {
    super();
  }

  // ========== 基础查询方法 ==========

  async findByCalendarId(
    calendarId: number,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
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
        query = query.orderBy('start_time', 'asc');
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
    }, 'calendar-schedule-repository-find-by-calendar-id');
  }

  async findByCourseId(
    params: CourseQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
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
        query = query.orderBy('start_time', 'asc');
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
    }, 'calendar-schedule-repository-find-by-course-id');
  }

  async findByWpsEventId(
    wpsEventId: string
  ): Promise<DatabaseResult<CalendarSchedule | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('wps_event_id', '=', wpsEventId)
        .executeTakeFirst();

      this.logOperation('findByWpsEventId', { wpsEventId });
      return result || null;
    }, 'calendar-schedule-repository-find-by-wps-event-id');
  }

  async findBySemester(
    params: SemesterQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
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
        query = query.orderBy('start_time', 'asc');
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
    }, 'calendar-schedule-repository-find-by-semester');
  }

  async findByTimeRange(
    params: TimeRangeQueryParams,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('start_time', '>=', params.start_time)
        .where('end_time', '<=', params.end_time);

      if (params.xnxq) {
        query = query.where('xnxq', '=', params.xnxq);
      }

      // 应用排序
      if (options?.sort) {
        for (const sort of options.sort) {
          query = query.orderBy(sort.field as any, sort.direction);
        }
      } else {
        query = query.orderBy('start_time', 'asc');
      }

      // 应用分页
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query.execute();

      this.logOperation('findByTimeRange', { params, options });
      return results;
    }, 'calendar-schedule-repository-find-by-time-range');
  }

  // ========== 高级查询方法 ==========

  async findByFilter(
    filter: CalendarScheduleFilter,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
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
      if (filter.xnxq) {
        query = query.where('xnxq', '=', filter.xnxq);
      }
      if (filter.sync_status) {
        query = query.where('sync_status', '=', filter.sync_status);
      }
      if (filter.week_number) {
        query = query.where('week_number', '=', filter.week_number);
      }
      if (filter.weekday) {
        query = query.where('weekday', '=', filter.weekday);
      }
      if (filter.start_date) {
        query = query.where('start_time', '>=', filter.start_date);
      }
      if (filter.end_date) {
        query = query.where('end_time', '<=', filter.end_date);
      }

      // 应用排序
      if (options?.sort) {
        for (const sort of options.sort) {
          query = query.orderBy(sort.field as any, sort.direction);
        }
      } else {
        query = query.orderBy('start_time', 'asc');
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
    }, 'calendar-schedule-repository-find-by-filter');
  }

  async findPaginated(
    filter?: CalendarScheduleFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<DatabaseResult<PaginatedResult<CalendarSchedule>>> {
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
        if (filter.xnxq) {
          baseQuery = baseQuery.where('xnxq', '=', filter.xnxq);
        }
        if (filter.sync_status) {
          baseQuery = baseQuery.where('sync_status', '=', filter.sync_status);
        }
        if (filter.week_number) {
          baseQuery = baseQuery.where('week_number', '=', filter.week_number);
        }
        if (filter.weekday) {
          baseQuery = baseQuery.where('weekday', '=', filter.weekday);
        }
        if (filter.start_date) {
          baseQuery = baseQuery.where('start_time', '>=', filter.start_date);
        }
        if (filter.end_date) {
          baseQuery = baseQuery.where('end_time', '<=', filter.end_date);
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
        .orderBy('start_time', 'asc')
        .limit(limit)
        .offset(offset)
        .execute();

      const result: PaginatedResult<CalendarSchedule> = {
        data,
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrevious: page > 1
      };

      this.logOperation('findPaginated', { filter, page, limit, total });
      return result;
    }, 'calendar-schedule-repository-find-paginated');
  }

  // ========== 业务查询方法 ==========

  async findBySyncStatus(
    syncStatus: SyncStatus,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
    const filter: CalendarScheduleFilter = { sync_status: syncStatus };
    if (xnxq) {
      filter.xnxq = xnxq;
    }
    return this.findByFilter(filter, options);
  }

  async findByRecurrenceType(
    recurrenceType: RecurrenceType,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('recurrence_type', '=', recurrenceType);

      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      // 应用排序
      if (options?.sort) {
        for (const sort of options.sort) {
          query = query.orderBy(sort.field as any, sort.direction);
        }
      } else {
        query = query.orderBy('start_time', 'asc');
      }

      // 应用分页
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query.execute();

      this.logOperation('findByRecurrenceType', {
        recurrenceType,
        xnxq,
        options
      });
      return results;
    }, 'calendar-schedule-repository-find-by-recurrence-type');
  }

  async findPendingSync(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
    return this.findBySyncStatus('PENDING', xnxq, options);
  }

  async findFailedSync(
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
    return this.findBySyncStatus('FAILED', xnxq, options);
  }

  async findByWeekdayAndWeek(
    weekday: number,
    weekNumber?: number,
    xnxq?: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarSchedule[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('weekday', '=', weekday);

      if (weekNumber) {
        query = query.where('week_number', '=', weekNumber);
      }
      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      // 应用排序
      if (options?.sort) {
        for (const sort of options.sort) {
          query = query.orderBy(sort.field as any, sort.direction);
        }
      } else {
        query = query.orderBy('start_time', 'asc');
      }

      // 应用分页
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query.execute();

      this.logOperation('findByWeekdayAndWeek', {
        weekday,
        weekNumber,
        xnxq,
        options
      });
      return results;
    }, 'calendar-schedule-repository-find-by-weekday-week');
  }

  async existsByWpsEventId(
    wpsEventId: string
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .select('id')
        .where('wps_event_id', '=', wpsEventId)
        .executeTakeFirst();

      this.logOperation('existsByWpsEventId', { wpsEventId });
      return !!result;
    }, 'calendar-schedule-repository-exists-by-wps-event-id');
  }

  async hasTimeConflict(
    calendarId: number,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select('id')
        .where('calendar_id', '=', calendarId)
        .where((eb) =>
          eb.or([
            // 新时间段的开始时间在现有时间段内
            eb.and([
              eb('start_time', '<=', startTime),
              eb('end_time', '>', startTime)
            ]),
            // 新时间段的结束时间在现有时间段内
            eb.and([
              eb('start_time', '<', endTime),
              eb('end_time', '>=', endTime)
            ]),
            // 新时间段包含现有时间段
            eb.and([
              eb('start_time', '>=', startTime),
              eb('end_time', '<=', endTime)
            ])
          ])
        );

      if (excludeId) {
        query = query.where('id', '!=', excludeId);
      }

      const result = await query.executeTakeFirst();

      this.logOperation('hasTimeConflict', {
        calendarId,
        startTime,
        endTime,
        excludeId
      });
      return !!result;
    }, 'calendar-schedule-repository-has-time-conflict');
  }

  // ========== 批量操作方法 ==========

  async updateSyncStatusBatch(
    ids: number[],
    syncStatus: SyncStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getWriteConnection();
      const result = await connection
        .updateTable(this.tableName)
        .set({
          sync_status: syncStatus,
          updated_at: new Date().toISOString()
        })
        .where('id', 'in', ids)
        .execute();

      const updatedCount = Number(result[0]?.numUpdatedRows || 0);
      this.logOperation('updateSyncStatusBatch', {
        ids,
        syncStatus,
        updatedCount
      });
      return updatedCount;
    }, 'calendar-schedule-repository-update-sync-status-batch');
  }

  async updateWpsEventIdBatch(
    updates: Array<{
      id: number;
      wps_event_id: string;
    }>
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getWriteConnection();
      let totalUpdated = 0;

      // 使用事务批量更新
      await connection.transaction().execute(async (trx) => {
        for (const update of updates) {
          const result = await trx
            .updateTable(this.tableName)
            .set({
              wps_event_id: update.wps_event_id,
              updated_at: new Date().toISOString()
            })
            .where('id', '=', update.id)
            .execute();

          totalUpdated += Number(result[0]?.numUpdatedRows || 0);
        }
      });

      this.logOperation('updateWpsEventIdBatch', {
        updateCount: updates.length,
        totalUpdated
      });
      return totalUpdated;
    }, 'calendar-schedule-repository-update-wps-event-id-batch');
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
    }, 'calendar-schedule-repository-delete-by-calendar-id');
  }

  async deleteByCourseAndSemester(
    courseId: string,
    xnxq: string
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getWriteConnection();
      const result = await connection
        .deleteFrom(this.tableName)
        .where('course_id', '=', courseId)
        .where('xnxq', '=', xnxq)
        .execute();

      const deletedCount = Number(result[0]?.numDeletedRows || 0);
      this.logOperation('deleteByCourseAndSemester', {
        courseId,
        xnxq,
        deletedCount
      });
      return deletedCount;
    }, 'calendar-schedule-repository-delete-by-course-semester');
  }

  // ========== 统计查询方法 ==========

  async countByCalendar(
    calendarId: number,
    syncStatus?: SyncStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select((eb) => eb.fn.count('id').as('count'))
        .where('calendar_id', '=', calendarId);

      if (syncStatus) {
        query = query.where('sync_status', '=', syncStatus);
      }

      const result = await query.executeTakeFirst();
      const count = Number(result?.count || 0);

      this.logOperation('countByCalendar', { calendarId, syncStatus, count });
      return count;
    }, 'calendar-schedule-repository-count-by-calendar');
  }

  async countByCourse(
    courseId: string,
    xnxq: string,
    syncStatus?: SyncStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select((eb) => eb.fn.count('id').as('count'))
        .where('course_id', '=', courseId)
        .where('xnxq', '=', xnxq);

      if (syncStatus) {
        query = query.where('sync_status', '=', syncStatus);
      }

      const result = await query.executeTakeFirst();
      const count = Number(result?.count || 0);

      this.logOperation('countByCourse', { courseId, xnxq, syncStatus, count });
      return count;
    }, 'calendar-schedule-repository-count-by-course');
  }

  async countBySemester(
    xnxq: string,
    syncStatus?: SyncStatus
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select((eb) => eb.fn.count('id').as('count'))
        .where('xnxq', '=', xnxq);

      if (syncStatus) {
        query = query.where('sync_status', '=', syncStatus);
      }

      const result = await query.executeTakeFirst();
      const count = Number(result?.count || 0);

      this.logOperation('countBySemester', { xnxq, syncStatus, count });
      return count;
    }, 'calendar-schedule-repository-count-by-semester');
  }

  async getSyncStatusStats(xnxq?: string): Promise<
    DatabaseResult<
      Array<{
        sync_status: SyncStatus;
        count: number;
      }>
    >
  > {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      let query = connection
        .selectFrom(this.tableName)
        .select(['sync_status', (eb) => eb.fn.count('id').as('count')])
        .groupBy('sync_status');

      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      const results = await query.execute();
      const stats = results.map((row) => ({
        sync_status: row.sync_status,
        count: Number(row.count)
      }));

      this.logOperation('getSyncStatusStats', {
        xnxq,
        statsCount: stats.length
      });
      return stats;
    }, 'calendar-schedule-repository-get-sync-status-stats');
  }

  async getTimeStatsByCalendar(calendarId: number): Promise<
    DatabaseResult<{
      total_schedules: number;
      earliest_time: string | null;
      latest_time: string | null;
      week_range: {
        min_week: number | null;
        max_week: number | null;
      };
    }>
  > {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .select([
          (eb) => eb.fn.count('id').as('total_schedules'),
          (eb) => eb.fn.min('start_time').as('earliest_time'),
          (eb) => eb.fn.max('end_time').as('latest_time'),
          (eb) => eb.fn.min('week_number').as('min_week'),
          (eb) => eb.fn.max('week_number').as('max_week')
        ])
        .where('calendar_id', '=', calendarId)
        .executeTakeFirst();

      const stats = {
        total_schedules: Number(result?.total_schedules || 0),
        earliest_time: result?.earliest_time || null,
        latest_time: result?.latest_time || null,
        week_range: {
          min_week: result?.min_week ? Number(result.min_week) : null,
          max_week: result?.max_week ? Number(result.max_week) : null
        }
      };

      this.logOperation('getTimeStatsByCalendar', { calendarId, stats });
      return stats;
    }, 'calendar-schedule-repository-get-time-stats-by-calendar');
  }

  async getWeekDistribution(xnxq: string): Promise<
    DatabaseResult<
      Array<{
        week_number: number;
        schedule_count: number;
      }>
    >
  > {
    return await DatabaseErrorHandler.execute(async () => {
      const connection = await this.getQueryConnection();
      const results = await connection
        .selectFrom(this.tableName)
        .select(['week_number', (eb) => eb.fn.count('id').as('schedule_count')])
        .where('xnxq', '=', xnxq)
        .where('week_number', 'is not', null)
        .groupBy('week_number')
        .orderBy('week_number', 'asc')
        .execute();

      const distribution = results.map((row) => ({
        week_number: Number(row.week_number),
        schedule_count: Number(row.schedule_count)
      }));

      this.logOperation('getWeekDistribution', {
        xnxq,
        count: distribution.length
      });
      return distribution;
    }, 'calendar-schedule-repository-get-week-distribution');
  }
}
