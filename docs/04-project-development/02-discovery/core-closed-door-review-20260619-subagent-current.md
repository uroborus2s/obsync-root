# @stratix/core 三角色闭门评审报告

## 文档元数据

| 字段 | 内容 |
| --- | --- |
| 文档编号 | CR-CORE-SUBAGENT-REVIEW-20260619 |
| 评审对象 | `@stratix/core` 后端框架 |
| 评审日期 | 2026-06-19 |
| 评审方式 | 高级技术经理、高级测试经理、高级框架架构师三个子 agent 闭门评审，主线程复核代码和门禁证据 |
| 评审基线 | 分支 `1.1.0`，工作区当前状态 |
| 结论等级 | 可进入 RC / controlled release；不建议按高置信 GA 宣称 |
| 综合风险评分 | 82 / 100 |

> 2026-06-20 更新：本文件保留 2026-06-19 闭门评审原始基线。后续本地开发硬化已解决或缓解多项 P1/P2：root API 分层、`./plugin`/`./contracts`/`./diagnostics`/`./internal` 子路径、`HttpError` 公共导出、AutoDI fail-fast 与 strict 正/负路径、`close()`/`stop()` 生命周期一致、strict `compiledOnly` manifest、requestId/traceId 一致性、DI graph confidence、prefix-aware route contracts、`ApplicationBootstrap` request/observability/security 拆分、config schema 去 `z.any()`、workspace exports 子路径 tarball smoke。
>
> 2026-06-26 更新：当前发布准入以 `.factory/project.json`、`.factory/memory/current-state.md` 和最新远端 Quality Gate 为准。run `28231936087` 曾因未跟踪 `.env.example.tpl` 模板失败；本地已修复忽略规则，run `28234054546` 已通过。本文件仍不能作为 GA 依据，GA/public release 需要 exact tags 和 npm publish 证据。

### 2026-06-20 本地开发硬化状态对照

| 原评审问题 | 当前状态 |
| --- | --- |
| 发布脚本未强制 registry reconciliation | 已在真实 `release:gate` 中纳入 `--include-registry`；正式发布执行仍放到最后发布阶段 |
| CI 缺 lint | 已纳入 root `quality:release` 与 GitHub quality gate；远端首跑证据放到最后发布阶段 |
| 公共 API 边界过宽 | 已收敛 root API，并新增 `./plugin`、`./contracts`、`./diagnostics`、`./experimental`、`./service`、`./internal` 显式 subpath |
| 错误模型公共导出不完整 | 已导出 `HttpError` 与 `./errors` 子路径，并有公共 API 契约测试 |
| AutoDI 路由/模块错误未 fail-fast | 已按默认 throw fail-fast，并补 strict 匿名拒绝与具名通过测试 |
| `close()` / `stop()` 生命周期不一致 | 已统一公共关闭语义并有回归测试 |
| `ApplicationBootstrap` 职责集中 | 已抽出 discovery registrar、request identity、observability installer、security installer；剩余拆分作为后续架构优化 |
| production manifest compiled-only 语义 | 已补 strict `compiledOnly` v2 artifact/registration 校验；更深供应链策略作为后续演进 |
| config schema 宽松区 | 已移除 `z.any()` / `catchall(z.any())`，并补 typed `autoLoad`、plugin、provider 负向测试 |
| 公共子路径 tarball smoke 不足 | workspace pack gate 已验证 exports import/types 子路径文件进入 tarball |
| 远端 CI / npm publish | 明确延后到最后发布阶段，不计入当前本地开发硬化阻断项 |

## 执行结论

`@stratix/core` 的核心框架主线已经成立：Fastify runtime、Awilix DI、装饰器 discovery、插件 AutoDI、`RegistrationPlan`、production manifest、统一错误信封、DI diagnostics、observability/security provider 已经形成可交付闭环。主线程复核中，`tsc`、core 单测和 coverage ratchet 均通过。

但本轮三角色闭门评审一致认为：当前版本只能以 RC / controlled release 口径推进，不能包装成高置信 GA，也不能宣称 `@stratix/core` 全包覆盖率达到 95%。原因是发布链路、公共 API 边界、测试覆盖、插件失败策略、生命周期一致性和 production manifest 严格生产语义仍存在明确缺口。

需要特别区分两个评分：

- `95/100`：现有文档中的 supported release scope 本地生产成熟度评分，基于本地门禁、关键路径测试和发布准备证据。
- `82/100`：本轮三角色闭门评审的综合风险评分，按 GA 成熟度、架构债、测试置信度和发布治理风险加权。

## 评审角色结论

| 角色 | 评分 | 发布建议 | 核心判断 |
| --- | ---: | --- | --- |
| 高级技术经理 | 87 | 允许 RC，不批准 GA | 主线能力已成型，但远端 CI / npm publish 外部证据缺失，根发布脚本未强制 registry reconciliation |
| 高级测试经理 | 74 | 支撑 controlled release，不支撑 GA | 核心 runtime 测试较完整，但公共子路径、覆盖率阈值、lint/pack smoke 和长期可靠性测试不足 |
| 高级框架架构师 | 84 | 可进入 1.1.x RC | 概念模型正确，但公共 API、插件 fail-fast、`close()`/`stop()`、manifest compiled-only 语义仍需演进 |
| 综合复核 | 82 | RC / controlled release | 本地可控发布成立；GA 仍需要 P1 修复、外部证据和 API 分层 |

## 主线程复核命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` | passed | core 类型检查通过 |
| `CI=true pnpm --filter @stratix/core exec vitest run` | passed | 31 个测试文件、224 个测试通过 |
| `pnpm run test:coverage:core -- --coverage.reporter=text-summary` | passed | coverage ratchet 通过 |

当前 coverage summary：

| 指标 | 当前值 |
| --- | ---: |
| Statements | 44.27% |
| Branches | 35.69% |
| Functions | 39.27% |
| Lines | 45.09% |

这些数值满足当前 ratchet，但不满足 95% 全包覆盖率。

## 总体评分

| 分项 | 得分 | 判断 |
| --- | ---: | --- |
| 产品定位与包边界 | 89 | `create`、`forge`、`core`、生态插件边界总体清晰，`tasks` 冻结策略已明示 |
| 工程治理与可追溯性 | 86 | `.factory`、docs、release gate 证据较完整，但部分工作项状态和旧报告事实漂移 |
| 发布治理 | 82 | `quality:release` 和 CI workflow 已存在，但根 `release:gate` 未默认带 `--include-registry` |
| 框架概念模型 | 90 | Fastify + Awilix + discovery + plugin AutoDI + RegistrationPlan 主线正确 |
| 公共 API 边界 | 78 | root export 暴露过多内部实现，缺少清晰 stable / plugin / experimental / internal 分层 |
| Bootstrap 生命周期 | 82 | 生命周期完整，但 `ApplicationBootstrap` 仍是 1796 行级别的职责集中点 |
| DI / Discovery / RegistrationPlan | 86 | plan-first 方向正确；手工 Awilix 注册和第三方注册诊断仍有 unknown fallback |
| 插件体系 | 84 | `withRegisterAutoDI` 可用；路由注册错误未按默认 `throw` fail-fast 是重要风险 |
| Production Manifest | 84 | v2 integrity 已有基础，但 strict 模式仍允许 source fallback，不是 compiled-only 生产语义 |
| 错误模型 | 80 | runtime 识别 `HttpError`，但公共导出未暴露完整 HTTP error API |
| 安全与观测 | 86 | provider、health、rate limit 基线可用；requestId 一致性和长期指标仍需完善 |
| 测试结构与可读性 | 82 | 核心 runtime 测试结构较好 |
| 公共 API / 工具子路径覆盖 | 55 | `auth`、`context`、`data`、service decorators / validators 覆盖不足 |
| 覆盖率门禁可信度 | 58 | 当前是低位 ratchet，不是 GA 级 coverage gate |
| CI 可执行性 | 80 | PR CI 覆盖 build/typecheck/test/coverage/docs/audit/dry-run，但缺 lint、pack install smoke |
| 可维护性与演进成本 | 82 | 主干可维护，但 bootstrap、root export、配置宽松区和 tasks 残留提高后续成本 |
| 综合评分 | 82 | controlled release 可接受；GA 仍需系统性硬化 |

## P0 / P1 / P2 问题清单

### P0：controlled release 无立即阻断；GA 外部证据缺失

本轮没有发现必须阻断本地 controlled release 的代码级 P0。

但 GA 级发布仍存在 P0 条件缺失：

- `.github/workflows/quality-gate.yml` 需要首次远端运行通过。
- npm publish 需要维护者凭证执行，并记录 exact-version 发布结果。
- 当前 `95/100` 是 supported release scope 本地成熟度评分，不是 95% 覆盖率。

证据：

- `.factory/memory/current-state.md` 记录远端 CI 首跑和 npm publish 仍是即时优先项。
- `docs/04-project-development/06-testing-verification/stratix-95-quality-gate.md` 明确禁止宣称全包覆盖率 95% 或高置信 GA。

### P0：发布脚本未强制 registry reconciliation

根 `release:gate` 当前为：

```json
"release:gate": "node packages/forge/dist/bin/stratix.js release gate --scope workspace --include-offline-install"
```

它没有默认带 `--include-registry`。但发布说明已经要求最终发布前运行 `--include-offline-install --include-registry`，否则 exact-version registry 冲突检查仍可能停留在人工步骤。

建议把 registry reconciliation 纳入真实发布脚本，或新增 `release:gate:full` 并让 `release` 调用 full gate。

### P1：coverage ratchet 低于 GA 质量门

当前全局阈值仅为 lines 43、functions 38、branches 34、statements 42；bootstrap/discovery 有较高定向阈值，但公共工具、service decorators、validation、auth/context/data 等公开子路径明显不足。

建议：

- 短期把全局 lines/functions 提升到 60%，branches 提升到 50%。
- 中期按公开 API 子路径建立单独阈值。
- 长期对 stable root export 建立契约覆盖要求。

### P1：CI 缺少 lint、pack 和安装烟测

根 `quality:release` 与 GitHub workflow 目前不包含 `pnpm lint`。PR CI 也没有验证 core tarball 被临时项目安装后能通过最小 `Stratix.run()` smoke。

建议：

- PR CI 增加 `pnpm lint`。
- 增加 `pnpm --filter @stratix/core pack --pack-destination /tmp`。
- 增加临时项目安装 `stratix-core-*.tgz` 后导入 root export 和 subpath export 的 smoke。

### P1：公共 API 边界过宽

`packages/core/src/index.ts` 仍导出大量插件内部注册函数、生命周期管理、Awilix、Fastify 类型和实现细节。短期方便生态接入，长期会把内部实现冻结为 SemVer 契约。

建议：

- root export 仅保留应用开发稳定 API。
- 插件作者 API 移入明确 subpath，例如 `@stratix/core/plugin`。
- diagnostics / contracts 提供正式 subpath。
- `RegistrationPlan` 等演进中能力继续放在 `experimental`。
- 对 internal API 增加 deprecation 或文档警示。

### P1：错误模型公共导出不完整

runtime 已特殊处理 `HttpError`，但 root export 没有导出 `HttpError` 和常用 HTTP 子类，也没有 `./errors` 子路径。应用开发者难以用官方错误类型稳定触发统一错误 envelope。

建议：

- root export 或 `@stratix/core/errors` 暴露 `HttpError`、`BadRequestError`、`UnauthorizedError`、`ForbiddenError`、`NotFoundError` 等。
- 增加公共 API 契约测试，确认这些错误类型能触发统一 envelope。

### P1：插件 AutoDI 路由注册错误未 fail-fast

默认 `lifecycle.errorHandling` 是 `throw`，但插件模块发现中的部分路由注册错误会进入 `result.errors`，`withRegisterAutoDI()` 只记录错误数量，未在默认策略下抛出。插件可能部分路由注册失败但应用继续启动。

建议：

- `discoverAndProcessModules()` 返回错误后，`withRegisterAutoDI()` 应按 `errorHandling` 策略处理。
- 默认 `throw` 应 fail-fast。
- `warn` / `ignore` 才允许继续启动，并输出明确诊断。

### P1：`app.stop()` 与 `app.close()` 生命周期语义不一致

`stop()` 会走 `ApplicationBootstrap.stop()`，执行 shutdown handlers、Fastify close、root container dispose 和 lifecycle manager dispose；`close()` 只调用 `fastify.close()`，绕过框架清理路径。公共 API 同时暴露两者会导致资源泄漏和使用误解。

建议：

- `close()` 委托 `stop()`，或标记为低层 Fastify close 并从公开 API 弱化。
- 增加测试验证 `close()` 和 `stop()` 的清理语义一致。

### P1：`ApplicationBootstrap` 仍是长期演进瓶颈

虽然已经抽出 `ApplicationDiscoveryRegistrar`，但 `ApplicationBootstrap` 仍集中承担配置、环境、容器、Fastify、错误、request scope、observability、security、plugin loading、server start、shutdown、eager init 等职责。

建议后续拆分为：

- `EnvironmentLoader`
- `ConfigResolver`
- `ContainerFactory`
- `PluginOrchestrator`
- `HttpServerFactory`
- `ErrorEnvelopeInstaller`
- `RequestScopeInstaller`
- `SecurityInstaller`
- `ObservabilityInstaller`
- `ShutdownManager`

### P1：production manifest v2 尚非 compiled-only 生产语义

v2 artifact 的 `compiledFile` / `compiledHash` 仍是可选；strict 校验要求 source 或 compiled 至少有 hash；注册计划按 `compiledFile -> sourceFile -> source` 回退。controlled release 可接受，但 GA 前应支持更严格的生产模式。

建议：

- 增加 `strictCompiled` 或 `productionManifest.mode: 'compiled-only'`。
- strict compiled 模式下禁止 source fallback。
- release gate 强制校验 compiled artifact 存在、hash 匹配、注册路径全部来自 dist。

### P2：配置 schema 仍有宽松区

顶层 schema 已 strict，但 `autoLoad`、`plugin.options`、server catchall、provider 配置仍使用 `z.any()` / `catchall`。拼写错误、废弃字段和插件配置错误可能较晚暴露。

建议：

- `autoLoad` 标记 deprecated，并明确迁移到 `discovery`。
- 插件提供可注册 config schema。
- 启动期输出 unknown key diagnostic。
- 补齐 nested unknown key 负向测试矩阵。

### P2：公共子路径测试不足

`@stratix/core/auth`、`@stratix/core/context`、`@stratix/core/data`、service decorators / validators 是公开导出面，但测试主要集中在 bootstrap、discovery、plugin、functional、async、crypto 和 error-utils。

建议：

- 每个公开子路径至少建立正向、边界、错误输入测试。
- service decorators / validators 增加行为测试，而不只靠类型导出存在。

### P2：可靠性测试仍是 smoke

已有并发请求、并发 start/stop、重复 shutdown handler 测试，但还不是性能或泄漏基准。

建议：

- 增加 1000 次 `inject()` 基准。
- 增加 100 次 start/stop heap 增长阈值。
- 增加启动耗时和路由注册耗时趋势记录。
- 先放 nightly，再逐步纳入 release gate。

### P2：诊断和契约仍有一致性缺口

现有 DI diagnostics 对未记录的 Awilix 注册只能输出 `unknown`，route contract / OpenAPI 也不感知 runtime prefix。

建议：

- DI graph 节点增加 confidence：`explicit`、`inferred`、`unknown`。
- plugin/manual registrations 要统一记录 source、dependencies、scope。
- contract extraction 增加 prefix-aware 模式，保证 OpenAPI 与实际 runtime route 一致。

### P2：requestId 注入与响应头可能不一致

request scope 先注册 `requestId`，observability 后续才可能用请求头覆盖 `request.requestId`。如果 service 注入 requestId，可能与响应头中的 request id 不一致。

建议：

- 在创建 request scope 前完成 request id 解析。
- request scope 中注入同一来源的 requestId。
- 增加请求头 request id 与注入 requestId 一致性测试。

### P2：匿名插件 token 冲突风险

adapter token 前缀依赖插件函数名，匿名插件 fallback 为 `unknownPlugin`。多个匿名插件更容易出现 token 冲突。

建议：

- 对匿名插件在开发模式下强警告，在生产或 strict 模式下 fail-fast。
- 要求插件默认导出具名函数。
- plugin manifest 中声明插件函数名和 adapter token 前缀。

### P2：旧报告与工作项存在事实漂移

旧 `core-framework-review-report.md` 仍记录历史测试数量，并出现 executor 旧概念；`TASK-002` 等工作项状态与已落地 CI / root gate 存在漂移。

建议：

- 旧报告顶部加 stale note 或迁移为历史报告。
- 将当前报告列为 2026-06-19 后续评审基线。
- 同步工作项状态，避免 QA 追溯时产生冲突。

## 框架优点

1. **概念主线清晰。** `Stratix.run()` 将配置、Fastify runtime、DI container、discovery 和生命周期封装为统一入口。
2. **DI 与 discovery 有可演进中间表示。** `RegistrationPlan` 让 application discovery、plugin AutoDI、production manifest 具备统一注册语义。
3. **生产能力已有底座。** production manifest v2、strict integrity、provider-backed observability/security、readiness/liveness 和 rate limit provider 已能支撑 controlled release。
4. **契约化方向正确。** route contract、OpenAPI document generation、统一错误 envelope 和 `@stratix/testing` 的 contract test 能形成 API 质量闭环。
5. **治理体系比普通框架仓库完整。** `.factory`、docs、workitems、release gate、CI workflow 已具备正式维护项目的基础。

## 框架缺点

1. **公共 API 面过宽，内部实现泄漏。** 根导出便利但不稳，后续 SemVer 成本会快速升高。
2. **Bootstrap 仍然过重。** 当前拆分只完成 discovery registrar，其他启动职责仍高度集中。
3. **测试覆盖不均。** 核心 runtime 路径强，公开 utility/service 子路径弱。
4. **生产 manifest 仍保留 source fallback。** 对生产可重复构建和供应链完整性来说还不够硬。
5. **插件失败策略不够严格。** 默认 `throw` 未覆盖所有 AutoDI 错误汇聚路径。
6. **发布链路仍有人工口径。** registry reconciliation、远端 CI 首跑、npm publish 还没有完全闭环。
7. **历史包和历史报告增加认知负担。** `@stratix/tasks` 冻结但仍留在 workspace；旧报告仍有过期事实。

## 优化演进方案

### 立即项：controlled release 前

1. 根 `release` 前置 full release gate，强制 registry reconciliation。
2. 远端 GitHub Actions `Quality Gate` 首跑通过后回写 `.factory` 和 discovery 文档。
3. release notes 使用 RC / controlled release 口径，明确不能宣称 GA 或 95% 覆盖率。
4. CI 增加 `pnpm lint`、core pack、临时项目安装 tgz 和最小 runtime smoke。
5. 修复或明确记录 `HttpError` 公共导出、插件 AutoDI fail-fast、`close()`/`stop()` 生命周期一致性这三类 P1。

### 1.1.x：稳定化阶段

1. 建立 public / plugin / experimental / internal API 分层。
2. 增加 `@stratix/core/errors`、`@stratix/core/plugin`、`@stratix/core/contracts`、`@stratix/core/diagnostics` 子路径。
3. coverage 目标提升到 lines/functions 60%、branches 50%，优先补公开子路径。
4. production manifest 增加 strict compiled-only 模式。
5. 配置 schema 支持插件注册，并输出 unknown key diagnostic。
6. `@stratix/tasks` 做最终治理：移出 supported 发布心智，或单独迁移恢复门禁。

### 1.2.x：架构拆分阶段

1. 拆分 `ApplicationBootstrap`，将启动流程转为阶段化 orchestrator。
2. 将 security、observability、request scope、error envelope 安装器独立测试。
3. 建立 prefix-aware route contract / OpenAPI 生成。
4. DI diagnostics 增加 confidence 和完整 registration recorder。
5. 建立 manifest parity test：同一 fixture 下开发 discovery 与生产 manifest 注册 token/route/lifecycle diff 为 0。

### GA 前置条件

1. 远端 CI 多次稳定通过，并开启分支保护。
2. npm publish 完成，exact-version registry 状态已记录。
3. P1 问题关闭或有明确 release note 豁免。
4. root public API 分层完成，内部实现不再作为默认稳定面暴露。
5. 公共子路径测试达到可维护阈值，coverage 不再只是低位 ratchet。
6. production manifest compiled-only 模式可用，并在 release gate 中执行。
7. 至少有一组真实应用或生态插件完成迁移验证。

## 发布建议

本轮建议为：

**允许 `@stratix/core@1.1.0` 进入 RC / controlled release；不批准高置信 GA。**

发布对象应限定为受控用户、生态插件维护者和早期迁移项目。对外说明必须明确：

- 当前是 controlled release。
- 全包覆盖率不是 95%。
- `@stratix/tasks` 不属于 supported release scope。
- public API 仍会按 stable / plugin / experimental / internal 继续收敛。
- production manifest schema 仍会继续向 compiled-only 生产语义演进。

## 建议后续工作项

| ID 建议 | 优先级 | 事项 |
| --- | --- | --- |
| CR-CORE-20260619-API-SURFACE | P1 | 收敛 root export，建立 public / plugin / experimental / internal API 分层 |
| BUG-CORE-20260619-AUTODI-FAILFAST | P1 | 插件 AutoDI registration errors 按默认 `throw` fail-fast |
| BUG-CORE-20260619-LIFECYCLE-CLOSE | P1 | 统一 `app.close()` 与 `app.stop()` 清理语义 |
| CR-CORE-20260619-ERRORS-EXPORT | P1 | 导出 HTTP error 公共 API 与 `./errors` 子路径 |
| CR-CORE-20260619-MANIFEST-COMPILED | P1 | production manifest 增加 strict compiled-only 模式 |
| TASK-CORE-20260619-PUBLIC-COVERAGE | P1 | 补齐 auth/context/data/service 公开子路径测试 |
| TASK-CORE-20260619-CI-SMOKE | P1 | CI 增加 lint、pack、临时安装和 runtime smoke |
| TASK-CORE-20260619-BOOTSTRAP-SPLIT | P2 | 分阶段拆分 `ApplicationBootstrap` |
| TASK-CORE-20260619-DI-CONFIDENCE | P2 | DI diagnostics 增加 confidence 与手工注册记录 |
| TASK-CORE-20260619-CONTRACT-PREFIX | P2 | OpenAPI / route contract 支持 runtime prefix |
