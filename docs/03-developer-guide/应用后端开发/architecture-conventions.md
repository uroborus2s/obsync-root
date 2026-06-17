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

Stratix 会自动扫描应用代码，但只有带 Stratix 元数据的类会接入容器，所以目录约定和装饰器都必须清晰。

- 应用默认扫描 `src`。
- `src/controllers`、`src/services`、`src/repositories`、`src/executors` 是推荐组织目录。
- 只有 `@Controller()`、`@Service()`、`@Repository()`、`@Component()`、`@Executor()` 标记的 class 会被应用级 discovery 注册。
- 普通工具类可以放在扫描范围内，但不要添加 Stratix 组件装饰器。

对新手来说，最容易踩坑的点是：

- 你写了 service class，但忘记加 `@Service()`
- 你把真正的业务类放到了自定义目录，却没有把目录加入 `discovery.patterns` 或 `discovery.directories`

最保守的做法是：只有真正要被框架管理的 class，才添加 Stratix 组件装饰器。

## 控制器与路由

- `@Controller()` 不接收前缀。
- 应用级统一前缀写在 `discovery.routing.prefix`。
- 插件内部前缀由插件自己的 AutoDI 配置控制，不能替代应用级 discovery 配置。

正确思路是：

- `@Controller()` 只标记“这是一个控制器”
- 每个方法上的 `@Get('/users')`、`@Post('/users')` 等装饰器直接写完整业务路径

也就是说，不要写成你在其他框架里常见的：

```ts
@Controller(/* 不要在这里写路径前缀 */)
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

`src/stratix.config.ts` 适合正式应用入口；`Stratix.run({ config })` 适合测试、嵌入式运行和工具进程。两种方式都必须使用同一份 `StratixConfig` 契约。

配置文件形式：

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
    autoLoad: {},
    discovery: {
      enabled: true,
      patterns: ['**/*.ts'],
      routing: {
        enabled: true,
        prefix: '/api'
      }
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

- `src/executors/` 不再是新项目默认路径。
- `@stratix/tasks` 即将废弃，1.1.0 新项目不要继续新增 tasks 依赖。
- 长流程不要长时间持有数据库事务，应使用短事务 + checkpoint 的方式收口状态。

## 新手最应该死记住的 6 条规则

1. 先用 CLI 建项目、生成资源，不要先手写目录。
2. `src/index.ts` 负责启动，`src/stratix.config.ts` 负责配置。
3. `@Controller()` 不带前缀，路由直接写在方法装饰器上。
4. service 不直接碰数据库。
5. repository 是唯一默认允许承接数据库访问的应用层。
6. 不要把普通工具类随便塞进 `controllers/`、`services/`、`repositories/`、`executors/`。
