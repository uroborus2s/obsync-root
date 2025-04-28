/**
 * @stratix/database 基础模型类
 */

import { Knex } from 'knex';
import { DatabaseCacheService } from '../cache/index.js';
import { buildQuery } from '../query/builder.js';
import { DatabaseManager, ModelHooks, QueryOptions } from '../types/index.js';

/**
 * 基础模型类
 * 所有模型类的基类，提供核心ORM功能
 */
export class BaseModel {
  /**
   * 数据库管理器
   */
  private static databaseManager: DatabaseManager;

  /**
   * 缓存服务
   */
  private static cacheService: DatabaseCacheService;

  /**
   * 表名（必须由子类设置）
   */
  static tableName: string;

  /**
   * 主键名称
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
   * 钩子定义
   */
  static hooks: ModelHooks = {};

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
   * 删除时间字段名
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
   * 原始属性
   */
  private attributes: Record<string, any> = {};

  /**
   * 原始属性（用于脏检查）
   */
  private originalAttributes: Record<string, any> = {};

  /**
   * 已加载的关系
   */
  private relations: Record<string, any> = {};

  /**
   * 是否为新记录
   */
  private isNewRecord: boolean = true;

  /**
   * 设置数据库管理器
   * @param manager 数据库管理器
   */
  static setDatabaseManager(manager: DatabaseManager): void {
    this.databaseManager = manager;
  }

  /**
   * 获取数据库管理器
   */
  static getDatabaseManager(): DatabaseManager {
    if (!this.databaseManager) {
      throw new Error('数据库管理器未设置');
    }
    return this.databaseManager;
  }

  /**
   * 获取数据库连接
   * @param connectionName 连接名称
   */
  static getConnection(connectionName?: string): any {
    const manager = this.getDatabaseManager();
    return manager.getConnection(connectionName || this.connection);
  }

  /**
   * 获取Knex查询构建器
   */
  static getKnex(connectionName?: string): Knex {
    return this.getConnection(connectionName).getKnex();
  }

  /**
   * 设置缓存服务
   * @param service 缓存服务
   */
  static setCacheService(service: DatabaseCacheService): void {
    this.cacheService = service;
  }

  /**
   * 获取缓存服务
   */
  static getCacheService(): DatabaseCacheService | undefined {
    return this.cacheService;
  }

  /**
   * 创建查询构建器
   * @param options 查询选项
   */
  static query(options?: any): any {
    // 如果未指定是否使用缓存，则尝试从模型配置获取默认设置
    if (options?.useCache === undefined && this.cacheService) {
      options = {
        ...options,
        useCache: true
      };
    }

    return buildQuery(this as any, options);
  }

  /**
   * 根据ID查找记录
   * @param id ID值
   * @param options 查询选项
   */
  static async find(id: any, options?: QueryOptions): Promise<any> {
    return this.query(options).where(this.primaryKey, id).first();
  }

  /**
   * 根据条件查找记录
   * @param conditions 查询条件
   * @param options 查询选项
   */
  static async findBy(
    conditions: Record<string, any>,
    options?: QueryOptions
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
   */
  static async all(options?: QueryOptions): Promise<any[]> {
    return this.query(options).get();
  }

  /**
   * 创建新记录
   * @param data 数据对象
   * @param options 查询选项
   */
  static async create(
    data: Record<string, any>,
    options?: QueryOptions
  ): Promise<any> {
    const instance = new this(data);
    await instance.save(options);
    return instance;
  }

  /**
   * 创建多条记录
   * @param dataArray 数据对象数组
   * @param options 查询选项
   */
  static async createMany(
    dataArray: Record<string, any>[],
    options?: QueryOptions
  ): Promise<any[]> {
    const results = [];

    for (const data of dataArray) {
      results.push(await this.create(data, options));
    }

    return results;
  }

  /**
   * 更新或创建记录
   * @param conditions 查询条件
   * @param values 更新或创建的数据
   * @param options 查询选项
   */
  static async updateOrCreate(
    conditions: Record<string, any>,
    values: Record<string, any>,
    options?: QueryOptions
  ): Promise<any> {
    const instance = await this.findBy(conditions, options);

    if (instance) {
      // 更新已存在的记录
      instance.fill(values);
      await instance.save(options);
      return instance;
    } else {
      // 创建新记录
      return this.create({ ...conditions, ...values }, options);
    }
  }

  /**
   * 开始条件查询
   * @param column 列名
   * @param operator 操作符
   * @param value 值
   */
  static where(column: string, operator: any, value?: any): any {
    return this.query().where(column, operator, value);
  }

  /**
   * 开始关系查询
   * @param relation 关系名称
   * @param callback 回调函数
   */
  static with(relation: string, callback?: Function): any {
    return this.query().with(relation, callback);
  }

  /**
   * 创建模型实例
   * @param attributes 属性
   */
  constructor(attributes: Record<string, any> = {}) {
    this.fill(attributes);
    this.isNewRecord = true;
    this.syncOriginal();
  }

  /**
   * 获取属性值
   * @param key 属性名
   */
  getAttribute(key: string): any {
    return this.attributes[key];
  }

  /**
   * 设置属性值
   * @param key 属性名
   * @param value 属性值
   */
  setAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }

  /**
   * 获取所有属性
   */
  getAttributes(): Record<string, any> {
    return { ...this.attributes };
  }

  /**
   * 批量设置属性
   * @param attributes 属性对象
   */
  fill(attributes: Record<string, any>): this {
    for (const [key, value] of Object.entries(attributes)) {
      this.setAttribute(key, value);
    }
    return this;
  }

  /**
   * 同步原始属性（用于脏检查）
   */
  syncOriginal(): void {
    this.originalAttributes = { ...this.attributes };
  }

  /**
   * 检查属性是否已修改
   * @param attribute 属性名，不指定则检查所有属性
   */
  isDirty(attribute?: string): boolean {
    if (attribute) {
      return this.attributes[attribute] !== this.originalAttributes[attribute];
    }

    for (const key in this.attributes) {
      if (this.attributes[key] !== this.originalAttributes[key]) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取已修改的属性
   */
  getDirty(): Record<string, any> {
    const dirty: Record<string, any> = {};

    for (const key in this.attributes) {
      if (this.attributes[key] !== this.originalAttributes[key]) {
        dirty[key] = this.attributes[key];
      }
    }

    return dirty;
  }

  /**
   * 保存实例
   * @param options 查询选项
   */
  async save(options?: QueryOptions): Promise<boolean> {
    const modelClass = this.constructor as typeof BaseModel;
    const hooks = modelClass.hooks;

    try {
      // 执行保存前钩子
      if (hooks.beforeSave) {
        await hooks.beforeSave(this);
      }

      if (this.isNewRecord) {
        // 执行创建前钩子
        if (hooks.beforeCreate) {
          await hooks.beforeCreate(this);
        }

        // 设置创建时间和更新时间
        if (modelClass.timestamps) {
          const now = new Date();
          this.setAttribute(modelClass.createdAtColumn, now);
          this.setAttribute(modelClass.updatedAtColumn, now);
        }

        // 执行插入操作
        const [id] = await modelClass
          .query(options)
          .insert(this.attributes)
          .returning(modelClass.primaryKey);

        // 设置主键值
        this.setAttribute(modelClass.primaryKey, id);
        this.isNewRecord = false;

        // 执行创建后钩子
        if (hooks.afterCreate) {
          await hooks.afterCreate(this);
        }
      } else {
        // 只更新已修改的属性
        const dirty = this.getDirty();

        // 如果没有修改则不执行更新
        if (Object.keys(dirty).length === 0) {
          return true;
        }

        // 执行更新前钩子
        if (hooks.beforeUpdate) {
          await hooks.beforeUpdate(this);
        }

        // 设置更新时间
        if (modelClass.timestamps) {
          dirty[modelClass.updatedAtColumn] = new Date();
          this.setAttribute(
            modelClass.updatedAtColumn,
            dirty[modelClass.updatedAtColumn]
          );
        }

        // 执行更新操作
        await modelClass
          .query(options)
          .where(
            modelClass.primaryKey,
            this.getAttribute(modelClass.primaryKey)
          )
          .update(dirty);

        // 清除缓存
        const cacheService = modelClass.getCacheService();
        if (cacheService) {
          const modelName = modelClass.tableName;
          const primaryKey = this.getAttribute(modelClass.primaryKey);
          await cacheService.delete(`${modelName}:${primaryKey}`, 'model');
        }

        // 执行更新后钩子
        if (hooks.afterUpdate) {
          await hooks.afterUpdate(this);
        }
      }

      // 同步原始属性
      this.syncOriginal();

      // 执行保存后钩子
      if (hooks.afterSave) {
        await hooks.afterSave(this);
      }

      return true;
    } catch (error) {
      console.error('保存模型实例失败:', error);
      throw error;
    }
  }

  /**
   * 删除记录
   * @param options 查询选项
   */
  async delete(options?: QueryOptions): Promise<boolean> {
    const modelClass = this.constructor as typeof BaseModel;
    const hooks = modelClass.hooks;
    const primaryKey = this.getAttribute(modelClass.primaryKey);

    if (!primaryKey) {
      throw new Error('无法删除未保存的模型实例');
    }

    try {
      // 执行删除前钩子
      if (hooks.beforeDelete) {
        await hooks.beforeDelete(this);
      }

      if (modelClass.softDeletes) {
        // 软删除
        const now = new Date();
        await modelClass
          .query(options)
          .where(modelClass.primaryKey, primaryKey)
          .update({ [modelClass.deletedAtColumn]: now });

        this.setAttribute(modelClass.deletedAtColumn, now);
      } else {
        // 硬删除
        await modelClass
          .query(options)
          .where(modelClass.primaryKey, primaryKey)
          .delete();
      }

      // 清除缓存
      const cacheService = modelClass.getCacheService();
      if (cacheService) {
        const modelName = modelClass.tableName;
        await cacheService.delete(`${modelName}:${primaryKey}`, 'model');
      }

      // 执行删除后钩子
      if (hooks.afterDelete) {
        await hooks.afterDelete(this);
      }

      return true;
    } catch (error) {
      console.error('删除模型实例失败:', error);
      throw error;
    }
  }

  /**
   * 强制删除（忽略软删除）
   * @param options 查询选项
   */
  async forceDelete(options?: QueryOptions): Promise<boolean> {
    const modelClass = this.constructor as typeof BaseModel;
    const hooks = modelClass.hooks;
    const primaryKey = this.getAttribute(modelClass.primaryKey);

    if (!primaryKey) {
      throw new Error('无法删除未保存的模型实例');
    }

    try {
      // 执行删除前钩子
      if (hooks.beforeDelete) {
        await hooks.beforeDelete(this);
      }

      // 硬删除
      await modelClass
        .query(options)
        .where(modelClass.primaryKey, primaryKey)
        .delete();

      // 执行删除后钩子
      if (hooks.afterDelete) {
        await hooks.afterDelete(this);
      }

      return true;
    } catch (error) {
      console.error('强制删除模型实例失败:', error);
      throw error;
    }
  }

  /**
   * 恢复软删除的记录
   * @param options 查询选项
   */
  async restore(options?: QueryOptions): Promise<boolean> {
    const modelClass = this.constructor as typeof BaseModel;

    if (!modelClass.softDeletes) {
      throw new Error('模型未启用软删除');
    }

    const hooks = modelClass.hooks;
    const primaryKey = this.getAttribute(modelClass.primaryKey);

    if (!primaryKey) {
      throw new Error('无法恢复未保存的模型实例');
    }

    try {
      // 执行恢复前钩子
      if (hooks.beforeRestore) {
        await hooks.beforeRestore(this);
      }

      // 恢复
      await modelClass
        .query(options)
        .where(modelClass.primaryKey, primaryKey)
        .update({ [modelClass.deletedAtColumn]: null });

      this.setAttribute(modelClass.deletedAtColumn, null);

      // 执行恢复后钩子
      if (hooks.afterRestore) {
        await hooks.afterRestore(this);
      }

      return true;
    } catch (error) {
      console.error('恢复模型实例失败:', error);
      throw error;
    }
  }

  /**
   * 刷新实例（从数据库重新加载）
   * @param options 查询选项
   */
  async refresh(options?: QueryOptions): Promise<boolean> {
    const modelClass = this.constructor as typeof BaseModel;
    const primaryKey = this.getAttribute(modelClass.primaryKey);

    if (!primaryKey) {
      throw new Error('无法刷新未保存的模型实例');
    }

    try {
      const fresh = await modelClass.find(primaryKey, options);

      if (!fresh) {
        throw new Error('记录不存在或已被删除');
      }

      this.attributes = fresh.getAttributes();
      this.syncOriginal();

      return true;
    } catch (error) {
      console.error('刷新模型实例失败:', error);
      throw error;
    }
  }

  /**
   * 加载关系
   * @param relationName 关系名称
   */
  async load(relationName: string): Promise<void> {
    const modelClass = this.constructor as typeof BaseModel;
    const primaryKey = this.getAttribute(modelClass.primaryKey);

    if (!primaryKey) {
      throw new Error('无法加载未保存的模型实例的关系');
    }

    try {
      const instance = await modelClass
        .query()
        .with(relationName)
        .where(modelClass.primaryKey, primaryKey)
        .first();

      if (instance && instance.related(relationName)) {
        this.relations[relationName] = instance.related(relationName);
      }
    } catch (error) {
      console.error(`加载关系 ${relationName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取已加载的关系
   * @param relationName 关系名称
   */
  related(relationName: string): any {
    return this.relations[relationName];
  }

  /**
   * 转换为JSON对象
   */
  toJSON(): Record<string, any> {
    const modelClass = this.constructor as typeof BaseModel;
    const json = { ...this.attributes };

    // 排除隐藏字段
    for (const field of modelClass.hidden) {
      delete json[field];
    }

    // 添加关系
    for (const [key, value] of Object.entries(this.relations)) {
      if (Array.isArray(value)) {
        json[key] = value.map((item) => (item.toJSON ? item.toJSON() : item));
      } else if (value && typeof value === 'object') {
        json[key] = value.toJSON ? value.toJSON() : value;
      } else {
        json[key] = value;
      }
    }

    return json;
  }

  /**
   * 处理属性访问（getter）
   */
  get(target: any, prop: string): any {
    // 首先检查是否是类的方法或属性
    if (prop in target) {
      return target[prop];
    }

    // 然后检查是否是模型的属性
    if (prop in this.attributes) {
      return this.attributes[prop];
    }

    // 最后检查是否是已加载的关系
    if (prop in this.relations) {
      return this.relations[prop];
    }

    return undefined;
  }

  /**
   * 处理属性赋值（setter）
   */
  set(target: any, prop: string, value: any): boolean {
    // 如果是类的属性，直接设置
    if (prop in target) {
      target[prop] = value;
      return true;
    }

    // 否则设置为模型的属性
    this.attributes[prop] = value;
    return true;
  }
}
