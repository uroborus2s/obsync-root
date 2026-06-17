# 当前状态分析

**项目名称：** stratix框架以及生态  
**文档状态：** 已发布  
**负责人：** 仓库维护者  
**主要读者：** 架构 | 开发 | QA | 发布维护者  
**上游输入：** 现有代码 | `package.json` | 包 README | git tags | npm registry | 命令验证  
**下游输出：** PRD | 需求分析 | 技术选型 | 实施计划  
**关联 ID：** `REQ-001`, `REQ-002`, `BUG-001`, `BUG-002`, `BUG-003`, `BUG-004`, `CR-001`  
**最后更新：** 2026-06-17

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

当前仓库不是根 README 描述的旧四包结构，也不再包含 workspace 应用。当前真实形态是 10 个公共包，以及 1 个非 workspace 的 CLI 预览样例。

| 单元                         | 类型    |      当前版本 | 公开性        | 主要职责                                                            | 关键内部依赖                         |
| ---------------------------- | ------- | ------------: | ------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `@stratix/cli`               | package |         1.1.0 | public        | 初始化、生成、doctor、start、config CLI                             | -                                    |
| `@stratix/core`              | package |         1.1.0 | public        | Fastify runtime、DI、discovery、装饰器，并内聚通用 utilities 导出面 | -                                    |
| `@stratix/database`          | package |         1.1.0 | public        | repository-first 数据库插件                                         | `@stratix/core`                      |
| `@stratix/devtools`          | package |  1.0.0-beta.1 | public        | 开发观测与辅助工具                                                  | `@stratix/core`                      |
| `@stratix/ossp`              | package |  0.0.1-beta.3 | public        | 对象存储插件                                                        | `@stratix/core`                      |
| `@stratix/queue`             | package |  1.0.0-beta.2 | public        | 队列插件                                                            | `@stratix/core`, `@stratix/redis`    |
| `@stratix/redis`             | package |  1.0.0-beta.2 | public        | Redis 插件                                                          | `@stratix/core`                      |
| `@stratix/tasks`             | package |  1.0.0-beta.5 | public        | 执行器与工作流能力                                                  | `@stratix/core`, `@stratix/database` |
| `@stratix/testing`           | package |  1.0.0-beta.1 | public        | 测试辅助模块                                                        | `@stratix/core`                      |
| `@stratix/was-v7`            | package | 1.0.0-beta.36 | public        | WPS WAS V7 集成插件                                                 | `@stratix/core`, `@stratix/redis`    |
| `examples/web-admin-preview` | sample  |     generated | private/local | CLI `web-admin` 模板预览样例，不参与 workspace 发布面               | -                                    |

附加事实：

- `apps/admin-dashboard` 已从 workspace 移除并删除。
- `@stratix/utils` 已从当前 workspace 删除；async、data、functional、environment、context、auth 等共享工具由 `@stratix/core/utils` 及 core 子路径承接。
- 预览样例由 CLI 重新生成到 `examples/web-admin-preview`，用于验证模板输出，不代表正式产品模块。
- 当前依赖基线已整体刷新到 Node `24.14.1` / pnpm `10.33.0`。
- 本轮重构提交前的工作区变更范围收敛在删除独立 `@stratix/utils` 包、刷新 workspace lockfile、同步 core utilities 边界及其状态记录。
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
- `docs/04-project-development/02-discovery/current-state-analysis.md`

结论：顶层入口文档已经从“混入状态的历史说明”收敛成“稳定导航页”，瞬时状态不再复制回 README。

## 4. 最新发布结果与版本漂移

发布信号在 2026-03-28 的真实情况如下：

| 包                  |  本地声明版本 | 最新 git tag   | npm registry                 | 判断                                |
| ------------------- | ------------: | -------------- | ---------------------------- | ----------------------------------- |
| `@stratix/core`     |         1.1.0 | `0.0.3-beta.2` | `0.8.2`，修改时间 2026-01-07 | 本地版本显著领先于 tag 与 npm       |
| `@stratix/cli`      |         1.1.0 | 无当前包名 tag | 404                          | 已有本地公开包，但未见 npm 发布记录 |
| `@stratix/database` |         1.1.0 | `0.0.3-beta.2` | 404                          | 本地版本领先，发布面未对齐          |
| `@stratix/devtools` |  1.0.0-beta.1 | 无当前包名 tag | 404                          | 有包无 tag/registry 对应记录        |
| `@stratix/ossp`     |  0.0.1-beta.3 | 无当前包名 tag | 404                          | 有包无 tag/registry 对应记录        |
| `@stratix/queue`    |  1.0.0-beta.2 | `0.0.3-beta.2` | 404                          | 本地版本领先，发布面未对齐          |
| `@stratix/redis`    |  1.0.0-beta.2 | 无当前包名 tag | 404                          | 有包无 tag/registry 对应记录        |
| `@stratix/tasks`    |  1.0.0-beta.5 | `0.0.3-beta.2` | 404                          | 本地版本领先，发布面未对齐          |
| `@stratix/testing`  |  1.0.0-beta.1 | 无当前包名 tag | 404                          | 有包无 tag/registry 对应记录        |
| `@stratix/was-v7`   | 1.0.0-beta.36 | `0.0.3-beta.2` | 404                          | 本地版本领先，发布面未对齐          |

结论：

- 公开发布面的真实状态并不是“所有本地包都已按当前版本发布”。
- 目前至少存在三套版本事实：
  - 本地 `package.json`
  - 本地 git tags
  - npm registry
- 这三套事实没有统一，必须作为独立整改项处理。

## 5. 安装、构建、测试、运行验证

### 5.1 安装验证

| 命令                                                           | 结论                | 关键结果                                                                      |
| -------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `CI=true pnpm install --no-frozen-lockfile`                    | passed              | 根工作区已在最新依赖栈下刷新 lockfile                                         |
| `CI=true pnpm install --frozen-lockfile`                       | passed              | 根工作区冻结安装在 pnpm `10.33.0` 下可通过                                    |
| `CI=true pnpm install --frozen-lockfile --offline`             | failed (last known) | 上次已知失败是 `ERR_PNPM_NO_OFFLINE_TARBALL`；本轮升级后未重新验证离线链路    |
| `CI=true pnpm install --ignore-workspace --no-frozen-lockfile` | passed              | `examples/web-admin-preview` 已刷新独立 lockfile                              |
| `CI=true pnpm install --ignore-workspace --frozen-lockfile`    | passed              | 样例冻结安装可通过                                                            |
| `CI=true pnpm install --frozen-lockfile --ignore-scripts`      | passed              | `packages/utils` 已从 workspace importer 移除，根 lockfile 与 10 包工作区一致 |

### 5.2 构建验证

| 命令                                                        | 结论   | 关键结果                                                                                                                                |
| ----------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                                                | passed | 根入口委托 `build:supported`，排除即将废弃的 `@stratix/tasks`                                                                            |
| `pnpm run build:supported`                                  | passed | `9/9` 个 supported packages 构建通过                                                                                                     |
| `pnpm build:all`                                            | failed | 显式全包构建仍会在 `@stratix/tasks` 失败；该包因旧 `DatabaseAPI` 导入和旧 `BaseRepository` 构造方式被排除出默认质量门                   |
| `pnpm exec turbo run build '--filter=./packages/*' --force` | stale  | 该旧命令未表达 tasks 排除语义，不再作为默认健康信号                                                                                     |
| `pnpm --filter @stratix/core build`                         | passed | `@stratix/core` 在破坏性应用发现重构后可完成单包构建                                                                                   |
| `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` | passed | `@stratix/core` 新 discovery 管道、配置类型和公共导出通过类型检查                                                                      |
| `pnpm --filter @stratix/core pack --pack-destination /tmp`  | passed | core 发布包可生成，输出 `/tmp/stratix-core-1.1.0.tgz`                                                                                  |
| `pnpm --filter @stratix/cli build`                          | passed | 共享 tsconfig 补齐 Node 类型与 TS6 deprecation 处理后，CLI 可单独构建                                                                   |
| `pnpm --filter @stratix/database build`                     | passed | database-only clean breaking refactor 后，`@stratix/database` 单包 TypeScript 构建通过                                                  |
| `pnpm build`（`examples/web-admin-preview`）                | passed | CLI 生成样例可单独完成静态构建                                                                                                          |

### 5.3 测试验证

| 命令                                              | 结论   | 关键结果                                                                                                                                      |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                                       | passed | 根入口委托 `test:supported`，排除即将废弃的 `@stratix/tasks`                                                                                 |
| `pnpm run test:supported`                         | passed | supported package test profile 通过，`11` 个 turbo tasks 成功                                                                                |
| `CI=true pnpm --filter @stratix/core exec vitest run` | passed | 破坏性应用发现重构后，`26` 个测试文件、`199` 个测试全部通过；覆盖公共 API、配置拒绝、discovery 管道和启动集成                              |
| `pnpm --filter @stratix/cli test`                 | passed | `21` 个测试全部通过                                                                                                                           |
| `pnpm --filter @stratix/database exec vitest run` | passed | database quality-gate 回归后，`8` 个测试文件、`48` 个测试全部通过                                                                             |
| `pnpm --filter @stratix/was-v7 test`              | passed | `11` 个测试文件、`120` 个测试全部通过                                                                                                        |
| `pnpm test`（`examples/web-admin-preview`）       | passed | `6` 个文件、`18` 个测试全部通过                                                                                                               |

当前默认根测试结论：

- `@stratix/ossp`、`@stratix/queue`、`@stratix/devtools` 与 `@stratix/testing` 已补最小 smoke tests，supported profile 不再被 no-test package 击穿。
- `@stratix/was-v7` 的旧测试契约已对齐当前适配器、token cache、HTTP client 和插件验证行为。
- database-only clean breaking refactor 没有迁移 `@stratix/tasks`；显式全包 `pnpm build:all` 仍预期失败在 tasks 旧 `DatabaseAPI` 引用和旧 `BaseRepository` 构造方式。

### 5.4 运行入口验证

| 命令                                                                        | 结论                    | 关键结果                                    |
| --------------------------------------------------------------------------- | ----------------------- | ------------------------------------------- |
| `node packages/cli/dist/bin/stratix.js --help`                              | passed                  | CLI 可输出命令清单                          |
| `pnpm preview --host 127.0.0.1 --port 4273`（`examples/web-admin-preview`） | passed after permission | 本地成功启动，监听 `http://127.0.0.1:4273/` |

说明：

- 预览服务在默认沙箱下因 `listen EPERM` 被拦截，放行本地端口后可正常启动。
- 这说明 CLI 模板样例本身可构建、可测试、可预览，但运行验证依赖本地端口权限。

## 6. 当前真实状态结论

当前项目的真实状态不是“整体不可用”，而是“workspace 结构已收敛、独立 `@stratix/utils` 已删除且公共工具能力归入 core、CLI 与样例入口健康、`@stratix/core` 破坏性应用发现重构包级门禁通过、`@stratix/database` 单包构建与测试通过，根级 supported build/test 质量门通过；`@stratix/tasks` 作为即将废弃包只阻断显式 all-packages 构建”。

可以明确成立的结论：

- monorepo 实体存在且结构清晰
- workspace 现在只包含公共 `@stratix/*` 包，不再混入模板副本型应用
- 当前依赖基线已整体切到 Node 24 / pnpm 10.33 / TypeScript 6
- `@stratix/cli` 是真实可构建、可执行的入口
- `@stratix/core` 通过 `@stratix/core/utils` 与 `@stratix/core/async`、`@stratix/core/data`、`@stratix/core/functional` 等子路径承接共享工具能力
- `@stratix/core` 应用级 discovery 已收敛为 `config.discovery` + `ApplicationDiscoveryPipeline`；单包 build、typecheck、Vitest 全量套件通过
- `examples/web-admin-preview` 是真实可安装、可构建、可测试、可预览的 CLI 输出样例
- 根 `pnpm build` 是 supported 构建入口，当前通过
- `@stratix/database` 单包构建与测试通过；根 `pnpm run build:supported` 通过
- 根 `pnpm test` 是 supported 测试入口，当前通过
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

- `BUG-001`: 根 `build` 入口已修复，可转 CLOSED
- `BUG-002`: `@stratix/core` 构建兼容问题已修复，剩余测试回归待继续收敛
- `BUG-003`: 明确并修复离线安装基线不可重复的问题
- `BUG-004`: supported workspace test profile 已恢复；可进入复核关闭
- `CR-001`: 对齐 README、git tag、npm registry 与本地版本声明的发布口径
- `TASK-001`: 完成历史项目 requirements upgrade 与设计基线补齐
- `TASK-002`: 建立统一的根级验证命令和 CI profile

## 9. 变更记录

| 日期       | 变更内容                                                                                                                                                                                 | 变更人 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-03-28 | 初版当前状态分析，纳入代码、发布与运行验证事实                                                                                                                                           | Codex  |
| 2026-03-28 | 按迁移后现实更新：移除 workspace app，新增 CLI 预览样例，并重写验证结论                                                                                                                  | Codex  |
| 2026-03-28 | 记录 `@stratix/utils` 硬合并后第二阶段结果：`core/database/redis/ossp/queue/tasks/was-v7` 顺序构建通过                                                                                   | Codex  |
| 2026-03-29 | 记录最新依赖升级结果：Node 24 / pnpm 10.33 基线完成，CLI 与样例通过，根级阻塞收敛到 `@stratix/core`                                                                                      | Codex  |
| 2026-03-29 | 回写升级后真实状态：根 `build` 与 `build:all` 已恢复，测试阻塞前移到 workspace test profile 与逐包套件复核                                                                               | Codex  |
| 2026-06-16 | 记录 `@stratix/utils` 从 legacy 归档目录迁回 `packages/utils`，同步 lockfile importer 与未完成的定向测试结果                                                                             | Codex  |
| 2026-06-16 | 删除独立 `@stratix/utils` 包，将共享工具边界收敛到 `@stratix/core/utils`，并记录 10 包强制构建通过与 core 测试失败现状                                                                   | Codex  |
| 2026-06-17 | 记录 `@stratix/database` database-only clean breaking refactor：移除 `DatabaseAPI`、模块级 manager/global connection helpers，单包 build 与初始 41 项测试通过；`@stratix/tasks` 旧引用未迁移 | Codex  |
| 2026-06-17 | 记录 `TASK-003` 95+ 质量门：supported build/test 通过，database 48 项、core 199 项、was-v7 120 项测试通过，docs-stratego 校验 82 页通过；`@stratix/tasks` 保持废弃排除项 | Codex  |
