# CR-002 工具链迁移任务简报

## 目标

将整个仓库统一到 TypeScript 7，并使用 Oxlint 完整替换活跃 ESLint 生态。

## 必须满足

- 根工作区、所有 workspace 包、DevTools Client、Create 应用/插件/Web Admin 模板和 preview 仅使用 Oxlint。
- 移除 ESLint、`typescript-eslint` 及其 plugin/config/parser/resolver 依赖与配置。
- 所有直接 TypeScript 声明使用 TypeScript 7。
- 使用 `oxlint-tsgolint` 提供类型感知 lint，同时保留独立 typecheck/build。
- 不通过 Oxlint JS plugin 兼容层加载 ESLint plugin。
- 不改变 Vite、Vitest 和 Prettier 的职责。
- 保留生成项目与 preview 的可安装、可构建、可测试能力。
- 不执行 npm 发布。

## 验收

- Create 回归测试覆盖生成产物中的 Oxlint/TypeScript 7 契约和 ESLint 缺失契约。
- 根和 preview frozen install 通过。
- lint、typecheck、build、test、完整 `quality:release` 通过。
- 活跃配置、脚本、依赖、模板和锁文件扫描无 ESLint 生态残留。
- 文档、work item、验证证据和项目 memory 同步。
