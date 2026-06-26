# 模块边界

**项目名称：** stratix框架以及生态  
**文档状态：** 草稿  
**负责人：** 仓库维护者  
**主要读者：** 架构 | 开发 | 测试 | 维护者  
**上游输入：** 当前状态分析 | 技术选型 | 系统架构  
**下游输出：** 实施计划 | 测试计划 | 工作项  
**关联 ID：** `MOD-001` ~ `MOD-012`
**最后更新：** 2026-06-26

## 1. 模块边界表

| 模块 | 边界职责 | 不负责 | 主要依赖 |
|---|---|---|---|
| `MOD-001 @stratix/create` | app/plugin/template 创建入口 | generate、doctor、openapi、build、test、pack、runtime 核心实现 | - |
| `MOD-002 @stratix/core` | runtime、DI、discovery、装饰器，以及共享工具导出 | 业务插件逻辑 | - |
| `MOD-003 @stratix/core/utils` | async、data、functional、environment、context、auth、crypto、error、file-scanner 等通用工具函数 | 独立包发布、业务 runtime、插件协议、应用编排 | `core` |
| `MOD-004 @stratix/database` | repository-first 数据能力 | 业务 service 编排 | `core` |
| `MOD-005 @stratix/redis` | Redis 能力封装 | 业务流程编排 | `core` |
| `MOD-006 @stratix/queue` | 队列/worker 能力 | Redis 原生管理 | `core`, `redis` |
| `MOD-007 @stratix/tasks` | 已物理移除的历史包；未来是否重做需单独立项 | 当前主线 runtime、core 概念模型、默认质量门、发布面 | - |
| `MOD-008 @stratix/ossp` | 对象存储插件 | 通用数据库逻辑 | `core` |
| `MOD-009 @stratix/was-v7` | WPS API 集成插件 | 通用 runtime | `core`, `redis` |
| `MOD-010 @stratix/devtools` | 开发辅助与观测 | 正式业务功能 | `core` |
| `MOD-011 @stratix/forge` | 项目内工程中枢：generate、doctor、di graph、openapi、start、config | app/plugin 一次性创建、runtime 核心实现 | - |
| `MOD-012 web-admin-preview` | 模板预览样例，用于手动预览模板输出 | 正式 workspace、公共包发布 | - |

## 2. 约束

- 应用与插件代码默认遵守 `controller -> service -> repository` 分层。
- service 层不直接越过 repository 访问数据库插件。
- 公共生态包与私有前端应用必须分开看待发布面。
- 根脚本不应掩盖包级真实状态。

## 3. 当前禁止耦合

- 不允许用 `examples/web-admin-preview` 的通过状态代表公共包可发布。
- 不允许让 service 层直接拼接多 repository 的一致性单元。
- 不允许把 README 当作发布事实源。

## 4. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 模块边界初版 | Codex |
| 2026-06-16 | 将 `MOD-003` 从 legacy 归档边界更新为 `packages/utils` 公共工具包边界 | Codex |
| 2026-06-16 | 将 `MOD-003` 收敛为 `@stratix/core/utils` 子模块，删除独立 `@stratix/utils` 发布边界 | Codex |
| 2026-06-18 | 将 `@stratix/tasks` 边界更新为冻结/待废弃候选，避免继续承诺 executor/workflow 稳定能力 | Codex |
| 2026-06-18 | 将原工具边界拆分为 `@stratix/create` 创建入口与 `@stratix/forge` 项目工程中枢 | Codex |
| 2026-06-26 | 将 `@stratix/tasks` 边界更新为已物理移除，避免冻结旧口径误导发布范围 | Codex |
