# Stratix核心插件设计

## 1. 核心插件概述

Stratix框架提供了一系列核心插件，为应用开发提供基础功能。这些插件遵循Stratix的插件设计规范，并基于Fastify的插件系统实现。

### 1.1 插件接口定义

所有Stratix插件都应遵循以下接口定义：

```typescript
interface StratixPlugin<TOptions = any> {
  name: string;                             // 插件名称
  dependencies?: string[];                  // 依赖的其他插件
  optionalDependencies?: string[];          // 可选依赖
  register: PluginRegisterFn<TOptions>;     // 注册函数
  decorations?: Record<string, any>;        // 添加到应用实例的装饰器
  schema?: JSONSchema;                      // 配置验证schema
}

// 注册函数类型
type PluginRegisterFn<TOptions = any> = (
  app: StratixApp,                          // 应用实例
  options: TOptions                         // 插件配置
) => Promise<void> | void;

// 插件工厂函数类型
type PluginFactory<TOptions = any> = (
  factoryOptions?: any                      // 工厂配置
) => StratixPlugin<TOptions>;
```

### 1.2 插件开发流程

开发Stratix插件的标准流程：

1. **创建插件结构**：定义插件名称、依赖关系和配置schema
2. **实现核心功能**：开发插件的主要功能
3. **添加装饰器**：向应用实例添加API
4. **注册钩子**：处理生命周期事件
5. **处理错误**：确保错误得到正确处理
6. **清理资源**：在关闭时释放资源

## 2. Web插件设计

### 2.1 基本介绍

Web插件(`@stratix/web`)是Stratix框架中用于创建HTTP/HTTPS服务的插件。它基于Fastify的HTTP服务器实现，提供路由定义、中间件管理、请求处理等功能。

### 2.2 配置选项

```typescript
interface WebPluginOptions {
  port?: number;                // 服务器端口，默认3000
  host?: string;                // 服务器主机，默认'localhost'
  https?: {                     // HTTPS配置
    key: string | Buffer;
    cert: string | Buffer;
    // 其他HTTPS选项...
  };
  cors?: boolean | CorsOptions; // CORS配置
  compression?: boolean | CompressionOptions; // 压缩配置
  swagger?: boolean | SwaggerOptions; // Swagger配置
  routes?: RouteDefinitions;    // 路由配置
  middlewares?: MiddlewareDefinitions; // 中间件配置
  hooks?: RouterHookDefinitions; // 路由钩子配置
}
```

### 2.3 使用示例

```typescript
// 基本使用
app.register(require('@stratix/web'), {
  port: 3000,
  host: '0.0.0.0',
  cors: true,
  compression: true
});

// Web插件实现示例
const webPlugin: StratixPlugin<WebPluginOptions> = {
  name: 'web',
  dependencies: ['core'],
  optionalDependencies: ['logger'],
  register: async (app, options) => {
    const { 
      port = 3000, 
      host = 'localhost', 
      routes = {} 
    } = options;
    
    // 获取或创建Fastify实例
    const fastify = app.fastify || require('fastify')();
    
    // 配置插件
    if (options.cors) {
      await fastify.register(require('@fastify/cors'), 
        typeof options.cors === 'object' ? options.cors : {});
    }
    
    if (options.compression) {
      await fastify.register(require('@fastify/compress'), 
        typeof options.compression === 'object' ? options.compression : {});
    }
    
    // 注册路由
    registerRoutes(fastify, routes, app);
    
    // 添加装饰器
    app.decorate('web', {
      addRoute: (path, handler, options = {}) => {
        // 实现添加路由...
      },
      addHook: (name, handler) => {
        fastify.addHook(name, handler);
      }
    });
    
    // 启动服务器
    app.hook('afterStart', async () => {
      await fastify.listen({ port, host });
      if (app.hasPlugin('logger')) {
        app.logger.info(`Web服务器启动在 http://${host}:${port}`);
      }
    });
    
    // 关闭服务器
    app.hook('beforeClose', async () => {
      await fastify.close();
    });
  },
  schema: {
    type: 'object',
    properties: {
      port: { type: 'number', minimum: 1, maximum: 65535 },
      host: { type: 'string' },
      cors: { oneOf: [{ type: 'boolean' }, { type: 'object' }] },
      compression: { oneOf: [{ type: 'boolean' }, { type: 'object' }] },
      routes: { type: 'object' }
    }
  }
};

// 配置化路由
app.register(require('@stratix/web'), {
  port: 3000,
  routes: {
    '/api/users': {
      get: async (request, reply) => {
        // 处理获取用户列表请求
        return { users: [] };
      },
      post: {
        handler: async (request, reply) => {
          // 处理创建用户请求
          return { id: 1, ...request.body };
        },
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
      }
    }
  }
});
```

### 2.4 纯配置路由定义

```typescript
// 纯配置路由定义
const app = createApp({
  web: {
    port: 3000,
    routes: {
      '/api': {
        '/users': {
          get: {
            handler: 'userController.getUsers',
            schema: {
              response: {
                200: {
                  type: 'array',
                  items: { $ref: 'User' }
                }
              }
            }
          },
          post: {
            handler: 'userController.createUser',
            schema: {
              body: { $ref: 'CreateUserInput' },
              response: {
                201: { $ref: 'User' }
              }
            }
          },
          '/:id': {
            get: 'userController.getUserById',
            put: 'userController.updateUser',
            delete: 'userController.deleteUser'
          }
        },
        '/auth': {
          '/login': {
            post: 'authController.login'
          },
          '/register': {
            post: 'authController.register'
          }
        }
      }
    }
  }
});
```

## 3. 数据库插件设计

### 3.1 基本介绍

数据库插件(`@stratix/database`)提供数据库连接和ORM功能，基于Knex.js实现，支持多种关系型数据库。

### 3.2 配置选项

```typescript
interface DatabasePluginOptions {
  client: string;               // 数据库类型：postgresql, mysql, sqlite3等
  connection: {                 // 连接配置
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    filename?: string;          // SQLite文件路径
    // 其他连接选项...
  };
  pool?: {                      // 连接池配置
    min?: number;
    max?: number;
  };
  migrations?: {                // 迁移配置
    directory?: string;
    tableName?: string;
  };
  seeds?: {                     // 种子数据配置
    directory?: string;
  };
  models?: ModelDefinitions;    // 模型定义
  debug?: boolean;              // 调试模式
}
```

### 3.3 使用示例

```typescript
// 基本使用
app.register(require('@stratix/database'), {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'my_db',
    user: 'username',
    password: 'password'
  },
  pool: {
    min: 2,
    max: 10
  }
});

// 使用数据库
const db = app.database;
const users = await db('users').select('*');

// 模型定义示例
const databasePlugin: StratixPlugin<DatabasePluginOptions> = {
  name: 'database',
  dependencies: ['core'],
  register: async (app, options) => {
    // 实现数据库连接与初始化...
    
    // 添加装饰器
    app.decorate('database', db);
    
    // 注册关闭钩子
    app.hook('beforeClose', async () => {
      // 关闭数据库连接
      await db.destroy();
    });
  },
  schema: {
    type: 'object',
    required: ['client', 'connection'],
    properties: {
      client: { type: 'string' },
      connection: { type: 'object' }
      // 其他属性...
    }
  }
};
```

## 4. 缓存插件设计

### 4.1 基本介绍

缓存插件(`@stratix/cache`)提供内存缓存和分布式缓存功能，支持多种缓存后端。

### 4.2 配置选项

```typescript
interface CachePluginOptions {
  driver?: 'memory' | 'redis' | 'memcached'; // 缓存驱动，默认memory
  prefix?: string;             // 缓存键前缀
  ttl?: number;                // 默认过期时间(毫秒)
  maxSize?: number;            // 内存缓存最大条目数
  connection?: {               // Redis/Memcached连接配置
    host?: string;
    port?: number;
    password?: string;
    // 其他连接选项...
  };
  serializer?: 'json' | 'msgpack'; // 序列化方式
}
```

### 4.3 使用示例

```typescript
// 基本使用
app.register(require('@stratix/cache'), {
  driver: 'memory',
  ttl: 60000, // 默认60秒
  maxSize: 1000
});

// 缓存插件实现示例
const cachePlugin: StratixPlugin<CachePluginOptions> = {
  name: 'cache',
  optionalDependencies: ['redis'], // 可选依赖Redis插件
  register: (app, options) => {
    const { driver = 'memory', ttl = 60000 } = options;
    
    // 创建缓存实例
    const cache = createCacheProvider(driver, options);
    
    // 添加装饰器
    app.decorate('cache', {
      async get(key) {
        return cache.get(key);
      },
      async set(key, value, expiresIn = ttl) {
        return cache.set(key, value, expiresIn);
      },
      async has(key) {
        return cache.has(key);
      },
      async delete(key) {
        return cache.delete(key);
      },
      async clear() {
        return cache.clear();
      }
    });
    
    // 注册关闭钩子
    app.hook('beforeClose', async () => {
      await cache.close();
    });
  },
  schema: {
    type: 'object',
    properties: {
      driver: { type: 'string', enum: ['memory', 'redis', 'memcached'] },
      ttl: { type: 'number', minimum: 0 },
      maxSize: { type: 'number', minimum: 1 }
      // 其他属性...
    }
  }
};
```

## 5. 队列插件设计

### 5.1 基本介绍

队列插件(`@stratix/queue`)提供任务队列功能，支持延迟任务、重试机制和分布式队列。

### 5.2 配置选项

```typescript
interface QueuePluginOptions {
  driver?: 'memory' | 'redis' | 'rabbitmq'; // 队列驱动
  connection?: {                            // 连接配置
    host?: string;
    port?: number;
    // 其他连接选项...
  };
  queues?: {                                // 队列定义
    [name: string]: {
      concurrency?: number;                 // 并发处理数
      maxRetries?: number;                  // 最大重试次数
      retryDelay?: number | ((attempts: number) => number); // 重试延迟
      timeout?: number;                     // 任务超时时间
      processors?: Record<string, JobProcessor>; // 任务处理函数
    };
  };
  defaultQueue?: string;                     // 默认队列名
}
```

### 5.3 使用示例

```typescript
// 基本使用
app.register(require('@stratix/queue'), {
  driver: 'redis',
  connection: {
    host: 'localhost',
    port: 6379
  },
  queues: {
    default: {
      concurrency: 5,
      maxRetries: 3
    },
    emails: {
      concurrency: 10,
      processors: {
        sendWelcomeEmail: async (job) => {
          // 发送欢迎邮件
          const { to, name } = job.data;
          // 处理逻辑...
        }
      }
    }
  }
});

// 使用队列
const queue = app.queue;

// 添加任务
await queue.add('emails', 'sendWelcomeEmail', {
  to: 'user@example.com',
  name: 'John'
});

// 添加延迟任务
await queue.add('default', 'processPayment', {
  orderId: 123,
  amount: 99.99
}, {
  delay: 60000 // 60秒后处理
});
```

## 6. 日志插件设计

### 6.1 基本介绍

日志插件(`@stratix/logger`)提供应用日志记录功能，支持多种输出格式和目标。

### 6.2 配置选项

```typescript
interface LoggerPluginOptions {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'; // 日志级别
  prettyPrint?: boolean;                     // 美化输出
  redact?: string[];                         // 需要隐藏的敏感字段
  destination?: string | NodeJS.WritableStream; // 日志输出目标
  transport?: TransportOptions;              // 传输配置
  serializers?: Record<string, Serializer>;  // 自定义序列化器
  timestamp?: boolean | (() => string);      // 时间戳格式
  loggers?: {                                // 子日志器配置
    [name: string]: Omit<LoggerPluginOptions, 'loggers'>;
  };
}
```

### 6.3 使用示例

```typescript
// 基本使用
app.register(require('@stratx/logger'), {
  level: 'info',
  prettyPrint: process.env.NODE_ENV === 'development',
  redact: ['password', 'token', 'secret'],
  timestamp: true
});

// 使用日志
const logger = app.logger;

logger.info('Application started');
logger.debug({ data: { userId: 123 } }, 'User data');
logger.error(new Error('Something went wrong'), 'Error occurred');

// 子日志器
const dbLogger = logger.child({ module: 'database' });
dbLogger.info('Database connected');

// 文件输出
app.register(require('@stratix/logger'), {
  destination: './logs/app.log',
  transport: {
    targets: [
      { level: 'info', target: 'pino/file', options: { destination: './logs/app.log' } },
      { level: 'error', target: 'pino/file', options: { destination: './logs/error.log' } }
    ]
  }
});
```

## 7. 使用示例

### 7.1 基础Web服务示例

```typescript
// app.js
import { createApp } from 'stratix';
import webPlugin from '@stratix/web';
import databasePlugin from '@stratix/database';
import cachePlugin from '@stratix/cache';

const app = createApp({
  name: 'my-api',
  logger: {
    level: 'info'
  }
});

// 注册插件
app.register(webPlugin, {
  port: 3000,
  cors: true
})
.register(databasePlugin, {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'my_db',
    user: 'postgres',
    password: 'postgres'
  }
})
.register(cachePlugin, {
  driver: 'redis',
  connection: {
    host: 'localhost',
    port: 6379
  }
});

// 路由定义
app.web.get('/api/users', async (request, reply) => {
  const cachedUsers = await app.cache.get('users');
  if (cachedUsers) return cachedUsers;
  
  const users = await app.database('users').select('*');
  await app.cache.set('users', users, 60000); // 缓存1分钟
  
  return users;
});

// 启动应用
const start = async () => {
  try {
    await app.start();
    app.logger.info(`Server running at http://localhost:3000`);
  } catch (err) {
    app.logger.error(err);
    process.exit(1);
  }
};

start();
```

### 7.2 纯配置API服务示例

```typescript
// config.js
module.exports = {
  name: 'api-service',
  
  // 日志配置
  logger: {
    level: 'info',
    prettyPrint: true
  },
  
  // 数据库配置
  database: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'my_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    }
  },
  
  // Web服务配置
  web: {
    port: process.env.PORT || 3000,
    cors: true,
    routes: {
      '/api': {
        '/users': {
          get: 'userController.getUsers',
          post: 'userController.createUser',
          '/:id': {
            get: 'userController.getUserById',
            put: 'userController.updateUser',
            delete: 'userController.deleteUser'
          }
        },
        '/products': {
          get: 'productController.getProducts',
          post: 'productController.createProduct'
        }
      }
    }
  },
  
  // 控制器定义
  controllers: {
    userController: {
      getUsers: async ({ db, cache }) => {
        const cachedUsers = await cache.get('users');
        if (cachedUsers) return cachedUsers;
        
        const users = await db('users').select('*');
        await cache.set('users', users, 60000);
        return users;
      },
      createUser: async ({ db }, request) => {
        const { name, email } = request.body;
        const [id] = await db('users').insert({ name, email }).returning('id');
        await cache.del('users');
        return { id, name, email };
      }
      // 其他控制器方法...
    },
    productController: {
      // 产品相关控制器...
    }
  }
};

// app.js
import { createApp } from 'stratix';
import config from './config';

const app = createApp(config);

const start = async () => {
  try {
    await app.start();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
``` 