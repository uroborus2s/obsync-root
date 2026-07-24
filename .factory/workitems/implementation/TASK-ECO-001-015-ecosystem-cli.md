# TASK-ECO-001-015 Ecosystem CLI

**状态：** implemented and published to Aliyun
**日期：** 2026-07-05
**范围：** `@stratix/forge`

## 任务范围

- `TASK-ECO-001` 增加 `stratix ecosystem` CLI 入口。
- `TASK-ECO-002` 定义 `Candidate`、`Evidence`、`Signal` 数据模型。
- `TASK-ECO-003` 实现 Stratix catalog。
- `TASK-ECO-004` 读取本机 npm/pnpm registry 配置且不输出 token。
- `TASK-ECO-005` 从 Fastify raw Markdown 解析 core/community 插件。
- `TASK-ECO-006` 查询 npm registry search 与 package metadata API。
- `TASK-ECO-007` 补充 GitHub archived、pushed_at、stars、license、topics。
- `TASK-ECO-008` 输出确定性 signals。
- `TASK-ECO-009` 实现 `ecosystem search`。
- `TASK-ECO-010` 实现 `ecosystem inspect`。
- `TASK-ECO-011` 实现 `ecosystem catalog list`。
- `TASK-ECO-012` 实现 `ecosystem adapt --dry-run`。
- `TASK-ECO-013` 实现 `ecosystem adapt` 写入 adapter 文件。
- `TASK-ECO-014` 增加 forge 测试覆盖。
- `TASK-ECO-015` 同步开发文档和 factory 状态。

## 验收证据

- `pnpm --filter @stratix/forge test`：63 tests passed。
- `pnpm --filter @stratix/forge exec tsc -p tsconfig.json --noEmit`：passed。
- `pnpm --filter @stratix/forge pack --pack-destination /tmp`：produced `/tmp/stratix-forge-1.1.1.tgz` with `dist/commands/ecosystem/*`。
- `pnpm publish --registry=https://packages.aliyun.com/68f7b140876b90de1aabc1c7/npm/npm-registry/ --no-git-checks`：published `@stratix/forge@1.1.1`。
- `pnpm view @stratix/forge@1.1.1 version --registry=https://packages.aliyun.com/68f7b140876b90de1aabc1c7/npm/npm-registry/`：returned `1.1.1`。

## 发布影响

`@stratix/forge` 新增向后兼容 CLI 能力，发布目标版本升为 `1.1.1`。`@stratix/create` 未改代码，模板中的 `^1.1.0` 可解析到 `1.1.1`，不需要随本任务升版。阿里云私库发布已完成；public npmjs 发布仍需单独的 release-owner 证据。
