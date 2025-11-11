/**
 * 规则条件仓储接口
 * 定义规则条件数据访问的所有方法
 */

import type { IcalinkCoursePeriodRuleCondition } from '../../types/database.js';

/**
 * 规则条件仓储接口
 */
export interface ICoursePeriodRuleConditionRepository {
  /**
   * 根据规则ID查询条件列表（按分组编号排序）
   * @param ruleId 规则ID
   * @returns 条件列表
   */
  findByRuleId(ruleId: number): Promise<IcalinkCoursePeriodRuleCondition[]>;

  /**
   * 批量创建条件
   * @param conditions 条件数据列表
   * @returns 创建的条件数量
   */
  batchCreate(
    conditions: Array<
      Omit<IcalinkCoursePeriodRuleCondition, 'id' | 'created_at' | 'updated_at'>
    >
  ): Promise<number>;

  /**
   * 删除规则的所有条件
   * @param ruleId 规则ID
   * @returns 受影响的行数
   */
  deleteByRuleId(ruleId: number): Promise<number>;

  /**
   * 批量删除规则的条件
   * @param ruleIds 规则ID列表
   * @returns 受影响的行数
   */
  deleteByRuleIds(ruleIds: number[]): Promise<number>;
}

