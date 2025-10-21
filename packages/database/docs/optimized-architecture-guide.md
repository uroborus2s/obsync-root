# @stratix/database 优化架构指南

## 🎯 概述

本文档介绍了 @stratix/database 包的优化架构设计，重点说明了连接管理优化和 BaseRepository 集成改进。

## 🏗️ 核心优化

### 1. 数据库连接管理优化

#### 优化前的问题
- 每个 Repository 实例化时重复创建连接
- 复杂的依赖注入系统增加了维护成本
- 连接获取逻辑分散在各个组件中

#### 优化后的方案
- 在应用启动时一次性创建和初始化所有数据库连接
- 提供全局连接访问函数，简化使用方式
- 移除复杂的依赖注入，改用直接函数调用

### 2. BaseRepository 集成改进

#### 新的连接获取方式
```typescript
// 优化前：通过 DI 容器获取连接
protected writeConnection!: Kysely<DB>;

// 优化后：通过全局函数获取连接
const connection = await getWriteConnection(connectionName);
```

#### 简化的构造函数
```typescript
// 优化前：复杂的依赖注入
constructor(databaseAPI: DatabaseAPI, connectionOptions?: RepositoryConnectionOptions)

// 优化后：只需要连接配置
constructor(connectionOptions?: RepositoryConnectionOptions)
```

## 🚀 使用指南

### 1. 基本使用

#### 创建 Repository
```typescript
import { BaseRepository } from '@stratix/database/config/base-repository';

export class UserRepository extends BaseRepository<Database, 'users', User, NewUser, UserUpdate> {
  protected readonly tableName = 'users' as const;
  protected readonly logger: Logger;

  constructor(logger: Logger, connectionOptions?: string) {
    super(connectionOptions || 'default');
    this.logger = logger;
  }

  // 自定义方法
  async findByUsername(username: string) {
    return await this.findOne((qb) => 
      qb.where('username', '=', username)
    );
  }
}
```

#### 使用 Repository
```typescript
const userRepo = new UserRepository(logger);

// 创建用户
const result = await userRepo.create({
  username: 'john_doe',
  email: 'john@example.com',
  password_hash: 'hashed_password'
});

// 查找用户
const user = await userRepo.findByUsername('john_doe');
```

### 2. 连接配置

#### 使用默认连接
```typescript
const repo = new UserRepository(logger); // 使用 'default' 连接
```

#### 使用指定连接
```typescript
const repo = new UserRepository(logger, 'user-db');
```

#### 使用读写分离
```typescript
const repo = new UserRepository(logger, {
  readConnection: 'user-read-db',
  writeConnection: 'user-write-db',
  enableReadWriteSeparation: true
});
```

### 3. 全局连接访问

#### 直接获取连接
```typescript
import { getReadConnection, getWriteConnection } from '@stratix/database/core/database-manager';

// 获取读连接
const readConn = await getReadConnection('default');

// 获取写连接
const writeConn = await getWriteConnection('default');

// 执行自定义查询
const result = await readConn
  .selectFrom('users')
  .selectAll()
  .where('active', '=', true)
  .execute();
```

## 🔧 应用启动配置

### 1. DatabaseManager 初始化

在应用启动时，DatabaseManager 会自动：
- 预创建所有配置的数据库连接
- 设置全局连接访问函数
- 验证连接健康状态

### 2. 生命周期管理

```typescript
// 在插件入口文件中
export default withRegisterAutoDI(async function databasePlugin(fastify, options) {
  // DatabaseManager 会在 onReady 阶段初始化所有连接
  fastify.addHook('onReady', async () => {
    const databaseManager = fastify.diContainer.resolve('databaseManager');
    await databaseManager.onReady();
  });
});
```

## 📊 性能优化

### 1. 连接池管理
- 预创建连接避免运行时开销
- 连接复用减少资源消耗
- 健康检查确保连接可用性

### 2. 读写分离支持
- 自动路由读操作到读连接
- 写操作使用写连接
- 事务中统一使用事务连接

### 3. 批量操作优化
```typescript
// 批量创建
const users = await userRepo.createMany([
  { username: 'user1', email: 'user1@example.com' },
  { username: 'user2', email: 'user2@example.com' }
]);

// 批量更新
const updatedCount = await userRepo.updateMany(
  (qb) => qb.where('active', '=', false),
  { deleted_at: new Date() }
);
```

## 🔗 Schema 生成器集成

### 1. 自动化表创建
```typescript
import { AutoSchemaGenerator } from '@stratix/database/schema/auto-schema-generator';

const generator = new AutoSchemaGenerator({
  sourceFiles: ['src/types/database.ts'],
  outputDir: 'migrations',
  databaseType: 'postgresql',
  connectionName: 'default',
  migrationMode: 'update',
  safeMode: {
    preventDataLoss: true,
    requireConfirmation: true,
    backupBeforeMigration: true
  }
}, logger);

// 生成 Schema
const schema = await generator.generateSchema();

// 应用到数据库
await generator.applySchema(schema);
```

### 2. 迁移管理
```typescript
// 检查差异
const diff = await generator.checkSchemaDiff(newSchema);

// 生成迁移脚本
const migrationScript = await generator.generateMigration(newSchema);
```

## 🛡️ 错误处理

### 1. 连接错误处理
```typescript
try {
  const connection = await getWriteConnection('default');
  // 使用连接
} catch (error) {
  if (error.message.includes('not initialized')) {
    // 数据库管理器未初始化
  } else if (error.message.includes('not ready')) {
    // 数据库管理器未就绪
  }
}
```

### 2. Repository 错误处理
```typescript
const result = await userRepo.create(userData);
if (!result.success) {
  console.error('Create failed:', result.error);
  // 处理错误
} else {
  console.log('User created:', result.data);
}
```

## 📝 最佳实践

### 1. Repository 设计
- 继承 BaseRepository 获得标准 CRUD 功能
- 添加业务特定的查询方法
- 使用类型安全的查询构建器
- 实现适当的数据验证

### 2. 连接管理
- 使用读写分离提升性能
- 合理配置连接池大小
- 监控连接健康状态
- 实现连接故障恢复

### 3. 事务处理
- 在事务中自动使用事务连接
- 避免在事务外部获取连接
- 正确处理事务回滚
- 使用嵌套事务时要小心

## 🔄 迁移指南

### 从旧版本迁移

1. **更新 Repository 基类**
   ```typescript
   // 现在统一使用优化后的版本
   import { BaseRepository } from '@stratix/database/config/base-repository';
   ```

2. **简化构造函数**
   ```typescript
   // 旧版本
   constructor(databaseAPI: DatabaseAPI, connectionOptions?: RepositoryConnectionOptions)
   
   // 新版本
   constructor(connectionOptions?: RepositoryConnectionOptions)
   ```

3. **移除 DI 依赖**
   ```typescript
   // 不再需要注入 DatabaseAPI
   // 直接使用全局连接函数
   ```

## 🎉 总结

优化后的架构提供了：
- ✅ 更简单的使用方式
- ✅ 更好的性能表现
- ✅ 更清晰的代码结构
- ✅ 更强的类型安全
- ✅ 更完善的错误处理
- ✅ 更灵活的连接管理

这些改进使得 @stratix/database 包更加易用、高效和可维护。
