// @stratix/database 通用类型定义
// 定义插件中使用的通用类型和接口

import type {
  DeleteQueryBuilder,
  SelectQueryBuilder,
  Selectable,
  UpdateQueryBuilder
} from 'kysely';

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
export type TableColumnKey<DB, TB extends keyof DB> = Extract<
  keyof Selectable<DB[TB]>,
  string
>;

export interface QueryOptions<
  DB = any,
  TB extends keyof DB = Extract<keyof DB, string>
> {
  /** 限制返回记录数 */
  limit?: number;
  /** 跳过记录数 */
  offset?: number;
  /** 排序条件 */
  orderBy?: OrderByClause<DB, TB> | OrderByClause<DB, TB>[];
  /** 是否使用只读连接 */
  readonly?: boolean;
  /** 连接名称 */
  connectionName?: string;
}

/**
 * 排序子句
 */
export interface OrderByClause<
  DB = any,
  TB extends keyof DB = Extract<keyof DB, string>
> {
  /** 排序字段 */
  field: TableColumnKey<DB, TB>;
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

export type SelectWhereExpression<DB, TB extends keyof DB> = (
  qb: SelectQueryBuilder<DB, TB, any>
) => SelectQueryBuilder<DB, TB, any>;

export type UpdateWhereExpression<DB, TB extends keyof DB> = (
  qb: UpdateQueryBuilder<DB, TB, TB, any>
) => UpdateQueryBuilder<DB, TB, TB, any>;

export type DeleteWhereExpression<DB, TB extends keyof DB> = (
  qb: DeleteQueryBuilder<DB, TB, any>
) => DeleteQueryBuilder<DB, TB, any>;

/**
 * Kysely 查询表达式类型
 */
export type WhereExpression<DB, TB extends keyof DB> =
  SelectWhereExpression<DB, TB> &
    UpdateWhereExpression<DB, TB> &
    DeleteWhereExpression<DB, TB>;

/**
 * 通用工具类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
