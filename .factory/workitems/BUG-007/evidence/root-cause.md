# BUG-007 根因证据

- 日期：2026-07-24
- 结论：root_cause_found

## Registry 证据

- 配置的 Aliyun registry：`@stratix/database@1.1.0` Core peer 为 `1.1.0`。
- 配置的 Aliyun registry：发布前 `latest` 为 `1.1.0`。
- 早期带普通 `--registry=https://registry.npmjs.org` 的 scoped package 查询仍
  被用户级 `@stratix:registry` 覆盖，实际命中 Aliyun。使用
  `NPM_CONFIG_USERCONFIG=/dev/null` 中和用户配置后，真实 public npmjs 返回
  404。该修正不影响 tarball 根因。

## Tarball RED

当前 workspace 打包结果：

```text
package: @stratix/database@1.1.0
expected core peer: ^1.1.0
actual core peer: 1.1.2
exit code: 1
```

直接原因是 `workspace:*` 被 pnpm pack 改写为当前 Core 精确版本；根源原因是
workspace 链接约束和发布兼容契约没有分离。
