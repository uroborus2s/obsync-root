# CR-002 TypeScript 7 与 Oxlint 工具链迁移

- 类型：CR
- 状态：CLOSED
- 优先级：P1
- 阶段：PHASE_6_TOOLCHAIN_MODERNIZATION
- 日期：2026-07-24

## 目标

把整个仓库的 TypeScript 工具链统一到 TypeScript 7，并用 Oxlint 完整替换活跃的 ESLint 生态。

## 范围

- 根工作区、全部 workspace package 和 DevTools Client
- `@stratix/create` 的应用/插件模板与生成契约
- 非 workspace 的 `examples/web-admin-preview`
- Turbo lint 缓存输入、质量门和开发文档

## 约束

- 不保留 ESLint、`typescript-eslint` 或 ESLint plugin/config/resolver 依赖。
- 不通过 Oxlint 的实验性 JS plugin 兼容层继续加载 ESLint plugin。
- 保留 Prettier 作为独立格式化工具；Vite 与 Vitest 保持原有职责。
- 使用 `oxlint-tsgolint` 和 TypeScript 7 提供类型感知 lint；继续保留独立 TypeScript 7 typecheck/build。
- 本变更不发布 npm 包。

## 完成判定

- 所有活跃 package script、配置和生成模板仅使用 Oxlint。
- 所有直接 TypeScript 版本声明均为 TypeScript 7。
- Web Admin 生成回归证明产物包含 Oxlint/TypeScript 7 且不包含 ESLint。
- 根工作区与 preview 锁文件刷新并通过 frozen install。
- lint、typecheck、build、test 和完整 `quality:release` 新鲜通过。
- `docs/`、`.factory/memory/` 与验证证据同步。
