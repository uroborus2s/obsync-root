# @stratix/web 基础集成插件使用示例

本文档展示了如何在 @stratix/web 中配置和使用基础集成插件，包括 HTTPS、CORS、压缩、Swagger 文档和静态文件服务等。

## 1. 注册插件

```typescript
import { createApp } from '@stratix/core';
import webPlugin from '@stratix/web';
import path from 'node:path';
import fs from 'node:fs';

const app = createApp();

// 注册 Web 插件，配置各种基础功能
app.register(webPlugin, {
  // 服务器配置
  server: {
    port: 3000,
    host: 'localhost',
    // HTTPS 配置示例
    https: {
      key: fs.readFileSync(path.join(__dirname, 'keys/private-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'keys/public-cert.pem'))
    }
  },
  
  // CORS 配置
  cors: {
    origin: ['https://example.com', 'http://localhost:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    maxAge: 86400
  },
  
  // 压缩配置
  compression: true, // 使用默认配置
  
  // Swagger 文档配置
  swagger: {
    swagger: {
      info: {
        title: '我的 API 文档',
        description: '这是一个示例 API 文档',
        version: '1.0.0'
      },
      tags: [
        { name: 'users', description: '用户相关接口' },
        { name: 'products', description: '产品相关接口' }
      ],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    },
    ui: {
      routePrefix: '/api-docs', // 自定义文档路径
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true
      }
    }
  },
  
  // 静态文件服务配置
  static: {
    root: path.join(__dirname, 'public'),
    prefix: '/static/',
    decorateReply: false,
    index: ['index.html', 'index.htm'],
    cacheControl: true,
    maxAge: 86400000, // 一天
    etag: true
  },
  
  // Helmet 安全配置
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.example.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'cdn.example.com'],
        imgSrc: ["'self'", 'data:', 'cdn.example.com'],
        connectSrc: ["'self'", 'api.example.com']
      }
    }
  }
});

// 启动应用
await app.start();
console.log('应用已启动，访问 https://localhost:3000');
```

## 2. 各个插件的独立配置

### 2.1 HTTPS 配置

```typescript
// 方式一：通过服务器配置
app.register(webPlugin, {
  server: {
    https: {
      key: fs.readFileSync('./keys/server.key'),
      cert: fs.readFileSync('./keys/server.cert')
    }
  }
});

// 方式二：如果需要更多 HTTPS 选项
app.register(webPlugin, {
  server: {
    https: {
      key: fs.readFileSync('./keys/server.key'),
      cert: fs.readFileSync('./keys/server.cert'),
      allowHTTP1: true, // 允许 HTTP/1.1
      requestCert: true, // 请求客户端证书
      rejectUnauthorized: false // 不拒绝未授权的连接
    }
  }
});
```

### 2.2 CORS 配置

```typescript
// 简单配置
app.register(webPlugin, {
  cors: true // 使用默认配置，允许所有源
});

// 详细配置
app.register(webPlugin, {
  cors: {
    origin: ['https://example.com', 'https://sub.example.com'],
    methods: ['GET', 'PUT', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Custom-Header'],
    credentials: true,
    maxAge: 86400 // 预检请求缓存 24 小时
  }
});

// 动态源配置
app.register(webPlugin, {
  cors: {
    origin: (origin, cb) => {
      const allowedOrigins = ['https://example.com', 'https://sub.example.com'];
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('不允许的来源'), false);
      }
    }
  }
});
```

### 2.3 压缩配置

```typescript
// 简单配置
app.register(webPlugin, {
  compression: true // 使用默认配置
});

// 详细配置
app.register(webPlugin, {
  compression: {
    encodings: ['gzip', 'deflate'], // 支持的编码
    threshold: 1024, // 只压缩大于 1KB 的响应
    inflateIfDeflated: true // 如果已经压缩则解压
  }
});
```

### 2.4 Swagger 文档配置

```typescript
// 简单配置
app.register(webPlugin, {
  swagger: true // 使用默认配置
});

// 详细配置
app.register(webPlugin, {
  swagger: {
    swagger: {
      info: {
        title: 'API 文档',
        description: '这是一个自动生成的 API 文档',
        version: '1.0.0',
        contact: {
          name: '开发团队',
          email: 'dev@example.com',
          url: 'https://example.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      externalDocs: {
        description: '更多文档',
        url: 'https://example.com/docs'
      },
      tags: [
        { name: 'user', description: '用户管理' },
        { name: 'product', description: '产品管理' }
      ],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    },
    ui: {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      exposeRoute: true
    }
  }
});
```

### 2.5 静态文件服务配置

```typescript
// 单个静态目录
app.register(webPlugin, {
  static: {
    root: path.join(__dirname, 'public'),
    prefix: '/static/',
    decorateReply: false
  }
});

// 多个静态目录
app.register(webPlugin, {
  static: [
    {
      root: path.join(__dirname, 'public'),
      prefix: '/static/',
      decorateReply: false
    },
    {
      root: path.join(__dirname, 'uploads'),
      prefix: '/files/',
      decorateReply: false,
      setHeaders: (res, path, stat) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
    }
  ]
});
```

### 2.6 Helmet 安全配置

```typescript
// 默认配置
app.register(webPlugin, {
  helmet: true // 使用默认配置
});

// 详细配置
app.register(webPlugin, {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.example.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'cdn.example.com'],
        imgSrc: ["'self'", 'data:', 'cdn.example.com'],
        connectSrc: ["'self'", 'api.example.com']
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 15552000, // 180天
      includeSubDomains: true
    }
  }
});
```

## 3. 关于动态加载

@stratix/web 插件会根据配置动态加载必要的依赖包，这意味着:

1. 如果你不配置某个功能，相关的包不会被加载，减少了资源消耗
2. 首次使用某个功能时，可能会有轻微的延迟，因为需要动态导入相关包
3. 你需要确保项目依赖中包含了所需的插件，例如 `@fastify/cors`、`@fastify/compress` 等

## 4. 配置优先级

1. 如果未在配置中指定某个插件，则该插件不会被加载
2. 如果配置为 `false`，则明确禁用该插件
3. 如果配置为 `true`，则使用默认配置启用该插件
4. 如果提供了具体配置对象，则使用提供的配置启用该插件 