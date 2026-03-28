# 函数 API 版本索引

本目录维护 `@stratix/core` 的公共函数 API 文档。  
目标读者是直接使用灵枢枢机开发应用、脚手架或生态插件的开发者。

<a id="page-summary"></a>
## 页面摘要

- 这是一张版本入口页，用来选择函数 API 文档版本，而不是承载某个版本的全部函数细节。
- 目前从 `v1.1.0` 开始维护，后续新增版本时会保留旧版本入口，不做覆盖式替换。
- 真正编码时，先进入对应版本，再按导入路径跳到 `core`、`service`、`functional` 或更细分页。

<a id="page-nav"></a>
## 页内导航

- [版本选择](#version-selection)
- [阅读方式](#reading-guide)
- [维护规则](#maintenance-rules)

<a id="version-selection"></a>
## 版本选择

- [v1.1.0](./v1.1.0/index.md)：当前第一版正式函数 API 参考。已拆分为版本概览、`core`、`service`、`functional` 三组子文档。

<a id="reading-guide"></a>
## 阅读方式

- 先看 `v1.1.0` 顶部的“如何选择导入路径”和“高频 API 速查”，先建立整体认知。
- 真正编码时，按导入路径查对应章节，例如 `@stratix/core`、`@stratix/core/data`、`@stratix/core/async`。
- 如果你只想确认某个名字是否公开导出，直接跳到页面末尾的“完整导出清单”。

<a id="maintenance-rules"></a>
## 维护规则

- 每个版本一份独立页面，不在同一页混写多个版本的行为差异。
- 文档范围以 `packages/core/package.json` 的 `exports` 与对应源码入口为准。
- 只有真正可 import 的公共 API 才能写进来，不能把内部实现当作公开接口。
- 升级到新版本时，新增 `vX.Y.Z.md`，并在这里追加版本入口，不覆盖旧版本内容。
