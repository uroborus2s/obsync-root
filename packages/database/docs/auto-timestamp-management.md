# 自动时间戳字段管理功能

## ✅ **功能完成！自动时间戳字段管理**

成功实现了完全自动化的时间戳字段管理功能，让时间戳处理变得透明和无感知。

## 🎯 **核心功能**

### **1. 自动字段添加**
- 在 BaseRepository 的 `onReady` 生命周期中，自动为表添加 `created_at` 和 `updated_at` 字段
- 使用字符串类型（ColumnType.STRING），长度为255，存储 ISO 时间格式
- `created_at` 字段设置为 NOT NULL，`updated_at` 字段设置为 NULLABLE

### **2. 冲突检测**
- 自动检测用户提供的 `tableSchema` 是否已经包含时间戳字段
- 如果发现冲突，抛出明确的错误提示，指导用户移除手动定义

### **3. CRUD 方法增强**
- `create()` 方法：自动添加当前时间戳到 `created_at` 和 `updated_at` 字段
- `update()` 方法：自动更新 `updated_at` 字段为当前时间戳
- `createMany()` 方法：为所有记录自动添加时间戳
- `updateMany()` 方法：自动更新所有记录的 `updated_at` 字段

### **4. 向后兼容**
- 如果表中没有时间字段，相关操作正常工作，不添加时间戳
- 保持现有 API 不变，时间戳功能完全透明

## 🔧 **使用方法**

### **基本用法**
```typescript
import { BaseRepository, SchemaBuilder, ColumnType } from '@stratix/database';

// 🎯 1. 定义 Schema（不要手动添加时间戳字段）
const userSchema = SchemaBuilder
  .create('users')
  .addPrimaryKey('id')
  .addColumn('name', ColumnType.STRING, { length: 100, nullable: false })
  .addColumn('email', ColumnType.STRING, { length: 255, unique: true })
  .addColumn('age', ColumnType.INTEGER, { nullable: true })
  // ❌ 不要添加：.addTimestamps() 或手动添加 created_at/updated_at
  .build();

// 🎯 2. 创建 Repository
export class UserRepository extends BaseRepository<Database, 'users'> {
  protected readonly tableName = 'users' as const;
  protected readonly logger: Logger;

  constructor(logger: Logger) {
    super(
      { connectionName: 'default' },
      userSchema,  // 🎯 传入 schema
      { enabled: true, autoEnableInDevelopment: true }
    );
    this.logger = logger;
  }
}

// 🎯 3. 使用 Repository（时间戳自动处理）
const userRepo = new UserRepository(logger);

// 创建用户 - 自动添加 created_at 和 updated_at
const newUser = await userRepo.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 28
});
// 结果包含：
// {
//   id: 1,
//   name: 'John Doe',
//   email: 'john@example.com', 
//   age: 28,
//   created_at: '2024-01-15T10:30:45.123Z',  // 🎯 自动添加
//   updated_at: '2024-01-15T10:30:45.123Z'   // 🎯 自动添加
// }

// 更新用户 - 自动更新 updated_at
const updatedUser = await userRepo.update(1, {
  name: 'John Smith',
  age: 29
});
// 结果包含：
// {
//   id: 1,
//   name: 'John Smith',
//   email: 'john@example.com',
//   age: 29,
//   created_at: '2024-01-15T10:30:45.123Z',  // 保持不变
//   updated_at: '2024-01-15T11:45:20.456Z'   // 🎯 自动更新
// }
```

### **批量操作**
```typescript
// 批量创建 - 所有记录自动添加时间戳
const users = await userRepo.createMany([
  { name: 'Alice', email: 'alice@example.com', age: 25 },
  { name: 'Bob', email: 'bob@example.com', age: 30 },
  { name: 'Charlie', email: 'charlie@example.com', age: 35 }
]);
// 所有记录都包含相同的 created_at 和 updated_at 时间戳

// 批量更新 - 所有匹配记录自动更新 updated_at
const updatedCount = await userRepo.updateMany(
  (qb) => qb.where('age', '>', 25),
  { status: 'active' }
);
// 所有 age > 25 的记录的 updated_at 都被更新为当前时间
```

## 🚨 **冲突检测和错误处理**

### **冲突检测示例**
```typescript
// ❌ 错误的 Schema 定义（会触发冲突检测）
const badSchema = SchemaBuilder
  .create('users')
  .addPrimaryKey('id')
  .addColumn('name', ColumnType.STRING, { length: 100 })
  .addTimestamps()  // ❌ 不要手动添加时间戳字段
  .build();

// 或者手动添加
const anotherBadSchema = SchemaBuilder
  .create('users')
  .addPrimaryKey('id')
  .addColumn('name', ColumnType.STRING, { length: 100 })
  .addColumn('created_at', ColumnType.STRING, { length: 255 })  // ❌ 冲突
  .build();

// 🚨 会抛出错误：
// Error: 时间戳字段冲突：表 users 的 schema 中已经定义了 created_at, updated_at 字段。
// 请移除这些字段的手动定义，系统会自动管理时间戳字段。
// 提示：不要在 SchemaBuilder 中使用 .addTimestamps() 或手动添加 created_at/updated_at 字段，
// BaseRepository 会自动添加这些字段。
```

### **正确的 Schema 定义**
```typescript
// ✅ 正确的 Schema 定义
const correctSchema = SchemaBuilder
  .create('users')
  .addPrimaryKey('id')
  .addColumn('name', ColumnType.STRING, { length: 100, nullable: false })
  .addColumn('email', ColumnType.STRING, { length: 255, unique: true })
  .addColumn('age', ColumnType.INTEGER, { nullable: true })
  // 🎯 不添加任何时间戳字段，系统会自动处理
  .build();
```

## 📊 **生成的表结构**

### **自动添加的字段**
```sql
-- 🎯 系统自动添加的时间戳字段

-- PostgreSQL
created_at varchar(255) NOT NULL,
updated_at varchar(255)

-- MySQL  
created_at varchar(255) NOT NULL,
updated_at varchar(255)

-- SQLite
created_at text NOT NULL,
updated_at text

-- SQL Server
created_at nvarchar(255) NOT NULL,
updated_at nvarchar(255)
```

### **完整的表结构示例**
```sql
-- 用户表的完整结构（PostgreSQL 示例）
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  email varchar(255) UNIQUE,
  age integer,
  created_at varchar(255) NOT NULL,  -- 🎯 自动添加
  updated_at varchar(255)            -- 🎯 自动添加
);
```

## 🎯 **时间格式和兼容性**

### **时间格式**
- 使用 `new Date().toISOString()` 生成时间字符串
- 格式：`2024-01-15T10:30:45.123Z`
- 标准 ISO 8601 格式，UTC 时区

### **跨数据库兼容性**
```typescript
// 🎯 所有数据库都使用字符串存储，完全兼容
const timestamp = '2024-01-15T10:30:45.123Z';

// PostgreSQL: 可以直接比较和排序
WHERE created_at >= '2024-01-01T00:00:00.000Z'
ORDER BY created_at DESC

// MySQL: 同样支持字符串比较
WHERE created_at >= '2024-01-01T00:00:00.000Z'
ORDER BY created_at DESC

// SQLite: 文本类型，完全兼容
WHERE created_at >= '2024-01-01T00:00:00.000Z'
ORDER BY created_at DESC

// SQL Server: nvarchar 类型，完全兼容
WHERE created_at >= '2024-01-01T00:00:00.000Z'
ORDER BY created_at DESC
```

## 🔧 **实现细节**

### **自动字段添加逻辑**
```typescript
private addAutoTimestampFields(schema: TableSchema): TableSchema {
  // 检查冲突
  const hasCreatedAt = schema.columns.some(col => col.name === 'created_at');
  const hasUpdatedAt = schema.columns.some(col => col.name === 'updated_at');

  if (hasCreatedAt || hasUpdatedAt) {
    throw new Error('时间戳字段冲突...');
  }

  // 添加时间戳字段
  return {
    ...schema,
    columns: [
      ...schema.columns,
      {
        name: 'created_at',
        type: ColumnType.STRING,
        constraints: { length: 255, nullable: false }
      },
      {
        name: 'updated_at', 
        type: ColumnType.STRING,
        constraints: { length: 255, nullable: true }
      }
    ]
  };
}
```

### **智能时间戳添加**
```typescript
protected addTimestampsIfExists<T>(data: T, operation: 'create' | 'update'): T {
  const result = { ...data };
  const now = this.getCurrentTimestamp();

  if (operation === 'create') {
    if (this.hasColumn('created_at')) (result as any).created_at = now;
    if (this.hasColumn('updated_at')) (result as any).updated_at = now;
  } else if (operation === 'update') {
    if (this.hasColumn('updated_at')) (result as any).updated_at = now;
  }

  return result;
}
```

## 🎉 **核心优势**

### **1. 完全自动化**
- 开发者无需关心时间戳字段的定义和管理
- 系统自动处理所有时间戳相关逻辑

### **2. 零配置**
- 不需要额外的配置或设置
- 传入 schema 即可自动启用时间戳管理

### **3. 冲突预防**
- 主动检测和预防时间戳字段冲突
- 提供清晰的错误提示和解决方案

### **4. 跨数据库兼容**
- 统一的字符串时间格式
- 所有数据库都使用相同的查询语法

### **5. 向后兼容**
- 现有代码无需修改
- 时间戳功能完全透明

### **6. 性能优化**
- 在 onReady 阶段一次性添加字段
- 运行时零开销的时间戳检测

## 📋 **最佳实践**

### **1. Schema 定义**
```typescript
// ✅ 推荐：简洁的 Schema 定义
const schema = SchemaBuilder
  .create('table_name')
  .addPrimaryKey('id')
  .addColumn('field1', ColumnType.STRING, { length: 100 })
  .addColumn('field2', ColumnType.INTEGER)
  // 不添加时间戳字段，系统自动处理
  .build();
```

### **2. Repository 实现**
```typescript
// ✅ 推荐：传入 schema 启用自动时间戳
export class MyRepository extends BaseRepository<DB, 'table_name'> {
  constructor() {
    super(
      { connectionName: 'default' },
      schema,  // 🎯 传入 schema
      { enabled: true }
    );
  }
}
```

### **3. 时间查询**
```typescript
// ✅ 推荐：利用字符串时间的排序特性
const recentUsers = await userRepo.findMany({
  where: (qb) => qb.where('created_at', '>=', '2024-01-01T00:00:00.000Z'),
  orderBy: [{ column: 'created_at', order: 'desc' }],
  limit: 10
});
```

这个自动时间戳字段管理功能让时间戳处理变得完全透明和自动化，大大简化了开发者的工作量！
