# 发布说明

**项目名称：** stratix框架以及生态
**文档状态：** 已发布
**负责人：** 仓库维护者
**主要读者：** 发布维护者 | 开发 | 管理者
**上游输入：** 当前状态分析 | Phase 6 发布准备门禁 | release gate 日志
**下游输出：** 发布核对清单 | 版本标签 | npm publish 操作
**关联 ID：** `CR-001`, `TASK-004`, `BUG-003`, `REL-001`
**最后更新：** 2026-06-18

## 1. 本次说明性质

这是 Phase 6 发布准备说明，用来固定 `@stratix/*` supported scope 在代码、测试、文档、pack artifact、git tag 和 public npm registry 之间的发布口径。

它不等同于已经完成 npm publish。npm publish 仍需要发布者凭证和人工发布动作；本说明只确认仓库已经具备可发布前置条件。

## 2. 发布范围

Phase 6 supported packages:

- `@stratix/core@1.1.0`
- `@stratix/create@1.1.0`
- `@stratix/database@1.1.0`
- `@stratix/devtools@1.0.0-beta.1`
- `@stratix/forge@1.1.0`
- `@stratix/ossp@0.0.1-beta.3`
- `@stratix/queue@1.0.0-beta.2`
- `@stratix/redis@1.0.0-beta.2`
- `@stratix/testing@1.0.0-beta.1`
- `@stratix/was-v7@1.0.0-beta.36`

`@stratix/tasks@1.0.0-beta.5` 已从 workspace、create/forge preset 模板和发布面物理移除，不再作为 npm publish 候选。后续如恢复，必须以新包方式重新立项处理。

## 3. 发布面结论

- public npmjs 上仅 `@stratix/core` 存在历史公开版本，latest 为 `0.8.2`，修改时间 `2026-01-07T12:57:22.097Z`。
- public npmjs 上 `@stratix/core@1.1.0` 未发布。
- public npmjs 上 `@stratix/create`、`@stratix/database`、`@stratix/devtools`、`@stratix/forge`、`@stratix/ossp`、`@stratix/queue`、`@stratix/redis`、`@stratix/testing`、`@stratix/was-v7` 当前返回 404。
- `stratix release gate --scope workspace --include-registry` 固定查询 public npmjs 的 exact package version；404 代表该版本尚未占用，允许继续发布准备；如果 exact version 已存在则阻断发布。
- 本地全局 npm scope registry 可能指向私有/镜像地址；Phase 6 registry gate 不使用该配置作为 public release surface 事实源。

## 4. 发布门禁

Phase 6 workspace release gate 覆盖：

- frozen offline install
- supported build
- supported test
- docs-stratego 文档校验
- supported package pack artifact 校验
- API static gate
- exact package git tag gate
- public npmjs exact version registry gate

`pack` gate 不再只执行 `pnpm pack`，而是逐包先构建，再校验 tarball 同时满足：

- `package.json` 的 `main` 与 `types` entry files 存在于 tarball
- tarball 不包含 `.turbo/`、`src/`、`test/`、`tests/`、`test-fixtures/`、`coverage/`、`tsconfig.json`、`vitest.config.ts` 或 `*.tsbuildinfo`

## 5. 遗留决策

- `packages/forge/templates/apps` 与 `packages/forge/templates/plugins` 是 create-only 旧模板残留，已在获得人工批准后物理删除。
- `@stratix/create` 继续拥有 app/plugin 创建模板，包括后台管理平台模板 `packages/create/templates/apps/web-admin`。

## 6. 发布前置条件

发布 commit 必须创建以下 exact git tags：

- `@stratix/core@1.1.0`
- `@stratix/create@1.1.0`
- `@stratix/database@1.1.0`
- `@stratix/devtools@1.0.0-beta.1`
- `@stratix/forge@1.1.0`
- `@stratix/ossp@0.0.1-beta.3`
- `@stratix/queue@1.0.0-beta.2`
- `@stratix/redis@1.0.0-beta.2`
- `@stratix/testing@1.0.0-beta.1`
- `@stratix/was-v7@1.0.0-beta.36`

创建 tags 后，最终发布前命令为：

```bash
node packages/forge/dist/bin/stratix.js release gate --scope workspace --include-offline-install --include-registry
```

## 7. 变更记录

| 日期       | 变更内容                                                                                                      | 变更人 |
| ---------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-03-28 | 发布面现状说明初版                                                                                            | Codex  |
| 2026-06-18 | 更新为 Phase 6 发布准备说明：supported scope、registry exact-version gate、pack artifact gate、tasks 冻结决策 | Codex  |
