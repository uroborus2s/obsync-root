# CR-CORE-20260619 @stratix/core 生产级硬化路线

- 类型：CR
- 状态：IN_PROGRESS
- 优先级：P0/P1/P2
- 阶段：PHASE_6_RELEASE_READY
- 关联报告：`docs/04-project-development/02-discovery/core-closed-door-review-20260619.md`

## 背景

2026-06-19 `@stratix/core` 闭门复评结论为 83/100，当前只能按 RC / controlled release 推进。核心短板包括发布门禁、安全默认值、覆盖率策略、应用 discovery 与插件 AutoDI 注册模型、public API 边界、production manifest 完整性、DI diagnostics、观测/限流 provider、性能并发测试。

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

- 升级 production manifest v2，基于 `RegistrationPlan` 生成。
- manifest v2 包含 app/plugin plan、scope、adapter token、lifecycle、source/compiled file、hash、package version、generator version 和 runtime compatibility。
- 生产模式支持只从 manifest v2 + compiled file 注册，严格模式禁止隐式源码 glob。
- 新增 manifest verify，校验构建产物缺失、hash 不一致、route/token 漂移、plugin provides 不匹配。
- 引入 metrics/tracing/rate-limit provider 与 health contributor。
- 建立性能、并发、泄漏和长生命周期测试。
- 将 core 全包覆盖率从当前 ratchet 逐步提升到正式门禁目标。

## 完成判定

- P0：本地和 CI release gate 均通过，生产安全默认值测试覆盖，文档口径与覆盖率事实一致。
- P1：应用和插件注册均能输出同一 plan schema；DI graph、diagnostics、route registration 和 adapter registration 复用统一 plan。当前完成兼容式第一阶段，未做破坏性移除或生产 manifest v2 替换。
- P2：production manifest v2 可校验构建产物完整性，生产启动不依赖隐式源码 glob，性能/并发/覆盖率门禁达标。

## 评分预期

- 完成 P0 后：生产级评分预计 86-88。
- 完成 P1 后：生产级评分预计接近 90。
- 完成 P2 且覆盖率/性能/CI 证据稳定后：生产级评分才有条件接近 95。
