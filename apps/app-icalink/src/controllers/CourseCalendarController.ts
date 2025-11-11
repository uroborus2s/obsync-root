import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import type CourseCalendarService from '../services/CourseCalendarService.js';

/**
 * 课程日历控制器
 * 提供课程日历相关的HTTP接口
 */
@Controller()
export default class CourseCalendarController {
  constructor(
    private readonly logger: Logger,
    private readonly courseCalendarService: CourseCalendarService
  ) {
    this.logger.info('✅ CourseCalendarController initialized');
  }

  /**
   * 获取课程日历树形结构
   * GET /api/icalink/v1/course-calendar/tree
   *
   * @description
   * 返回课程日历的树形结构数据，包含：
   * - 根节点：吉林财经大学课表
   * - 一级节点：所有未删除的日历映射
   *
   * 注意：树形结构只包含两级（根节点 + 日历列表），不包含课程节点。
   * 课程数据通过 getCourseDetails 接口获取。
   *
   * @returns 树形结构数据
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/course-calendar/tree')
  async getCourseCalendarTree(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.debug('Getting course calendar tree');

      const result = await this.courseCalendarService.getCourseCalendarTree();

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '获取课程日历树失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get course calendar tree');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取日历参与者列表
   * GET /api/icalink/v1/course-calendar/:calendar_id/participants
   *
   * @description
   * 根据日历ID获取该日历的所有参与者信息
   * 调用WPS API的getCalendarPermissionList方法
   *
   * @param calendar_id - 日历ID
   * @returns 参与者列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 404: 日历不存在
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/course-calendar/:calendar_id/participants')
  async getCalendarParticipants(
    request: FastifyRequest<{
      Params: { calendar_id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const { calendar_id } = request.params;

    try {
      this.logger.debug(
        { calendarId: calendar_id },
        'Getting calendar participants'
      );

      const result =
        await this.courseCalendarService.getCalendarParticipants(calendar_id);

      if (!result.success) {
        const statusCode = result.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: result.message || '获取日历参与者失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error(
        { error, calendarId: calendar_id },
        'Failed to get calendar participants'
      );
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取课程详情列表
   * GET /api/icalink/v1/course-calendar/:calendar_id/courses
   *
   * @description
   * 根据日历ID获取该日历下的所有课程详情
   * 从icasync_attendance_courses表查询完整的课程信息
   *
   * @param calendar_id - 日历ID
   * @returns 课程详情列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 404: 日历不存在
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/course-calendar/:calendar_id/courses')
  async getCourseDetails(
    request: FastifyRequest<{
      Params: { calendar_id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const { calendar_id } = request.params;

    try {
      this.logger.debug({ calendarId: calendar_id }, 'Getting course details');

      const result =
        await this.courseCalendarService.getCourseDetailsByCalendarId(
          calendar_id
        );

      if (!result.success) {
        const statusCode = result.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: result.message || '获取课程详情失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error(
        { error, calendarId: calendar_id },
        'Failed to get course details'
      );
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 分页查询日历-课程关联列表（主列表）
   * GET /api/icalink/v1/course-calendar/courses
   *
   * @description
   * 查询日历与课程的关联列表，支持分页和搜索
   * 数据来源：icasync_calendar_mapping ⋈ v_course_checkin_stats_summary
   *
   * @query page - 页码（默认1）
   * @query page_size - 每页数量（默认20，最大100）
   * @query search - 搜索关键词（可选，支持课程代码、课程名称、教师姓名、教师代码）
   *
   * @returns 分页的日历-课程列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/course-calendar/courses')
  async getCalendarCourses(
    request: FastifyRequest<{
      Querystring: {
        page?: string;
        page_size?: string;
        search?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { page = '1', page_size = '20', search } = request.query;

      // 参数验证和转换
      const pageNum = parseInt(page, 10);
      const pageSizeNum = parseInt(page_size, 10);

      if (isNaN(pageNum) || pageNum < 1) {
        return reply.status(400).send({
          success: false,
          message: '页码必须是大于0的整数'
        });
      }

      if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
        return reply.status(400).send({
          success: false,
          message: '每页数量必须在1-100之间'
        });
      }

      this.logger.debug(
        { page: pageNum, pageSize: pageSizeNum, search },
        'Getting calendar courses'
      );

      const result =
        await this.courseCalendarService.getCalendarCoursesWithPagination(
          pageNum,
          pageSizeNum,
          search
        );

      if (!result.success) {
        const statusCode = result.code === 'VALIDATION_ERROR' ? 400 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: result.message || '获取日历课程列表失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get calendar courses');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 根据课程代码分页查询课节列表
   * GET /api/icalink/v1/course-calendar/courses/:course_code/sessions
   *
   * @description
   * 查询指定课程的所有课节信息，支持分页
   * 数据来源：icasync_attendance_courses
   *
   * @param course_code - 课程代码
   * @query page - 页码（默认1）
   * @query page_size - 每页数量（默认20，最大100）
   *
   * @returns 分页的课节列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/course-calendar/courses/:course_code/sessions')
  async getCourseSessions(
    request: FastifyRequest<{
      Params: {
        course_code: string;
      };
      Querystring: {
        page?: string;
        page_size?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { course_code } = request.params;
      const { page = '1', page_size = '20' } = request.query;

      // 参数验证
      if (!course_code || course_code.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '课程代码不能为空'
        });
      }

      const pageNum = parseInt(page, 10);
      const pageSizeNum = parseInt(page_size, 10);

      if (isNaN(pageNum) || pageNum < 1) {
        return reply.status(400).send({
          success: false,
          message: '页码必须是大于0的整数'
        });
      }

      if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
        return reply.status(400).send({
          success: false,
          message: '每页数量必须在1-100之间'
        });
      }

      this.logger.debug(
        { courseCode: course_code, page: pageNum, pageSize: pageSizeNum },
        'Getting course sessions'
      );

      const result =
        await this.courseCalendarService.getCourseSessionsByCourseCode(
          course_code,
          pageNum,
          pageSizeNum
        );

      if (!result.success) {
        const statusCode = result.code === 'VALIDATION_ERROR' ? 400 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: result.message || '获取课节列表失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get course sessions');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 根据日历ID获取课程分享人列表
   * GET /api/icalink/v1/course-calendar/:calendar_id/share-participants
   *
   * @description
   * 查询指定日历的所有分享人信息
   * 通过WPS API的getAllCalendarPermissions获取
   *
   * @param calendar_id - 日历ID
   *
   * @returns 分享人列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 404: 日历不存在
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/course-calendar/:calendar_id/share-participants')
  async getCourseShareParticipants(
    request: FastifyRequest<{
      Params: {
        calendar_id: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { calendar_id } = request.params;

      // 参数验证
      if (!calendar_id || calendar_id.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '日历ID不能为空'
        });
      }

      this.logger.debug(
        { calendarId: calendar_id },
        'Getting course share participants'
      );

      const result =
        await this.courseCalendarService.getCalendarParticipants(calendar_id);

      if (!result.success) {
        let statusCode = 500;
        if (result.code === 'VALIDATION_ERROR') {
          statusCode = 400;
        } else if (result.code === 'RESOURCE_NOT_FOUND') {
          statusCode = 404;
        }

        return reply.status(statusCode).send({
          success: false,
          message: result.message || '获取分享人列表失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get course share participants');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 同步日历参与者
   * POST /api/icalink/v1/course-calendar/:calendar_id/sync-participants
   *
   * @description
   * 将教学班中的所有学生批量添加到日历权限中
   * - 查询教学班所有学生
   * - 对比现有权限列表
   * - 批量添加缺失的学生（默认角色为 reader）
   *
   * @param calendar_id - 日历ID
   *
   * @returns 同步结果统计
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 404: 日历不存在
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/course-calendar/:calendar_id/sync-participants')
  async syncCalendarParticipants(
    request: FastifyRequest<{
      Params: {
        calendar_id: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { calendar_id } = request.params;

      // 参数验证
      if (!calendar_id || calendar_id.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '日历ID不能为空'
        });
      }

      this.logger.debug(
        { calendarId: calendar_id },
        'Syncing calendar participants'
      );

      const result =
        await this.courseCalendarService.syncCalendarParticipants(calendar_id);

      if (!result.success) {
        let statusCode = 500;
        if (result.code === 'VALIDATION_ERROR') {
          statusCode = 400;
        } else if (result.code === 'RESOURCE_NOT_FOUND') {
          statusCode = 404;
        }

        return reply.status(statusCode).send({
          success: false,
          message: result.message || '同步日历参与者失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to sync calendar participants');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 批量同步所有日历的参与者权限
   * POST /api/icalink/v1/course-calendar/sync-all-participants
   *
   * @description
   * 批量同步所有有效日历的参与者权限，包括：
   * - 添加缺失的参与者（教学班中存在但日历权限中不存在的学生和教师）
   * - 删除多余的权限（日历权限中存在但教学班中不存在的参与者）
   *
   * 同步逻辑：
   * 1. 查询所有有效的日历映射（is_deleted = false）
   * 2. 遍历每个日历，调用 syncCalendarParticipants 方法
   * 3. 单个日历同步失败不影响其他日历的同步
   * 4. 返回批量同步的统计结果
   *
   * @returns 批量同步结果统计
   *
   * HTTP 状态码：
   * - 200: 成功（即使部分日历同步失败，只要批量操作完成就返回200）
   * - 500: 服务器内部错误（批量操作本身失败）
   */
  @Post('/api/icalink/v1/course-calendar/sync-all-participants')
  async syncAllCalendarParticipants(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.info('Starting batch sync for all calendar participants');

      const result =
        await this.courseCalendarService.syncAllCalendarParticipants();

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '批量同步日历参与者失败',
          code: result.code
        });
      }

      // 即使部分日历同步失败，只要批量操作完成就返回成功
      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to execute batch sync');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取指定用户的所有课程列表
   * GET /api/icalink/v1/course-calendar/user-courses
   *
   * @description
   * 根据用户类型和用户ID查询该用户的所有课程列表
   * - 如果是学生：查询 icalink_teaching_class 表中该学号的所有课程
   * - 如果是教师：查询 icasync_attendance_courses 表中 teacher_codes 包含该工号的所有课程
   * - 返回课程列表及对应的日历ID
   *
   * @param user_type - 用户类型（teacher 或 student）
   * @param user_id - 学号或工号
   *
   * @returns 用户的课程列表
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Get('/api/icalink/v1/course-calendar/user-courses')
  async getUserCourses(
    request: FastifyRequest<{
      Querystring: {
        user_type: 'teacher' | 'student';
        user_id: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { user_type, user_id } = request.query;

      // 参数验证
      if (!user_type || !user_id) {
        return reply.status(400).send({
          success: false,
          message: '用户类型和用户ID不能为空'
        });
      }

      if (user_type !== 'teacher' && user_type !== 'student') {
        return reply.status(400).send({
          success: false,
          message: '用户类型必须是 teacher 或 student'
        });
      }

      this.logger.debug(
        { userType: user_type, userId: user_id },
        'Getting user courses'
      );

      const result = await this.courseCalendarService.getUserCourses(
        user_type,
        user_id
      );

      if (!result.success) {
        let statusCode = 500;
        if (result.code === 'VALIDATION_ERROR') {
          statusCode = 400;
        }

        return reply.status(statusCode).send({
          success: false,
          message: result.message || '获取用户课程列表失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get user courses');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 批量将用户添加到多个日历的权限中
   * POST /api/icalink/v1/course-calendar/batch-add-participant
   *
   * @description
   * 将指定用户批量添加到多个日历的分享者权限中
   * - 检查用户是否已有权限，如果已有则跳过
   * - 所有参与者都设置为 reader 权限
   * - 单个日历添加失败不影响其他日历的处理
   *
   * @param userType - 用户类型（teacher 或 student）
   * @param userId - 学号或工号
   * @param calendarIds - 日历 ID 列表
   *
   * @returns 批量操作结果统计
   *
   * HTTP 状态码：
   * - 200: 成功
   * - 400: 参数错误
   * - 500: 服务器内部错误
   */
  @Post('/api/icalink/v1/course-calendar/batch-add-participant')
  async batchAddParticipant(
    request: FastifyRequest<{
      Body: {
        userType: 'teacher' | 'student';
        userId: string;
        calendarIds: string[];
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userType, userId, calendarIds } = request.body;

      // 参数验证
      if (!userType || !userId || !calendarIds) {
        return reply.status(400).send({
          success: false,
          message: '用户类型、用户ID和日历ID列表不能为空'
        });
      }

      if (userType !== 'teacher' && userType !== 'student') {
        return reply.status(400).send({
          success: false,
          message: '用户类型必须是 teacher 或 student'
        });
      }

      if (!Array.isArray(calendarIds) || calendarIds.length === 0) {
        return reply.status(400).send({
          success: false,
          message: '日历ID列表必须是非空数组'
        });
      }

      this.logger.info(
        { userType, userId, calendarsCount: calendarIds.length },
        'Batch adding participant to calendars'
      );

      const result = await this.courseCalendarService.batchAddParticipant(
        userType,
        userId,
        calendarIds
      );

      if (!result.success) {
        let statusCode = 500;
        if (result.code === 'VALIDATION_ERROR') {
          statusCode = 400;
        }

        return reply.status(statusCode).send({
          success: false,
          message: result.message || '批量添加参与者失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to batch add participant');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}
