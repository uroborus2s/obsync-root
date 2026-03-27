# 技术选型与工程规则

**项目名称：** stratix框架以及生态  
**负责人：** 仓库维护者  
**主要读者：** 架构 | 开发 | 测试 | 维护者  
**上游输入：** PRD | 需求分析 | 当前状态分析  
**下游输出：** 架构设计 | 开发实施 | 测试计划  
**最后更新：** 2026-03-28  

## 1. 技术画像摘要

- 技术栈：Node.js、TypeScript、pnpm、turbo、Fastify、Vitest、Vite、Changesets
- 选型目标：维护 Stratix 源码 monorepo、公共生态包和私有管理端应用
- 适用范围：框架源码、生态插件、CLI、前端管理端

## 2. 必装/必选模块

- 包管理：`pnpm@10.x`
- 运行时：`node >=22`
- 工作区编排：`turbo`
- 测试：`vitest`
- 前端应用：`vite`
- 发布：`@changesets/cli`

## 3. Stratix 专项工程规则

- 以本地真实版本为准：
  - `@stratix/cli@1.1.0`
  - `@stratix/core@1.1.0`
  - `@stratix/database@1.1.0`
- CLI 已从 core 中独立，工程化动作优先通过 `@stratix/cli`。
- `@stratix/database@1.1.0` 采用 repository-first 模型，应用侧数据库访问优先 `BaseRepository`。
- Stratix 应用与插件默认遵守 `controller -> service -> repository` 分层。
- 服务层不直接越过 repository 访问数据库插件。
- 生态插件对外能力优先通过 adapter token 暴露，而不是暴露内部 service 名称。

## 4. 工程规则

- 不把声明脚本当成已验证事实；验证结果单独记入 discovery / memory。
- 根 README 与协作文档只保留稳定说明，不写瞬时状态。
- 发布结论必须同时核对本地 manifest、git tag 和 registry。
- 进入实现前必须阅读本文件和 `module-boundaries.md`。

## 5. 管理后台要求

- 私有管理端当前使用 React 19、TanStack Router、Vitest、Vite 8。
- 管理端与公共框架包分开验证，不允许用前端可构建来替代后端生态可发布。

## 6. 同步要求

- 技术栈变化后同步更新设计、测试和 `.factory/memory/tech-stack.summary.md`
- 关键脚本变更后同步更新 `docs/01-framework-development/01-discovery/current-state-analysis.md`

## 7. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 建立历史项目技术画像与工程规则 | Codex |
