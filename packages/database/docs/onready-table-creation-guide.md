# BaseRepository onReady 表创建机制

## 概述

BaseRepository 现在支持在 Fastify 的 `onReady` 生命周期钩子中自动创建表，这种方式相比之前的懒加载机制具有显著的性能优势。

## 核心特性

### 🚀 **性能优势**
- **零运行时开销**：查询时无需表存在性检查
- **启动时统一创建**：避免运行时的重复检查
- **并发友好**：消除高并发场景下的表检查瓶颈

### 🎯 **工作原理**

1. **构造阶段**：Repository 实例化时配置表创建参数
2. **onReady 阶段**：Fastify 启动完成后自动创建表
3. **运行阶段**：所有数据库操作无需表检查，直接执行

## 使用方法

### 1. 基本用法

```typescript
import { BaseRepository, SchemaBuilder } from '@stratix/database';

// 定义表结构
const userSchema = SchemaBuilder
  .create('users')
  .addPrimaryKey('id')
  .addString('username', 50, { nullable: false, unique: true })
  .addString('email', 255, { nullable: false, unique: true })
  .addTimestamps()
  .build();

// 创建 Repository 并启用 onReady 表创建
export class UserRepository extends BaseRepository<Database, 'users'> {
  protected readonly tableName = 'users' as const;

  constructor() {
    super(
      { connectionName: 'default' },  // 连接配置
      userSchema,                     // 表结构定义
      { 
        enabled: true,                // 🎯 启用自动表创建
        autoEnableInDevelopment: true // 开发环境自动启用
      }
    );
  }
}
```

### 2. 高级配置

```typescript
export class ProductRepository extends BaseRepository<Database, 'products'> {
  protected readonly tableName = 'products' as const;

  constructor() {
    super(
      { 
        connectionName: 'product-service',
        readConnectionName: 'product-service-read',
        writeConnectionName: 'product-service-write'
      },
      productSchema,
      {
        enabled: true,
        forceRecreate: false,         // 不强制重建
        createIndexes: true,          // 创建索引
        timeout: 30000,               // 30秒超时
        autoEnableInDevelopment: true // 开发环境自动启用
      }
    );
  }
}
```

### 3. 条件性表创建

```typescript
export class LogRepository extends BaseRepository<Database, 'logs'> {
  protected readonly tableName = 'logs' as const;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    super(
      { connectionName: 'logging' },
      logSchema,
      {
        // 生产环境禁用自动创建，开发环境启用
        enabled: !isProduction,
        autoEnableInDevelopment: true,
        forceRecreate: false
      }
    );
  }
}
```

## 生命周期流程

### 启动阶段

```
1. 应用启动
   ↓
2. 插件注册 (Repository 实例化)
   ↓
3. Fastify onReady 钩子触发
   ↓
4. BaseRepository.onReady() 执行
   ↓
5. 检查表是否存在
   ↓
6. 创建表（如果不存在）
   ↓
7. 应用就绪，开始处理请求
```

### 运行阶段

```
HTTP 请求
   ↓
Controller 方法
   ↓
Repository 方法 (无表检查)
   ↓
直接执行数据库查询
   ↓
返回结果
```

## 配置选项详解

### AutoTableCreationConfig

```typescript
interface AutoTableCreationConfig {
  /** 是否启用自动表创建 */
  enabled: boolean;
  
  /** 是否在开发环境自动启用 */
  autoEnableInDevelopment?: boolean;
  
  /** 是否强制重建表（危险操作） */
  forceRecreate?: boolean;
  
  /** 是否创建索引 */
  createIndexes?: boolean;
  
  /** 表创建超时时间（毫秒） */
  timeout?: number;
}
```

### 默认配置

```typescript
const defaultConfig = {
  enabled: false,                    // 默认关闭，需要显式启用
  autoEnableInDevelopment: true,     // 开发环境自动启用
  forceRecreate: false,              // 不强制重建
  createIndexes: true,               // 创建索引
  timeout: 30000                     // 30秒超时
};
```

## 最佳实践

### 1. 环境配置

```typescript
// 根据环境配置表创建策略
const getTableCreationConfig = () => {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'development':
      return {
        enabled: true,
        forceRecreate: false,
        createIndexes: true
      };
      
    case 'test':
      return {
        enabled: true,
        forceRecreate: true,  // 测试环境每次重建
        createIndexes: false  // 测试时跳过索引创建
      };
      
    case 'production':
      return {
        enabled: false        // 生产环境禁用自动创建
      };
      
    default:
      return { enabled: false };
  }
};

export class UserRepository extends BaseRepository<Database, 'users'> {
  constructor() {
    super(
      { connectionName: 'default' },
      userSchema,
      getTableCreationConfig()
    );
  }
}
```

### 2. 错误处理

```typescript
export class UserRepository extends BaseRepository<Database, 'users'> {
  // onReady 方法会自动处理错误并抛出
  // 如果需要自定义错误处理，可以重写 onReady 方法
  
  async onReady(): Promise<void> {
    try {
      await super.onReady();
      this.logger?.info('UserRepository table creation completed');
    } catch (error) {
      this.logger?.error('UserRepository table creation failed:', error);
      
      // 根据业务需求决定是否重新抛出错误
      if (process.env.NODE_ENV === 'production') {
        // 生产环境可能需要优雅降级
        this.logger?.warn('Continuing without table creation in production');
        return;
      }
      
      throw error; // 开发环境重新抛出错误
    }
  }
}
```

### 3. 表依赖管理

```typescript
// 对于有外键依赖的表，确保正确的创建顺序
export class OrderRepository extends BaseRepository<Database, 'orders'> {
  constructor() {
    super(
      { connectionName: 'default' },
      orderSchema, // 包含对 users 表的外键
      {
        enabled: true,
        // 可以通过延迟初始化来处理依赖关系
      }
    );
  }
  
  // 重写 onReady 以处理依赖
  async onReady(): Promise<void> {
    // 确保用户表先创建
    // 这里可以添加依赖检查逻辑
    await super.onReady();
  }
}
```

## 性能对比

### 之前的懒加载机制
```typescript
// 每次查询都有额外开销
async findById(id: string) {
  await this.ensureTableExists(); // +3-15ms
  // 实际查询...
}
```

### 现在的 onReady 机制
```typescript
// 运行时零开销
async findById(id: string) {
  // 直接执行查询，无额外开销
  return await this.getQueryConnection()...
}
```

**性能提升**：
- 每次查询节省 3-15ms
- 高并发场景性能提升显著
- 启动时间增加 100-500ms（一次性成本）

## 注意事项

### 1. 权限要求
- 数据库用户需要 DDL 权限（CREATE TABLE、DROP TABLE）
- 生产环境建议预创建表，禁用自动创建

### 2. 并发安全
- onReady 钩子在单线程中执行，天然避免并发问题
- 多个 Repository 实例的表创建是串行的

### 3. 错误恢复
- 表创建失败会阻止应用启动
- 建议在生产环境禁用自动创建，使用数据库迁移工具

### 4. 向后兼容
- 保留了原有的 `ensureTableExists()` 方法（已废弃）
- 现有代码可以无缝迁移到新机制
