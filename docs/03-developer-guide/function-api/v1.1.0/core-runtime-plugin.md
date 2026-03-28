# 运行时与插件 API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页覆盖 `@stratix/core` 根出口里与应用启动、控制器、执行器、插件注册、AutoDI 直接相关的函数和类。

<a id="page-summary"></a>
## 页面摘要

- 这一页适合查运行时启动、控制器注册、执行器元数据和插件 AutoDI 相关 API。
- 如果你正在写应用入口或插件主入口，通常会先看这里，再回到 `environment`、`data` 或 `service` 页面补细节。
- 普通业务函数不应该长期停留在这里；业务逻辑请回到 [Service API](./service.md)。

<a id="page-nav"></a>
## 页内导航

- [应用启动与生命周期](#runtime-lifecycle)
- [控制器与路由装饰器](#controllers-routes)
- [执行器装饰器与元数据函数](#executors)
- [校验装饰器](#validation-decorators)
- [插件 AutoDI 与注册函数](#plugin-autodi)
- [注册与处理相关函数](#plugin-registration)
- [生命周期相关 API](#plugin-lifecycle)

<a id="runtime-lifecycle"></a>
## 应用启动与生命周期

### `Stratix.run(options?, extraStream?)`

| 项 | 说明 |
|---|---|
| 作用 | 一步完成应用创建、启动和返回应用实例 |
| 参数 | `options?: StratixRunOptions`，`extraStream?: any` |
| 返回值 | `Promise<StratixApplication>` |
| 典型场景 | CLI 生成项目入口、本地开发启动、接口注入测试 |

### `new Stratix(options?, extraStream?)`

| 项 | 说明 |
|---|---|
| 作用 | 创建可手动控制生命周期的运行时实例 |
| 参数 | `options?: StratixRunOptions`，`extraStream?: any` |
| 常用方法 | `start()`、`stop()`、`restart()`、`getApplication()`、`isRunning()`、`getStatus()`、`cleanup()` |
| 适合 | 需要显式控制启动/停止时机的程序 |

### `ApplicationBootstrap`

| 项 | 说明 |
|---|---|
| 作用 | 框架内部完整启动器 |
| 构造参数 | `logger: Logger` |
| 关键方法 | `bootstrap(options?)`、`stop()`、`restart(options?)`、`getStatus()` |
| 适合 | 自定义底层启动流程，不建议普通应用直接依赖 |

### 其他启动相关 API

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `performApplicationAutoDI(config, container, fastify)` | 应用配置、DI 容器、Fastify 实例 | `Promise<...>` | 应用级 AutoDI 入口 |
| `discoverAndProcessApplicationModules(...)` | 应用模块处理配置 | `Promise<...>` | 应用级模块发现与处理 |
| `createApplicationLifecycleManager(...)` | 生命周期配置 | 生命周期管理器 | 创建应用级生命周期管理器 |
| `safeExecute(...)` | 执行函数与错误处理配置 | `Promise<...>` | 安全执行封装 |

<a id="controllers-routes"></a>
## 控制器与路由装饰器

### `Controller(options?)`

| 项 | 说明 |
|---|---|
| 作用 | 标记控制器类 |
| 参数 | `options?: ControllerOptions` |
| 返回值 | `ClassDecorator` |
| 关键说明 | 不负责前缀；前缀由 `withRegisterAutoDI(..., { routing: { prefix } })` 控制 |

### 路由方法装饰器

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `Get(path?, opts?)` | `path?: string`，`opts?: RouteShorthandOptions` | `MethodDecorator` | 注册 GET 路由 |
| `Post(path?, opts?)` | 同上 | `MethodDecorator` | 注册 POST 路由 |
| `Put(path?, opts?)` | 同上 | `MethodDecorator` | 注册 PUT 路由 |
| `Delete(path?, opts?)` | 同上 | `MethodDecorator` | 注册 DELETE 路由 |
| `Patch(path?, opts?)` | 同上 | `MethodDecorator` | 注册 PATCH 路由 |
| `Head(path?, opts?)` | 同上 | `MethodDecorator` | 注册 HEAD 路由 |
| `Options(path?, opts?)` | 同上 | `MethodDecorator` | 注册 OPTIONS 路由 |

路径规则：

- 默认值是 `'/'`
- 如果没写前导 `/`，会自动补上
- 只能装饰方法，不能装饰普通属性

<a id="executors"></a>
## 执行器装饰器与元数据函数

### `Executor(options?)`
### `Executor(name, options?)`

| 项 | 说明 |
|---|---|
| 作用 | 标记执行器类 |
| 参数 | `name?: string`，`options?: ExecutorOptions` |
| 返回值 | `ClassDecorator` |
| 默认命名规则 | 如果不传 `name`，用类名去掉 `Executor` 后缀后转小写 |

### 执行器辅助函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `getExecutorMetadata(target)` | 类或对象 | `ExecutorMetadata \| undefined` | 读取执行器元数据 |
| `getExecutorName(target)` | 类或对象 | `string \| undefined` | 取执行器名 |
| `isExecutor(target)` | 类或对象 | `boolean` | 判断是否标记为执行器 |

<a id="validation-decorators"></a>
## 校验装饰器

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `Required(message?)` | 可选错误消息 | 装饰器函数 | 标记字段或参数必填 |
| `IsString(message?)` | 可选错误消息 | 装饰器函数 | 标记为字符串 |
| `IsNumber(message?)` | 可选错误消息 | 装饰器函数 | 标记为数字 |
| `IsEmail(message?)` | 可选错误消息 | 装饰器函数 | 标记为邮箱 |

说明：

- 这组装饰器只写元数据
- 真正的 DTO 校验是否执行，取决于你上层的集成逻辑

<a id="plugin-autodi"></a>
## 插件 AutoDI 与注册函数

### `withRegisterAutoDI(plugin, config?)`

| 项 | 说明 |
|---|---|
| 作用 | 为 Fastify 插件接入模块发现、路由注册、执行器注册、适配器注册 |
| 参数 | `plugin: FastifyPluginAsync<T> \| FastifyPluginCallback<T>`，`config?: Partial<AutoDIConfig>` |
| 返回值 | `FastifyPluginAsync<T>` |
| 适合 | 应用插件、生态插件、CLI 生成插件模板 |

### `processPluginParameters(options, config, debugEnabled?)`

| 项 | 说明 |
|---|---|
| 作用 | 在插件执行前统一处理和校验参数 |
| 参数 | 插件参数、AutoDI 配置、调试开关 |
| 返回值 | 处理后的参数对象 |

### `resolveBasePath(configBaseDir?, pluginPath?)`

| 项 | 说明 |
|---|---|
| 作用 | 决定插件模块扫描的基础目录 |
| 参数 | 显式基础目录、插件文件路径 |
| 返回值 | `string` |
| 规则 | 先用显式配置，再用调用者路径，最后做自动检测 |

### `getCallerFilePath()`

| 项 | 说明 |
|---|---|
| 作用 | 从调用栈里推断插件源文件路径 |
| 参数 | 无 |
| 返回值 | `string \| undefined` |

### `getPluginName(plugin)`

| 项 | 说明 |
|---|---|
| 作用 | 根据插件函数推断插件名称 |
| 参数 | 插件函数 |
| 返回值 | `string` |

### `isAsyncPlugin(plugin)`

| 项 | 说明 |
|---|---|
| 作用 | 判断插件是不是异步插件 |
| 参数 | 插件函数 |
| 返回值 | `boolean` |

<a id="plugin-registration"></a>
## 注册与处理相关函数

| API | 参数概览 | 返回值概览 | 说明 |
|---|---|---|---|
| `ensureAwilixPlugin(fastify)` | Fastify 实例 | 容器实例 | 确保 `@fastify/awilix` 已注册 |
| `performAutoRegistration(pluginContext)` | 插件上下文 | `Promise<void>` | 自动注册插件内部对象 |
| `registerControllerRoutes(...)` | Fastify、控制器信息、路由配置 | 注册结果 | 把控制器路由挂到 Fastify |
| `registerServiceAdapters(pluginContext)` | 插件上下文 | `Promise<void>` | 注册适配器 |
| `registerExecutorDomain(...)` | 执行器上下文 | 注册结果 | 注册执行器域 |
| `processExecutorRegistration(...)` | 执行器处理配置 | 处理结果 | 处理执行器注册过程 |
| `processModulesUnified(...)` | 模块处理配置 | 处理结果 | 统一处理多种模块 |
| `processSingleModule(...)` | 单模块处理配置 | 处理结果 | 处理单个模块 |

<a id="plugin-lifecycle"></a>
## 生命周期相关 API

| API | 说明 |
|---|---|
| `ConventionBasedLifecycleManager` | 基于方法命名约定的生命周期管理器 |
| `FASTIFY_LIFECYCLE_METHODS` | Fastify 生命周期方法清单 |

这些 API 主要给框架内部和高级插件场景使用。  
如果你只是普通应用开发者，理解“插件会自动注册生命周期钩子”即可，不需要直接依赖这些底层对象。
