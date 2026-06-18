# CR-001 发布面与入口文档口径对齐

- 类型：CR
- 状态：CLOSED
- 优先级：P1
- 阶段：PHASE_6_RELEASE_READINESS
- 预计工作量：1.5 人/天

## 描述

需要统一以下事实口径：

- 本地 `package.json` 版本
- git tags
- npm registry 已发布版本
- 顶层 README 与仓级发布文档

## 触发原因

- 当前大多数公共包在 npm registry 上不存在对应记录
- `@stratix/core` 的 registry 版本与本地版本显著不一致
- README 长期漂移

## 影响分析

- 对外宣称的版本和真实可安装版本可能不一致
- 维护者难以判断哪些包处于“开发中”还是“已发布”

## 完成判定

- 发布策略文件明确哪些包已发布、哪些仅本地存在
- tag 与版本规则被统一
- README / release docs 与真实发布面一致

## Phase 6 结论

- `stratix release gate --scope workspace --dry-run` 已可把 release-surface 纳入 monorepo 发布准备计划。
- 实际执行 workspace release-surface gate 时，supported package 必须存在 exact git tag。
- registry reconciliation 通过 `--include-registry` 显式纳入门禁，并固定查询 public npmjs exact package version。
- public npmjs 当前仅存在 `@stratix/core@0.8.2` 历史版本；`@stratix/core@1.1.0` 和其他 supported package exact versions 均未发布，可进入发布准备。
- README 已从旧 `packages/cli` 口径修正为 `packages/create` + `packages/forge`。
- release notes 已记录 supported package 范围、exact tag 规则、public npmjs registry 事实和 `@stratix/tasks` 1.1.x 冻结/废弃结论。
