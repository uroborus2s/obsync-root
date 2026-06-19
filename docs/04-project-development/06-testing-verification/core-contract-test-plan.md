# Core 契约测试计划

- 文档编号：`TEST-CORE-CONTRACT-20260617`
- 范围：`packages/core`、`packages/testing`

## 测试策略

本次升级的测试目标是锁定破坏性新契约，而不是让旧用法继续运行。测试分为四层：

| 层级                 | 代表测试                                           | 验证内容                                                                                                                                                                    |
| -------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 装饰器单元           | `component.test.ts`、`route.test.ts`               | 元数据写入、读取、继承隔离                                                                                                                                                  |
| route contract       | `route-contract.test.ts`、`error-envelope.test.ts` | route schema 提取、contract diagnostics、OpenAPI 文档生成、统一错误 envelope schema/factory                                                                                 |
| testing platform DSL | `contract-test.test.ts`、`test-platform.test.ts`   | 基于 route contract 验证 app.inject 响应状态、response schema、错误 envelope schema，并覆盖 test app、DI override、plugin/discovery/repository/module fixture               |
| DI diagnostics       | `di-diagnostics.test.ts`、`registration-plan.test.ts` | DI graph、缺失依赖、重复 token、循环依赖、RegistrationPlan metadata                                                                                                         |
| discovery 管道       | `application-pipeline.test.ts`                     | 扫描、显式组件注册、路由前缀、Fastify schema validation、RegistrationPlan 输出和 DI metadata recording                                                                      |
| 启动集成             | `application-discovery-bootstrap.test.ts`、`application-runtime-stability.test.ts` | `Stratix.run()` 到 DI、请求 scope、路由响应、response schema failure envelope、production manifest consumption、manifest-driven registration、production manifest v2 compiled-file registration、observability/security preset、并发请求与生命周期稳定性 |
| production manifest  | `production-manifest.test.ts`                     | v1/v2 manifest 加载、v2 artifact hash、strict/fallback、RegistrationPlan 到 compiled-file registration plan 映射                                                            |
| 公共 API             | `public-api-contract.test.ts`                      | 新导出存在，旧根导出不存在                                                                                                                                                  |

## 必跑命令

| 命令                                                                | 当前结果                   |
| ------------------------------------------------------------------- | -------------------------- |
| `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit`    | 通过                       |
| `CI=true pnpm --filter @stratix/core exec vitest run`               | 通过，31 files / 221 tests |
| `pnpm --filter @stratix/core run build`                             | 通过                       |
| `pnpm --filter @stratix/testing exec tsc -p tsconfig.json --noEmit` | 通过                       |
| `pnpm --filter @stratix/testing test`                               | 通过，3 files / 12 tests   |
| `pnpm --filter @stratix/testing build`                              | 通过                       |

## 覆盖重点

| 编号            | 风险                                             | 测试要求                                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RISK-CORE-001` | 旧 API 被重新导出                                | 公共 API 契约测试必须失败                                                                                                                                                                                                                      |
| `RISK-CORE-002` | 未标记 class 被自动注册                          | discovery 测试必须断言 skipped                                                                                                                                                                                                                 |
| `RISK-CORE-003` | 请求作用域 token 不可注入                        | 启动集成测试必须从 controller 读取 `requestId`                                                                                                                                                                                                 |
| `RISK-CORE-004` | 配置字段漂移                                     | 配置验证测试必须拒绝非契约字段                                                                                                                                                                                                                 |
| `RISK-CORE-005` | 插件失败丢失上下文                               | 插件加载测试必须断言 `PluginLoadError` 和 `pluginName`                                                                                                                                                                                         |
| `RISK-CORE-006` | route schema 只保存但不进入 Fastify              | discovery 集成测试必须验证非法 query 返回 400                                                                                                                                                                                                  |
| `RISK-CORE-007` | OpenAPI 从非契约源反推导致信息丢失               | OpenAPI 纯函数测试必须从 route contracts 生成 paths                                                                                                                                                                                            |
| `RISK-CORE-008` | DI doctor 无法解释缺失/重复/循环                 | DI diagnostics 测试必须覆盖 duplicate、missing、cycle                                                                                                                                                                                          |
| `RISK-CORE-009` | contract tests 与 runtime route contract 脱节    | `@stratix/testing` `contractTest()` 必须复用 core route contract 与 diagnostics                                                                                                                                                                |
| `RISK-CORE-010` | 错误响应与契约文档脱节                           | core 必须导出共享错误 envelope schema/factory，bootstrap 和 `contractTest()` 必须复用                                                                                                                                                          |
| `RISK-CORE-011` | 测试平台绕开真实 runtime                         | `createTestApp()` 必须包装真实 `Stratix.run()` 非监听模式，并通过 `app.inject` 验证路由                                                                                                                                                        |
| `RISK-CORE-012` | fixture 侵入生产 runtime                         | discovery/module/repository fixture 必须只存在于 testing 包，不改变应用启动和 core runtime                                                                                                                                                     |
| `RISK-CORE-013` | production manifest 配置漂移或失效               | bootstrap/config 测试必须覆盖 `discovery.productionManifest` 验收、strict invalid manifest fail-fast、loaded artifact 暴露、`skipRuntimeDiscovery` 跳过 runtime glob discovery 和 `registerFromManifest` 从 v2 `compiledFile` / v1 source files 注册 DI/路由 |
| `RISK-CORE-014` | observability/security preset 只接受配置但不生效 | bootstrap/config 测试必须覆盖 request/trace id、health、metrics、traces、CORS、headers、rate limit 和 body limit 配置验收                                                                                                                      |
| `RISK-CORE-015` | 应用 discovery 与插件 AutoDI 诊断模型漂移        | `RegistrationPlan`、应用 discovery、插件 adapter 和 public API 测试必须覆盖统一 plan schema、plan token registrar、DI graph metadata 和 experimental 出口边界                                                                                   |
| `RISK-CORE-016` | production manifest v2 被篡改或退回源码 glob     | `production-manifest.test.ts` 与 bootstrap 集成测试必须覆盖 v2 source/compiled hash 校验、compiled-file registration、strict 模式不回退 runtime glob、stale/missing artifact fail-fast |
| `RISK-CORE-017` | 并发请求和生命周期重复执行不稳定                 | runtime stability 测试必须覆盖并发 request scope、并发 CLI app start/stop、重复 shutdown handler 调用次数                                                                    |

## 准入门槛

任何 core 修改必须至少运行：

```bash
pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit
CI=true pnpm --filter @stratix/core exec vitest run
pnpm --filter @stratix/core run build
pnpm --filter @stratix/testing exec tsc -p tsconfig.json --noEmit
pnpm --filter @stratix/testing test
```
