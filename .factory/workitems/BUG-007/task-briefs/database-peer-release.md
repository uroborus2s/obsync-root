# BUG-007 Database Peer 修复与补丁发布

## 目标

把 `@stratix/database` 对 `@stratix/core` 的发布 peer 从精确版本改为
`^1.1.0`，生成并发布 `@stratix/database@1.1.1`。

## 验收标准

- `packages/database/package.json` 的 peer 使用 `workspace:^1.1.0`。
- 打包后的 `package.json` 为 `@stratix/database@1.1.1`。
- 打包后的 Core peer 精确为 `^1.1.0`。
- 现有 `@stratix/database` 构建和测试通过。
- Create/Forge 的待发布 Changeset 保留且版本不变。
- 配置的 Aliyun registry 精确版本和 `latest` 均返回 `1.1.1`。

## 允许范围

- `packages/database/package.json`
- Database patch Changeset 及 Changesets 生成的 Database changelog
- `BUG-007` evidence、report、review、ledger
- 发布结果所需的 `.factory` 当前态和 release docs

## 禁止

- 不发布 public npmjs。
- 不发布或改版本 `@stratix/create`、`@stratix/forge`。
- 不修改 Database 运行时代码。
