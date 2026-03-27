# BUG-004 workspace 包图构建与测试链不稳定

- 类型：BUG
- 状态：OPEN
- 优先级：P1
- 阶段：ANALYSIS
- 预计工作量：2.0 人/天

## 描述

移除 `apps/admin-dashboard` 后，根工作区的真实阻塞更清晰暴露出来：`build:all` 和 `test` 不是单点失败，而是多个包的构建/测试配置共同不稳定。

## 证据

- `pnpm build:all` 首先失败在 `@stratix/ossp`，报 `Cannot find module '@stratix/core'`
- `pnpm test` 中：
  - `@stratix/queue` 与 `@stratix/ossp` 因 “No test files found” 直接 exit 1
  - `@stratix/was-v7` 出现 vitest startup error
  - `@stratix/core`、`@stratix/database`、`@stratix/redis`、`@stratix/tasks` 等继续被拖累

## 影响

- 根级 CI / 验证入口无法稳定反映包图真实健康度
- 当前难以区分“没有测试”和“测试失败”的语义
- build/test 报错顺序会掩盖更深层的问题

## 完成判定

- `pnpm build:all` 能稳定跑完包图或给出明确、可接受的失败边界
- `pnpm test` 对“无测试包”有统一策略
- `was-v7`、`ossp`、`queue` 等包的测试/构建配置不再破坏根级验证
