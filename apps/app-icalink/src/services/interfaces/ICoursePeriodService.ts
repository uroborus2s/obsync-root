/**
 * 课程时间配置服务接口
 * 定义课程时间配置相关的所有业务方法
 */

import type {
  IcalinkSystemConfigTerm,
  IcalinkCoursePeriod,
  IcalinkCoursePeriodRule,
  IcalinkCoursePeriodRuleCondition
} from '../../types/database.js';
import type { ServiceResult } from '../../types/service.js';

/**
 * 课节规则及其条件
 */
export interface CoursePeriodRuleWithConditions {
  rule: IcalinkCoursePeriodRule;
  conditions: IcalinkCoursePeriodRuleCondition[];
}

/**
 * 课节及其规则
 */
export interface CoursePeriodWithRules {
  period: IcalinkCoursePeriod;
  rules: CoursePeriodRuleWithConditions[];
}

/**
 * 课程上下文（用于条件匹配）
 */
export interface CourseContext {
  school_id?: string;
  school_name?: string;
  major_id?: string;
  major_name?: string;
  class_id?: string;
  class_name?: string;
  grade?: number;
  course_unit_id?: string;
  course_unit?: string;
  class_location?: string;
  teaching_week?: number;
  week_day?: number;
  time_period?: string;
  [key: string]: any; // 允许其他自定义字段
}

/**
 * 课节时间结果
 */
export interface PeriodTimeResult {
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  matched_rule?: IcalinkCoursePeriodRule; // 匹配的规则（如果有）
}

/**
 * 课程时间配置服务接口
 */
export interface ICoursePeriodService {
  // ========== 学期管理 ==========

  /**
   * 获取所有学期
   */
  getAllTerms(): Promise<ServiceResult<IcalinkSystemConfigTerm[]>>;

  /**
   * 获取当前激活学期
   */
  getActiveTerm(): Promise<ServiceResult<IcalinkSystemConfigTerm | null>>;

  /**
   * 创建学期
   */
  createTerm(
    data: Omit<IcalinkSystemConfigTerm, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResult<IcalinkSystemConfigTerm>>;

  /**
   * 更新学期
   */
  updateTerm(
    termId: number,
    data: Partial<Omit<IcalinkSystemConfigTerm, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ServiceResult<IcalinkSystemConfigTerm>>;

  /**
   * 删除学期
   */
  deleteTerm(termId: number): Promise<ServiceResult<void>>;

  /**
   * 设置激活学期
   */
  setActiveTerm(termId: number): Promise<ServiceResult<void>>;

  // ========== 课节管理 ==========

  /**
   * 根据学期ID获取课节列表
   */
  getPeriodsByTerm(termId: number): Promise<ServiceResult<IcalinkCoursePeriod[]>>;

  /**
   * 根据学期ID获取课节及其规则
   */
  getPeriodsWithRules(termId: number): Promise<ServiceResult<CoursePeriodWithRules[]>>;

  /**
   * 创建课节
   */
  createPeriod(
    data: Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResult<IcalinkCoursePeriod>>;

  /**
   * 更新课节
   */
  updatePeriod(
    periodId: number,
    data: Partial<Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ServiceResult<IcalinkCoursePeriod>>;

  /**
   * 删除课节
   */
  deletePeriod(periodId: number): Promise<ServiceResult<void>>;

  /**
   * 批量创建课节
   */
  batchCreatePeriods(
    periods: Array<Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ServiceResult<number>>;

  /**
   * 复制课节到另一个学期
   */
  copyPeriodsToTerm(
    sourceTermId: number,
    targetTermId: number
  ): Promise<ServiceResult<number>>;

  // ========== 规则管理 ==========

  /**
   * 根据课节ID获取规则列表
   */
  getRulesByPeriod(periodId: number): Promise<ServiceResult<CoursePeriodRuleWithConditions[]>>;

  /**
   * 创建规则（包含条件）
   */
  createRule(
    ruleData: Omit<IcalinkCoursePeriodRule, 'id' | 'created_at' | 'updated_at'>,
    conditions: Array<Omit<IcalinkCoursePeriodRuleCondition, 'id' | 'rule_id' | 'created_at' | 'updated_at'>>
  ): Promise<ServiceResult<CoursePeriodRuleWithConditions>>;

  /**
   * 更新规则（包含条件）
   */
  updateRule(
    ruleId: number,
    ruleData: Partial<Omit<IcalinkCoursePeriodRule, 'id' | 'created_at' | 'updated_at'>>,
    conditions: Array<Omit<IcalinkCoursePeriodRuleCondition, 'id' | 'rule_id' | 'created_at' | 'updated_at'>>
  ): Promise<ServiceResult<CoursePeriodRuleWithConditions>>;

  /**
   * 删除规则
   */
  deleteRule(ruleId: number): Promise<ServiceResult<void>>;

  // ========== 条件匹配 ==========

  /**
   * 获取课程的课节时间（核心方法）
   * 根据课程上下文匹配规则，返回对应的时间
   */
  getCoursePeriodTime(
    termId: number,
    periodNo: number,
    courseContext: CourseContext
  ): Promise<ServiceResult<PeriodTimeResult>>;

  /**
   * 批量获取课程的课节时间
   */
  batchGetCoursePeriodTimes(
    termId: number,
    requests: Array<{ periodNo: number; courseContext: CourseContext }>
  ): Promise<ServiceResult<PeriodTimeResult[]>>;
}

