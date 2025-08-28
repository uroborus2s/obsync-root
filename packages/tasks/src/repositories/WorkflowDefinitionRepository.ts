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
  PaginatedResult,
  WorkflowDefinitionTable,
  WorkflowDefinitionTableUpdate
} from '../types/index.js';
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
   * 业务方法：根据ID查找工作流定义
   */
  async findByIdBusiness(
    id: number
  ): Promise<DatabaseResult<WorkflowDefinitionTable | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await super.findById(id);
      if (!result.success) {
        throw QueryError.create(`Failed to find workflow definition: ${id}`);
      }

      return this.convertOptionToNull(result.data);
    }, 'findByIdBusiness');
  }

  // 方法重载：支持接口要求的签名
  async findById(
    id: number
  ): Promise<DatabaseResult<WorkflowDefinitionTable | null>>;
  // 方法重载：支持基类的签名
  async findById(id: string | number): Promise<DatabaseResult<any>>;
  // 实际实现
  async findById(id: string | number): Promise<DatabaseResult<any>> {
    if (typeof id === 'string') {
      // 如果是string类型的id，调用基类方法
      return super.findById(id);
    }
    // 如果是number类型的id，使用业务逻辑
    return this.findByIdBusiness(id);
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

  // 方法重载：支持接口要求的签名
  async findMany(
    filters?: {
      status?: string;
      category?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<PaginatedResult<WorkflowDefinitionTable>>>;
  // 方法重载：支持基类的签名
  async findMany(criteria?: any, options?: any): Promise<DatabaseResult<any>>;
  // 实际实现
  async findMany(
    filtersOrCriteria?: any,
    paginationOrOptions?: any
  ): Promise<DatabaseResult<any>> {
    // 如果第一个参数是函数（WhereExpression），则调用基类方法
    if (typeof filtersOrCriteria === 'function') {
      return super.findMany(filtersOrCriteria, paginationOrOptions);
    }
    // 否则使用业务逻辑
    return this.findManyWithFilters(filtersOrCriteria, paginationOrOptions);
  }

  /**
   * 查询工作流定义列表
   */
  async findManyWithFilters(
    filters?: {
      status?: string;
      category?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<PaginatedResult<WorkflowDefinitionTable>>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    return await this.databaseApi.executeQuery(async (db) => {
      // 构建基础查询
      let query = db.selectFrom(this.tableName);

      // 添加过滤条件
      if (filters?.status) {
        query = query.where('status', '=', filters.status);
      }
      if (filters?.category) {
        query = query.where('category', '=', filters.category);
      }
      if (filters?.isActive !== undefined) {
        query = query.where('is_active', '=', filters.isActive);
      }
      if (filters?.search) {
        // 搜索名称、显示名称和描述字段
        query = query.where((eb: any) =>
          eb.or([
            eb('name', 'like', `%${filters.search}%`),
            eb('display_name', 'like', `%${filters.search}%`),
            eb('description', 'like', `%${filters.search}%`)
          ])
        );
      }

      // 先获取总数
      const countQuery = query
        .clearSelect()
        .select(db.fn.count('id').as('total'));
      const countResult = await countQuery.execute();
      const total = Number(countResult[0]?.total || 0);

      // 获取数据
      const dataQuery = query
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(pageSize)
        .offset(offset);
      const data = await dataQuery.execute();

      // 计算分页信息
      const totalPages = Math.ceil(total / pageSize);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const paginatedResult: PaginatedResult<WorkflowDefinitionTable> = {
        items: data as WorkflowDefinitionTable[],
        total,
        page,
        pageSize,
        totalPages,
        hasNext,
        hasPrev
      };

      return paginatedResult;
    });
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

  // 方法重载：支持接口要求的签名
  async update(
    id: number,
    updates: WorkflowDefinitionTableUpdate
  ): Promise<DatabaseResult<WorkflowDefinitionTable | null>>;
  // 方法重载：支持基类的签名
  async update(id: string | number, data: any): Promise<DatabaseResult<any>>;
  // 实际实现
  async update(
    id: string | number,
    updatesOrData: any
  ): Promise<DatabaseResult<any>> {
    if (typeof id === 'string') {
      // 如果是string类型的id，调用基类方法
      return super.update(id, updatesOrData);
    }
    // 如果是number类型的id，使用业务逻辑
    return this.updateWorkflowDefinition(id, updatesOrData);
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
