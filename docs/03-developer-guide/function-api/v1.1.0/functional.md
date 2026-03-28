# Functional API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | 当前页：Functional 总览

这一页现在是 `@stratix/core/functional` 的总览页。  
详细函数说明已经继续拆到下面这些子页：

- [Pipe 与 Compose API](./functional-pipe-compose.md)
- [Either 与 Maybe API](./functional-either-maybe.md)
- [Curry 与 Optics API](./functional-curry-optics.md)
- [Performance、Streams 与 Brands API](./functional-performance-streams-brands.md)

这是 `1.1.0` 导出面里最宽的一组工具，所以这里先讲学习路径，再把具体函数分配到细分页。

<a id="page-summary"></a>
## 页面摘要

- 这一页先解决“应该从哪一组函数学起”，而不是直接把所有函数平铺在一张表里。
- 新手优先掌握 `pipe`、`Either`、`Maybe`；其他能力等遇到对应问题再回看即可。
- 需要精确参数和细粒度说明时，直接进入下方对应细分页。

<a id="page-nav"></a>
## 页内导航

- [新手先学哪几组](#learning-path)
- [pipe / compose](#pipe-compose)
- [Either](#either)
- [Maybe](#maybe)
- [什么时候该用 Either，什么时候该用 Maybe](#either-vs-maybe)
- [其他常用族群](#other-families)
- [完整导出清单](#complete-exports)

<a id="learning-path"></a>
## 新手先学哪几组

如果你第一次接触这组 API，先学这三组就够了：

1. `pipe` / `compose`
2. `Either`
3. `Maybe`

其他如 curry、optics、streams、brands，更适合在你明确碰到问题时再回来看。

<a id="pipe-compose"></a>
## `pipe` / `compose`

### `pipe(value, ...fns)`

从左到右把值传过多个函数。

```ts
import { pipe } from '@stratix/core/functional';

const result = pipe(
  'alice',
  (value) => value.trim(),
  (value) => value.toUpperCase(),
  (value) => `USER:${value}`
);
```

参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `value` | `any` | 初始值 |
| `...fns` | `AnyFunction[]` | 一串顺序执行的转换函数 |

返回值：最后一个函数的结果

### `compose(...fns)`

从右到左组合函数，返回一个新函数。

```ts
import { compose } from '@stratix/core/functional';

const normalize = compose(
  (value: string) => `USER:${value}`,
  (value: string) => value.toUpperCase(),
  (value: string) => value.trim()
);

const result = normalize(' alice ');
```

参数：`(...fns: AnyFunction[])`

返回值：`(value: any) => any`

### `pipeAsync(value, ...fns)` / `composeAsync(...fns)`

异步版本。  
当你的步骤里有异步函数时，优先用它们，不要自己在外层套多层 `await`。

<a id="either"></a>
## `Either`

`Either<L, R>` 用于表达“要么失败，要么成功”的结果。  
在灵枢枢机里，Service 层就是用它来做标准返回模型。

### 核心结构

```ts
type Either<L, R> = Left<L> | Right<R>;
```

`Left<L>` 字段：

| 字段 | 说明 |
|---|---|
| `_tag = 'Left'` | 标记失败态 |
| `left` | 错误值 |
| `success = false` | 兼容式成功标记 |
| `error` | 错误值别名 |

`Right<R>` 字段：

| 字段 | 说明 |
|---|---|
| `_tag = 'Right'` | 标记成功态 |
| `right` | 成功值 |
| `success = true` | 成功标记 |
| `data` | 成功值别名 |

### `eitherRight(value)` / `eitherLeft(error)`

构造成功值与失败值。

```ts
import { eitherLeft, eitherRight } from '@stratix/core/functional';

const ok = eitherRight({ id: 1 });
const bad = eitherLeft(new Error('failed'));
```

### `isRight(result)` / `isLeft(result)`

做类型收窄和分支判断。

```ts
import { isRight } from '@stratix/core/functional';

if (isRight(result)) {
  console.log(result.right);
}
```

### `eitherMap(fn)` / `eitherMapLeft(fn)`

只处理成功值或只处理失败值。

```ts
import { eitherMap } from '@stratix/core/functional';

const addName = eitherMap((user: { id: string }) => ({
  ...user,
  name: 'Alice'
}));
```

### `eitherChain(fn)` / `eitherFlatMap(fn)`

把多个可能失败的步骤串起来。

```ts
import {
  eitherChain,
  eitherRight
} from '@stratix/core/functional';

const loadProfile = eitherChain((user: { id: string }) =>
  eitherRight({ ...user, profile: { city: 'Shanghai' } })
);
```

### `eitherFold(onLeft, onRight)`

把 `Either` 收口成一个普通值。

```ts
import { eitherFold } from '@stratix/core/functional';

const message = eitherFold(
  (error: Error) => `失败: ${error.message}`,
  (data: { id: string }) => `成功: ${data.id}`
)(result);
```

### `eitherGetOrElse(defaultValue)` / `eitherGetOrElseW(onLeft)`

给失败情况设置默认值或动态兜底值。

### `tryCatch(fn)` / `tryCatchAsync(fn)`

把“会抛异常”的代码转换成 `Either` 风格。

```ts
import { tryCatch } from '@stratix/core/functional';

const parsed = tryCatch(
  () => JSON.parse(raw),
  (error) => new Error(`JSON 解析失败: ${String(error)}`)
);
```

<a id="maybe"></a>
## `Maybe`

`Maybe<T>` 用于表达“这个值可能有，也可能没有”，但它不是错误模型。  
如果你是在处理“查不到数据”“可选字段”“可能为空的中间步骤”，优先考虑 `Maybe`。

### `maybeSome(value)` / `maybeNone`

构造有值和无值。

```ts
import { maybeNone, maybeSome } from '@stratix/core/functional';

const a = maybeSome('alice');
const b = maybeNone;
```

### `fromNullable(value)`

把 `null` / `undefined` 统一转成 `Maybe`。

```ts
import { fromNullable } from '@stratix/core/functional';

const maybeEmail = fromNullable(user.email);
```

### `isSome(maybe)` / `isNone(maybe)`

判断是否存在值。

### `maybeMap(fn)` / `maybeChain(fn)` / `maybeFlatMap(fn)`

对可能存在的值做转换和串联。

```ts
import {
  fromNullable,
  maybeMap
} from '@stratix/core/functional';

const upperEmail = maybeMap((email: string) => email.toUpperCase())(
  fromNullable(user.email)
);
```

### `maybeFold(onNone, onSome)`

把 `Maybe` 收口成普通值。

### `maybeGetOrElse(defaultValue)`

没有值时给默认值。

<a id="either-vs-maybe"></a>
## 什么时候该用 `Either`，什么时候该用 `Maybe`

简单判断：

- “这一步失败了，需要带错误原因”：用 `Either`
- “这一步只是可能没有值，不算错误”：用 `Maybe`

典型例子：

- 数据库查询失败、权限不足、参数不合法：`Either`
- 用户昵称可能没填、可选筛选条件可能不存在：`Maybe`

<a id="other-families"></a>
## 其他常用族群

### curry 族

适合你想把多参数函数拆成可部分应用的函数时使用。

常见 API：

- `curry`
- `curryN`
- `partial`
- `partialRight`
- `flip`

### optics 族

适合处理深层嵌套不可变对象。

常见 API：

- `lensProp`
- `lensPath`
- `view`
- `set`
- `modify`

### memo 与 performance 族

适合做函数级缓存和性能包装。

关键 API：

#### `memo(fn)` / `memoAsync(fn)`

给纯函数或异步函数做缓存。

#### `SmartCache`

一个轻量级内存缓存类。

```ts
import { SmartCache } from '@stratix/core/functional';

const cache = new SmartCache<string, string>(100, 60_000);
cache.set('user:1', 'Alice');
```

构造参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `maxSize` | `number` | 最大缓存项数，默认 `100` |
| `ttl` | `number` | 过期时间，默认 `300000` |

#### `withTimeout(timeoutMs)` / `funcWithRetry(retries, delay?)`

给普通异步函数做超时和重试包装。

### streams 族

适合做流式数据处理、连续序列、窗口处理和异步数据流。

高频 API：

- `Stream`
- `AsyncStream`
- `fromArray`
- `range`
- `merge`
- `window`

<a id="complete-exports"></a>
## 完整导出清单

### 核心组合

- `compose`
- `composeAsync`
- `pipe`
- `pipeAsync`

### curry 族

- `add`
- `autoCurry`
- `branchCompose`
- `combinators`
- `composeIf`
- `composeWithFallback`
- `curry`
- `curry2`
- `curry3`
- `curry4`
- `curryAsync`
- `curryBranch`
- `CurryCache`
- `curryCompose`
- `curryFilter`
- `curryIf`
- `curryMap`
- `curryN`
- `curryPipe`
- `CurryStats`
- `curryTyped`
- `debugCompose`
- `debugCurry`
- `flip`
- `getPath`
- `higherOrder`
- `includes`
- `memoizeCompose`
- `memoizedCurry`
- `multiply`
- `parallel`
- `partial`
- `partialAt`
- `partialIf`
- `partialLazy`
- `partialMemo`
- `partialRight`
- `perfCurry`
- `pipeCurried`
- `placeholder`
- `pointFree`
- `race`
- `reduce`
- `safeCurry`
- `setPath`
- `typedCurry`

### optics 族

- `commonLenses`
- `composeLens`
- `immutable`
- `iso`
- `lensBuilder`
- `lensIndex`
- `lensPath`
- `lensProp`
- `modify`
- `prismArray`
- `prismOptional`
- `set`
- `traversalArray`
- `traversalFilter`
- `traversalValues`
- `update`
- `view`

### memo 族

- `memo`
- `memoAsync`
- `memoWeak`

### Either 族

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

### Maybe 族

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

### performance 族

- `batch`
- `concurrencyLimit`
- `debounce`
- `funcWithRetry`
- `funcWithTimeout`
- `SmartCache`
- `throttle`
- `withLogging`
- `withPerformanceMonitoring`
- `withSmartCache`

### brands 族

- `Base64String`
- `combineBrands`
- `convertBrand`
- `createBrand`
- `createIdGenerator`
- `EmailAddress`
- `generateUUID`
- `IpAddress`
- `JsonString`
- `mapBrand`
- `NonNegativeNumber`
- `now`
- `Percentage`
- `Port`
- `PositiveInteger`
- `Timestamp`
- `Url`
- `UserId`
- `UUID`
- `validateBrands`

### streams 族

- `AsyncStream`
- `asyncStreamPipe`
- `chunk`
- `cycle`
- `delay`
- `distinct`
- `fibonacci`
- `fromArray`
- `fromAsyncGenerator`
- `fromGenerator`
- `fromPromises`
- `groupBy`
- `interleave`
- `merge`
- `primes`
- `range`
- `repeat`
- `sort`
- `Stream`
- `streamPipe`
- `window`
