# @stratix/web 插件使用指南

@stratix/web 插件基于 Fastify 提供了 Web 服务能力，支持通过配置文件动态加载常用功能，例如 CORS、静态文件服务、压缩、安全头等。本文档详细介绍如何配置和使用 @stratix/web 插件。

## 1. 基本配置

在 `stratix.config.ts` 中配置 web 插件：

```typescript
import { defineConfig } from '@stratix/core';

export default defineConfig({
  app: {
    name: 'my-api',
    version: '1.0.0'
  },
  plugins: {
    '@stratix/web': {
      port: 3000,
      host: '0.0.0.0',
      prefix: '/api',
      cors: true
    }
  }
});
```

## 2. 完整配置选项

@stratix/web 插件支持丰富的配置选项：

```typescript
plugins: {
  '@stratix/web': {
    // 基本服务器配置
    port: 3000,                // 监听端口
    host: '0.0.0.0',           // 监听主机
    prefix: '/api',            // API前缀
    trustProxy: true,          // 信任代理
    requestTimeout: 30000,     // 请求超时时间(ms)
    bodyLimit: 1048576,        // 请求正文大小限制(1MB)
    
    // CORS配置
    cors: {
      origin: ['https://example.com'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    
    // 静态文件服务
    static: {
      enabled: true,
      root: './public',
      prefix: '/assets',
      decorateReply: true,
      options: {
        index: false
      }
    },
    
    // 安全头配置
    helmet: {
      enabled: true,
      options: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"]
          }
        }
      }
    },
    
    // 响应压缩配置
    compress: {
      enabled: true,
      options: {
        global: true,
        threshold: 1024
      }
    },
    
    // Cookie支持
    cookie: {
      enabled: true,
      secret: 'my-secret-key',
      options: {
        path: '/'
      }
    },
    
    // 自定义Fastify插件
    plugins: [
      ['@fastify/multipart', { limits: { fileSize: 5 * 1024 * 1024 } }],
      ['@fastify/rate-limit', { max: 100, timeWindow: '1 minute' }]
    ],
    
    // 预定义路由
    routes: [
      {
        method: 'GET',
        path: '/status',
        handler: async (request, reply) => {
          return { status: 'ok', version: '1.0.0' };
        }
      },
      {
        method: 'POST',
        path: '/users',
        handler: async (request, reply) => {
          return { success: true, id: '123' };
        },
        schema: {
          body: {
            type: 'object',
            required: ['name', 'email'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          },
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                id: { type: 'string' }
              }
            }
          }
        }
      }
    ]
  }
}
```

## 3. 动态注册路由

除了通过配置文件定义路由外，还可以在代码中动态注册路由：

### 3.1 使用app.route方法

```typescript
import { StratixApp } from '@stratix/core';

export default async function setup(app: StratixApp) {
  // 定义一个路由，完整定义
  app.route({
    method: 'GET',
    path: '/hello',
    handler: async (request, reply) => {
      return { message: 'Hello World' };
    },
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  });
  
  // 使用HTTP方法快捷方式
  app.get('/users', async (request, reply) => {
    return { users: [] };
  });
  
  app.post('/login', async (request, reply) => {
    return { token: 'jwt-token' };
  });
  
  // 链式调用
  app
    .get('/products', getProducts)
    .post('/products', createProduct)
    .put('/products/:id', updateProduct)
    .delete('/products/:id', deleteProduct);
}
```

### 3.2 使用控制器风格组织路由

可以创建专门的控制器文件，组织相关的路由处理程序：

```typescript
// controllers/userController.ts
export default {
  getUsers: async (request, reply) => {
    return { users: [] };
  },
  
  createUser: async (request, reply) => {
    return { id: '123' };
  },
  
  updateUser: async (request, reply) => {
    const { id } = request.params;
    return { id, updated: true };
  },
  
  deleteUser: async (request, reply) => {
    const { id } = request.params;
    return { deleted: true };
  }
};

// 注册控制器
import userController from './controllers/userController';

export default async function setup(app: StratixApp) {
  app
    .get('/users', userController.getUsers)
    .post('/users', userController.createUser)
    .put('/users/:id', userController.updateUser)
    .delete('/users/:id', userController.deleteUser);
}
```

### 3.3 使用前缀分组路由

```typescript
import { StratixApp } from '@stratix/core';

export default async function setup(app: StratixApp) {
  // 获取fastify实例
  const server = app.server;
  
  // 使用前缀分组路由
  server.register(async (fastify) => {
    fastify.get('/list', listUsers);
    fastify.post('/', createUser);
    fastify.get('/:id', getUser);
    fastify.put('/:id', updateUser);
    fastify.delete('/:id', deleteUser);
  }, { prefix: '/users' });
  
  // 或者使用其他分组
  server.register(async (fastify) => {
    fastify.get('/', listProducts);
    fastify.post('/', createProduct);
  }, { prefix: '/products' });
}
```

## 4. 中间件和钩子

Fastify使用钩子（hooks）而不是中间件。可以通过以下方式使用:

```typescript
import { StratixApp } from '@stratix/core';

export default function setup(app: StratixApp) {
  const server = app.server;
  
  // 全局钩子
  server.addHook('onRequest', async (request, reply) => {
    // 在每个请求开始时执行
    request.log.info('收到请求');
  });
  
  server.addHook('onResponse', async (request, reply) => {
    // 在每个响应发送后执行
    request.log.info('请求完成');
  });
  
  // 特定路由的钩子
  server.register(async (fastify) => {
    // 此钩子仅适用于此插件范围内的路由
    fastify.addHook('preHandler', async (request, reply) => {
      // 检查认证
      if (!request.headers.authorization) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    });
    
    fastify.get('/protected', async (request, reply) => {
      return { message: '受保护的资源' };
    });
  }, { prefix: '/admin' });
}
```

## 5. 插件依赖

如果需要确保特定插件按顺序加载，可以使用依赖管理：

```typescript
import { StratixApp } from '@stratix/core';
import fp from 'fastify-plugin';

// 创建鉴权插件
const authPlugin = fp(async (fastify) => {
  // 实现认证逻辑
  fastify.decorate('authenticate', async (request, reply) => {
    if (!request.headers.authorization) {
      reply.code(401).send({ error: 'Unauthorized' });
      return false;
    }
    return true;
  });
}, { name: 'auth-plugin' });

// 依赖鉴权插件的用户插件
const userPlugin = fp(async (fastify) => {
  fastify.get('/users', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      return { users: [] };
    }
  });
}, { 
  name: 'user-plugin',
  dependencies: ['auth-plugin'] 
});

// 在应用中注册
export default function setup(app: StratixApp) {
  const server = app.server;
  
  server.register(authPlugin);
  server.register(userPlugin);
}
```

## 6. 常见问题

### 路由未注册
- 检查路由路径是否与前缀（prefix）冲突
- 确保路由处理函数无语法错误

### 静态文件无法访问
- 检查文件路径是否正确
- 确保静态目录存在且有读取权限
- 检查静态文件的URL前缀是否正确

### CORS问题
- 开发环境设置 `cors: true` 允许所有来源
- 生产环境明确指定 `origin` 白名单
- 启用 `credentials: true` 以支持跨域cookie

### 插件加载失败
- 检查插件是否已安装为依赖
- 确保插件路径正确
- 查看日志中的具体错误信息 