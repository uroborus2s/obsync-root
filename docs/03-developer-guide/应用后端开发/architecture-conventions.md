# 架构与约束

这一页不是给你背术语的，而是解释 Stratix 为什么强制你按某种方式组织代码。你把这里的规则看懂了，后面写业务时就不容易“代码能跑，但框架没有接住”。

## 先建立一个正确的心智模型

可以把一个 Stratix 应用理解成四层组合：

1. Fastify 负责 HTTP 服务
2. Awilix 负责依赖注入
3. Stratix Core 负责自动发现、控制器注册和启动流程
4. 生态插件负责数据库、缓存、任务等基础设施

对应用开发者来说，最重要的现实是：

- 你主要写的是 `controller`、`service`、`repository`
- 你主要配置的是 `src/stratix.config.ts`
- 你主要通过 CLI 创建和扩展项目

## 启动时到底发生了什么

当应用执行 `await Stratix.run()` 时，框架大致会做下面这些事：

1. 读取运行参数
2. 加载环境变量和敏感配置
3. 执行 `src/stratix.config.ts`
4. 创建根容器和 Fastify 实例
5. 按顺序加载配置里的插件
6. 扫描应用 `src` 下可发现的类
7. 注册控制器、服务、执行器
8. 启动 HTTP 服务或其他运行时

这就是为什么你不应该跳过 CLI、乱放目录，或者随便修改配置导出形式。很多“莫名其妙发现不了类”的问题，本质上都是启动链路没接上。

## 分层规则

- `controller` 负责协议层、请求响应和参数转发。
- `service` 负责业务编排和跨服务协作。
- `repository` 负责全部数据库访问。

如果你不知道一段代码该放哪里，就先问自己一个问题：

- 它是在处理 HTTP 请求格式吗？放 `controller`
- 它是在组织业务步骤吗？放 `service`
- 它是在读写数据库或持久化状态吗？放 `repository`

### 一个最简单的调用链是什么样

```text
HTTP 请求
  -> Controller 接收参数
  -> Service 组织业务
  -> Repository 读写数据
  -> Service 返回结果
  -> Controller 输出响应
```

## 自动发现

Stratix 会自动扫描应用代码并把合适的类接入容器，所以目录约定非常重要。

- 应用默认扫描 `src`。
- `src/controllers`、`src/services`、`src/repositories`、`src/executors` 中的 class 会被优先视为可发现对象。
- 不要把普通工具类随意放进这些扫描目录。

对新手来说，最容易踩坑的点是：

- 你在 `src/services` 放了一个“只是想复用一下的工具类”，框架却把它当作 service 注册了
- 你把真正的业务类放到了其他自定义目录，结果框架根本没扫描到

最保守的做法是：只有真正要被框架管理的 class，才放进这些扫描目录。

## 控制器与路由

- `@Controller()` 不接收前缀。
- 不要依赖 `applicationAutoDI.routing.prefix` 或插件 `AutoDIConfig.routing.prefix` 来定义业务路由前缀。

正确思路是：

- `@Controller()` 只标记“这是一个控制器”
- 每个方法上的 `@Get('/users')`、`@Post('/users')` 等装饰器直接写完整业务路径

也就是说，不要写成你在其他框架里常见的：

```ts
@Controller('/users')
```

在当前实现里，这种写法不是推荐主路径。

## 数据访问

- `@stratix/database@1.1.0` 以 repository-first 为主。
- 应用侧数据库访问首选 `BaseRepository`。
- 不要在 service 中直接访问数据库插件或手工拼接跨仓储一致性单元。

这条规则非常关键。你应该把数据库访问理解成“Repository 的职责”，而不是“谁会写 SQL 谁就去写”。

错误做法：

- Controller 直接查数据库
- Service 直接注入数据库插件
- 一个业务流程在多个 service 里分别更新多张表

推荐做法：

- 所有数据库读写都通过 repository
- 多表一致性逻辑优先收敛到 business repository
- service 只调用 repository 提供的业务语义方法

## 配置约束

新手还需要记住一个关键现实：

- `src/stratix.config.ts` 应默认导出函数
- 不要把主要配置建立在 `Stratix.run({ config })` 这种调用方式上

最稳妥的形式是：

```ts
import type { StratixConfig } from '@stratix/core';

export default function createConfig(
  sensitiveConfig: Record<string, string> = {}
): StratixConfig {
  return {
    server: {
      host: '0.0.0.0',
      port: Number(process.env.PORT || 3000)
    },
    plugins: [],
    applicationAutoDI: {
      enabled: true
    }
  };
}
```

## 插件开发约束

- 插件主入口优先使用“具名插件函数 + withRegisterAutoDI(...) 默认导出”。
- 适配器 token 前缀来自插件函数名，不来自 `PluginConfig.name`。
- 插件内部如果有持久化逻辑，也保持 `controller -> service -> repository` 分层。

如果你当前只是开发业务应用，这一段先知道即可，不用立刻掌握。

## 执行器

- 应用 `src` 下的 executor 依赖 `@stratix/tasks` 先完成注册。
- 长流程不要长时间持有数据库事务，应使用短事务 + checkpoint 的方式收口状态。

## 新手最应该死记住的 6 条规则

1. 先用 CLI 建项目、生成资源，不要先手写目录。
2. `src/index.ts` 负责启动，`src/stratix.config.ts` 负责配置。
3. `@Controller()` 不带前缀，路由直接写在方法装饰器上。
4. service 不直接碰数据库。
5. repository 是唯一默认允许承接数据库访问的应用层。
6. 不要把普通工具类随便塞进 `controllers/`、`services/`、`repositories/`、`executors/`。
