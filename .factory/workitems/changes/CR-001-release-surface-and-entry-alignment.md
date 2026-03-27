# CR-001 发布面与入口文档口径对齐

- 类型：CR
- 状态：OPEN
- 优先级：P1
- 阶段：ANALYSIS
- 预计工作量：1.5 人/天

## 描述

需要统一以下事实口径：

- 本地 `package.json` 版本
- git tags
- npm registry 已发布版本
- 顶层 README 与仓级发布文档

## 触发原因

- 当前大多数公共包在 npm registry 上不存在对应记录
- `@stratix/core` 的 registry 版本与本地版本显著不一致
- README 长期漂移

## 影响分析

- 对外宣称的版本和真实可安装版本可能不一致
- 维护者难以判断哪些包处于“开发中”还是“已发布”

## 完成判定

- 发布策略文件明确哪些包已发布、哪些仅本地存在
- tag 与版本规则被统一
- README / release docs 与真实发布面一致
