// @stratix/database 数据库 API 适配器
// 提供统一的数据库访问接口，支持事务管理和错误处理

import { type AwilixContainer } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import type { Kysely, Transaction } from 'kysely';
import DatabaseManager, {
  setGlobalDatabaseManager
} from '../core/database-manager.js';
import {
  DatabaseErrorHandler,
  DatabaseResult
} from '../utils/error-handler.js';
import { transactionContextManager } from '../utils/transaction-context.js';
/**
 * 数据库操作上下文
 */
export interface DatabaseOperationContext {
  readonly connectionName?: string;
  readonly readonly?: boolean;
  readonly timeout?: number;
  readonly retries?: number;
}

/**
 * 事务上下文
 */
export interface TransactionContext {
  readonly isolationLevel?:
    | 'read uncommitted'
    | 'read committed'
    | 'repeatable read'
    | 'serializable';
  readonly timeout?: number;
}

/**
 * 函数式数据库 API 接口
 */
export interface DatabaseAPI {
  /**
   * 执行单个查询操作
   */
  executeQuery<T>(
    operation: (db: Kysely<any>) => Promise<T>,
    context?: DatabaseOperationContext
  ): Promise<DatabaseResult<T>>;

  /**
   * 执行批量操作
   */
  executeBatch<T>(
    operations: Array<(db: Kysely<any>) => Promise<T>>,
    context?: DatabaseOperationContext
  ): Promise<DatabaseResult<T[]>>;

  /**
   * 执行并行操作
   */
  executeParallel<T>(
    operations: Array<(db: Kysely<any>) => Promise<T>>,
    context?: DatabaseOperationContext
  ): Promise<DatabaseResult<T[]>>;

  /**
   * 执行事务
   */
  transaction<T>(
    operation: (trx: Transaction<any>) => Promise<T>,
    context?: TransactionContext
  ): Promise<DatabaseResult<T>>;

  /**
   * 获取连接（使用 DatabaseManager 预创建的连接）
   */
  getConnection(connectionName?: string): Promise<DatabaseResult<Kysely<any>>>;

  /**
   * 获取读连接（支持读写分离）
   */
  getReadConnection(
    connectionName?: string
  ): Promise<DatabaseResult<Kysely<any>>>;

  /**
   * 获取写连接（支持读写分离）
   */
  getWriteConnection(
    connectionName?: string
  ): Promise<DatabaseResult<Kysely<any>>>;

  /**
   * 健康检查
   */
  healthCheck(connectionName?: string): Promise<DatabaseResult<boolean>>;
}

/**
 * 数据库管理器适配器实现
 * 注册名称：database.manager
 */
export default class ApiAdapter implements DatabaseAPI {
  static adapterName = 'api';
  private databaseManager: DatabaseManager;
  constructor(container: AwilixContainer) {
    console.log(container.registrations);
    this.databaseManager = container.resolve('databaseManager');

    // 设置全局数据库管理器，供BaseRepository使用
    setGlobalDatabaseManager(this.databaseManager);
  }

  /**
   * 执行单个查询操作
   */
  async executeQuery<T>(
    operation: (db: Kysely<any>) => Promise<T>,
    context: DatabaseOperationContext = {}
  ): Promise<DatabaseResult<T>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connectionResult = await this.getConnection(context.connectionName);

      if (isLeft(connectionResult)) {
        throw connectionResult.left;
      }
      const db = connectionResult.right;
      // 设置超时
      if (context.timeout) {
        // 注意：这里简化实现，实际应该设置查询超时
      }

      return await operation(db);
    }, 'database-query-execution');
  }

  /**
   * 执行批量操作
   */
  async executeBatch<T>(
    operations: Array<(db: Kysely<any>) => Promise<T>>,
    context: DatabaseOperationContext = {}
  ): Promise<DatabaseResult<T[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connectionResult = await this.getConnection(context.connectionName);

      if (isLeft(connectionResult)) {
        throw connectionResult.left;
      }

      const db = connectionResult.right;
      const results: T[] = [];

      // 顺序执行批量操作
      for (const operation of operations) {
        const result = await operation(db);
        results.push(result);
      }

      return results;
    }, 'database-batch-execution');
  }

  /**
   * 执行并行操作
   */
  async executeParallel<T>(
    operations: Array<(db: Kysely<any>) => Promise<T>>,
    context: DatabaseOperationContext = {}
  ): Promise<DatabaseResult<T[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connectionResult = await this.getConnection(context.connectionName);

      if (isLeft(connectionResult)) {
        throw connectionResult.left;
      }

      const db = connectionResult.right;

      // 并行执行操作
      const promises = operations.map((operation) => operation(db));
      return await Promise.all(promises);
    }, 'database-parallel-execution');
  }

  /**
   * 执行事务
   * 增强版本：支持无感事务上下文传递
   */
  async transaction<T>(
    operation: (trx: Transaction<any>) => Promise<T>,
    context: TransactionContext = {}
  ): Promise<DatabaseResult<T>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connectionResult = await this.getConnection();

      if (isLeft(connectionResult)) {
        throw connectionResult.left;
      }

      const db = connectionResult.right;

      return await db.transaction().execute(async (trx) => {
        // 设置隔离级别
        if (context.isolationLevel) {
          // 注意：这里简化实现，实际应该设置事务隔离级别
        }

        // 🎯 关键增强：在事务上下文中运行操作
        // 这样Repository层就能自动感知并使用当前事务
        return await transactionContextManager.runInTransaction(
          trx,
          () => operation(trx),
          'default' // 可以根据需要传递连接名称
        );
      });
    }, 'database-transaction-execution');
  }

  /**
   * 获取连接（使用 DatabaseManager 预创建的连接）
   */
  async getConnection(
    connectionName?: string
  ): Promise<DatabaseResult<Kysely<any>>> {
    return await DatabaseErrorHandler.execute(async () => {
      const name = connectionName || 'default';

      // 直接从 DatabaseManager 获取预创建的连接
      const connection = this.databaseManager.getConnection(name);

      return connection;
    }, 'database-connection-retrieval');
  }

  /**
   * 获取读连接（支持读写分离）
   */
  async getReadConnection(
    connectionName?: string
  ): Promise<DatabaseResult<Kysely<any>>> {
    return await DatabaseErrorHandler.execute(async () => {
      const name = connectionName || 'default';

      // 尝试获取专用的读连接，如果不存在则回退到默认连接
      if (this.databaseManager.hasConnection(`${name}-read`)) {
        return this.databaseManager.getConnection(`${name}-read`);
      }

      // 回退到默认连接
      return this.databaseManager.getConnection(name);
    }, 'database-read-connection-retrieval');
  }

  /**
   * 获取写连接（支持读写分离）
   */
  async getWriteConnection(
    connectionName?: string
  ): Promise<DatabaseResult<Kysely<any>>> {
    return await DatabaseErrorHandler.execute(async () => {
      const name = connectionName || 'default';

      // 尝试获取专用的写连接，如果不存在则回退到默认连接
      if (this.databaseManager.hasConnection(`${name}-write`)) {
        return this.databaseManager.getConnection(`${name}-write`);
      }

      // 回退到默认连接
      return this.databaseManager.getConnection(name);
    }, 'database-write-connection-retrieval');
  }

  /**
   * 健康检查
   */
  async healthCheck(connectionName?: string): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const connectionResult = await this.getConnection(connectionName);

      if (isLeft(connectionResult)) {
        return false;
      }

      const db = connectionResult.right;

      // 执行简单的健康检查查询
      await db
        .selectFrom('information_schema.tables' as any)
        .select('table_name')
        .limit(1)
        .execute();

      return true;
    }, 'database-health-check');
  }
}
