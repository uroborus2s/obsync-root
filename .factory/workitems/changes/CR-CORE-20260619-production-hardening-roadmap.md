# CR-CORE-20260619 @stratix/core 生产级硬化路线

- 类型：CR
- 状态：DONE_LOCAL_95
- 优先级：P0/P1/P2/P2+
- 阶段：PHASE_6_LOCAL_95_CONTROLLED_RELEASE
- 关联报告：`docs/04-project-development/02-discovery/core-closed-door-review-20260619.md`

## 背景

2026-06-19 `@stratix/core` 闭门复评结论为 83/100，初始口径只能按 RC / controlled release 推进。P0/P1/P2/P2+ 修复后，本地 supported release scope 生产评分达到 `95/100`。该历史分数不替代当前发布准入；2026-06-26 远端 Quality Gate 曾失败，本地修复 `.env.example.tpl` 跟踪问题后仍必须等待远端复跑通过和 npm publish 凭证操作。

## P0：立即修复

- 生产环境禁止默认加密密钥回退。
- 限流默认不信任 `x-forwarded-for`；只有显式 trusted proxy 语义下才读取代理头。
- 根级 `release` 必须先通过 supported build/typecheck/test、core coverage、docs validation、security audit 和 workspace release gate。
- 新增 CI Quality Gate。
- 修正 95+ 质量门禁文档口径，区分目标、实测和 RC 发布口径。

## P1：架构收敛

状态：DONE（兼容式第一阶段）

- 保持 `withRegisterAutoDI` 作为插件作者 API，不做破坏性移除。
- 为应用 discovery 和插件 AutoDI 引入统一 `RegistrationPlan` 中间表示。
- 应用 discovery 返回 `registrationPlan`，应用 DI token 通过 plan token registrar 注册和记录。
- 插件 AutoDI 生成 plugin-scoped plan，覆盖 internal tokens、routes、lifecycle；adapter root token 通过同一 plan token registrar 注册和记录。
- `diagnostics/di.ts` 以 plan metadata 和显式 dependencies 为主，源码推断只作为 fallback；缺失依赖诊断携带 plan metadata。
- `ApplicationBootstrap` 已抽出 `ApplicationDiscoveryRegistrar`，先拆分 discovery / production-manifest 注册职责；环境、配置、HTTP、安全、观测等后续拆分留在后续维护批次。
- `@stratix/core` root export 新增 `experimental` 命名空间暴露 RegistrationPlan helpers，并通过 public API contract 锁定不直接暴露稳定 root helper 名称。

## P2：生产一致性

- 已完成兼容式 production manifest v2 基线，基于 `RegistrationPlan` 生成 app plan 快照，并保留 v1 routes/DI 投影字段。
- manifest v2 已包含 generator metadata、runtime compatibility、app plan scope、source file hash、可选 compiled file/hash；plugin `provides` 深校验已在 P2+ 通过 forge `doctor plugins` 落地。
- 生产模式已支持从 manifest v2 compiled file 注册；strict + `skipRuntimeDiscovery` + `registerFromManifest` 不回退到隐式源码 glob。
- 已新增 manifest verify，校验构建产物缺失、source/compiled hash 不一致、DI/module/plan diagnostics；plugin `provides` 与 adapter token 不匹配会被 `doctor plugins` 报告。
- observability/security preset 已有 request/trace/health/metrics/traces、CORS/header/body/rate-limit 回归；可插拔 metrics/tracing/rate-limit provider、health contributor、readiness/liveness 分离和 provider 失败隔离已落地。
- 已建立 CI-safe 运行稳定性测试：并发请求、并发启动/停止、重复生命周期 shutdown handler；压力/泄漏/长生命周期基准仍需独立 `STRATIX_STRESS=1` 套件。
- core 全包 coverage ratchet 已上调到 lines `43`、functions `38`、branches `34`、statements `42`；当前实测 lines `45.09%`、functions `39.27%`、branches `35.69%`、statements `44.27%`，仍非 95% 全局覆盖率。

## P2+：本地 95 补齐项

状态：DONE

- Core observability/security provider 插拔化：metrics provider、tracing provider、health contributor、rate-limit provider 已进入类型、schema、bootstrap runtime 与回归测试。
- Health 语义收敛：`/ready` 和 base health 包含 contributors 并可返回 503，`/live` 只验证 runtime liveness。
- Provider 故障隔离：metrics/tracing provider 与 metrics snapshot 抛错不破坏业务响应，health contributor 抛错进入 unhealthy readiness，rate-limit provider 抛错退回内置限流器。
- Forge plugin manifest 深校验：`doctor plugins` 会从 `src/index.ts` 推断 `withRegisterAutoDI(pluginFn, ...)` 的插件名，从 `src/adapters` 静态推断 adapter token，报告 stale `provides` 和缺失真实 adapter token。

## 完成判定

- P0：本地和 CI release gate 均通过，生产安全默认值测试覆盖，文档口径与覆盖率事实一致。
- P1：应用和插件注册均能输出同一 plan schema；DI graph、diagnostics、route registration 和 adapter registration 复用统一 plan。当前完成兼容式第一阶段，未做破坏性移除或生产 manifest v2 替换。
- P2：production manifest v2 可校验构建产物完整性，生产启动不依赖隐式源码 glob，CI-safe 性能/并发稳定性测试和 coverage ratchet 已达成本次基线。
- P2+：provider 插拔化和 plugin `provides` 深校验已完成，本地 supported release scope 达到 `95/100`。远端 Quality Gate 复跑、95% 全局覆盖率和 npm publish 不属于本地代码修复完成项，其中远端 CI/npm 仍是发布前外部证据。

## 评分预期

- 完成 P0 后：生产级评分预计 86-88。
- 完成 P1 后：生产级评分预计接近 90。
- 完成 P2 兼容式基线后：生产级评分约 92。
- 完成 P2+ provider 插拔化和 plugin `provides` 深校验后：本地生产级评分达到 `95/100`。该评分不等于 core 全包覆盖率 95%，也不替代远端 Quality Gate 复跑和 npm publish 凭证操作。
