import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import type AbsentStudentRelationService from '../services/AbsentStudentRelationService.js';
import type CourseCheckinStatsService from '../services/CourseCheckinStatsService.js';
import type VStudentOverallAttendanceStatsDetailsService from '../services/VStudentOverallAttendanceStatsDetailsService.js';
import type VStudentOverallAttendanceStatsService from '../services/VStudentOverallAttendanceStatsService.js';
import type VTeachingClassService from '../services/VTeachingClassService.js';

/**
 * 统计数据查询参数
 */
interface StatsQueryParams {
  /** 页码，默认1 */
  page?: number;
  /** 每页大小，默认20 */
  pageSize?: number;
  /** 搜索关键词 */
  searchKeyword?: string;
  /** 教学周筛选 */
  teachingWeek?: number;
  /** 排序字段 */
  sortField?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 统计数据控制器
 * 提供5个统计数据查询接口
 */
@Controller()
export default class StatsController {
  constructor(
    private readonly logger: Logger,
    private readonly absentStudentRelationService: AbsentStudentRelationService,
    private readonly courseCheckinStatsService: CourseCheckinStatsService,
    private readonly vTeachingClassService: VTeachingClassService,
    private readonly vStudentOverallAttendanceStatsService: VStudentOverallAttendanceStatsService,
    private readonly vStudentOverallAttendanceStatsDetailsService: VStudentOverallAttendanceStatsDetailsService
  ) {
    this.logger.info('✅ StatsController initialized');
  }

  /**
   * 查询缺勤历史明细数据
   * GET /api/icalink/v1/stats/absent-history
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 分页的缺勤历史明细数据
   *
   * 查询参数:
   * - page: 页码（默认1）
   * - pageSize: 每页数量（默认20，最大100）
   * - searchKeyword: 搜索关键词（学生姓名、学生ID、课程名称、课程代码、缺勤类型）
   * - teachingWeek: 教学周筛选
   * - sortField: 排序字段
   * - sortOrder: 排序方向（asc/desc）
   *
   * 响应格式:
   * {
   *   success: boolean,
   *   data: {
   *     data: Array,
   *     total: number,
   *     page: number,
   *     pageSize: number,
   *     totalPages: number
   *   },
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/stats/absent-history', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          searchKeyword: { type: 'string' },
          teachingWeek: { type: 'integer', minimum: 1 },
          sortField: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] }
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
                data: { type: 'array' },
                total: { type: 'integer' },
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                totalPages: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  })
  async getAbsentHistory(
    request: FastifyRequest<{ Querystring: StatsQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 20,
        searchKeyword,
        teachingWeek,
        sortField,
        sortOrder
      } = request.query;

      this.logger.debug('Querying absent history', {
        page,
        pageSize,
        searchKeyword,
        teachingWeek
      });

      const result = await this.absentStudentRelationService.findWithPagination(
        {
          page,
          pageSize,
          searchKeyword,
          teachingWeek,
          sortField,
          sortOrder
        }
      );

      // 处理 Either 类型的返回值
      if (isLeft(result)) {
        this.logger.error('Failed to query absent history', {
          error: result.left
        });
        return reply.status(500).send({
          success: false,
          error: result.left.message || 'Failed to query absent history'
        });
      }

      // 成功时返回标准格式
      return reply.status(200).send({
        success: true,
        data: result.right
      });
    } catch (error: any) {
      this.logger.error('Error in getAbsentHistory', {
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
   * 查询课程历史统计数据
   * GET /api/icalink/v1/stats/course-stats
   */
  @Get('/api/icalink/v1/stats/course-stats', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          searchKeyword: { type: 'string' },
          teachingWeek: { type: 'integer', minimum: 1 },
          sortField: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] }
        }
      }
    }
  })
  async getCourseStats(
    request: FastifyRequest<{ Querystring: StatsQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 20,
        searchKeyword,
        teachingWeek,
        sortField,
        sortOrder
      } = request.query;

      this.logger.debug('Querying course stats', {
        page,
        pageSize,
        searchKeyword,
        teachingWeek
      });

      const result = await this.courseCheckinStatsService.findWithPagination({
        page,
        pageSize,
        searchKeyword,
        teachingWeek,
        sortField,
        sortOrder
      });

      if (!result.success) {
        this.logger.error('Failed to query course stats', {
          error: result.error
        });
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to query course stats'
        });
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      this.logger.error('Error in getCourseStats', {
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
   * 查询教学班数据
   * GET /api/icalink/v1/stats/teaching-class
   */
  @Get('/api/icalink/v1/stats/teaching-class', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          searchKeyword: { type: 'string' },
          sortField: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] }
        }
      }
    }
  })
  async getTeachingClass(
    request: FastifyRequest<{ Querystring: StatsQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 20,
        searchKeyword,
        sortField,
        sortOrder
      } = request.query;

      this.logger.debug('Querying teaching class', {
        page,
        pageSize,
        searchKeyword
      });

      const result = await this.vTeachingClassService.findWithPagination({
        page,
        pageSize,
        searchKeyword,
        sortField,
        sortOrder
      });

      if (!result.success) {
        this.logger.error('Failed to query teaching class', {
          error: result.error
        });
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to query teaching class'
        });
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      this.logger.error('Error in getTeachingClass', {
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
   * 查询学生历史统计数据
   * GET /api/icalink/v1/stats/student-stats
   */
  @Get('/api/icalink/v1/stats/student-stats', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          searchKeyword: { type: 'string' },
          sortField: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] }
        }
      }
    }
  })
  async getStudentStats(
    request: FastifyRequest<{ Querystring: StatsQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 20,
        searchKeyword,
        sortField,
        sortOrder
      } = request.query;

      this.logger.debug('Querying student stats', {
        page,
        pageSize,
        searchKeyword
      });

      const result =
        await this.vStudentOverallAttendanceStatsService.findWithPagination({
          page,
          pageSize,
          searchKeyword,
          sortField,
          sortOrder
        });

      // 处理 Either 类型的返回值
      if (isLeft(result)) {
        this.logger.error('Failed to query student stats', {
          error: result.left
        });
        return reply.status(500).send({
          success: false,
          error: result.left.message || 'Failed to query student stats'
        });
      }

      // 成功时返回标准格式
      return reply.status(200).send({
        success: true,
        data: result.right
      });
    } catch (error: any) {
      this.logger.error('Error in getStudentStats', {
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
   * 查询学生历史统计详情数据
   * GET /api/icalink/v1/stats/student-stats-details
   */
  @Get('/api/icalink/v1/stats/student-stats-details', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          searchKeyword: { type: 'string' },
          teachingWeek: { type: 'integer', minimum: 1 },
          sortField: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] }
        }
      }
    }
  })
  async getStudentStatsDetails(
    request: FastifyRequest<{ Querystring: StatsQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 20,
        searchKeyword,
        teachingWeek,
        sortField,
        sortOrder
      } = request.query;

      this.logger.debug('Querying student stats details', {
        page,
        pageSize,
        searchKeyword,
        teachingWeek
      });

      const result =
        await this.vStudentOverallAttendanceStatsDetailsService.findWithPagination(
          {
            page,
            pageSize,
            searchKeyword,
            teachingWeek,
            sortField,
            sortOrder
          }
        );

      if (!result.success) {
        this.logger.error('Failed to query student stats details', {
          error: result.error
        });
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to query student stats details'
        });
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      this.logger.error('Error in getStudentStatsDetails', {
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
