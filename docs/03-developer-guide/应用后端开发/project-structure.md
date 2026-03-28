# 项目结构

这一页专门解决一个新手最容易卡住的问题：脚手架已经生成好了，但不知道每个文件到底是干什么的，后面应该改哪里、不该改哪里。

## 先看一个最小目录

一个刚通过 `stratix init app api my-app` 创建出来的后端项目，核心结构通常长这样：

```text
my-app/
  .stratix/
    project.json
  src/
    config/
      stratix.generated.ts
    controllers/
      HealthController.ts
    services/
      HealthService.ts
    repositories/
      interfaces/
    executors/
    types/
    index.ts
    stratix.config.ts
  .env.example
  package.json
  tsconfig.json
```

这是“最小可运行骨架”，不是“项目一辈子都只能长这样”。

当业务开始变多时，你完全可以继续演进成：

```text
src/
  modules/
    users/
      controllers/
      services/
      repositories/
      repositories/interfaces/
    billing/
      controllers/
      services/
      repositories/
      repositories/interfaces/
  config/
  types/
  index.ts
  stratix.config.ts
```

什么时候该从扁平目录走到这种结构，可以接着看 [`from-crud-to-modules.md`](./from-crud-to-modules.md)。

## 根目录文件分别做什么

### `package.json`

这是项目的包配置和脚本入口。新手最常用的是：

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm test`

你平时运行项目、构建项目，都是从这里定义的脚本开始。

### `tsconfig.json`

这是 TypeScript 编译配置。大多数业务项目不需要频繁改它，除非你明确知道自己在调整编译行为。

### `.env.example`

这是环境变量样例文件。你需要把项目运行依赖的环境变量先列在这里，方便团队其他人知道项目需要哪些配置。

### `.stratix/project.json`

这是 CLI 识别项目类型和 preset 的元数据文件。`stratix generate`、`stratix add preset`、`stratix doctor` 都会依赖它。

你通常不需要手工修改这个文件，除非你非常明确知道自己在修什么元数据问题。

## `src/` 下最重要的 3 个入口

### `src/index.ts`

这是应用运行入口。默认非常薄，通常只有：

```ts
import { Stratix } from '@stratix/core';

await Stratix.run();
```

它的职责是“启动应用”，不是“堆业务逻辑”。

### `src/stratix.config.ts`

这是你真正应该维护的应用配置入口。它负责：

- server 配置
- 插件注册
- 运行时开关
- 项目级别的配置覆盖

你应该把它当作“应用的总装配文件”。

### `src/config/stratix.generated.ts`

这是脚手架生成的默认配置拼装层。很多 preset 默认都会先把基础配置写到这里，然后由 `src/stratix.config.ts` 再包一层。

理解方式很简单：

- `stratix.generated.ts`：脚手架生成的默认底稿
- `stratix.config.ts`：项目自己的最终配置入口

## 业务分层目录怎么理解

### `src/controllers/`

这里放控制器。控制器负责：

- 接收 HTTP 请求
- 读取参数
- 调用 service
- 返回响应

它不负责：

- 写业务规则
- 直接查数据库

### `src/services/`

这里放业务服务。服务负责：

- 组织业务流程
- 协调多个 repository 或其他 service
- 记录业务日志

它不负责：

- 直接定义 HTTP 协议细节
- 直接访问数据库插件

### `src/repositories/`

这里放仓储层。仓储负责：

- 查询数据库
- 写数据库
- 收敛事务与持久化细节

如果你用了 `@stratix/database`，这里就是最应该和数据库打交道的地方。

### `src/repositories/interfaces/`

这里放 repository 接口和记录类型定义。对新手来说，它最大的价值是：

- 让你一眼看清 repository 对外承诺了什么方法
- 让 service 不需要猜 repository 返回什么数据

### `src/executors/`

只有当你引入 `@stratix/tasks` 时，这个目录才会真正重要。它主要承接可执行任务单元，而不是普通 HTTP 请求。

### `src/types/`

这里放项目级类型定义。它适合：

- DTO 类型
- 业务模型类型
- 公共响应类型

不适合：

- 放可被自动发现的 service / controller class

## 新手最常见的文件改动顺序

当你要做一个新功能时，最常见的改动顺序是：

1. 用 `stratix generate resource user` 生成骨架
2. 改 `src/repositories/UserRepository.ts`
3. 看是否需要改 `src/services/UserService.ts`
4. 最后改 `src/controllers/UserController.ts`

原因很简单：数据长什么样，通常先决定了 service 和 controller 怎么写。

## 哪些文件可以大胆改，哪些先别动

### 可以大胆改

- `src/controllers/**`
- `src/services/**`
- `src/repositories/**`
- `src/types/**`
- `src/stratix.config.ts`

### 先不要乱改

- `.stratix/project.json`
- `src/index.ts`
- `tsconfig.json`
- `package.json` 里的基础脚本

不是说这些文件永远不能改，而是新手阶段很容易因为改动它们而把启动链路弄断。

## 读完本页后你应该掌握什么

如果你现在已经能回答下面几个问题，就说明项目结构这部分过关了：

- 我应该在哪个目录写 HTTP 接口？
- 我应该在哪个目录写数据库访问？
- `src/stratix.config.ts` 和 `src/config/stratix.generated.ts` 分别负责什么？
- 我做一个新功能时，先改 controller、service 还是 repository？
