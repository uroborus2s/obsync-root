# 当前状态分析

**项目名称：** stratix框架以及生态  
**文档状态：** 已发布  
**负责人：** 仓库维护者  
**主要读者：** 架构 | 开发 | QA | 发布维护者  
**上游输入：** 现有代码 | `package.json` | 包 README | git tags | npm registry | 命令验证  
**下游输出：** PRD | 需求分析 | 技术选型 | 实施计划  
**关联 ID：** `REQ-001`, `REQ-002`, `BUG-001`, `BUG-002`, `BUG-003`, `BUG-004`, `CR-001`  
**最后更新：** 2026-03-28  

## 1. 证据基础

本结论来自以下事实源：

- 根清单：`package.json`、`pnpm-workspace.yaml`、`turbo.json`
- workspace 包清单：`packages/*/package.json`
- 非 workspace 样例：`examples/web-admin-preview`
- 现有文档：根 `README.md` 与各包 `README.md`
- 发布信号：
  - 本地 `git tag`
  - npm registry 查询结果
- 命令验证：
  - 安装
  - 构建
  - 测试
  - 运行入口

## 2. 当前真实仓库形态

当前仓库不是根 README 描述的旧四包结构，也不再包含 workspace 应用。当前真实形态是 10 个公共包、1 个归档 legacy 包，以及 1 个非 workspace 的 CLI 预览样例。

| 单元 | 类型 | 当前版本 | 公开性 | 主要职责 | 关键内部依赖 |
|---|---|---:|---|---|---|
| `@stratix/cli` | package | 1.1.0 | public | 初始化、生成、doctor、start、config CLI | - |
| `@stratix/core` | package | 1.1.0 | public | Fastify runtime、DI、discovery、装饰器，并内聚通用 utilities 导出面 | - |
| `@stratix/database` | package | 1.1.0 | public | repository-first 数据库插件 | `@stratix/core` |
| `@stratix/devtools` | package | 1.0.0-beta.1 | public | 开发观测与辅助工具 | `@stratix/core` |
| `@stratix/ossp` | package | 0.0.1-beta.3 | public | 对象存储插件 | `@stratix/core` |
| `@stratix/queue` | package | 1.0.0-beta.2 | public | 队列插件 | `@stratix/core`, `@stratix/redis` |
| `@stratix/redis` | package | 1.0.0-beta.2 | public | Redis 插件 | `@stratix/core` |
| `@stratix/tasks` | package | 1.0.0-beta.5 | public | 执行器与工作流能力 | `@stratix/core`, `@stratix/database` |
| `@stratix/testing` | package | 1.0.0-beta.1 | public | 测试辅助模块 | `@stratix/core` |
| `@stratix/was-v7` | package | 1.0.0-beta.36 | public | WPS WAS V7 集成插件 | `@stratix/core`, `@stratix/redis` |
| `legacy/packages/utils` | legacy package | 1.0.0-beta.4 | archived | `@stratix/utils` 老版本源码基线，保留用于历史兼容与参考，不再参与当前 workspace 发布 | - |
| `examples/web-admin-preview` | sample | generated | private/local | CLI `web-admin` 模板预览样例，不参与 workspace 发布面 | - |

附加事实：

- `apps/admin-dashboard` 已从 workspace 移除并删除。
- 预览样例由 CLI 重新生成到 `examples/web-admin-preview`，用于验证模板输出，不代表正式产品模块。
- 根工作树非常脏，存在大量既有修改和删除。
- 在本轮前，仓库没有 `docs/`、`.factory/`、`AGENTS.md` 或 `GEMINI.md`。
- 根 README 曾混入过时模块结构、旧命令和历史变更说明，现已迁移为稳定入口。

## 3. 文档与治理现状

### 3.1 本轮前缺失项

- 没有正式 `docs/` 生命周期目录
- 没有 `.factory/` 控制面
- 没有稳定协作协议
- 没有统一工作项体系

### 3.2 顶层入口的治理原则

顶层 README 只保留稳定入口，不再承载瞬时验证状态。当前瞬时结论统一落在：

- `.factory/project.json`
- `.factory/memory/current-state.md`
- `docs/01-framework-development/01-discovery/current-state-analysis.md`

结论：顶层入口文档已经从“混入状态的历史说明”收敛成“稳定导航页”，瞬时状态不再复制回 README。

## 4. 最新发布结果与版本漂移

发布信号在 2026-03-28 的真实情况如下：

| 包 | 本地声明版本 | 最新 git tag | npm registry | 判断 |
|---|---:|---|---|---|
| `@stratix/core` | 1.1.0 | `0.0.3-beta.2` | `0.8.2`，修改时间 2026-01-07 | 本地版本显著领先于 tag 与 npm |
| `@stratix/cli` | 1.1.0 | 无当前包名 tag | 404 | 已有本地公开包，但未见 npm 发布记录 |
| `@stratix/database` | 1.1.0 | `0.0.3-beta.2` | 404 | 本地版本领先，发布面未对齐 |
| `@stratix/devtools` | 1.0.0-beta.1 | 无当前包名 tag | 404 | 有包无 tag/registry 对应记录 |
| `@stratix/ossp` | 0.0.1-beta.3 | 无当前包名 tag | 404 | 有包无 tag/registry 对应记录 |
| `@stratix/queue` | 1.0.0-beta.2 | `0.0.3-beta.2` | 404 | 本地版本领先，发布面未对齐 |
| `@stratix/redis` | 1.0.0-beta.2 | 无当前包名 tag | 404 | 有包无 tag/registry 对应记录 |
| `@stratix/tasks` | 1.0.0-beta.5 | `0.0.3-beta.2` | 404 | 本地版本领先，发布面未对齐 |
| `@stratix/testing` | 1.0.0-beta.1 | 无当前包名 tag | 404 | 有包无 tag/registry 对应记录 |
| `@stratix/utils` | legacy 1.0.0-beta.4 | `0.0.2` / `0.0.2-beta.0` | 404 | 已转入 `legacy/packages/utils`，仅保留历史版本基线 |
| `@stratix/was-v7` | 1.0.0-beta.36 | `0.0.3-beta.2` | 404 | 本地版本领先，发布面未对齐 |

结论：

- 公开发布面的真实状态并不是“所有本地包都已按当前版本发布”。
- 目前至少存在三套版本事实：
  - 本地 `package.json`
  - 本地 git tags
  - npm registry
- 这三套事实没有统一，必须作为独立整改项处理。

## 5. 安装、构建、测试、运行验证

### 5.1 安装验证

| 命令 | 结论 | 关键结果 |
|---|---|---|
| `CI=true pnpm install --no-frozen-lockfile` | passed | 移除 workspace app 后，根锁文件已可重新收敛 |
| `CI=true pnpm install --frozen-lockfile` | passed | 当前联网冻结安装可通过 |
| `CI=true pnpm install --frozen-lockfile --offline` | failed | `ERR_PNPM_NO_OFFLINE_TARBALL`，缺少 `ajv-8.17.1` tarball |
| `CI=true pnpm install --ignore-workspace` | passed | `examples/web-admin-preview` 可作为独立样例恢复依赖 |

### 5.2 构建验证

| 命令 | 结论 | 关键结果 |
|---|---|---|
| `pnpm build` | failed | 根脚本是 `turbo run build --filter`，缺少必需参数 |
| `pnpm build:all` | failed | 上次验证首先失败在 `@stratix/ossp`，报 `Cannot find module '@stratix/core'`；本轮未重新执行根级聚合构建 |
| `pnpm --filter @stratix/cli build` | passed | CLI 可单独构建 |
| `pnpm --filter @stratix/core build` | passed | `core` 已承接 `utils` 导出并可单独完成构建 |
| `pnpm --filter @stratix/database build` | passed | `database` 在新的 `@stratix/core/*` 导入面下可单独构建 |
| `pnpm --filter @stratix/redis build` | passed | `redis` 包级构建通过 |
| `pnpm --filter @stratix/ossp build` | passed | `ossp` 包级构建通过 |
| `pnpm --filter @stratix/queue build` | passed | `queue` 包级构建通过 |
| `pnpm --filter @stratix/was-v7 build` | passed | `was-v7` 包级构建通过 |
| `pnpm --filter @stratix/tasks build` | passed | 第二阶段兼容修复后，`tasks` 包级构建通过 |
| `pnpm build`（`examples/web-admin-preview`） | passed | CLI 生成样例可单独完成静态构建 |

### 5.3 测试验证

| 命令 | 结论 | 关键结果 |
|---|---|---|
| `pnpm test` | failed | 根测试被多个包共同拖垮，而不是单一 `core` 回归 |
| `pnpm --filter @stratix/cli test` | passed | `21` 个测试全部通过 |
| `pnpm test`（`examples/web-admin-preview`） | passed | `6` 个文件、`18` 个测试全部通过 |

当前根测试暴露的主要问题：

- `@stratix/queue` 与 `@stratix/ossp` 因 “No test files found” 直接 exit 1
- `@stratix/was-v7` 出现 vitest startup error
- `@stratix/core`、`@stratix/database`、`@stratix/redis`、`@stratix/tasks` 等被连带拖累

### 5.4 运行入口验证

| 命令 | 结论 | 关键结果 |
|---|---|---|
| `node packages/cli/dist/bin/stratix.js --help` | passed | CLI 可输出命令清单 |
| `pnpm preview --host 127.0.0.1 --port 4273`（`examples/web-admin-preview`） | passed after permission | 本地成功启动，监听 `http://127.0.0.1:4273/` |

说明：

- 预览服务在默认沙箱下因 `listen EPERM` 被拦截，放行本地端口后可正常启动。
- 这说明 CLI 模板样例本身可构建、可测试、可预览，但运行验证依赖本地端口权限。

## 6. 当前真实状态结论

当前项目的真实状态不是“整体不可用”，而是“workspace 结构已收敛、主要公共包可顺序单独构建、根验证入口仍失真、CLI 与样例入口健康”。

可以明确成立的结论：

- monorepo 实体存在且结构清晰
- workspace 现在只包含公共 `@stratix/*` 包，不再混入模板副本型应用
- `@stratix/cli` 是真实可构建、可执行的入口
- `@stratix/core`、`@stratix/database`、`@stratix/redis`、`@stratix/ossp`、`@stratix/queue`、`@stratix/tasks`、`@stratix/was-v7` 已完成顺序包级构建验证
- `examples/web-admin-preview` 是真实可安装、可构建、可测试、可预览的 CLI 输出样例
- 根 `pnpm build` 仍然损坏
- 根 `pnpm build:all` 仍需在最新包图上重新验证，`pnpm test` 仍反映测试档位与包图级不稳定
- 离线安装与发布口径仍需治理

## 7. 对当前阶段的判断

建议把软件工厂当前阶段定为 `ANALYSIS`。

理由：

- 代码已经大量存在，不需要回到 brainstorm 或从零设计
- workspace 形态已经收敛，但根验证链、发布面、测试策略和包图健康度仍需从事实中回收
- 直接进入实现会放大“脚本声明”和“真实可用性”之间的偏差

阶段出口前至少需要完成：

- 将现有能力整理为结构化 `REQ/NFR`
- 关闭首批根级 `BUG`
- 统一 release surface 的事实口径
- 给出可靠的根级验证策略

## 8. 首批建议工作项

- `BUG-001`: 修复根 `build` 入口缺少 `--filter` 参数的问题
- `BUG-002`: 修复 `@stratix/core` 当前构建与测试回归
- `BUG-003`: 明确并修复离线安装基线不可重复的问题
- `BUG-004`: 修复 workspace 包图构建与测试链不稳定的问题
- `CR-001`: 对齐 README、git tag、npm registry 与本地版本声明的发布口径
- `TASK-001`: 完成历史项目 requirements upgrade 与设计基线补齐
- `TASK-002`: 建立统一的根级验证命令和 CI profile

## 9. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 初版当前状态分析，纳入代码、发布与运行验证事实 | Codex |
| 2026-03-28 | 按迁移后现实更新：移除 workspace app，新增 CLI 预览样例，并重写验证结论 | Codex |
| 2026-03-28 | 记录 `@stratix/utils` 硬合并后第二阶段结果：`core/database/redis/ossp/queue/tasks/was-v7` 顺序构建通过 | Codex |
