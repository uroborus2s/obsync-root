# Stratix 框架生态插件开发指南

本文档面向“要为 Stratix 生态新增一个插件”的开发者。它不是泛泛而谈的 Fastify 插件说明，而是基于 `packages/core/src/plugin/*` 当前实现，总结出一套真正能和现有生态包对齐的开发方式。若你当前是在消费 npm 包的项目里开发插件，请先看下面的 npm 场景定位说明。

## 1. 什么时候应该做成生态插件

下面这些场景更适合做成 Stratix 插件，而不是直接写在应用 `src/services` 里：

- 需要对多个项目复用的外部系统集成
- 需要统一提供若干根容器 token 给业务项目注入
- 需要在插件内部维护一组 services/repositories/controllers/executors
- 需要生命周期钩子、参数处理、配置校验或资源释放

如果一个能力只是单项目的局部业务逻辑，放在应用 service 往往更简单；如果它是“能力产品化”，就更适合作为生态插件。

### 在 npm 项目中如何定位插件实现

如果你现在不是在 Stratix monorepo 中，而是在一个普通项目里通过 npm 依赖这些包，那么默认应按下面的顺序找实现：

- `node_modules/@stratix/core/package.json`
- `node_modules/@stratix/core/dist/**/*.js`
- `node_modules/@stratix/core/dist/types/**/*.d.ts`
- `node_modules/@stratix/database/package.json`
- `node_modules/@stratix/database/dist/**/*.js`
- `node_modules/@stratix/database/dist/types/**/*.d.ts`

当前发布包主要提供 `dist`、`README.md`、`LICENSE`，不保证带 `src`。所以本文里出现的 `packages/core/src/plugin/*` 更适合作为“源码仓库中的权威位置”来理解。

## 2. 先理解插件的真实运行模型

当前 `withRegisterAutoDI` 的真实模型是“双层容器 + 即时注册”：

- 根容器
  - 由应用 bootstrap 创建
  - 承载跨插件共享 token，例如 `logger`、`databaseApi`、`redisClient`
- 插件内部容器
  - `withRegisterAutoDI` 内部通过 `container.createScope()` 创建
  - 承载插件内部 services/repositories/controllers/executors

在插件初始化时，核心顺序大致如下：

1. 处理与校验插件参数
2. 确保 Fastify 已挂接 Awilix 容器
3. 创建生命周期管理器
4. 创建插件内部 scope 容器
5. 自动发现并注册插件内部模块
6. 在 discovery 过程中即时注册 routes 与 executors
7. 自动发现 `adapters/` 并把 adapter 暴露到根容器
8. 执行原始 Fastify 插件函数
9. 在 `onClose` 时清理插件内部容器

这解释了为什么 Stratix 插件不是“先写个 Fastify plugin，再额外挂点 helper”，而是一个有明确容器边界和对外暴露策略的运行单元。

## 3. 推荐的目录结构

```text
src/
  index.ts
  config/
    plugin-config.ts
  adapters/
    client.adapter.ts
  controllers/
  services/
  repositories/
  executors/
```

职责建议如下：

- `config/`
  - 默认配置、参数校验、参数合并逻辑
- `services/`
  - 插件内部业务服务
- `repositories/`
  - 状态存取、缓存、数据库访问
- `controllers/`
  - 需要暴露 HTTP API 时使用
- `executors/`
  - 需要与 `@stratix/tasks` 集成时使用
- `adapters/`
  - 面向消费方的对外接口层，是根容器 token 的来源

## 4. 标准插件入口怎么写

一个最小插件通常长这样：

```ts
import type { FastifyPluginAsync } from '@stratix/core';
import { withRegisterAutoDI } from '@stratix/core';

export interface ExamplePluginOptions {
  endpoint: string;
  apiKey?: string;
}

const examplePlugin: FastifyPluginAsync<ExamplePluginOptions> = async () => {};

export default withRegisterAutoDI(examplePlugin, {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}',
      'executors/*.{ts,js}'
    ]
  },
  services: {
    enabled: true,
    patterns: ['adapters/*.{ts,js}']
  },
  parameterProcessor: (options) => ({
    timeout: 30000,
    ...options
  }),
  parameterValidator: (options) => {
    return Boolean(options && typeof options === 'object' && 'endpoint' in options);
  }
});
```

这里最重要的不是语法，而是两个约束：

- 插件函数名 `examplePlugin` 会进入 adapter token 命名规则。
- `withRegisterAutoDI` 的配置应该只放“当前实现真的会消费”的内容，避免往里塞一堆历史设计字段。

## 5. 适配器才是插件的公开 API

在 Stratix 生态里，一个插件最重要的公开接口通常不是内部 service，而是 `adapters/` 暴露出来的根容器 token。

### 5.1 支持的适配器写法

当前源码支持：

- 默认导出 class
- 默认导出对象 `{ adapterName, factory }`
- 默认导出函数工厂
- 命名导出的 class/object/function

最常见、最清晰的方式仍然是默认导出 class：

```ts
import type { AwilixContainer } from '@stratix/core';

export interface ExampleClient {
  ping(): Promise<boolean>;
}

export default class ClientAdapter implements ExampleClient {
  static adapterName = 'client';

  constructor(private readonly container: AwilixContainer) {}

  async ping(): Promise<boolean> {
    const config = this.container.resolve('config');
    return Boolean(config);
  }
}
```

### 5.2 Token 命名规则

对外 token 的规则是：

`插件函数名 + PascalCase(adapterName)`

例如：

- 数据库插件函数名是 `database`，adapterName 是 `api`，所以消费方拿到的是 `databaseApi`
- Redis 插件函数名是 `redis`，默认适配器类名会推导成 `client`，所以 token 是 `redisClient`
- Queue 插件函数名是 `queue`，token 是 `queueClient`
- 插件函数名如果是 `wasV7Api`，adapterName 为 `calendar`，token 就会是 `wasV7ApiCalendar`

因此下面这个误区必须避免：

- `PluginConfig.name` 不是 adapter token 的来源
- 改插件函数名会直接破坏消费方的注入 token

从 API 兼容性的角度看，插件函数名应该像公开类名一样稳定。

## 6. 插件内部模块应该怎么组织

### 6.1 Service

插件内部 service 就是普通 class，依赖通过构造函数注入。它们默认存在于插件内部容器，不会天然暴露给外部项目。

这是一种很好的边界：

- 对内：service 可自由协作
- 对外：只通过 adapter 暴露稳定能力
- 如果插件内部还包含持久化逻辑，service 只调用 repository，不直接调用 database plugin

### 6.2 Repository

如果插件内部需要数据库访问、表管理或复杂查询，建议显式建立 repository 层，并把它作为唯一允许直接接触 `@stratix/database` 的层。

建议遵循：

- repository 负责查询、持久化、事务细节和 schema 绑定
- service 负责业务编排，不直接注入 `databaseApi`
- controller 只依赖 service，不穿透到 repository 或 database plugin

如果适合继承 `BaseRepository`，优先在 repository 中统一连接名、表名、schema 和查询辅助方法；如果不适合继承，也应把 `databaseApi` 注入限制在 repository 内部。

### 6.3 Controller

控制器写法与应用类似，仍然建议：

```ts
import { Controller, Get } from '@stratix/core';
import HealthService from '../services/HealthService.js';

@Controller()
export default class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/internal/example/health')
  async check() {
    return this.healthService.check();
  }
}
```

需要特别注意的是：

- 当前插件 discovery 即时注册路由时，直接使用方法装饰器里的路径。
- `AutoDIConfig.routing.prefix` 在当前即时注册链路里并不是可靠前缀来源。
- 真正稳定的路由前缀方式，是让消费方在应用里通过 `plugins[].prefix` 或 `fastify.register(plugin, { prefix })` 传入 Fastify 前缀。

### 6.4 Executor

如果插件内部定义了 `@Executor`，它会在 discovery 阶段即时尝试注册。这意味着：

- 根容器必须已经存在 `registerTaskExecutor`
- 也就是 `@stratix/tasks` 需要先于该插件完成注册

这是生态插件开发里一个非常实际的装配顺序要求。

## 7. 参数处理、默认值和校验

当前成熟的插件一般都应该显式提供下面两类能力：

- `parameterProcessor`
  - 合并默认值
  - 兼容旧字段
  - 统一规格化参数结构
- `parameterValidator`
  - 尽早失败
  - 在插件启动时阻断无效配置

`@stratix/database` 的设计就是一个很好的参考：它把默认配置、参数清洗和参数校验都前置在插件初始化阶段，而不是等 service 运行后再报错。

推荐策略：

1. 在 `config/plugin-config.ts` 里维护默认配置和强约束。
2. 在 `parameterProcessor` 里做深度合并。
3. 在 `parameterValidator` 里只保留布尔式“能不能启动”的判定逻辑。
4. 真正详细的错误说明和复杂校验，放到专门的 validator 或 config helper 中。

## 8. 生命周期与资源释放

当前插件生命周期采用约定优于配置的方式。框架会识别实例方法名，例如：

- `onReady`
- `onListen`
- `onClose`
- `preClose`
- `onRoute`
- `onRegister`

如果插件内部对象需要管理连接、worker、定时器或缓存资源，优先把关闭逻辑放进这些约定方法中，而不是依赖消费方手动调用。

比如一个 queue adapter 或外部 SDK adapter，很适合在 `onClose()` 里统一释放资源。

## 9. 路由、作用域和容器边界的设计建议

一个易维护的 Stratix 插件通常遵守下面的边界：

- 插件内部 controller 只依赖插件内部 service 或根容器公共 token
- 插件内部 service 不直接暴露给消费方
- 对外只暴露 adapter token
- 需要多项目复用的集成能力放 adapter
- 需要 HTTP 暴露的能力放 controller

这样设计有几个好处：

- 消费方只依赖稳定 token，不依赖内部实现类名
- 插件内部可以自由重构 service/repository
- 插件对外 API 面清晰，升级成本更可控

## 10. 如何测试一个生态插件

最少应覆盖这几类测试：

### 10.1 参数校验测试

- 缺失必填配置时能否在启动阶段直接失败
- 默认值是否按预期被合并

### 10.2 Adapter 暴露测试

- 目标 token 是否真的注册到了根容器
- token 名称是否符合预期
- adapter 能否正确解析内部依赖和配置

### 10.3 路由注册测试

- controller 路由是否真的出现在 Fastify 实例上
- 使用 `prefix` 注册插件时，路由前缀是否正确生效

### 10.4 生命周期测试

- 关闭应用时，内部连接、worker、缓存是否被释放

如果你的插件还依赖 Redis、数据库或任务执行器，那么这几项集成装配也值得单独测一遍。

## 11. 发布和兼容性清单

在发布一个 Stratix 生态插件前，建议至少确认以下事项：

- 插件函数名是否稳定
- adapter token 是否已经文档化
- `parameterProcessor` 和 `parameterValidator` 是否覆盖关键配置
- 是否避免依赖 `AutoDIConfig.routing.prefix` 这类当前不稳定的旧字段
- 如果带 executors，是否明确写明需要 `@stratix/tasks` 的注册顺序
- 是否为 `onClose` 等资源释放路径补了测试

## 12. 一个成熟插件应该长成什么样

把现有生态包抽象一下，一个成熟的 Stratix 插件通常具备这些特征：

- 有稳定的插件函数名
- 有明确的默认配置与校验
- 内部对象通过 auto DI 自动装配
- 对外通过 adapter token 暴露能力
- 必要时提供 controller 和 executor
- 有生命周期钩子来处理初始化与清理

如果你按这套方式做插件，它会天然和 `@stratix/database`、`@stratix/redis`、`@stratix/queue`、`@stratix/ossp`、`@stratix/was-v7` 这些已有生态包处在同一个设计语言里，也更容易被业务项目长期复用。
