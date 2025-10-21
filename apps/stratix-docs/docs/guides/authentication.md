---
sidebar_position: 2
---

# 指南：实现用户认证

用户认证是绝大多数 Web 应用的必备功能。本指南将向您展示如何利用 **思齐框架 (`@stratix/core`)** 的插件系统和 Fastify 的钩子（Hooks）来构建一个可复用、可扩展的 JWT (JSON Web Token) 认证插件。

## 目标

- 创建一个 `AuthPlugin`，用于保护特定路由。
- 提供一个 `@Public()` 装饰器，用于将路由标记为公开访问，无需认证。
- 在请求对象上附加已认证的用户信息。
- 通过依赖注入提供一个 `AuthService`，用于生成 Token。

## 步骤 1: 安装依赖

我们将使用 `@fastify/jwt` 来处理 JWT 的生成和验证。

```bash
pnpm add @fastify/jwt
```

## 步骤 2: 创建认证服务和装饰器

首先，我们创建插件的核心逻辑。

**1. 创建 `@Public()` 装饰器**

这个装饰器用于在路由的元数据中添加一个标记，告诉我们的认证钩子跳过对此路由的检查。

```typescript title="src/plugins/auth/auth.decorators.ts"
import 'reflect-metadata';

export const IS_PUBLIC_KEY = 'isPublic';

export function Public() {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, descriptor.value);
  };
}
```

**2. 创建 `AuthService`**

这个服务将负责生成 JWT。

```typescript title="src/plugins/auth/auth.service.ts"
import { Lifetime, RESOLVER } from 'awilix';
import type { FastifyInstance } from 'fastify';

export class AuthService {
  static [RESOLVER] = { lifetime: Lifetime.SCOPED };

  constructor(private readonly fastify: FastifyInstance) {}

  // 为用户生成一个 JWT
  public async generateToken(payload: { userId: string; username: string }): Promise<string> {
    return this.fastify.jwt.sign(payload);
  }
}
```

> 注意：我们直接注入了 `FastifyInstance`。`@stratix/core` 的 DI 容器会自动将 Fastify 实例注册为 `fastify`，方便您在服务中访问。

## 步骤 3: 创建认证插件

这是所有魔法发生的地方。我们将创建一个 Fastify 插件，在其中注册 `jwt` 插件、定义认证钩子，并整合所有服务。

```typescript title="src/plugins/auth/index.ts"
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { IS_PUBLIC_KEY } from './auth.decorators';

async function authPlugin(fastify: FastifyInstance, options: any) {
  // 1. 注册 @fastify/jwt 插件
  fastify.register(import('@fastify/jwt'), {
    secret: options.secret || process.env.JWT_SECRET || 'a-default-secret-key',
  });

  // 2. 添加一个全局的 onRequest 钩子用于认证
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // 检查路由是否被 @Public() 装饰器标记
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, request.routeOptions.handler);
    if (isPublic) {
      return; // 如果是公开路由，则跳过认证
    }

    try {
      // 验证 JWT
      await request.jwtVerify();
    } catch (err) {
      // 如果验证失败，发送 401 错误
      reply.send(err);
    }
  });

  fastify.log.info('Auth plugin with JWT protection is ready.');
}

// 使用 withRegisterAutoDI 包装插件
export default withRegisterAutoDI(fp(authPlugin), {
  discovery: {
    patterns: ['**/*.service.ts'], // 自动发现 AuthService
  },
});
```

**代码解释**:
- `fp(authPlugin)`: 我们使用 `fastify-plugin` 来包装我们的插件，这可以防止 Fastify 对插件进行封装，确保我们注册的钩子是全局生效的。
- `fastify.addHook('onRequest', ...)`: 这是 Fastify 的钩子系统。我们注册了一个 `onRequest` 钩子，它会在每个请求的生命周期早期被调用。
- `Reflect.getMetadata(...)`: 我们在这里检查路由处理器上是否存在由 `@Public()` 设置的元数据。这是实现选择性认证的关键。
- `request.jwtVerify()`: 这是由 `@fastify/jwt` 提供的核心方法，用于验证请求头中的 `Authorization` Bearer Token。

## 步骤 4: 在应用中使用

现在，让我们将认证插件集成到应用中，并保护我们的路由。

**1. 更新主应用配置**

```typescript title="stratix.config.ts"
import { defineConfig } from '@stratix/core';
import authPlugin from './plugins/auth'; // 导入认证插件

export default defineConfig(() => ({
  server: { port: 3000 },
  applicationAutoDI: {
    enabled: true,
    patterns: ['src/**/*.controller.ts', 'src/**/*.service.ts'],
  },
  plugins: [
    {
      name: 'auth',
      plugin: authPlugin,
      options: {
        secret: 'my-super-strong-jwt-secret', // 强烈建议从环境变量加载
      },
    },
  ],
}));
```

**2. 创建受保护的控制器和公共路由**

```typescript title="src/profile.controller.ts"
import { Controller, Get, Post } from '@stratix/core';
import { Public } from './plugins/auth/auth.decorators';
import { AuthService } from './plugins/auth/auth.service';
import type { FastifyRequest } from 'fastify';

@Controller('/auth')
export class ProfileController {
  constructor(private readonly authService: AuthService) {}

  // 这个路由是公开的，用于登录和获取 Token
  @Public()
  @Post('/login')
  public async login() {
    const user = { userId: '123', username: 'john.doe' };
    const token = await this.authService.generateToken(user);
    return { token };
  }

  // 这个路由是受保护的，需要有效的 JWT
  @Get('/profile')
  public async getProfile(request: FastifyRequest) {
    // request.user 包含了 JWT 的载荷 (payload)
    return { user: request.user };
  }
}
```

## 测试流程

1.  **启动应用**: `pnpm dev`
2.  **登录获取 Token**:
    ```bash
    curl -X POST -H "Content-Type: application/json" http://localhost:3000/auth/login
    ```
    你会得到一个 JWT, 例如: `{"token":"eyJ..."}`
3.  **访问受保护的路由 (不带 Token)**:
    ```bash
    curl http://localhost:3000/auth/profile
    ```
    你会收到一个 `401 Unauthorized` 错误。
4.  **访问受保护的路由 (带 Token)**:
    ```bash
    TOKEN="eyJ..." # 替换为你获取到的 Token
    curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/auth/profile
    ```
    你会成功获取到用户信息: `{"user":{"userId":"123","username":"john.doe", ...}}`

这个例子完美地展示了如何结合 **思齐框架 (`@stratix/core`)** 的插件架构、依赖注入和 Fastify 强大的钩子系统来构建一个功能完善且高度解耦的认证模块。
