# @stratix/web 插件使用指南

## 1. 概述

`@stratix/web` 是 Stratix 框架的 Web 服务插件，基于 Fastify 构建，提供高性能的 HTTP/HTTPS 服务器功能。该插件支持通过纯配置方式定义路由、中间件和服务器选项，同时提供了灵活的 API 以编程方式构建 Web 应用。

## 2. 安装

```bash
npm install @stratix/web
# 或使用 yarn
yarn add @stratix/web
# 或使用 pnpm
pnpm add @stratix/web
```

## 3. 基本用法

### 3.1 在 Stratix 应用中注册插件

```typescript
import { createApp } from '@stratix/core';
import webPlugin from '@stratix/web';

const app = createApp();

// 注册 Web 插件
app.register(webPlugin, {
  server: {
    port: 3000,
    host: 'localhost'
  }
});

// 启动应用
await app.start();
```

### 3.2 通过配置文件

```typescript
// stratix.config.js
export default {
  name: 'my-app',
  plugins: {
    web: {
      server: {
        port: 3000,
        host: 'localhost'
      },
      routes: {
        '/hello': {
          get: async () => {
            return { message: 'Hello World!' };
          }
        }
      }
    }
  }
};

// index.js
import { createAppFromConfig } from '@stratix/core';

const app = await createAppFromConfig('./stratix.config.js');
await app.start();
```

## 4. 配置选项

### 4.1 服务器配置

```typescript
{
  server: {
    port: 3000,                     // 服务器端口，默认 3000
    host: 'localhost',              // 主机地址，默认 'localhost'
    logger: true,                   // 启用日志，可以是布尔值或日志配置对象
    https: {                        // HTTPS 配置（可选）
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem')
    },
    watch: true,                    // 文件监视（开发模式）
    ignoreTrailingSlash: true,      // 忽略末尾斜杠
    caseSensitive: false            // 路由大小写敏感
  }
}
```

### 4.2 路由配置

```typescript
{
  routes: {
    prefix: '/api',                 // 全局路由前缀
    
    // 声明式路由定义
    '/users': {
      get: async (ctx) => {
        // 获取用户列表
        return { users: [] };
      },
      post: {
        handler: async (ctx) => {
          // 创建用户
          return { id: 1, ...ctx.request.body };
        },
        schema: {
          body: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' }
            }
          }
        }
      },
      '/:id': {
        get: async (ctx) => {
          // 获取特定用户
          return { id: ctx.request.params.id };
        },
        put: async (ctx) => {
          // 更新用户
        },
        delete: async (ctx) => {
          // 删除用户
        }
      }
    },
    
    // 对象方式指定路由
    '/products': {
      get: 'productController.getProducts',
      post: 'productController.createProduct'
    }
  },
  
  // 控制器实现
  controllers: {
    productController: {
      getProducts: async (ctx) => {
        // 获取产品列表
        return { products: [] };
      },
      createProduct: async (ctx) => {
        // 创建产品
        return { id: 1, ...ctx.request.body };
      }
    }
  }
}
```

### 4.3 中间件配置

```typescript
{
  middleware: {
    // 全局中间件
    global: [
      'requestLogger',              // 内置中间件名称
      async (ctx, next) => {        // 自定义中间件函数
        const start = Date.now();
        await next();
        const ms = Date.now() - start;
        ctx.reply.header('X-Response-Time', `${ms}ms`);
      }
    ],
    
    // 路由级中间件
    route: {
      '/admin/*': ['authMiddleware', 'loggerMiddleware'],
      '/api/users': ['rateLimiter']
    }
  },
  
  // 中间件实现
  middlewares: {
    authMiddleware: async (ctx, next) => {
      const token = ctx.request.headers.authorization;
      if (!token) {
        ctx.reply.code(401).send({ error: '未授权' });
        return;
      }
      await next();
    },
    requestLogger: async (ctx, next) => {
      console.log(`${ctx.request.method} ${ctx.request.url}`);
      await next();
    }
  }
}
```

### 4.4 Fastify 插件配置

```typescript
{
  plugins: [
    // 字符串形式 - 使用默认配置
    '@fastify/cors',
    
    // 对象形式，带配置
    { 
      name: '@fastify/jwt', 
      options: {
        secret: 'your-secret-key'
      }
    },
    
    // 禁用插件
    { 
      name: '@fastify/rate-limit', 
      enabled: false 
    }
  ]
}
```

### 4.5 其他配置选项

```typescript
{
  // 静态文件服务
  static: {
    root: './public',               // 静态文件根目录
    prefix: '/static/'              // URL 前缀
  },
  
  // CORS 配置
  cors: true,                       // 启用 CORS，可以是布尔值或配置对象
  
  // 压缩配置
  compression: true,                // 启用压缩，可以是布尔值或配置对象
  
  // Swagger 文档
  swagger: {
    routePrefix: '/documentation',
    swagger: {
      info: {
        title: 'API Documentation',
        version: '1.0.0'
      }
    },
    exposeRoute: true
  },
  
  // 错误处理
  errorHandler: (error, request, reply) => {
    reply.code(500).send({
      status: 'error',
      message: error.message
    });
  },
  
  // 健康检查
  healthCheck: {
    path: '/health',
    handler: async () => ({
      status: 'ok',
      uptime: process.uptime()
    })
  }
}
```

## 5. 编程式 API

除了通过配置创建应用，`@stratix/web` 还提供了编程式 API，方便在代码中动态定义路由和中间件。

### 5.1 路由定义

```typescript
// 获取web插件实例
const web = app.web;

// 添加GET路由
web.router.get('/users', async (ctx) => {
  // 处理函数
  return { users: [] };
});

// 添加POST路由带参数验证
web.router.post('/users', async (ctx) => {
  const user = ctx.request.body;
  // 创建用户...
  return { id: 1, ...user };
}, {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      }
    }
  }
});

// 添加路由参数
web.router.get('/users/:id', async (ctx) => {
  const userId = ctx.request.params.id;
  // 获取用户...
  return { id: userId, name: 'John Doe' };
});

// 添加多个HTTP方法
web.router.register(['PUT', 'PATCH'], '/users/:id', async (ctx) => {
  const userId = ctx.request.params.id;
  const userData = ctx.request.body;
  // 更新用户...
  return { id: userId, ...userData };
});
```

### 5.2 路由分组

```typescript
// 创建路由分组
web.router.group('/api', (router) => {
  // 分组内的所有路由将以/api为前缀
  router.get('/users', getUsersHandler);
  router.post('/users', createUserHandler);
  
  // 嵌套分组
  router.group('/admin', (adminRouter) => {
    // 路由前缀为/api/admin
    adminRouter.get('/stats', getStatsHandler);
    adminRouter.get('/users', getAdminUsersHandler);
  });
});
```

### 5.3 中间件使用

```typescript
// 全局中间件
web.middleware.use(async (ctx, next) => {
  console.log(`请求开始: ${ctx.request.method} ${ctx.request.url}`);
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`请求结束: ${ctx.request.method} ${ctx.request.url} - ${ms}ms`);
});

// 为特定路由添加中间件
web.middleware.forRoute('/api/admin/*', async (ctx, next) => {
  // 检查管理员权限
  if (!isAdmin(ctx.request)) {
    ctx.reply.code(403).send({ error: '拒绝访问' });
    return;
  }
  await next();
});

// 中间件组合
const authAndLogMiddleware = web.middleware.compose([
  authMiddleware,
  loggingMiddleware
]);

web.middleware.forRoute('/api/protected/*', authAndLogMiddleware);
```

### 5.4 生命周期钩子

```typescript
// 服务器启动前
web.server.onStart(async () => {
  console.log('Web服务器即将启动...');
  // 执行初始化操作...
});

// 服务器启动后
app.hook('afterStart', async () => {
  const address = web.server.address();
  console.log(`Web服务器已启动在 http://${address.address}:${address.port}`);
});

// 服务器关闭前
web.server.onStop(async () => {
  console.log('Web服务器即将关闭...');
  // 执行清理操作...
});

// 请求生命周期钩子
web.hooks.onRequest(async (request, reply) => {
  // 每个请求到达时执行
});

web.hooks.preHandler(async (request, reply) => {
  // 路由处理函数执行前执行
});

web.hooks.onResponse(async (request, reply) => {
  // 响应发送后执行
});
```

### 5.5 错误处理

```typescript
// 全局错误处理
web.setErrorHandler((error, request, reply) => {
  app.logger.error(error);
  
  // 根据错误类型返回适当的响应
  if (error.validation) {
    reply.code(400).send({
      status: 'error',
      message: '验证失败',
      errors: error.validation
    });
    return;
  }
  
  // 默认服务器错误
  reply.code(500).send({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message
  });
});

// 自定义错误
class AppError extends Error {
  constructor(message, public statusCode = 400, public data = {}) {
    super(message);
    this.name = 'AppError';
  }
}

// 在路由处理函数中抛出错误
web.router.get('/items/:id', async (ctx) => {
  const item = await findItem(ctx.request.params.id);
  if (!item) {
    throw new AppError('未找到项目', 404);
  }
  return item;
});
```

## 6. 高级功能

### 6.1 Schema 验证和序列化

```typescript
// 定义可重用的Schema
web.addSchema({
  $id: 'User',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['user', 'admin'] }
  },
  required: ['id', 'name', 'email']
});

web.addSchema({
  $id: 'CreateUserInput',
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 }
  },
  required: ['name', 'email', 'password']
});

// 在路由中使用Schema引用
web.router.post('/users', createUserHandler, {
  schema: {
    body: { $ref: 'CreateUserInput' },
    response: {
      201: { $ref: 'User' }
    }
  }
});
```

### 6.2 WebSocket 支持

```typescript
// 基本的WebSocket服务器
app.register(webPlugin, {
  websocket: {
    path: '/ws',
    handler: (connection, request) => {
      console.log('客户端已连接');
      
      connection.socket.on('message', (message) => {
        console.log(`收到消息: ${message}`);
        
        // 回复消息
        connection.socket.send(`服务器收到: ${message}`);
      });
      
      connection.socket.on('close', () => {
        console.log('客户端已断开连接');
      });
    }
  }
});

// 实时聊天示例
app.register(webPlugin, {
  websocket: {
    path: '/chat',
    handler: (connection, request) => {
      const clients = app.web.websocket.clients;
      const clientId = request.id;
      
      // 广播消息给所有客户端
      function broadcast(message, sender) {
        clients.forEach(client => {
          if (client.id !== sender) {
            client.socket.send(message);
          }
        });
      }
      
      // 当收到消息时
      connection.socket.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          broadcast(JSON.stringify({
            type: 'message',
            user: data.user,
            text: data.text,
            time: new Date()
          }), clientId);
        } catch (e) {
          connection.socket.send(JSON.stringify({
            type: 'error',
            message: '无效的消息格式'
          }));
        }
      });
    }
  }
});
```

### 6.3 文件上传

```typescript
// 配置文件上传插件
app.register(webPlugin, {
  plugins: [
    {
      name: '@fastify/multipart',
      options: {
        limits: {
          fileSize: 1000000, // 1MB
          files: 1           // 最多1个文件
        }
      }
    }
  ]
});

// 处理文件上传
web.router.post('/upload', async (ctx) => {
  const data = await ctx.request.file();
  
  // 保存文件
  const path = `./uploads/${data.filename}`;
  await fs.promises.writeFile(path, await data.toBuffer());
  
  return {
    success: true,
    filename: data.filename,
    mimetype: data.mimetype,
    size: data.file.bytesRead
  };
});
```

### 6.4 身份验证与授权

```typescript
// 配置JWT插件
app.register(webPlugin, {
  plugins: [
    {
      name: '@fastify/jwt',
      options: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        sign: {
          expiresIn: '1h'
        }
      }
    }
  ]
});

// 登录路由
web.router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body;
  
  // 验证用户凭据
  const user = await validateUser(username, password);
  if (!user) {
    ctx.reply.code(401);
    return { error: '无效的用户名或密码' };
  }
  
  // 生成token
  const token = ctx.server.jwt.sign({ 
    id: user.id,
    role: user.role
  });
  
  return { token };
});

// JWT验证中间件
const authMiddleware = async (ctx, next) => {
  try {
    await ctx.request.jwtVerify();
    await next();
  } catch (err) {
    ctx.reply.code(401).send({ error: '未授权' });
  }
};

// 授权中间件
const adminOnlyMiddleware = async (ctx, next) => {
  if (ctx.request.user.role !== 'admin') {
    ctx.reply.code(403).send({ error: '禁止访问' });
    return;
  }
  await next();
};

// 受保护的路由
web.router.group('/api', (router) => {
  // 登录后才能访问的路由
  router.group('/user', (userRouter) => {
    userRouter.use(authMiddleware);
    
    userRouter.get('/profile', getUserProfileHandler);
    userRouter.put('/profile', updateUserProfileHandler);
  });
  
  // 仅管理员可访问的路由
  router.group('/admin', (adminRouter) => {
    adminRouter.use(authMiddleware);
    adminRouter.use(adminOnlyMiddleware);
    
    adminRouter.get('/users', getAllUsersHandler);
    adminRouter.delete('/users/:id', deleteUserHandler);
  });
});
```

### 6.5 API 文档生成

```typescript
app.register(webPlugin, {
  swagger: {
    routePrefix: '/docs',
    swagger: {
      info: {
        title: 'API文档',
        description: '应用API完整文档',
        version: '1.0.0',
        contact: {
          name: '技术支持',
          email: 'support@example.com'
        }
      },
      host: 'api.example.com',
      schemes: ['https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: '用户', description: '用户管理接口' },
        { name: '产品', description: '产品管理接口' }
      ],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    },
    exposeRoute: true,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
  }
});

// 在路由中添加标签和描述
web.router.get('/users', getUsersHandler, {
  schema: {
    tags: ['用户'],
    summary: '获取所有用户',
    description: '返回系统中的所有用户列表',
    response: {
      200: {
        description: '成功响应',
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: { $ref: 'User' }
          }
        }
      }
    }
  }
});
```

## 7. 最佳实践

### 7.1 项目结构

推荐的项目结构：

```
my-app/
├── src/
│   ├── controllers/         # 控制器目录
│   │   ├── user.controller.ts
│   │   └── product.controller.ts
│   ├── middlewares/         # 中间件目录
│   │   ├── auth.middleware.ts
│   │   └── logger.middleware.ts
│   ├── services/            # 业务逻辑目录
│   │   ├── user.service.ts
│   │   └── product.service.ts
│   ├── models/              # 数据模型目录
│   │   ├── user.model.ts
│   │   └── product.model.ts
│   ├── schemas/             # JSON Schema目录
│   │   ├── user.schema.ts
│   │   └── product.schema.ts
│   ├── routes/              # 路由定义目录
│   │   ├── user.routes.ts
│   │   └── product.routes.ts
│   ├── utils/               # 工具函数目录
│   │   ├── errors.ts
│   │   └── validation.ts
│   ├── config.ts            # 配置文件
│   └── app.ts               # 应用入口
├── public/                  # 静态文件目录
├── test/                    # 测试目录
├── .env                     # 环境变量
└── package.json
```

### 7.2 性能优化

- 使用Schema验证和序列化提高性能
- 启用压缩以减少传输数据量
- 使用缓存控制头部优化静态资源
- 避免在请求处理过程中进行阻塞操作
- 使用连接池管理数据库连接
- 适当设置服务器超时和保持连接选项

### 7.3 安全最佳实践

- 始终使用HTTPS在生产环境中
- 实施适当的CORS策略
- 验证和清理所有用户输入
- 使用身份验证和授权保护敏感路由
- 实施速率限制防止暴力攻击
- 避免在响应中泄露敏感信息
- 定期更新依赖以修复安全漏洞

### 7.4 错误处理

- 创建集中式错误处理机制
- 使用自定义错误类型区分不同的错误
- 在生产环境中隐藏详细的错误信息
- 记录所有服务器错误以便调试
- 为API错误提供一致的响应格式

### 7.5 测试策略

- 为每个路由编写单元测试
- 使用模拟对象隔离依赖
- 编写集成测试验证完整的请求流程
- 进行性能和负载测试
- 使用测试覆盖率工具确保代码质量

### 7.6 高级功能

#### 7.6.1 文件上传

```typescript
// 配置文件上传插件
app.register(webPlugin, {
  plugins: [
    {
      name: '@fastify/multipart',
      options: {
        limits: {
          fileSize: 1000000, // 1MB
          files: 1           // 最多1个文件
        }
      }
    }
  ]
});

// 处理文件上传
web.router.post('/upload', async (ctx) => {
  const data = await ctx.request.file();
  
  // 保存文件
  const path = `./uploads/${data.filename}`;
  await fs.promises.writeFile(path, await data.toBuffer());
  
  return {
    success: true,
    filename: data.filename,
    mimetype: data.mimetype,
    size: data.file.bytesRead
  };
});
```

#### 7.6.2 身份验证与授权

```typescript
// 配置JWT插件
app.register(webPlugin, {
  plugins: [
    {
      name: '@fastify/jwt',
      options: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        sign: {
          expiresIn: '1h'
        }
      }
    }
  ]
});

// 登录路由
web.router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body;
  
  // 验证用户凭据
  const user = await validateUser(username, password);
  if (!user) {
    ctx.reply.code(401);
    return { error: '无效的用户名或密码' };
  }
  
  // 生成token
  const token = ctx.server.jwt.sign({ 
    id: user.id,
    role: user.role
  });
  
  return { token };
});

// JWT验证中间件
const authMiddleware = async (ctx, next) => {
  try {
    await ctx.request.jwtVerify();
    await next();
  } catch (err) {
    ctx.reply.code(401).send({ error: '未授权' });
  }
};

// 授权中间件
const adminOnlyMiddleware = async (ctx, next) => {
  if (ctx.request.user.role !== 'admin') {
    ctx.reply.code(403).send({ error: '禁止访问' });
    return;
  }
  await next();
};

// 受保护的路由
web.router.group('/api', (router) => {
  // 登录后才能访问的路由
  router.group('/user', (userRouter) => {
    userRouter.use(authMiddleware);
    
    userRouter.get('/profile', getUserProfileHandler);
    userRouter.put('/profile', updateUserProfileHandler);
  });
  
  // 仅管理员可访问的路由
  router.group('/admin', (adminRouter) => {
    adminRouter.use(authMiddleware);
    adminRouter.use(adminOnlyMiddleware);
    
    adminRouter.get('/users', getAllUsersHandler);
    adminRouter.delete('/users/:id', deleteUserHandler);
  });
});
```

#### 7.6.3 API 文档生成

```typescript
app.register(webPlugin, {
  swagger: {
    routePrefix: '/docs',
    swagger: {
      info: {
        title: 'API文档',
        description: '应用API完整文档',
        version: '1.0.0',
        contact: {
          name: '技术支持',
          email: 'support@example.com'
        }
      },
      host: 'api.example.com',
      schemes: ['https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: '用户', description: '用户管理接口' },
        { name: '产品', description: '产品管理接口' }
      ],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    },
    exposeRoute: true,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
  }
});

// 在路由中添加标签和描述
web.router.get('/users', getUsersHandler, {
  schema: {
    tags: ['用户'],
    summary: '获取所有用户',
    description: '返回系统中的所有用户列表',
    response: {
      200: {
        description: '成功响应',
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: { $ref: 'User' }
          }
        }
      }
    }
  }
});
```

## 8. 最佳实践

### 8.1 项目结构

推荐的项目结构：

```
my-app/
├── src/
│   ├── controllers/         # 控制器目录
│   │   ├── user.controller.ts
│   │   └── product.controller.ts
│   ├── middlewares/         # 中间件目录
│   │   ├── auth.middleware.ts
│   │   └── logger.middleware.ts
│   ├── services/            # 业务逻辑目录
│   │   ├── user.service.ts
│   │   └── product.service.ts
│   ├── models/              # 数据模型目录
│   │   ├── user.model.ts
│   │   └── product.model.ts
│   ├── schemas/             # JSON Schema目录
│   │   ├── user.schema.ts
│   │   └── product.schema.ts
│   ├── routes/              # 路由定义目录
│   │   ├── user.routes.ts
│   │   └── product.routes.ts
│   ├── utils/               # 工具函数目录
│   │   ├── errors.ts
│   │   └── validation.ts
│   ├── config.ts            # 配置文件
│   └── app.ts               # 应用入口
├── public/                  # 静态文件目录
├── test/                    # 测试目录
├── .env                     # 环境变量
└── package.json
```

### 8.2 性能优化

- 使用Schema验证和序列化提高性能
- 启用压缩以减少传输数据量
- 使用缓存控制头部优化静态资源
- 避免在请求处理过程中进行阻塞操作
- 使用连接池管理数据库连接
- 适当设置服务器超时和保持连接选项

### 8.3 安全最佳实践

- 始终使用HTTPS在生产环境中
- 实施适当的CORS策略
- 验证和清理所有用户输入
- 使用身份验证和授权保护敏感路由
- 实施速率限制防止暴力攻击
- 避免在响应中泄露敏感信息
- 定期更新依赖以修复安全漏洞

### 8.4 错误处理

- 创建集中式错误处理机制
- 使用自定义错误类型区分不同的错误
- 在生产环境中隐藏详细的错误信息
- 记录所有服务器错误以便调试
- 为API错误提供一致的响应格式

### 8.5 测试策略

- 为每个路由编写单元测试
- 使用模拟对象隔离依赖
- 编写集成测试验证完整的请求流程
- 进行性能和负载测试
- 使用测试覆盖率工具确保代码质量

### 8.6 高级功能

#### 8.6.1 文件上传

```typescript
// 配置文件上传插件
app.register(webPlugin, {
  plugins: [
    {
      name: '@fastify/multipart',
      options: {
        limits: {
          fileSize: 1000000, // 1MB
          files: 1           // 最多1个文件
        }
      }
    }
  ]
});

// 处理文件上传
web.router.post('/upload', async (ctx) => {
  const data = await ctx.request.file();
  
  // 保存文件
  const path = `./uploads/${data.filename}`;
  await fs.promises.writeFile(path, await data.toBuffer());
  
  return {
    success: true,
    filename: data.filename,
    mimetype: data.mimetype,
    size: data.file.bytesRead
  };
});
```

#### 8.6.2 身份验证与授权

```typescript
// 配置JWT插件
app.register(webPlugin, {
  plugins: [
    {
      name: '@fastify/jwt',
      options: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        sign: {
          expiresIn: '1h'
        }
      }
    }
  ]
});

// 登录路由
web.router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body;
  
  // 验证用户凭据
  const user = await validateUser(username, password);
  if (!user) {
    ctx.reply.code(401);
    return { error: '无效的用户名或密码' };
  }
  
  // 生成token
  const token = ctx.server.jwt.sign({ 
    id: user.id,
    role: user.role
  });
  
  return { token };
});

// JWT验证中间件
const authMiddleware = async (ctx, next) => {
  try {
    await ctx.request.jwtVerify();
    await next();
  } catch (err) {
    ctx.reply.code(401).send({ error: '未授权' });
  }
};

// 授权中间件
const adminOnlyMiddleware = async (ctx, next) => {
  if (ctx.request.user.role !== 'admin') {
    ctx.reply.code(403).send({ error: '禁止访问' });
    return;
  }
  await next();
};

// 受保护的路由
web.router.group('/api', (router) => {
  // 登录后才能访问的路由
  router.group('/user', (userRouter) => {
    userRouter.use(authMiddleware);
    
    userRouter.get('/profile', getUserProfileHandler);
    userRouter.put('/profile', updateUserProfileHandler);
  });
  
  // 仅管理员可访问的路由
  router.group('/admin', (adminRouter) => {
    adminRouter.use(authMiddleware);
    adminRouter.use(adminOnlyMiddleware);
    
    adminRouter.get('/users', getAllUsersHandler);
    adminRouter.delete('/users/:id', deleteUserHandler);
  });
});
```

#### 8.6.3 API 文档生成

```typescript
app.register(webPlugin, {
  swagger: {
    routePrefix: '/docs',
    swagger: {
      info: {
        title: 'API文档',
        description: '应用API完整文档',
        version: '1.0.0',
        contact: {
          name: '技术支持',
          email: 'support@example.com'
        }
      },
      host: 'api.example.com',
      schemes: ['https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: '用户', description: '用户管理接口' },
        { name: '产品', description: '产品管理接口' }
      ],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    },
    exposeRoute: true,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
  }
});

// 在路由中添加标签和描述
web.router.get('/users', getUsersHandler, {
  schema: {
    tags: ['用户'],
    summary: '获取所有用户',
    description: '返回系统中的所有用户列表',
    response: {
      200: {
        description: '成功响应',
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: { $ref: 'User' }
          }
        }
      }
    }
  }
});
``` 