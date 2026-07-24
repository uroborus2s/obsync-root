# BUG-008 Generated Consumer Smoke 依赖用户 Registry

- 类型：BUG
- 状态：READY_FOR_REMOTE_VERIFICATION
- 优先级：P0
- 阶段：RELEASE_PR_REMEDIATION
- 日期：2026-07-24

## 现象

PR #1 的 push 和 pull_request Quality Gate 都在
`Smoke generated API consumer` 失败。生成项目安装
`@stratix/core@^1.1.0` 时访问 npmjs，但 npmjs 最新版本仍是 `0.8.2`。

## 根因

`scripts/smoke-generated-api.mjs` 只把生成项目的 `@stratix/forge`
替换为 workspace 本地包，没有替换 `@stratix/core`。本地验证因用户级
`@stratix:registry` 隐式指向 Aliyun 而通过；GitHub Actions 没有该配置，
所以同一 smoke 依赖了尚未发布到 npmjs 的 Core。

## 已确认修复边界

- 在 smoke 临时项目中把 `@stratix/core` 指向当前 workspace 本地包。
- 保留模板输出的公开版本范围 `^1.1.0`，不修改生成器契约。
- 不向 CI 注入私库凭据，不发布 Core 到 npmjs，不绕过 Quality Gate。

## 人工确认

用户确认继续使用 Aliyun 作为正式发布目标；CI 使用 workspace 本地 Core，
不访问线上 registry，也不新增 npmjs 发布。
