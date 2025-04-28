# @stratix/web 插件详细设计规范

## 1. 插件概述

`@stratix/web` 是 Stratix 框架的核心插件之一，基于 Fastify 实现的高性能 Web 服务组件。该插件提供了完整的 HTTP/HTTPS 服务器功能，包括路由管理、中间件处理、请求验证、响应格式化等核心功能，以函数式和配置化的方式简化 Web 应用开发。

### 1.1 设计目标

- **高性能**：基于 Fastify 的高性能特性，提供卓越的请求处理能力
- **配置驱动**：通过纯配置方式定义路由、中间件和服务器选项
- **函数式设计**：遵循 Stratix 的函数式编程理念
- **类型安全**：提供完整的 TypeScript 类型支持
- **可扩展性**：易于与其他插件集成，支持 Fastify 生态系统
- **简洁直观**：提供简单易用的 API，降低学习曲线

### 1.2 核心特性

- HTTP/HTTPS 服务器创建和管理
- 声明式路由定义
- 中间件系统
- 请求参数验证（基于 JSON Schema）
- 响应序列化和内容协商
- 错误处理机制
- 基于装饰器的控制器支持
- Fastify 插件集成
- 健康检查和监控
- 静态文件服务
- CORS 和安全配置
- WebSocket 支持
- API 文档生成（基于 OpenAPI/Swagger）

## 2. 架构设计

### 2.1 整体架构

`@stratix/web` 插件采用模块化设计，各组件通过明确的接口相互协作：

```
@stratix/web
├── Server        // 服务器核心，管理整个 HTTP 服务器生命周期
├── Router        // 路由系统，处理路由注册和请求分发
├── Middleware    // 中间件系统，管理请求处理管道
├── Controller    // 控制器系统，基于类组织路由处理函数
├── Schema        // 请求验证和响应序列化模式
└── Plugins       // 插件管理系统，集成 Fastify 生态插件
```

### 2.2 组件关系

服务器核心 (Server) 是插件的主体，它创建和管理 Fastify 实例。路由系统 (Router) 负责路径匹配和处理函数调用。中间件系统 (Middleware) 在请求处理过程中提供横切功能。控制器系统 (Controller) 通过装饰器实现声明式路由定义。

### 2.3 请求处理流程

1. 接收 HTTP 请求
2. 执行全局中间件
3. 匹配路由
4. 执行路由中间件
5. 验证请求参数（路径参数、查询参数、请求体）
6. 执行路由处理函数
7. 序列化响应
8. 发送响应

## 3. 核心组件设计

### 3.1 服务器

服务器组件是整个插件的核心，负责管理 Fastify 实例的生命周期：

```typescript
class Server {
  private fastify: FastifyInstance;
  private options: ServerOptions;
  private router: Router;
  private middleware: MiddlewareManager;
  private isStarted: boolean = false;
  
  constructor(fastify: FastifyInstance, options: ServerOptions = {}) {
    this.fastify = fastify;
    this.options = options;
    
    // 应用服务器配置
    this.applyServerOptions();
    
    // 初始化组件
    this.router = new Router(this.fastify);
    this.middleware = new MiddlewareManager(this.fastify);
    
    // 注册插件和中间件
    this.registerPlugins();
    this.registerMiddleware();
  }
  
  public async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }
    
    await this.fastify.listen({
      port: this.options.port || 3000,
      host: this.options.host || 'localhost'
    });
    
    this.isStarted = true;
  }
  
  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }
    
    await this.fastify.close();
    this.isStarted = false;
  }
  
  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }
  
  public onStart(callback: () => Promise<void> | void): void {
    this.fastify.addHook('onReady', callback);
  }
  
  public onStop(callback: () => Promise<void> | void): void {
    this.fastify.addHook('onClose', callback);
  }
  
  public address() {
    return this.fastify.server.address();
  }
  
  public extend(callback: (fastify: FastifyInstance) => void): void {
    callback(this.fastify);
  }
  
  private applyServerOptions(): void {
    // 应用服务器配置到已存在的 Fastify 实例
    if (this.options.logger !== undefined) {
      this.fastify.log = this.options.logger;
    }
    
    if (this.options.ignoreTrailingSlash !== undefined) {
      this.fastify.setIgnoreTrailingSlash(this.options.ignoreTrailingSlash);
    }
    
    if (this.options.caseSensitive !== undefined) {
      this.fastify.setCaseSensitive(this.options.caseSensitive);
    }
    
    // 应用其他相关配置...
  }
  
  private registerPlugins(): void {
    // 注册 Fastify 插件
    if (this.options.plugins) {
      for (const plugin of this.options.plugins) {
        if (typeof plugin === 'string') {
          // 字符串形式 - 使用默认配置
          const pluginModule = require(plugin);
          this.fastify.register(pluginModule);
        } else if (typeof plugin === 'object') {
          // 对象形式，带配置
          if (plugin.enabled !== false) {
            const pluginModule = require(plugin.name);
            this.fastify.register(pluginModule, plugin.options || {});
          }
        }
      }
    }
  }
  
  private registerMiddleware(): void {
    // 注册全局中间件
    if (this.options.middleware?.global) {
      for (const middleware of this.options.middleware.global) {
        this.middleware.use(middleware);
      }
    }
    
    // 注册路由级中间件
    if (this.options.middleware?.route) {
      for (const [path, middlewares] of Object.entries(this.options.middleware.route)) {
        for (const middleware of middlewares) {
          this.middleware.forRoute(path, middleware);
        }
      }
    }
  }
}
```

### 3.2 路由系统

路由系统负责定义和管理 API 路径映射：

```typescript
class Router {
  private fastify: FastifyInstance;
  private routes: Map<string, RouteDefinition>;
  
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.routes = new Map();
  }
  
  public register(method: HttpMethod, path: string, handler: RouteHandler, options?: RouteOptions): void {
    const routeId = `${method}:${path}`;
    
    this.routes.set(routeId, {
      method,
      path,
      handler,
      options
    });
    
    this.fastify.route({
      method,
      url: path,
      handler: async (request, reply) => {
        const ctx = { request, reply, server: this.fastify };
        return await handler(ctx);
      },
      schema: options?.schema,
      // 其他选项
    });
  }
  
  public group(prefix: string, callback: (router: Router) => void): void {
    // 实现路由分组
  }
  
  // 便捷方法
  public get(path: string, handler: RouteHandler, options?: RouteOptions): void {
    this.register('GET', path, handler, options);
  }
  
  public post(path: string, handler: RouteHandler, options?: RouteOptions): void {
    this.register('POST', path, handler, options);
  }
  
  // 其他 HTTP 方法...
}
```

### 3.3 中间件系统

中间件系统提供请求处理管道：

```typescript
class MiddlewareManager {
  private fastify: FastifyInstance;
  private globalMiddleware: Middleware[];
  
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.globalMiddleware = [];
  }
  
  public use(middleware: Middleware): void {
    this.globalMiddleware.push(middleware);
    
    this.fastify.addHook('onRequest', async (request, reply) => {
      await middleware({ request, reply, server: this.fastify });
    });
  }
  
  public forRoute(route: string, middleware: Middleware): void {
    // 添加路由级中间件
  }
}
```

### 3.4 控制器系统

控制器系统提供基于装饰器的路由定义：

```typescript
// 装饰器工厂
function Controller(prefix: string = '', middleware: Middleware[] = []) {
  return function(target: any) {
    Reflect.defineMetadata('prefix', prefix, target);
    Reflect.defineMetadata('middleware', middleware, target);
    
    // 注册控制器到全局注册表
    registerController(target);
  };
}

function Get(path: string, options?: RouteOptions, middleware: Middleware[] = []) {
  return function(target: any, propertyKey: string) {
    const route = {
      method: 'GET',
      path,
      handler: target[propertyKey],
      options,
      middleware
    };
    
    const routes = Reflect.getMetadata('routes', target.constructor) || [];
    routes.push(route);
    Reflect.defineMetadata('routes', routes, target.constructor);
  };
}

// 其他 HTTP 方法装饰器...
```

### 3.5 Schema 验证

基于 JSON Schema 的请求验证系统：

```typescript
interface SchemaOptions {
  body?: JSONSchema;
  querystring?: JSONSchema;
  params?: JSONSchema;
  headers?: JSONSchema;
  response?: {
    [statusCode: number]: JSONSchema;
  };
}

function validateSchema(schema: SchemaOptions) {
  return function(request: FastifyRequest) {
    // 实现请求验证
  };
}
```

## 4. 插件配置选项

`@stratix/web` 插件支持以下配置选项：

```typescript
interface WebPluginOptions {
  // 服务器配置
  server?: {
    port?: number;                    // 服务器端口，默认 3000
    host?: string;                    // 主机地址，默认 'localhost'
    logger?: boolean | LoggerOptions; // 日志配置
    https?: {                         // HTTPS 配置
      key: string | Buffer;
      cert: string | Buffer;
      // 其他 HTTPS 选项
    };
    watch?: boolean;                  // 文件监视（用于开发模式）
    serverFactory?: ServerFactory;    // 自定义服务器工厂
  };
  
  // 路由配置
  routes?: {
    prefix?: string;                  // 全局路由前缀
    definitions?: RouteDefinitions;   // 路由定义
    controllers?: string[] | ControllerOptions; // 控制器配置
  };
  
  // 中间件配置
  middleware?: {
    global?: MiddlewareList;          // 全局中间件
    route?: RouteMiddlewareMap;       // 路由级中间件
  };
  
  // Fastify 插件
  plugins?: Array<string | PluginConfig>; // Fastify 插件列表
  
  // 内容协商
  contentNegotiation?: {
    types?: string[];                 // 支持的内容类型
    languages?: string[];             // 支持的语言
    charsets?: string[];              // 支持的字符集
    encodings?: string[];             // 支持的编码
  };
  
  // 静态文件服务
  static?: {
    root: string;                     // 静态文件根目录
    prefix?: string;                  // URL 前缀
    // 其他静态文件选项
  };
  
  // CORS 配置
  cors?: boolean | CorsOptions;       // CORS 选项
  
  // 压缩配置
  compression?: boolean | CompressionOptions; // 响应压缩选项
  
  // API 文档
  swagger?: boolean | SwaggerOptions; // Swagger 配置
  
  // 错误处理
  errorHandler?: ErrorHandler;        // 自定义错误处理器
  
  // 健康检查
  healthCheck?: {
    path?: string;                    // 健康检查路径
    handler?: HealthCheckHandler;     // 自定义健康检查处理器
  };
  
  // WebSocket 支持
  websocket?: boolean | WebSocketOptions; // WebSocket 配置
}
```

## 5. 公共接口设计

### 5.1 插件注册

作为 Stratix 插件，`@stratix/web` 提供标准的插件注册函数：

```typescript
const webPlugin: StratixPlugin<WebPluginOptions> = {
  name: 'web',
  dependencies: ['core'],
  optionalDependencies: ['logger'],
  register: async (app, options) => {
    // 获取或创建 Fastify 实例
    let fastifyInstance = app.hasDecoration('fastify') 
      ? app.fastify 
      : fastify(createFastifyOptions(options));
      
    // 创建服务器实例
    const server = new Server(fastifyInstance, options.server);
    
    // 注册路由（如果在配置中定义）
    if (options.routes) {
      registerRoutesFromConfig(server.router, options.routes);
    }
    
    // 添加装饰器
    app.decorate('web', {
      server,
      router: server.router,
      middleware: server.middleware,
      addRoute: server.router.register.bind(server.router),
      addMiddleware: server.middleware.use.bind(server.middleware),
      // 其他公共 API
    });
    
    // 注册启动和关闭钩子
    app.hook('beforeStart', async () => {
      await server.start();
    });
    
    app.hook('beforeClose', async () => {
      await server.stop();
    });
  },
  schema: {
    // 配置验证 schema
  }
};

// 辅助函数：从选项创建 Fastify 配置
function createFastifyOptions(options: WebPluginOptions): FastifyServerOptions {
  return {
    logger: options.server?.logger,
    ignoreTrailingSlash: options.server?.ignoreTrailingSlash,
    caseSensitive: options.server?.caseSensitive,
    // 其他 Fastify 选项...
  };
}

// 辅助函数：从配置注册路由
function registerRoutesFromConfig(router: Router, routesConfig: RoutesConfig): void {
  // 实现从配置注册路由的逻辑
}
```

### 5.2 路由 API

```typescript
// 路由注册
app.web.router.get('/users', async (ctx) => {
  // 处理函数
});

app.web.router.post('/users', async (ctx) => {
  // 处理函数
}, {
  schema: {
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' }
      }
    }
  }
});

// 路由分组
app.web.router.group('/api', (router) => {
  router.get('/users', getUsersHandler);
  router.post('/users', createUserHandler);
  
  router.group('/admin', (adminRouter) => {
    adminRouter.get('/stats', getStatsHandler);
  });
});
```

### 5.3 中间件 API

```typescript
// 全局中间件
app.web.middleware.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.reply.header('X-Response-Time', `${ms}ms`);
});

// 路由级中间件
app.web.middleware.forRoute('/admin/*', async (ctx, next) => {
  if (!isAdmin(ctx.request)) {
    ctx.reply.code(403).send({ error: '未授权访问' });
    return;
  }
  await next();
});
```

### 5.4 控制器 API

```typescript
// 基于装饰器的控制器
@Controller('/users')
class UserController {
  @Get('/')
  async getUsers(ctx: RouteContext) {
    return { users: [] };
  }
  
  @Post('/', { schema: { body: { /* schema */ } } })
  async createUser(ctx: RouteContext) {
    return { id: 1, ...ctx.request.body };
  }
  
  @Get('/:id')
  async getUserById(ctx: RouteContext) {
    return { id: ctx.request.params.id, name: 'User' };
  }
}
```

### 5.5 钩子 API

```typescript
// 服务器生命周期钩子
app.web.server.onStart(async () => {
  console.log('服务器已启动');
});

app.web.server.onStop(async () => {
  console.log('服务器已停止');
});

// 请求生命周期钩子
app.web.hooks.onRequest(async (request, reply) => {
  // 请求开始处理
});

app.web.hooks.preHandler(async (request, reply) => {
  // 处理函数执行前
});

app.web.hooks.onResponse(async (request, reply) => {
  // 响应发送后
});
```

## 6. 常见使用场景

### 6.1 基本 HTTP 服务器

```typescript
// 在 Stratix 应用中
app.register(webPlugin, {
  server: {
    port: 3000,
    host: 'localhost',
    logger: true
  }
});

// 添加路由
app.web.router.get('/hello', async () => {
  return { message: 'Hello World' };
});
```

### 6.2 REST API 服务器

```typescript
// 在配置文件中声明
export default {
  web: {
    server: {
      port: 3000
    },
    routes: {
      prefix: '/api',
      '/users': {
        get: 'userController.getUsers',
        post: 'userController.createUser',
        '/:id': {
          get: 'userController.getUserById',
          put: 'userController.updateUser',
          delete: 'userController.deleteUser'
        }
      }
    },
    controllers: {
      userController: {
        getUsers: async () => {
          // 获取用户列表
        },
        createUser: async (ctx) => {
          // 创建用户
        },
        // 其他方法...
      }
    }
  }
};
```

### 6.3 带身份验证的 API

```typescript
app.register(webPlugin, {
  // 服务器配置
  server: {
    port: 3000
  },
  
  // 插件配置
  plugins: [
    '@fastify/jwt'
  ],
  
  // 中间件配置
  middleware: {
    global: ['corsMiddleware', 'requestLogger'],
    route: {
      '/api/protected/*': ['authMiddleware']
    }
  },
  
  // 中间件实现
  middlewares: {
    authMiddleware: async (ctx, next) => {
      try {
        await ctx.request.jwtVerify();
        await next();
      } catch (err) {
        ctx.reply.code(401).send({ error: '未授权' });
      }
    }
  }
});
```

### 6.4 静态文件服务器

```typescript
app.register(webPlugin, {
  server: {
    port: 3000
  },
  static: {
    root: './public',
    prefix: '/static/'
  }
});
```

### 6.5 WebSocket 服务器

```typescript
app.register(webPlugin, {
  server: {
    port: 3000
  },
  websocket: {
    path: '/ws',
    handler: (connection, req) => {
      connection.socket.on('message', (message) => {
        // 处理消息
        connection.socket.send(`Echo: ${message}`);
      });
    }
  }
});
```

## 7. 与其他插件集成

### 7.1 与 @stratix/database 集成

```typescript
app.register(webPlugin, {
  // Web 配置
});

app.register(databasePlugin, {
  // 数据库配置
});

// 在路由处理器中使用数据库
app.web.router.get('/users', async (ctx) => {
  const db = app.database;
  const users = await db.table('users').select('*');
  return { users };
});
```

### 7.2 与 @stratix/cache 集成

```typescript
app.register(webPlugin, {
  // Web 配置
});

app.register(cachePlugin, {
  // 缓存配置
});

// 在路由处理器中使用缓存
app.web.router.get('/users', async (ctx) => {
  const cache = app.cache;
  
  // 尝试从缓存获取
  const cachedUsers = await cache.get('users');
  if (cachedUsers) {
    return { users: cachedUsers };
  }
  
  // 获取数据并缓存
  const users = await fetchUsers();
  await cache.set('users', users, 60); // 缓存 60 秒
  
  return { users };
});
```

## 8. 性能优化

- 使用 Schema 验证提高序列化性能
- 合理配置缓存头部和压缩选项
- 使用 WebSocket 减少频繁的 HTTP 请求
- 配置适当的线程池和保持活动连接选项
- 启用路由缓存和预验证

## 9. 最佳实践

### 9.1 API 设计

- 使用 RESTful 设计原则
- 采用一致的命名约定
- 完善的错误处理和响应格式
- 使用身份验证和授权机制
- 合理分页和筛选

### 9.2 安全考虑

- 配置 CORS 策略
- 使用 HTTPS
- 实施速率限制
- 输入验证和内容安全策略
- 审计日志和监控

### 9.3 可测试性

- 路由处理程序应该易于测试
- 使用依赖注入便于模拟
- 分离业务逻辑和 HTTP 处理
- 提供健康检查端点
- 支持单元测试和集成测试

## 10. 总结

`@stratix/web` 插件是 Stratix 框架中处理 Web 服务的核心组件，提供了高性能、类型安全、配置驱动的 HTTP/HTTPS 服务器功能。通过结合 Fastify 的性能和 Stratix 的函数式编程理念，使 Web 应用开发变得更加简洁和高效。 