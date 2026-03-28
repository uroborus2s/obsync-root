# 快速开始

## 适用版本

- `@stratix/cli@1.1.0`
- `@stratix/core@1.1.0`
- `@stratix/database@1.1.0`

## 先知道你要做什么

如果你是第一次接触 Stratix，可以把它理解成一套“已经帮你约定好分层和启动方式”的 Node.js 后端框架组合：

- `@stratix/core` 负责应用启动、自动发现、依赖注入和控制器路由
- `@stratix/cli` 负责建项目、生成骨架、补 preset、做健康检查
- `@stratix/database`、`@stratix/redis`、`@stratix/tasks` 等生态插件负责基础设施能力

你现在不需要先理解框架内部原理。第一阶段的目标只有三个：

1. 建出一个项目
2. 把项目跑起来
3. 看懂生成出来的目录和文件

## 第 1 步：确认 CLI 可用

后端应用开发优先使用 CLI，而不是手工创建目录和样板。至少先确认下面两个命令能执行：

```bash
stratix list templates
stratix list presets
```

如果你已经装好了 `@stratix/cli`，上面的命令会列出可用模板和预设。后续文档默认你可以直接使用 `stratix` 命令。

## 第 2 步：初始化一个 API 项目

创建一个最简单的后端 API 项目：

```bash
stratix init app api my-app
cd my-app
pnpm install
```

这一步结束后，你会得到一个可编译、可启动的最小骨架。默认已经包含：

- `src/index.ts`
- `src/stratix.config.ts`
- `src/config/stratix.generated.ts`
- `src/controllers/HealthController.ts`
- `src/services/HealthService.ts`

## 第 3 步：先做一次健康检查

不要急着写业务代码。先确认骨架本身没问题：

```bash
stratix doctor
pnpm build
pnpm dev
```

如果启动成功，默认应该能访问健康检查接口：

```bash
curl http://127.0.0.1:3000/health
```

预期你会看到一个 `success: true` 的 JSON 响应，其中包含应用名、状态和时间戳。

如果这一步失败，不要继续往下写业务代码，先去看 `common-pitfalls.md` 排查。

## 第 4 步：理解这三个关键文件

第一次上手时，只要先认识下面三个位置就够了：

- `src/index.ts`
  - 这是应用入口，默认只做一件事：`await Stratix.run()`
- `src/stratix.config.ts`
  - 这是你真正要维护的配置入口
  - 它必须默认导出一个函数，而不是直接导出一个对象
- `src/config/stratix.generated.ts`
  - 这是脚手架生成的默认配置拼装层
  - 你可以读它，但正常情况下优先在 `src/stratix.config.ts` 上做项目级调整

## 第 5 步：需要数据库时再加 preset

如果应用需要数据库能力，再补对应 preset：

```bash
stratix add preset database
```

执行后，脚手架会把数据库相关依赖和配置骨架补到项目里。你不需要手工抄依赖、写一堆初始化代码。

同理，如果后面需要缓存、队列、任务调度，也优先先加 preset，再写业务代码。

## 第 6 步：生成你的第一个业务骨架

如果要新增标准业务层，优先生成资源，而不是自己手写空目录：

```bash
stratix generate resource user
```

这个命令至少会帮你生成：

- `src/controllers/UserController.ts`
- `src/services/UserService.ts`
- `src/repositories/UserRepository.ts`
- `src/repositories/interfaces/IUserRepository.ts`

它的意义不是“少打几个字”，而是帮你从一开始就遵守 Stratix 的推荐分层。

下一篇 [`project-structure.md`](./project-structure.md) 会解释这些目录到底各管什么；再下一篇 [`first-feature.md`](./first-feature.md) 会带你把这个 `user` 资源真正改造成一个可用接口。

## 日常最小命令集

在你还不熟悉框架之前，把下面几条命令当作每天都要用的最小工具集：

- `stratix doctor`
- `pnpm build`
- `pnpm dev`
- `pnpm test`

如果有配置加密需求，再使用：

- `stratix config generate-key`
- `stratix config encrypt`
- `stratix config decrypt`
- `stratix config validate`

## 本页完成后的检查点

如果你已经做到下面这些事情，就说明你完成了“真正意义上的入门”：

- 能初始化一个 API 项目
- 能启动项目并访问 `/health`
- 知道 `src/index.ts` 和 `src/stratix.config.ts` 是最关键的两个入口
- 知道数据库等基础设施优先通过 preset 注入
- 知道新增业务功能优先用 `stratix generate resource <name>`
