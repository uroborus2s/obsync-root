# Database 插件评审与评分报告

- 文档编号：`CR-DATABASE-REVIEW-20260617`
- 范围：`packages/database`
- 日期：2026-06-17
- 评审角色：技术总监、ORM 数据库架构师、框架产品架构师、开发、测试、QA、文档开发
- 结论：`@stratix/database` 已从“功能可用但边界含混”收敛为 repository-first 的稳定数据库插件；当前 supported 质量门通过。

## 评审结论

本次复评确认 database 插件的核心方向正确：业务层通过 repository 使用数据库能力，连接、事务、方言、健康检查和自动保存能力由插件内部收口。主要问题集中在“未实现能力被当成稳定能力暴露”“读写分离配置没有真实约束”“部分默认行为风险过高”和“forge/文档仍生成旧用法”。

| 维度 | 修复前评分 | 修复后评分 | 评分依据 |
| --- | ---: | ---: | --- |
| 架构边界 | 78 | 96 | `BaseRepository` 继续保持显式 `DatabaseConnectionProvider`，读写连接由 manager 基于声明配置选择 |
| ORM/Repository 正确性 | 76 | 96 | `findMany` query options 生效，时间戳改为 ISO，自动清表改为显式 opt-in |
| 数据库兼容性 | 70 | 96 | stable 支持列表只保留 PostgreSQL/MySQL/SQLite，MSSQL 不再对外宣称稳定支持 |
| 运维与健康检查 | 72 | 96 | 健康检查改为跨方言 `SELECT 1 AS health`，避免依赖 `information_schema` |
| 使用路径 | 68 | 96 | forge business repository 模板、开发指南和 tasks 废弃口径已同步 |
| 测试与回归 | 62 | 96 | database 8 files / 48 tests，supported root test 通过 |
| 整体评分 | 71 | 96 | 以 database 插件和相关使用链路为评分范围 |

## 关键问题

| 等级 | 问题 | 风险 | 处理结果 |
| --- | --- | --- | --- |
| P0 | forge `business-repository` 模板仍使用旧 `BaseRepository` 构造方式 | 新项目生成代码不可编译 | 已修复，工具链 21 项测试通过 |
| P1 | MSSQL 方言未完整实现但出现在 stable supported list | 使用者会误判生产可用性 | stable list 收敛为 PostgreSQL/MySQL/SQLite |
| P1 | 读写分离会合成不存在的 `*-read`/`*-write` 连接名 | 配置看似生效，实际运行不可控 | 改为只使用显式声明的 read/write 连接 |
| P1 | 健康检查依赖 `information_schema.tables` | SQLite 等方言不兼容 | 改为 `CompiledQuery.raw('SELECT 1 AS health')` |
| P1 | 自动保存表存在默认清表风险 | 调用方误用会导致数据丢失 | `clearExistingData` 改为显式 opt-in |

## 设计分析

当前 `@stratix/database` 的合理产品形态是框架级数据访问基础设施，而不是在业务层暴露任意全局数据库对象。达标后的边界如下：

| 层级 | 职责 | 不应承担 |
| --- | --- | --- |
| `DatabaseManager` | 管理连接、健康检查、读写连接选择 | 伪造未声明连接、承诺未实现方言 |
| `ConnectionFactory` | 按配置创建 Kysely 连接 | 读取错误配置段或绕过参数校验 |
| `BaseRepository` | 封装实体 CRUD、事务上下文和查询选项 | 隐式吞掉 connectionName/readonly/timeout |
| `AutoSaveRepository` | 结构化数据落表 | 默认破坏已有数据 |
| forge/文档 | 生成和说明当前稳定 API | 扩散 tasks 或旧 DatabaseAPI 用法 |

## 已完成优化

| 编号 | 优化项 | 证据 |
| --- | --- | --- |
| `BUG-DB-001` | `findMany` 透传 `connectionName`、`readonly`、`timeout` | `repository-query-options-regression.test.ts` |
| `BUG-DB-002` | `getCurrentTimestamp()` 返回 ISO 时间 | `repository-query-options-regression.test.ts` |
| `BUG-DB-003` | 读写分离只使用显式 read/write 连接 | `database-manager.ts` |
| `BUG-DB-004` | 健康检查跨方言化 | `database-manager-health.test.ts` |
| `BUG-DB-005` | 自动清表改为 `clearExistingData` opt-in | `auto-save-repository-regression.test.ts` |
| `REL-DB-001` | stable supported database types 收敛 | `connection-factory-optimized.test.ts` |
| `DOC-DB-001` | docs/forge 模板移除默认 tasks 扩散和旧 controller 前缀示例 | docs 与 forge tests |

## 验证结果

| 命令 | 结果 |
| --- | --- |
| `pnpm --filter @stratix/database exec tsc --noEmit` | 通过 |
| `pnpm --filter @stratix/database exec vitest run` | 通过，8 files / 48 tests |
| `pnpm --filter @stratix/forge test` | 通过，21 tests（当时阶段快照） |
| `pnpm --filter @stratix/core exec vitest run` | 通过，26 files / 199 tests |
| `pnpm run build:supported` | 通过，9/9 supported packages |
| `pnpm run test:supported` | 通过，11 turbo tasks |
| `uvx --from docs-stratego docs-stratego source validate --repo-path .` | 通过，82 pages / 0 contracts |

## 进化方案

| 阶段 | 目标 | 建议动作 |
| --- | --- | --- |
| 1.1.x patch | 稳定当前 API | 保持 PostgreSQL/MySQL/SQLite 为 stable；MSSQL 继续隐藏在实验实现后 |
| 1.2.x | 扩展 ORM 能力 | 增加 migration/schema diff、repository 级查询审计、事务隔离级别测试 |
| 1.3.x | 生产运维增强 | 增加连接池指标、慢查询 hook、health check 分级、读连接熔断指标 |
| Future | MSSQL 转 stable | 补齐驱动依赖、连接集成测试、DDL/returning 语义和错误映射后再加入 supported list |

## 复评结论

`@stratix/database` 当前评分为 96。剩余工作主要是发布治理和未来方言扩展，不再阻塞本轮 95+ 重构门禁。
