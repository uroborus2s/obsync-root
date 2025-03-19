# Stratix框架集成

`@stratix/web`提供了与Stratix框架的无缝集成，使您能够以更简洁、更直观的方式构建Web应用程序。

## 特性

- **装饰器路由定义**：使用装饰器定义路由，简化代码结构
- **控制器支持**：使用类组织相关路由
- **中间件管理**：全局、控制器级和路由级中间件支持
- **插件系统**：轻松集成Fastify生态系统中的插件
- **类型安全**：完整的TypeScript支持

## 安装

```bash
npm install @stratix/web
```

## 基本用法

### 创建控制器

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

### 启动服务器

```typescript
import { startServer } from '@stratix/web';
import UserController from './controllers/user.controller.js';

async function main() {
  const server = await startServer({
    server: {
      host: 'localhost',
      port: 3000,
      logger: true
    },
    routes: {
      prefix: '/api'
    },
    plugins: [
      // 使用Fastify生态系统中的插件
      { name: '@fastify/cors', options: {} },
      { name: '@fastify/helmet', options: {} }
    ],
    middleware: {
      global: ['requestLogger', 'errorHandler']
    }
  });

  console.log(`服务器已启动: ${server.server.address().port}`);
}

main().catch(console.error);
```

## 高级用法

### 中间件配置

您可以在不同级别应用中间件：

1. **全局中间件**：应用于所有路由
2. **控制器中间件**：应用于控制器中的所有路由
3. **路由中间件**：仅应用于特定路由

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
  },
  onRequest: async (request, reply) => {
    // 自定义钩子
  }
})
async getUsers(ctx: RouteContext) {
  // ...
}
```

## 与Stratix框架集成

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

然后在Stratix应用程序中注册此插件：

```typescript
import { createApp } from '@stratix/core';
import webPlugin from './plugins/web.js';

const app = createApp();
app.use(webPlugin);
await app.start();
```

## 可用的HTTP方法装饰器

- `@Get(path, options?, middleware?)`
- `@Post(path, options?, middleware?)`
- `@Put(path, options?, middleware?)`
- `@Delete(path, options?, middleware?)`
- `@Patch(path, options?, middleware?)`
- `@Options(path, options?, middleware?)`
- `@Head(path, options?, middleware?)`

## 路由上下文

每个路由处理函数都接收一个`RouteContext`对象，包含以下属性：

- `request`：Fastify请求对象
- `reply`：Fastify响应对象
- `server`：Fastify服务器实例

## 插件生态系统

`@stratix/web`支持Fastify的整个插件生态系统。您可以在[Fastify生态系统页面](https://fastify.dev/ecosystem/)上查找可用的插件。 