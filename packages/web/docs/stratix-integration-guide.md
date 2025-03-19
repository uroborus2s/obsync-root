# Stratix框架集成指南

本指南将帮助您了解如何将`@stratix/web`与Stratix框架集成，以及如何利用其提供的功能来简化Web应用程序的开发。

## 集成概述

`@stratix/web`提供了与Stratix框架的无缝集成，使您能够以更简洁、更直观的方式构建Web应用程序。它基于Fastify构建，并提供了以下功能：

1. **装饰器路由定义**：使用装饰器定义路由，简化代码结构
2. **控制器支持**：使用类组织相关路由
3. **中间件管理**：全局、控制器级和路由级中间件支持
4. **插件系统**：轻松集成Fastify生态系统中的插件
5. **类型安全**：完整的TypeScript支持

## 基本用法

### 创建控制器

使用装饰器定义控制器和路由：

```typescript
import { Controller, Get, Post } from '@stratix/web';
import { RouteContext } from '@stratix/web';

@Controller('/users')
class UserController {
  @Get('/')
  async getUsers(ctx: RouteContext) {
    return [
      { id: 1, name: '张三' },
      { id: 2, name: '李四' }
    ];
  }

  @Get('/:id')
  async getUser(ctx: RouteContext) {
    const id = ctx.request.params.id;
    return { id, name: `用户${id}` };
  }

  @Post('/', { schema: { body: { type: 'object', required: ['name'] } } })
  async createUser(ctx: RouteContext) {
    const body = ctx.request.body;
    return { id: Math.floor(Math.random() * 1000), ...body };
  }
}

// 导出控制器以便自动注册
export default UserController;
```

### 创建Stratix插件

在Stratix框架项目中，您可以使用`createPlugin`函数创建一个插件：

```typescript
import { createPlugin } from '@stratix/web';

export default createPlugin({
  server: {
    port: 3000
  },
  routes: {
    prefix: '/api'
  },
  plugins: [
    '@fastify/cors',
    '@fastify/helmet'
  ]
});
```

### 在Stratix应用中注册插件

```typescript
import { createApp } from '@stratix/core';
import webPlugin from './plugins/web.js';

const app = createApp();
app.use(webPlugin);
await app.start();
```

## 高级用法

### 中间件配置

您可以在不同级别应用中间件：

```typescript
// 全局中间件
const options = {
  middleware: {
    global: ['requestLogger', 'errorHandler']
  }
};

// 控制器中间件
@Controller('/users', ['authMiddleware'])
class UserController {
  // 路由中间件
  @Get('/:id', {}, ['validateUserIdMiddleware'])
  async getUser(ctx: RouteContext) {
    // ...
  }
}
```

### 插件配置

您可以轻松集成Fastify生态系统中的插件：

```typescript
const options = {
  plugins: [
    // 字符串形式
    '@fastify/cors',
    
    // 对象形式，带配置
    { 
      name: '@fastify/helmet', 
      options: {
        contentSecurityPolicy: false
      } 
    },
    
    // 禁用插件
    { 
      name: '@fastify/rate-limit', 
      enabled: false 
    }
  ]
};
```

### 路由选项

您可以为路由提供Fastify支持的所有选项：

```typescript
@Get('/', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'number' },
        limit: { type: 'number' }
      }
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' }
          }
        }
      }
    }
  }
})
async getUsers(ctx: RouteContext) {
  // ...
}
```

## 集成Fastify插件

`@stratix/web`支持Fastify的整个插件生态系统。您可以在[Fastify生态系统页面](https://fastify.dev/ecosystem/)上查找可用的插件。

以下是一些常用的Fastify插件：

- **@fastify/cors**：启用CORS支持
- **@fastify/helmet**：添加重要的安全头
- **@fastify/jwt**：JWT认证支持
- **@fastify/cookie**：Cookie解析和设置
- **@fastify/session**：会话管理
- **@fastify/multipart**：文件上传支持
- **@fastify/static**：静态文件服务
- **@fastify/swagger**：API文档生成

## 最佳实践

1. **组织控制器**：按功能或领域将控制器分组
2. **使用中间件**：利用中间件处理横切关注点，如认证、日志记录等
3. **利用Fastify插件**：使用Fastify生态系统中的插件扩展功能
4. **使用类型安全**：充分利用TypeScript提供的类型安全
5. **使用模式验证**：为请求和响应定义JSON模式，确保数据有效性

## 示例项目

以下是一个完整的示例项目结构：

```
src/
  controllers/
    user.controller.ts
    product.controller.ts
  middleware/
    auth.middleware.ts
    logger.middleware.ts
  plugins/
    web.plugin.ts
  app.ts
```

### app.ts

```typescript
import { createApp } from '@stratix/core';
import webPlugin from './plugins/web.plugin.js';

const app = createApp();
app.use(webPlugin);
await app.start();
```

### web.plugin.ts

```typescript
import { createPlugin } from '@stratix/web';

export default createPlugin({
  server: {
    port: 3000,
    logger: true
  },
  routes: {
    prefix: '/api'
  },
  plugins: [
    '@fastify/cors',
    '@fastify/helmet',
    { name: '@fastify/jwt', options: { secret: 'your-secret-key' } }
  ],
  middleware: {
    global: ['requestLogger'],
    route: {
      '/users': ['authMiddleware']
    }
  }
});
```

## 结论

通过使用`@stratix/web`与Stratix框架集成，您可以利用Fastify的性能和灵活性，同时享受更简洁、更直观的API。装饰器路由定义和控制器支持使代码更加组织化，而插件系统则允许您轻松扩展功能。 