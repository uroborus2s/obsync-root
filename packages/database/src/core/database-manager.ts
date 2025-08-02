// @stratix/database 增强数据库管理器
// 基于新的双层生命周期架构和简化的5个核心生命周期阶段

import { RESOLVER } from '@stratix/core';
import { isDevelopment } from '@stratix/utils/environment';
import {
  eitherLeft,
  eitherRight,
  isLeft,
  isRight,
  type Either
} from '@stratix/utils/functional';
import type { Kysely } from 'kysely';
import type {
  ConnectionConfig,
  ConnectionStats,
  DatabaseConfig,
  HealthStatus
} from '../types/index.js';
import {
  ConnectionError,
  DatabaseErrorHandler,
  DatabaseResult
} from '../utils/error-handler.js';
import ConnectionFactory from './connection-factory.js';

/**
 * 连接预创建状态
 */
interface PreCreationStatus {
  enabled: boolean;
  completed: boolean;
  connectionCount: number;
  errors: string[];
  duration: number;
  startTime?: number;
}

/**
 * 连接恢复状态
 */
interface RecoveryStatus {
  inProgress: boolean;
  lastAttempt?: number;
  attemptCount: number;
  maxAttempts: number;
  backoffMs: number;
}

/**
 * 增强的数据库管理器
 * 使用新的双层生命周期架构，实现数据库连接预创建和智能错误恢复
 *
 * 依赖注入配置：
 * - 使用 Awilix CLASSIC 注入模式 (与 @stratix/core 保持一致)
 * - SINGLETON 生命周期，全局共享实例
 * - 参数名与容器注册名完全匹配
 * - 实现 DatabaseManagerLifecycle 接口，支持生命周期管理
 */
export default class DatabaseManager {
  /**
   * Awilix 内联解析器配置
   * 使用 CLASSIC 模式与 @stratix/core 保持一致
   */
  static [RESOLVER] = {};

  private connections = new Map<string, Kysely<any>>();
  private connectionStats = new Map<string, ConnectionStats>();
  private healthStatus = new Map<string, boolean>();
  private connectionCreationPromises = new Map<string, Promise<Kysely<any>>>();
  private preCreationStatus: PreCreationStatus;
  private recoveryStatus: RecoveryStatus;
  private debugEnabled: boolean;

  /**
   * 构造函数 - 使用 Awilix CLASSIC 注入模式
   * 参数名必须与容器中注册的服务名完全匹配
   */
  constructor(
    private config: DatabaseConfig,
    private connectionFactory: ConnectionFactory
  ) {
    this.debugEnabled = isDevelopment();

    // 初始化状态
    this.preCreationStatus = {
      enabled: false,
      completed: false,
      connectionCount: 0,
      errors: [],
      duration: 0
    };

    this.recoveryStatus = {
      inProgress: false,
      attemptCount: 0,
      maxAttempts: 3,
      backoffMs: 1000
    };
  }

  /**
   * 结构化日志辅助方法
   */
  private log(message: string, context?: Record<string, any>): void {
    if (this.debugEnabled) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        component: 'EnhancedDatabaseManager',
        message,
        ...context
      };
      console.log(`🔧 ${JSON.stringify(logEntry)}`);
    }
  }

  /**
   * 错误日志方法
   */
  private logError(
    message: string,
    error?: Error | ConnectionError,
    context?: Record<string, any>
  ): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      component: 'EnhancedDatabaseManager',
      level: 'ERROR',
      message,
      error: error
        ? error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            }
          : {
              type: error.type,
              message: error.message,
              timestamp: error.timestamp,
              retryable: error.retryable,
              code: error.code,
              connectionName:
                'connectionName' in error ? error.connectionName : undefined,
              cause: 'cause' in error ? error.cause : undefined
            }
        : undefined,
      ...context
    };
    console.error(`❌ ${JSON.stringify(logEntry)}`);
  }

  /**
   * 性能日志方法
   */
  private logPerformance(
    operation: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    if (this.debugEnabled) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        component: 'EnhancedDatabaseManager',
        level: 'PERFORMANCE',
        operation,
        duration: `${duration}ms`,
        ...context
      };
      console.log(`⚡ ${JSON.stringify(logEntry)}`);
    }
  }

  /**
   * 获取所有连接配置
   */
  private getAllConnections(): Record<string, ConnectionConfig> {
    const allConnections: Record<string, ConnectionConfig> = {};

    if (this.config.connections) {
      Object.assign(allConnections, this.config.connections);
    }

    // 确保有默认连接
    if (!allConnections.default && this.config.defaultConnection) {
      const defaultConn = allConnections[this.config.defaultConnection];
      if (defaultConn) {
        allConnections.default = defaultConn;
      }
    }

    return allConnections;
  }

  /**
   * 🎯 beforeStart 生命周期 - 数据库配置验证和环境检查
   * 在服务注册前执行，确保数据库配置正确且环境满足要求
   */
  async validateEnvironment(): Promise<void> {
    if (this.debugEnabled) {
      console.log(
        '🔍 EnhancedDatabaseManager: Starting environment validation...'
      );
    }

    try {
      // 1. 验证数据库配置
      await this.validateDatabaseConfig();

      // 2. 检查数据库驱动可用性
      await this.checkDriverAvailability();

      // 3. 验证连接配置
      await this.validateConnectionConfigs();

      // 4. 检查系统资源
      await this.checkSystemResources();

      if (this.debugEnabled) {
        console.log(
          '✅ EnhancedDatabaseManager: Environment validation completed'
        );
      }
    } catch (error) {
      const errorMessage = `Database environment validation failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌ EnhancedDatabaseManager:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * 🎯 afterStart 生命周期 - 连接工厂初始化和依赖服务设置
   * 在服务注册完成后执行，初始化连接工厂和相关依赖
   */
  async initializeConnectionFactory(): Promise<void> {
    this.log('Initializing connection factory...');

    try {
      // 连接工厂和管理器已经在构造函数中初始化
      // 这里可以进行额外的配置设置
      this.log('Connection factory initialized');
    } catch (error) {
      const errorMessage = `Connection factory initialization failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌ EnhancedDatabaseManager:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  async initializeConnection(): Promise<void> {
    if (this.debugEnabled) {
      console.log(
        '🚀 EnhancedDatabaseManager: Starting connection pre-creation...'
      );
    }

    const startTime = Date.now();
    this.preCreationStatus.startTime = startTime;
    this.preCreationStatus.enabled = true;

    try {
      // 并行预创建所有连接
      const result = await this.preCreateAllConnections();

      if (!result.success) {
        throw new Error(
          `Failed to pre-create connections: ${result.error?.message}`
        );
      }

      this.preCreationStatus.completed = true;
      this.preCreationStatus.duration = Date.now() - startTime;
      this.preCreationStatus.connectionCount = this.connections.size;

      if (this.debugEnabled) {
        console.log(
          `✅ EnhancedDatabaseManager: ${this.connections.size} connections pre-created in ${this.preCreationStatus.duration}ms`
        );
      }

      // 启动连接健康监控
      await this.startHealthMonitoring();
    } catch (error) {
      this.preCreationStatus.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      console.error(
        '❌ EnhancedDatabaseManager: Connection pre-creation failed:',
        error
      );
      throw error; // 阻止应用启动
    }
  }

  /**
   * 🎯 onClose 生命周期 - 优雅的连接关闭和资源清理
   * 在应用关闭时执行，确保所有连接正确关闭和资源释放
   */
  async onClose(): Promise<void> {
    if (this.debugEnabled) {
      console.log(
        '🔄 EnhancedDatabaseManager: Starting graceful connection shutdown...'
      );
    }

    try {
      // 停止健康监控
      await this.stopHealthMonitoring();

      // 并行关闭所有连接
      const closePromises = Array.from(this.connections.entries()).map(
        async ([name, connection]) => {
          try {
            await connection.destroy();
            if (this.debugEnabled) {
              console.log(`✅ Connection ${name} closed successfully`);
            }
            return { name, success: true };
          } catch (error) {
            console.error(`❌ Failed to close connection ${name}:`, error);
            return {
              name,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        }
      );

      const results = await Promise.allSettled(closePromises);
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;

      // 清理状态
      this.connections.clear();
      this.connectionStats.clear();
      this.healthStatus.clear();
      this.connectionCreationPromises.clear();

      if (this.debugEnabled) {
        console.log(
          `✅ EnhancedDatabaseManager: ${successCount}/${results.length} connections closed successfully`
        );
      }
    } catch (error) {
      console.error(
        '❌ EnhancedDatabaseManager: Error during connection shutdown:',
        error
      );
    }
  }

  /**
   * 🎯 onError 生命周期 - 数据库连接错误的自动恢复机制
   * 在发生错误时执行，实现智能的连接重试和恢复逻辑
   */
  async handleDatabaseError(error: Error, context?: any): Promise<void> {
    if (this.debugEnabled) {
      console.error(
        '💥 EnhancedDatabaseManager: Database error occurred:',
        error
      );
    }

    try {
      // 记录错误统计
      await this.recordErrorMetrics(error, context);

      // 检查是否是连接相关错误
      if (this.isConnectionError(error)) {
        if (this.debugEnabled) {
          console.log(
            '🔄 EnhancedDatabaseManager: Attempting connection recovery...'
          );
        }

        // 执行连接恢复
        const recoveryResult = await this.attemptConnectionRecovery(error);

        if (recoveryResult.success) {
          if (this.debugEnabled) {
            console.log(
              '✅ EnhancedDatabaseManager: Connection recovery successful'
            );
          }
        } else {
          console.error(
            '❌ EnhancedDatabaseManager: Connection recovery failed:',
            recoveryResult.error
          );
        }
      }

      // 检查是否需要触发断路器
      await this.checkCircuitBreaker(error);
    } catch (recoveryError) {
      console.error(
        '❌ EnhancedDatabaseManager: Error recovery failed:',
        recoveryError
      );
    }
  }

  /**
   * 验证数据库配置
   */
  private async validateDatabaseConfig(): Promise<void> {
    if (
      !this.config.connections ||
      Object.keys(this.config.connections).length === 0
    ) {
      throw new Error('No database connections configured');
    }

    // 检查是否有默认连接
    const defaultConnectionName = this.config.defaultConnection || 'default';
    if (!this.config.connections[defaultConnectionName]) {
      throw new Error(
        `Default database connection '${defaultConnectionName}' not configured`
      );
    }

    // 验证所有连接配置
    const allConnections = this.getAllConnections();
    for (const [name, config] of Object.entries(allConnections)) {
      if (!config.type || !config.database) {
        throw new Error(
          `Invalid configuration for connection '${name}': missing type or database`
        );
      }
    }
  }

  /**
   * 检查数据库驱动可用性
   */
  private async checkDriverAvailability(): Promise<void> {
    const requiredDrivers = new Set<string>();
    const allConnections = this.getAllConnections();

    Object.values(allConnections).forEach((conn) => {
      requiredDrivers.add(conn.type);
    });

    for (const driverType of requiredDrivers) {
      try {
        switch (driverType) {
          case 'postgresql':
            await import('pg');
            break;
          case 'mysql':
            await import('mysql2');
            break;
          case 'sqlite':
            await import('better-sqlite3');
            break;
          case 'mssql':
            await import('tedious');
            break;
          default:
            throw new Error(`Unsupported database type: ${driverType}`);
        }
      } catch (error) {
        throw new Error(
          `Database driver '${driverType}' is not available: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * 验证连接配置
   */
  private async validateConnectionConfigs(): Promise<void> {
    const allConnections = this.getAllConnections();

    for (const [name, config] of Object.entries(allConnections)) {
      if (!config.type) {
        throw new Error(`Connection '${name}' missing database type`);
      }

      if (config.type !== 'sqlite') {
        if (!config.host) {
          throw new Error(`Connection '${name}' missing host`);
        }
        if (!config.database) {
          throw new Error(`Connection '${name}' missing database name`);
        }
      } else {
        if (!config.database) {
          throw new Error(`SQLite connection '${name}' missing database path`);
        }
      }
    }
  }

  /**
   * 检查系统资源
   */
  private async checkSystemResources(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const freeMemoryMB = Math.round(
      (memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024
    );

    if (freeMemoryMB < 50) {
      // 至少需要50MB可用内存
      console.warn(`⚠️ Low memory available: ${freeMemoryMB}MB`);
    }

    if (this.debugEnabled) {
      console.log(
        `📊 Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used, ${freeMemoryMB}MB free`
      );
    }
  }

  // 移除了不存在的配置方法，简化实现

  /**
   * 预创建所有数据库连接
   */
  private async preCreateAllConnections(): Promise<DatabaseResult<void>> {
    try {
      const allConnections = this.getAllConnections();
      const connectionNames = Object.keys(allConnections);
      const configs = connectionNames.map((name) => ({
        name,
        config: allConnections[name]
      }));

      if (this.debugEnabled) {
        console.log(
          `🔧 Pre-creating ${configs.length} database connections...`
        );
      }

      // 并行创建所有连接
      const connectionPromises = configs.map(async ({ name, config }) => {
        const startTime = Date.now();
        try {
          const connectionResult =
            await this.connectionFactory.createConnection(config);
          const duration = Date.now() - startTime;

          if (!connectionResult.success) {
            throw connectionResult.error;
          }

          this.connections.set(name, connectionResult.data);
          this.healthStatus.set(name, true);
          this.connectionStats.set(name, {
            name,
            type: config.type,
            status: 'connected',
            activeConnections: 1,
            idleConnections: 0,
            waitingConnections: 0,
            totalQueries: 0,
            slowQueries: 0,
            failedQueries: 0,
            avgResponseTime: 0,
            lastActivity: new Date()
          });

          if (this.debugEnabled) {
            console.log(`✅ Connection '${name}' created in ${duration}ms`);
          }

          return { name, success: true, duration };
        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(`❌ Failed to create connection '${name}':`, error);

          this.healthStatus.set(name, false);

          return {
            name,
            success: false,
            duration,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });

      const results = await Promise.allSettled(connectionPromises);
      const failures = results.filter(
        (r) => r.status === 'fulfilled' && !r.value.success
      );

      if (failures.length > 0) {
        const errorMessages = failures.map((f) =>
          f.status === 'fulfilled' ? f.value.error : 'Unknown error'
        );
        return DatabaseErrorHandler.failure(
          new ConnectionError(
            `Failed to create ${failures.length} connections: ${errorMessages.join('; ')}`
          )
        );
      }

      return DatabaseErrorHandler.success(undefined);
    } catch (error) {
      return DatabaseErrorHandler.failure(
        new ConnectionError(
          `Connection pre-creation failed: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  /**
   * 启动连接健康监控
   */
  private async startHealthMonitoring(): Promise<void> {
    this.log('Starting health monitoring');
    // 简化实现，移除不存在的配置
  }

  /**
   * 停止连接健康监控
   */
  private async stopHealthMonitoring(): Promise<void> {
    this.log('Stopping health monitoring');
    // 简化实现
  }

  /**
   * 记录错误统计
   */
  private async recordErrorMetrics(error: Error, context?: any): Promise<void> {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context: context?.url || context?.query || 'unknown',
      type: error.constructor.name
    };

    if (this.debugEnabled) {
      console.log('📊 Recording error metrics:', errorInfo);
    }

    // 更新连接统计中的错误计数
    for (const [name, stats] of this.connectionStats.entries()) {
      if (this.isConnectionRelatedError(error, name)) {
        stats.failedQueries++;
        this.connectionStats.set(name, stats);
      }
    }
  }

  /**
   * 检查是否是连接相关错误
   */
  private isConnectionError(error: Error): boolean {
    const connectionErrorKeywords = [
      'connection',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'database',
      'pool'
    ];

    const errorMessage = error.message.toLowerCase();
    return connectionErrorKeywords.some((keyword) =>
      errorMessage.includes(keyword.toLowerCase())
    );
  }

  /**
   * 检查错误是否与特定连接相关
   */
  private isConnectionRelatedError(
    error: Error,
    connectionName: string
  ): boolean {
    return (
      error.message.includes(connectionName) ||
      error.stack?.includes(connectionName) ||
      this.isConnectionError(error)
    );
  }

  /**
   * 尝试连接恢复
   */
  private async attemptConnectionRecovery(
    _error: Error
  ): Promise<DatabaseResult<void>> {
    if (this.recoveryStatus.inProgress) {
      return DatabaseErrorHandler.failure(
        new ConnectionError('Connection recovery already in progress')
      );
    }

    this.recoveryStatus.inProgress = true;
    this.recoveryStatus.lastAttempt = Date.now();
    this.recoveryStatus.attemptCount++;

    try {
      if (this.recoveryStatus.attemptCount > this.recoveryStatus.maxAttempts) {
        return DatabaseErrorHandler.failure(
          new ConnectionError(
            `Max recovery attempts (${this.recoveryStatus.maxAttempts}) exceeded`
          )
        );
      }

      // 等待退避时间
      if (this.recoveryStatus.attemptCount > 1) {
        const backoffTime =
          this.recoveryStatus.backoffMs *
          Math.pow(2, this.recoveryStatus.attemptCount - 1);
        if (this.debugEnabled) {
          console.log(
            `⏳ Waiting ${backoffTime}ms before recovery attempt ${this.recoveryStatus.attemptCount}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }

      // 尝试重新创建失败的连接
      const failedConnections = Array.from(this.healthStatus.entries())
        .filter(([_, healthy]) => !healthy)
        .map(([name]) => name);

      if (failedConnections.length === 0) {
        this.recoveryStatus.inProgress = false;
        return DatabaseErrorHandler.success(undefined);
      }

      if (this.debugEnabled) {
        console.log(
          `🔄 Attempting to recover ${failedConnections.length} failed connections`
        );
      }

      const recoveryPromises = failedConnections.map(async (name) => {
        try {
          const allConnections = this.getAllConnections();
          const config = allConnections[name];
          if (!config) {
            throw new Error(`Connection config for '${name}' not found`);
          }
          const connectionResult =
            await this.connectionFactory.createConnection(config);

          if (!connectionResult.success) {
            throw connectionResult.error;
          }

          // 关闭旧连接（如果存在）
          const oldConnection = this.connections.get(name);
          if (oldConnection) {
            try {
              await oldConnection.destroy();
            } catch (closeError) {
              console.warn(
                `Warning: Failed to close old connection ${name}:`,
                closeError
              );
            }
          }

          // 更新连接
          this.connections.set(name, connectionResult.data);
          this.healthStatus.set(name, true);

          if (this.debugEnabled) {
            console.log(`✅ Connection ${name} recovered successfully`);
          }

          return { name, success: true };
        } catch (recoveryError) {
          console.error(
            `❌ Failed to recover connection ${name}:`,
            recoveryError
          );
          return {
            name,
            success: false,
            error:
              recoveryError instanceof Error
                ? recoveryError.message
                : String(recoveryError)
          };
        }
      });

      const recoveryResults = await Promise.allSettled(recoveryPromises);
      const successfulRecoveries = recoveryResults.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;

      this.recoveryStatus.inProgress = false;

      if (successfulRecoveries > 0) {
        // 重置恢复计数器，因为至少有一些连接恢复成功
        this.recoveryStatus.attemptCount = 0;

        if (this.debugEnabled) {
          console.log(
            `✅ Successfully recovered ${successfulRecoveries}/${failedConnections.length} connections`
          );
        }

        return DatabaseErrorHandler.success(undefined);
      } else {
        return DatabaseErrorHandler.failure(
          new ConnectionError(
            `Failed to recover any of the ${failedConnections.length} failed connections`
          )
        );
      }
    } catch (error) {
      this.recoveryStatus.inProgress = false;
      return DatabaseErrorHandler.failure(
        new ConnectionError(
          `Connection recovery failed: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  /**
   * 检查断路器状态
   */
  private async checkCircuitBreaker(_error: Error): Promise<void> {
    // 简化断路器实现
    const errorRate = this.calculateErrorRate();
    const threshold = 0.5; // 默认阈值

    if (errorRate > threshold) {
      this.log(
        `Circuit breaker threshold exceeded: ${errorRate} > ${threshold}`
      );
      // 可以在这里实现断路器打开逻辑
    }
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(): number {
    let totalQueries = 0;
    let totalErrors = 0;

    for (const stats of this.connectionStats.values()) {
      totalQueries += stats.totalQueries;
      totalErrors += stats.failedQueries;
    }

    return totalQueries > 0 ? totalErrors / totalQueries : 0;
  }

  /**
   * 验证连接配置是否存在
   */
  private validateConnectionConfig(
    connectionName: string
  ): Either<ConnectionError, ConnectionConfig> {
    const allConnections = this.getAllConnections();
    const config = allConnections[connectionName];

    if (!config) {
      const availableConnections = Object.keys(allConnections);
      const errorMessage = `Connection '${connectionName}' not found in configuration. Available connections: [${availableConnections.join(', ')}]`;
      return eitherLeft(new ConnectionError(errorMessage));
    }

    return eitherRight(config);
  }

  /**
   * 安全地从缓存获取连接
   */
  private getConnectionFromCache(
    connectionName: string
  ): Either<ConnectionError, Kysely<any>> {
    const connection = this.connections.get(connectionName);

    if (!connection) {
      return eitherLeft(
        new ConnectionError(`Connection '${connectionName}' not found in cache`)
      );
    }

    return eitherRight(connection);
  }

  /**
   * 线程安全地创建新连接
   */
  private async createConnectionSafely(
    connectionName: string,
    config: ConnectionConfig
  ): Promise<Either<ConnectionError, Kysely<any>>> {
    // 检查是否已有创建中的Promise
    const existingPromise = this.connectionCreationPromises.get(connectionName);
    if (existingPromise) {
      try {
        const connection = await existingPromise;
        return eitherRight(connection);
      } catch (error) {
        return eitherLeft(
          new ConnectionError(
            `Failed to wait for existing connection creation: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    }

    // 创建新的连接Promise
    const creationPromise = this.createNewConnection(connectionName, config);
    this.connectionCreationPromises.set(connectionName, creationPromise);

    try {
      const connection = await creationPromise;

      // 保存到缓存
      this.connections.set(connectionName, connection);
      this.healthStatus.set(connectionName, true);

      // 初始化连接统计
      this.connectionStats.set(connectionName, {
        name: connectionName,
        type: config.type,
        status: 'connected',
        activeConnections: 1,
        idleConnections: 0,
        waitingConnections: 0,
        totalQueries: 0,
        slowQueries: 0,
        failedQueries: 0,
        avgResponseTime: 0,
        lastActivity: new Date()
      });

      this.log(`Connection created and cached successfully`, {
        connectionName,
        connectionType: config.type,
        operation: 'createConnectionSafely'
      });

      return eitherRight(connection);
    } catch (error) {
      const errorMessage = `Failed to create connection '${connectionName}': ${error instanceof Error ? error.message : String(error)}`;
      this.logError(
        `Connection creation failed`,
        error instanceof Error ? error : new Error(String(error)),
        {
          connectionName,
          connectionType: config.type,
          operation: 'createConnectionSafely'
        }
      );
      return eitherLeft(new ConnectionError(errorMessage));
    } finally {
      // 清理创建Promise
      this.connectionCreationPromises.delete(connectionName);
    }
  }

  /**
   * 创建新连接的实际实现
   */
  private async createNewConnection(
    connectionName: string,
    config: ConnectionConfig
  ): Promise<Kysely<any>> {
    const startTime = Date.now();

    this.log(`Creating new database connection`, {
      connectionName,
      connectionType: config.type,
      operation: 'createNewConnection'
    });

    const connectionResult =
      await this.connectionFactory.createConnection(config);

    const duration = Date.now() - startTime;

    if (!connectionResult.success) {
      this.logError(
        `Connection factory failed to create connection`,
        connectionResult.error instanceof Error
          ? connectionResult.error
          : new Error('Unknown connection creation error'),
        {
          connectionName,
          connectionType: config.type,
          duration,
          operation: 'createNewConnection'
        }
      );
      throw (
        connectionResult.error || new Error('Unknown connection creation error')
      );
    }

    this.logPerformance('createNewConnection', duration, {
      connectionName,
      connectionType: config.type
    });

    return connectionResult.data;
  }

  /**
   * 更新连接使用统计
   */
  private updateConnectionStats(connectionName: string): void {
    const stats = this.connectionStats.get(connectionName);
    if (stats) {
      stats.lastActivity = new Date();
      stats.totalQueries++;
      this.connectionStats.set(connectionName, stats);
    }
  }

  /**
   * 获取连接（现在支持自动创建）
   */
  public async getConnection(
    connectionName: string = 'default'
  ): Promise<Kysely<any>> {
    const startTime = Date.now();

    this.log(`Requesting database connection`, {
      connectionName,
      operation: 'getConnection'
    });

    // 1. 首先尝试从缓存获取
    const cachedResult = this.getConnectionFromCache(connectionName);
    if (isRight(cachedResult)) {
      const duration = Date.now() - startTime;
      this.log(`Connection found in cache`, {
        connectionName,
        operation: 'getConnection',
        source: 'cache'
      });
      this.logPerformance('getConnection', duration, {
        connectionName,
        source: 'cache'
      });
      this.updateConnectionStats(connectionName);
      return cachedResult.right;
    }

    // 2. 验证连接配置
    const configResult = this.validateConnectionConfig(connectionName);
    if (isLeft(configResult)) {
      this.logError(
        `Connection configuration validation failed`,
        configResult.left,
        {
          connectionName,
          operation: 'getConnection'
        }
      );
      throw configResult.left;
    }

    // 3. 自动创建新连接
    this.log(`Auto-creating new connection`, {
      connectionName,
      connectionType: configResult.right.type,
      operation: 'getConnection'
    });

    const creationResult = await this.createConnectionSafely(
      connectionName,
      configResult.right
    );

    if (isLeft(creationResult)) {
      this.logError(`Auto-creation of connection failed`, creationResult.left, {
        connectionName,
        operation: 'getConnection'
      });
      throw creationResult.left;
    }

    const duration = Date.now() - startTime;
    this.logPerformance('getConnection', duration, {
      connectionName,
      source: 'auto-created'
    });

    this.updateConnectionStats(connectionName);
    return creationResult.right;
  }

  /**
   * 检查连接是否存在
   */
  public hasConnection(connectionName: string): boolean {
    return this.connections.has(connectionName);
  }

  /**
   * 获取读连接（支持读写分离）
   */
  public async getReadConnection(
    connectionName: string = 'default'
  ): Promise<Kysely<any>> {
    // 尝试获取专用的读连接
    const readConnectionName = `${connectionName}-read`;
    if (this.hasConnection(readConnectionName)) {
      return await this.getConnection(readConnectionName);
    }

    // 回退到默认连接
    return await this.getConnection(connectionName);
  }

  /**
   * 获取写连接（支持读写分离）
   */
  public async getWriteConnection(
    connectionName: string = 'default'
  ): Promise<Kysely<any>> {
    // 尝试获取专用的写连接
    const writeConnectionName = `${connectionName}-write`;
    if (this.hasConnection(writeConnectionName)) {
      return await this.getConnection(writeConnectionName);
    }

    // 回退到默认连接
    return await this.getConnection(connectionName);
  }

  /**
   * 获取连接统计信息
   */
  public getConnectionStats(): Map<string, ConnectionStats> {
    return new Map(this.connectionStats);
  }

  /**
   * 获取预创建状态
   */
  public getPreCreationStatus(): PreCreationStatus {
    return { ...this.preCreationStatus };
  }

  /**
   * 获取恢复状态
   */
  public getRecoveryStatus(): RecoveryStatus {
    return { ...this.recoveryStatus };
  }

  /**
   * 检查所有连接的健康状态
   */
  public async checkAllHealth(): Promise<DatabaseResult<HealthStatus[]>> {
    try {
      const healthPromises = Array.from(this.connections.entries()).map(
        async ([name, connection]) => {
          const startTime = Date.now();
          try {
            // 执行简单的健康检查查询
            await connection
              .selectFrom('information_schema.tables' as any)
              .limit(1)
              .execute();
            const responseTime = Date.now() - startTime;

            this.healthStatus.set(name, true);

            return {
              healthy: true,
              responseTime,
              lastCheck: new Date()
            };
          } catch (error) {
            const responseTime = Date.now() - startTime;

            this.healthStatus.set(name, false);

            return {
              healthy: false,
              responseTime,
              lastCheck: new Date(),
              error: error instanceof Error ? error.message : String(error)
            };
          }
        }
      );

      const healthResults = await Promise.allSettled(healthPromises);
      const healthStatuses = healthResults.map((result) =>
        result.status === 'fulfilled'
          ? result.value
          : {
              healthy: false,
              responseTime: 0,
              lastCheck: new Date(),
              error: 'Health check failed'
            }
      );

      return DatabaseErrorHandler.success(healthStatuses);
    } catch (error) {
      return DatabaseErrorHandler.failure(
        new ConnectionError(
          `Health check failed: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }
}
