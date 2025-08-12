// @stratix/database 函数式仓储基类
// 采用函数式编程模式，支持管道操作和查询组合

import type { Insertable, Kysely, Selectable, Updateable } from 'kysely';

import {
  failure,
  fromNullable,
  mapResult,
  Option,
  Result,
  success
} from '../utils/helpers.js';

import {
  DatabaseErrorHandler,
  DatabaseResult,
  ValidationError
} from '../utils/error-handler.js';

// Logger 接口定义
interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

import type {
  DatabaseAPI,
  DatabaseOperationContext
} from '../adapters/database-api.adapter.js';

/**
 * 仓储连接配置接口
 */
export interface RepositoryConnectionConfig {
  /** 读连接名称，默认为 'default' */
  readonly readConnection?: string;
  /** 写连接名称，默认为 'default' */
  readonly writeConnection?: string;
  /** 默认连接名称，当读写连接未指定时使用 */
  readonly defaultConnection?: string;
  /** 是否启用读写分离，默认为 false */
  readonly enableReadWriteSeparation?: boolean;
}

/**
 * 仓储连接选项 - 支持多种配置方式
 */
export type RepositoryConnectionOptions =
  | string // 简单的连接名称
  | RepositoryConnectionConfig; // 详细的连接配置

/**
 * 解析后的连接配置
 */
export interface ResolvedConnectionConfig {
  readonly readConnectionName: string;
  readonly writeConnectionName: string;
  readonly enableReadWriteSeparation: boolean;
}

/**
 * 连接配置解析工具
 */
export class ConnectionConfigResolver {
  /**
   * 解析连接配置选项
   */
  static resolve(
    options?: RepositoryConnectionOptions
  ): ResolvedConnectionConfig {
    // 如果没有提供配置，使用默认值
    if (!options) {
      return {
        readConnectionName: 'default',
        writeConnectionName: 'default',
        enableReadWriteSeparation: false
      };
    }

    // 如果是字符串，表示使用同一个连接进行读写
    if (typeof options === 'string') {
      return {
        readConnectionName: options,
        writeConnectionName: options,
        enableReadWriteSeparation: false
      };
    }

    // 如果是配置对象，解析详细配置
    const config = options as RepositoryConnectionConfig;
    const defaultConnection = config.defaultConnection || 'default';
    const enableReadWriteSeparation = config.enableReadWriteSeparation || false;

    return {
      readConnectionName: config.readConnection || defaultConnection,
      writeConnectionName: config.writeConnection || defaultConnection,
      enableReadWriteSeparation
    };
  }

  /**
   * 验证连接配置
   */
  static validate(config: ResolvedConnectionConfig): boolean {
    return !!(config.readConnectionName && config.writeConnectionName);
  }
}

/**
 * 查询选项 - 不可变配置
 */
export interface QueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: OrderByClause | OrderByClause[];
  readonly readonly?: boolean;
  readonly timeout?: number;
  readonly connectionName?: string;
}

/**
 * 排序子句
 */
export interface OrderByClause {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  readonly page: number;
  readonly pageSize: number;
  readonly maxPageSize?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  readonly data: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
  readonly metadata?: Record<string, any>;
}

/**
 * 查询构建器上下文
 */
export interface QueryBuilderContext<DB, TB extends keyof DB> {
  readonly db: Kysely<DB>;
  readonly tableName: TB;
  readonly primaryKey: string;
}

/**
 * Where 表达式类型 - 简化版本
 */
export type WhereExpression<DB, TB extends keyof DB> = (qb: any) => any;

/**
 * 简化的查询管道函数类型
 */
export type QueryPipe<DB, TB extends keyof DB, O> = (qb: any) => any;
export type UpdatePipe<DB, TB extends keyof DB> = (qb: any) => any;
export type DeletePipe<DB, TB extends keyof DB> = (qb: any) => any;

/**
 * 查询构建器工厂 - 纯函数式查询构建
 */
export class QueryBuilderFactory {
  /**
   * 创建基础查询
   */
  static createBaseQuery<DB, TB extends keyof DB, O = {}>(
    context: QueryBuilderContext<DB, TB>
  ) {
    return (qb: any) => qb;
  }

  /**
   * 添加 WHERE 条件
   */
  static addWhere<DB, TB extends keyof DB, O = {}>(
    whereExpr: WhereExpression<DB, TB>
  ): QueryPipe<DB, TB, O> {
    return (qb) => whereExpr(qb as any) as any;
  }

  /**
   * 添加排序
   */
  static addOrderBy<DB, TB extends keyof DB, O = {}>(
    orderBy?: OrderByClause | OrderByClause[]
  ): QueryPipe<DB, TB, O> {
    return (qb) => {
      if (!orderBy) return qb;

      const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];

      return clauses.reduce(
        (query, clause) => query.orderBy(clause.field as any, clause.direction),
        qb
      );
    };
  }

  /**
   * 添加分页
   */
  static addPagination<DB, TB extends keyof DB, O = {}>(
    limit?: number,
    offset?: number
  ): QueryPipe<DB, TB, O> {
    return (qb) => {
      let query = qb;
      if (limit !== undefined) query = query.limit(limit);
      if (offset !== undefined) query = query.offset(offset);
      return query;
    };
  }

  /**
   * 添加字段选择
   */
  static selectFields<DB, TB extends keyof DB, O = {}, S = {}>(
    selector: (qb: any) => any
  ) {
    return selector;
  }

  /**
   * 组合查询管道
   */
  static composeQuery<DB, TB extends keyof DB, O = {}>(
    ...pipes: QueryPipe<DB, TB, O>[]
  ): QueryPipe<DB, TB, O> {
    return (qb) => pipes.reduce((query, pipeFn) => pipeFn(query), qb);
  }
}

/**
 * 验证器工厂
 */
export class ValidatorFactory {
  /**
   * 创建必填字段验证器
   */
  static required<T>(field: keyof T, value: any): Result<any, ValidationError> {
    if (value === null || value === undefined || value === '') {
      return failure(
        ValidationError.create(
          `Field '${String(field)}' is required`,
          String(field),
          value
        )
      );
    }
    return success(value);
  }

  /**
   * 创建类型验证器
   */
  static type<T>(
    field: keyof T,
    value: any,
    expectedType: 'string' | 'number' | 'boolean' | 'object'
  ): Result<any, ValidationError> {
    if (typeof value !== expectedType) {
      return failure(
        ValidationError.create(
          `Field '${String(field)}' must be of type ${expectedType}`,
          String(field),
          value
        )
      );
    }
    return success(value);
  }

  /**
   * 创建长度验证器
   */
  static validateLength<T>(
    field: keyof T,
    value: string,
    min?: number,
    max?: number
  ): Result<string, ValidationError> {
    if (min !== undefined && value.length < min) {
      return failure(
        ValidationError.create(
          `Field '${String(field)}' must be at least ${min} characters`,
          String(field),
          value
        )
      );
    }

    if (max !== undefined && value.length > max) {
      return failure(
        ValidationError.create(
          `Field '${String(field)}' must be at most ${max} characters`,
          String(field),
          value
        )
      );
    }

    return success(value);
  }

  /**
   * 组合验证器
   */
  static compose<T>(
    ...validators: Array<(value: T) => Result<T, ValidationError>>
  ): (value: T) => Result<T, ValidationError> {
    return (value: T) => {
      for (const validator of validators) {
        const result = validator(value);
        if (!result.success) {
          return result;
        }
      }
      return success(value);
    };
  }
}

/**
 * 函数式基础仓储接口
 */
export interface IRepository<
  DB,
  TB extends keyof DB & string,
  T = Selectable<DB[TB]>,
  CreateT = Insertable<DB[TB]>,
  UpdateT = Updateable<DB[TB]>
> {
  // 基础查询
  findById(id: string | number): Promise<DatabaseResult<Option<T>>>;
  findOne(
    criteria: WhereExpression<DB, TB>
  ): Promise<DatabaseResult<Option<T>>>;
  findMany(
    criteria?: WhereExpression<DB, TB>,
    options?: QueryOptions
  ): Promise<DatabaseResult<T[]>>;
  findAll(options?: QueryOptions): Promise<DatabaseResult<T[]>>;

  // 基础操作
  create(data: CreateT): Promise<DatabaseResult<T>>;
  createMany(data: CreateT[]): Promise<DatabaseResult<T[]>>;
  update(
    id: string | number,
    data: UpdateT
  ): Promise<DatabaseResult<Option<T>>>;
  updateMany(
    criteria: WhereExpression<DB, TB>,
    data: UpdateT
  ): Promise<DatabaseResult<number>>;
  delete(id: string | number): Promise<DatabaseResult<boolean>>;
  deleteMany(
    criteria: WhereExpression<DB, TB>
  ): Promise<DatabaseResult<number>>;

  // 聚合查询
  count(criteria?: WhereExpression<DB, TB>): Promise<DatabaseResult<number>>;
  exists(criteria: WhereExpression<DB, TB>): Promise<DatabaseResult<boolean>>;

  // 分页查询
  paginate(
    criteria?: WhereExpression<DB, TB>,
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<PaginatedResult<T>>>;

  // 事务支持
  withTransaction<R>(
    fn: (repository: this) => Promise<R>
  ): Promise<DatabaseResult<R>>;
}

/**
 * 函数式基础仓储实现
 */
export abstract class BaseRepository<
  DB,
  TB extends keyof DB & string,
  T = Selectable<DB[TB]>,
  CreateT = Insertable<DB[TB]>,
  UpdateT = Updateable<DB[TB]>
> implements IRepository<DB, TB, T, CreateT, UpdateT>
{
  protected abstract readonly tableName: TB;
  protected readonly primaryKey: string = 'id';
  protected readConnection!: Kysely<DB>;
  protected writeConnection!: Kysely<DB>;
  protected readonly connectionConfig: ResolvedConnectionConfig;
  protected abstract readonly logger: Logger;
  protected abstract readonly databaseApi: DatabaseAPI;

  /**
   * 构造函数 - 根据连接配置自动获取数据库连接
   * @param databaseAPI - 数据库API适配器，用于获取连接和事务操作
   * @param connectionOptions - 连接配置选项
   * @param logger - 日志记录器实例
   */
  constructor(connectionOptions?: RepositoryConnectionOptions) {
    // 解析连接配置
    this.connectionConfig = ConnectionConfigResolver.resolve(connectionOptions);
  }

  async onReady() {
    // 验证连接配置
    if (!ConnectionConfigResolver.validate(this.connectionConfig)) {
      throw new Error('Invalid connection configuration');
    }

    // 异步获取连接
    try {
      // 获取读连接
      const readConnectionResult = await this.databaseApi.getReadConnection(
        this.connectionConfig.readConnectionName
      );
      if (!readConnectionResult.success) {
        throw readConnectionResult.error;
      }
      this.readConnection = readConnectionResult.data;

      // 获取写连接
      const writeConnectionResult = await this.databaseApi.getWriteConnection(
        this.connectionConfig.writeConnectionName
      );
      if (!writeConnectionResult.success) {
        throw writeConnectionResult.error;
      }
      this.writeConnection = writeConnectionResult.data;
    } catch (error) {
      throw new Error(
        `Failed to initialize repository connections: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取查询构建器上下文
   */
  protected getContext(): QueryBuilderContext<DB, TB> {
    return {
      db: this.readConnection!,
      tableName: this.tableName,
      primaryKey: this.primaryKey
    };
  }

  /**
   * 验证创建数据
   */
  protected validateCreateData(
    data: CreateT
  ): Result<CreateT, ValidationError> {
    // 默认实现：直接返回成功
    // 子类可以重写此方法添加具体验证逻辑
    return success(data);
  }

  /**
   * 验证更新数据
   */
  protected validateUpdateData(
    data: UpdateT
  ): Result<UpdateT, ValidationError> {
    // 默认实现：直接返回成功
    // 子类可以重写此方法添加具体验证逻辑
    return success(data);
  }

  /**
   * 根据 ID 查找单条记录
   */
  async findById(id: string | number): Promise<DatabaseResult<Option<T>>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await (this.readConnection as any)
        .selectFrom(this.tableName)
        .selectAll()
        .where(this.primaryKey, '=', id)
        .executeTakeFirst();

      return fromNullable(result as T | undefined) as Option<T>;
    }, 'repository-find-by-id');
  }

  /**
   * 根据条件查找单条记录
   */
  async findOne(
    criteria: WhereExpression<DB, TB>
  ): Promise<DatabaseResult<Option<T>>> {
    return await DatabaseErrorHandler.execute(async () => {
      const baseQuery = (this.readConnection as any)
        .selectFrom(this.tableName)
        .selectAll();
      const query = criteria(baseQuery);
      const result = await query.executeTakeFirst();

      return fromNullable(result as T | undefined) as Option<T>;
    }, 'repository-find-one');
  }

  /**
   * 根据条件查找多条记录
   */
  async findMany(
    criteria?: WhereExpression<DB, TB>,
    options?: QueryOptions
  ): Promise<DatabaseResult<T[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      let query = (this.readConnection as any)
        .selectFrom(this.tableName)
        .selectAll();

      // 应用条件
      if (criteria) {
        query = criteria(query);
      }

      // 应用排序
      if (options?.orderBy) {
        const orderClauses = Array.isArray(options.orderBy)
          ? options.orderBy
          : [options.orderBy];
        for (const clause of orderClauses) {
          query = query.orderBy(clause.field, clause.direction);
        }
      }

      // 应用分页
      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }
      if (options?.offset !== undefined) {
        query = query.offset(options.offset);
      }

      const results = await query.execute();
      return results as T[];
    }, 'repository-find-many');
  }

  /**
   * 查找所有记录
   */
  async findAll(options?: QueryOptions): Promise<DatabaseResult<T[]>> {
    return await this.findMany(undefined, options);
  }

  /**
   * 处理 JSON 字段序列化
   */
  protected processJsonFields(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const processed = { ...data };

    // 遍历所有字段，将对象类型的字段序列化为 JSON 字符串
    for (const [key, value] of Object.entries(processed)) {
      if (value !== null && value !== undefined && typeof value === 'object') {
        // 如果是 Date 对象，保持不变
        if (value instanceof Date) {
          continue;
        }
        // 其他对象类型（包括数组）序列化为 JSON 字符串
        try {
          processed[key] = JSON.stringify(value);
        } catch (error) {
          this.logger.warn(`Failed to serialize field ${key}`, {
            error,
            value
          });
          // 序列化失败时保持原值
        }
      }
    }

    return processed;
  }

  /**
   * 创建单条记录
   */
  async create(data: CreateT): Promise<DatabaseResult<T>> {
    // 验证数据
    const validationResult = this.validateCreateData(data);
    if (!validationResult.success) {
      return failure(validationResult.error);
    }

    return await DatabaseErrorHandler.execute(async () => {
      // 处理 JSON 字段序列化
      const processedData = this.processJsonFields(data);

      // 构建查询
      const query = (this.writeConnection as any)
        .insertInto(this.tableName)
        .values(processedData as any);

      // 打印 SQL 用于调试
      const compiledQuery = query.compile();
      this.logger.debug('Executing CREATE SQL', {
        tableName: this.tableName,
        sql: compiledQuery.sql,
        parameters: compiledQuery.parameters,
        originalData: data,
        processedData: processedData
      });

      const result = await query.executeTakeFirstOrThrow();

      this.logOperation('create', { tableName: this.tableName, data });

      // 简单返回插入结果，不使用 returningAll
      return result as T;
    }, 'repository-create');
  }

  /**
   * 批量创建记录
   */
  async createMany(data: CreateT[]): Promise<DatabaseResult<T[]>> {
    // 验证所有数据
    for (const item of data) {
      const validationResult = this.validateCreateData(item);
      if (!validationResult.success) {
        return failure(validationResult.error);
      }
    }

    const operation = (db: Kysely<DB>) => {
      // 处理所有数据的 JSON 字段序列化
      const processedData = data.map((item) => this.processJsonFields(item));

      const query = db.insertInto(this.tableName).values(processedData as any);

      // 打印 SQL 用于调试
      const compiledQuery = query.compile();
      this.logger.debug('Executing CREATE MANY SQL', {
        tableName: this.tableName,
        sql: compiledQuery.sql,
        parameters: compiledQuery.parameters,
        dataCount: data.length,
        firstOriginalItem: data[0],
        firstProcessedItem: processedData[0]
      });

      return query.execute().then((results) => {
        this.logOperation('createMany', {
          tableName: this.tableName,
          count: data.length
        });
        return results as T[];
      });
    };

    return await this.databaseApi.executeQuery(operation, {
      readonly: false
    });
  }

  /**
   * 更新记录
   */
  async update(
    id: string | number,
    data: UpdateT
  ): Promise<DatabaseResult<Option<T>>> {
    // 验证数据
    const validationResult = this.validateUpdateData(data);
    if (!validationResult.success) {
      return failure(validationResult.error);
    }

    return await DatabaseErrorHandler.execute(async () => {
      // 处理 JSON 字段序列化
      const processedData = this.processJsonFields(data);

      // 构建更新查询
      const query = (this.writeConnection as any)
        .updateTable(this.tableName)
        .set(processedData)
        .where(this.primaryKey, '=', id);

      // 打印 SQL 用于调试
      const compiledQuery = query.compile();
      this.logger.debug('Executing UPDATE SQL', {
        tableName: this.tableName,
        sql: compiledQuery.sql,
        parameters: compiledQuery.parameters,
        id,
        originalData: data,
        processedData: processedData
      });

      const result = await query.executeTakeFirst();

      this.logOperation('update', {
        tableName: this.tableName,
        id,
        updatedRows: result.numUpdatedRows || 0
      });

      // 如果需要返回更新后的记录，需要额外查询
      if (result.numUpdatedRows > 0) {
        const updatedRecord = await (this.readConnection as any)
          .selectFrom(this.tableName)
          .selectAll()
          .where(this.primaryKey, '=', id)
          .executeTakeFirst();
        return fromNullable(updatedRecord as T | undefined) as Option<T>;
      }

      return fromNullable(undefined) as Option<T>;
    }, 'repository-update');
  }

  /**
   * 批量更新记录
   */
  async updateMany(
    criteria: WhereExpression<DB, TB>,
    data: UpdateT
  ): Promise<DatabaseResult<number>> {
    // 验证数据
    const validationResult = this.validateUpdateData(data);
    if (!validationResult.success) {
      return failure(validationResult.error);
    }

    const operation = async (db: Kysely<DB>) => {
      // 处理 JSON 字段序列化
      const processedData = this.processJsonFields(data);

      const updateQuery = (db as any)
        .updateTable(this.tableName)
        .set(processedData);
      const finalQuery = criteria(updateQuery);

      // 打印 SQL 用于调试
      const compiledQuery = finalQuery.compile();
      this.logger.debug('Executing UPDATE MANY SQL', {
        tableName: this.tableName,
        sql: compiledQuery.sql,
        parameters: compiledQuery.parameters,
        originalData: data,
        processedData: processedData
      });

      const result = await finalQuery.execute();
      return Number((result as any).numUpdatedRows || 0);
    };

    return await this.databaseApi.executeQuery(operation, {
      readonly: false
    });
  }

  /**
   * 删除记录
   */
  async delete(id: string | number): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await (this.writeConnection as any)
        .deleteFrom(this.tableName)
        .where(this.primaryKey, '=', id)
        .execute();

      return Number((result as any).numDeletedRows || 0) > 0;
    }, 'repository-delete');
  }

  /**
   * 批量删除记录
   */
  async deleteMany(
    criteria: WhereExpression<DB, TB>
  ): Promise<DatabaseResult<number>> {
    const operation = (db: Kysely<DB>) => {
      const deleteQuery = db.deleteFrom(this.tableName);
      const finalQuery = criteria(deleteQuery as any) as any;

      return finalQuery
        .execute()
        .then((result: any) => Number(result.numDeletedRows || 0));
    };

    return await this.databaseApi.executeQuery(operation, {
      readonly: false
    });
  }

  /**
   * 统计记录数量
   */
  async count(
    criteria?: WhereExpression<DB, TB>
  ): Promise<DatabaseResult<number>> {
    const operation = async (db: Kysely<DB>) => {
      const baseQuery = (db as any)
        .selectFrom(this.tableName)
        .select((eb: any) => eb.fn.count('*').as('count'));

      const finalQuery = criteria ? criteria(baseQuery) : baseQuery;

      const result = await finalQuery.executeTakeFirstOrThrow();
      return Number((result as any).count);
    };

    return await this.databaseApi.executeQuery(operation, {
      readonly: true
    });
  }

  /**
   * 检查记录是否存在
   */
  async exists(
    criteria: WhereExpression<DB, TB>
  ): Promise<DatabaseResult<boolean>> {
    const countResult = await this.count(criteria);
    return mapResult(countResult, (count) => count > 0);
  }

  /**
   * 分页查询记录
   */
  async paginate(
    criteria?: WhereExpression<DB, TB>,
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<PaginatedResult<T>>> {
    const page = pagination?.page || 1;
    const pageSize = Math.min(
      pagination?.pageSize || 10,
      pagination?.maxPageSize || 100
    );
    const offset = (page - 1) * pageSize;

    // 获取总数和数据
    const [totalResult, dataResult] = await Promise.all([
      this.count(criteria),
      this.findMany(criteria, {
        limit: pageSize,
        offset,
        readonly: true
      })
    ]);

    if (!totalResult.success) {
      return failure(totalResult.error);
    }

    if (!dataResult.success) {
      return failure(dataResult.error);
    }

    const total = totalResult.data;
    const data = dataResult.data;
    const totalPages = Math.ceil(total / pageSize);

    const result: PaginatedResult<T> = {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      metadata: {
        offset,
        limit: pageSize
      }
    };

    return success(result);
  }

  /**
   * 在事务中执行操作
   */
  async withTransaction<R>(
    fn: (repository: this) => Promise<R>
  ): Promise<DatabaseResult<R>> {
    return await this.databaseApi.transaction(async (_trx: any) => {
      // 创建事务版本的仓储
      // 注意：这里简化实现，实际应该创建带事务的API实例
      return await fn(this);
    });
  }

  /**
   * 高级查询 - 使用管道模式
   */
  protected async advancedQuery<R>(
    queryBuilder: (db: Kysely<DB>) => Promise<R>,
    options?: DatabaseOperationContext
  ): Promise<DatabaseResult<R>> {
    return await this.databaseApi.executeQuery(queryBuilder, options);
  }

  /**
   * 批量操作
   */
  protected async batchOperations<R>(
    operations: Array<(db: Kysely<DB>) => Promise<R>>,
    options?: DatabaseOperationContext
  ): Promise<DatabaseResult<R[]>> {
    return await this.databaseApi.executeBatch(operations, options);
  }

  /**
   * 并行操作
   */
  protected async parallelOperations<R>(
    operations: Array<(db: Kysely<DB>) => Promise<R>>,
    options?: DatabaseOperationContext
  ): Promise<DatabaseResult<R[]>> {
    return await this.databaseApi.executeParallel(operations, options);
  }

  /**
   * 记录操作日志
   */
  protected logOperation(operation: string, data?: any): void {
    const logData = {
      component: this.constructor.name,
      tableName: this.tableName,
      operation,
      data: data ? this.sanitizeLogData(data) : undefined
    };

    this.logger.debug(`Repository operation: ${operation}`, logData);
  }

  /**
   * 记录错误日志
   */
  protected logError(operation: string, error: Error, data?: any): void {
    const logData = {
      component: this.constructor.name,
      tableName: this.tableName,
      operation,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      data: data ? this.sanitizeLogData(data) : undefined
    };

    this.logger.error(
      `Repository error in ${operation}: ${error.message}`,
      logData
    );
  }

  /**
   * 清理日志数据，移除敏感信息
   */
  private sanitizeLogData(data: any): any {
    if (!data) return data;

    // 如果是对象，递归清理
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};

      for (const [key, value] of Object.entries(data)) {
        // 移除可能的敏感字段
        const sensitiveFields = [
          'password',
          'token',
          'secret',
          'key',
          'auth',
          'credential'
        ];
        const isSensitive = sensitiveFields.some((field) =>
          key.toLowerCase().includes(field)
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeLogData(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return data;
  }
}

/**
 * 查询助手 - 常用查询模式
 */
export class QueryHelpers {
  /**
   * 创建 IN 查询
   */
  static whereIn<DB, TB extends keyof DB>(
    field: string,
    values: any[]
  ): WhereExpression<DB, TB> {
    return (qb) => qb.where(field as any, 'in', values);
  }

  /**
   * 创建范围查询
   */
  static whereBetween<DB, TB extends keyof DB>(
    field: string,
    min: any,
    max: any
  ): WhereExpression<DB, TB> {
    return (qb) =>
      qb.where(field as any, '>=', min).where(field as any, '<=', max);
  }

  /**
   * 创建模糊查询
   */
  static whereLike<DB, TB extends keyof DB>(
    field: string,
    pattern: string
  ): WhereExpression<DB, TB> {
    return (qb) => qb.where(field as any, 'like', `%${pattern}%`);
  }

  /**
   * 创建日期范围查询
   */
  static whereDateRange<DB, TB extends keyof DB>(
    field: string,
    startDate: Date,
    endDate: Date
  ): WhereExpression<DB, TB> {
    return (qb) =>
      qb
        .where(field as any, '>=', startDate)
        .where(field as any, '<=', endDate);
  }

  /**
   * 组合多个条件（AND）
   */
  static and<DB, TB extends keyof DB>(
    ...conditions: WhereExpression<DB, TB>[]
  ): WhereExpression<DB, TB> {
    return (qb) =>
      conditions.reduce((query, condition) => condition(query), qb);
  }

  /**
   * 组合多个条件（OR）
   */
  static or<DB, TB extends keyof DB>(
    ...conditions: WhereExpression<DB, TB>[]
  ): WhereExpression<DB, TB> {
    return (qb) => {
      if (conditions.length === 0) return qb;

      return qb.where((eb: any) => {
        const orConditions = conditions.map(
          (condition) => (subEb: any) => condition(subEb)
        );
        return (eb as any).or(orConditions);
      });
    };
  }
}
