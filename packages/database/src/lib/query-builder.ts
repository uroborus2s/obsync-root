/**
 * 查询构建器
 * 提供链式调用和构建复杂查询
 */

import { Knex } from 'knex';
import { PaginationResult, RelationDefinition } from '../types/index.js';
import { Database } from './database.js';
import { ModelRegistry } from './model-registry.js';

/**
 * 查询构建器类，提供流畅的链式调用API构建查询
 */
export class QueryBuilder<T = any> {
  /**
   * 模型类引用
   */
  private readonly _modelClass: any;

  /**
   * 数据库连接实例
   */
  private readonly _db: Database;

  /**
   * 要预加载的关系
   */
  private _relations: Array<{ name: string; callback?: Function }> = [];

  /**
   * 内部查询构建器
   */
  private _query: Knex.QueryBuilder;

  /**
   * 当前查询使用的事务
   */
  private _transaction?: Knex.Transaction;

  /**
   * 是否已应用软删除过滤
   */
  private _appliedSoftDelete: boolean = false;

  /**
   * 创建查询构建器实例
   * @param modelClass 模型类
   * @param db 数据库连接实例
   * @param transaction 事务对象 (可选)
   */
  constructor(modelClass: any, db: Database, transaction?: Knex.Transaction) {
    this._modelClass = modelClass;
    this._db = db;
    this._transaction = transaction;

    // 获取查询基础
    const tableName = modelClass.tableName;
    this._query = this._getKnexQuery(tableName);

    // 如果模型有软删除功能，自动应用过滤条件
    this._applySoftDeleteFilter();
  }

  /**
   * 获取基础的knex查询构建器
   * @param tableName 表名
   * @returns Knex查询构建器实例
   */
  private _getKnexQuery(tableName: string): Knex.QueryBuilder {
    if (this._transaction) {
      return this._transaction(tableName);
    }
    return this._db.knex(tableName);
  }

  /**
   * 如果模型支持软删除，应用软删除过滤条件
   */
  private _applySoftDeleteFilter(): void {
    if (this._modelClass.softDeletes && !this._appliedSoftDelete) {
      const deletedAtColumn = this._modelClass.deletedAtColumn || 'deleted_at';
      this._query.whereNull(this._prefixColumn(deletedAtColumn));
      this._appliedSoftDelete = true;
    }
  }

  /**
   * 加表名前缀到字段名
   * @param column 字段名
   * @returns 带表名前缀的字段名
   */
  private _prefixColumn(column: string): string {
    if (column.includes('.')) {
      return column;
    }
    return `${this._modelClass.tableName}.${column}`;
  }

  /**
   * 将查询结果转换为模型实例
   * @param results 原始查询结果
   * @returns 模型实例数组
   */
  private async _hydrateModels(results: any[]): Promise<T[]> {
    if (!results.length) {
      return [];
    }

    // 创建模型实例
    const models = results.map((result) => new this._modelClass(result));

    // 加载关系
    if (this._relations.length) {
      await this._loadRelations(models);
    }

    return models;
  }

  /**
   * 加载关系数据
   * @param models 模型实例数组
   */
  private async _loadRelations(models: any[]): Promise<void> {
    if (!models.length || !this._relations.length) {
      return;
    }

    for (const relation of this._relations) {
      await this._loadRelation(models, relation.name, relation.callback);
    }
  }

  /**
   * 加载单个关系
   * @param models 模型实例数组
   * @param relationName 关系名称
   * @param callback 自定义查询回调
   */
  private async _loadRelation(
    models: any[],
    relationName: string,
    callback?: Function
  ): Promise<void> {
    // 获取关系定义
    const relationDef = this._modelClass.relations?.[relationName];

    if (!relationDef) {
      throw new Error(
        `Relation [${relationName}] not defined on model [${this._modelClass.name}].`
      );
    }

    // 根据关系类型加载数据
    switch (relationDef.type) {
      case 'hasOne':
        await this._loadHasOneRelation(
          models,
          relationName,
          relationDef,
          callback
        );
        break;
      case 'hasMany':
        await this._loadHasManyRelation(
          models,
          relationName,
          relationDef,
          callback
        );
        break;
      case 'belongsTo':
        await this._loadBelongsToRelation(
          models,
          relationName,
          relationDef,
          callback
        );
        break;
      case 'belongsToMany':
        await this._loadBelongsToManyRelation(
          models,
          relationName,
          relationDef,
          callback
        );
        break;
      default:
        throw new Error(
          `Unknown relation type [${relationDef.type}] for relation [${relationName}].`
        );
    }
  }

  /**
   * 加载一对一关系
   * @param models 模型实例数组
   * @param relationName 关系名称
   * @param relationDef 关系定义
   * @param callback 自定义查询回调
   */
  private async _loadHasOneRelation(
    models: any[],
    relationName: string,
    relationDef: RelationDefinition,
    callback?: Function
  ): Promise<void> {
    const relatedModel = ModelRegistry.getModel(relationDef.model);
    const localKey =
      relationDef.localKey || this._modelClass.primaryKey || 'id';
    const foreignKey =
      relationDef.foreignKey || `${this._modelClass.tableName.slice(0, -1)}_id`;

    // 获取所有父模型的ID
    const parentIds = [
      ...new Set(models.map((model) => model[localKey]))
    ].filter(Boolean);

    if (!parentIds.length) {
      // 如果没有父ID，将关系设置为null
      models.forEach((model) => {
        model._relations[relationName] = null;
      });
      return;
    }

    // 构建关联查询
    let query = new QueryBuilder(
      relatedModel,
      this._db,
      this._transaction
    ).whereIn(foreignKey, parentIds);

    // 应用自定义查询条件
    if (callback && typeof callback === 'function') {
      callback(query);
    }

    // 执行查询
    const relatedModels = await query.get();

    // 将关联模型分配给父模型
    const relationMap = new Map();
    relatedModels.forEach((related) => {
      relationMap.set(related[foreignKey], related);
    });

    models.forEach((model) => {
      model._relations[relationName] = relationMap.get(model[localKey]) || null;
    });
  }

  /**
   * 加载一对多关系
   * @param models 模型实例数组
   * @param relationName 关系名称
   * @param relationDef 关系定义
   * @param callback 自定义查询回调
   */
  private async _loadHasManyRelation(
    models: any[],
    relationName: string,
    relationDef: RelationDefinition,
    callback?: Function
  ): Promise<void> {
    const relatedModel = ModelRegistry.getModel(relationDef.model);
    const localKey =
      relationDef.localKey || this._modelClass.primaryKey || 'id';
    const foreignKey =
      relationDef.foreignKey || `${this._modelClass.tableName.slice(0, -1)}_id`;

    // 获取所有父模型的ID
    const parentIds = [
      ...new Set(models.map((model) => model[localKey]))
    ].filter(Boolean);

    if (!parentIds.length) {
      // 如果没有父ID，将关系设置为空数组
      models.forEach((model) => {
        model._relations[relationName] = [];
      });
      return;
    }

    // 构建关联查询
    let query = new QueryBuilder(
      relatedModel,
      this._db,
      this._transaction
    ).whereIn(foreignKey, parentIds);

    // 应用自定义查询条件
    if (callback && typeof callback === 'function') {
      callback(query);
    }

    // 执行查询
    const relatedModels = await query.get();

    // 将关联模型分配给父模型
    const relationMap = new Map();
    parentIds.forEach((id) => {
      relationMap.set(id, []);
    });

    relatedModels.forEach((related) => {
      const relatedParentId = related[foreignKey];
      if (relationMap.has(relatedParentId)) {
        relationMap.get(relatedParentId).push(related);
      }
    });

    models.forEach((model) => {
      model._relations[relationName] = relationMap.get(model[localKey]) || [];
    });
  }

  /**
   * 加载属于关系
   * @param models 模型实例数组
   * @param relationName 关系名称
   * @param relationDef 关系定义
   * @param callback 自定义查询回调
   */
  private async _loadBelongsToRelation(
    models: any[],
    relationName: string,
    relationDef: RelationDefinition,
    callback?: Function
  ): Promise<void> {
    const relatedModel = ModelRegistry.getModel(relationDef.model);
    const foreignKey =
      relationDef.foreignKey || `${relationDef.model.toLowerCase()}_id`;
    const localKey = relationDef.localKey || 'id';

    // 获取所有外键值
    const foreignKeyValues = [
      ...new Set(models.map((model) => model[foreignKey]))
    ].filter(Boolean);

    if (!foreignKeyValues.length) {
      // 如果没有外键值，将关系设置为null
      models.forEach((model) => {
        model._relations[relationName] = null;
      });
      return;
    }

    // 构建关联查询
    let query = new QueryBuilder(
      relatedModel,
      this._db,
      this._transaction
    ).whereIn(localKey, foreignKeyValues);

    // 应用自定义查询条件
    if (callback && typeof callback === 'function') {
      callback(query);
    }

    // 执行查询
    const relatedModels = await query.get();

    // 将关联模型分配给父模型
    const relationMap = new Map();
    relatedModels.forEach((related) => {
      relationMap.set(related[localKey], related);
    });

    models.forEach((model) => {
      model._relations[relationName] =
        relationMap.get(model[foreignKey]) || null;
    });
  }

  /**
   * 加载多对多关系
   * @param models 模型实例数组
   * @param relationName 关系名称
   * @param relationDef 关系定义
   * @param callback 自定义查询回调
   */
  private async _loadBelongsToManyRelation(
    models: any[],
    relationName: string,
    relationDef: any,
    callback?: Function
  ): Promise<void> {
    const relatedModel = ModelRegistry.getModel(relationDef.model);
    const pivotTable = relationDef.through;
    const foreignKey = relationDef.foreignKey;
    const otherKey = relationDef.otherKey;
    const localKey = this._modelClass.primaryKey || 'id';

    // 获取所有父模型的ID
    const parentIds = [
      ...new Set(models.map((model) => model[localKey]))
    ].filter(Boolean);

    if (!parentIds.length) {
      // 如果没有父ID，将关系设置为空数组
      models.forEach((model) => {
        model._relations[relationName] = [];
      });
      return;
    }

    // 获取中间表数据
    const pivotData = await this._db
      .knex(pivotTable)
      .select(
        `${pivotTable}.${foreignKey}`,
        `${pivotTable}.${otherKey}`,
        ...(relationDef.pivotFields || []).map((f) => `${pivotTable}.${f}`)
      )
      .whereIn(`${pivotTable}.${foreignKey}`, parentIds);

    if (!pivotData.length) {
      models.forEach((model) => {
        model._relations[relationName] = [];
      });
      return;
    }

    // 获取关联模型ID
    const relatedIds = [...new Set(pivotData.map((pivot) => pivot[otherKey]))];

    // 构建关联查询
    let query = new QueryBuilder(
      relatedModel,
      this._db,
      this._transaction
    ).whereIn(relatedModel.primaryKey || 'id', relatedIds);

    // 应用自定义查询条件
    if (callback && typeof callback === 'function') {
      callback(query);
    }

    // 执行查询
    const relatedModels = await query.get();

    // 创建关联模型映射
    const relatedMap = new Map();
    relatedModels.forEach((related) => {
      relatedMap.set(related[relatedModel.primaryKey || 'id'], related);
    });

    // 为每个父模型创建关联集合
    const relationMap = new Map();
    parentIds.forEach((id) => {
      relationMap.set(id, []);
    });

    // 填充关联集合
    pivotData.forEach((pivot) => {
      const related = relatedMap.get(pivot[otherKey]);
      if (related) {
        // 添加中间表数据
        if (relationDef.pivotFields && relationDef.pivotFields.length) {
          related.pivot = {};
          relationDef.pivotFields.forEach((field) => {
            related.pivot[field] = pivot[field];
          });
        }

        const collection = relationMap.get(pivot[foreignKey]);
        if (collection) {
          collection.push(related);
        }
      }
    });

    // 将关联集合分配给父模型
    models.forEach((model) => {
      model._relations[relationName] = relationMap.get(model[localKey]) || [];
    });
  }

  /**
   * 添加查询条件
   * @param column 字段名
   * @param operator 操作符或值
   * @param value 值
   */
  public where(column: string, operator: any, value?: any): this {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }

    this._query.where(column, operator, value);
    return this;
  }

  /**
   * 添加OR查询条件
   * @param column 字段名
   * @param operator 操作符或值
   * @param value 值
   */
  public orWhere(column: string, operator: any, value?: any): this {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }

    this._query.orWhere(column, operator, value);
    return this;
  }

  /**
   * 添加WHERE IN查询条件
   * @param column 字段名
   * @param values 值数组
   */
  public whereIn(column: string, values: any[]): this {
    this._query.whereIn(column, values);
    return this;
  }

  /**
   * 添加WHERE NOT IN查询条件
   * @param column 字段名
   * @param values 值数组
   */
  public whereNotIn(column: string, values: any[]): this {
    this._query.whereNotIn(column, values);
    return this;
  }

  /**
   * 添加查询条件为NULL
   * @param column 字段名
   */
  public whereNull(column: string): this {
    this._query.whereNull(column);
    return this;
  }

  /**
   * 添加查询条件不为NULL
   * @param column 字段名
   */
  public whereNotNull(column: string): this {
    this._query.whereNotNull(column);
    return this;
  }

  /**
   * 添加日期查询条件
   * @param column 字段名
   * @param operator 操作符或值
   * @param value 值
   */
  public whereDate(column: string, operator: any, value?: any): this {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }

    this._query.whereRaw(`DATE(${column}) ${operator} ?`, [value]);
    return this;
  }

  /**
   * 添加原始SQL查询条件
   * @param sql 原始SQL
   * @param bindings 绑定参数
   */
  public whereRaw(sql: string, bindings?: any[]): this {
    this._query.whereRaw(sql, bindings);
    return this;
  }

  /**
   * 按字段排序
   * @param column 字段名
   * @param direction 排序方向，默认为'asc'
   */
  public orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    this._query.orderBy(column, direction);
    return this;
  }

  /**
   * 随机排序
   */
  public orderByRandom(): this {
    // 根据数据库类型使用不同的随机函数
    const knex = this._db.knex;
    const client = knex.client.constructor.name.toLowerCase();

    if (client.includes('postgres')) {
      this._query.orderByRaw('RANDOM()');
    } else if (client.includes('mysql') || client.includes('maria')) {
      this._query.orderByRaw('RAND()');
    } else if (client.includes('sqlite')) {
      this._query.orderByRaw('RANDOM()');
    } else if (client.includes('mssql')) {
      this._query.orderByRaw('NEWID()');
    } else {
      // 默认使用RANDOM()
      this._query.orderByRaw('RANDOM()');
    }

    return this;
  }

  /**
   * 设置分组
   * @param columns 字段名数组或单个字段名
   */
  public groupBy(columns: string | string[]): this {
    this._query.groupBy(columns);
    return this;
  }

  /**
   * 设置HAVING条件
   * @param column 字段名
   * @param operator 操作符或值
   * @param value 值
   */
  public having(column: string, operator: any, value?: any): this {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }

    this._query.having(column, operator, value);
    return this;
  }

  /**
   * 限制结果数量
   * @param limit 限制数量
   */
  public limit(limit: number): this {
    this._query.limit(limit);
    return this;
  }

  /**
   * 设置结果偏移量
   * @param offset 偏移量
   */
  public offset(offset: number): this {
    this._query.offset(offset);
    return this;
  }

  /**
   * 选择特定字段
   * @param columns 字段名数组或单个字段名
   */
  public select(...columns: string[]): this {
    this._query.select(...columns);
    return this;
  }

  /**
   * 添加表连接
   * @param table 连接表名
   * @param first 第一个连接字段
   * @param operator 连接操作符
   * @param second 第二个连接字段
   */
  public join(
    table: string,
    first: string,
    operator: string,
    second: string
  ): this {
    this._query.join(table, first, operator, second);
    return this;
  }

  /**
   * 添加左外连接
   * @param table 连接表名
   * @param first 第一个连接字段
   * @param operator 连接操作符
   * @param second 第二个连接字段
   */
  public leftJoin(
    table: string,
    first: string,
    operator: string,
    second: string
  ): this {
    this._query.leftJoin(table, first, operator, second);
    return this;
  }

  /**
   * 添加右外连接
   * @param table 连接表名
   * @param first 第一个连接字段
   * @param operator 连接操作符
   * @param second 第二个连接字段
   */
  public rightJoin(
    table: string,
    first: string,
    operator: string,
    second: string
  ): this {
    this._query.rightJoin(table, first, operator, second);
    return this;
  }

  /**
   * 预加载关系
   * @param relation 关系名称
   * @param callback 自定义关系查询回调
   */
  public with(relation: string, callback?: Function): this {
    this._relations.push({ name: relation, callback });
    return this;
  }

  /**
   * 获取不带关系的SQL查询语句
   * @returns SQL查询字符串
   */
  public toSql(): string {
    return this._query.toSQL().sql;
  }

  /**
   * 获取查询结果
   * @returns 查询结果作为模型实例数组
   */
  public async get(): Promise<T[]> {
    const results = await this._query;
    return this._hydrateModels(results);
  }

  /**
   * 获取第一个查询结果
   * @returns 第一个查询结果作为模型实例，如果没有结果则返回null
   */
  public async first(): Promise<T | null> {
    this.limit(1);
    const results = await this.get();
    return results.length ? results[0] : null;
  }

  /**
   * 获取单个值
   * @param column 字段名
   * @returns 字段值
   */
  public async value<V = any>(column: string): Promise<V | null> {
    this.select(column).limit(1);
    const result = await this._query.first();
    return result ? result[column] : null;
  }

  /**
   * 获取单列值数组
   * @param column 字段名
   * @returns 字段值数组
   */
  public async pluck<V = any>(column: string): Promise<V[]> {
    this.select(column);
    const results = await this._query;
    return results.map((result) => result[column]);
  }

  /**
   * 计数查询
   * @param column 计数字段，默认为'*'
   * @returns 计数结果
   */
  public async count(column: string = '*'): Promise<number> {
    const result = await this._query.count({ count: column }).first();
    return parseInt(result?.count || '0', 10);
  }

  /**
   * 求和查询
   * @param column 求和字段
   * @returns 求和结果
   */
  public async sum(column: string): Promise<number> {
    const result = await this._query.sum({ sum: column }).first();
    return parseFloat(result?.sum || '0');
  }

  /**
   * 平均值查询
   * @param column 平均值字段
   * @returns 平均值结果
   */
  public async avg(column: string): Promise<number> {
    const result = await this._query.avg({ avg: column }).first();
    return parseFloat(result?.avg || '0');
  }

  /**
   * 最小值查询
   * @param column 最小值字段
   * @returns 最小值结果
   */
  public async min<V = any>(column: string): Promise<V | null> {
    const result = await this._query.min({ min: column }).first();
    return result?.min || null;
  }

  /**
   * 最大值查询
   * @param column 最大值字段
   * @returns 最大值结果
   */
  public async max<V = any>(column: string): Promise<V | null> {
    const result = await this._query.max({ max: column }).first();
    return result?.max || null;
  }

  /**
   * 分页查询
   * @param page 页码
   * @param perPage 每页记录数
   * @returns 分页结果
   */
  public async paginate(
    page: number = 1,
    perPage: number = 15
  ): Promise<PaginationResult<T>> {
    // 保存原始查询以获取总数
    const countQuery = this._query.clone();

    // 获取总记录数
    const total = await this.count();

    // 应用分页
    this.limit(perPage).offset((page - 1) * perPage);

    // 执行查询
    const data = await this.get();

    // 计算分页信息
    const lastPage = Math.max(Math.ceil(total / perPage), 1);
    const from = total > 0 ? (page - 1) * perPage + 1 : null;
    const to = total > 0 ? Math.min(page * perPage, total) : null;

    return {
      data,
      total,
      perPage,
      currentPage: page,
      lastPage,
      hasMorePages: page < lastPage,
      from,
      to
    };
  }

  /**
   * 获取随机记录
   * @param limit 限制数量
   * @returns 随机记录
   */
  public async random(limit: number = 1): Promise<T[]> {
    this.orderByRandom().limit(limit);
    return this.get();
  }

  /**
   * 跳过软删除过滤器
   * @returns 查询构建器实例
   */
  public withTrashed(): this {
    if (this._modelClass.softDeletes && this._appliedSoftDelete) {
      this._query = this._getKnexQuery(this._modelClass.tableName);
      this._appliedSoftDelete = false;
    }
    return this;
  }

  /**
   * 仅查询已软删除的记录
   * @returns 查询构建器实例
   */
  public onlyTrashed(): this {
    if (this._modelClass.softDeletes) {
      const deletedAtColumn = this._modelClass.deletedAtColumn || 'deleted_at';
      this._query = this._getKnexQuery(this._modelClass.tableName).whereNotNull(
        this._prefixColumn(deletedAtColumn)
      );
      this._appliedSoftDelete = false;
    }
    return this;
  }

  /**
   * 插入记录
   * @param data 要插入的数据
   * @returns 插入的ID
   */
  public async insert(
    data: Partial<T> | Partial<T>[]
  ): Promise<number[] | number> {
    return this._query.insert(data);
  }

  /**
   * 更新记录
   * @param data 要更新的数据
   * @returns 影响的行数
   */
  public async update(data: Partial<T>): Promise<number> {
    return this._query.update(data);
  }

  /**
   * 删除记录
   * @returns 影响的行数
   */
  public async delete(): Promise<number> {
    // 如果是软删除模型，执行软删除
    if (this._modelClass.softDeletes) {
      const deletedAtColumn = this._modelClass.deletedAtColumn || 'deleted_at';
      return this._query.update({
        [deletedAtColumn]: new Date()
      });
    }

    // 物理删除
    return this._query.delete();
  }

  /**
   * 强制删除记录(即使启用了软删除)
   * @returns 影响的行数
   */
  public async forceDelete(): Promise<number> {
    // 无论是否启用软删除，都执行物理删除
    return this._query.delete();
  }

  /**
   * 恢复软删除的记录
   * @returns 影响的行数
   */
  public async restore(): Promise<number> {
    if (!this._modelClass.softDeletes) {
      throw new Error('Model does not use soft deletes.');
    }

    const deletedAtColumn = this._modelClass.deletedAtColumn || 'deleted_at';
    return this._query.update({
      [deletedAtColumn]: null
    });
  }
}
