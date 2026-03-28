# Performance、Streams 与 Brands API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页覆盖：

- `performance` 族
- `streams` 族
- `brands` 族

<a id="page-summary"></a>
## 页面摘要

- 这一页把 `functional` 里偏工程化的三组能力放在一起：性能包装、流式处理和品牌类型。
- `performance` 主要用于普通异步函数的缓存、重试、限流和超时；`streams` 用于序列处理；`brands` 用于类型安全。
- 如果你的问题只是“如何批量处理列表”，先确认你需要的是 `streams` 还是普通数组工具，不要直接上复杂抽象。

<a id="page-nav"></a>
## 页内导航

- [Performance](#performance-api)
- [Streams](#streams-api)
- [Brands](#brands-api)
- [使用建议](#usage-notes)

<a id="performance-api"></a>
## Performance

这组 API 主要给普通异步函数做缓存、超时、重试、节流、防抖和批处理。

### 装饰器与包装器

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `funcWithRetry(retries, delay?)` | 重试次数、延迟 | 包装器函数 | 给普通异步函数做重试 |
| `funcWithTimeout(timeoutMs)` | 超时毫秒数 | 包装器函数 | 给普通异步函数加超时 |
| `withLogging(logger, operationName)` | logger、操作名 | 包装器函数 | 记录开始、结束、失败日志 |
| `withPerformanceMonitoring(options?)` | 性能配置 | 包装器函数 | 监控耗时和内存 |
| `withSmartCache(options?)` | 缓存选项 | 包装器函数 | 给异步函数做缓存 |

### `SmartCache<K, V>`

| 构造参数 | 说明 |
|---|---|
| `maxSize` | 最大缓存项数，默认 `100` |
| `ttl` | 过期时间，默认 `300000` |

| 方法 | 作用 |
|---|---|
| `get(key)` | 获取缓存值 |
| `set(key, value)` | 写入缓存 |
| `clear()` | 清空缓存 |

### 节流、防抖、批处理与并发

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `debounce(fn, delay)` | 函数、延迟毫秒 | 新函数 | 防抖 |
| `throttle(fn, interval)` | 函数、时间间隔 | 新函数 | 节流 |
| `batch(processor, options?)` | 批处理函数、选项 | `BatchProcessor<T>` | 批量聚合处理 |
| `concurrencyLimit(maxConcurrent)` | 最大并发数 | `ConcurrencyController` | 限制同一时间的执行数 |

`BatchProcessor<T>` 方法：

| 方法 | 作用 |
|---|---|
| `add(item)` | 往当前批次加入一个元素 |
| `flush()` | 立即处理当前批次 |

<a id="streams-api"></a>
## Streams

### `Stream<T>` 常用实例方法

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `map(fn)` | 映射函数 | `Stream<U>` | 同步逐项映射 |
| `filter(predicate)` | 条件函数 | `Stream<T>` | 同步过滤 |
| `flatMap(fn)` | 返回 `Stream<U>` 的函数 | `Stream<U>` | 展平映射 |
| `take(count)` | 数量 | `Stream<T>` | 取前 N 项 |
| `skip(count)` | 数量 | `Stream<T>` | 跳过前 N 项 |
| `reduce(reducer, initial)` | 归并函数、初始值 | 累积值 | 聚合整个流 |
| `toArray()` | 无 | `T[]` | 收集为数组 |
| `forEach(action)` | 处理函数 | `void` | 遍历执行副作用 |

### `AsyncStream<T>` 常用实例方法

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `map(fn)` | 异步/同步映射函数 | `AsyncStream<U>` | 异步逐项映射 |
| `filter(predicate)` | 异步/同步条件函数 | `AsyncStream<T>` | 异步过滤 |
| `flatMap(fn)` | 返回 `AsyncStream<U>` 的函数 | `AsyncStream<U>` | 展平映射 |
| `take(count)` | 数量 | `AsyncStream<T>` | 取前 N 项 |
| `reduce(reducer, initial)` | 异步/同步归并函数、初始值 | `Promise<U>` | 聚合异步流 |
| `toArray()` | 无 | `Promise<T[]>` | 收集为数组 |
| `forEach(action)` | 异步/同步处理函数 | `Promise<void>` | 遍历执行副作用 |

### 创建流

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `fromArray(array)` | 数组 | `Stream<T>` | 从数组创建同步流 |
| `fromGenerator(generator)` | 生成器工厂 | `Stream<T>` | 从同步生成器创建流 |
| `fromPromises(promises)` | Promise 数组 | `AsyncStream<T>` | 从 Promise 列表创建异步流 |
| `fromAsyncGenerator(generator)` | 异步生成器工厂 | `AsyncStream<T>` | 从异步生成器创建流 |
| `range(start, end?, step?)` | 起点、终点、步长 | `Stream<number>` | 数值区间流 |
| `repeat(value, count?)` | 值、次数 | `Stream<T>` | 重复值流 |
| `cycle(array)` | 数组 | `Stream<T>` | 循环流 |
| `fibonacci()` | 无 | `Stream<number>` | 斐波那契数列流 |
| `primes()` | 无 | `Stream<number>` | 素数流 |

### 组合与转换

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `merge(...streams)` | 多个流 | `Stream<T>` | 依次合并多个流 |
| `interleave(...streams)` | 多个流 | `Stream<T>` | 交错输出多个流 |
| `groupBy(stream, keyFn)` | 流、分组函数 | `Stream<[K, T[]]>` | 按键分组 |
| `chunk(stream, size)` | 流、大小 | `Stream<T[]>` | 分块输出 |
| `window(stream, size)` | 流、窗口大小 | `Stream<T[]>` | 滑动窗口 |
| `distinct(stream)` | 流 | `Stream<T>` | 去重 |
| `sort(stream, compareFn?)` | 流、排序函数 | `Stream<T>` | 排序 |
| `delay(stream, ms)` | 异步流、延迟 | `AsyncStream<T>` | 延迟输出 |

### 管道辅助

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `streamPipe(stream)` | 同步流 | 管道辅助对象 | 便于链式处理同步流 |
| `asyncStreamPipe(stream)` | 异步流 | 管道辅助对象 | 便于链式处理异步流 |

返回的辅助对象核心方法和原始 `Stream/AsyncStream` 类似，本质是为了让组合写法更顺手。

<a id="brands-api"></a>
## Brands

Brand 类型用于给原始值打上语义标签，避免不同含义的 `string` / `number` 混用。

### 品牌构造器

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `createBrand(name, validator?)` | 品牌名、可选校验器 | Brand 构造函数 | 创建新的品牌类型构造器 |
| `combineBrands(v1, v2)` | 两个品牌值 | 组合品牌值 | 合并多个品牌语义 |
| `convertBrand(value, validator)` | 品牌值、目标校验器 | 新品牌值 | 品牌转换 |
| `mapBrand(value, mapper)` | 品牌值、映射函数 | 新品牌值 | 在保留品牌语义前提下变换值 |
| `validateBrands(value, validators)` | 值、验证器数组 | `boolean` | 批量验证 |

### 常用品牌构造器

| API | 输入 | 输出 | 说明 |
|---|---|---|---|
| `UserId(value)` | `string` | `UserId` | 用户 ID |
| `EmailAddress(value)` | `string` | `EmailAddress` | 邮箱地址 |
| `Url(value)` | `string` | `Url` | URL |
| `PositiveInteger(value)` | `number` | `PositiveInteger` | 正整数 |
| `NonNegativeNumber(value)` | `number` | `NonNegativeNumber` | 非负数 |
| `Percentage(value)` | `number` | `Percentage` | 百分比 |
| `Timestamp(value)` | `number` | `Timestamp` | 时间戳 |
| `JsonString(value)` | `string` | `JsonString` | JSON 字符串 |
| `Base64String(value)` | `string` | `Base64String` | Base64 文本 |
| `UUID(value)` | `string` | `UUID` | UUID |
| `IpAddress(value)` | `string` | `IpAddress` | IP 地址 |
| `Port(value)` | `number` | `Port` | 端口号 |

### 工具函数

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `createIdGenerator(prefix?)` | 可选前缀 | `() => Brand<string, B>` | 生成品牌 ID 的函数 |
| `generateUUID()` | 无 | `UUID` | 生成 UUID |
| `now()` | 无 | `Timestamp` | 生成当前时间戳 |

<a id="usage-notes"></a>
## 使用建议

- 要做运行期约束和语义区分，用 Brands。
- 要处理连续数据或大批量序列，用 Streams。
- 要优化异步函数调用特性，用 Performance 族。
