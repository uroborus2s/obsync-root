# 架构与约束

## 分层规则

- `controller` 负责协议层、请求响应和参数转发。
- `service` 负责业务编排和跨服务协作。
- `repository` 负责全部数据库访问。

## 自动发现

- 应用默认扫描 `src`。
- `src/controllers`、`src/services`、`src/repositories`、`src/executors` 中的 class 会被优先视为可发现对象。
- 不要把普通工具类随意放进这些扫描目录。

## 控制器与路由

- `@Controller()` 不接收前缀。
- 不要依赖 `applicationAutoDI.routing.prefix` 或插件 `AutoDIConfig.routing.prefix` 来定义业务路由前缀。

## 数据访问

- `@stratix/database@1.1.0` 以 repository-first 为主。
- 应用侧数据库访问首选 `BaseRepository`。
- 不要在 service 中直接访问数据库插件或手工拼接跨仓储一致性单元。

## 插件开发约束

- 插件主入口优先使用“具名插件函数 + withRegisterAutoDI(...) 默认导出”。
- 适配器 token 前缀来自插件函数名，不来自 `PluginConfig.name`。
- 插件内部如果有持久化逻辑，也保持 `controller -> service -> repository` 分层。

## 执行器

- 应用 `src` 下的 executor 依赖 `@stratix/tasks` 先完成注册。
- 长流程不要长时间持有数据库事务，应使用短事务 + checkpoint 的方式收口状态。
