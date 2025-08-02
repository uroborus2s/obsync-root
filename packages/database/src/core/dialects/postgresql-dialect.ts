// @stratix/database PostgreSQL方言实现
// 基于Kysely和pg驱动的PostgreSQL数据库支持

import type { Logger } from '@stratix/core';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, PoolConfig } from 'pg';
import type { ConnectionConfig, DatabaseType } from '../../types/index.js';
import {
  DatabaseResult,
  failureResult,
  successResult
} from '../../utils/helpers.js';
import { BaseDialect } from './base-dialect.js';

/**
 * PostgreSQL数据库方言实现
 */
export class PostgreSQLDialect extends BaseDialect {
  readonly type: DatabaseType = 'postgresql';
  readonly defaultPort: number = 5432;

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
      if (!configResult.success) {
        throw new Error(
          configResult.error?.message || 'Configuration validation failed'
        );
      }

      // 检查pg驱动是否可用
      const driverResult = await this.checkDriverAvailability();
      if (!driverResult.success) {
        throw new Error(
          driverResult.error?.message || 'Driver availability check failed'
        );
      }

      // 创建连接池
      const poolConfig = this.createPoolConfig(config);
      const pool = new Pool(poolConfig);

      // 创建Kysely实例
      const kysely = new Kysely({
        dialect: new PostgresDialect({
          pool: pool
        }),
        log: this.createDatabaseLogger(logger, 'PostgreSQL')
      });

      // 测试连接
      try {
        // 测试连接 - 暂时跳过查询
        // TODO: 实现PostgreSQL特定的健康检查
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
    if (!baseResult.success) {
      return baseResult;
    }

    try {
      // PostgreSQL特定验证
      if (!config.connectionString) {
        if (!config.host) {
          throw new Error('Host is required for PostgreSQL connections');
        }

        if (!config.username) {
          throw new Error('Username is required for PostgreSQL connections');
        }

        if (!config.database) {
          throw new Error(
            'Database name is required for PostgreSQL connections'
          );
        }
      }

      // 验证SSL配置
      if (config.ssl && config.ssl.mode) {
        const validModes = [
          'disable',
          'allow',
          'prefer',
          'require',
          'verify-ca',
          'verify-full'
        ];
        if (!validModes.includes(config.ssl.mode)) {
          throw new Error(
            `Invalid SSL mode for PostgreSQL: ${config.ssl.mode}`
          );
        }
      }

      return successResult(true);
    } catch (error) {
      return failureResult(this.handleConnectionError(error as Error));
    }
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
    const pgResult = await this.checkRequiredModule('pg');
    if (!pgResult.success) {
      return pgResult;
    }

    return successResult(true);
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
    let connectionString = `postgresql://${username}`;

    if (password) {
      connectionString += `:${password}`;
    }

    connectionString += `@${host}:${port}/${database}`;

    // 添加SSL参数
    const sslParams = this.buildSSLParams(params);
    if (sslParams) {
      connectionString += `?${sslParams}`;
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
    if (config.options?.connectionTimeoutMillis) {
      options.connectionTimeoutMillis = config.options.connectionTimeoutMillis;
    }

    // 查询超时
    if (config.options?.query_timeout) {
      options.query_timeout = config.options.query_timeout;
    }

    // 应用名称
    if (config.options?.application_name) {
      options.application_name = config.options.application_name;
    }

    return options;
  }

  /**
   * 获取方言特定的SSL选项
   */
  protected getDialectSpecificSSLOptions(ssl: any): Record<string, any> {
    const options: Record<string, any> = {};

    // PostgreSQL SSL模式映射
    if (ssl.mode) {
      switch (ssl.mode) {
        case 'disable':
          return { ssl: false };
        case 'allow':
        case 'prefer':
          options.ssl = { rejectUnauthorized: false };
          break;
        case 'require':
          options.ssl = { rejectUnauthorized: false };
          break;
        case 'verify-ca':
        case 'verify-full':
          options.ssl = { rejectUnauthorized: true };
          break;
      }
    }

    return options;
  }

  /**
   * 创建连接池配置
   */
  private createPoolConfig(config: ConnectionConfig): PoolConfig {
    const baseConfig = this.getConnectionOptions(config);
    const poolConfig = this.mergePoolConfig(config);

    return {
      host: baseConfig.host,
      port: baseConfig.port,
      database: baseConfig.database,
      user: baseConfig.user,
      password: baseConfig.password,
      ssl: baseConfig.ssl,
      min: poolConfig.min,
      max: poolConfig.max,
      // PostgreSQL特定选项
      application_name: config.options?.application_name || '@stratix/database',
      statement_timeout: config.options?.statement_timeout || 30000,
      query_timeout: config.options?.query_timeout || 30000,
      connectionTimeoutMillis: config.options?.connectionTimeoutMillis || 10000,
      ...config.options
    };
  }

  /**
   * 构建SSL参数字符串
   */
  private buildSSLParams(params: any): string {
    const sslParams: string[] = [];

    if (params.ssl) {
      if (params.ssl.mode) {
        sslParams.push(`sslmode=${params.ssl.mode}`);
      }
      if (params.ssl.ca) {
        sslParams.push(`sslcert=${params.ssl.ca}`);
      }
      if (params.ssl.cert) {
        sslParams.push(`sslcert=${params.ssl.cert}`);
      }
      if (params.ssl.key) {
        sslParams.push(`sslkey=${params.ssl.key}`);
      }
    }

    return sslParams.join('&');
  }

  /**
   * 格式化错误消息
   */
  protected formatErrorMessage(error: Error): string {
    // PostgreSQL特定错误处理
    if (error.message.includes('ECONNREFUSED')) {
      return 'PostgreSQL connection refused. Please check if the database server is running and accessible.';
    }

    if (error.message.includes('password authentication failed')) {
      return 'PostgreSQL authentication failed. Please check your username and password.';
    }

    if (
      error.message.includes('database') &&
      error.message.includes('does not exist')
    ) {
      return 'PostgreSQL database does not exist. Please check the database name.';
    }

    if (error.message.includes('timeout')) {
      return 'PostgreSQL connection timeout. Please check your network connection and database server.';
    }

    return `PostgreSQL error: ${error.message}`;
  }
}

/**
 * 创建PostgreSQL方言实例
 */
export const createPostgreSQLDialect = (): PostgreSQLDialect => {
  return new PostgreSQLDialect();
};
