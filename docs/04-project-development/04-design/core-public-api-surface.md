# Core 公共 API 边界

- 文档编号：`DESIGN-CORE-API-20260617`
- 范围：`@stratix/core` 根导出与正式 subpath 导出

## 设计原则

1. 公开 API 必须能被测试锁定。
2. 应用级 discovery 只暴露一个稳定入口。
3. 旧启动工具、旧应用级模块处理工具和旧应用错误处理器不在根导出保留。
4. 配置契约与 TypeScript 类型、Zod schema、文档示例保持一致。
5. 新增但尚未承诺稳定性的框架内部演进能力先进入 `experimental` subpath，不直接扩大 root stable helper 名称。
6. 插件作者、contract-first、诊断和内部迁移 API 必须使用显式 subpath，避免 root 变成“所有东西的桶”。

## 必须导出的关键 API

| 类别                   | 导出                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root 启动              | `Stratix`、`runApp`                                                                                                                                                                       |
| 装饰器                 | `Service`、`Repository`、`Component`、`Controller`、`Get`、`Post`、`Put`、`Delete`、`Patch`                                                                                               |
| 元数据                 | `MetadataManager`、`METADATA_KEYS`、控制器/路由/组件元数据类型                                                                                                                            |
| Root 错误              | `HttpError`、`ConfigurationError`、`DiscoveryError`、`RegistrationError`、`PluginLoadError`、`StratixError`                                                                               |
| Root 类型              | `StratixConfig`、`PluginConfig`、Fastify request/reply/instance 类型、Logger 类型                                                                                                         |
| 插件作者 subpath       | `@stratix/core/plugin`: `withRegisterAutoDI`、`RESOLVER`、`Lifetime`、`asFunction`、`asValue`、`AwilixContainer`、Fastify plugin 类型、plugin config 类型                                 |
| Contract-first subpath | `@stratix/core/contracts`: `getControllerRouteContracts`、`validateRouteContracts`、`generateOpenApiDocument`                                                                             |
| DI diagnostics subpath | `@stratix/core/diagnostics`: `createDIGraph`、`diagnoseDIGraph`、`runDIDiagnostics`、`recordDIRegistration`                                                                               |
| Experimental subpath   | `@stratix/core/experimental`: `createRegistrationPlan`、`recordRegistrationPlan`、`registerRegistrationPlanToken`                                                                         |
| Internal subpath       | `@stratix/core/internal`: `ApplicationBootstrap`、`BootstrapPhase`、`ApplicationDiscoveryRegistrar`、`ApplicationDiscoveryPipeline`、production manifest 类型、`registerControllerRoutes` |

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
- `ApplicationBootstrap`
- `ApplicationDiscoveryPipeline`
- `withRegisterAutoDI`
- `RESOLVER`
- `Lifetime`
- `asFunction`
- `asValue`
- `getControllerRouteContracts`
- `validateRouteContracts`
- `generateOpenApiDocument`
- `createDIGraph`
- `diagnoseDIGraph`
- `runDIDiagnostics`
- `registerControllerRoutes`
- `performAutoRegistration`
- `registerServiceAdapters`
- `processModulesUnified`

`performAutoRegistration`、`registerServiceAdapters`、`processModulesUnified`、`processSingleModule`、`ConventionBasedLifecycleManager` 和 `FASTIFY_LIFECYCLE_METHODS` 只作为框架内部实现细节存在，不属于 root 或 `@stratix/core/internal` 白名单 API。

正式 subpath 的正向导出和 root 禁止导出清单同样由 `packages/core/src/__tests__/public-api-contract.test.ts` 锁定。`RegistrationPlan` helper 只允许通过 `@stratix/core/experimental` 访问，避免把 P1 中间表示立即冻结为稳定 root API。

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
