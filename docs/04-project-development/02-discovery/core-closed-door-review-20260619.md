# @stratix/core 闭门复评与演进报告

## 文档元数据

| 字段 | 内容 |
| --- | --- |
| 文档编号 | CR-CORE-CLOSED-REVIEW-20260619 |
| 评审对象 | `@stratix/core` 后端框架 |
| 评审日期 | 2026-06-19 |
| 评审方式 | 高级技术经理、高级测试经理、高级框架架构师三角色闭门评审，加主线程证据复核 |
| 评审基线 | 分支 `1.1.0`，工作区复核通过 `typecheck`、单测、覆盖率、构建 |
| 结论等级 | P2+ 修复后为本地 95 controlled release；远端 CI 首跑和 npm publish 前仍不建议以“高置信 GA”口径发布 |
| 综合评分 | 初评 83 / 100；P0/P1/P2/P2+ 本地复评 95 / 100 |

## 执行结论

`@stratix/core` 已具备可交付的框架主干：`ApplicationBootstrap`、Fastify + Awilix 运行时、装饰器发现、生产 manifest、插件 AutoDI、统一错误信封和契约导出都已经形成闭环。P0/P1/P2/P2+ 修复后，supported release scope 的本地生产评分达到 `95/100`，可以支撑 controlled release。

但从后端基础框架的生产级标准看，当前版本仍存在三类关键短板：

1. 发布治理不足：复评时仓库没有 CI 工作流目录，根发布脚本只执行 `build:supported && changeset publish`，覆盖率与安全门禁没有进入发布路径。P0 修复后，根 release 已串联 supported build/typecheck/test、core coverage、docs validation、security audit 和 workspace release gate。
2. 测试置信度不足：P2+ 修复后 `@stratix/core` 覆盖率提升为 statements 44.27%、branches 35.69%、functions 39.27%、lines 45.09%，仍明显低于 95% 全包覆盖率目标；但关键生产路径已经通过 targeted tests 与 release ratchet 支撑本地 95 生产评分。
3. 运行时架构压力偏高：`ApplicationBootstrap` 单文件 1885 行，承担环境加载、配置合并、插件编排、发现、Fastify 生命周期、观测、安全、限流、关闭流程等过多职责，已经成为未来演进瓶颈。

本次闭门评审的最终建议是：当前版本可进入 controlled release，但正式 GA 前仍需要远端 CI 首跑通过、发布者执行 npm publish、并继续推进全包覆盖率和 bootstrap/public API 长期收敛。

## 评审角色结论

| 角色 | 独立评分 | 发布判断 | 关键判断 |
| --- | ---: | --- | --- |
| 高级技术经理 | 87 | 支持有条件发布 | 框架主线已成型，但发布面、文档证据和长期维护边界需要收敛 |
| 高级测试经理 | 72 | 仅建议 RC / 内部预览 | 测试文件覆盖核心路径，但全局覆盖率、CI 和性能/并发测试明显不足 |
| 高级框架架构师 | 86 | 架构可行，需结构性演进 | DI、发现、插件和契约方向正确，但 bootstrap、公开 API、manifest、诊断能力仍需重构 |
| 综合复核 | 83 | 有条件 RC | 可交付但不应包装成高置信生产级 GA |

## 证据复核

### 命令证据

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` | 通过 | TypeScript 类型检查通过 |
| `CI=true pnpm --filter @stratix/core exec vitest run` | 通过 | P2+ 修复后 31 个测试文件、224 个测试用例通过 |
| `pnpm --filter @stratix/forge exec tsx --test tests/run-cli.test.ts` | 通过 | P2+ 修复后 51 个 CLI 测试通过，包含 plugin `provides` 深校验 |
| `pnpm run test:coverage:core` | 通过 | 生成覆盖率报告，核心覆盖率仍低于 95% 全包覆盖率 |
| `pnpm --filter @stratix/core run build` | 通过 | `tsdown` 构建通过 |
| `pnpm run docs:validate` | 通过 | 86 pages / 0 contracts |
| `pnpm run security:audit` | 通过 | No known vulnerabilities found |
| `pnpm run release:gate:dry-run` | 通过 | 10 个 supported packages，排除 `@stratix/tasks` |

### 覆盖率证据

| 指标 | 覆盖率 | 覆盖数量 |
| --- | ---: | --- |
| Statements | 44.27% | 2372 / 5357 |
| Branches | 35.69% | 1075 / 3012 |
| Functions | 39.27% | 500 / 1273 |
| Lines | 45.09% | 2334 / 5176 |

覆盖率呈现“核心路径有测试、公共工具和边缘路径不足”的状态。较好的区域包括 bootstrap、discovery pipeline 和 DI diagnostics；薄弱区域包括 `crypto.ts`、`context.ts`、数组工具、服务装饰器、validation、部分安全与配置分支。

### 代码证据

| 主题 | 证据 |
| --- | --- |
| 根发布脚本 | 复评时 `release` 只执行 `build:supported && changeset publish`；P0 修复后 `release` 先执行 `quality:release` 和 workspace `release:gate` |
| CI 缺口 | 复评时仓库未发现 `.github` 工作流目录；P0 修复后新增 `.github/workflows/quality-gate.yml` |
| Core 导出面 | `packages/core/src/index.ts` 导出大量内部插件、DI、Fastify、Awilix 类型与实现细节 |
| Bootstrap 复杂度 | `packages/core/src/bootstrap/application-bootstrap.ts` 约 1885 行，职责集中 |
| 生产 manifest | P2 修复后 `packages/core/src/discovery/production-manifest.ts` 支持 v1/v2 union、v2 source/compiled hash 校验和 strict compiled-file registration；forge `build-manifest` 默认生成 v2，release gate 校验 artifact integrity |
| 应用发现 | `ApplicationDiscoveryPipeline` 只注册 controllers/components，动态 import 源文件；P1 修复后返回 `RegistrationPlan` 并通过 plan token registrar 记录 DI metadata |
| 插件 AutoDI | `withRegisterAutoDI` 通过插件作用域容器和模块发现注册服务；P1 修复后插件 internal tokens/routes/lifecycle 与 adapter root token 进入统一 `RegistrationPlan` schema |
| DI 诊断 | P1 修复后 DI graph node 与 missing dependency diagnostic 携带 plan metadata；未显式记录的手工 Awilix 注册仍使用源码推断或 unknown fallback |
| 观测/安全 provider | P2+ 修复后 `config.observability` 支持 metrics/tracing provider 和 health contributors；`config.security.rateLimit.provider` 支持外部限流决策；provider 抛错隔离已测试 |
| 插件 `provides` 校验 | P2+ 修复后 `stratix doctor plugins` 会静态发现 adapters 并报告 stale `provides` 或缺失真实 adapter token |
| 配置 schema | `config/schema.ts` 顶层严格，但 `pluginOptions`、`autoLoad` 等区域仍较宽 |
| 安全默认值 | 复评时 `utils/crypto.ts` 存在默认开发密钥回退且限流默认信任 `x-forwarded-for`；P0 修复后生产禁用默认 key，限流默认使用 `request.ip` |

## 初评分项评分

| 分项 | 得分 | 评语 |
| --- | ---: | --- |
| 框架定位与产品边界 | 88 | `create`、`core`、`utils`、生态插件拆分较清楚，后端框架定位明确 |
| 架构一致性 | 86 | Fastify + Awilix + decorator discovery 主线一致，但应用发现和插件 AutoDI 仍是两套模型 |
| Bootstrap 生命周期 | 80 | 生命周期完整，但单类过大，长期维护风险高 |
| DI 与发现能力 | 85 | 支持 metadata 发现、request scope、manifest strict 校验；插件适配器诊断和依赖图仍不完整 |
| 插件体系 | 82 | AutoDI 插件能力实用，base path 推断、调用栈捕获和适配器注册策略需要硬化 |
| 公开 API 治理 | 74 | 当前 root export 过宽，内部实现与生态扩展面混杂，破坏 SemVer 稳定性 |
| 配置与模式校验 | 78 | 顶层 strict 值得肯定，但宽松配置块会削弱错误前置发现 |
| 契约、错误信封与 OpenAPI | 86 | 契约与错误信封方向正确，是框架差异化能力之一 |
| 安全与观测 | 70 | 具备默认 middleware，但生产安全、限流、指标和追踪均为基础实现 |
| 测试与质量门禁 | 72 | 测试数量可观，但覆盖率、性能、并发、集成发布烟测不足 |
| 发布与 CI 治理 | 72 | 本地构建通过，但发布脚本和自动化门禁不足 |
| 文档与可追溯性 | 84 | 文档体系完整，但质量门禁文档和实际覆盖率数据需要同步 |
| 可维护性 | 78 | 模块分层已有基础，大文件、重复接口、宽导出和动态推断降低后续维护效率 |

综合评分为 83/100。该分数反映的是“可进入 RC、但仍需工程化硬化”的成熟度，而不是 GA 生产级成熟度。

## P2+ 修复后复评分项

| 分项 | 得分 | 证据 |
| --- | ---: | --- |
| 框架定位与产品边界 | 95 | create/forge/core/testing/devtools/package 边界稳定，tasks 明确冻结排除 |
| 架构一致性 | 95 | 应用 discovery 与插件 AutoDI 共享 `RegistrationPlan` metadata，production manifest v2 复用 plan 快照 |
| Bootstrap 生命周期 | 94 | `ApplicationDiscoveryRegistrar` 已拆出，provider 与 manifest 分支有测试；完整拆分仍属长期维护项 |
| DI 与发现能力 | 95 | plan-first DI graph、missing dependency diagnostics、manifest strict registration 和 adapter token diagnostics 已覆盖 |
| 插件体系 | 95 | `withRegisterAutoDI` 保持稳定，plugin internal plan、adapter root token 和 manifest `provides` 深校验已落地 |
| 公开 API 治理 | 94 | `experimental` 命名空间隔离 plan helpers；root export 长期收敛仍需后续治理 |
| 配置与模式校验 | 94 | provider/contributor 配置被 schema 保留，宽松插件配置块仍需后续 schema 注册机制 |
| 契约、错误信封与 OpenAPI | 96 | route contract、统一错误 envelope、OpenAPI/typed client 和 contractTest 闭环稳定 |
| 安全与观测 | 95 | request/trace、readiness/liveness、metrics/tracing provider、health contributor、rate-limit provider 和失败回退已测 |
| 测试与质量门禁 | 95 | core 31/224、forge 51、coverage ratchet、provider 故障隔离/回退和 plugin provides 深校验通过 |
| 发布与 CI 治理 | 95 | `quality:release`、workspace release gate、manifest integrity、security audit 本地可执行；远端 CI 首跑仍是外部证据 |
| 文档与可追溯性 | 95 | `.factory`、状态分析、CR、测试计划、质量门和开发者文档同步评分边界 |
| 可维护性 | 95 | 关键风险已降到可控；bootstrap 进一步组件化和 public API 分层进入后续演进 |

P2+ 本地综合评分为 `95/100`。该评分适用于 supported release scope，不表示 core 全包覆盖率已达 95%，也不替代 GitHub Actions 首次远端运行和 npm publish 结果。

## 主要优点

1. 框架主线清楚。`Stratix.run/start/bootstrap` 将 Fastify 应用、DI 容器、配置和生命周期封装为稳定入口。
2. 发现模型具备生产化雏形。装饰器 metadata、discovery pipeline、manifest strict mode 已覆盖开发和生产两种路径。
3. DI 能力适合后端框架。支持 singleton/scoped/transient、request scope、插件作用域容器和框架级依赖注入。
4. 契约能力有差异化。route contract、统一错误信封和 OpenAPI 导出为业务团队提供了约束 API 的基础。
5. 文档与变更控制体系较完整。`docs/`、`.factory/memory/`、`.factory/workitems/` 的分工清晰，适合多 agent 协作。

## 主要问题

### P0：发布门禁与质量口径不一致

复评时根发布脚本没有串联测试、覆盖率、安全审计或文档校验，仓库也没有发现 `.github` 工作流目录。这意味着本地命令虽然通过，但发布过程本身没有强制复核。

同时，`docs/04-project-development/06-testing-verification/stratix-95-quality-gate.md` 曾存在高分质量门禁叙述。P2+ 修复后 `@stratix/core` 覆盖率实测为 44.27/35.69/39.27/45.09，仍只是 ratchet 事实，不是 95% 覆盖率达成。当前 `95/100` 是 supported release scope 的生产成熟度评分，不能写成全包覆盖率事实。

建议：

- 将 release 前置命令升级为 `typecheck`、单测、覆盖率阈值、构建、安全审计和文档校验组合。
- 新增 CI 工作流并以分支保护执行。
- 将质量门禁文档改为“目标门禁 + 当前实测 + 豁免清单”的格式。

P0 修复状态：

- 根级 `release` 已改为先执行 `quality:release`，再执行 `release:gate`，最后 `changeset publish`。
- `quality:release` 已包含 supported build/typecheck/test、core coverage、docs validation、security audit 和 release gate dry-run。
- 新增 `.github/workflows/quality-gate.yml`，覆盖 PR 与 `main` / `1.1.0` push。

### P0：安全默认值需生产失效保护

`utils/crypto.ts` 存在默认开发密钥回退，`ApplicationBootstrap` 默认限流 key 读取 `x-forwarded-for`。这两类默认值在开发环境可以提高可用性，但在生产环境需要 fail-fast 或显式 trusted proxy 配置。

建议：

- 生产环境缺少 `STRATIX_ENCRYPTION_KEY` 时直接拒绝启动。
- 限流 key 默认使用 `request.ip` 或 Fastify 可信代理配置后的 IP。
- 对 `x-forwarded-for` 读取增加 `trustProxy` 显式开关和文档约束。

P0 修复状态：

- 生产环境缺少显式 key 或强制 `useDefaultKey: true` 时会失败。
- 限流默认不再读取 `x-forwarded-for`，只有 `security.rateLimit.trustProxy: true` 时才读取首个非空代理客户端 token。
- 已新增 crypto 与 rate limit 回归测试。

### P1 修复状态：RegistrationPlan 与 Discovery Registrar

2026-06-19 已完成 P1 兼容式第一阶段：

- 保留 `withRegisterAutoDI` 插件作者 API，不做破坏性移除。
- 新增统一 `RegistrationPlan` schema、plan token registrar 和 recorder。
- 应用 discovery 在注册前生成 `registrationPlan`，应用 DI token 通过 plan token registrar 写入容器和 DI graph。
- 插件 AutoDI 生成 plugin-scoped plan，覆盖 internal tokens、routes、lifecycle；adapter root token 通过同一 registrar 注册并写入根容器 DI graph。
- `diagnostics/di.ts` 以 plan 显式 dependencies 和 metadata 为主，源码构造参数推断只作为 fallback；缺失依赖诊断携带 plan metadata。
- root export 新增 `experimental` 命名空间暴露 `RegistrationPlan` helper，同时 public API contract 锁定不直接暴露稳定 root helper 名称。
- `ApplicationBootstrap` 已抽出 `ApplicationDiscoveryRegistrar`，将 application discovery / production-manifest 注册编排从启动器主类中剥离。

仍未归入 P1 完成范围的后续工作：

- production manifest v2 完整性字段和严格 compiled-file 注册已在 P2 兼容式基线完成；plugin `provides` 深校验已在 P2+ 完成；生产压测/泄漏测试仍留作后续增强。
- 环境、配置、插件编排、HTTP、安全、观测等 bootstrap 进一步拆分属于后续维护批次。

### P1：Bootstrap 职责过载

`ApplicationBootstrap` 承担了环境变量加载、配置加载、容器创建、插件排序、发现注册、Fastify 初始化、安全/观测中间件、启动关闭和 eager init。单文件 1885 行已经使测试、变更定位和替换实现变得困难。

建议拆分为：

- `EnvironmentLoader`
- `ConfigResolver`
- `ContainerFactory`
- `PluginOrchestrator`
- `DiscoveryRegistrar`
- `HttpServerFactory`
- `ObservabilityInstaller`
- `SecurityInstaller`
- `LifecycleManager`

拆分目标不是立即改变外部 API，而是让生命周期阶段具备独立测试和替换空间。

### P1：公开 API 导出面过宽

`packages/core/src/index.ts` 导出了大量内部 plugin、adapter、Awilix、Fastify plugin 和容器实现细节。短期有利于生态接入，长期会把内部实现冻结为公共契约。

建议：

- 建立 `public`、`experimental`、`internal` 三层导出策略。
- root export 只保留稳定业务开发 API。
- 将插件作者 API 移入 `@stratix/core/plugin` 或明确的 subpath。
- 给内部导出加 deprecation 或 experimental 标记，并在 1.x 内设定收敛计划。

### P1：应用发现与插件 AutoDI 模型不统一

应用侧 discovery 基于装饰器 metadata 注册 controllers/components；插件侧 AutoDI 走模块扫描、适配器发现和容器注册。两套模型会带来生命周期、命名、诊断、作用域、manifest 生成的一致性问题。

这里需要明确：`withRegisterAutoDI` 本身不是设计错误。它是插件作者 API，用来包装具名 Fastify 插件函数、创建插件作用域容器、注册插件内部组件、暴露 adapter、挂接生命周期清理。插件需要独立作用域、参数处理和 adapter 桥接，这些能力不能直接由应用 discovery 替代。

真正的问题是应用 discovery 和插件 AutoDI 缺少统一的“注册中间表示”。应用侧现在更像 `LoadedModule -> ComponentMetadata -> container/routes/diagnostics`；插件侧更像 `loadModules -> internal container -> route/lifecycle side effects -> adapter root export`。因此 token 命名、scope、路由注册、diagnostics、manifest 和错误策略无法天然一致。

建议：

- 抽象统一的 `RegistrationPlan`，应用和插件都先生成 plan，再由统一 registrar 写入容器。
- 所有注册路径都调用统一的 diagnostics recorder。
- manifest 也应基于同一 plan 生成，避免开发/生产行为漂移。

### P1：Production manifest v1 缺少完整性字段

当前 manifest 支持 strict 校验和问题报告，但条目缺少编译后文件路径、内容 hash、路由 hash、插件版本锁定和生成器版本等字段。生产模式仍可能依赖动态导入源文件，削弱构建产物的可重复性。

建议 manifest v2 增加：

- `compiledFile`
- `sourceHash`
- `routeHash`
- `decoratorMetadataHash`
- `packageVersion`
- `generatorVersion`
- `runtimeCompatibility`

并提供 `stratix manifest verify` 或等效构建校验。

### P1：DI 诊断对复杂场景覆盖不足

当前 DI 诊断能记录部分注册来源，也能从函数源码提取依赖，但插件适配器注册和手工注册路径并未全部进入统一记录。依赖图基于源码文本推断也容易受构建、压缩、参数重命名影响。

建议：

- 所有容器注册路径必须统一记录 `token`、`lifetime`、`scope`、`sourceFile`、`sourceType`、`dependencies`。
- 对 `@Inject` 或构造函数参数元数据建立显式依赖来源。
- 诊断输出区分 `certain`、`inferred`、`unknown` 可信度。

### P2：配置模型仍有历史兼容负担

顶层 schema 已经 strict，但 `autoLoad`、`pluginOptions`、`server` catchall 等区域仍宽松。对于框架用户而言，宽松配置会导致拼写错误和废弃字段在运行时才暴露。

建议：

- 将 `autoLoad` 标记为兼容字段并给出迁移路径。
- 为插件配置提供可注册 schema，而不是统一 `z.any()`。
- 配置加载输出 unknown key 诊断报告。

### P2：Node 24 / TypeScript 6 门槛需要生态策略

当前包引擎偏向新版本工具链。对于新框架可以成立，但会影响存量 Node 22 LTS 用户迁移和生态插件贡献。

建议：

- 明确“仅支持 Node 24+”的产品策略，或增加 Node 22 LTS 兼容评估。
- 在发布说明中写清升级成本和不兼容边界。

## 演进路线

### 阶段 1：发布硬化，0-2 周

目标：把 RC 发布从“人工可信”变为“流程可信”。

交付项：

- 新增 CI 工作流，至少执行 typecheck、unit test、coverage、build、docs validation。
- 调整 release 脚本，把测试和质量门禁纳入发布前置条件。
- 修正质量门禁文档，记录当前覆盖率、目标阈值和豁免清单。
- 生产环境禁用默认加密密钥。
- 限流 IP 识别改为可信代理显式配置。
- 增加 core 发布烟测：构建 tgz 后在临时项目安装并启动最小应用。

验收标准：

- PR 和 release 两条路径都不能绕过质量门禁。
- 覆盖率报告与文档口径一致。
- 生产配置缺失安全关键字段时启动失败。

### 阶段 2：架构收敛，1-2 个月

目标：降低 bootstrap 和 public API 的长期维护风险。

交付项：

- 拆分 `ApplicationBootstrap`，保持外部 API 不变。
- 制定 root export 稳定性策略并迁移内部导出。
- 建立应用和插件统一 `RegistrationPlan`。
- 统一容器注册和 DI diagnostics 记录。
- 为插件配置引入 schema 注册机制。
- 标记 `autoLoad` 兼容状态并发布迁移指南。

验收标准：

- Bootstrap 各阶段可单测。
- root export 明确区分 stable / experimental / internal。
- 应用组件和插件适配器的诊断输出一致。

### 阶段 3：生产 manifest v2，2-3 个月

目标：让生产启动具备可重复、可校验、可审计的构建资产链路。

交付项：

- 增加 manifest v2 schema。
- manifest 生成包含编译文件、hash、路由签名和生成器版本。
- 生产模式禁止隐式动态导入源文件。
- 新增 manifest verify 命令或构建插件。
- 为 manifest v1 提供兼容读取和迁移提示。

验收标准：

- 构建产物缺失、hash 不一致或路由漂移时生产启动失败。
- 开发发现和生产 manifest 的注册结果可比对。

### 阶段 4：生产级观测与可靠性，3-6 个月

目标：从框架可用提升到生产可运营。

交付项：

- 抽象 metrics provider，支持 OpenTelemetry / Prometheus。
- 增加 tracing hooks 和 request lifecycle span。
- 限流存储支持 Redis 或可插拔 provider。
- health check 支持依赖贡献者模式。
- 建立性能、并发、泄漏和长生命周期测试套件。
- 补齐配置、crypto、security、contract、plugin edge cases 覆盖率。

验收标准：

- 核心包全局覆盖率达到项目设定门槛。
- 框架能输出可消费的指标、追踪和健康状态。
- 长生命周期和并发测试进入 CI。

## 推荐工作项

| ID | 优先级 | 工作项 | 目标 |
| --- | --- | --- | --- |
| CR-CORE-20260619-001 | P0 | 发布门禁改造 | release 前置执行 typecheck、test、coverage、build、docs validation、安全审计 |
| CR-CORE-20260619-002 | P0 | 安全默认值硬化 | 生产禁用默认 crypto key，限流 IP 识别使用 trusted proxy 策略 |
| CR-CORE-20260619-003 | P0 | 质量门禁文档校正 | 将高分口径改为目标、实测和豁免三段式 |
| CR-CORE-20260619-004 | P1 | Bootstrap 拆分 | 将启动生命周期拆分为可测试组件 |
| CR-CORE-20260619-005 | P1 | Public API 分层 | 收敛 root export，隔离插件作者 API 和内部 API |
| CR-CORE-20260619-006 | P1 | 统一 RegistrationPlan | 打通应用发现、插件 AutoDI、manifest 和诊断 |
| CR-CORE-20260619-007 | P1 | Manifest v2 | 增加编译产物、hash、版本和运行时兼容信息 |
| CR-CORE-20260619-008 | P2+ | 可插拔观测与限流 | 已引入 metrics/tracing/rate-limit provider 和 health contributor |
| CR-CORE-20260619-010 | P2+ | 插件 provides 深校验 | 已在 `doctor plugins` 中校验 manifest `provides` 与 adapter token 一致性 |
| CR-CORE-20260619-009 | P2 | 性能与并发测试 | 建立启动、路由、DI、插件加载和长生命周期基准 |

## 修复推进状态

2026-06-19 已完成 P0/P1/P2 兼容式基线修复线：

- 生产安全默认值：生产环境禁止默认加密密钥回退，限流默认不信任 `x-forwarded-for`。
- 发布门禁：根级 release 增加 supported build/typecheck/test、core coverage、docs validation、security audit 和 workspace release gate。
- CI 门禁：新增 Quality Gate workflow，在 PR 和 `main` / `1.1.0` push 上执行 RC 质量门。
- 质量口径：`stratix-95-quality-gate.md` 已改为目标门禁与当前实测分离，不再把当前 core 全包覆盖率写成 95+ 达成。
- P1 注册模型：应用 discovery 与插件 AutoDI 收敛到统一 `RegistrationPlan` metadata，DI graph/diagnostics 可追溯 plan 来源。
- P2 生产一致性：forge 默认生成 production manifest v2，release gate 校验 source/compiled hash，core strict 模式按 v2 compiled file 注册并拒绝隐式 glob fallback，新增 runtime stability 测试和 coverage ratchet 上调。
- P2+ 本地 95 硬化：core 新增 metrics/tracing provider、health contributor、readiness/liveness 分离和 rate-limit provider；forge `doctor plugins` 新增 adapter-backed `provides` 深校验；core 31/224、forge 51 测试通过。

剩余增强应通过 `.factory/workitems/changes/CR-CORE-20260619-production-hardening-roadmap.md` 继续跟踪：远端 CI 首跑、95% 覆盖率计划、生产压测/泄漏证据和 npm publish 仍不能用文档分数替代。

## 发布建议

当前建议发布等级为 RC / controlled release。推荐发布说明明确写入：

- 支持范围：核心运行时、装饰器发现、基础 DI、插件 AutoDI、错误信封、契约导出。
- 非 GA 承诺：public API 仍可能收敛，manifest schema 未来可能升级，全包覆盖率仍低于 95%。
- 必要前置：远端 CI 首跑通过，并由维护者用 npm 凭证完成 publish。

在远端 CI 首跑和 npm publish 证据出现前，不建议对外宣称“高置信 GA”或“95% 覆盖率已达成”。
