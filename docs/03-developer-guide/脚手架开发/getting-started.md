# 快速开始

这篇文档只回答一个问题：第一次接触 `web-admin` 模板时，怎么最快把它跑起来，并知道自己接下来该看什么。

## 1. 你会得到什么

`web-admin` 是 `@stratix/cli` 提供的后台管理前端脚手架。它不是一个“空白 React 项目”，而是一个已经带好后台常见骨架的起点，包括：

- 登录页
- 管理后台主布局
- 左侧导航
- 仪表盘、用户管理、角色权限、报表、审计、设置等示例页面
- 路由、查询、表格和基础 UI 组件

模板清单位于：

- `packages/cli/templates/apps/web-admin/manifest.json`

模板源码位于：

- `packages/cli/templates/apps/web-admin/files/`

## 2. 当前推荐的使用方式

当前这套文档默认你在本仓库里工作，并使用仓库内本地 CLI。

原因很简单：

- 本地模板源码是真实来源
- 仓库里已有可运行参考样例
- 当前 npm 发布面还没有稳定到可以把“远程安装 CLI”当成文档主路径

## 3. 前置条件

开始前请确认：

- Node.js 版本满足 `>=24`
- `pnpm` 版本满足 `>=10`
- 你已经在仓库根目录执行过依赖安装

## 4. 生成一个新应用

先构建 CLI：

```bash
pnpm --filter @stratix/cli build
```

然后在仓库里生成一个新样例：

```bash
mkdir -p examples
cd examples
node ../packages/cli/dist/bin/stratix.js init app web-admin my-admin --no-install
cd my-admin
```

如果你只是想先看一个已经生成好的结果，可以直接看：

- `examples/web-admin-preview`

## 5. 恢复依赖并验证样例

在生成出来的应用目录里执行：

```bash
pnpm install --ignore-workspace
pnpm build
pnpm test
pnpm preview --host 127.0.0.1 --port 4273
```

说明：

- `--ignore-workspace` 用于把生成出来的应用当成独立前端工程恢复依赖。
- 当前已验证 `examples/web-admin-preview` 可以通过 `install`、`build`、`test`、`preview`。

## 6. 开发时最常用的命令

日常改页面时，通常先跑：

```bash
pnpm dev
```

交付前至少再跑一次：

```bash
pnpm build
pnpm test
pnpm preview --host 127.0.0.1 --port 4273
```

## 7. 第一次打开应用时，应该看到什么

如果项目生成和运行正常，你应该能看到：

- 登录页
- 登录后的后台布局
- 左侧菜单
- 仪表盘
- 用户管理、角色权限、数据报表、审计日志、系统设置等示例入口

如果你还没准备改真实业务，先把这些入口点一遍。这样你会很快知道模板已经内置了哪些能力。

## 8. 小白最先要记住的三件事

- 生成出来的项目是独立应用，不要默认把它重新挂回 root workspace。
- `examples/web-admin-preview` 是模板预览样例，不是正式产品模块。
- `src/routeTree.gen.ts` 是生成文件，不要手改。

读完这里后，下一步建议看：

1. [项目结构](./project-structure.md)
2. [开发工作流](./development-workflow.md)
3. [从零做一个业务页](./build-your-first-app.md)
