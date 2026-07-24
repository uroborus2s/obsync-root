# 实施方案

**项目名称：** stratix框架以及生态  
**文档状态：** 已发布
**负责人：** 仓库维护者  
**主要读者：** 技术负责人 | 开发 | QA | 项目经理  
**上游输入：** PRD | 当前状态分析 | 架构设计 | 模块边界  
**下游输出：** 工作项 | 测试计划 | 发布计划  
**关联 ID：** `TASK-001`, `TASK-002`, `TASK-003`, `TASK-004`, `BUG-001`, `BUG-002`, `BUG-003`, `BUG-004`, `CR-001`
**最后更新：** 2026-07-04

## 1. 实施目标

- 建立可持续的软件工厂治理基线
- 修复根级安装 / 构建 / 测试阻塞
- 统一发布口径与仓级入口文档
- 固化 create/forge CLI 边界、发布检查清单和运维巡检入口

## 2. 交付波次

| 波次 | 范围 | 输入 | 输出 | 完成判定 |
|---|---|---|---|---|
| Wave 1 | 基线与 workitems | 当前状态分析 | `docs/`、`.factory/`、初始工作项 | 已完成，`TASK-001` 关闭 |
| Wave 2 | 构建与测试修复 | `BUG-001` ~ `BUG-004` | 可靠 install/build/test/docs 入口 | 已完成，远端 Quality Gate 通过 |
| Wave 3 | 发布面对齐 | `CR-001`, `TASK-004` | 统一版本、tag、registry、release gate 策略 | 已完成 RC 候选口径；npm publish 待发布者执行 |

## 3. 任务分解

| `TASK` | 内容 | 对应需求 | 前置依赖 | 负责人 | 预计产物 |
|---|---|---|---|---|---|
| `TASK-001` | 完成历史项目 requirements/design baseline | `REQ-001` ~ `REQ-005` | 当前状态分析 | 维护者 | 已完成；基线文档、CLI 接口矩阵、发布检查清单与运维手册 |
| `TASK-002` | 建立统一根级验证与 CI profile | `REQ-002`, `NFR-001` | `BUG-001`, `BUG-002`, `BUG-003`, `BUG-004` | 维护者 | 已完成；可靠验证入口和远端 Quality Gate |
| `TASK-003` | Stratix 95+ 重构门禁 | `REQ-002`, `NFR-001`, `NFR-004` | 核心修复批次 | 维护者 | 已完成；supported release scope 本地 95+ 证据 |
| `TASK-004` | Phase 6 发布准备门禁 | `REQ-002`, `REQ-004`, `NFR-001` | `BUG-003`, `CR-001` | 维护者 | 已完成；workspace release gate 和 release surface 规则 |

## 4. 风险与应对

| 风险 | 影响 | 触发信号 | 应对策略 |
|---|---|---|---|
| 根 test profile 继续失真 | 验证结果误导 | `pnpm test` 被 “No test files found” 或浅层失败抢先击穿 | 先统一 no-test 策略，再谈 CI 可信度 |
| 核心包测试回归扩大 | 阻塞发布 | `@stratix/core` test 继续失败 | 作为优先级最高的包级 bug |
| 发布口径继续分裂 | 无法交付 | manifest/tag/registry 持续不一致 | 单独作为 `CR-001` 推进 |
| 发布外部证据缺失 | 不能标记 GA | exact tags 未推送、npm publish 未执行 | 按发布检查清单由发布者执行并回写证据 |

## 5. 测试与发布配合

- 每个波次都要补充 discovery 与 memory 中的事实更新。
- 发布外部证据完成后，需要立即回写 `current-state-analysis.md`、release notes、`.factory/project.json` 和 `.factory/memory/current-state.md`。

## 6. 里程碑

| 节点 | 日期 | 负责人 | 验收标准 |
|---|---|---|---|
| 基线完成 | 2026-03-28 | Codex | `docs/`、`.factory/`、工作项建档完成 |
| 根验证链恢复 | 2026-06-26 | 维护者 | 根 install/build/test/docs/release dry-run 与远端 Quality Gate 通过 |
| 发布口径统一 | 2026-06-26 | 维护者 | manifest/tag/registry release gate 规则对齐 |
| 文档基线收口 | 2026-07-04 | Codex | CLI 接口、发布检查清单、运维手册、追踪矩阵和 `TASK-001` 状态同步 |

## 7. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 实施计划初版 | Codex |
| 2026-07-04 | 将实施计划更新为 Phase 6 基线收口口径，补入 TASK-003/TASK-004 与发布外部证据边界 | Codex |
