/**
 * @stratix/database 类型定义索引
 */

export * from './connection.js';
export * from './database.js';
export * from './model.js';
export * from './query.js';

/**
 * @stratix/database 类型定义
 */

import { Knex } from 'knex';
import { BaseModel } from '../models/base-model.js';

/**
 * 模型构造函数类型
 */
export interface ModelStatic<T = any> {
  /**
   * 数据库连接实例
   */
  getConnection(name?: string): DatabaseConnection;

  /**
   * 获取Knex实例
   */
  getKnex(connectionName?: string): Knex;

  /**
   * 模型名称
   */
  modelName: string;

  /**
   * 表名
   */
  tableName: string;

  /**
   * 主键
   */
  primaryKey: string;

  /**
   * 是否启用时间戳
   */
  timestamps: boolean;

  /**
   * 创建时间列名
   */
  createdAtColumn: string;

  /**
   * 更新时间列名
   */
  updatedAtColumn: string;

  /**
   * 是否启用软删除
   */
  softDeletes: boolean;

  /**
   * 删除时间列名
   */
  deletedAtColumn: string;

  /**
   * 字段定义
   */
  fields: Record<string, FieldDefinition>;

  /**
   * 关系定义
   */
  relations: Record<string, RelationDefinition>;

  /**
   * 查询作用域
   */
  scopes?: Record<string, ScopeCallback>;

  /**
   * 全局查询作用域
   */
  globalScopes?: ScopeCallback[];

  /**
   * 表结构定义
   */
  schema?: {
    columns?: Record<string, any>;
    indexes?: Array<any>;
  };

  /**
   * 创建新实例
   */
  new (attributes?: Record<string, any>): T;

  /**
   * 创建模型实例
   */
  create(attributes: Record<string, any>): Promise<T>;

  /**
   * 更新记录
   */
  update(id: any, attributes: Record<string, any>): Promise<T>;

  /**
   * 查找记录
   */
  find(id: any): Promise<T | null>;

  /**
   * 查找记录，不存在则抛出异常
   */
  findOrFail(id: any): Promise<T>;

  /**
   * 获取所有记录
   */
  all(): Promise<T[]>;

  /**
   * 查询构建器
   */
  query(): any;
}

/**
 * 数据库连接
 */
export interface DatabaseConnection {
  /**
   * 连接名称
   */
  name: string;

  /**
   * 获取Knex实例
   */
  getKnex(): Knex;
}

/**
 * 字段定义
 */
export interface FieldDefinition {
  /**
   * 字段类型
   */
  type: string;

  /**
   * 是否主键
   */
  primaryKey?: boolean;

  /**
   * 是否可为空
   */
  nullable?: boolean;

  /**
   * 默认值
   */
  defaultValue?: any;

  /**
   * 列名（如果与属性名不同）
   */
  column?: string;

  /**
   * 是否唯一
   */
  unique?: boolean;

  /**
   * 索引名称
   */
  index?: string | boolean;

  /**
   * 是否自增
   */
  autoIncrement?: boolean;

  /**
   * 是否无符号
   */
  unsigned?: boolean;

  /**
   * 最大长度
   */
  length?: number;

  /**
   * 精度（用于decimal类型）
   */
  precision?: number;

  /**
   * 小数位数（用于decimal类型）
   */
  scale?: number;
}

/**
 * 关系定义
 */
export interface RelationDefinition {
  /**
   * 关系类型
   */
  type:
    | 'hasOne'
    | 'hasMany'
    | 'belongsTo'
    | 'belongsToMany'
    | 'morphOne'
    | 'morphMany'
    | 'morphTo';

  /**
   * 关联模型
   */
  model: string | ModelStatic;

  /**
   * 外键
   */
  foreignKey?: string;

  /**
   * 本地键
   */
  localKey?: string;

  /**
   * 中间表（用于belongsToMany关系）
   */
  pivot?: string;

  /**
   * 中间表外键（用于belongsToMany关系）
   */
  pivotForeignKey?: string;

  /**
   * 中间表关联键（用于belongsToMany关系）
   */
  pivotRelatedKey?: string;

  /**
   * 多态关系类型字段（用于多态关系）
   */
  morphType?: string;

  /**
   * 多态关系ID字段（用于多态关系）
   */
  morphId?: string;

  /**
   * 外键删除行为
   */
  onDelete?: string;

  /**
   * 外键更新行为
   */
  onUpdate?: string;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  /**
   * 数据库连接名称
   */
  connection?: string;

  /**
   * 是否包含已软删除的记录
   */
  withTrashed?: boolean;

  /**
   * 仅获取已软删除的记录
   */
  onlyTrashed?: boolean;

  /**
   * 要加载的关系
   */
  with?: Array<{
    name: string;
    callback?: Function;
  }>;

  /**
   * 要应用的作用域
   */
  scopes?: Array<string | ScopeCallback>;

  /**
   * 事务对象
   */
  trx?: Knex.Transaction;
}

/**
 * 作用域回调
 */
export type ScopeCallback = (query: Knex.QueryBuilder) => void;

/**
 * 生命周期钩子类型
 */
export type HookCallback = (model: BaseModel) => Promise<void> | void;

/**
 * 生命周期钩子定义
 */
export interface Hooks {
  /**
   * 创建前钩子
   */
  beforeCreate?: HookCallback[];

  /**
   * 创建后钩子
   */
  afterCreate?: HookCallback[];

  /**
   * 更新前钩子
   */
  beforeUpdate?: HookCallback[];

  /**
   * 更新后钩子
   */
  afterUpdate?: HookCallback[];

  /**
   * 保存前钩子（创建或更新）
   */
  beforeSave?: HookCallback[];

  /**
   * 保存后钩子（创建或更新）
   */
  afterSave?: HookCallback[];

  /**
   * 删除前钩子
   */
  beforeDelete?: HookCallback[];

  /**
   * 删除后钩子
   */
  afterDelete?: HookCallback[];

  /**
   * 恢复前钩子（软删除）
   */
  beforeRestore?: HookCallback[];

  /**
   * 恢复后钩子（软删除）
   */
  afterRestore?: HookCallback[];
}
