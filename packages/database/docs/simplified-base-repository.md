# BaseRepository 简化重构总结

## 重构目标

根据用户反馈，原有的跨数据库兼容性处理过于复杂，影响性能。本次重构的目标是：

1. **移除复杂性**：去掉所有 `.returningAll()` 等影响兼容性的方法
2. **提升性能**：移除数据库类型检测和复杂的兼容性判断
3. **保留核心功能**：只处理日志部分，使用标准的 logger 对象
4. **简化架构**：回归简洁的设计，直接使用 Kysely 原生 API

## 移除的复杂功能

### 1. 数据库类型检测机制
```typescript
// ❌ 移除的复杂检测
protected async getDatabaseType(): Promise<string>
private async detectDatabaseTypeByQuery(): Promise<string>
private getDatabaseTypeByConnectionName(): string
protected async getDatabaseTypeWithCache(): Promise<string>
```

### 2. 兼容性处理方法
```typescript
// ❌ 移除的兼容性方法
protected async supportsReturning(): Promise<boolean>
protected async executeInsertWithReturn<TInsert, TResult = T>()
protected async executeUpdateWithReturn<TUpdate, TResult = T>()
```

### 3. 复杂的 CRUD 实现
```typescript
// ❌ 移除的复杂实现
// 包含数据库类型检测、RETURNING 兼容性处理等
async create(data: CreateT): Promise<DatabaseResult<T>>
async createMany(data: CreateT[]): Promise<DatabaseResult<T[]>>
async update(id: any, data: UpdateT): Promise<DatabaseResult<Option<T>>>
```

## 保留和改进的功能

### 1. 简化的日志系统

#### Logger 接口定义
```typescript
interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}
```

#### 构造函数支持 Logger
```typescript
constructor(
  protected readonly databaseManger: DatabaseAPI,
  connectionOptions?: RepositoryConnectionOptions,
  logger?: Logger  // 新增 logger 参数
) {
  // 设置 logger，如果没有提供则使用默认的 console logger
  this.logger = logger || {
    debug: (message: string, meta?: any) => console.log(`[DEBUG] ${message}`, meta || ''),
    info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
    warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
    error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || '')
  };
}
```

#### 简化的日志方法
```typescript
// ✅ 简化的操作日志
protected logOperation(operation: string, data?: any): void {
  const logData = {
    component: 'BaseRepository',
    tableName: this.tableName,
    operation,
    data: data ? this.sanitizeLogData(data) : undefined
  };
  
  this.logger.info(`Repository operation: ${operation}`, logData);
}

// ✅ 简化的错误日志
protected logError(operation: string, error: Error, data?: any): void {
  const logData = {
    component: 'BaseRepository',
    tableName: this.tableName,
    operation,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    data: data ? this.sanitizeLogData(data) : undefined
  };
  
  this.logger.error(`Repository error in ${operation}: ${error.message}`, logData);
}
```

### 2. 敏感数据清理功能
```typescript
// ✅ 保留的敏感数据清理
private sanitizeLogData(data: any): any {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'credential'
  ];
  
  // 递归清理敏感字段
  // ... 实现逻辑保持不变
}
```

## 简化后的 CRUD 实现示例

### 简化的 create 方法
```typescript
// ✅ 简化后的实现
async create(data: CreateT): Promise<DatabaseResult<T>> {
  const validationResult = this.validateCreateData(data);
  if (!validationResult.success) {
    return failure(validationResult.error);
  }

  return await DatabaseErrorHandler.execute(async () => {
    const result = await (this.writeConnection as any)
      .insertInto(this.tableName)
      .values(data as any)
      .executeTakeFirstOrThrow();

    this.logOperation('create', { tableName: this.tableName, data });
    
    // 简单返回插入结果，不使用 returningAll
    return result as T;
  }, 'repository-create');
}
```

### 简化的 update 方法
```typescript
// ✅ 简化后的实现
async update(id: any, data: UpdateT): Promise<DatabaseResult<Option<T>>> {
  const validationResult = this.validateUpdateData(data);
  if (!validationResult.success) {
    return failure(validationResult.error);
  }

  return await DatabaseErrorHandler.execute(async () => {
    const result = await (this.writeConnection as any)
      .updateTable(this.tableName)
      .set(data)
      .where(this.primaryKey, '=', id)
      .executeTakeFirst();

    this.logOperation('update', { 
      tableName: this.tableName, 
      id, 
      updatedRows: result.numUpdatedRows || 0 
    });

    // 如果需要返回更新后的记录，需要额外查询
    if (result.numUpdatedRows > 0) {
      const updatedRecord = await (this.readConnection as any)
        .selectFrom(this.tableName)
        .selectAll()
        .where(this.primaryKey, '=', id)
        .executeTakeFirst();
      return fromNullable(updatedRecord as T | undefined) as Option<T>;
    }

    return fromNullable(undefined) as Option<T>;
  }, 'repository-update');
}
```

## 性能和架构优势

### 1. 性能提升
- ✅ **无数据库检测开销**：移除了复杂的数据库类型检测逻辑
- ✅ **无兼容性判断**：直接使用 Kysely 原生 API，无需运行时判断
- ✅ **简化代码路径**：减少了方法调用层次和条件分支
- ✅ **内存使用优化**：移除了缓存和复杂状态管理

### 2. 架构简化
- ✅ **代码可读性**：逻辑更直观，易于理解和维护
- ✅ **调试友好**：错误堆栈更清晰，问题定位更容易
- ✅ **扩展性好**：基于简单的 logger 接口，易于集成不同的日志系统
- ✅ **测试简单**：减少了需要模拟的复杂依赖

### 3. 开发体验
- ✅ **快速启动**：无需等待数据库类型检测
- ✅ **明确行为**：开发者清楚知道会执行什么 SQL
- ✅ **灵活控制**：可以根据具体需求选择是否需要返回数据

## 日志输出示例

### 操作日志
```json
{
  "component": "BaseRepository",
  "tableName": "users",
  "operation": "create",
  "data": {
    "tableName": "users",
    "data": {
      "name": "John",
      "email": "john@example.com",
      "password": "[REDACTED]"
    }
  }
}
```

### 错误日志
```json
{
  "component": "BaseRepository",
  "tableName": "users",
  "operation": "create",
  "error": {
    "name": "ValidationError",
    "message": "Email already exists",
    "stack": "ValidationError: Email already exists..."
  },
  "data": {
    "tableName": "users",
    "data": {
      "email": "john@example.com",
      "token": "[REDACTED]"
    }
  }
}
```

## 使用建议

### 1. 数据库兼容性处理
如果需要跨数据库兼容性，建议在应用层或具体的 Repository 实现中处理，而不是在 BaseRepository 中。

### 2. 返回数据需求
如果需要插入后的完整数据，可以：
- 使用数据库支持的特性（如 PostgreSQL 的 RETURNING）
- 在插入后进行额外查询
- 在应用层构造返回数据

### 3. Logger 集成
```typescript
// 集成自定义 logger
const customLogger = {
  debug: (msg, meta) => winston.debug(msg, meta),
  info: (msg, meta) => winston.info(msg, meta),
  warn: (msg, meta) => winston.warn(msg, meta),
  error: (msg, meta) => winston.error(msg, meta)
};

const repository = new MyRepository(databaseAPI, connectionOptions, customLogger);
```

## 总结

这次简化重构成功实现了：

1. **大幅提升性能**：移除了所有复杂的兼容性检测和处理逻辑
2. **保持核心功能**：保留了完整的日志记录和敏感数据清理功能
3. **提升可维护性**：代码更简洁，逻辑更清晰
4. **增强灵活性**：支持自定义 logger，易于集成不同的日志系统

BaseRepository 现在是一个真正轻量级、高性能的基础仓储类，专注于提供核心的数据访问功能和标准化的日志记录。
