# @stratix/database

`@stratix/database@1.1.0` 是面向仓储优先应用的 Stratix 数据库插件。
这一版本的公共编程模型以 `BaseRepository` 为中心。

## 1.1.0 的变化

- `DatabaseAPI` 不再属于公共 API。
- 公共事务辅助函数已移除。
- 应用侧的数据库访问应通过继承 `BaseRepository` 的仓储实现。
- 多表业务单元应使用专门的业务仓储承载，而不是在 service 中拼装 SQL。

更详细的设计说明见
[`docs/1.1.0-repository-patterns.md`](./docs/1.1.0-repository-patterns.md)。

## 安装

```bash
pnpm add @stratix/database
```

## 基础用法

```ts
import { BaseRepository } from '@stratix/database';

interface AppDatabase {
  users: {
    id: string;
    email: string;
    name: string;
  };
}

export class UserRepository extends BaseRepository<
  AppDatabase,
  'users',
  AppDatabase['users'],
  Pick<AppDatabase['users'], 'email' | 'name'>,
  Partial<Pick<AppDatabase['users'], 'email' | 'name'>>
> {
  protected readonly tableName = 'users' as const;
  protected readonly logger = console as any;

  async findByEmail(email: string) {
    return await this.findOne((eb) => eb('email', '=', email));
  }
}
```

## 时间戳约定

`BaseRepository` 不会再自动往表 schema 中补 `created_at` / `updated_at`。
如果你希望仓储在 `create(...)` / `update(...)` 时自动写入时间戳，需要满足这两个条件：

- 仓储 `tableSchema` 已经显式声明了对应字段。
- 字段类型是字符串兼容类型，例如 `STRING`、`CHAR`、`TEXT`。

如果数据库中的真实表结构与仓储类里声明的 `tableSchema` 不一致，`BaseRepository`
会优先使用数据库 live schema 作为最终判断依据。

如果调用方已经传入了 `created_at` / `updated_at`，仓储会保留调用方的值，不会覆盖。
如果字段是 `TIMESTAMP`、`DATETIME` 等非字符串类型，仓储不会自动写入字符串时间值。

## 多表业务单元

当一个业务能力天然跨多张表时，应该创建一个业务仓储，让它继续继承
`BaseRepository`，但对外暴露的是用例级方法，而不只是单表 CRUD。

```ts
import { BaseRepository } from '@stratix/database';
import { isLeft } from '@stratix/core/functional';

export class CalendarParticipantUnitRepository extends BaseRepository<
  AppDatabase,
  'calendar_participants'
> {
  protected readonly tableName = 'calendar_participants' as const;
  protected readonly logger = console as any;

  async loadSyncModel(courseId: string) {
    return await this.query(async (db) => {
      return await db
        .selectFrom('calendar_participants')
        .innerJoin('calendars', 'calendars.id', 'calendar_participants.calendar_id')
        .selectAll()
        .where('calendars.course_id', '=', courseId)
        .execute();
    });
  }

  async replaceParticipants(courseId: string, rows: Array<Record<string, unknown>>) {
    return await this.tx(async (repository) => {
      const db = await repository.db();
      await db
        .deleteFrom('calendar_participants')
        .where('course_id', '=', courseId)
        .execute();

      if (rows.length > 0) {
        await db.insertInto('calendar_participants').values(rows as any).execute();
      }

      return rows.length;
    });
  }
}

async function syncCourse(repo: CalendarParticipantUnitRepository, courseId: string) {
  const current = await repo.loadSyncModel(courseId);
  if (isLeft(current)) throw current.left;
  return current.right;
}
```

service 层应该负责外部 API 编排，并把 repository 作为业务一致性边界。
不要在 service 中手动协调多个 repository 来完成同一个一致性单元。

## 事务

`BaseRepository` 为新代码提供了这些事务入口：

- `tx(...)`
- `txBatch(...)`
- `txWithRetry(...)`

```ts
import { isLeft } from '@stratix/core/functional';

const result = await userRepository.tx(async (repo) => {
  await repo.update('user-1', { name: 'Alice' });
  await repo.update('user-2', { name: 'Bob' });
  return true;
});

if (isLeft(result)) {
  throw result.left;
}
```

## 长流程工作流

不要在调用远程 API、执行 executor 或运行长循环时一直持有数据库事务。
正确做法是在慢步骤前后使用短事务。

推荐形态如下：

1. 开一个短事务并抢占工作。
2. 持久化状态、版本号、checkpoint 或租约令牌。
3. 在事务外执行长流程步骤。
4. 再开一个短事务收口成功或失败。

```ts
const claimed = await workflowRepository.tx(async (repo) => {
  return await repo.markRunning(executionId);
});

const remoteResult = await executor.run(executionId);

await workflowRepository.tx(async (repo) => {
  await repo.markSucceeded(executionId, remoteResult);
});
```

这样可以在不长时间持有锁的前提下保护数据库一致性。

在具体仓储内部，可以使用这些受保护的状态迁移原语来构建可恢复的长流程方法：

- `compareAndSetWhere(...)`
- `compareAndSet(...)`
- `claimById(...)`
- `heartbeatById(...)`
- `saveCheckpointById(...)`

```ts
export class WorkflowExecutionRepository extends BaseRepository<
  AppDatabase,
  'workflow_executions'
> {
  protected readonly tableName = 'workflow_executions' as const;
  protected readonly logger = console as any;

  async claimExecution(id: number, owner: string) {
    return await this.claimById(
      id,
      {
        status: 'running',
        lease_owner: owner
      } as any,
      {
        status: 'pending',
        lease_owner: null
      }
    );
  }

  async renewHeartbeat(id: number, owner: string, heartbeatAt: string) {
    return await this.heartbeatById(
      id,
      {
        heartbeat_at: heartbeatAt
      } as any,
      {
        status: 'running',
        lease_owner: owner
      }
    );
  }

  async saveExecutionCheckpoint(id: number, owner: string, checkpointData: unknown) {
    return await this.saveCheckpointById(
      id,
      {
        checkpoint_data: checkpointData
      } as any,
      {
        status: 'running',
        lease_owner: owner
      }
    );
  }
}
```

对于启用了数据库能力的新项目，`@stratix/cli@1.1.0` 可以直接生成这类骨架：

```bash
stratix generate business-repository workflow-execution
```

## 仓储底层能力

当基础 CRUD 不够用时，可以在 repository 内部使用这些能力：

- `query(...)`
- `command(...)`
- `compareAndSetWhere(...)`
- `compareAndSet(...)`
- `claimById(...)`
- `heartbeatById(...)`
- `saveCheckpointById(...)`
- `executeSql(...)`
- `rawQuery(...)`
- `db(...)`
- `reader(...)`
- `writer(...)`
- `schema(...)`

`create(...)` / `createMany(...)` 在 1.1.0 中也会按数据库类型分别处理插入回读：

- PostgreSQL / SQLite 使用 `RETURNING`
- MSSQL 使用 `OUTPUT INSERTED`
- MySQL 使用插入后按主键回读

## 公共导出

```ts
export {
  BaseRepository,
  AutoSaveRepository,
  sql
} from '@stratix/database';

export type {
  DatabaseError,
  DatabaseResult,
  DatabaseOperationContext,
  RepositoryTransactionOptions,
  RepositoryBatchTransactionOptions
} from '@stratix/database';
```

## 许可证

MIT
