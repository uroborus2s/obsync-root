# 后端设计说明

**项目名称：** stratix框架以及生态  
**文档状态：** 草稿  
**负责人：** 仓库维护者  
**主要读者：** 架构 | 后端开发 | QA  
**上游输入：** 技术选型 | 系统架构 | 模块边界  
**下游输出：** 实施计划 | 测试计划  
**关联 ID：** `MOD-002`, `MOD-004`, `MOD-007`  
**最后更新：** 2026-03-28  

## 1. 当前后端设计共识

- `@stratix/core` 负责 runtime、DI 和 discovery。
- `@stratix/database@1.1.0` 在应用侧以 `BaseRepository` 为公共编程模型。
- `@stratix/tasks` 当前最稳的公共能力是执行器注册和工作流能力。

## 2. 分层约束

- Controller 负责协议层和参数转发。
- Service 负责业务编排。
- Repository 负责持久化与一致性边界。
- 多表一致性单元与长流程状态迁移优先收敛到 business repository。

## 3. 插件约束

- 插件主入口优先使用具名插件函数并通过 `withRegisterAutoDI(...)` 暴露。
- 对外能力优先通过 adapter token，而不是内部 service 名称。
- tasks 相关执行器注册顺序要显式校验。

## 4. 当前设计债

- `@stratix/core` 当前 build/test 回归意味着基础后端层不稳定。
- 根 README 中的旧设计说明不能再作为后端设计事实源。

## 5. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 后端设计基线初版 | Codex |
