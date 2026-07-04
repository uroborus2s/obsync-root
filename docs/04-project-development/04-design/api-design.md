# API 与外部接口面概览

**项目名称：** stratix框架以及生态  
**文档状态：** 草稿  
**负责人：** 仓库维护者  
**主要读者：** 架构 | 开发 | 维护者  
**上游输入：** 当前状态分析 | 技术选型  
**下游输出：** 实施计划 | 发布计划 | 用户指南  
**关联 ID：** `API-001` ~ `API-018`
**最后更新：** 2026-07-04

## 1. 当前对外接口面

| ID        | 接口面                                  | 形态                                       | 当前状态                                                                                      |
| --------- | --------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `API-001` | `create-stratix`                        | 命令行                                     | 已验证可执行；`@stratix/create` 只负责 app/plugin 创建且保持零运行时依赖                      |
| `API-002` | 公共 npm 包导出                         | package exports                            | 已通过 public API contract、pack artifact gate 和 release-surface gate 管控；npm publish 仍是发布前外部动作 |
| `API-003` | `examples/web-admin-preview`            | Web UI sample                              | 已验证可构建、可预览                                                                          |
| `API-004` | 生态插件 token                          | 根容器 adapter token                       | 依赖各插件内部实现与 README                                                                   |
| `API-005` | Route contract API                      | `@stratix/core` public functions           | Phase 2 基础能力已实现                                                                        |
| `API-006` | DI diagnostics API                      | `@stratix/core` public functions + forge   | Phase 2 基础能力已实现                                                                        |
| `API-007` | OpenAPI forge command                   | `stratix openapi generate`                 | Phase 2 扩展能力已实现                                                                        |
| `API-008` | Typed client generator                  | `stratix openapi client`                   | Phase 2 扩展能力已实现；支持 path/query/body/header 参数、auth provider 和 hooks              |
| `API-009` | Contract test DSL                       | `@stratix/testing` `contractTest()`        | Phase 2 扩展能力已实现                                                                        |
| `API-010` | Plugin adapter diagnostics              | `@stratix/core` public functions           | Phase 2 扩展能力已实现                                                                        |
| `API-011` | Plugin manifest governance              | `.stratix/plugin.json` + forge             | 已完成；`doctor plugins` / `graph plugins` 可用，并校验 adapter-backed `provides`             |
| `API-012` | Production manifest artifact            | `stratix build-manifest`                   | 已完成基线；生成 route/DI/module/plugin-lock artifact                                         |
| `API-013` | Runtime production manifest consumption | `discovery.productionManifest`             | 已完成；启动期读取 artifact、跳过 runtime glob discovery，并支持 manifest-driven registration |
| `API-014` | Observability/Security preset           | `config.observability` / `config.security` | 已完成；提供 request/trace id、health/readiness/liveness、provider 扩展点、CORS、headers、rate limit、body limit |
| `API-015` | DevTools production views               | `@stratix/devtools`                        | 已完成；展示 routes、DI、plugins、redacted config、health、traces                             |
| `API-016` | Release gate                            | `stratix release gate`                     | Project scope 与 workspace scope 均已完成；workspace gate 覆盖 offline install、build/test/docs/security/pack/API/release-surface/registry |
| `API-017` | `stratix` 项目工程 CLI                  | 命令行                                     | `@stratix/forge` 负责 project-local generate、doctor、graph、openapi、build-manifest、release、start、config、list |
| `API-018` | `.stratix/project.json`                 | create/forge handoff manifest              | schemaVersion 2 已作为 create 输出和 forge 读取的交接契约 |

## 2. CLI 接口矩阵

| CLI | 命令 | 职责 | 约束 |
|---|---|---|---|
| `create-stratix` | `app <type> <name>` | 创建 Stratix 应用项目 | 只做一次性创建，不承载项目内 generate/doctor/openapi/release |
| `create-stratix` | `plugin <type> <name>` | 创建 Stratix 插件项目 | 可通过 `--preset` 组合预设；废弃 preset 必须显式 `--allow-deprecated` |
| `create-stratix` | `list templates` / `list presets` | 查看可创建模板和 preset | 以 `@stratix/create` 模板目录为事实源 |
| `stratix` | `generate <resource> <name>` | 在项目内生成 controller/service/repository/module/admin 资源 | 默认拒绝覆盖已有文件；覆盖必须显式 `--force` |
| `stratix` | `doctor` / `doctor di` / `doctor modules` / `doctor plugins` | 校验项目结构、DI、模块和插件 manifest | 读取目标项目 `.stratix/project.json` 或 `.stratix/plugin.json` |
| `stratix` | `di graph` / `graph modules` / `graph plugins` | 输出 DI、模块或插件拓扑 | `graph` 支持 `json` / `mermaid` |
| `stratix` | `openapi generate` / `openapi client` | 从 route schema 生成 OpenAPI 或 typed client | 从目标项目源码与 OpenAPI JSON 读取，不依赖 forge 自身绑定 core |
| `stratix` | `build-manifest` | 生成 `.stratix/production-manifest.json` | 默认 schema v2，记录 route/DI/module/plugin-lock 和 artifact hash |
| `stratix` | `release gate` | 执行项目级或 workspace 发布门禁 | workspace scope 可加入 `--include-offline-install` 与 `--include-registry` |
| `stratix` | `start` | 启动 Stratix 应用 | 用于项目本地运行入口，不替代发布门禁 |
| `stratix` | `config encrypt/decrypt/validate/generate-key` | 管理敏感配置加密与校验 | 密钥和输出文件由调用方显式传入 |
| `stratix` | `list` | 查看 forge 可用模板与 preset | 用于项目维护，不创建 app/plugin |

## 3. 当前缺口

- 对外 GA 口径仍缺 npm publish 证据；当前 public npmjs exact versions 返回 404 只能证明版本未占用。
- exact release tags 必须在最终发布 commit 上重新确认并推送到 origin。
- public-subpath 覆盖深度、长周期可靠性/性能回归仍是后续质量提升项，不阻塞当前 CLI 接口基线收口。

## 4. 当前建议

- 把 create、forge、公共包导出和私有应用入口视为不同接口面分别治理。
- 将 route schema 作为接口契约源，通过 `getControllerRouteContracts()`、`validateRouteContracts()` 和 `generateOpenApiDocument()` 逐步驱动 OpenAPI、typed client 与 contract tests。
- 将 DI token graph 作为架构诊断接口面，通过 `stratix doctor di` 和 `stratix di graph` 进入 forge 质量门。
- `@stratix/create` 与 `@stratix/forge` 不依赖 `@stratix/core` 或任何项目包。create 创建项目时把 `@stratix/core` 写入目标项目依赖，把 `@stratix/forge` 写入目标项目 devDependency；OpenAPI 源码分析执行时从目标项目解析 `typescript`。
- 单应用发布前使用 `stratix release gate --manifest <file>`；monorepo 发布准备使用 `stratix release gate --scope workspace`，可按需加入 `--include-offline-install` 和 `--include-registry`。

## 5. 变更记录

| 日期       | 变更内容                                                                                                                   | 变更人 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-03-28 | API 面概览初版                                                                                                             | Codex  |
| 2026-06-18 | 记录 Phase 2 Route contract 与 DI diagnostics 公共 API 面                                                                  | Codex  |
| 2026-06-18 | 记录 Phase 2 扩展 API 面：OpenAPI forge command、typed client、contractTest 和 plugin adapter diagnostics                  | Codex  |
| 2026-06-18 | 将工具接口面拆分为 `@stratix/create` 创建入口与 `@stratix/forge` 项目工程入口                                              | Codex  |
| 2026-06-18 | 记录 Plugin manifest governance 与 Production manifest artifact API 面                                                     | Codex  |
| 2026-06-18 | 记录 Runtime production manifest consumption 配置面                                                                        | Codex  |
| 2026-06-18 | 记录 Phase 5 Observability/Security preset、DevTools production views、Release gate 与 manifest-driven registration API 面 | Codex  |
| 2026-06-18 | 记录 Phase 6 workspace release gate API 面                                                                                 | Codex  |
| 2026-07-04 | 补齐 create/forge CLI 接口矩阵，更新 API 缺口为发布外部证据和后续质量提升项                                               | Codex  |
