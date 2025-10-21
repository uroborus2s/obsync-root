// @stratix/database 仓储类型定义
// 定义仓储模式相关的接口和类型

import type { Insertable, Kysely, Selectable, Updateable } from 'kysely';
import type {
  BatchOperationResult,
  PaginatedResult,
  PaginationOptions,
  QueryOptions,
  TransactionOptions,
  WhereExpression
} from './common.js';

/**
 * 基础仓储接口
 * 定义所有仓储类必须实现的基本方法
 */
export interface IBaseRepository<
  DB,
  TB extends keyof DB,
  T = Selectable<DB[TB]>,
  CreateT = Insertable<DB[TB]>,
  UpdateT = Updateable<DB[TB]>
> {
  // ========== 基础查询方法 ==========

  /**
   * 根据 ID 查找单条记录
   */
  findById(id: string | number): Promise<T | null>;

  /**
   * 根据条件查找单条记录
   */
  findOne(criteria: WhereExpression<DB, TB>): Promise<T | null>;

  /**
   * 根据条件查找多条记录
   */
  findMany(
    criteria?: WhereExpression<DB, TB>,
    options?: QueryOptions
  ): Promise<T[]>;

  /**
   * 查找所有记录
   */
  findAll(options?: QueryOptions): Promise<T[]>;

  // ========== 基础操作方法 ==========

  /**
   * 创建单条记录
   */
  create(data: CreateT): Promise<T>;

  /**
   * 批量创建记录
   */
  createMany(data: CreateT[]): Promise<T[]>;

  /**
   * 更新记录
   */
  update(id: string | number, data: UpdateT): Promise<T>;

  /**
   * 批量更新记录
   */
  updateMany(criteria: WhereExpression<DB, TB>, data: UpdateT): Promise<number>;

  /**
   * 删除记录
   */
  delete(id: string | number): Promise<boolean>;

  /**
   * 批量删除记录
   */
  deleteMany(criteria: WhereExpression<DB, TB>): Promise<number>;

  // ========== 聚合查询方法 ==========

  /**
   * 统计记录数量
   */
  count(criteria?: WhereExpression<DB, TB>): Promise<number>;

  /**
   * 检查记录是否存在
   */
  exists(criteria: WhereExpression<DB, TB>): Promise<boolean>;

  // ========== 分页查询方法 ==========

  /**
   * 分页查询记录
   */
  paginate(
    criteria?: WhereExpression<DB, TB>,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<T>>;

  // ========== 事务支持方法 ==========

  /**
   * 在事务中执行操作
   */
  withTransaction<R>(
    fn: (repository: this) => Promise<R>,
    options?: TransactionOptions
  ): Promise<R>;

  // ========== 连接管理方法 ==========

  /**
   * 获取数据库连接
   */
  getConnection(name?: string): Kysely<DB>;

  /**
   * 获取只读连接
   */
  getReadConnection(): Kysely<DB>;

  /**
   * 获取写连接
   */
  getWriteConnection(): Kysely<DB>;
}

/**
 * 扩展仓储接口
 * 提供更多高级功能
 */
export interface IExtendedRepository<
  DB,
  TB extends keyof DB,
  T = Selectable<DB[TB]>,
  CreateT = Insertable<DB[TB]>,
  UpdateT = Updateable<DB[TB]>
> extends IBaseRepository<DB, TB, T, CreateT, UpdateT> {
  // ========== 批量操作方法 ==========

  /**
   * 批量插入或更新（Upsert）
   */
  upsert(data: CreateT, conflictColumns: (keyof CreateT)[]): Promise<T>;

  /**
   * 批量 Upsert 操作
   */
  upsertMany(data: CreateT[], conflictColumns: (keyof CreateT)[]): Promise<T[]>;

  /**
   * 批量操作（支持混合操作）
   */
  batchOperation(
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      data?: CreateT | UpdateT;
      id?: string | number;
      criteria?: WhereExpression<DB, TB>;
    }>
  ): Promise<BatchOperationResult<T>>;

  // ========== 高级查询方法 ==========

  /**
   * 原始 SQL 查询
   */
  rawQuery<R = any>(sql: string, params?: any[]): Promise<R[]>;

  /**
   * 获取查询构建器
   */
  getQueryBuilder(): Kysely<DB>;

  /**
   * 流式查询（大数据量处理）
   */
  stream(
    criteria?: WhereExpression<DB, TB>,
    options?: QueryOptions & { batchSize?: number }
  ): AsyncIterable<T>;

  // ========== 缓存支持方法 ==========

  /**
   * 带缓存的查询
   */
  findWithCache(
    key: string,
    finder: () => Promise<T | null>,
    ttl?: number
  ): Promise<T | null>;

  /**
   * 清除缓存
   */
  clearCache(pattern?: string): Promise<void>;

  // ========== 软删除支持 ==========

  /**
   * 软删除记录
   */
  softDelete(id: string | number): Promise<boolean>;

  /**
   * 恢复软删除的记录
   */
  restore(id: string | number): Promise<boolean>;

  /**
   * 查找包括软删除的记录
   */
  findWithDeleted(criteria?: WhereExpression<DB, TB>): Promise<T[]>;

  /**
   * 只查找软删除的记录
   */
  findOnlyDeleted(criteria?: WhereExpression<DB, TB>): Promise<T[]>;
}

/**
 * 仓储工厂接口
 */
export interface IRepositoryFactory {
  /**
   * 创建仓储实例
   */
  create<DB, TB extends keyof DB, T = Selectable<DB[TB]>>(
    tableName: TB,
    connectionName?: string
  ): IBaseRepository<DB, TB, T>;

  /**
   * 获取已存在的仓储实例
   */
  get<DB, TB extends keyof DB, T = Selectable<DB[TB]>>(
    tableName: TB,
    connectionName?: string
  ): IBaseRepository<DB, TB, T> | null;

  /**
   * 销毁仓储实例
   */
  destroy(tableName: string, connectionName?: string): void;

  /**
   * 清理所有仓储实例
   */
  clear(): void;
}

/**
 * 查询构建器接口
 */
export interface IQueryBuilder<DB, TB extends keyof DB> {
  /**
   * 构建 WHERE 条件
   */
  buildWhereClause(
    qb: any,
    field: keyof DB[TB],
    operator: string,
    value: any
  ): any;

  /**
   * 构建分页查询
   */
  buildPaginationQuery(qb: any, page: number, pageSize: number): any;

  /**
   * 构建排序查询
   */
  buildOrderByQuery(
    qb: any,
    field: keyof DB[TB],
    direction?: 'asc' | 'desc'
  ): any;

  /**
   * 构建多条件查询
   */
  buildMultipleConditions(
    qb: any,
    conditions: Array<{
      field: keyof DB[TB];
      operator: string;
      value: any;
    }>
  ): any;
}

/**
 * 仓储元数据
 */
export interface RepositoryMetadata {
  /** 表名 */
  tableName: string;
  /** 主键字段 */
  primaryKey: string;
  /** 软删除字段 */
  softDeleteField?: string;
  /** 时间戳字段 */
  timestamps?: {
    createdAt?: string;
    updatedAt?: string;
  };
  /** 索引信息 */
  indexes?: Array<{
    name: string;
    fields: string[];
    unique?: boolean;
  }>;
  /** 关联关系 */
  relations?: Array<{
    name: string;
    type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';
    target: string;
    foreignKey: string;
    localKey?: string;
  }>;
}

/**
 * 仓储配置选项
 */
export interface RepositoryOptions {
  /** 连接名称 */
  connectionName?: string;
  /** 是否启用软删除 */
  softDelete?: boolean;
  /** 是否启用时间戳 */
  timestamps?: boolean;
  /** 是否启用缓存 */
  cache?: boolean;
  /** 缓存 TTL（秒） */
  cacheTTL?: number;
  /** 是否启用查询日志 */
  queryLogging?: boolean;
  /** 自定义序列化器 */
  serializer?: {
    serialize: (data: any) => any;
    deserialize: (data: any) => any;
  };
}

/**
 * 查询条件构建器类型
 */
export type QueryCondition<T> = {
  field: keyof T;
  operator:
    | '='
    | '!='
    | '>'
    | '>='
    | '<'
    | '<='
    | 'like'
    | 'ilike'
    | 'in'
    | 'not in'
    | 'is null'
    | 'is not null';
  value?: any;
};

/**
 * 查询过滤器类型
 */
export type QueryFilter<T> = {
  where?: QueryCondition<T>[];
  orWhere?: QueryCondition<T>[];
  orderBy?: Array<{
    field: keyof T;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
  offset?: number;
};

/**
 * 仓储事件类型
 */
export type RepositoryEvent =
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDelete'
  | 'afterDelete'
  | 'beforeFind'
  | 'afterFind';

/**
 * 仓储事件监听器
 */
export interface RepositoryEventListener<T = any> {
  event: RepositoryEvent;
  handler: (data: T, context?: any) => Promise<void> | void;
}

/**
 * 仓储钩子接口
 */
export interface IRepositoryHooks<T = any> {
  /**
   * 注册事件监听器
   */
  on(
    event: RepositoryEvent,
    handler: (data: T, context?: any) => Promise<void> | void
  ): void;

  /**
   * 移除事件监听器
   */
  off(event: RepositoryEvent, handler?: Function): void;

  /**
   * 触发事件
   */
  emit(event: RepositoryEvent, data: T, context?: any): Promise<void>;
}
