# CR-003 Database 可选驱动 Peer

## 目标

让 `@stratix/database` 只把 `@stratix/core` 作为必需 peer；各数据库方言驱动
由消费者按需安装。

## 验收标准

- `better-sqlite3`、`mysql2`、`pg`、`tarn`、`tedious` 均为 optional peers。
- `@stratix/core` 保持必需 peer，现有版本范围不变。
- 驱动继续作为开发依赖支持构建和测试。
- tarball 元数据、无驱动 consumer 安装及 Database 回归测试通过。
- README 和 patch changeset 同步；不升级版本、不发布 registry。

## 允许范围

- `packages/database/package.json`
- `packages/database/README.md`
- `packages/database/src/__tests__/peer-dependencies.test.ts`
- `.changeset/database-optional-driver-peers.md`
- CR-003 evidence、reports、review、ledger
- current-state、project memory 和 discovery 状态同步
