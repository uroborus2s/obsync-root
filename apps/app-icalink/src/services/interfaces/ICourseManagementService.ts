import type { Either } from '@stratix/utils/functional';
import type { IcasyncAttendanceCourse } from '../../types/database.js';
import type { ServiceError } from '../../types/service.js';

/**
 * 课程查询参数
 */
export interface CourseQueryParams {
  teachingWeek?: number;
  weekDay?: number;
  searchKeyword?: string;
}

/**
 * 分页响应数据
 */
export interface PaginatedCourseResponse {
  data: IcasyncAttendanceCourse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * 调串课请求参数
 */
export interface RescheduleCourseRequest {
  courseIds: number[];
  targetTeachingWeek: number;
  targetWeekDay: number;
}

/**
 * 调串课后的课程信息
 */
export interface RescheduledCourseInfo {
  id: number;
  course_name: string;
  old_teaching_week: number;
  old_week_day: number;
  old_start_time: string;
  old_end_time: string;
  new_teaching_week: number;
  new_week_day: number;
  new_start_time: string;
  new_end_time: string;
}

/**
 * 调串课结果
 */
export interface RescheduleCourseResult {
  updated_count: number;
  updated_courses: RescheduledCourseInfo[];
}

/**
 * 补签请求参数
 */
export interface MakeupSignInRequest {
  courseIds: number[];
}

/**
 * 补签类型
 */
export type MakeupType = 'current_day' | 'history';

/**
 * 课程补签信息
 */
export interface CourseMakeupInfo {
  course_id: number;
  course_name: string;
  student_count: number;
  records_created: number;
}

/**
 * 补签结果
 */
export interface MakeupSignInResult {
  makeup_type: MakeupType;
  total_courses: number;
  total_students: number;
  total_records: number;
  courses: CourseMakeupInfo[];
}

/**
 * 学生补签请求参数
 */
export interface MakeupSignInForStudentsRequest {
  courseId: number;
  studentIds: string[];
}

/**
 * 学生补签结果中的学生信息
 */
export interface StudentMakeupInfo {
  student_id: string;
  student_name: string;
  success: boolean;
  message?: string;
}

/**
 * 学生补签结果
 */
export interface MakeupSignInForStudentsResult {
  course_id: number;
  course_name: string;
  makeup_type: MakeupType;
  total_students: number;
  success_count: number;
  failed_count: number;
  students: StudentMakeupInfo[];
}

/**
 * 课程管理服务接口
 */
export interface ICourseManagementService {
  /**
   * 分页查询课程列表
   * @param params 查询参数
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @returns 分页课程数据
   */
  getCourseList(
    params: CourseQueryParams,
    page: number,
    pageSize: number
  ): Promise<Either<ServiceError, PaginatedCourseResponse>>;

  /**
   * 批量调串课
   * @param request 调串课请求
   * @returns 调串课结果
   */
  rescheduleCourses(
    request: RescheduleCourseRequest
  ): Promise<Either<ServiceError, RescheduleCourseResult>>;

  /**
   * 批量补签
   * @param request 补签请求
   * @returns 补签结果
   */
  makeupSignIn(
    request: MakeupSignInRequest
  ): Promise<Either<ServiceError, MakeupSignInResult>>;

  /**
   * 为指定学生补签
   * @param request 学生补签请求
   * @returns 学生补签结果
   */
  makeupSignInForStudents(
    request: MakeupSignInForStudentsRequest
  ): Promise<Either<ServiceError, MakeupSignInForStudentsResult>>;
}
