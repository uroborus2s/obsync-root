import type { Logger } from '@stratix/core';
import { isLeft, isSome } from '@stratix/utils/functional';
import type CoursePeriodRepository from '../repositories/CoursePeriodRepository.js';
import type CoursePeriodRuleConditionRepository from '../repositories/CoursePeriodRuleConditionRepository.js';
import type CoursePeriodRuleRepository from '../repositories/CoursePeriodRuleRepository.js';
import type SystemConfigTermRepository from '../repositories/SystemConfigTermRepository.js';
import type {
  IcalinkCoursePeriod,
  IcalinkCoursePeriodRule,
  IcalinkCoursePeriodRuleCondition,
  IcalinkSystemConfigTerm
} from '../types/database.js';
import { ServiceErrorCode, type ServiceResult } from '../types/service.js';
import type {
  CourseContext,
  CoursePeriodRuleWithConditions,
  CoursePeriodWithRules,
  ICoursePeriodService,
  PeriodTimeResult
} from './interfaces/ICoursePeriodService.js';

/**
 * 课程时间配置服务实现
 * 负责课程时间配置的业务逻辑处理
 */
export default class CoursePeriodService implements ICoursePeriodService {
  constructor(
    private readonly logger: Logger,
    private readonly systemConfigTermRepository: SystemConfigTermRepository,
    private readonly coursePeriodRepository: CoursePeriodRepository,
    private readonly coursePeriodRuleRepository: CoursePeriodRuleRepository,
    private readonly coursePeriodRuleConditionRepository: CoursePeriodRuleConditionRepository
  ) {
    this.logger.info('✅ CoursePeriodService initialized');
  }

  // ========== 学期管理 ==========

  public async getAllTerms(): Promise<
    ServiceResult<IcalinkSystemConfigTerm[]>
  > {
    try {
      this.logger.debug('Getting all terms');

      const terms = await this.systemConfigTermRepository.findAll();

      return {
        success: true,
        data: terms
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get all terms');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取学期列表失败'
      };
    }
  }

  public async getActiveTerm(): Promise<
    ServiceResult<IcalinkSystemConfigTerm | null>
  > {
    try {
      this.logger.debug('Getting active term');

      const term = await this.systemConfigTermRepository.findActiveTerm();

      return {
        success: true,
        data: isSome(term) ? term.value : null
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get active term');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取当前学期失败'
      };
    }
  }

  public async createTerm(
    data: Omit<IcalinkSystemConfigTerm, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResult<IcalinkSystemConfigTerm>> {
    try {
      this.logger.debug({ data }, 'Creating term');

      // 检查学期代码是否已存在
      const existing = await this.systemConfigTermRepository.findByTermCode(
        data.term_code
      );
      if (isSome(existing)) {
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '学期代码已存在'
        };
      }

      const result = await this.systemConfigTermRepository.create(data as any);

      if (isLeft(result)) {
        this.logger.error({ error: result.left }, 'Failed to create term');
        return {
          success: false,
          code: ServiceErrorCode.INTERNAL_ERROR,
          message: '创建学期失败'
        };
      }

      return {
        success: true,
        data: result.right
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to create term');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '创建学期失败'
      };
    }
  }

  public async updateTerm(
    termId: number,
    data: Partial<
      Omit<IcalinkSystemConfigTerm, 'id' | 'created_at' | 'updated_at'>
    >
  ): Promise<ServiceResult<IcalinkSystemConfigTerm>> {
    try {
      this.logger.debug({ termId, data }, 'Updating term');

      const result = await this.systemConfigTermRepository.update(
        termId,
        data as any
      );

      if (isLeft(result)) {
        this.logger.error({ error: result.left }, 'Failed to update term');
        return {
          success: false,
          code: ServiceErrorCode.INTERNAL_ERROR,
          message: '更新学期失败'
        };
      }

      return {
        success: true,
        data: result.right
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to update term');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '更新学期失败'
      };
    }
  }

  public async deleteTerm(termId: number): Promise<ServiceResult<void>> {
    try {
      this.logger.debug({ termId }, 'Deleting term');

      const affectedRows =
        await this.systemConfigTermRepository.deleteTerm(termId);

      if (affectedRows === 0) {
        return {
          success: false,
          code: ServiceErrorCode.RESOURCE_NOT_FOUND,
          message: '学期不存在'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete term');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '删除学期失败'
      };
    }
  }

  public async setActiveTerm(termId: number): Promise<ServiceResult<void>> {
    try {
      this.logger.debug({ termId }, 'Setting active term');

      const affectedRows =
        await this.systemConfigTermRepository.setActiveTerm(termId);

      if (affectedRows === 0) {
        return {
          success: false,
          code: ServiceErrorCode.RESOURCE_NOT_FOUND,
          message: '学期不存在'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to set active term');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '设置当前学期失败'
      };
    }
  }

  // ========== 课节管理 ==========

  public async getPeriodsByTerm(
    termId: number
  ): Promise<ServiceResult<IcalinkCoursePeriod[]>> {
    try {
      this.logger.debug({ termId }, 'Getting periods by term');

      const periods = await this.coursePeriodRepository.findByTermId(termId);

      return {
        success: true,
        data: periods
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get periods by term');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取课节列表失败'
      };
    }
  }

  public async getPeriodsWithRules(
    termId: number
  ): Promise<ServiceResult<CoursePeriodWithRules[]>> {
    try {
      this.logger.debug({ termId }, 'Getting periods with rules');

      const periods = await this.coursePeriodRepository.findByTermId(termId);

      const periodsWithRules: CoursePeriodWithRules[] = await Promise.all(
        periods.map(async (period) => {
          const rules = await this.coursePeriodRuleRepository.findByPeriodId(
            period.id
          );

          const rulesWithConditions: CoursePeriodRuleWithConditions[] =
            await Promise.all(
              rules.map(async (rule) => {
                const conditions =
                  await this.coursePeriodRuleConditionRepository.findByRuleId(
                    rule.id
                  );
                return { rule, conditions };
              })
            );

          return { period, rules: rulesWithConditions };
        })
      );

      return {
        success: true,
        data: periodsWithRules
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get periods with rules');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取课节及规则失败'
      };
    }
  }

  public async createPeriod(
    data: Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResult<IcalinkCoursePeriod>> {
    try {
      this.logger.debug({ data }, 'Creating period');

      const result = await this.coursePeriodRepository.create(data as any);

      if (isLeft(result)) {
        this.logger.error({ error: result.left }, 'Failed to create period');
        return {
          success: false,
          code: ServiceErrorCode.INTERNAL_ERROR,
          message: '创建课节失败'
        };
      }

      return {
        success: true,
        data: result.right
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to create period');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '创建课节失败'
      };
    }
  }

  public async updatePeriod(
    periodId: number,
    data: Partial<Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ServiceResult<IcalinkCoursePeriod>> {
    try {
      this.logger.debug({ periodId, data }, 'Updating period');

      const result = await this.coursePeriodRepository.update(
        periodId,
        data as any
      );

      if (isLeft(result)) {
        this.logger.error({ error: result.left }, 'Failed to update period');
        return {
          success: false,
          code: ServiceErrorCode.INTERNAL_ERROR,
          message: '更新课节失败'
        };
      }

      return {
        success: true,
        data: result.right
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to update period');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '更新课节失败'
      };
    }
  }

  public async deletePeriod(periodId: number): Promise<ServiceResult<void>> {
    try {
      this.logger.debug({ periodId }, 'Deleting period');

      const result = await this.coursePeriodRepository.delete(periodId);

      if (isLeft(result)) {
        this.logger.error({ error: result.left }, 'Failed to delete period');
        return {
          success: false,
          code: ServiceErrorCode.INTERNAL_ERROR,
          message: '删除课节失败'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete period');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '删除课节失败'
      };
    }
  }

  public async batchCreatePeriods(
    periods: Array<
      Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>
    >
  ): Promise<ServiceResult<number>> {
    try {
      this.logger.debug({ count: periods.length }, 'Batch creating periods');

      const affectedRows =
        await this.coursePeriodRepository.batchCreate(periods);

      return {
        success: true,
        data: affectedRows
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to batch create periods');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '批量创建课节失败'
      };
    }
  }

  public async copyPeriodsToTerm(
    sourceTermId: number,
    targetTermId: number
  ): Promise<ServiceResult<number>> {
    try {
      this.logger.debug(
        { sourceTermId, targetTermId },
        'Copying periods to term'
      );

      const affectedRows = await this.coursePeriodRepository.copyToTerm(
        sourceTermId,
        targetTermId
      );

      return {
        success: true,
        data: affectedRows
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to copy periods to term');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '复制课节失败'
      };
    }
  }

  // ========== 规则管理 ==========

  public async getRulesByPeriod(
    periodId: number
  ): Promise<ServiceResult<CoursePeriodRuleWithConditions[]>> {
    try {
      this.logger.debug({ periodId }, 'Getting rules by period');

      const rules =
        await this.coursePeriodRuleRepository.findByPeriodId(periodId);

      const rulesWithConditions: CoursePeriodRuleWithConditions[] =
        await Promise.all(
          rules.map(async (rule) => {
            const conditions =
              await this.coursePeriodRuleConditionRepository.findByRuleId(
                rule.id
              );
            return { rule, conditions };
          })
        );

      return {
        success: true,
        data: rulesWithConditions
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get rules by period');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取规则列表失败'
      };
    }
  }

  public async createRule(
    ruleData: Omit<IcalinkCoursePeriodRule, 'id' | 'created_at' | 'updated_at'>,
    conditions: Array<
      Omit<
        IcalinkCoursePeriodRuleCondition,
        'id' | 'rule_id' | 'created_at' | 'updated_at'
      >
    >
  ): Promise<ServiceResult<CoursePeriodRuleWithConditions>> {
    try {
      this.logger.debug({ ruleData, conditions }, 'Creating rule');

      // 1. 创建规则
      const ruleResult = await this.coursePeriodRuleRepository.create(
        ruleData as any
      );

      if (isLeft(ruleResult)) {
        this.logger.error({ error: ruleResult.left }, 'Failed to create rule');
        return {
          success: false,
          code: ServiceErrorCode.INTERNAL_ERROR,
          message: '创建规则失败'
        };
      }

      const rule = ruleResult.right;

      // 2. 创建条件
      if (conditions.length > 0) {
        const conditionsWithRuleId = conditions.map((cond) => ({
          ...cond,
          rule_id: rule.id
        }));

        await this.coursePeriodRuleConditionRepository.batchCreate(
          conditionsWithRuleId
        );
      }

      // 3. 查询完整的规则和条件
      const createdConditions =
        await this.coursePeriodRuleConditionRepository.findByRuleId(rule.id);

      return {
        success: true,
        data: { rule, conditions: createdConditions }
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to create rule');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '创建规则失败'
      };
    }
  }

  public async updateRule(
    ruleId: number,
    ruleData: Partial<
      Omit<IcalinkCoursePeriodRule, 'id' | 'created_at' | 'updated_at'>
    >,
    conditions: Array<
      Omit<
        IcalinkCoursePeriodRuleCondition,
        'id' | 'rule_id' | 'created_at' | 'updated_at'
      >
    >
  ): Promise<ServiceResult<CoursePeriodRuleWithConditions>> {
    try {
      this.logger.debug({ ruleId, ruleData, conditions }, 'Updating rule');

      // 1. 更新规则
      const ruleResult = await this.coursePeriodRuleRepository.update(
        ruleId,
        ruleData as any
      );

      if (isLeft(ruleResult)) {
        this.logger.error({ error: ruleResult.left }, 'Failed to update rule');
        return {
          success: false,
          code: ServiceErrorCode.INTERNAL_ERROR,
          message: '更新规则失败'
        };
      }

      const rule = ruleResult.right;

      // 2. 删除旧条件
      await this.coursePeriodRuleConditionRepository.deleteByRuleId(ruleId);

      // 3. 创建新条件
      if (conditions.length > 0) {
        const conditionsWithRuleId = conditions.map((cond) => ({
          ...cond,
          rule_id: ruleId
        }));

        await this.coursePeriodRuleConditionRepository.batchCreate(
          conditionsWithRuleId
        );
      }

      // 4. 查询完整的规则和条件
      const updatedConditions =
        await this.coursePeriodRuleConditionRepository.findByRuleId(ruleId);

      return {
        success: true,
        data: { rule, conditions: updatedConditions }
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to update rule');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '更新规则失败'
      };
    }
  }

  public async deleteRule(ruleId: number): Promise<ServiceResult<void>> {
    try {
      this.logger.debug({ ruleId }, 'Deleting rule');

      // 1. 删除条件
      await this.coursePeriodRuleConditionRepository.deleteByRuleId(ruleId);

      // 2. 删除规则
      const affectedRows =
        await this.coursePeriodRuleRepository.deleteRule(ruleId);

      if (affectedRows === 0) {
        return {
          success: false,
          code: ServiceErrorCode.RESOURCE_NOT_FOUND,
          message: '规则不存在'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete rule');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '删除规则失败'
      };
    }
  }

  // ========== 条件匹配 ==========

  /**
   * 检查单个条件是否匹配
   */
  private checkCondition(
    condition: IcalinkCoursePeriodRuleCondition,
    context: CourseContext
  ): boolean {
    const { dimension, operator, value_json } = condition;
    const contextValue = context[dimension];

    // 如果上下文中没有该维度的值，则不匹配
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    switch (operator) {
      case '=':
        return contextValue === value_json;

      case '!=':
        return contextValue !== value_json;

      case 'in':
        return Array.isArray(value_json) && value_json.includes(contextValue);

      case 'not_in':
        return Array.isArray(value_json) && !value_json.includes(contextValue);

      case '>':
        return Number(contextValue) > Number(value_json);

      case '>=':
        return Number(contextValue) >= Number(value_json);

      case '<':
        return Number(contextValue) < Number(value_json);

      case '<=':
        return Number(contextValue) <= Number(value_json);

      case 'between':
        if (Array.isArray(value_json) && value_json.length === 2) {
          const numValue = Number(contextValue);
          return (
            numValue >= Number(value_json[0]) &&
            numValue <= Number(value_json[1])
          );
        }
        return false;

      default:
        this.logger.warn({ operator }, 'Unknown operator');
        return false;
    }
  }

  /**
   * 检查规则是否匹配
   */
  private checkRuleMatch(
    rule: IcalinkCoursePeriodRule,
    conditions: IcalinkCoursePeriodRuleCondition[],
    context: CourseContext
  ): boolean {
    // 1. 检查规则是否启用
    if (!rule.enabled) {
      return false;
    }

    // 2. 检查生效日期
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    if (rule.effective_start_date && today < rule.effective_start_date) {
      return false;
    }

    if (rule.effective_end_date && today > rule.effective_end_date) {
      return false;
    }

    // 3. 如果没有条件，则匹配
    if (conditions.length === 0) {
      return true;
    }

    // 4. 按条件组分组
    const conditionGroups = new Map<
      number,
      IcalinkCoursePeriodRuleCondition[]
    >();
    for (const condition of conditions) {
      const group = conditionGroups.get(condition.group_no) || [];
      group.push(condition);
      conditionGroups.set(condition.group_no, group);
    }

    // 5. 检查每个条件组（组间是 OR 关系）
    for (const [, groupConditions] of conditionGroups) {
      // 获取组内连接符（默认 AND）
      const connector = groupConditions[0]?.group_connector || 'AND';

      if (connector === 'AND') {
        // 组内所有条件都必须满足
        const allMatch = groupConditions.every((cond) =>
          this.checkCondition(cond, context)
        );
        if (allMatch) {
          return true; // 有一个组匹配即可
        }
      } else {
        // 组内任一条件满足即可
        const anyMatch = groupConditions.some((cond) =>
          this.checkCondition(cond, context)
        );
        if (anyMatch) {
          return true; // 有一个组匹配即可
        }
      }
    }

    return false;
  }

  public async getCoursePeriodTime(
    termId: number,
    periodNo: number,
    courseContext: CourseContext
  ): Promise<ServiceResult<PeriodTimeResult>> {
    try {
      this.logger.debug(
        { termId, periodNo, courseContext },
        'Getting course period time'
      );

      // 1. 查询课节
      const periods = await this.coursePeriodRepository.findByTermIdAndPeriodNo(
        termId,
        periodNo
      );

      if (periods.length === 0) {
        return {
          success: false,
          code: ServiceErrorCode.RESOURCE_NOT_FOUND,
          message: '课节不存在'
        };
      }

      const period = periods[0]; // 取第一个

      // 2. 查询启用的规则（按优先级排序）
      const rules = await this.coursePeriodRuleRepository.findEnabledByPeriodId(
        period.id
      );

      // 3. 遍历规则，找到第一个匹配的规则
      for (const rule of rules) {
        const conditions =
          await this.coursePeriodRuleConditionRepository.findByRuleId(rule.id);

        if (this.checkRuleMatch(rule, conditions, courseContext)) {
          // 找到匹配的规则
          return {
            success: true,
            data: {
              start_time: rule.start_time,
              end_time: rule.end_time,
              matched_rule: rule
            }
          };
        }
      }

      // 4. 没有匹配的规则，使用默认时间
      return {
        success: true,
        data: {
          start_time: period.default_start_time,
          end_time: period.default_end_time
        }
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get course period time');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取课节时间失败'
      };
    }
  }

  public async batchGetCoursePeriodTimes(
    termId: number,
    requests: Array<{ periodNo: number; courseContext: CourseContext }>
  ): Promise<ServiceResult<PeriodTimeResult[]>> {
    try {
      this.logger.debug(
        { termId, count: requests.length },
        'Batch getting course period times'
      );

      const results = await Promise.all(
        requests.map(async (req) => {
          const result = await this.getCoursePeriodTime(
            termId,
            req.periodNo,
            req.courseContext
          );
          return result.data!;
        })
      );

      return {
        success: true,
        data: results
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to batch get course period times');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '批量获取课节时间失败'
      };
    }
  }
}
