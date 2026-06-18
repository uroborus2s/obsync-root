# TASK-004 Phase 6 发布准备门禁

- 类型：TASK
- 状态：OPEN
- 优先级：P0
- 阶段：PHASE_6_RELEASE_READINESS
- 负责人：技术总监代理
- 范围：`@stratix/forge`、发布门禁、release surface、离线安装策略、文档与 `.factory` 状态
- 排除项：不在本任务中迁移 `@stratix/tasks` 旧运行时实现

## 目标

把 Phase 6 从手工复核推进为可重复的生产发布准备门禁。

Phase 6 不是继续扩展 core runtime 概念面，而是把 supported scope 的 build/test/docs/pack/API/release-surface/offline/registry 证据纳入一个明确流程。

## 第一批交付

- `stratix release gate --scope workspace --dry-run` 可在 monorepo 根目录规划发布准备门禁，不再要求应用级 production manifest。
- workspace gate 默认扫描 `packages/*/package.json`，报告 supported package 版本，并显式排除 `@stratix/tasks`。
- workspace gate 默认规划 `build:supported`、`test:supported`、docs-stratego、逐包 pack、API static gate 和 release-surface gate。
- `--include-offline-install` 可把 frozen offline install 纳入门禁计划。
- `--include-registry` 可把 npm registry reconciliation 纳入门禁计划。
- 实际执行 workspace release-surface gate 时会要求 supported package 存在 exact git tag。

## 仍未完成

- `BUG-003`：离线安装可重复性仍需恢复或正式判定为不支持。
- `CR-001`：本地 package manifest、git tags、npm registry 发布口径仍需对齐。
- `@stratix/tasks` 是否永久废弃、移出 workspace、或重开独立迁移项目仍需决策。
- 旧 app/plugin 模板目录的物理删除仍需明确批准。

## 验收标准

- `pnpm --filter @stratix/forge test` 覆盖 workspace release gate。
- `pnpm --filter @stratix/forge exec tsc -p tsconfig.json --noEmit` 通过。
- Phase 6 状态同步到 `.factory/project.json`、`.factory/memory/current-state.md` 和当前状态文档。
- 后续执行真实 workspace gate 时，失败项必须能定位到 offline install、exact tag、registry 或 package pack 中的具体门禁。
