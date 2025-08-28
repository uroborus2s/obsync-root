// @wps/app-icalink 系统配置仓储接口
// 基于 Stratix 框架的仓储接口定义

import { BaseRepository } from '@stratix/database';
import type { 
  IcalinkSystemConfig, 
  IcalinkDatabase, 
  ConfigType 
} from '../../types/database.js';
import type { 
  ServiceResult, 
  PaginatedResult, 
  QueryOptions 
} from '../../types/service.js';

/**
 * 系统配置查询条件
 */
export interface SystemConfigQueryConditions {
  config_group?: string;
  config_type?: ConfigType;
  is_system?: boolean;
  is_encrypted?: boolean;
}

/**
 * 系统配置创建数据
 */
export interface CreateSystemConfigData {
  config_key: string;
  config_value?: string;
  config_type?: ConfigType;
  config_group?: string;
  description?: string;
  is_system?: boolean;
  is_encrypted?: boolean;
  created_by?: string;
}

/**
 * 系统配置更新数据
 */
export interface UpdateSystemConfigData {
  config_value?: string;
  config_type?: ConfigType;
  config_group?: string;
  description?: string;
  is_system?: boolean;
  is_encrypted?: boolean;
  updated_by?: string;
}

/**
 * 系统配置仓储接口
 * 继承基础仓储接口，提供系统配置相关的数据访问方法
 */
export interface ISystemConfigRepository extends InstanceType<typeof BaseRepository<
  IcalinkDatabase,
  'icalink_system_configs',
  IcalinkSystemConfig,
  CreateSystemConfigData,
  UpdateSystemConfigData
>> {
  /**
   * 根据配置键查找配置
   * @param configKey 配置键
   * @returns 配置或null
   */
  findByKey(
    configKey: string
  ): Promise<ServiceResult<IcalinkSystemConfig | null>>;

  /**
   * 根据配置组查找配置
   * @param configGroup 配置组
   * @param options 查询选项
   * @returns 配置列表
   */
  findByGroup(
    configGroup: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkSystemConfig[]>>;

  /**
   * 根据配置类型查找配置
   * @param configType 配置类型
   * @param options 查询选项
   * @returns 配置列表
   */
  findByType(
    configType: ConfigType,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkSystemConfig[]>>;

  /**
   * 根据条件查询配置
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 配置列表
   */
  findByConditions(
    conditions: SystemConfigQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkSystemConfig[]>>;

  /**
   * 分页查询配置
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的配置列表
   */
  findByConditionsPaginated(
    conditions: SystemConfigQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<IcalinkSystemConfig>>>;

  /**
   * 获取配置值
   * @param configKey 配置键
   * @param defaultValue 默认值
   * @returns 配置值
   */
  getValue<T = string>(
    configKey: string,
    defaultValue?: T
  ): Promise<ServiceResult<T>>;

  /**
   * 设置配置值
   * @param configKey 配置键
   * @param configValue 配置值
   * @param configType 配置类型（可选）
   * @param updatedBy 更新人
   * @returns 是否设置成功
   */
  setValue(
    configKey: string,
    configValue: any,
    configType?: ConfigType,
    updatedBy?: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 批量设置配置值
   * @param configs 配置数组
   * @param updatedBy 更新人
   * @returns 设置成功的数量
   */
  setValues(
    configs: Array<{
      key: string;
      value: any;
      type?: ConfigType;
      group?: string;
      description?: string;
    }>,
    updatedBy?: string
  ): Promise<ServiceResult<number>>;

  /**
   * 删除配置
   * @param configKey 配置键
   * @returns 是否删除成功
   */
  deleteByKey(
    configKey: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 批量删除配置
   * @param configKeys 配置键数组
   * @returns 删除的数量
   */
  deleteByKeys(
    configKeys: string[]
  ): Promise<ServiceResult<number>>;

  /**
   * 检查配置是否存在
   * @param configKey 配置键
   * @returns 是否存在
   */
  existsByKey(
    configKey: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取所有配置组
   * @returns 配置组列表
   */
  getAllGroups(): Promise<ServiceResult<string[]>>;

  /**
   * 获取系统配置
   * @param options 查询选项
   * @returns 系统配置列表
   */
  getSystemConfigs(
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkSystemConfig[]>>;

  /**
   * 获取用户配置
   * @param options 查询选项
   * @returns 用户配置列表
   */
  getUserConfigs(
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkSystemConfig[]>>;

  /**
   * 获取加密配置
   * @param options 查询选项
   * @returns 加密配置列表
   */
  getEncryptedConfigs(
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkSystemConfig[]>>;

  /**
   * 导出配置
   * @param configGroup 配置组（可选）
   * @param includeSystem 是否包含系统配置
   * @param includeEncrypted 是否包含加密配置
   * @returns 配置数据
   */
  exportConfigs(
    configGroup?: string,
    includeSystem?: boolean,
    includeEncrypted?: boolean
  ): Promise<ServiceResult<Record<string, any>>>;

  /**
   * 导入配置
   * @param configs 配置数据
   * @param overwrite 是否覆盖现有配置
   * @param updatedBy 更新人
   * @returns 导入成功的数量
   */
  importConfigs(
    configs: Record<string, any>,
    overwrite?: boolean,
    updatedBy?: string
  ): Promise<ServiceResult<number>>;

  /**
   * 重置配置组
   * @param configGroup 配置组
   * @param defaultConfigs 默认配置
   * @param updatedBy 更新人
   * @returns 重置的数量
   */
  resetGroup(
    configGroup: string,
    defaultConfigs?: Record<string, any>,
    updatedBy?: string
  ): Promise<ServiceResult<number>>;

  /**
   * 验证配置值
   * @param configKey 配置键
   * @param configValue 配置值
   * @param configType 配置类型
   * @returns 验证结果
   */
  validateValue(
    configKey: string,
    configValue: any,
    configType: ConfigType
  ): Promise<ServiceResult<{
    isValid: boolean;
    error?: string;
    normalizedValue?: any;
  }>>;

  /**
   * 获取配置历史（如果有审计表）
   * @param configKey 配置键
   * @param limit 记录数量限制
   * @returns 配置历史列表
   */
  getConfigHistory(
    configKey: string,
    limit?: number
  ): Promise<ServiceResult<Array<{
    config_value: any;
    updated_at: Date;
    updated_by?: string;
  }>>>;

  /**
   * 搜索配置
   * @param keyword 关键词
   * @param searchFields 搜索字段
   * @param options 查询选项
   * @returns 匹配的配置列表
   */
  searchConfigs(
    keyword: string,
    searchFields?: ('config_key' | 'description' | 'config_value')[],
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkSystemConfig[]>>;

  /**
   * 获取配置统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<ServiceResult<{
    total_count: number;
    system_count: number;
    user_count: number;
    encrypted_count: number;
    group_distribution: Record<string, number>;
    type_distribution: Record<ConfigType, number>;
  }>>;
}
