# BUG-007 实施报告

## 实施范围

- 把 Database 的 Core peer 从 `workspace:*` 改为
  `workspace:^1.1.0`。
- 保留 Core devDependency 的 `workspace:*`，继续使用当前 workspace Core
  做开发验证。
- 用独立 Database patch Changeset 生成 `1.1.1` 和 changelog。
- 显式忽略 Create/Forge，保留 CR-002 的待发布 Changeset 和原版本。

## 行为变化

`@stratix/database@1.1.1` tarball 的 Core peer 是 `^1.1.0`，允许兼容的
Core 1.x patch/minor 升级，不再绑定打包时的精确 Core 版本。

## 验证摘要

- RED：tarball peer 期望 `^1.1.0`、实际 `1.1.2`，契约命令 exit 1。
- GREEN：Database 1.1.1 tarball 的 Core peer 为 `^1.1.0`，入口文件存在。
- Database build/typecheck/lint/test 通过，49/49 tests。
- 完整 `quality:release` 通过，workspace dry-run 包含 Database 1.1.1。
- public npmjs 未发布；目标是仓库配置的 Aliyun registry。
