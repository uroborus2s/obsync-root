import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import type AbsentStudentRelationService from '../services/AbsentStudentRelationService.js';
import type CourseCheckinStatsService from '../services/CourseCheckinStatsService.js';
import type DepartmentService from '../services/DepartmentService.js';
import type StudentAbsenceRateDetailService from '../services/StudentAbsenceRateDetailService.js';
import type VCourseCheckinStatsClassService from '../services/VCourseCheckinStatsClassService.js';
import type VCourseCheckinStatsSummaryService from '../services/VCourseCheckinStatsSummaryService.js';
import type VCourseCheckinStatsUnitService from '../services/VCourseCheckinStatsUnitService.js';
import type VStudentAbsenceRateSummaryService from '../services/VStudentAbsenceRateSummaryService.js';
import type VTeachingClassService from '../services/VTeachingClassService.js';
import { getUserIdentityFromRequest } from '../utils/user-identity.js';

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
 * 提供统计数据查询接口和组织架构查询接口
 */
@Controller()
export default class StatsController {
  constructor(
    private readonly logger: Logger,
    private readonly absentStudentRelationService: AbsentStudentRelationService,
    private readonly courseCheckinStatsService: CourseCheckinStatsService,
    private readonly departmentService: DepartmentService,
    private readonly vTeachingClassService: VTeachingClassService,
    private readonly vCourseCheckinStatsUnitService: VCourseCheckinStatsUnitService,
    private readonly vCourseCheckinStatsClassService: VCourseCheckinStatsClassService,
    private readonly vCourseCheckinStatsSummaryService: VCourseCheckinStatsSummaryService,
    private readonly vStudentAbsenceRateSummaryService: VStudentAbsenceRateSummaryService,
    private readonly studentAbsenceRateDetailService: StudentAbsenceRateDetailService
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
   * - teachingWeek: 教学周筛选（可选）
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
  async getCourseStatsUnit(
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

      this.logger.debug('Querying course stats unit', {
        page,
        pageSize,
        searchKeyword,
        teachingWeek
      });

      const result =
        await this.vCourseCheckinStatsUnitService.findWithPagination({
          page,
          pageSize,
          searchKeyword,
          teachingWeek,
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

  /**
   * 查询学生缺勤率汇总统计数据
   * GET /api/icalink/v1/stats/student-absence-summary
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 分页的学生缺勤率汇总统计数据
   *
   * 查询参数:
   * - page: 页码（默认1）
   * - pageSize: 每页数量（默认20，最大100）
   * - collegeId: 学院ID（4位）
   * - grade: 年级（4位）
   * - majorId: 专业ID（6位）
   * - classId: 班级ID（可变长度）
   * - searchKeyword: 搜索关键词（学生ID、学生姓名）
   * - sortField: 排序字段
   * - sortOrder: 排序方向（asc/desc）
   *
   * @remarks
   * 前端将 ex_dept_id 拆分后传递：
   * - collegeId: ex_dept_id.substring(2, 6)
   * - grade: ex_dept_id.substring(6, 10)
   * - majorId: ex_dept_id.substring(10, 16)
   * - classId: ex_dept_id.substring(16)
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
  @Get('/api/icalink/v1/stats/student-absence-summary', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          collegeId: { type: 'string' },
          grade: { type: 'string' },
          majorId: { type: 'string' },
          classId: { type: 'string' },
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
  async getStudentAbsenceSummary(
    request: FastifyRequest<{
      Querystring: StatsQueryParams & {
        collegeId?: string;
        grade?: string;
        majorId?: string;
        classId?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 20,
        collegeId,
        grade,
        majorId,
        classId,
        searchKeyword,
        sortField,
        sortOrder
      } = request.query;

      this.logger.debug('Querying student absence rate summary', {
        page,
        pageSize,
        collegeId,
        grade,
        majorId,
        classId,
        searchKeyword,
        sortField,
        sortOrder
      });

      const result =
        await this.vStudentAbsenceRateSummaryService.findWithPagination(
          page,
          pageSize,
          collegeId,
          grade,
          majorId,
          classId,
          searchKeyword,
          sortField,
          sortOrder
        );

      return reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error: any) {
      this.logger.error('Error in getStudentAbsenceSummary', {
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
   * 查询学生历史统计数据（兼容旧接口）
   * GET /api/icalink/v1/stats/student-stats
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 分页的学生统计数据
   *
   * 注意：此接口使用 v_student_absence_rate_summary 视图，
   * 并进行字段映射以兼容前端期望的 StudentOverallAttendanceStats 接口
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
  async getStudentStats(
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

      this.logger.debug('Querying student stats (legacy endpoint)', {
        page,
        pageSize,
        searchKeyword
      });

      // 使用 student-absence-summary 服务，但不传 classId
      const result =
        await this.vStudentAbsenceRateSummaryService.findWithPagination(
          page,
          pageSize,
          undefined, // classId
          searchKeyword,
          sortField,
          sortOrder
        );

      // 字段映射：将 v_student_absence_rate_summary 的字段映射到前端期望的格式
      const mappedData = result.data.map((item: any) => ({
        student_id: item.student_id,
        name: item.student_name,
        school_name: item.school_name,
        major_name: item.major_name,
        class_name: item.class_name,
        total_sessions: item.total_sessions,
        completed_sessions: item.total_completed_sessions,
        absent_count: item.total_absent_count,
        leave_count: 0, // v_student_absence_rate_summary 没有此字段
        truant_count: 0, // v_student_absence_rate_summary 没有此字段
        absence_rate: item.overall_absence_rate
      }));

      return reply.status(200).send({
        success: true,
        data: {
          ...result,
          data: mappedData
        }
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
   * 获取根部门信息
   * GET /api/icalink/v1/depts/root
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 根部门信息
   *
   * @remarks
   * 此接口用于学工签到统计页面的组织架构树初始化
   * 返回 WPS 组织架构的根部门信息
   *
   * 响应格式:
   * {
   *   success: boolean,
   *   data?: {
   *     id: string,
   *     name: string,
   *     abs_path: string,
   *     parent_id: string,
   *     ex_dept_id: string
   *   },
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/depts/root', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                abs_path: { type: 'string' },
                parent_id: { type: 'string' },
                ex_dept_id: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  async getRootDepartment(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.debug('Getting root department');

      const result = await this.departmentService.getRootDepartment();

      if (!result.success) {
        this.logger.error('Failed to get root department', {
          error: result.error
        });
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to get root department'
        });
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      this.logger.error('Error in getRootDepartment', {
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
   * 获取子部门列表
   * GET /api/icalink/v1/depts/:deptId/children
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 子部门列表
   *
   * @remarks
   * 此接口用于学工签到统计页面的组织架构树展开节点
   * 支持分页查询子部门列表
   *
   * 路径参数:
   * - deptId: 部门ID
   *
   * 查询参数:
   * - page_size: 分页大小（可选，默认10，最大50）
   * - page_token: 分页标记（可选）
   * - with_total: 是否返回总数（可选）
   * - root_dept_id: 根部门ID（可选，用于性能优化）
   * - parent_ex_dept_id: 父部门的 ex_dept_id（可选，用于权限过滤）
   *
   * 权限过滤规则:
   * - 当 parent_ex_dept_id 为 '02' 或 '03' 时，应用学院级别的权限过滤
   * - 只返回与登录用户所属学院ID匹配的部门目录数据
   *
   * 响应格式:
   * {
   *   success: boolean,
   *   data?: {
   *     items: Array<{
   *       id: string,
   *       name: string,
   *       abs_path: string,
   *       parent_id: string,
   *       ex_dept_id: string
   *     }>,
   *     next_page_token?: string,
   *     total?: number
   *   },
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/depts/:deptId/children', {
    schema: {
      params: {
        type: 'object',
        properties: {
          deptId: { type: 'string' }
        },
        required: ['deptId']
      },
      querystring: {
        type: 'object',
        properties: {
          page_size: { type: 'integer', minimum: 1, maximum: 50 },
          page_token: { type: 'string' },
          with_total: { type: 'boolean' },
          root_dept_id: { type: 'string' },
          parent_ex_dept_id: { type: 'string' }
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
                items: { type: 'array' },
                next_page_token: { type: 'string' },
                total: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  })
  async getDepartmentChildren(
    request: FastifyRequest<{
      Params: { deptId: string };
      Querystring: {
        page_size?: number;
        page_token?: string;
        with_total?: boolean;
        root_dept_id?: string;
        parent_ex_dept_id?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { deptId } = request.params;
      const {
        page_size,
        page_token,
        with_total,
        root_dept_id,
        parent_ex_dept_id
      } = request.query;

      // 获取登录用户信息
      let userId: string | undefined;
      let userType: 'student' | 'teacher' | undefined;
      try {
        const userInfo = getUserIdentityFromRequest(request);
        userId = userInfo.userId;
        userType = userInfo.userType;
      } catch (error) {
        // 如果获取用户信息失败，继续执行但不应用权限过滤
        this.logger.warn(
          'Failed to get user identity, skipping permission filter',
          {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        );
      }

      this.logger.debug('Getting department children', {
        deptId,
        page_size,
        page_token,
        with_total,
        root_dept_id,
        parent_ex_dept_id,
        userId,
        userType
      });

      const result = await this.departmentService.getDepartmentChildren(
        deptId,
        page_size,
        page_token,
        with_total,
        root_dept_id,
        userId,
        userType,
        parent_ex_dept_id
      );

      if (!result.success) {
        this.logger.error('Failed to get department children', {
          deptId,
          error: result.error
        });
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to get department children'
        });
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      this.logger.error('Error in getDepartmentChildren', {
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
   * 获取学生课程缺勤详情
   * GET /api/icalink/v1/stats/student-course-details/:studentId
   *
   * @description
   * 查询指定学生的所有课程缺勤详情（点击穿透功能）
   * 从 icalink_student_absence_rate_detail 表查询
   *
   * @pathParam studentId - 学生ID
   * @queryParam sortField - 排序字段（absence_rate, leave_rate, truant_rate等）
   * @queryParam sortOrder - 排序方向（asc, desc）
   *
   * @returns {
   *   success: boolean,
   *   data: Array<IcalinkStudentAbsenceRateDetail>,
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/stats/student-course-details/:studentId', {
    schema: {
      params: {
        type: 'object',
        required: ['studentId'],
        properties: {
          studentId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          sortField: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' }
          }
        }
      }
    }
  })
  async getStudentCourseDetails(
    request: FastifyRequest<{
      Params: { studentId: string };
      Querystring: { sortField?: string; sortOrder?: 'asc' | 'desc' };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { studentId } = request.params;
      const { sortField, sortOrder } = request.query;

      this.logger.debug('Querying student course details', {
        studentId,
        sortField,
        sortOrder
      });

      const data = await this.studentAbsenceRateDetailService.findByStudentId(
        studentId,
        sortField,
        sortOrder
      );

      return reply.status(200).send({
        success: true,
        data
      });
    } catch (error: any) {
      this.logger.error('Error in getStudentCourseDetails', {
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
   * 获取学生在特定课程的缺勤记录详情
   * GET /api/icalink/v1/stats/student-absent-records
   *
   * @description
   * 查询指定学生在特定课程的缺勤记录详情（点击穿透功能）
   * 从 icalink_absent_student_relations 表查询
   * 支持按缺勤类型过滤
   *
   * @param studentId - 学生ID（必填）
   * @param courseCode - 课程代码（必填）
   * @param absenceType - 缺勤类型过滤（可选）：'absent', 'leave', 'truant', 'leave_and_pending'
   * @param sortField - 排序字段（可选，默认：teaching_week）
   * @param sortOrder - 排序方向（可选，默认：asc）
   *
   * @returns {
   *   success: boolean,
   *   data: Array<IcalinkAbsentStudentRelation>,
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/stats/student-absent-records', {
    schema: {
      querystring: {
        type: 'object',
        required: ['studentId', 'courseCode'],
        properties: {
          studentId: {
            type: 'string',
            description: '学生ID'
          },
          courseCode: {
            type: 'string',
            description: '课程代码'
          },
          absenceType: {
            type: 'string',
            enum: ['absent', 'leave', 'truant', 'leave_and_pending'],
            description: '缺勤类型过滤'
          },
          sortField: {
            type: 'string',
            description: '排序字段',
            default: 'teaching_week'
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: '排序方向',
            default: 'asc'
          }
        }
      }
    }
  })
  async getStudentAbsentRecords(
    request: FastifyRequest<{
      Querystring: {
        studentId: string;
        courseCode: string;
        absenceType?: 'absent' | 'leave' | 'truant' | 'leave_and_pending';
        sortField?: string;
        sortOrder?: 'asc' | 'desc';
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { studentId, courseCode, absenceType, sortField, sortOrder } =
        request.query;

      this.logger.debug('Getting student absent records', {
        studentId,
        courseCode,
        absenceType,
        sortField,
        sortOrder
      });

      const result =
        await this.absentStudentRelationService.findByStudentAndCourse(
          studentId,
          courseCode,
          absenceType,
          sortField || 'teaching_week',
          sortOrder || 'asc'
        );

      if (isLeft(result)) {
        this.logger.warn('Failed to get student absent records', {
          error: result.left
        });
        return reply.status(400).send({
          success: false,
          error: result.left.message
        });
      }

      const data = result.right;

      this.logger.debug('Student absent records retrieved', {
        studentId,
        courseCode,
        absenceType,
        count: data.length
      });

      return reply.status(200).send({
        success: true,
        data
      });
    } catch (error: any) {
      this.logger.error('Error in getStudentAbsentRecords', {
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
   * 根据课程代码查询学生缺勤统计列表
   * GET /api/icalink/v1/stats/course-absence-stats/:courseCode
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 学生缺勤统计列表
   *
   * 路径参数:
   * - courseCode: 课程代码
   *
   * 查询参数:
   * - sortField: 排序字段（默认：absence_rate）
   * - sortOrder: 排序方向（默认：desc）
   *
   * 响应格式:
   * {
   *   success: boolean,
   *   data: Array<{
   *     student_id: string,
   *     student_name: string,
   *     absence_rate: number,
   *     truant_rate: number,
   *     leave_rate: number,
   *     ...
   *   }>,
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/stats/course-absence-stats/:courseCode', {
    schema: {
      params: {
        type: 'object',
        required: ['courseCode'],
        properties: {
          courseCode: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          sortField: { type: 'string', default: 'absence_rate' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
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
                  student_id: { type: 'string' },
                  student_name: { type: 'string' },
                  course_code: { type: 'string' },
                  course_name: { type: 'string' },
                  absence_rate: { type: 'number' },
                  truant_rate: { type: 'number' },
                  leave_rate: { type: 'number' },
                  total_classes: { type: 'number' },
                  absent_count: { type: 'number' },
                  truant_count: { type: 'number' },
                  leave_count: { type: 'number' },
                  total_sessions: { type: 'number' },
                  completed_sessions: { type: 'number' }
                }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async getCourseAbsenceStats(
    request: FastifyRequest<{
      Params: { courseCode: string };
      Querystring: { sortField?: string; sortOrder?: 'asc' | 'desc' };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { courseCode } = request.params;
      const { sortField = 'absence_rate', sortOrder = 'desc' } = request.query;

      this.logger.debug('Getting course absence stats', {
        courseCode,
        sortField,
        sortOrder
      });

      const data = await this.studentAbsenceRateDetailService.findByCourseCode(
        courseCode,
        sortField,
        sortOrder
      );

      this.logger.debug('Course absence stats retrieved', {
        courseCode,
        count: data.length
      });

      return reply.status(200).send({
        success: true,
        data
      });
    } catch (error: any) {
      this.logger.error('Error in getCourseAbsenceStats', {
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
   * 获取当前教学周
   * GET /api/icalink/v1/stats/current-teaching-week
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 当前教学周信息
   *
   * 功能说明:
   * - 从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   *
   * 响应格式:
   * {
   *   success: boolean,
   *   data: {
   *     currentWeek: number,
   *     termStartDate: string
   *   },
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/stats/current-teaching-week', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                currentWeek: { type: 'integer' },
                termStartDate: { type: 'string' }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async getCurrentTeachingWeek(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const result =
        await this.courseCheckinStatsService.getCurrentTeachingWeek();

      if (!result.success) {
        this.logger.error('Failed to get current teaching week', {
          error: result.error
        });
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to get current teaching week'
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      this.logger.error('Error in getCurrentTeachingWeek', {
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
   * 查询学院周度签到统计数据（自动计算当前周并查询到上周）
   * GET /api/icalink/v1/stats/college-weekly-attendance
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 周度签到统计数据
   *
   * 查询参数:
   * - courseUnitId: 学院ID（必需）
   * - semester: 学期（可选）
   * - fillMissingWeeks: 是否填充缺失的周数据（可选，默认true）
   *
   * 功能说明:
   * - 自动从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   * - 查询范围：第1周到上周（当前周 - 1）
   * - 如果当前周 ≤ 1，返回空数组
   *
   * 响应格式:
   * {
   *   success: boolean,
   *   data: Array<{
   *     teaching_week: number,
   *     expected_attendance: number,
   *     absent_count: number,
   *     truant_count: number,
   *     leave_count: number,
   *     present_count: number,
   *     absence_rate: number,
   *     truant_rate: number
   *   }>,
   *   message?: string,
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/stats/college-weekly-attendance', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          courseUnitId: { type: 'string' },
          semester: { type: 'string' },
          fillMissingWeeks: { type: 'boolean', default: true }
        },
        required: ['courseUnitId']
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
                  teaching_week: { type: 'integer' },
                  expected_attendance: { type: 'integer' },
                  absent_count: { type: 'integer' },
                  truant_count: { type: 'integer' },
                  leave_count: { type: 'integer' },
                  present_count: { type: 'integer' },
                  absence_rate: { type: 'number' },
                  truant_rate: { type: 'number' }
                }
              }
            },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  })
  async getCollegeWeeklyAttendance(
    request: FastifyRequest<{
      Querystring: {
        courseUnitId: string;
        semester?: string;
        fillMissingWeeks?: boolean;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { courseUnitId, semester, fillMissingWeeks = true } = request.query;

      this.logger.debug('Querying college weekly attendance stats', {
        courseUnitId,
        semester,
        fillMissingWeeks
      });

      const result = await this.courseCheckinStatsService.getCollegeWeeklyStats(
        courseUnitId,
        semester,
        fillMissingWeeks
      );

      if (!result.success) {
        this.logger.error('Failed to query college weekly attendance stats', {
          error: result.error
        });
        return reply.status(400).send({
          success: false,
          error:
            result.error || 'Failed to query college weekly attendance stats',
          message: result.message
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error: any) {
      this.logger.error('Error in getCollegeWeeklyAttendance', {
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
   * 查询教学班周度签到统计数据（自动计算当前周并查询到上周）
   * GET /api/icalink/v1/stats/class-weekly-attendance
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 周度签到统计数据
   *
   * 查询参数:
   * - teachingClassCode: 教学班代码（必需）
   * - semester: 学期（可选）
   * - fillMissingWeeks: 是否填充缺失的周数据（可选，默认true）
   *
   * 功能说明:
   * - 自动从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   * - 查询范围：第1周到上周（当前周 - 1）
   * - 如果当前周 ≤ 1，返回空数组
   *
   * 响应格式:
   * {
   *   success: boolean,
   *   data: Array<{
   *     teaching_week: number,
   *     expected_attendance: number,
   *     absent_count: number,
   *     truant_count: number,
   *     leave_count: number,
   *     present_count: number,
   *     absence_rate: number,
   *     truant_rate: number
   *   }>,
   *   message?: string,
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/stats/class-weekly-attendance', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          teachingClassCode: { type: 'string' },
          semester: { type: 'string' },
          fillMissingWeeks: { type: 'boolean', default: true }
        },
        required: ['teachingClassCode']
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
                  teaching_week: { type: 'number' },
                  expected_attendance: { type: 'number' },
                  absent_count: { type: 'number' },
                  truant_count: { type: 'number' },
                  leave_count: { type: 'number' },
                  present_count: { type: 'number' },
                  absence_rate: { type: 'number' },
                  truant_rate: { type: 'number' }
                }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  })
  async getClassWeeklyAttendance(
    request: FastifyRequest<{
      Querystring: {
        teachingClassCode: string;
        semester?: string;
        fillMissingWeeks?: boolean;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        teachingClassCode,
        semester,
        fillMissingWeeks = true
      } = request.query;

      this.logger.debug('Querying class weekly attendance stats', {
        teachingClassCode,
        semester,
        fillMissingWeeks
      });

      const result = await this.courseCheckinStatsService.getClassWeeklyStats(
        teachingClassCode,
        semester,
        fillMissingWeeks
      );

      if (!result.success) {
        this.logger.error('Failed to query class weekly attendance stats', {
          error: result.error
        });
        return reply.status(400).send({
          success: false,
          error:
            result.error || 'Failed to query class weekly attendance stats',
          message: result.message
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error: any) {
      this.logger.error('Error in getClassWeeklyAttendance', {
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
   * 查询课程周度签到统计数据（自动计算当前周并查询到上周）
   * GET /api/icalink/v1/stats/course-weekly-attendance
   *
   * @param request - Fastify请求对象
   * @param reply - Fastify响应对象
   * @returns 周度签到统计数据
   *
   * 查询参数:
   * - courseCode: 课程代码（必需）
   * - semester: 学期（可选）
   * - fillMissingWeeks: 是否填充缺失的周数据（可选，默认true）
   *
   * 功能说明:
   * - 自动从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   * - 查询范围：第1周到上周（当前周 - 1）
   * - 如果当前周 ≤ 1，返回空数组
   *
   * 响应格式:
   * {
   *   success: boolean,
   *   data: Array<{
   *     teaching_week: number,
   *     expected_attendance: number,
   *     absent_count: number,
   *     truant_count: number,
   *     leave_count: number,
   *     present_count: number,
   *     absence_rate: number,
   *     truant_rate: number
   *   }>,
   *   message?: string,
   *   error?: string
   * }
   */
  @Get('/api/icalink/v1/stats/course-weekly-attendance', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          courseCode: { type: 'string' },
          semester: { type: 'string' },
          fillMissingWeeks: { type: 'boolean', default: true }
        },
        required: ['courseCode']
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
                  teaching_week: { type: 'number' },
                  expected_attendance: { type: 'number' },
                  absent_count: { type: 'number' },
                  truant_count: { type: 'number' },
                  leave_count: { type: 'number' },
                  present_count: { type: 'number' },
                  absence_rate: { type: 'number' },
                  truant_rate: { type: 'number' }
                }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  })
  async getCourseWeeklyAttendance(
    request: FastifyRequest<{
      Querystring: {
        courseCode: string;
        semester?: string;
        fillMissingWeeks?: boolean;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { courseCode, semester, fillMissingWeeks = true } = request.query;

      this.logger.debug('Querying course weekly attendance stats', {
        courseCode,
        semester,
        fillMissingWeeks
      });

      const result = await this.courseCheckinStatsService.getCourseWeeklyStats(
        courseCode,
        semester,
        fillMissingWeeks
      );

      if (!result.success) {
        this.logger.error('Failed to query course weekly attendance stats', {
          error: result.error
        });
        return reply.status(400).send({
          success: false,
          error:
            result.error || 'Failed to query course weekly attendance stats',
          message: result.message
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error: any) {
      this.logger.error('Error in getCourseWeeklyAttendance', {
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
