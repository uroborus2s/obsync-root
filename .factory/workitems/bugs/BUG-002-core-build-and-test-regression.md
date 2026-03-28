# BUG-002 @stratix/core 构建与测试回归

- 类型：BUG
- 状态：IN_PROGRESS
- 优先级：P1
- 阶段：ANALYSIS
- 预计工作量：2.0 人/天

## 描述

`@stratix/core` 在最新依赖栈下暴露出构建与测试回归。2026-03-29 已完成 build 侧修复，包括 logger overload、`unknown` 收窄和 `pino@10` 兼容；当前剩余问题集中在测试层回归与根测试链中的继续验证。

## 证据

- `pnpm --filter @stratix/core build` 已通过
- `pnpm build:all` 已不再被 core 阻塞
- 本轮构建修复包含：
  - logger 重载兼容层
  - `unknown` 显式收窄
  - `pino@10` 的 `stdSerializers` 适配
- `pnpm test` 仍未完成根级收敛，core 套件需要在升级后重新逐项验证

## 影响

- 曾阻塞统一构建与测试链
- 阻塞后续发布与版本对齐

## 完成判定

- `pnpm --filter @stratix/core test` 通过
- 根 `pnpm test` 不再被 core 套件或核心测试配置阻塞
