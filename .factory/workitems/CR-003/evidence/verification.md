# CR-003 验证证据

- 日期：2026-07-24
- Actor：Codex
- 结论：passed

## TEST-CONTRACT-CR-003-001：Peer 元数据契约

RED：

```text
pnpm --filter @stratix/database exec vitest run \
  src/__tests__/peer-dependencies.test.ts

expected five optional peers, received []
1 failed
exit code: 1
```

GREEN：

```text
pnpm --filter @stratix/database exec vitest run \
  src/__tests__/peer-dependencies.test.ts

1 file passed, 1 test passed
exit code: 0
```

测试确认 Core 未进入 `peerDependenciesMeta`，且五个方言专属依赖都存在于
`peerDependencies` 并被标记为 `{ "optional": true }`。

## TEST-REL-CR-003-001：Tarball 元数据

```text
pnpm --filter @stratix/database pack \
  --pack-destination /tmp/stratix-db-peer-pack.Sbto4S

/tmp/stratix-db-peer-pack.Sbto4S/stratix-database-1.1.1.tgz
exit code: 0
```

解包断言通过：版本仍为 `1.1.1`，Core peer 为 `^1.1.0` 且保持必需；
optional peer 精确等于 `better-sqlite3`、`mysql2`、`pg`、`tarn`、`tedious`。

## TEST-BB-CR-003-001：无驱动 Consumer

临时 consumer 只安装 Core 与 Database tarball，并启用
`--strict-peer-dependencies`：

```text
database imported; optional drivers not installed
exit code: 0
```

安装后的直接依赖只有 `@stratix/core@1.1.2` 和
`@stratix/database@1.1.1`；五个驱动均未安装，Database 根入口可正常导入。

## TEST-REL-CR-003-002：完整发布质量门

```text
env CI=true NPM_CONFIG_USERCONFIG=/dev/null \
  NPM_CONFIG_CACHE=/tmp/stratix-cr003-npm-cache \
  UV_CACHE_DIR=/tmp/stratix-cr003-uv-cache \
  UV_TOOL_DIR=/tmp/stratix-cr003-uv-tools \
  pnpm run quality:release

exit code: 0
```

- supported build：10/10。
- supported typecheck：passed。
- lint：passed，只有既有 warning。
- supported tests：passed；Database 9 files / 50 tests。
- Core coverage ratchet、packed Core API smoke、generated API smoke：passed。
- docs：89 pages / 0 contracts。
- production audit：无已知漏洞。
- workspace release dry-run：10 包、7 项检查 passed。

## 不适用项

- UI、API、服务进程、端口和健康检查：N/A；本次只改变 npm 包元数据。
- npmjs / Aliyun publish：N/A；本任务明确不发布 registry。

## 最终候选复验

完成评审整改和独立复审后，使用 `CI=true` 与
`NPM_CONFIG_USERCONFIG=/dev/null` 对最终候选再次执行完整
`pnpm run quality:release`，exit code 0；workspace release gate 的 7 项检查
全部通过。
