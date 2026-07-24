# BUG-008 根因证据

- 日期：2026-07-24
- 结论：root_cause_found

## GitHub Actions 复现

PR #1 的两个 `Supported Package Release Gate` 均在同一步失败：

```text
Smoke generated API consumer
ERR_PNPM_NO_MATCHING_VERSION
No matching version found for @stratix/core@^1.1.0
registry: https://registry.npmjs.org/
latest: 0.8.2
exit code: 1
```

- pull_request run：30072911232
- push run：30072899893
- head：`7f47cf6ba40313cbb0698177d9fdbce57e2a9cac`

## 本地独立复现

禁用用户级 npm 配置并显式使用 npmjs：

```text
env NPM_CONFIG_USERCONFIG=/dev/null \
  NPM_CONFIG_CACHE=/tmp/stratix-ci-repro-cache \
  NPM_CONFIG_REGISTRY=https://registry.npmjs.org \
  pnpm run smoke:generated-api

ERR_PNPM_NO_MATCHING_VERSION
No matching version found for @stratix/core@^1.1.0
exit code: 1
```

正常本地配置的 `@stratix:registry` 指向 Aliyun；禁用用户配置后该值为
`undefined`。

## 调用链

1. API 模板生成 `@stratix/core: ^1.1.0`。
2. smoke 只把 `@stratix/forge` 改为 workspace `file:` 依赖。
3. 临时目录运行 `pnpm install`。
4. pnpm 使用环境中的 registry；本机命中 Aliyun，CI 命中 npmjs。

## 结论

直接原因是 smoke 没有把未发布的 workspace Core 注入临时消费者。根源原因是
发布门禁依赖开发机用户级 registry 配置，导致本地与 CI 路径漂移。
