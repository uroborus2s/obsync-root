# 函数 API 参考（v1.1.0）

版本切换：[函数 API 版本索引](../index.md) | 当前版本：`v1.1.0`  
主题切换：[Core 总览](./core.md) | [Service API](./service.md) | [Functional 总览](./functional.md)

本文档对应 `@stratix/core@1.1.0`。  
这一版开始，函数 API 不再维护成一张超长清单页，而是拆成一个版本概览和三个主题页：

- [Core 与运行时 API](./core.md)
- [Service API](./service.md)
- [Functional API](./functional.md)

进一步细拆的子页如下：

- Core 侧：
  - [运行时与插件 API](./core-runtime-plugin.md)
  - [Context 与 Data API](./core-context-data.md)
  - [Environment 与 Auth API](./core-environment-auth.md)
  - [Async API](./core-async.md)
  - [Logger 与 Utils API](./core-logger-utils.md)
- Functional 侧：
  - [Pipe 与 Compose API](./functional-pipe-compose.md)
- [Either 与 Maybe API](./functional-either-maybe.md)
- [Curry 与 Optics API](./functional-curry-optics.md)
- [Performance、Streams 与 Brands API](./functional-performance-streams-brands.md)

<a id="page-summary"></a>
## 页面摘要

- 这一页负责说明 `v1.1.0` 版本文档怎么拆、不同问题该进哪一页。
- 如果你是第一次接触灵枢枢机，按这里的阅读顺序走；如果你只是查函数，优先用导入路径速查。
- 每张细分页顶部都已经补了版本切换和页内导航，进入后可以直接定位章节。

<a id="page-nav"></a>
## 页内导航

- [为什么这样拆](#why-split)
- [阅读顺序](#reading-order)
- [导入路径速查](#import-paths)
- [文档边界](#document-scope)

<a id="why-split"></a>
## 为什么这样拆

`@stratix/core` 在 `1.1.0` 的公共导出面已经足够大，继续把全部内容塞在同一页里会带来三个问题：

1. 新手找不到入口。
2. 函数有名字，但没有足够的上下文说明。
3. 后续升级版本时很难逐步维护。

所以从 `v1.1.0` 开始，文档按开发者最常见的思考路径拆分：

- 先搞清楚“怎么启动、怎么注册、怎么读配置、怎么处理异步和日志”
- 再搞清楚“怎么写 service”
- 最后搞清楚“什么时候需要函数式工具，以及怎么用 Either / Maybe / pipe”

<a id="reading-order"></a>
## 阅读顺序

如果你是第一次接触灵枢枢机，建议按这个顺序看：

1. [Core 与运行时 API](./core.md)
2. [Service API](./service.md)
3. [Functional API](./functional.md)

如果你已经知道自己要查哪一组函数，直接进入对应细分页会更快。

如果你只是来查某个函数：

- 应用启动、控制器、AutoDI、环境变量、数据工具、异步工具、logger：看 [Core 与运行时 API](./core.md)
- `createServiceFunction`、装饰器、验证器：看 [Service API](./service.md)
- `Either`、`Maybe`、`pipe`、`compose`、curry、streams：看 [Functional API](./functional.md)

<a id="import-paths"></a>
## 导入路径速查

| 导入路径 | 建议查看的页面 |
|---|---|
| `@stratix/core` | [Core 与运行时 API](./core.md) 与 [Service API](./service.md) |
| `@stratix/core/async` | [Core 与运行时 API](./core.md) |
| `@stratix/core/auth` | [Core 与运行时 API](./core.md) |
| `@stratix/core/context` | [Core 与运行时 API](./core.md) |
| `@stratix/core/data` | [Core 与运行时 API](./core.md) |
| `@stratix/core/environment` | [Core 与运行时 API](./core.md) |
| `@stratix/core/functional` | [Functional API](./functional.md) |
| `@stratix/core/logger` | [Core 与运行时 API](./core.md) |
| `@stratix/core/utils` | [Core 与运行时 API](./core.md) |

<a id="document-scope"></a>
## 文档边界

- 只记录真正可 import 的公共 API。
- 以 `packages/core/package.json` 的 `exports` 和对应入口源码为准。
- 这一版重点是“高频 API 的详细使用说明 + 全量公开导出清单”。
- 如果后续你希望做到“每个函数一页”，将从这个版本目录继续往下细拆，而不是回退到单页模式。
