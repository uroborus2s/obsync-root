# TASK-002 建立统一根级验证链与 CI Profile

- 类型：TASK
- 状态：OPEN
- 优先级：P1
- 阶段：ANALYSIS
- 预计工作量：1.5 人/天

## 目标

让维护者和 CI 都能使用同一组可靠的根级 install/build/test/run 验证入口。

## 前置依赖

- `BUG-001`
- `BUG-002`
- `BUG-003`
- `BUG-004`

## 预期产物

- 稳定的根级脚本
- 明确的 CI 命令矩阵
- 与 discovery / memory 同步的验证文档

## 完成判定

- 根 install/build/test 命令可在标准环境下复现
- CI 不再依赖口头约定或包级临时命令
