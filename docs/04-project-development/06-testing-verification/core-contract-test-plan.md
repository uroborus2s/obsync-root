# Core 契约测试计划

- 文档编号：`TEST-CORE-CONTRACT-20260617`
- 范围：`packages/core`

## 测试策略

本次升级的测试目标是锁定破坏性新契约，而不是让旧用法继续运行。测试分为四层：

| 层级 | 代表测试 | 验证内容 |
|---|---|---|
| 装饰器单元 | `component.test.ts`、`route.test.ts` | 元数据写入、读取、继承隔离 |
| discovery 管道 | `application-pipeline.test.ts` | 扫描、显式组件注册、路由前缀 |
| 启动集成 | `application-discovery-bootstrap.test.ts` | `Stratix.run()` 到 DI、请求 scope、路由响应 |
| 公共 API | `public-api-contract.test.ts` | 新导出存在，旧根导出不存在 |

## 必跑命令

| 命令 | 当前结果 |
|---|---|
| `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` | 通过 |
| `CI=true pnpm --filter @stratix/core exec vitest run` | 通过，25 files / 196 tests |
| `pnpm --filter @stratix/core run build` | 通过 |

## 覆盖重点

| 编号 | 风险 | 测试要求 |
|---|---|---|
| `RISK-CORE-001` | 旧 API 被重新导出 | 公共 API 契约测试必须失败 |
| `RISK-CORE-002` | 未标记 class 被自动注册 | discovery 测试必须断言 skipped |
| `RISK-CORE-003` | 请求作用域 token 不可注入 | 启动集成测试必须从 controller 读取 `requestId` |
| `RISK-CORE-004` | 配置字段漂移 | 配置验证测试必须拒绝非契约字段 |
| `RISK-CORE-005` | 插件失败丢失上下文 | 插件加载测试必须断言 `PluginLoadError` 和 `pluginName` |

## 准入门槛

任何 core 修改必须至少运行：

```bash
pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit
CI=true pnpm --filter @stratix/core exec vitest run
pnpm --filter @stratix/core run build
```

