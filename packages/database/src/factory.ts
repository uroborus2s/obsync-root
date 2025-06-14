import type { Logger } from '@stratix/core';
import { Kysely, LogEvent, sql } from 'kysely';
import type {
  CacheConfig,
  DatabaseConnectionConfig,
  ExtendedDatabaseConnectionConfig,
  ReadWriteConfig
} from './config.js';

/**
 * 数据库方言工厂
 */
export class DatabaseDialectFactory {
  /**
   * 创建数据库方言
   */
  static createDialect(config: DatabaseConnectionConfig) {
    switch (config.client) {
      case 'mysql':
        return DatabaseDialectFactory.createMySQLDialect(config);
      case 'pg':
        return DatabaseDialectFactory.createPostgreSQLDialect(config);
      case 'sqlite':
        return DatabaseDialectFactory.createSQLiteDialect(config);
      case 'oracle':
        return DatabaseDialectFactory.createOracleDialect(config);
      case 'mssql':
        return DatabaseDialectFactory.createMSSQLDialect(config);
      default:
        throw new Error(`不支持的数据库类型: ${(config as any).client}`);
    }
  }

  /**
   * 创建 MySQL 方言
   */
  private static createMySQLDialect(
    config: DatabaseConnectionConfig & { client: 'mysql' }
  ) {
    // 动态导入 MySQL 相关模块
    return async () => {
      const { MysqlDialect } = await import('kysely');
      const { createPool } = await import('mysql2');

      // 处理 SSL 配置类型
      let sslConfig: any = config.ssl;
      if (typeof config.ssl === 'boolean' && config.ssl === false) {
        sslConfig = undefined;
      }

      // 构建 MySQL 配置，只包含支持的选项
      const poolConfig: any = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: sslConfig
      };

      // 添加可选配置
      if (config.connectionLimit !== undefined) {
        poolConfig.connectionLimit = config.connectionLimit;
      }
      if (config.timezone !== undefined) {
        poolConfig.timezone = config.timezone;
      }
      if (config.charset !== undefined) {
        poolConfig.charset = config.charset;
      }
      if (config.timeout !== undefined) {
        poolConfig.timeout = config.timeout;
      }
      if (config.reconnect !== undefined) {
        poolConfig.reconnect = config.reconnect;
      }
      if (config.bigNumberStrings !== undefined) {
        poolConfig.bigNumberStrings = config.bigNumberStrings;
      }

      return new MysqlDialect({
        pool: createPool(poolConfig)
      });
    };
  }

  /**
   * 创建 PostgreSQL 方言
   */
  private static createPostgreSQLDialect(
    config: DatabaseConnectionConfig & { client: 'pg' }
  ) {
    return async () => {
      const { PostgresDialect } = await import('kysely');
      const { Pool } = await import('pg');

      return new PostgresDialect({
        pool: new Pool({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          max: config.max,
          min: config.min,
          idleTimeoutMillis: config.idleTimeoutMillis,
          connectionTimeoutMillis: config.connectionTimeoutMillis,
          ssl: config.ssl,
          application_name: config.application_name,
          statement_timeout: config.statement_timeout,
          query_timeout: config.query_timeout
        })
      });
    };
  }

  /**
   * 创建 SQLite 方言
   */
  private static createSQLiteDialect(
    config: DatabaseConnectionConfig & { client: 'sqlite' }
  ) {
    return async () => {
      const { SqliteDialect } = await import('kysely');
      // 使用 any 类型避免类型检查问题
      const Database = (await import('better-sqlite3' as any)).default;

      return new SqliteDialect({
        database: new Database(config.database, {
          readonly: config.readonly,
          timeout: config.timeout,
          verbose: config.verbose ? console.log : undefined,
          fileMustExist: config.fileMustExist
        })
      });
    };
  }

  /**
   * 创建 Oracle 方言
   */
  private static createOracleDialect(
    config: DatabaseConnectionConfig & { client: 'oracle' }
  ) {
    return async () => {
      try {
        // 动态导入 kysely-oracledb 包
        const { OracleDialect } = await import('kysely-oracledb');
        // 使用 any 类型避免类型检查问题
        const oracledb = await import('oracledb' as any);

        // 创建连接池
        const pool = await oracledb.createPool({
          user: config.user,
          password: config.password,
          connectString: config.connectString,
          poolMin: config.poolMin || 1,
          poolMax: config.poolMax || 10,
          poolIncrement: config.poolIncrement || 1,
          poolTimeout: config.poolTimeout || 60,
          queueTimeout: config.queueTimeout || 60000,
          enableStatistics: config.enableStatistics || false
        });

        return new OracleDialect({
          pool
        });
      } catch (error) {
        throw new Error(
          'Oracle 数据库支持需要安装 kysely-oracledb 和 oracledb 包: ' +
            'npm install kysely-oracledb oracledb'
        );
      }
    };
  }

  /**
   * 创建 MSSQL 方言
   */
  private static createMSSQLDialect(
    config: DatabaseConnectionConfig & { client: 'mssql' }
  ) {
    return async () => {
      try {
        // 动态导入 Kysely MSSQL 方言和相关依赖
        const { MssqlDialect } = await import('kysely');
        const Tedious = await import('tedious');
        const Tarn = await import('tarn');

        // 构建 Tedious 连接配置
        const connectionConfig: any = {
          server: config.server,
          authentication: {
            type: 'default',
            options: {
              userName: config.user,
              password: config.password
            }
          },
          options: {
            database: config.database,
            port: config.port || 1433,
            encrypt: config.options?.encrypt !== false, // 默认启用加密
            trustServerCertificate:
              config.options?.trustServerCertificate || false,
            enableArithAbort: config.options?.enableArithAbort !== false,
            connectionTimeout: config.connectionTimeout || 15000,
            requestTimeout: config.requestTimeout || 15000
          }
        };

        // 如果指定了域，使用 Windows 认证
        if (config.domain) {
          connectionConfig.authentication = {
            type: 'ntlm',
            options: {
              userName: config.user,
              password: config.password,
              domain: config.domain
            }
          };
        }

        // 创建 MSSQL 方言
        return new MssqlDialect({
          tarn: {
            ...Tarn,
            options: {
              min: config.pool?.min || 0,
              max: config.pool?.max || 10,
              idleTimeoutMillis: config.pool?.idleTimeoutMillis || 30000
            }
          },
          tedious: {
            ...Tedious,
            connectionFactory: () => new Tedious.Connection(connectionConfig)
          }
        });
      } catch (error) {
        throw new Error(
          'MSSQL 数据库支持需要安装 tedious 和 tarn 包: ' +
            'npm install tedious tarn @types/tedious'
        );
      }
    };
  }
}

/**
 * Kysely 实例工厂
 */
export class KyselyFactory {
  /**
   * 创建 Kysely 实例
   */
  static async createInstance<DB = any>(
    config: ExtendedDatabaseConnectionConfig,
    logger?: Logger
  ): Promise<Kysely<DB>> {
    // 处理读写分离配置
    if ('readWrite' in config) {
      return KyselyFactory.createReadWriteInstance<DB>(
        config.readWrite,
        config.cache,
        logger
      );
    }

    // 处理基础连接配置
    const connectionConfig =
      'connection' in config ? config.connection : config;
    const dialectFactory =
      DatabaseDialectFactory.createDialect(connectionConfig);
    const dialect = await dialectFactory();

    // 创建日志函数
    const logFunction = KyselyFactory.createLogFunction(
      'logging' in config ? config.logging : undefined,
      logger
    );

    // 创建插件数组
    const plugins = await KyselyFactory.createPlugins(
      'plugins' in config ? config.plugins : undefined
    );

    return new Kysely<DB>({
      dialect,
      log: logFunction,
      plugins
    });
  }

  /**
   * 创建读写分离实例
   */
  private static async createReadWriteInstance<DB = any>(
    readWriteConfig: ReadWriteConfig,
    cacheConfig?: CacheConfig,
    logger?: Logger
  ): Promise<Kysely<DB>> {
    // 读写分离的实现需要更复杂的逻辑
    // 这里先实现基础的写库连接，后续可以扩展
    const writeDialectFactory = DatabaseDialectFactory.createDialect(
      readWriteConfig.write
    );
    const writeDialect = await writeDialectFactory();

    const logFunction = KyselyFactory.createLogFunction(undefined, logger);

    return new Kysely<DB>({
      dialect: writeDialect,
      log: logFunction
    });
  }

  /**
   * 创建日志函数
   */
  private static createLogFunction(
    loggingConfig: boolean | string[] | undefined,
    logger?: Logger
  ) {
    if (!loggingConfig || !logger) {
      return undefined;
    }

    const enabledLevels = Array.isArray(loggingConfig)
      ? loggingConfig
      : ['query', 'error'];

    return (event: LogEvent) => {
      if (!enabledLevels.includes(event.level)) {
        return;
      }

      if (event.level === 'error') {
        logger.error(
          {
            durationMs: event.queryDurationMillis,
            error: event.error,
            sql: event.query.sql,
            params: event.query.parameters
          },
          'Database query failed'
        );
      } else if (event.level === 'query') {
        logger.debug(
          {
            durationMs: event.queryDurationMillis,
            sql: event.query.sql,
            params: event.query.parameters
          },
          'Database query executed'
        );
      }
    };
  }

  /**
   * 创建插件数组
   */
  private static async createPlugins(pluginNames?: string[]) {
    if (!pluginNames || pluginNames.length === 0) {
      return [];
    }

    const plugins = [];

    for (const pluginName of pluginNames) {
      switch (pluginName) {
        case 'camelCase':
          const { CamelCasePlugin } = await import('kysely');
          plugins.push(new CamelCasePlugin());
          break;
        case 'parseJsonResults':
          const { ParseJSONResultsPlugin } = await import('kysely');
          plugins.push(new ParseJSONResultsPlugin());
          break;
        case 'deduplicateJoins':
          const { DeduplicateJoinsPlugin } = await import('kysely');
          plugins.push(new DeduplicateJoinsPlugin());
          break;
        default:
          throw new Error(`未知的插件: ${pluginName}`);
      }
    }

    return plugins;
  }

  /**
   * 验证数据库连接
   */
  static async validateConnection<DB = any>(
    db: Kysely<DB>,
    timeout: number = 5000
  ): Promise<boolean> {
    try {
      // 创建带超时的验证查询
      const validationPromise = KyselyFactory.executeValidationQuery(db);

      // 添加超时机制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Connection validation timeout')),
          timeout
        );
      });

      await Promise.race([validationPromise, timeoutPromise]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 执行数据库特定的验证查询
   */
  private static async executeValidationQuery<DB = any>(
    db: Kysely<DB>
  ): Promise<void> {
    // 尝试获取数据库类型信息
    const dialectName = KyselyFactory.getDialectName(db);

    try {
      switch (dialectName) {
        case 'mysql':
          // MySQL: 使用 SELECT 1，简单高效
          await sql`SELECT 1 as connection_test`.execute(db);
          break;

        case 'postgresql':
          // PostgreSQL: 使用 SELECT 1，也可以获取版本信息
          await sql`SELECT 1 as connection_test`.execute(db);
          break;

        case 'sqlite':
          // SQLite: 使用 SELECT 1
          await sql`SELECT 1 as connection_test`.execute(db);
          break;

        case 'oracle':
          // Oracle: 使用 DUAL 表，这是 Oracle 的标准做法
          await sql`SELECT 1 as connection_test FROM DUAL`.execute(db);
          break;

        case 'mssql':
          // MSSQL: 使用 SELECT 1
          await sql`SELECT 1 as connection_test`.execute(db);
          break;

        default:
          // 通用查询，适用于大多数数据库
          await sql`SELECT 1 as connection_test`.execute(db);
          break;
      }
    } catch (error) {
      // 如果特定查询失败，尝试最基本的查询
      await sql`SELECT 1`.execute(db);
    }
  }

  /**
   * 获取数据库方言名称
   */
  private static getDialectName<DB = any>(db: Kysely<DB>): string {
    try {
      // 通过检查内部属性来判断数据库类型
      const dialect = (db as any).getExecutor().adapter.dialect;

      if (dialect.constructor.name.toLowerCase().includes('mysql')) {
        return 'mysql';
      } else if (dialect.constructor.name.toLowerCase().includes('postgres')) {
        return 'postgresql';
      } else if (dialect.constructor.name.toLowerCase().includes('sqlite')) {
        return 'sqlite';
      } else if (dialect.constructor.name.toLowerCase().includes('oracle')) {
        return 'oracle';
      } else if (dialect.constructor.name.toLowerCase().includes('mssql')) {
        return 'mssql';
      }

      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 销毁数据库连接
   */
  static async destroyInstance<DB = any>(db: Kysely<DB>): Promise<void> {
    try {
      await db.destroy();
    } catch (error) {
      // 忽略销毁时的错误
    }
  }
}
