# BUG-008 Generated Consumer Smoke Registry 隔离

## 目标

让 `smoke:generated-api` 在没有用户级 `@stratix` registry 配置时，使用当前
workspace 的 Core 和 Forge 完成生成项目消费验证。

## 验收标准

- 禁用用户 npm 配置并显式使用 npmjs 时，generated API smoke 通过。
- 生成项目 `package.json` 仍声明 `@stratix/core: ^1.1.0`。
- `stratix doctor`、build、config help 和 strict OpenAPI 检查继续执行。
- 完整 `quality:release` 在禁用用户 npm 配置时通过。
- 不发布 npmjs，不向 CI 注入 Aliyun 凭据，不绕过 Quality Gate。

## 允许范围

- `scripts/smoke-generated-api.mjs`
- BUG-008 evidence、reports、review、ledger
- current-state、project memory 和 discovery 状态同步
