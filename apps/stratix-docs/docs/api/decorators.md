---
sidebar_position: 1
---

# API 参考：装饰器

装饰器是 **思齐框架 (`@stratix/core`)** 的核心特性之一，它们提供了一种声明式、简洁的方式来组织代码和定义元数据。

## 控制器与路由装饰器

这些装饰器用于定义 HTTP 端点。

### `@Controller(prefix?: string)`

标记一个类为控制器，并可选地为其所有路由方法设置一个公共的路径前缀。

- **`prefix`** (可选): `string` - 应用于该控制器所有路由的路径前缀。

```typescript
@Controller('/users')
export class UsersController {}
```

### `@Get(path?: string, options?: RouteOptions)`

将一个类方法标记为处理 `GET` 请求的路由处理器。

- **`path`** (可选): `string` - 路由路径，将与控制器前缀拼接。默认为 `/`。
- **`options`** (可选): `object` - Fastify 的[路由选项](https://www.fastify.io/docs/latest/Reference/Routes/#options)，用于配置校验、中间件等。

```typescript
@Get('/:id')
public findOne(request: FastifyRequest) { /* ... */ }
```

### `@Post(path?: string, options?: RouteOptions)`

将一个类方法标记为处理 `POST` 请求的路由处理器。

### `@Put(path?: string, options?: RouteOptions)`

将一个类方法标记为处理 `PUT` 请求的路由处理器。

### `@Delete(path?: string, options?: RouteOptions)`

将一个类方法标记为处理 `DELETE` 请求的路由处理器。

### `@Patch(path?: string, options?: RouteOptions)`

将一个类方法标记为处理 `PATCH` 请求的路由处理器。

### `@Head(path?: string, options?: RouteOptions)`

将一个类方法标记为处理 `HEAD` 请求的路由处理器。

### `@Options(path?: string, options?: RouteOptions)`

将一个类方法标记为处理 `OPTIONS` 请求的路由处理器。

## 任务执行器装饰器

### `@Executor(options?: ExecutorOptions)`

标记一个类为任务执行器，用于处理后台任务或工作流。

- **`options`**: `object` - 执行器的配置选项。
  - `name`: `string` - 执行器的唯一名称。
  - `description`: `string` - 执行器的描述。
  - `version`: `string` - 版本号。
  - `tags`: `string[]` - 标签，用于分类。

```typescript
@Executor({ name: 'send-welcome-email', description: '发送欢迎邮件' })
export class SendWelcomeEmailExecutor {
  async execute(payload: any) {
    // ... 任务逻辑
  }
}
```

## 公共访问装饰器

### `@Public()`

用于将一个路由标记为公开访问，绕过全局的认证检查。通常与认证插件结合使用。

```typescript
@Controller('/auth')
export class AuthController {
  @Public() // 这个路由不需要认证
  @Post('/login')
  public login() { /* ... */ }

  @Get('/profile') // 这个路由需要认证
  public getProfile() { /* ... */ }
}
```
