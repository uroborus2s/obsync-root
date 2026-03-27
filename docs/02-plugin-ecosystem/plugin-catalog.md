# 插件目录

下表整理当前仓库内主要生态插件和配套包的定位，作为选型与维护入口。

| 包 | 类型 | 主要职责 | 典型场景 | 主要依赖 | 参考资料 |
|---|---|---|---|---|---|
| `@stratix/database` | 数据库插件 | 提供 repository-first 数据访问模型和 `BaseRepository` | 业务持久化、事务边界、业务仓储 | `@stratix/core` | `packages/database/README.md` |
| `@stratix/redis` | 基础设施插件 | 提供标准化 Redis 客户端、缓存、发布订阅与健康检查 | 缓存、分布式锁、令牌缓存 | `@stratix/core` | `packages/redis/README.md` |
| `@stratix/queue` | 队列插件 | 提供基于 BullMQ 的消息队列能力 | 异步任务、延迟任务、后台消费 | `@stratix/core`, `@stratix/redis` | `packages/queue/README.md` |
| `@stratix/tasks` | 执行器与工作流插件 | 提供 executor、调度和工作流编排能力 | 工作流引擎、定时任务、执行记录 | `@stratix/core`, `@stratix/database` | `packages/tasks/src/` |
| `@stratix/ossp` | 对象存储插件 | 统一 OSS/MinIO/S3 等对象存储能力 | 文件上传下载、预签名 URL、桶管理 | `@stratix/core` | `packages/ossp/README.md` |
| `@stratix/was-v7` | 集成插件 | 接入 WPS V7 开放平台 API | 通讯录、日历、消息、驱动盘 | `@stratix/core`, `@stratix/redis` | `packages/was_v7/README.md` |
| `@stratix/devtools` | 开发辅助包 | 提供开发观测与辅助能力 | 开发调试、诊断 | `@stratix/core` | `packages/devtools/src/` |
| `@stratix/testing` | 测试辅助包 | 提供测试场景下的辅助能力 | 单元测试、集成测试、模拟能力 | `@stratix/core` | `packages/testing/src/` |

选型要点：

- 需要数据库访问时优先选 `@stratix/database`，应用层通过 repository 继承 `BaseRepository` 接入。
- 需要缓存、分布式锁、令牌共享或发布订阅时优先选 `@stratix/redis`。
- 需要队列消费时用 `@stratix/queue`，并提前准备 Redis。
- 需要长流程编排、执行器或定时任务时用 `@stratix/tasks`，通常同时配合 `@stratix/database`。
- 需要对象存储时用 `@stratix/ossp`。
- 需要 WPS 开放平台能力时用 `@stratix/was-v7`，并准备 Redis 作为 token 缓存。
