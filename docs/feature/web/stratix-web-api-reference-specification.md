# @stratix/web API 参考文档

## 配置选项

### ServerOptions

```typescript
interface ServerOptions {
  port?: number;                         // 服务器端口，默认3000
  host?: string;                         // 主机地址，默认'localhost'
  logger?: boolean | LoggerOptions;      // 日志配置
  https?: HttpsOptions;                  // HTTPS配置
  watch?: boolean;                       // 文件监视（开发模式）
  ignoreTrailingSlash?: boolean;         // 忽略路径末尾斜杠
  caseSensitive?: boolean;               // 路由大小写敏感
  serverFactory?: ServerFactory;         // 自定义服务器工厂
}
```

### RouteOptions

```typescript
interface RouteOptions {
  schema?: SchemaOptions;                // 请求验证Schema
  onRequest?: Hook[];                    // 请求钩子
  preHandler?: Hook[];                   // 处理前钩子
  onResponse?: Hook[];                   // 响应钩子
  onError?: Hook[];                      // 错误钩子
}
```

### SchemaOptions

```typescript
interface SchemaOptions {
  body?: JSONSchema;                     // 请求体验证
  querystring?: JSONSchema;              // 查询参数验证
  params?: JSONSchema;                   // 路径参数验证
  headers?: JSONSchema;                  // 请求头验证
  response?: {                           // 响应验证
    [statusCode: number]: JSONSchema;
  };
}
```

### MiddlewareOptions

```typescript
interface MiddlewareOptions {
  global?: MiddlewareList;               // 全局中间件
  route?: RouteMiddlewareMap;            // 路由中间件
}

type MiddlewareList = Array<string | Middleware>;

interface RouteMiddlewareMap {
  [path: string]: MiddlewareList;
}
```

### WebSocketOptions

```typescript
interface WebSocketOptions {
  path?: string;                         // WebSocket路径
  options?: WebSocketServerOptions;      // WebSocket服务器选项
  handler: WebSocketHandler;             // WebSocket处理函数
}
```

### StaticOptions

```typescript
interface StaticOptions {
  root: string;                          // 静态文件根目录
  prefix?: string;                       // URL前缀
  index?: string[];                      // 索引文件
  decorateReply?: boolean;               // 装饰响应对象
  cacheControl?: boolean | string;       // 缓存控制
  immutable?: boolean;                   // 不可变标志
  maxAge?: number;                       // 最大缓存时间
  lastModified?: boolean;                // 最后修改时间
  etag?: boolean;                        // ETag支持
}
```

### SwaggerOptions

```typescript
interface SwaggerOptions {
  routePrefix?: string;                  // 文档路由前缀
  swagger?: {                            // Swagger配置
    info: {
      title: string;
      description?: string;
      version: string;
    };
    host?: string;
    schemes?: string[];
    consumes?: string[];
    produces?: string[];
    tags?: Array<{ name: string, description: string }>;
    securityDefinitions?: Record<string, any>;
  };
  exposeRoute?: boolean;                 // 暴露文档路由
  uiConfig?: Record<string, any>;        // UI配置
  staticCSP?: boolean;                   // 内容安全策略
  transformSpecification?: Function;     // 规范转换器
  transformSpecificationFn?: Function;   // 规范转换函数
}
```

## 公共接口

### StratixWeb

```typescript
interface StratixWeb {
  server: Server;                        // 服务器实例
  router: Router;                        // 路由管理器
  middleware: MiddlewareManager;         // 中间件管理器
  hooks: HooksManager;                   // 钩子管理器
  addRoute: (...args) => void;           // 添加路由
  addMiddleware: (middleware) => void;   // 添加中间件
}
```

### Router

```typescript
interface Router {
  get(path, handler, options?): void;    // GET路由
  post(path, handler, options?): void;   // POST路由
  put(path, handler, options?): void;    // PUT路由
  delete(path, handler, options?): void; // DELETE路由
  patch(path, handler, options?): void;  // PATCH路由
  head(path, handler, options?): void;   // HEAD路由
  options(path, handler, options?): void;// OPTIONS路由
  register(method, path, handler, options?): void; // 注册任意方法
  group(prefix, callback): void;         // 路由分组
}
```

### MiddlewareManager

```typescript
interface MiddlewareManager {
  use(middleware): void;                 // 使用全局中间件
  forRoute(path, middleware): void;      // 路由级中间件
  compose(middlewares): Middleware;      // 组合中间件
  getMiddlewares(): Middleware[];        // 获取所有中间件
}
```

### HooksManager

```typescript
interface HooksManager {
  onRequest(hook): void;                 // 请求钩子
  preHandler(hook): void;                // 处理前钩子
  onResponse(hook): void;                // 响应钩子
  onError(hook): void;                   // 错误钩子
  onSend(hook): void;                    // 发送钩子
  onTimeout(hook): void;                 // 超时钩子
}
```

### Server

```typescript
interface Server {
  start(): Promise<void>;                // 启动服务器
  stop(): Promise<void>;                 // 停止服务器
  restart(): Promise<void>;              // 重启服务器
  onStart(callback): void;               // 启动回调
  onStop(callback): void;                // 停止回调
  address(): { port: number, address: string, family: string }; // 获取地址
  extend(callback): void;                // 扩展服务器
}
```

## 类型定义

### RouteContext

```typescript
interface RouteContext {
  request: FastifyRequest;               // Fastify请求对象
  reply: FastifyReply;                   // Fastify响应对象
  server: FastifyInstance;               // Fastify服务器实例
  app?: StratixApp;                      // Stratix应用实例
}
```

### RouteHandler

```typescript
type RouteHandler = (ctx: RouteContext) => Promise<any> | any;
```

### Middleware

```typescript
type Middleware = (ctx: RouteContext, next: () => Promise<void>) => Promise<void>;
```

### Hook

```typescript
type Hook = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
```

### ErrorHandler

```typescript
type ErrorHandler = (error: Error, request: FastifyRequest, reply: FastifyReply) => void;
```

### WebSocketHandler

```typescript
type WebSocketHandler = (connection: WebSocket, request: FastifyRequest) => void;
```

### HealthCheckHandler

```typescript
type HealthCheckHandler = (request: FastifyRequest) => Promise<any> | any;
```

## 装饰器

### 控制器装饰器

```typescript
function Controller(prefix?: string, middleware?: Middleware[]): ClassDecorator;
```

### 方法装饰器

```typescript
function Get(path: string, options?: RouteOptions, middleware?: Middleware[]): MethodDecorator;
function Post(path: string, options?: RouteOptions, middleware?: Middleware[]): MethodDecorator;
function Put(path: string, options?: RouteOptions, middleware?: Middleware[]): MethodDecorator;
function Delete(path: string, options?: RouteOptions, middleware?: Middleware[]): MethodDecorator;
function Patch(path: string, options?: RouteOptions, middleware?: Middleware[]): MethodDecorator;
function Head(path: string, options?: RouteOptions, middleware?: Middleware[]): MethodDecorator;
function Options(path: string, options?: RouteOptions, middleware?: Middleware[]): MethodDecorator;
```

## 插件注册选项

完整的`@stratix/web`插件注册选项：

```typescript
interface WebPluginOptions {
  // 服务器配置
  server?: ServerOptions;

  // 路由配置
  routes?: {
    prefix?: string;
    definitions?: RouteDefinitions;
    controllers?: string[] | ControllerOptions;
  };

  // 中间件配置
  middleware?: MiddlewareOptions;

  // 中间件实现
  middlewares?: {
    [name: string]: Middleware;
  };

  // Fastify插件
  plugins?: Array<string | {
    name: string;
    options?: any;
    enabled?: boolean;
  }>;

  // 内容协商
  contentNegotiation?: {
    types?: string[];
    languages?: string[];
    charsets?: string[];
    encodings?: string[];
  };

  // 静态文件服务
  static?: StaticOptions | StaticOptions[];

  // CORS配置
  cors?: boolean | CorsOptions;

  // 压缩配置
  compression?: boolean | CompressionOptions;

  // API文档
  swagger?: boolean | SwaggerOptions;

  // 错误处理
  errorHandler?: ErrorHandler;

  // 健康检查
  healthCheck?: {
    path?: string;
    handler?: HealthCheckHandler;
  };

  // WebSocket支持
  websocket?: boolean | WebSocketOptions;

  // 路由定义简写
  [path: string]: RouteShorthandDefinition | any;
}
```

## 使用示例

### 基本路由

```typescript
// 添加GET路由
app.web.router.get('/hello', async (ctx) => {
  return { message: 'Hello World' };
});

// 添加POST路由带Schema验证
app.web.router.post('/users', async (ctx) => {
  const userData = ctx.request.body;
  // 处理用户创建...
  return { id: 1, ...userData };
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
```

### 中间件使用

```typescript
// 全局中间件
app.web.middleware.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.request.url}`);
  await next();
  console.log(`响应状态码: ${ctx.reply.statusCode}`);
});

// 特定路由中间件
app.web.middleware.forRoute('/admin/*', async (ctx, next) => {
  // 验证管理员权限
  if (!ctx.request.headers.authorization) {
    ctx.reply.code(401).send({ error: '未授权' });
    return;
  }
  await next();
});
```

### 钩子使用

```typescript
// 请求钩子
app.web.hooks.onRequest((request, reply) => {
  request.startTime = Date.now();
});

// 响应钩子
app.web.hooks.onResponse((request, reply) => {
  const duration = Date.now() - request.startTime;
  console.log(`请求处理时间: ${duration}ms`);
});
```

### 控制器示例

```typescript
@Controller('/api/users')
class UserController {
  @Get('/')
  async getUsers(ctx) {
    // 获取所有用户
    return { users: [] };
  }

  @Get('/:id')
  async getUserById(ctx) {
    const id = ctx.request.params.id;
    // 获取特定用户
    return { id, name: 'User ' + id };
  }

  @Post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' }
        }
      }
    }
  })
  async createUser(ctx) {
    const userData = ctx.request.body;
    // 创建用户
    return { id: 1, ...userData };
  }
}
```

## 进阶功能

### WebSocket

```typescript
app.register(webPlugin, {
  websocket: {
    path: '/chat',
    handler: (connection, request) => {
      connection.on('message', (message) => {
        // 处理消息
        connection.send(JSON.stringify({
          type: 'echo',
          data: message.toString()
        }));
      });
    }
  }
});
```

### 健康检查

```typescript
app.register(webPlugin, {
  healthCheck: {
    path: '/health',
    handler: async (request) => {
      // 检查系统健康状况
      return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date()
      };
    }
  }
});
```

### API文档

```typescript
app.register(webPlugin, {
  swagger: {
    routePrefix: '/documentation',
    swagger: {
      info: {
        title: 'API Documentation',
        description: 'API documentation for my service',
        version: '1.0.0'
      },
      tags: [
        { name: 'users', description: '用户相关接口' }
      ]
    },
    exposeRoute: true
  }
});
``` 