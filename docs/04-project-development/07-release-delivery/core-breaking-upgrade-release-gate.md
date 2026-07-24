# Core 发布门禁

- 文档编号：`REL-CORE-GATE-20260617`
- 范围：`@stratix/core`
- 发布类型：破坏性升级

## 发布前必过门禁

| 门禁 | 命令或检查 | 当前状态 |
|---|---|---|
| 类型检查 | `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` | 通过 |
| 单元与集成测试 | `CI=true pnpm --filter @stratix/core exec vitest run` | 通过 |
| 构建 | `pnpm --filter @stratix/core run build` | 通过 |
| 发布包 smoke | `pnpm --filter @stratix/core pack --pack-destination /tmp` | 通过，生成 `/tmp/stratix-core-1.1.0.tgz` |
| lockfile | `pnpm-lock.yaml` 的 `packages/core` importer 包含 `glob` | 通过 |
| 公共 API | `public-api-contract.test.ts` | 通过 |
| 文档 | README 与内部设计文档描述 `discovery` 新契约 | 通过 |

## 发布说明必须包含

- 应用级发现入口已统一为 `config.discovery`。
- 自动注册要求显式 Stratix 装饰器。
- 根导出只保留新 discovery API。
- 未迁移的生态包必须在各自包内升级，不在 core 内添加旧入口。

## 回滚原则

该升级不提供运行时回滚开关。若发布后发现问题，只能通过新版本修复新契约实现，不能恢复旧入口作为修复方式。

## 评分门槛

| 维度 | 最低分 | 当前分 |
|---|---:|---:|
| 架构一致性 | 95 | 96 |
| 运行时正确性 | 95 | 96 |
| 公共 API 治理 | 95 | 96 |
| 测试质量 | 95 | 95 |
| 文档一致性 | 95 | 95 |
| 发布可控性 | 95 | 95 |
