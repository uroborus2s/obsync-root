/**
 * 数据库管理器
 * 管理多个数据库连接
 */

import { DatabaseConfig } from '../types/index.js';
import { Database } from './database.js';

/**
 * 数据库管理器类，用于管理多个命名的数据库连接
 */
export class DatabaseManager {
  /**
   * 所有数据库连接实例的映射
   */
  private connections: Map<string, Database> = new Map();

  /**
   * 默认连接名称
   */
  private defaultConnection: string = 'default';

  /**
   * 构造函数
   */
  constructor() {
    // 初始化空的连接集合
  }

  /**
   * 设置默认连接名称
   * @param name 默认连接名称
   */
  public setDefaultConnection(name: string): void {
    this.defaultConnection = name;
  }

  /**
   * 获取默认连接名称
   * @returns 默认连接名称
   */
  public getDefaultConnection(): string {
    return this.defaultConnection;
  }

  /**
   * 注册数据库连接
   * @param name 连接名称
   * @param connection 数据库连接实例
   */
  public registerConnection(name: string, connection: Database): void {
    this.connections.set(name, connection);
  }

  /**
   * 创建并注册新的数据库连接
   * @param name 连接名称
   * @param config 数据库配置
   * @returns 创建的数据库连接
   */
  public addConnection(name: string, config: DatabaseConfig): Database {
    const db = new Database(config);
    this.registerConnection(name, db);
    return db;
  }

  /**
   * 获取指定名称的数据库连接
   * @param name 连接名称，如果未提供则使用默认连接
   * @returns 数据库连接实例
   * @throws 如果指定的连接不存在
   */
  public connection(name?: string): Database {
    const connectionName = name || this.defaultConnection;
    const connection = this.connections.get(connectionName);

    if (!connection) {
      throw new Error(`Database connection [${connectionName}] not found.`);
    }

    return connection;
  }

  /**
   * 检查指定的连接是否存在
   * @param name 连接名称
   * @returns 连接是否存在
   */
  public hasConnection(name: string): boolean {
    return this.connections.has(name);
  }

  /**
   * 获取所有连接名称
   * @returns 连接名称数组
   */
  public getConnectionNames(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * 从配置初始化多个连接
   * @param config 数据库配置
   * @param defaultName 默认连接名
   */
  public initializeFromConfig(
    config: DatabaseConfig,
    defaultName: string = 'default'
  ): void {
    // 创建默认连接
    this.addConnection(defaultName, config);
    this.setDefaultConnection(defaultName);

    // 如果有其他连接配置，创建这些连接
    if (config.connections) {
      for (const [name, connectionConfig] of Object.entries(
        config.connections
      )) {
        this.addConnection(name, connectionConfig as DatabaseConfig);
      }
    }
  }

  /**
   * 关闭指定的连接
   * @param name 连接名称，如果未提供则关闭默认连接
   */
  public async closeConnection(name?: string): Promise<void> {
    const connectionName = name || this.defaultConnection;
    const connection = this.connections.get(connectionName);

    if (connection) {
      await connection.close();
      this.connections.delete(connectionName);
    }
  }

  /**
   * 关闭所有连接
   */
  public async closeAll(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(
      (connection) => connection.close()
    );

    await Promise.all(closePromises);
    this.connections.clear();
  }
}
