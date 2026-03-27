# BUG-001 根 build 入口失效

- 类型：BUG
- 状态：OPEN
- 优先级：P1
- 阶段：ANALYSIS
- 预计工作量：0.5 人/天

## 描述

根脚本 `pnpm build` 当前映射为 `turbo run build --filter`，缺少必需的 filter 参数，命令无法执行。

## 证据

- 命令：`pnpm build`
- 结果：`ERROR a value is required for '--filter <FILTER>' but none was supplied`

## 影响

- 根级构建入口不可信
- 容易误导维护者和 CI

## 完成判定

- `pnpm build` 有明确、可重复的目标范围
- 根 README / docs 同步更新对应入口说明
