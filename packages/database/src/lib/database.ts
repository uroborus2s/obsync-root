/**
 * 数据库类，负责管理数据库连接和执行查询
 */

import knex, { Knex } from 'knex';
import { DatabaseConfig } from '../types/index.js';

/**
 * Database类封装了Knex实例，提供数据库连接和查询功能
 */
export class Database {
  /**
   * Knex实例
   */
  public knex: Knex;

  /**
   * 配置选项
   */
  private config: DatabaseConfig;

  /**
   * 创建数据库实例
   * @param config 数据库配置
   */
  constructor(config: DatabaseConfig) {
    this.config = config;
    this.knex = knex(config);

    // 启用调试模式
    if (config.debug) {
      this.enableDebug();
    }
  }

  /**
   * 获取Knex实例
   */
  public getKnex(): Knex {
    return this.knex;
  }

  /**
   * 启用调试模式
   */
  private enableDebug(): void {
    this.knex.on('query', (data) => {
      console.log(`[Database Query] ${data.sql}`, data.bindings);
    });

    this.knex.on('query-error', (error, data) => {
      console.error(`[Database Error] ${data.sql}`, data.bindings, error);
    });
  }

  /**
   * 执行原始SQL查询
   * @param sql SQL语句
   * @param bindings 绑定参数
   * @returns 查询结果
   */
  public async raw<T = any>(
    sql: string,
    bindings?: Knex.RawBinding | readonly Knex.RawBinding[] | Knex.ValueDict
  ): Promise<Knex.Raw<T>> {
    return this.knex.raw<T>(sql, bindings as any);
  }

  /**
   * 执行不返回结果的SQL语句
   * @param sql SQL语句
   * @param bindings 绑定参数
   */
  public async statement(
    sql: string,
    bindings?: Knex.RawBinding | readonly Knex.RawBinding[] | Knex.ValueDict
  ): Promise<void> {
    await this.knex.raw(sql, bindings as any);
  }

  /**
   * 插入数据
   * @param sql SQL插入语句
   * @param bindings 绑定参数
   * @returns 插入结果
   */
  public async insert(
    sql: string,
    bindings?: Knex.RawBinding | readonly Knex.RawBinding[] | Knex.ValueDict
  ): Promise<any> {
    return this.knex.raw(sql, bindings as any);
  }

  /**
   * 开始事务
   * @returns 事务对象
   */
  public async beginTransaction(): Promise<Knex.Transaction> {
    return this.knex.transaction();
  }

  /**
   * 在事务中执行操作
   * @param callback 事务回调函数
   * @returns 事务执行结果
   */
  public async transaction<T>(
    callback: (trx: Knex.Transaction) => Promise<T>
  ): Promise<T> {
    return this.knex.transaction(callback);
  }

  /**
   * 关闭数据库连接
   */
  public async close(): Promise<void> {
    await this.knex.destroy();
  }
}
