# BaseRepository 三项关键改进

## 概述

本文档详细说明了对 `packages/database/src/config/base-repository.ts` 模块的三项关键改进，这些改进解决了跨数据库兼容性、可靠性检测和标准化日志记录的问题。

## 1. `.returningAll()` 方法功能说明与兼容性解决

### 方法功能详解

`.returningAll()` 是 Kysely ORM 中的一个重要方法，用于在执行数据修改操作后返回受影响行的完整数据。

#### 核心作用
```typescript
// INSERT 操作示例
const newUser = await db
  .insertInto('users')
  .values({ name: 'John', email: 'john@example.com' })
  .returningAll()  // 返回插入后的完整记录
  .executeTakeFirst();

// 返回结果包含自动生成的字段：
// { 
//   id: 123, 
//   name: 'John', 
//   email: 'john@example.com', 
//   created_at: '2025-01-01T10:00:00Z',
//   updated_at: '2025-01-01T10:00:00Z'
// }
```

#### 实际用途
1. **获取自动生成的 ID**：插入后立即获取数据库生成的主键
2. **获取默认值**：获取数据库设置的默认值（如时间戳）
3. **获取触发器结果**：获取数据库触发器修改的字段
4. **原子操作**：在一次操作中完成插入和查询

### 数据库兼容性问题

| 数据库 | 支持情况 | SQL 语法 | 版本要求 |
|--------|----------|----------|----------|
| **PostgreSQL** | ✅ 完全支持 | `INSERT ... RETURNING *` | 所有版本 |
| **SQLite** | ✅ 支持 | `INSERT ... RETURNING *` | 3.35.0+ |
| **MySQL** | ❌ 不支持 | 语法错误 | 所有版本 |
| **MariaDB** | ⚠️ 部分支持 | `INSERT ... RETURNING *` | 10.5.0+ |

### 解决方案实现

#### 自动检测和适配策略
```typescript
protected async executeInsertWithReturn<TInsert, TResult = T>(
  insertData: TInsert
): Promise<TResult> {
  const supportsReturning = await this.supportsReturning();
  
  if (supportsReturning) {
    // PostgreSQL/SQLite: 使用原生 RETURNING
    return await this.writeConnection
      .insertInto(this.tableName)
      .values(insertData)
      .returningAll()
      .executeTakeFirstOrThrow();
  } else {
    // MySQL: 使用两步法
    const insertResult = await this.writeConnection
      .insertInto(this.tableName)
      .values(insertData)
      .executeTakeFirstOrThrow();

    // 使用 insertId 查询完整记录
    return await this.readConnection
      .selectFrom(this.tableName)
      .selectAll()
      .where(this.primaryKey, '=', insertResult.insertId)
      .executeTakeFirstOrThrow();
  }
}
```

## 2. 改进的数据库类型检测方法

### 原有问题
原始实现使用字符串匹配方式检测数据库类型：
```typescript
// ❌ 不可靠的方式
if (readConnectionName.includes('mysql')) {
  return 'mysql';
}
```

**问题**：
- 依赖连接名称命名规范
- 容易出现误判
- 无法处理动态连接配置

### 改进方案

#### 多层检测策略
```typescript
protected async getDatabaseType(): Promise<string> {
  try {
    // 方法1: 通过查询系统表检测
    return await this.detectDatabaseTypeByQuery();
  } catch (error) {
    // 方法2: 降级到连接名称检测
    return this.getDatabaseTypeByConnectionName();
  }
}
```

#### 系统表查询检测
```typescript
private async detectDatabaseTypeByQuery(): Promise<string> {
  try {
    // SQLite 特有查询
    await this.readConnection
      .selectFrom('sqlite_master')
      .select('name')
      .where('type', '=', 'table')
      .limit(1)
      .execute();
    return 'sqlite';
  } catch (sqliteError) {
    // 继续检测其他数据库
  }

  try {
    // PostgreSQL 特有查询
    await this.readConnection
      .selectFrom('pg_catalog.pg_tables')
      .select('tablename')
      .limit(1)
      .execute();
    return 'postgresql';
  } catch (pgError) {
    // 可能是 MySQL
    return 'mysql';
  }
}
```

#### 缓存机制
```typescript
private _cachedDatabaseType?: string;

protected async getDatabaseTypeWithCache(): Promise<string> {
  if (!this._cachedDatabaseType) {
    this._cachedDatabaseType = await this.getDatabaseType();
  }
  return this._cachedDatabaseType;
}
```

### 改进效果
- ✅ **准确性提升**：基于实际数据库特性检测
- ✅ **可靠性增强**：多层降级策略
- ✅ **性能优化**：缓存机制避免重复检测
- ✅ **扩展性好**：易于添加新数据库支持

## 3. BaseRepository 标准化日志方法

### 设计目标
- 符合 Stratix 框架日志规范
- 提供结构化日志格式
- 自动清理敏感数据
- 支持调试和生产环境

### 实现的方法

#### logOperation() - 操作日志
```typescript
protected logOperation(operation: string, data?: any): void {
  const debugEnabled = process.env.NODE_ENV === 'development' || 
                      process.env.DEBUG === 'true';
  
  if (debugEnabled) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: 'BaseRepository',
      tableName: this.tableName,
      operation,
      data: data ? this.sanitizeLogData(data) : undefined
    };
    console.log(`📊 ${JSON.stringify(logEntry)}`);
  }
}
```

#### logError() - 错误日志
```typescript
protected logError(operation: string, error: Error, data?: any): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    component: 'BaseRepository',
    tableName: this.tableName,
    level: 'ERROR',
    operation,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    data: data ? this.sanitizeLogData(data) : undefined
  };
  console.error(`❌ ${JSON.stringify(logEntry)}`);
}
```

#### 敏感数据清理
```typescript
private sanitizeLogData(data: any): any {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'credential'
  ];
  
  // 递归清理对象中的敏感字段
  if (typeof data === 'object' && data !== null) {
    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = sensitiveFields.some(field => 
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
```

### 日志输出示例

#### 操作日志
```json
{
  "timestamp": "2025-08-01T10:50:33.034Z",
  "component": "BaseRepository",
  "tableName": "users",
  "operation": "create",
  "data": {
    "name": "John",
    "email": "john@example.com",
    "password": "[REDACTED]"
  }
}
```

#### 错误日志
```json
{
  "timestamp": "2025-08-01T10:50:33.034Z",
  "component": "BaseRepository",
  "tableName": "users",
  "level": "ERROR",
  "operation": "create",
  "error": {
    "name": "ValidationError",
    "message": "Email already exists",
    "stack": "ValidationError: Email already exists\n    at ..."
  },
  "data": {
    "email": "john@example.com",
    "token": "[REDACTED]"
  }
}
```

## 总结

### 改进成果
1. **跨数据库兼容性** - 解决了 MySQL 不支持 RETURNING 的问题
2. **检测可靠性** - 提供了基于系统表查询的准确检测方法
3. **日志标准化** - 实现了符合框架规范的结构化日志

### 技术价值
- ✅ **功能一致性**：所有数据库提供相同的 API 体验
- ✅ **性能优化**：根据数据库特性选择最优实现
- ✅ **可维护性**：清晰的日志记录和错误追踪
- ✅ **安全性**：自动清理敏感数据
- ✅ **扩展性**：易于添加新数据库和新功能

这些改进使 `BaseRepository` 成为一个真正跨数据库、高可靠性、易于调试的基础设施组件。
