import type { IcasyncAttendanceCourse } from '../../types/database.js';

/**
 * 课程查询参数接口
 */
export interface CourseQueryParams {
  teachingWeek?: number;
  weekDay?: number;
  searchKeyword?: string;
}

/**
 * 考勤课程仓储接口
 * 负责课节数据的查询
 */
export interface IAttendanceCoursesRepository {
  /**
   * 根据课程代码分页查询课节列表
   * @param courseCode 课程代码
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @returns 课节列表
   */
  findByCourseCodeWithPagination(
    courseCode: string,
    page: number,
    pageSize: number
  ): Promise<IcasyncAttendanceCourse[]>;

  /**
   * 获取指定课程代码的课节总数
   * @param courseCode 课程代码
   * @returns 总记录数
   */
  getTotalCountByCourseCode(courseCode: string): Promise<number>;

  /**
   * 根据条件分页查询课程列表
   * @param params 查询参数
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @returns 课程列表
   */
  findCoursesWithPagination(
    params: CourseQueryParams,
    page: number,
    pageSize: number
  ): Promise<IcasyncAttendanceCourse[]>;

  /**
   * 根据条件获取课程总数
   * @param params 查询参数
   * @returns 总记录数
   */
  getTotalCountByParams(params: CourseQueryParams): Promise<number>;

  /**
   * 根据ID列表查询课程
   * @param courseIds 课程ID列表
   * @returns 课程列表
   */
  findByIds(courseIds: number[]): Promise<IcasyncAttendanceCourse[]>;

  /**
   * 批量更新课程的教学周、星期和时间
   * @param courseIds 课程ID列表
   * @param updates 更新数据
   * @returns 更新的记录数
   */
  batchUpdateSchedule(
    courseIds: number[],
    updates: {
      teaching_week: number;
      week_day: number;
      start_time: Date;
      end_time: Date;
    }
  ): Promise<number>;
}
