# Core 破坏性升级 PRD

- 文档编号：`PRD-CORE-BREAK-20260617`
- 范围：`packages/core`
- 目标版本：`1.1.0`
- 变更类型：破坏性升级

## 背景

`@stratix/core` 是 Stratix 生态的运行时入口。评审发现应用级自动发现、DI 注册、路由绑定和公开 API 文档存在历史分叉，导致使用者无法确定启动时真正执行的发现管道。该问题必须以破坏性升级方式解决，不保留旧入口、不做运行时兜底、不维护旧字段解释。

## 目标

| 编号 | 需求 | 验收标准 |
|---|---|---|
| `REQ-CORE-BREAK-001` | 应用级发现入口唯一化 | `Stratix.run()` 只读取 `config.discovery` 并调用统一 discovery 管道 |
| `REQ-CORE-BREAK-002` | 公共 API 表面收敛 | 旧应用级发现、旧应用错误处理器和旧模块处理入口不再从 `@stratix/core` 导出 |
| `REQ-CORE-BREAK-003` | 自动注册显式化 | 只有带 Stratix 元数据的 class 才能被应用级 discovery 注册 |
| `REQ-CORE-BREAK-004` | 配置严格化 | 未声明字段通过 `ConfigurationError` 失败 |
| `REQ-CORE-BREAK-005` | 启动集成可测 | `Stratix.run()` 到 DI 注册、请求作用域和路由响应有端到端测试 |
| `REQ-CORE-BREAK-006` | 质量评分 95+ | 架构、运行时、API、测试、文档、发布六类评分均不低于 95 |

## 非目标

- 不在 core 内保留旧应用级发现入口。
- 不让普通未标记 class 因目录命名被注册。
- 不为旧配置字段提供迁移适配层。
- 不把其它生态包的迁移阻塞转嫁为 core 的运行时代码分支。

## 新配置契约

```ts
const app = await Stratix.run({
  type: 'web',
  config: {
    server: { port: 3000 },
    plugins: [],
    autoLoad: {},
    discovery: {
      enabled: true,
      patterns: ['**/*.ts'],
      routing: {
        enabled: true,
        prefix: '/api'
      }
    }
  }
});
```

## 验收命令

| 编号 | 命令 | 预期 |
|---|---|---|
| `TEST-CORE-BREAK-001` | `pnpm --filter @stratix/core exec tsc -p tsconfig.json --noEmit` | 通过 |
| `TEST-CORE-BREAK-002` | `CI=true pnpm --filter @stratix/core exec vitest run` | 通过 |
| `TEST-CORE-BREAK-003` | `pnpm --filter @stratix/core run build` | 通过 |

