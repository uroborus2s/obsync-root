# 快速开始

这一页解决两个最基本的问题：

1. Stratix 里的“生态插件”到底是什么？
2. 我该从哪个模板开始做第一个插件？

## 什么是 Stratix 插件

在 Stratix 里，插件本质上是一个独立的 Node.js 包，它通常具备下面四个特征：

- 以 `@stratix/core` 为运行时基础
- 通过 `withRegisterAutoDI` 包装成可注册的插件入口
- 通过 `src/adapters`、`src/services`、`src/controllers`、`src/executors` 这些目录暴露能力
- 被应用的 `src/stratix.config.ts` 注册到 `plugins` 数组中使用

你可以把它理解成“可复用的基础设施或业务能力包”。数据库、Redis、队列、任务调度这些能力，都是通过生态插件接进应用的。

## 先选对模板

Stratix CLI 当前支持 4 类插件模板：

| 模板 | 命令中的 `type` | 适合场景 | 默认预设 |
|---|---|---|---|
| Adapter Plugin | `adapter` | 只想暴露一个客户端或适配器能力 | 无 |
| Data Plugin | `data` | 既有适配器，又有 repository / service | `database`, `testing` |
| Integration Plugin | `integration` | 对接第三方服务、SDK、HTTP API | `redis`, `testing` |
| Executor Plugin | `executor` | 想提供 executor / 调度扩展点 | `tasks`, `testing` |

如果你完全是新手，建议从 `integration` 模板开始。它的结构最平衡，既能练适配器，也能练 service，还自带 `testing` 预设，适合做第一个完整插件。

## 初始化第一个插件项目

如果你已经全局安装了 CLI，可以直接运行：

```bash
stratix init plugin integration @acme/ping-plugin
```

如果你是在本仓库里验证本地 CLI，可以运行：

```bash
node packages/cli/dist/bin/stratix.js init plugin integration @acme/ping-plugin
```

如果你想让依赖先不自动安装，可以加 `--no-install`：

```bash
stratix init plugin integration @acme/ping-plugin --pm pnpm --no-install
```

## 初始化后你会得到什么

一个最小插件项目通常会包含这些目录：

- `src/index.ts`
- `src/config/plugin-config.ts`
- `src/adapters/`
- `src/services/`
- `src/repositories/`
- `src/controllers/`
- `src/executors/`
- `src/types/`

其中最重要的是：

- `src/index.ts`：插件入口，决定如何被 Stratix 注册
- `src/config/plugin-config.ts`：插件配置类型和默认值
- `src/adapters/`：对外部系统或内部资源的访问层
- `src/services/`：插件的业务逻辑层

## 初始化后立刻该做什么

建议固定按这个顺序推进：

1. 先看 [项目结构](./project-structure.md)
2. 再做 [第一个生态插件实战](./build-your-first-plugin.md)
3. 最后用 [开发工作流](./development-workflow.md) 固定日常节奏

## 一句话判断你是否选对了插件方案

如果你只是给单个应用写一次性业务代码，不一定要做插件。  
如果你要把一类能力复用到多个应用、多个模块，或者希望它成为公共生态的一部分，那就应该做成插件。
