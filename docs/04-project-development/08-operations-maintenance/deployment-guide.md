# 部署与运行说明

**项目名称：** stratix框架以及生态  
**文档状态：** 草稿  
**负责人：** 仓库维护者  
**主要读者：** 维护者 | 开发 | 运维支持  
**上游输入：** 当前状态分析 | 技术选型  
**下游输出：** 运行验证 | 交接说明  
**关联 ID：** `OPS-001`, `OPS-002`  
**最后更新：** 2026-03-28  

## 1. 环境前提

- Node.js `>=24`
- pnpm `>=10`
- 本地可访问 registry 时，可执行联网安装

## 2. 当前已验证入口

- CLI：
  - 先构建 `@stratix/cli`
  - 再执行 `node packages/cli/dist/bin/stratix.js --help`
- CLI 预览样例：
  - 在 `examples/web-admin-preview` 内执行 `pnpm install --ignore-workspace`
  - 再执行 `pnpm build`
  - 预览启动 `pnpm preview --host 127.0.0.1 --port 4273`

## 3. 当前运行约束

- 预览样例需要本地端口监听权限。
- 根级 install/build/test 目前不能视为稳定运维入口。
- 最新验证结论以 `docs/04-project-development/02-discovery/current-state-analysis.md` 为准。

## 4. 当前不建议的做法

- 不要只凭根 README 执行顶层命令。
- 不要把 npm 已发布状态默认推断为与本地版本一致。

## 5. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 部署与运行说明初版 | Codex |
