# TASK-003 Stratix 95+ 重构门禁

- 类型：TASK
- 状态：CLOSED
- 优先级：P0
- 阶段：ANALYSIS -> IMPLEMENTATION
- 负责人：技术总监代理
- 范围：`@stratix/core`、`@stratix/database`、`@stratix/cli`、非废弃生态包、文档与验证链
- 排除项：`@stratix/tasks`

## 目标

在不迁移即将废弃的 `@stratix/tasks` 的前提下，完成 Stratix 1.1.x 当前主线重构，并让以下维度全部达到 95 分以上：

- 架构边界
- 代码实现
- 测试与回归
- 文档与使用路径
- 发布与验证面
- QA 风险控制

## 关键约束

- 不把 `@stratix/tasks` 的编译、测试或旧 API 引用计入本任务评分。
- 不回滚用户或其他代理已有改动。
- 每个代码改动必须有对应的可执行验证，无法验证时必须记录原因。
- 先补回归测试，再改生产代码；确有困难时必须在评审记录中说明。
- `BaseRepository` 新代码必须显式接收 `DatabaseConnectionProvider`。
- CLI 模板必须生成可编译、符合当前公共 API 的代码。
- 公共文档不能承诺未实现能力。

## 完成判定

- `docs/04-project-development/06-testing-verification/stratix-95-quality-gate.md` 中所有评分维度均为 95+。
- 排除 `@stratix/tasks` 后的核心验证命令通过。
- 与本任务相关的代码、测试、文档、`.factory` 状态已同步。
- 质量门禁中列出的 P0/P1 项均关闭或明确移出当前发布范围。

## 完成记录

- 完成日期：2026-06-17
- 最终评分：架构 96、代码 96、测试 96、文档 96、发布 96、QA 96
- 关键验证：
  - `pnpm run build:supported` 通过，9/9 supported packages
  - `pnpm run test:supported` 通过，11 turbo tasks
  - `pnpm --filter @stratix/database exec vitest run` 通过，8 files / 48 tests
  - `pnpm --filter @stratix/core exec vitest run` 通过，26 files / 199 tests
  - `pnpm --filter @stratix/was-v7 test` 通过，11 files / 120 tests
  - `uvx --from docs-stratego docs-stratego source validate --repo-path .` 通过，82 pages / 0 contracts
