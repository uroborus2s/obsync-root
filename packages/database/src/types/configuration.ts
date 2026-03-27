// @stratix/database 配置类型定义
// 定义数据库插件的配置接口和选项

import type { DatabaseType } from './common.js';

/**
 * SSL 配置
 */
export interface SSLConfig {
  /** 是否拒绝未授权的连接 */
  rejectUnauthorized?: boolean;
  /** CA 证书 */
  ca?: string | Buffer;
  /** 客户端证书 */
  cert?: string | Buffer;
  /** 客户端私钥 */
  key?: string | Buffer;
  /** 服务器名称 */
  servername?: string;
  /** SSL 模式 */
  mode?:
    | 'disable'
    | 'allow'
    | 'prefer'
    | 'require'
    | 'verify-ca'
    | 'verify-full';
}

/**
 * 连接池配置
 */
export interface PoolConfig {
  /** 最小连接数 */
  min?: number;
  /** 最大连接数 */
  max?: number;
  /** 获取连接超时时间（毫秒） */
  acquireTimeoutMillis?: number;
  /** 创建连接超时时间（毫秒） */
  createTimeoutMillis?: number;
  /** 销毁连接超时时间（毫秒） */
  destroyTimeoutMillis?: number;
  /** 空闲超时时间（毫秒） */
  idleTimeoutMillis?: number;
  /** 清理间隔时间（毫秒） */
  reapIntervalMillis?: number;
  /** 创建重试间隔时间（毫秒） */
  createRetryIntervalMillis?: number;
  /** 验证连接的查询 */
  testQuery?: string;
}

/**
 * 单个数据库连接配置
 */
export interface ConnectionConfig {
  /** 数据库类型 */
  type: DatabaseType;
  /** 主机地址 */
  host?: string;
  /** 端口号 */
  port?: number;
  /** 数据库名称 */
  database: string;
  /** 用户名 */
  username?: string;
  /** 密码 */
  password?: string;
  /** 连接字符串（可选，优先级高于单独配置） */
  connectionString?: string;
  /** SSL 配置 */
  ssl?: SSLConfig;
  /** 连接池配置 */
  pool?: PoolConfig;
  /** SQLite 特定配置 */
  sqlite?: {
    /** 文件路径 */
    filename?: string;
    /** Pragma 设置 */
    pragma?: Record<string, string | number>;
  };
  /** 连接选项 */
  options?: Record<string, any>;
}

/**
 * 读写分离配置
 */
export interface ReadWriteSeparationConfig {
  /** 是否启用读写分离 */
  enabled: boolean;
  /** 写连接名称 */
  writeConnection: string;
  /** 读连接名称列表 */
  readConnections: string[];
  /** 负载均衡策略 */
  loadBalancing?:
    | 'round-robin'
    | 'random'
    | 'least-connections'
    | 'weighted-round-robin';
  /** 权重配置（用于加权轮询） */
  weights?: Record<string, number>;
  /** 故障转移配置 */
  failover?: {
    /** 是否启用故障转移 */
    enabled: boolean;
    /** 最大重试次数 */
    maxRetries: number;
    /** 重试延迟（毫秒） */
    retryDelay: number;
    /** 读库不可用时是否回退到写库 */
    fallbackToWrite: boolean;
  };
}

/**
 * 健康检查配置 - 统一版本
 * 合并了基础配置和扩展配置
 */
export interface HealthCheckConfig {
  /** 是否启用健康检查 */
  enabled: boolean;
  /** 检查间隔（毫秒） */
  interval?: number;
  /** 检查超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 不健康阈值 */
  unhealthyThreshold?: number;
  /** 健康阈值 */
  healthyThreshold?: number;
  /** 自定义健康检查查询 */
  query?: string;
  /** 健康检查失败回调 */
  onUnhealthy?: (connectionName: string, error: Error) => void;
  /** 健康检查恢复回调 */
  onHealthy?: (connectionName: string) => void;
  /** 健康检查端点路径 */
  endpoint?: string;
  /** 检查间隔（毫秒） - 别名 */
  intervalMs?: number;
  /** 检查超时时间（毫秒） - 别名 */
  timeoutMs?: number;
  /** 重试次数 - 别名 */
  retryCount?: number;
}

/**
 * 日志配置 - 统一版本
 * 合并了基础配置和扩展配置
 */
export interface LoggingConfig {
  /** 是否启用日志 */
  enabled: boolean;
  /** 日志级别 */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold?: number;
  /** 日志格式 */
  format?: 'json' | 'text';
  /** 日志输出目标 */
  targets?: Array<{
    type: 'console' | 'file';
    level: string;
    filename?: string;
    maxSize?: string;
    maxFiles?: number;
  }>;
  /** 敏感信息过滤 */
  sanitize?: {
    enabled: boolean;
    fields: string[];
    replacement: string;
  };
  /** 查询参数记录 */
  logParameters?: {
    enabled: boolean;
    maxLength: number;
    truncateArrays: number;
  };
  /** 是否记录查询 */
  queries?: boolean;
  /** 是否记录性能信息 */
  performance?: boolean;
}

/**
 * 监控配置 - 统一版本
 * 合并了基础配置和扩展配置
 */
export interface MonitoringConfig {
  /** 是否启用监控 */
  enabled: boolean;
  /** 指标收集间隔（毫秒） */
  metricsInterval?: number;
  /** 收集的指标 */
  metrics?: {
    /** 连接池指标 */
    connectionPool?: boolean;
    /** 查询性能指标 */
    queryPerformance?: boolean;
    /** 事务指标 */
    transactions?: boolean;
    /** 错误统计 */
    errors?: boolean;
  };
  /** 指标导出器 */
  exporters?: Array<{
    type: 'prometheus' | 'statsd';
    endpoint?: string;
    host?: string;
    port?: number;
    prefix?: string;
  }>;
  /** 告警配置 */
  alerts?: {
    enabled: boolean;
    rules: Array<{
      name: string;
      condition: string;
      severity: 'info' | 'warning' | 'critical';
      message: string;
    }>;
  };
  /** 采样率 (0-1) */
  sampleRate?: number;
  /** 最大指标数量 */
  maxMetricsCount?: number;
  /** 聚合窗口时间（毫秒） */
  aggregationWindowMs?: number;
  /** 慢查询阈值（毫秒） */
  slowQueryThresholdMs?: number;
}

/**
 * 安全配置 - 统一版本
 * 合并了基础配置和扩展配置
 */
export interface SecurityConfig {
  /** 连接字符串加密 */
  encryption?: {
    enabled: boolean;
    algorithm: string;
    key: string;
  };
  /** IP 白名单 */
  ipWhitelist?: string[];
  /** 连接限制 */
  connectionLimits?: {
    maxConnectionsPerIP: number;
    maxConnectionsPerUser: number;
    connectionTimeout: number;
  };
  /** 审计配置 */
  audit?: {
    enabled: boolean;
    logConnections: boolean;
    logQueries: boolean;
    logFailures: boolean;
    retentionDays: number;
  };
  /** 是否启用SQL注入保护 */
  enableSqlInjectionProtection?: boolean;
  /** 最大查询长度 */
  maxQueryLength?: number;
  /** 允许的操作类型 */
  allowedOperations?: string[];
}

/**
 * 测试配置
 */
export interface TestingConfig {
  /** 自动运行迁移 */
  autoMigration?: boolean;
  /** 自动填充测试数据 */
  seedData?: boolean;
  /** 测试后清理数据 */
  cleanupAfterTest?: boolean;
  /** 测试隔离 */
  isolateTests?: boolean;
}

/**
 * 连接工厂配置选项
 */
export interface ConnectionFactoryOptions {
  /** 是否启用自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 连接测试间隔（毫秒） */
  connectionTestInterval?: number;
  /** 是否在创建时测试连接 */
  testOnCreate?: boolean;
  /** 是否在获取时测试连接 */
  testOnAcquire?: boolean;
}

/**
 * 数据库插件配置 - 统一版本
 * 合并了 DatabasePluginOptions 和 DatabaseConfig
 */
export interface DatabaseConfig {
  /** 数据库连接配置 */
  connections: Record<string, ConnectionConfig>;
  /** 默认连接名称 */
  defaultConnection?: string;
  /** 连接工厂配置 */
  connectionFactory?: ConnectionFactoryOptions;
  /** 读写分离配置 */
  readWriteSeparation?: ReadWriteSeparationConfig;
  /** 健康检查配置 */
  healthCheck?: HealthCheckConfig;
  /** 日志配置 */
  logging?: LoggingConfig;
  /** 监控配置 */
  monitoring?: MonitoringConfig;
  /** 安全配置 */
  security?: SecurityConfig;
  /** 测试配置 */
  testing?: TestingConfig;
}

/**
 * 数据库插件配置的别名 - 保持向后兼容
 */
export type DatabasePluginOptions = DatabaseConfig;

/**
 * 生产环境配置选项
 */
export interface ProductionConfigOptions {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: SSLConfig;
  pool?: PoolConfig;
}
