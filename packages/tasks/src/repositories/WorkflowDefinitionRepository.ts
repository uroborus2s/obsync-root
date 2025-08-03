/**
 * 工作流定义仓储
 *
 * 提供工作流定义的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type { QueryOptions } from '../types/common.js';
import type {
  NewWorkflowDefinition,
  WorkflowDefinition,
  WorkflowDefinitionUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 工作流定义仓储接口
 */
export interface IWorkflowDefinitionRepository {
  /**
   * 根据名称和版本查找工作流定义
   * @param name 工作流名称
   * @param version 版本号
   * @returns 工作流定义或null
   */
  findByNameAndVersion(
    name: string,
    version: string
  ): Promise<DatabaseResult<WorkflowDefinition | null>>;

  /**
   * 根据名称查找活跃版本的工作流定义
   * @param name 工作流名称
   * @returns 工作流定义或null
   */
  findActiveByName(
    name: string
  ): Promise<DatabaseResult<WorkflowDefinition | null>>;

  /**
   * 根据名称查找所有版本的工作流定义
   * @param name 工作流名称
   * @param options 查询选项
   * @returns 工作流定义列表
   */
  findAllVersionsByName(
    name: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>>;

  /**
   * 根据分类查找工作流定义
   * @param category 分类
   * @param options 查询选项
   * @returns 工作流定义列表
   */
  findByCategory(
    category: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>>;

  /**
   * 根据标签查找工作流定义
   * @param tags 标签列表
   * @param options 查询选项
   * @returns 工作流定义列表
   */
  findByTags(
    tags: string[],
    options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>>;

  /**
   * 根据状态查找工作流定义
   * @param status 状态
   * @param options 查询选项
   * @returns 工作流定义列表
   */
  findByStatus(
    status: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>>;

  /**
   * 搜索工作流定义
   * @param keyword 关键词
   * @param options 查询选项
   * @returns 工作流定义列表
   */
  search(
    keyword: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>>;

  /**
   * 设置活跃版本
   * @param name 工作流名称
   * @param version 版本号
   * @returns 是否成功
   */
  setActiveVersion(
    name: string,
    version: string
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 获取工作流统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<
    DatabaseResult<{
      totalCount: number;
      activeCount: number;
      draftCount: number;
      deprecatedCount: number;
      archivedCount: number;
      categoryDistribution: Record<string, number>;
    }>
  >;
}

/**
 * 工作流定义仓储实现
 */
export default class WorkflowDefinitionRepository
  extends BaseTasksRepository<
    'workflow_definitions',
    WorkflowDefinition,
    NewWorkflowDefinition,
    WorkflowDefinitionUpdate
  >
  implements IWorkflowDefinitionRepository
{
  protected readonly tableName = 'workflow_definitions' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByNameAndVersion(
    name: string,
    version: string
  ): Promise<DatabaseResult<WorkflowDefinition | null>> {
    return await this.findOneNullable((qb: any) =>
      qb.where('name', name).where('version', version)
    );
  }

  async findActiveByName(
    name: string
  ): Promise<DatabaseResult<WorkflowDefinition | null>> {
    return await this.findOneNullable((qb: any) =>
      qb.where('name', name).where('is_active', true)
    );
  }

  async findAllVersionsByName(
    name: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>> {
    return await this.findMany((qb: any) => qb.where('name', name), {
      orderBy: {
        field: options?.sort?.field || 'version',
        direction: options?.sort?.order || 'desc'
      }
    });
  }

  async findByCategory(
    category: string,
    _options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>> {
    return await this.findMany((qb: any) => qb.where('category', category));
  }

  async findByTags(
    tags: string[],
    _options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>> {
    return await this.findMany((qb: any) => {
      tags.forEach((tag) => {
        qb = qb.whereRaw('JSON_CONTAINS(tags, ?)', [`"${tag}"`]);
      });
      return qb;
    });
  }

  async findByStatus(
    status: string,
    _options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>> {
    return await this.findMany(this.queryByStatus(status));
  }

  async search(
    keyword: string,
    _options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowDefinition[]>> {
    return await this.findMany((qb: any) =>
      qb.where(function (this: any) {
        this.where('name', 'like', `%${keyword}%`)
          .orWhere('description', 'like', `%${keyword}%`)
          .orWhereRaw('JSON_CONTAINS(tags, ?)', [`"${keyword}"`]);
      })
    );
  }

  async setActiveVersion(
    name: string,
    version: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      // 将所有同名工作流设置为非活跃
      await this.updateMany((qb: any) => qb.where('name', name), {
        is_active: false,
        updated_at: new Date()
      } as WorkflowDefinitionUpdate);

      // 设置指定版本为活跃
      const updateResult = await this.updateMany(
        (qb: any) => qb.where('name', name).where('version', version),
        {
          is_active: true,
          status: 'active',
          updated_at: new Date()
        } as WorkflowDefinitionUpdate
      );

      return {
        success: true,
        data: updateResult.success && updateResult.data > 0
      };
    } catch (error) {
      return {
        success: false,
        error: error as any
      };
    }
  }

  async getStatistics(): Promise<
    DatabaseResult<{
      totalCount: number;
      activeCount: number;
      draftCount: number;
      deprecatedCount: number;
      archivedCount: number;
      categoryDistribution: Record<string, number>;
    }>
  > {
    try {
      // 获取总数
      const totalCountResult = await this.count();
      const totalCount = totalCountResult.success ? totalCountResult.data : 0;

      // 简化统计实现
      const activeCountResult = await this.count((qb: any) =>
        qb.where('status', 'active')
      );
      const draftCountResult = await this.count((qb: any) =>
        qb.where('status', 'draft')
      );
      const deprecatedCountResult = await this.count((qb: any) =>
        qb.where('status', 'deprecated')
      );
      const archivedCountResult = await this.count((qb: any) =>
        qb.where('status', 'archived')
      );

      return {
        success: true,
        data: {
          totalCount,
          activeCount: activeCountResult.success ? activeCountResult.data : 0,
          draftCount: draftCountResult.success ? draftCountResult.data : 0,
          deprecatedCount: deprecatedCountResult.success
            ? deprecatedCountResult.data
            : 0,
          archivedCount: archivedCountResult.success
            ? archivedCountResult.data
            : 0,
          categoryDistribution: {} // 简化实现，后续可以扩展
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as any
      };
    }
  }
}
