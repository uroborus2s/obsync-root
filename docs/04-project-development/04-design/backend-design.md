# 后端设计说明

**项目名称：** stratix框架以及生态  
**文档状态：** 草稿  
**负责人：** 仓库维护者  
**主要读者：** 架构 | 后端开发 | QA  
**上游输入：** 技术选型 | 系统架构 | 模块边界  
**下游输出：** 实施计划 | 测试计划  
**关联 ID：** `MOD-002`, `MOD-004`, `MOD-007`  
**最后更新：** 2026-06-18

## 1. 当前后端设计共识

- `@stratix/core` 负责 runtime、DI、discovery、route contract 和核心诊断能力。
- `@stratix/database@1.1.0` 在应用侧以 `BaseRepository` 为公共编程模型。
- `@stratix/create` 是轻量创建入口，只负责 app/plugin 创建；`@stratix/forge` 是项目内工程入口，负责 generate、doctor、di、openapi、start、config 等命令。二者都必须保持零运行时依赖，不依赖 `@stratix/core` 或任何项目包。
- `@stratix/testing` 是独立的一等测试平台入口，不并入 core；当前已具备 smoke 与 `contractTest()` 基线。
- `@stratix/tasks` 当前是冻结/待废弃候选包，不作为 core 设计依赖，也不作为默认质量门的一部分。

## 2. 分层约束

- Controller 负责协议层和参数转发。
- Service 负责业务编排。
- Repository 负责持久化与一致性边界。
- 多表一致性单元与长流程状态迁移优先收敛到 business repository。

## 3. 插件约束

- 插件主入口优先使用具名插件函数并通过 `withRegisterAutoDI(...)` 暴露。
- 对外能力优先通过 adapter token，而不是内部 service 名称。
- 插件 adapter token 必须可诊断；重复 adapter name 或根容器 token 冲突必须显式暴露。
- tasks 相关能力不进入本阶段稳定后端设计，未来如恢复必须单独立项。

## 4. 当前设计债

- Plugin manifest、Production manifest 仍需进入下一阶段；统一错误 envelope、response validation strict gate、testing fixtures 和 Module governance tooling 已有基线。
- 根 README 不承载瞬时设计状态；当前事实以 `.factory/project.json`、`.factory/memory/current-state.md` 和 `docs/04-project-development/02-discovery/current-state-analysis.md` 为准。

## 5. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 后端设计基线初版 | Codex |
| 2026-06-18 | 更新破坏性升级后的后端设计基线：core 稳定、工具链零依赖、testing 一等公民、tasks 冻结 | Codex |
| 2026-06-18 | 将工具链后端边界拆分为 `@stratix/create` 轻量创建入口和 `@stratix/forge` 项目工程入口 | Codex |
