/**
 * 课节规则仓储接口
 * 定义课节规则数据访问的所有方法
 */

import type { IcalinkCoursePeriodRule } from '../../types/database.js';

/**
 * 课节规则仓储接口
 */
export interface ICoursePeriodRuleRepository {
  /**
   * 根据课节ID查询规则列表（按优先级排序）
   * @param periodId 课节ID
   * @returns 规则列表
   */
  findByPeriodId(periodId: number): Promise<IcalinkCoursePeriodRule[]>;

  /**
   * 根据课节ID查询启用的规则列表（按优先级排序）
   * @param periodId 课节ID
   * @returns 启用的规则列表
   */
  findEnabledByPeriodId(periodId: number): Promise<IcalinkCoursePeriodRule[]>;

  /**
   * 删除规则
   * @param ruleId 规则ID
   * @returns 受影响的行数
   */
  deleteRule(ruleId: number): Promise<number>;

  /**
   * 删除课节的所有规则
   * @param periodId 课节ID
   * @returns 受影响的行数
   */
  deleteByPeriodId(periodId: number): Promise<number>;
}

