// @stratix/database 通用类型定义
// 定义插件中使用的通用类型和接口

/**
 * 数据库类型枚举
 */
export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mssql';

/**
 * 连接状态
 */
export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error';

/**
 * 健康状态
 */
export interface HealthStatus {
  /** 是否健康 */
  healthy: boolean;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 最后检查时间 */
  lastCheck: Date;
  /** 错误信息（如果不健康） */
  error?: string;
  /** 详细信息 */
  details?: Record<string, any>;
}

/**
 * 连接统计信息
 */
export interface ConnectionStats {
  /** 连接名称 */
  name: string;
  /** 数据库类型 */
  type: DatabaseType;
  /** 连接状态 */
  status: ConnectionStatus;
  /** 活跃连接数 */
  activeConnections: number;
  /** 空闲连接数 */
  idleConnections: number;
  /** 等待连接数 */
  waitingConnections: number;
  /** 总查询数 */
  totalQueries: number;
  /** 慢查询数 */
  slowQueries: number;
  /** 失败查询数 */
  failedQueries: number;
  /** 平均响应时间 */
  avgResponseTime: number;
  /** 最后活动时间 */
  lastActivity: Date;
}

/**
 * 连接信息
 */
export interface ConnectionInfo {
  /** 连接名称 */
  name: string;
  /** 数据库类型 */
  type: DatabaseType;
  /** 连接状态 */
  status: ConnectionStatus;
  /** 主机地址 */
  host?: string;
  /** 端口号 */
  port?: number;
  /** 数据库名称 */
  database?: string;
  /** 是否为只读连接 */
  readonly?: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 最后连接时间 */
  lastConnectedAt?: Date;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  /** 限制返回记录数 */
  limit?: number;
  /** 跳过记录数 */
  offset?: number;
  /** 排序条件 */
  orderBy?: OrderByClause | OrderByClause[];
  /** 是否使用只读连接 */
  readonly?: boolean;
  /** 连接名称 */
  connectionName?: string;
}

/**
 * 排序子句
 */
export interface OrderByClause {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  direction: 'asc' | 'desc';
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  /** 页码（从1开始） */
  page: number;
  /** 每页记录数 */
  pageSize: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  data: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页记录数 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * 事务选项
 */
export interface TransactionOptions {
  /** 连接名称 */
  connectionName?: string;
  /** 是否为只读事务 */
  readonly?: boolean;
  /** 事务超时时间（毫秒） */
  timeout?: number;
  /** 隔离级别 */
  isolationLevel?:
    | 'READ_UNCOMMITTED'
    | 'READ_COMMITTED'
    | 'REPEATABLE_READ'
    | 'SERIALIZABLE';
}

/**
 * Kysely 查询表达式类型 - 简化为兼容形式
 */
export type WhereExpression<DB, TB extends keyof DB> = any;

/**
 * 数据库错误类型
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * 连接错误
 */
export class ConnectionError extends DatabaseError {
  constructor(
    message: string,
    public readonly connectionName?: string,
    cause?: Error
  ) {
    super(message, 'CONNECTION_ERROR', cause);
    this.name = 'ConnectionError';
  }
}

/**
 * 配置错误
 */
export class ConfigurationError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', cause);
    this.name = 'ConfigurationError';
  }
}

/**
 * 查询错误
 */
export class QueryError extends DatabaseError {
  constructor(
    message: string,
    public readonly query?: string,
    public readonly params?: any[],
    cause?: Error
  ) {
    super(message, 'QUERY_ERROR', cause);
    this.name = 'QueryError';
  }
}

/**
 * 事务错误
 */
export class TransactionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'TRANSACTION_ERROR', cause);
    this.name = 'TransactionError';
  }
}

/**
 * 通用工具类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * 数据库操作结果
 */
export interface OperationResult<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 影响的行数 */
  affectedRows?: number;
  /** 执行时间（毫秒） */
  executionTime?: number;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult<T = any> {
  /** 成功的操作数 */
  successCount: number;
  /** 失败的操作数 */
  failureCount: number;
  /** 成功的结果 */
  successes: T[];
  /** 失败的错误 */
  failures: Array<{ index: number; error: string }>;
  /** 总执行时间 */
  totalExecutionTime: number;
}
