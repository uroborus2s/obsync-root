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
   * 关联 icasync_calendar_mapping、icasync_attendance_courses、icalink_teaching_class
   *
   * 数据源说明：
   * - 主表：icasync_calendar_mapping（日历映射表）
   * - 课程信息：从 icasync_attendance_courses 聚合获取（课程名称、教师、地点、时间范围等）
   * - 学生信息：从 icalink_teaching_class 聚合获取（课程单位、教学班代码、学生总数）
   *
   * 使用 LEFT JOIN 确保所有映射都能显示，即使课程还没有课节或学生数据
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

      // 构建课程聚合子查询：从 icasync_attendance_courses 按 course_code 聚合
      // 获取课程的基本信息、时间范围、课节总数
      const courseAggQuery = connection
        .selectFrom('icasync_attendance_courses')
        .select([
          'course_code',
          (eb: any) => eb.fn.max('course_name').as('course_name'),
          (eb: any) => eb.fn.max('semester').as('semester'),
          (eb: any) => eb.fn.max('class_location').as('class_location'),
          (eb: any) => eb.fn.max('teacher_names').as('teacher_name'),
          (eb: any) => eb.fn.max('teacher_codes').as('teacher_codes'),
          (eb: any) => eb.fn.min('teaching_week').as('start_week'),
          (eb: any) => eb.fn.max('teaching_week').as('end_week'),
          (eb: any) => eb.fn.min('start_time').as('start_time'),
          (eb: any) => eb.fn.max('end_time').as('end_time'),
          (eb: any) => eb.fn.count('id').as('total_sessions')
        ])
        .where('deleted_at', 'is', null)
        .groupBy('course_code')
        .as('ac');

      // 构建学生统计子查询：从 icalink_teaching_class 按 course_code 聚合
      // 获取课程单位信息和学生总数
      const studentStatsQuery = connection
        .selectFrom('icalink_teaching_class')
        .select([
          'course_code',
          (eb: any) => eb.fn.max('course_unit_id').as('course_unit_id'),
          (eb: any) => eb.fn.max('course_unit').as('course_unit'),
          (eb: any) =>
            eb.fn.max('teaching_class_code').as('teaching_class_code'),
          (eb: any) => eb.fn.count('id').as('total_students')
        ])
        .groupBy('course_code')
        .as('tc');

      // 主查询：从日历映射表开始，LEFT JOIN 课程和学生数据
      let query: any = connection
        .selectFrom('icasync_calendar_mapping as cm')
        .leftJoin(courseAggQuery, 'ac.course_code', 'cm.kkh')
        .leftJoin(studentStatsQuery, 'tc.course_code', 'cm.kkh')
        .select([
          // 来自课程聚合的字段
          'ac.course_code',
          'ac.course_name',
          'ac.semester',
          'ac.class_location',
          'ac.teacher_name',
          'ac.teacher_codes',
          'ac.start_week',
          'ac.end_week',
          'ac.start_time',
          'ac.end_time',
          'ac.total_sessions',
          // 来自学生统计的字段
          'tc.course_unit_id',
          'tc.course_unit',
          'tc.teaching_class_code',
          'tc.total_students',
          // 来自日历映射的字段
          'cm.calendar_id',
          'cm.calendar_name'
        ])
        .where('cm.is_deleted', '=', false);

      // 搜索条件：支持课程代码、课程名称、教师姓名、教师代码
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = `%${searchKeyword.trim()}%`;
        query = query.where((eb: any) =>
          eb.or([
            eb('ac.course_code', 'like', keyword),
            eb('ac.course_name', 'like', keyword),
            eb('ac.teacher_name', 'like', keyword),
            eb('ac.teacher_codes', 'like', keyword)
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
   * 使用与 findCalendarCoursesWithPagination 相同的数据源逻辑
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

      // 构建课程聚合子查询（与分页查询保持一致）
      const courseAggQuery = connection
        .selectFrom('icasync_attendance_courses')
        .select([
          'course_code',
          (eb: any) => eb.fn.max('course_name').as('course_name'),
          (eb: any) => eb.fn.max('teacher_names').as('teacher_name'),
          (eb: any) => eb.fn.max('teacher_codes').as('teacher_codes')
        ])
        .where('deleted_at', 'is', null)
        .groupBy('course_code')
        .as('ac');

      // 主查询：统计符合条件的记录数
      let query: any = connection
        .selectFrom('icasync_calendar_mapping as cm')
        .leftJoin(courseAggQuery, 'ac.course_code', 'cm.kkh')
        .select((eb: any) => eb.fn.count('cm.id').as('count'))
        .where('cm.is_deleted', '=', false);

      // 搜索条件（与分页查询保持一致）
      if (searchKeyword && searchKeyword.trim()) {
        const keyword = `%${searchKeyword.trim()}%`;
        query = query.where((eb: any) =>
          eb.or([
            eb('ac.course_code', 'like', keyword),
            eb('ac.course_name', 'like', keyword),
            eb('ac.teacher_name', 'like', keyword),
            eb('ac.teacher_codes', 'like', keyword)
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
