# TASK-004 Phase 6 发布准备门禁

- 类型：TASK
- 状态：CLOSED
- 优先级：P0
- 阶段：PHASE_6_RELEASE_READINESS
- 负责人：技术总监代理
- 范围：`@stratix/forge`、发布门禁、release surface、离线安装策略、文档与 `.factory` 状态
- 排除项：`@stratix/tasks` 旧运行时实现已从当前 workspace 物理移除，不再迁移

## 目标

把 Phase 6 从手工复核推进为可重复的生产发布准备门禁。

Phase 6 不是继续扩展 core runtime 概念面，而是把 supported scope 的 build/test/docs/pack/API/release-surface/offline/registry 证据纳入一个明确流程。

## 第一批交付

- `stratix release gate --scope workspace --dry-run` 可在 monorepo 根目录规划发布准备门禁，不再要求应用级 production manifest。
- workspace gate 默认扫描 `packages/*/package.json`，报告 supported package 版本；`@stratix/tasks` 已移出扫描面。
- workspace gate 默认规划 `build:supported`、`test:supported`、docs-stratego、逐包 pack、API static gate 和 release-surface gate。
- `--include-offline-install` 可把 frozen offline install 纳入门禁计划。
- `--include-registry` 可把 npm registry reconciliation 纳入门禁计划。
- 实际执行 workspace release-surface gate 时会要求 supported package 存在 exact git tag。

## Phase 6 完成项

- `BUG-003`：离线安装可重复性已恢复，`CI=true pnpm install --frozen-lockfile --offline` 通过。
- `CR-001`：本地 package manifest、Phase 6 exact tag 规则和 public npmjs registry 事实已对齐。
- `stratix release gate --scope workspace` 已真实执行 build/test/docs/pack/API，并能在 exact tags 缺失时精确阻断于 release-surface。
- `pack` gate 已升级为逐包构建 + `pnpm pack --json` artifact 内容校验，覆盖 entry files 缺失与开发文件泄漏。
- `registry` gate 已升级为 public npmjs exact-version 校验：404 视为版本可发布，exact version 已存在则阻断。
- `@stratix/tasks` 决策为 1.1.x 硬删除包：不保留源码、不进入 supported build/test/release gate、不作为新项目推荐路径；恢复需单独重新立项。
- 旧 app/plugin 模板目录已在获得人工批准后物理删除；forge 源码和发布包只保留 resource/preset 模板。

## 验收标准

- `pnpm --filter @stratix/forge test` 覆盖 workspace release gate。
- `pnpm --filter @stratix/forge exec tsc -p tsconfig.json --noEmit` 通过。
- Phase 6 状态同步到 `.factory/project.json`、`.factory/memory/current-state.md` 和当前状态文档。
- 后续执行真实 workspace gate 时，失败项必须能定位到 offline install、exact tag、registry 或 package pack 中的具体门禁。

## 验收证据

- `pnpm --filter @stratix/forge test` 通过，45 项测试。
- `pnpm --filter @stratix/forge exec tsc -p tsconfig.json --noEmit` 通过。
- `CI=true pnpm install --frozen-lockfile --offline` 通过。
- `node packages/forge/dist/bin/stratix.js release gate --scope workspace` 真实执行通过 build/test/docs/pack/API，并在 final exact tags 创建前精确阻断于 release-surface。
