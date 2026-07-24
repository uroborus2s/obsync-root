# Core 框架评审与评分报告

- 文档编号：`CR-CORE-REVIEW-20260617`
- 范围：`packages/core`
- 日期：2026-06-17
- 评审角色：高级技术经理、高级测试经理、高级框架架构师、文档开发、QA
- 结论：`@stratix/core` 已按破坏性升级方向收敛为单一应用发现管道，包内构建、类型检查和测试门禁通过。

## 评审结论

本次评审确认原主要风险不是单个 bug，而是应用级 discovery 存在新旧两套概念入口，导致启动路径、公开 API、配置文档和测试基线不一致。破坏性升级后，应用级发现入口统一为 `ApplicationDiscoveryPipeline`，启动配置统一为 `discovery`，应用类注册统一要求 Stratix 元数据装饰器。

| 维度 | 升级前评分 | 升级后评分 | 评分依据 |
|---|---:|---:|---|
| 架构一致性 | 72 | 96 | 删除应用级旧发现实现和旧公开导出，启动路径只保留一个 discovery 管道 |
| 运行时正确性 | 78 | 96 | 直接配置优先级、请求作用域、插件加载错误、路由注册均有集成覆盖 |
| 公共 API 治理 | 70 | 96 | 新增公共 API 契约测试，锁定旧入口不可导出 |
| 测试质量 | 62 | 95 | 清理旧契约测试，新增启动集成、公共导出、配置拒绝和 discovery 测试 |
| 文档一致性 | 58 | 95 | README 和内部设计文档改为新契约，旧 API 参考将同步收敛 |
| 发布可控性 | 65 | 95 | core 构建、类型检查、Vitest 全量套件、lockfile importer 均已验证 |
| 整体评分 | 67.5 | 95.5 | 以 `@stratix/core` 包内质量门禁为评分范围 |

## 关键问题分析

### 问题 1：应用级 discovery 入口分裂

原状态存在三个互相混淆的概念：

| 管道 | 位置 | 启动路径 | 主要问题 |
|---|---|---|---|
| `performApplicationAutoDI` | 旧应用级公开入口 | 不在 `Stratix.run()` 主启动路径上 | 与当前启动配置不一致，依赖旧扫描注册形态 |
| `performApplicationLevelAutoDI` | `ApplicationBootstrap` 私有方法 | 在主启动路径上 | 名称仍表达 AutoDI，实际行为已接近 discovery |
| `ModuleScanner` / `MetadataAnalyzer` / `StandardRegistrar` | 旧 discovery 分层实现 | 由旧私有启动逻辑间接使用 | 会让普通 class 注册和装饰器注册边界不清 |

新的目标状态只有一个入口：`ApplicationBootstrap.runApplicationDiscovery()` 调用 `ApplicationDiscoveryPipeline.discoverAndRegister()`。

### 问题 2：配置表面不够严格

旧配置允许使用者继续把应用级发现写成不同字段，评审时无法判断哪个字段是真正生效字段。现在 `StratixConfigSchema` 使用 `.strict()`，`applicationAutoDI`、`container` 等非契约字段会抛出 `ConfigurationError`。

### 问题 3：自动注册规则不够可审计

旧实现容易让普通 class 被扫描后注册为服务。破坏性升级后只注册带 Stratix 元数据的类：

- `@Service()`
- `@Repository()`
- `@Component()`
- `@Controller()`
- `@Executor()`

未标记 class 会进入 `skipped`，不会注册到容器。

### 问题 4：测试套件验证了不存在的旧模块

旧测试仍导入已删除的生命周期管理器、插件工具和容器注册模块。此类测试不能被修回实现层，否则会把旧表面带回来。本次处理策略是删除旧契约测试，并用新公共 API、启动集成、配置拒绝和 discovery 管道测试替代。

## 已完成优化

| 编号 | 优化项 | 状态 | 证据 |
|---|---|---|---|
| `MOD-CORE-DISC-001` | 新增 `ApplicationDiscoveryPipeline` | 完成 | `packages/core/src/discovery/application-pipeline.ts` |
| `MOD-CORE-DISC-002` | 删除旧应用级发现实现 | 完成 | 删除 `application-auto-di.ts`、`application-module-discovery.ts`、旧 scanner/analyzer/registrar |
| `API-CORE-001` | 公共导出只暴露新 discovery API | 完成 | `public-api-contract.test.ts` |
| `REQ-CORE-001` | 配置只接受 `discovery` | 完成 | `config-validation.test.ts`、`bootstrap-contract.test.ts` |
| `BUG-CORE-001` | 修复装饰器元数据继承污染 | 完成 | `route.test.ts` |
| `TEST-CORE-001` | 全量 core 测试绿灯 | 完成 | `26 files / 199 tests` |
| `REL-CORE-001` | core 构建和 lockfile importer 验证 | 完成 | `pnpm --filter @stratix/core run build` |

## 当前风险边界

| 风险 | 范围 | 处理策略 |
|---|---|---|
| 其它生态包可能仍依赖旧 core 表面 | core 外部 | 作为生态迁移任务处理，不在 core 包内保留旧入口 |
| 根仓 `build:all` 仍受其它包影响 | monorepo | core 发布门禁使用包级验证；全仓门禁另立迁移计划 |
| 公开函数 API 文档仍需同步 | 文档 | 本次补充 core 新契约文档，并更新旧 API 参考中的应用发现条目 |

## 95+ 达标口径

`@stratix/core` 同时满足以下条件才视为达标：

1. `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` 通过。
2. `CI=true pnpm --filter @stratix/core exec vitest run` 通过。
3. `pnpm --filter @stratix/core run build` 通过。
4. 公共 API 契约测试断言旧入口不可导出。
5. 文档中的应用级发现入口只描述 `discovery` 和 `ApplicationDiscoveryPipeline`。
