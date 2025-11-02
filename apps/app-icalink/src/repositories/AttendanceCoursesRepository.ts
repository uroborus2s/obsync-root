import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcasyncAttendanceCourse
} from '../types/database.js';
import type { IAttendanceCoursesRepository } from './interfaces/IAttendanceCoursesRepository.js';

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
      this.logger.warn('getTotalCountByCourseCode called with empty courseCode');
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
}

