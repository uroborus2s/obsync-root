# BUG-004 workspace 包图构建与测试链不稳定

- 类型：BUG
- 状态：OPEN
- 优先级：P1
- 阶段：ANALYSIS
- 预计工作量：2.0 人/天

## 描述

移除 `apps/admin-dashboard` 并完成 Node 24 / TypeScript 6 升级后，根工作区的真实阻塞进一步收敛：包图构建已恢复，但 `pnpm test` 仍受多包测试配置和 no-test 策略影响而不稳定。

## 证据

- `pnpm build:all` 现已通过，说明当前包图构建不再是首要阻塞
- `pnpm test` 中：
  - `@stratix/queue` 与 `@stratix/ossp` 因 “No test files found” 直接 exit 1
  - `@stratix/redis`、`@stratix/core`、`@stratix/database`、`@stratix/tasks`、`@stratix/testing`、`@stratix/was-v7` 等仍需逐包复核 Vitest 4 兼容性与真实失败原因

## 影响

- 根级 CI / 验证入口无法稳定反映测试面真实健康度
- 当前难以区分“没有测试”和“测试失败”的语义
- test 报错顺序会掩盖更深层的问题

## 完成判定

- `pnpm test` 对“无测试包”有统一策略
- `was-v7`、`ossp`、`queue` 等包的测试配置不再破坏根级验证
