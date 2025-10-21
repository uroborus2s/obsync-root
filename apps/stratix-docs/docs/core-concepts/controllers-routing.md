---
sidebar_position: 2
---

# 控制器与路由

在 `@stratix/core` 中，控制器是负责处理传入的 HTTP 请求并向客户端返回响应的核心组件。框架使用装饰器来简化控制器和路由的定义，使其过程既直观又富有表现力。

## 控制器 (Controller)

控制器是一个由 `@Controller()` 装饰器标记的 TypeScript 类。这个装饰器告诉框架，这个类将用于处理路由。

```typescript
import { Controller } from '@stratix/core';

@Controller('/users')
export class UsersController {
  // ... 路由方法将在这里定义
}
```

`@Controller()` 装饰器接受一个可选的字符串参数，该参数为此控制器内所有路由的**路径前缀**。例如，在上面的代码中，所有定义在 `UsersController` 内的路由都会自动以 `/users` 开头。

## 路由方法 (Route Methods)

路由是控制器内部用于响应特定 HTTP 请求的方法。`@stratix/core` 提供了一系列对应于不同 HTTP 动词的装饰器。

- `@Get()`
- `@Post()`
- `@Put()`
- `@Delete()`
- `@Patch()`
- `@Head()`
- `@Options()`

这些装饰器同样接受一个可选的路径参数，该路径将与控制器的前缀组合，形成完整的路由地址。

```typescript title="src/users.controller.ts"
import { Controller, Get, Post } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Controller('/users')
export class UsersController {
  // 匹配 GET /users
  @Get('/')
  public findAll() {
    return [{ id: 1, name: 'John Doe' }];
  }

  // 匹配 GET /users/:id
  @Get('/:id')
  public findOne(request: FastifyRequest) {
    const { id } = request.params as { id: string };
    return { id, name: `User ${id}` };
  }

  // 匹配 POST /users
  @Post('/')
  public create(request: FastifyRequest, reply: FastifyReply) {
    const newUser = request.body;
    reply.code(201).send({ success: true, user: newUser });
  }
}
```

## 请求对象 (Request & Reply)

路由方法的参数可以接收来自 Fastify 的 `request` 和 `reply` 对象，让您可以完全控制请求和响应。

- **`request`**: 包含了关于传入请求的所有信息，例如：
  - `request.params`: 路由参数 (e.g., `/users/:id`)
  - `request.query`: URL 查询字符串 (e.g., `?sort=asc`)
  - `request.body`: 请求体 (通常用于 `POST`, `PUT`, `PATCH`)
  - `request.headers`: HTTP 头信息
  - `request.diScope`: 当前请求作用域的 DI 容器

- **`reply`**: 用于构建和发送响应。
  - `reply.send(payload)`: 发送响应体。
  - `reply.code(statusCode)`: 设置 HTTP 状态码。
  - `reply.header(name, value)`: 设置响应头。

## 路由返回值

`@stratix/core` 极大地简化了响应处理。您的路由方法可以返回：

1.  **一个 JavaScript 对象或数组**: 框架会自动将其序列化为 JSON 字符串，并设置 `Content-Type: application/json` 头。

    ```typescript
    @Get('/profile')
    public getProfile() {
      // 将被自动转换为 JSON 响应
      return { username: 'admin', email: 'admin@example.com' };
    }
    ```

2.  **一个 `Promise`**: 如果您的方法是异步的（`async`），框架会等待 `Promise` 解析完成，然后发送其结果。

    ```typescript
    @Get('/posts')
    public async getPosts() {
      const posts = await db.posts.findMany();
      return posts;
    }
    ```

3.  **无返回值 (或 `undefined`)**: 如果您想完全手动控制响应，可以在方法中注入 `reply` 对象，并使用它来发送响应。在这种情况下，请不要从方法中返回任何值。

    ```typescript
    @Get('/legacy')
    public getLegacyData(request: FastifyRequest, reply: FastifyReply) {
      // 手动设置状态码和响应体
      reply.code(200).send({ status: 'ok' });
      // 注意：这里没有 return 语句
    }
    ```

## 路由选项

所有路由装饰器都接受第二个可选参数，即 Fastify 的 `RouteShorthandOptions` 对象。这允许您为特定路由配置高级功能，例如请求/响应校验、中间件等。

```typescript
import { Controller, Post } from '@stratix/core';

@Controller('/auth')
export class AuthController {
  @Post('/login', {
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
        required: ['email', 'password'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
  })
  public login(request: FastifyRequest) {
    // ... 登录逻辑
    // 如果请求体不符合 schema，Fastify 会自动返回 400 错误
    return { token: 'jwt-token-here' };
  }
}
```

通过这种方式，您可以充分利用 Fastify 强大的校验能力来增强应用的健壮性。
