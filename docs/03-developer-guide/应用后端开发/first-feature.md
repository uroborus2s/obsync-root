# 第一个功能：从骨架到可用接口

这一页带你做一个真正能访问的接口，而不是停留在“生成了几个文件”。

目标很明确：做出一个 `/users` 接口，并返回一组演示数据。

## 第 1 步：生成 `user` 资源

在项目根目录执行：

```bash
stratix generate resource user
```

执行后，通常会得到这些文件：

- `src/controllers/UserController.ts`
- `src/services/UserService.ts`
- `src/repositories/UserRepository.ts`
- `src/repositories/interfaces/IUserRepository.ts`

这四个文件正好对应了 Stratix 最常见的一条业务链：

```text
请求 -> Controller -> Service -> Repository -> 返回数据
```

## 第 2 步：先看生成结果是什么意思

### `UserController.ts`

它负责暴露 HTTP 接口。资源生成器会自动把 `user` 变成复数路由，因此默认路径是：

```text
/users
```

### `UserService.ts`

它负责业务编排。默认会调用 `userRepository.findAll()`。

### `UserRepository.ts`

它默认只是一个占位实现，通常会返回空数组。这是正常的，因为脚手架不知道你的真实业务数据从哪里来。

## 第 3 步：把 repository 改成真正返回数据

先修改接口文件：

```ts
export interface IUserRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface IUserRepository {
  findAll(): Promise<IUserRecord[]>;
}
```

然后实现一个最简单的演示版 repository：

```ts
import type { Logger } from '@stratix/core';
import type {
  IUserRecord,
  IUserRepository
} from './interfaces/IUserRepository.js';

export default class UserRepository implements IUserRepository {
  constructor(private readonly logger: Logger) {}

  async findAll(): Promise<IUserRecord[]> {
    this.logger.debug('Listing user records.');

    return [
      {
        id: 'u_001',
        name: 'Alice',
        createdAt: new Date().toISOString()
      },
      {
        id: 'u_002',
        name: 'Bob',
        createdAt: new Date().toISOString()
      }
    ];
  }
}
```

这一步的目的不是“真的接数据库”，而是先把整条链跑通。

## 第 4 步：确认 service 不要越层

`UserService.ts` 的默认结构通常已经是对的。你只需要确认它没有直接碰数据库，而是继续通过 repository 拿数据：

```ts
import type { Logger } from '@stratix/core';
import type UserRepository from '../repositories/UserRepository.js';
import type { IUserRecord } from '../repositories/interfaces/IUserRepository.js';

export default class UserService {
  constructor(
    private readonly logger: Logger,
    private readonly userRepository: UserRepository
  ) {}

  async list(): Promise<IUserRecord[]> {
    this.logger.debug('Listing user records.');
    return this.userRepository.findAll();
  }
}
```

## 第 5 步：确认 controller 只做协议层工作

控制器应该只负责请求和响应，不要在里面写业务规则：

```ts
import {
  Controller,
  Get,
  type FastifyReply,
  type FastifyRequest
} from '@stratix/core';
import type UserService from '../services/UserService.js';

@Controller()
export default class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/users')
  async list(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = await this.userService.list();

    reply.status(200).send({
      success: true,
      data
    });
  }
}
```

注意这里有两个关键点：

- `@Controller()` 不带前缀
- 路由路径直接写在 `@Get('/users')`

## 第 6 步：启动并验证

执行：

```bash
pnpm dev
```

然后另开一个终端访问：

```bash
curl http://127.0.0.1:3000/users
```

如果一切正常，你应该能得到类似下面的响应：

```json
{
  "success": true,
  "data": [
    {
      "id": "u_001",
      "name": "Alice",
      "createdAt": "2026-03-28T00:00:00.000Z"
    },
    {
      "id": "u_002",
      "name": "Bob",
      "createdAt": "2026-03-28T00:00:00.000Z"
    }
  ]
}
```

## 第 7 步：如果你要接数据库，下一步怎么做

演示数据跑通之后，真实项目的下一步通常是：

1. `stratix add preset database`
2. 先读一遍 [`database-quickstart.md`](./database-quickstart.md)，确认数据库配置是真的能被项目读到
3. 再读 [`database-crud.md`](./database-crud.md)，把 `UserRepository` 改成基于 `@stratix/database` 的真正仓储实现

如果只是单表 CRUD，优先用普通 repository 即可。

如果你要处理多表一致性、工作流状态迁移、claim/checkpoint/finalize 这类长流程单元，再考虑：

```bash
stratix generate business-repository order
```

## 你现在已经完成了什么

如果你做到这里，说明你已经不是“只会建骨架”的状态了，而是已经掌握了 Stratix 最核心的一条开发路径：

- 会生成资源
- 会分清 controller / service / repository 各自职责
- 会让一个接口真正返回业务数据
- 知道从演示数据切换到数据库时应该去改哪里
- 知道下一步应该进入数据库接入和真实 CRUD 实战，而不是继续往演示数据上堆逻辑
