# BUG-004 workspace 包图构建与测试链不稳定

- 类型：BUG
- 状态：CLOSED
- 优先级：P1
- 阶段：PHASE_6_REMOTE_CI_REMEDIATION
- 预计工作量：2.0 人/天

## 描述

移除 `apps/admin-dashboard` 并完成 Node 24 / TypeScript 6 升级后，根工作区的真实阻塞进一步收敛。当前 supported package 图本地可构建和测试；未跟踪的 create/forge `admin-mock` `.env.example.tpl` 模板文件已进入 Git，并通过最新远端 Quality Gate 验证。

## 证据

- `pnpm run build:supported` 覆盖当前 10 个 public packages。
- `pnpm run test:supported` 本地覆盖 12 个 turbo test tasks。
- 2026-06-26 远端 run `28231936087` 在 `@stratix/forge#test` 失败：
  - `packages/create/templates/presets/admin-mock/files/.env.example.tpl` 缺失
  - `packages/forge/templates/presets/admin-mock/files/.env.example.tpl` 缺失
- 两个文件本地存在但被 `.gitignore` 的 `.env.*` 忽略，导致远端 checkout 缺文件。
- 2026-06-26 远端 run `28234054546` 已在提交 `457357f6e3285afdd7f5ed6f496cdf8962fd0183` 上通过，覆盖 install、build、typecheck、lint、test、coverage、smoke、docs、安全审计和 release dry-run。

## 影响

- 根级 CI / 验证入口无法稳定反映测试面真实健康度
- 本地未跟踪文件可能让本地测试通过、远端测试失败

## 完成判定

- `pnpm run test:supported` 在本地目标环境通过
- 最新远端 `Quality Gate` 完整通过
- create/forge preset 模板文件通过 `git ls-files` 可见
