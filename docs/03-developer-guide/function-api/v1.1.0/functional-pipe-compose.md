# Pipe 与 Compose API（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | [v1.1.0 概览](./index.md)  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

这一页覆盖最基础的函数组合 API。

<a id="page-summary"></a>
## 页面摘要

- 这一页适合第一次接触函数式工具的开发者，是 `functional` 里最先应该掌握的一组 API。
- `pipe` 解决“按执行顺序写”，`compose` 解决“先声明组合函数再复用”，异步场景再切到 `pipeAsync` / `composeAsync`。
- 如果你在 Service 或 Controller 里只是做简单的数据清洗，这一页通常已经够用。

<a id="page-nav"></a>
## 页内导航

- [pipe(value, ...fns)](#pipe-api)
- [compose(...fns)](#compose-api)
- [pipeAsync(value, ...fns)](#pipe-async-api)
- [composeAsync(...fns)](#compose-async-api)
- [什么时候用 pipe，什么时候用 compose](#selection-guide)
- [导出清单](#exports)

<a id="pipe-api"></a>
## `pipe(value, ...fns)`

从左到右把值传给多个函数。

| 项 | 说明 |
|---|---|
| 参数 | `value` 初始值，`...fns` 为转换函数列表 |
| 返回值 | 最后一个函数的返回值 |
| 适合 | 数据清洗、逐步转换、让执行顺序更直观 |

```ts
import { pipe } from '@stratix/core/functional';

const result = pipe(
  ' alice ',
  (value) => value.trim(),
  (value) => value.toUpperCase(),
  (value) => `USER:${value}`
);
```

<a id="compose-api"></a>
## `compose(...fns)`

从右到左组合函数，返回一个新函数。

| 项 | 说明 |
|---|---|
| 参数 | 多个函数 |
| 返回值 | `(value) => result` |
| 适合 | 先声明转换链，再在多个地方复用 |

```ts
import { compose } from '@stratix/core/functional';

const normalize = compose(
  (value: string) => `USER:${value}`,
  (value: string) => value.toUpperCase(),
  (value: string) => value.trim()
);
```

<a id="pipe-async-api"></a>
## `pipeAsync(value, ...fns)`

异步版本的 `pipe`。

| 项 | 说明 |
|---|---|
| 参数 | 初始值或 Promise、异步步骤函数列表 |
| 返回值 | `Promise<结果>` |
| 适合 | 多步异步处理链 |

<a id="compose-async-api"></a>
## `composeAsync(...fns)`

异步版本的 `compose`。

| 项 | 说明 |
|---|---|
| 参数 | 多个异步函数 |
| 返回值 | `(value) => Promise<结果>` |
| 适合 | 需要从右到左声明异步处理链 |

<a id="selection-guide"></a>
## 什么时候用 `pipe`，什么时候用 `compose`

- 想让阅读顺序和执行顺序一致：用 `pipe`
- 想先定义“组合出来的新函数”：用 `compose`
- 步骤里有异步逻辑：用 `pipeAsync` / `composeAsync`

<a id="exports"></a>
## 导出清单

- `compose`
- `composeAsync`
- `pipe`
- `pipeAsync`
