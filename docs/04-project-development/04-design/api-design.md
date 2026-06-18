# API 与外部接口面概览

**项目名称：** stratix框架以及生态  
**文档状态：** 草稿  
**负责人：** 仓库维护者  
**主要读者：** 架构 | 开发 | 维护者  
**上游输入：** 当前状态分析 | 技术选型  
**下游输出：** 实施计划 | 发布计划 | 用户指南  
**关联 ID：** `API-001` ~ `API-004`  
**最后更新：** 2026-06-18

## 1. 当前对外接口面

| ID        | 接口面                                  | 形态                                       | 当前状态                                                                                      |
| --------- | --------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `API-001` | `create-stratix`                        | 命令行                                     | 已验证可执行；`@stratix/create` 只负责 app/plugin 创建且保持零运行时依赖                      |
| `API-002` | 公共 npm 包导出                         | package exports                            | 存在，但发布面未统一                                                                          |
| `API-003` | `examples/web-admin-preview`            | Web UI sample                              | 已验证可构建、可预览                                                                          |
| `API-004` | 生态插件 token                          | 根容器 adapter token                       | 依赖各插件内部实现与 README                                                                   |
| `API-005` | Route contract API                      | `@stratix/core` public functions           | Phase 2 基础能力已实现                                                                        |
| `API-006` | DI diagnostics API                      | `@stratix/core` public functions + forge   | Phase 2 基础能力已实现                                                                        |
| `API-007` | OpenAPI forge command                   | `stratix openapi generate`                 | Phase 2 扩展能力已实现                                                                        |
| `API-008` | Typed client generator                  | `stratix openapi client`                   | Phase 2 扩展能力已实现；支持 path/query/body/header 参数、auth provider 和 hooks              |
| `API-009` | Contract test DSL                       | `@stratix/testing` `contractTest()`        | Phase 2 扩展能力已实现                                                                        |
| `API-010` | Plugin adapter diagnostics              | `@stratix/core` public functions           | Phase 2 扩展能力已实现                                                                        |
| `API-011` | Plugin manifest governance              | `.stratix/plugin.json` + forge             | 已完成基线；`doctor plugins` / `graph plugins` 可用                                           |
| `API-012` | Production manifest artifact            | `stratix build-manifest`                   | 已完成基线；生成 route/DI/module/plugin-lock artifact                                         |
| `API-013` | Runtime production manifest consumption | `discovery.productionManifest`             | 已完成；启动期读取 artifact、跳过 runtime glob discovery，并支持 manifest-driven registration |
| `API-014` | Observability/Security preset           | `config.observability` / `config.security` | 已完成；提供 request/trace id、health、metrics、traces、CORS、headers、rate limit、body limit |
| `API-015` | DevTools production views               | `@stratix/devtools`                        | 已完成；展示 routes、DI、plugins、redacted config、health、traces                             |
| `API-016` | Release gate                            | `stratix release gate`                     | Phase 5 project scope 已完成；Phase 6 workspace scope 已进入开发                              |

## 2. 当前缺口

- 尚无统一的顶层 API 契约文档
- 各生态包大多只有各自 README，缺少仓级接口视图
- 包导出版本与 registry / tag 的外部可见版本不一致
- Module governance tooling 已有 `generate module` / `doctor modules` / `graph modules` 基线；Plugin manifest、Production manifest artifact、Runtime manifest consumption、manifest-driven registration、Observability/Security preset、DevTools production views 和 Release gate project scope 已有 Phase 5 基线
- Phase 6 已开始补 workspace release gate，用于 monorepo supported packages 的 build/test/docs/pack/API/release-surface 发布准备门禁

## 3. 当前建议

- 把 create、forge、公共包导出和私有应用入口视为不同接口面分别治理。
- 将 route schema 作为接口契约源，通过 `getControllerRouteContracts()`、`validateRouteContracts()` 和 `generateOpenApiDocument()` 逐步驱动 OpenAPI、typed client 与 contract tests。
- 将 DI token graph 作为架构诊断接口面，通过 `stratix doctor di` 和 `stratix di graph` 进入 forge 质量门。
- `@stratix/create` 与 `@stratix/forge` 不依赖 `@stratix/core` 或任何项目包。create 创建项目时把 `@stratix/core` 写入目标项目依赖，把 `@stratix/forge` 写入目标项目 devDependency；OpenAPI 源码分析执行时从目标项目解析 `typescript`。
- 单应用发布前使用 `stratix release gate --manifest <file>`；monorepo 发布准备使用 `stratix release gate --scope workspace`，可按需加入 `--include-offline-install` 和 `--include-registry`。

## 4. 变更记录

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
