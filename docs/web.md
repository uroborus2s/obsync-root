我是小d,我将为开发优秀的代码

# Stratix Web服务插件设计文档 (@stratix/web)

## 目录
- [Stratix Web服务插件设计文档 (@stratix/web)](#stratix-web服务插件设计文档-stratixweb)
  - [目录](#目录)
  - [1. 插件概述](#1-插件概述)
  - [2. 使用方式](#2-使用方式)
    - [2.1 基本使用](#21-基本使用)
    - [2.2 高级配置](#22-高级配置)
    - [2.3 路由注册](#23-路由注册)
    - [2.4 中间件与钩子](#24-中间件与钩子)
    - [2.5 错误处理](#25-错误处理)
  - [3. API设计](#3-api设计)
    - [3.1 插件API](#31-插件api)
    - [3.2 Web服务器API](#32-web服务器api)
    - [3.3 配置选项](#33-配置选项)
  - [4. 实现细节](#4-实现细节)
    - [4.1 核心实现](#41-核心实现)
    - [4.2 插件加载](#42-插件加载)
    - [4.3 与框架集成](#43-与框架集成)
  - [5. 高级特性](#5-高级特性)
    - [5.1 服务器选项](#51-服务器选项)
    - [5.2 安全配置](#52-安全配置)
    - [5.3 性能优化](#53-性能优化)

## 1. 插件概述

`@stratix/web` 是Stratix框架的官方Web服务插件，基于高性能的 [Fastify 5.2](https://fastify.io/) 实现。插件提供统一、灵活的HTTP服务接口，支持动态加载Fastify生态的各种插件，使应用能够轻松构建高性能Web API和应用。

核心特点：
- **高性能**：基于Fastify 5.2构建，提供优异的吞吐量和低延迟
- **插件生态**：支持动态加载和配置多种Fastify官方插件
- **简化配置**：提供统一配置界面，自动处理插件依赖和加载顺序
- **类型安全**：使用TypeScript提供完整类型定义
- **安全特性**：内置多种安全增强选项和最佳实践
- **开发体验**：提供友好的API和开发工具支持
- **可扩展性**：易于扩展自定义路由、中间件和处理器

## 2. 使用方式

### 2.1 基本使用

```typescript
// 引入Stratix框架和Web插件
import { createApp } from 'stratix';
import webPlugin from '@stratix/web';

// 创建应用实例并注册Web插件
const app = createApp();
app.register(webPlugin, {
  // 基本服务器配置
  server: {
    port: 3000,
    host: '0.0.0.0',
    logger: true
  }
});

// 启动应用后使用Web功能
await app.start();

// 方式1: 直接通过框架访问Web实例
const { web } = app;

// 注册路由
web.get('/hello', async (request, reply) => {
  return { hello: 'world' };
});

// 方式2: 通过依赖注入使用
app.register(async (app) => {
  const webServer = await app.resolve('webServer');
  
  // 注册路由
  webServer.post('/api/users', async (request, reply) => {
    // 处理创建用户请求
    const user = request.body;
    // ...业务逻辑
    return { id: 1, ...user };
  });
});
```

### 2.2 高级配置

```typescript
// 注册带有高级配置的Web插件
app.register(webPlugin, {
  // 服务器配置
  server: {
    port: 3000,
    host: '0.0.0.0',
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    },
    // 请求超时设置（毫秒）
    requestTimeout: 30000,
    // 连接最大保持时间
    keepAliveTimeout: 5000,
    // 是否在测试环境
    ignoreTrailingSlash: true,
    // 处理URL编码
    caseSensitive: true
  },
  
  // 插件配置
  plugins: {
    // 压缩响应
    compress: {
      enabled: true,
      options: {
        encodings: ['gzip', 'deflate']
      }
    },
    
    // Cookie支持
    cookie: {
      enabled: true
    },
    
    // CORS配置
    cors: {
      enabled: true,
      options: {
        origin: ['https://example.com', 'https://admin.example.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      }
    },
    
    // CSRF保护
    csrf: {
      enabled: true,
      options: {
        sessionPlugin: 'session',
        cookieOpts: {
          signed: true,
          httpOnly: true
        }
      }
    },
    
    // ETag支持
    etag: {
      enabled: true
    },
    
    // 安全头信息设置
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
    
    // HTTP代理
    httpProxy: {
      enabled: false,
      routes: {
        '/api/legacy': {
          target: 'http://legacy-api.internal:8080',
          rewritePrefix: '/api'
        }
      }
    },
    
    // 静态文件服务
    static: {
      enabled: true,
      options: {
        root: './public',
        prefix: '/static/'
      }
    },
    
    // Session支持
    session: {
      enabled: true,
      options: {
        secret: 'your-secret-key',
        cookie: {
          secure: true,
          httpOnly: true,
          maxAge: 86400000 // 24小时
        },
        store: {
          type: 'redis',
          options: {
            host: 'localhost',
            port: 6379,
            ttl: 86400
          }
        }
      }
    },
    
    // 文件上传
    multipart: {
      enabled: true,
      options: {
        limits: {
          fileSize: 10485760 // 10MB
        }
      }
    },
    
    // 自定义插件
    custom: [
      {
        module: require('fastify-custom-plugin'),
        options: {
          // 插件特定选项
        }
      }
    ]
  },
  
  // 全局钩子
  hooks: {
    onRequest: async (request, reply) => {
      // 请求初始处理
    },
    preHandler: async (request, reply) => {
      // 处理前操作
    }
  },
  
  // 错误处理
  errorHandler: (error, request, reply) => {
    // 自定义错误响应
    reply.status(error.statusCode || 500).send({
      error: error.name,
      message: error.message,
      statusCode: error.statusCode || 500
    });
  }
});
```

### 2.3 路由注册

```typescript
// 基本路由
web.get('/users', async (request, reply) => {
  // 处理获取用户列表请求
  return { users: [] };
});

web.post('/users', async (request, reply) => {
  // 处理创建用户请求
  return { success: true };
});

// 带参数的路由
web.get('/users/:id', async (request, reply) => {
  const { id } = request.params;
  // 获取指定用户
  return { id, name: 'User Name' };
});

// 路由前缀分组
web.register((instance, opts, done) => {
  // 这个分组下的所有路由都有 '/api/v1' 前缀
  
  instance.get('/users', async (request, reply) => {
    // 实际路径为 /api/v1/users
    return { users: [] };
  });
  
  instance.post('/auth/login', async (request, reply) => {
    // 实际路径为 /api/v1/auth/login
    return { token: 'example-token' };
  });
  
  done();
}, { prefix: '/api/v1' });

// 带Schema验证的路由
web.route({
  method: 'POST',
  url: '/products',
  schema: {
    body: {
      type: 'object',
      required: ['name', 'price'],
      properties: {
        name: { type: 'string' },
        price: { type: 'number' },
        description: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          price: { type: 'number' },
          description: { type: 'string' }
        }
      }
    }
  },
  handler: async (request, reply) => {
    const product = request.body;
    // 处理创建产品
    return { id: 123, ...product };
  }
});

// 使用控制器风格组织路由
const userController = {
  getAll: async (request, reply) => {
    return { users: [] };
  },
  getOne: async (request, reply) => {
    return { id: request.params.id, name: 'User Name' };
  },
  create: async (request, reply) => {
    return { id: 123, ...request.body };
  },
  update: async (request, reply) => {
    return { id: request.params.id, ...request.body };
  },
  delete: async (request, reply) => {
    return { success: true };
  }
};

web.get('/api/users', userController.getAll);
web.get('/api/users/:id', userController.getOne);
web.post('/api/users', userController.create);
web.put('/api/users/:id', userController.update);
web.delete('/api/users/:id', userController.delete);
```

### 2.4 中间件与钩子

```typescript
// 全局中间件(使用Fastify钩子)
web.addHook('onRequest', async (request, reply) => {
  // 在所有路由处理前执行
  console.log('New request:', request.method, request.url);
});

web.addHook('preHandler', async (request, reply) => {
  // 在处理请求前执行
  request.startTime = Date.now();
});

web.addHook('onSend', async (request, reply, payload) => {
  // 在发送响应前执行
  const processingTime = Date.now() - request.startTime;
  reply.header('X-Response-Time', `${processingTime}ms`);
  return payload; // 可以修改响应
});

web.addHook('onResponse', async (request, reply) => {
  // 在响应完成后执行
  console.log('Request completed in:', Date.now() - request.startTime, 'ms');
});

// 特定路由的钩子
web.register((instance, opts, done) => {
  instance.addHook('preHandler', async (request, reply) => {
    // 检查认证
    if (!request.headers.authorization) {
      throw web.httpErrors.unauthorized('Authentication required');
    }
  });
  
  // 这些路由都会应用上面的认证检查
  instance.get('/protected', async (req, reply) => {
    return { sensitive: 'data' };
  });
  
  done();
}, { prefix: '/api/private' });

// 特定请求方法的中间件
const validateAdmin = async (request, reply) => {
  // 检查是否管理员
  if (!request.user.isAdmin) {
    throw web.httpErrors.forbidden('Admin access required');
  }
};

web.register((instance, opts, done) => {
  // 添加preHandler处理器
  instance.addHook('preHandler', validateAdmin);
  
  // 所有管理员路由
  instance.get('/dashboard', async (req, reply) => {
    return { stats: {} };
  });
  
  instance.post('/settings', async (req, reply) => {
    return { updated: true };
  });
  
  done();
}, { prefix: '/admin' });
```

### 2.5 错误处理

```typescript
// 全局错误处理器
web.setErrorHandler((error, request, reply) => {
  // 日志记录
  request.log.error(error);
  
  // 根据错误类型定制响应
  if (error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation Error',
      details: error.validation
    });
  }
  
  if (error.statusCode >= 500) {
    // 服务器内部错误，隐藏细节
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An internal error occurred'
    });
  }
  
  // 默认错误响应
  return reply.status(error.statusCode || 500).send({
    statusCode: error.statusCode || 500,
    error: error.name || 'Error',
    message: error.message || 'Unknown error occurred'
  });
});

// 自定义错误类型
const createError = web.httpErrors;

// 在路由中使用
web.get('/resource/:id', async (request, reply) => {
  const resource = await getResource(request.params.id);
  
  if (!resource) {
    throw createError.notFound('Resource not found');
  }
  
  if (!canAccess(request.user, resource)) {
    throw createError.forbidden('Access denied');
  }
  
  return resource;
});

// 捕获特定路由错误
web.register((instance, opts, done) => {
  // 设置此路由组的错误处理器
  instance.setErrorHandler((error, request, reply) => {
    if (error.code === 'PAYMENT_REQUIRED') {
      return reply.status(402).send({
        statusCode: 402,
        error: 'Payment Required',
        message: 'Subscription has expired'
      });
    }
    
    // 默认回退到全局错误处理器
    reply.send(error);
  });
  
  instance.post('/payment', async (req, reply) => {
    const paymentStatus = await processPayment(req.body);
    
    if (paymentStatus === 'rejected') {
      const error = new Error('Payment rejected');
      error.code = 'PAYMENT_REQUIRED';
      throw error;
    }
    
    return { success: true };
  });
  
  done();
}, { prefix: '/api/billing' });

// 处理404路由未找到
web.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    statusCode: 404,
    error: 'Not Found',
    message: `Route ${request.method}:${request.url} not found`
  });
});
```

## 3. API设计

### 3.1 插件API

```typescript
// 插件定义
interface WebPlugin {
  name: string;
  dependencies: string[];
  register: (app: StratixApp, options: WebOptions) => Promise<void>;
}

// 默认导出
export default WebPlugin;
```

Stratix Web插件通过以下方式与框架集成：

1. **插件注册函数**：接收应用实例和用户配置，初始化Web服务器
   
```typescript
// 插件注册函数实现示例
const webPlugin: StratixPlugin = {
  name: 'web',
  dependencies: ['logger', 'config'],
  register: async (app, options: WebOptions = {}) => {
    // 合并默认配置与用户配置
    const finalOptions = {
      ...defaultOptions,
      ...options
    };
    
    // 创建Fastify实例
    const fastify = require('fastify')(finalOptions.server);
    
    // 注册Fastify插件
    await registerPlugins(fastify, finalOptions.plugins);
    
    // 应用全局钩子
    applyGlobalHooks(fastify, finalOptions.hooks);
    
    // 设置错误处理器
    if (finalOptions.errorHandler) {
      fastify.setErrorHandler(finalOptions.errorHandler);
    }
    
    // 创建Web服务实例
    const webServer = new WebServer(fastify, app);
    
    // 注册到依赖注入容器
    app.inject('webServer', () => webServer);
    
    // 装饰应用实例
    app.decorate('web', webServer);
    
    // 添加生命周期钩子
    app.hook('beforeStart', async () => {
      // 启动HTTP服务器
      await fastify.listen({
        port: finalOptions.server.port,
        host: finalOptions.server.host
      });
      
      const address = fastify.server.address();
      app.log.info(`Web server listening at ${address.address}:${address.port}`);
    });
    
    app.hook('beforeClose', async () => {
      // 优雅关闭服务器
      await fastify.close();
      app.log.info('Web server closed');
    });
  }
};
```

2. **错误处理**: 集成Stratix和Fastify的错误处理机制

```typescript
// 错误处理集成
function setupErrorHandling(fastify, app) {
  // 合并框架错误和Fastify错误
  const errors = {
    ...app.errors,
    ...fastify.httpErrors
  };
  
  // 将错误工具注入应用
  app.inject('httpErrors', () => errors);
}
```

### 3.2 Web服务器API

Web服务器是对Fastify实例的包装，提供一致的API接口：

```typescript
interface WebServer {
  // 服务器实例引用
  readonly instance: FastifyInstance;
  
  // HTTP错误创建工具
  readonly httpErrors: FastifyHttpErrors;
  
  // 路由方法
  get(path: string, handler: RouteHandler): WebServer;
  post(path: string, handler: RouteHandler): WebServer;
  put(path: string, handler: RouteHandler): WebServer;
  delete(path: string, handler: RouteHandler): WebServer;
  patch(path: string, handler: RouteHandler): WebServer;
  head(path: string, handler: RouteHandler): WebServer;
  options(path: string, handler: RouteHandler): WebServer;
  
  // 完整路由定义
  route(options: RouteOptions): WebServer;
  
  // 注册子应用/插件
  register(plugin: FastifyPluginCallback, options?: any): WebServer;
  
  // 中间件与钩子
  addHook(name: HookName, hook: HookHandler): WebServer;
  use(path: string, middleware: Middleware): WebServer;
  
  // 错误处理
  setErrorHandler(handler: ErrorHandler): WebServer;
  setNotFoundHandler(handler: NotFoundHandler): WebServer;
  
  // 装饰器
  decorate(name: string, value: any): WebServer;
  decorateRequest(name: string, value: any): WebServer;
  decorateReply(name: string, value: any): WebServer;
  
  // 工具方法
  createBodyParser(options: any): BodyParser;
  createSchemaCompiler(options: any): SchemaCompiler;
}

// 路由处理器类型
type RouteHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<any> | any;

// 钩子类型
type HookName = 
  'onRequest' | 
  'preParsing' | 
  'preValidation' | 
  'preHandler' | 
  'preSerialization' | 
  'onSend' | 
  'onResponse' | 
  'onError';

// 钩子处理器
type HookHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
  payload?: any
) => Promise<any> | any;
```

Web服务器的实现封装了Fastify实例，提供更符合Stratix风格的API：

```typescript
class WebServerImpl implements WebServer {
  private _fastify: FastifyInstance;
  private _app: StratixApp;
  
  constructor(fastify: FastifyInstance, app: StratixApp) {
    this._fastify = fastify;
    this._app = app;
  }
  
  // 获取底层Fastify实例
  get instance(): FastifyInstance {
    return this._fastify;
  }
  
  // HTTP错误创建工具
  get httpErrors(): FastifyHttpErrors {
    return this._fastify.httpErrors;
  }
  
  // 路由方法实现
  get(path: string, handler: RouteHandler): WebServer {
    this._fastify.get(path, handler);
    return this;
  }
  
  post(path: string, handler: RouteHandler): WebServer {
    this._fastify.post(path, handler);
    return this;
  }
  
  // ... 其他HTTP方法实现 ...
  
  // 完整路由定义
  route(options: RouteOptions): WebServer {
    this._fastify.route(options);
    return this;
  }
  
  // 钩子注册
  addHook(name: HookName, hook: HookHandler): WebServer {
    this._fastify.addHook(name, hook);
    return this;
  }
  
  // 中间件注册 (兼容Express风格)
  use(path: string, middleware: Middleware): WebServer {
    if (typeof path === 'function') {
      this._fastify.use(path);
    } else {
      this._fastify.use(path, middleware);
    }
    return this;
  }
  
  // 错误处理器
  setErrorHandler(handler: ErrorHandler): WebServer {
    this._fastify.setErrorHandler(handler);
    return this;
  }
  
  // ... 其他方法实现 ...
}
```

### 3.3 配置选项

Web插件支持全面的配置选项，可以定制服务器行为和加载的插件：

```typescript
// 插件主配置接口
interface WebOptions {
  // 服务器配置
  server?: ServerOptions;
  
  // 插件配置
  plugins?: PluginsOptions;
  
  // 全局钩子
  hooks?: HooksOptions;
  
  // 错误处理
  errorHandler?: ErrorHandler;
  
  // 其他选项
  [key: string]: any;
}

// 服务器配置选项
interface ServerOptions {
  // 服务器监听端口
  port?: number;
  
  // 服务器监听地址
  host?: string;
  
  // 日志配置
  logger?: boolean | LoggerOptions;
  
  // 请求超时（毫秒）
  requestTimeout?: number;
  
  // 保持连接超时
  keepAliveTimeout?: number;
  
  // 忽略URL尾部斜杠
  ignoreTrailingSlash?: boolean;
  
  // URL大小写敏感
  caseSensitive?: boolean;
  
  // 正文解析配置
  bodyLimit?: number;
  
  // 最大参数数量
  maxParamLength?: number;
  
  // Pino日志格式化
  disableRequestLogging?: boolean;
  
  // 启用Ajv选项
  ajv?: AjvOptions;
  
  // 序列化器配置
  serializerOpts?: SerializerOptions;
  
  // 其他Fastify选项
  [key: string]: any;
}

// 插件配置选项
interface PluginsOptions {
  // 压缩
  compress?: {
    enabled: boolean;
    options?: CompressOptions;
  };
  
  // Cookie
  cookie?: {
    enabled: boolean;
    options?: CookieOptions;
  };
  
  // CORS
  cors?: {
    enabled: boolean;
    options?: CorsOptions;
  };
  
  // CSRF保护
  csrf?: {
    enabled: boolean;
    options?: CsrfOptions;
  };
  
  // ETag
  etag?: {
    enabled: boolean;
    options?: EtagOptions;
  };
  
  // 安全头信息
  helmet?: {
    enabled: boolean;
    options?: HelmetOptions;
  };
  
  // HTTP代理
  httpProxy?: {
    enabled: boolean;
    routes: Record<string, HttpProxyRouteOptions>;
  };
  
  // 静态文件
  static?: {
    enabled: boolean;
    options?: StaticOptions;
  };
  
  // 会话
  session?: {
    enabled: boolean;
    options?: SessionOptions;
  };
  
  // 文件上传
  multipart?: {
    enabled: boolean;
    options?: MultipartOptions;
  };
  
  // 自定义插件
  custom?: Array<{
    module: any;
    options?: any;
  }>;
}

// 钩子配置
interface HooksOptions {
  onRequest?: HookHandler | HookHandler[];
  preParsing?: HookHandler | HookHandler[];
  preValidation?: HookHandler | HookHandler[];
  preHandler?: HookHandler | HookHandler[];
  preSerialization?: HookHandler | HookHandler[];
  onSend?: HookHandler | HookHandler[];
  onResponse?: HookHandler | HookHandler[];
  onError?: HookHandler | HookHandler[];
  [key: string]: HookHandler | HookHandler[] | undefined;
}

// 各个插件的配置选项接口
interface CompressOptions {
  encodings?: string[];
  global?: boolean;
  threshold?: number;
  [key: string]: any;
}

interface CookieOptions {
  secret?: string;
  parseOptions?: any;
  [key: string]: any;
}

interface CorsOptions {
  origin?: boolean | string | RegExp | Array<string | RegExp> | Function;
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
  preflight?: boolean;
  strictPreflight?: boolean;
  [key: string]: any;
}

interface CsrfOptions {
  sessionPlugin?: string;
  cookieOpts?: any;
  cookieKey?: string;
  csrfOpts?: any;
  sessionKey?: string;
  [key: string]: any;
}

interface EtagOptions {
  weak?: boolean;
  [key: string]: any;
}

interface HelmetOptions {
  contentSecurityPolicy?: boolean | { directives: Record<string, string[]> };
  crossOriginEmbedderPolicy?: boolean | { policy?: string };
  crossOriginOpenerPolicy?: boolean | { policy?: string };
  crossOriginResourcePolicy?: boolean | { policy?: string };
  dnsPrefetchControl?: boolean | { allow?: boolean };
  expectCt?: boolean | { maxAge?: number; enforce?: boolean; reportUri?: string };
  frameguard?: boolean | { action?: string; domain?: string };
  hidePoweredBy?: boolean | { setTo?: string };
  hsts?: boolean | { maxAge?: number; includeSubDomains?: boolean; preload?: boolean };
  ieNoOpen?: boolean;
  noSniff?: boolean;
  originAgentCluster?: boolean;
  permittedCrossDomainPolicies?: boolean | { permittedPolicies?: string };
  referrerPolicy?: boolean | { policy?: string | string[] };
  xssFilter?: boolean | { reportUri?: string };
  [key: string]: any;
}

interface HttpProxyRouteOptions {
  target: string;
  proxyPayloads?: boolean;
  rewritePrefix?: string;
  replyOptions?: any;
  httpMethods?: string[];
  [key: string]: any;
}

interface StaticOptions {
  root: string;
  prefix?: string;
  serve?: boolean;
  decorateReply?: boolean;
  schemaHide?: boolean;
  setHeaders?: Function;
  redirect?: boolean;
  wildcard?: boolean;
  extensions?: string[];
  [key: string]: any;
}

interface SessionOptions {
  secret: string | string[];
  salt?: string;
  cookie?: any;
  cookieName?: string;
  saveUninitialized?: boolean;
  store?: {
    type: 'memory' | 'redis' | 'mongodb' | 'custom';
    options?: any;
  };
  [key: string]: any;
}

interface MultipartOptions {
  limits?: {
    fieldNameSize?: number;
    fieldSize?: number;
    fields?: number;
    fileSize?: number;
    files?: number;
    headerPairs?: number;
  };
  addToBody?: boolean;
  sharedSchemaId?: string;
  onFile?: Function;
  [key: string]: any;
}
```

## 4. 实现细节

### 4.1 核心实现

`@stratix/web` 插件的核心实现包括几个关键组件：Fastify实例管理、Web服务器类、插件加载器和各种辅助工具。本节将详细探讨这些组件的实现细节。

#### 4.1.1 插件入口与初始化

Web插件的入口点是一个遵循Stratix插件规范的对象，负责协调初始化过程：

```typescript
// src/index.ts - 插件入口点
import { StratixPlugin } from 'stratix';
import { WebOptions } from './types';
import { createWebServer } from './web-server';
import { registerBuiltinPlugins } from './plugins';
import { setupErrorHandlers } from './error-handlers';
import { applyHooks } from './hooks';
import { loadConfig } from './config';

const webPlugin: StratixPlugin = {
  name: 'web',
  dependencies: ['logger', 'config'],
  register: async (app, options: WebOptions = {}) => {
    // 1. 加载和合并配置
    const config = loadConfig(app, options);
    
    // 2. 创建Fastify实例
    const fastify = require('fastify')(config.server);
    
    // 3. 配置插件
    await registerBuiltinPlugins(fastify, config.plugins, app);
    
    // 4. 设置钩子
    applyHooks(fastify, config.hooks);
    
    // 5. 设置错误处理
    setupErrorHandlers(fastify, app, config);
    
    // 6. 创建Web服务器实例
    const webServer = createWebServer(fastify, app);
    
    // 7. 注册依赖注入
    app.inject('webServer', () => webServer);
    app.decorate('web', webServer);
    
    // 8. 设置生命周期钩子
    setupLifecycleHooks(app, fastify, config);
    
    // 9. 记录初始化信息
    app.log.info('Web plugin initialized successfully');
  }
};

export default webPlugin;
```

#### 4.1.2 配置管理

配置管理模块负责合并默认配置与用户提供的配置：

```typescript
// src/config.ts - 配置管理
import { StratixApp } from 'stratix';
import { WebOptions, ServerOptions } from './types';
import { DEFAULT_CONFIG } from './constants';

export function loadConfig(app: StratixApp, options: WebOptions): WebOptions {
  // 从框架配置中获取web相关配置
  const frameworkConfig = app.config('web') || {};
  
  // 合并配置，优先级: 默认值 < 框架配置 < 传入选项
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...frameworkConfig,
    ...options,
    
    // 深度合并服务器配置
    server: {
      ...DEFAULT_CONFIG.server,
      ...(frameworkConfig.server || {}),
      ...(options.server || {}),
    },
    
    // 深度合并插件配置
    plugins: mergePluginsConfig(
      DEFAULT_CONFIG.plugins,
      frameworkConfig.plugins || {},
      options.plugins || {}
    ),
    
    // 合并钩子配置
    hooks: mergeHooksConfig(
      DEFAULT_CONFIG.hooks,
      frameworkConfig.hooks || {},
      options.hooks || {}
    ),
  };
  
  // 验证必需的配置项
  validateConfig(mergedConfig);
  
  return mergedConfig;
}

// 合并插件配置的辅助函数
function mergePluginsConfig(
  defaults: any,
  frameworkConfig: any,
  optionsConfig: any
): any {
  const result = { ...defaults };
  
  // 处理所有的插件配置
  for (const [pluginName, defaultConfig] of Object.entries(defaults)) {
    const frameworkPluginConfig = frameworkConfig[pluginName];
    const optionsPluginConfig = optionsConfig[pluginName];
    
    if (pluginName in frameworkConfig || pluginName in optionsConfig) {
      if (typeof defaultConfig === 'object' && defaultConfig !== null) {
        result[pluginName] = {
          ...defaultConfig,
          ...(frameworkPluginConfig || {}),
          ...(optionsPluginConfig || {}),
          
          // 合并options对象
          options: {
            ...(defaultConfig.options || {}),
            ...(frameworkPluginConfig?.options || {}),
            ...(optionsPluginConfig?.options || {})
          }
        };
      } else {
        result[pluginName] = optionsPluginConfig || frameworkPluginConfig || defaultConfig;
      }
    }
  }
  
  // 添加默认配置中不存在的插件配置
  const allPluginNames = new Set([
    ...Object.keys(defaults),
    ...Object.keys(frameworkConfig),
    ...Object.keys(optionsConfig)
  ]);
  
  for (const pluginName of allPluginNames) {
    if (!(pluginName in result)) {
      result[pluginName] = optionsConfig[pluginName] || frameworkConfig[pluginName];
    }
  }
  
  return result;
}

// 合并钩子配置的辅助函数
function mergeHooksConfig(
  defaults: any,
  frameworkConfig: any,
  optionsConfig: any
): any {
  const result = { ...defaults };
  
  // 钩子可能是函数或数组，需要特殊处理
  const allHookNames = new Set([
    ...Object.keys(defaults),
    ...Object.keys(frameworkConfig),
    ...Object.keys(optionsConfig)
  ]);
  
  for (const hookName of allHookNames) {
    const defaultHooks = defaults[hookName] || [];
    const frameworkHooks = frameworkConfig[hookName] || [];
    const optionsHooks = optionsConfig[hookName] || [];
    
    // 将单个函数转换为数组
    const defaultHooksArray = Array.isArray(defaultHooks) ? defaultHooks : [defaultHooks];
    const frameworkHooksArray = Array.isArray(frameworkHooks) ? frameworkHooks : [frameworkHooks];
    const optionsHooksArray = Array.isArray(optionsHooks) ? optionsHooks : [optionsHooks];
    
    // 过滤掉空值
    result[hookName] = [
      ...defaultHooksArray,
      ...frameworkHooksArray,
      ...optionsHooksArray
    ].filter(Boolean);
  }
  
  return result;
}

// 验证配置的辅助函数
function validateConfig(config: WebOptions): void {
  // 检查服务器配置
  if (!config.server.port) {
    throw new Error('Web server port is required');
  }
  
  // 检查插件依赖
  if (config.plugins.csrf?.enabled && !config.plugins.cookie?.enabled) {
    throw new Error('CSRF protection requires cookie plugin to be enabled');
  }
  
  if (config.plugins.session?.enabled && !config.plugins.cookie?.enabled) {
    throw new Error('Session plugin requires cookie plugin to be enabled');
  }
}
```

#### 4.1.3 Web服务器实现

Web服务器类是对Fastify实例的封装，提供了一个更符合Stratix风格的API：

```typescript
// src/web-server.ts - Web服务器实现
import { FastifyInstance, RouteOptions } from 'fastify';
import { StratixApp } from 'stratix';
import {
  WebServer,
  RouteHandler,
  HookName,
  HookHandler,
  Middleware,
  ErrorHandler,
  NotFoundHandler
} from './types';

export function createWebServer(fastify: FastifyInstance, app: StratixApp): WebServer {
  return new WebServerImpl(fastify, app);
}

class WebServerImpl implements WebServer {
  private _fastify: FastifyInstance;
  private _app: StratixApp;
  
  constructor(fastify: FastifyInstance, app: StratixApp) {
    this._fastify = fastify;
    this._app = app;
  }
  
  // 获取底层Fastify实例
  get instance(): FastifyInstance {
    return this._fastify;
  }
  
  get httpErrors(): FastifyHttpErrors {
    return this._fastify.httpErrors;
  }
  
  // HTTP方法实现
  get(path: string, handler: RouteHandler): WebServer {
    this._fastify.get(path, handler);
    return this;
  }
  
  post(path: string, handler: RouteHandler): WebServer {
    this._fastify.post(path, handler);
    return this;
  }
  
  // ... 其他HTTP方法实现 ...
  
  // 完整路由定义
  route(options: RouteOptions): WebServer {
    this._fastify.route(options);
    return this;
  }
  
  // 钩子注册
  addHook(name: HookName, hook: HookHandler): WebServer {
    this._fastify.addHook(name, hook);
    return this;
  }
  
  // 中间件注册 (兼容Express风格)
  use(path: string | Middleware, middleware?: Middleware): WebServer {
    if (typeof path === 'function') {
      this._fastify.use(path);
    } else if (middleware) {
      this._fastify.use(path, middleware);
    }
    return this;
  }
  
  // 错误处理器
  setErrorHandler(handler: ErrorHandler): WebServer {
    this._fastify.setErrorHandler(handler);
    return this;
  }
  
  // ... 其他方法实现 ...
}
```

#### 4.1.4 生命周期管理

生命周期钩子管理Web服务器的启动和关闭过程：

```typescript
// src/lifecycle.ts - 生命周期管理
import { StratixApp } from 'stratix';
import { FastifyInstance } from 'fastify';
import { WebOptions } from './types';

export function setupLifecycleHooks(
  app: StratixApp,
  fastify: FastifyInstance,
  config: WebOptions
): void {
  app.hook('beforeStart', async () => {
    try {
      await fastify.listen({
        port: config.server.port,
        host: config.server.host || '0.0.0.0'
      });
      
      const address = fastify.server.address();
      const host = typeof address === 'string' 
        ? address 
        : `${address.address}:${address.port}`;
      
      app.log.info(`Web server listening at http://${host}`);
    } catch (error) {
      app.log.error('Failed to start web server:', error);
      throw error;
    }
  });
  
  app.hook('beforeClose', async () => {
    try {
      app.log.info('Closing web server...');
      await fastify.close();
      app.log.info('Web server closed successfully');
    } catch (error) {
      app.log.error('Error closing web server:', error);
    }
  });
  
  fastify.server.on('error', (error: Error) => {
    app.log.error('Web server error:', error);
  });
}
```

#### 4.1.5 错误处理系统

错误处理系统负责设置全局错误处理器和HTTP错误工厂：

```typescript
// src/error-handlers.ts - 错误处理系统
import { StratixApp } from 'stratix';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebOptions } from './types';

export function setupErrorHandlers(
  fastify: FastifyInstance,
  app: StratixApp,
  config: WebOptions
): void {
  setupHttpErrors(fastify, app);
  
  if (config.errorHandler) {
    fastify.setErrorHandler(config.errorHandler);
  } else {
    fastify.setErrorHandler(createDefaultErrorHandler(app));
  }
  
  if (config.notFoundHandler) {
    fastify.setNotFoundHandler(config.notFoundHandler);
  } else {
    fastify.setNotFoundHandler(createDefaultNotFoundHandler(app));
  }
}

function setupHttpErrors(fastify: FastifyInstance, app: StratixApp): void {
  const httpErrors = {
    ...fastify.httpErrors,
    ...createCustomHttpErrors(app)
  };
  
  app.inject('httpErrors', () => httpErrors);
  
  Object.assign(app.errors, httpErrors);
}

function createCustomHttpErrors(app: StratixApp): Record<string, any> {
  return {
    validationError: (message: string, details?: any) => {
      const error = new Error(message);
      error.name = 'ValidationError';
      error.statusCode = 400;
      error.validation = details;
      return error;
    },
    
    throttleError: (message: string = 'Rate limit exceeded') => {
      const error = new Error(message);
      error.name = 'ThrottleError';
      error.statusCode = 429;
      return error;
    },
    
    serviceUnavailable: (message: string = 'Service temporarily unavailable') => {
      const error = new Error(message);
      error.name = 'ServiceUnavailableError';
      error.statusCode = 503;
      return error;
    }
  };
}

function createDefaultErrorHandler(app: StratixApp) {
  return function defaultErrorHandler(
    error: any,
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    if (error.statusCode >= 500) {
      request.log.error(error);
    } else {
      request.log.info({ err: error }, 'Request error');
    }
    
    const statusCode = error.statusCode || 500;
    const errorResponse = {
      statusCode,
      error: error.name || (statusCode >= 500 ? 'Internal Server Error' : 'Bad Request'),
      message: error.message || 'An error occurred while processing your request'
    };
    
    if (error.validation) {
      errorResponse.validation = error.validation;
    }
    
    if (statusCode >= 500 && app.env === 'production') {
      errorResponse.message = 'Internal Server Error';
      delete errorResponse.validation;
    }
    
    reply.status(statusCode).send(errorResponse);
  };
}

function createDefaultNotFoundHandler(app: StratixApp) {
  return function defaultNotFoundHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`
    });
  };
}
```

#### 4.1.6 请求-响应流程

当请求进入Web服务器时，请求-响应流程如下：

```
[请求] → 
  [onRequest钩子] → 
    [中间件] → 
      [路由匹配] → 
        [preParsing钩子] → 
          [请求体解析] → 
            [preValidation钩子] → 
              [schema验证] → 
                [preHandler钩子] → 
                  [路由处理器] → 
                    [preSerialization钩子] → 
                      [响应序列化] → 
                        [onSend钩子] → 
                          [发送响应] → 
                            [onResponse钩子]
```

此流程通过钩子系统提供了多个处理请求的扩展点，使开发者能够在请求-响应周期的任何阶段插入自定义逻辑。

### 4.2 插件加载

`@stratix/web` 插件支持动态加载和配置多种Fastify官方和社区插件，为开发者提供了丰富的扩展功能。本节详细介绍插件加载系统的实现。

#### 4.2.1 插件管理架构

插件管理系统由以下部分组成：
- 插件注册器：负责注册并管理所有插件
- 插件加载器：处理插件的加载和顺序依赖
- 插件配置适配器：转换通用配置为插件特定配置

```typescript
// src/plugins/index.ts - 插件管理入口
import { FastifyInstance } from 'fastify';
import { StratixApp } from 'stratix';
import { PluginsOptions } from '../types';
import { createPluginManager } from './plugin-manager';
import { resolvePluginDependencies } from './dependency-resolver';
import { loadBuiltinPlugins } from './builtins';
import { loadCustomPlugins } from './custom';

export async function registerBuiltinPlugins(
  fastify: FastifyInstance,
  pluginsConfig: PluginsOptions,
  app: StratixApp
): Promise<void> {
  // 创建插件管理器
  const pluginManager = createPluginManager(fastify, app);
  
  // 注册内置插件
  const builtinPlugins = loadBuiltinPlugins(pluginsConfig);
  
  // 注册自定义插件
  const customPlugins = loadCustomPlugins(pluginsConfig.custom || []);
  
  // 合并所有插件
  const allPlugins = [...builtinPlugins, ...customPlugins];
  
  // 解析插件依赖并排序
  const sortedPlugins = resolvePluginDependencies(allPlugins);
  
  // 按顺序注册插件
  for (const plugin of sortedPlugins) {
    await pluginManager.register(plugin);
  }
  
  // 记录注册的插件
  app.log.info(`Registered ${sortedPlugins.length} web plugins`);
}
```

#### 4.2.2 内置插件加载器

内置插件加载器负责根据配置加载和准备内置的Fastify插件：

```typescript
// src/plugins/builtins.ts - 内置插件加载器
import { PluginsOptions, PluginDefinition } from '../types';
import { PLUGIN_DEPENDENCIES } from '../constants';

// 可用内置插件列表
const BUILTIN_PLUGINS = {
  compress: require('@fastify/compress'),
  cookie: require('@fastify/cookie'),
  cors: require('@fastify/cors'),
  csrf: require('@fastify/csrf-protection'),
  etag: require('@fastify/etag'),
  helmet: require('@fastify/helmet'),
  httpProxy: require('@fastify/http-proxy'),
  multipart: require('@fastify/multipart'),
  static: require('@fastify/static'),
  session: require('@fastify/session')
};

// 插件加载顺序 - 某些插件需要在其他插件之前或之后加载
const PLUGIN_ORDER = {
  first: ['cookie'],
  middle: ['compress', 'cors', 'etag', 'helmet', 'multipart', 'static'],
  last: ['csrf', 'session', 'httpProxy']
};

export function loadBuiltinPlugins(pluginsConfig: PluginsOptions): PluginDefinition[] {
  const plugins: PluginDefinition[] = [];
  
  // 处理所有内置插件配置
  for (const [pluginName, config] of Object.entries(pluginsConfig)) {
    // 跳过自定义插件和禁用的插件
    if (pluginName === 'custom' || !config?.enabled) {
      continue;
    }
    
    // 获取插件模块
    const pluginModule = BUILTIN_PLUGINS[pluginName];
    if (!pluginModule) {
      throw new Error(`Unknown built-in plugin: ${pluginName}`);
    }
    
    // 创建插件定义
    plugins.push({
      name: pluginName,
      module: pluginModule,
      options: config.options || {},
      dependencies: PLUGIN_DEPENDENCIES[pluginName] || [],
      priority: getPluginPriority(pluginName)
    });
  }
  
  return plugins;
}

// 计算插件优先级
function getPluginPriority(pluginName: string): number {
  if (PLUGIN_ORDER.first.includes(pluginName)) {
    return 100;
  } else if (PLUGIN_ORDER.last.includes(pluginName)) {
    return 1;
  } else {
    return 50;
  }
}
```

#### 4.2.3 自定义插件加载器

自定义插件加载器允许开发者加载任何Fastify兼容的插件：

```typescript
// src/plugins/custom.ts - 自定义插件加载器
import { CustomPluginConfig, PluginDefinition } from '../types';

export function loadCustomPlugins(
  customPluginsConfig: CustomPluginConfig[]
): PluginDefinition[] {
  return customPluginsConfig.map((config, index) => {
    // 验证自定义插件
    if (!config.module) {
      throw new Error(`Custom plugin at index ${index} is missing module`);
    }
    
    // 创建插件定义
    return {
      name: `custom-${index}`,
      module: config.module,
      options: config.options || {},
      dependencies: config.dependencies || [],
      priority: config.priority || 25 // 默认优先级低于内置插件
    };
  });
}
```

#### 4.2.4 依赖解析器

依赖解析器负责分析插件依赖关系并确定正确的加载顺序：

```typescript
// src/plugins/dependency-resolver.ts - 依赖解析器
import { PluginDefinition } from '../types';

export function resolvePluginDependencies(
  plugins: PluginDefinition[]
): PluginDefinition[] {
  // 创建依赖图
  const dependencyGraph = buildDependencyGraph(plugins);
  
  // 执行拓扑排序
  return topologicalSort(plugins, dependencyGraph);
}

// 构建依赖图
function buildDependencyGraph(
  plugins: PluginDefinition[]
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const pluginMap = new Map<string, PluginDefinition>();
  
  // 建立插件名称到定义的映射
  for (const plugin of plugins) {
    pluginMap.set(plugin.name, plugin);
    graph.set(plugin.name, new Set<string>());
  }
  
  // 填充依赖关系
  for (const plugin of plugins) {
    for (const dependency of plugin.dependencies) {
      // 检查依赖是否存在
      if (!pluginMap.has(dependency)) {
        throw new Error(
          `Plugin '${plugin.name}' depends on '${dependency}', but it's not registered`
        );
      }
      
      // 添加依赖边
      const dependenciesSet = graph.get(plugin.name)!;
      dependenciesSet.add(dependency);
    }
  }
  
  // 检测循环依赖
  detectCycles(graph);
  
  return graph;
}

// 检测依赖循环
function detectCycles(graph: Map<string, Set<string>>): void {
  const visited = new Set<string>();
  const path = new Set<string>();
  
  function dfs(node: string): void {
    if (path.has(node)) {
      const cycle = Array.from(path).join(' -> ') + ' -> ' + node;
      throw new Error(`Circular dependency detected: ${cycle}`);
    }
    
    if (visited.has(node)) {
      return;
    }
    
    visited.add(node);
    path.add(node);
    
    for (const dependency of graph.get(node) || []) {
      dfs(dependency);
    }
    
    path.delete(node);
  }
  
  // 对每个未访问的节点运行DFS
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
}

// 拓扑排序插件
function topologicalSort(
  plugins: PluginDefinition[],
  graph: Map<string, Set<string>>
): PluginDefinition[] {
  const visited = new Set<string>();
  const result: PluginDefinition[] = [];
  const pluginMap = new Map<string, PluginDefinition>();
  
  // 建立插件名称到定义的映射
  for (const plugin of plugins) {
    pluginMap.set(plugin.name, plugin);
  }
  
  function visit(pluginName: string): void {
    if (visited.has(pluginName)) {
      return;
    }
    
    visited.add(pluginName);
    
    // 先处理依赖
    for (const dependency of graph.get(pluginName) || []) {
      visit(dependency);
    }
    
    // 然后添加当前插件
    result.push(pluginMap.get(pluginName)!);
  }
  
  // 根据优先级排序访问插件
  const orderedPluginNames = Array.from(graph.keys()).sort((a, b) => {
    const pluginA = pluginMap.get(a)!;
    const pluginB = pluginMap.get(b)!;
    return pluginB.priority - pluginA.priority; // 优先级高的先访问
  });
  
  // 对每个未访问的节点运行访问
  for (const pluginName of orderedPluginNames) {
    if (!visited.has(pluginName)) {
      visit(pluginName);
    }
  }
  
  return result;
}
```

#### 4.2.5 插件管理器

插件管理器处理实际的插件注册和生命周期管理：

```typescript
// src/plugins/plugin-manager.ts - 插件管理器
import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { StratixApp } from 'stratix';
import { PluginDefinition } from '../types';

export function createPluginManager(
  fastify: FastifyInstance,
  app: StratixApp
) {
  const registeredPlugins = new Set<string>();
  
  return {
    // 注册单个插件
    async register(plugin: PluginDefinition): Promise<void> {
      const { name, module, options } = plugin;
      
      // 检查插件是否已注册
      if (registeredPlugins.has(name)) {
        app.log.warn(`Plugin '${name}' is already registered, skipping.`);
        return;
      }
      
      try {
        // 注册前日志
        app.log.debug(`Registering web plugin: ${name}`);
        
        // 根据插件类型处理注册
        if (typeof module === 'function') {
          // 函数插件（FastifyPluginCallback）
          await fastify.register(module as FastifyPluginCallback, options);
        } else if (module && typeof module.default === 'function') {
          // ESM 模块
          await fastify.register(module.default, options);
        } else {
          throw new Error(`Invalid plugin module for '${name}'`);
        }
        
        // 标记为已注册
        registeredPlugins.add(name);
        
        // 注册后日志
        app.log.debug(`Web plugin '${name}' registered successfully`);
      } catch (error) {
        // 处理注册错误
        app.log.error(
          `Failed to register web plugin '${name}': ${error.message}`
        );
        throw error;
      }
    },
    
    // 获取已注册插件列表
    getRegisteredPlugins(): string[] {
      return Array.from(registeredPlugins);
    }
  };
}
```

#### 4.2.6 插件配置适配器

某些插件需要特殊的配置处理，配置适配器负责这些转换：

```typescript
// src/plugins/adapters.ts - 插件配置适配器
import { StratixApp } from 'stratix';

export const configAdapters = {
  // 会话插件适配器
  session: (config: any, app: StratixApp) => {
    if (config.store?.type === 'redis') {
      // 处理Redis会话存储
      const { host, port, password, db, ...otherOptions } = config.store.options || {};
      
      return {
        ...config,
        store: new (require('@fastify/session-redis'))({
          client: require('redis').createClient({
            host,
            port,
            password,
            db
          }),
          ...otherOptions
        })
      };
    } else if (config.store?.type === 'mongodb') {
      // 处理MongoDB会话存储
      const { uri, collection, ...otherOptions } = config.store.options || {};
      
      return {
        ...config,
        store: new (require('@fastify/session-mongodb'))({
          uri,
          collection,
          ...otherOptions
        })
      };
    } else if (config.store?.type === 'custom' && config.store.factory) {
      // 处理自定义存储
      return {
        ...config,
        store: config.store.factory(app)
      };
    }
    
    // 使用内存存储（默认）
    return config;
  },
  
  // HTTP代理插件适配器
  httpProxy: (config: any, app: StratixApp) => {
    if (!config.routes) {
      return config;
    }
    
    // 将路由配置转换为fastify-http-proxy插件注册
    const registerFunctions = Object.entries(config.routes).map(
      ([prefix, routeConfig]: [string, any]) => {
        return async (fastify: any) => {
          await fastify.register(require('@fastify/http-proxy'), {
            upstream: routeConfig.target,
            prefix,
            ...routeConfig
          });
        };
      }
    );
    
    // 返回一个执行所有路由注册的函数
    return async (fastify: any) => {
      for (const register of registerFunctions) {
        await register(fastify);
      }
    };
  },
  
  // 静态文件插件适配器
  static: (config: any, app: StratixApp) => {
    if (Array.isArray(config.roots)) {
      // 处理多个静态目录
      return async (fastify: any) => {
        for (const root of config.roots) {
          await fastify.register(require('@fastify/static'), {
            root: root.path,
            prefix: root.prefix || '/',
            ...root.options
          });
        }
      };
    }
    
    // 单一静态目录，直接返回配置
    return config;
  }
};

// 应用配置适配
export function adaptPluginConfig(
  pluginName: string,
  config: any,
  app: StratixApp
): any {
  const adapter = configAdapters[pluginName];
  if (adapter) {
    return adapter(config, app);
  }
  return config;
}
```

#### 4.2.7 插件加载流程

当Web插件初始化时，插件加载流程按以下步骤执行：

1. **收集插件配置**：从用户选项和默认配置中收集所有启用的插件配置
2. **加载内置插件**：准备Fastify的官方插件（压缩、CORS、会话等）
3. **加载自定义插件**：准备用户提供的自定义插件
4. **解析依赖关系**：分析插件之间的依赖关系
5. **排序插件**：基于依赖关系和优先级对插件进行拓扑排序
6. **应用配置适配**：使用适配器转换特定插件的配置
7. **注册插件**：按顺序将所有插件注册到Fastify实例
8. **监控和日志**：记录插件加载过程和可能的错误

这种设计提供了几个关键优势：
- **声明式配置**：开发者只需声明所需的插件和配置
- **自动依赖管理**：系统自动处理插件加载顺序
- **统一配置接口**：所有插件通过一致的配置格式配置
- **错误处理**：提供有意义的错误消息和提示
- **可扩展性**：轻松添加新的插件和配置适配器

### 4.3 与框架集成

`@stratix/web` 插件与Stratix框架的集成是通过依赖注入、生命周期管理和事件系统实现的。本节详细介绍插件如何无缝融入框架生态系统。

#### 4.3.1 依赖注入集成

Web插件通过Stratix的依赖注入系统提供服务和扩展框架功能：

```typescript
// src/integration/dependency-injection.ts - 依赖注入集成
import { StratixApp } from 'stratix';
import { WebServer } from '../types';
import { FastifyInstance } from 'fastify';

export function setupDependencyInjection(
  app: StratixApp,
  webServer: WebServer,
  fastify: FastifyInstance
): void {
  // 注册主要Web服务实例
  app.inject('webServer', () => webServer);
  
  // 直接装饰应用实例以便快速访问
  app.decorate('web', webServer);
  
  // 注册底层Fastify实例（高级用例）
  app.inject('fastifyInstance', () => fastify);
  
  // 注册HTTP错误工厂
  app.inject('httpErrors', () => fastify.httpErrors);
  
  // 注册请求上下文访问器
  app.inject('getRequestContext', (requestId: string) => {
    return app.requestContexts.get(requestId);
  });
  
  // 注册响应时间计算器
  app.inject('responseTime', {
    calculate: (startTime: [number, number]) => {
      const diff = process.hrtime(startTime);
      return (diff[0] * 1e9 + diff[1]) / 1e6;
    }
  });
}
```

#### 4.3.2 生命周期集成

Web插件与框架的生命周期集成，确保服务器随应用一起启动和停止：

```typescript
// src/integration/lifecycle.ts - 生命周期集成
import { StratixApp } from 'stratix';
import { FastifyInstance } from 'fastify';
import { WebOptions } from '../types';

export function setupLifecycleIntegration(
  app: StratixApp,
  fastify: FastifyInstance,
  options: WebOptions
): void {
  // 在应用初始化后执行
  app.hook('afterInitialize', async () => {
    app.log.info('Web plugin initialized and ready');
    
    // 注册应用路由
    if (typeof options.routes === 'function') {
      await options.routes(fastify, app);
    }
  });
  
  // 在应用启动前执行
  app.hook('beforeStart', async () => {
    // 启动HTTP服务器
    try {
      await fastify.listen({
        port: options.server.port,
        host: options.server.host || '0.0.0.0'
      });
      
      const address = fastify.server.address();
      const host = typeof address === 'string' 
        ? address 
        : `${address.address}:${address.port}`;
      
      app.log.info(`Web server listening at http://${host}`);
      
      // 发出服务器启动事件
      app.emit('web:server:started', { address: host });
    } catch (error) {
      app.log.error('Failed to start web server:', error);
      
      // 发出服务器错误事件
      app.emit('web:server:error', { error });
      
      // 重新抛出错误，导致应用启动失败
      throw error;
    }
  });
  
  // 在应用关闭前执行
  app.hook('beforeClose', async () => {
    app.log.info('Closing web server...');
    
    // 发出服务器关闭事件
    app.emit('web:server:closing');
    
    try {
      // 优雅关闭服务器
      await fastify.close();
      app.log.info('Web server closed successfully');
      
      // 发出服务器已关闭事件
      app.emit('web:server:closed');
    } catch (error) {
      app.log.error('Error closing web server:', error);
      
      // 发出服务器关闭错误事件
      app.emit('web:server:close:error', { error });
    }
  });
  
  // 监听应用重载事件
  app.on('app:reload', async () => {
    app.log.info('Reloading web server routes...');
    
    // 清除现有路由缓存
    fastify.routes = {};
    
    // 重新注册路由
    if (typeof options.routes === 'function') {
      await options.routes(fastify, app);
    }
    
    app.log.info('Web server routes reloaded');
  });
}
```

#### 4.3.3 请求上下文集成

Web插件与框架的请求上下文系统集成，实现请求级别的依赖注入和数据共享：

```typescript
// src/integration/request-context.ts - 请求上下文集成
import { StratixApp } from 'stratix';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

export function setupRequestContextIntegration(
  app: StratixApp,
  fastify: FastifyInstance
): void {
  // 添加全局onRequest钩子处理请求上下文
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // 生成唯一请求ID
    const requestId = request.id || randomUUID();
    
    // 记录请求开始时间
    const startTime = process.hrtime();
    
    // 创建请求上下文
    const context = app.createRequestContext(requestId);
    
    // 将请求和响应对象添加到上下文
    context.set('request', request);
    context.set('reply', reply);
    context.set('startTime', startTime);
    
    // 添加便捷方法
    context.set('getResponseTime', () => {
      const diff = process.hrtime(startTime);
      return (diff[0] * 1e9 + diff[1]) / 1e6; // 转换为毫秒
    });
    
    // 将请求ID添加到请求和响应
    request.requestId = requestId;
    reply.header('X-Request-ID', requestId);
    
    // 添加日志上下文
    request.log = request.log.child({ requestId });
  });
  
  // 添加onResponse钩子清理请求上下文
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // 计算响应时间
    const context = app.getRequestContext(request.requestId);
    const responseTime = context.get('getResponseTime')();
    
    // 记录请求完成日志
    request.log.info({
      responseTime,
      statusCode: reply.statusCode
    }, 'Request completed');
    
    // 释放请求上下文
    app.releaseRequestContext(request.requestId);
  });
}
```

#### 4.3.4 配置集成

Web插件利用Stratix的配置系统获取默认设置和环境特定配置：

```typescript
// src/integration/config.ts - 配置集成
import { StratixApp } from 'stratix';
import { WebOptions, ServerOptions } from '../types';
import { DEFAULT_CONFIG } from '../constants';

export function loadConfigFromFramework(
  app: StratixApp,
  options: WebOptions
): WebOptions {
  // 从框架加载web配置
  const frameworkConfig = app.config('web') || {};
  
  // 从环境变量加载端口配置
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  const envHost = process.env.HOST;
  
  // 合并环境变量配置
  const envConfig: Partial<WebOptions> = {
    server: {
      ...(envPort && { port: envPort }),
      ...(envHost && { host: envHost })
    }
  };
  
  // 合并配置，优先级: 默认配置 < 框架配置 < 环境变量 < 传入选项
  return {
    ...DEFAULT_CONFIG,
    ...frameworkConfig,
    ...envConfig,
    ...options,
    
    // 深度合并server配置
    server: {
      ...DEFAULT_CONFIG.server,
      ...(frameworkConfig.server || {}),
      ...(envConfig.server || {}),
      ...(options.server || {})
    },
    
    // 保留其他深度合并...
  };
}
```

#### 4.3.5 日志集成

Web插件将Fastify的日志系统与Stratix的日志系统集成：

```typescript
// src/integration/logging.ts - 日志集成
import { StratixApp } from 'stratix';
import { FastifyInstance } from 'fastify';
import { WebOptions } from '../types';

export function setupLoggingIntegration(
  app: StratixApp,
  fastify: FastifyInstance,
  options: WebOptions
): void {
  // 如果未配置日志，使用框架日志器
  if (!options.server.logger) {
    // 创建Pino日志实例，将输出传递给Stratix日志器
    const pinoLogger = require('pino')({
      level: app.config('log.level') || 'info',
      transport: {
        target: 'pino-abstract-transport',
        options: {
          write: (obj: any) => {
            const { level, msg, time, ...rest } = obj;
            
            // 映射Pino日志级别到Stratix日志级别
            const mappedLevel = mapLogLevel(level);
            
            // 使用Stratix日志器记录
            app.log[mappedLevel](rest, msg);
          }
        }
      }
    });
    
    // 将Pino日志器附加到Fastify
    fastify.log = pinoLogger;
  }
  
  // 添加请求日志格式化器
  if (!options.server.disableRequestLogging) {
    fastify.addHook('onResponse', (request, reply, done) => {
      request.log.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime()
      }, 'Request completed');
      done();
    });
  }
}

// 映射Pino日志级别到Stratix日志级别
function mapLogLevel(pinoLevel: string): string {
  const levelMap: Record<string, string> = {
    10: 'trace',
    20: 'debug',
    30: 'info',
    40: 'warn',
    50: 'error',
    60: 'fatal'
  };
  
  return levelMap[pinoLevel] || 'info';
}
```

#### 4.3.6 错误处理集成

Web插件将Fastify的错误处理系统与Stratix的错误处理系统集成：

```typescript
// src/integration/error-handling.ts - 错误处理集成
import { StratixApp } from 'stratix';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebOptions } from '../types';

export function setupErrorHandlingIntegration(
  app: StratixApp,
  fastify: FastifyInstance,
  options: WebOptions
): void {
  // 将框架错误转换为HTTP错误
  setupErrorTransformers(app, fastify);
  
  // 如果没有提供自定义错误处理器，使用集成的处理器
  if (!options.errorHandler) {
    fastify.setErrorHandler((error, request, reply) => {
      // 处理特殊的应用错误
      if (error.name === 'StratixError') {
        return handleStratixError(error, request, reply, app);
      }
      
      // 处理验证错误
      if (error.validation) {
        return handleValidationError(error, request, reply, app);
      }
      
      // 处理其他错误
      return handleGenericError(error, request, reply, app);
    });
  }
  
  // 设置未找到路由处理器
  if (!options.notFoundHandler) {
    fastify.setNotFoundHandler((request, reply) => {
      app.emit('web:error:notFound', { 
        request: { 
          method: request.method,
          url: request.url,
          id: request.id
        }
      });
      
      reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Route ${request.method}:${request.url} not found`
      });
    });
  }
  
  // 处理服务器错误
  fastify.server.on('error', (error: Error) => {
    app.log.error('Web server error:', error);
    app.emit('web:server:error', { error });
  });
}

// 设置错误转换器
function setupErrorTransformers(app: StratixApp, fastify: FastifyInstance): void {
  const httpErrors = fastify.httpErrors;
  
  // 映射框架错误到HTTP错误
  app.errorTransformer.register('AuthenticationError', (error) => {
    return httpErrors.unauthorized(error.message);
  });
  
  app.errorTransformer.register('AuthorizationError', (error) => {
    return httpErrors.forbidden(error.message);
  });
  
  app.errorTransformer.register('ValidationError', (error) => {
    return {
      ...httpErrors.badRequest(error.message),
      validation: error.details
    };
  });
  
  app.errorTransformer.register('NotFoundError', (error) => {
    return httpErrors.notFound(error.message);
  });
  
  app.errorTransformer.register('ConflictError', (error) => {
    return httpErrors.conflict(error.message);
  });
}

// 处理Stratix特定错误
function handleStratixError(
  error: any,
  request: FastifyRequest,
  reply: FastifyReply,
  app: StratixApp
): void {
  // 使用应用的错误转换器转换错误
  const transformedError = app.errorTransformer.transform(error);
  
  // 记录错误
  request.log.error(transformedError, 'Application error');
  
  // 发出错误事件
  app.emit('web:error:application', { 
    error: transformedError,
    request: { 
      method: request.method,
      url: request.url,
      id: request.id
    }
  });
  
  // 发送错误响应
  const statusCode = transformedError.statusCode || 500;
  reply.status(statusCode).send({
    statusCode,
    error: transformedError.name || 'Error',
    message: transformedError.message || 'An application error occurred'
  });
}

// 处理验证错误
function handleValidationError(
  error: any,
  request: FastifyRequest,
  reply: FastifyReply,
  app: StratixApp
): void {
  // 记录验证错误
  request.log.info({ validation: error.validation }, 'Validation error');
  
  // 发出验证错误事件
  app.emit('web:error:validation', { 
    error,
    validation: error.validation,
    request: { 
      method: request.method,
      url: request.url,
      id: request.id
    }
  });
  
  // 发送验证错误响应
  reply.status(400).send({
    statusCode: 400,
    error: 'Bad Request',
    message: 'Validation error',
    validation: error.validation
  });
}

// 处理通用错误
function handleGenericError(
  error: any,
  request: FastifyRequest,
  reply: FastifyReply,
  app: StratixApp
): void {
  const statusCode = error.statusCode || 500;
  
  // 记录错误，500错误使用error级别，其他使用info级别
  if (statusCode >= 500) {
    request.log.error(error, 'Server error');
    
    // 发出服务器错误事件
    app.emit('web:error:server', { 
      error,
      request: { 
        method: request.method,
        url: request.url,
        id: request.id
      }
    });
  } else {
    request.log.info({ err: error }, 'Client error');
    
    // 发出客户端错误事件
    app.emit('web:error:client', { 
      error,
      request: { 
        method: request.method,
        url: request.url,
        id: request.id
      }
    });
  }
  
  // 构建错误响应
  const errorResponse: any = {
    statusCode,
    error: error.name || (statusCode >= 500 ? 'Internal Server Error' : 'Bad Request'),
    message: error.message || 'An error occurred'
  };
  
  // 在生产环境隐藏500错误的详情
  if (statusCode >= 500 && app.env === 'production') {
    errorResponse.message = 'Internal Server Error';
  } else {
    // 添加错误堆栈（在非生产环境）
    if (app.env !== 'production' && error.stack) {
      errorResponse.stack = error.stack;
    }
  }
  
  // 发送错误响应
  reply.status(statusCode).send(errorResponse);
}
```

#### 4.3.7 健康检查集成

Web插件提供健康检查端点，与框架的健康检查系统集成：

```typescript
// src/integration/health-check.ts - 健康检查集成
import { StratixApp } from 'stratix';
import { FastifyInstance } from 'fastify';
import { WebOptions } from '../types';

export function setupHealthCheck(
  app: StratixApp,
  fastify: FastifyInstance,
  options: WebOptions
): void {
  // 如果启用了健康检查
  if (options.healthCheck?.enabled !== false) {
    const path = options.healthCheck?.path || '/health';
    
    // 注册健康检查路由
    fastify.get(path, async (request, reply) => {
      try {
        // 执行框架健康检查
        const healthStatus = await app.health.check();
        
        // 获取Web服务器状态
        const webStatus = {
          status: 'up',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        };
        
        // 合并状态结果
        const result = {
          status: healthStatus.status,
          services: {
            ...healthStatus.services,
            web: webStatus
          }
        };
        
        // 如果整体状态非健康，设置相应的HTTP状态码
        const httpStatus = result.status === 'up' ? 200 : 503;
        
        reply.status(httpStatus).send(result);
      } catch (error) {
        // 健康检查自身失败
        app.log.error('Health check failed:', error);
        
        reply.status(500).send({
          status: 'down',
          error: 'Health check system failure'
        });
      }
    });
    
    app.log.info(`Health check endpoint registered at '${path}'`);
  }
}
```

#### 4.3.8 集成流程

当Web插件注册到Stratix应用时，集成流程按以下步骤执行：

1. **配置加载**：从应用配置系统和环境变量中加载Web服务器配置
2. **依赖注入**：将Web服务器实例和相关组件注册到框架的依赖注入容器
3. **日志集成**：连接Fastify和Stratix的日志系统
4. **错误处理集成**：建立错误转换和处理机制
5. **生命周期绑定**：将Web服务器的生命周期与应用的生命周期绑定
6. **请求上下文集成**：设置请求级别的上下文和依赖注入
7. **健康检查设置**：创建与框架健康检查系统集成的端点
8. **事件绑定**：监听框架事件并在适当时发出Web相关事件

下图展示Web插件与Stratix框架的整体集成架构：

```
┌───────────────────────────────────────────────────┐
│                  Stratix 应用                      │
│                                                   │
│  ┌─────────────┐    ┌────────────┐    ┌────────┐  │
│  │  配置系统    │◄───┤ 依赖注入容器 │◄───┤ 日志器  │  │
│  └──────┬──────┘    └──────┬─────┘    └────┬───┘  │
│         │                  │                │      │
│         ▼                  ▼                ▼      │
│  ┌─────────────┐    ┌────────────┐    ┌────────┐  │
│  │ 生命周期管理 │    │ 事件系统    │    │ 错误处理 │  │
│  └──────┬──────┘    └──────┬─────┘    └────┬───┘  │
│         │                  │                │      │
│         └──────────┬───────┘────────┬──────┘      │
│                    │                │             │
└────────────────────┼────────────────┼─────────────┘
                     │                │              
                     ▼                ▼              
          ┌─────────────────────────────────┐        
          │        @stratix/web 插件        │        
          │                                 │        
          │  ┌─────────┐      ┌──────────┐  │        
          │  │ 插件管理 │◄─────┤ Web服务器 │  │        
          │  └────┬────┘      └─────┬────┘  │        
          │       │                 │       │        
          │       ▼                 ▼       │        
          │  ┌─────────┐      ┌──────────┐  │        
          │  │ 路由管理 │      │ 中间件链  │  │        
          │  └────┬────┘      └─────┬────┘  │        
          │       │                 │       │        
          │       └────────┬────────┘       │        
          │                │                │        
          │                ▼                │        
          │        ┌──────────────┐         │        
          │        │   Fastify    │         │        
          │        └──────────────┘         │        
          └─────────────────────────────────┘        
```

通过这些集成点，`@stratix/web` 插件能够无缝地融入Stratix框架生态系统，同时保持Fastify的强大功能和性能优势。

## 5. 高级特性

### 5.1 服务器选项

`@stratix/web` 插件提供了丰富的服务器配置选项，允许开发者精细控制Web服务器的各个方面。本节详细介绍这些高级选项。

#### 5.1.1 服务器监听选项

服务器监听选项控制Fastify实例如何绑定和监听网络请求：

```typescript
// 基本监听配置
app.register(webPlugin, {
  server: {
    // 监听端口
    port: 3000,
    
    // 监听地址 (IPv4/IPv6)
    host: '0.0.0.0',
    
    // 监听选项
    listenOptions: {
      // 请求队列长度
      backlog: 511,
      
      // Unix域套接字权限（数字）
      mode: 0o777,
      
      // 传递文件描述符
      readableAll: false,
      writableAll: false,
      
      // IPv6优先
      ipv6Only: false,
      
      // 专门针对HTTPS的选项
      // https: {
      //   allowHTTP1: true
      // }
    }
  }
});
```

#### 5.1.2 超时与连接管理

超时和连接管理选项控制请求处理的时间限制：

```typescript
app.register(webPlugin, {
  server: {
    // 请求超时（毫秒）
    requestTimeout: 30000,
    
    // 连接保持活跃超时
    keepAliveTimeout: 5000,
    
    // 请求ID生成策略
    requestIdHeader: 'x-request-id',
    
    // 最大请求头大小
    maxRequestSize: 1048576,
    
    // 是否处理来自客户端的断开请求
    clientErrorHandler: true,
    
    // 关闭延迟，用于优雅关闭（毫秒）
    closeTimeout: 10000
  }
});
```

#### 5.1.3 HTTP/2 支持

HTTP/2 配置提供了对现代HTTP协议的支持：

```typescript
app.register(webPlugin, {
  server: {
    // 启用HTTP/2支持
    http2: true,
    
    // HTTP/2设置
    http2SessionTimeout: 3000,
    
    // 是否允许降级到HTTP/1.1
    allowHTTP1: true,
    
    // 最大HTTP头大小
    maxHeaderListSize: 65536
  }
});
```

#### 5.1.4 TLS/HTTPS 配置

TLS/HTTPS 配置提供了安全的HTTPS连接：

```typescript
app.register(webPlugin, {
  server: {
    // 启用HTTPS
    https: {
      // 证书选项
      key: fs.readFileSync('./server.key'),
      cert: fs.readFileSync('./server.cert'),
      
      // 可选的CA证书
      ca: fs.readFileSync('./ca.cert'),
      
      // TLS版本和密码选项
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      
      // 密码套件
      ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
      
      // 客户端证书验证
      requestCert: false,
      rejectUnauthorized: true,
      
      // ALPN支持(用于HTTP/2协商)
      alpnProtocols: ['h2', 'http/1.1']
    }
  }
});
```

#### 5.1.5 日志与调试选项

日志和调试选项允许详细控制服务器的日志行为：

```typescript
app.register(webPlugin, {
  server: {
    // 日志配置
    logger: {
      // 日志级别
      level: 'info',
      
      // 将属性标记为消息
      messageKey: 'msg',
      
      // 序列化器
      serializers: {
        req: require('pino-std-serializers').req,
        res: require('pino-std-serializers').res,
        err: require('pino-std-serializers').err
      },
      
      // 开发模式下的美化输出
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      },
      
      // 重定向标准输出
      // file: '/var/log/app.log',
      
      // 自定义日志器
      customLevels: {
        custom: 35
      },
      
      // 自定义时间戳
      timestamp: () => `,"time":"${new Date().toISOString()}"`
    },
    
    // 禁用请求日志记录
    disableRequestLogging: false,
    
    // 日志所有请求体
    logRequestBody: false,
    
    // 暴露详细错误
    exposeStacktraces: process.env.NODE_ENV !== 'production'
  }
});
```

#### 5.1.6 请求解析与验证选项

请求解析和验证选项控制请求的处理和验证方式：

```typescript
app.register(webPlugin, {
  server: {
    // 最大请求体大小（字节）
    bodyLimit: 1048576,
    
    // 忽略尾部斜杠
    ignoreTrailingSlash: true,
    
    // 大小写敏感路由
    caseSensitive: true,
    
    // Ajv验证选项
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
        allErrors: true
      },
      plugins: [
        require('ajv-formats'),
        require('ajv-keywords')
      ]
    },
    
    // 自定义JSON解析器
    jsonParser: {
      strict: true,
      limit: 1048576
    },
    
    // 查询字符串解析器
    querystringParser: {
      depth: 5,
      parameterLimit: 100,
      allowDots: true,
      arrayLimit: 50,
      parseArrays: true
    },
    
    // 自定义错误处理
    schemaErrorFormatter: (errors, dataVar) => {
      return new Error(`Validation error: ${errors[0].message}`);
    }
  }
});
```

这些高级服务器选项提供了对Web服务器行为的全面控制，让开发者能够根据特定需求精确配置服务器性能、安全性和功能。

### 5.2 安全配置

Web应用程序的安全性至关重要，`@stratix/web` 插件提供了多层安全特性和配置选项，帮助开发者构建坚固的应用程序。

#### 5.2.1 内容安全策略配置

内容安全策略(CSP)是一种防止XSS攻击的关键安全层：

```typescript
app.register(webPlugin, {
  plugins: {
    helmet: {
      enabled: true,
      options: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'trusted-cdn.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'trusted-cdn.com'],
            imgSrc: ["'self'", 'data:', 'trusted-cdn.com'],
            connectSrc: ["'self'", 'api.example.com'],
            fontSrc: ["'self'", 'trusted-cdn.com'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            reportUri: '/csp-violation-report'
          }
        }
      }
    }
  }
});
```

#### 5.2.2 跨站点请求伪造(CSRF)保护

CSRF保护确保只有来自受信任网站的请求能够修改数据：

```typescript
app.register(webPlugin, {
  plugins: {
    // 启用cookie支持(CSRF依赖)
    cookie: {
      enabled: true,
      options: {
        secret: 'your-cookie-secret-key',
        parseOptions: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          signed: true
        }
      }
    },
    
    // CSRF保护配置
    csrf: {
      enabled: true,
      options: {
        // 使用会话存储CSRF令牌
        sessionPlugin: 'session',
        
        // 或使用cookie存储CSRF令牌
        cookieOpts: {
          signed: true,
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          path: '/'
        },
        
        // CSRF设置
        csrfOpts: {
          value: (req) => {
            // 自定义CSRF令牌获取（例如从header）
            return req.headers['x-csrf-token'];
          }
        },
        
        // 用于存储令牌的键名
        cookieKey: '_csrf',
        sessionKey: 'csrfToken'
      }
    }
  }
});
```

#### 5.2.3 跨源资源共享(CORS)配置

CORS控制哪些外部域可以访问API：

```typescript
app.register(webPlugin, {
  plugins: {
    cors: {
      enabled: true,
      options: {
        // 允许的源（域）
        origin: [
          'https://example.com',
          'https://admin.example.com'
          // 也可以使用函数或正则表达式
        ],
        
        // 允许的HTTP方法
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        
        // 允许的请求头
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        
        // 公开的响应头（客户端可读）
        exposedHeaders: ['X-Rate-Limit', 'X-Response-Time'],
        
        // 允许凭证（cookies、HTTP认证）
        credentials: true,
        
        // 预检请求缓存时间（秒）
        maxAge: 86400,
        
        // 预检请求处理
        preflightContinue: false,
        
        // OPTIONS请求成功状态码
        optionsSuccessStatus: 204,
        
        // 是否启用预检请求
        preflight: true,
        
        // 严格预检请求检查
        strictPreflight: true
      }
    }
  }
});
```

#### 5.2.4 安全HTTP头配置

安全HTTP头对保护应用程序免受各种攻击至关重要：

```typescript
app.register(webPlugin, {
  plugins: {
    helmet: {
      enabled: true,
      options: {
        // 跨站点打开者政策
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        
        // 跨站点嵌入者政策
        crossOriginEmbedderPolicy: { policy: 'require-corp' },
        
        // 跨站点资源政策
        crossOriginResourcePolicy: { policy: 'same-origin' },
        
        // DNS预取控制
        dnsPrefetchControl: { allow: false },
        
        // 期望CT头
        expectCt: { 
          maxAge: 86400,
          enforce: true,
          reportUri: '/expect-ct-report'
        },
        
        // 防止iframe嵌套
        frameguard: { action: 'deny' },
        
        // 隐藏X-Powered-By头
        hidePoweredBy: true,
        
        // HSTS头(HTTP严格传输安全)
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        
        // 阻止IE打开不受信任的HTML
        ieNoOpen: true,
        
        // 阻止MIME类型嗅探
        noSniff: true,
        
        // 禁止浏览器生成机密上下文
        originAgentCluster: true,
        
        // 控制Adobe Flash和PDF文件的跨域行为
        permittedCrossDomainPolicies: { permittedPolicies: 'none' },
        
        // 控制引荐来源信息
        referrerPolicy: { policy: 'no-referrer' },
        
        // 启用XSS过滤
        xssFilter: true
      }
    }
  }
});
```

#### 5.2.5 认证与授权集成

`@stratix/web` 插件可以集成各种认证和授权策略：

```typescript
app.register(webPlugin, {
  plugins: {
    // 启用会话支持
    session: {
      enabled: true,
      options: {
        secret: 'your-session-secret-key',
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 86400000 // 24小时
        },
        saveUninitialized: false,
        store: {
          type: 'redis',
          options: {
            host: 'localhost',
            port: 6379,
            ttl: 86400
          }
        }
      }
    }
  },
  
  // 自定义认证中间件
  hooks: {
    onRequest: async (request, reply) => {
      // 初始化认证上下文
      request.auth = { isAuthenticated: false, user: null };
    },
    
    preValidation: async (request, reply) => {
      // 从会话获取用户（如果存在）
      if (request.session && request.session.user) {
        request.auth.isAuthenticated = true;
        request.auth.user = request.session.user;
        return;
      }
      
      // 基于令牌的认证
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          // 验证JWT令牌
          const user = await verifyToken(token);
          request.auth.isAuthenticated = true;
          request.auth.user = user;
        } catch (error) {
          // 令牌无效，不设置用户
        }
      }
    }
  },
  
  // 受保护路由
  routes: (fastify, app) => {
    // 定义认证中间件
    const authenticate = async (request, reply) => {
      if (!request.auth.isAuthenticated) {
        throw fastify.httpErrors.unauthorized('Authentication required');
      }
    };
    
    // 定义授权中间件
    const authorize = (role) => async (request, reply) => {
      if (!request.auth.user.roles.includes(role)) {
        throw fastify.httpErrors.forbidden(`Role '${role}' required`);
      }
    };
    
    // 公共路由
    fastify.get('/public', async (request, reply) => {
      return { message: 'Public content' };
    });
    
    // 受认证保护的路由
    fastify.get('/protected',
      { preHandler: authenticate },
      async (request, reply) => {
        return { message: 'Protected content', user: request.auth.user };
      }
    );
    
    // 受角色保护的路由
    fastify.get('/admin',
      { preHandler: [authenticate, authorize('admin')] },
      async (request, reply) => {
        return { message: 'Admin content' };
      }
    );
  }
});
```

#### 5.2.6 速率限制

配置速率限制防止暴力攻击和DOS攻击：

```typescript
app.register(webPlugin, {
  plugins: {
    // 自定义速率限制插件
    custom: [
      {
        module: require('@fastify/rate-limit'),
        options: {
          // 全局速率限制
          max: 100,
          timeWindow: '1 minute',
          
          // 缓存引擎
          store: new RateLimitRedisStore({
            client: new Redis({ host: 'localhost', port: 6379 }),
            prefix: 'rate-limit:'
          }),
          
          // 客户端标识符提取
          keyGenerator: (request) => {
            return request.headers['x-api-key'] || 
                   request.ip ||
                   request.headers['x-forwarded-for'];
          },
          
          // 超出限制时的错误处理
          errorResponseBuilder: (request, context) => {
            return {
              statusCode: 429,
              error: 'Too Many Requests',
              message: `Rate limit exceeded. Try again in ${context.after}`,
              limit: context.max,
              remaining: 0,
              reset: context.reset
            };
          },
          
          // 添加速率限制头
          addHeaders: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
            'retry-after': true
          }
        }
      }
    ]
  },
  
  // 特定路由速率限制
  routes: (fastify, app) => {
    // 登录路由使用更严格的限制
    fastify.post('/auth/login',
      {
        config: {
          rateLimit: {
            max: 10,
            timeWindow: '1 minute'
          }
        }
      },
      async (request, reply) => {
        // 登录逻辑
      }
    );
  }
});
```

#### 5.2.7 安全最佳实践实施

`@stratix/web` 插件通过默认配置和自动化工具强制实施安全最佳实践：

```typescript
app.register(webPlugin, {
  // 安全相关服务器选项
  server: {
    trustProxy: true,
    disableRequestLogging: true, // 防止敏感信息泄漏
    exposeStacktraces: false,
    bodyLimit: 1048576, // 防止请求体过大
    maxParamLength: 100 // 防止参数过长
  },
  
  // 声明性安全规则
  security: {
    // 强制HTTPS（开发环境除外）
    forceHttps: process.env.NODE_ENV === 'production',
    
    // 防止参数污染
    preventParamPollution: true,
    
    // 客户端IP信任策略
    trustClientIp: 'first', // 'first', 'last', 'all', or false
    
    // 允许的上传文件类型
    allowedUploadMimetypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'text/plain'
    ],
    
    // 黑名单IP地址
    ipDenylist: [
      '192.168.1.1',
      '10.0.0.1/24'
    ],
    
    // 请求过滤器 - 阻止特定请求
    requestFilter: (request) => {
      // 检查恶意负载签名
      if (request.body && typeof request.body.query === 'string') {
        if (request.body.query.includes('drop table')) {
          return false; // 拒绝请求
        }
      }
      return true; // 允许请求
    }
  }
});

// 安全钩子和中间件
fastify.addHook('onRequest', async (request, reply) => {
  // 阻止机器人和爬虫
  const userAgent = request.headers['user-agent'] || '';
  if (userAgent.includes('BadBot') || userAgent.includes('Scraper')) {
    throw fastify.httpErrors.forbidden('Unauthorized bot activity');
  }
  
  // 验证内容类型
  if (request.method === 'POST' || request.method === 'PUT') {
    const contentType = request.headers['content-type'] || '';
    if (!contentType.includes('application/json') && 
        !contentType.includes('multipart/form-data')) {
      throw fastify.httpErrors.unsupportedMediaType('Unsupported content type');
    }
  }
});

// 安全报告路由
fastify.post('/security/report', async (request, reply) => {
  const report = request.body;
  app.log.warn({ securityReport: report }, 'Security report received');
  await app.services.securityNotifier.notify(report);
  return { received: true };
});
```

### 5.3 性能优化

`@stratix/web` 插件包含多种性能优化特性，帮助开发者构建高效、响应迅速的Web应用。本节详细介绍这些优化技术和配置选项。

#### 5.3.1 压缩与传输优化

内容压缩显著减少传输大小，提高响应速度：

```typescript
app.register(webPlugin, {
  plugins: {
    // 响应压缩配置
    compress: {
      enabled: true,
      options: {
        // 支持的编码方式
        encodings: ['gzip', 'deflate', 'br'],
        
        // 仅压缩超过此大小的响应（字节）
        threshold: 1024,
        
        // 针对内容类型的定制
        customTypes: /^text\/|^application\/json|^application\/javascript/,
        
        // 禁止某些浏览器的压缩
        userAgentFilter: (userAgent) => !userAgent.includes('MSIE'),
        
        // 压缩级别（1-9，9为最高压缩率）
        brotliOptions: {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 5
          }
        },
        gzipOptions: {
          level: 6
        },
        deflateOptions: {
          level: 6
        }
      }
    },
    
    // ETag支持
    etag: {
      enabled: true,
      options: {
        // 生成弱ETag
        weak: true
      }
    }
  }
});
```

#### 5.3.2 缓存控制

缓存控制可以减少不必要的请求和处理：

```typescript
// 通用缓存控制中间件
app.register(webPlugin, {
  hooks: {
    onRequest: async (request, reply) => {
      // 在响应中添加基本缓存头
      reply.header('Cache-Control', 'no-cache');
    },
    
    onSend: async (request, reply, payload) => {
      // 为静态资源设置缓存控制
      const url = request.url;
      if (url.match(/\.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|ttf)$/)) {
        reply.header('Cache-Control', 'public, max-age=86400, immutable');
      } else if (url.includes('/api/')) {
        // API响应通常不缓存
        reply.header('Cache-Control', 'no-store, max-age=0');
      }
      
      return payload;
    }
  },
  
  // 自定义缓存插件
  plugins: {
    custom: [
      {
        module: require('fastify-caching'),
        options: {
          privacy: 'private',
          expiresIn: 300,
          serverExpiresIn: 300,
          cache: new Map() // 内存缓存
        }
      }
    ]
  }
});

// 实现基于Redis的API响应缓存
const responseCache = new Redis();

// 在路由级别添加缓存
fastify.get('/api/products',
  {
    config: {
      cache: {
        expiresIn: 60 // 秒
      }
    }
  },
  async (request, reply) => {
    const cacheKey = `api:products:${JSON.stringify(request.query)}`;
    
    // 检查缓存
    const cachedData = await responseCache.get(cacheKey);
    if (cachedData) {
      reply.header('X-Cache', 'HIT');
      return JSON.parse(cachedData);
    }
    
    // 执行查询
    const products = await db.products.findAll(request.query);
    
    // 存储到缓存
    await responseCache.set(
      cacheKey,
      JSON.stringify(products),
      'EX',
      60
    );
    
    reply.header('X-Cache', 'MISS');
    return products;
  }
);
```

#### 5.3.3 连接池与数据库优化

数据库连接池管理对API性能至关重要：

```typescript
// 数据库优化与连接池配置
app.register(webPlugin, {
  // 初始化数据库连接池
  hooks: {
    async onReady(fastify, app) {
      // 创建连接池
      const pool = await app.services.database.createPool({
        min: 5,
        max: 20,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        propagateCreateError: false
      });
      
      // 注册装饰器以便在路由中访问
      fastify.decorate('db', pool);
      
      // 优雅关闭
      fastify.addHook('onClose', async () => {
        app.log.info('Closing database connection pool');
        await pool.end();
      });
    }
  }
});

// 在路由中使用连接池
fastify.get('/api/users/:id', async (request, reply) => {
  // 获取数据库连接
  const client = await request.server.db.acquire();
  
  try {
    // 使用连接执行查询
    const user = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [request.params.id]
    );
    
    return user;
  } finally {
    // 确保连接归还到池中
    request.server.db.release(client);
  }
});
```

#### 5.3.4 优化JSON序列化

JSON序列化优化可以提高API响应速度：

```typescript
app.register(webPlugin, {
  server: {
    // 使用快速JSON序列化器
    serializerOpts: {
      // 内置的更快序列化
      serializer: (data) => JSON.stringify(data),
      
      // 或使用第三方库
      // serializer: require('fast-json-stringify')
    }
  },
  
  // 自定义JSON序列化钩子
  hooks: {
    preSerialization: async (request, reply, payload) => {
      // 移除敏感字段
      if (payload && payload.password) {
        delete payload.password;
      }
      
      // 压缩大型数组
      if (payload && Array.isArray(payload.items) && payload.items.length > 1000) {
        // 仅保留前1000项并添加总计
        payload._itemsCount = payload.items.length;
        payload.items = payload.items.slice(0, 1000);
        payload._truncated = true;
      }
      
      return payload;
    }
  }
});
```

#### 5.3.5 WebSocket优化

WebSocket连接优化可以提高实时应用的性能：

```typescript
app.register(webPlugin, {
  plugins: {
    // 添加WebSocket支持
    custom: [
      {
        module: require('@fastify/websocket'),
        options: {
          options: {
            // 最大消息大小
            maxPayload: 1048576,
            
            // 心跳间隔（毫秒）
            pingInterval: 30000,
            
            // 心跳超时（毫秒）
            pingTimeout: 10000,
            
            // 客户端追踪
            clientTracking: true,
            
            // 压缩选项
            perMessageDeflate: {
              zlibDeflateOptions: {
                level: 6,
                memLevel: 8
              }
            }
          }
        }
      }
    ]
  }
});

// 优化的WebSocket路由
fastify.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    // 添加关闭超时
    const pingTimer = setInterval(() => {
      if (connection.socket.readyState === 1) {
        connection.socket.ping();
      }
    }, 30000);
    
    // 处理消息
    connection.socket.on('message', (message) => {
      try {
        // 限制消息频率（基本限流）
        if (connection.messageCount > 100) {
          connection.socket.send(JSON.stringify({
            error: 'Rate limit exceeded'
          }));
          return;
        }
        
        connection.messageCount = (connection.messageCount || 0) + 1;
        
        // 处理消息
        // ...
        
        // 发送响应
        connection.socket.send(JSON.stringify({
          success: true
        }));
      } catch (error) {
        connection.socket.send(JSON.stringify({
          error: 'Error processing message'
        }));
      }
    });
    
    // 清理资源
    connection.socket.on('close', () => {
      clearInterval(pingTimer);
    });
  });
});
```

#### 5.3.6 负载优化与集群

对于高流量应用，可以利用Node.js集群与负载优化：

```typescript
// 集群配置
if (process.env.ENABLE_CLUSTER === 'true' && cluster.isPrimary) {
  const numCPUs = require('os').cpus().length;
  
  // 记录主进程信息
  console.log(`Master ${process.pid} is running`);
  
  // 衍生工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // 监听工作进程退出事件
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // 替换死亡的工作进程
    cluster.fork();
  });
} else {
  // 工作进程代码
  const app = require('stratix').createApp();
  
  // 注册Web插件
  app.register(webPlugin, {
    server: {
      // 所有工作进程共享同一端口
      port: 3000
    }
  });
  
  app.start();
}

// 在插件配置中启用工作线程
app.register(webPlugin, {
  performance: {
    // 使用工作线程处理复杂计算
    useWorkerThreads: true,
    
    // 工作线程池配置
    workerThreadsPool: {
      min: 2,
      max: 8
    },
    
    // 最大请求队列长度
    maxRequestQueue: 100,
    
    // CPU密集型路由
    cpuIntensiveRoutes: [
      '/api/reports/generate',
      '/api/image/process'
    ]
  }
});
```

#### 5.3.7 内存管理

有效的内存管理可以防止内存泄漏和优化性能：

```typescript
app.register(webPlugin, {
  hooks: {
    onRequest: async (request, reply) => {
      // 记录内存使用情况
      const memoryUsage = process.memoryUsage();
      request.log.debug({
        rss: Math.round(memoryUsage.rss / 1048576),
        heapTotal: Math.round(memoryUsage.heapTotal / 1048576),
        heapUsed: Math.round(memoryUsage.heapUsed / 1048576)
      }, 'Memory usage (MB)');
    }
  }
});

// 添加周期性内存优化
let lastGC = Date.now();

function scheduleGC() {
  if (global.gc && Date.now() - lastGC > 300000) {
    // 每5分钟强制垃圾回收
    global.gc();
    lastGC = Date.now();
    
    // 记录内存状态
    const memoryUsage = process.memoryUsage();
    app.log.info({
      rss: Math.round(memoryUsage.rss / 1048576),
      heapTotal: Math.round(memoryUsage.heapTotal / 1048576),
      heapUsed: Math.round(memoryUsage.heapUsed / 1048576)
    }, 'Memory usage after GC (MB)');
  }
}

// 定期调度内存检查
setInterval(scheduleGC, 60000);

// 启用内存使用监控
app.register(webPlugin, {
  plugins: {
    // 添加内存监控路由
    custom: [
      {
        module: (fastify, options, done) => {
          fastify.get('/admin/memory', async (request, reply) => {
            const memoryUsage = process.memoryUsage();
            
            // 执行可选的GC
            if (request.query.gc === 'true' && global.gc) {
              global.gc();
            }
            
            return {
              memoryUsage: {
                rss: Math.round(memoryUsage.rss / 1048576),
                heapTotal: Math.round(memoryUsage.heapTotal / 1048576),
                heapUsed: Math.round(memoryUsage.heapUsed / 1048576),
                external: Math.round(memoryUsage.external / 1048576),
                arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1048576)
              },
              uptime: process.uptime()
            };
          });
          done();
        }
      }
    ]
  }
});
```

通过实施这些性能优化，`@stratix/web` 插件能够支持高流量和大规模应用，提供低延迟响应和高吞吐量。这些特性使Stratix框架成为构建高性能Web API和应用的理想选择。

