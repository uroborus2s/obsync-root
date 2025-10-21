// @stratix/database MySQL方言实现
// 基于Kysely和mysql2驱动的MySQL数据库支持

import { type Logger } from '@stratix/core';
import {
  eitherChain,
  eitherMap,
  isLeft,
  tryCatch
} from '@stratix/utils/functional';
import { Kysely, MysqlDialect } from 'kysely';
import { createPool, PoolOptions } from 'mysql2';
import type { ConnectionConfig, DatabaseType } from '../../types/index.js';
import { DatabaseResult } from '../../utils/error-handler.js';
import { BaseDialect } from './base-dialect.js';
/**
 * MySQL数据库方言实现
 */
export class MySQLDialect extends BaseDialect {
  readonly type: DatabaseType = 'mysql';
  readonly defaultPort: number = 3306;

  /**
   * 创建 Kysely 实例
   */
  async createKysely(
    config: ConnectionConfig,
    logger: Logger
  ): Promise<DatabaseResult<Kysely<any>>> {
    return this.wrapConnectionCreation(async () => {
      // 验证配置
      const configResult = this.validateConfig(config);
      if (isLeft(configResult)) {
        throw new Error(
          configResult.left?.message || 'Configuration validation failed'
        );
      }

      // 检查mysql2驱动是否可用
      const driverResult = await this.checkDriverAvailability();
      if (isLeft(driverResult)) {
        throw new Error(
          driverResult.left?.message || 'Driver availability check failed'
        );
      }

      // 创建连接池
      const poolOptions = this.createPoolOptions(config);
      const pool = createPool(poolOptions);

      // 创建Kysely实例
      const kysely = new Kysely({
        dialect: new MysqlDialect({
          pool: pool
        }),
        log: this.createDatabaseLogger(logger, 'MySQL')
      });

      // 测试连接
      try {
        // 测试连接 - 暂时跳过查询
        // TODO: 实现MySQL特定的健康检查
      } catch (error) {
        await kysely.destroy();
        throw this.handleConnectionError(error as Error);
      }

      return kysely;
    }, 'create-connection');
  }

  /**
   * 验证配置
   */
  validateConfig(config: ConnectionConfig): DatabaseResult<boolean> {
    // 基础验证
    const baseResult = this.validateBaseConfig(config);
    const onSuccess = () => {
      // MySQL特定验证
      if (!config.connectionString) {
        if (!config.host) {
          throw new Error('Host is required for MySQL connections');
        }

        if (!config.username) {
          throw new Error('Username is required for MySQL connections');
        }

        if (!config.database) {
          throw new Error('Database name is required for MySQL connections');
        }
      }

      // 验证SSL配置
      if (config.ssl && config.ssl.mode) {
        const validModes = [
          'DISABLED',
          'PREFERRED',
          'REQUIRED',
          'VERIFY_CA',
          'VERIFY_IDENTITY'
        ];
        if (!validModes.includes(config.ssl.mode.toUpperCase())) {
          throw new Error(`Invalid SSL mode for MySQL: ${config.ssl.mode}`);
        }
      }

      return true;
    };
    const onFailure = (error: unknown) =>
      this.handleConnectionError(error as Error);

    return eitherChain(() => tryCatch(onSuccess, onFailure))(baseResult as any);
  }

  /**
   * 获取健康检查查询
   */
  getHealthCheckQuery(): string {
    return 'SELECT 1 as health';
  }

  /**
   * 检查驱动依赖是否可用
   */
  async checkDriverAvailability(): Promise<DatabaseResult<boolean>> {
    const mysql2Result = await this.checkRequiredModule('mysql2');
    return eitherMap(() => true)(mysql2Result) as DatabaseResult<boolean>;
  }

  /**
   * 格式化连接字符串
   */
  protected formatConnectionString(params: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    [key: string]: any;
  }): string {
    const { host, port, database, username, password } = params;
    let connectionString = `mysql://${username}`;

    if (password) {
      connectionString += `:${password}`;
    }

    connectionString += `@${host}:${port}/${database}`;

    // 添加查询参数
    const queryParams = this.buildQueryParams(params);
    if (queryParams) {
      connectionString += `?${queryParams}`;
    }

    return connectionString;
  }

  /**
   * 获取方言特定的连接选项
   */
  protected getDialectSpecificOptions(
    config: ConnectionConfig
  ): Record<string, any> {
    const options: Record<string, any> = {};

    // SSL配置
    const ssl = this.getSSLConfig(config);
    if (ssl) {
      options.ssl = ssl;
    }

    // 连接超时
    if (config.options?.connectTimeout) {
      options.connectTimeout = config.options.connectTimeout;
    }

    // 查询超时
    if (config.options?.timeout) {
      options.timeout = config.options.timeout;
    }

    // 字符集
    if (config.options?.charset) {
      options.charset = config.options.charset;
    } else {
      options.charset = 'utf8mb4'; // 默认使用utf8mb4
    }

    // 时区
    if (config.options?.timezone) {
      options.timezone = config.options.timezone;
    }

    // 多语句查询
    if (config.options?.multipleStatements !== undefined) {
      options.multipleStatements = config.options.multipleStatements;
    }

    // 大数字处理
    if (config.options?.bigNumberStrings !== undefined) {
      options.bigNumberStrings = config.options.bigNumberStrings;
    }

    // 日期字符串
    if (config.options?.dateStrings !== undefined) {
      options.dateStrings = config.options.dateStrings;
    }

    return options;
  }

  /**
   * 获取方言特定的SSL选项
   */
  protected getDialectSpecificSSLOptions(ssl: any): Record<string, any> {
    const options: Record<string, any> = {};

    // MySQL SSL模式映射
    if (ssl.mode) {
      switch (ssl.mode.toUpperCase()) {
        case 'DISABLED':
          return { ssl: false };
        case 'PREFERRED':
          options.ssl = { rejectUnauthorized: false };
          break;
        case 'REQUIRED':
          options.ssl = { rejectUnauthorized: false };
          break;
        case 'VERIFY_CA':
        case 'VERIFY_IDENTITY':
          options.ssl = { rejectUnauthorized: true };
          break;
      }
    }

    return options;
  }

  /**
   * 创建连接池选项
   */
  private createPoolOptions(config: ConnectionConfig): PoolOptions {
    const baseConfig = this.getConnectionOptions(config);
    const poolConfig = this.mergePoolConfig(config);

    const poolOptions: PoolOptions = {
      host: baseConfig.host,
      port: baseConfig.port,
      database: baseConfig.database,
      user: baseConfig.user,
      password: baseConfig.password,
      ssl: baseConfig.ssl,
      connectionLimit: poolConfig.max,
      idleTimeout: poolConfig.idleTimeoutMillis,
      // MySQL特定选项
      charset: baseConfig.charset || 'utf8mb4',
      timezone: baseConfig.timezone || 'local',
      connectTimeout: baseConfig.connectTimeout || 60000,
      multipleStatements: baseConfig.multipleStatements || false,
      bigNumberStrings: baseConfig.bigNumberStrings || false,
      dateStrings: baseConfig.dateStrings || false,
      supportBigNumbers: true,
      ...config.options
    };

    // 如果提供了连接字符串，使用连接字符串
    if (config.connectionString) {
      return {
        uri: config.connectionString,
        connectionLimit: poolConfig.max,
        ...config.options
      };
    }

    return poolOptions;
  }

  /**
   * 构建查询参数字符串
   */
  private buildQueryParams(params: any): string {
    const queryParams: string[] = [];

    // SSL参数
    if (params.ssl) {
      if (params.ssl.mode) {
        queryParams.push(`ssl-mode=${params.ssl.mode}`);
      }
      if (params.ssl.ca) {
        queryParams.push(`ssl-ca=${params.ssl.ca}`);
      }
      if (params.ssl.cert) {
        queryParams.push(`ssl-cert=${params.ssl.cert}`);
      }
      if (params.ssl.key) {
        queryParams.push(`ssl-key=${params.ssl.key}`);
      }
    }

    // 字符集
    if (params.charset) {
      queryParams.push(`charset=${params.charset}`);
    }

    // 时区
    if (params.timezone) {
      queryParams.push(`timezone=${encodeURIComponent(params.timezone)}`);
    }

    return queryParams.join('&');
  }

  /**
   * 格式化错误消息
   */
  protected formatErrorMessage(error: Error): string {
    const message = error.message;

    // MySQL特定错误处理
    if (message.includes('ECONNREFUSED')) {
      return 'MySQL connection refused. Please check if the database server is running and accessible.';
    }

    if (message.includes('ER_ACCESS_DENIED_ERROR')) {
      return 'MySQL access denied. Please check your username and password.';
    }

    if (message.includes('ER_BAD_DB_ERROR')) {
      return 'MySQL database does not exist. Please check the database name.';
    }

    if (message.includes('ER_HOST_NOT_PRIVILEGED')) {
      return 'MySQL host not privileged. Please check your host access permissions.';
    }

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return 'MySQL connection timeout. Please check your network connection and database server.';
    }

    if (message.includes('ER_TOO_MANY_CONNECTIONS')) {
      return 'MySQL too many connections. Please check your connection pool configuration.';
    }

    return `MySQL error: ${message}`;
  }

  /**
   * 获取默认连接池配置
   */
  protected getDefaultPoolConfig() {
    return {
      ...super.getDefaultPoolConfig(),
      // MySQL特定的默认值
      max: 20, // MySQL通常可以处理更多连接
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 10000
    };
  }
}

/**
 * 创建MySQL方言实例
 */
export const createMySQLDialect = (): MySQLDialect => {
  return new MySQLDialect();
};
