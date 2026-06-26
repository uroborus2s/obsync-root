# BUG-002 @stratix/core 构建与测试回归

- 类型：BUG
- 状态：CLOSED
- 优先级：P1
- 阶段：ANALYSIS
- 预计工作量：2.0 人/天

## 描述

`@stratix/core` 在最新依赖栈下暴露出构建与测试回归。2026-03-29 已完成 build 侧修复，包括 logger overload、`unknown` 收窄和 `pino@10` 兼容；当前 core 构建、类型检查、测试与 coverage ratchet 已恢复。

## 证据

- `pnpm --filter @stratix/core build` 已通过
- `pnpm build:all` 已不再被 core 阻塞
- `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` 已通过
- `CI=true pnpm --filter @stratix/core exec vitest run` 已通过，34 个测试文件 / 261 项测试
- `pnpm run test:coverage:core` 已通过，当前 coverage ratchet 通过但不代表 95% 全局覆盖率
- 本轮构建修复包含：
  - logger 重载兼容层
  - `unknown` 显式收窄
  - `pino@10` 的 `stdSerializers` 适配
- 2026-06-26 远端 Quality Gate 失败点在 forge/create `admin-mock` 模板文件缺失，不是 core 回归。

## 影响

- 曾阻塞统一构建与测试链
- 阻塞后续发布与版本对齐

## 完成判定

- `pnpm --filter @stratix/core test` 通过
- 根 `pnpm test` 不再被 core 套件或核心测试配置阻塞

## 关闭结论

该 BUG 已关闭。后续远端 Quality Gate 复跑由 `TASK-002` 和 `BUG-004` 跟踪。
