import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Delete, Get, Post, Put } from '@stratix/core';
import type CoursePeriodService from '../services/CoursePeriodService.js';
import type { CourseContext } from '../services/interfaces/ICoursePeriodService.js';
import type {
  IcalinkCoursePeriod,
  IcalinkCoursePeriodRule,
  IcalinkCoursePeriodRuleCondition,
  IcalinkSystemConfigTerm
} from '../types/database.js';

/**
 * 课程时间配置控制器
 * 提供课程时间配置相关的HTTP接口
 */
@Controller()
export default class CoursePeriodController {
  constructor(
    private readonly logger: Logger,
    private readonly coursePeriodService: CoursePeriodService
  ) {
    this.logger.info('✅ CoursePeriodController initialized');
  }

  // ========== 学期管理 ==========

  /**
   * 获取所有学期
   * GET /api/icalink/v1/course-periods/terms
   */
  @Get('/api/icalink/v1/course-periods/terms')
  async getAllTerms(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.debug('Getting all terms');

      const result = await this.coursePeriodService.getAllTerms();

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '获取学期列表失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get all terms');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取当前激活学期
   * GET /api/icalink/v1/course-periods/terms/active
   */
  @Get('/api/icalink/v1/course-periods/terms/active')
  async getActiveTerm(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.debug('Getting active term');

      const result = await this.coursePeriodService.getActiveTerm();

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '获取当前学期失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get active term');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 创建学期
   * POST /api/icalink/v1/course-periods/terms
   */
  @Post('/api/icalink/v1/course-periods/terms')
  async createTerm(
    request: FastifyRequest<{
      Body: Omit<IcalinkSystemConfigTerm, 'id' | 'created_at' | 'updated_at'>;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.debug({ body: request.body }, 'Creating term');

      const result = await this.coursePeriodService.createTerm(request.body);

      if (!result.success) {
        const status = result.code === 'VALIDATION_ERROR' ? 400 : 500;
        return reply.status(status).send({
          success: false,
          message: result.message || '创建学期失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to create term');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新学期
   * PUT /api/icalink/v1/course-periods/terms/:id
   */
  @Put('/api/icalink/v1/course-periods/terms/:id')
  async updateTerm(
    request: FastifyRequest<{
      Params: { id: string };
      Body: Partial<
        Omit<IcalinkSystemConfigTerm, 'id' | 'created_at' | 'updated_at'>
      >;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const termId = parseInt(request.params.id, 10);

      if (isNaN(termId)) {
        return reply.status(400).send({
          success: false,
          message: '学期ID必须是数字'
        });
      }

      this.logger.debug({ termId, body: request.body }, 'Updating term');

      const result = await this.coursePeriodService.updateTerm(
        termId,
        request.body
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '更新学期失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to update term');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 删除学期
   * DELETE /api/icalink/v1/course-periods/terms/:id
   */
  @Delete('/api/icalink/v1/course-periods/terms/:id')
  async deleteTerm(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const termId = parseInt(request.params.id, 10);

      if (isNaN(termId)) {
        return reply.status(400).send({
          success: false,
          message: '学期ID必须是数字'
        });
      }

      this.logger.debug({ termId }, 'Deleting term');

      const result = await this.coursePeriodService.deleteTerm(termId);

      if (!result.success) {
        const status = result.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
        return reply.status(status).send({
          success: false,
          message: result.message || '删除学期失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete term');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 设置激活学期
   * PUT /api/icalink/v1/course-periods/terms/:id/activate
   */
  @Put('/api/icalink/v1/course-periods/terms/:id/activate')
  async setActiveTerm(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const termId = parseInt(request.params.id, 10);

      if (isNaN(termId)) {
        return reply.status(400).send({
          success: false,
          message: '学期ID必须是数字'
        });
      }

      this.logger.debug({ termId }, 'Setting active term');

      const result = await this.coursePeriodService.setActiveTerm(termId);

      if (!result.success) {
        const status = result.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
        return reply.status(status).send({
          success: false,
          message: result.message || '设置当前学期失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to set active term');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // ========== 课节管理 ==========

  /**
   * 根据学期ID获取课节列表
   * GET /api/icalink/v1/course-periods/periods?term_id=xxx
   */
  @Get('/api/icalink/v1/course-periods/periods')
  async getPeriodsByTerm(
    request: FastifyRequest<{
      Querystring: { term_id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const termId = parseInt(request.query.term_id, 10);

      if (isNaN(termId)) {
        return reply.status(400).send({
          success: false,
          message: '学期ID必须是数字'
        });
      }

      this.logger.debug({ termId }, 'Getting periods by term');

      const result = await this.coursePeriodService.getPeriodsByTerm(termId);

      if (!result.success) {
        return reply.status(500).send({
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
      this.logger.error({ error }, 'Failed to get periods by term');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 根据学期ID获取课节及其规则
   * GET /api/icalink/v1/course-periods/periods-with-rules?term_id=xxx
   */
  @Get('/api/icalink/v1/course-periods/periods-with-rules')
  async getPeriodsWithRules(
    request: FastifyRequest<{
      Querystring: { term_id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const termId = parseInt(request.query.term_id, 10);

      if (isNaN(termId)) {
        return reply.status(400).send({
          success: false,
          message: '学期ID必须是数字'
        });
      }

      this.logger.debug({ termId }, 'Getting periods with rules');

      const result = await this.coursePeriodService.getPeriodsWithRules(termId);

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '获取课节及规则失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get periods with rules');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 创建课节
   * POST /api/icalink/v1/course-periods/periods
   */
  @Post('/api/icalink/v1/course-periods/periods')
  async createPeriod(
    request: FastifyRequest<{
      Body: Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.debug({ body: request.body }, 'Creating period');

      const result = await this.coursePeriodService.createPeriod(request.body);

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '创建课节失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to create period');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新课节
   * PUT /api/icalink/v1/course-periods/periods/:id
   */
  @Put('/api/icalink/v1/course-periods/periods/:id')
  async updatePeriod(
    request: FastifyRequest<{
      Params: { id: string };
      Body: Partial<
        Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>
      >;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const periodId = parseInt(request.params.id, 10);

      if (isNaN(periodId)) {
        return reply.status(400).send({
          success: false,
          message: '课节ID必须是数字'
        });
      }

      this.logger.debug({ periodId, body: request.body }, 'Updating period');

      const result = await this.coursePeriodService.updatePeriod(
        periodId,
        request.body
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '更新课节失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to update period');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 删除课节
   * DELETE /api/icalink/v1/course-periods/periods/:id
   */
  @Delete('/api/icalink/v1/course-periods/periods/:id')
  async deletePeriod(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const periodId = parseInt(request.params.id, 10);

      if (isNaN(periodId)) {
        return reply.status(400).send({
          success: false,
          message: '课节ID必须是数字'
        });
      }

      this.logger.debug({ periodId }, 'Deleting period');

      const result = await this.coursePeriodService.deletePeriod(periodId);

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '删除课节失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete period');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 批量创建课节
   * POST /api/icalink/v1/course-periods/periods/batch
   */
  @Post('/api/icalink/v1/course-periods/periods/batch')
  async batchCreatePeriods(
    request: FastifyRequest<{
      Body: {
        periods: Array<
          Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>
        >;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      this.logger.debug(
        { count: request.body.periods.length },
        'Batch creating periods'
      );

      const result = await this.coursePeriodService.batchCreatePeriods(
        request.body.periods
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '批量创建课节失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to batch create periods');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 复制课节到另一个学期
   * POST /api/icalink/v1/course-periods/periods/copy
   */
  @Post('/api/icalink/v1/course-periods/periods/copy')
  async copyPeriodsToTerm(
    request: FastifyRequest<{
      Body: {
        source_term_id: number;
        target_term_id: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { source_term_id, target_term_id } = request.body;

      this.logger.debug(
        { source_term_id, target_term_id },
        'Copying periods to term'
      );

      const result = await this.coursePeriodService.copyPeriodsToTerm(
        source_term_id,
        target_term_id
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '复制课节失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to copy periods to term');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // ========== 规则管理 ==========

  /**
   * 根据课节ID获取规则列表
   * GET /api/icalink/v1/course-periods/rules?period_id=xxx
   */
  @Get('/api/icalink/v1/course-periods/rules')
  async getRulesByPeriod(
    request: FastifyRequest<{
      Querystring: { period_id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const periodId = parseInt(request.query.period_id, 10);

      if (isNaN(periodId)) {
        return reply.status(400).send({
          success: false,
          message: '课节ID必须是数字'
        });
      }

      this.logger.debug({ periodId }, 'Getting rules by period');

      const result = await this.coursePeriodService.getRulesByPeriod(periodId);

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '获取规则列表失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to get rules by period');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 创建规则（包含条件）
   * POST /api/icalink/v1/course-periods/rules
   */
  @Post('/api/icalink/v1/course-periods/rules')
  async createRule(
    request: FastifyRequest<{
      Body: {
        rule: Omit<IcalinkCoursePeriodRule, 'id' | 'created_at' | 'updated_at'>;
        conditions: Array<
          Omit<
            IcalinkCoursePeriodRuleCondition,
            'id' | 'rule_id' | 'created_at' | 'updated_at'
          >
        >;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { rule, conditions } = request.body;

      this.logger.debug({ rule, conditions }, 'Creating rule');

      const result = await this.coursePeriodService.createRule(
        rule,
        conditions
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '创建规则失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to create rule');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新规则（包含条件）
   * PUT /api/icalink/v1/course-periods/rules/:id
   */
  @Put('/api/icalink/v1/course-periods/rules/:id')
  async updateRule(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        rule: Partial<
          Omit<IcalinkCoursePeriodRule, 'id' | 'created_at' | 'updated_at'>
        >;
        conditions: Array<
          Omit<
            IcalinkCoursePeriodRuleCondition,
            'id' | 'rule_id' | 'created_at' | 'updated_at'
          >
        >;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const ruleId = parseInt(request.params.id, 10);

      if (isNaN(ruleId)) {
        return reply.status(400).send({
          success: false,
          message: '规则ID必须是数字'
        });
      }

      const { rule, conditions } = request.body;

      this.logger.debug({ ruleId, rule, conditions }, 'Updating rule');

      const result = await this.coursePeriodService.updateRule(
        ruleId,
        rule,
        conditions
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '更新规则失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to update rule');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 删除规则
   * DELETE /api/icalink/v1/course-periods/rules/:id
   */
  @Delete('/api/icalink/v1/course-periods/rules/:id')
  async deleteRule(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const ruleId = parseInt(request.params.id, 10);

      if (isNaN(ruleId)) {
        return reply.status(400).send({
          success: false,
          message: '规则ID必须是数字'
        });
      }

      this.logger.debug({ ruleId }, 'Deleting rule');

      const result = await this.coursePeriodService.deleteRule(ruleId);

      if (!result.success) {
        const status = result.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
        return reply.status(status).send({
          success: false,
          message: result.message || '删除规则失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete rule');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // ========== 条件匹配 ==========

  /**
   * 获取课程的课节时间
   * POST /api/icalink/v1/course-periods/match
   */
  @Post('/api/icalink/v1/course-periods/match')
  async matchCoursePeriodTime(
    request: FastifyRequest<{
      Body: {
        term_id: number;
        period_no: number;
        course_context: CourseContext;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { term_id, period_no, course_context } = request.body;

      this.logger.debug(
        { term_id, period_no, course_context },
        'Matching course period time'
      );

      const result = await this.coursePeriodService.getCoursePeriodTime(
        term_id,
        period_no,
        course_context
      );

      if (!result.success) {
        const status = result.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
        return reply.status(status).send({
          success: false,
          message: result.message || '获取课节时间失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to match course period time');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 批量获取课程的课节时间
   * POST /api/icalink/v1/course-periods/match/batch
   */
  @Post('/api/icalink/v1/course-periods/match/batch')
  async batchMatchCoursePeriodTimes(
    request: FastifyRequest<{
      Body: {
        term_id: number;
        requests: Array<{ period_no: number; course_context: CourseContext }>;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { term_id, requests } = request.body;

      this.logger.debug(
        { term_id, count: requests.length },
        'Batch matching course period times'
      );

      // 转换参数格式：snake_case -> camelCase
      const serviceRequests = requests.map((req) => ({
        periodNo: req.period_no,
        courseContext: req.course_context
      }));

      const result = await this.coursePeriodService.batchGetCoursePeriodTimes(
        term_id,
        serviceRequests
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.message || '批量获取课节时间失败',
          code: result.code
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to batch match course period times');
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}
