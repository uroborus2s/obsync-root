# @stratix/database

Stratix框架的数据库插件，提供统一的数据库访问接口和强大的ORM功能。

## 特性

- 🚀 **多数据库支持**: PostgreSQL, MySQL, SQLite, MSSQL
- 🔄 **连接管理**: 自动连接池管理和读写分离
- 🛡️ **类型安全**: 完整的TypeScript支持
- 🔧 **依赖注入**: 与Stratix框架的DI系统无缝集成
- 📊 **监控和日志**: 内置性能监控和查询日志
- 🔒 **安全性**: SQL注入防护和查询验证

## 安装

```bash
pnpm add @stratix/database
```

## 基础配置

```typescript
import { databasePlugin } from '@stratix/database';

export default {
  plugins: [
    [databasePlugin, {
      connections: {
        default: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'myapp',
          username: 'user',
          password: 'password'
        }
      }
    }]
  ]
};
```

## 适配器注入

@stratix/database 插件会自动注册 `database.manager` 适配器到DI容器中，遵循Stratix框架的标准命名规范：`pluginname.adaptername`。

### 在服务中使用

```typescript
import type { AwilixContainer } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';

export class UserService {
  private databaseAPI: DatabaseAPI;

  constructor(container: AwilixContainer) {
    // 通过标准命名注入数据库适配器
    this.databaseAPI = container.resolve('database.manager');
  }

  async createUser(userData: { name: string; email: string }) {
    return await this.databaseAPI.executeQuery(async (db) => {
      return await db
        .insertInto('users')
        .values(userData)
        .returningAll()
        .executeTakeFirst();
    });
  }
}
```

### 在Repository中使用

```typescript
import { BaseRepository, type DatabaseAPI } from '@stratix/database';

export class UserRepository extends BaseRepository<Database, 'users', User, CreateUser, UpdateUser> {
  constructor(container: AwilixContainer) {
    const databaseAPI = container.resolve('database.manager');
    super(databaseAPI, 'default'); // 使用默认连接
  }

  async findByEmail(email: string) {
    return await this.findOne(eb => eb('email', '=', email));
  }
}
```

## 核心API

### DatabaseAPI 接口

`database.manager` 适配器实现了完整的 `DatabaseAPI` 接口：

```typescript
interface DatabaseAPI {
  // 基础查询操作
  executeQuery<T>(operation: (db: Kysely<any>) => Promise<T>): Promise<DatabaseResult<T>>;
  
  // 批量操作
  executeBatch<T>(operations: Array<(db: Kysely<any>) => Promise<T>>): Promise<DatabaseResult<T[]>>;
  
  // 并行操作
  executeParallel<T>(operations: Array<(db: Kysely<any>) => Promise<T>>): Promise<DatabaseResult<T[]>>;
  
  // 事务支持
  transaction<T>(operation: (trx: Transaction<any>) => Promise<T>): Promise<DatabaseResult<T>>;
  
  // 连接管理
  getConnection(connectionName?: string): Promise<DatabaseResult<Kysely<any>>>;
  getReadConnection(connectionName?: string): Promise<DatabaseResult<Kysely<any>>>;
  getWriteConnection(connectionName?: string): Promise<DatabaseResult<Kysely<any>>>;
  
  // 健康检查
  healthCheck(connectionName?: string): Promise<DatabaseResult<boolean>>;
}
```

## 高级功能

### 事务处理

```typescript
async transferPoints(fromUserId: string, toUserId: string, points: number) {
  return await this.databaseAPI.transaction(async (trx) => {
    await trx.updateTable('users')
      .set(eb => ({ points: eb('points', '-', points) }))
      .where('id', '=', fromUserId)
      .execute();

    await trx.updateTable('users')
      .set(eb => ({ points: eb('points', '+', points) }))
      .where('id', '=', toUserId)
      .execute();

    return { success: true };
  });
}
```

### 读写分离

```typescript
// 读操作使用读连接
const readResult = await this.databaseAPI.getReadConnection();
const users = await readResult.data.selectFrom('users').selectAll().execute();

// 写操作使用写连接
const writeResult = await this.databaseAPI.getWriteConnection();
await writeResult.data.insertInto('users').values(newUser).execute();
```

## 依赖注入配置

插件会自动发现并注册适配器，配置如下：

```typescript
{
  services: {
    enabled: true,
    patterns: ['adapters/*.{ts,js}'],
    naming: {
      prefix: 'database' // 生成 databaseManager
    }
  }
}
```

## 类型定义

```typescript
// 导出的主要类型
export type { DatabaseAPI } from '@stratix/database';
export type { DatabaseResult, DatabaseError } from '@stratix/database';
export type { BaseRepository, RepositoryConnectionOptions } from '@stratix/database';
```

## 许可证

MIT
