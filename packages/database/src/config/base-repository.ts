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
} from '@stratix/utils/functional';
import type {
  ColumnDefinitionBuilder,
  CreateTableBuilder,
  DeleteQueryBuilder,
  ExpressionBuilder,
  Insertable,
  Kysely,
  Selectable,
  SelectQueryBuilder,
  Updateable,
  UpdateQueryBuilder
} from 'kysely';

import {
  getReadConnection,
  getWriteConnection
} from '../core/database-manager.js';
import { getCurrentTransaction } from '../core/transaction-manager.js';
import {
  type DatabaseError,
  ErrorClassifier,
  ValidationError
} from '../utils/error-handler.js';

/**
 * 数据库操作上下文
 */
export interface DatabaseOperationContext {
  /** 是否为只读操作 */
  readonly?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 操作标识符 */
  operationId?: string;
}

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
  where?: string;
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
  static getDatabaseType(connection: Kysely<any>): DatabaseType {
    // 这里需要根据连接的方言类型来判断
    // 简化实现，实际应该从连接配置中获取

    const dialectName = (connection as any).getExecutor?.()?.adapter
      ?.constructor?.name;

    if (dialectName?.includes('Postgres')) return DatabaseType.POSTGRESQL;
    if (dialectName?.includes('MySQL')) return DatabaseType.MYSQL;
    if (dialectName?.includes('Sqlite')) return DatabaseType.SQLITE;
    if (dialectName?.includes('MSSQL')) return DatabaseType.MSSQL;

    // 默认返回 PostgreSQL
    return DatabaseType.POSTGRESQL;
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
        .on(tableName)
        .columns(index.columns);

      if (index.unique) {
        indexBuilder = indexBuilder.unique();
      }

      if (index.where) {
        indexBuilder = (indexBuilder as any).where(index.where);
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
export interface QueryOptions<T = any> {
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: OrderByClause | OrderByClause[];
  readonly readonly?: boolean;
  readonly timeout?: number;
  readonly connectionName?: string;
  /** 选择特定字段（如果不指定则返回所有字段） */
  readonly select?: ReadonlyArray<keyof T>;
}

/**
 * 排序子句
 */
export interface OrderByClause {
  readonly field: string;
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
export type WhereExpression<DB, TB extends keyof DB> = (qb: any) => any;

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
export type QueryPipe<DB, TB extends keyof DB, O> = (qb: any) => any;
export type UpdatePipe<DB, TB extends keyof DB> = (qb: any) => any;
export type DeletePipe<DB, TB extends keyof DB> = (qb: any) => any;

/**
 * 查询构建器工厂 - 纯函数式查询构建
 */
export class QueryBuilderFactory {
  /**
   * 创建基础查询
   */
  static createBaseQuery<DB, TB extends keyof DB, O = {}>(
    context: QueryBuilderContext<DB, TB>
  ) {
    return (qb: any) => qb;
  }

  /**
   * 添加 WHERE 条件
   */
  static addWhere<DB, TB extends keyof DB, O = {}>(
    whereExpr: SelectWhereExpression<DB, TB>
  ): QueryPipe<DB, TB, O> {
    return (qb) => whereExpr(qb as any) as any;
  }

  /**
   * 添加排序
   */
  static addOrderBy<DB, TB extends keyof DB, O = {}>(
    orderBy?: OrderByClause | OrderByClause[]
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
    selector: (qb: any) => any
  ) {
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
  findById(
    id: string | number,
    options?: { select?: ReadonlyArray<keyof T> }
  ): Promise<Maybe<T>>;
  findOne(
    criteria: WhereExpression<DB, TB>,
    options?: { select?: ReadonlyArray<keyof T> }
  ): Promise<Maybe<T>>;
  findMany(
    criteria?: WhereExpression<DB, TB>,
    options?: QueryOptions<T>
  ): Promise<T[]>;
  findAll(options?: QueryOptions<T>): Promise<T[]>;

  // 基础操作
  create(data: CreateT): Promise<Either<DatabaseError, T>>;
  createMany(data: CreateT[]): Promise<Either<DatabaseError, T[]>>;
  update(id: string | number, data: UpdateT): Promise<Either<DatabaseError, T>>;
  updateMany(
    criteria: WhereExpression<DB, TB>,
    data: UpdateT
  ): Promise<Either<DatabaseError, number>>;
  delete(id: string | number): Promise<Either<DatabaseError, T>>;
  deleteMany(
    criteria: WhereExpression<DB, TB>
  ): Promise<Either<DatabaseError, number>>;

  // 聚合查询
  count(criteria?: WhereExpression<DB, TB>): Promise<number>;
  exists(criteria: WhereExpression<DB, TB>): Promise<boolean>;

  // 分页查询
  paginate(
    criteria?: WhereExpression<DB, TB>,
    pagination?: PaginationOptions
  ): Promise<Either<DatabaseError, PaginatedResult<T>>>;

  // 事务支持
  withTransaction<R>(
    fn: (repository: this) => Promise<R>
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
    if (this.tableSchema) {
      this.tableSchema = this.addAutoTimestampFields(this.tableSchema);
    }
    if (!this.autoTableCreation.enabled || !this.tableSchema) {
      return;
    }

    try {
      this.logger?.info(
        {
          forceRecreate: this.autoTableCreation.forceRecreate,
          columnsCount: this.tableSchema.columns.length
        },
        `Creating table in onReady: ${this.tableName}`
      );

      const connection = await this.getWriteConnection();
      const databaseType = TableCreator.getDatabaseType(connection);

      await TableCreator.createTable(
        connection,
        this.tableSchema,
        databaseType,
        {
          forceRecreate: this.autoTableCreation.forceRecreate
        }
      );

      this.logger?.info(
        `Successfully ensured table exists: ${this.tableName}`,
        {
          originalColumnsCount: (this.tableSchema?.columns.length || 0) - 2,
          totalColumnsCount: this.tableSchema?.columns.length || 0,
          indexesCount: this.tableSchema?.indexes?.length || 0,
          forceRecreate: this.autoTableCreation.forceRecreate,
          autoTimestampsAdded: true
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
    const currentTransaction = getCurrentTransaction();
    if (currentTransaction) {
      this.logger?.debug('Using transaction for read query', {
        tableName: this.tableName,
        inTransaction: true
      });
      return currentTransaction as unknown as Kysely<DB>;
    }
    return await getReadConnection(this.connectionConfig.readConnectionName);
  }

  protected async getWriteConnection(): Promise<Kysely<DB>> {
    const currentTransaction = getCurrentTransaction();
    if (currentTransaction) {
      this.logger?.debug('Using transaction for write query', {
        tableName: this.tableName,
        inTransaction: true
      });
      return currentTransaction as unknown as Kysely<DB>;
    }
    return await getWriteConnection(this.connectionConfig.writeConnectionName);
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

  async findById(
    id: string | number,
    options?: { select?: ReadonlyArray<keyof T> }
  ): Promise<Maybe<T>> {
    try {
      const connection = await this.getQueryConnection();
      let query = connection.selectFrom(this.tableName) as any;

      // 如果指定了字段选择，使用 select()；否则使用 selectAll()
      if (options?.select && options.select.length > 0) {
        query = query.select(options.select as any);
      } else {
        query = query.selectAll();
      }

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

  async findOne(
    criteria: WhereExpression<DB, TB>,
    options?: { select?: ReadonlyArray<keyof T> }
  ): Promise<Maybe<T>> {
    try {
      const connection = await this.getQueryConnection();
      let baseQuery = connection.selectFrom(this.tableName) as any;

      // 如果指定了字段选择，使用 select()；否则使用 selectAll()
      if (options?.select && options.select.length > 0) {
        baseQuery = baseQuery.select(options.select as any);
      } else {
        baseQuery = baseQuery.selectAll();
      }

      const query = criteria(baseQuery);
      const result = await query.executeTakeFirst();
      return fromNullable(result as T | undefined);
    } catch (error) {
      this.logError('findOne', error as Error);
      return fromNullable<T>(undefined);
    }
  }

  async findMany(
    criteria?: WhereExpression<DB, TB>,
    options?: QueryOptions<T>
  ): Promise<T[]> {
    try {
      const connection = await this.getQueryConnection();
      let query = connection.selectFrom(this.tableName) as any;

      // 如果指定了字段选择，使用 select()；否则使用 selectAll()
      if (options?.select && options.select.length > 0) {
        query = query.select(options.select as any);
      } else {
        query = query.selectAll();
      }

      if (criteria) {
        query = criteria(query);
      }

      if (options?.orderBy) {
        const orderClauses = Array.isArray(options.orderBy)
          ? options.orderBy
          : [options.orderBy];
        for (const clause of orderClauses) {
          query = query.orderBy(clause.field as any, clause.direction);
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

  async findAll(options?: QueryOptions<T>): Promise<T[]> {
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
        const dataWithTimestamps = this.addTimestampsIfExists(
          data as any,
          'create'
        );
        const processedData = this.processJsonFields(dataWithTimestamps);
        const connection = await this.getWriteConnection();

        // MySQL 不支持 RETURNING 子句，需要先插入再查询
        const insertResult = await connection
          .insertInto(this.tableName)
          .values(processedData as any)
          .executeTakeFirstOrThrow();

        // 获取插入的 ID
        const insertId = (insertResult as any).insertId;

        // 重新查询插入的记录
        const query: any = connection.selectFrom(this.tableName).selectAll();
        const result = await query
          .where((eb: any) => eb(this.primaryKey, '=', insertId))
          .executeTakeFirstOrThrow();

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
    for (const item of data) {
      const validationResult = this.validateCreateData(item);
      if (isLeft(validationResult)) {
        return eitherLeft(validationResult.left);
      }
    }

    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
        const dataWithTimestamps = data.map((item) =>
          this.addTimestampsIfExists(item as any, 'create')
        );
        const processedData = dataWithTimestamps.map((item) =>
          this.processJsonFields(item)
        );

        // MySQL 不支持 RETURNING 子句，需要先插入再查询
        const insertResult = await connection
          .insertInto(this.tableName)
          .values(processedData as any)
          .executeTakeFirstOrThrow();

        // 获取插入的起始 ID
        const firstInsertId = (insertResult as any).insertId;
        const count = data.length;

        // 重新查询插入的记录（假设 ID 是连续的）
        const query: any = connection.selectFrom(this.tableName).selectAll();
        const results = await query
          .where((eb: any) => eb(this.primaryKey, '>=', firstInsertId))
          .where((eb: any) => eb(this.primaryKey, '<', firstInsertId + count))
          .execute();

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
        const dataWithTimestamps = this.addTimestampsIfExists(
          data as any,
          'update'
        );
        const processedData = this.processJsonFields(dataWithTimestamps);
        const connection = await this.getWriteConnection();

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

        const updatedRecordOpt = await this.findById(id);
        if (isNone(updatedRecordOpt)) {
          throw ErrorClassifier.classify(
            new Error('Updated record not found after update.')
          );
        }
        return updatedRecordOpt.value;
      },
      (error) => {
        if (isDatabaseError(error)) return error;
        return ErrorClassifier.classify(error);
      }
    );
  }

  async updateMany(
    criteria: WhereExpression<DB, TB>,
    data: UpdateT
  ): Promise<Either<DatabaseError, number>> {
    const validationResult = this.validateUpdateData(data);
    if (isLeft(validationResult)) {
      return eitherLeft(validationResult.left);
    }

    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
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
        const recordToDeleteOpt = await this.findById(id);
        if (isNone(recordToDeleteOpt)) {
          throw ValidationError.create(
            `Record with id ${id} not found for deletion.`
          );
        }
        const recordToDelete = recordToDeleteOpt.value;

        const connection = await this.getWriteConnection();
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
    criteria: WhereExpression<DB, TB>
  ): Promise<Either<DatabaseError, number>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
        const deleteQuery = connection.deleteFrom(this.tableName);
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

  async count(criteria?: WhereExpression<DB, TB>): Promise<number> {
    try {
      const connection = await this.getQueryConnection();
      const baseQuery = (connection.selectFrom(this.tableName) as any).select(
        (eb: ExpressionBuilder<DB, TB>) => eb.fn.countAll<string>().as('count')
      );

      const finalQuery = criteria ? criteria(baseQuery as any) : baseQuery;

      const result = (await finalQuery.executeTakeFirstOrThrow()) as {
        count: string;
      };
      return Number(result.count);
    } catch (error) {
      this.logError('count', error as Error);
      return 0;
    }
  }

  async exists(criteria: WhereExpression<DB, TB>): Promise<boolean> {
    const count = await this.count(criteria);
    return count > 0;
  }

  async paginate(
    criteria?: WhereExpression<DB, TB>,
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

  async withTransaction<R>(
    fn: (repository: this) => Promise<R>
  ): Promise<Either<DatabaseError, R>> {
    return tryCatchAsync(
      async () => {
        const connection = await this.getWriteConnection();
        return await connection.transaction().execute(async (_trx) => {
          return await fn(this);
        });
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

  private addAutoTimestampFields(schema: TableSchema): TableSchema {
    const hasCreatedAt = schema.columns.some(
      (col) => col.name === 'created_at'
    );
    const hasUpdatedAt = schema.columns.some(
      (col) => col.name === 'updated_at'
    );

    if (hasCreatedAt || hasUpdatedAt) {
      const conflictFields = [];
      if (hasCreatedAt) conflictFields.push('created_at');
      if (hasUpdatedAt) conflictFields.push('updated_at');

      throw new Error(
        `时间戳字段冲突：表 ${schema.tableName} 的 schema 中已经定义了 ${conflictFields.join(', ')} 字段。` +
          `请移除这些字段的手动定义，系统会自动管理时间戳字段。` +
          `\n提示：不要在 SchemaBuilder 中使用 .addTimestamps() 或手动添加 created_at/updated_at 字段，` +
          `BaseRepository 会自动添加这些字段。`
      );
    }

    const enhancedSchema: TableSchema = {
      ...schema,
      columns: [
        ...schema.columns,
        {
          name: 'created_at',
          type: DataColumnType.STRING,
          constraints: {
            length: 255,
            nullable: false
          }
        },
        {
          name: 'updated_at',
          type: DataColumnType.STRING,
          constraints: {
            length: 255,
            nullable: true
          }
        }
      ]
    };

    return enhancedSchema;
  }

  protected hasColumn(columnName: string): boolean {
    if (!this.tableSchema) return false;
    return this.tableSchema.columns.some((col) => col.name === columnName);
  }

  protected getCurrentTimestamp(): string {
    return new Date().toLocaleString();
  }

  protected addTimestampsIfExists<T extends Record<string, any>>(
    data: T,
    operation: 'create' | 'update'
  ): T {
    const result = { ...data };
    const now = this.getCurrentTimestamp();

    if (operation === 'create') {
      if (this.hasColumn('created_at')) {
        (result as any).created_at = now;
      }
      if (this.hasColumn('updated_at')) {
        (result as any).updated_at = now;
      }
    } else if (operation === 'update') {
      if (this.hasColumn('updated_at')) {
        (result as any).updated_at = now;
      }
    }

    return result;
  }

  protected addCreateTimestamps<T extends Record<string, any>>(
    data: T
  ): T & { created_at: string; updated_at: string } {
    const now = this.getCurrentTimestamp();
    return {
      ...data,
      created_at: now,
      updated_at: now
    };
  }

  protected addUpdateTimestamp<T extends Record<string, any>>(
    data: T
  ): T & { updated_at: string } {
    return {
      ...data,
      updated_at: this.getCurrentTimestamp()
    };
  }
}

/**
 * 查询助手 - 常用查询模式
 */
export class QueryHelpers {
  /**
   * 创建 IN 查询
   */
  static whereIn<DB, TB extends keyof DB>(
    field: string,
    values: any[]
  ): WhereExpression<DB, TB> {
    return (qb) => qb.where(field as any, 'in', values);
  }

  /**
   * 创建范围查询
   */
  static whereBetween<DB, TB extends keyof DB>(
    field: string,
    min: any,
    max: any
  ): WhereExpression<DB, TB> {
    return (qb) =>
      qb
        .where(field as any, '>=' as any, min)
        .where(field as any, '<=' as any, max);
  }

  /**
   * 创建模糊查询
   */
  static whereLike<DB, TB extends keyof DB>(
    field: string,
    pattern: string
  ): WhereExpression<DB, TB> {
    return (qb) => qb.where(field as any, 'like', `%${pattern}%`);
  }

  /**
   * 创建日期范围查询
   */
  static whereDateRange<DB, TB extends keyof DB>(
    field: string,
    startDate: Date,
    endDate: Date
  ): WhereExpression<DB, TB> {
    return (qb) =>
      qb
        .where(field as any, '>=' as any, startDate)
        .where(field as any, '<=' as any, endDate);
  }

  /**
   * 组合多个条件（AND）
   */
  static and<DB, TB extends keyof DB>(
    ...conditions: WhereExpression<DB, TB>[]
  ): WhereExpression<DB, TB> {
    return (qb) =>
      conditions.reduce((query, condition) => condition(query), qb);
  }

  /**
   * 组合多个条件（OR）
   */
  static or<DB, TB extends keyof DB>(
    ...conditions: WhereExpression<DB, TB>[]
  ): WhereExpression<DB, TB> {
    return (qb) => {
      if (conditions.length === 0) return qb;

      return qb.where((eb: any) => {
        const orConditions = conditions.map(
          (condition) => (subEb: any) => condition(subEb)
        );
        return eb.or(orConditions);
      });
    };
  }
}
