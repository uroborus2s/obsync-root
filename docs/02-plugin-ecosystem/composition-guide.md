# 插件组合说明

本说明用于约束常见插件组合、注册顺序和边界。

## 通用规则

- 所有插件都以 `@stratix/core` 为运行时基础。
- 插件注册顺序要满足依赖先于消费方。
- 插件配置入口优先统一放在 `src/stratix.config.ts`。
- 插件内部若涉及持久化，仍遵循 `controller -> service -> repository` 分层。

## 常见组合

### 数据型应用

- 组合：`@stratix/core` + `@stratix/database`
- 说明：最小可用后端组合，适合 CRUD 和普通业务 API。

### 缓存与分布式协调

- 组合：`@stratix/core` + `@stratix/redis`
- 说明：适合缓存、分布式锁、会话态或发布订阅场景。

### 队列处理

- 组合：`@stratix/core` + `@stratix/redis` + `@stratix/queue`
- 说明：`queue` 依赖 Redis，注册时先 `redis` 后 `queue`。

### 工作流与调度

- 组合：`@stratix/core` + `@stratix/database` + `@stratix/tasks`
- 说明：`tasks` 依赖持久化存储执行状态，应用内 executors 在启用 `tasks` 后再注册。

### WPS 集成

- 组合：`@stratix/core` + `@stratix/redis` + `@stratix/was-v7`
- 说明：`was-v7` 需要 Redis 做 token 缓存，注册时先 `redis` 后 `was-v7`。

## 边界约束

- 不要在 service 层直接拼装数据库插件调用，数据库访问统一落在 repository。
- `@stratix/database@1.1.0` 的应用侧首选 `BaseRepository`，不要把旧的 `DatabaseAPI` 当作新代码公共入口。
- 插件 `name` 只用于注册、配置和日志，不决定 adapter token 前缀。
- 插件适配器 token 前缀来自插件函数名及适配器命名，不来自 `PluginConfig.name`。
