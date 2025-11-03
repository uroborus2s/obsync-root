import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import type AttendanceCourseService from '../services/AttendanceCourseService.js';

/**
 * 考勤课程控制器
 * 提供课程查询和调串课功能
 */
@Controller()
export default class AttendanceCourseController {
  constructor(
    private readonly logger: Logger,
    private readonly attendanceCourseService: AttendanceCourseService
  ) {
    this.logger.info('✅ AttendanceCourseController initialized');
  }

  /**
   * 查询课程列表
   * GET /api/icalink/v1/attendance-courses
   *
   * @description
   * 根据学期、教学周、星期查询课程列表
   * 用于调串课功能的课程列表展示
   *
   * @param semester - 学期（必填）
   * @param teachingWeek - 教学周（可选）
   * @param weekDay - 星期（可选，1-7）
   *
   * @returns {
   *   success: boolean,
   *   data: Array<IcasyncAttendanceCourse>,
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/attendance-courses', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          teachingWeek: {
            type: 'integer',
            minimum: 1,
            maximum: 30,
            description: '教学周'
          },
          weekDay: {
            type: 'integer',
            minimum: 1,
            maximum: 7,
            description: '星期（1-7）'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  external_id: { type: 'string' },
                  course_code: { type: 'string' },
                  course_name: { type: 'string' },
                  semester: { type: 'string' },
                  teaching_week: { type: 'number' },
                  week_day: { type: 'number' },
                  teacher_names: { type: 'string' },
                  class_location: { type: 'string' },
                  start_time: { type: 'string' },
                  end_time: { type: 'string' },
                  periods: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  })
  async getCourses(
    request: FastifyRequest<{
      Querystring: {
        semester: string;
        teachingWeek?: number;
        weekDay?: number;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { teachingWeek, weekDay } = request.query;

      this.logger.debug('Getting attendance courses', {
        teachingWeek,
        weekDay
      });

      const result = await this.attendanceCourseService.findCoursesByWeekAndDay(
        teachingWeek,
        weekDay
      );

      if (isLeft(result)) {
        this.logger.warn('Failed to get courses', {
          error: result.left
        });
        return reply.status(400).send({
          success: false,
          error: result.left.message
        });
      }

      const courses = result.right;

      this.logger.debug('Courses retrieved', {
        teachingWeek,
        weekDay,
        count: courses.length
      });

      return reply.status(200).send({
        success: true,
        data: courses
      });
    } catch (error: any) {
      this.logger.error('Error in getCourses', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 批量调课
   * POST /api/icalink/v1/attendance-courses/reschedule
   *
   * @description
   * 批量调整课程的教学周和星期
   * 会同步更新WPS日程和本地数据库
   *
   * @param courseIds - 课程ID列表（必填）
   * @param targetTeachingWeek - 目标教学周（必填，1-30）
   * @param targetWeekDay - 目标星期（必填，1-7）
   * @param semester - 学期（必填）
   *
   * @returns {
   *   success: boolean,
   *   data: {
   *     successCount: number,
   *     failedCount: number,
   *     errors: Array<{courseId, courseName, error}>
   *   },
   *   error?: string
   * }
   */
  @Post('/api/icalink/v1/attendance-courses/reschedule', {
    schema: {
      body: {
        type: 'object',
        required: [
          'courseIds',
          'targetTeachingWeek',
          'targetWeekDay',
          'semester'
        ],
        properties: {
          courseIds: {
            type: 'array',
            items: { type: 'number' },
            minItems: 1,
            description: '课程ID列表'
          },
          targetTeachingWeek: {
            type: 'integer',
            minimum: 1,
            maximum: 30,
            description: '目标教学周'
          },
          targetWeekDay: {
            type: 'integer',
            minimum: 1,
            maximum: 7,
            description: '目标星期（1-7）'
          },
          semester: {
            type: 'string',
            description: '学期（如：2024-2025-1）'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                successCount: { type: 'number' },
                failedCount: { type: 'number' },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      courseId: { type: 'number' },
                      courseName: { type: 'string' },
                      error: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  async rescheduleCourses(
    request: FastifyRequest<{
      Body: {
        courseIds: number[];
        targetTeachingWeek: number;
        targetWeekDay: number;
        semester: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { courseIds, targetTeachingWeek, targetWeekDay, semester } =
        request.body;

      this.logger.info('Rescheduling courses', {
        courseCount: courseIds.length,
        targetWeek: targetTeachingWeek,
        targetDay: targetWeekDay,
        semester
      });

      const result = await this.attendanceCourseService.rescheduleCourses({
        courseIds,
        targetTeachingWeek,
        targetWeekDay,
        semester
      });

      if (isLeft(result)) {
        this.logger.warn('Failed to reschedule courses', {
          error: result.left
        });
        return reply.status(400).send({
          success: false,
          error: result.left.message
        });
      }

      const rescheduleResult = result.right;

      this.logger.info('Courses rescheduled', {
        successCount: rescheduleResult.successCount,
        failedCount: rescheduleResult.failedCount
      });

      return reply.status(200).send({
        success: true,
        data: rescheduleResult
      });
    } catch (error: any) {
      this.logger.error('Error in rescheduleCourses', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
