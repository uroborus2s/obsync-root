# BUG-008 根因调查报告

## 状态

`root_cause_found`，根因与修复边界已获用户确认。

## 单一修复方案

在 `scripts/smoke-generated-api.mjs` 生成的临时
`pnpm-workspace.yaml` 中加入 Core `file:` override，指向
`packages/core`。现有 smoke 命令即为回归检查。

该方案验证当前分支的 Core 和 Forge，不需要 CI 私库凭据，也不改变模板面对真实
消费者时输出的 `^1.1.0` 兼容范围。

## 排除方案

- 不把私库 token 注入 PR CI：测试当前 workspace 不需要外部发布依赖。
- 不提前发布 Core 到 npmjs：超出授权范围且倒置发布门禁顺序。
- 不移除或跳过 smoke：会丢失 BUG-005 建立的发布消费回归覆盖。
