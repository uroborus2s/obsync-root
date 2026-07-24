# CR-003 Database 可选驱动 Peer 契约

- 场景：change_requirement
- 需求版本：0.1.0
- 状态：APPROVED
- 日期：2026-07-24
- 来源：用户明确要求 `@stratix/database` 把非必需驱动标记为 optional peers

## 目标

安装 `@stratix/database` 时只要求 Stratix Core；应用按实际使用的数据库方言
自行安装对应驱动，不自动安装或警告缺少其他方言驱动。

## 用户故事

作为 Stratix 应用开发者，我只想安装当前数据库方言需要的驱动，避免安装
PostgreSQL、MySQL、SQLite 和 MSSQL 的全部驱动及原生依赖。

## 业务规则

- `@stratix/core` 保持必需 peer。
- 以下方言专属 peer 标记为 optional：
  - PostgreSQL：`pg`
  - MySQL：`mysql2`
  - SQLite：`better-sqlite3`
  - MSSQL：`tedious`、`tarn`
- 驱动继续保留在 Database 的 devDependencies，供构建和测试使用。
- 不改变现有 peer 兼容范围，不修改运行时方言加载逻辑。

## 验收标准

- `peerDependenciesMeta` 只包含上述 5 个驱动，且均为
  `{ "optional": true }`。
- `@stratix/core` 不得标记为 optional。
- 打包 tarball 保留驱动 peer 范围和 optional metadata。
- Database build、typecheck、lint、tests 通过。
- README 说明应用需按方言安装驱动。
- 增加 Database patch changeset；本任务不执行版本升级或 registry publish。

## 异常与非目标

- 使用某方言但未安装其驱动时，沿用现有驱动检查和错误提示。
- 不新增默认方言，不自动选择驱动，不修改 MSSQL 完成度。
- 不发布 npmjs 或 Aliyun。

## 影响分析

- 模块 owner：`@stratix/database`。
- 影响面：npm 包元数据、安装体验和发布契约。
- Baseline：无领域、数据库 schema、API、UI 或总体架构 baseline 变化。
