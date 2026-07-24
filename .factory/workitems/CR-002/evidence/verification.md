# CR-002 验证证据

日期：2026-07-24

## Red / Green

- Red：生成 API 的契约测试要求 `oxlint --type-aware .`，旧模板实际仍生成 `eslint .`，测试按预期失败。
- Green：迁移 Create 基础模板、Web Admin 模板、插件模板与生成配置后，`pnpm --filter @stratix/create test` 通过 7/7。
- TypeScript 7 探针最初因已删除的 `baseUrl` 配置失败；移除过时选项并迁移 Forge 静态分析后，全仓 TypeScript 7 类型检查通过。
- Forge 最初因 TypeScript 7 不再暴露旧 JavaScript Compiler API 而有 9 个测试失败；改用 `oxc-parser` 后 `pnpm --filter @stratix/forge test` 通过 70/70。

## 最终验证

- 根工作区 `CI=true pnpm install --frozen-lockfile`：通过。
- `examples/web-admin-preview` 的 `CI=true pnpm install --frozen-lockfile`：通过。
- `pnpm run quality:release`：通过。
  - 10 个 workspace 包构建通过。
  - TypeScript 7 supported typecheck 通过。
  - Oxlint type-aware lint 通过，仅保留非阻断 warning。
  - 12/12 supported test 任务通过。
  - Core 34 个测试文件、263 个测试及覆盖率门禁通过。
  - packed Core API 与 generated API consumer smoke 通过。
  - docs-stratego 校验 89 页 / 0 contracts。
  - production audit：0 个已知漏洞。
  - 10 个包 workspace release dry-run 通过。
- Preview 的 lint、typecheck、build 和 6 文件 / 18 测试通过。
- 活跃配置、依赖、脚本、模板与两个锁文件扫描未发现 ESLint / `typescript-eslint`；所有直接 TypeScript 声明均为 `7.0.2`。

## 兼容结论

- Vite、Vitest 与 Prettier 保持独立职责，不依赖 ESLint 运行时，因此没有与 Oxlint 的工具链冲突。
- Forge 不再依赖 TypeScript 的 JavaScript Compiler API；`oxc-parser` 是正式运行时依赖，保留 TypeScript 7 单一版本契约。
- 本变更添加 Changesets 记录，但不执行 npm 发布。
