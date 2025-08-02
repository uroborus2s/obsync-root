# @stratix/gateway 配置指南

## 概述

`@stratix/gateway` 插件提供了丰富的配置选项，支持认证、安全、限流、监控等多个方面的定制化配置。

## 完整配置示例

```typescript
import { gatewayPlugin } from '@stratix/gateway';

const gatewayConfig = {
  // 全局配置
  global: {
    timeout: 30000,        // 默认超时时间（毫秒）
    retries: 3,            // 默认重试次数
    tracing: true,         // 启用链路追踪
    metrics: true          // 启用指标收集
  },

  // 路由配置
  routes: [
    {
      id: 'api-v1',
      path: '/api/v1/**',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      target: 'http://backend-service:3000',
      auth: {
        required: true,
        providers: ['jwt'],
        permissions: ['api:read', 'api:write']
      },
      security: {
        cors: {
          origin: ['http://localhost:3000', 'https://app.example.com'],
          credentials: true
        },
        rateLimit: {
          limit: 100,
          window: 60000
        }
      },
      timeout: 15000,
      retries: 2
    }
  ],

  // 认证配置
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: 'api-gateway',
      audience: 'api-clients'
    },
    apiKey: {
      header: 'X-API-Key',
      query: 'api_key'
    },
    oauth2: {
      authorizationURL: 'https://auth.example.com/oauth/authorize',
      tokenURL: 'https://auth.example.com/oauth/token',
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      callbackURL: 'https://gateway.example.com/auth/callback',
      scope: ['read', 'write']
    }
  },

  // 安全配置
  security: {
    cors: {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      exposedHeaders: ['X-Total-Count'],
      credentials: false,
      maxAge: 86400
    },
    xss: {
      enabled: true,
      mode: 'block'
    },
    csrf: {
      enabled: true,
      tokenHeader: 'X-CSRF-Token',
      tokenParam: '_csrf',
      tokenExpiry: 3600
    },
    headers: {
      frameOptions: 'DENY',
      contentTypeOptions: true,
      xssProtection: '1; mode=block',
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: false
      },
      csp: "default-src 'self'; script-src 'self' 'unsafe-inline'",
      referrerPolicy: 'strict-origin-when-cross-origin'
    },
    ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
    maliciousDetection: {
      enabled: true,
      sqlInjection: true,
      pathTraversal: true,
      commandInjection: true
    }
  },

  // 限流配置
  rateLimit: {
    limit: 1000,
    window: 60000,
    algorithm: 'sliding-window',
    keyGenerator: 'ip',
    skip: ['health-check', 'internal'],
    response: {
      statusCode: 429,
      message: 'Too many requests',
      headers: {
        'X-Custom-Header': 'Rate limited'
      }
    }
  },

  // 监控配置
  monitoring: {
    metrics: true,
    metricsInterval: 60000,
    healthCheck: true,
    healthCheckInterval: 30000
  },

  // 日志配置
  logging: {
    level: 'info',
    accessLog: true,
    errorLog: true,
    securityLog: true,
    format: 'json'
  }
};
```

## 配置详解

### 1. 全局配置 (global)

```typescript
interface GlobalConfig {
  timeout: number;        // 默认超时时间（毫秒）
  retries: number;        // 默认重试次数
  tracing: boolean;       // 是否启用链路追踪
  metrics: boolean;       // 是否启用指标收集
}
```

### 2. 路由配置 (routes)

```typescript
interface RouteConfig {
  id: string;                           // 路由唯一标识
  path: string;                         // 路径模式（支持通配符）
  methods: HttpMethod[];                // 支持的HTTP方法
  target: string | TargetConfig[];     // 目标服务
  auth?: AuthConfig;                    // 认证配置
  security?: SecurityConfig;            // 安全配置
  rateLimit?: RateLimitConfig;         // 限流配置
  validation?: ValidationConfig;        // 验证配置
  transformation?: TransformationConfig; // 转换配置
  caching?: CachingConfig;             // 缓存配置
  timeout?: number;                     // 超时时间
  retries?: number;                     // 重试次数
  metadata?: Record<string, any>;       // 元数据
}
```

#### 路径模式支持

- **精确匹配**: `/api/users`
- **参数匹配**: `/api/users/:id`
- **通配符匹配**: `/api/**`
- **组合模式**: `/api/v1/users/:id/posts/**`

#### 目标配置

```typescript
// 单一目标
target: "http://backend-service:3000"

// 多目标负载均衡
target: [
  {
    url: "http://backend-1:3000",
    weight: 70,
    healthCheck: {
      path: "/health",
      interval: 30000,
      timeout: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3
    }
  },
  {
    url: "http://backend-2:3000",
    weight: 30,
    enabled: true
  }
]
```

### 3. 认证配置 (auth)

#### JWT配置

```typescript
jwt: {
  secret: string;           // 密钥
  algorithm: string;        // 算法（HS256, RS256等）
  expiresIn: string;        // 过期时间（1h, 30m, 7d等）
  issuer?: string;          // 发行者
  audience?: string;        // 受众
  clockTolerance?: number;  // 时钟容差（秒）
}
```

#### API Key配置

```typescript
apiKey: {
  header: string;           // 头部名称（如：X-API-Key）
  query?: string;           // 查询参数名称（如：api_key）
  validator?: string;       // 自定义验证器
}
```

#### OAuth2配置

```typescript
oauth2: {
  authorizationURL: string; // 授权服务器URL
  tokenURL: string;         // 令牌服务器URL
  clientId: string;         // 客户端ID
  clientSecret: string;     // 客户端密钥
  callbackURL: string;      // 回调URL
  scope: string[];          // 作用域
}
```

### 4. 安全配置 (security)

#### CORS配置

```typescript
cors: {
  origin: string | string[] | boolean;  // 允许的源
  methods: string[];                     // 允许的方法
  allowedHeaders: string[];              // 允许的头部
  exposedHeaders: string[];              // 暴露的头部
  credentials: boolean;                  // 是否允许凭证
  maxAge: number;                        // 预检请求缓存时间
}
```

#### 安全头配置

```typescript
headers: {
  frameOptions?: string;                 // X-Frame-Options
  contentTypeOptions?: boolean;          // X-Content-Type-Options
  xssProtection?: string;                // X-XSS-Protection
  hsts?: {                               // Strict-Transport-Security
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  csp?: string;                          // Content-Security-Policy
  referrerPolicy?: string;               // Referrer-Policy
}
```

### 5. 限流配置 (rateLimit)

```typescript
rateLimit: {
  limit: number;                         // 限制数量
  window: number;                        // 时间窗口（毫秒）
  algorithm: 'token-bucket' | 'sliding-window' | 'fixed-window';
  keyGenerator?: string;                 // 键生成器
  skip?: string[];                       // 跳过条件
  response?: {                           // 自定义响应
    statusCode: number;
    message: string;
    headers?: Record<string, string>;
  };
}
```

#### 键生成器选项

- `ip`: 基于IP地址
- `user`: 基于用户ID
- `api-key`: 基于API密钥
- `path`: 基于请求路径
- `user-path`: 基于用户和路径组合

#### 跳过条件

- `authenticated`: 已认证用户
- `admin`: 管理员用户
- `internal`: 内部请求
- `health-check`: 健康检查请求

### 6. 验证配置 (validation)

```typescript
validation: {
  body?: {                               // 请求体验证
    schema?: object;                     // JSON Schema
    validator?: string;                  // 自定义验证器
    required?: boolean;                  // 是否必需
    errorMessage?: string;               // 错误消息
  };
  query?: ValidationRule;                // 查询参数验证
  params?: ValidationRule;               // 路径参数验证
  headers?: ValidationRule;              // 请求头验证
}
```

### 7. 转换配置 (transformation)

```typescript
transformation: {
  request?: TransformRule[];             // 请求转换
  response?: TransformRule[];            // 响应转换
}

interface TransformRule {
  type: 'header' | 'body' | 'query' | 'param';
  operation: 'add' | 'remove' | 'modify' | 'rename';
  source?: string;                       // 源字段
  target?: string;                       // 目标字段
  value?: any;                           // 转换值
  transformer?: string;                  // 转换函数
}
```

### 8. 缓存配置 (caching)

```typescript
caching: {
  enabled: boolean;                      // 是否启用
  keyGenerator?: string;                 // 缓存键生成器
  ttl: number;                          // 缓存时间（秒）
  condition?: string;                    // 缓存条件
  tags?: string[];                       // 缓存标签
}
```

## 环境变量

```bash
# JWT配置
JWT_SECRET=your-super-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=1h

# OAuth2配置
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret

# Redis配置（用于分布式限流）
REDIS_URL=redis://localhost:6379

# 数据库配置（用于配置持久化）
DATABASE_URL=postgresql://user:pass@localhost:5432/gateway

# 监控配置
METRICS_ENABLED=true
TRACING_ENABLED=true

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json
```

## 配置验证

插件会在启动时验证配置的有效性：

```typescript
// 配置验证示例
const config = {
  auth: {
    jwt: {
      secret: '', // ❌ 错误：密钥不能为空
      algorithm: 'INVALID', // ❌ 错误：不支持的算法
      expiresIn: 'invalid' // ❌ 错误：无效的时间格式
    }
  },
  rateLimit: {
    limit: -1, // ❌ 错误：限制数量必须为正数
    window: 0  // ❌ 错误：时间窗口必须大于0
  }
};
```

## 动态配置更新

支持运行时动态更新配置：

```typescript
// 通过API更新配置
PUT /api/gateway/config
{
  "rateLimit": {
    "limit": 200,
    "window": 60000
  }
}

// 通过代码更新配置
await gatewayManager.updateConfig({
  rateLimit: {
    limit: 200,
    window: 60000
  }
});
```

## 配置最佳实践

1. **安全性**
   - 使用环境变量存储敏感信息
   - 定期轮换JWT密钥
   - 启用HTTPS和安全头

2. **性能**
   - 合理设置超时时间
   - 配置适当的限流策略
   - 启用缓存机制

3. **监控**
   - 启用指标收集
   - 配置健康检查
   - 设置告警阈值

4. **可维护性**
   - 使用配置文件管理
   - 版本化配置变更
   - 文档化配置选项
