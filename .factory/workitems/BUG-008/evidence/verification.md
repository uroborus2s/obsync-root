# BUG-008 验证证据

- 日期：2026-07-24
- Actor：Codex
- 结论：passed

## TEST-REL-BUG-008-001：CI Registry 隔离

RED：

```text
env NPM_CONFIG_USERCONFIG=/dev/null \
  NPM_CONFIG_CACHE=/tmp/stratix-ci-repro-cache \
  NPM_CONFIG_REGISTRY=https://registry.npmjs.org \
  pnpm run smoke:generated-api

ERR_PNPM_NO_MATCHING_VERSION
No matching version found for @stratix/core@^1.1.0
exit code: 1
```

GREEN：

```text
env NPM_CONFIG_USERCONFIG=/dev/null \
  NPM_CONFIG_CACHE=/tmp/stratix-ci-green-cache-3 \
  NPM_CONFIG_REGISTRY=https://registry.npmjs.org \
  pnpm run smoke:generated-api

generated API consumer smoke passed
exit code: 0
```

最终实现向生成项目的 `pnpm-workspace.yaml` 写入临时 Core override；模板
`package.json` 仍保留 `@stratix/core: ^1.1.0`，因此 Doctor 契约不变。

## TEST-REL-BUG-008-002：完整发布质量门

以下命令在禁用用户 npm 配置的环境中 exit 0：

```text
env NPM_CONFIG_USERCONFIG=/dev/null \
  NPM_CONFIG_CACHE=/tmp/stratix-quality-npm-cache \
  UV_CACHE_DIR=/tmp/stratix-quality-uv-cache \
  UV_TOOL_DIR=/tmp/stratix-quality-uv-tools \
  pnpm run quality:release
```

- supported build：10/10 tasks。
- supported typecheck：passed。
- lint：passed，只有既有 warning。
- supported tests：passed。
- Core coverage：34 files、263/263 tests，ratchet passed。
- packed Core API smoke：passed。
- generated API consumer smoke：passed。
- docs：89 pages / 0 contracts。
- production audit：无已知漏洞。
- workspace release dry-run：10 包 7 项检查 passed。

## 调试过程

- 直接把 Core dependency 改为 `file:` 后安装通过，但 Doctor 正确拒绝
  `file:` 与模板快照 `^1.1.0` 不匹配。
- `package.json#pnpm.overrides` 被 pnpm 11 明确忽略。
- 最终使用 pnpm 11 官方的根级 `pnpm-workspace.yaml#overrides`，既隔离
  registry，又保留项目依赖契约。

## 不适用项

- UI、API、服务进程、端口和健康检查：N/A；本次只修复临时 CLI consumer
  发布回归门。
- npmjs / Aliyun publish：N/A；用户确认本次不发布任何 registry。
