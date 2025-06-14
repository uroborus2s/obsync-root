# @stratix/database

基于 Kysely 的 Stratix 数据库插件，提供多数据库支持、查询缓存和读写分离功能。

## 特性

- 🚀 基于 Kysely 的类型安全数据库操作
- 🔄 多数据库连接支持
- 📊 查询缓存（Redis/内存）
- 🔀 读写分离
- 🏥 健康检查
- 🔧 连接池管理
- 📝 完整的 TypeScript 支持

## 安装

```bash
npm install @stratix/database kysely
```

根据你使用的数据库，还需要安装相应的驱动：

```bash
# MySQL
npm install mysql2

# PostgreSQL
npm install pg
npm install @types/pg

# SQLite
npm install better-sqlite3
npm install @types/better-sqlite3

# MSSQL (开发中)
npm install tedious

# Oracle (开发中)
npm install oracledb
```

## 基本使用

### 1. 注册插件

```typescript
import Fastify from 'fastify';
import databasePlugin from '@stratix/database';

const fastify = Fastify();

await fastify.register(databasePlugin, {
  databases: {
    main: {
      dialect: 'mysql',
      connection: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'myapp'
      }
    }
  }
});
```

### 2. DI 容器注册

插件会自动向 DI 容器注册两个对象：

#### `db` - 默认数据库实例
```typescript
// 直接获取默认数据库
const db = fastify.diContainer.resolve<Kysely<Database>>('db');

const users = await db
  .selectFrom('users')
  .selectAll()
  .execute();
```

#### `databaseProvider` - 数据库提供者
```typescript
import type { DatabaseProvider } from '@stratix/database';

// 获取数据库提供者
const provider = fastify.diContainer.resolve<DatabaseProvider>('databaseProvider');

// 获取默认数据库
const defaultDb = provider.getDatabase();

// 获取指定名称的数据库
const readonlyDb = provider.getDatabase('readonly');

// 如果数据库不存在，会自动返回默认数据库
const fallbackDb = provider.getDatabase('nonexistent'); // 返回默认数据库

// 检查数据库是否存在
const hasAnalytics = provider.hasDatabase('analytics');

// 获取所有数据库名称
const dbNames = provider.getDatabaseNames();

// 获取所有数据库实例
const allDbs = provider.getAllDatabases();
```

### 3. 便捷方法

插件还为 Fastify 实例添加了便捷方法：

```typescript
// 获取数据库（通过 databaseProvider）
const db = fastify.getDatabase(); // 默认数据库
const readonlyDb = fastify.getDatabase('readonly'); // 指定数据库

// 获取所有数据库
const allDatabases = fastify.getAllDatabases();
```

## 多数据库配置

```typescript
await fastify.register(databasePlugin, {
  databases: {
    // 主数据库（默认数据库）
    main: {
      dialect: 'mysql',
      connection: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'main_db'
      }
    },
    // 只读数据库
    readonly: {
      dialect: 'mysql',
      connection: {
        host: 'readonly-host',
        port: 3306,
        user: 'readonly_user',
        password: 'password',
        database: 'main_db'
      }
    },
    // 分析数据库
    analytics: {
      dialect: 'postgresql',
      connection: {
        host: 'analytics-host',
        port: 5432,
        user: 'postgres',
        password: 'password',
        database: 'analytics_db'
      }
    }
  }
});
```

## 在服务中使用

### 方式1：直接注入默认数据库

```typescript
class UserService {
  constructor(
    private db: Kysely<Database>
  ) {}

  async getUsers() {
    return await this.db
      .selectFrom('users')
      .selectAll()
      .execute();
  }
}

// 注册服务
fastify.registerDI(
  (db: Kysely<Database>) => new UserService(db),
  {
    name: 'userService',
    lifetime: 'SINGLETON',
    dependencies: ['db'] // 注入默认数据库
  }
);
```

### 方式2：注入数据库提供者

```typescript
import type { DatabaseProvider } from '@stratix/database';

class UserService {
  private db: Kysely<Database>;
  private readonlyDb: Kysely<Database>;

  constructor(
    private provider: DatabaseProvider
  ) {
    this.db = provider.getDatabase(); // 默认数据库用于写操作
    this.readonlyDb = provider.getDatabase('readonly'); // 只读数据库用于读操作
  }

  async createUser(name: string, email: string) {
    return await this.db
      .insertInto('users')
      .values({ name, email })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async getUsers() {
    return await this.readonlyDb
      .selectFrom('users')
      .selectAll()
      .execute();
  }
}

// 注册服务
fastify.registerDI(
  (provider: DatabaseProvider) => new UserService(provider),
  {
    name: 'userService',
    lifetime: 'SINGLETON',
    dependencies: ['databaseProvider'] // 注入数据库提供者
  }
);
```

## 路由中使用

```typescript
// 使用默认数据库
fastify.get('/users', async () => {
  const db = fastify.diContainer.resolve<Kysely<Database>>('db');
  const users = await db.selectFrom('users').selectAll().execute();
  return { users };
});

// 使用数据库提供者
fastify.get('/analytics', async () => {
  const provider = fastify.diContainer.resolve<DatabaseProvider>('databaseProvider');
  const analyticsDb = provider.getDatabase('analytics');
  const stats = await analyticsDb.selectFrom('user_stats').selectAll().execute();
  return { stats };
});

// 使用便捷方法
fastify.get('/posts', async () => {
  const db = fastify.getDatabase();
  const readonlyDb = fastify.getDatabase('readonly');
  
  const [posts, comments] = await Promise.all([
    db.selectFrom('posts').selectAll().execute(),
    readonlyDb.selectFrom('comments').selectAll().execute()
  ]);
  
  return { posts, comments };
});
```

## 高级配置

### 读写分离

```typescript
{
  databases: {
    main: {
      dialect: 'mysql',
      connection: {
        host: 'master-host',
        // ... 主库配置
      },
      readWrite: {
        read: {
          host: 'slave-host',
          // ... 从库配置
        }
      }
    }
  }
}
```

### 查询缓存

```typescript
{
  databases: {
    main: {
      dialect: 'mysql',
      connection: { /* ... */ },
      cache: {
        enabled: true,
        type: 'redis',
        redis: {
          host: 'localhost',
          port: 6379
        },
        ttl: 300 // 5分钟
      }
    }
  }
}
```

### 健康检查

```typescript
{
  databases: { /* ... */ },
  global: {
    healthCheck: {
      enabled: true,
      interval: 30000, // 30秒检查一次
      timeout: 5000,   // 5秒超时
      retries: 3       // 重试3次
    }
  }
}
```

### 连接验证

插件支持智能的数据库连接验证，针对不同数据库使用最优的验证查询：

```typescript
{
  databases: { /* ... */ },
  global: {
    connectionValidation: {
      enabled: true,        // 是否启用连接验证，默认 true
      timeout: 5000,        // 验证超时时间（毫秒），默认 5000
      retryOnFailure: false, // 验证失败时是否重试，默认 false
      customQuery: undefined // 自定义验证查询，可选
    }
  }
}
```

#### 连接验证查询原理

**重要说明**：连接验证查询如 `SELECT 1 as connection_test` 中的 `connection_test` **不是表名**，而是**列的别名**。

```sql
-- 这个查询的含义：
SELECT 1 as connection_test
-- ↑     ↑    ↑
-- |     |    └── 给结果列起别名为 "connection_test"
-- |     └── 选择常量值 1
-- └── SELECT 关键字

-- 查询结果：
-- | connection_test |
-- |-----------------|
-- |        1        |
```

这种查询的优势：
- **不依赖任何表**：即使数据库中没有任何表，查询也能成功
- **执行速度快**：只是选择常量，不涉及磁盘 I/O
- **通用性强**：所有主流数据库都支持常量查询
- **结果可预测**：总是返回相同的结果

#### 数据库特定的验证查询

- **MySQL**: `SELECT 1 as connection_test`
- **PostgreSQL**: `SELECT 1 as connection_test`
- **SQLite**: `SELECT 1 as connection_test`
- **Oracle**: `SELECT 1 as connection_test FROM DUAL`
- **MSSQL**: `SELECT 1 as connection_test`

#### 自定义验证查询

```typescript
{
  global: {
    connectionValidation: {
      enabled: true,
      customQuery: 'SELECT CURRENT_TIMESTAMP' // 自定义验证查询
    }
  }
}
```

#### 禁用连接验证

```typescript
{
  global: {
    connectionValidation: {
      enabled: false // 禁用连接验证
    }
  }
}
```

## API 参考

### DatabaseProvider 接口

```typescript
interface DatabaseProvider {
  /**
   * 根据名称获取数据库实例
   * @param name 数据库名称，如果不提供则返回默认数据库
   * @returns Kysely 数据库实例
   */
  getDatabase(name?: string): Kysely<any>;

  /**
   * 获取所有数据库实例
   * @returns 包含所有数据库实例的对象
   */
  getAllDatabases(): Record<string, Kysely<any>>;

  /**
   * 检查是否存在指定名称的数据库
   * @param name 数据库名称
   * @returns 是否存在
   */
  hasDatabase(name: string): boolean;

  /**
   * 获取所有数据库名称
   * @returns 数据库名称数组
   */
  getDatabaseNames(): string[];

  /**
   * 销毁所有数据库连接
   */
  destroy(): Promise<void>;
}
```

### Fastify 实例扩展

```typescript
interface FastifyInstance {
  /**
   * 获取数据库实例
   * @param name 数据库名称，如果不提供则返回默认数据库
   */
  getDatabase(name?: string): Kysely<any>;

  /**
   * 获取所有数据库实例
   */
  getAllDatabases(): Record<string, Kysely<any>>;
}
```

## 注意事项

1. **默认数据库**：第一个配置的数据库或名为 'default' 的数据库会被设置为默认数据库
2. **自动回退**：当请求不存在的数据库时，会自动返回默认数据库并记录警告日志
3. **生命周期管理**：所有数据库连接会在应用关闭时自动清理
4. **类型安全**：建议定义数据库表结构接口以获得完整的类型支持

## 许可证

MIT 