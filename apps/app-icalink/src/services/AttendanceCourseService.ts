import type { Logger } from '@stratix/core';
import {
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import type AttendanceCourseRepository from '../repositories/AttendanceCourseRepository.js';
import type { IcasyncAttendanceCourse } from '../types/database.js';
import { ServiceError, ServiceErrorCode } from '../types/service.js';

/**
 * 调课请求参数
 */
export interface RescheduleCourseRequest {
  courseIds: number[];
  targetTeachingWeek: number;
  targetWeekDay: number;
  semester: string;
}

/**
 * 调课结果
 */
export interface RescheduleCourseResult {
  successCount: number;
  failedCount: number;
  errors: Array<{
    courseId: number;
    courseName: string;
    error: string;
  }>;
}

/**
 * 考勤课程服务
 * 负责课程调串课业务逻辑
 */
export default class AttendanceCourseService {
  constructor(
    private readonly attendanceCourseRepository: AttendanceCourseRepository,
    private readonly logger: Logger
  ) {
    this.logger.info('✅ AttendanceCourseService initialized');
  }

  /**
   * 根据教学周和星期查询课程列表
   * @param semester 学期
   * @param teachingWeek 教学周（可选）
   * @param weekDay 星期（可选）
   * @returns 课程列表
   */
  public async findCoursesByWeekAndDay(
    teachingWeek?: number,
    weekDay?: number
  ): Promise<Either<ServiceError, IcasyncAttendanceCourse[]>> {
    try {
      this.logger.debug(
        { teachingWeek, weekDay },
        'Finding courses by week and day'
      );

      const courses = await this.attendanceCourseRepository.findByWeekAndDay(
        teachingWeek,
        weekDay
      );

      this.logger.debug(
        { teachingWeek, weekDay, count: courses.length },
        'Courses found'
      );

      return right(courses);
    } catch (error: any) {
      this.logger.error('Failed to find courses', {
        error: error.message,
        teachingWeek,
        weekDay
      });
      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to find courses',
        details: error.message
      });
    }
  }

  /**
   * 批量调课
   * @param request 调课请求
   * @returns 调课结果
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

      const result: RescheduleCourseResult = {
        successCount: 0,
        failedCount: 0,
        errors: []
      };

      // 1. 获取学期开始日期
      const termStartDateResult = await this.getTermStartDate();
      if (!termStartDateResult) {
        return left({
          code: String(ServiceErrorCode.INTERNAL_ERROR),
          message: 'Term start date not configured'
        });
      }

      // 2. 逐个处理课程调课
      for (const courseId of request.courseIds) {
        try {
          await this.rescheduleSingleCourse(
            courseId,
            request.targetTeachingWeek,
            request.targetWeekDay,
            termStartDateResult
          );
          result.successCount++;
        } catch (error: any) {
          result.failedCount++;
          result.errors.push({
            courseId,
            courseName: `Course ${courseId}`,
            error: error.message
          });
          this.logger.error('Failed to reschedule course', {
            courseId,
            error: error.message
          });
        }
      }

      this.logger.info('Batch course reschedule completed', {
        successCount: result.successCount,
        failedCount: result.failedCount
      });

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
   * 调整单个课程
   * @param courseId 课程ID
   * @param targetWeek 目标教学周
   * @param targetDay 目标星期
   * @param termStartDate 学期开始日期
   */
  private async rescheduleSingleCourse(
    courseId: number,
    targetWeek: number,
    targetDay: number,
    termStartDate: Date
  ): Promise<void> {
    // 1. 查询课程信息 - 使用findBySemester然后过滤
    // 由于findById返回Maybe类型，我们使用其他方法
    const allCourses = await this.attendanceCourseRepository.findBySemester(
      '2024-2025-1' // TODO: 从参数传入
    );
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) {
      throw new Error(`Course not found: ${courseId}`);
    }

    // 2. 计算新的日期时间
    const { newStartTime, newEndTime } = this.calculateNewDateTime(
      course,
      targetWeek,
      targetDay,
      termStartDate
    );

    // 3. 更新本地数据库（暂时跳过WPS更新）
    await this.attendanceCourseRepository.batchUpdateSchedule([courseId], {
      teaching_week: targetWeek,
      week_day: targetDay,
      start_time: newStartTime,
      end_time: newEndTime
    });

    this.logger.debug('Course rescheduled successfully', {
      courseId,
      targetWeek,
      targetDay
    });
  }

  /**
   * 计算新的日期时间
   * @param course 课程信息
   * @param targetWeek 目标教学周
   * @param targetDay 目标星期
   * @param termStartDate 学期开始日期
   * @returns 新的开始和结束时间
   */
  private calculateNewDateTime(
    course: IcasyncAttendanceCourse,
    targetWeek: number,
    targetDay: number,
    termStartDate: Date
  ): { newStartTime: Date; newEndTime: Date } {
    // 计算目标日期
    const daysFromStart = (targetWeek - 1) * 7 + (targetDay - 1);
    const targetDate = new Date(termStartDate);
    targetDate.setDate(targetDate.getDate() + daysFromStart);

    // 获取原始时间部分
    const originalStart = new Date(course.start_time);
    const originalEnd = new Date(course.end_time);

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
   * @returns 学期开始日期
   */
  private async getTermStartDate(): Promise<Date | null> {
    try {
      // 暂时返回固定日期，实际应该从配置中获取
      // TODO: 实现SystemConfigRepository后从配置中获取
      return new Date('2024-09-02'); // 2024年秋季学期开始日期
    } catch (error: any) {
      this.logger.error('Failed to get term start date', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * 验证调课请求参数
   * @param request 调课请求
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

    if (!request.semester || request.semester.trim() === '') {
      return {
        code: String(ServiceErrorCode.INVALID_PARAMETER),
        message: 'Semester is required'
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
}
