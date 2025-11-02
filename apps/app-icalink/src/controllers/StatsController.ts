import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import type AbsentStudentRelationService from '../services/AbsentStudentRelationService.js';
import type CourseCheckinStatsService from '../services/CourseCheckinStatsService.js';
import type VCourseCheckinStatsClassService from '../services/VCourseCheckinStatsClassService.js';
import type VCourseCheckinStatsSummaryService from '../services/VCourseCheckinStatsSummaryService.js';
import type VCourseCheckinStatsUnitService from '../services/VCourseCheckinStatsUnitService.js';
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
 * 提供8个统计数据查询接口（包含3个新增的课程签到统计接口）
 */
@Controller()
export default class StatsController {
  constructor(
    private readonly logger: Logger,
    private readonly absentStudentRelationService: AbsentStudentRelationService,
    private readonly courseCheckinStatsService: CourseCheckinStatsService,
    private readonly vTeachingClassService: VTeachingClassService,
    private readonly vCourseCheckinStatsUnitService: VCourseCheckinStatsUnitService,
    private readonly vCourseCheckinStatsClassService: VCourseCheckinStatsClassService,
    private readonly vCourseCheckinStatsSummaryService: VCourseCheckinStatsSummaryService
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
   * 查询教学班数据（关键字搜索）
   * GET /api/icalink/v1/stats/teaching-class
   * 支持通过关键字搜索：学号、姓名、学院、专业、班级、年级、课程编码、课程名称、开课单位
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
    request: FastifyRequest<{
      Querystring: StatsQueryParams;
    }>,
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

      this.logger.debug('Querying teaching class with keyword search', {
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
   * 查询单位级别签到统计数据
   * GET /api/icalink/v1/stats/course-stats-unit
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 分页的单位级别签到统计数据
   *
   * 查询参数:
   * - page: 页码（默认1）
   * - pageSize: 每页数量（默认20，最大100）
   * - searchKeyword: 搜索关键词（单位名称、单位ID、学期）
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
  @Get('/api/icalink/v1/stats/course-stats-unit', {
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
  async getCourseStatsUnit(
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

      this.logger.debug('Querying course stats unit', {
        page,
        pageSize,
        searchKeyword
      });

      const result =
        await this.vCourseCheckinStatsUnitService.findWithPagination({
          page,
          pageSize,
          searchKeyword,
          sortField,
          sortOrder
        });

      if (!result.success) {
        this.logger.error('Failed to query course stats unit', {
          error: result.error
        });
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to query course stats unit'
        });
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      this.logger.error('Error in getCourseStatsUnit', {
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
   * 查询班级级别签到统计数据
   * GET /api/icalink/v1/stats/course-stats-class
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 分页的班级级别签到统计数据
   *
   * 查询参数:
   * - page: 页码（默认1）
   * - pageSize: 每页数量（默认20，最大100）
   * - unitId: 单位ID（用于树形结构的层级查询）
   * - searchKeyword: 搜索关键词（班级代码、课程名称、单位名称、学期）
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
  @Get('/api/icalink/v1/stats/course-stats-class', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          unitId: { type: 'string' },
          searchKeyword: { type: 'string' },
          sortField: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] }
        }
      }
    }
  })
  async getCourseStatsClass(
    request: FastifyRequest<{
      Querystring: StatsQueryParams & { unitId?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 20,
        unitId,
        searchKeyword,
        sortField,
        sortOrder
      } = request.query;

      this.logger.debug('Querying course stats class', {
        page,
        pageSize,
        unitId,
        searchKeyword
      });

      const result =
        await this.vCourseCheckinStatsClassService.findWithPagination({
          page,
          pageSize,
          unitId,
          searchKeyword,
          sortField,
          sortOrder
        });

      if (!result.success) {
        this.logger.error('Failed to query course stats class', {
          error: result.error
        });
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to query course stats class'
        });
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      this.logger.error('Error in getCourseStatsClass', {
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
   * 查询课程汇总签到统计数据
   * GET /api/icalink/v1/stats/course-stats-summary
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 分页的课程汇总签到统计数据
   *
   * 查询参数:
   * - page: 页码（默认1）
   * - pageSize: 每页数量（默认20，最大100）
   * - classCode: 班级代码（用于树形结构的层级查询）
   * - searchKeyword: 搜索关键词（课程代码、课程名称、教师名称、上课地点、学期）
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
  @Get('/api/icalink/v1/stats/course-stats-summary', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          classCode: { type: 'string' },
          searchKeyword: { type: 'string' },
          sortField: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] }
        }
      }
    }
  })
  async getCourseStatsSummary(
    request: FastifyRequest<{
      Querystring: StatsQueryParams & { classCode?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 20,
        classCode,
        searchKeyword,
        sortField,
        sortOrder
      } = request.query;

      this.logger.debug('Querying course stats summary', {
        page,
        pageSize,
        classCode,
        searchKeyword
      });

      const result =
        await this.vCourseCheckinStatsSummaryService.findWithPagination({
          page,
          pageSize,
          classCode,
          searchKeyword,
          sortField,
          sortOrder
        });

      if (!result.success) {
        this.logger.error('Failed to query course stats summary', {
          error: result.error
        });
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to query course stats summary'
        });
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      this.logger.error('Error in getCourseStatsSummary', {
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
