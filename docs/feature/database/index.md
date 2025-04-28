# @stratix/database 数据库插件

## 1. 概述

@stratix/database 是 Stratix 框架的数据库插件，基于 [Knex.js](https://knexjs.org/) 构建，提供了强大的对象关系映射 (ORM) 功能、数据库连接管理、迁移工具和查询构建器。作为 Stratix 生态系统的关键部分，它使开发者能够以声明式和类型安全的方式与各种数据库进行交互。

### 1.1 主要特性

- **多数据库支持**：支持 PostgreSQL、MySQL、SQLite、Oracle 和 SQL Server 等多种数据库
- **对象关系映射 (ORM)**：通过模型类轻松映射和操作数据库表
- **声明式模型定义**：使用装饰器或配置对象定义模型和字段
- **关系管理**：支持一对一、一对多、多对一和多对多等关系
- **查询构建器**：流畅的链式 API 构建复杂查询
- **事务支持**：简化的事务 API，支持嵌套事务
- **迁移与种子**：强大的数据库结构管理和初始化数据工具
- **模型钩子**：支持 beforeSave、afterCreate 等生命周期钩子
- **TypeScript 支持**：完整的类型定义和类型安全
- **多连接管理**：支持多个数据库连接的并行使用和管理
- **数据源同步**：内置从外部 API 或其他数据源同步数据的能力
- **软删除**：支持记录的软删除和恢复
- **缓存集成**：可选与 @stratix/cache 插件集成提高性能

## 2. 安装

### 2.1 基本安装

首先安装 @stratix/database 包及其核心依赖 knex：

```bash
npm install @stratix/database knex
# 或使用 pnpm
pnpm add @stratix/database knex
# 或使用 yarn
yarn add @stratix/database knex
```

### 2.2 数据库驱动

根据你使用的数据库类型，安装相应的驱动：

**PostgreSQL / CockroachDB / Redshift**:
```bash
npm install pg
```

**MySQL / MariaDB**:
```bash
npm install mysql2
```

**SQLite**:
```bash
npm install sqlite3
# 或
npm install better-sqlite3
```

**SQL Server**:
```bash
npm install mssql
```

**Oracle**:
```bash
npm install oracledb
```

## 3. 基本使用

### 3.1 在 Stratix 中注册插件

```typescript
import { createApp } from 'stratix';
import databasePlugin from '@stratix/database';

const app = createApp({
  name: 'my-app'
});

// 注册数据库插件
app.register(databasePlugin, {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'my_database'
  },
  pool: {
    min: 2,
    max: 10
  },
  debug: process.env.NODE_ENV === 'development'
});

// 启动应用
await app.start();
```

### 3.2 使用配置文件

```javascript
// stratix.config.js
module.exports = {
  name: 'my-app',
  
  // 数据库配置
  database: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'my_database'
    },
    pool: {
      min: 2,
      max: 10
    },
    debug: process.env.NODE_ENV === 'development',
    
    // 迁移配置
    migrations: {
      directory: './migrations',
      tableName: 'migrations'
    },
    
    // 种子数据配置
    seeds: {
      directory: './seeds'
    }
  }
};
```

### 3.3 基本查询操作

```typescript
// 获取数据库连接
const db = app.database;

// 执行基本查询
const users = await db.table('users').where('status', 'active').select('*');

// 插入数据
const [userId] = await db.table('users').insert({
  name: 'John Doe',
  email: 'john@example.com',
  created_at: db.fn.now()
}).returning('id');

// 更新数据
await db.table('users').where('id', userId).update({
  last_login: db.fn.now()
});

// 删除数据
await db.table('users').where('id', userId).delete();
```

### 3.4 使用事务

```typescript
// 简单事务
await db.transaction(async (trx) => {
  // 在事务中执行查询
  const [orderId] = await trx('orders').insert({
    user_id: userId,
    status: 'pending',
    total: 99.99
  }).returning('id');
  
  // 插入订单项目
  await trx('order_items').insert([
    { order_id: orderId, product_id: 1, quantity: 2, price: 29.99 },
    { order_id: orderId, product_id: 2, quantity: 1, price: 39.99 }
  ]);
  
  // 事务会自动提交
  // 如果过程中发生错误，事务会自动回滚
});
```

## 4. 插件配置

@stratix/database 插件支持多种配置选项，以下是完整的配置选项及其说明：

```typescript
interface DatabaseConfig extends Knex.Config {
  // 是否启用调试模式
  debug?: boolean;
  
  // 多数据库连接配置
  connections?: Record<string, Knex.Config>;
  
  // 模型配置
  models?: {
    // 模型文件目录
    directory?: string;
    
    // 基础模型类名
    baseClass?: string;
    
    // 是否自动注册目录下所有模型
    autoRegister?: boolean;
  };
  
  // 迁移配置
  migrations?: {
    // 迁移文件目录
    directory?: string;
    
    // 迁移表名
    tableName?: string;
    
    // 是否自动从模型生成迁移
    autoGenerate?: boolean;
  };
  
  // 种子配置
  seeds?: {
    // 种子文件目录
    directory?: string;
    
    // 不同环境使用的种子目录
    environment?: Record<string, string[]>;
  };
}
```

所有 Knex.js 配置选项也都可以使用，包括：
- `client`：数据库类型
- `connection`：数据库连接信息
- `pool`：连接池设置
- `acquireConnectionTimeout`：获取连接超时时间
- `migrations`：迁移配置
- `seeds`：种子配置
- `postProcessResponse`：响应处理函数
- `wrapIdentifier`：标识符包装函数

查看更多配置选项，请参考 [Knex.js 文档](https://knexjs.org/guide/configuration.html)。 