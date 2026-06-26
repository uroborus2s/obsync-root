# TASK-002 建立统一根级验证链与 CI Profile

- 类型：TASK
- 状态：IN_PROGRESS_REMOTE_CI_PENDING
- 优先级：P1
- 阶段：PHASE_6_REMOTE_CI_REMEDIATION
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
- 最新远端 `Quality Gate` 绿灯证据

## 当前进展

- 根级 supported build/typecheck/lint/test、core coverage、packed API smoke、docs、security 和 release dry-run 已有本地通过证据。
- `.github/workflows/quality-gate.yml` 已作为 PR 与 `main` / `1.1.0` 的远端质量门。
- 2026-06-26 远端 run `28231936087` 暴露 P0：create/forge `admin-mock` `.env.example.tpl` 模板本地存在但未进入 Git。
- 本地修复已放行 `.env.example.tpl`，后续必须以远端 Quality Gate 复跑通过作为关闭证据。

## 完成判定

- 根 install/build/test 命令可在标准环境下复现
- CI 不再依赖口头约定或包级临时命令
- 最新远端 `Quality Gate` 完整通过到 `release:gate:dry-run`
