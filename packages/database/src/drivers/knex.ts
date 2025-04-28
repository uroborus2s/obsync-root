/**
 * @stratix/database Knex数据库驱动实现
 */

import knex, { Knex } from 'knex';
import {
  Connection,
  ConnectionStatus,
  DatabaseConfig
} from '../types/connection.js';

/**
 * Knex数据库连接类实现
 */
export class KnexConnection implements Connection {
  /**
   * 连接名称
   */
  private readonly name: string;

  /**
   * 连接状态
   */
  private status: ConnectionStatus = ConnectionStatus.Disconnected;

  /**
   * Knex实例
   */
  private knexInstance: Knex | null = null;

  /**
   * 连接配置
   */
  private readonly config: DatabaseConfig;

  /**
   * 创建Knex数据库连接
   * @param name 连接名称
   * @param config 连接配置
   */
  constructor(name: string, config: DatabaseConfig) {
    this.name = name;
    this.config = config;
  }

  /**
   * 获取连接名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * 获取Knex实例
   * 如果未连接则抛出错误
   */
  getKnex(): Knex {
    if (!this.knexInstance) {
      throw new Error(`数据库连接 ${this.name} 尚未初始化`);
    }
    return this.knexInstance;
  }

  /**
   * 连接到数据库
   * 创建Knex实例并测试连接
   */
  async connect(): Promise<void> {
    try {
      // 创建Knex实例
      this.knexInstance = knex(this.config);

      // 测试连接
      await this.knexInstance.raw('SELECT 1');

      // 更新状态
      this.status = ConnectionStatus.Connected;
    } catch (error) {
      this.status = ConnectionStatus.Error;
      throw error;
    }
  }

  /**
   * 断开连接
   * 释放Knex实例和所有连接
   */
  async disconnect(): Promise<void> {
    if (this.knexInstance) {
      await this.knexInstance.destroy();
      this.knexInstance = null;
      this.status = ConnectionStatus.Disconnected;
    }
  }

  /**
   * 执行原始SQL查询
   * @param sql SQL语句
   * @param bindings 参数绑定
   */
  async raw<T = any>(sql: string, bindings?: any): Promise<any> {
    return this.getKnex().raw<any>(sql, bindings);
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<Knex.Transaction> {
    return this.getKnex().transaction();
  }

  /**
   * 在事务中执行操作
   * @param callback 回调函数
   */
  async transaction<T>(
    callback: (trx: Knex.Transaction) => Promise<T>
  ): Promise<T> {
    return this.getKnex().transaction(callback);
  }
}
