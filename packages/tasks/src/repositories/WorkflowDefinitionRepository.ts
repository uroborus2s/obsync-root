/**
 * 工作流定义仓储实现
 *
 * 继承BaseRepository，实现工作流定义的数据访问
 * 版本: v3.0.0-refactored
 */

import type { Logger } from '@stratix/core';
import type {
  DatabaseAPI,
  DatabaseResult,
  PaginationOptions
} from '@stratix/database';
import { DatabaseErrorHandler, QueryError } from '@stratix/database';
import type { IWorkflowDefinitionRepository } from '../interfaces/repositories.js';
import type {
  NewWorkflowDefinitionTable,
  WorkflowDefinitionTable,
  WorkflowDefinitionTableUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 工作流定义仓储实现
 */
export default class WorkflowDefinitionRepository
  extends BaseTasksRepository<
    'workflow_definitions',
    WorkflowDefinitionTable,
    NewWorkflowDefinitionTable,
    WorkflowDefinitionTableUpdate
  >
  implements IWorkflowDefinitionRepository
{
  protected readonly tableName = 'workflow_definitions' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
  }

  /**
   * 实现接口要求的findById方法 - 使用组合模式避免类型冲突
   */
  async findById(
    id: number
  ): Promise<DatabaseResult<WorkflowDefinitionTable | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await super.findById(id);
      if (!result.success) {
        throw QueryError.create(`Failed to find workflow definition: ${id}`);
      }

      return this.convertOptionToNull(result.data);
    }, 'findById');
  }

  /**
   * 类型转换工具方法：Option<T> -> T | null
   */
  private convertOptionToNull<T>(optionData: any): T | null {
    if (optionData && typeof optionData === 'object' && 'some' in optionData) {
      return optionData.some ? optionData.value : null;
    }
    return optionData as T | null;
  }

  /**
   * 根据名称和版本查找工作流定义
   */
  async findByNameAndVersion(
    name: string,
    version: string
  ): Promise<DatabaseResult<WorkflowDefinitionTable>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb.where('name', '=', name).where('version', '=', version);

      const result = await this.findOneNullable(whereExpression);
      if (!result.success || !result.data) {
        throw QueryError.create(
          `Workflow definition not found: ${name}@${version}`
        );
      }

      return result.data;
    }, 'findByNameAndVersion');
  }

  /**
   * 查找活跃的工作流定义
   */
  async findActiveByName(
    name: string
  ): Promise<DatabaseResult<WorkflowDefinitionTable>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb
          .where('name', '=', name)
          .where('is_active', '=', true)
          .where('status', '=', 'active');

      const result = await this.findOneNullable(whereExpression);
      if (!result.success || !result.data) {
        throw QueryError.create(
          `Active workflow definition not found: ${name}`
        );
      }

      return result.data;
    }, 'findActiveByName');
  }

  /**
   * 实现接口要求的findMany方法 - 委托给业务方法避免类型冲突
   */
  async findMany(
    filters?: {
      status?: string;
      category?: string;
      isActive?: boolean;
    },
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<WorkflowDefinitionTable[]>> {
    return this.findManyWithFilters(filters, pagination);
  }

  /**
   * 查询工作流定义列表
   */
  async findManyWithFilters(
    filters?: {
      status?: string;
      category?: string;
      isActive?: boolean;
    },
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<WorkflowDefinitionTable[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) => {
        if (filters?.status) {
          qb = qb.where('status', '=', filters.status);
        }
        if (filters?.category) {
          qb = qb.where('category', '=', filters.category);
        }
        if (filters?.isActive !== undefined) {
          qb = qb.where('is_active', '=', filters.isActive);
        }
        return qb;
      };

      const options = {
        orderBy: [{ field: 'created_at', direction: 'desc' as const }],
        ...(pagination && {
          limit: pagination.pageSize,
          offset: (pagination.page - 1) * pagination.pageSize
        })
      };

      const result = await super.findMany(whereExpression, options);
      if (!result.success) {
        throw QueryError.create('Failed to find workflow definitions');
      }

      return result.data;
    }, 'findMany');
  }

  /**
   * 创建工作流定义
   */
  async create(
    definition: NewWorkflowDefinitionTable
  ): Promise<DatabaseResult<WorkflowDefinitionTable>> {
    return await DatabaseErrorHandler.execute(async () => {
      // 检查名称和版本是否已存在
      const existingResult = await this.findByNameAndVersion(
        definition.name,
        definition.version
      );
      if (existingResult.success) {
        throw QueryError.create(
          `Workflow definition already exists: ${definition.name}@${definition.version}`
        );
      }

      // 如果设置为活跃版本，需要先将同名的其他版本设置为非活跃
      if (definition.is_active) {
        const whereExpression = (qb: any) =>
          qb.where('name', '=', definition.name).where('is_active', '=', true);

        await this.updateMany(whereExpression, { is_active: false });
      }

      const result = await super.create(definition);
      if (!result.success) {
        throw QueryError.create('Failed to create workflow definition');
      }

      return result.data;
    }, 'create');
  }

  /**
   * 实现接口要求的update方法 - 委托给业务方法避免类型冲突
   */
  async update(
    id: number,
    updates: WorkflowDefinitionTableUpdate
  ): Promise<DatabaseResult<WorkflowDefinitionTable | null>> {
    return this.updateWorkflowDefinition(id, updates);
  }

  /**
   * 更新工作流定义
   */
  async updateWorkflowDefinition(
    id: number,
    updates: WorkflowDefinitionTableUpdate
  ): Promise<DatabaseResult<WorkflowDefinitionTable | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      // 如果设置为活跃版本，需要先将同名的其他版本设置为非活跃
      if (updates.is_active) {
        const current = await this.findById(id);
        if (current.success && current.data) {
          const currentData = current.data;
          const whereExpression = (qb: any) =>
            qb
              .where('name', '=', currentData.name)
              .where('is_active', '=', true)
              .where('id', '!=', id);

          await this.updateMany(whereExpression, { is_active: false });
        }
      }

      const updateData = {
        ...updates,
        updated_at: new Date()
      };

      const result = await super.update(id, updateData);
      if (!result.success) {
        throw QueryError.create(`Failed to update workflow definition: ${id}`);
      }

      return this.convertOptionToNull(result.data);
    }, 'update');
  }

  /**
   * 删除工作流定义
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await super.delete(id);
      if (!result.success) {
        throw QueryError.create(`Failed to delete workflow definition: ${id}`);
      }

      return result.data;
    }, 'delete');
  }
}
