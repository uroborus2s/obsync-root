# 当前状态分析

**项目名称：** stratix框架以及生态  
**文档状态：** 已发布  
**负责人：** 仓库维护者  
**主要读者：** 架构 | 开发 | QA | 发布维护者  
**上游输入：** 现有代码 | `package.json` | 包 README | git tags | npm registry | 命令验证  
**下游输出：** PRD | 需求分析 | 技术选型 | 实施计划  
**关联 ID：** `REQ-001`, `REQ-002`, `BUG-001`, `BUG-002`, `BUG-003`, `BUG-004`, `CR-001`  
**最后更新：** 2026-06-18

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

当前仓库不是根 README 描述的旧四包结构，也不再包含 workspace 应用。当前真实形态是 11 个公共包，以及 1 个非 workspace 的 create/forge 预览样例。

| 单元                         | 类型    |      当前版本 | 公开性        | 主要职责                                                                                              | 关键内部依赖                         |
| ---------------------------- | ------- | ------------: | ------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `@stratix/create`            | package |         1.1.0 | public        | 轻量应用/插件创建入口；只负责 app/plugin/template 创建，不承载项目生命周期命令                        | -                                    |
| `@stratix/core`              | package |         1.1.0 | public        | Fastify runtime、DI、discovery、装饰器，并内聚通用 utilities 导出面                                   | -                                    |
| `@stratix/database`          | package |         1.1.0 | public        | repository-first 数据库插件                                                                           | `@stratix/core`                      |
| `@stratix/devtools`          | package |  1.0.0-beta.1 | public        | 开发观测与辅助工具                                                                                    | `@stratix/core`                      |
| `@stratix/forge`             | package |         1.1.0 | public        | 项目内工程中枢：generate、doctor、di graph、OpenAPI/typed client、start、config；自身保持零运行时依赖 | -                                    |
| `@stratix/ossp`              | package |  0.0.1-beta.3 | public        | 对象存储插件                                                                                          | `@stratix/core`                      |
| `@stratix/queue`             | package |  1.0.0-beta.2 | public        | 队列插件                                                                                              | `@stratix/core`, `@stratix/redis`    |
| `@stratix/redis`             | package |  1.0.0-beta.2 | public        | Redis 插件                                                                                            | `@stratix/core`                      |
| `@stratix/tasks`             | package |  1.0.0-beta.5 | public        | 1.1.x 正式冻结/废弃包；不进入默认质量门、发布门禁或新项目推荐路径                                     | `@stratix/core`, `@stratix/database` |
| `@stratix/testing`           | package |  1.0.0-beta.1 | public        | 官方测试平台入口，已具备 smoke 与 `contractTest()` 基线                                               | `@stratix/core`                      |
| `@stratix/was-v7`            | package | 1.0.0-beta.36 | public        | WPS WAS V7 集成插件                                                                                   | `@stratix/core`, `@stratix/redis`    |
| `examples/web-admin-preview` | sample  |     generated | private/local | `web-admin` 模板预览样例，不参与 workspace 发布面                                                     | -                                    |

附加事实：

- `apps/admin-dashboard` 已从 workspace 移除并删除。
- `@stratix/utils` 已从当前 workspace 删除；async、data、functional、environment、context、auth 等共享工具由 `@stratix/core/utils` 及 core 子路径承接。
- 预览样例由 create/forge 模板链路生成到 `examples/web-admin-preview`，用于验证模板输出，不代表正式产品模块。
- 当前依赖基线已整体刷新到 Node `24.14.1` / pnpm `10.33.0`。
- `@stratix/core` Phase 1 概念模型重构已落地：executor decorator、metadata、discovery 分支、plugin registration、公有导出全部删除；create/forge 中 executor 与 plugin-executor 生成入口和模板也已删除。
- `@stratix/core` Phase 2 基础能力已落地：route contract 提取、contract 诊断、OpenAPI 文档生成、DI graph、DI diagnostics、discovery 注册 metadata 记录进入 core 公有 API；`@stratix/forge` 新增 `doctor di` 与 `di graph`。
- Phase 2 扩展工作流已落地：`@stratix/forge` 新增零运行时依赖的 `openapi generate` 和 `openapi client`，`@stratix/testing` 新增 runner-neutral `contractTest()`，`@stratix/core` 新增插件 adapter token 诊断。
- Phase 5 生产能力已落地：`@stratix/core` 支持 production manifest 启动消费、manifest-driven registration、observability/security preset；`@stratix/devtools` 支持 production views；`@stratix/forge` 支持 project-scope `release gate`。
- Phase 6 发布准备门禁已落地：`@stratix/forge` 支持 `stratix release gate --scope workspace`，用于 monorepo supported packages 的 build/test/docs/pack/API/release-surface 执行；offline install 与 public npmjs exact-version reconciliation 可通过显式参数纳入门禁。
- `@stratix/create` 和 `@stratix/forge` 都不依赖 `@stratix/core`。创建项目时 create 把 `@stratix/core` 写入目标项目 dependencies，把 `@stratix/forge` 写入目标项目 devDependencies；`openapi generate` 执行时从目标项目解析 `typescript`，避免一次性创建入口承担 runtime/core/compiler 下载成本。
- `.stratix/project.json` 已升级为 `schemaVersion: 2`，作为 create/forge 交接契约：create 写入 template contribution 快照，forge 后续 `add/doctor` 只读项目 manifest、presets 和 resource templates，不再读取 app/plugin 创建模板。
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

发布信号在 2026-06-18 的真实情况如下：

| 包                  |  本地声明版本 | Phase 6 exact tag                | public npmjs                   | 判断                                     |
| ------------------- | ------------: | -------------------------------- | ------------------------------ | ---------------------------------------- |
| `@stratix/core`     |         1.1.0 | `@stratix/core@1.1.0`            | latest `0.8.2`；`1.1.0` 未发布 | exact tag 后可进入 public publish        |
| `@stratix/create`   |         1.1.0 | `@stratix/create@1.1.0`          | 404                            | 新增公开包；exact tag 后可首次发布       |
| `@stratix/forge`    |         1.1.0 | `@stratix/forge@1.1.0`           | 404                            | 新增公开工具链包；exact tag 后可首次发布 |
| `@stratix/database` |         1.1.0 | `@stratix/database@1.1.0`        | 404                            | exact tag 后可首次发布                   |
| `@stratix/devtools` |  1.0.0-beta.1 | `@stratix/devtools@1.0.0-beta.1` | 404                            | exact tag 后可首次发布                   |
| `@stratix/ossp`     |  0.0.1-beta.3 | `@stratix/ossp@0.0.1-beta.3`     | 404                            | exact tag 后可首次发布                   |
| `@stratix/queue`    |  1.0.0-beta.2 | `@stratix/queue@1.0.0-beta.2`    | 404                            | exact tag 后可首次发布                   |
| `@stratix/redis`    |  1.0.0-beta.2 | `@stratix/redis@1.0.0-beta.2`    | 404                            | exact tag 后可首次发布                   |
| `@stratix/tasks`    |  1.0.0-beta.5 | 不创建本轮 exact release tag     | 404                            | 1.1.x 冻结/废弃，不进入发布门禁          |
| `@stratix/testing`  |  1.0.0-beta.1 | `@stratix/testing@1.0.0-beta.1`  | 404                            | exact tag 后可首次发布                   |
| `@stratix/was-v7`   | 1.0.0-beta.36 | `@stratix/was-v7@1.0.0-beta.36`  | 404                            | exact tag 后可首次发布                   |

结论：

- public npmjs 上尚不存在本轮 supported package 的 exact versions；`@stratix/core` 只有历史公开版本 `0.8.2`。
- Phase 6 发布口径以本地 package manifest + final release commit exact git tags + public npmjs exact-version availability 为准。
- npm publish 仍是需要发布者凭证的外部操作，不由仓库重构自动执行。

## 5. 安装、构建、测试、运行验证

### 5.1 安装验证

| 命令                                                           | 结论   | 关键结果                                                                    |
| -------------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `CI=true pnpm install --no-frozen-lockfile`                    | passed | 根工作区已在最新依赖栈下刷新 lockfile                                       |
| `CI=true pnpm install --frozen-lockfile`                       | passed | 根工作区冻结安装在 pnpm `10.33.0` 下可通过                                  |
| `CI=true pnpm install --frozen-lockfile --offline`             | passed | 当前 pnpm store 下 frozen offline install 可重复通过                        |
| `CI=true pnpm install --ignore-workspace --no-frozen-lockfile` | passed | `examples/web-admin-preview` 已刷新独立 lockfile                            |
| `CI=true pnpm install --ignore-workspace --frozen-lockfile`    | passed | 样例冻结安装可通过                                                          |
| `CI=true pnpm install --frozen-lockfile --ignore-scripts`      | passed | `packages/utils` 已从 workspace importer 移除，根 lockfile 与当前工作区一致 |
| `pnpm install --lockfile-only --ignore-scripts`                | passed | lockfile 已接收 `packages/create` 新 importer 与 `packages/forge` 物理目录  |

### 5.2 构建验证

| 命令                                                             | 结论   | 关键结果                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                                                     | passed | 根入口委托 `build:supported`，排除即将废弃的 `@stratix/tasks`                                                                                                                                                                                                                                                 |
| `pnpm run build:supported`                                       | passed | `10/10` 个 supported packages 构建通过；包含 `@stratix/create` 与 `@stratix/forge`，排除 `@stratix/tasks`                                                                                                                                                                                                     |
| `pnpm build:all`                                                 | failed | 显式全包构建仍会在 `@stratix/tasks` 失败；该包因旧 `DatabaseAPI` 导入和旧 `BaseRepository` 构造方式被排除出默认质量门                                                                                                                                                                                         |
| `pnpm exec turbo run build '--filter=./packages/*' --force`      | stale  | 该旧命令未表达 tasks 排除语义，不再作为默认健康信号                                                                                                                                                                                                                                                           |
| `pnpm --filter @stratix/core build`                              | passed | `@stratix/core` 在新增 route contract/OpenAPI helpers、DI diagnostics、discovery DI metadata recording、adapter token diagnostics、统一错误 envelope、response schema failure 归一化、runtime production manifest consumption、manifest-driven registration 和 observability/security preset 后可完成单包构建 |
| `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` | passed | `@stratix/core` 新 discovery 管道、配置类型和公共导出通过类型检查                                                                                                                                                                                                                                             |
| `pnpm --filter @stratix/core pack --pack-destination /tmp`       | passed | core 发布包可生成，输出 `/tmp/stratix-core-1.1.0.tgz`；tarball 中无 executor 路径                                                                                                                                                                                                                             |
| `pnpm --filter @stratix/create build`                            | passed | create 作为轻量应用/插件创建入口可单独构建，且不依赖 runtime/core/compiler；plugin 项目生成 `.stratix/plugin.json`                                                                                                                                                                                            |
| `pnpm --filter @stratix/forge build`                             | passed | forge 在 `packages/forge` 下保留项目内 `doctor di`、`di graph`、`doctor modules`、`graph modules`、`doctor plugins`、`graph plugins`、`build-manifest`、`release gate`、OpenAPI 生成、高级 typed client、命令级 help routing 和显式 DI/schema 模板后可单独构建                                                |
| `pnpm --filter @stratix/database build`                          | passed | database-only clean breaking refactor 后，`@stratix/database` 单包 TypeScript 构建通过                                                                                                                                                                                                                        |
| `pnpm build`（`examples/web-admin-preview`）                     | passed | 生成样例可单独完成静态构建                                                                                                                                                                                                                                                                                    |

### 5.3 测试验证

| 命令                                                  | 结论   | 关键结果                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm test`                                           | passed | 根入口委托 `test:supported`，排除即将废弃的 `@stratix/tasks`                                                                                                                                                                                                                                                                                     |
| `pnpm run test:supported`                             | passed | supported package test profile 通过，`12` 个 turbo tasks 成功                                                                                                                                                                                                                                                                                    |
| `CI=true pnpm --filter @stratix/core exec vitest run` | passed | Phase 5 production baseline 后，`27` 个测试文件、`194` 个测试全部通过；覆盖 route contract/OpenAPI、统一错误 envelope、response schema failure 归一化、DI diagnostics、plugin adapter diagnostics、discovery schema validation、DI graph、production manifest startup consumption、manifest-driven registration 和 observability/security preset |
| `pnpm --filter @stratix/create test`                  | passed | `3` 个测试全部通过；覆盖 app/plugin 创建、plugin governance manifest、create 模板清单和目标项目 `@stratix/forge` devDependency 写入                                                                                                                                                                                                              |
| `pnpm --filter @stratix/forge test`                   | passed | `45` 个测试全部通过；覆盖 `doctor di`、`di graph`、`doctor modules`、`graph modules`、`doctor plugins`、`graph plugins`、`build-manifest`、project/workspace release gate、release pack artifact gate、registry exact-version gate、`openapi generate`、高级 `openapi client`、命令 help 和生成资源 DI/schema 检查                               |
| `pnpm --filter @stratix/devtools test`                | passed | `2` 个测试全部通过；覆盖 smoke export 和 production views：routes、DI、plugins、redacted config、health、traces                                                                                                                                                                                                                                  |
| `pnpm --filter @stratix/testing test`                 | passed | `3` 个测试文件、`12` 个测试全部通过；覆盖 smoke、`contractTest()`、共享错误 envelope schema、test app、DI override、plugin fixture、discovery fixture、repository fixture 和 module fixture                                                                                                                                                      |
| `pnpm --filter @stratix/database exec vitest run`     | passed | database quality-gate 回归后，`8` 个测试文件、`48` 个测试全部通过                                                                                                                                                                                                                                                                                |
| `pnpm --filter @stratix/was-v7 test`                  | passed | `11` 个测试文件、`120` 个测试全部通过                                                                                                                                                                                                                                                                                                            |
| `pnpm test`（`examples/web-admin-preview`）           | passed | `6` 个文件、`18` 个测试全部通过                                                                                                                                                                                                                                                                                                                  |

当前默认根测试结论：

- `@stratix/ossp`、`@stratix/queue`、`@stratix/devtools` 与 `@stratix/testing` 已补最小 smoke tests，supported profile 不再被 no-test package 击穿。
- `@stratix/was-v7` 的旧测试契约已对齐当前适配器、token cache、HTTP client 和插件验证行为。
- database-only clean breaking refactor 没有迁移 `@stratix/tasks`；显式全包 `pnpm build:all` 仍预期失败在 tasks 旧 `DatabaseAPI` 引用和旧 `BaseRepository` 构造方式。

### 5.4 运行入口验证

| 命令                                                                                                                                                                                                                                                                                                                                  | 结论                     | 关键结果                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `node packages/create/dist/bin/create-stratix.js --help`                                                                                                                                                                                                                                                                              | passed                   | create 可输出 app/plugin 创建命令帮助                                                                        |
| `node packages/create/dist/bin/create-stratix.js list templates`                                                                                                                                                                                                                                                                      | passed                   | create 只列出 app/plugin 创建模板                                                                            |
| `node packages/forge/dist/bin/stratix.js --help`                                                                                                                                                                                                                                                                                      | passed                   | forge 可输出项目内命令清单，且不再暴露 `init`                                                                |
| `node packages/forge/dist/bin/stratix.js init`                                                                                                                                                                                                                                                                                        | expected failure         | forge 拒绝旧创建入口，输出 `Unknown command: init`                                                           |
| `node packages/forge/dist/bin/stratix.js doctor di --help`                                                                                                                                                                                                                                                                            | passed                   | 构建产物暴露 DI doctor 子命令帮助                                                                            |
| `node packages/forge/dist/bin/stratix.js di graph --help`                                                                                                                                                                                                                                                                             | passed                   | 构建产物暴露 DI graph 子命令帮助                                                                             |
| `node packages/forge/dist/bin/stratix.js doctor modules --help`                                                                                                                                                                                                                                                                       | passed                   | 构建产物暴露 Module doctor 子命令帮助                                                                        |
| `node packages/forge/dist/bin/stratix.js graph modules --help`                                                                                                                                                                                                                                                                        | passed                   | 构建产物暴露 Module graph 子命令帮助                                                                         |
| `node packages/forge/dist/bin/stratix.js openapi generate --help`                                                                                                                                                                                                                                                                     | passed                   | 构建产物暴露 OpenAPI 生成命令帮助                                                                            |
| `node packages/forge/dist/bin/stratix.js openapi client --help`                                                                                                                                                                                                                                                                       | passed                   | 构建产物暴露 typed client 生成命令帮助                                                                       |
| `node packages/forge/dist/bin/stratix.js release gate --scope workspace --dry-run`                                                                                                                                                                                                                                                    | passed                   | 构建产物可输出 Phase 6 workspace 发布准备计划，包含 10 个 supported packages 并排除 tasks                    |
| `node packages/forge/dist/bin/stratix.js release gate --scope workspace --dry-run --include-offline-install --include-registry`                                                                                                                                                                                                       | passed                   | 构建产物可把 offline install 与 npm registry reconciliation 纳入 Phase 6 发布准备计划                        |
| `node packages/forge/dist/bin/stratix.js release gate --scope workspace`                                                                                                                                                                                                                                                              | pre-tag expected failure | 真实执行已通过 build、test、docs、pack、API；在最终 release commit exact tags 创建前只阻断于 release-surface |
| `node packages/forge/dist/bin/stratix.js list templates`                                                                                                                                                                                                                                                                              | passed                   | forge 只列出项目内 resource/module 生成模板，模板清单中不再包含 executor 或 plugin-executor 模板             |
| `node packages/forge/dist/bin/stratix.js list presets`                                                                                                                                                                                                                                                                                | passed                   | `tasks` preset 明确显示 deprecated，不作为新项目入口                                                         |
| `rg -n "@Executor\|EXECUTOR_METADATA_KEY\|registerTaskExecutor\|registerExecutorDomain\|processExecutorRegistration\|Executor\\b\|executors/\|plugin-executor\|performApplicationAutoDI\|applicationAutoDI\|discoverAndProcessApplicationModules\|generate executor\|createSafeExecutor\|executor" docs/03-developer-guide -g '*.md'` | passed                   | 开发者指南不再暴露已删除 executor/API 教程路径                                                               |
| `uvx --from docs-stratego docs-stratego source validate --repo-path .`                                                                                                                                                                                                                                                                | passed                   | 85 pages / 0 contracts                                                                                       |
| `git diff --check`                                                                                                                                                                                                                                                                                                                    | passed                   | 本阶段补丁无 whitespace 错误                                                                                 |
| `pnpm preview --host 127.0.0.1 --port 4273`（`examples/web-admin-preview`）                                                                                                                                                                                                                                                           | passed after permission  | 本地成功启动，监听 `http://127.0.0.1:4273/`                                                                  |

说明：

- 预览服务在默认沙箱下因 `listen EPERM` 被拦截，放行本地端口后可正常启动。
- 这说明 create/forge 模板样例本身可构建、可测试、可预览，但运行验证依赖本地端口权限。

## 6. 当前真实状态结论

当前项目的真实状态不是“整体不可用”，而是“workspace 结构已收敛、独立 `@stratix/utils` 已删除且公共工具能力归入 core、`@stratix/create` 与 `@stratix/forge` 边界清晰、`@stratix/core` 破坏性应用发现重构、Phase 1 executor 删除、Phase 2 Contract-first/DI doctor 基础能力和 OpenAPI/typed-client/contract-test/plugin-diagnostics 扩展工作流通过，Phase 3/4/5 的 module governance、testing platform 和 production baseline 已落地，Phase 6 发布准备门禁已把 workspace 级 supported build/test/docs/pack/API/release-surface/offline/registry 串成可重复流程，`@stratix/database` 单包构建与测试通过，根级 supported build/test 质量门通过；`@stratix/tasks` 作为 1.1.x 冻结/废弃包只阻断显式 all-packages 构建”。

可以明确成立的结论：

- monorepo 实体存在且结构清晰
- workspace 现在只包含公共 `@stratix/*` 包，不再混入模板副本型应用
- 当前依赖基线已整体切到 Node 24 / pnpm 10.33 / TypeScript 6
- `@stratix/create` 是真实可构建、可执行的轻量创建入口
- `@stratix/forge` 是真实可构建、可执行的项目内工程入口
- `@stratix/core` 通过 `@stratix/core/utils` 与 `@stratix/core/async`、`@stratix/core/data`、`@stratix/core/functional` 等子路径承接共享工具能力
- `@stratix/core` 应用级 discovery 已收敛为 `config.discovery` + `ApplicationDiscoveryPipeline`；executor 不再属于 core 生产概念面；单包 build、typecheck、Vitest 全量套件通过
- `@stratix/core` 已提供 route contract extraction、contract diagnostics、OpenAPI document generation、DI graph 和 DI diagnostics 的基础 API；应用 discovery 注册时记录 DI metadata。
- `@stratix/core` 已提供统一错误 envelope 契约，导出 `ERROR_ENVELOPE_SCHEMA` 与 `createErrorEnvelope()`，bootstrap 对请求校验错误、404 和 response schema 序列化失败使用同一 envelope。
- `@stratix/core` 已提供 plugin adapter token 诊断，能报告重复 adapter name 与根容器 token 冲突。
- `@stratix/core` 已提供 Phase 5 production baseline：`discovery.productionManifest` 可在启动期读取并校验 `.stratix/production-manifest.json`，把 artifact 暴露到应用实例，在 `skipRuntimeDiscovery: true` 时跳过应用级 runtime glob discovery，并在 `registerFromManifest: true` 时按 manifest source files 注册 DI 和路由；`config.observability` 提供 request/trace id、health、metrics、traces；`config.security` 提供 body limit、CORS、headers 和 rate limit。
- `@stratix/devtools` 已提供 production views：routes、DI、plugins、redacted config、health 和 traces。
- `@stratix/forge` 已提供 `stratix doctor di`、`stratix di graph --format json|mermaid`、`stratix doctor plugins`、`stratix graph plugins --format json|mermaid`、`stratix build-manifest`、project/workspace scope `stratix release gate`、`stratix openapi generate` 和支持 response types、path/query/body/header 参数、auth provider、hooks 的 `stratix openapi client`；API/resource 模板开始输出显式 `@Service()`、`@Repository()`、operationId 与 response schema。
- `@stratix/create` 与 `@stratix/forge` 自身仍保持零运行时依赖；create 生成出的目标项目依赖 `@stratix/core` 并把 `@stratix/forge` 作为 devDependency，但 create/forge 包不依赖任何项目包。
- `@stratix/testing` 已提供 `contractTest()` 基线，可基于 route contract 验证 app.inject 响应状态和 schema。
- `examples/web-admin-preview` 是真实可安装、可构建、可测试、可预览的模板输出样例
- 根 `pnpm build` 是 supported 构建入口，当前通过
- `@stratix/database` 单包构建与测试通过；根 `pnpm run build:supported` 通过
- 根 `pnpm test` 是 supported 测试入口，当前通过
- Phase 6 workspace release gate 已将 supported build/test/docs/pack/API/release-surface/offline/registry 串成可重复发布准备门禁
- 离线安装已恢复可重复验证；public npmjs exact-version registry gate 已纳入发布准备流程

## 7. 对当前阶段的判断

建议把软件工厂当前阶段定为 `PHASE_6_RELEASE_READY`。

理由：

- Phase 1-5 的 core/runtime/tooling 能力已完成并通过对应包级验证
- Phase 6 已提供真实 workspace release gate，并覆盖 supported build/test/docs/pack/API/release-surface/offline/registry
- `@stratix/tasks` 已明确为 1.1.x 冻结/废弃包，不再作为本轮发布阻断项
- npm publish 仍是外部凭证操作，不属于仓库内重构交付物

发布操作前至少需要完成：

- 在最终 release-readiness commit 上创建 10 个 supported package exact tags
- 执行 `node packages/forge/dist/bin/stratix.js release gate --scope workspace --include-offline-install --include-registry`
- 由维护者使用 npm 凭证执行 public npm publish

## 8. 首批建议工作项

- `BUG-001`: 根 `build` 入口已修复，可转 CLOSED
- `BUG-002`: `@stratix/core` 构建兼容问题已修复，剩余测试回归待继续收敛
- `BUG-003`: 离线安装基线已恢复，可转 CLOSED
- `BUG-004`: supported workspace test profile 已恢复；可进入复核关闭
- `CR-001`: README、exact tag 规则、public npmjs registry 事实与本地版本声明已对齐，可转 CLOSED
- `TASK-001`: 完成历史项目 requirements upgrade 与设计基线补齐
- `TASK-002`: 建立统一的根级验证命令和 CI profile

## 9. 变更记录

| 日期       | 变更内容                                                                                                                                                                                                       | 变更人 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-03-28 | 初版当前状态分析，纳入代码、发布与运行验证事实                                                                                                                                                                 | Codex  |
| 2026-03-28 | 按迁移后现实更新：移除 workspace app，新增模板预览样例，并重写验证结论                                                                                                                                         | Codex  |
| 2026-03-28 | 记录 `@stratix/utils` 硬合并后第二阶段结果：`core/database/redis/ossp/queue/tasks/was-v7` 顺序构建通过                                                                                                         | Codex  |
| 2026-03-29 | 记录最新依赖升级结果：Node 24 / pnpm 10.33 基线完成，工具链与样例通过，根级阻塞收敛到 `@stratix/core`                                                                                                          | Codex  |
| 2026-03-29 | 回写升级后真实状态：根 `build` 与 `build:all` 已恢复，测试阻塞前移到 workspace test profile 与逐包套件复核                                                                                                     | Codex  |
| 2026-06-16 | 记录 `@stratix/utils` 从 legacy 归档目录迁回 `packages/utils`，同步 lockfile importer 与未完成的定向测试结果                                                                                                   | Codex  |
| 2026-06-16 | 删除独立 `@stratix/utils` 包，将共享工具边界收敛到 `@stratix/core/utils`，并记录 10 包强制构建通过与 core 测试失败现状                                                                                         | Codex  |
| 2026-06-17 | 记录 `@stratix/database` database-only clean breaking refactor：移除 `DatabaseAPI`、模块级 manager/global connection helpers，单包 build 与初始 41 项测试通过；`@stratix/tasks` 旧引用未迁移                   | Codex  |
| 2026-06-17 | 记录 `TASK-003` 95+ 质量门：supported build/test 通过，database 48 项、core 199 项、was-v7 120 项测试通过，docs-stratego 校验 82 页通过；`@stratix/tasks` 保持废弃排除项                                       | Codex  |
| 2026-06-17 | 记录 Core 概念模型最终决策：`executor` 从 core 破坏性删除且不保留兼容层，`@stratix/tasks` 保持冻结/待废弃，Module 定义为代码项目治理边界；docs-stratego 校验 84 页通过                                         | Codex  |
| 2026-06-17 | 将 Core 概念模型文档扩展为完整演进方案：纳入应用启动流程、服务/接口/注入链路、应用级 discovery 新旧管道、生产级 Node.js 框架演进方向、分项评分和任务计划；docs-stratego 校验 84 页通过                         | Codex  |
| 2026-06-18 | 执行 Core 概念模型 Phase 1：删除 core executor decorator、metadata、discovery、plugin registration、公有导出和旧工具链 executor 生成模板；core 24/175 测试、工具链 21 项测试、supported build/test 均通过      | Codex  |
| 2026-06-18 | 执行 Phase 2 基础能力：新增 route contract/OpenAPI helpers、DI graph/diagnostics、`doctor di`、`di graph` 和显式 DI 模板；core 26/182 测试、工具链 27 项测试、supported build/test 均通过                      | Codex  |
| 2026-06-18 | 执行 Phase 2 扩展工作流：新增零依赖 OpenAPI forge command、typed client、`@stratix/testing` `contractTest()` 和 core plugin adapter token diagnostics；core 26/184 测试、forge 31 项测试、testing 2/5 测试通过 | Codex  |
| 2026-06-18 | 执行 create/forge 工具边界拆分：新增 `@stratix/create`，将本地项目工具包更名为 `@stratix/forge`，创建入口从 forge 中移除；supported build 10/10、supported test 12 tasks 通过                                  | Codex  |
| 2026-06-18 | 继续 Phase 2/3 Contract-first 闭环：新增统一错误 envelope schema/factory、bootstrap response schema failure 归一化和 `contractTest()` 错误响应 schema 复用；core 27/188 测试、testing 2/6 测试通过             | Codex  |
| 2026-06-18 | 完成 Phase 5 runtime production manifest consumption 最小基线：`@stratix/core` 支持 `discovery.productionManifest` 启动读取、严格校验、暴露 artifact，并可跳过 runtime glob discovery；core 27/191 测试通过    | Codex  |
| 2026-06-18 | 完成 Phase 5 production baseline：manifest-driven registration、observability/security preset、DevTools production views 与 release gate；core 27/194、devtools 2、forge 39 项测试通过                         | Codex  |
| 2026-06-18 | 进入 Phase 6 发布准备门禁：新增 `stratix release gate --scope workspace --dry-run`，forge 41 项测试通过                                                                                                        | Codex  |
| 2026-06-18 | 完成 Phase 6 发布准备门禁：offline install 通过，release gate pack artifact 与 public npmjs exact-version registry gate 落地，forge 45 项测试通过，`@stratix/tasks` 固定为 1.1.x 冻结/废弃包                   | Codex  |
