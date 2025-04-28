# @stratix/web 集成插件使用示例

本文档提供了使用 @stratix/web 集成插件的各种示例，包括 HTTPS、CORS、压缩、Swagger 文档和静态文件服务等功能的配置。

## 基本示例

```typescript
import { createServer } from '@stratix/web';

const server = createServer({
  // 服务器基本配置
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  
  // 集成插件配置
  integrations: {
    // 启用 CORS，使用默认配置
    cors: true,
    
    // 启用压缩，使用默认配置
    compress: true,
    
    // 启用 Helmet，使用默认配置
    helmet: true,
    
    // 启用静态文件服务
    static: {
      root: './public',
      prefix: '/assets/'
    },
    
    // 启用 Swagger 文档
    swagger: {
      info: {
        title: '我的 API 文档',
        description: 'API 接口文档',
        version: '1.0.0'
      },
      tags: [
        { name: 'user', description: '用户相关接口' },
        { name: 'product', description: '产品相关接口' }
      ]
    }
  }
});

server.start().then(() => {
  console.log('服务器已启动');
});
```

## HTTPS 配置示例

### 基本 HTTPS 配置

```typescript
import { createServer } from '@stratix/web';
import fs from 'fs';
import path from 'path';

const server = createServer({
  server: {
    port: 443,
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync(path.join(__dirname, 'ssl/private-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'ssl/certificate.pem'))
    }
  }
});

server.start();
```

### 高级 HTTPS 配置

```typescript
import { createServer } from '@stratix/web';
import fs from 'fs';
import path from 'path';

const server = createServer({
  server: {
    port: 443,
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync(path.join(__dirname, 'ssl/private-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'ssl/certificate.pem')),
      ca: fs.readFileSync(path.join(__dirname, 'ssl/ca.pem')),
      requestCert: true,
      rejectUnauthorized: false,
      // 其他 TLS 选项
      ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
      minVersion: 'TLSv1.2'
    }
  }
});

server.start();
```

## CORS 配置示例

### 简单 CORS 配置

```typescript
// 使用默认 CORS 配置
integrations: {
  cors: true
}

// 或指定允许的源
integrations: {
  cors: {
    origin: ['https://example.com', 'https://api.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
}
```

### 高级 CORS 配置

```typescript
integrations: {
  cors: {
    origin: (origin, cb) => {
      const allowedOrigins = ['https://example.com', 'https://api.example.com'];
      // 允许特定来源或没有来源（如移动应用）
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('不允许的来源'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400
  }
}
```

## 压缩配置示例

```typescript
// 使用默认压缩配置
integrations: {
  compress: true
}

// 或自定义压缩配置
integrations: {
  compress: {
    global: false, // 只对特定路由进行压缩
    threshold: 1024, // 仅压缩大于 1KB 的响应
    encodings: ['gzip', 'deflate'], // 支持的编码
    customTypes: ['application/json', 'application/xml'] // 额外要压缩的内容类型
  }
}
```

## Helmet 安全配置示例

```typescript
// 使用默认 Helmet 配置
integrations: {
  helmet: true
}

// 或自定义 Helmet 配置
integrations: {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'cdn.example.com'],
        connectSrc: ["'self'", 'api.example.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: {
      maxAge: 15552000, // 180 天
      includeSubDomains: true,
      preload: true
    }
  }
}
```

## 静态文件服务配置示例

### 基本静态文件配置

```typescript
// 单个目录配置
integrations: {
  static: {
    root: './public',
    prefix: '/assets/',
    decorateReply: true, // 添加 sendFile 方法到 reply 对象
    index: ['index.html', 'index.htm'] // 索引文件
  }
}
```

### 多目录静态文件配置

```typescript
// 多个目录配置
integrations: {
  static: [
    {
      root: './public/images',
      prefix: '/images/',
      cacheControl: true,
      maxAge: '1d',
      immutable: true
    },
    {
      root: './public/css',
      prefix: '/css/',
      cacheControl: true,
      maxAge: '7d'
    },
    {
      root: './public/js',
      prefix: '/js/',
      cacheControl: true,
      maxAge: '7d'
    },
    {
      root: './public',
      prefix: '/',
      constraints: { host: 'example.com' } // 主机约束
    }
  ]
}
```

## Swagger 文档配置示例

### 基本 Swagger 配置

```typescript
integrations: {
  swagger: {
    info: {
      title: 'API 文档',
      description: '我的应用 API 接口文档',
      version: '1.0.0'
    },
    host: 'api.example.com',
    schemes: ['https'],
    consumes: ['application/json'],
    produces: ['application/json']
  }
}
```

### 高级 Swagger 配置

```typescript
integrations: {
  swagger: {
    info: {
      title: 'API 文档',
      description: '我的应用 API 接口文档',
      version: '1.0.0',
      termsOfService: 'https://example.com/terms',
      contact: {
        name: '技术支持团队',
        url: 'https://example.com/support',
        email: 'support@example.com'
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
    host: 'api.example.com',
    basePath: '/v1',
    schemes: ['https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'user', description: '用户管理接口' },
      { name: 'auth', description: '认证相关接口' },
      { name: 'product', description: '产品管理接口' }
    ],
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header'
      },
      oauth2: {
        type: 'oauth2',
        flows: {
          implicit: {
            authorizationUrl: 'https://example.com/oauth/authorize',
            scopes: {
              'read:users': '读取用户信息',
              'write:users': '修改用户信息'
            }
          }
        }
      }
    },
    security: [
      { apiKey: [] }
    ]
  },
  // Swagger UI 配置
  swaggerUI: {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next(); },
      preHandler: function (request, reply, next) { next(); }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  }
}
```

## 完整示例

以下是一个包含所有集成插件配置的完整示例：

```typescript
import { createServer } from '@stratix/web';
import fs from 'fs';
import path from 'path';

const server = createServer({
  server: {
    port: 443,
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync(path.join(__dirname, 'ssl/private-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'ssl/certificate.pem'))
    }
  },
  
  integrations: {
    // CORS 配置
    cors: {
      origin: ['https://example.com', 'https://admin.example.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
      maxAge: 86400
    },
    
    // 压缩配置
    compress: {
      threshold: 1024
    },
    
    // Helmet 安全配置
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'cdn.jsdelivr.net'],
          styleSrc: ["'self'", 'fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:']
        }
      }
    },
    
    // 静态文件服务配置
    static: [
      {
        root: './public',
        prefix: '/',
        decorateReply: true,
        index: ['index.html']
      },
      {
        root: './uploads',
        prefix: '/uploads/',
        cacheControl: true,
        maxAge: '1d'
      }
    ],
    
    // Swagger 文档配置
    swagger: {
      info: {
        title: 'API 文档',
        description: '完整 API 接口文档',
        version: '1.0.0'
      },
      tags: [
        { name: 'user', description: '用户管理' },
        { name: 'product', description: '产品管理' }
      ],
      securityDefinitions: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      security: [
        { bearerAuth: [] }
      ]
    },
    
    // Swagger UI 配置
    swaggerUI: {
      routePrefix: '/docs'
    }
  }
});

// 添加路由
server.route({
  method: 'GET',
  url: '/',
  handler: async (request, reply) => {
    return { message: '服务器运行正常' };
  }
});

// 启动服务器
server.start().then(() => {
  console.log(`服务器已在 https://localhost:${server.port} 启动`);
});
```

## 配置优先级说明

@stratix/web 中的集成插件配置遵循以下优先级规则：

1. 如果未指定配置，则不加载该插件
2. 如果配置为 `false`，则显式禁用该插件
3. 如果配置为 `true`，则使用默认配置启用该插件
4. 如果提供了具体配置对象，则使用该配置启用插件

## 配置相互依赖

某些插件之间可能存在依赖关系，例如：

- `swaggerUI` 依赖于 `swagger` 配置
- 如果同时启用 `helmet` 和 `swagger`/`swaggerUI`，可能需要调整 CSP 配置以允许 Swagger UI 正常工作

请确保相互依赖的插件配置正确且兼容。 