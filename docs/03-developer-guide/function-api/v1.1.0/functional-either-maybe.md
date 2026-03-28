# Either 与 Maybe API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页覆盖 `@stratix/core/functional` 中最常用的两个代数数据类型：`Either` 和 `Maybe`。

<a id="page-summary"></a>
## 页面摘要

- `Either` 用来表达成功或失败，`Maybe` 用来表达值存在或不存在；这是两套语义，不要混用。
- 如果你在写 Service 返回值、校验链或多步处理流程，先学 `Either`；如果你在处理可选值，优先看 `Maybe`。
- 页末保留了导出清单，用来确认哪些名字是公开 API。

<a id="page-nav"></a>
## 页内导航

- [Either](#either-api)
- [Maybe](#maybe-api)
- [什么时候用哪一个](#selection-guide)
- [导出清单](#exports)

<a id="either-api"></a>
## `Either`

`Either<L, R>` 表示“要么失败，要么成功”。  
在灵枢枢机里，Service 层就是用它做标准返回值模型。

### 核心构造与判断

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `eitherLeft(value)` | 错误值 | `Left<L>` | 构造失败值 |
| `eitherRight(value)` | 成功值 | `Right<R>` | 构造成功值 |
| `isLeft(either)` | `Either<L, R>` | `boolean` | 判断失败态 |
| `isRight(either)` | `Either<L, R>` | `boolean` | 判断成功态 |

### 变换与串联

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `eitherMap(fn)` | 成功值映射函数 | 新 `Either` | 只变换 `Right` |
| `eitherMapLeft(fn)` | 错误值映射函数 | 新 `Either` | 只变换 `Left` |
| `eitherChain(fn)` | 返回 `Either` 的函数 | 新 `Either` | 串联多个可能失败的步骤 |
| `eitherFlatMap(fn)` | 同上 | 新 `Either` | `eitherChain` 别名 |
| `eitherBimap(onLeft, onRight)` | 两个映射函数 | 新 `Either` | 同时处理两种分支 |
| `eitherFilter(predicate, onFalse)` | 条件与失败构造函数 | 新 `Either` | 对成功值进一步校验 |

### 组织与辅助入口

| API | 说明 |
|---|---|
| `EitherDo` | `Either` 的 Do-notation 风格辅助入口，适合把多步计算组织成更线性的写法 |

### 收口与默认值

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `eitherFold(onLeft, onRight)` | 两个收口函数 | 普通值 | 把 `Either` 收成一个结果 |
| `eitherGetOrElse(defaultValue)` | 默认值 | 普通值 | 失败时给固定默认值 |
| `eitherGetOrElseW(onLeft)` | 错误处理函数 | 普通值 | 失败时动态计算默认值 |
| `eitherSwap(either)` | `Either` | 交换后的 `Either` | 左右互换 |

### 提升、遍历与批处理

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `eitherLift(fn)` | 普通函数 | `Either` 上下文函数 | 把普通函数提升到 `Either` 上下文 |
| `eitherLift2(fn)` | 二元函数 | 提升后的函数 | 处理两个 `Either` 输入 |
| `eitherLift3(fn)` | 三元函数 | 提升后的函数 | 处理三个 `Either` 输入 |
| `eitherAp(eitherFn)` | 装在 `Either` 里的函数 | 新 `Either` | 应用函子 |
| `eitherSequence(eithers)` | `Either[]` | `Either<L, R[]>` | 收集一组 `Either` |
| `eitherSequenceParallel(eithers)` | Promise/Either 组合 | Promise 结果 | 并行收集 |
| `eitherTraverse(fn)` | 遍历函数 | 处理后的结果 | 映射并收集 |
| `eitherAll(eithers)` | 一组 `Either` | 聚合结果 | 全部成功才成功 |
| `eitherValidate(...)` | 验证规则 | `Either` | 用于批量验证 |

### 异常与 JSON

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `tryCatch(fn, onError?)` | 普通函数、可选错误映射 | `Either` | 捕获同步异常 |
| `tryCatchAsync(fn, onError?)` | 异步函数、可选错误映射 | `Promise<Either>` | 捕获异步异常 |
| `eitherFromJSON(json, onError?)` | JSON 字符串 | `Either` | 安全解析 JSON |
| `eitherToJSON(either)` | `Either` | `string` | 序列化为 JSON |

<a id="maybe-api"></a>
## `Maybe`

`Maybe<T>` 表示“值可能存在，也可能不存在”，但它不是错误模型。

### 核心构造与判断

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `maybeSome(value)` | 值 | `Some<T>` | 构造有值 |
| `maybeNone` | 无 | `None` | 构造无值 |
| `isSome(maybe)` | `Maybe<T>` | `boolean` | 判断有值 |
| `isNone(maybe)` | `Maybe<T>` | `boolean` | 判断无值 |
| `fromNullable(value)` | `T \| null \| undefined` | `Maybe<T>` | 从可空值构造 |

### 变换与串联

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `maybeMap(fn)` | 映射函数 | `Maybe<U>` | 只处理 `Some` |
| `maybeChain(fn)` | 返回 `Maybe` 的函数 | `Maybe<U>` | 串联步骤 |
| `maybeFlatMap(fn)` | 同上 | `Maybe<U>` | `maybeChain` 别名 |
| `maybeFilter(predicate)` | 条件函数 | `Maybe<T>` | 进一步筛选值 |
| `maybeFilterMap(predicate)` | 类型守卫 | `Maybe<B>` | 条件缩小类型 |
| `maybeMapNullable(fn)` | 可空映射函数 | `Maybe<U>` | 先映射再转可空 |

### 收口与默认值

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `maybeFold(onNone, onSome)` | 两个收口函数 | 普通值 | 把 `Maybe` 收成一个结果 |
| `maybeGetOrElse(defaultValue)` | 默认值 | 普通值 | 空值时给默认值 |
| `maybeGetOrElseW(onNone)` | 默认值函数 | 普通值 | 动态默认值 |
| `maybeAlt(alternative)` | 备选值 | `Maybe<T>` | 没值时使用替代值 |
| `maybeWhen(condition, value)` | 条件和值 | `Maybe<T>` | 条件满足才构造 `Some` |

### 批处理与 JSON

| API | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `maybeSequence(maybes)` | `Maybe[]` | `Maybe<T[]>` | 收集一组 `Maybe` |
| `maybeSequenceParallel(maybes)` | Promise/Maybe 组合 | Promise 结果 | 并行收集 |
| `maybeTraverse(fn)` | 遍历函数 | 处理后的结果 | 映射并收集 |
| `maybeFirstSome(maybes)` | 一组 `Maybe` | `Maybe<T>` | 找第一个有值的 |
| `maybeTryAll(fns)` | 多个尝试函数 | `Maybe<T>` | 找第一个成功的结果 |
| `maybeFromPromise(promise)` | Promise | `Promise<Maybe<T>>` | 把 Promise 结果转成 `Maybe` |
| `maybeFromJSON(json)` | JSON 字符串 | `Maybe<T>` | 安全解析 JSON |
| `maybeToJSON(maybe)` | `Maybe<T>` | `string` | 序列化为 JSON |
| `maybeLazy(factory)` | 延迟创建 `Maybe` 的工厂函数 | `Maybe<T>` | 只有真正使用时才计算 |

### 组织与辅助入口

| API | 说明 |
|---|---|
| `MaybeDo` | `Maybe` 的 Do-notation 风格辅助入口，适合组织多步可空值计算 |

<a id="selection-guide"></a>
## 什么时候用哪一个

| 场景 | 推荐 |
|---|---|
| 查不到值不算错误 | `Maybe` |
| 参数不合法、权限失败、数据库失败 | `Either` |
| 想带上失败原因 | `Either` |
| 只是可选字段不存在 | `Maybe` |

<a id="exports"></a>
## 导出清单

### Either

- `eitherAll`
- `eitherAp`
- `eitherBimap`
- `eitherChain`
- `EitherDo`
- `eitherFilter`
- `eitherFlatMap`
- `eitherFold`
- `eitherFromJSON`
- `eitherGetOrElse`
- `eitherGetOrElseW`
- `eitherLeft`
- `eitherLift`
- `eitherLift2`
- `eitherLift3`
- `eitherMap`
- `eitherMapLeft`
- `eitherRight`
- `eitherSequence`
- `eitherSequenceParallel`
- `eitherSwap`
- `eitherToJSON`
- `eitherTraverse`
- `eitherValidate`
- `isLeft`
- `isRight`
- `tryCatch`
- `tryCatchAsync`

### Maybe

- `fromNullable`
- `isNone`
- `isSome`
- `maybeAlt`
- `maybeChain`
- `MaybeDo`
- `maybeFilter`
- `maybeFilterMap`
- `maybeFirstSome`
- `maybeFlatMap`
- `maybeFold`
- `maybeFromJSON`
- `maybeFromPromise`
- `maybeGetOrElse`
- `maybeGetOrElseW`
- `maybeLazy`
- `maybeMap`
- `maybeMapNullable`
- `maybeNone`
- `maybeSequence`
- `maybeSequenceParallel`
- `maybeSome`
- `maybeToJSON`
- `maybeTraverse`
- `maybeTryAll`
- `maybeWhen`
