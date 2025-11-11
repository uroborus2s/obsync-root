import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import type CourseManagementService from '../services/CourseManagementService.js';
import type {
  CourseQueryParams,
  MakeupSignInForStudentsRequest,
  MakeupSignInRequest,
  RescheduleCourseRequest
} from '../services/interfaces/ICourseManagementService.js';

/**
 * 课程管理控制器
 * 提供课程查询和管理的HTTP接口
 */
@Controller()
export default class CourseManagementController {
  constructor(
    private readonly logger: Logger,
    private readonly courseManagementService: CourseManagementService
  ) {
    this.logger.info('✅ CourseManagementController initialized');
  }

  /**
   * 分页查询课程列表
   * GET /api/icalink/v1/courses/list
   *
   * @query teaching_week - 教学周（可选）
   * @query week_day - 星期（可选，1-7）
   * @query search_keyword - 搜索关键词（可选，支持课程名/课程号/教师名模糊搜索）
   * @query page - 页码（默认1）
   * @query page_size - 每页数量（默认20，最大100）
   *
   * @returns 分页的课程列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/courses/list')
  async getCourseList(
    request: FastifyRequest<{
      Querystring: {
        teaching_week?: string;
        week_day?: string;
        search_keyword?: string;
        page?: string;
        page_size?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 解析查询参数
      const teachingWeek = request.query.teaching_week
        ? parseInt(request.query.teaching_week, 10)
        : undefined;
      const weekDay = request.query.week_day
        ? parseInt(request.query.week_day, 10)
        : undefined;
      const searchKeyword = request.query.search_keyword?.trim() || undefined;
      const page = request.query.page ? parseInt(request.query.page, 10) : 1;
      const pageSize = request.query.page_size
        ? parseInt(request.query.page_size, 10)
        : 20;

      // 参数验证
      if (
        (request.query.teaching_week && isNaN(teachingWeek!)) ||
        (request.query.week_day && isNaN(weekDay!)) ||
        (request.query.page && isNaN(page)) ||
        (request.query.page_size && isNaN(pageSize))
      ) {
        return reply.status(400).send({
          success: false,
          message: '参数格式错误'
        });
      }

      this.logger.debug('Getting course list', {
        teachingWeek,
        weekDay,
        searchKeyword,
        page,
        pageSize
      });

      // 构建查询参数
      const params: CourseQueryParams = {
        teachingWeek,
        weekDay,
        searchKeyword
      };

      // 调用服务层
      const result = await this.courseManagementService.getCourseList(
        params,
        page,
        pageSize
      );

      // 处理结果
      if (isLeft(result)) {
        this.logger.warn('Failed to get course list', {
          error: result.left
        });
        return reply.status(400).send({
          success: false,
          message: result.left.message,
          code: result.left.code
        });
      }

      const courseData = result.right;

      this.logger.debug('Course list retrieved', {
        count: courseData.data.length,
        total: courseData.total,
        page: courseData.page,
        totalPages: courseData.total_pages
      });

      return reply.status(200).send({
        success: true,
        data: courseData
      });
    } catch (error: any) {
      this.logger.error('Unexpected error in getCourseList', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 批量调串课
   * POST /api/icalink/v1/courses/reschedule
   *
   * @body courseIds - 课程ID列表
   * @body targetTeachingWeek - 目标教学周（1-30）
   * @body targetWeekDay - 目标星期（1-7）
   *
   * @returns 调串课结果
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/courses/reschedule')
  async rescheduleCourses(
    request: FastifyRequest<{
      Body: RescheduleCourseRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.info('Rescheduling courses', {
        courseIds: request.body.courseIds,
        targetTeachingWeek: request.body.targetTeachingWeek,
        targetWeekDay: request.body.targetWeekDay
      });

      // 调用服务层
      const result = await this.courseManagementService.rescheduleCourses(
        request.body
      );

      // 处理结果
      if (isLeft(result)) {
        this.logger.warn('Failed to reschedule courses', {
          error: result.left
        });
        return reply.status(400).send({
          success: false,
          message: result.left.message,
          code: result.left.code
        });
      }

      const rescheduleResult = result.right;

      this.logger.info('Courses rescheduled successfully', {
        updatedCount: rescheduleResult.updated_count
      });

      return reply.status(200).send({
        success: true,
        data: rescheduleResult
      });
    } catch (error: any) {
      this.logger.error('Unexpected error in rescheduleCourses', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 批量补签
   * POST /api/icalink/v1/courses/makeup-signin
   *
   * @body courseIds - 课程ID列表
   *
   * @returns 补签结果
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/courses/makeup-signin')
  async makeupSignIn(
    request: FastifyRequest<{
      Body: MakeupSignInRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.info('Making up sign-in', {
        courseIds: request.body.courseIds
      });

      // 调用服务层
      const result = await this.courseManagementService.makeupSignIn(
        request.body
      );

      // 处理结果
      if (isLeft(result)) {
        this.logger.warn('Failed to makeup sign-in', {
          error: result.left
        });
        return reply.status(400).send({
          success: false,
          message: result.left.message,
          code: result.left.code
        });
      }

      const makeupResult = result.right;

      this.logger.info('Makeup sign-in completed successfully', {
        makeupType: makeupResult.makeup_type,
        totalRecords: makeupResult.total_records
      });

      return reply.status(200).send({
        success: true,
        data: makeupResult
      });
    } catch (error: any) {
      this.logger.error('Unexpected error in makeupSignIn', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 为指定学生补签
   * POST /api/icalink/v1/courses/makeup-signin/students
   *
   * @body courseId - 课程ID
   * @body studentIds - 学生ID列表
   *
   * @returns 学生补签结果
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/courses/makeup-signin/students')
  async makeupSignInForStudents(
    request: FastifyRequest<{
      Body: MakeupSignInForStudentsRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.info('Making up sign-in for students', {
        courseId: request.body.courseId,
        studentIds: request.body.studentIds
      });

      // 调用服务层
      const result = await this.courseManagementService.makeupSignInForStudents(
        request.body
      );

      // 处理结果
      if (isLeft(result)) {
        this.logger.warn('Failed to makeup sign-in for students', {
          error: result.left
        });
        return reply.status(400).send({
          success: false,
          message: result.left.message,
          code: result.left.code
        });
      }

      const makeupResult = result.right;

      this.logger.info('Makeup sign-in for students completed successfully', {
        courseId: makeupResult.course_id,
        successCount: makeupResult.success_count,
        failedCount: makeupResult.failed_count
      });

      return reply.status(200).send({
        success: true,
        data: makeupResult
      });
    } catch (error: any) {
      this.logger.error('Unexpected error in makeupSignInForStudents', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取课程的学生列表
   * GET /api/icalink/v1/courses/:courseId/students
   *
   * @param courseId - 课程ID
   * @query course_code - 课程代码
   *
   * @returns 学生列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/courses/:courseId/students')
  async getCourseStudents(
    request: FastifyRequest<{
      Params: { courseId: string };
      Querystring: { course_code: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const courseId = parseInt(request.params.courseId, 10);
      const courseCode = request.query.course_code;

      if (isNaN(courseId)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid course ID'
        });
      }

      if (!courseCode) {
        return reply.status(400).send({
          success: false,
          message: 'Course code is required'
        });
      }

      this.logger.info('Getting course students', {
        courseId,
        courseCode
      });

      // 调用 VTeachingClassRepository
      const students = await this.courseManagementService[
        'vTeachingClassRepository'
      ].findStudentsByCourseId(courseId, courseCode);

      this.logger.info('Course students retrieved successfully', {
        courseId,
        studentCount: students.length
      });

      return reply.status(200).send({
        success: true,
        data: students
      });
    } catch (error: any) {
      this.logger.error('Unexpected error in getCourseStudents', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}
