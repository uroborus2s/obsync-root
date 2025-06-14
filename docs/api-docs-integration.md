# API文档集成方案

本文档描述了如何将API Extractor生成的API文档集成到Docusaurus站点的方案和操作流程。

## 概述

在monorepo项目中，我们使用API Extractor为各个子包生成API文档，然后通过自定义脚本将这些文档集成到Docusaurus站点中，以提供统一的API文档浏览体验。

## 前提条件

1. 已经使用API Extractor在子项目中生成中间文档和.md文档
2. 注释的规范文档已经完成，位于：docs/tsdoc-guide.md
3. Docusaurus站点已经创建，位于 ./apps/api-website

## 集成架构

```
monorepo根目录
├── packages/
│   ├── utils/（已有API文档生成）
│   │   ├── api/
│   │   │   └── utils.api.md（API Extractor生成的文档）
│   ├── collector/（其他包）
│   ├── ...其他包
├── apps/
│   ├── api-website/（Docusaurus站点）
│   │   ├── docs/
│   │   │   ├── api/（API文档目录）
│   │   │   │   ├── utils/（utils包的文档）
│   │   │   │   ├── collector/（未来其他包的文档）
│   │   │   │   ├── ...
│   │   ├── sidebars.api.ts（API文档侧边栏配置）
│   │   ├── sidebars.ts（主侧边栏配置）
│   │   ├── docusaurus.config.ts（Docusaurus配置）
├── scripts/
│   ├── sync-api-docs.ts（文档同步脚本）
│   ├── custom-docusaurus-renderer.ts（文档转换器）
```

## 实现方案

### 1. 文档转换

为了使API Extractor生成的文档适配Docusaurus，我们实现了自定义转换器（`scripts/custom-docusaurus-renderer.ts`），主要处理以下工作：

- 添加Docusaurus前言（frontmatter）
- 修复代码块格式
- 调整标题级别
- 替换相对链接
- 转义特殊字符
- 为每个包创建索引页

### 2. 文档同步

文档同步脚本（`scripts/sync-api-docs.ts`）负责：

- 查找并复制每个包的API文档
- 使用自定义转换器转换文档格式
- 生成API侧边栏配置
- 更新主侧边栏配置
- 更新Docusaurus导航配置

### 3. 集成到构建流程

我们在package.json中添加了以下命令：

- `pnpm docs:generate`：生成API文档
- `pnpm docs:sync`：同步API文档到Docusaurus
- `pnpm docs:dev`：运行Docusaurus开发服务器
- `pnpm docs:full`：一键完成文档生成、同步和启动开发服务器
- `pnpm docs:build`：构建Docusaurus站点

## 使用方法

### 第一次设置

1. 确保所有需要文档的包都已经配置了API Extractor
2. 运行 `pnpm docs:generate` 生成API文档
3. 运行 `pnpm docs:sync` 同步文档到Docusaurus
4. 运行 `pnpm docs:dev` 启动Docusaurus开发服务器
5. 访问 http://localhost:3000 查看效果

### 日常工作流程

开发时，你可以使用以下命令：

- 对API代码注释进行修改后，运行 `pnpm docs:full` 一键完成所有操作
- 部署前，运行 `pnpm docs:build` 构建优化后的静态站点

## 添加新包的文档

要添加新包的API文档，请按照以下步骤操作：

1. 确保新包已配置API Extractor并生成了文档
2. 编辑 `scripts/sync-api-docs.ts` 文件，在 `PACKAGES_TO_SYNC` 数组中添加新包的名称
3. 运行 `pnpm docs:full` 重新生成并同步所有文档

## 注意事项

- API文档的质量依赖于源代码中的TSDoc注释质量
- 请严格遵循 `docs/tsdoc-guide.md` 中的注释规范
- 如果遇到文档格式问题，可能需要调整 `custom-docusaurus-renderer.ts` 中的转换逻辑
- 同步脚本会保留Docusaurus站点的其他文档内容

## 未来计划

1. 添加更多包的API文档
2. 改进文档结构和导航体验
3. 添加搜索功能
4. 添加版本控制
5. 自动化持续集成过程

如有问题或改进建议，请联系项目维护人员。 