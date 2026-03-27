# BUG-002 @stratix/core 构建与测试回归

- 类型：BUG
- 状态：OPEN
- 优先级：P1
- 阶段：ANALYSIS
- 预计工作量：2.0 人/天

## 描述

`@stratix/core` 当前同时阻塞 `build:all` 和根测试。问题既包含 TypeScript 编译错误，也包含大量测试回归。

## 证据

- `pnpm build:all` 在 `packages/core/src/bootstrap/application-bootstrap.ts` 与 `packages/core/src/plugin/controller-registration.ts` 报 TS 错误
- `pnpm test` 中 `@stratix/core` 出现 109 个失败测试和 28 个失败文件

## 影响

- 阻塞统一构建与测试链
- 阻塞后续发布与版本对齐

## 完成判定

- `pnpm --filter @stratix/core build` 通过
- `pnpm --filter @stratix/core test` 通过
- 根 `pnpm build:all` 与 `pnpm test` 不再被 core 阻塞
