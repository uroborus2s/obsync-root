/**
 * 数据库插件的类型定义
 */

import { Knex } from 'knex';

// 重新导出Knex类型
export type { Knex };

/**
 * 数据库配置选项
 */
export interface DatabaseConfig extends Knex.Config {
  /**
   * 是否启用调试模式
   */
  debug?: boolean;

  /**
   * 多数据库连接配置
   */
  connections?: Record<string, Knex.Config>;

  /**
   * 模型配置
   */
  models?: {
    /**
     * 模型文件目录
     */
    directory?: string;

    /**
     * 基础模型类名
     */
    baseClass?: string;

    /**
     * 是否自动注册目录下所有模型
     */
    autoRegister?: boolean;
  };

  /**
   * 迁移配置
   */
  migrations?: {
    /**
     * 迁移文件目录
     */
    directory?: string;

    /**
     * 迁移表名
     */
    tableName?: string;

    /**
     * 是否自动从模型生成迁移
     */
    autoGenerate?: boolean;
  };

  /**
   * 种子配置
   */
  seeds?: {
    /**
     * 种子文件目录
     */
    directory?: string;

    /**
     * 不同环境使用的种子目录
     */
    environment?: Record<string, string[]>;
  };
}

/**
 * 字段类型定义
 */
export type FieldType =
  | 'increments'
  | 'integer'
  | 'bigInteger'
  | 'tinyInteger'
  | 'string'
  | 'text'
  | 'decimal'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'timestamp'
  | 'binary'
  | 'enum'
  | 'json'
  | 'jsonb'
  | 'uuid';

/**
 * 基础字段选项
 */
export interface BaseFieldOptions {
  /**
   * 字段类型
   */
  type: FieldType;

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
}

/**
 * 字符串字段选项
 */
export interface StringFieldOptions extends BaseFieldOptions {
  type: 'string' | 'text';

  /**
   * 字符串长度 (仅用于string类型)
   */
  length?: number;

  /**
   * 字符集
   */
  charset?: string;

  /**
   * 排序规则
   */
  collate?: string;
}

/**
 * 数值字段选项
 */
export interface NumberFieldOptions extends BaseFieldOptions {
  type: 'integer' | 'bigInteger' | 'tinyInteger' | 'decimal' | 'float';

  /**
   * 是否为无符号（非负）数值
   */
  unsigned?: boolean;

  /**
   * 精度（总位数）
   */
  precision?: number;

  /**
   * 小数位数
   */
  scale?: number;
}

/**
 * 枚举字段选项
 */
export interface EnumFieldOptions extends BaseFieldOptions {
  type: 'enum';

  /**
   * 枚举可选值列表
   */
  values: string[];
}

/**
 * 日期时间字段选项
 */
export interface DatetimeFieldOptions extends BaseFieldOptions {
  type: 'date' | 'datetime' | 'time' | 'timestamp';

  /**
   * 时间精度（秒的小数位）
   */
  precision?: number;

  /**
   * 是否使用时区（仅用于timestamp）
   */
  useTz?: boolean;
}

/**
 * 外键引用选项
 */
export interface ReferenceOptions {
  /**
   * 引用的表和字段，如 'users.id'
   */
  references?: string;

  /**
   * 删除时动作，如 'CASCADE', 'SET NULL', 'RESTRICT'
   */
  onDelete?: string;

  /**
   * 更新时动作，如 'CASCADE'
   */
  onUpdate?: string;
}

/**
 * 字段定义，合并所有可能的字段选项
 */
export type FieldDefinition = BaseFieldOptions &
  Partial<
    StringFieldOptions &
      NumberFieldOptions &
      EnumFieldOptions &
      DatetimeFieldOptions &
      ReferenceOptions
  >;

/**
 * 关系类型
 */
export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';

/**
 * 基础关系定义
 */
export interface BaseRelation {
  /**
   * 关系类型
   */
  type: RelationType;

  /**
   * 关联的模型名称
   */
  model: string;

  /**
   * 本地键
   */
  localKey?: string;

  /**
   * 外键
   */
  foreignKey?: string;
}

/**
 * 一对一关系定义
 */
export interface HasOneRelation extends BaseRelation {
  type: 'hasOne';
}

/**
 * 一对多关系定义
 */
export interface HasManyRelation extends BaseRelation {
  type: 'hasMany';
}

/**
 * 属于关系定义
 */
export interface BelongsToRelation extends BaseRelation {
  type: 'belongsTo';
}

/**
 * 多对多关系定义
 */
export interface BelongsToManyRelation extends BaseRelation {
  type: 'belongsToMany';

  /**
   * 中间表名称
   */
  through: string;

  /**
   * 另一个键名
   */
  otherKey: string;

  /**
   * 中间表上的额外字段
   */
  pivotFields?: string[];
}

/**
 * 关系定义，合并所有可能的关系类型
 */
export type RelationDefinition =
  | HasOneRelation
  | HasManyRelation
  | BelongsToRelation
  | BelongsToManyRelation;

/**
 * 模型查询选项
 */
export interface QueryOptions {
  /**
   * 事务对象
   */
  transaction?: Knex.Transaction;

  /**
   * 是否强制删除（软删除情况下）
   */
  force?: boolean;

  /**
   * 其他选项
   */
  [key: string]: any;
}

/**
 * 分页结果
 */
export interface PaginationResult<T> {
  /**
   * 数据结果
   */
  data: T[];

  /**
   * 总记录数
   */
  total: number;

  /**
   * 当前页
   */
  currentPage: number;

  /**
   * 每页记录数
   */
  perPage: number;

  /**
   * 总页数
   */
  lastPage: number;

  /**
   * 是否有上一页
   */
  hasMorePages: boolean;

  /**
   * 第一条记录的索引
   */
  from: number | null;

  /**
   * 最后一条记录的索引
   */
  to: number | null;
}

/**
 * 钩子类型
 */
export type HookType =
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeSave'
  | 'afterSave'
  | 'beforeDelete'
  | 'afterDelete';

/**
 * 钩子函数类型
 */
export type HookFunction = (
  model: any,
  options?: QueryOptions
) => Promise<void> | void;
