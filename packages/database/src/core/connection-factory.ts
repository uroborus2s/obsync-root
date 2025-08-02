// @stratix/database 连接工厂实现
// 负责创建和管理数据库连接的工厂类

import { Logger, RESOLVER } from '@stratix/core';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type {
  ConnectionConfig,
  ConnectionFactoryOptions,
  DatabaseType
} from '../types/index.js';
import {
  ConnectionError,
  DatabaseErrorHandler,
  DatabaseResult
} from '../utils/error-handler.js';
import { failureResult, successResult } from '../utils/helpers.js';
import { BaseDialect } from './dialects/base-dialect.js';
import {
  DialectRegistry,
  getDialect,
  isSupportedDatabaseType
} from './dialects/index.js';

/**
 * 连接工厂接口
 */
export interface IConnectionFactory {
  /**
   * 创建数据库连接
   */
  createConnection(
    config: ConnectionConfig
  ): Promise<DatabaseResult<Kysely<any>>>;

  /**
   * 测试连接
   */
  testConnection(config: ConnectionConfig): Promise<DatabaseResult<boolean>>;

  /**
   * 获取支持的数据库类型
   */
  getSupportedTypes(): DatabaseType[];

  /**
   * 检查数据库类型是否支持
   */
  isSupported(type: DatabaseType): boolean;

  /**
   * 验证连接配置
   */
  validateConfig(config: ConnectionConfig): DatabaseResult<boolean>;

  /**
   * 检查驱动依赖
   */
  checkDriverAvailability(type: DatabaseType): Promise<DatabaseResult<boolean>>;

  /**
   * 销毁连接
   */
  destroyConnection(connection: Kysely<any>): Promise<DatabaseResult<void>>;
}

/**
 * 连接工厂实现
 *
 * 依赖注入配置：
 * - 使用 Awilix CLASSIC 注入模式 (与 @stratix/core 保持一致)
 * - SINGLETON 生命周期，全局共享实例
 * - 支持从插件配置中获取 ConnectionFactory 选项
 */
export default class ConnectionFactory implements IConnectionFactory {
  /**
   * Awilix 内联解析器配置
   * 从插件配置中提取 ConnectionFactory 选项
   */
  static [RESOLVER] = {
    injector: (container: any) => {
      // 从插件配置中提取 ConnectionFactory 选项
      const config = container.resolve('config');
      const options = config.connection || {};
      return { options };
    }
  };

  private readonly options: ConnectionFactoryOptions;
  private readonly connectionCache = new Map<string, Kysely<any>>();

  /**
   * 构造函数 - 使用 Awilix CLASSIC 注入模式
   * 接受从插件配置中注入的 options 参数
   */
  constructor(
    options: ConnectionFactoryOptions = {},
    private logger: Logger
  ) {
    this.options = {
      autoReconnect: false,
      reconnectInterval: 5000,
      maxReconnectAttempts: 3,
      connectionTestInterval: 30000,
      testOnCreate: true,
      testOnAcquire: false,
      ...options
    };
  }

  /**
   * 创建数据库连接
   */
  async createConnection(
    config: ConnectionConfig
  ): Promise<DatabaseResult<Kysely<any>>> {
    const createOperation = async (): Promise<Kysely<any>> => {
      // 验证配置
      const configResult = this.validateConfig(config);
      if (!configResult.success) {
        throw new Error(
          configResult.error?.message || 'Configuration validation failed'
        );
      }

      // 获取或创建方言实例
      const dialect = await this.getDialect(config.type);

      // 使用方言实例检查驱动可用性
      const driverResult = await dialect.checkDriverAvailability();
      if (!driverResult.success) {
        throw new Error(
          driverResult.error?.message || 'Driver availability check failed'
        );
      }

      // 创建连接
      const connectionResult = await dialect.createKysely(config, this.logger);
      if (!connectionResult.success) {
        throw connectionResult.error;
      }

      const connection = connectionResult.data;

      // 可选：测试连接
      if (this.options.testOnCreate) {
        const testResult = await this.testConnectionInternal(
          connection,
          dialect
        );
        if (!testResult.success) {
          await connection.destroy();
          throw testResult.error;
        }
      }

      // 缓存连接（如果有唯一标识符）
      const cacheKey = this.generateCacheKey(config);
      if (cacheKey) {
        this.connectionCache.set(cacheKey, connection);
      }

      return connection;
    };

    return await DatabaseErrorHandler.execute(
      createOperation,
      `create-connection:${config.type}`
    );
  }

  /**
   * 测试连接
   */
  async testConnection(
    config: ConnectionConfig
  ): Promise<DatabaseResult<boolean>> {
    const testOperation = async (): Promise<boolean> => {
      // 验证配置
      const configResult = this.validateConfig(config);
      if (!configResult.success) {
        throw new Error(
          configResult.error?.message || 'Configuration validation failed'
        );
      }

      // 获取方言实例
      const dialect = await this.getDialect(config.type);

      // 使用方言的测试连接方法
      const testResult = await dialect.testConnection(config, this.logger);
      if (!testResult.success) {
        throw testResult.error;
      }

      return testResult.data;
    };

    return await DatabaseErrorHandler.execute(
      testOperation,
      `test-connection:${config.type}`
    );
  }

  /**
   * 获取支持的数据库类型
   */
  getSupportedTypes(): DatabaseType[] {
    return DialectRegistry.getSupportedTypes();
  }

  /**
   * 检查数据库类型是否支持
   */
  isSupported(type: DatabaseType): boolean {
    return DialectRegistry.isSupported(type);
  }

  /**
   * 验证连接配置
   */
  validateConfig(config: ConnectionConfig): DatabaseResult<boolean> {
    try {
      // 基础验证
      if (!config) {
        throw new Error('Connection config is required');
      }

      if (!config.type) {
        throw new Error('Database type is required');
      }

      if (!isSupportedDatabaseType(config.type)) {
        throw new Error(`Unsupported database type: ${config.type}`);
      }

      // 基础验证通过，方言验证需要在运行时进行
      return successResult(true);
    } catch (error) {
      return failureResult(
        ConnectionError.create(
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  /**
   * 检查驱动依赖
   */
  async checkDriverAvailability(
    type: DatabaseType
  ): Promise<DatabaseResult<boolean>> {
    try {
      if (!isSupportedDatabaseType(type)) {
        throw new Error(`Unsupported database type: ${type}`);
      }

      // 获取方言实例并检查驱动可用性
      const dialect = await this.getDialect(type);
      return dialect.checkDriverAvailability();
    } catch (error) {
      return failureResult(
        ConnectionError.create(
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  /**
   * 销毁连接
   */
  async destroyConnection(
    connection: Kysely<any>
  ): Promise<DatabaseResult<void>> {
    const destroyOperation = async (): Promise<void> => {
      if (!connection) {
        throw new Error('Connection is required');
      }

      await connection.destroy();

      // 从缓存中移除
      for (const [key, cachedConnection] of this.connectionCache.entries()) {
        if (cachedConnection === connection) {
          this.connectionCache.delete(key);
          break;
        }
      }
    };

    return await DatabaseErrorHandler.execute(
      destroyOperation,
      'destroy-connection'
    );
  }

  /**
   * 批量创建连接
   */
  async createConnections(
    configs: ConnectionConfig[]
  ): Promise<DatabaseResult<Kysely<any>[]>> {
    const batchCreateOperation = async (): Promise<Kysely<any>[]> => {
      const connections: Kysely<any>[] = [];
      const errors: Error[] = [];

      for (const config of configs) {
        try {
          const result = await this.createConnection(config);
          if (result.success) {
            connections.push(result.data);
          } else {
            errors.push(
              result.error instanceof Error
                ? result.error
                : new Error(String(result.error))
            );
          }
        } catch (error) {
          errors.push(error as Error);
        }
      }

      if (errors.length > 0) {
        // 清理已创建的连接
        for (const connection of connections) {
          try {
            await connection.destroy();
          } catch {
            // 忽略清理错误
          }
        }
        throw new Error(
          `Failed to create ${errors.length} connections: ${errors.map((e) => e.message).join(', ')}`
        );
      }

      return connections;
    };

    return await DatabaseErrorHandler.execute(
      batchCreateOperation,
      'batch-create-connections'
    );
  }

  /**
   * 批量测试连接
   */
  async testConnections(
    configs: ConnectionConfig[]
  ): Promise<DatabaseResult<boolean[]>> {
    const batchTestOperation = async (): Promise<boolean[]> => {
      const results: boolean[] = [];

      for (const config of configs) {
        const result = await this.testConnection(config);
        results.push(result.success ? result.data : false);
      }

      return results;
    };

    return await DatabaseErrorHandler.execute(
      batchTestOperation,
      'batch-test-connections'
    );
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<void> {
    for (const connection of this.connectionCache.values()) {
      try {
        await connection.destroy();
      } catch {
        // 忽略错误
      }
    }
    this.connectionCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.connectionCache.size,
      keys: Array.from(this.connectionCache.keys())
    };
  }

  /**
   * 获取方言实例
   */
  private async getDialect(type: DatabaseType) {
    let dialect = DialectRegistry.get(type);

    if (!dialect) {
      // 如果注册表中没有，尝试创建新实例
      dialect = await getDialect(type);
      DialectRegistry.register(dialect);
    }

    return dialect;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(config: ConnectionConfig): string | null {
    if (config.connectionString) {
      return `${config.type}:${config.connectionString}`;
    }

    if (config.host && config.database) {
      return `${config.type}:${config.host}:${config.port || 'default'}:${config.database}`;
    }

    if (config.type === 'sqlite' && config.database) {
      return `${config.type}:${config.database}`;
    }

    return null;
  }

  /**
   * 内部测试连接方法
   */
  private async testConnectionInternal(
    connection: Kysely<any>,
    dialect: BaseDialect
  ): Promise<DatabaseResult<boolean>> {
    const testOperation = async (): Promise<boolean> => {
      const healthQuery = dialect.getHealthCheckQuery();
      // 使用Kysely的sql模板执行查询
      await sql.raw(healthQuery).execute(connection);
      return true;
    };

    return await DatabaseErrorHandler.execute(
      testOperation,
      `test-connection-internal:${dialect.type}`
    );
  }
}
