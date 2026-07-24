# 数据库快速接入

这一页的目标很明确：把你的后端项目从“只有 HTTP 骨架”推进到“已经具备数据库接入能力”，并且让你真正理解每一步在改什么。

如果你还没有完成前面的内容，先按顺序看完：

1. `getting-started.md`
2. `project-structure.md`
3. `first-feature.md`

## 这一步你最终要得到什么

看完这一页后，你至少应该做到：

- 知道 `stratix add preset database` 会改哪些地方
- 知道数据库 preset 不会替你自动建表
- 知道如何让 `src/stratix.config.ts` 真的拿到数据库连接配置
- 知道为什么 `BaseRepository` 的 `tableSchema` 不等于数据库里的真实表

## 第 1 步：加入 `database` preset

在项目根目录执行：

```bash
stratix add preset database
```

这一步结束后，项目通常会出现三类变化：

- `package.json` 会增加 `@stratix/database`
- `.stratix/project.json` 会记录 `database` preset
- `src/config/stratix.generated.ts` 会从 `sensitiveConfig.database` 读取连接配置

生成文件里也会多出数据库插件骨架。核心意思大致如下：

```ts
{
  name: '@stratix/database',
  plugin: databasePlugin,
  options: {
    connections: {
      default: {
        type: 'mysql',
        host: databaseConfig.host || 'localhost',
        port: Number(databaseConfig.port || 3306),
        database: databaseConfig.database || 'app',
        username: databaseConfig.username || 'root',
        password: databaseConfig.password || ''
      }
    }
  }
}
```

这里最重要的一句不是 `mysql`，而是：

```ts
const databaseConfig = sensitiveConfig.database || {};
```

也就是说，生成出来的默认骨架期待你最终传入的是：

```ts
{
  database: {
    host: '127.0.0.1',
    port: '3306',
    database: 'app',
    username: 'root',
    password: 'secret'
  }
}
```

## 第 2 步：准备本地敏感配置

本地开发也走同一条配置路径：先写 JSON，再加密成 `STRATIX_SENSITIVE_CONFIG`。一个最小的 `sensitive.local.json` 可以是：

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 3000
  },
  "database": {
    "host": "127.0.0.1",
    "port": "3306",
    "database": "app",
    "username": "root",
    "password": "your-password"
  }
}
```

按下面顺序处理：

```bash
stratix config validate sensitive.local.json --required database --strict
export STRATIX_ENCRYPTION_KEY="$(stratix config generate-key --length 32 --format base64)"
stratix config encrypt sensitive.local.json --output .env.local
```

这样生成出来的 `.env.local` 会包含：

```env
STRATIX_SENSITIVE_CONFIG="..."
```

应用运行时继续注入同一个 `STRATIX_ENCRYPTION_KEY`。Forge 和 Core 都接受
恰好 32-byte 的原始文本，或解码后为 32 bytes 的 64 位 hex / 标准 base64；
其他长度会直接报错。不要通过命令行参数传密钥。

不要把 `DB_HOST`、`DB_PASSWORD` 这类业务配置重新接回普通 `.env`；应用配置统一通过加密后的 `STRATIX_SENSITIVE_CONFIG` 注入。

## 第 3 步：理解 `tableSchema` 和真实数据库表不是一回事

这是新手最容易误解的地方。

`@stratix/database` 里的 `SchemaBuilder` 主要用于：

- 给 repository 声明字段结构
- 帮助 `BaseRepository` 处理时间戳和查询能力
- 提供运行期 schema 对齐信息

它不是“执行了就自动建表”的迁移工具。

换句话说：

- `tableSchema` 是你在应用代码里声明的理解
- 真实数据库表是数据库里真的存在的东西

如果数据库里没有表，或者表结构和你写的代码完全对不上，仓储照样会报错。

## 第 4 步：先准备一张最小可用的 `users` 表

因为当前 create 模板默认生成的是 MySQL 数据库配置，这里先给一个 MySQL 版本的最小 SQL：

```sql
CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NULL,
  UNIQUE KEY uk_users_email (email)
);
```

这里刻意把 `created_at` 和 `updated_at` 定义成字符串，是为了和 `BaseRepository` 1.1.0 的时间戳自动写入约定保持一致。

你后面也可以根据团队规范换成别的数据库类型，但入门阶段先别同时改太多变量。

## 第 5 步：做这三个最小验证

到这里先不要急着写 CRUD。先确认接入基础链路是通的：

```bash
stratix doctor
pnpm build
pnpm dev
```

这一步主要看两件事：

- 项目还能正常启动
- 默认健康检查接口 `/health` 还能访问

如果这里就失败，先不要继续写 repository。优先排查：

1. `src/stratix.config.ts` 是否真的把数据库配置传给了 `createGeneratedConfig(...)`
2. `STRATIX_SENSITIVE_CONFIG` 和 `STRATIX_ENCRYPTION_KEY` 是否由外层进程注入，且加密密钥一致
3. 数据库服务本身是否可连

## 下一步该做什么

如果这一步已经完成，下一篇就应该进入 [`database-crud.md`](./database-crud.md)。

那一页会带你做完一个真正使用 `BaseRepository` 的 `users` CRUD，而不是继续停留在演示数据阶段。
