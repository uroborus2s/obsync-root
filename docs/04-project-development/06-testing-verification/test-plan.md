# 测试计划

**项目名称：** stratix框架以及生态  
**文档状态：** 已发布
**负责人：** 仓库维护者  
**主要读者：** QA | 开发 | 管理者  
**上游输入：** 当前状态分析 | PRD | 实施计划  
**下游输出：** 测试报告 | 发布结论  
**关联 ID：** `TC-001` ~ `TC-004`, `BUG-001` ~ `BUG-004`, `TASK-002`
**最后更新：** 2026-06-26

## 1. 测试目标

- 先保证远端 Quality Gate 可信，再追求覆盖率提升。
- 区分本地门禁、远端 CI 门禁、发布门禁和 npm publish 证据。
- core 覆盖率采用当前 ratchet，不把历史生产评分写成 95% 覆盖率。

## 2. 测试策略

| 层次 | 目标 | 责任方 | 自动化方式 |
|---|---|---|---|
| 安装验证 | 锁文件、依赖恢复、环境可重复性 | Dev | `CI=true pnpm install --frozen-lockfile` |
| 构建验证 | supported package 构建一致性 | Dev | `pnpm run build:supported` |
| 类型检查 | 10 个 public package 类型边界 | Dev | `pnpm run typecheck:supported` |
| Lint | supported package 静态检查 | Dev | `pnpm lint` |
| 单元/集成测试 | 包级稳定性 | Dev / QA | `pnpm run test:supported`, targeted package tests |
| 覆盖率 ratchet | core 关键路径回归 | Dev / QA | `pnpm run test:coverage:core` |
| 打包冒烟 | packed core API 与 subpath 可消费性 | Dev / QA | `pnpm run smoke:core-api` |
| 文档验证 | docs 导航与结构 | QA | `pnpm run docs:validate` |
| 安全审计 | 生产依赖高危漏洞 | QA | `pnpm run security:audit` |
| 发布 dry-run | release-surface、pack、API 计划 | Release / QA | `pnpm run release:gate:dry-run` |

## 3. 测试入口与出口

### 入口条件

- 依赖已安装
- 当前 workitems 已明确

### 出口条件

- 远端 `Quality Gate` 在 `1.1.0` 最新提交完整通过
- 根级 `quality:release` 在本地目标环境通过
- 真实发布前 `pnpm run release:gate` 通过
- npm publish 和 exact-version registry 写入由维护者凭证另行执行

## 4. 重点覆盖项

| 需求/风险 | 关键场景 | 验证方式 |
|---|---|---|
| `REQ-002` | 根 install/build/test 是否可信 | 仓级命令验证 + GitHub Actions |
| `REQ-003` | create/forge 与管理端入口是否真实可用 | targeted build/test/run |
| `NFR-001` | 结论是否可追溯到命令结果 | 写入 discovery 与 memory |
| `RISK-004` | core 层是否阻塞整体验证 | `@stratix/core` build/test |
| `RISK-005` | 本地有文件但远端 checkout 缺文件 | `git ls-files`、`git check-ignore`、远端 Quality Gate |

## 5. 测试环境与数据

- 环境说明：Node.js 24.x、pnpm 10.x、本地 workspace
- 账号/权限：运行 preview 时需要本地端口监听权限
- 测试数据：以仓库现有测试和 mock 数据为主

## 6. 角色与安排

| 角色 | 负责人 | 职责 |
|---|---|---|
| QA | 待定 | 定义验证矩阵与退出条件 |
| Dev | 维护者 | 修复根脚本与 core 回归 |

## 7. 风险与应对

| 风险 | 影响 | 预案 |
|---|---|---|
| 只看本地门禁不看远端 Quality Gate | 误判上线状态 | 发布准入必须引用最新远端 CI 结果 |
| 本地未跟踪模板文件参与测试 | 本地通过但远端失败 | 模板文件必须通过 `git ls-files` 进入版本库 |
| 只看本地 manifest 不看 registry/tag | 误判发布状态 | 发布验证强制三方对照 |
| 将生产评分写成覆盖率事实 | 误导 GA 质量口径 | 覆盖率只记录 executable ratchet |

## 8. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 测试计划初版 | Codex |
| 2026-06-26 | 更新为当前 Quality Gate / release gate 矩阵，记录远端 CI 作为发布出口条件 | Codex |
