// @stratix/database SQLite方言实现
// 基于Kysely和better-sqlite3驱动的SQLite数据库支持

import type { Logger } from '@stratix/core';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { Kysely, SqliteDialect } from 'kysely';
import { dirname, resolve } from 'path';
import type { ConnectionConfig, DatabaseType } from '../../types/index.js';
import {
  DatabaseResult,
  failureResult,
  successResult
} from '../../utils/helpers.js';
import { BaseDialect } from './base-dialect.js';

/**
 * SQLite数据库方言实现
 */
export class SQLiteDialect extends BaseDialect {
  readonly type: DatabaseType = 'sqlite';
  readonly defaultPort: number = 0; // SQLite不使用端口

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

      // 检查better-sqlite3驱动是否可用
      const driverResult = await this.checkDriverAvailability();
      if (!driverResult.success) {
        throw new Error(
          driverResult.error?.message || 'Driver availability check failed'
        );
      }

      // 获取数据库文件路径
      const dbPath = this.getDatabasePath(config);

      // 确保目录存在
      await this.ensureDirectoryExists(dbPath);

      // 创建SQLite数据库连接选项
      const options = this.createDatabaseOptions(config);

      // 创建better-sqlite3数据库实例
      const database = new Database(dbPath, options);

      // 设置Pragma选项
      this.setPragmaOptions(database, config);

      // 创建Kysely实例
      const kysely = new Kysely({
        dialect: new SqliteDialect({
          database: database
        }),
        log: this.createDatabaseLogger(logger, 'SQLite')
      });

      // 测试连接
      try {
        // 执行简单的健康检查查询
        const healthQuery = this.getHealthCheckQuery();
        const stmt = database.prepare(healthQuery);
        const result = stmt.get();

        if (!result || (result as any).health !== 1) {
          throw new Error('SQLite health check failed');
        }
      } catch (error) {
        database.close();
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
      // SQLite特定验证
      const dbPath = this.getDatabasePath(config);

      if (!dbPath) {
        throw new Error(
          'Database path is required for SQLite connections. Use database field or sqlite.filename.'
        );
      }

      // 验证路径格式
      if (dbPath !== ':memory:' && !this.isValidPath(dbPath)) {
        throw new Error(`Invalid database path: ${dbPath}`);
      }

      // 验证pragma选项
      if (config.sqlite?.pragma) {
        this.validatePragmaOptions(config.sqlite.pragma);
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
    const sqliteResult = await this.checkRequiredModule('better-sqlite3');
    if (!sqliteResult.success) {
      return sqliteResult;
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
    // SQLite使用文件路径作为连接字符串
    return `sqlite:${params.database}`;
  }

  /**
   * 获取方言特定的连接选项
   */
  protected getDialectSpecificOptions(
    config: ConnectionConfig
  ): Record<string, any> {
    const options: Record<string, any> = {};

    // SQLite特定选项
    if (config.sqlite) {
      // 文件名
      if (config.sqlite.filename) {
        options.filename = config.sqlite.filename;
      }

      // Pragma选项
      if (config.sqlite.pragma) {
        options.pragma = config.sqlite.pragma;
      }
    }

    // better-sqlite3特定选项
    if (config.options?.readonly !== undefined) {
      options.readonly = config.options.readonly;
    }

    if (config.options?.fileMustExist !== undefined) {
      options.fileMustExist = config.options.fileMustExist;
    }

    if (config.options?.timeout !== undefined) {
      options.timeout = config.options.timeout;
    }

    if (config.options?.verbose !== undefined) {
      options.verbose = config.options.verbose;
    }

    return options;
  }

  /**
   * 获取数据库文件路径
   */
  private getDatabasePath(config: ConnectionConfig): string {
    // 优先使用sqlite.filename
    if (config.sqlite?.filename) {
      return config.sqlite.filename;
    }

    // 使用database字段
    if (config.database) {
      // 如果是内存数据库
      if (config.database === ':memory:') {
        return ':memory:';
      }

      // 如果已经是完整路径
      if (config.database.includes('/') || config.database.includes('\\')) {
        return config.database;
      }

      // 默认在当前目录创建数据库文件
      return resolve(process.cwd(), config.database);
    }

    throw new Error('SQLite database path not specified');
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dbPath: string): Promise<void> {
    if (dbPath === ':memory:') {
      return;
    }

    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 验证路径格式
   */
  private isValidPath(path: string): boolean {
    try {
      resolve(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证Pragma选项
   */
  private validatePragmaOptions(pragma: Record<string, string | number>): void {
    const validPragmas = [
      'journal_mode',
      'synchronous',
      'cache_size',
      'foreign_keys',
      'busy_timeout',
      'temp_store',
      'mmap_size',
      'page_size',
      'auto_vacuum',
      'wal_autocheckpoint'
    ];

    for (const key of Object.keys(pragma)) {
      if (!validPragmas.includes(key)) {
        console.warn(`Unknown SQLite pragma option: ${key}`);
      }
    }
  }

  /**
   * 创建数据库选项
   */
  private createDatabaseOptions(config: ConnectionConfig): any {
    const options: any = {};

    // 基本选项
    if (config.options?.readonly !== undefined) {
      options.readonly = config.options.readonly;
    }

    if (config.options?.fileMustExist !== undefined) {
      options.fileMustExist = config.options.fileMustExist;
    }

    if (config.options?.timeout !== undefined) {
      options.timeout = config.options.timeout;
    }

    if (config.options?.verbose) {
      options.verbose = (message: string) => {
        try {
          // 尝试从框架获取日志器
          const {
            getLogger: getFrameworkLogger
          } = require('@stratix/core/logger');
          const logger = getFrameworkLogger();
          logger.debug({ dialect: 'SQLite', message }, '[SQLITE] Verbose');
        } catch {
          console.log(`[SQLite] ${message}`);
        }
      };
    }

    return options;
  }

  /**
   * 设置Pragma选项
   */
  private setPragmaOptions(
    database: Database.Database,
    config: ConnectionConfig
  ): void {
    // 默认pragma设置
    const defaultPragmas = {
      journal_mode: 'WAL',
      synchronous: 'NORMAL',
      cache_size: -64000,
      foreign_keys: 'ON',
      busy_timeout: 30000
    };

    // 合并用户配置
    const pragmas = {
      ...defaultPragmas,
      ...config.sqlite?.pragma
    };

    // 应用pragma设置
    for (const [key, value] of Object.entries(pragmas)) {
      try {
        const stmt = database.prepare(`PRAGMA ${key} = ?`);
        stmt.run(value);
        // better-sqlite3 的 Statement 会自动管理资源，无需手动 finalize
      } catch (error) {
        console.warn(`Failed to set SQLite pragma ${key}: ${error}`);
      }
    }
  }

  /**
   * 格式化错误消息
   */
  protected formatErrorMessage(error: Error): string {
    const message = error.message;

    // SQLite特定错误处理
    if (message.includes('SQLITE_CANTOPEN')) {
      return 'SQLite cannot open database file. Please check the file path and permissions.';
    }

    if (message.includes('SQLITE_LOCKED')) {
      return 'SQLite database is locked. Please ensure no other process is using the database.';
    }

    if (message.includes('SQLITE_BUSY')) {
      return 'SQLite database is busy. Please try again later.';
    }

    if (message.includes('SQLITE_READONLY')) {
      return 'SQLite database is read-only. Please check file permissions.';
    }

    if (message.includes('SQLITE_CORRUPT')) {
      return 'SQLite database file is corrupted. Please restore from backup.';
    }

    if (message.includes('SQLITE_FULL')) {
      return 'SQLite database disk is full. Please free up disk space.';
    }

    if (message.includes('no such table')) {
      return 'SQLite table does not exist. Please check your query or run migrations.';
    }

    return `SQLite error: ${message}`;
  }

  /**
   * 获取默认连接池配置
   */
  protected getDefaultPoolConfig() {
    return {
      ...super.getDefaultPoolConfig(),
      // SQLite是单线程的，所以连接池大小设为1
      min: 1,
      max: 1,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 5000
    };
  }
}

/**
 * 创建SQLite方言实例
 */
export const createSQLiteDialect = (): SQLiteDialect => {
  return new SQLiteDialect();
};
