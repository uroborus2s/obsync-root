import type { Logger } from '@stratix/core';
import {
  isSome,
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import type AttendanceCoursesRepository from '../repositories/AttendanceCoursesRepository.js';
import type { CourseQueryParams as RepoQueryParams } from '../repositories/interfaces/IAttendanceCoursesRepository.js';
import type SystemConfigRepository from '../repositories/SystemConfigRepository.js';
import type VTeachingClassRepository from '../repositories/VTeachingClassRepository.js';
import type { IcasyncAttendanceCourse } from '../types/database.js';
import { ServiceError, ServiceErrorCode } from '../types/service.js';
import type {
  CourseQueryParams,
  ICourseManagementService,
  MakeupSignInForStudentsRequest,
  MakeupSignInForStudentsResult,
  MakeupSignInRequest,
  MakeupSignInResult,
  PaginatedCourseResponse,
  RescheduleCourseRequest,
  RescheduleCourseResult,
  RescheduledCourseInfo
} from './interfaces/ICourseManagementService.js';

/**
 * 课程管理服务
 * 负责课程查询和管理的业务逻辑
 */
export default class CourseManagementService
  implements ICourseManagementService
{
  constructor(
    private readonly attendanceCoursesRepository: AttendanceCoursesRepository,
    private readonly vTeachingClassRepository: VTeachingClassRepository,
    private readonly systemConfigRepository: SystemConfigRepository,
    private readonly logger: Logger
  ) {
    this.logger.info('✅ CourseManagementService initialized');
  }

  /**
   * 分页查询课程列表
   * @param params 查询参数
   * @param page 页码（从1开始）
   * @param pageSize 每页数量
   * @returns 分页课程数据
   */
  public async getCourseList(
    params: CourseQueryParams,
    page: number,
    pageSize: number
  ): Promise<Either<ServiceError, PaginatedCourseResponse>> {
    try {
      // 参数验证
      const validationError = this.validateQueryParams(params, page, pageSize);
      if (validationError) {
        return left(validationError);
      }

      this.logger.debug('Getting course list', { params, page, pageSize });

      // 转换参数格式
      const repoParams: RepoQueryParams = {
        teachingWeek: params.teachingWeek,
        weekDay: params.weekDay,
        searchKeyword: params.searchKeyword
      };

      // 并行查询数据和总数
      const [courses, total] = await Promise.all([
        this.attendanceCoursesRepository.findCoursesWithPagination(
          repoParams,
          page,
          pageSize
        ),
        this.attendanceCoursesRepository.getTotalCountByParams(repoParams)
      ]);

      // 计算分页信息
      const totalPages = Math.ceil(total / pageSize);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const response: PaginatedCourseResponse = {
        data: courses,
        total,
        page,
        page_size: pageSize,
        total_pages: totalPages,
        has_next: hasNext,
        has_prev: hasPrev
      };

      this.logger.debug('Course list retrieved', {
        count: courses.length,
        total,
        page,
        totalPages
      });

      return right(response);
    } catch (error: any) {
      this.logger.error('Failed to get course list', {
        error: error.message,
        params,
        page,
        pageSize
      });
      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to get course list',
        details: error.message
      });
    }
  }

  /**
   * 验证查询参数
   * @param params 查询参数
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 验证错误或 null
   */
  private validateQueryParams(
    params: CourseQueryParams,
    page: number,
    pageSize: number
  ): ServiceError | null {
    // 验证页码
    if (page < 1) {
      return {
        code: String(ServiceErrorCode.VALIDATION_ERROR),
        message: 'Page number must be greater than 0'
      };
    }

    // 验证每页数量
    if (pageSize < 1 || pageSize > 100) {
      return {
        code: String(ServiceErrorCode.VALIDATION_ERROR),
        message: 'Page size must be between 1 and 100'
      };
    }

    // 验证教学周
    if (params.teachingWeek !== undefined) {
      if (params.teachingWeek < 1 || params.teachingWeek > 30) {
        return {
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Teaching week must be between 1 and 30'
        };
      }
    }

    // 验证星期
    if (params.weekDay !== undefined) {
      if (params.weekDay < 1 || params.weekDay > 7) {
        return {
          code: String(ServiceErrorCode.VALIDATION_ERROR),
          message: 'Week day must be between 1 and 7'
        };
      }
    }

    return null;
  }

  /**
   * 批量调串课
   * @param request 调串课请求
   * @returns 调串课结果
   */
  public async rescheduleCourses(
    request: RescheduleCourseRequest
  ): Promise<Either<ServiceError, RescheduleCourseResult>> {
    try {
      // 参数验证
      const validationError = this.validateRescheduleRequest(request);
      if (validationError) {
        return left(validationError);
      }

      this.logger.info('Starting batch course reschedule', {
        courseCount: request.courseIds.length,
        targetWeek: request.targetTeachingWeek,
        targetDay: request.targetWeekDay
      });

      // 1. 查询要调整的课程
      const courses = await this.attendanceCoursesRepository.findByIds(
        request.courseIds
      );

      if (courses.length === 0) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: 'No courses found with the provided IDs'
        });
      }

      if (courses.length !== request.courseIds.length) {
        this.logger.warn('Some courses not found', {
          requested: request.courseIds.length,
          found: courses.length
        });
      }

      // 2. 验证课程是否可以调整（只允许调整未结束的课程）
      const finishedCourses = courses.filter(
        (c) => !this.canRescheduleCourse(c)
      );
      if (finishedCourses.length > 0) {
        const finishedCourseNames = finishedCourses
          .map((c) => c.course_name)
          .join(', ');
        this.logger.warn('Attempting to reschedule finished courses', {
          count: finishedCourses.length,
          courses: finishedCourseNames
        });
        return left({
          code: String(ServiceErrorCode.BUSINESS_RULE_VIOLATION),
          message: `Cannot reschedule finished courses: ${finishedCourseNames}`,
          details: `${finishedCourses.length} course(s) have already finished`
        });
      }

      // 3. 获取学期开始日期
      const termStartDate = await this.getTermStartDate();
      if (!termStartDate) {
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: 'Term start date not configured'
        });
      }

      // 3. 计算新的时间并准备更新数据
      const updatedCourses: RescheduledCourseInfo[] = [];
      let updatedCount = 0;

      // 4. 为每个课程单独计算新时间并更新
      // 这样可以保持每个课程原有的时间段（时分秒）
      for (const course of courses) {
        const { newStartTime, newEndTime } = this.calculateNewDateTime(
          course.start_time,
          course.end_time,
          request.targetTeachingWeek,
          request.targetWeekDay,
          termStartDate
        );

        // 单独更新每个课程
        const count =
          await this.attendanceCoursesRepository.batchUpdateSchedule(
            [course.id],
            {
              teaching_week: request.targetTeachingWeek,
              week_day: request.targetWeekDay,
              start_time: newStartTime,
              end_time: newEndTime
            }
          );

        updatedCount += count;

        // 记录更新信息
        updatedCourses.push({
          id: course.id,
          course_name: course.course_name,
          old_teaching_week: course.teaching_week,
          old_week_day: course.week_day,
          old_start_time: new Date(course.start_time).toISOString(),
          old_end_time: new Date(course.end_time).toISOString(),
          new_teaching_week: request.targetTeachingWeek,
          new_week_day: request.targetWeekDay,
          new_start_time: newStartTime.toISOString(),
          new_end_time: newEndTime.toISOString()
        });
      }

      this.logger.info('Batch course reschedule completed', {
        updatedCount,
        requestedCount: request.courseIds.length
      });

      const result: RescheduleCourseResult = {
        updated_count: updatedCount,
        updated_courses: updatedCourses
      };

      return right(result);
    } catch (error: any) {
      this.logger.error('Failed to reschedule courses', {
        error: error.message,
        request
      });
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: 'Failed to reschedule courses',
        details: error.message
      });
    }
  }

  /**
   * 计算新的日期时间
   * @param originalStartTime 原始开始时间
   * @param originalEndTime 原始结束时间
   * @param targetWeek 目标教学周
   * @param targetDay 目标星期
   * @param termStartDate 学期开始日期
   * @returns 新的开始和结束时间
   */
  private calculateNewDateTime(
    originalStartTime: Date | string,
    originalEndTime: Date | string,
    targetWeek: number,
    targetDay: number,
    termStartDate: Date
  ): { newStartTime: Date; newEndTime: Date } {
    // 计算目标日期
    const daysFromStart = (targetWeek - 1) * 7 + (targetDay - 1);
    const targetDate = new Date(termStartDate);
    targetDate.setDate(targetDate.getDate() + daysFromStart);

    // 获取原始时间部分
    const originalStart = new Date(originalStartTime);
    const originalEnd = new Date(originalEndTime);

    // 组合新的日期和原始时间
    const newStartTime = new Date(targetDate);
    newStartTime.setHours(
      originalStart.getHours(),
      originalStart.getMinutes(),
      originalStart.getSeconds()
    );

    const newEndTime = new Date(targetDate);
    newEndTime.setHours(
      originalEnd.getHours(),
      originalEnd.getMinutes(),
      originalEnd.getSeconds()
    );

    return { newStartTime, newEndTime };
  }

  /**
   * 获取学期开始日期
   * 从系统配置表中读取 term.start_date 配置项
   * @returns 学期开始日期
   */
  private async getTermStartDate(): Promise<Date | null> {
    try {
      this.logger.debug('Getting term start date from system config');

      const configResult =
        await this.systemConfigRepository.findByKey('term.start_date');

      // 检查配置是否存在
      if (!configResult || !isSome(configResult)) {
        this.logger.error(
          'Term start date configuration not found (key: term.start_date)'
        );
        return null;
      }

      const config = configResult.value;
      const dateStr = config.config_value;

      if (!dateStr) {
        this.logger.error('Term start date configuration value is empty');
        return null;
      }

      // 验证日期格式 YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr)) {
        this.logger.error('Invalid term start date format', {
          value: dateStr,
          expected: 'YYYY-MM-DD'
        });
        return null;
      }

      const termStartDate = new Date(dateStr);
      if (isNaN(termStartDate.getTime())) {
        this.logger.error('Invalid term start date value', { value: dateStr });
        return null;
      }

      this.logger.debug('Term start date retrieved', {
        date: dateStr,
        parsed: termStartDate.toISOString()
      });

      return termStartDate;
    } catch (error: any) {
      this.logger.error('Failed to get term start date', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * 验证调串课请求参数
   * @param request 调串课请求
   * @returns 错误信息（如果有）
   */
  private validateRescheduleRequest(
    request: RescheduleCourseRequest
  ): ServiceError | null {
    if (!request.courseIds || request.courseIds.length === 0) {
      return {
        code: String(ServiceErrorCode.INVALID_PARAMETER),
        message: 'Course IDs are required'
      };
    }

    if (
      !request.targetTeachingWeek ||
      request.targetTeachingWeek < 1 ||
      request.targetTeachingWeek > 30
    ) {
      return {
        code: String(ServiceErrorCode.INVALID_PARAMETER),
        message: 'Invalid target teaching week (must be 1-30)'
      };
    }

    if (
      !request.targetWeekDay ||
      request.targetWeekDay < 1 ||
      request.targetWeekDay > 7
    ) {
      return {
        code: String(ServiceErrorCode.INVALID_PARAMETER),
        message: 'Invalid target week day (must be 1-7)'
      };
    }

    return null;
  }

  /**
   * 检查课程是否可以调整
   * 只允许调整未结束的课程（end_time > now）
   * @param course 课程信息
   * @returns 是否可以调整
   */
  private canRescheduleCourse(course: IcasyncAttendanceCourse): boolean {
    const now = new Date();
    const courseEndTime = new Date(course.end_time);

    // 只允许调整未结束的课程
    return courseEndTime > now;
  }

  /**
   * 获取课程状态
   * 根据当前时间和课程时间动态计算
   * @param course 课程信息
   * @returns 课程状态
   */
  private getCourseStatus(
    course: IcasyncAttendanceCourse
  ): 'not_started' | 'in_progress' | 'finished' {
    const now = new Date();
    const startTime = new Date(course.start_time);
    const endTime = new Date(course.end_time);

    if (now < startTime) {
      return 'not_started';
    } else if (now >= startTime && now <= endTime) {
      return 'in_progress';
    } else {
      return 'finished';
    }
  }

  /**
   * 批量补签
   * @param request 补签请求
   * @returns 补签结果
   */
  public async makeupSignIn(
    request: MakeupSignInRequest
  ): Promise<Either<ServiceError, MakeupSignInResult>> {
    try {
      // 1. 参数验证
      if (!request.courseIds || request.courseIds.length === 0) {
        return left({
          code: String(ServiceErrorCode.INVALID_PARAMETER),
          message: 'Course IDs are required'
        });
      }

      this.logger.info('Starting makeup sign-in', {
        courseCount: request.courseIds.length
      });

      // 2. 查询课程信息
      const courses = await this.attendanceCoursesRepository.findByIds(
        request.courseIds
      );

      if (courses.length === 0) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: 'No courses found with the provided IDs'
        });
      }

      // 3. 判断补签类型（当日/历史）
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const makeupType = courses.every((course) => {
        const courseDate = new Date(course.start_time);
        courseDate.setHours(0, 0, 0, 0);
        return courseDate.getTime() === today.getTime();
      })
        ? 'current_day'
        : 'history';

      this.logger.info('Makeup type determined', { makeupType });

      // 4. 执行补签逻辑
      // TODO: 实现具体的补签逻辑
      // - 查询每节课的学生列表
      // - 插入签到记录
      // - 更新统计数据（历史补签）

      // 临时返回
      return right({
        makeup_type: makeupType,
        total_courses: courses.length,
        total_students: 0,
        total_records: 0,
        courses: []
      });
    } catch (error: any) {
      this.logger.error('Failed to makeup sign-in', {
        error: error.message,
        request
      });
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: 'Failed to makeup sign-in',
        details: error.message
      });
    }
  }

  /**
   * 为指定学生补签
   * @param request 学生补签请求
   * @returns 学生补签结果
   */
  public async makeupSignInForStudents(
    request: MakeupSignInForStudentsRequest
  ): Promise<Either<ServiceError, MakeupSignInForStudentsResult>> {
    try {
      // 1. 参数验证
      if (!request.courseId) {
        return left({
          code: String(ServiceErrorCode.INVALID_PARAMETER),
          message: 'Course ID is required'
        });
      }

      if (!request.studentIds || request.studentIds.length === 0) {
        return left({
          code: String(ServiceErrorCode.INVALID_PARAMETER),
          message: 'At least one student ID is required'
        });
      }

      this.logger.info('Starting makeup sign-in for students', {
        courseId: request.courseId,
        studentCount: request.studentIds.length
      });

      // 2. 查询课程信息
      const courses = await this.attendanceCoursesRepository.findByIds([
        request.courseId
      ]);

      if (courses.length === 0) {
        return left({
          code: String(ServiceErrorCode.RESOURCE_NOT_FOUND),
          message: 'Course not found'
        });
      }

      const course = courses[0];

      // 3. 验证学生是否属于该课程
      const validStudentIds =
        await this.vTeachingClassRepository.validateStudentsInCourse(
          course.course_code,
          request.studentIds
        );

      if (validStudentIds.length === 0) {
        return left({
          code: String(ServiceErrorCode.BUSINESS_RULE_VIOLATION),
          message: 'None of the provided students belong to this course'
        });
      }

      // 4. 判断补签类型（当日/历史）
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const courseDate = new Date(course.start_time);
      courseDate.setHours(0, 0, 0, 0);

      const makeupType =
        courseDate.getTime() === today.getTime() ? 'current_day' : 'history';

      this.logger.info('Makeup type determined for students', {
        makeupType,
        courseId: course.id
      });

      // 5. 执行补签逻辑
      // TODO: 实现具体的补签逻辑
      // - 为每个学生创建签到记录
      // - 处理已存在签到记录的情况
      // - 更新统计数据（历史补签）

      // 临时返回：标记所有验证通过的学生为成功
      const invalidStudentIds = request.studentIds.filter(
        (id) => !validStudentIds.includes(id)
      );

      const students = [
        ...validStudentIds.map((studentId) => ({
          student_id: studentId,
          student_name: '', // TODO: 从数据库获取学生姓名
          success: true
        })),
        ...invalidStudentIds.map((studentId) => ({
          student_id: studentId,
          student_name: '',
          success: false,
          message: 'Student does not belong to this course'
        }))
      ];

      return right({
        course_id: course.id,
        course_name: course.course_name,
        makeup_type: makeupType,
        total_students: request.studentIds.length,
        success_count: validStudentIds.length,
        failed_count: invalidStudentIds.length,
        students
      });
    } catch (error: any) {
      this.logger.error('Failed to makeup sign-in for students', {
        error: error.message,
        request
      });
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: 'Failed to makeup sign-in for students',
        details: error.message
      });
    }
  }
}
