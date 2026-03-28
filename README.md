# 灵枢枢机（Stratix）框架以及生态

这是一个以 Node.js / TypeScript 为主的 `pnpm` + `turbo` monorepo，当前承载灵枢枢机（Stratix）框架核心包、配套生态包、CLI，以及一个非 workspace 的 CLI 预览样例。

## 稳定入口

- 人类文档入口：[`docs/index.md`](./docs/index.md)
- 稳定协作规则：[`AGENTS.md`](./AGENTS.md)、[`GEMINI.md`](./GEMINI.md)
- 机器可消费项目基线：[`/.factory/project.json`](./.factory/project.json)
- 当前真实状态快照：[`docs/04-project-development/02-discovery/current-state-analysis.md`](./docs/04-project-development/02-discovery/current-state-analysis.md)

## 仓库布局

- `packages/core`: 灵枢枢机核心框架
- `packages/cli`: 灵枢枢机 CLI
- `packages/database`: 数据库插件
- `packages/redis`: Redis 插件
- `packages/queue`: 队列插件
- `packages/tasks`: 任务与工作流插件
- `packages/was_v7`: WPS API 集成插件
- `packages/ossp`: OSS 存储插件
- `packages/devtools`: 开发工具包
- `packages/testing`: 测试辅助包
- `legacy/packages/utils`: `@stratix/utils` 的历史版本基线，不再参与当前 workspace 维护
- `examples/web-admin-preview`: 由 CLI 生成的“幻廊之镜”(`web-admin`) 预览样例，不参与 workspace 安装、构建和发布

## 文档边界

- `README.md` 只保留稳定项目概览和导航。
- 安装、构建、测试、运行、发布的当前验证结论不写在这里。
- 这些瞬时结论统一维护在：
  - `.factory/project.json`
  - `.factory/memory/current-state.md`
  - `docs/04-project-development/02-discovery/current-state-analysis.md`

## 变更约束

- 需求、缺陷和实施任务使用 `CR-*`、`BUG-*`、`TASK-*` 编号管理。
- 任何接受的变更都需要同步代码、文档、测试和 `.factory/`。
