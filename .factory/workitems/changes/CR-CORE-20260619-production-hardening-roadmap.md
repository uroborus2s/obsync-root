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

- 保持 `withRegisterAutoDI` 作为插件作者 API，不做破坏性移除。
- 为应用 discovery 和插件 AutoDI 引入统一 `RegistrationPlan` 中间表示。
- 将应用组件、插件内部模块、adapter、route、lifecycle 都收敛到统一 registrar。
- 所有注册路径补齐统一 diagnostics recorder。
- `diagnostics/di.ts` 以 plan metadata 为主，源码推断只作为 fallback。
- 拆分 `ApplicationBootstrap` 的环境、配置、容器、插件编排、发现注册、HTTP、安全、观测、生命周期职责。
- 收敛 `@stratix/core` root export，区分 stable / experimental / internal。

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
- P1：应用和插件注册均能输出同一 plan schema；DI graph、diagnostics、route registration 和 adapter registration 复用统一 plan。
- P2：production manifest v2 可校验构建产物完整性，生产启动不依赖隐式源码 glob，性能/并发/覆盖率门禁达标。

## 评分预期

- 完成 P0 后：生产级评分预计 86-88。
- 完成 P1 后：生产级评分预计接近 90。
- 完成 P2 且覆盖率/性能/CI 证据稳定后：生产级评分才有条件接近 95。
