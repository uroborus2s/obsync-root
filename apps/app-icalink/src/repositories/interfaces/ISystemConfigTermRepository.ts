/**
 * 学期配置仓储接口
 * 定义学期配置数据访问的所有方法
 */

import type { Maybe } from '@stratix/utils/functional';
import type { IcalinkSystemConfigTerm } from '../../types/database.js';

/**
 * 学期配置仓储接口
 */
export interface ISystemConfigTermRepository {
  /**
   * 根据学期代码查找学期
   * @param termCode 学期代码
   * @returns 学期实体（可能不存在）
   */
  findByTermCode(termCode: string): Promise<Maybe<IcalinkSystemConfigTerm>>;

  /**
   * 查询所有学期
   * @returns 所有学期列表
   */
  findAll(): Promise<IcalinkSystemConfigTerm[]>;

  /**
   * 查询当前激活的学期
   * @returns 激活的学期（可能不存在）
   */
  findActiveTerm(): Promise<Maybe<IcalinkSystemConfigTerm>>;

  /**
   * 设置激活学期
   * @param termId 学期ID
   * @returns 受影响的行数
   */
  setActiveTerm(termId: number): Promise<number>;

  /**
   * 删除学期
   * @param termId 学期ID
   * @returns 受影响的行数
   */
  deleteTerm(termId: number): Promise<number>;
}

