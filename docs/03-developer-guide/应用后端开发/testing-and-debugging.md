# 测试与排错

这一页解决两个新手最容易拖垮项目的问题：

- 功能写完了，但不知道怎么验证
- 接口报错了，但不知道先查哪一层

目标不是把你培养成测试专家，而是让你从第一天开始就有一套最小可执行的验证和排错顺序。

默认建议你在看完下面这些文档后再读本页：

1. `getting-started.md`
2. `first-feature.md`
3. `database-quickstart.md`
4. `database-crud.md`
5. `from-crud-to-modules.md`

## 先记住这条最小验证链

每做完一个功能，默认按这个顺序验证：

```bash
stratix doctor
pnpm build
pnpm test
pnpm dev
```

然后再手工访问你刚改的接口。

这 4 步分别解决的是不同问题：

- `stratix doctor`：先抓结构和分层错误
- `pnpm build`：再抓 TypeScript 类型和导入错误
- `pnpm test`：再抓你已经写过的行为回归
- `pnpm dev`：最后才看真实运行时表现

很多新手一上来就只跑 `pnpm dev`，这样会把原本能提前暴露的问题全拖到运行时。

## 第 1 步：确认项目有没有测试基线

`api` 模板默认会带 `testing` preset，所以你初始化一个标准 API 项目时，通常已经有：

- `vitest.config.ts`
- `src/__tests__/project.smoke.test.ts`
- `package.json` 里的 `test` 脚本

如果你的项目不是从 `api` 模板生成，或者之前删掉了这套基线，可以补上：

```bash
stratix add preset testing
```

这个 preset 的作用很明确：

- 补 `vitest` 配置
- 补测试脚本
- 补一个最小烟雾测试文件

它不会自动帮你生成业务测试。业务测试还是要你自己写。

## 第 2 步：先把烟雾测试从占位改成真检查

默认的 `src/__tests__/project.smoke.test.ts` 只是一个占位测试。不要让它长期停留在 `expect(true).toBe(true)`。

对一个刚起步的新项目，更有价值的最小 smoke test 是：

1. 某个核心 service 能被调用
2. 关键输入会产出你预期的数据

如果你已经按上一页做了 `UserService`，可以先写一个最简单的 service 单测。

## 第 3 步：最容易成功的单测写法是手工实例化 service

先建一个文件：

`src/__tests__/user.service.test.ts`

内容可以先从下面这个最小例子开始：

```ts
import { describe, expect, it, vi } from 'vitest';
import UserService from '../services/UserService.js';

describe('UserService', () => {
  it('creates user with generated id and default status', async () => {
    const fakeRepository = {
      createUser: vi.fn().mockImplementation(async (input) => ({
        ...input,
        created_at: '2026-03-28T00:00:00.000Z',
        updated_at: null
      }))
    };

    const fakeLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const service = new UserService(
      fakeRepository as any,
      fakeLogger as any
    );

    const result = await service.create({
      email: 'alice@example.com',
      name: 'Alice'
    });

    expect(result.email).toBe('alice@example.com');
    expect(result.name).toBe('Alice');
    expect(result.status).toBe('active');
    expect(result.id).toBeTruthy();
    expect(fakeRepository.createUser).toHaveBeenCalledTimes(1);
  });
});
```

这类单测的重点不是数据库，而是：

- service 有没有按预期组装输入
- 默认值有没有补进去
- repository 有没有被正确调用

为什么新手阶段优先这样写：

- 简单
- 跑得快
- 失败时定位清晰

## 第 4 步：什么时候用 `@stratix/testing`

当你的 service 依赖越来越多，手工 `new UserService(...)` 开始变得难维护时，再考虑引入 `@stratix/testing`。

先安装：

```bash
pnpm add -D @stratix/testing
```

然后可以写成：

```ts
import { describe, expect, it, vi } from 'vitest';
import { Test } from '@stratix/testing';
import UserService from '../services/UserService.js';

describe('UserService with testing module', () => {
  it('resolves service from test container', async () => {
    const fakeRepository = {
      findAll: vi.fn().mockResolvedValue([])
    };

    const fakeLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: 'userRepository', useValue: fakeRepository },
        { provide: 'logger', useValue: fakeLogger }
      ]
    }).compile();

    const service = moduleRef.get<UserService>(UserService);
    const result = await service.list();

    expect(result).toEqual([]);
    expect(fakeRepository.findAll).toHaveBeenCalledTimes(1);
  });
});
```

这里要特别注意：

- `TestingModule` 不是自动帮你发现所有应用文件
- 你需要自己把 `userRepository`、`logger` 这类依赖 token 提供进去

所以它适合“把依赖装配得更整齐”，不适合取代你对分层的理解。

## 第 5 步：接口层验证先用最笨但最稳的办法

对新手来说，HTTP 层最稳妥的第一步不是写一大堆集成测试，而是：

1. `pnpm dev`
2. 用 `curl` 或 API 工具访问接口
3. 把最关键的成功路径和失败路径跑一遍

以 `users` CRUD 为例，至少跑这几条：

```bash
curl http://127.0.0.1:3000/users
curl -X POST http://127.0.0.1:3000/users -H "Content-Type: application/json" -d '{"email":"alice@example.com","name":"Alice"}'
curl http://127.0.0.1:3000/users/<id>
curl -X PUT http://127.0.0.1:3000/users/<id> -H "Content-Type: application/json" -d '{"status":"disabled"}'
curl -X DELETE http://127.0.0.1:3000/users/<id>
```

这一步的意义非常现实：

- 你先确认接口真的可用
- 你先看到真实响应格式
- 你先暴露数据库、路由、序列化层面的最直接问题

## 第 6 步：需要无端口接口测试时，用 `inject()`

当你已经熟悉基本验证链，再往前一步，可以使用 `StratixApplication.inject()` 做无端口 HTTP 测试。

仓库里的 `@stratix/core` 测试已经证明这条能力是存在的。

一个最小示例如下：

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { Stratix } from '@stratix/core';

describe('http route with inject', () => {
  const stratix = new Stratix();

  afterEach(async () => {
    if (stratix.isRunning()) {
      await stratix.stop();
    }
  });

  it('responds to injected request', async () => {
    const app = await stratix.start({
      type: 'web',
      config: {
        server: { port: 0 },
        plugins: [
          {
            name: 'test-routes',
            plugin: async (fastify) => {
              fastify.get('/test', async () => ({ success: true }));
            },
            options: {}
          }
        ],
        container: {},
        autoLoad: {}
      }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
  });
});
```

这类测试适合：

- 测某条路由的输入输出
- 不想真的监听本地端口
- 想让测试跑得更快

但新手阶段不要反过来依赖它替代基础手工验证。先会用 `curl`，再上 `inject()`。

## 第 7 步：`stratix doctor` 到底能帮你抓什么

`doctor` 不是“有没有文件缺失”这么简单。当前它至少会抓这些典型问题：

- 缺少脚手架托管文件，例如 `src/stratix.config.ts`
- 依赖版本和 preset 期望不一致
- `service` 层直接访问 `@stratix/database`
- `controller` 层直接访问 repository 或数据库层
- `@Controller()` 错误地写了前缀参数
- 继续使用已经移除的 `DatabaseAPI`
- 继续使用已经移除的公共事务辅助函数

所以这些场景下，优先跑一次 `doctor`：

1. 刚加完 preset
2. 刚大改目录结构
3. 刚从旧版代码迁到 1.1.0 风格
4. 明明能编译，但总觉得分层已经乱掉

## 第 8 步：出问题时按层排查，不要乱翻文件

这是最实用的排错顺序。

### 启动前就报错

优先检查：

1. `stratix doctor`
2. `src/stratix.config.ts`
3. `.env` 或 `STRATIX_SENSITIVE_CONFIG`
4. preset 依赖是否真的安装了

### `pnpm build` 失败

优先检查：

1. 导入路径是否写错
2. 类型是否还沿用旧版 API
3. `service`、`controller`、`repository` 有没有越层

### 接口返回 404

优先检查：

1. 方法装饰器路径是否正确
2. 有没有错误地把前缀写进 `@Controller(...)`
3. 控制器文件是否真的在扫描目录里

### 接口返回 500

优先检查：

1. controller 是否只做协议层
2. service 是否调用了正确的 repository 方法
3. repository 是否正确处理了 `Maybe` / `Either`
4. 数据库表是否真实存在

### 数据库相关错误

优先检查：

1. `src/stratix.config.ts` 是否真的把配置映射到 `database`
2. 数据库连接参数是否有效
3. 真实表结构是否存在
4. `tableSchema` 和真实表是否至少字段名对得上

## 第 9 步：什么时候加 `devtools`

如果你已经反复遇到下面这些问题，可以考虑在本地加：

```bash
stratix add preset devtools
```

`@stratix/devtools` 更适合这几类排错：

- 我到底注册了哪些路由
- 容器里现在到底有哪些服务
- 运行时资源状态怎么样
- 本地日志想集中看

当前插件默认挂在：

```text
/_stratix
```

它至少会暴露这些调试入口：

- `/_stratix/api/stats`
- `/_stratix/api/routes`
- `/_stratix/api/container`
- `/_stratix/api/logs`

但要记住两件事：

- 它是本地开发观测工具，不是正式监控系统
- 不要默认把它带到生产环境

## 本页完成后的检查点

如果你已经做到下面这些事，说明你已经具备独立验证和排错的基础能力了：

- 知道每次改完功能先跑 `doctor / build / test / dev`
- 会给 service 写最小单测
- 知道什么时候需要 `@stratix/testing`
- 会用 `curl` 跑接口成功路径
- 知道报错时先查 controller、service、repository 还是配置层
- 知道 `devtools` 是可选的本地排错工具，而不是必选项
