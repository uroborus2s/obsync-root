/**
 * 课节配置仓储接口
 * 定义课节配置数据访问的所有方法
 */

import type { IcalinkCoursePeriod } from '../../types/database.js';

/**
 * 课节配置仓储接口
 */
export interface ICoursePeriodRepository {
  /**
   * 根据学期ID查询课节列表
   * @param termId 学期ID
   * @returns 课节列表
   */
  findByTermId(termId: number): Promise<IcalinkCoursePeriod[]>;

  /**
   * 根据学期ID和节次编号查询课节
   * @param termId 学期ID
   * @param periodNo 节次编号
   * @returns 课节列表（可能有多个相同节次的配置）
   */
  findByTermIdAndPeriodNo(
    termId: number,
    periodNo: number
  ): Promise<IcalinkCoursePeriod[]>;

  /**
   * 批量创建课节
   * @param periods 课节数据列表
   * @returns 创建的课节数量
   */
  batchCreate(
    periods: Array<Omit<IcalinkCoursePeriod, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<number>;

  /**
   * 删除学期的所有课节
   * @param termId 学期ID
   * @returns 受影响的行数
   */
  deleteByTermId(termId: number): Promise<number>;

  /**
   * 复制课节到另一个学期
   * @param sourceTermId 源学期ID
   * @param targetTermId 目标学期ID
   * @returns 复制的课节数量
   */
  copyToTerm(sourceTermId: number, targetTermId: number): Promise<number>;
}

