# Async API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页覆盖 `@stratix/core/async`。

<a id="page-summary"></a>
## 页面摘要

- 这一页专门处理异步执行控制，包括超时、重试、批量执行、并发治理、队列和熔断。
- 如果你正在给普通 Promise 流程补稳定性，通常从 `withTimeout`、`withRetry` 和批量执行入口开始看。
- 如果你要的是 Service 层横切能力，请优先看 [Service API](./service.md) 中的装饰器，而不是直接在业务里堆异步工具。

<a id="page-nav"></a>
## 页内导航

- [基础函数](#async-basics)
- [批量 Promise 执行](#async-execution)
- [重试](#async-retry)
- [错误聚合与流式处理](#async-streams)
- [并发与熔断](#async-concurrency)
- [队列、资源池、限流器](#async-queue)
- [适用建议](#usage-notes)

<a id="async-basics"></a>
## 基础函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `sleep(ms)` | 毫秒数 | `Promise<void>` | 简单延迟 |
| `withTimeout(promise, timeoutMs, timeoutMessage?)` | Promise、超时毫秒、超时消息 | `Promise<T>` | 给普通 Promise 增加超时限制 |
| `promisePipe(...fns)` | 异步步骤函数数组 | `(initialValue) => Promise<any>` | 让多个异步步骤串成管道 |

<a id="async-execution"></a>
## 批量 Promise 执行

### 统一入口

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `executePromises(promises, options?)` | 任务函数数组、执行选项 | `Promise<PromiseResult<T>>` | 根据 `mode` 统一分派到并行、串行或混合执行 |

### 三种执行模式

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `executeParallel(promises, options?)` | 任务函数数组、执行选项 | `Promise<PromiseResult<T>>` | 所有任务并行 |
| `executeSequential(promises, options?)` | 任务函数数组、执行选项 | `Promise<PromiseResult<T>>` | 一个接一个执行 |
| `executeMixed(promises, options?)` | 任务函数数组、执行选项 | `Promise<PromiseResult<T>>` | 有并发上限的混合执行 |

### `PromiseExecutionOptions`

| 字段 | 类型 | 说明 |
|---|---|---|
| `mode` | `ExecutionMode` | 执行模式，默认 `Parallel` |
| `concurrency` | `number` | 混合模式下的并发数 |
| `timeout` | `number` | 单任务超时 |
| `signal` | `AbortSignal` | 取消信号 |
| `failFast` | `boolean` | 是否快速失败 |

### `PromiseResult<T>`

| 字段 | 说明 |
|---|---|
| `results` | 成功结果数组 |
| `errors` | 错误数组 |
| `stats.total` | 总任务数 |
| `stats.successful` | 成功数 |
| `stats.failed` | 失败数 |
| `stats.duration` | 总耗时 |

<a id="async-retry"></a>
## 重试

### `withRetry(fn, options)`

这是异步工具层的重试函数，注意它返回的是 `Either<Error, T>`。

| 参数 | 类型 | 说明 |
|---|---|---|
| `fn` | `() => Promise<T>` | 要执行的异步任务 |
| `options.retries` | `number` | 最大重试次数 |
| `options.delay` | `number` | 初始延迟，默认 `1000` |
| `options.backoffFactor` | `number` | 延迟倍增因子，默认 `2` |
| `options.maxDelay` | `number` | 最大延迟，默认 `30000` |
| `options.shouldRetry` | `(error: Error) => boolean` | 是否允许重试当前错误 |

返回值：

| 返回值 | 说明 |
|---|---|
| `Promise<Either<Error, T>>` | 成功时 `Right`，失败时 `Left` |

<a id="async-streams"></a>
## 错误聚合与流式处理

### `ErrorAggregator`

| 方法 | 作用 |
|---|---|
| `add(error)` | 收集错误 |
| `hasErrors()` | 判断是否收集到错误 |
| `getErrors()` | 返回错误数组副本 |
| `getAggregatedError()` | 返回聚合后的单个错误对象 |
| `clear()` | 清空错误 |

### `PromiseStream<T>`

一个基于 `AsyncIterable` 的 Promise 流封装。

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `map(fn)` | 映射函数 | `PromiseStream<U>` | 逐项映射 |
| `filter(predicate)` | 过滤函数 | `PromiseStream<T>` | 逐项过滤 |
| `batch(size)` | 批量大小 | `PromiseStream<T[]>` | 按批输出 |
| `toArray()` | 无 | `Promise<T[]>` | 收集为数组 |

### 创建 Promise 流

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `createPromiseStream(source)` | `AsyncIterable<T>` | `PromiseStream<T>` | 从异步可迭代源创建流 |
| `fromPromises(promises)` | `Promise<T>[]` | `PromiseStream<T>` | 从 Promise 数组创建流 |

<a id="async-concurrency"></a>
## 并发与熔断

### `ConcurrencyController`

| 构造参数 | 说明 |
|---|---|
| `limit: number` | 最大并发数 |

| 方法 | 作用 |
|---|---|
| `acquire()` | 申请执行槽位 |
| `release()` | 释放槽位 |
| `execute(fn)` | 自动包一层 acquire/release 后执行异步函数 |

### `CircuitBreaker`

| 构造参数 | 说明 |
|---|---|
| `failureThreshold` | 失败阈值，默认 `5` |
| `timeoutMs` | 打开后恢复尝试时间，默认 `60000` |
| `monitoringPeriodMs` | 监控周期，默认 `10000` |

| 方法 | 作用 |
|---|---|
| `execute(fn)` | 在熔断规则下执行函数 |
| `getState()` | 获取当前状态，返回 `closed/open/half-open` |

适合：

- 调外部 HTTP 接口
- 调消息系统、缓存系统、数据库代理层

<a id="async-queue"></a>
## 队列、资源池、限流器

### `SmartQueue<T>`

`SmartQueue` 适合带优先级和重试的队列任务。

| 构造参数 | 说明 |
|---|---|
| `QueueConfig` | 包括 `maxConcurrency`、`maxQueueSize`、`backpressureThreshold`、`autoStart`、`defaultTimeout`、`defaultRetries` |

| 方法 | 作用 |
|---|---|
| `add(fn, options?)` | 添加任务 |
| `start()` / `stop()` / `pause()` | 控制队列运行 |
| `clear()` | 清空等待队列 |
| `cancel(taskId)` | 取消任务 |
| `getTaskStatus(taskId)` | 查询状态 |
| `getStats()` | 获取统计 |
| `waitForTask(taskId)` | 等待单任务完成 |
| `waitForAll()` | 等待全部完成 |

### `ResourcePool<T>`

| 构造参数字段 | 说明 |
|---|---|
| `factory` | 创建资源的异步函数 |
| `destructor` | 销毁资源函数 |
| `validator` | 校验资源是否仍可用 |
| `maxSize` | 池最大容量 |
| `minSize` | 初始化时预热资源数量 |

| 方法 | 作用 |
|---|---|
| `acquire()` | 获取资源 |
| `release(resource)` | 归还资源 |
| `destroy()` | 销毁整个资源池 |
| `getStats()` | 查看池状态 |

### `RateLimiter`

| 构造参数 | 说明 |
|---|---|
| `maxTokens` | 最大令牌数 |
| `refillRate` | 每秒补充速率 |

| 方法 | 作用 |
|---|---|
| `acquire(tokens?)` | 等待直到可获取令牌 |
| `canAcquire(tokens?)` | 检查是否可立即获取令牌 |

<a id="usage-notes"></a>
## 适用建议

- 普通批量任务：优先 `executeParallel()` / `executeMixed()`
- 需要任务级状态和排队：用 `SmartQueue`
- 需要管理数据库连接、客户端会话等复用资源：用 `ResourcePool`
- 需要防止压垮下游：用 `RateLimiter` 或 `ConcurrencyController`
