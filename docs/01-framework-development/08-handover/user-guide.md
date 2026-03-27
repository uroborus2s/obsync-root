# 使用与接手说明

**项目名称：** stratix框架以及生态  
**文档状态：** 草稿  
**负责人：** 仓库维护者  
**主要读者：** 新维护者 | 协作代理 | 技术负责人  
**上游输入：** 文档中心 | 当前状态分析 | 项目基线  
**下游输出：** 后续维护与修复任务  
**关联 ID：** `DOC-001`  
**最后更新：** 2026-03-28  

## 1. 首次接手建议阅读顺序

1. `README.md`
2. `AGENTS.md` 或 `GEMINI.md`
3. `.factory/project.json`
4. `.factory/memory/current-state.md`
5. `docs/01-framework-development/01-discovery/current-state-analysis.md`

## 2. 如何理解当前仓库

- 先区分公共包与私有应用。
- 再区分“声明脚本”和“已验证入口”。
- 最后再进入具体 workitems。

## 3. 当前最重要的事实

- 仓库结构真实存在，且并非整体不可用。
- CLI 和 `examples/web-admin-preview` 已有可验证入口。
- 根 build/test 与 core build/test 当前仍是主要阻塞。

## 4. 后续接手方式

- 先按 `.factory/workitems/` 读取 `BUG`、`CR`、`TASK`
- 推进后同步更新 discovery、memory 和 workitems

## 5. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 交接说明初版 | Codex |
