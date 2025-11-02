import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import { fromNullable, isSome, type Maybe } from '@stratix/utils/functional';
import type { IcalinkDatabase } from '../types/database.js';
import type {
  ICalendarCourseItem,
  ICalendarMapping,
  ICalendarMappingRepository
} from './interfaces/ICalendarMappingRepository.js';

/**
 * 日历映射仓储实现
 * 负责课程日历映射数据的持久化和查询
 */
export default class CalendarMappingRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icasync_calendar_mapping',
    ICalendarMapping
  >
  implements ICalendarMappingRepository
{
  protected readonly tableName = 'icasync_calendar_mapping';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ CalendarMappingRepository initialized');
  }

  /**
   * 查询所有未删除的日历映射
   */
  public async findAllActive(): Promise<ICalendarMapping[]> {
    this.logger.debug('Finding all active calendar mappings');

    const results = await this.findMany((qb) =>
      qb.where('is_deleted', '=', false).orderBy('created_at', 'desc')
    );

    this.logger.debug(
      { count: results.length },
      'Active calendar mappings found'
    );
    return results as ICalendarMapping[];
  }

  /**
   * 根据日历ID查询日历映射
   */
  public async findByCalendarId(
    calendarId: string
  ): Promise<Maybe<ICalendarMapping>> {
    if (!calendarId || calendarId.trim() === '') {
      this.logger.warn('findByCalendarId called with empty calendarId');
      return fromNullable<ICalendarMapping>(undefined);
    }

    this.logger.debug(
      { calendarId },
      'Finding calendar mapping by calendar_id'
    );

    const result = (await this.findOne((qb) =>
      qb.where('calendar_id', '=', calendarId).where('is_deleted', '=', false)
    )) as unknown as Maybe<ICalendarMapping>;

    this.logger.debug(
      { calendarId, found: isSome(result) },
      'Calendar mapping lookup completed'
    );

    return result;
  }

  /**
   * 根据开课号和学年学期查询日历映射
   */
  public async findByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<Maybe<ICalendarMapping>> {
    if (!kkh || !xnxq) {
      this.logger.warn('findByKkhAndXnxq called with empty parameters');
      return fromNullable<ICalendarMapping>(undefined);
    }

    this.logger.debug(
      { kkh, xnxq },
      'Finding calendar mapping by kkh and xnxq'
    );

    const result = (await this.findOne((qb) =>
      qb
        .where('kkh', '=', kkh)
        .where('xnxq', '=', xnxq)
        .where('is_deleted', '=', false)
    )) as unknown as Maybe<ICalendarMapping>;

    this.logger.debug(
      { kkh, xnxq, found: isSome(result) },
      'Calendar mapping lookup completed'
    );

    return result;
  }

  /**
   * 根据学年学期查询所有未删除的日历映射
   */
  public async findByXnxq(xnxq: string): Promise<ICalendarMapping[]> {
    if (!xnxq || xnxq.trim() === '') {
      this.logger.warn('findByXnxq called with empty xnxq');
      return [];
    }

    this.logger.debug({ xnxq }, 'Finding calendar mappings by xnxq');

    const results = await this.findMany((qb) =>
      qb
        .where('xnxq', '=', xnxq)
        .where('is_deleted', '=', false)
        .orderBy('created_at', 'desc')
    );

    this.logger.debug(
      { xnxq, count: results.length },
      'Calendar mappings found'
    );

    return results as ICalendarMapping[];
  }

  /**
   * 分页查询日历-课程关联列表（主列表）
   * 关联 icasync_calendar_mapping、v_course_checkin_stats_summary、
   * icalink_teaching_class 和 icasync_attendance_courses
   *
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @param searchKeyword 搜索关键词（可选，支持课程代码、课程名称、教师姓名、教师代码）
   * @returns 日历-课程关联列表，包含学生总数和课节总数
   */
  public async findCalendarCoursesWithPagination(
    page: number,
    pageSize: number,
    searchKeyword?: string
  ): Promise<ICalendarCourseItem[]> {
    this.logger.debug(
      { page, pageSize, searchKeyword },
      'Finding calendar courses with pagination'
    );

    try {
      const connection = await this.getQueryConnection();

      // 构建查询：关联多个表获取完整数据
      let query = connection
        .selectFrom('icasync_calendar_mapping as cm')
        .innerJoin(
          'v_course_checkin_stats_summary as cs',
          'cm.kkh',
          'cs.course_code'
        )
        .select([
          // 来自 v_course_checkin_stats_summary 的字段（移除了5个不需要的字段）
          'cs.course_code',
          'cs.course_name',
          'cs.semester',
          'cs.class_location',
          'cs.teacher_name',
          'cs.teacher_codes',
          'cs.course_unit_id',
          'cs.course_unit',
          'cs.teaching_class_code',
          'cs.start_week',
          'cs.end_week',
          'cs.start_time',
          'cs.end_time',
          // 来自 icasync_calendar_mapping 的字段
          'cm.calendar_id',
          'cm.calendar_name',
          // 来自关联查询的统计字段 - 使用子查询
          (eb) =>
            eb
              .selectFrom('icalink_teaching_class')
              .select((eb) => eb.fn.count('id').as('count'))
              .whereRef('icalink_teaching_class.course_code', '=', 'cm.kkh')
              .as('total_students'),
          (eb) =>
            eb
              .selectFrom('icasync_attendance_courses')
              .select((eb) => eb.fn.count('id').as('count'))
              .whereRef('icasync_attendance_courses.course_code', '=', 'cm.kkh')
              .where('icasync_attendance_courses.deleted_at', 'is', null)
              .as('total_sessions')
        ])
        .where('cm.is_deleted', '=', false);

      // 搜索条件：支持课程代码、课程名称、教师姓名、教师代码
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = `%${searchKeyword.trim()}%`;
        query = query.where((eb) =>
          eb.or([
            eb('cs.course_code', 'like', keyword),
            eb('cs.course_name', 'like', keyword),
            eb('cs.teacher_name', 'like', keyword),
            eb('cs.teacher_codes', 'like', keyword)
          ])
        );
      }

      // 分页
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);

      const results = await query.execute();

      this.logger.debug(
        { count: results.length, page, pageSize },
        'Calendar courses found'
      );

      return results as ICalendarCourseItem[];
    } catch (error) {
      this.logError('findCalendarCoursesWithPagination', error as Error, {
        page,
        pageSize,
        searchKeyword
      });
      return [];
    }
  }

  /**
   * 获取日历-课程关联列表的总数
   */
  public async getCalendarCoursesTotalCount(
    searchKeyword?: string
  ): Promise<number> {
    this.logger.debug(
      { searchKeyword },
      'Getting calendar courses total count'
    );

    try {
      const connection = await this.getQueryConnection();

      let query = connection
        .selectFrom('icasync_calendar_mapping as cm')
        .innerJoin(
          'v_course_checkin_stats_summary as cs',
          'cm.kkh',
          'cs.course_code'
        )
        .select((eb) => eb.fn.count('cs.course_code').as('count'))
        .where('cm.is_deleted', '=', false);

      // 搜索条件
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = `%${searchKeyword.trim()}%`;
        query = query.where((eb) =>
          eb.or([
            eb('cs.course_code', 'like', keyword),
            eb('cs.course_name', 'like', keyword),
            eb('cs.teacher_name', 'like', keyword),
            eb('cs.teacher_codes', 'like', keyword)
          ])
        );
      }

      const result = await query.executeTakeFirst();
      const total = Number(result?.count ?? 0);

      this.logger.debug({ total, searchKeyword }, 'Total count retrieved');

      return total;
    } catch (error) {
      this.logError('getCalendarCoursesTotalCount', error as Error, {
        searchKeyword
      });
      return 0;
    }
  }
}
