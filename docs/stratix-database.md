# Stratix数据库插件设计文档 (@stratix/database)

## 目录
1. [插件概述](#1-插件概述)
2. [使用方式](#2-使用方式)
   - [2.1 基本使用](#21-基本使用)
   - [2.2 模型定义](#22-模型定义)
   - [2.3 查询操作](#23-查询操作)
   - [2.4 关系管理](#24-关系管理)
   - [2.5 事务处理](#25-事务处理)
   - [2.6 迁移与种子](#26-迁移与种子)
   - [2.7 高级功能](#27-高级功能)
3. [API设计](#3-api设计)
   - [3.1 插件API](#31-插件api)
   - [3.2 数据库管理器API](#32-数据库管理器api)
   - [3.3 Model基类API](#33-model基类api)
   - [3.4 查询构建器API](#34-查询构建器api)
   - [3.5 迁移与种子API](#35-迁移与种子api)
4. [实现细节](#4-实现细节)
   - [4.1 核心实现](#41-核心实现)
   - [4.2 Model基类实现](#42-model基类实现)
   - [4.3 查询构建器实现](#43-查询构建器实现)
   - [4.4 关系管理实现](#44-关系管理实现)
   - [4.5 迁移生成器实现](#45-迁移生成器实现)
   - [4.6 多数据库适配](#46-多数据库适配)
   - [4.7 与框架集成](#47-与框架集成)

## 1. 插件概述

`@stratix/database` 是Stratix框架的官方数据库插件，提供了强大的对象关系映射(ORM)能力和数据库操作功能。插件基于Knex.js 3构建，支持多种关系型数据库，包括PostgreSQL、MySQL、SQLite、SQL Server和Oracle。

核心特点：
- **强类型模型**: 基于TypeScript类的模型定义，提供完整类型推导
- **关系支持**: 内置一对一、一对多、多对多关系管理
- **查询构建器**: 流畅的链式调用API，支持复杂查询构建
- **事务管理**: 简单易用的事务API，确保数据一致性
- **迁移系统**: 支持从模型自动生成迁移文件，并可手动调整
- **种子数据**: 灵活的种子数据管理，支持多环境配置
- **软删除**: 内置软删除功能，方便数据恢复和审计
- **多数据库支持**: 统一API操作多种数据库，隐藏底层差异

该插件遵循依赖倒置原则设计，通过抽象接口将数据库操作逻辑与具体实现分离，使应用代码不依赖特定的数据库技术。

## 2. 使用方式

> 本章节将详细介绍数据库插件的使用方式，包括基本配置、模型定义、查询操作、关系管理、事务处理、迁移与种子管理等。

### 2.1 基本使用

#### 2.1.1 安装插件

```bash
# npm
npm install @stratix/database knex

# yarn
yarn add @stratix/database knex

# pnpm
pnpm add @stratix/database knex
```

同时需要安装对应数据库的驱动:

```bash
# PostgreSQL
npm install pg

# MySQL
npm install mysql2

# SQLite
npm install sqlite3

# SQL Server
npm install tedious

# Oracle
npm install oracledb
```

#### 2.1.2 注册插件

```typescript
// 引入Stratix框架和数据库插件
import { createApp } from 'stratix';
import databasePlugin from '@stratix/database';

// 创建应用实例
const app = createApp();

// 注册数据库插件
app.register(databasePlugin, {
  // 数据库客户端类型
  client: 'postgresql',
  
  // 连接配置
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'my_database',
    user: 'postgres',
    password: 'password'
  },
  
  // 连接池配置
  pool: {
    min: 2,
    max: 10
  },
  
  // 模型配置
  models: {
    directory: './models',     // 模型文件目录
    baseClass: 'BaseModel',    // 基础模型类名
    autoRegister: true         // 自动注册目录下所有模型
  },
  
  // 迁移配置
  migrations: {
    directory: './migrations', // 迁移文件目录
    tableName: 'migrations',   // 迁移表名
    autoGenerate: true         // 自动从模型生成迁移
  },
  
  // 种子配置
  seeds: {
    directory: './seeds',      // 种子文件目录
    environment: {
      development: ['dev'],    // 开发环境使用的种子目录
      test: ['test'],          // 测试环境使用的种子目录
      production: ['prod']     // 生产环境使用的种子目录
    }
  },
  
  // 调试设置
  debug: process.env.NODE_ENV !== 'production'
});

// 启动应用
await app.start();

// 使用数据库
app.register(async (app) => {
  // 获取数据库实例
  const db = await app.resolve('db');
  
  // 获取模型
  const { User, Post } = await app.resolve('models');
  
  // 基本操作示例
  const user = await User.findById(1);
  const posts = await Post.find({ author_id: user.id });
  
  // 访问原始查询构建器
  const results = await db.knex('users')
    .select('id', 'name')
    .where('active', true);
});
```

#### 2.1.3 多数据库连接

```typescript
// 注册多个数据库连接
app.register(databasePlugin, {
  // 主数据库配置
  client: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'main_db',
    user: 'postgres',
    password: 'password'
  },
  
  // 定义命名连接
  connections: {
    // 分析数据库连接
    analytics: {
      client: 'postgresql',
      connection: {
        host: 'analytics.example.com',
        database: 'analytics',
        user: 'analyst',
        password: 'pass'
      }
    },
    
    // 只读数据库连接
    readonly: {
      client: 'postgresql',
      connection: {
        host: 'readonly.example.com',
        database: 'main_db_replica',
        user: 'reader',
        password: 'pass'
      }
    }
  }
});

// 使用指定的连接
app.register(async (app) => {
  // 获取数据库管理器
  const dbManager = await app.resolve('dbManager');
  
  // 访问命名连接
  const analyticsDb = dbManager.connection('analytics');
  const readonlyDb = dbManager.connection('readonly');
  
  // 使用特定连接查询
  const analyticsData = await analyticsDb.knex('events')
    .count('*')
    .where('date', '>', yesterday);
    
  const users = await readonlyDb.knex('users')
    .select('*')
    .limit(10);
});
```

#### 2.1.4 连接配置参考

**PostgreSQL**:
```typescript
{
  client: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,            // 可选，默认5432
    database: 'my_db',
    user: 'postgres',
    password: 'password',
    ssl: false,            // 可选，SSL配置
    application_name: 'my_app', // 可选，显示在pg_stat_activity
    timezone: 'UTC'        // 可选，时区设置
  }
}
```

**MySQL**:
```typescript
{
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: 3306,            // 可选，默认3306
    database: 'my_db',
    user: 'root',
    password: 'password',
    charset: 'utf8mb4',    // 可选，字符集
    timezone: '+00:00',    // 可选，时区设置
    dateStrings: true      // 可选，返回日期为字符串
  }
}
```

**SQLite**:
```typescript
{
  client: 'sqlite3',
  connection: {
    filename: './dev.sqlite3', // 文件路径或:memory:
    flags: ['OPEN_URI', 'OPEN_SHAREDCACHE'] // 可选，打开标志
  },
  useNullAsDefault: true // SQLite特有设置
}
```

**SQL Server**:
```typescript
{
  client: 'mssql',
  connection: {
    server: 'localhost',
    port: 1433,            // 可选，默认1433
    database: 'my_db',
    user: 'sa',
    password: 'password',
    options: {
      encrypt: true,       // 可选，启用加密
      trustServerCertificate: true // 开发环境信任证书
    }
  }
}
```

**Oracle**:
```typescript
{
  client: 'oracledb',
  connection: {
    host: 'localhost',
    port: 1521,            // 可选，默认1521
    database: 'xe',        // SID或服务名
    user: 'system',
    password: 'password',
    connectString: 'localhost/xe' // 可选，连接字符串
  }
}
```

#### 2.1.5 环境变量配置

通常建议使用环境变量来配置数据库连接，避免在代码中硬编码敏感信息:

```typescript
// 使用环境变量配置
app.register(databasePlugin, {
  client: process.env.DB_CLIENT || 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },
  debug: process.env.DB_DEBUG === 'true'
});
```

#### 2.1.6 通过依赖注入使用

```typescript
// 在服务中使用数据库
app.inject('userService', async (container) => {
  // 解析依赖
  const db = await container.resolve('db');
  const { User } = await container.resolve('models');
  const logger = await container.resolve('logger');
  
  return {
    async findUserById(id) {
      logger.debug(`Finding user with id: ${id}`);
      
      try {
        return await User.findById(id);
      } catch (err) {
        logger.error(`Error finding user: ${err.message}`);
        throw err;
      }
    },
    
    async createUser(userData) {
      return await db.transaction(async (trx) => {
        const user = await User.create(userData, { transaction: trx });
        logger.info(`Created new user with id: ${user.id}`);
        return user;
      });
    }
  };
});
```

> 其他使用方式章节将在后续部分介绍。

### 2.2 模型定义

在Stratix数据库插件中，模型使用ES类方式定义，提供了强类型支持和继承能力。模型定义包括表名、字段、关系、验证规则等。

#### 2.2.1 基础模型

所有模型类都应继承自`BaseModel`或其子类。`BaseModel`提供了基本的CRUD操作、查询构建、事务支持等功能。

```typescript
// 引入基础模型类
import { BaseModel } from '@stratix/database';

// 定义用户模型
export class User extends BaseModel {
  // 表名定义
  static tableName = 'users';
  
  // 主键定义（可选，默认为'id'）
  static primaryKey = 'id';
  
  // 字段定义
  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string', length: 100, nullable: false },
    email: { type: 'string', unique: true, nullable: false },
    password: { type: 'string', length: 255, nullable: false },
    age: { type: 'integer', unsigned: true, nullable: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', nullable: false },
    updated_at: { type: 'timestamp', nullable: false }
  };
  
  // 默认值定义
  static defaults = {
    is_active: true
  };
  
  // 隐藏字段（序列化时排除）
  static hidden = ['password'];
  
  // 关系定义
  static relations = {
    // 定义一对多关系：一个用户有多篇文章
    posts: {
      type: 'hasMany',
      model: 'Post',
      foreignKey: 'author_id',
      localKey: 'id'
    },
    // 定义多对多关系：用户和角色
    roles: {
      type: 'belongsToMany',
      model: 'Role',
      through: 'UserRole',
      foreignKey: 'user_id',
      otherKey: 'role_id'
    },
    // 定义一对一关系：用户和个人资料
    profile: {
      type: 'hasOne',
      model: 'Profile',
      foreignKey: 'user_id',
      localKey: 'id'
    }
  };
  
  // 索引定义
  static indexes = [
    { columns: ['email'], unique: true },
    { columns: ['name', 'email'] },
    { columns: ['created_at'] }
  ];
  
  // 验证规则
  static validations = {
    name: { required: true, max: 100 },
    email: { required: true, email: true, unique: true },
    password: { required: true, min: 8 },
    age: { integer: true, min: 0, max: 120 }
  };
  
  // 钩子方法
  static hooks = {
    // 创建前处理
    async beforeCreate(model, transaction) {
      if (model.password) {
        // 假设有密码加密函数
        model.password = await hashPassword(model.password);
      }
    },
    
    // 更新前处理
    async beforeUpdate(model, transaction) {
      if (model.changed('password')) {
        model.password = await hashPassword(model.password);
      }
    }
  };
  
  // 实例方法
  async checkPassword(plainPassword) {
    // 假设有密码比较函数
    return comparePassword(plainPassword, this.password);
  }
  
  // 静态方法
  static async findByEmail(email) {
    return this.findOne({ email });
  }
}
```

> 本节将继续添加更多模型定义的内容。

#### 2.2.2 可追踪源的模型

`SourceTrackableModel`是`BaseModel`的子类，专为数据同步和追踪设计，额外增加了源信息和追踪能力。

```typescript
// 引入可追踪源的模型基类
import { SourceTrackableModel } from '@stratix/database';

// 定义产品模型（支持源追踪）
export class Product extends SourceTrackableModel {
  static tableName = 'products';
  
  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string', length: 200, nullable: false },
    sku: { type: 'string', length: 50, unique: true },
    price: { type: 'decimal', precision: 10, scale: 2, nullable: false },
    stock: { type: 'integer', unsigned: true, default: 0 },
    category_id: { type: 'integer', unsigned: true, references: 'categories.id' },
    description: { type: 'text', nullable: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', nullable: false },
    updated_at: { type: 'timestamp', nullable: false },
    // 源追踪字段（自动添加）
    source: { type: 'string', length: 50, nullable: true },
    source_id: { type: 'string', length: 100, nullable: true },
    source_updated_at: { type: 'timestamp', nullable: true },
    source_data: { type: 'json', nullable: true },
    sync_status: { type: 'string', length: 20, nullable: true }
  };
  
  static relations = {
    category: {
      type: 'belongsTo',
      model: 'Category',
      foreignKey: 'category_id',
      localKey: 'id'
    },
    variants: {
      type: 'hasMany',
      model: 'ProductVariant',
      foreignKey: 'product_id',
      localKey: 'id'
    }
  };
  
  // 覆盖获取同步键的方法
  static getSyncKey(sourceData) {
    // 使用SKU作为同步键
    return sourceData.sku;
  }
  
  // 覆盖数据转换方法
  static transformSourceData(sourceData, existingModel = null) {
    // 转换源数据到模型数据
    return {
      name: sourceData.title,
      sku: sourceData.sku,
      price: sourceData.price,
      stock: sourceData.inventory_quantity,
      description: sourceData.description,
      is_active: sourceData.status === 'active',
      // 源数据和源ID由基类自动处理
    };
  }
}
```

`SourceTrackableModel` 提供了以下主要功能：

1. **自动追踪字段**：
   - `source`: 数据来源系统标识符
   - `source_id`: 数据在源系统中的ID
   - `source_updated_at`: 源系统中最后更新时间
   - `source_data`: 原始源数据的JSON存储
   - `sync_status`: 同步状态标识

2. **同步方法**：
   ```typescript
   // 从源数据同步单个记录
   await Product.syncFromSource({
     id: 'prod_123',
     title: '智能手表',
     sku: 'W-123',
     price: 199.99,
     inventory_quantity: 50,
     description: '高性能智能手表',
     status: 'active',
     updated_at: '2023-05-15T10:30:00Z'
   }, 'shopify');
   
   // 批量同步数据
   await Product.syncBatchFromSource([
     { id: 'prod_123', sku: 'W-123', /* 其他字段 */ },
     { id: 'prod_124', sku: 'W-124', /* 其他字段 */ }
   ], 'shopify');
   ```

3. **同步查询**：
   ```typescript
   // 查找未同步的记录
   const pendingProducts = await Product.findUnsyncedRecords();
   
   // 查找特定源的记录
   const shopifyProducts = await Product.findBySource('shopify');
   
   // 查找需要更新的记录
   const outdatedProducts = await Product.findOutdatedRecords('shopify');
   ```

4. **同步钩子**：
   ```typescript
   class Product extends SourceTrackableModel {
     // ... 其他定义
     
     static hooks = {
       // 同步前处理
       async beforeSync(sourceData, source, existingModel) {
         // 验证或转换源数据
         if (!sourceData.sku) {
           throw new Error('SKU is required');
         }
         return sourceData;
       },
       
       // 同步后处理
       async afterSync(model, sourceData, source) {
         // 执行同步后操作
         await notifySyncCompleted(model.id);
       },
       
       // 同步错误处理
       async onSyncError(error, sourceData, source) {
         // 记录同步错误
         await logSyncError(error, sourceData, source);
       }
     };
   }
   ```

使用 `SourceTrackableModel` 可以大大简化从外部系统导入和同步数据的过程，特别适合需要与多个第三方系统集成的应用场景。

> 接下来将介绍字段类型和关系定义。

#### 2.2.3 字段类型

Stratix数据库插件支持以下字段类型：

| 类型 | 描述 | 额外选项 |
|------|------|----------|
| `increments` | 自增整数 | `primary` |
| `integer` | 整数 | `unsigned`, `default` |
| `bigInteger` | 大整数 | `unsigned`, `default` |
| `tinyInteger` | 小整数 | `unsigned`, `default` |
| `string` | 字符串 | `length`, `default`, `charset`, `collate` |
| `text` | 长文本 | `charset`, `collate` |
| `decimal` | 十进制数 | `precision`, `scale`, `default` |
| `float` | 浮点数 | `precision`, `scale`, `default` |
| `boolean` | 布尔值 | `default` |
| `date` | 日期 | `default` |
| `datetime` | 日期时间 | `precision`, `default` |
| `time` | 时间 | `precision`, `default` |
| `timestamp` | 时间戳 | `precision`, `default`, `useTz` |
| `binary` | 二进制数据 | `length` |
| `enum` | 枚举类型 | `values`, `default` |
| `json` | JSON数据 | - |
| `jsonb` | 二进制JSON | - |
| `uuid` | UUID | `primary`, `default` |

字段定义示例：

```typescript
static fields = {
  // 基本类型
  id: { type: 'increments', primary: true },
  name: { type: 'string', length: 100, nullable: false },
  
  // 带默认值
  is_active: { type: 'boolean', default: true },
  created_at: { type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' },
  
  // 枚举类型
  status: { 
    type: 'enum', 
    values: ['pending', 'active', 'suspended', 'deleted'],
    default: 'pending'
  },
  
  // 带唯一约束
  email: { type: 'string', length: 255, unique: true },
  
  // 引用其他表
  category_id: { 
    type: 'integer', 
    unsigned: true, 
    references: 'categories.id',
    onDelete: 'CASCADE'
  },
  
  // JSON字段
  metadata: { type: 'json', nullable: true },
  
  // UUID主键
  id: { type: 'uuid', primary: true, default: () => 'uuid_generate_v4()' }
};
```

> 字段类型部分将在下一节继续介绍。

##### 常用字段选项

大多数字段类型都支持以下选项：

| 选项 | 描述 | 示例 |
|------|------|------|
| `nullable` | 字段是否可为null | `nullable: true` |
| `default` | 字段默认值 | `default: 0`, `default: () => 'CURRENT_TIMESTAMP'` |
| `comment` | 字段注释 | `comment: '用户唯一标识'` |
| `index` | 创建索引 | `index: true` |
| `unique` | 创建唯一索引 | `unique: true` |
| `primary` | 设为主键 | `primary: true` |

##### 特定类型选项

- **数值类型**：`integer`, `bigInteger`, `tinyInteger`, `decimal`, `float`
  - `unsigned`: 是否为无符号（非负）数值
  - `precision`: 精度（总位数）
  - `scale`: 小数位数

- **字符串类型**：`string`, `text`
  - `length`: 字符串长度（仅用于`string`）
  - `charset`: 字符集
  - `collate`: 排序规则

- **日期时间类型**：`date`, `datetime`, `time`, `timestamp`
  - `precision`: 时间精度（秒的小数位）
  - `useTz`: 是否使用时区（仅用于`timestamp`）

- **外键引用**：
  - `references`: 引用的表和字段，如 `'users.id'`
  - `onDelete`: 删除时动作，如 `'CASCADE'`, `'SET NULL'`, `'RESTRICT'`
  - `onUpdate`: 更新时动作，如 `'CASCADE'`

- **自定义类型**：
  - `typeParams`: 特定于数据库的类型参数

> 注：字段定义将用于生成迁移文件、模型验证、自动类型转换以及API文档生成。

#### 2.2.4 关系定义

Stratix数据库插件支持定义模型之间的关系，使得可以轻松地查询关联数据。关系定义通过模型类中的`relations`静态属性进行配置。支持的关系类型包括：

##### 一对一关系 (hasOne/belongsTo)

- **hasOne**: 模型拥有另一个模型的一个实例
- **belongsTo**: 模型属于另一个模型（与hasOne相反）

```typescript
// User模型拥有一个Profile
class User extends BaseModel {
  static tableName = 'users';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static relations = {
    profile: {
      type: 'hasOne',
      model: 'Profile',
      foreignKey: 'user_id',
      localKey: 'id'
    }
  };
}

// Profile属于一个User
class Profile extends BaseModel {
  static tableName = 'profiles';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static relations = {
    user: {
      type: 'belongsTo',
      model: 'User',
      foreignKey: 'user_id',
      otherKey: 'id'
    }
  };
}
```

##### 一对多关系 (hasMany/belongsTo)

- **hasMany**: 模型拥有另一个模型的多个实例
- **belongsTo**: 模型属于另一个模型

```typescript
// User拥有多个Post
class User extends BaseModel {
  static tableName = 'users';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static relations = {
    posts: {
      type: 'hasMany',
      model: 'Post',
      foreignKey: 'author_id',
      localKey: 'id'
    }
  };
}

// Post属于一个User
class Post extends BaseModel {
  static tableName = 'posts';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static relations = {
    author: {
      type: 'belongsTo',
      model: 'User',
      foreignKey: 'author_id',
      otherKey: 'id'
    }
  };
}
```

##### 多对多关系 (belongsToMany)

- **belongsToMany**: 模型通过中间表与另一个模型相关联

```typescript
// User拥有多个Role
class User extends BaseModel {
  static tableName = 'users';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static relations = {
    roles: {
      type: 'belongsToMany',
      model: 'Role',
      pivotTable: 'user_roles',
      foreignPivotKey: 'user_id',
      relatedPivotKey: 'role_id',
      parentKey: 'id',
      relatedKey: 'id'
    }
  };
}

// Role被多个User拥有
class Role extends BaseModel {
  static tableName = 'roles';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static relations = {
    users: {
      type: 'belongsToMany',
      model: 'User',
      pivotTable: 'user_roles',
      foreignPivotKey: 'role_id',
      relatedPivotKey: 'user_id',
      parentKey: 'id',
      relatedKey: 'id'
    }
  };
}
```

##### 远程关系 (hasOneThrough/hasManyThrough)

- **hasOneThrough**: 通过中间模型建立一对一关系
- **hasManyThrough**: 通过中间模型建立一对多关系

```typescript
// Country通过User拥有多个Post
class Country extends BaseModel {
  static tableName = 'countries';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static relations = {
    posts: {
      type: 'hasManyThrough',
      model: 'Post',
      through: 'User',
      foreignKey: 'country_id',
      throughForeignKey: 'author_id',
      localKey: 'id',
      throughLocalKey: 'id'
    }
  };
}
```

##### 多态关系 (morphOne/morphMany/morphToMany)

- **morphOne/morphMany**: 一个模型可以属于多种不同类型的模型
- **morphToMany**: 多对多的多态关系

```typescript
// Image可以关联到User或Post
class Image extends BaseModel {
  static tableName = 'images';
  static primaryKey = 'id';
  static fields = {
    id: { type: 'increments', primary: true },
    url: { type: 'string', length: 255 },
    imageable_id: { type: 'integer', unsigned: true },
    imageable_type: { type: 'string', length: 50 }
  };
  
  static relations = {
    imageable: {
      type: 'morphTo',
      morphType: 'imageable_type',
      morphId: 'imageable_id',
      models: ['User', 'Post']
    }
  };
}

// User拥有一个头像（多态关系）
class User extends BaseModel {
  static tableName = 'users';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static relations = {
    avatar: {
      type: 'morphOne',
      model: 'Image',
      morphName: 'imageable'
    }
  };
}

// Post拥有多个图片（多态关系）
class Post extends BaseModel {
  static tableName = 'posts';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static relations = {
    images: {
      type: 'morphMany',
      model: 'Image',
      morphName: 'imageable'
    }
  };
}
```

##### 关系配置选项

所有关系类型都支持以下选项：

- **withTimestamps**: 在关联查询中是否包含时间戳字段
- **withPivot**: 在多对多关系中，要从中间表选择的额外字段
- **as**: 多态关系中的别名
- **scope**: 应用到关系查询的额外条件

```typescript
static relations = {
  roles: {
    type: 'belongsToMany',
    model: 'Role',
    pivotTable: 'user_roles',
    foreignPivotKey: 'user_id',
    relatedPivotKey: 'role_id',
    withTimestamps: true,
    withPivot: ['expires_at', 'active'],
    scope: (query) => query.where('active', true)
  }
};
```

#### 2.2.5 模型验证

Stratix数据库插件支持模型验证，确保数据的有效性和一致性。验证规则通过模型类中的`validations`静态属性进行配置。验证规则包括字段类型、长度、唯一性、范围等。

```typescript
// User模型验证
class User extends BaseModel {
  static tableName = 'users';
  static primaryKey = 'id';
  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string', length: 100, nullable: false },
    email: { type: 'string', unique: true, nullable: false },
    password: { type: 'string', length: 255, nullable: false },
    age: { type: 'integer', unsigned: true, nullable: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', nullable: false },
    updated_at: { type: 'timestamp', nullable: false }
  };
  
  static validations = {
    name: { required: true, max: 100 },
    email: { required: true, email: true, unique: true },
    password: { required: true, min: 8 },
    age: { integer: true, min: 0, max: 120 }
  };
}
```

可用的验证规则包括：

| 规则 | 描述 | 参数示例 |
|------|------|----------|
| `required` | 字段是否必需 | `required: true` |
| `email` | 验证电子邮件格式 | `email: true` |
| `url` | 验证URL格式 | `url: true` |
| `min` | 最小长度或值 | `min: 8` |
| `max` | 最大长度或值 | `max: 100` |
| `between` | 值必须在范围内 | `between: [1, 10]` |
| `in` | 值必须在给定列表中 | `in: ['pending', 'active', 'completed']` |
| `notIn` | 值不能在给定列表中 | `notIn: ['deleted', 'banned']` |
| `alpha` | 只能包含字母 | `alpha: true` |
| `alphaNum` | 只能包含字母和数字 | `alphaNum: true` |
| `numeric` | 必须是数字 | `numeric: true` |
| `integer` | 必须是整数 | `integer: true` |
| `boolean` | 必须是布尔值 | `boolean: true` |
| `date` | 必须是有效日期 | `date: true` |
| `regex` | 必须匹配正则表达式 | `regex: /^[0-9]{5}$/` |
| `unique` | 在数据库中必须唯一 | `unique: true` |
| `exists` | 必须存在于其他表中 | `exists: { table: 'roles', column: 'id' }` |
| `custom` | 自定义验证函数 | `custom: (value) => value.startsWith('STX')` |

验证将在创建和更新模型实例时自动执行。如果验证失败，将抛出`ValidationError`异常，包含详细的错误信息。

#### 2.2.6 模型钩子

Stratix数据库插件支持模型钩子，允许在模型生命周期的不同阶段执行自定义逻辑。钩子通过模型类中的`hooks`静态属性进行配置。

```typescript
class User extends BaseModel {
  static tableName = 'users';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  static hooks = {
    // 创建前钩子
    beforeCreate: async (model) => {
      if (model.password) {
        model.password = await bcrypt.hash(model.password, 10);
      }
    },
    
    // 创建后钩子
    afterCreate: async (model) => {
      await Cache.invalidate('users');
      await Logger.info(`User ${model.id} created`);
    },
    
    // 更新前钩子
    beforeUpdate: async (model, oldValues) => {
      if (model.password && model.password !== oldValues.password) {
        model.password = await bcrypt.hash(model.password, 10);
      }
    },
    
    // 更新后钩子
    afterUpdate: async (model, oldValues) => {
      await Cache.invalidate(`user:${model.id}`);
      
      // 记录重要字段的变更
      const changes = [];
      if (model.email !== oldValues.email) {
        changes.push(`Email changed from ${oldValues.email} to ${model.email}`);
      }
      if (changes.length > 0) {
        await Logger.info(`User ${model.id} updated: ${changes.join(', ')}`);
      }
    },
    
    // 删除前钩子
    beforeDelete: async (model) => {
      // 检查是否有关联的数据
      const postsCount = await Post.query().where('author_id', model.id).count();
      if (postsCount > 0) {
        throw new Error(`Cannot delete user with ${postsCount} posts`);
      }
    },
    
    // 删除后钩子
    afterDelete: async (model) => {
      await Cache.invalidate(`user:${model.id}`);
      await Logger.info(`User ${model.id} deleted`);
    },
    
    // 软删除前钩子
    beforeSoftDelete: async (model) => {
      await Logger.info(`User ${model.id} is being soft deleted`);
    },
    
    // 软删除后钩子
    afterSoftDelete: async (model) => {
      await Cache.invalidate(`user:${model.id}`);
    },
    
    // 恢复前钩子
    beforeRestore: async (model) => {
      await Logger.info(`User ${model.id} is being restored`);
    },
    
    // 恢复后钩子
    afterRestore: async (model) => {
      await Cache.invalidate(`user:${model.id}`);
    },
    
    // 查询前钩子（全局应用于所有查询）
    beforeQuery: (query) => {
      // 例如，添加默认排序
      if (!query.hasOrderBy()) {
        query.orderBy('created_at', 'desc');
      }
    }
  };
}
```

支持的钩子类型：

| 钩子 | 调用时机 | 参数 |
|------|----------|------|
| `beforeCreate` | 创建记录前 | `(model)` |
| `afterCreate` | 创建记录后 | `(model)` |
| `beforeUpdate` | 更新记录前 | `(model, oldValues)` |
| `afterUpdate` | 更新记录后 | `(model, oldValues)` |
| `beforeDelete` | 删除记录前 | `(model)` |
| `afterDelete` | 删除记录后 | `(model)` |
| `beforeSoftDelete` | 软删除记录前 | `(model)` |
| `afterSoftDelete` | 软删除记录后 | `(model)` |
| `beforeRestore` | 恢复软删除记录前 | `(model)` |
| `afterRestore` | 恢复软删除记录后 | `(model)` |
| `beforeQuery` | 执行查询前 | `(query)` |
| `afterFind` | 查找记录后 | `(model)` |
| `afterFindMany` | 查找多条记录后 | `(models)` |

钩子可以用于：
- 数据转换和格式化
- 密码加密
- 缓存管理
- 日志记录
- 级联操作
- 自动填充字段
- 业务规则验证

#### 2.2.7 软删除

Stratix数据库插件内置了软删除功能，允许将记录标记为已删除而不是从数据库中物理删除。要启用软删除，模型类需要使用`SoftDeletes`特性并定义软删除字段。

```typescript
import { BaseModel, SoftDeletes } from '@stratix/database';

class User extends BaseModel {
  static tableName = 'users';
  static primaryKey = 'id';
  
  // 启用软删除
  static useSoftDeletes = true;
  static deletedAtColumn = 'deleted_at'; // 默认为'deleted_at'
  
  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string', length: 100 },
    email: { type: 'string', length: 255, unique: true },
    deleted_at: { type: 'timestamp', nullable: true }
  };
  
  // 可选：自定义删除标记值（默认使用时间戳）
  static getDeletedValue() {
    return new Date();
  }
}
```

启用软删除后，模型将提供以下功能：

##### 软删除操作

```typescript
// 软删除单个记录
await user.delete(); // 设置deleted_at字段

// 软删除多个记录
await User.query().where('last_login', '<', oneYearAgo).delete();
```

##### 查询时排除/包含已删除记录

```typescript
// 默认查询会排除已删除记录
const activeUsers = await User.query().get();

// 只查询已删除记录
const deletedUsers = await User.query().onlyTrashed().get();

// 包括已删除记录
const allUsers = await User.query().withTrashed().get();
```

##### 恢复已删除记录

```typescript
// 恢复单个记录
await user.restore(); // 清除deleted_at字段

// 恢复多个记录
await User.query().onlyTrashed().where('deleted_at', '<', oneMonthAgo).restore();
```

##### 强制删除（物理删除）

```typescript
// 强制删除单个记录
await user.forceDelete();

// 强制删除多个记录
await User.query().withTrashed().where('created_at', '<', fiveYearsAgo).forceDelete();
```

> 注意：软删除功能会自动处理关系查询，确保已删除的记录在关联查询中也被正确处理。

## 3. API设计

### 3.1 查询构建器API

Stratix数据库插件提供了链式调用风格的查询构建器API，使得构建复杂查询变得简单直观。查询构建器既可以通过模型访问，也可以直接通过数据库连接访问。

#### 3.1.1 基础查询

##### 查询条件

```typescript
// 基本条件查询
const users = await User.query()
  .where('age', '>', 18)
  .where('status', 'active')
  .get();

// 或条件
const users = await User.query()
  .where('role', 'admin')
  .orWhere('role', 'super_admin')
  .get();

// 条件分组
const users = await User.query()
  .where('status', 'active')
  .where(query => {
    query.where('age', '>', 21)
      .orWhere('has_parental_consent', true);
  })
  .get();

// NULL检查
const users = await User.query()
  .whereNull('deleted_at')
  .get();

const users = await User.query()
  .whereNotNull('last_login')
  .get();

// IN条件
const users = await User.query()
  .whereIn('id', [1, 2, 3, 5])
  .get();

// NOT IN条件
const users = await User.query()
  .whereNotIn('status', ['banned', 'suspended'])
  .get();

// BETWEEN条件
const users = await User.query()
  .whereBetween('age', [18, 65])
  .get();

// 日期条件
const posts = await Post.query()
  .whereDate('created_at', '2023-01-01')
  .get();

const posts = await Post.query()
  .whereMonth('created_at', 1) // 1月
  .whereYear('created_at', 2023)
  .get();

// JSON字段查询
const users = await User.query()
  .whereJsonContains('preferences', { theme: 'dark' })
  .get();

// 全文搜索
const posts = await Post.query()
  .whereFullText(['title', 'content'], 'search terms')
  .get();

// 原始条件
const users = await User.query()
  .whereRaw('age > ? AND (status = ? OR status = ?)', [18, 'active', 'pending'])
  .get();
```

##### 排序和分页

```typescript
// 排序
const users = await User.query()
  .orderBy('created_at', 'desc')
  .orderBy('name', 'asc')
  .get();

// 随机排序
const randomUsers = await User.query()
  .inRandomOrder()
  .limit(5)
  .get();

// 分页
const page = 2;
const perPage = 15;
const users = await User.query()
  .offset((page - 1) * perPage)
  .limit(perPage)
  .get();

// 使用分页助手
const result = await User.query()
  .where('status', 'active')
  .paginate(page, perPage);

console.log(result.data); // 当前页的数据
console.log(result.total); // 总记录数
console.log(result.lastPage); // 最后一页
console.log(result.currentPage); // 当前页
console.log(result.perPage); // 每页记录数
```

##### 聚合函数

```typescript
// 计数
const count = await User.query()
  .where('status', 'active')
  .count();

// 求和
const totalScore = await User.query()
  .where('team_id', 1)
  .sum('score');

// 平均值
const avgAge = await User.query()
  .where('country', 'US')
  .avg('age');

// 最大值
const maxScore = await User.query()
  .max('score');

// 最小值
const minCreatedAt = await User.query()
  .min('created_at');

// 分组聚合
const countByStatus = await User.query()
  .select('status')
  .count('* as count')
  .groupBy('status')
  .get();

// 有条件的聚合
const stats = await Post.query()
  .select('author_id')
  .count('* as posts_count')
  .sum('views as total_views')
  .groupBy('author_id')
  .having('posts_count', '>', 10)
  .orderBy('total_views', 'desc')
  .get();
```

#### 3.1.2 关系查询

##### 加载关系

```typescript
// 预加载关系（立即加载）
const users = await User.query()
  .with('profile')
  .with('posts')
  .get();

// 嵌套关系
const users = await User.query()
  .with('posts.comments')
  .with('posts.tags')
  .get();

// 选择性的预加载字段
const users = await User.query()
  .with('posts', query => {
    query.select('id', 'title', 'author_id', 'created_at')
      .orderBy('created_at', 'desc');
  })
  .get();

// 条件预加载
const users = await User.query()
  .with('posts', query => {
    query.where('published', true)
      .orderBy('created_at', 'desc');
  })
  .get();

// 分页预加载
const users = await User.query()
  .with('posts', query => {
    query.limit(5);
  })
  .get();

// 计数预加载
const users = await User.query()
  .withCount('posts')
  .withCount('comments')
  .get();

// 条件计数
const users = await User.query()
  .withCount('posts', query => {
    query.where('published', true);
  })
  .withCount('posts as draft_posts_count', query => {
    query.where('published', false);
  })
  .get();
```

##### 关系条件查询

```typescript
// 有关系
const usersWithPosts = await User.query()
  .has('posts')
  .get();

// 有指定数量的关系
const popularUsers = await User.query()
  .has('posts', '>=', 5)
  .get();

// 关系中的条件
const users = await User.query()
  .whereHas('posts', query => {
    query.where('published', true)
      .where('created_at', '>=', lastMonth);
  })
  .get();

// 关系条件或查询
const users = await User.query()
  .whereHas('roles', query => {
    query.where('name', 'admin');
  })
  .orWhereHas('permissions', query => {
    query.where('name', 'manage-users');
  })
  .get();

// 关系不存在查询
const usersWithoutProfile = await User.query()
  .doesntHave('profile')
  .get();

// 关系不符合条件
const usersWithoutPublishedPosts = await User.query()
  .whereDoesntHave('posts', query => {
    query.where('published', true);
  })
  .get();
```

#### 3.1.3 插入、更新和删除

##### 插入数据

```typescript
// 插入单条记录
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 28
});

// 插入多条记录
const users = await User.createMany([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' }
]);

// 使用查询构建器插入
await User.query().insert({
  name: 'John Doe',
  email: 'john@example.com'
});

// 插入并获取ID
const id = await User.query().insertGetId({
  name: 'John Doe',
  email: 'john@example.com'
});

// 不存在时插入
await User.query()
  .where('email', 'john@example.com')
  .insertOrIgnore({
    name: 'John Doe',
    email: 'john@example.com'
  });
```

##### 更新数据

```typescript
// 通过模型实例更新
user.name = 'John Smith';
user.email = 'john.smith@example.com';
await user.save();

// 批量更新
await User.query()
  .where('status', 'inactive')
  .update({ status: 'active' });

// 条件更新
await User.query()
  .where('last_login', '<', oneYearAgo)
  .update({ status: 'inactive' });

// 更新或新建
await User.query()
  .updateOrCreate(
    { email: 'john@example.com' }, // 条件
    { name: 'John Doe', status: 'active' } // 更新或创建的值
  );

// 递增/递减值
await Product.query()
  .where('id', 1)
  .increment('stock', 5);

await Post.query()
  .where('id', 1)
  .decrement('likes', 1);

// JSON字段更新
await User.query()
  .where('id', 1)
  .update({
    'preferences->theme': 'dark',
    'preferences->notifications->email': true
  });
```

##### 删除数据

```typescript
// 通过模型实例删除
await user.delete(); // 软删除（如果启用）
await user.forceDelete(); // 物理删除

// 批量删除
await User.query()
  .where('last_login', '<', twoYearsAgo)
  .delete();

// 清空表（谨慎使用）
await User.query().truncate();
```

#### 3.1.4 事务操作

```typescript
// 使用事务运行查询
await db.transaction(async (trx) => {
  // 在事务中执行的查询
  const user = await User.query(trx).create({
    name: 'John Doe',
    email: 'john@example.com'
  });
  
  await Post.query(trx).create({
    title: 'My First Post',
    content: 'Hello World',
    author_id: user.id
  });
  
  // 如果这里发生错误，所有查询都会被回滚
});

// 手动控制事务
const trx = await db.beginTransaction();

try {
  const user = await User.query(trx).create({
    name: 'John Doe',
    email: 'john@example.com'
  });
  
  await Post.query(trx).create({
    title: 'My First Post',
    content: 'Hello World',
    author_id: user.id
  });
  
  await trx.commit();
} catch (error) {
  await trx.rollback();
  throw error;
}

// 保存点
await db.transaction(async (trx) => {
  const user = await User.query(trx).create({
    name: 'John Doe',
    email: 'john@example.com'
  });
  
  const savepoint = await trx.savepoint();
  
  try {
    await Post.query(trx).create({
      title: 'Invalid Post',
      // 这将导致验证错误
    });
  } catch (error) {
    // 只回滚到保存点
    await trx.rollbackToSavepoint(savepoint);
    
    // 继续事务
    await Post.query(trx).create({
      title: 'My First Post',
      content: 'Hello World',
      author_id: user.id
    });
  }
  
  // 事务最终提交
});
```

#### 3.1.5 原始查询

```typescript
// 原始查询构建器
const result = await db.raw('SELECT * FROM users WHERE id = ?', [1]);

// 模型上执行原始查询
const users = await User.fromQuery('SELECT * FROM users WHERE status = ?', ['active']);

// 原始表达式
const users = await User.query()
  .select('id', 'name', db.raw('COUNT(posts.id) as posts_count'))
  .leftJoin('posts', 'users.id', 'posts.author_id')
  .groupBy('users.id')
  .having(db.raw('COUNT(posts.id)'), '>', 3)
  .get();

// 原始SQL条件
const users = await User.query()
  .whereRaw('age > ? AND (status = ? OR status = ?)', [18, 'active', 'pending'])
  .get();

// DB::statement（不返回结果的查询）
await db.statement('UPDATE users SET status = ? WHERE last_login < ?', 
  ['inactive', oneYearAgo]);

// 原始插入
await db.insert('INSERT INTO logs (action, user_id, created_at) VALUES (?, ?, ?)', 
  ['login', 1, new Date()]);
```

### 3.2 模型API

Stratix数据库插件的模型API提供了便捷的方法来操作数据库记录，包括创建、读取、更新和删除操作，以及与模型实例交互的方法。

#### 3.2.1 静态方法

##### 查询方法

```typescript
// 查找单个记录（通过主键）
const user = await User.find(1);
const user = await User.findOrFail(1); // 未找到时抛出异常

// 查找第一个匹配的记录
const user = await User.findBy('email', 'john@example.com');
const user = await User.findByOrFail('email', 'john@example.com');

// 查找多个记录（通过主键）
const users = await User.findMany([1, 2, 3]);

// 获取所有记录
const users = await User.all();

// 分页获取记录
const result = await User.paginate(1, 15);

// 快速获取单列值
const emails = await User.pluck('email');
const emailsById = await User.pluck('email', 'id'); // 返回 { id: email } 的对象

// 获取第一条或最后一条记录
const firstUser = await User.first();
const lastUser = await User.orderBy('created_at', 'desc').first();

// 获取指定字段
const user = await User.select('id', 'name', 'email').find(1);

// 获取随机记录
const randomUser = await User.random();
const fiveRandomUsers = await User.random(5);

// 根据条件获取记录
const activeAdmins = await User.where('status', 'active')
  .where('role', 'admin')
  .get();
```

##### 创建方法

```typescript
// 创建单个记录
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret'
});

// 创建或更新记录
const user = await User.createOrUpdate(
  { email: 'john@example.com' }, // 查找条件
  { name: 'John Doe', status: 'active' } // 创建/更新的数据
);

// 批量创建记录
const users = await User.createMany([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' }
]);

// 创建并关联关系
const post = await User.createWith(1, 'posts', {
  title: 'New Post',
  content: 'Content here'
});

// 通过数据填充创建（主要用于测试）
const users = await User.factory().count(5).create();
const adminUsers = await User.factory()
  .count(3)
  .state('admin')
  .create();
```

##### 更新方法

```typescript
// 更新单个记录
const updated = await User.update(1, {
  name: 'John Smith',
  status: 'active'
});

// 批量更新记录
const count = await User.whereIn('id', [1, 2, 3])
  .update({ status: 'active' });

// 查找并更新
const user = await User.findAndUpdate(1, {
  last_login: new Date()
});

// 更新或创建
const [user, created] = await User.updateOrCreate(
  { email: 'john@example.com' },
  { name: 'John Doe', status: 'active' }
);
```

##### 删除方法

```typescript
// 删除单个记录
await User.delete(1); // 软删除（如果启用）
await User.forceDelete(1); // 物理删除

// 批量删除记录
await User.whereIn('id', [1, 2, 3]).delete();

// 查找并删除
const user = await User.findAndDelete(1);

// 删除所有记录
await User.truncate();
```

##### 聚合和计算方法

```typescript
// 计数
const count = await User.count();
const activeCount = await User.where('status', 'active').count();

// 求和
const totalPoints = await User.sum('points');

// 平均值
const avgAge = await User.avg('age');

// 最大/最小值
const maxScore = await User.max('score');
const minAge = await User.min('age');

// 获取最大创建日期
const lastCreated = await User.latest();

// 获取最小创建日期
const firstCreated = await User.oldest();

// 检查记录是否存在
const exists = await User.where('email', 'john@example.com').exists();
const doesntExist = await User.where('status', 'banned').doesntExist();
```

##### 关系方法

```typescript
// 关联模型
await User.attach(1, 'roles', [1, 2]);
await User.detach(1, 'roles', [2]);
await User.sync(1, 'roles', [1, 3]);

// 获取关联数据
const posts = await User.related(1, 'posts').get();
const lazyPosts = await User.related(1, 'posts').lazy();
```

#### 3.2.2 实例方法

##### 属性访问

```typescript
// 获取和设置属性
const user = await User.find(1);
console.log(user.name); // 获取属性
user.name = 'John Smith'; // 设置属性

// 获取原始属性
console.log(user.getAttributes()); // 获取所有属性
console.log(user.getAttribute('name')); // 获取单个属性

// 检查属性是否已更改
if (user.isDirty('email')) {
  console.log('Email has changed');
}

// 获取原始值（更改前）
console.log(user.getOriginal('email'));
console.log(user.getOriginals()); // 所有原始值
```

##### 保存和更新

```typescript
// 保存实例（创建或更新）
user.name = 'John Smith';
user.email = 'john.smith@example.com';
await user.save();

// 只更新特定字段
await user.update({ status: 'active' });

// 创建关联记录
const post = await user.createRelated('posts', {
  title: 'New Post',
  content: 'Content here'
});

// 刷新实例（从数据库重新加载）
await user.refresh();

// 保存并刷新
await user.saveAndRefresh();
```

##### 删除

```typescript
// 删除实例
await user.delete(); // 软删除（如果启用）
await user.forceDelete(); // 物理删除

// 恢复（适用于软删除）
await user.restore();
```

##### 关系交互

```typescript
// 加载关系（如果尚未加载）
await user.load('posts');
await user.load(['posts', 'profile', 'roles']);

// 检查关系是否已加载
if (user.relationLoaded('posts')) {
  console.log(user.posts.length);
}

// 获取相关模型
const posts = user.getRelated('posts');
const profile = user.getRelated('profile');

// 设置关系
user.setRelated('profile', profileInstance);

// 创建关联记录
const post = await user.createRelated('posts', {
  title: 'My Post',
  content: 'Post content'
});

// 多对多关系操作
await user.attach('roles', [1, 2]); // 添加角色
await user.detach('roles', [2]); // 移除角色
await user.sync('roles', [1, 3]); // 同步角色列表
await user.toggle('roles', [1, 3]); // 切换角色（存在则移除，不存在则添加）

// 检查模型是否关联了某个关系
const isAdmin = await user.hasRoles(['admin']);
const hasPublishedPosts = await user.hasPosts(query => {
  query.where('published', true);
});
```

##### 序列化

```typescript
// 转换为对象
const userObject = user.toObject();

// 转换为JSON
const userJson = user.toJSON();
const userString = JSON.stringify(user); // 自动调用toJSON

// 获取可见字段（排除隐藏字段）
const visibleAttributes = user.getVisible();

// 添加计算字段
user.addComputed('full_name', `${user.first_name} ${user.last_name}`);
const serialized = user.toJSON(); // 包含 full_name
```

#### 3.2.3 查询作用域

模型查询作用域允许重用常见的查询条件。可以定义全局作用域（应用于所有查询）和局部作用域（按需应用）。

```typescript
// 在模型类中定义查询作用域
class User extends BaseModel {
  static tableName = 'users';
  static primaryKey = 'id';
  static fields = { /* ... */ };
  
  // 全局作用域
  static globalScopes = {
    // 自动应用于所有查询
    active: (query) => query.where('status', 'active'),
    notDeleted: (query) => query.whereNull('deleted_at')
  };
  
  // 局部作用域 - 需要显式调用
  static scopes = {
    admin: (query) => query.where('role', 'admin'),
    recentlyActive: (query) => query.where('last_login', '>=', subDays(new Date(), 30)),
    withPostsCount: (query) => query.withCount('posts'),
    withComments: (query) => query.with('comments')
  };
}

// 使用查询作用域
const activeAdmins = await User.query()
  .scope('admin')
  .get();

// 组合多个作用域
const recentAdmins = await User.query()
  .scope('admin')
  .scope('recentlyActive')
  .get();

// 带参数的作用域
class Post extends BaseModel {
  static scopes = {
    createdBetween: (query, start, end) => 
      query.whereBetween('created_at', [start, end]),
    popular: (query, minViews = 1000) => 
      query.where('views', '>=', minViews)
  };
}

const popularPosts = await Post.query()
  .scope('popular', 5000) // 最少5000次浏览
  .get();

const monthlyPosts = await Post.query()
  .scope('createdBetween', 
    new Date('2023-01-01'), 
    new Date('2023-01-31'))
  .get();
```

#### 3.2.4 删除

```typescript
// 通过模型实例删除
await user.delete(); // 软删除（如果启用）
await user.forceDelete(); // 物理删除

// 批量删除
await User.query()
  .where('last_login', '<', twoYearsAgo)
  .delete();

// 清空表（谨慎使用）
await User.query().truncate();
```

### 3.3 迁移和种子API

Stratix数据库插件提供了强大的迁移和种子API，用于管理数据库结构和初始数据。

#### 3.3.1 迁移API

迁移是一种版本控制系统，用于管理数据库架构的变更。Stratix提供CLI命令来创建、运行和回滚迁移。

##### 创建迁移

```bash
# 创建空迁移
stratix migrate:make create_users_table

# 从模型自动生成迁移
stratix migrate:generate User Post Comment

# 创建表格添加迁移
stratix migrate:table users
```

生成的迁移文件包含`up`和`down`方法：

```typescript
// migrations/20230101000000_create_users_table.ts
import { Migration } from '@stratix/database';

export default class CreateUsersTable extends Migration {
  async up() {
    await this.schema.createTable('users', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps();
    });
  }

  async down() {
    await this.schema.dropTable('users');
  }
}
```

##### 运行迁移

```bash
# 运行所有未执行的迁移
stratix migrate

# 运行特定迁移
stratix migrate --file=20230101000000_create_users_table.ts

# 刷新迁移（回滚所有迁移并重新运行）
stratix migrate:refresh

# 重置迁移（回滚所有迁移）
stratix migrate:reset
```

##### 回滚迁移

```bash
# 回滚最后一批迁移
stratix migrate:rollback

# 回滚特定步数
stratix migrate:rollback --steps=2

# 回滚到特定批次
stratix migrate:rollback --batch=3
```

##### 迁移状态

```bash
# 查看所有迁移状态
stratix migrate:status
```

#### 3.3.2 表结构API

Stratix提供了流畅的API来定义表结构：

```typescript
await this.schema.createTable('users', table => {
  // 主键
  table.increments('id');      // 自增INTEGER主键
  table.bigIncrements('id');   // 自增BIGINT主键
  table.uuid('id').primary();  // UUID主键
  
  // 字符串列
  table.string('name', 100);        // VARCHAR(100)
  table.text('bio');                // TEXT
  table.mediumText('description');  // MEDIUMTEXT
  table.longText('content');        // LONGTEXT
  
  // 数值列
  table.integer('age');           // INTEGER
  table.bigInteger('views');      // BIGINT
  table.decimal('price', 8, 2);   // DECIMAL(8,2)
  table.float('rating', 4, 2);    // FLOAT(4,2)
  
  // 布尔值
  table.boolean('is_active');
  
  // 日期和时间
  table.date('birth_date');
  table.datetime('login_at');
  table.time('work_hours');
  table.timestamp('created_at');
  
  // JSON
  table.json('preferences');
  table.jsonb('metadata');   // 二进制JSON (PostgreSQL)
  
  // 其他类型
  table.binary('image');
  table.enum('status', ['active', 'inactive', 'suspended']);
  
  // 修饰符
  table.string('email').unique();            // 唯一约束
  table.integer('age').unsigned();           // 无符号整数
  table.string('name').notNullable();        // 非空约束
  table.string('title').nullable();          // 可空
  table.integer('score').defaultTo(0);       // 默认值
  table.timestamp('created_at').useCurrent();// 使用当前时间戳
  
  // 索引
  table.index('email');                      // 普通索引
  table.index(['first_name', 'last_name']);  // 复合索引
  
  // 外键
  table.integer('role_id').unsigned();
  table.foreign('role_id')
    .references('id')
    .inTable('roles')
    .onDelete('CASCADE');
  
  // 时间戳（created_at 和 updated_at）
  table.timestamps();
  
  // 软删除
  table.timestamp('deleted_at').nullable();
});
```

##### 修改表结构

```typescript
await this.schema.alterTable('users', table => {
  // 添加列
  table.string('middle_name').after('first_name').nullable();
  table.integer('login_count').defaultTo(0);
  
  // 修改列
  table.string('name', 150).alter();  // 修改长度
  table.integer('age').unsigned().notNullable().alter();
  
  // 重命名列
  table.renameColumn('email', 'email_address');
  
  // 删除列
  table.dropColumn('temporary_field');
  table.dropColumns(['field1', 'field2', 'field3']);
  
  // 添加索引
  table.index('email_address');
  table.unique('username');
  
  // 删除索引
  table.dropIndex('email_address');
  table.dropUnique('username');
  
  // 添加外键
  table.foreign('department_id')
    .references('id')
    .inTable('departments')
    .onDelete('SET NULL');
  
  // 删除外键
  table.dropForeign('department_id');
});
```

##### 其他数据库操作

```typescript
// 创建表
await this.schema.createTable('users', table => { /* ... */ });

// 表是否存在
if (await this.schema.hasTable('users')) {
  // ...
}

// 删除表
await this.schema.dropTable('users');

// 表重命名
await this.schema.renameTable('users', 'app_users');

// 列是否存在
if (await this.schema.hasColumn('users', 'email')) {
  // ...
}
```

#### 3.3.3 种子API

种子是用于填充数据库表的初始数据文件。

##### 创建种子文件

```bash
# 创建种子文件
stratix seed:make users
```

生成的种子文件包含一个`run`方法：

```typescript
// seeds/users.ts
import { Seeder } from '@stratix/database';
import { User } from '../app/models/User';

export default class UsersSeeder extends Seeder {
  async run() {
    // 清空现有数据
    await User.truncate();
    
    // 插入数据
    await User.createMany([
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: await this.hash('password'),
        role: 'admin'
      },
      {
        name: 'Test User',
        email: 'user@example.com',
        password: await this.hash('password'),
        role: 'user'
      }
    ]);
    
    // 生成大量测试数据
    await User.factory().count(50).create();
    
    // 生成特定状态的数据
    await User.factory()
      .count(5)
      .state('admin')
      .create();
    
    await User.factory()
      .count(10)
      .state('premium')
      .create();
  }
  
  private async hash(password: string): Promise<string> {
    // 使用依赖注入获取加密服务
    const { bcrypt } = this.app.services;
    return bcrypt.hash(password, 10);
  }
}
```

##### 运行种子

```bash
# 运行所有种子
stratix seed

# 运行特定种子
stratix seed --file=users
```

#### 3.3.4 工厂API

工厂API用于生成测试数据。

##### 定义模型工厂

```typescript
// factories/UserFactory.ts
import { ModelFactory } from '@stratix/database';
import { User } from '../app/models/User';
import { faker } from '@faker-js/faker';

export default class UserFactory extends ModelFactory<User> {
  // 工厂关联的模型
  model = User;
  
  // 默认数据定义
  definition() {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: this.hash('password'),
      bio: faker.lorem.paragraph(),
      is_active: true,
      created_at: new Date()
    };
  }
  
  // 状态定义
  states() {
    return {
      // 管理员状态
      admin: (user) => ({
        ...user,
        role: 'admin',
        is_active: true
      }),
      
      // 高级用户状态
      premium: (user) => ({
        ...user,
        role: 'user',
        subscription_level: 'premium',
        payment_verified: true
      }),
      
      // 不活跃用户状态
      inactive: (user) => ({
        ...user,
        is_active: false,
        last_login: faker.date.past({ years: 1 })
      })
    };
  }
  
  // 自定义Hash函数
  private hash(password: string): string {
    // 在真实环境中会使用bcrypt等加密
    return `hashed_${password}`;
  }
}
```

##### 使用模型工厂

```typescript
// 在种子或测试中使用工厂
import { UserFactory } from '../factories/UserFactory';

// 创建一个用户实例（不保存到数据库）
const user = UserFactory.make();

// 创建并保存一个用户
const savedUser = await UserFactory.create();

// 创建多个用户
const users = await UserFactory.count(5).create();

// 使用状态创建用户
const admin = await UserFactory.state('admin').create();
const premiumUsers = await UserFactory.state('premium').count(3).create();

// 在创建时覆盖属性
const customUser = await UserFactory.create({
  name: 'Custom Name',
  email: 'custom@example.com'
});

// 合并关系
const userWithPosts = await UserFactory
  .with('posts', 3, (post) => post.state('published'))
  .create();
```


## 4. 实现细节

### 4.1 整体架构

数据库插件采用分层架构设计，各组件之间通过明确的接口通信，保持高内聚低耦合的设计原则。

```
┌─────────────────────────────────────────────────────────┐
│                  用户代码 / 应用层                        │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                       模型层                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│   │  BaseModel  │  │ 关系系统    │  │  验证系统   │     │
│   └─────────────┘  └─────────────┘  └─────────────┘     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                     查询构建器                           │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│   │ 条件构建    │  │  关系加载   │  │  聚合函数   │     │
│   └─────────────┘  └─────────────┘  └─────────────┘     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                      连接管理                           │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│   │ 连接池      │  │  事务管理   │  │ 适配器选择  │     │
│   └─────────────┘  └─────────────┘  └─────────────┘     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                    数据库适配器                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│   │ PostgreSQL  │  │   MySQL     │  │   SQLite    │     │
│   └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 4.2 核心组件实现

#### 4.2.1 模型系统

模型系统是整个数据库插件的核心，BaseModel类通过元编程和代理模式实现：

```typescript
// 简化版BaseModel核心实现
class BaseModel {
  private static _registry = new Map();
  private _attributes = {};
  private _original = {};
  private _relations = {};
  private _isDirty = false;
  
  constructor(attributes = {}) {
    this._attributes = { ...attributes };
    this._original = { ...attributes };
    
    // 使用Proxy代理属性访问和修改
    return new Proxy(this, {
      get(target, prop) {
        // 检查是否为关系属性
        if (target.constructor.relations && 
            prop in target.constructor.relations) {
          return target._relations[prop];
        }
        
        // 检查是否为普通属性
        if (prop in target._attributes) {
          return target._attributes[prop];
        }
        
        return target[prop];
      },
      
      set(target, prop, value) {
        // 只拦截模型属性的设置，忽略内部属性
        if (prop in target._attributes || 
            (target.constructor.fields && prop in target.constructor.fields)) {
          target._attributes[prop] = value;
          target._isDirty = true;
          return true;
        }
        
        target[prop] = value;
        return true;
      }
    });
  }
  
  // 模型注册机制
  static register(modelClass) {
    BaseModel._registry.set(modelClass.name, modelClass);
  }
  
  static getModel(name) {
    return BaseModel._registry.get(name);
  }
  
  // 属性追踪方法
  isDirty(attribute) {
    if (attribute) {
      return this._attributes[attribute] !== this._original[attribute];
    }
    return this._isDirty;
  }
  
  getChanges() {
    const changes = {};
    for (const key in this._attributes) {
      if (this._attributes[key] !== this._original[key]) {
        changes[key] = this._attributes[key];
      }
    }
    return changes;
  }
}
```

#### 4.2.2 查询构建器

查询构建器采用链式调用模式，内部使用构建者模式和命令模式：

```typescript
// 查询构建器核心实现
class QueryBuilder {
  private _model;
  private _connection;
  private _statements = [];
  private _bindings = [];
  private _relations = [];
  
  constructor(model, connection) {
    this._model = model;
    this._connection = connection;
  }
  
  // 条件方法
  where(column, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    
    this._statements.push({
      type: 'where',
      column,
      operator,
      boolean: 'and'
    });
    
    this._bindings.push(value);
    return this;
  }
  
  orWhere(column, operator, value) {
    // 类似where，但boolean为'or'
    // ...
    return this;
  }
  
  // 关系预加载
  with(relation, callback) {
    this._relations.push({
      name: relation,
      callback: callback || null
    });
    return this;
  }
  
  // 执行查询
  async get() {
    // 构建原始查询
    const query = this._compileQuery();
    
    // 执行查询
    const results = await this._connection.query(query, this._bindings);
    
    // 将结果转换为模型实例
    const models = this._hydrateModels(results);
    
    // 加载关系
    if (this._relations.length > 0) {
      await this._loadRelations(models);
    }
    
    return models;
  }
  
  // 编译查询为数据库特定语法
  _compileQuery() {
    const compiler = new QueryCompiler(this._model, this._statements);
    return compiler.toSql();
  }
  
  // 将结果集转换为模型实例
  _hydrateModels(results) {
    return results.map(row => {
      const ModelClass = this._model;
      return new ModelClass(row);
    });
  }
  
  // 加载关系数据
  async _loadRelations(models) {
    for (const relation of this._relations) {
      const loader = new RelationLoader(
        this._model,
        this._connection,
        relation
      );
      await loader.load(models);
    }
    return models;
  }
}
```

#### 4.2.3 关系管理器

关系管理是数据库插件的核心功能之一，通过元数据和懒加载实现：

```typescript
// 关系加载器
class RelationLoader {
  constructor(parentModel, connection, relationConfig) {
    this.parentModel = parentModel;
    this.connection = connection;
    this.relationConfig = relationConfig;
  }
  
  async load(parentInstances) {
    if (parentInstances.length === 0) {
      return parentInstances;
    }
    
    // 获取关系定义
    const relationName = this.relationConfig.name;
    const relationDef = this.parentModel.relations[relationName];
    
    // 创建适当的关系处理器
    let processor;
    switch (relationDef.type) {
      case 'hasOne':
        processor = new HasOneRelation(this.parentModel, relationDef);
        break;
      case 'hasMany':
        processor = new HasManyRelation(this.parentModel, relationDef);
        break;
      case 'belongsTo':
        processor = new BelongsToRelation(this.parentModel, relationDef);
        break;
      case 'belongsToMany':
        processor = new BelongsToManyRelation(this.parentModel, relationDef);
        break;
      // 其他关系类型
    }
    
    // 执行关系加载
    await processor.load(
      parentInstances, 
      this.connection, 
      this.relationConfig.callback
    );
    
    return parentInstances;
  }
}

// HasMany关系实现示例
class HasManyRelation {
  constructor(parentModel, relationDef) {
    this.parentModel = parentModel;
    this.relationDef = relationDef;
  }
  
  async load(parentInstances, connection, callback) {
    // 提取父模型ID
    const parentIds = parentInstances.map(
      p => p[this.relationDef.localKey]
    );
    
    // 获取关联模型类
    const RelatedModel = BaseModel.getModel(this.relationDef.model);
    
    // 创建关联查询
    let query = new QueryBuilder(RelatedModel, connection)
      .whereIn(this.relationDef.foreignKey, parentIds);
    
    // 应用自定义回调
    if (callback) {
      callback(query);
    }
    
    // 执行查询
    const relatedInstances = await query.get();
    
    // 将关联实例分组
    const grouped = this._groupByParentKey(
      relatedInstances, 
      this.relationDef.foreignKey, 
      this.relationDef.localKey
    );
    
    // 将关联结果设置到父实例中
    for (const parent of parentInstances) {
      const key = parent[this.relationDef.localKey];
      parent._relations[this.relationDef.name] = grouped[key] || [];
    }
  }
  
  _groupByParentKey(instances, foreignKey, localKey) {
    const result = {};
    for (const instance of instances) {
      const key = instance[foreignKey];
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(instance);
    }
    return result;
  }
}
```

#### 4.2.4 数据库连接管理

连接管理器负责创建、维护和释放数据库连接：

```typescript
// 连接管理器
class ConnectionManager {
  private _pools = {};
  private _config;
  
  constructor(config) {
    this._config = config;
  }
  
  async getConnection(name = 'default') {
    // 检查连接池是否已存在
    if (!this._pools[name]) {
      // 创建新的连接池
      this._pools[name] = await this._createPool(name);
    }
    
    return this._pools[name].acquire();
  }
  
  async beginTransaction(connectionOrName = 'default') {
    let connection;
    
    if (typeof connectionOrName === 'string') {
      connection = await this.getConnection(connectionOrName);
    } else {
      connection = connectionOrName;
    }
    
    await connection.beginTransaction();
    return new Transaction(connection, this);
  }
  
  _createPool(name) {
    const config = this._config[name];
    if (!config) {
      throw new Error(`Database configuration for '${name}' not found`);
    }
    
    // 创建适当的数据库适配器
    const adapter = this._createAdapter(config);
    
    // 创建连接池
    return new ConnectionPool(adapter, config.pool || {});
  }
  
  _createAdapter(config) {
    switch (config.driver) {
      case 'postgres':
        return new PostgresAdapter(config);
      case 'mysql':
        return new MySQLAdapter(config);
      case 'sqlite':
        return new SQLiteAdapter(config);
      default:
        throw new Error(`Unsupported database driver: ${config.driver}`);
    }
  }
  
  async close() {
    const promises = [];
    for (const name in this._pools) {
      promises.push(this._pools[name].drain());
    }
    await Promise.all(promises);
    this._pools = {};
  }
}
```

#### 4.2.5 事务管理

事务管理基于连接和事务隔离，确保事务操作的原子性：

```typescript
// 事务类
class Transaction {
  constructor(connection, manager) {
    this.connection = connection;
    this.manager = manager;
    this.isCommitted = false;
    this.isRolledBack = false;
    this.savepoints = [];
  }
  
  async commit() {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction already finished');
    }
    
    await this.connection.commit();
    this.isCommitted = true;
    await this.connection.release();
  }
  
  async rollback() {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction already finished');
    }
    
    await this.connection.rollback();
    this.isRolledBack = true;
    await this.connection.release();
  }
  
  async savepoint(name) {
    const savepointName = name || `sp_${this.savepoints.length + 1}`;
    await this.connection.savepoint(savepointName);
    this.savepoints.push(savepointName);
    return savepointName;
  }
  
  async rollbackToSavepoint(name) {
    if (!this.savepoints.includes(name)) {
      throw new Error(`Savepoint '${name}' not found`);
    }
    
    await this.connection.rollbackToSavepoint(name);
    
    // 移除此savepoint之后的所有savepoint
    const index = this.savepoints.indexOf(name);
    this.savepoints = this.savepoints.slice(0, index + 1);
  }
}
```

### 4.3 迁移系统实现

迁移系统使用代码生成和解析技术，实现了从模型定义到迁移文件的转换：

```typescript
// 迁移生成器
class MigrationGenerator {
  constructor(modelsPath, outputPath) {
    this.modelsPath = modelsPath;
    this.outputPath = outputPath;
  }
  
  async generateFromModels(modelNames) {
    // 加载模型文件
    const models = await this._loadModels(modelNames);
    
    for (const model of models) {
      // 分析模型元数据
      const metadata = this._analyzeModel(model);
      
      // 生成迁移代码
      const migrationCode = this._generateMigrationCode(metadata);
      
      // 保存到文件
      await this._saveMigration(metadata.tableName, migrationCode);
    }
  }
  
  _analyzeModel(model) {
    // 提取表名、字段、索引、关系等信息
    const metadata = {
      tableName: model.tableName,
      fields: {},
      indexes: [],
      foreignKeys: []
    };
    
    // 分析字段定义
    for (const [fieldName, fieldDef] of Object.entries(model.fields)) {
      metadata.fields[fieldName] = this._translateFieldDefinition(fieldDef);
      
      // 检查索引
      if (fieldDef.index) {
        metadata.indexes.push({
          name: `idx_${model.tableName}_${fieldName}`,
          columns: [fieldName],
          type: 'index'
        });
      }
      
      if (fieldDef.unique) {
        metadata.indexes.push({
          name: `unq_${model.tableName}_${fieldName}`,
          columns: [fieldName],
          type: 'unique'
        });
      }
    }
    
    // 分析关系定义，提取外键
    if (model.relations) {
      for (const [relationName, relationDef] of Object.entries(model.relations)) {
        if (relationDef.type === 'belongsTo') {
          metadata.foreignKeys.push({
            columns: [relationDef.foreignKey],
            referencedTable: BaseModel.getModel(relationDef.model).tableName,
            referencedColumns: [relationDef.otherKey],
            onDelete: relationDef.onDelete || 'NO ACTION',
            onUpdate: relationDef.onUpdate || 'NO ACTION'
          });
        }
      }
    }
    
    return metadata;
  }
  
  _translateFieldDefinition(fieldDef) {
    // 将模型字段定义转换为迁移字段定义
    const result = {
      type: fieldDef.type,
      nullable: fieldDef.nullable !== false,
      defaultValue: fieldDef.default,
      unsigned: fieldDef.unsigned || false
    };
    
    // 处理特定类型选项
    switch (fieldDef.type) {
      case 'string':
        result.length = fieldDef.length || 255;
        break;
      case 'decimal':
        result.precision = fieldDef.precision || 8;
        result.scale = fieldDef.scale || 2;
        break;
      // 其他类型的特定处理
    }
    
    return result;
  }
  
  _generateMigrationCode(metadata) {
    // 使用模板生成迁移代码
    return `
import { Migration } from '@stratix/database';

export default class Create${this._pascalCase(metadata.tableName)}Table extends Migration {
  async up() {
    await this.schema.createTable('${metadata.tableName}', table => {
      ${this._generateFieldsCode(metadata.fields)}
      
      ${this._generateIndexesCode(metadata.indexes)}
      
      ${this._generateForeignKeysCode(metadata.foreignKeys)}
      
      ${metadata.timestamps !== false ? 'table.timestamps();' : ''}
    });
  }

  async down() {
    await this.schema.dropTable('${metadata.tableName}');
  }
}`;
  }
  
  // 辅助方法：生成字段代码
  _generateFieldsCode(fields) {
    // ...
  }
  
  // 辅助方法：生成索引代码
  _generateIndexesCode(indexes) {
    // ...
  }
  
  // 辅助方法：生成外键代码
  _generateForeignKeysCode(foreignKeys) {
    // ...
  }
  
  // 格式转换：下划线转帕斯卡命名
  _pascalCase(str) {
    return str
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}
```

### 4.4 模型验证器

模型验证器用于验证数据有效性，基于规则引擎实现：

```typescript
// 验证器
class Validator {
  constructor(rules) {
    this.rules = rules;
    this.errors = {};
  }
  
  async validate(data) {
    this.errors = {};
    
    for (const [field, rules] of Object.entries(this.rules)) {
      const value = data[field];
      
      for (const [ruleName, ruleValue] of Object.entries(rules)) {
        // 获取验证规则处理器
        const validator = ValidatorFactory.create(ruleName);
        
        try {
          // 执行验证
          const isValid = await validator.validate(value, ruleValue, data);
          
          if (!isValid) {
            if (!this.errors[field]) {
              this.errors[field] = [];
            }
            
            this.errors[field].push(
              validator.getMessage(field, value, ruleValue)
            );
          }
        } catch (error) {
          if (!this.errors[field]) {
            this.errors[field] = [];
          }
          
          this.errors[field].push(error.message);
        }
      }
    }
    
    return Object.keys(this.errors).length === 0;
  }
  
  getErrors() {
    return this.errors;
  }
}

// 验证规则处理器工厂
class ValidatorFactory {
  static _validators = {};
  
  static register(name, validator) {
    ValidatorFactory._validators[name] = validator;
  }
  
  static create(name) {
    if (!ValidatorFactory._validators[name]) {
      throw new Error(`Validator '${name}' not registered`);
    }
    
    return ValidatorFactory._validators[name];
  }
}

// 内置验证规则处理器
class RequiredValidator {
  validate(value, ruleValue, data) {
    if (!ruleValue) return true;
    return value !== undefined && value !== null && value !== '';
  }
  
  getMessage(field, value, ruleValue) {
    return `The ${field} field is required`;
  }
}

class EmailValidator {
  validate(value, ruleValue, data) {
    if (!ruleValue || value === undefined || value === null || value === '') {
      return true;
    }
    
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  }
  
  getMessage(field, value, ruleValue) {
    return `The ${field} must be a valid email address`;
  }
}
```

### 4.5 查询缓存

查询缓存系统利用缓存插件，提高频繁查询的性能：

```typescript
// 查询缓存
class QueryCache {
  constructor(cacheManager) {
    this.cache = cacheManager;
  }
  
  generateCacheKey(query, bindings) {
    const queryString = typeof query === 'string' 
      ? query 
      : JSON.stringify(query);
      
    const bindingsString = JSON.stringify(bindings || []);
    
    // 生成MD5哈希作为缓存键
    return crypto
      .createHash('md5')
      .update(`${queryString}:${bindingsString}`)
      .digest('hex');
  }
  
  async get(query, bindings) {
    const key = this.generateCacheKey(query, bindings);
    return this.cache.get(key);
  }
  
  async set(query, bindings, results, ttl = 3600) {
    const key = this.generateCacheKey(query, bindings);
    await this.cache.set(key, results, ttl);
  }
  
  async invalidate(tableNames) {
    // 批量失效与指定表相关的缓存
    const tags = Array.isArray(tableNames) 
      ? tableNames 
      : [tableNames];
      
    await Promise.all(
      tags.map(tag => this.cache.invalidateTag(`table:${tag}`))
    );
  }
  
  async clear() {
    await this.cache.clear();
  }
}
```

### 4.6 源数据追踪实现

源数据追踪功能通过`SourceTrackableModel`实现，关键是数据同步算法：

```typescript
// 源数据追踪同步算法
class SourceSynchronizer {
  constructor(model) {
    this.model = model;
  }
  
  async syncFromSource(source, items, options = {}) {
    const result = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };
    
    try {
      // 开启事务
      await this.model.transaction(async (trx) => {
        // 1. 获取当前数据库中存在的源记录
        const existingItems = await this.model.query(trx)
          .where('source', source)
          .select(this.model.primaryKey, 'source_id', 'updated_at')
          .get();
        
        // 将现有记录转换为查找映射
        const existingMap = new Map();
        for (const item of existingItems) {
          existingMap.set(item.source_id, item);
        }
        
        // 2. 准备处理的批次
        const toCreate = [];
        const toUpdate = [];
        const sourceIds = new Set();
        
        // 3. 分析要创建或更新的记录
        for (const item of items) {
          // 确保每个项目有source_id
          if (!item.source_id) {
            result.errors.push({
              message: 'Missing source_id',
              item
            });
            continue;
          }
          
          // 记录源ID以便后续检查删除
          sourceIds.add(item.source_id);
          
          // 设置公共字段
          item.source = source;
          
          // 检查记录是否已存在
          const existing = existingMap.get(item.source_id);
          
          if (!existing) {
            // 新记录，添加到创建列表
            toCreate.push(item);
          } else {
            // 现有记录，添加到更新列表
            toUpdate.push({
              id: existing[this.model.primaryKey],
              ...item
            });
          }
        }
        
        // 4. 执行批量创建
        if (toCreate.length > 0) {
          try {
            const created = await this.model.createMany(toCreate, { trx });
            result.created = created.length;
          } catch (error) {
            result.errors.push({
              message: 'Batch create failed',
              error: error.message
            });
          }
        }
        
        // 5. 执行批量更新
        if (toUpdate.length > 0) {
          for (const item of toUpdate) {
            try {
              await this.model.update(item.id, item, { trx });
              result.updated++;
            } catch (error) {
              result.errors.push({
                message: `Update failed for id ${item.id}`,
                error: error.message,
                item
              });
            }
          }
        }
        
        // 6. 处理需要删除的记录（如果启用了软删除）
        if (options.deleteMissing && this.model.useSoftDeletes) {
          const toDelete = [];
          
          for (const existing of existingItems) {
            if (!sourceIds.has(existing.source_id)) {
              toDelete.push(existing[this.model.primaryKey]);
            }
          }
          
          if (toDelete.length > 0) {
            try {
              await this.model.query(trx)
                .whereIn(this.model.primaryKey, toDelete)
                .delete();
                
              result.deleted = toDelete.length;
            } catch (error) {
              result.errors.push({
                message: 'Batch delete failed',
                error: error.message
              });
            }
          }
        }
      });
      
      return result;
    } catch (error) {
      result.errors.push({
        message: 'Synchronization failed',
        error: error.message
      });
      
      return result;
    }
  }
}
```

## 5. 性能与优化
。 