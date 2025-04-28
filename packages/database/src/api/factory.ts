/**
 * @stratix/database API工厂
 */

import { DatabaseConfig } from '../types/index.js';
import { StratixDatabaseManager } from '../utils/database-manager.js';

/**
 * 创建数据库API
 * @param config 数据库配置
 */
export function createDatabaseAPI(config: DatabaseConfig) {
  // 创建数据库管理器
  const databaseManager = new StratixDatabaseManager();

  // 从配置初始化连接
  databaseManager.initializeFromConfig(config);

  // 返回API对象
  return {
    /**
     * 数据库管理器
     */
    manager: databaseManager,

    /**
     * 获取指定连接
     * @param name 连接名称
     */
    connection(name?: string) {
      return databaseManager.getConnection(name);
    },

    /**
     * 执行原始SQL查询
     * @param sql SQL语句
     * @param bindings 参数绑定
     * @param connection 连接名称
     */
    async raw<T = any>(
      sql: string,
      bindings?: any,
      connection?: string
    ): Promise<T> {
      return databaseManager.getConnection(connection).raw(sql, bindings);
    },

    /**
     * 开始事务
     * @param connection 连接名称
     */
    async beginTransaction(connection?: string) {
      return databaseManager.getConnection(connection).beginTransaction();
    },

    /**
     * 在事务中执行操作
     * @param callback 回调函数
     * @param connection 连接名称
     */
    async transaction<T>(
      callback: (trx: any) => Promise<T>,
      connection?: string
    ): Promise<T> {
      return databaseManager.getConnection(connection).transaction(callback);
    },

    /**
     * 获取Knex查询构建器
     * @param table 表名
     * @param connection 连接名称
     */
    table(table: string, connection?: string) {
      return databaseManager.getConnection(connection).getKnex()(table);
    },

    /**
     * 关闭所有连接
     */
    async close(): Promise<void> {
      await databaseManager.closeAll();
    }
  };
}
