# CR-002 实施报告

## 实施范围

- 删除根、DevTools Client 和 preview 的 ESLint 配置及依赖。
- 新增根、Create Web Admin 模板和 preview 的 Oxlint 配置。
- 所有 lint scripts 改为 `oxlint --type-aware`，根质量门统一调用 Oxlint。
- 所有直接 TypeScript 声明升级到 `7.0.2`，移除 TypeScript 7 已删除的 `baseUrl` / 旧 deprecation 配置。
- Create 基础应用、插件和 Web Admin 模板生成 TypeScript 7、Oxlint、`oxlint-tsgolint` 契约。
- Forge 静态路由分析由 TypeScript JavaScript Compiler API 迁移到 `oxc-parser`，避免 TypeScript 7 运行时 API 缺失。
- 刷新根与 preview 锁文件，更新开发文档、`.factory` 和记忆。
- 添加 Changesets patch 记录；未执行 npm 发布。

## 关键取舍

- 未启用 Oxlint 的 ESLint JS plugin 兼容层。
- 未批量启用与旧 lint 基线无关的全新规则族；保留明确的等价规则和两项低噪声类型规则。
- Vite、Vitest 与 Prettier 保持现有职责。
- Forge 直接使用 Oxc parser，不保留 TypeScript 6 回退或双解析器猜测。

## 验证摘要

- Create：7/7。
- Forge：70/70。
- Supported tests：12/12 turbo tasks。
- Core：34 files / 263 tests，coverage ratchet 通过。
- Preview：lint、typecheck、build、6 files / 18 tests 通过。
- 根和 preview frozen install 通过。
- `pnpm run quality:release` 全部通过。
- active-surface / lockfile ESLint 扫描无结果；所有直接 TypeScript 声明均为 `7.0.2`。
