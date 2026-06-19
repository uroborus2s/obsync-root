# Core 公共 API 边界

- 文档编号：`DESIGN-CORE-API-20260617`
- 范围：`@stratix/core` 根导出

## 设计原则

1. 公开 API 必须能被测试锁定。
2. 应用级 discovery 只暴露一个稳定入口。
3. 旧启动工具、旧应用级模块处理工具和旧应用错误处理器不在根导出保留。
4. 配置契约与 TypeScript 类型、Zod schema、文档示例保持一致。
5. 新增但尚未承诺稳定性的框架内部演进能力先进入 `experimental` 命名空间，不直接扩大 root stable helper 名称。

## 必须导出的关键 API

| 类别 | 导出 |
|---|---|
| 启动 | `Stratix`、`ApplicationBootstrap`、`BootstrapPhase` |
| 应用发现 | `ApplicationDiscoveryPipeline`、`ApplicationDiscoveryConfig`、`ApplicationDiscoveryResult` |
| 装饰器 | `Service`、`Repository`、`Component`、`Controller`、`Get`、`Post`、`Put`、`Delete`、`Patch` |
| 元数据 | `MetadataManager`、`METADATA_KEYS`、控制器/路由/组件元数据类型 |
| 插件级 AutoDI | `withRegisterAutoDI`、`performAutoRegistration`、`processModulesUnified`、`diagnoseServiceAdapterTokens`、`ServiceAdapterDiagnostic` |
| Contract-first | `getControllerRouteContracts`、`validateRouteContracts`、`generateOpenApiDocument` |
| DI diagnostics | `createDIGraph`、`diagnoseDIGraph`、`runDIDiagnostics`、`recordDIRegistration` |
| Experimental | `experimental.createRegistrationPlan`、`experimental.recordRegistrationPlan`、`experimental.registerRegistrationPlanToken` |
| 错误 | `ConfigurationError`、`DiscoveryError`、`RegistrationError`、`PluginLoadError`、`StratixError` |

## 不导出的旧表面

以下名称不应再出现在 `@stratix/core` 根导出中：

- `performApplicationAutoDI`
- `discoverAndProcessApplicationModules`
- `ApplicationErrorHandler`
- `safeExecute`
- `Executor`
- `EXECUTOR_METADATA_KEY`
- `getExecutorMetadata`
- `isExecutor`
- `createRegistrationPlan`
- `recordRegistrationPlan`

新增插件 adapter token 诊断和 `experimental` 命名空间的正向导出同样由 `packages/core/src/__tests__/public-api-contract.test.ts` 锁定。`RegistrationPlan` helper 只允许通过 `experimental` 访问，避免把 P1 中间表示立即冻结为稳定 root API。

## 配置字段

`StratixConfig` 的应用级发现字段只允许：

```ts
interface StratixConfig {
  server: ServerConfig;
  plugins: PluginConfig[];
  autoLoad: AutoLoadConfig;
  discovery?: ApplicationDiscoveryConfig;
}
```

`StratixConfigSchema` 使用 `.strict()` 拒绝非契约字段。
