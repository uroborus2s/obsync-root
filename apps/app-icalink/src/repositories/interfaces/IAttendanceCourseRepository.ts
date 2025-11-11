/**
 * 考勤课程仓储接口
 * 定义考勤课程数据访问的所有方法
 */

import type { Maybe } from '@stratix/utils/functional';
import type { IcasyncAttendanceCourse } from '../../types/database.js';

/**
 * 考勤课程仓储接口
 */
export interface IAttendanceCourseRepository {
  /**
   * 根据外部ID查找考勤课程
   * @param externalId 外部ID
   * @returns 考勤课程实体（可能不存在）
   */
  findByExternalId(externalId: string): Promise<Maybe<IcasyncAttendanceCourse>>;

  /**
   * 根据课程代码和学期查找考勤课程列表
   * @param courseCode 课程代码
   * @param semester 学期（可选，如果不传则返回该课程代码的所有学期数据）
   * @returns 考勤课程列表
   */
  findByCourseCode(
    courseCode: string,
    semester?: string
  ): Promise<IcasyncAttendanceCourse[]>;

  /**
   * 根据学期查找所有考勤课程
   * @param semester 学期
   * @returns 考勤课程列表
   */
  findBySemester(semester: string): Promise<IcasyncAttendanceCourse[]>;

  /**
   * 根据教师代码和学期查找考勤课程
   * @param teacherCode 教师代码
   * @param semester 学期
   * @returns 考勤课程列表
   */
  findByTeacherCode(
    teacherCode: string,
    semester: string
  ): Promise<IcasyncAttendanceCourse[]>;
}
