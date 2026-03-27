# 基于 Stratix 框架的 Node.js 项目开发指南

本文档以 `packages/core/src` 与当前生态插件源码为准，重点描述“现在这套代码实际怎么工作”。如果你在 README、旧测试或历史示例里看到与本文不一致的 API，用当前源码为准。若你当前在一个消费 npm 包的新项目里，请特别看下面的“npm 场景代码定位”说明。

## 1. 先建立正确的心智模型

Stratix 不是单一的“Web 框架封装”，而是一套由几个核心部件组合出来的 Node.js 后端运行时：

- Fastify 负责 HTTP 服务与插件注册。
- Awilix 负责依赖注入和容器生命周期。
- 装饰器元数据负责控制器和执行器发现。
- 应用级 discovery 负责从应用 `src` 目录自动发现业务类。
- 插件级 `withRegisterAutoDI` 负责生态插件内部对象的自动装配，以及对外 adapter 暴露。

当前应用的真实启动链路是：

1. `Stratix.run(options)` 创建 `Stratix` 实例。
2. `ApplicationBootstrap.bootstrap()` 处理运行选项。
3. 加载环境变量与敏感配置。
4. 从 `stratix.config.*` 加载并校验配置。
5. 创建根 Awilix 容器并注册 `logger`。
6. 创建 Fastify 实例，挂载 `diContainer`、请求级 `diScope` 和全局错误处理。
7. 按配置加载生态插件。
8. 对应用代码执行新的 discovery pipeline。
9. 启动服务并注册优雅停机。

这个顺序非常重要，因为它解释了为什么很多功能“看起来应该能用”，但实际上只有在特定阶段才会被发现和注册。

### 在 npm 新项目里如何定位 Stratix 代码

如果你正在开发的是一个普通业务项目，而不是 Stratix 自身的 monorepo，那么本地通常不会有 `packages/core/src` 这种目录。当前发布包主要带的是编译产物和类型声明，因此建议按下面的顺序定位：

- 先看包入口：
  - `node_modules/@stratix/core/package.json`
  - `node_modules/@stratix/database/package.json`
- 再看运行时代码：
  - `node_modules/@stratix/core/dist/**/*.js`
  - `node_modules/@stratix/database/dist/**/*.js`
- 再看类型声明：
  - `node_modules/@stratix/core/dist/types/**/*.d.ts`
  - `node_modules/@stratix/database/dist/types/**/*.d.ts`

以当前包结构为例：

- `@stratix/core` 暴露的是 `dist/index.js`、`dist/types/index.d.ts`；CLI 入口由独立包 `@stratix/cli` 提供
- `@stratix/database` 暴露的是 `dist/index.js`、`dist/types/index.d.ts`

这意味着：

- 想确认“怎么使用”，优先看 `README.md` 和 `d.ts`
- 想确认“运行时真实行为”，优先看 `dist/**/*.js`
- 想确认“源码真实组织方式”，需要回到 Stratix 源码仓库的 `packages/*/src`

## 2. 一个 Stratix 应用最小应该长什么样

推荐目录结构：

```text
src/
  index.ts
  stratix.config.ts
  controllers/
  services/
  repositories/
  executors/
  config/
  types/
  utils/
```

最小入口通常只需要：

```ts
import { Stratix } from '@stratix/core';

await Stratix.run();
```

当前最稳妥的配置入口是 `src/stratix.config.ts`，并且必须默认导出一个函数：

```ts
import type { StratixConfig } from '@stratix/core';
import database from '@stratix/database';
import redis from '@stratix/redis';
import tasks from '@stratix/tasks';

export default (sensitiveConfig: Record<string, string>): StratixConfig => ({
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 3000)
  },
  plugins: [
    {
      name: 'database',
      plugin: database,
      options: {
        connections: {
          default: {
            type: 'postgresql',
            host: sensitiveConfig.DB_HOST,
            port: Number(sensitiveConfig.DB_PORT),
            database: sensitiveConfig.DB_NAME,
            username: sensitiveConfig.DB_USER,
            password: sensitiveConfig.DB_PASSWORD
          }
        }
      }
    },
    {
      name: 'redis',
      plugin: redis,
      options: {
        single: {
          host: sensitiveConfig.REDIS_HOST,
          port: Number(sensitiveConfig.REDIS_PORT)
        }
      }
    },
    {
      name: 'tasks',
      plugin: tasks,
      options: {}
    }
  ],
  applicationAutoDI: {
    enabled: true
  }
});
```

这里有两个必须注意的现实约束：

- 尽量不要把项目主配置建立在 `Stratix.run({ config })` 上。虽然类型里有 `config` 字段，但当前 bootstrap 实际走的是配置文件加载链路。
- `stratix.config.ts` 不是导出对象，而是导出函数。函数返回值才会进入 Zod schema 校验。

## 3. 环境变量和敏感配置是怎么加载的

Stratix 目前支持两套配置来源：

- 敏感配置字符串：如果存在 `STRATIX_SENSITIVE_CONFIG`，框架会优先解密它。
- dotenv 文件：如果没有敏感配置字符串，则会加载 `.env`、`.env.{env}`、`.env.{env}.local`、`.env.local`。

两者不是并行合并关系，而是二选一分支：

- 存在 `STRATIX_SENSITIVE_CONFIG` 时，优先走敏感配置解密分支。
- 不存在时，才会走 dotenv 文件加载分支。
- dotenv 分支内部再按后加载覆盖先加载的优先级处理。

生产环境会自动排除 `.local` 文件。当前实现默认 `strict = true`，也就是默认要求基础 `.env` 文件存在。

因此一个稳定的项目通常会这么做：

- 用 `.env` 与 `.env.production` 承载非敏感配置。
- 用 `STRATIX_SENSITIVE_CONFIG` 承载数据库密码、外部系统密钥等敏感信息。
- 在 `stratix.config.ts` 中统一把敏感配置映射到插件选项，而不是把这些逻辑散落到各个 service 里。

如果你需要管理加密配置，可以使用 `stratix config generate-key`、`encrypt`、`decrypt`、`validate` 等 CLI 命令；这部分是源码里真实存在且可用的能力。

## 4. 应用级自动发现到底会发现什么

当前真正生效的是新的 discovery pipeline，而不是旧版 `application-auto-di.ts` 的设想。

默认行为如下：

- 如果没有显式配置 `applicationAutoDI.directories`，会默认扫描应用入口目录下的 `src`。
- 扫描器会匹配所有 `**/*.{ts,js,mjs,cjs}` 文件，排除 `*.d.ts`、`*.test.ts`、`*.spec.ts`。
- 分析器会把模块分类为：
  - `@Controller` class -> controller
  - `@Executor` class -> executor
  - 其他任意 class -> service

这带来两个很实际的开发约束：

1. 你的扫描目录应该尽量只放“希望被容器处理”的 class。
2. 如果某个文件只是工具类、schema class、临时迁移辅助类，不应该放进默认扫描路径，或者它就会被误注册成 service。

`applicationAutoDI` 的 schema 里虽然还有 `patterns`、`routing`、`lifecycle`、`options` 等字段，但在当前生效的 bootstrap 路径里，真正被使用的是 `directories` 和 `enabled`。开发时不要高估这些旧字段的实际效力。

## 5. 控制器、服务、仓储、执行器应该怎么写

默认项目分层应保持为：

`controller -> service -> repository`

也就是说：

- Controller 只处理协议层和请求响应
- Service 只处理业务编排
- Repository 只处理数据访问

在这个分层里，service 层不应直接调用 `@stratix/database` 或注入 `databaseApi`，所有持久化都应通过 repository 层收敛。

### 5.1 控制器

当前控制器装饰器应统一使用：

```ts
import { Controller, Get, type FastifyReply, type FastifyRequest } from '@stratix/core';
import UserService from '../services/UserService.js';

@Controller()
export default class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/api/users')
  async list(_request: FastifyRequest, reply: FastifyReply) {
    const data = await this.userService.list();
    return reply.send({ data });
  }
}
```

这里要特别强调两点：

- 当前 `@Controller` 不接受前缀参数，`@Controller('/users')` 这种写法来自旧示例，不符合现有实现。
- 当前应用级自动发现不会消费 `applicationAutoDI.routing.prefix`，所以方法装饰器上的路径应直接写完整路径。

### 5.2 服务

服务通常就是普通 class，由 Awilix 使用 `CLASSIC` 模式进行构造函数注入。最常见的写法如下：

```ts
import type { Logger } from '@stratix/core';
import UserRepository from '../repositories/UserRepository.js';

export default class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}

  async list() {
    this.logger.info('Listing users');
    return this.userRepository.findAllActive();
  }
}
```

因为当前注册策略会同时注册 `UserService` 和 `userService` 两个 token，所以构造函数参数优先用 camelCase 名称最顺手。这里也可以看到，service 的依赖应是 repository 和其他业务协作者，而不是 database plugin。

### 5.3 仓储

如果项目接入数据库，推荐直接基于 `@stratix/database` 构建仓储层，尤其是复用 `BaseRepository`。数据库访问、查询组合、连接选择、事务细节都应该收敛在 repository 层，而不是散落到 service 中。

一个推荐的 repository 示例：

```ts
import type { Logger } from '@stratix/core';
import { BaseRepository, DataColumnType, SchemaBuilder } from '@stratix/database';

type AppDatabase = {
  users: {
    id: string;
    name: string;
    status: string;
  };
};

const schema = SchemaBuilder.create('users')
  .addPrimaryKey('id')
  .addColumn('name', DataColumnType.STRING, { nullable: false })
  .addColumn('status', DataColumnType.STRING, { nullable: false })
  .build();

export default class UserRepository extends BaseRepository<AppDatabase, 'users'> {
  protected readonly tableName = 'users';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
  }

  async findAllActive() {
    return this.findMany((qb) => qb.where('status', '=', 'active'));
  }
}
```

如果某些仓储不适合继承 `BaseRepository`，也应保持一个原则不变：只有 repository 可以直接注入 `databaseApi` 或接触 database plugin。

仓储层的编制说明建议如下：

- 一个 repository 对应一个明确的数据边界，通常是一个聚合、表组或持久化上下文。
- repository 方法名应表达业务意图，例如 `findAllActive`、`findByExternalId`、`saveDraft`，而不是把 SQL 语义直接暴露给 service。
- repository 返回持久化模型或映射后的领域数据，不返回 Fastify request/reply，也不包含协议层逻辑。
- service 可以组合多个 repository，但不直接拼接 SQL、不直接管理数据库连接。
- 如果需要事务，优先在 repository 内部或专门的 repository 协调器中收敛，不要让 service 直接触达 database plugin。

推荐做法：

- Repository 只做查询与持久化。
- Service 负责业务编排、事务边界和跨插件调用。
- Controller 只做输入输出和错误映射。

### 5.4 执行器

如果项目有异步任务或工作流节点执行需求，可以使用 `@Executor`。但要注意，执行器真正注册成功的前提是根容器中已经有 `registerTaskExecutor`，也就是 `@stratix/tasks` 已经完成加载。

规则可以简单记成：

- 执行器在应用 `src` 中：tasks 插件只要在 `plugins` 列表启用即可，因为应用 auto DI 发生在全部插件加载之后。
- 执行器在某个生态插件内部：tasks 插件必须在该插件之前注册，因为插件 discovery 会即时注册 executors。

## 6. 如何用 Stratix 生态拼出一个完整项目

一个完整的业务项目，通常会由下列层次构成：

- 接入层：应用 controllers
- 业务层：services
- 数据层：repositories + `@stratix/database`
- 缓存层：`@stratix/redis`
- 队列层：`@stratix/queue`
- 外部系统集成层：`@stratix/ossp`、`@stratix/was-v7` 或自定义生态插件
- 任务层：`@stratix/tasks`
- 开发观测层：`@stratix/devtools`

推荐的插件组合顺序通常是：

1. `@stratix/database`
2. `@stratix/redis`
3. 依赖数据库或 Redis 的生态插件，例如 `@stratix/queue`、`@stratix/ossp`、`@stratix/was-v7`
4. `@stratix/tasks`
5. `@stratix/devtools`

典型注入方式：

- repository 层通过 `BaseRepository` 或 `databaseApi` 承载数据库查询与事务
- `redisClient` 用于缓存或分布式状态
- `queueClient` 用于生产和消费队列任务
- `osspClient` 用于文件上传或对象存储
- `wasV7ApiCalendar`、`wasV7ApiDrive`、`wasV7ApiUser` 用于对接 WAS V7 的不同能力域

这里要注意一条经常踩坑的规则：消费方注入的 token 并不取决于插件配置里的 `name`，而是取决于“插件函数名 + adapter 名”。因此自研插件设计时要把函数名当成公开 API 的一部分来看待。

## 7. Fastify 生命周期、错误处理与作用域

当前 bootstrap 在创建 Fastify 实例后，会做三件对业务项目很重要的事：

- 把根容器挂到 `fastify.diContainer`
- 在 `onRequest` 中创建 `request.diScope`
- 在 `onResponse` 中释放请求级 scope

同时全局错误处理器会统一把错误转换成：

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Some message",
    "statusCode": 400,
    "details": {},
    "timestamp": "2026-03-23T00:00:00.000Z"
  }
}
```

这意味着你在 service 或 controller 中抛出 `HttpError` / `StratixError` 时，可以得到比较稳定的一致响应格式。

## 8. 测试、调试与开发辅助

### 单元测试

`@stratix/testing` 提供了轻量级 testing module，适合这几类场景：

- 单测某个 service 的业务逻辑
- 单测 service 时优先 mock repository；单测 repository 时再 mock `databaseApi`、`redisClient` 等外部依赖
- 直接测试 controller 与 service 的 DI 装配

### 集成测试

更贴近真实应用的方式通常是：

- 用真实 `stratix.config.ts` 装配最小应用
- 用 Fastify `inject()` 做接口测试
- 对数据库、缓存、外部插件能力做最小集成验证

### 开发观测

`@stratix/devtools` 适合在非生产环境打开，用于查看路由、容器和运行时统计信息。它更像是运行时观察窗口，不应替代正式监控。

## 9. 当前版本最容易踩的坑

### 9.1 把旧 README 当成当前 API

`packages/core/README.md` 里还能看到 `@Controller('/hello')` 这种示例，但当前装饰器实现不会这么处理前缀。

### 9.2 误以为 `Stratix.run({ config })` 是主路径

当前 bootstrap 实际读取 `stratix.config.*` 文件，所以直接把运行期主配置塞进 `run({ config })` 会造成预期和实际行为不一致。

### 9.3 误以为 `applicationAutoDI.routing.prefix` 会自动生效

应用级新 pipeline 目前没有消费这个字段，插件级即时路由注册也没有依赖 `AutoDIConfig.routing.prefix`。真正可靠的方案仍然是：

- 直接在方法装饰器上写完整路径
- 或者用 Fastify 插件注册时的 `prefix`

### 9.4 把所有 class 都丢进 `src`

当前 discovery 很宽松，只要扫描到 class，就会尽量注册为 service。所以要有意识地管理扫描目录边界。

### 9.5 误解插件 token 命名

很多人会以为：

```ts
{ name: 'database', plugin: database }
```

意味着对外 token 来自 `name` 字段。当前真实规则不是这样，而是由插件函数名和 adapter 名共同决定，例如 `databaseApi`、`redisClient`、`queueClient`。

## 10. 推荐的项目实施步骤

如果你要基于 Stratix 从零做一个完整 Node.js 项目，建议按下面顺序推进：

1. 先定好 `src/index.ts` 和 `src/stratix.config.ts`，让应用能稳定启动。
2. 明确需要哪些生态插件，并先把 `database`、`redis`、`tasks` 这类底层能力接好。
3. 再划分业务模块目录，分别落 controller、service、repository、executor。
4. 对所有需要对接的外部系统，优先抽成生态插件或 adapter，而不是散落在业务 service 中直接 new SDK。
5. 在完成最小业务闭环后，再补调试插件、测试夹具和部署配置。

如果整个项目始终遵循这套方式，Stratix 的自动发现、DI 和插件生态会非常顺手；一旦混入旧 API 假设，项目就会进入“看起来很像能跑，但注册链路总有一环不生效”的状态。
