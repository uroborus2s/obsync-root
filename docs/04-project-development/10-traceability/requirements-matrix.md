# 需求追踪矩阵

**项目名称：** stratix框架以及生态  
**文档状态：** 已发布
**负责人：** 仓库维护者  
**主要读者：** 架构 | QA | 维护者  
**上游输入：** PRD | 当前状态分析 | 工作项  
**下游输出：** 测试计划 | 发布计划 | 工作项推进  
**关联 ID：** `REQ-001` ~ `REQ-005`, `NFR-001` ~ `NFR-004`  
**最后更新：** 2026-07-04

| 需求 | 模块/文档 | 测试/验证 | 当前工作项 | 状态 |
|---|---|---|---|---|
| `REQ-001` 正式事实源 | `docs/`, `.factory/` | discovery / memory 双写 | `TASK-001` | 已满足 |
| `REQ-002` 验证 install/build/test/run | `current-state-analysis.md`, `test-plan.md`, `operations-runbook.md` | 命令验证 | `BUG-001`, `BUG-002`, `BUG-003`, `TASK-002` | 已满足 |
| `REQ-003` 明确包与职责边界 | `system-architecture.md`, `module-boundaries.md`, `api-design.md` | 包清单与 CLI 接口矩阵核对 | `TASK-001` | 已满足 |
| `REQ-004` 迁移 README 瞬时状态 | `README.md`, discovery docs, release docs | 文档审查 | `CR-001` | 已满足 |
| `REQ-005` 用工作项治理 | `.factory/workitems/*` | 工作项存在性审查 | `BUG-*`, `CR-*`, `TASK-*` | 已满足 |
| `NFR-001` 证据可追溯 | `project.json`, current-state docs, release checklist | 命令与文件对照 | `TASK-002`, `TASK-004` | 已满足 |
| `NFR-002` 稳定/瞬时分层 | `AGENTS.md`, `GEMINI.md`, `README.md` | 文档审查 | `CR-001` | 已满足 |
| `NFR-003` Node/pnpm 环境可复现 | 安装验证 | install 命令矩阵 | `BUG-003` | 已满足 |
| `NFR-004` 四类资产同步 | docs + memory + code + tests | 变更检查 | 全部工作项 | 已满足 |

## 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 需求追踪矩阵初版 | Codex |
| 2026-07-04 | 将 TASK-001、TASK-002、TASK-004 和 BUG/CR 收口后的需求状态更新为已满足 | Codex |
