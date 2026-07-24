# 部署与运行说明

**项目名称：** stratix框架以及生态  
**文档状态：** 已发布
**负责人：** 仓库维护者  
**主要读者：** 维护者 | 开发 | 运维支持  
**上游输入：** 当前状态分析 | 技术选型  
**下游输出：** 运行验证 | 交接说明  
**关联 ID：** `OPS-001`, `OPS-002`  
**最后更新：** 2026-07-04

## 1. 环境前提

- Node.js `>=24`
- pnpm `>=11`
- 发布门禁需要访问 public npmjs registry；离线安装门禁依赖当前 pnpm store 已具备锁文件依赖

## 2. 当前已验证入口

- 根级验证：
  - `pnpm run build:supported`
  - `pnpm run typecheck:supported`
  - `pnpm run lint`
  - `pnpm run test:supported`
  - `pnpm run docs:validate`
  - `pnpm run release:gate:dry-run`
- create CLI：
  - `pnpm --filter @stratix/create run build`
  - `node packages/create/dist/bin/create-stratix.js --help`
  - `node packages/create/dist/bin/create-stratix.js list templates`
- forge CLI：
  - `pnpm --filter @stratix/forge run build`
  - `node packages/forge/dist/bin/stratix.js --help`
  - `node packages/forge/dist/bin/stratix.js release gate --scope workspace --dry-run`
- 模板预览样例：
  - 在 `examples/web-admin-preview` 内执行 `pnpm install`
  - 再执行 `pnpm build`
  - 执行 `pnpm lint`
  - 预览启动 `pnpm preview --host 127.0.0.1 --port 4273`

## 3. 当前运行约束

- 预览样例需要本地端口监听权限。
- 根级 install/build/test/docs/release dry-run 已是当前运维入口；真实发布仍必须重跑 `pnpm run release:gate`。
- exact release tags 必须指向最终发布 commit，npm publish 需要维护者凭证。
- 最新验证结论以 `docs/04-project-development/02-discovery/current-state-analysis.md` 为准。

## 4. 当前不建议的做法

- 不要把 npm 已发布状态默认推断为与本地版本一致。
- 不要使用旧 `packages/cli` 口径；当前工具链拆分为 `packages/create` 与 `packages/forge`。
- 不要把 dry-run 或 public npmjs 404 当作发布完成证据。

## 5. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-03-28 | 部署与运行说明初版 | Codex |
| 2026-06-18 | 将运行入口拆分为 `@stratix/create` 与 `@stratix/forge`，不再以旧工具链包名描述 | Codex |
| 2026-07-04 | 更新为 Phase 6 当前根级验证、CLI 烟测和发布前运行约束 | Codex |
