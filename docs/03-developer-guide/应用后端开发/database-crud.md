# 第一个真实 CRUD

这一页会把你从“演示数据接口”推进到“真正接数据库的接口”。

目标是做出下面这 5 个接口：

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

默认假设你已经完成：

1. `first-feature.md`
2. `database-quickstart.md`

## 第 1 步：先生成 `user` 资源骨架

如果你还没生成，先执行：

```bash
stratix generate resource user
```

这样至少会有下面这些文件：

- `src/controllers/UserController.ts`
- `src/services/UserService.ts`
- `src/repositories/UserRepository.ts`
- `src/repositories/interfaces/IUserRepository.ts`

接下来我们不是“在旧代码上零碎打补丁”，而是把这几个文件替换成真正可用的版本。

## 第 2 步：先把 repository 接口定义清楚

先改 `src/repositories/interfaces/IUserRepository.ts`：

```ts
export interface IUserRecord {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string | null;
}

export interface CreateUserInput {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'disabled';
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  status?: 'active' | 'disabled';
}

export interface IUserRepository {
  findAll(): Promise<IUserRecord[]>;
  findByIdOrNull(id: string): Promise<IUserRecord | null>;
  createUser(input: CreateUserInput): Promise<IUserRecord>;
  updateUser(id: string, input: UpdateUserInput): Promise<IUserRecord | null>;
  deleteUser(id: string): Promise<IUserRecord | null>;
}
```

这里有两个刻意的设计：

- 对外暴露的是普通 `Promise<对象>` 或 `Promise<对象 | null>`
- 不把 `BaseRepository` 的 `Maybe` / `Either` 直接漏到 service 层

原因很简单：你现在在写应用代码，不是在教每个 service 都学函数式细节。把转换收敛在 repository 内部，更容易维护。

## 第 3 步：把 `UserRepository` 改成真正的数据库仓储

把 `src/repositories/UserRepository.ts` 改成下面这样：

```ts
import type { Logger } from '@stratix/core';
import { isLeft, isNone } from '@stratix/core/functional';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import type {
  CreateUserInput,
  IUserRecord,
  IUserRepository,
  UpdateUserInput
} from './interfaces/IUserRepository.js';

type AppDatabase = {
  users: IUserRecord;
};

const userSchema = SchemaBuilder.create('users')
  .addUuidPrimaryKey('id')
  .addColumn('email', DataColumnType.STRING, { nullable: false })
  .addColumn('name', DataColumnType.STRING, { nullable: false })
  .addColumn('status', DataColumnType.STRING, { nullable: false })
  .addTimestamps()
  .addUniqueIndex('uk_users_email', ['email'])
  .build();

export default class UserRepository
  extends BaseRepository<
    AppDatabase,
    'users',
    IUserRecord,
    CreateUserInput,
    UpdateUserInput
  >
  implements IUserRepository
{
  protected readonly tableName = 'users' as const;
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = userSchema;

  constructor(protected readonly logger: Logger) {
    super('default');
  }

  async findAll(): Promise<IUserRecord[]> {
    return await this.findMany((qb) => qb.orderBy('created_at', 'desc'));
  }

  async findByIdOrNull(id: string): Promise<IUserRecord | null> {
    const result = await this.findById(id);
    return isNone(result) ? null : result.value;
  }

  async createUser(input: CreateUserInput): Promise<IUserRecord> {
    const result = await this.create(input);

    if (isLeft(result)) {
      throw result.left;
    }

    return result.right;
  }

  async updateUser(
    id: string,
    input: UpdateUserInput
  ): Promise<IUserRecord | null> {
    const current = await this.findByIdOrNull(id);

    if (!current) {
      return null;
    }

    const result = await this.update(id, input);

    if (isLeft(result)) {
      throw result.left;
    }

    return result.right;
  }

  async deleteUser(id: string): Promise<IUserRecord | null> {
    const current = await this.findByIdOrNull(id);

    if (!current) {
      return null;
    }

    const result = await this.delete(id);

    if (isLeft(result)) {
      throw result.left;
    }

    return result.right;
  }
}
```

这段代码要注意 4 件事：

1. `BaseRepository` 是数据库访问的核心入口
2. `tableSchema` 是仓储声明，不会自动帮你建表
3. `findById()` 返回的是 `Maybe`
4. `create()`、`update()`、`delete()` 返回的是 `Either`

所以 repository 的职责之一，就是把这些底层返回值收敛成更适合业务层消费的普通结果。

## 第 4 步：让 service 只做业务编排

然后改 `src/services/UserService.ts`：

```ts
import type { Logger } from '@stratix/core';
import { generateUUID } from '@stratix/core/functional';
import type UserRepository from '../repositories/UserRepository.js';
import type {
  CreateUserInput,
  IUserRecord,
  UpdateUserInput
} from '../repositories/interfaces/IUserRepository.js';

export interface CreateUserRequest {
  email: string;
  name: string;
  status?: 'active' | 'disabled';
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  status?: 'active' | 'disabled';
}

export default class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}

  async list(): Promise<IUserRecord[]> {
    return await this.userRepository.findAll();
  }

  async detail(id: string): Promise<IUserRecord | null> {
    return await this.userRepository.findByIdOrNull(id);
  }

  async create(input: CreateUserRequest): Promise<IUserRecord> {
    const payload: CreateUserInput = {
      id: generateUUID(),
      email: input.email.trim(),
      name: input.name.trim(),
      status: input.status || 'active'
    };

    this.logger.info('Creating user.', {
      email: payload.email
    });

    return await this.userRepository.createUser(payload);
  }

  async update(
    id: string,
    input: UpdateUserRequest
  ): Promise<IUserRecord | null> {
    const payload: UpdateUserInput = {
      ...(input.email ? { email: input.email.trim() } : {}),
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.status ? { status: input.status } : {})
    };

    return await this.userRepository.updateUser(id, payload);
  }

  async remove(id: string): Promise<IUserRecord | null> {
    return await this.userRepository.deleteUser(id);
  }
}
```

这里把 `id` 生成放在 service 层，而不是压给 controller 或 repository，原因是：

- controller 应该只关心 HTTP 协议
- repository 应该只关心持久化
- `id` 生成属于业务输入组装，放在 service 最自然

## 第 5 步：让 controller 只做 HTTP 协议层

再改 `src/controllers/UserController.ts`：

```ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  type FastifyReply,
  type FastifyRequest
} from '@stratix/core';
import type UserService from '../services/UserService.js';
import type {
  CreateUserRequest,
  UpdateUserRequest
} from '../services/UserService.js';

@Controller()
export default class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/users')
  async list(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const data = await this.userService.list();

    reply.status(200).send({
      success: true,
      data
    });
  }

  @Get('/users/:id')
  async detail(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const data = await this.userService.detail(request.params.id);

    if (!data) {
      reply.status(404).send({
        success: false,
        message: 'User not found.'
      });
      return;
    }

    reply.status(200).send({
      success: true,
      data
    });
  }

  @Post('/users')
  async create(
    request: FastifyRequest<{ Body: CreateUserRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    const data = await this.userService.create(request.body);

    reply.status(201).send({
      success: true,
      data
    });
  }

  @Put('/users/:id')
  async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateUserRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const data = await this.userService.update(
      request.params.id,
      request.body
    );

    if (!data) {
      reply.status(404).send({
        success: false,
        message: 'User not found.'
      });
      return;
    }

    reply.status(200).send({
      success: true,
      data
    });
  }

  @Delete('/users/:id')
  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const data = await this.userService.remove(request.params.id);

    if (!data) {
      reply.status(404).send({
        success: false,
        message: 'User not found.'
      });
      return;
    }

    reply.status(200).send({
      success: true,
      data
    });
  }
}
```

这一步要牢记一句话：

- controller 负责 HTTP 输入输出
- service 负责业务编排
- repository 负责数据库访问

只要不越层，你后面改需求时就不会很快失控。

## 第 6 步：按顺序验证 5 个接口

先启动项目：

```bash
pnpm dev
```

### 1. 列表接口

```bash
curl http://127.0.0.1:3000/users
```

刚开始如果表里没数据，正常情况下你会得到：

```json
{
  "success": true,
  "data": []
}
```

### 2. 创建接口

```bash
curl -X POST http://127.0.0.1:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "name": "Alice",
    "status": "active"
  }'
```

这一步返回的数据里会包含 `id`，记下来，后面详情、更新、删除都要用。

### 3. 详情接口

```bash
curl http://127.0.0.1:3000/users/<your-id>
```

### 4. 更新接口

```bash
curl -X PUT http://127.0.0.1:3000/users/<your-id> \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Cooper",
    "status": "disabled"
  }'
```

### 5. 删除接口

```bash
curl -X DELETE http://127.0.0.1:3000/users/<your-id>
```

## 第 7 步：如果你跑不通，优先看哪一层

遇到问题时，不要所有文件一起翻。按下面顺序定位最快：

1. 如果启动就报配置错，先看 `src/stratix.config.ts`
2. 如果访问接口报表不存在，先看数据库里是否真的有 `users` 表
3. 如果接口返回 500，先看 `UserRepository.ts`
4. 如果接口状态码不对，再看 `UserController.ts`

## 这一页完成后，你已经跨过了哪条线

做到这里，你已经不是“会用脚手架生成几个文件”的状态了，而是已经具备了独立开发 Stratix 后端业务的基本能力：

- 会接数据库 preset
- 会准备真实数据表
- 会写 `BaseRepository`
- 会处理 `Maybe` / `Either`
- 会做一个完整的单表 CRUD

下一步优先看 [`from-crud-to-modules.md`](./from-crud-to-modules.md)，把这个单表 CRUD 演进成真正能持续扩展的项目结构；再回头看 `development-workflow.md` 和 `architecture-conventions.md`，你会更容易把这些能力固化成稳定习惯。
