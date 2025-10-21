// @stratix/database 数据库管理类型定义
// 定义数据库管理器和连接工厂相关的接口

import type { Kysely, Transaction } from 'kysely';
import { DatabaseResult } from '../utils/error-handler.js';
import type {
  ConnectionInfo,
  ConnectionStats,
  DatabaseType,
  HealthStatus,
  TransactionOptions
} from './common.js';
import type { ConnectionConfig } from './configuration.js';

/**
 * 数据库管理器接口
 */
export interface IDatabaseManager {
  // ========== 连接管理方法 ==========

  /**
   * 获取默认数据库连接
   */
  getDefaultConnection(): Kysely<any>;

  /**
   * 获取指定名称的数据库连接
   */
  getConnection(name: string): Kysely<any>;

  /**
   * 获取读连接（支持读写分离）
   */
  getReadConnection(name?: string): Kysely<any>;

  /**
   * 获取写连接（支持读写分离）
   */
  getWriteConnection(name?: string): Kysely<any>;

  /**
   * 检查连接是否存在
   */
  hasConnection(name: string): boolean;

  /**
   * 获取所有连接名称
   */
  getConnectionNames(): string[];

  /**
   * 获取连接信息
   */
  getConnectionInfo(name: string): ConnectionInfo;

  // ========== 连接生命周期管理 ==========

  /**
   * 初始化所有连接
   */
  initializeConnections(): Promise<void>;

  /**
   * 关闭指定连接
   */
  closeConnection(name: string): Promise<void>;

  /**
   * 关闭所有连接
   */
  closeAll(): Promise<void>;

  /**
   * 重新连接
   */
  reconnect(name?: string): Promise<void>;

  // ========== 健康检查方法 ==========

  /**
   * 检查连接健康状态
   */
  checkHealth(name?: string): Promise<HealthStatus>;

  /**
   * 检查所有连接健康状态
   */
  checkAllHealth(): Promise<Record<string, HealthStatus>>;

  /**
   * 获取连接健康状态
   */
  getHealthStatus(name: string): Promise<HealthStatus>;

  /**
   * 检查连接是否健康
   */
  isHealthy(name?: string): Promise<boolean>;

  // ========== 统计信息方法 ==========

  /**
   * 获取连接统计信息
   */
  getConnectionStats(name?: string): ConnectionStats;

  /**
   * 获取所有连接统计信息
   */
  getAllConnectionStats(): Record<string, ConnectionStats>;

  // ========== 事务管理方法 ==========

  /**
   * 执行事务
   */
  transaction<R>(
    fn: (trx: Transaction<any>) => Promise<R>,
    options?: TransactionOptions
  ): Promise<R>;

  // ========== 资源清理方法 ==========

  /**
   * 关闭管理器并清理资源
   */
  close(): Promise<void>;
}

/**
 * 连接工厂接口
 */
export interface IConnectionFactory {
  /**
   * 创建数据库连接
   */
  create(config: ConnectionConfig): Promise<Kysely<any>>;

  /**
   * 创建连接池
   */
  createPool(config: ConnectionConfig): Promise<Kysely<any>>;

  /**
   * 验证连接配置
   */
  validateConfig(config: ConnectionConfig): DatabaseResult<boolean>;

  /**
   * 测试连接
   */
  testConnection(config: ConnectionConfig): Promise<DatabaseResult<boolean>>;

  /**
   * 检查驱动依赖
   */
  checkDriverAvailability(type: DatabaseType): DatabaseResult<boolean>;

  /**
   * 获取支持的数据库类型
   */
  getSupportedTypes(): DatabaseType[];

  /**
   * 销毁连接
   */
  destroy(connection: Kysely<any>): Promise<void>;
}

/**
 * 数据库方言接口
 */
export interface IDatabaseDialect {
  /**
   * 数据库类型
   */
  readonly type: DatabaseType;

  /**
   * 创建 Kysely 实例
   */
  createKysely(config: ConnectionConfig): Kysely<any>;

  /**
   * 获取默认端口
   */
  getDefaultPort(): number;

  /**
   * 构建连接字符串
   */
  buildConnectionString(config: ConnectionConfig): string;

  /**
   * 验证配置
   */
  validateConfig(config: ConnectionConfig): boolean;

  /**
   * 获取健康检查查询
   */
  getHealthCheckQuery(): string;

  /**
   * 处理连接错误
   */
  handleConnectionError(error: Error): Error;

  /**
   * 获取连接选项
   */
  getConnectionOptions(config: ConnectionConfig): Record<string, any>;
}

/**
 * 健康检查器接口
 */
export interface IHealthChecker {
  /**
   * 检查单个连接
   */
  checkConnection(name: string): Promise<boolean>;

  /**
   * 检查所有连接
   */
  checkAllConnections(): Promise<boolean>;

  /**
   * 获取连接健康状态详情
   */
  getConnectionHealth(name: string): Promise<HealthStatus>;

  /**
   * 获取所有连接健康状态详情
   */
  getAllConnectionsHealth(): Promise<Record<string, HealthStatus>>;

  /**
   * 启动健康检查
   */
  start(): void;

  /**
   * 停止健康检查
   */
  stop(): void;

  /**
   * 注册健康检查监听器
   */
  onHealthChange(callback: (name: string, healthy: boolean) => void): void;
}

/**
 * 查询日志器接口
 */
export interface IQueryLogger {
  /**
   * 记录查询
   */
  logQuery(
    query: string,
    params: any[],
    duration: number,
    connection: string
  ): void;

  /**
   * 记录慢查询
   */
  logSlowQuery(
    query: string,
    params: any[],
    duration: number,
    connection: string
  ): void;

  /**
   * 记录查询错误
   */
  logQueryError(
    query: string,
    params: any[],
    error: Error,
    connection: string
  ): void;

  /**
   * 获取查询统计
   */
  getQueryStats(): {
    total: number;
    slow: number;
    failed: number;
    avgDuration: number;
  };

  /**
   * 清理日志
   */
  cleanup(): void;
}

/**
 * 连接池管理器接口
 */
export interface IConnectionPoolManager {
  /**
   * 获取连接池统计
   */
  getPoolStats(name: string): {
    size: number;
    available: number;
    borrowed: number;
    pending: number;
  };

  /**
   * 获取所有连接池统计
   */
  getAllPoolStats(): Record<string, any>;

  /**
   * 清理空闲连接
   */
  cleanupIdleConnections(name?: string): Promise<void>;

  /**
   * 预热连接池
   */
  warmupPool(name: string): Promise<void>;

  /**
   * 调整连接池大小
   */
  resizePool(name: string, min: number, max: number): Promise<void>;
}

/**
 * 数据库迁移接口
 */
export interface IDatabaseMigrator {
  /**
   * 运行迁移
   */
  migrate(): Promise<void>;

  /**
   * 回滚迁移
   */
  rollback(steps?: number): Promise<void>;

  /**
   * 获取迁移状态
   */
  getStatus(): Promise<
    Array<{
      name: string;
      executed: boolean;
      executedAt?: Date;
    }>
  >;

  /**
   * 创建迁移文件
   */
  createMigration(name: string): Promise<string>;
}

/**
 * 数据库种子器接口
 */
export interface IDatabaseSeeder {
  /**
   * 运行种子
   */
  seed(): Promise<void>;

  /**
   * 运行指定种子
   */
  seedSpecific(name: string): Promise<void>;

  /**
   * 获取种子列表
   */
  getSeeds(): string[];

  /**
   * 清理种子数据
   */
  cleanup(): Promise<void>;
}

/**
 * 数据库监控器接口
 */
export interface IDatabaseMonitor {
  /**
   * 开始监控
   */
  start(): void;

  /**
   * 停止监控
   */
  stop(): void;

  /**
   * 获取性能指标
   */
  getMetrics(): {
    connectionPool: Record<string, any>;
    queries: Record<string, any>;
    transactions: Record<string, any>;
    errors: Record<string, any>;
  };

  /**
   * 重置指标
   */
  resetMetrics(): void;

  /**
   * 导出指标
   */
  exportMetrics(format: 'json' | 'prometheus'): string;
}

/**
 * 数据库备份接口
 */
export interface IDatabaseBackup {
  /**
   * 创建备份
   */
  backup(options?: {
    tables?: string[];
    compression?: boolean;
    format?: 'sql' | 'json';
  }): Promise<string>;

  /**
   * 恢复备份
   */
  restore(
    backupPath: string,
    options?: {
      dropExisting?: boolean;
      tables?: string[];
    }
  ): Promise<void>;

  /**
   * 列出备份
   */
  listBackups(): Promise<
    Array<{
      name: string;
      size: number;
      createdAt: Date;
    }>
  >;

  /**
   * 删除备份
   */
  deleteBackup(name: string): Promise<void>;
}

/**
 * 数据库事件类型
 */
export type DatabaseEvent =
  | 'connection:created'
  | 'connection:destroyed'
  | 'connection:error'
  | 'health:changed'
  | 'query:executed'
  | 'query:slow'
  | 'query:error'
  | 'transaction:started'
  | 'transaction:committed'
  | 'transaction:rolledback';

/**
 * 数据库事件监听器
 */
export interface IDatabaseEventListener {
  /**
   * 注册事件监听器
   */
  on(event: DatabaseEvent, handler: (...args: any[]) => void): void;

  /**
   * 移除事件监听器
   */
  off(event: DatabaseEvent, handler?: Function): void;

  /**
   * 触发事件
   */
  emit(event: DatabaseEvent, ...args: any[]): void;

  /**
   * 一次性监听器
   */
  once(event: DatabaseEvent, handler: (...args: any[]) => void): void;
}
