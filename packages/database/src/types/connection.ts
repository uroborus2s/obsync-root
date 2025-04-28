/**
 * @stratix/database 连接类型定义
 */

import { Knex } from 'knex';
import { ConnectionStatus, DatabaseConfig } from './database.js';

/**
 * 数据库连接接口
 */
export interface Connection {
  /**
   * 获取连接名称
   */
  getName(): string;

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus;

  /**
   * 获取Knex实例
   */
  getKnex(): Knex;

  /**
   * 连接到数据库
   */
  connect(): Promise<void>;

  /**
   * 断开连接
   */
  disconnect(): Promise<void>;

  /**
   * 执行原始SQL查询
   * @param sql SQL语句
   * @param bindings 参数绑定
   */
  raw<T = any>(sql: string, bindings?: any): Promise<T>;

  /**
   * 开始事务
   */
  beginTransaction(): Promise<Knex.Transaction>;

  /**
   * 在事务中执行操作
   * @param callback 回调函数
   */
  transaction<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T>;
}

/**
 * 数据库管理器接口
 */
export interface DatabaseManager {
  /**
   * 获取默认连接名称
   */
  getDefaultConnectionName(): string;

  /**
   * 设置默认连接名称
   * @param name 连接名称
   */
  setDefaultConnectionName(name: string): void;

  /**
   * 获取指定名称的连接
   * @param name 连接名称，如不指定则返回默认连接
   */
  getConnection(name?: string): Connection;

  /**
   * 检查连接是否存在
   * @param name 连接名称
   */
  hasConnection(name: string): boolean;

  /**
   * 获取所有连接名称
   */
  getConnectionNames(): string[];

  /**
   * 添加连接
   * @param name 连接名称
   * @param config 连接配置
   */
  addConnection(name: string, config: DatabaseConfig): Connection;

  /**
   * 从配置中初始化连接
   * @param config 配置对象
   * @param defaultName 默认连接名称
   */
  initializeFromConfig(config: DatabaseConfig, defaultName?: string): void;

  /**
   * 关闭指定连接
   * @param name 连接名称
   */
  closeConnection(name?: string): Promise<void>;

  /**
   * 关闭所有连接
   */
  closeAll(): Promise<void>;
}

// 重新导出必要的类型
export { ConnectionStatus, DatabaseConfig } from './database.js';
