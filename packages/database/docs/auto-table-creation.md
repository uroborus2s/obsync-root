# BaseRepository 自动表创建功能

## 概述

BaseRepository 现在支持自动表创建功能，可以在 Repository 初始化时根据提供的 schema 定义自动检查并创建数据库表。这个功能特别适用于开发环境和快速原型开发。

## 主要特性

### 1. Schema 定义支持
- 支持 Kysely 兼容的 schema 定义格式
- 包含表结构信息（字段名、类型、约束等）
- 支持主键、外键、索引等约束的定义

### 2. 表存在性检查
- 自动检查目标表是否存在
- 支持多种数据库类型：PostgreSQL、MySQL、SQLite、MSSQL
- 使用数据库特定的系统表查询

### 3. 自动表创建逻辑
- 根据提供的 schema 自动创建表
- 使用 Kysely 的 schema builder API 生成 DDL 语句
- 支持字段默认值、NOT NULL 约束等
- 支持主键、外键、索引等约束的创建

### 4. 配置选项
- `autoCreateTable` 配置选项，默认为 false
- 支持开发环境自动启用，生产环境手动控制
- 提供强制重建表的选项

## 使用方法

### 1. 基本使用

```typescript
import { BaseRepository, SchemaBuilder, ColumnType } from '@stratix/database';

// 定义表 schema
const userSchema = SchemaBuilder
  .create('users')
  .addPrimaryKey('id')
  .addString('username', 50, { nullable: false, unique: true })
  .addString('email', 255, { nullable: false, unique: true })
  .addTimestamps()
  .build();

// 创建 Repository
export class UserRepository extends BaseRepository<Database, 'users'> {
  protected readonly tableName = 'users' as const;
  protected readonly logger: Logger;

  constructor(logger: Logger) {
    super('default', userSchema, {
      enabled: true,
      autoEnableInDevelopment: true
    });
    this.logger = logger;
  }
}
```

### 2. 使用 SchemaBuilder

SchemaBuilder 提供了流畅的 API 来定义表结构：

```typescript
const schema = SchemaBuilder
  .create('posts')
  .addPrimaryKey('id')                                    // 自增主键
  .addForeignKey('user_id', 'users', 'id', 'CASCADE')   // 外键
  .addString('title', 200, { nullable: false })          // 字符串字段
  .addText('content', { nullable: false })               // 文本字段
  .addBoolean('is_published', { defaultValue: false })   // 布尔字段
  .addTimestamp('published_at', { nullable: true })      // 时间戳字段
  .addTimestamps()                                        // created_at, updated_at
  .addIndex('idx_posts_user_id', ['user_id'])            // 普通索引
  .addUniqueIndex('idx_posts_title', ['title'])          // 唯一索引
  .setComment('文章表')                                   // 表注释
  .build();
```

### 3. 手动定义 Schema

也可以手动定义 schema 对象：

```typescript
import { TableSchema, ColumnType } from '@stratix/database';

const schema: TableSchema = {
  tableName: 'users',
  columns: [
    {
      name: 'id',
      type: ColumnType.INTEGER,
      constraints: {
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      }
    },
    {
      name: 'username',
      type: ColumnType.VARCHAR,
      constraints: {
        length: 50,
        nullable: false,
        unique: true
      }
    },
    {
      name: 'email',
      type: ColumnType.VARCHAR,
      constraints: {
        length: 255,
        nullable: false,
        unique: true
      }
    }
  ],
  indexes: [
    {
      name: 'idx_users_username',
      columns: ['username'],
      unique: true
    }
  ],
  comment: '用户表'
};
```

### 4. 配置选项

```typescript
const autoTableCreation: AutoTableCreationConfig = {
  enabled: true,                    // 是否启用自动表创建
  autoEnableInDevelopment: true,    // 开发环境自动启用
  forceRecreate: false,             // 是否强制重建表
  createIndexes: true,              // 是否创建索引
  timeout: 30000                    // 超时时间（毫秒）
};
```

## 支持的字段类型

### 数值类型
- `INTEGER` - 整数
- `BIGINT` - 大整数
- `DECIMAL` - 小数
- `NUMERIC` - 数值
- `REAL` - 实数
- `DOUBLE` - 双精度浮点数
- `FLOAT` - 浮点数

### 字符串类型
- `VARCHAR` - 可变长度字符串
- `CHAR` - 固定长度字符串
- `TEXT` - 文本

### 日期时间类型
- `DATE` - 日期
- `TIME` - 时间
- `TIMESTAMP` - 时间戳
- `DATETIME` - 日期时间（MySQL）

### 其他类型
- `BOOLEAN` - 布尔值
- `JSON` - JSON 数据
- `JSONB` - JSONB 数据（PostgreSQL）
- `BLOB` - 二进制大对象
- `BINARY` - 二进制数据
- `UUID` - UUID

## 约束支持

### 字段约束
- `primaryKey` - 主键
- `autoIncrement` - 自增
- `nullable` - 可空
- `unique` - 唯一
- `defaultValue` - 默认值
- `length` - 长度限制
- `precision` - 精度
- `scale` - 小数位数

### 外键约束
```typescript
{
  references: {
    table: 'users',
    column: 'id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  }
}
```

### 索引定义
```typescript
{
  name: 'idx_name',
  columns: ['column1', 'column2'],
  unique: true,
  where: 'condition'
}
```

## 数据库兼容性

### PostgreSQL
- 支持 SERIAL/BIGSERIAL 自增类型
- 支持 JSONB 类型
- 支持部分索引（WHERE 条件）

### MySQL
- 支持 AUTO_INCREMENT
- 支持 DATETIME 类型
- 支持表注释

### SQLite
- 支持 AUTOINCREMENT
- 不支持表注释
- 简化的约束支持

### MSSQL
- 支持 IDENTITY 自增
- 支持表注释
- 完整的约束支持

## 最佳实践

### 1. 环境配置
```typescript
// 开发环境：自动启用
const devConfig = {
  enabled: false,  // 显式设置为 false
  autoEnableInDevelopment: true  // 开发环境自动启用
};

// 生产环境：手动控制
const prodConfig = {
  enabled: false,  // 生产环境禁用
  autoEnableInDevelopment: false
};
```

### 2. Schema 版本控制
```typescript
// 使用版本化的 schema 定义
const USER_SCHEMA_V1 = SchemaBuilder
  .create('users')
  .addPrimaryKey('id')
  .addString('username', 50)
  .build();

const USER_SCHEMA_V2 = SchemaBuilder
  .create('users')
  .addPrimaryKey('id')
  .addString('username', 50)
  .addString('email', 255)  // 新增字段
  .build();
```

### 3. 类型安全
```typescript
// 确保 TypeScript 接口与 schema 定义一致
interface UserTable {
  id: number;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

const userSchema = SchemaBuilder
  .create('users')
  .addPrimaryKey('id')
  .addString('username', 50)
  .addString('email', 255)
  .addTimestamps()
  .build();
```

## 注意事项

1. **生产环境使用**：建议在生产环境中禁用自动表创建，使用专门的迁移工具
2. **性能影响**：表存在性检查会在首次数据库操作时执行，可能有轻微性能影响
3. **权限要求**：需要数据库用户具有创建表和索引的权限
4. **数据丢失风险**：`forceRecreate` 选项会删除现有表，请谨慎使用
5. **事务支持**：表创建操作不在事务中执行，失败时可能导致部分创建

## 错误处理

自动表创建功能包含完善的错误处理：

```typescript
// 表创建失败不会中断应用运行
// 错误会被记录到日志中
this.logger?.error('Failed to ensure table exists', {
  tableName: this.tableName,
  error: error.message
});
```

在生产环境中，如果表不存在且自动创建被禁用，后续的数据库操作会正常抛出错误，提醒开发者手动创建表。
