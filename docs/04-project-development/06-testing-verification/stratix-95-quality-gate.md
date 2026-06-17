# Stratix 95+ Quality Gate

**状态：** 已完成  
**适用范围：** Stratix 1.1.x 主线重构  
**排除范围：** `@stratix/tasks`  
**关联工作项：** `TASK-003`

## 1. 评分原则

每个维度满分 100 分。低于 95 分时继续重构，不进入完成态。

| 维度 | 当前基线 | 95+ 判定 |
| --- | ---: | --- |
| 架构边界 | 96 | core、database、cli 职责清晰，公共 API 稳定，插件 token 与 lifecycle 约定一致 |
| 代码实现 | 96 | P0/P1 缺陷关闭，未实现能力不作为稳定能力暴露，关键路径无高风险隐式行为 |
| 测试与回归 | 95 | 受影响模块有回归测试，database/cli/core 定向验证通过，废弃 tasks 不计入 |
| 文档与使用路径 | 95 | README、开发指南、CLI 模板说明与当前 1.1.x API 一致 |
| 发布与验证面 | 96 | supported build/test 入口稳定，tasks 从默认质量门排除，changeset 基线对齐 `1.1.0` |
| QA 风险控制 | 96 | 有明确的排除项、失败项解释、回归测试矩阵和验收命令 |

## 2. 本轮明确排除项

`@stratix/tasks` 即将废弃，当前不迁移、不修复、不作为根级构建或测试失败的扣分项。

因此以下现象不阻塞 `TASK-003`：

- `@stratix/tasks` 仍导入已移除的 `DatabaseAPI`
- `@stratix/tasks` 仍使用旧 `BaseRepository` 构造方式
- 显式 `build:all` 因 tasks 失败

但文档和验证报告必须显式说明这些失败已排除，不能把它们误判为主线健康。默认质量门使用 `build:supported` 与 `test:supported`。

## 3. 必须纳入评分的验证命令

基础命令：

```bash
pnpm --filter @stratix/core exec tsc --noEmit
pnpm --filter @stratix/database exec tsc --noEmit
pnpm --filter @stratix/database exec vitest run
pnpm --filter @stratix/cli exec tsc --noEmit
pnpm --filter @stratix/cli test
```

后续应补充的排除 tasks 验证：

```bash
pnpm run build:supported
pnpm run test:supported
```

如果 turbo 过滤语法或 workspace 配置导致命令不可用，必须记录替代包级命令矩阵。

## 4. 当前 P0/P1 门禁项

| 等级 | 项目 | 判定 |
| --- | --- | --- |
| P0 | CLI `business-repository` 模板必须生成当前 `BaseRepository` 构造方式 | 已关闭；`@stratix/cli` 测试 21/21 通过 |
| P1 | `@stratix/database` 不能把未实现 MSSQL 当成稳定支持能力 | 已关闭；stable supported list 仅保留 PostgreSQL/MySQL/SQLite |
| P1 | database 读写分离配置必须真实生效，或文档降级为未实现 | 已关闭；读写连接使用显式配置连接名并补回归测试 |
| P1 | database 健康检查必须跨 SQLite/MySQL/PostgreSQL 成立 | 已关闭；健康检查改为原始 `SELECT 1 AS health` |
| P1 | 高风险自动清表行为必须改为显式 opt-in 或移出稳定 API | 已关闭；`clearExistingData` 显式 opt-in，默认追加数据 |

## 5. 第一轮已验证结果

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm --filter @stratix/database exec tsc --noEmit` | 通过 | database 类型门禁 |
| `pnpm --filter @stratix/database exec vitest run` | 通过 | 8 files / 48 tests |
| `pnpm --filter @stratix/cli exec tsc --noEmit` | 通过 | CLI 类型门禁 |
| `pnpm --filter @stratix/cli test` | 通过 | 21 tests |
| `pnpm --filter @stratix/core exec tsc --noEmit` | 通过 | core 类型门禁 |
| `pnpm --filter @stratix/core exec vitest run src/plugin/__tests__/adapter-registration.test.ts` | 通过 | adapter token 契约测试 3 tests |
| `pnpm --filter @stratix/core exec vitest run` | 通过 | 26 files / 199 tests |
| `pnpm run build:supported` | 通过 | 9 supported packages，排除 `@stratix/tasks` |
| `pnpm run test:supported` | 通过 | 11 turbo tasks；supported packages 全部通过 |
| `pnpm --filter @stratix/was-v7 test` | 通过 | 11 files / 120 tests |
| `uvx --from docs-stratego docs-stratego source validate --repo-path .` | 通过 | 82 pages / 0 contracts |

## 6. 复评记录

| 日期 | 参与角色 | 架构 | 代码 | 测试 | 文档 | 发布 | QA | 结论 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-06-17 | 技术总监/架构/开发/测试/QA/文档 | 96 | 96 | 96 | 96 | 96 | 96 | 全部达到 95+，`TASK-003` 可进入完成态 |

## 7. 残余风险

- `@stratix/tasks` 仍是显式排除项；若未来恢复为 supported package，必须单独迁移旧 database API。
- `build:all` 仍代表全包构建，不等同默认质量门。
- 离线安装和 npm/tag 发布口径仍属于独立 release governance 工作，不阻塞本轮 database/core/cli 质量门。
