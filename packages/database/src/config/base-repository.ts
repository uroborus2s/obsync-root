// @stratix/database 函数式仓储基类
// 采用函数式编程模式，支持管道操作和查询组合

import type { Logger } from '@stratix/core';
import {
  type Either,
  eitherLeft,
  eitherRight,
  fromNullable,
  isLeft,
  isNone,
  type Maybe,
  tryCatchAsync
} from '@stratix/core/functional';
import {
  CompiledQuery,
  sql as kyselySql
} from 'kysely';
import type {
  ColumnMetadata,
  Compilable,
  ColumnDefinitionBuilder,
  CreateTableBuilder,
  DeleteResult,
  DeleteQueryBuilder,
  Expression,
  ExpressionBuilder,
  Insertable,
  InsertQueryBuilder,
  Kysely,
  QueryResult,
  RawBuilder,
  SchemaModule,
  Selectable,
  SelectQueryBuilder,
  SqlBool,
  TableMetadata,
  Transaction,
  Updateable,
  UpdateResult,
  UpdateQueryBuilder
} from 'kysely';

import {
  getConnectionType,
  getReadConnection,
  getWriteConnection
} from '../core/database-manager.js';
import {
  executeInTransaction,
  executeTransactionInBatches,
  executeTransactionWithRetry,
  getCurrentTransaction,
  type BatchTransactionOptions as InternalBatchTransactionOptions,
  type TransactionOptions as InternalTransactionOptions
} from '../core/transaction-manager.js';
import {
  type DatabaseError,
  ErrorClassifier,
  ValidationError
} from '../utils/error-handler.js';

/**
 * 数据库操作上下文
 */
export interface DatabaseOperationContext {
  /** 临时指定连接名称 */
  connectionName?: string;
  /** 是否为只读操作 */
  readonly?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 操作标识符 */
  operationId?: string;
}

export interface RepositoryTransactionOptions extends InternalTransactionOptions {}

export interface RepositoryBatchTransactionOptions
  extends InternalBatchTransactionOptions {}

export type RepositoryStateGuard<T> = Partial<
  Record<Extract<keyof T, string>, unknown>
>;

/**
 * 数据库类型枚举
 */
export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
  MSSQL = 'mssql'
}

/**
 * 通用数据库字段类型枚举
 * 提供跨数据库兼容的统一类型定义
 */
export enum DataColumnType {
  // 🎯 数字类型 - 通用定义
  /** 32位整数 */
  INTEGER = 'INTEGER',
  /** 64位大整数 */
  BIGINT = 'BIGINT',
  /** 小整数（16位） */
  SMALLINT = 'SMALLINT',
  /** 微整数（8位） */
  TINYINT = 'TINYINT',
  /** 精确小数 */
  DECIMAL = 'DECIMAL',
  /** 单精度浮点数 */
  FLOAT = 'FLOAT',
  /** 双精度浮点数 */
  DOUBLE = 'DOUBLE',

  // 🎯 字符串类型 - 通用定义
  /** 可变长度字符串 */
  STRING = 'STRING',
  /** 固定长度字符串 */
  CHAR = 'CHAR',
  /** 长文本 */
  TEXT = 'TEXT',
  /** 中等长度文本 */
  MEDIUMTEXT = 'MEDIUMTEXT',
  /** 超长文本 */
  LONGTEXT = 'LONGTEXT',

  // 🎯 日期时间类型 - 通用定义
  /** 日期（年月日） */
  DATE = 'DATE',
  /** 时间（时分秒） */
  TIME = 'TIME',
  /** 时间戳（带时区） */
  TIMESTAMP = 'TIMESTAMP',
  /** 日期时间（不带时区） */
  DATETIME = 'DATETIME',

  // 🎯 布尔类型 - 通用定义
  /** 布尔值 */
  BOOLEAN = 'BOOLEAN',

  // 🎯 JSON 类型 - 通用定义
  /** JSON 数据 */
  JSON = 'JSON',

  // 🎯 二进制类型 - 通用定义
  /** 二进制大对象 */
  BLOB = 'BLOB',
  /** 二进制数据 */
  BINARY = 'BINARY',

  // 🎯 特殊类型 - 通用定义
  /** UUID 标识符 */
  UUID = 'UUID'
}

const STRING_COMPATIBLE_COLUMN_TYPES = new Set<DataColumnType>([
  DataColumnType.STRING,
  DataColumnType.CHAR,
  DataColumnType.TEXT,
  DataColumnType.MEDIUMTEXT,
  DataColumnType.LONGTEXT
]);

type ManagedTimestampColumn = 'created_at' | 'updated_at';

/**
 * 数据库特定类型映射
 * 将通用 ColumnType 映射到各数据库的具体类型
 */
const DATABASE_TYPE_MAPPING = {
  [DatabaseType.POSTGRESQL]: {
    [DataColumnType.INTEGER]: 'integer',
    [DataColumnType.BIGINT]: 'bigint',
    [DataColumnType.SMALLINT]: 'smallint',
    [DataColumnType.TINYINT]: 'smallint', // PostgreSQL 没有 tinyint，使用 smallint
    [DataColumnType.DECIMAL]: 'decimal',
    [DataColumnType.FLOAT]: 'real',
    [DataColumnType.DOUBLE]: 'double precision',
    [DataColumnType.STRING]: 'varchar',
    [DataColumnType.CHAR]: 'char',
    [DataColumnType.TEXT]: 'text',
    [DataColumnType.MEDIUMTEXT]: 'text', // PostgreSQL 统一使用 text
    [DataColumnType.LONGTEXT]: 'text',
    [DataColumnType.DATE]: 'date',
    [DataColumnType.TIME]: 'time',
    [DataColumnType.TIMESTAMP]: 'timestamp with time zone',
    [DataColumnType.DATETIME]: 'timestamp without time zone',
    [DataColumnType.BOOLEAN]: 'boolean',
    [DataColumnType.JSON]: 'jsonb', // PostgreSQL 优先使用 jsonb
    [DataColumnType.BLOB]: 'bytea',
    [DataColumnType.BINARY]: 'bytea',
    [DataColumnType.UUID]: 'uuid'
  },
  [DatabaseType.MYSQL]: {
    [DataColumnType.INTEGER]: 'int',
    [DataColumnType.BIGINT]: 'bigint',
    [DataColumnType.SMALLINT]: 'smallint',
    [DataColumnType.TINYINT]: 'tinyint',
    [DataColumnType.DECIMAL]: 'decimal',
    [DataColumnType.FLOAT]: 'float',
    [DataColumnType.DOUBLE]: 'double',
    [DataColumnType.STRING]: 'varchar',
    [DataColumnType.CHAR]: 'char',
    [DataColumnType.TEXT]: 'text',
    [DataColumnType.MEDIUMTEXT]: 'mediumtext',
    [DataColumnType.LONGTEXT]: 'longtext',
    [DataColumnType.DATE]: 'date',
    [DataColumnType.TIME]: 'time',
    [DataColumnType.TIMESTAMP]: 'timestamp',
    [DataColumnType.DATETIME]: 'datetime',
    [DataColumnType.BOOLEAN]: 'boolean',
    [DataColumnType.JSON]: 'json',
    [DataColumnType.BLOB]: 'blob',
    [DataColumnType.BINARY]: 'binary',
    [DataColumnType.UUID]: 'char(36)' // MySQL 使用 char(36) 存储 UUID
  },
  [DatabaseType.SQLITE]: {
    [DataColumnType.INTEGER]: 'integer',
    [DataColumnType.BIGINT]: 'integer', // SQLite 统一使用 integer
    [DataColumnType.SMALLINT]: 'integer',
    [DataColumnType.TINYINT]: 'integer',
    [DataColumnType.DECIMAL]: 'real',
    [DataColumnType.FLOAT]: 'real',
    [DataColumnType.DOUBLE]: 'real',
    [DataColumnType.STRING]: 'text',
    [DataColumnType.CHAR]: 'text',
    [DataColumnType.TEXT]: 'text',
    [DataColumnType.MEDIUMTEXT]: 'text',
    [DataColumnType.LONGTEXT]: 'text',
    [DataColumnType.DATE]: 'text', // SQLite 使用 text 存储日期
    [DataColumnType.TIME]: 'text',
    [DataColumnType.TIMESTAMP]: 'text',
    [DataColumnType.DATETIME]: 'text',
    [DataColumnType.BOOLEAN]: 'integer', // SQLite 使用 integer 存储布尔值
    [DataColumnType.JSON]: 'text',
    [DataColumnType.BLOB]: 'blob',
    [DataColumnType.BINARY]: 'blob',
    [DataColumnType.UUID]: 'text'
  },
  [DatabaseType.MSSQL]: {
    [DataColumnType.INTEGER]: 'int',
    [DataColumnType.BIGINT]: 'bigint',
    [DataColumnType.SMALLINT]: 'smallint',
    [DataColumnType.TINYINT]: 'tinyint',
    [DataColumnType.DECIMAL]: 'decimal',
    [DataColumnType.FLOAT]: 'float',
    [DataColumnType.DOUBLE]: 'float',
    [DataColumnType.STRING]: 'nvarchar',
    [DataColumnType.CHAR]: 'nchar',
    [DataColumnType.TEXT]: 'ntext',
    [DataColumnType.MEDIUMTEXT]: 'ntext',
    [DataColumnType.LONGTEXT]: 'ntext',
    [DataColumnType.DATE]: 'date',
    [DataColumnType.TIME]: 'time',
    [DataColumnType.TIMESTAMP]: 'datetime2',
    [DataColumnType.DATETIME]: 'datetime2',
    [DataColumnType.BOOLEAN]: 'bit',
    [DataColumnType.JSON]: 'nvarchar(max)', // MSSQL 2016+ 支持 JSON，但用 nvarchar 存储
    [DataColumnType.BLOB]: 'varbinary(max)',
    [DataColumnType.BINARY]: 'varbinary',
    [DataColumnType.UUID]: 'uniqueidentifier'
  }
} as const;

/**
 * 字段约束类型
 */
export interface ColumnConstraints {
  /** 是否为主键 */
  primaryKey?: boolean;
  /** 是否允许为空 */
  nullable?: boolean;
  /** 是否唯一 */
  unique?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 是否自增 */
  autoIncrement?: boolean;
  /** 字段长度（适用于 varchar, char 等） */
  length?: number;
  /** 精度（适用于 decimal, numeric） */
  precision?: number;
  /** 小数位数（适用于 decimal, numeric） */
  scale?: number;
  /** 外键引用 */
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  /** 检查约束 */
  check?: string;
  /** 注释 */
  comment?: string;
}

/**
 * 表字段定义
 */
export interface ColumnDefinition {
  /** 字段名 */
  name: string;
  /** 字段类型 */
  type: DataColumnType;
  /** 字段约束 */
  constraints?: ColumnConstraints;
}

/**
 * 索引定义
 */
export interface IndexDefinition {
  /** 索引名称 */
  name: string;
  /** 索引字段 */
  columns: string[];
  /** 是否唯一索引 */
  unique?: boolean;
  /** 索引类型 */
  type?: 'btree' | 'hash' | 'gin' | 'gist';
  /** 条件索引 */
  where?:
    | Expression<SqlBool>
    | ((eb: ExpressionBuilder<any, never>) => Expression<SqlBool>);
}

/**
 * 表 Schema 定义
 */
export interface TableSchema {
  /** 表名 */
  tableName: string;
  /** 字段定义 */
  columns: ColumnDefinition[];
  /** 索引定义 */
  indexes?: IndexDefinition[];
  /** 表注释 */
  comment?: string;
  /** 表选项（如存储引擎等） */
  options?: Record<string, any>;
}

/**
 * 自动表创建配置
 */
export interface AutoTableCreationConfig {
  /** 是否启用自动表创建 */
  enabled?: boolean;
  /** 是否在开发环境自动启用 */
  autoEnableInDevelopment?: boolean;
  /** 是否强制重建表（危险操作） */
  forceRecreate?: boolean;
  /** 是否创建索引 */
  createIndexes?: boolean;
  /** 表创建超时时间（毫秒） */
  timeout?: number;
}

/**
 * 表创建器
 */
export class TableCreator {
  /**
   * 根据 schema 创建表 - 使用 ifNotExists 优化版本
   */
  static async createTable(
    connection: Kysely<any>,
    schema: TableSchema,
    databaseType: DatabaseType,
    options: { forceRecreate?: boolean } = {}
  ): Promise<void> {
    // 如果强制重建，先删除表
    if (options.forceRecreate) {
      await this.dropTableIfExists(connection, schema.tableName);
    }

    // 🎯 使用 Kysely 的 ifNotExists() 方法，避免自己实现表存在性检查
    let createTableBuilder = connection.schema
      .createTable(schema.tableName)
      .ifNotExists();

    // 添加字段
    for (const column of schema.columns) {
      createTableBuilder = this.addColumn(
        createTableBuilder,
        column,
        databaseType
      );
    }

    // 添加表注释（如果支持）
    if (schema.comment && databaseType !== DatabaseType.SQLITE) {
      // SQLite 不支持表注释
      createTableBuilder = createTableBuilder as any;
    }

    // 执行创建表语句
    await createTableBuilder.execute();

    // 创建索引
    if (schema.indexes && schema.indexes.length > 0) {
      await this.createIndexes(connection, schema.tableName, schema.indexes);
    }
  }

  /**
   * 添加字段到表创建器 - 使用映射表的统一方法
   */
  private static addColumn(
    builder: CreateTableBuilder<string, never>,
    column: ColumnDefinition,
    databaseType: DatabaseType
  ): CreateTableBuilder<string, never> {
    const constraints = column.constraints || {};

    // 🎯 使用映射表获取基础类型
    const baseType = DATABASE_TYPE_MAPPING[databaseType][column.type];
    if (!baseType) {
      throw new Error(
        `不支持的列类型: ${column.type} 在数据库 ${databaseType} 中`
      );
    }

    // 根据约束条件调整列类型
    const columnType = TableCreator.getColumnTypeWithConstraints(
      baseType,
      column.type,
      constraints,
      databaseType
    );

    return builder.addColumn(column.name, columnType as any, (col) => {
      let colBuilder = col;

      // 处理自增（仅对支持的类型和数据库）
      if (
        constraints.autoIncrement &&
        TableCreator.shouldApplyAutoIncrement(column.type, databaseType)
      ) {
        colBuilder = colBuilder.autoIncrement();
      }

      return TableCreator.applyColumnConstraints(colBuilder, constraints);
    });
  }

  /**
   * 根据约束条件调整列类型
   */
  private static getColumnTypeWithConstraints(
    baseType: string,
    columnType: DataColumnType,
    constraints: ColumnConstraints,
    databaseType: DatabaseType
  ): string {
    switch (columnType) {
      case DataColumnType.STRING:
        // SQLite 的 TEXT 类型不支持长度约束
        if (databaseType === DatabaseType.SQLITE && baseType === 'text') {
          return baseType; // SQLite TEXT 类型忽略长度约束
        }

        if (constraints.length) {
          return `${baseType}(${constraints.length})`;
        }
        // 为 varchar 类型设置默认长度
        return baseType === 'varchar' || baseType === 'nvarchar'
          ? `${baseType}(255)`
          : baseType;

      case DataColumnType.CHAR:
        if (constraints.length) {
          return `${baseType}(${constraints.length})`;
        }
        // 为 char 类型设置默认长度
        return `${baseType}(1)`;

      case DataColumnType.DECIMAL:
        if (constraints.precision && constraints.scale) {
          return `${baseType}(${constraints.precision},${constraints.scale})`;
        }
        return baseType;

      case DataColumnType.BINARY:
        if (constraints.length) {
          return `${baseType}(${constraints.length})`;
        }
        // 为 binary 类型设置默认长度
        return `${baseType}(255)`;

      case DataColumnType.INTEGER:
        // PostgreSQL 自增使用 serial
        if (
          constraints.autoIncrement &&
          databaseType === DatabaseType.POSTGRESQL
        ) {
          return 'serial';
        }
        return baseType;

      case DataColumnType.BIGINT:
        // PostgreSQL 自增使用 bigserial
        if (
          constraints.autoIncrement &&
          databaseType === DatabaseType.POSTGRESQL
        ) {
          return 'bigserial';
        }
        return baseType;

      default:
        return baseType;
    }
  }

  /**
   * 判断是否应该应用自增约束
   */
  private static shouldApplyAutoIncrement(
    columnType: DataColumnType,
    databaseType: DatabaseType
  ): boolean {
    // 只有整数类型支持自增
    const supportedTypes = [
      DataColumnType.INTEGER,
      DataColumnType.BIGINT,
      DataColumnType.SMALLINT,
      DataColumnType.TINYINT
    ];
    if (!supportedTypes.includes(columnType)) {
      return false;
    }

    // PostgreSQL 使用 serial/bigserial，不需要额外的 autoIncrement()
    if (databaseType === DatabaseType.POSTGRESQL) {
      return false;
    }

    return true;
  }

  /**
   * 删除表（如果存在）
   */
  static async dropTableIfExists(
    connection: Kysely<any>,
    tableName: string
  ): Promise<void> {
    // 🎯 使用 Kysely 的 ifExists() 方法
    await connection.schema.dropTable(tableName).ifExists().execute();
  }

  /**
   * 获取数据库类型
   */
  static getDatabaseType(
    connection: Kysely<any>,
    connectionName?: string
  ): DatabaseType {
    const configuredType = connectionName
      ? getConnectionType(connectionName)
      : undefined;
    if (configuredType) {
      return this.mapConfiguredDatabaseType(configuredType);
    }

    const adapter = (connection as any).getExecutor?.()?.adapter;
    if (adapter?.supportsOutput) {
      return DatabaseType.MSSQL;
    }

    if (adapter?.supportsReturning) {
      const introspectorName = String(
        (connection as any).introspection?.constructor?.name || ''
      ).toLowerCase();

      if (introspectorName.includes('sqlite')) {
        return DatabaseType.SQLITE;
      }

      if (introspectorName.includes('postgres')) {
        return DatabaseType.POSTGRESQL;
      }
    }

    const dialectName = String(adapter?.constructor?.name || '').toLowerCase();
    if (dialectName.includes('postgres')) {
      return DatabaseType.POSTGRESQL;
    }
    if (dialectName.includes('mysql')) {
      return DatabaseType.MYSQL;
    }
    if (dialectName.includes('sqlite')) {
      return DatabaseType.SQLITE;
    }
    if (
      dialectName.includes('mssql') ||
      dialectName.includes('sqlserver')
    ) {
      return DatabaseType.MSSQL;
    }

    return DatabaseType.POSTGRESQL;
  }

  private static mapConfiguredDatabaseType(type: string): DatabaseType {
    switch (type) {
      case 'postgresql':
        return DatabaseType.POSTGRESQL;
      case 'mysql':
        return DatabaseType.MYSQL;
      case 'sqlite':
        return DatabaseType.SQLITE;
      case 'mssql':
        return DatabaseType.MSSQL;
      default:
        return DatabaseType.POSTGRESQL;
    }
  }

  // 🎯 具体的列类型添加方法和约束应用

  /**
   * 应用列约束
   */
  private static applyColumnConstraints(
    columnBuilder: ColumnDefinitionBuilder,
    constraints: ColumnConstraints
  ): ColumnDefinitionBuilder {
    let builder = columnBuilder;

    // 应用主键约束
    if (constraints.primaryKey) {
      builder = builder.primaryKey();
    }

    // 应用非空约束
    if (constraints.nullable === false) {
      builder = builder.notNull();
    }

    // 应用唯一约束
    if (constraints.unique) {
      builder = builder.unique();
    }

    // 应用默认值
    // 🎯 建议：时间相关的默认值应该在应用层处理，而不是使用数据库默认值
    // 因为不同数据库的时间函数语法不同：
    // - PostgreSQL: NOW(), CURRENT_TIMESTAMP
    // - MySQL: NOW(), CURRENT_TIMESTAMP()
    // - SQLite: datetime('now'), CURRENT_TIMESTAMP
    // - SQL Server: GETDATE(), CURRENT_TIMESTAMP
    if (constraints.defaultValue !== undefined) {
      // 对于非时间类型的默认值，直接应用
      // 时间默认值建议在应用层通过 Repository 的 create 方法处理
      if (
        typeof constraints.defaultValue !== 'string' ||
        (!constraints.defaultValue.toUpperCase().includes('TIMESTAMP') &&
          !constraints.defaultValue.toUpperCase().includes('NOW'))
      ) {
        builder = builder.defaultTo(constraints.defaultValue);
      }
      // 如果是时间相关的默认值，跳过数据库级别的默认值设置
      // 应该在应用层的 create 方法中处理，例如：
      // created_at: new Date().toISOString()
    }

    // 应用外键约束
    if (constraints.references) {
      const ref = constraints.references;
      builder = builder.references(`${ref.table}.${ref.column}`);

      if (ref.onDelete) {
        builder = builder.onDelete(ref.onDelete.toLowerCase() as any);
      }

      if (ref.onUpdate) {
        builder = builder.onUpdate(ref.onUpdate.toLowerCase() as any);
      }
    }

    return builder;
  }

  /**
   * 创建索引
   */
  private static async createIndexes(
    connection: Kysely<any>,
    tableName: string,
    indexes: IndexDefinition[]
  ): Promise<void> {
    for (const index of indexes) {
      let indexBuilder = connection.schema
        .createIndex(index.name)
        .ifNotExists()
        .on(tableName)
        .columns(index.columns);

      if (index.unique) {
        indexBuilder = indexBuilder.unique();
      }

      if (index.where) {
        indexBuilder = indexBuilder.where(index.where as any);
      }

      await indexBuilder.execute();
    }
  }
}

/**
 * Schema 构建器 - 简化版本，专注于核心价值
 *
 * 🎯 设计理念：
 * - 保留高价值的便利方法（addTimestamps, addPrimaryKey, addForeignKey）
 * - 移除冗余的类型特定方法（addString, addInteger 等）
 * - 统一使用 addColumn() 方法，提供更一致的 API
 * - 专注于流畅的链式调用和复杂操作的抽象
 *
 * ✅ 核心价值：
 * - 流畅的链式 API 设计
 * - 便利方法封装常见模式
 * - TypeScript 类型安全
 * - 隐藏 TableSchema 构建细节
 */
export class SchemaBuilder {
  private schema: TableSchema;

  constructor(tableName: string) {
    this.schema = {
      tableName,
      columns: [],
      indexes: []
    };
  }

  /**
   * 添加字段
   */
  addColumn(
    name: string,
    type: DataColumnType,
    constraints?: ColumnConstraints
  ): SchemaBuilder {
    this.schema.columns.push({
      name,
      type,
      constraints
    });
    return this;
  }

  /**
   * 添加主键字段（自增整数）
   */
  addPrimaryKey(name: string = 'id'): SchemaBuilder {
    return this.addColumn(name, DataColumnType.INTEGER, {
      primaryKey: true,
      autoIncrement: true,
      nullable: false
    });
  }

  /**
   * 添加 UUID 主键字段
   */
  addUuidPrimaryKey(name: string = 'id'): SchemaBuilder {
    return this.addColumn(name, DataColumnType.UUID, {
      primaryKey: true,
      nullable: false
    });
  }

  /**
   * 添加时间戳字段 - 使用字符串类型统一处理
   */
  addTimestamp(name: string, constraints?: ColumnConstraints): SchemaBuilder {
    // 🎯 使用 STRING 类型存储 ISO 时间字符串，确保跨数据库兼容性
    return this.addColumn(name, DataColumnType.STRING, {
      length: 255, // 足够存储 ISO 时间字符串
      ...constraints
    });
  }

  /**
   * 添加外键字段
   */
  addForeignKey(
    name: string,
    referencedTable: string,
    referencedColumn: string = 'id',
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION',
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
  ): SchemaBuilder {
    return this.addColumn(name, DataColumnType.INTEGER, {
      nullable: false,
      references: {
        table: referencedTable,
        column: referencedColumn,
        onDelete,
        onUpdate
      }
    });
  }

  /**
   * 添加时间戳字段（created_at, updated_at）- 统一字符串处理
   */
  addTimestamps(): SchemaBuilder {
    // 🎯 使用字符串类型存储时间，在应用层处理时间逻辑
    // 优势：跨数据库兼容、时区控制、业务逻辑灵活、测试友好
    return this.addTimestamp('created_at', {
      nullable: false
      // 不设置 defaultValue，在应用层通过 Repository 处理
    }).addTimestamp('updated_at', {
      nullable: true
      // updated_at 可以为空，首次创建时不设置
    });
  }

  /**
   * 添加索引
   */
  addIndex(
    name: string,
    columns: string[],
    options?: Omit<IndexDefinition, 'name' | 'columns'>
  ): SchemaBuilder {
    if (!this.schema.indexes) {
      this.schema.indexes = [];
    }

    this.schema.indexes.push({
      name,
      columns,
      ...options
    });
    return this;
  }

  /**
   * 添加唯一索引
   */
  addUniqueIndex(name: string, columns: string[]): SchemaBuilder {
    return this.addIndex(name, columns, { unique: true });
  }

  /**
   * 设置表注释
   */
  setComment(comment: string): SchemaBuilder {
    this.schema.comment = comment;
    return this;
  }

  /**
   * 构建 schema
   */
  build(): TableSchema {
    return { ...this.schema };
  }

  /**
   * 静态工厂方法
   */
  static create(tableName: string): SchemaBuilder {
    return new SchemaBuilder(tableName);
  }
}

/**
 * 仓储连接配置接口
 */
export interface RepositoryConnectionConfig {
  /** 读连接名称，默认为 'default' */
  readonly readConnection?: string;
  /** 写连接名称，默认为 'default' */
  readonly writeConnection?: string;
  /** 默认连接名称，当读写连接未指定时使用 */
  readonly defaultConnection?: string;
  /** 是否启用读写分离，默认为 false */
  readonly enableReadWriteSeparation?: boolean;
}

/**
 * 仓储连接选项 - 支持多种配置方式
 */
export type RepositoryConnectionOptions =
  | string // 简单的连接名称
  | RepositoryConnectionConfig; // 详细的连接配置

/**
 * 解析后的连接配置
 */
export interface ResolvedConnectionConfig {
  readonly readConnectionName: string;
  readonly writeConnectionName: string;
  readonly enableReadWriteSeparation: boolean;
}

/**
 * 连接配置解析工具
 */
export class ConnectionConfigResolver {
  /**
   * 解析连接配置选项
   */
  static resolve(
    options?: RepositoryConnectionOptions
  ): ResolvedConnectionConfig {
    // 如果没有提供配置，使用默认值
    if (!options) {
      return {
        readConnectionName: 'default',
        writeConnectionName: 'default',
        enableReadWriteSeparation: false
      };
    }

    // 如果是字符串，表示使用同一个连接进行读写
    if (typeof options === 'string') {
      return {
        readConnectionName: options,
        writeConnectionName: options,
        enableReadWriteSeparation: false
      };
    }

    // 如果是配置对象，解析详细配置
    const config = options as RepositoryConnectionConfig;
    const defaultConnection = config.defaultConnection || 'default';
    const enableReadWriteSeparation = config.enableReadWriteSeparation || false;

    return {
      readConnectionName: config.readConnection || defaultConnection,
      writeConnectionName: config.writeConnection || defaultConnection,
      enableReadWriteSeparation
    };
  }

  /**
   * 验证连接配置
   */
  static validate(config: ResolvedConnectionConfig): boolean {
    return !!(config.readConnectionName && config.writeConnectionName);
  }
}

/**
 * 查询选项 - 不可变配置
 */
export interface QueryOptions<
  DB = any,
  TB extends keyof DB = Extract<keyof DB, string>,
  T = any
> {
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: OrderByClause<DB, TB> | OrderByClause<DB, TB>[];
  readonly readonly?: boolean;
  readonly timeout?: number;
  readonly connectionName?: string;
}

/**
 * 排序子句
 */
export interface OrderByClause<
  DB = any,
  TB extends keyof DB = Extract<keyof DB, string>
> {
  readonly field: TableColumnKey<DB, TB>;
  readonly direction: 'asc' | 'desc';
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  readonly page: number;
  readonly pageSize: number;
  readonly maxPageSize?: number;
}

export type TableColumnKey<DB, TB extends keyof DB> = Extract<
  keyof Selectable<DB[TB]>,
  string
>;

export type StringColumnKey<DB, TB extends keyof DB> = {
  [K in TableColumnKey<DB, TB>]: Selectable<DB[TB]>[K] extends
    | string
    | null
    | undefined
    ? K
    : never;
}[TableColumnKey<DB, TB>];

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  readonly data: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
  readonly metadata?: Record<string, any>;
}

/**
 * 查询构建器上下文
 */
export interface QueryBuilderContext<DB, TB extends keyof DB> {
  readonly db: Kysely<DB>;
  readonly tableName: TB;
  readonly primaryKey: string;
}

/**
 * Where 表达式类型 - 强类型版本
 */
export type WhereExpression<DB, TB extends keyof DB> =
  SelectWhereExpression<DB, TB> &
    UpdateWhereExpression<DB, TB> &
    DeleteWhereExpression<DB, TB>;

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
 * 简化的查询管道函数类型
 */
export type QueryPipe<DB, TB extends keyof DB, O> = (
  qb: SelectQueryBuilder<DB, TB, O>
) => SelectQueryBuilder<DB, TB, O>;
export type UpdatePipe<DB, TB extends keyof DB> = (
  qb: UpdateQueryBuilder<DB, TB, TB, any>
) => UpdateQueryBuilder<DB, TB, TB, any>;
export type DeletePipe<DB, TB extends keyof DB> = (
  qb: DeleteQueryBuilder<DB, TB, any>
) => DeleteQueryBuilder<DB, TB, any>;

/**
 * 查询构建器工厂 - 纯函数式查询构建
 */
export class QueryBuilderFactory {
  /**
   * 创建基础查询
   */
  static createBaseQuery<DB, TB extends keyof DB, O = {}>(
    context: QueryBuilderContext<DB, TB>
  ): QueryPipe<DB, TB, O> {
    return (qb) => qb;
  }

  /**
   * 添加 WHERE 条件
   */
  static addWhere<DB, TB extends keyof DB, O = {}>(
    whereExpr: SelectWhereExpression<DB, TB>
  ): QueryPipe<DB, TB, O> {
    return (qb) => whereExpr(qb);
  }

  /**
   * 添加排序
   */
  static addOrderBy<DB, TB extends keyof DB, O = {}>(
    orderBy?: OrderByClause<DB, TB> | OrderByClause<DB, TB>[]
  ): QueryPipe<DB, TB, O> {
    return (qb) => {
      if (!orderBy) return qb;

      const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];

      return clauses.reduce(
        (query, clause) => query.orderBy(clause.field as any, clause.direction),
        qb
      );
    };
  }

  /**
   * 添加分页
   */
  static addPagination<DB, TB extends keyof DB, O = {}>(
    limit?: number,
    offset?: number
  ): QueryPipe<DB, TB, O> {
    return (qb) => {
      let query = qb;
      if (limit !== undefined) query = query.limit(limit);
      if (offset !== undefined) query = query.offset(offset);
      return query;
    };
  }

  /**
   * 添加字段选择
   */
  static selectFields<DB, TB extends keyof DB, O = {}, S = {}>(
    selector: (
      qb: SelectQueryBuilder<DB, TB, O>
    ) => SelectQueryBuilder<DB, TB, S>
  ): (qb: SelectQueryBuilder<DB, TB, O>) => SelectQueryBuilder<DB, TB, S> {
    return selector;
  }

  /**
   * 组合查询管道
   */
  static composeQuery<DB, TB extends keyof DB, O = {}>(
    ...pipes: QueryPipe<DB, TB, O>[]
  ): QueryPipe<DB, TB, O> {
    return (qb) => pipes.reduce((query, pipeFn) => pipeFn(query), qb);
  }
}

/**
 * 验证器工厂
 */
export class ValidatorFactory {
  /**
   * 创建必填字段验证器
   */
  static required<T>(field: keyof T, value: any): Either<ValidationError, any> {
    if (value === null || value === undefined || value === '') {
      return eitherLeft(
        ValidationError.create(
          `Field '${String(field)}' is required`,
          String(field),
          value
        )
      );
    }
    return eitherRight(value);
  }

  /**
   * 创建类型验证器
   */
  static type<T>(
    field: keyof T,
    value: any,
    expectedType: 'string' | 'number' | 'boolean' | 'object'
  ): Either<ValidationError, any> {
    if (typeof value !== expectedType) {
      return eitherLeft(
        ValidationError.create(
          `Field '${String(field)}' must be of type ${expectedType}`,
          String(field),
          value
        )
      );
    }
    return eitherRight(value);
  }

  /**
   * 创建长度验证器
   */
  static validateLength<T>(
    field: keyof T,
    value: string,
    min?: number,
    max?: number
  ): Either<ValidationError, string> {
    if (min !== undefined && value.length < min) {
      return eitherLeft(
        ValidationError.create(
          `Field '${String(field)}' must be at least ${min} characters`,
          String(field),
          value
        )
      );
    }

    if (max !== undefined && value.length > max) {
      return eitherLeft(
        ValidationError.create(
          `Field '${String(field)}' must be at most ${max} characters`,
          String(field),
          value
        )
      );
    }

    return eitherRight(value);
  }

  /**
   * 组合验证器
   */
  static compose<T>(
    ...validators: Array<(value: T) => Either<ValidationError, T>>
  ): (value: T) => Either<ValidationError, T> {
    return (value: T) => {
      for (const validator of validators) {
        const result = validator(value);
        if (result._tag === 'Left') {
          return result;
        }
      }
      return eitherRight(value);
    };
  }
}

/**
 * 函数式基础仓储接口 - 重构版
 */
export interface IRepository<
  DB,
  TB extends keyof DB & string,
  T = Selectable<DB[TB]>,
  CreateT = Insertable<DB[TB]>,
  UpdateT = Updateable<DB[TB]>
> {
  // 基础查询
  findById(id: string | number): Promise<Maybe<T>>;
  findOne(criteria: SelectWhereExpression<DB, TB>): Promise<Maybe<T>>;
  findMany(
    criteria?: SelectWhereExpression<DB, TB>,
    options?: QueryOptions<DB, TB, T>
  ): Promise<T[]>;
  findAll(options?: QueryOptions<DB, TB, T>): Promise<T[]>;

  // 基础操作
  create(data: CreateT): Promise<Either<DatabaseError, T>>;
  createMany(data: CreateT[]): Promise<Either<DatabaseError, T[]>>;
  update(id: string | number, data: UpdateT): Promise<Either<DatabaseError, T>>;
  updateMany(
    criteria: UpdateWhereExpression<DB, TB>,
    data: UpdateT
  ): Promise<Either<DatabaseError, number>>;
  delete(id: string | number): Promise<Either<DatabaseError, T>>;
  deleteMany(
    criteria: DeleteWhereExpression<DB, TB>
  ): Promise<Either<DatabaseError, number>>;

  // 聚合查询
  count(criteria?: SelectWhereExpression<DB, TB>): Promise<number>;
  exists(criteria: SelectWhereExpression<DB, TB>): Promise<boolean>;

  // 分页查询
  paginate(
    criteria?: SelectWhereExpression<DB, TB>,
    pagination?: PaginationOptions
  ): Promise<Either<DatabaseError, PaginatedResult<T>>>;

  // 事务支持
  tx<R>(
    fn: (repository: this, trx: Transaction<any>) => Promise<R>,
    options?: RepositoryTransactionOptions
  ): Promise<Either<DatabaseError, R>>;
  txBatch<Item, R>(
    items: Item[],
    processor: (
      batch: Item[],
      repository: this,
      trx: Transaction<any>,
      batchIndex: number
    ) => Promise<R>,
    options: RepositoryBatchTransactionOptions
  ): Promise<Either<DatabaseError, R[]>>;
  txWithRetry<R>(
    fn: (repository: this, trx: Transaction<any>) => Promise<R>,
    maxRetries?: number,
    options?: RepositoryTransactionOptions
  ): Promise<Either<DatabaseError, R>>;
}

function isDatabaseError(error: unknown): error is DatabaseError {
  return !!(
    error &&
    typeof (error as any).type === 'string' &&
    typeof (error as any).message === 'string'
  );
}

/**
 * 函数式基础仓储实现 - 重构版
 * 使用 tryCatch 和简化的返回类型，移除 DatabaseErrorHandler
 */
export abstract class BaseRepository<
  DB,
  TB extends keyof DB & string,
  T = Selectable<DB[TB]>,
  CreateT = Insertable<DB[TB]>,
  UpdateT = Updateable<DB[TB]>
> implements IRepository<DB, TB, T, CreateT, UpdateT>
{
  protected readonly sql = kyselySql;
  protected abstract readonly tableName: TB;
  protected primaryKey: string = 'id';
  protected readonly connectionConfig: ResolvedConnectionConfig;
  protected abstract readonly logger: Logger;

  protected tableSchema?: TableSchema = undefined;
  protected autoTableCreation: AutoTableCreationConfig = {};

  constructor(
    connectionOptions?: RepositoryConnectionOptions,
    autoTableCreation?: Partial<AutoTableCreationConfig>
  ) {
    this.connectionConfig = ConnectionConfigResolver.resolve(connectionOptions);
    this.autoTableCreation = {
      enabled: false,
      autoEnableInDevelopment: true,
      forceRecreate: false,
      createIndexes: true,
      timeout: 30000,
      ...autoTableCreation
    };
  }

  async onReady(): Promise<void> {
    const declaredTableSchema = this.tableSchema
      ? this.cloneTableSchema(this.tableSchema)
      : undefined;

    try {
      const connection = await this.getWriteConnection();
      const runtimeSchema = await this.refreshTableSchemaFromDatabase(connection);

      if (runtimeSchema) {
        this.logger?.info(`Loaded live table schema from database: ${this.tableName}`, {
          columnsCount: runtimeSchema.columns.length
        });
        return;
      }

      if (!this.autoTableCreation.enabled || !declaredTableSchema) {
        return;
      }

      const managedTimestampColumns = ['created_at', 'updated_at'].filter(
        (column) =>
          this.shouldAutoPopulateTimestamp(column as ManagedTimestampColumn)
      );

      this.logger?.info(
        {
          forceRecreate: this.autoTableCreation.forceRecreate,
          columnsCount: declaredTableSchema.columns.length
        },
        `Creating table in onReady: ${this.tableName}`
      );

      const databaseType = TableCreator.getDatabaseType(
        connection,
        this.connectionConfig.writeConnectionName
      );

      await TableCreator.createTable(
        connection,
        declaredTableSchema,
        databaseType,
        {
          forceRecreate: this.autoTableCreation.forceRecreate
        }
      );

      await this.refreshTableSchemaFromDatabase(connection);

      this.logger?.info(
        `Successfully ensured table exists: ${this.tableName}`,
        {
          totalColumnsCount: this.tableSchema?.columns.length || 0,
          indexesCount: this.tableSchema?.indexes?.length || 0,
          forceRecreate: this.autoTableCreation.forceRecreate,
          autoManagedStringTimestamps: managedTimestampColumns
        }
      );
    } catch (error) {
      this.logger?.error(`Failed to create table ${this.tableName}:`, error);
      throw error;
    }
  }

  protected async getContext(): Promise<QueryBuilderContext<DB, TB>> {
    return {
      db: await this.getQueryConnection(),
      tableName: this.tableName,
      primaryKey: this.primaryKey
    };
  }

  protected async getQueryConnection(): Promise<Kysely<DB>> {
    return await this.reader();
  }

  protected async getWriteConnection(): Promise<Kysely<DB>> {
    return await this.writer();
  }

  protected async reader(connectionName?: string): Promise<Kysely<DB>> {
    const currentTransaction = getCurrentTransaction();
    if (currentTransaction) {
      this.logger?.debug('Using transaction for read query', {
        tableName: this.tableName,
        inTransaction: true
      });
      return currentTransaction as unknown as Kysely<DB>;
    }
    return await getReadConnection(
      connectionName || this.connectionConfig.readConnectionName
    );
  }

  protected async writer(connectionName?: string): Promise<Kysely<DB>> {
    const currentTransaction = getCurrentTransaction();
    if (currentTransaction) {
      this.logger?.debug('Using transaction for write query', {
        tableName: this.tableName,
        inTransaction: true
      });
      return currentTransaction as unknown as Kysely<DB>;
    }
    return await getWriteConnection(
      connectionName || this.connectionConfig.writeConnectionName
    );
  }

  protected async db(
    context: DatabaseOperationContext = {}
  ): Promise<Kysely<DB>> {
    return context.readonly
      ? await this.reader(context.connectionName)
      : await this.writer(context.connectionName);
  }

  protected async schema(connectionName?: string): Promise<SchemaModule> {
    return (await this.writer(connectionName)).schema;
  }

  protected async query<R>(
    operation: (db: Kysely<DB>) => Promise<R>,
    context: DatabaseOperationContext = {}
  ): Promise<Either<DatabaseError, R>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.db({
          ...context,
          readonly: context.readonly ?? true
        });
        return await operation(connection);
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  protected async command<R>(
    operation: (db: Kysely<DB>) => Promise<R>,
    context: DatabaseOperationContext = {}
  ): Promise<Either<DatabaseError, R>> {
    return await this.query(operation, {
      ...context,
      readonly: false
    });
  }

  protected async executeSql<R = unknown>(
    statement: RawBuilder<R> | Compilable<R> | CompiledQuery<R>,
    context: DatabaseOperationContext = {}
  ): Promise<Either<DatabaseError, QueryResult<R>>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.db(context);
        const compiled = this.compileStatement(statement, connection);
        return await connection.executeQuery(compiled);
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  protected async rawQuery<R = Record<string, unknown>>(
    sqlText: string,
    parameters: readonly unknown[] = [],
    context: DatabaseOperationContext = {}
  ): Promise<Either<DatabaseError, R[]>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.db(context);
        const compiled = CompiledQuery.raw(sqlText, [...parameters]);
        const result = await connection.executeQuery(compiled);
        return result.rows as R[];
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  protected async selectFromTable<TTable extends keyof DB & string>(
    table: TTable,
    connectionName?: string
  ): Promise<SelectQueryBuilder<DB, any, any>> {
    return (await this.reader(connectionName)).selectFrom(table) as unknown as
      SelectQueryBuilder<DB, any, any>;
  }

  protected async insertIntoTable<TTable extends keyof DB & string>(
    table: TTable,
    connectionName?: string
  ): Promise<InsertQueryBuilder<DB, TTable, any>> {
    return (await this.writer(connectionName)).insertInto(table);
  }

  protected async updateTableNamed<TTable extends keyof DB & string>(
    table: TTable,
    connectionName?: string
  ): Promise<UpdateQueryBuilder<DB, any, any, UpdateResult>> {
    return (await this.writer(connectionName)).updateTable(table) as unknown as
      UpdateQueryBuilder<DB, any, any, UpdateResult>;
  }

  protected async deleteFromTable<TTable extends keyof DB & string>(
    table: TTable,
    connectionName?: string
  ): Promise<DeleteQueryBuilder<DB, any, DeleteResult>> {
    return (await this.writer(connectionName)).deleteFrom(table) as unknown as
      DeleteQueryBuilder<DB, any, DeleteResult>;
  }

  protected async compareAndSetWhere(
    criteria: UpdateWhereExpression<DB, TB>,
    expected: RepositoryStateGuard<T>,
    data: UpdateT,
    context: DatabaseOperationContext = {}
  ): Promise<Either<DatabaseError, boolean>> {
    const validationResult = this.validateUpdateData(data);
    if (isLeft(validationResult)) {
      return eitherLeft(validationResult.left);
    }

    return tryCatchAsync(
      async () => {
        const connection = await this.writer(context.connectionName);
        await this.refreshTableSchemaFromDatabase(connection);
        const dataWithTimestamps = this.addTimestampsIfExists(
          data as any,
          'update'
        );
        const processedData = this.processJsonFields(dataWithTimestamps);

        let updateQuery = criteria(
          (connection.updateTable(this.tableName) as any).set(processedData as any)
        );
        updateQuery = this.applyStateGuard(updateQuery, expected);

        const result = await updateQuery.executeTakeFirst();
        const matched = Number(result.numUpdatedRows || 0) > 0;
        this.logOperation('compareAndSetWhere', {
          matched,
          expectedFields: Object.keys(expected || {})
        });
        return matched;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  protected async compareAndSet(
    id: string | number,
    expected: RepositoryStateGuard<T>,
    data: UpdateT,
    context: DatabaseOperationContext = {}
  ): Promise<Either<DatabaseError, boolean>> {
    return await this.compareAndSetWhere(
      (qb) => qb.where(this.primaryKey as any, '=', id),
      expected,
      data,
      context
    );
  }

  protected async claimById(
    id: string | number,
    claim: UpdateT,
    expected: RepositoryStateGuard<T> = {},
    context: DatabaseOperationContext = {}
  ): Promise<Either<DatabaseError, boolean>> {
    return await this.compareAndSet(id, expected, claim, context);
  }

  protected async heartbeatById(
    id: string | number,
    heartbeat: UpdateT,
    expected: RepositoryStateGuard<T> = {},
    context: DatabaseOperationContext = {}
  ): Promise<Either<DatabaseError, boolean>> {
    return await this.compareAndSet(id, expected, heartbeat, context);
  }

  protected async saveCheckpointById(
    id: string | number,
    checkpoint: UpdateT,
    expected: RepositoryStateGuard<T> = {},
    context: DatabaseOperationContext = {}
  ): Promise<Either<DatabaseError, boolean>> {
    return await this.compareAndSet(id, expected, checkpoint, context);
  }

  protected validateCreateData(
    data: CreateT
  ): Either<ValidationError, CreateT> {
    return eitherRight(data);
  }

  protected validateUpdateData(
    data: UpdateT
  ): Either<ValidationError, UpdateT> {
    return eitherRight(data);
  }

  async findById(id: string | number): Promise<Maybe<T>> {
    try {
      const connection = await this.getQueryConnection();
      const query: any = connection.selectFrom(this.tableName).selectAll();

      const result = await query
        .where(this.primaryKey as any, '=', id)
        .executeTakeFirst();
      return fromNullable(result as T | undefined);
    } catch (error) {
      this.logError('findById', error as Error, { id });
      // For Maybe-returning methods, we return None on error.
      // The error is logged, and the calling service can decide how to handle the absence of data.
      return fromNullable<T>(undefined);
    }
  }

  async findOne(criteria: SelectWhereExpression<DB, TB>): Promise<Maybe<T>> {
    try {
      const connection = await this.getQueryConnection();
      const baseQuery = connection.selectFrom(this.tableName).selectAll() as
        SelectQueryBuilder<DB, TB, any>;
      const query = criteria(baseQuery);
      const result = await query.executeTakeFirst();
      return fromNullable(result as T | undefined);
    } catch (error) {
      this.logError('findOne', error as Error);
      return fromNullable<T>(undefined);
    }
  }

  async findMany(
    criteria?: SelectWhereExpression<DB, TB>,
    options?: QueryOptions<DB, TB, T>
  ): Promise<T[]> {
    try {
      const connection = await this.getQueryConnection();
      let query: any = connection.selectFrom(this.tableName).selectAll();

      if (criteria) {
        query = criteria(query as SelectQueryBuilder<DB, TB, any>);
      }

      if (options?.orderBy) {
        const orderClauses = Array.isArray(options.orderBy)
          ? options.orderBy
          : [options.orderBy];
        for (const clause of orderClauses) {
          query = query.orderBy(clause.field, clause.direction);
        }
      }

      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }
      if (options?.offset !== undefined) {
        query = query.offset(options.offset);
      }

      return (await query.execute()) as T[];
    } catch (error) {
      this.logError('findMany', error as Error);
      // For array-returning methods, we return an empty array on error.
      return [];
    }
  }

  async findAll(options?: QueryOptions<DB, TB, T>): Promise<T[]> {
    return this.findMany(undefined, options);
  }

  protected processJsonFields(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const processed = { ...data };

    for (const [key, value] of Object.entries(processed)) {
      if (value !== null && value !== undefined && typeof value === 'object') {
        if (value instanceof Date) {
          continue;
        }
        try {
          processed[key] = JSON.stringify(value);
        } catch (error) {
          this.logger.warn(`Failed to serialize field ${key}`, {
            error,
            value
          });
        }
      }
    }

    return processed;
  }

  async create(data: CreateT): Promise<Either<DatabaseError, T>> {
    const validationResult = this.validateCreateData(data);
    if (isLeft(validationResult)) {
      return eitherLeft(validationResult.left);
    }

    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
        await this.refreshTableSchemaFromDatabase(connection);
        const dataWithTimestamps = this.addTimestampsIfExists(
          data as any,
          'create'
        );
        const processedData = this.processJsonFields(dataWithTimestamps);
        const result = await this.insertAndFetchCreatedRecord(
          connection,
          processedData
        );

        this.logOperation('create', { data });
        return result as T;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async createMany(data: CreateT[]): Promise<Either<DatabaseError, T[]>> {
    if (data.length === 0) {
      return eitherRight([]);
    }

    for (const item of data) {
      const validationResult = this.validateCreateData(item);
      if (isLeft(validationResult)) {
        return eitherLeft(validationResult.left);
      }
    }

    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
        await this.refreshTableSchemaFromDatabase(connection);
        const dataWithTimestamps = data.map((item) =>
          this.addTimestampsIfExists(item as any, 'create')
        );
        const processedData = dataWithTimestamps.map((item) =>
          this.processJsonFields(item)
        );
        const results = await this.insertAndFetchCreatedRecords(
          connection,
          processedData
        );

        this.logOperation('createMany', { count: data.length });
        return results as T[];
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async update(
    id: string | number,
    data: UpdateT
  ): Promise<Either<DatabaseError, T>> {
    const validationResult = this.validateUpdateData(data);
    if (isLeft(validationResult)) {
      return eitherLeft(validationResult.left);
    }

    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
        await this.refreshTableSchemaFromDatabase(connection);
        const dataWithTimestamps = this.addTimestampsIfExists(
          data as any,
          'update'
        );
        const processedData = this.processJsonFields(dataWithTimestamps);

        const result = await (connection.updateTable(this.tableName) as any)
          .set(processedData as any)
          .where(this.primaryKey as any, '=', id)
          .executeTakeFirst();

        this.logOperation('update', { id, updatedRows: result.numUpdatedRows });

        if (Number(result.numUpdatedRows || 0) === 0) {
          throw ValidationError.create(
            `Record with id ${id} not found for update.`
          );
        }

        const updatedRecord = await this.findByIdUsingConnection(connection, id);
        if (!updatedRecord) {
          throw ErrorClassifier.classify(
            new Error('Updated record not found after update.')
          );
        }
        return updatedRecord;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async updateMany(
    criteria: UpdateWhereExpression<DB, TB>,
    data: UpdateT
  ): Promise<Either<DatabaseError, number>> {
    const validationResult = this.validateUpdateData(data);
    if (isLeft(validationResult)) {
      return eitherLeft(validationResult.left);
    }

    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
        await this.refreshTableSchemaFromDatabase(connection);
        const dataWithTimestamps = this.addTimestampsIfExists(
          data as any,
          'update'
        );
        const processedData = this.processJsonFields(dataWithTimestamps);

        const updateQuery = (connection.updateTable(this.tableName) as any).set(
          processedData as any
        );
        const finalQuery = criteria(updateQuery);

        const result = await finalQuery.executeTakeFirst();
        const numUpdatedRows = Number(result.numUpdatedRows || 0);
        this.logOperation('updateMany', { updatedRows: numUpdatedRows });
        return numUpdatedRows;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async delete(id: string | number): Promise<Either<DatabaseError, T>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
        const recordToDelete = await this.findByIdUsingConnection(
          connection,
          id
        );
        if (!recordToDelete) {
          throw ValidationError.create(
            `Record with id ${id} not found for deletion.`
          );
        }
        const result = await (connection.deleteFrom(this.tableName) as any)
          .where(this.primaryKey as any, '=', id)
          .executeTakeFirst();

        const success = Number(result.numDeletedRows || 0) > 0;
        this.logOperation('delete', { id, success });

        if (!success) {
          throw ErrorClassifier.classify(
            new Error(`Failed to delete record with id ${id} after finding it.`)
          );
        }

        return recordToDelete;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async deleteMany(
    criteria: DeleteWhereExpression<DB, TB>
  ): Promise<Either<DatabaseError, number>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
        const deleteQuery = connection.deleteFrom(this.tableName) as
          DeleteQueryBuilder<DB, TB, any>;
        const finalQuery = criteria(deleteQuery);
        const result = await finalQuery.executeTakeFirst();
        const numDeletedRows = Number(result.numDeletedRows || 0);
        this.logOperation('deleteMany', { deletedRows: numDeletedRows });
        return numDeletedRows;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async count(criteria?: SelectWhereExpression<DB, TB>): Promise<number> {
    try {
      const connection = await this.getQueryConnection();
      const baseQuery = (
        connection.selectFrom(this.tableName) as unknown as
          SelectQueryBuilder<DB, TB, any>
      ).select(
        (eb: ExpressionBuilder<DB, TB>) => eb.fn.countAll<string>().as('count')
      );

      const finalQuery = criteria ? criteria(baseQuery) : baseQuery;

      const result = (await finalQuery.executeTakeFirstOrThrow()) as {
        count: string;
      };
      return Number(result.count);
    } catch (error) {
      this.logError('count', error as Error);
      return 0;
    }
  }

  async exists(criteria: SelectWhereExpression<DB, TB>): Promise<boolean> {
    const count = await this.count(criteria);
    return count > 0;
  }

  async paginate(
    criteria?: SelectWhereExpression<DB, TB>,
    pagination?: PaginationOptions
  ): Promise<Either<DatabaseError, PaginatedResult<T>>> {
    return tryCatchAsync(
      async () => {
        const page = pagination?.page || 1;
        const pageSize = Math.min(
          pagination?.pageSize || 10,
          pagination?.maxPageSize || 100
        );
        const offset = (page - 1) * pageSize;

        const [total, data] = await Promise.all([
          this.count(criteria),
          this.findMany(criteria, { limit: pageSize, offset, readonly: true })
        ]);

        const totalPages = Math.ceil(total / pageSize);

        return {
          data,
          total,
          page,
          pageSize,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          metadata: {
            offset,
            limit: pageSize
          }
        };
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async tx<R>(
    fn: (repository: this, trx: Transaction<any>) => Promise<R>,
    options: RepositoryTransactionOptions = {}
  ): Promise<Either<DatabaseError, R>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.writer(options.connectionName);
        const result = await executeInTransaction(
          connection,
          async (trx) => await fn(this, trx),
          options
        );
        if (isLeft(result)) {
          throw result.left;
        }
        return result.right;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async txBatch<Item, R>(
    items: Item[],
    processor: (
      batch: Item[],
      repository: this,
      trx: Transaction<any>,
      batchIndex: number
    ) => Promise<R>,
    options: RepositoryBatchTransactionOptions
  ): Promise<Either<DatabaseError, R[]>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.writer(options.connectionName);
        const result = await executeTransactionInBatches(
          connection,
          items,
          async (batch, trx, batchIndex) =>
            await processor(batch, this, trx, batchIndex),
          options
        );
        if (isLeft(result)) {
          throw result.left;
        }
        return result.right;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async txWithRetry<R>(
    fn: (repository: this, trx: Transaction<any>) => Promise<R>,
    maxRetries: number = 3,
    options: RepositoryTransactionOptions = {}
  ): Promise<Either<DatabaseError, R>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.writer(options.connectionName);
        const result = await executeTransactionWithRetry(
          connection,
          async (trx) => await fn(this, trx),
          maxRetries,
          options
        );
        if (isLeft(result)) {
          throw result.left;
        }
        return result.right;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  protected logOperation(operation: string, data?: any): void {
    const logData = {
      component: this.constructor.name,
      tableName: this.tableName,
      operation,
      data: data ? this.sanitizeLogData(data) : undefined
    };

    this.logger.debug(`Repository operation: ${operation}`, logData);
  }

  protected logError(operation: string, error: Error, data?: any): void {
    const logData = {
      component: this.constructor.name,
      tableName: this.tableName,
      operation,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      data: data ? this.sanitizeLogData(data) : undefined
    };

    this.logger.error(
      `Repository error in ${operation}: ${error.message}`,
      logData
    );
  }

  private sanitizeLogData(data: any): any {
    if (!data) return data;

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};

      for (const [key, value] of Object.entries(data)) {
        const sensitiveFields = [
          'password',
          'token',
          'secret',
          'key',
          'auth',
          'credential'
        ];
        const isSensitive = sensitiveFields.some((field) =>
          key.toLowerCase().includes(field)
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeLogData(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return data;
  }

  private compileStatement<R>(
    statement: RawBuilder<R> | Compilable<R> | CompiledQuery<R>,
    connection: Kysely<DB>
  ): CompiledQuery<R> {
    if (this.isCompiledQuery(statement)) {
      return statement;
    }

    if (this.isRawBuilder(statement)) {
      return statement.compile(connection);
    }

    return statement.compile();
  }

  private isCompiledQuery<R>(statement: unknown): statement is CompiledQuery<R> {
    return !!(
      statement &&
      typeof (statement as any).sql === 'string' &&
      Array.isArray((statement as any).parameters)
    );
  }

  private isRawBuilder<R>(statement: unknown): statement is RawBuilder<R> {
    return !!(
      statement &&
      typeof (statement as any).compile === 'function' &&
      typeof (statement as any).execute === 'function'
    );
  }

  private applyStateGuard<
    Q extends {
      where(
        field: string,
        operator: '=' | 'is',
        value: unknown
      ): Q;
    }
  >(
    query: Q,
    expected: RepositoryStateGuard<T>
  ): Q {
    let guardedQuery = query;

    for (const [field, value] of Object.entries(expected || {})) {
      if (value === undefined) {
        continue;
      }

      guardedQuery =
        value === null
          ? guardedQuery.where(field as any, 'is', null)
          : guardedQuery.where(field as any, '=', value);
    }

    return guardedQuery;
  }

  private async refreshTableSchemaFromDatabase(
    connection: Kysely<DB>
  ): Promise<TableSchema | undefined> {
    try {
      const runtimeSchema = await this.loadTableSchemaFromDatabase(connection);
      if (runtimeSchema) {
        this.tableSchema = runtimeSchema;
      }
      return runtimeSchema;
    } catch (error) {
      this.logger?.debug?.(`Failed to load live table schema for ${this.tableName}, fallback to declared schema.`, {
        error
      });
      return this.tableSchema;
    }
  }

  private async loadTableSchemaFromDatabase(
    connection: Kysely<DB>
  ): Promise<TableSchema | undefined> {
    const introspection = (connection as any).introspection;
    if (!introspection?.getTables) {
      return undefined;
    }

    const tables = (await introspection.getTables({
      withInternalKyselyTables: false
    })) as TableMetadata[];
    const table = tables.find((candidate) =>
      this.matchesTableMetadata(candidate)
    );

    if (!table || table.isView) {
      return undefined;
    }

    return {
      tableName: this.tableName,
      columns: table.columns.map((column) =>
        this.mapColumnMetadataToDefinition(column)
      )
    };
  }

  private matchesTableMetadata(table: TableMetadata): boolean {
    const tableName = String(this.tableName);
    const qualifiedTableName = table.schema
      ? `${table.schema}.${table.name}`
      : table.name;

    return table.name === tableName || qualifiedTableName === tableName;
  }

  private mapColumnMetadataToDefinition(
    column: ColumnMetadata
  ): ColumnDefinition {
    return {
      name: column.name,
      type: this.mapDatabaseDataType(column.dataType),
      constraints: {
        nullable: column.isNullable,
        autoIncrement: column.isAutoIncrementing || undefined,
        primaryKey: column.name === this.primaryKey || undefined,
        comment: column.comment
      }
    };
  }

  private mapDatabaseDataType(dataType: string): DataColumnType {
    const normalizedType = dataType.toLowerCase().trim();

    if (
      normalizedType.includes('uuid') ||
      normalizedType.includes('uniqueidentifier')
    ) {
      return DataColumnType.UUID;
    }

    if (
      normalizedType.includes('json')
    ) {
      return DataColumnType.JSON;
    }

    if (
      normalizedType.includes('blob') ||
      normalizedType.includes('bytea')
    ) {
      return DataColumnType.BLOB;
    }

    if (normalizedType.includes('binary') || normalizedType.includes('varbinary')) {
      return DataColumnType.BINARY;
    }

    if (normalizedType.includes('boolean') || normalizedType === 'bool') {
      return DataColumnType.BOOLEAN;
    }

    if (normalizedType.includes('mediumtext')) {
      return DataColumnType.MEDIUMTEXT;
    }

    if (normalizedType.includes('longtext')) {
      return DataColumnType.LONGTEXT;
    }

    if (
      normalizedType.includes('varchar') ||
      normalizedType.includes('character varying') ||
      normalizedType.includes('nvarchar')
    ) {
      return DataColumnType.STRING;
    }

    if (
      normalizedType === 'char' ||
      normalizedType.startsWith('char(') ||
      normalizedType.includes('nchar') ||
      normalizedType.includes('character(')
    ) {
      return DataColumnType.CHAR;
    }

    if (
      normalizedType.includes('text') ||
      normalizedType.includes('clob')
    ) {
      return DataColumnType.TEXT;
    }

    if (normalizedType.includes('timestamp')) {
      return DataColumnType.TIMESTAMP;
    }

    if (normalizedType.includes('datetime')) {
      return DataColumnType.DATETIME;
    }

    if (normalizedType === 'date') {
      return DataColumnType.DATE;
    }

    if (normalizedType === 'time' || normalizedType.startsWith('time(')) {
      return DataColumnType.TIME;
    }

    if (normalizedType.includes('bigint') || normalizedType === 'int8') {
      return DataColumnType.BIGINT;
    }

    if (normalizedType.includes('smallint') || normalizedType === 'int2') {
      return DataColumnType.SMALLINT;
    }

    if (normalizedType.includes('tinyint')) {
      return DataColumnType.TINYINT;
    }

    if (
      normalizedType.includes('decimal') ||
      normalizedType.includes('numeric')
    ) {
      return DataColumnType.DECIMAL;
    }

    if (
      normalizedType.includes('double') ||
      normalizedType.includes('float8')
    ) {
      return DataColumnType.DOUBLE;
    }

    if (
      normalizedType === 'real' ||
      normalizedType.includes('float') ||
      normalizedType.includes('float4')
    ) {
      return DataColumnType.FLOAT;
    }

    if (
      normalizedType.includes('int') ||
      normalizedType.includes('serial') ||
      normalizedType === 'integer'
    ) {
      return DataColumnType.INTEGER;
    }

    return DataColumnType.STRING;
  }

  private cloneTableSchema(schema: TableSchema): TableSchema {
    return {
      ...schema,
      columns: schema.columns.map((column) => ({
        ...column,
        constraints: column.constraints
          ? {
              ...column.constraints,
              references: column.constraints.references
                ? { ...column.constraints.references }
                : undefined
            }
          : undefined
      })),
      indexes: schema.indexes?.map((index) => ({
        ...index,
        columns: [...index.columns]
      })),
      options: schema.options ? { ...schema.options } : undefined
    };
  }

  protected getColumnDefinition(
    columnName: string
  ): ColumnDefinition | undefined {
    return this.tableSchema?.columns.find((col) => col.name === columnName);
  }

  protected hasColumn(columnName: string): boolean {
    return this.getColumnDefinition(columnName) !== undefined;
  }

  protected isStringColumn(columnName: string): boolean {
    const column = this.getColumnDefinition(columnName);
    return !!column && STRING_COMPATIBLE_COLUMN_TYPES.has(column.type);
  }

  protected getCurrentTimestamp(): string {
    return new Date().toLocaleString();
  }

  protected shouldAutoPopulateTimestamp(
    columnName: ManagedTimestampColumn
  ): boolean {
    return this.hasColumn(columnName) && this.isStringColumn(columnName);
  }

  protected addTimestampsIfExists<T extends Record<string, any>>(
    data: T,
    operation: 'create' | 'update'
  ): T {
    const result = { ...data };
    const now = this.getCurrentTimestamp();
    const hasOwnValue = (columnName: ManagedTimestampColumn) =>
      Object.prototype.hasOwnProperty.call(result, columnName);

    if (operation === 'create') {
      if (
        this.shouldAutoPopulateTimestamp('created_at') &&
        !hasOwnValue('created_at')
      ) {
        (result as any).created_at = now;
      }
      if (
        this.shouldAutoPopulateTimestamp('updated_at') &&
        !hasOwnValue('updated_at')
      ) {
        (result as any).updated_at = now;
      }
    } else if (operation === 'update') {
      if (
        this.shouldAutoPopulateTimestamp('updated_at') &&
        !hasOwnValue('updated_at')
      ) {
        (result as any).updated_at = now;
      }
    }

    return result;
  }

  protected addCreateTimestamps<T extends Record<string, any>>(
    data: T
  ): T {
    return this.addTimestampsIfExists(data, 'create');
  }

  protected addUpdateTimestamp<T extends Record<string, any>>(
    data: T
  ): T {
    return this.addTimestampsIfExists(data, 'update');
  }

  private getConnectionDatabaseType(connection: Kysely<DB>): DatabaseType {
    return TableCreator.getDatabaseType(
      connection as unknown as Kysely<any>,
      this.connectionConfig.writeConnectionName
    );
  }

  private async findByIdUsingConnection(
    connection: Kysely<DB>,
    id: string | number
  ): Promise<T | undefined> {
    const query: any = connection.selectFrom(this.tableName).selectAll();
    return (await query
      .where(this.primaryKey as any, '=', id)
      .executeTakeFirst()) as T | undefined;
  }

  private async insertAndFetchCreatedRecord(
    connection: Kysely<DB>,
    processedData: Record<string, any>
  ): Promise<T> {
    const databaseType = this.getConnectionDatabaseType(connection);

    if (
      databaseType === DatabaseType.POSTGRESQL ||
      databaseType === DatabaseType.SQLITE
    ) {
      return await (connection.insertInto(this.tableName) as any)
        .values(processedData as any)
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    if (databaseType === DatabaseType.MSSQL) {
      return await (connection.insertInto(this.tableName) as any)
        .values(processedData as any)
        .outputAll('inserted')
        .executeTakeFirstOrThrow();
    }

    const insertResult = await (connection.insertInto(this.tableName) as any)
      .values(processedData as any)
      .executeTakeFirstOrThrow();

    return await this.fetchInsertedRecordByPrimaryKey(
      connection,
      insertResult,
      processedData
    );
  }

  private async insertAndFetchCreatedRecords(
    connection: Kysely<DB>,
    processedData: Record<string, any>[]
  ): Promise<T[]> {
    const databaseType = this.getConnectionDatabaseType(connection);

    if (
      databaseType === DatabaseType.POSTGRESQL ||
      databaseType === DatabaseType.SQLITE
    ) {
      return await (connection.insertInto(this.tableName) as any)
        .values(processedData as any)
        .returningAll()
        .execute();
    }

    if (databaseType === DatabaseType.MSSQL) {
      return await (connection.insertInto(this.tableName) as any)
        .values(processedData as any)
        .outputAll('inserted')
        .execute();
    }

    const createdRecords: T[] = [];
    for (const item of processedData) {
      createdRecords.push(
        await this.insertAndFetchCreatedRecord(connection, item)
      );
    }

    return createdRecords;
  }

  private async fetchInsertedRecordByPrimaryKey(
    connection: Kysely<DB>,
    insertResult: Record<string, any>,
    processedData: Record<string, any>
  ): Promise<T> {
    const insertedPrimaryKey = this.resolveInsertedPrimaryKey(
      insertResult,
      processedData
    );
    const query: any = connection.selectFrom(this.tableName).selectAll();

    return await query
      .where(this.primaryKey as any, '=', insertedPrimaryKey)
      .executeTakeFirstOrThrow();
  }

  private resolveInsertedPrimaryKey(
    insertResult: Record<string, any>,
    processedData: Record<string, any>
  ): string | number {
    const insertId = insertResult?.insertId;
    if (typeof insertId === 'string' || typeof insertId === 'number') {
      return insertId;
    }

    const explicitPrimaryKey = processedData?.[this.primaryKey];
    if (
      typeof explicitPrimaryKey === 'string' ||
      typeof explicitPrimaryKey === 'number'
    ) {
      return explicitPrimaryKey;
    }

    throw ValidationError.create(
      `Unable to resolve inserted primary key for table ${this.tableName}.`,
      this.primaryKey,
      processedData
    );
  }
}

/**
 * 查询助手 - 常用查询模式
 */
export class QueryHelpers {
  /**
   * 创建 IN 查询
   */
  static whereIn<DB, TB extends keyof DB, K extends TableColumnKey<DB, TB>>(
    field: K,
    values: ReadonlyArray<Selectable<DB[TB]>[K]>
  ): WhereExpression<DB, TB> {
    return ((qb: any) => {
      if (values.length === 0) {
        return qb.where(kyselySql<SqlBool>`1 = 0`);
      }

      return qb.where(field as any, 'in', values);
    }) as WhereExpression<DB, TB>;
  }

  /**
   * 创建范围查询
   */
  static whereBetween<
    DB,
    TB extends keyof DB,
    K extends TableColumnKey<DB, TB>
  >(
    field: K,
    min: Selectable<DB[TB]>[K],
    max: Selectable<DB[TB]>[K]
  ): WhereExpression<DB, TB> {
    return ((qb: any) =>
      qb
        .where(field as any, '>=' as any, min)
        .where(field as any, '<=' as any, max)) as WhereExpression<DB, TB>;
  }

  /**
   * 创建模糊查询
   */
  static whereLike<
    DB,
    TB extends keyof DB,
    K extends StringColumnKey<DB, TB>
  >(
    field: K,
    pattern: string
  ): WhereExpression<DB, TB> {
    return ((qb: any) =>
      qb.where(field as any, 'like', `%${pattern}%`)) as WhereExpression<
      DB,
      TB
    >;
  }

  /**
   * 创建日期范围查询
   */
  static whereDateRange<
    DB,
    TB extends keyof DB,
    K extends TableColumnKey<DB, TB>
  >(
    field: K,
    startDate: Date,
    endDate: Date
  ): WhereExpression<DB, TB> {
    return ((qb: any) =>
      qb
        .where(field as any, '>=' as any, startDate)
        .where(field as any, '<=' as any, endDate)) as WhereExpression<
      DB,
      TB
    >;
  }

  /**
   * 组合多个条件（AND）
   */
  static and<DB, TB extends keyof DB>(
    ...conditions: WhereExpression<DB, TB>[]
  ): WhereExpression<DB, TB> {
    return ((qb: any) =>
      conditions.reduce((query, condition) => condition(query), qb)) as
      WhereExpression<DB, TB>;
  }

  /**
   * 组合多个条件（OR）
   */
  static or<DB, TB extends keyof DB>(
    ...conditions: Array<
      (eb: ExpressionBuilder<DB, TB>) => Expression<SqlBool>
    >
  ): WhereExpression<DB, TB> {
    return ((qb: any) =>
      qb.where((eb: ExpressionBuilder<DB, TB>) =>
        eb.or(conditions.map((condition) => condition(eb)))
      )) as WhereExpression<DB, TB>;
  }
}
