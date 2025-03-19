/**
 * 基础模型类
 * 提供ORM功能和数据操作方法
 */

import { DatabaseManager } from '../lib/database-manager.js';
import { ModelRegistry } from '../lib/model-registry.js';
import { QueryBuilder } from '../lib/query-builder.js';
import { QueryOptions } from '../types/index.js';

/**
 * 模型钩子接口
 */
export interface ModelHooks {
  [key: string]: ((...args: any[]) => any) | undefined;
  beforeSave?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  afterSave?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  beforeCreate?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  afterCreate?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  beforeUpdate?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  afterUpdate?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  beforeDelete?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  afterDelete?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  beforeRestore?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  afterRestore?: (
    model: BaseModel,
    options?: QueryOptions
  ) => Promise<void> | void;
  // 源跟踪钩子
  beforeSync?: (
    sourceData: any,
    source: string,
    model: BaseModel | null
  ) => Promise<any> | any;
  afterSync?: (
    model: BaseModel,
    sourceData: any,
    source: string
  ) => Promise<void> | void;
  onSyncError?: (
    error: Error,
    sourceData: any,
    source: string
  ) => Promise<void> | void;
}

/**
 * 基础模型类，所有模型都应继承此类
 */
export class BaseModel {
  /**
   * 表名
   */
  static tableName: string;

  /**
   * 主键名
   */
  static primaryKey: string = 'id';

  /**
   * 字段定义
   */
  static fields: Record<string, any> = {};

  /**
   * 关系定义
   */
  static relations: Record<string, any> = {};

  /**
   * 模型钩子
   */
  static hooks?: ModelHooks;

  /**
   * 是否使用时间戳
   */
  static timestamps: boolean = true;

  /**
   * 创建时间字段名
   */
  static createdAtColumn: string = 'created_at';

  /**
   * 更新时间字段名
   */
  static updatedAtColumn: string = 'updated_at';

  /**
   * 是否使用软删除
   */
  static softDeletes: boolean = false;

  /**
   * 软删除时间字段名
   */
  static deletedAtColumn: string = 'deleted_at';

  /**
   * 隐藏字段（序列化时排除）
   */
  static hidden: string[] = [];

  /**
   * 默认数据库连接名
   */
  static connection: string = 'default';

  /**
   * 模型属性
   */
  protected _attributes: Record<string, any> = {};

  /**
   * 原始属性（用于跟踪变更）
   */
  protected _original: Record<string, any> = {};

  /**
   * 已加载的关系
   */
  protected _relations: Record<string, any> = {};

  /**
   * 是否为新记录
   */
  protected _isNew: boolean = true;

  /**
   * 是否已被删除
   */
  protected _isDeleted: boolean = false;

  /**
   * 数据库管理器实例
   */
  private static _dbManager: DatabaseManager;

  /**
   * 构造函数
   * @param attributes 初始属性
   */
  constructor(attributes: Record<string, any> = {}) {
    this._attributes = { ...attributes };
    this._original = { ...attributes };
    this._relations = {};
    this._isNew = !attributes[this.constructor.prototype.primaryKey];

    // 设置代理以拦截属性访问
    return new Proxy(this, {
      get: (target, prop: string) => {
        // 检查是否为关系属性
        if (
          prop in (this.constructor as typeof BaseModel).relations &&
          prop in target._relations
        ) {
          return target._relations[prop];
        }

        // 检查是否为普通属性
        if (prop in target._attributes) {
          return target._attributes[prop];
        }

        return target[prop as keyof typeof target];
      },

      set: (target, prop: string, value: any) => {
        // 只拦截模型属性的设置
        if (
          prop in target._attributes ||
          prop in (this.constructor as typeof BaseModel).fields
        ) {
          target._attributes[prop] = value;
          return true;
        }

        // 其他属性正常设置
        (target as any)[prop] = value;
        return true;
      }
    });
  }

  /**
   * 设置数据库管理器
   * @param manager 数据库管理器实例
   */
  public static setDatabaseManager(manager: DatabaseManager): void {
    this._dbManager = manager;
  }

  /**
   * 获取数据库管理器
   * @returns 数据库管理器实例
   */
  public static getDatabaseManager(): DatabaseManager {
    if (!this._dbManager) {
      throw new Error(
        'Database manager not set. Call BaseModel.setDatabaseManager() first.'
      );
    }
    return this._dbManager;
  }

  /**
   * 获取数据库连接
   * @param connectionName 连接名称，如果未提供则使用默认连接
   * @returns 数据库连接
   */
  public static getConnection(connectionName?: string): any {
    const manager = this.getDatabaseManager();
    return manager.connection(connectionName || this.connection);
  }

  /**
   * 创建查询构建器
   * @param options 查询选项
   * @returns 查询构建器实例
   */
  public static query(options: QueryOptions = {}): QueryBuilder {
    const db = this.getConnection();
    return new QueryBuilder(this, db, options.transaction);
  }

  /**
   * 查找记录（通过主键）
   * @param id 主键值
   * @param options 查询选项
   * @returns 模型实例或null
   */
  public static async find(id: any, options: QueryOptions = {}): Promise<any> {
    return this.query(options).where(this.primaryKey, id).first();
  }

  /**
   * 查找记录（通过条件）
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 模型实例或null
   */
  public static async findBy(
    conditions: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<any> {
    const query = this.query(options);

    for (const [key, value] of Object.entries(conditions)) {
      query.where(key, value);
    }

    return query.first();
  }

  /**
   * 获取所有记录
   * @param options 查询选项
   * @returns 模型实例数组
   */
  public static async all(options: QueryOptions = {}): Promise<any[]> {
    return this.query(options).get();
  }

  /**
   * 创建新记录
   * @param data 记录数据
   * @param options 查询选项
   * @returns 创建的模型实例
   */
  public static async create(
    data: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<any> {
    const model = new this(data);
    await model.save(options);
    return model;
  }

  /**
   * 更新或创建记录
   * @param conditions 查询条件
   * @param values 更新或创建的值
   * @param options 查询选项
   * @returns 更新或创建的模型实例
   */
  public static async updateOrCreate(
    conditions: Record<string, any>,
    values: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<any> {
    // 查找记录
    const model = await this.findBy(conditions, options);

    if (model) {
      // 更新现有记录
      Object.assign(model, values);
      await model.save(options);
      return model;
    } else {
      // 创建新记录
      return this.create({ ...conditions, ...values }, options);
    }
  }

  /**
   * 批量创建记录
   * @param dataArray 记录数据数组
   * @param options 查询选项
   * @returns 创建的模型实例数组
   */
  public static async createMany(
    dataArray: Record<string, any>[],
    options: QueryOptions = {}
  ): Promise<any[]> {
    const models: any[] = [];

    // 使用事务确保原子性
    await this.getConnection().transaction(async (trx: any) => {
      const transactionOptions = { ...options, transaction: trx };

      for (const data of dataArray) {
        const model = await this.create(data, transactionOptions);
        models.push(model);
      }
    });

    return models;
  }

  /**
   * 添加查询条件
   * @param column 字段名
   * @param operator 操作符或值
   * @param value 值
   * @returns 查询构建器实例
   */
  public static where(
    column: string,
    operator: any,
    value?: any
  ): QueryBuilder {
    const query = this.query();
    return query.where(column, operator, value);
  }

  /**
   * 预加载关系
   * @param relation 关系名称
   * @param callback 自定义查询回调
   * @returns 查询构建器实例
   */
  public static with(relation: string, callback?: Function): QueryBuilder {
    const query = this.query();
    return query.with(relation, callback);
  }

  /**
   * 获取主键值
   * @returns 主键值
   */
  public getPrimaryKeyValue(): any {
    const primaryKey = (this.constructor as typeof BaseModel).primaryKey;
    return this._attributes[primaryKey];
  }

  /**
   * 获取属性值
   * @param key 属性名
   * @returns 属性值
   */
  public getAttribute(key: string): any {
    return this._attributes[key];
  }

  /**
   * 设置属性值
   * @param key 属性名
   * @param value 属性值
   */
  public setAttribute(key: string, value: any): void {
    this._attributes[key] = value;
  }

  /**
   * 获取所有属性
   * @returns 属性对象
   */
  public getAttributes(): Record<string, any> {
    return { ...this._attributes };
  }

  /**
   * 填充属性
   * @param attributes 属性对象
   */
  public fill(attributes: Record<string, any>): this {
    for (const [key, value] of Object.entries(attributes)) {
      this.setAttribute(key, value);
    }
    return this;
  }

  /**
   * 检查属性是否已更改
   * @param attribute 属性名，如果未提供则检查所有属性
   * @returns 是否已更改
   */
  public isDirty(attribute?: string): boolean {
    if (attribute) {
      return this._attributes[attribute] !== this._original[attribute];
    }

    for (const key in this._attributes) {
      if (this._attributes[key] !== this._original[key]) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取已更改的属性
   * @returns 已更改的属性对象
   */
  public getDirty(): Record<string, any> {
    const dirty: Record<string, any> = {};

    for (const key in this._attributes) {
      if (this._attributes[key] !== this._original[key]) {
        dirty[key] = this._attributes[key];
      }
    }

    return dirty;
  }

  /**
   * 保存模型
   * @param options 查询选项
   * @returns 是否保存成功
   */
  public async save(options: QueryOptions = {}): Promise<boolean> {
    const constructor = this.constructor as typeof BaseModel;
    const isNew = this._isNew;

    // 应用钩子
    if (isNew) {
      await this._callHook('beforeCreate', options);
    } else {
      await this._callHook('beforeUpdate', options);
    }

    await this._callHook('beforeSave', options);

    // 设置时间戳
    if (constructor.timestamps) {
      const now = new Date();

      if (isNew) {
        this.setAttribute(constructor.createdAtColumn, now);
      }

      this.setAttribute(constructor.updatedAtColumn, now);
    }

    // 获取数据库连接
    const db = constructor.getConnection();
    const transaction = options.transaction;

    try {
      if (isNew) {
        // 插入新记录
        const query = constructor.query(options);
        const result = await query.insert(this._attributes);

        // 设置主键值（如果是自增主键）
        if (Array.isArray(result) && result.length > 0) {
          this.setAttribute(constructor.primaryKey, result[0]);
        } else if (typeof result === 'number') {
          this.setAttribute(constructor.primaryKey, result);
        }

        this._isNew = false;
      } else {
        // 更新现有记录
        const primaryKey = constructor.primaryKey;
        const primaryKeyValue = this.getPrimaryKeyValue();

        if (!primaryKeyValue) {
          throw new Error('Cannot update model without primary key value.');
        }

        // 只更新已更改的字段
        const dirty = this.getDirty();

        if (Object.keys(dirty).length > 0) {
          const query = constructor.query(options);
          await query.where(primaryKey, primaryKeyValue).update(dirty);
        }
      }

      // 更新原始属性
      this._original = { ...this._attributes };

      // 应用钩子
      if (isNew) {
        await this._callHook('afterCreate', options);
      } else {
        await this._callHook('afterUpdate', options);
      }

      await this._callHook('afterSave', options);

      return true;
    } catch (error) {
      // 如果不是在外部事务中，则抛出错误
      if (!transaction) {
        throw error;
      }

      return false;
    }
  }

  /**
   * 删除模型
   * @param options 查询选项
   * @returns 是否删除成功
   */
  public async delete(options: QueryOptions = {}): Promise<boolean> {
    if (this._isDeleted) {
      return false;
    }

    const constructor = this.constructor as typeof BaseModel;
    const primaryKey = constructor.primaryKey;
    const primaryKeyValue = this.getPrimaryKeyValue();

    if (!primaryKeyValue) {
      throw new Error('Cannot delete model without primary key value.');
    }

    // 应用钩子
    await this._callHook('beforeDelete', options);

    try {
      const query = constructor.query(options);

      if (constructor.softDeletes && !options.force) {
        // 软删除
        await query.where(primaryKey, primaryKeyValue).delete();
      } else {
        // 物理删除
        await query.where(primaryKey, primaryKeyValue).forceDelete();
      }

      this._isDeleted = true;

      // 应用钩子
      await this._callHook('afterDelete', options);

      return true;
    } catch (error) {
      if (!options.transaction) {
        throw error;
      }

      return false;
    }
  }

  /**
   * 强制删除模型（即使启用了软删除）
   * @param options 查询选项
   * @returns 是否删除成功
   */
  public async forceDelete(options: QueryOptions = {}): Promise<boolean> {
    return this.delete({ ...options, force: true });
  }

  /**
   * 恢复软删除的模型
   * @param options 查询选项
   * @returns 是否恢复成功
   */
  public async restore(options: QueryOptions = {}): Promise<boolean> {
    const constructor = this.constructor as typeof BaseModel;

    if (!constructor.softDeletes) {
      throw new Error('Model does not use soft deletes.');
    }

    const primaryKey = constructor.primaryKey;
    const primaryKeyValue = this.getPrimaryKeyValue();

    if (!primaryKeyValue) {
      throw new Error('Cannot restore model without primary key value.');
    }

    try {
      const query = constructor.query(options);
      await query.where(primaryKey, primaryKeyValue).restore();

      this._isDeleted = false;
      this.setAttribute(constructor.deletedAtColumn, null);
      this._original[constructor.deletedAtColumn] = null;

      return true;
    } catch (error) {
      if (!options.transaction) {
        throw error;
      }

      return false;
    }
  }

  /**
   * 刷新模型
   * @param options 查询选项
   * @returns 是否刷新成功
   */
  public async refresh(options: QueryOptions = {}): Promise<boolean> {
    const constructor = this.constructor as typeof BaseModel;
    const primaryKey = constructor.primaryKey;
    const primaryKeyValue = this.getPrimaryKeyValue();

    if (!primaryKeyValue) {
      return false;
    }

    const model = await constructor.find(primaryKeyValue, options);

    if (!model) {
      return false;
    }

    this._attributes = { ...model._attributes };
    this._original = { ...model._attributes };
    this._relations = { ...model._relations };

    return true;
  }

  /**
   * 获取关联查询
   * @param relation 关系名称
   * @returns 关联查询构建器
   */
  public related(relation: string): any {
    const constructor = this.constructor as typeof BaseModel;
    const relationDef = constructor.relations[relation];

    if (!relationDef) {
      throw new Error(
        `Relation [${relation}] not defined on model [${constructor.name}].`
      );
    }

    const relatedModel = ModelRegistry.getModel(relationDef.model);
    const db = constructor.getConnection();

    // 创建关联查询
    const query = new QueryBuilder(relatedModel, db);

    // 根据关系类型设置约束
    switch (relationDef.type) {
      case 'hasOne':
      case 'hasMany':
        const foreignKey =
          relationDef.foreignKey || `${constructor.tableName.slice(0, -1)}_id`;
        const localKey = relationDef.localKey || constructor.primaryKey;
        query.where(foreignKey, this.getAttribute(localKey));
        break;

      case 'belongsTo':
        const belongsForeignKey =
          relationDef.foreignKey || `${relationDef.model.toLowerCase()}_id`;
        const belongsLocalKey = relationDef.localKey || 'id';
        query.where(belongsLocalKey, this.getAttribute(belongsForeignKey));
        break;

      case 'belongsToMany':
        // 多对多关系需要特殊处理
        throw new Error(
          'belongsToMany relation not implemented in related() method.'
        );

      default:
        throw new Error(`Unknown relation type [${relationDef.type}].`);
    }

    return query;
  }

  /**
   * 转换为JSON
   * @returns JSON对象
   */
  public toJSON(): Record<string, any> {
    const constructor = this.constructor as typeof BaseModel;
    const hidden = constructor.hidden || [];
    const result: Record<string, any> = {};

    // 添加属性
    for (const [key, value] of Object.entries(this._attributes)) {
      if (!hidden.includes(key)) {
        result[key] = value;
      }
    }

    // 添加关系
    for (const [key, value] of Object.entries(this._relations)) {
      if (!hidden.includes(key)) {
        if (Array.isArray(value)) {
          result[key] = value.map((item) =>
            item.toJSON ? item.toJSON() : item
          );
        } else if (value && typeof value === 'object' && value.toJSON) {
          result[key] = value.toJSON();
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * 调用模型钩子
   * @param hook 钩子名称
   * @param options 查询选项
   */
  private async _callHook(
    hook: string,
    options: QueryOptions = {}
  ): Promise<void> {
    const constructor = this.constructor as typeof BaseModel;

    // 检查原型上的钩子方法
    const prototypeHook = (constructor.prototype as any)[hook];
    if (prototypeHook) {
      await prototypeHook.call(this, options);
    }

    // 静态钩子
    if (constructor.hooks && constructor.hooks[hook]) {
      await constructor.hooks[hook].call(this, this, options);
    }
  }
}
