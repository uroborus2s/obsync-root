# 跨数据库兼容的 TableSchema 设计

## 概述

本文档详细说明了 @stratix/database 框架中 TableSchema 的重构设计，实现了真正的跨数据库兼容性。用户只需要编写一个统一的 TableSchema，就可以在 PostgreSQL、MySQL、SQLite、MSSQL 等数据库上正确工作。

## 🎯 核心设计理念

### 1. 统一的 ColumnType 枚举

```typescript
export enum ColumnType {
  // 数字类型
  INTEGER = 'INTEGER',      // 32位整数
  BIGINT = 'BIGINT',        // 64位大整数
  SMALLINT = 'SMALLINT',    // 16位小整数
  TINYINT = 'TINYINT',      // 8位微整数
  DECIMAL = 'DECIMAL',      // 精确小数
  FLOAT = 'FLOAT',          // 单精度浮点数
  DOUBLE = 'DOUBLE',        // 双精度浮点数

  // 字符串类型
  STRING = 'STRING',        // 可变长度字符串
  CHAR = 'CHAR',           // 固定长度字符串
  TEXT = 'TEXT',           // 长文本
  MEDIUMTEXT = 'MEDIUMTEXT', // 中等长度文本
  LONGTEXT = 'LONGTEXT',    // 超长文本

  // 日期时间类型
  DATE = 'DATE',           // 日期（年月日）
  TIME = 'TIME',           // 时间（时分秒）
  TIMESTAMP = 'TIMESTAMP', // 时间戳（带时区）
  DATETIME = 'DATETIME',   // 日期时间（不带时区）

  // 其他类型
  BOOLEAN = 'BOOLEAN',     // 布尔值
  JSON = 'JSON',           // JSON 数据
  BLOB = 'BLOB',           // 二进制大对象
  BINARY = 'BINARY',       // 二进制数据
  UUID = 'UUID'            // UUID 标识符
}
```

### 2. 自动类型映射系统

框架内置了完整的数据库类型映射表，将通用的 ColumnType 自动映射到各数据库的具体类型：

#### PostgreSQL 映射
```typescript
[DatabaseType.POSTGRESQL]: {
  [ColumnType.INTEGER]: 'integer',
  [ColumnType.STRING]: 'varchar',
  [ColumnType.JSON]: 'jsonb',        // 优先使用 jsonb
  [ColumnType.BOOLEAN]: 'boolean',
  [ColumnType.UUID]: 'uuid',
  [ColumnType.BLOB]: 'bytea',
  // ...
}
```

#### MySQL 映射
```typescript
[DatabaseType.MYSQL]: {
  [ColumnType.INTEGER]: 'int',
  [ColumnType.STRING]: 'varchar',
  [ColumnType.JSON]: 'json',
  [ColumnType.BOOLEAN]: 'boolean',
  [ColumnType.UUID]: 'char(36)',     // 使用 char(36) 存储
  [ColumnType.BLOB]: 'blob',
  // ...
}
```

#### SQLite 映射
```typescript
[DatabaseType.SQLITE]: {
  [ColumnType.INTEGER]: 'integer',
  [ColumnType.BIGINT]: 'integer',    // 统一使用 integer
  [ColumnType.STRING]: 'text',       // 统一使用 text
  [ColumnType.BOOLEAN]: 'integer',   // 使用 integer 存储布尔值
  [ColumnType.JSON]: 'text',         // 使用 text 存储 JSON
  [ColumnType.DATE]: 'text',         // 使用 text 存储日期
  // ...
}
```

#### MSSQL 映射
```typescript
[DatabaseType.MSSQL]: {
  [ColumnType.INTEGER]: 'int',
  [ColumnType.STRING]: 'nvarchar',
  [ColumnType.JSON]: 'nvarchar(max)',
  [ColumnType.BOOLEAN]: 'bit',
  [ColumnType.UUID]: 'uniqueidentifier',
  [ColumnType.BLOB]: 'varbinary(max)',
  // ...
}
```

## 🔧 实现架构

### 1. 类型映射层

每个数据库类型都有对应的专门处理方法：

```typescript
class TableCreator {
  // 整数类型处理
  private static addIntegerColumn(builder, column, databaseType) {
    const constraints = column.constraints || {};
    
    // 处理自增主键
    if (constraints.autoIncrement) {
      switch (databaseType) {
        case DatabaseType.POSTGRESQL:
          return builder.serial(column.name);
        case DatabaseType.MYSQL:
          return builder.integer(column.name);
        // ...
      }
    }
    
    return builder.integer(column.name);
  }

  // 字符串类型处理
  private static addStringColumn(builder, column, databaseType) {
    const constraints = column.constraints || {};
    
    switch (databaseType) {
      case DatabaseType.POSTGRESQL:
        return constraints.length 
          ? builder.varchar(column.name, constraints.length)
          : builder.varchar(column.name);
      case DatabaseType.MYSQL:
        return constraints.length 
          ? builder.varchar(column.name, constraints.length)
          : builder.varchar(column.name, 255);
      case DatabaseType.SQLITE:
        return builder.text(column.name);
      case DatabaseType.MSSQL:
        return constraints.length 
          ? builder.nvarchar(column.name, constraints.length)
          : builder.nvarchar(column.name, 255);
    }
  }

  // JSON 类型处理
  private static addJsonColumn(builder, column, databaseType) {
    switch (databaseType) {
      case DatabaseType.POSTGRESQL:
        return builder.jsonb(column.name);  // 优先使用 jsonb
      case DatabaseType.MYSQL:
        return builder.json(column.name);
      case DatabaseType.SQLITE:
        return builder.text(column.name);   // 使用 text 存储
      case DatabaseType.MSSQL:
        return builder.nvarchar(column.name, 'max');
    }
  }
}
```

### 2. 智能特性处理

#### 自增主键适配
```typescript
// PostgreSQL: 使用 SERIAL/BIGSERIAL
if (constraints.autoIncrement && databaseType === DatabaseType.POSTGRESQL) {
  return builder.serial(column.name);  // 或 bigSerial
}

// MySQL: 使用 AUTO_INCREMENT
if (constraints.autoIncrement && databaseType === DatabaseType.MYSQL) {
  return builder.integer(column.name); // Kysely 会自动添加 AUTO_INCREMENT
}

// SQLite: 使用 AUTOINCREMENT
if (constraints.autoIncrement && databaseType === DatabaseType.SQLITE) {
  return builder.integer(column.name); // SQLite 自动处理
}
```

#### 布尔值适配
```typescript
// PostgreSQL/MySQL: 原生布尔类型
case DatabaseType.POSTGRESQL:
case DatabaseType.MYSQL:
  return builder.boolean(column.name);

// SQLite: 使用 INTEGER 存储 (0/1)
case DatabaseType.SQLITE:
  return builder.integer(column.name);

// MSSQL: 使用 BIT 类型
case DatabaseType.MSSQL:
  return builder.bit(column.name);
```

#### UUID 适配
```typescript
// PostgreSQL: 原生 UUID 类型
case DatabaseType.POSTGRESQL:
  return builder.uuid(column.name);

// MySQL: 使用 CHAR(36) 存储
case DatabaseType.MYSQL:
  return builder.char(column.name, 36);

// SQLite: 使用 TEXT 存储
case DatabaseType.SQLITE:
  return builder.text(column.name);

// MSSQL: 使用 UNIQUEIDENTIFIER
case DatabaseType.MSSQL:
  return builder.uniqueidentifier(column.name);
```

## 📝 使用示例

### 1. 基本用法

```typescript
// 定义跨数据库兼容的表结构
const userSchema = SchemaBuilder
  .create('users')
  .addColumn('id', ColumnType.INTEGER, { 
    primaryKey: true, 
    autoIncrement: true, 
    nullable: false 
  })
  .addColumn('username', ColumnType.STRING, { 
    length: 50, 
    nullable: false, 
    unique: true 
  })
  .addColumn('email', ColumnType.STRING, { 
    length: 255, 
    nullable: false, 
    unique: true 
  })
  .addColumn('is_active', ColumnType.BOOLEAN, { 
    defaultValue: true, 
    nullable: false 
  })
  .addColumn('preferences', ColumnType.JSON, { 
    nullable: true 
  })
  .addColumn('created_at', ColumnType.TIMESTAMP, { 
    defaultValue: 'CURRENT_TIMESTAMP', 
    nullable: false 
  })
  .build();
```

### 2. 复杂类型示例

```typescript
const productSchema = SchemaBuilder
  .create('products')
  .addColumn('id', ColumnType.BIGINT, { 
    primaryKey: true, 
    autoIncrement: true 
  })
  .addColumn('name', ColumnType.STRING, { 
    length: 200, 
    nullable: false 
  })
  .addColumn('description', ColumnType.TEXT, { 
    nullable: true 
  })
  .addColumn('price', ColumnType.DECIMAL, { 
    precision: 12, 
    scale: 2, 
    nullable: false 
  })
  .addColumn('weight', ColumnType.FLOAT, { 
    nullable: true 
  })
  .addColumn('specifications', ColumnType.JSON, { 
    nullable: true 
  })
  .addColumn('external_id', ColumnType.UUID, { 
    nullable: true, 
    unique: true 
  })
  .build();
```

### 3. Repository 集成

```typescript
export class UserRepository extends BaseRepository<Database, 'users'> {
  protected readonly tableName = 'users' as const;

  constructor() {
    super(
      { connectionName: 'default' },
      userSchema,  // 跨数据库兼容的 schema
      { 
        enabled: true,
        autoEnableInDevelopment: true
      }
    );
  }
}
```

## 🎯 实际效果对比

### 同一个 Schema 在不同数据库上的 DDL

#### PostgreSQL
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### MySQL
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  preferences JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### SQLite
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  preferences TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### MSSQL
```sql
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  username NVARCHAR(50) NOT NULL UNIQUE,
  email NVARCHAR(255) NOT NULL UNIQUE,
  is_active BIT NOT NULL DEFAULT 1,
  preferences NVARCHAR(MAX),
  created_at DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 迁移指南

### 从旧版本迁移

#### 1. 更新 ColumnType 引用

```typescript
// 旧版本
.addColumn('name', ColumnType.VARCHAR, { length: 100 })

// 新版本
.addColumn('name', ColumnType.STRING, { length: 100 })
```

#### 2. 移除数据库特定的类型

```typescript
// 旧版本 - 数据库特定
.addColumn('data', ColumnType.JSONB, {})  // 只在 PostgreSQL 工作

// 新版本 - 跨数据库兼容
.addColumn('data', ColumnType.JSON, {})   // 在所有数据库工作
```

#### 3. 简化复杂类型处理

```typescript
// 旧版本 - 需要手动处理不同数据库
if (databaseType === DatabaseType.POSTGRESQL) {
  .addColumn('id', ColumnType.INTEGER, { autoIncrement: true })
} else if (databaseType === DatabaseType.MYSQL) {
  .addColumn('id', ColumnType.INTEGER, { autoIncrement: true })
}

// 新版本 - 自动处理
.addColumn('id', ColumnType.INTEGER, { autoIncrement: true })
```

## ✅ 优势总结

1. **开发效率**：只需编写一次 Schema，适用所有数据库
2. **类型安全**：完整的 TypeScript 类型支持
3. **自动优化**：每个数据库使用最适合的类型实现
4. **向后兼容**：现有代码可以平滑迁移
5. **维护简单**：统一的 API，减少数据库特定代码
6. **测试友好**：可以在不同数据库间轻松切换进行测试

这个设计真正实现了"编写一次，到处运行"的跨数据库兼容性目标。
