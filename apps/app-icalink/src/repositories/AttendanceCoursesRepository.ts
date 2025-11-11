import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcasyncAttendanceCourse
} from '../types/database.js';
import type {
  CourseQueryParams,
  IAttendanceCoursesRepository
} from './interfaces/IAttendanceCoursesRepository.js';

/**
 * 考勤课程仓储实现
 * 负责课节数据的查询
 */
export default class AttendanceCoursesRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icasync_attendance_courses',
    IcasyncAttendanceCourse
  >
  implements IAttendanceCoursesRepository
{
  protected readonly tableName = 'icasync_attendance_courses';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ AttendanceCoursesRepository initialized');
  }

  /**
   * 根据课程代码分页查询课节列表
   * @param courseCode 课程代码
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @returns 课节列表
   */
  public async findByCourseCodeWithPagination(
    courseCode: string,
    page: number,
    pageSize: number
  ): Promise<IcasyncAttendanceCourse[]> {
    if (!courseCode || courseCode.trim() === '') {
      this.logger.warn(
        'findByCourseCodeWithPagination called with empty courseCode'
      );
      return [];
    }

    this.logger.debug(
      { courseCode, page, pageSize },
      'Finding attendance courses by course code with pagination'
    );

    try {
      const connection = await this.getQueryConnection();

      const offset = (page - 1) * pageSize;

      const results = await connection
        .selectFrom('icasync_attendance_courses')
        .selectAll()
        .where('course_code', '=', courseCode)
        .where('deleted_at', 'is', null)
        .orderBy('start_time', 'asc')
        .limit(pageSize)
        .offset(offset)
        .execute();

      this.logger.debug(
        { courseCode, count: results.length, page, pageSize },
        'Attendance courses found'
      );

      return results as IcasyncAttendanceCourse[];
    } catch (error) {
      this.logError('findByCourseCodeWithPagination', error as Error, {
        courseCode,
        page,
        pageSize
      });
      return [];
    }
  }

  /**
   * 获取指定课程代码的课节总数
   * @param courseCode 课程代码
   * @returns 总记录数
   */
  public async getTotalCountByCourseCode(courseCode: string): Promise<number> {
    if (!courseCode || courseCode.trim() === '') {
      this.logger.warn(
        'getTotalCountByCourseCode called with empty courseCode'
      );
      return 0;
    }

    this.logger.debug(
      { courseCode },
      'Getting total count of attendance courses by course code'
    );

    try {
      const connection = await this.getQueryConnection();

      const result = await connection
        .selectFrom('icasync_attendance_courses')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('course_code', '=', courseCode)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      const total = Number(result?.count ?? 0);

      this.logger.debug({ courseCode, total }, 'Total count retrieved');

      return total;
    } catch (error) {
      this.logError('getTotalCountByCourseCode', error as Error, {
        courseCode
      });
      return 0;
    }
  }

  /**
   * 根据条件分页查询课程列表
   * @param params 查询参数
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @returns 课程列表
   */
  public async findCoursesWithPagination(
    params: CourseQueryParams,
    page: number,
    pageSize: number
  ): Promise<IcasyncAttendanceCourse[]> {
    this.logger.debug(
      { params, page, pageSize },
      'Finding courses with pagination'
    );

    try {
      const connection = await this.getQueryConnection();
      const offset = (page - 1) * pageSize;

      let query = connection
        .selectFrom('icasync_attendance_courses')
        .selectAll()
        .where('deleted_at', 'is', null);

      // 教学周精确匹配
      if (params.teachingWeek !== undefined) {
        query = query.where('teaching_week', '=', params.teachingWeek);
      }

      // 星期精确匹配
      if (params.weekDay !== undefined) {
        query = query.where('week_day', '=', params.weekDay);
      }

      // 课程名/课程号/教师模糊搜索
      if (params.searchKeyword && params.searchKeyword.trim() !== '') {
        const keyword = `%${params.searchKeyword.trim()}%`;
        query = query.where((eb) =>
          eb.or([
            eb('course_name', 'like', keyword),
            eb('course_code', 'like', keyword),
            eb('teacher_names', 'like', keyword)
          ])
        );
      }

      const results = await query
        .orderBy('teaching_week', 'asc')
        .orderBy('week_day', 'asc')
        .orderBy('start_time', 'asc')
        .limit(pageSize)
        .offset(offset)
        .execute();

      this.logger.debug(
        { count: results.length, page, pageSize },
        'Courses found'
      );

      return results as IcasyncAttendanceCourse[];
    } catch (error) {
      this.logError('findCoursesWithPagination', error as Error, {
        params,
        page,
        pageSize
      });
      return [];
    }
  }

  /**
   * 根据条件获取课程总数
   * @param params 查询参数
   * @returns 总记录数
   */
  public async getTotalCountByParams(
    params: CourseQueryParams
  ): Promise<number> {
    this.logger.debug({ params }, 'Getting total count by params');

    try {
      const connection = await this.getQueryConnection();

      let query = connection
        .selectFrom('icasync_attendance_courses')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('deleted_at', 'is', null);

      // 教学周精确匹配
      if (params.teachingWeek !== undefined) {
        query = query.where('teaching_week', '=', params.teachingWeek);
      }

      // 星期精确匹配
      if (params.weekDay !== undefined) {
        query = query.where('week_day', '=', params.weekDay);
      }

      // 课程名/课程号/教师模糊搜索
      if (params.searchKeyword && params.searchKeyword.trim() !== '') {
        const keyword = `%${params.searchKeyword.trim()}%`;
        query = query.where((eb) =>
          eb.or([
            eb('course_name', 'like', keyword),
            eb('course_code', 'like', keyword),
            eb('teacher_names', 'like', keyword)
          ])
        );
      }

      const result = await query.executeTakeFirst();
      const total = Number(result?.count ?? 0);

      this.logger.debug({ params, total }, 'Total count retrieved');

      return total;
    } catch (error) {
      this.logError('getTotalCountByParams', error as Error, { params });
      return 0;
    }
  }

  /**
   * 根据ID列表查询课程
   * @param courseIds 课程ID列表
   * @returns 课程列表
   */
  public async findByIds(
    courseIds: number[]
  ): Promise<IcasyncAttendanceCourse[]> {
    if (!courseIds || courseIds.length === 0) {
      this.logger.warn('findByIds called with empty courseIds');
      return [];
    }

    this.logger.debug({ courseIds }, 'Finding courses by IDs');

    try {
      const connection = await this.getQueryConnection();

      const results = await connection
        .selectFrom('icasync_attendance_courses')
        .selectAll()
        .where('id', 'in', courseIds)
        .where('deleted_at', 'is', null)
        .execute();

      this.logger.debug(
        { courseIds, count: results.length },
        'Courses found by IDs'
      );

      return results as IcasyncAttendanceCourse[];
    } catch (error) {
      this.logError('findByIds', error as Error, { courseIds });
      return [];
    }
  }

  /**
   * 批量更新课程的教学周、星期和时间
   * @param courseIds 课程ID列表
   * @param updates 更新数据
   * @returns 更新的记录数
   */
  public async batchUpdateSchedule(
    courseIds: number[],
    updates: {
      teaching_week: number;
      week_day: number;
      start_time: Date;
      end_time: Date;
    }
  ): Promise<number> {
    if (!courseIds || courseIds.length === 0) {
      this.logger.warn('batchUpdateSchedule called with empty courseIds');
      return 0;
    }

    this.logger.debug(
      { courseIds, updates },
      'Batch updating course schedules'
    );

    try {
      const connection = await this.getQueryConnection();

      const result = await connection
        .updateTable('icasync_attendance_courses')
        .set({
          teaching_week: updates.teaching_week,
          week_day: updates.week_day,
          start_time: updates.start_time,
          end_time: updates.end_time,
          updated_at: new Date()
        })
        .where('id', 'in', courseIds)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      const updatedCount = Number(result.numUpdatedRows || 0);

      this.logger.info({ courseIds, updatedCount }, 'Batch update completed');

      return updatedCount;
    } catch (error) {
      this.logError('batchUpdateSchedule', error as Error, {
        courseIds,
        updates
      });
      return 0;
    }
  }
}
