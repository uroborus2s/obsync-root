---
sidebar_position: 1
---

# 指南：集成数据库

在几乎所有的后端应用中，与数据库的交互都是核心功能。得益于 **思齐框架 (`@stratix/core`)** 强大的依赖注入和生命周期管理，集成数据库变得非常简单和优雅。

本指南将以创建一个可复用的数据库插件为例，展示最佳实践。

## 目标

我们将创建一个 `DatabasePlugin`，它负责：
1.  在应用启动时建立数据库连接。
2.  在应用关闭时安全地断开连接。
3.  通过依赖注入向其他服务提供一个可用的数据库客户端。

## 步骤 1: 创建数据库服务

首先，我们创建一个 `DatabaseService`。这个服务将封装所有与数据库连接相关的逻辑，并利用生命周期方法来自动管理连接。

我们将使用 `node-postgres` (pg) 作为示例，但您可以替换为任何其他数据库驱动，如 `mysql2`, `TypeORM`, `Prisma` 等。

```bash
pnpm add pg
pnpm add -D @types/pg
```

```typescript title="src/plugins/database/database.service.ts"
import { Lifetime, RESOLVER } from 'awilix';
import { Pool, type PoolClient } from 'pg';

export class DatabaseService {
  static [RESOLVER] = { lifetime: Lifetime.SINGLETON };

  private pool: Pool;

  constructor() {
    // 在构造函数中初始化连接池，但不立即连接
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'mydatabase',
      password: process.env.DB_PASSWORD || 'password',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    });

    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  // 利用 onReady 生命周期钩子，在应用准备好时进行连接
  public async onReady() {
    try {
      console.log('Connecting to the database...');
      await this.pool.connect();
      console.log('✅ Database connection established.');
    } catch (error) {
      console.error('❌ Failed to connect to the database:', error);
      // 抛出错误会中断应用启动
      throw error;
    }
  }

  // 利用 onClose 生命周期钩子，在应用关闭时安全地断开连接
  public async onClose() {
    console.log('Closing database connection pool...');
    await this.pool.end();
    console.log('✅ Database connection pool closed.');
  }

  // 提供一个公共方法来获取客户端，用于执行事务等操作
  public getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // 提供一个简单的查询方法
  public async query(text: string, params?: any[]) {
    const start = Date.now();
    const res = await this.pool.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  }
}
```

**关键点**:
- **`onReady()`**: 我们在这里执行异步的 `pool.connect()`。因为 `onReady` 是在应用所有模块加载完毕后执行，所以这是进行I/O密集型初始化的完美时机。
- **`onClose()`**: 在这里调用 `pool.end()` 来优雅地关闭所有连接，确保没有资源泄漏。
- **`Lifetime.SINGLETON`**: 数据库连接服务应该是单例的，以保证整个应用共享同一个连接池。

## 步骤 2: 创建插件

现在，我们将 `DatabaseService` 封装到一个插件中，以便在应用中复用。

```typescript title="src/plugins/database/index.ts"
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance } from 'fastify';

// 一个空的 Fastify 插件函数
async function databasePlugin(fastify: FastifyInstance, options: any) {
  fastify.log.info('Database plugin registered.');
}

// 使用 withRegisterAutoDI 包装，并启用自动发现
export default withRegisterAutoDI(databasePlugin, {
  discovery: {
    // 告诉框架去扫描并注册这个目录下的所有 .service.ts 文件
    patterns: ['**/*.service.ts'],
  },
});
```

## 步骤 3: 在应用中使用数据库服务

最后，在您的主应用配置中加载 `DatabasePlugin`，然后就可以在任何其他服务或控制器中注入 `DatabaseService` 了。

**1. 更新主应用配置**

```typescript title="stratix.config.ts"
import { defineConfig } from '@stratix/core';
import databasePlugin from './plugins/database'; // 导入插件

export default defineConfig(() => ({
  server: { port: 3000 },
  applicationAutoDI: {
    enabled: true,
    patterns: ['src/**/*.controller.ts', 'src/**/*.service.ts'],
  },
  plugins: [
    {
      name: 'database',
      plugin: databasePlugin, // 注册插件
    },
  ],
}));
```

**2. 在其他服务中注入和使用**

```typescript title="src/user.service.ts"
import { Lifetime, RESOLVER } from 'awilix';
import { DatabaseService } from './plugins/database/database.service';

export class UserService {
  static [RESOLVER] = { lifetime: Lifetime.SCOPED };

  // 通过构造函数注入 DatabaseService
  constructor(private readonly databaseService: DatabaseService) {}

  public async getUsers() {
    const result = await this.databaseService.query('SELECT * FROM users');
    return result.rows;
  }
}
```

就这样！`DatabaseService` 的连接和断开完全由框架的生命周期自动管理。您只需在需要的地方注入它，然后直接使用即可，无需关心其底层的连接状态。这就是 **思齐框架 (`@stratix/core`)** 依赖注入与生命周期管理相结合所带来的强大威力。
