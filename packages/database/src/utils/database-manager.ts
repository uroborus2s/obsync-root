/**
 * @stratix/database 数据库管理器
 */

import * as utils from '@stratix/utils';
import { KnexConnection } from '../drivers/knex.js';
import { Connection, DatabaseConfig, DatabaseManager } from '../types/index.js';

/**
 * 数据库管理器实现
 * 负责管理多个数据库连接
 */
export class StratixDatabaseManager implements DatabaseManager {
  /**
   * 连接映射
   */
  private connections: Map<string, Connection> = new Map();

  /**
   * 默认连接名称
   */
  private defaultConnectionName: string = 'default';

  /**
   * 创建数据库管理器实例
   */
  constructor() {
    // 初始化连接映射
    this.connections = new Map();
  }

  /**
   * 获取默认连接名称
   */
  getDefaultConnectionName(): string {
    return this.defaultConnectionName;
  }

  /**
   * 设置默认连接名称
   * @param name 连接名称
   */
  setDefaultConnectionName(name: string): void {
    if (!this.connections.has(name)) {
      throw new Error(`数据库连接 ${name} 不存在`);
    }
    this.defaultConnectionName = name;
  }

  /**
   * 获取指定名称的连接
   * @param name 连接名称，如不指定则返回默认连接
   */
  getConnection(name?: string): Connection {
    const connectionName = name || this.defaultConnectionName;

    if (!this.connections.has(connectionName)) {
      throw new Error(`数据库连接 ${connectionName} 不存在`);
    }

    return this.connections.get(connectionName)!;
  }

  /**
   * 检查连接是否存在
   * @param name 连接名称
   */
  hasConnection(name: string): boolean {
    return this.connections.has(name);
  }

  /**
   * 获取所有连接名称
   */
  getConnectionNames(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * 添加连接
   * @param name 连接名称
   * @param config 连接配置
   */
  addConnection(name: string, config: DatabaseConfig): Connection {
    if (this.connections.has(name)) {
      throw new Error(`数据库连接 ${name} 已存在`);
    }

    const connection = new KnexConnection(name, config);
    this.connections.set(name, connection);

    return connection;
  }

  /**
   * 从配置中初始化连接
   * @param config 配置对象
   * @param defaultName 默认连接名称
   */
  initializeFromConfig(
    config: DatabaseConfig,
    defaultName: string = 'default'
  ): void {
    // 添加主连接
    this.addConnection(defaultName, config);

    // 设置为默认连接
    this.defaultConnectionName = defaultName;

    // 添加额外连接
    if (config.connections) {
      for (const [name, connectionConfig] of Object.entries(
        config.connections
      )) {
        // 合并主配置和连接特定配置
        const mergedConfig = utils.object.deepMerge(
          {},
          config,
          connectionConfig
        ) as DatabaseConfig;

        // 移除连接集合以避免循环引用
        delete mergedConfig.connections;

        // 添加连接
        this.addConnection(name, mergedConfig);
      }
    }
  }

  /**
   * 关闭指定连接
   * @param name 连接名称
   */
  async closeConnection(name?: string): Promise<void> {
    const connectionName = name || this.defaultConnectionName;

    if (this.connections.has(connectionName)) {
      const connection = this.connections.get(connectionName)!;
      await connection.disconnect();
    }
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    for (const connection of this.connections.values()) {
      await connection.disconnect();
    }
  }
}
