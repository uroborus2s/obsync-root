# 发布检查清单

**项目名称：** stratix框架以及生态  
**文档状态：** 已发布  
**负责人：** 仓库维护者  
**主要读者：** 发布维护者 | QA | 仓库维护者  
**上游输入：** 发布说明 | 当前状态分析 | workspace release gate  
**下游输出：** 发布执行记录 | npm publish 证据 | 最终发布说明  
**关联 ID：** `REL-001`, `TASK-004`, `CR-001`  
**最后更新：** 2026-07-04

## 1. 发布前状态判定

截至 2026-07-04，当前仓库是 RC 候选状态，不是 GA 发布完成状态。

- 远端 `Quality Gate` run `28234054546` 已通过。
- `.env.example.tpl` 模板跟踪问题已修复并由远端 CI 验证。
- supported package exact versions 在 public npmjs 上仍未发布。
- npm publish、最终 exact tags 推送和最终发布说明仍需要发布者凭证与人工动作。

## 2. 必须通过的本地门禁

发布 commit 上必须重新执行：

```bash
pnpm run quality:release
pnpm run release:gate
```

`quality:release` 覆盖 supported build、typecheck、lint、test、core coverage ratchet、packed core API smoke、docs validation、security audit 和 release gate dry-run。

`release:gate` 覆盖 offline install、supported build/test、docs、安全审计、pack artifact、API surface、release-surface、exact tags 和 public npmjs registry reconciliation。

## 3. exact tag 检查

以下 tags 必须指向最终发布 commit，并已推送到 origin：

- `@stratix/core@1.1.0`
- `@stratix/create@1.1.0`
- `@stratix/database@1.1.0`
- `@stratix/devtools@1.0.0-beta.1`
- `@stratix/forge@1.1.0`
- `@stratix/ossp@1.1.0-beta.0`
- `@stratix/queue@1.0.0-beta.2`
- `@stratix/redis@1.0.0-beta.2`
- `@stratix/testing@1.0.0-beta.1`
- `@stratix/was-v7@1.0.0-beta.36`

如果 tag 缺失或未指向发布 commit，workspace release gate 必须阻断。

## 4. npm publish 前检查

- 确认发布者已登录正确 npm account，并具备 `@stratix` scope 发布权限。
- 确认 registry 是 `https://registry.npmjs.org`，不要使用私有镜像结果作为 public release evidence。
- 确认 `@stratix/tasks` 不在 workspace、preset、release gate 或 publish 候选范围内。
- 确认 `@stratix/create` 与 `@stratix/forge` 的边界仍为 create 负责创建、forge 负责项目内工程动作。

## 5. 发布后回写

发布后必须把真实证据回写到：

- `.factory/project.json`
- `.factory/memory/current-state.md`
- `docs/04-project-development/02-discovery/current-state-analysis.md`
- `docs/04-project-development/07-release-delivery/release-notes.md`

证据必须包含：

- 远端 Quality Gate run id 与 commit
- `pnpm run release:gate` 结果
- npm publish 成功的包名、版本和 registry
- exact tags 指向的 commit

## 6. 禁止口径

- 不得把 public npmjs 404 解释为“已发布”。
- 不得把历史本地 95 分解释为 core 全局覆盖率 95%。
- 不得在 npm publish 前使用 GA 或 public release completed 口径。

## 7. 变更记录

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-07-04 | 建立 Phase 6 发布检查清单，补齐 exact tag、registry、publish 与证据回写要求 | Codex |
