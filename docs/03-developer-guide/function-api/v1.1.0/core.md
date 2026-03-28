# Core 与运行时 API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：当前页：Core 总览 | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页现在是 Core 侧的总览页。  
详细函数说明已经继续拆到下面这些子页：

- [运行时与插件 API](./core-runtime-plugin.md)
- [Context 与 Data API](./core-context-data.md)
- [Environment 与 Auth API](./core-environment-auth.md)
- [Async API](./core-async.md)
- [Logger 与 Utils API](./core-logger-utils.md)

这一页覆盖这些导入路径的整体认知：

- `@stratix/core` 中和运行时有关的 API
- `@stratix/core/context`
- `@stratix/core/environment`
- `@stratix/core/data`
- `@stratix/core/async`
- `@stratix/core/auth`
- `@stratix/core/logger`
- `@stratix/core/utils`

<a id="page-summary"></a>
## 页面摘要

- 这一页是 Core 侧总览，先帮你判断应该查哪一组导入路径，再决定是否进入细分页。
- 如果你正在做普通应用开发，建议优先关注运行时启动、环境与配置、数据工具、异步工具和日志。
- 如果你已经知道主题，可以直接用下方页内导航跳到对应导入路径，或进入更细的专题页。

<a id="page-nav"></a>
## 页内导航

- [@stratix/core](#root-core)
- [@stratix/core/context](#core-context)
- [@stratix/core/environment](#core-environment)
- [@stratix/core/data](#core-data)
- [@stratix/core/async](#core-async)
- [@stratix/core/auth](#core-auth)
- [@stratix/core/logger](#core-logger)
- [@stratix/core/utils](#core-utils)
- [完整导出清单](#complete-exports)

<a id="root-core"></a>
## `@stratix/core`

### `Stratix.run(options?, extraStream?)`

最推荐的应用启动入口。  
绝大多数应用项目都应该优先用它，而不是直接 new `ApplicationBootstrap`。

```ts
import { Stratix } from '@stratix/core';

const app = await Stratix.run({
  type: 'web',
  debug: true
});

const result = await app.inject({
  method: 'GET',
  url: '/health'
});
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `options` | `StratixRunOptions` | 启动配置，决定应用类型、debug、环境、配置来源、关闭行为等 |
| `extraStream` | `any` | 额外日志流。需要把日志同时发到 WebSocket、文件流等场景时使用 |

返回值：

| 返回值 | 说明 |
|---|---|
| `Promise<StratixApplication>` | 已启动的应用实例，常用字段包括 `fastify`、`diContainer`、`inject()`、`stop()`、`healthCheck()` |

适合：

- CLI 生成项目的入口文件
- 本地开发和测试环境启动应用
- 需要用 `inject()` 做接口级验证

### `new Stratix(options?, extraStream?)`

适合想手动控制生命周期的场景。

```ts
import { Stratix } from '@stratix/core';

const runtime = new Stratix({ type: 'web' });
const app = await runtime.start();
await runtime.stop();
```

常用实例方法：

| 方法 | 作用 | 返回值 |
|---|---|---|
| `start(options?)` | 启动应用 | `Promise<StratixApplication>` |
| `stop()` | 停止当前应用 | `Promise<void>` |
| `restart(options?)` | 重启应用 | `Promise<StratixApplication>` |
| `getApplication()` | 获取当前应用实例 | `StratixApplication \| null` |
| `isRunning()` | 当前是否已启动 | `boolean` |
| `getStatus()` | 获取运行状态摘要 | `any` |
| `cleanup()` | 清理资源，本质上会调用 `stop()` | `Promise<void>` |

### `ApplicationBootstrap`

框架内部真正的启动器。  
只有当你需要接管完整启动流程时，才建议直接使用它。

```ts
import { ApplicationBootstrap, createLogger } from '@stratix/core';

const logger = createLogger();
const bootstrap = new ApplicationBootstrap(logger);
const app = await bootstrap.bootstrap({ type: 'web' });
```

关键方法：

| 方法 | 说明 |
|---|---|
| `bootstrap(options?)` | 负责环境加载、配置加载、容器初始化、Fastify 初始化、插件加载、应用级 AutoDI 和启动 |
| `stop()` | 停止应用并清理资源 |
| `restart(options?)` | 用新参数重启 |
| `getStatus()` | 获取 `BootstrapStatus` |

### `withRegisterAutoDI(plugin, config?)`

插件开发最重要的入口。  
它会自动扫描并注册插件目录下的控制器、服务、仓储、执行器和适配器。

```ts
import { withRegisterAutoDI } from '@stratix/core';

async function redisPlugin(fastify) {
  fastify.get('/ping', async () => ({ ok: true }));
}

export default withRegisterAutoDI(redisPlugin, {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}',
      'executors/*.{ts,js}'
    ]
  },
  routing: {
    enabled: true,
    prefix: '/redis',
    validation: false
  },
  services: {
    enabled: true,
    patterns: ['adapters/*.{ts,js}']
  },
  debug: true
});
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `plugin` | `FastifyPluginAsync<T> \| FastifyPluginCallback<T>` | 原始 Fastify 插件 |
| `config` | `Partial<AutoDIConfig>` | AutoDI 配置，会和默认值合并 |

`AutoDIConfig` 核心字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `discovery.patterns` | `string[]` | 需要扫描的模块模式 |
| `discovery.baseDir` | `string` | 显式指定基础目录，默认自动推断 |
| `routing.enabled` | `boolean` | 是否自动注册控制器路由 |
| `routing.prefix` | `string` | 统一路由前缀，推荐在这里配置 |
| `routing.validation` | `boolean` | 是否启用路由验证 |
| `services.enabled` | `boolean` | 是否注册适配器 |
| `services.patterns` | `string[]` | 适配器扫描模式 |
| `lifecycle.enabled` | `boolean` | 是否启用生命周期管理 |
| `lifecycle.errorHandling` | `'throw' \| 'log' \| 'ignore'` | 生命周期错误处理方式 |
| `parameterProcessor` | `<T>(options: T) => T` | 插件启动前改写参数 |
| `parameterValidator` | `<T>(options: T) => boolean` | 插件启动前校验参数 |
| `debug` | `boolean` | 是否输出调试信息 |

使用建议：

- 插件项目尽量保持 CLI 模板默认目录结构。
- 控制器前缀放在 `routing.prefix`，不要放在 `@Controller()` 里。
- 如果插件参数复杂，优先使用 `parameterProcessor` 和 `parameterValidator` 做统一入口处理。

### 控制器装饰器

#### `@Controller(options?)`

把类标记成控制器。

```ts
import { Controller, Get } from '@stratix/core';

@Controller()
class UserController {
  @Get('/users')
  async list() {
    return [{ id: 1, name: 'Alice' }];
  }
}
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `options` | `ControllerOptions` | 控制器元数据配置 |

注意：

- `@Controller()` 不负责路径前缀。
- 前缀应该通过 `withRegisterAutoDI(..., { routing: { prefix } })` 配置。

#### `@Get(path?, opts?)` / `@Post(path?, opts?)` / `@Put(path?, opts?)` / `@Delete(path?, opts?)` / `@Patch(path?, opts?)` / `@Head(path?, opts?)` / `@Options(path?, opts?)`

把类方法标记为 HTTP 路由。

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `path` | `string` | 路由路径，默认 `'/'`，会自动补全 `/` 前缀 |
| `opts` | `RouteShorthandOptions` | Fastify 路由选项，例如 `schema`、`preHandler` |

返回值：

| 返回值 | 说明 |
|---|---|
| `MethodDecorator` | 标准方法装饰器，供 AutoDI 在扫描控制器时读取 |

常见错误：

- 只能装饰方法，不能装饰属性。
- `path` 必须是字符串。
- 同一个控制器里重复声明相同 HTTP 方法和 path，会触发重复警告。

### 执行器装饰器

#### `@Executor(options?)`
#### `@Executor(name, options?)`

把类标记成执行器。

```ts
import { Executor } from '@stratix/core';

@Executor('userCreator', {
  description: '创建用户',
  version: '1.1.0',
  tags: ['user'],
  category: 'business'
})
class UserCreatorExecutor {}
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `name` | `string` | 可选，执行器名称 |
| `options` | `ExecutorOptions` | 描述、版本、标签、类别、配置 schema 等元数据 |

配套 API：

| API | 作用 |
|---|---|
| `getExecutorMetadata(target)` | 获取执行器元数据 |
| `getExecutorName(target)` | 获取执行器名称 |
| `isExecutor(target)` | 判断目标是否是执行器 |

行为说明：

- 不传 `name` 时，默认取类名去掉 `Executor` 后缀后转小写。
- 执行器会在 AutoDI 扫描执行器目录时自动参与注册。

### 校验装饰器

这组装饰器负责写入校验元数据，本身不直接替你执行 DTO 校验流程。

| 装饰器 | 参数 | 作用 |
|---|---|---|
| `Required(message?)` | 自定义错误消息 | 标记字段必填 |
| `IsString(message?)` | 自定义错误消息 | 必须是字符串 |
| `IsNumber(message?)` | 自定义错误消息 | 必须是数字 |
| `IsEmail(message?)` | 自定义错误消息 | 必须是邮箱 |

<a id="core-context"></a>
## `@stratix/core/context`

### `createContext(defaultValues?)`

创建一个可读、可写、可订阅的共享上下文对象。

```ts
import { createContext } from '@stratix/core/context';

const ctx = createContext<{ requestId?: string; userId?: string }>({
  requestId: 'boot'
});

ctx.set('userId', 'u_1');
console.log(ctx.get('userId'));
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `defaultValues` | `Partial<T>` | 默认状态 |

返回值：`IContext<T>`

常用方法：

| 方法 | 作用 |
|---|---|
| `get(key)` | 读取字段 |
| `set(key, value)` | 写入字段并返回当前上下文 |
| `has(key)` | 判断字段是否存在 |
| `remove(key)` | 删除字段，若有默认值则恢复默认值 |
| `getAll()` | 获取快照 |
| `onChange(handler)` | 监听整体变更 |
| `subscribe(key, handler)` | 监听某个字段 |
| `setDefaults(defaultValues)` | 更新默认值 |
| `withHandler(handler)` | 把内部状态对象交给处理函数 |
| `clear()` | 清空并恢复默认值 |

### `createNamespace(name, defaultValues?)`

和 `createContext()` 类似，但多一个 `name` 字段，适合多命名空间并存的场景。

<a id="core-environment"></a>
## `@stratix/core/environment`

### `get(key, defaultValue?, transform?)`

读取环境变量的通用入口。

```ts
import { get } from '@stratix/core/environment';

const host = get('APP_HOST', '127.0.0.1');
const port = get('APP_PORT', '3000', (value) => Number(value));
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `key` | `string` | 环境变量名 |
| `defaultValue` | `string` | 默认值 |
| `transform` | `(value: string) => T` | 自定义转换函数 |

返回值：`string | T | undefined`

### 其他环境 API

| API | 作用 |
|---|---|
| `getBoolean(key, defaultValue?)` | 把 `true/1/yes` 视为 `true` |
| `getNumber(key, defaultValue?)` | 转数字，失败时退默认值 |
| `getArray(key, defaultValue?, separator?)` | 按分隔符拆数组 |
| `getObject(key, defaultValue?)` | 把 JSON 字符串转成对象 |
| `required(key, message?)` | 必填，不存在就抛错 |
| `hasEnv(key)` | 检查是否存在 |
| `getAll()` | 获取环境变量副本 |
| `set(key, value)` | 只在当前运行时写入 `process.env` |
| `getNodeEnv()` | 获取 `NODE_ENV` |
| `isDevelopment()` / `isProduction()` / `isTest()` | 判断环境 |

<a id="core-data"></a>
## `@stratix/core/data`

### 高频对象工具

#### `get(object, path, defaultValue?)`

安全读取嵌套字段。

```ts
import { get } from '@stratix/core/data';

const email = get(user, 'profile.email', '');
```

#### `set(object, path, value)`

按路径写入字段，不存在的中间层会自动创建。

```ts
import { set } from '@stratix/core/data';

const payload = {};
set(payload, 'user.profile.email', 'alice@example.com');
```

#### `pick(object, paths)` / `omit(object, paths)`

保留或排除字段。

```ts
import { omit, pick } from '@stratix/core/data';

const safeUser = omit(user, ['password']);
const summary = pick(user, ['id', 'name']);
```

### 高频合并工具

| API | 作用 |
|---|---|
| `assign(target, ...sources)` | 浅合并，后面的覆盖前面的 |
| `defaults(target, ...sources)` | 只补缺失字段 |
| `deepClone(value)` | 深拷贝 |
| `deepMerge(target, source)` | 深度合并 |
| `immutableDeepMerge(target, source)` | 返回新的深度合并结果 |

### 高频数组与比较工具

| API | 作用 |
|---|---|
| `chunk(array, size?)` | 分块 |
| `compact(array)` | 去假值 |
| `difference(array, ...values)` | 差集 |
| `flatten(array, depth?)` | 扁平化 |
| `groupBy(array, iteratee)` | 分组 |
| `keyBy(array, iteratee)` | 生成映射 |
| `take(array, count)` | 取前 N 项 |
| `unique(array)` | 去重 |
| `isEmpty(value)` | 检查空值 |
| `isNotEmpty(value)` | 非空检查 |
| `isEqual(value, other)` | 深度比较 |

<a id="core-async"></a>
## `@stratix/core/async`

### `sleep(ms)`

最简单的延迟函数。

```ts
import { sleep } from '@stratix/core/async';

await sleep(500);
```

### `executeParallel(promises, options?)`
### `executeSequential(promises, options?)`
### `executeMixed(promises, options?)`

这三组 API 用于批量执行异步任务。

```ts
import { executeParallel } from '@stratix/core/async';

const result = await executeParallel([
  () => repo.getById('1'),
  () => repo.getById('2')
], {
  timeout: 3000,
  failFast: false
});
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `promises` | `Array<() => Promise<T>>` | 任务函数数组 |
| `options.concurrency` | `number` | `executeMixed()` 时常用的并发限制 |
| `options.timeout` | `number` | 单任务超时 |
| `options.signal` | `AbortSignal` | 取消信号 |
| `options.failFast` | `boolean` | 出错时是否立即停止 |

返回值：`PromiseResult<T>`

| 字段 | 说明 |
|---|---|
| `results` | 成功结果数组 |
| `errors` | 失败错误数组 |
| `stats.total` | 总任务数 |
| `stats.successful` | 成功数量 |
| `stats.failed` | 失败数量 |
| `stats.duration` | 总耗时 |

选择建议：

- 互不依赖：`executeParallel()`
- 有顺序：`executeSequential()`
- 要控并发：`executeMixed()`

### `SmartQueue`

适合“有优先级、有并发上限、有排队”的任务场景。

```ts
import { SmartQueue, TaskPriority } from '@stratix/core/async';

const queue = new SmartQueue({
  maxConcurrency: 4,
  autoStart: true
});

const taskId = await queue.add(
  async () => processOrder('o_1'),
  { priority: TaskPriority.High, retries: 2 }
);
```

`QueueConfig`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `maxConcurrency` | `number` | 最大并发数 |
| `maxQueueSize` | `number` | 队列最大长度 |
| `backpressureThreshold` | `number` | 背压阈值 |
| `autoStart` | `boolean` | 创建后自动启动 |
| `defaultTimeout` | `number` | 默认超时 |
| `defaultRetries` | `number` | 默认重试次数 |

常用方法：

| 方法 | 作用 |
|---|---|
| `add(fn, options?)` | 加任务并返回任务 ID |
| `start()` / `stop()` / `pause()` | 控制队列 |
| `cancel(taskId)` | 取消任务 |
| `getTaskStatus(taskId)` | 查状态 |
| `getStats()` | 查统计 |
| `waitForTask(taskId)` | 等某个任务完成 |
| `waitForAll()` | 等全部完成 |

<a id="core-auth"></a>
## `@stratix/core/auth`

这一组 API 假设用户身份由网关通过请求头透传进来。

### 核心类型

| 类型 | 说明 |
|---|---|
| `UserIdentity` | 解析后的用户身份 |
| `IdentityHeaders` | 身份请求头结构 |
| `IdentityErrorType` | 鉴权错误类型 |
| `IdentityValidationResult` | 请求头解析结果 |
| `IdentityContext` | 请求内身份上下文 |
| `OnRequestPermissionHookOptions` | 权限 Hook 配置 |

### 权限函数

| API | 作用 |
|---|---|
| `hasPermission(user, permission)` | 判断是否有指定权限 |
| `hasRole(user, role)` | 判断是否有指定角色 |
| `hasUserType(user, userType)` | 判断用户类型 |
| `onRequestPermissionHook(options)` | 生成 Fastify `onRequest` Hook |

<a id="core-logger"></a>
## `@stratix/core/logger`

### `createLogger(options?, destination?)`

这是 `pino` 的直接导出别名。  
如果你只需要一个独立 logger，可以直接用它。

### `LoggerFactory.createUnifiedLogger(options?, extraStream?)`

框架推荐的统一日志器入口。  
它会复用同一个 Pino 实例，并按环境自动切换开发态美化输出和生产态 JSON 输出。

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `options` | `StratixRunOptions` | 启动参数，可带 logger 配置 |
| `extraStream` | `any` | 额外日志流 |

### `getLogger()`

获取当前统一 logger；如果统一 logger 还没初始化，会回退到 `console`。

<a id="core-utils"></a>
## `@stratix/core/utils`

这是一个聚合出口。  
它不是新的领域模型，只是把多个子模块和底层工具统一转出。

适合：

- 调试阶段快速试验
- 老代码迁移期减少导入改动

不适合：

- 新业务长期依赖它做正式导入
- 需要强调模块边界的正式模块代码

### 常用错误处理能力

#### `new StratixError(type, message, code?, context?, cause?)`

创建一个带类型、错误码、上下文和时间戳的框架错误。

#### `HandleErrors(errorType?)`

方法装饰器。  
用于把方法里的异常统一包装和上报到全局错误处理器。

#### `ErrorUtils`

`ErrorUtils` 是一组函数式错误处理工具，常用的有：

| API | 作用 |
|---|---|
| `extractMessage(error)` | 从未知错误里提取消息 |
| `wrapError(error, options)` | 给错误补上下文并返回新错误 |
| `safeExecute(fn, options)` | 失败时返回默认值 |
| `safeExecuteSync(fn, options)` | 同步版本安全执行 |
| `createErrorWrapper(context, logger?)` | 创建预绑定上下文的包装器 |
| `createSafeExecutor(component, logger?, defaultLogLevel?)` | 创建预绑定组件名的安全执行器 |
| `formatForLogging(error, context?)` | 生成结构化日志对象 |

#### `withErrorHandling(fn, context, logger?)`

把普通函数或异步函数包成“自动加上下文再抛错”的版本。

#### `withRetry(fn, options)`

和 `@stratix/core/async` 的工具不同，这里是错误工具层的 Promise 重试包装器。

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `fn` | `() => Promise<T>` | 要执行的异步任务 |
| `options.maxRetries` | `number` | 最大重试次数 |
| `options.delay` | `number` | 初始延迟，默认 `1000` |
| `options.backoff` | `'linear' \| 'exponential'` | 退避策略 |
| `options.logger` | `Logger` | 可选日志器 |
| `options.context` | `string` | 可选上下文名 |

<a id="complete-exports"></a>
## 完整导出清单

### `@stratix/core`

- `Stratix`
- `ApplicationBootstrap`
- `BootstrapPhase`
- `DEFAULT_APPLICATION_AUTO_DI_CONFIG`
- `performApplicationAutoDI`
- `discoverAndProcessApplicationModules`
- `createApplicationLifecycleManager`
- `safeExecute`
- `ApplicationErrorHandler`
- `ApplicationErrorType`
- `Controller`
- `Get`
- `Post`
- `Put`
- `Delete`
- `Patch`
- `Head`
- `Options`
- `Executor`
- `Required`
- `IsString`
- `IsNumber`
- `IsEmail`
- `METADATA_KEYS`
- `ROUTE_METADATA_KEY`
- `CONTROLLER_METADATA_KEY`
- `EXECUTOR_METADATA_KEY`
- `MetadataManager`
- `getExecutorMetadata`
- `getExecutorName`
- `isExecutor`
- `withRegisterAutoDI`
- `ConventionBasedLifecycleManager`
- `FASTIFY_LIFECYCLE_METHODS`
- `ensureAwilixPlugin`
- `performAutoRegistration`
- `registerControllerRoutes`
- `registerServiceAdapters`
- `registerExecutorDomain`
- `processExecutorRegistration`
- `processModulesUnified`
- `processSingleModule`
- `processPluginParameters`
- `resolveBasePath`
- `getCallerFilePath`
- `getPluginName`
- `isAsyncPlugin`
- `createLogger`
- `getLogger`
- `LoggerFactory`
- `encrypt`
- `decrypt`
- `encryptConfig`
- `decryptConfig`
- `validateConfig`
- `generateSecureKey`
- `loadConfigFromFile`
- `saveConfigToFile`
- `FileScanner`

### `@stratix/core/context`

- `IContext`
- `INamespaceContext`
- `createContext`
- `createNamespace`

### `@stratix/core/environment`

- `get`
- `getBoolean`
- `getNumber`
- `getArray`
- `getObject`
- `isDevelopment`
- `isProduction`
- `isTest`
- `getNodeEnv`
- `hasEnv`
- `required`
- `getAll`
- `set`
- `isBrowser`
- `isNode`
- `isWebWorker`
- `supportsWebAPI`
- `supportsCSS`
- `getEnvironment`
- `isSSR`
- `getOSType`
- `getBrowserInfo`

### `@stratix/core/data`

- `chunk`
- `compact`
- `difference`
- `flatten`
- `groupBy`
- `keyBy`
- `intersection`
- `partition`
- `reduce`
- `shuffle`
- `sortBy`
- `take`
- `union`
- `unique`
- `isEmpty`
- `isNotEmpty`
- `isEqual`
- `assign`
- `defaults`
- `deepClone`
- `deepMerge`
- `immutableDeepMerge`
- `isObject`
- `get`
- `has`
- `set`
- `keys`
- `values`
- `entries`
- `fromEntries`
- `mapKeys`
- `mapValues`
- `transform`
- `pick`
- `omit`

### `@stratix/core/async`

- `common`
- `promiseCombinators`
- `concurrency`
- `sleep`
- `executePromises`
- `executeParallel`
- `executeSequential`
- `executeMixed`
- `withRetry`
- `withTimeout`
- `promisePipe`
- `ErrorAggregator`
- `PromiseStream`
- `createPromiseStream`
- `fromPromises`
- `ConcurrencyController`
- `CircuitBreaker`
- `ExecutionMode`
- `SmartQueue`
- `ResourcePool`
- `RateLimiter`
- `TaskPriority`
- `TaskStatus`

### `@stratix/core/auth`

- `UserIdentity`
- `IdentityHeaders`
- `IdentityErrorType`
- `IdentityError`
- `IdentityValidationResult`
- `IdentityContext`
- `OnRequestPermissionHookOptions`
- `hasPermission`
- `hasRole`
- `hasUserType`
- `onRequestPermissionHook`

### `@stratix/core/logger`

- `createLogger`
- `getLogger`
- `LoggerFactory`

### `@stratix/core/utils`

- `async`
- `auth`
- `context`
- `data`
- `environment`
- `functional`
- `encrypt`
- `decrypt`
- `encryptConfig`
- `decryptConfig`
- `validateConfig`
- `generateSecureKey`
- `loadConfigFromFile`
- `saveConfigToFile`
- `StratixError`
- `ErrorHandler`
- `DefaultErrorHandler`
- `ErrorHandlerManager`
- `globalErrorHandler`
- `HandleErrors`
- `createErrorFactory`
- `createPluginError`
- `createDIError`
- `createRouteError`
- `createContainerError`
- `ErrorUtils`
- `withErrorHandling`
- `withRetry`
- `FileScanner`
