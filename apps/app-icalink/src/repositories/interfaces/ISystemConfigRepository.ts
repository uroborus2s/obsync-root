/**
 * 系统配置仓储接口
 * 定义系统配置数据访问的所有方法
 */

import type { Maybe } from '@stratix/utils/functional';
import type { IcalinkSystemConfig } from '../../types/database.js';

/**
 * 系统配置仓储接口
 */
export interface ISystemConfigRepository {
  /**
   * 根据配置键查找配置
   * @param configKey 配置键
   * @returns 配置实体（可能不存在）
   */
  findByKey(configKey: string): Promise<Maybe<IcalinkSystemConfig>>;

  /**
   * 根据配置组查找配置列表
   * @param configGroup 配置组
   * @returns 配置列表
   */
  findByGroup(configGroup: string): Promise<IcalinkSystemConfig[]>;

  /**
   * 查询所有配置
   * @returns 所有配置列表
   */
  findAll(): Promise<IcalinkSystemConfig[]>;

  /**
   * 创建或更新配置（Upsert）
   * @param configKey 配置键
   * @param configValue 配置值
   * @param configType 配置类型
   * @param configGroup 配置分组
   * @param description 配置描述
   * @param updatedBy 更新人
   * @returns 受影响的行数
   */
  upsert(
    configKey: string,
    configValue: string,
    configType: string,
    configGroup?: string,
    description?: string,
    updatedBy?: string
  ): Promise<number>;

  /**
   * 删除配置
   * @param configKey 配置键
   * @returns 受影响的行数
   */
  deleteByKey(configKey: string): Promise<number>;

  /**
   * 批量查询配置
   * @param configKeys 配置键列表
   * @returns 配置列表
   */
  findByKeys(configKeys: string[]): Promise<IcalinkSystemConfig[]>;
}
