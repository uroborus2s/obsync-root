/**
 * @stratix/database 查询构建器模块
 */

import { Knex } from 'knex';
import { DatabaseCacheService, QueryCache } from '../cache/index.js';
import { ModelStatic, QueryOptions } from '../types/index.js';

/**
 * 查询构建器类
 * 封装Knex查询构建器，提供更高级的查询功能
 */
export class QueryBuilder<T = any> {
  /**
   * 模型类
   */
  protected modelClass: ModelStatic<T>;

  /**
   * 查询选项
   */
  protected options: QueryOptions;

  /**
   * 原始查询构建器
   */
  protected query: Knex.QueryBuilder;

  /**
   * 缓存服务
   */
  protected cacheService?: DatabaseCacheService;

  /**
   * 是否使用缓存
   */
  protected useCache: boolean = false;

  /**
   * 缓存时间（毫秒）
   */
  protected cacheTTL?: number;

  /**
   * 创建查询构建器实例
   * @param modelClass 模型类
   * @param options 查询选项
   */
  constructor(modelClass: ModelStatic<T>, options: any = {}) {
    this.modelClass = modelClass;
    this.options = options;

    // 缓存配置
    this.useCache = options.useCache !== undefined ? options.useCache : false;
    this.cacheTTL = options.cacheTTL;
    this.cacheService = (this.modelClass as any).getCacheService?.();

    // 创建查询构建器
    const knex = this.modelClass.getKnex(options.connection);
    this.query = knex(this.modelClass.tableName);

    // 事务支持
    if (options.transaction) {
      this.query.transacting(options.transaction);
    }

    // 软删除处理
    if (this.modelClass.softDeletes) {
      if (options.withTrashed) {
        // 不做任何处理，包含所有记录
      } else if (options.onlyTrashed) {
        // 只查询已删除的记录
        this.query.whereNotNull(
          `${this.modelClass.tableName}.${this.modelClass.deletedAtColumn}`
        );
      } else {
        // 默认只查询未删除的记录
        this.query.whereNull(
          `${this.modelClass.tableName}.${this.modelClass.deletedAtColumn}`
        );
      }
    }

    // 应用全局作用域
    if (
      this.modelClass.globalScopes &&
      Array.isArray(this.modelClass.globalScopes)
    ) {
      for (const scope of this.modelClass.globalScopes) {
        scope(this.query);
      }
    }

    // 应用局部作用域
    if (options.scopes && Array.isArray(options.scopes)) {
      for (const scope of options.scopes) {
        if (
          typeof scope === 'string' &&
          this.modelClass.scopes &&
          this.modelClass.scopes[scope]
        ) {
          this.modelClass.scopes[scope](this.query);
        } else if (typeof scope === 'function') {
          scope(this.query);
        }
      }
    }
  }

  /**
   * 设置是否使用缓存
   *
   * @param useCache 是否使用缓存
   * @param ttl 缓存时间（毫秒）
   */
  public cache(useCache: boolean = true, ttl?: number): this {
    this.useCache = useCache;
    if (ttl !== undefined) {
      this.cacheTTL = ttl;
    }
    return this;
  }

  /**
   * 获取原始查询构建器
   */
  public getQuery(): Knex.QueryBuilder {
    return this.query;
  }

  /**
   * 克隆查询构建器
   */
  public clone(): QueryBuilder<T> {
    const builder = new QueryBuilder<T>(this.modelClass, {
      ...this.options,
      useCache: this.useCache,
      cacheTTL: this.cacheTTL
    } as any);
    builder.query = this.query.clone();
    return builder;
  }

  /**
   * 添加 where 条件
   *
   * @param column 列名或回调函数
   * @param operator 操作符或值
   * @param value 值
   */
  public where(
    column: string | Knex.Raw | ((query: Knex.QueryBuilder) => void),
    operator?: string | number | boolean | Date | null,
    value?: any
  ): this {
    if (typeof column === 'function') {
      this.query.where((builder) => column(builder));
    } else if (arguments.length === 2) {
      if (typeof column === 'string') {
        this.query.where(column, operator as any);
      } else {
        this.query.where(column as any, operator as any);
      }
    } else {
      if (typeof column === 'string') {
        this.query.where(column, operator as string, value);
      } else {
        this.query.where(column as any, operator as any, value);
      }
    }
    return this;
  }

  /**
   * 添加 orWhere 条件
   *
   * @param column 列名或回调函数
   * @param operator 操作符或值
   * @param value 值
   */
  public orWhere(
    column: string | Knex.Raw | ((query: Knex.QueryBuilder) => void),
    operator?: string | number | boolean | Date | null,
    value?: any
  ): this {
    if (typeof column === 'function') {
      this.query.orWhere((builder) => column(builder));
    } else if (arguments.length === 2) {
      if (typeof column === 'string') {
        this.query.orWhere(column, operator as any);
      } else {
        this.query.orWhere(column as any, operator as any);
      }
    } else {
      if (typeof column === 'string') {
        this.query.orWhere(column, operator as string, value);
      } else {
        this.query.orWhere(column as any, operator as any, value);
      }
    }
    return this;
  }

  /**
   * 添加 whereIn 条件
   *
   * @param column 列名
   * @param values 值数组
   */
  public whereIn(column: string, values: any[]): this {
    this.query.whereIn(column, values);
    return this;
  }

  /**
   * 添加 whereNotIn 条件
   *
   * @param column 列名
   * @param values 值数组
   */
  public whereNotIn(column: string, values: any[]): this {
    this.query.whereNotIn(column, values);
    return this;
  }

  /**
   * 添加 whereBetween 条件
   *
   * @param column 列名
   * @param range 范围
   */
  public whereBetween(column: string, range: [any, any]): this {
    this.query.whereBetween(column, range);
    return this;
  }

  /**
   * 添加 whereNotBetween 条件
   *
   * @param column 列名
   * @param range 范围
   */
  public whereNotBetween(column: string, range: [any, any]): this {
    this.query.whereNotBetween(column, range);
    return this;
  }

  /**
   * 添加 whereNull 条件
   *
   * @param column 列名
   */
  public whereNull(column: string): this {
    this.query.whereNull(column);
    return this;
  }

  /**
   * 添加 whereNotNull 条件
   *
   * @param column 列名
   */
  public whereNotNull(column: string): this {
    this.query.whereNotNull(column);
    return this;
  }

  /**
   * 添加自定义 where 条件
   *
   * @param callback 回调函数
   */
  public whereRaw(sql: string, bindings?: any[]): this {
    this.query.whereRaw(sql, bindings || []);
    return this;
  }

  /**
   * 分组
   *
   * @param columns 列名
   */
  public groupBy(...columns: string[]): this {
    this.query.groupBy(columns);
    return this;
  }

  /**
   * 排序
   *
   * @param column 列名
   * @param direction 排序方向
   */
  public orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.query.orderBy(column, direction);
    return this;
  }

  /**
   * 设置限制
   *
   * @param limit 限制数量
   */
  public limit(limit: number): this {
    this.query.limit(limit);
    return this;
  }

  /**
   * 设置偏移
   *
   * @param offset 偏移数量
   */
  public offset(offset: number): this {
    this.query.offset(offset);
    return this;
  }

  /**
   * 查找记录
   *
   * @param id 主键值
   */
  public async find(id: any): Promise<T | null> {
    if (!this.useCache || !this.cacheService) {
      return this.where(this.modelClass.primaryKey, id).first();
    }

    // 使用缓存
    const modelName = this.modelClass.modelName || this.modelClass.tableName;
    const cacheKey = QueryCache.generateModelCacheKey(modelName, id);

    return this.cacheService.remember<T | null>(
      cacheKey,
      () => this.where(this.modelClass.primaryKey, id).cache(false).first(),
      'model',
      this.cacheTTL
    );
  }

  /**
   * 查找记录，如果不存在则抛出异常
   *
   * @param id 主键值
   */
  public async findOrFail(id: any): Promise<T> {
    const result = await this.find(id);
    if (!result) {
      throw new Error(`记录未找到: ID ${id}`);
    }
    return result;
  }

  /**
   * 获取第一条记录
   */
  public async first(): Promise<T | null> {
    if (!this.useCache || !this.cacheService) {
      const result = await this.query.first();
      return result ? this.hydrateModel(result as Record<string, any>) : null;
    }

    // 使用缓存
    const modelName = this.modelClass.modelName || this.modelClass.tableName;
    const cacheKey = QueryCache.generateCacheKey(this.query, this.options);

    return this.cacheService.remember<T | null>(
      cacheKey,
      async () => {
        const result = await this.query.first();
        return result ? this.hydrateModel(result as Record<string, any>) : null;
      },
      'query',
      this.cacheTTL
    );
  }

  /**
   * 获取多条记录
   */
  public async get(): Promise<T[]> {
    if (!this.useCache || !this.cacheService) {
      const results = await this.query;
      return Array.isArray(results)
        ? results.map((result) =>
            this.hydrateModel(result as Record<string, any>)
          )
        : [];
    }

    // 使用缓存
    const modelName = this.modelClass.modelName || this.modelClass.tableName;
    const cacheKey = QueryCache.generateCollectionCacheKey(
      this.query,
      modelName,
      this.options
    );

    return this.cacheService.remember<T[]>(
      cacheKey,
      async () => {
        const results = await this.query;
        return Array.isArray(results)
          ? results.map((result) =>
              this.hydrateModel(result as Record<string, any>)
            )
          : [];
      },
      'query',
      this.cacheTTL
    );
  }

  /**
   * 获取分页结果
   *
   * @param page 页码
   * @param perPage 每页数量
   */
  public async paginate(
    page: number = 1,
    perPage: number = 15
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
  }> {
    // 计算总数
    const countQuery = this.clone().getQuery();
    const totalResult = await countQuery.count('* as total').first();
    const total = parseInt((totalResult?.total as string) || '0', 10);

    // 获取数据
    const offset = (page - 1) * perPage;
    const results = await this.query.offset(offset).limit(perPage);

    // 计算最后一页
    const lastPage = Math.ceil(total / perPage);

    return {
      data: results.map((result: Record<string, any>) =>
        this.hydrateModel(result)
      ),
      total,
      page,
      perPage,
      lastPage
    };
  }

  /**
   * 获取指定页的分页结果
   *
   * @param perPage 每页数量
   * @param columns 列名
   */
  public async simplePaginate(
    page: number = 1,
    perPage: number = 15
  ): Promise<{ data: T[]; page: number; perPage: number }> {
    const offset = (page - 1) * perPage;
    const results = await this.query.offset(offset).limit(perPage);

    return {
      data: results.map((result: Record<string, any>) =>
        this.hydrateModel(result)
      ),
      page,
      perPage
    };
  }

  /**
   * 计数
   *
   * @param column 列名
   */
  public async count(column: string = '*'): Promise<number> {
    const result = await this.query.count(`${column} as count`).first();
    return parseInt((result?.count as string) || '0', 10);
  }

  /**
   * 最大值
   *
   * @param column 列名
   */
  public async max(column: string): Promise<number | null> {
    const result = await this.query.max(`${column} as max`).first();
    return result?.max === null ? null : parseFloat(result?.max as string);
  }

  /**
   * 最小值
   *
   * @param column 列名
   */
  public async min(column: string): Promise<number | null> {
    const result = await this.query.min(`${column} as min`).first();
    return result?.min === null ? null : parseFloat(result?.min as string);
  }

  /**
   * 平均值
   *
   * @param column 列名
   */
  public async avg(column: string): Promise<number | null> {
    const result = await this.query.avg(`${column} as avg`).first();
    return result?.avg === null ? null : parseFloat(result?.avg as string);
  }

  /**
   * 求和
   *
   * @param column 列名
   */
  public async sum(column: string): Promise<number | null> {
    const result = await this.query.sum(`${column} as sum`).first();
    return result?.sum === null ? null : parseFloat(result?.sum as string);
  }

  /**
   * 插入数据
   *
   * @param data 数据
   */
  public async insert(
    data: Record<string, any> | Record<string, any>[]
  ): Promise<any> {
    // 插入后清除相关缓存
    const result = await this.query.insert(data);

    if (this.cacheService) {
      // 清除模型缓存
      await this.cacheService.clear('model');

      // 清除查询缓存
      await this.cacheService.clear('query');
    }

    return result;
  }

  /**
   * 更新数据
   *
   * @param data 数据
   */
  public async update(data: Record<string, any>): Promise<number> {
    // 更新后清除相关缓存
    const result = await this.query.update(data);

    if (this.cacheService) {
      // 清除模型缓存
      await this.cacheService.clear('model');

      // 清除查询缓存
      await this.cacheService.clear('query');
    }

    return result;
  }

  /**
   * 删除数据
   */
  public async delete(): Promise<number> {
    let result: number;

    if (this.modelClass.softDeletes) {
      // 软删除
      const now = new Date();
      result = await this.update({ [this.modelClass.deletedAtColumn]: now });
    } else {
      // 硬删除
      result = await this.query.delete();

      if (this.cacheService) {
        // 清除模型缓存
        await this.cacheService.clear('model');

        // 清除查询缓存
        await this.cacheService.clear('query');
      }
    }

    return result;
  }

  /**
   * 强制删除数据
   */
  public async forceDelete(): Promise<number> {
    const result = await this.query.delete();

    if (this.cacheService) {
      // 清除模型缓存
      await this.cacheService.clear('model');

      // 清除查询缓存
      await this.cacheService.clear('query');
    }

    return result;
  }

  /**
   * 恢复软删除的数据
   */
  public async restore(): Promise<number> {
    if (!this.modelClass.softDeletes) {
      throw new Error('模型不支持软删除');
    }

    const result = await this.update({
      [this.modelClass.deletedAtColumn]: null
    });

    return result;
  }

  /**
   * 执行原始 SQL 查询
   *
   * @param sql SQL语句
   * @param bindings 绑定参数
   */
  public async raw(sql: string, bindings?: any[]): Promise<any> {
    const knex = this.modelClass.getKnex(this.options.connection);
    return knex.raw(sql, bindings || []);
  }

  /**
   * 将数据行转换为模型实例
   *
   * @param row 数据行
   */
  protected hydrateModel(row: Record<string, any>): T {
    // 创建模型实例
    return new this.modelClass(row) as T;
  }
}

/**
 * 创建查询构建器
 * @param modelClass 模型类
 * @param options 查询选项
 */
export function buildQuery<T>(
  modelClass: ModelStatic<T>,
  options?: QueryOptions
): QueryBuilder<T> {
  return new QueryBuilder<T>(modelClass, options);
}
