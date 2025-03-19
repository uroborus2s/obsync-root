/**
 * 数据库模型装饰器
 * 提供方便的方式定义模型属性、关系和钩子
 */

import { RelationDefinition } from '../types/index.js';

/**
 * 表名装饰器
 * @param name 表名
 */
export function Table(name: string) {
  return function (target: any) {
    target.tableName = name;
  };
}

/**
 * 主键装饰器
 * @param name 主键名称，默认为'id'
 */
export function PrimaryKey(name: string = 'id') {
  return function (target: any) {
    target.primaryKey = name;
  };
}

/**
 * 字段装饰器
 * @param options 字段选项
 */
export function Field(options: any) {
  return function (target: any, propertyKey: string) {
    // 确保存在fields静态属性
    if (!target.constructor.fields) {
      target.constructor.fields = {};
    }

    // 添加字段定义
    target.constructor.fields[propertyKey] = options;
  };
}

/**
 * 索引装饰器
 * @param columns 索引字段
 * @param options 索引选项
 */
export function Index(
  columns: string | string[],
  options: { unique?: boolean; name?: string } = {}
) {
  return function (target: any) {
    // 确保存在indexes静态属性
    if (!target.constructor.indexes) {
      target.constructor.indexes = [];
    }

    // 添加索引定义
    target.constructor.indexes.push({
      columns: Array.isArray(columns) ? columns : [columns],
      ...options
    });
  };
}

/**
 * 关系装饰器基类
 * @param type 关系类型
 * @param definition 关系定义
 */
function relation(
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany',
  definition: Omit<RelationDefinition, 'type'>
) {
  return function (target: any, propertyKey: string) {
    // 确保存在relations静态属性
    if (!target.constructor.relations) {
      target.constructor.relations = {};
    }

    // 添加关系定义
    target.constructor.relations[propertyKey] = {
      type,
      ...definition
    };
  };
}

/**
 * 一对一关系装饰器
 * @param model 关联的模型名称
 * @param foreignKey 外键
 * @param localKey 本地键
 */
export function HasOne(model: string, foreignKey?: string, localKey?: string) {
  return relation('hasOne', {
    model,
    foreignKey,
    localKey
  });
}

/**
 * 一对多关系装饰器
 * @param model 关联的模型名称
 * @param foreignKey 外键
 * @param localKey 本地键
 */
export function HasMany(model: string, foreignKey?: string, localKey?: string) {
  return relation('hasMany', {
    model,
    foreignKey,
    localKey
  });
}

/**
 * 属于关系装饰器
 * @param model 关联的模型名称
 * @param foreignKey 外键
 * @param localKey 本地键
 */
export function BelongsTo(
  model: string,
  foreignKey?: string,
  localKey?: string
) {
  return relation('belongsTo', {
    model,
    foreignKey,
    localKey
  });
}

/**
 * 多对多关系装饰器
 * @param model 关联的模型名称
 * @param through 中间表名称
 * @param foreignKey 外键
 * @param otherKey 另一个键名
 * @param pivotFields 中间表上的额外字段
 */
export function BelongsToMany(
  model: string,
  through: string,
  foreignKey: string,
  otherKey: string,
  pivotFields?: string[]
) {
  return relation('belongsToMany', {
    model,
    through,
    foreignKey,
    otherKey,
    pivotFields
  } as any);
}

/**
 * 钩子装饰器
 * @param hookType 钩子类型
 */
export function Hook(hookType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // 确保存在hooks静态属性
    if (!target.constructor.hooks) {
      target.constructor.hooks = {};
    }

    // 添加钩子方法
    target.constructor.hooks[hookType] = descriptor.value;

    return descriptor;
  };
}

/**
 * 验证规则装饰器
 * @param rules 验证规则
 */
export function Validates(rules: Record<string, any>) {
  return function (target: any, propertyKey: string) {
    // 确保存在validations静态属性
    if (!target.constructor.validations) {
      target.constructor.validations = {};
    }

    // 添加验证规则
    target.constructor.validations[propertyKey] = rules;
  };
}

/**
 * 隐藏字段装饰器
 */
export function Hidden() {
  return function (target: any, propertyKey: string) {
    // 确保存在hidden静态属性
    if (!target.constructor.hidden) {
      target.constructor.hidden = [];
    }

    // 添加到隐藏字段列表
    if (!target.constructor.hidden.includes(propertyKey)) {
      target.constructor.hidden.push(propertyKey);
    }
  };
}

/**
 * 时间戳装饰器，标记模型使用时间戳
 * @param createdAt 创建时间字段名，默认为'created_at'
 * @param updatedAt 更新时间字段名，默认为'updated_at'
 */
export function Timestamps(
  createdAt: string = 'created_at',
  updatedAt: string = 'updated_at'
) {
  return function (target: any) {
    target.timestamps = true;
    target.createdAtColumn = createdAt;
    target.updatedAtColumn = updatedAt;
  };
}

/**
 * 软删除装饰器，标记模型启用软删除功能
 * @param deletedAt 删除时间字段名，默认为'deleted_at'
 */
export function SoftDeletes(deletedAt: string = 'deleted_at') {
  return function (target: any) {
    target.softDeletes = true;
    target.deletedAtColumn = deletedAt;
  };
}
