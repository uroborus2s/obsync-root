# BUG-007 验证证据

- 日期：2026-07-24
- Actor：Codex
- 验证声明：`@stratix/database@1.1.1` 的发布 tarball 使用
  `@stratix/core@^1.1.0`，且 Database 与 workspace 发布质量门通过
- 结论：passed

## TEST-CONTRACT-BUG-007-001：Peer Tarball 契约

RED：

```text
expected: ^1.1.0
actual: 1.1.2
exit code: 1
```

GREEN：

```text
name: @stratix/database
version: 1.1.1
corePeer: ^1.1.0
main: dist/index.js
types: dist/types/index.d.ts
exit code: 0
```

tarball 包含 `package/dist/index.js` 和
`package/dist/types/index.d.ts`。

## Database 定向验证

- `pnpm --filter @stratix/database run build`：exit 0。
- `pnpm --filter @stratix/database exec tsc -p tsconfig.json --noEmit`：
  exit 0。
- `pnpm --filter @stratix/database run lint`：exit 0，0 error，21 个既有
  `no-console` warning。
- `pnpm --filter @stratix/database exec vitest run`：exit 0，8 个测试文件，
  49/49 tests passed，0 failed，0 skipped。

## TEST-REL-BUG-007-001：Workspace 发布回归

`pnpm run quality:release` 在沙箱内首次运行到 docs 校验时，因为
`~/.cache/uv` 读取权限被阻止而 exit 2；此前 build、typecheck、lint、tests、
Core coverage 和 smoke 已通过。按沙箱授权在沙箱外完整重跑，exit 0：

- supported build：10/10 tasks。
- supported typecheck：通过。
- supported lint：通过，仅既有 warning。
- supported tests：12/12 tasks。
- Core coverage：34 个文件、263/263 tests；coverage ratchet 通过。
- packed Core API smoke：通过。
- generated API consumer smoke：通过。
- docs：89 pages / 0 contracts。
- production audit：No known vulnerabilities found。
- workspace release dry-run：10 个包的
  build/test/docs/security/pack/api/release-surface 全部通过，计划包含
  `@stratix/database@1.1.1`。
- `pnpm --filter @stratix/database publish --dry-run --no-git-checks
  --registry=<Aliyun>`：exit 0；输出
  `@stratix/database@1.1.1 -> <Aliyun registry>` 并明确跳过真实发布。
- 发布前精确版本查询：Aliyun registry 返回
  `ERR_PNPM_PACKAGE_NOT_FOUND`，确认 `1.1.1` 尚未占用。

## Changesets 隔离

- `@stratix/database`：`1.1.0 -> 1.1.1`。
- `@stratix/create`：仍为 `1.1.2`。
- `@stratix/forge`：仍为 `1.1.4`。
- `.changeset/modern-oxlint-toolchain.md` 仍存在。
- Database Changeset 已被 version 命令消费并生成
  `packages/database/CHANGELOG.md`。

## 不适用项

- 整体黑盒：N/A；本次为 npm tarball 元数据契约，无独立服务。
- UI：N/A；无界面变更。
- API：N/A；无运行时 API 或 schema 变更。
- 端口、健康检查、进程关闭：N/A；验证均为静态包、进程内测试和 CLI。

## 未运行项与残余范围

- `pnpm run release:gate` 未运行：该 public release gate 要求 exact git tag 和
  public npm registry reconciliation；本次是已授权的 Aliyun 私库增量发布，
  不创建或推送 public release tag。
- public npmjs 发布未运行，明确不在授权范围。

## 发布后反查

- 发布命令：
  `pnpm --filter @stratix/database publish --no-git-checks
  --registry=<Aliyun>`，exit 0；输出
  `Published package @stratix/database@1.1.1`。
- Aliyun 精确版本：`1.1.1`。
- Aliyun `latest`：`1.1.1`。
- Aliyun 发布元数据中的 Core peer：`^1.1.0`。
- 发布候选 Git commit：`d5ecd76`。
- 用户级 `@stratix:registry` 会覆盖普通 `--registry` 的 scoped package
  查询；使用 `NPM_CONFIG_USERCONFIG=/dev/null` 中和用户配置后，真实 public
  npmjs 查询返回 404。因此本次 public npmjs 未写入。
