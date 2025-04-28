/**
 * @stratix/database 模型类型定义
 */

import { ModelHookCallback } from './database.js';

/**
 * 字段类型枚举
 */
export enum FieldType {
  Increments = 'increments',
  Integer = 'integer',
  BigInteger = 'bigInteger',
  TinyInteger = 'tinyInteger',
  String = 'string',
  Text = 'text',
  Decimal = 'decimal',
  Float = 'float',
  Boolean = 'boolean',
  Date = 'date',
  DateTime = 'datetime',
  Time = 'time',
  Timestamp = 'timestamp',
  Binary = 'binary',
  Enum = 'enum',
  Json = 'json',
  JsonB = 'jsonb',
  Uuid = 'uuid'
}

/**
 * 字段选项接口
 */
export interface FieldOptions {
  /**
   * 字段类型
   */
  type: FieldType | string;

  /**
   * 是否可为null
   */
  nullable?: boolean;

  /**
   * 默认值
   */
  default?: any | (() => any);

  /**
   * 字段注释
   */
  comment?: string;

  /**
   * 是否创建索引
   */
  index?: boolean;

  /**
   * 是否创建唯一索引
   */
  unique?: boolean;

  /**
   * 是否为主键
   */
  primary?: boolean;

  /**
   * 字符串长度 (仅用于 string 类型)
   */
  length?: number;

  /**
   * 字符集和排序规则 (字符串类型)
   */
  charset?: string;
  collate?: string;

  /**
   * 数值类型选项
   */
  unsigned?: boolean;
  precision?: number;
  scale?: number;

  /**
   * 枚举类型值
   */
  values?: string[];

  /**
   * 外键引用
   */
  references?: string;
  onDelete?: string;
  onUpdate?: string;

  /**
   * 默认值（别名，与default相同）
   */
  defaultValue?: any;
}

/**
 * 关系类型枚举
 */
export enum RelationType {
  HasOne = 'hasOne',
  HasMany = 'hasMany',
  BelongsTo = 'belongsTo',
  BelongsToMany = 'belongsToMany'
}

/**
 * 关系选项接口
 */
export interface RelationOptions {
  /**
   * 关系类型
   */
  type: RelationType | string;

  /**
   * 关联的模型名称
   */
  model: string;

  /**
   * 外键名称
   */
  foreignKey?: string;

  /**
   * 本地键名称
   */
  localKey?: string;

  /**
   * 多对多关系中间表名称
   */
  through?: string;

  /**
   * 多对多关系中间表外键
   */
  otherKey?: string;

  /**
   * 多对多关系中间表额外字段
   */
  pivotFields?: string[];

  /**
   * 外键删除操作
   */
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | string;

  /**
   * 外键更新操作
   */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | string;
}

/**
 * 模型钩子接口
 */
export interface ModelHooks {
  /**
   * 创建前
   */
  beforeCreate?: ModelHookCallback;

  /**
   * 创建后
   */
  afterCreate?: ModelHookCallback;

  /**
   * 更新前
   */
  beforeUpdate?: ModelHookCallback;

  /**
   * 更新后
   */
  afterUpdate?: ModelHookCallback;

  /**
   * 保存前（创建或更新）
   */
  beforeSave?: ModelHookCallback;

  /**
   * 保存后（创建或更新）
   */
  afterSave?: ModelHookCallback;

  /**
   * 删除前
   */
  beforeDelete?: ModelHookCallback;

  /**
   * 删除后
   */
  afterDelete?: ModelHookCallback;

  /**
   * 恢复前（软删除）
   */
  beforeRestore?: ModelHookCallback;

  /**
   * 恢复后（软删除）
   */
  afterRestore?: ModelHookCallback;
}

/**
 * 模型Schema接口
 */
export interface ModelSchema {
  /**
   * 表名
   */
  tableName: string;

  /**
   * 列定义
   */
  columns: Record<string, FieldOptions>;

  /**
   * 索引定义
   */
  indexes?: Array<{
    name: string;
    columns: string[];
    unique?: boolean;
  }>;
}

/**
 * 模型类静态属性接口
 */
export interface ModelStatic<T = any> {
  /**
   * 表名
   */
  tableName: string;

  /**
   * 主键名称
   */
  primaryKey?: string;

  /**
   * 字段定义
   */
  fields: Record<string, FieldOptions>;

  /**
   * 关系定义
   */
  relations?: Record<string, RelationOptions>;

  /**
   * 钩子定义
   */
  hooks?: ModelHooks;

  /**
   * 是否使用时间戳
   */
  timestamps?: boolean;

  /**
   * 创建时间字段名
   */
  createdAtColumn?: string;

  /**
   * 更新时间字段名
   */
  updatedAtColumn?: string;

  /**
   * 是否使用软删除
   */
  softDeletes?: boolean;

  /**
   * 删除时间字段名
   */
  deletedAtColumn?: string;

  /**
   * 隐藏字段（序列化时排除）
   */
  hidden?: string[];

  /**
   * 默认数据库连接名
   */
  connection?: string;

  /**
   * 模型名称
   */
  modelName?: string;

  /**
   * 查询作用域
   */
  scopes?: Record<string, Function>;

  /**
   * 全局作用域
   */
  globalScopes?: Function[];

  /**
   * 模型Schema定义
   */
  schema?: ModelSchema;

  /**
   * 获取缓存服务
   */
  getCacheService?: () => any;

  /**
   * 根据ID查找记录
   */
  find: (id: any, options?: any) => Promise<T | null>;

  /**
   * 根据ID查找记录，不存在则抛出异常
   */
  findOrFail: (id: any, options?: any) => Promise<T>;

  /**
   * 根据条件查找记录
   */
  findBy: (conditions: Record<string, any>, options?: any) => Promise<T | null>;

  /**
   * 创建查询构建器
   */
  query: (options?: any) => any;

  /**
   * 获取所有记录
   */
  all: (options?: any) => Promise<T[]>;

  /**
   * 创建新记录
   */
  create: (data: Record<string, any>, options?: any) => Promise<T>;

  /**
   * 创建多条记录
   */
  createMany: (dataArray: Record<string, any>[], options?: any) => Promise<T[]>;

  /**
   * 更新记录
   */
  update: (data: Record<string, any>, options?: any) => Promise<T>;

  /**
   * 获取数据库连接
   */
  getKnex: (connectionName?: string) => any;
}
