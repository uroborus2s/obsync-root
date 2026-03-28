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
- `.env.example` 会补上这几个键

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=app
DB_USERNAME=root
DB_PASSWORD=
```

另外，`src/config/stratix.generated.ts` 里也会多出数据库插件骨架。核心意思大致如下：

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

如果你只是改了 `.env.example`，但没有把这些值映射到 `database` 对象里，项目并不会自动拿到连接配置。

## 第 2 步：先用最容易跑通的本地开发写法

对新手来说，最容易成功的方式不是一上来就折腾加密配置，而是先把本地 `.env` 映射写明白。

把 `src/stratix.config.ts` 改成下面这种写法：

```ts
import type { StratixConfig } from '@stratix/core';
import { createGeneratedConfig } from './config/stratix.generated.js';

export default (sensitiveConfig: Record<string, any> = {}): StratixConfig => {
  const config = createGeneratedConfig({
    ...sensitiveConfig,
    database: {
      host: sensitiveConfig.database?.host || process.env.DB_HOST || '127.0.0.1',
      port: sensitiveConfig.database?.port || process.env.DB_PORT || '3306',
      database: sensitiveConfig.database?.database || process.env.DB_NAME || 'app',
      username:
        sensitiveConfig.database?.username || process.env.DB_USERNAME || 'root',
      password: sensitiveConfig.database?.password || process.env.DB_PASSWORD || ''
    }
  });

  return {
    ...config
  };
};
```

这段代码的意义是：

- 本地开发时，你只写 `.env` 也能跑
- 以后你接入加密配置时，`sensitiveConfig.database` 仍然会优先覆盖
- 你不需要重写 `stratix.generated.ts`，只是在项目入口把配置喂进去

然后在项目根目录准备一个真实的 `.env` 文件，例如：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=app
DB_USERNAME=root
DB_PASSWORD=your-password
```

注意：当前 Stratix 启动链路默认要求基础 `.env` 文件存在，所以不要只保留 `.env.example`。

## 第 3 步：更稳妥的正式路径是加密敏感配置

上一步是为了让你尽快跑通本地开发。真正要进团队协作或部署环境时，更稳妥的方式还是用 `STRATIX_SENSITIVE_CONFIG`。

一个最小的敏感配置文件可以是：

```json
{
  "database": {
    "host": "127.0.0.1",
    "port": "3306",
    "database": "app",
    "username": "root",
    "password": "your-password"
  }
}
```

建议按下面顺序处理：

```bash
stratix config validate sensitive.local.json --required database --strict
stratix config generate-key --length 32 --format base64
stratix config encrypt sensitive.local.json --key "<上一步生成的密钥>" --output .env.local
```

这样生成出来的 `.env.local` 会包含：

```env
STRATIX_SENSITIVE_CONFIG="..."
```

然后你再把同一把密钥通过环境变量 `STRATIX_ENCRYPTION_KEY` 提供给应用运行环境。加密时用的 key 和运行时解密用的 key 必须一致。

如果你只是本地临时试跑，也可以先继续用上一节的 `.env` 映射方案，把加密配置放到后面再做。

## 第 4 步：理解 `tableSchema` 和真实数据库表不是一回事

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

## 第 5 步：先准备一张最小可用的 `users` 表

因为 CLI 默认生成的是 MySQL 数据库配置，这里先给一个 MySQL 版本的最小 SQL：

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

## 第 6 步：做这三个最小验证

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
2. `.env` 是否存在并且键名拼写正确
3. 数据库服务本身是否可连

## 下一步该做什么

如果这一步已经完成，下一篇就应该进入 [`database-crud.md`](./database-crud.md)。

那一页会带你做完一个真正使用 `BaseRepository` 的 `users` CRUD，而不是继续停留在演示数据阶段。
