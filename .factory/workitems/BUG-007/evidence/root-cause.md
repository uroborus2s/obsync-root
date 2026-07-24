# BUG-007 根因证据

- 日期：2026-07-24
- 结论：root_cause_found

## Registry 证据

- public npmjs：`@stratix/database@1.1.0` Core peer 为 `1.1.0`。
- 配置的 Aliyun registry：`@stratix/database@1.1.0` Core peer 为 `1.1.0`。
- 两个 registry 的 `latest` 均为 `1.1.0`。

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
