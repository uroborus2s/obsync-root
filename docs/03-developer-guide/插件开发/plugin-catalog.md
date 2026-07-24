# 插件目录

下表整理当前仓库内主要生态插件和配套包的定位，作为选型与维护入口。

| 包 | 类型 | 主要职责 | 典型场景 | 主要依赖 | 参考资料 |
|---|---|---|---|---|---|
| `@stratix/database` | 数据库插件 | 提供 repository-first 数据访问模型和 `BaseRepository` | 业务持久化、事务边界、业务仓储 | `@stratix/core` | `packages/database/README.md` |
| `@stratix/redis` | 基础设施插件 | 提供标准化 Redis 客户端、缓存、发布订阅与健康检查 | 缓存、分布式锁、令牌缓存 | `@stratix/core` | `packages/redis/README.md` |
| `@stratix/queue` | 队列插件 | 提供基于 BullMQ 的消息队列能力 | 异步任务、延迟任务、后台消费 | `@stratix/core`, `@stratix/redis` | `packages/queue/README.md` |
| `@stratix/ossp` | 对象存储插件 | 统一 MinIO、阿里云 OSS 等对象存储能力 | 文件上传下载、预签名 URL、桶管理 | `@stratix/core` | `packages/ossp/README.md` |
| `@stratix/was-v7` | 集成插件 | 接入 WPS V7 开放平台 API | 通讯录、日历、消息、驱动盘 | `@stratix/core`, `@stratix/redis` | `packages/was_v7/README.md` |
| `@stratix/devtools` | 开发辅助包 | 提供开发观测与辅助能力 | 开发调试、诊断 | `@stratix/core` | `packages/devtools/src/` |
| `@stratix/testing` | 测试辅助包 | 提供测试场景下的辅助能力 | 单元测试、集成测试、模拟能力 | `@stratix/core` | `packages/testing/src/` |

选型要点：

- 需要数据库访问时优先选 `@stratix/database`，应用层通过 repository 继承 `BaseRepository` 接入。
- 需要缓存、分布式锁、令牌共享或发布订阅时优先选 `@stratix/redis`。
- 需要队列消费时用 `@stratix/queue`，并提前准备 Redis。
- 需要长流程或定时执行时，优先用 `@stratix/database` 收口 checkpoint / 状态表，需要异步消费再加 `@stratix/queue`；`@stratix/tasks` 已从当前仓库移除。
- 需要对象存储时用 `@stratix/ossp`。
- 需要 WPS 开放平台能力时用 `@stratix/was-v7`，并准备 Redis 作为 token 缓存。

## CLI catalog 与外部生态

`@stratix/forge@1.1.1` 提供 `stratix ecosystem` 命令，用于查询内置 Stratix catalog、Fastify 官方生态 Markdown、npm registry 和 GitHub 元数据：

```bash
stratix ecosystem catalog list --source stratix --format json
stratix ecosystem search redis --source stratix,fastify,npm --format json
stratix ecosystem inspect @stratix/redis --format json
```

当候选包来自 Fastify 而不是原生 Stratix 插件时，`requiresAdapter` signal 会标记需要 adapter wrapper。生成 adapter 时必须显式指定包名，CLI 不会自动选择候选包：

```bash
stratix ecosystem adapt @fastify/cors --name cors --target ./plugins/cors-adapter
```
