import type { IcasyncAttendanceCourse } from '../../types/database.js';

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
}

