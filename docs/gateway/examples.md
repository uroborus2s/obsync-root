# @stratix/gateway 使用示例

## 基础使用

### 1. 简单网关配置

```typescript
import { Stratix } from '@stratix/core';
import { gatewayPlugin } from '@stratix/gateway';

const app = await Stratix.create({
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  
  plugins: [
    {
      plugin: gatewayPlugin,
      options: {
        global: {
          timeout: 30000,
          retries: 3
        },
        
        routes: [
          {
            id: 'api-proxy',
            path: '/api/**',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            target: 'http://backend:3000',
            auth: {
              required: true,
              providers: ['jwt']
            }
          }
        ],
        
        auth: {
          jwt: {
            secret: process.env.JWT_SECRET,
            algorithm: 'HS256',
            expiresIn: '1h'
          }
        }
      }
    }
  ]
});

await app.listen();
```

### 2. 多服务路由配置

```typescript
const gatewayConfig = {
  routes: [
    // 用户服务
    {
      id: 'user-service',
      path: '/api/users/**',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      target: [
        { url: 'http://user-service-1:3000', weight: 70 },
        { url: 'http://user-service-2:3000', weight: 30 }
      ],
      auth: {
        required: true,
        providers: ['jwt'],
        permissions: ['user:read', 'user:write']
      },
      rateLimit: {
        limit: 100,
        window: 60000,
        keyGenerator: 'user'
      }
    },
    
    // 订单服务
    {
      id: 'order-service',
      path: '/api/orders/**',
      methods: ['GET', 'POST', 'PUT'],
      target: 'http://order-service:3000',
      auth: {
        required: true,
        providers: ['jwt'],
        roles: ['customer', 'admin']
      },
      validation: {
        body: {
          schema: {
            type: 'object',
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', enum: ['USD', 'EUR', 'CNY'] }
            },
            required: ['amount', 'currency']
          }
        }
      }
    },
    
    // 公开API（无需认证）
    {
      id: 'public-api',
      path: '/api/public/**',
      methods: ['GET'],
      target: 'http://public-service:3000',
      auth: {
        required: false
      },
      rateLimit: {
        limit: 1000,
        window: 60000,
        keyGenerator: 'ip'
      }
    }
  ]
};
```

## 高级配置示例

### 1. 完整的安全配置

```typescript
const securityConfig = {
  security: {
    // CORS配置
    cors: {
      origin: [
        'https://app.example.com',
        'https://admin.example.com'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-CSRF-Token'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      credentials: true,
      maxAge: 86400
    },
    
    // XSS防护
    xss: {
      enabled: true,
      mode: 'sanitize',
      customRules: [
        '<script[^>]*>.*?</script>',
        'javascript:',
        'on\\w+\\s*='
      ]
    },
    
    // CSRF防护
    csrf: {
      enabled: true,
      tokenHeader: 'X-CSRF-Token',
      tokenParam: '_csrf',
      tokenExpiry: 3600
    },
    
    // 安全头
    headers: {
      frameOptions: 'SAMEORIGIN',
      contentTypeOptions: true,
      xssProtection: '1; mode=block',
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      csp: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com; style-src 'self' 'unsafe-inline'",
      referrerPolicy: 'strict-origin-when-cross-origin'
    },
    
    // IP访问控制
    ipWhitelist: [
      '192.168.1.0/24',    // 内网
      '10.0.0.0/8',        // VPN
      '203.0.113.0/24'     // 办公网络
    ],
    
    // 恶意请求检测
    maliciousDetection: {
      enabled: true,
      sqlInjection: true,
      pathTraversal: true,
      commandInjection: true,
      customRules: [
        /\b(union|select|insert|update|delete|drop)\b/i,
        /\.\.\//,
        /\$\{.*\}/
      ]
    }
  }
};
```

### 2. 多种认证方式配置

```typescript
const authConfig = {
  auth: {
    // JWT认证
    jwt: {
      secret: process.env.JWT_SECRET,
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'api-gateway',
      audience: 'api-clients',
      clockTolerance: 30
    },
    
    // API Key认证
    apiKey: {
      header: 'X-API-Key',
      query: 'api_key',
      validator: 'customApiKeyValidator'
    },
    
    // OAuth2认证
    oauth2: {
      authorizationURL: 'https://auth.example.com/oauth/authorize',
      tokenURL: 'https://auth.example.com/oauth/token',
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      callbackURL: 'https://gateway.example.com/auth/callback',
      scope: ['read', 'write', 'admin']
    }
  },
  
  routes: [
    {
      id: 'admin-api',
      path: '/api/admin/**',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      target: 'http://admin-service:3000',
      auth: {
        required: true,
        providers: ['jwt', 'oauth2'],  // 支持多种认证方式
        roles: ['admin'],
        permissions: ['admin:read', 'admin:write']
      }
    },
    
    {
      id: 'partner-api',
      path: '/api/partner/**',
      methods: ['GET', 'POST'],
      target: 'http://partner-service:3000',
      auth: {
        required: true,
        providers: ['apiKey'],  // 仅支持API Key
        customValidator: 'partnerValidator'
      }
    }
  ]
};
```

### 3. 高级限流配置

```typescript
const rateLimitConfig = {
  // 全局限流
  rateLimit: {
    limit: 10000,
    window: 60000,
    algorithm: 'sliding-window',
    keyGenerator: 'ip'
  },
  
  routes: [
    // 用户API - 基于用户限流
    {
      id: 'user-api',
      path: '/api/users/**',
      target: 'http://user-service:3000',
      rateLimit: {
        limit: 100,
        window: 60000,
        algorithm: 'token-bucket',
        keyGenerator: 'user',
        skip: ['admin', 'internal']
      }
    },
    
    // 搜索API - 基于IP限流
    {
      id: 'search-api',
      path: '/api/search/**',
      target: 'http://search-service:3000',
      rateLimit: {
        limit: 50,
        window: 60000,
        algorithm: 'fixed-window',
        keyGenerator: 'ip',
        response: {
          statusCode: 429,
          message: 'Search rate limit exceeded. Please try again later.',
          headers: {
            'X-Custom-Header': 'Search Limited'
          }
        }
      }
    },
    
    // 上传API - 基于用户和路径限流
    {
      id: 'upload-api',
      path: '/api/upload/**',
      target: 'http://upload-service:3000',
      rateLimit: {
        limit: 10,
        window: 300000,  // 5分钟
        algorithm: 'sliding-window',
        keyGenerator: 'user-path'
      }
    }
  ]
};
```

## 与其他插件集成

### 1. 与 @stratix/tasks 集成

```typescript
import { Stratix } from '@stratix/core';
import { gatewayPlugin } from '@stratix/gateway';
import { tasksPlugin } from '@stratix/tasks';

const app = await Stratix.create({
  plugins: [
    // 先加载任务插件
    {
      plugin: tasksPlugin,
      options: {
        execution: {
          maxConcurrency: 10,
          defaultTimeout: 30000
        }
      }
    },
    
    // 再加载网关插件
    {
      plugin: gatewayPlugin,
      options: {
        routes: [
          {
            id: 'tasks-api',
            path: '/api/tasks/**',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            target: 'internal://tasks',  // 内部服务
            auth: {
              required: true,
              providers: ['jwt'],
              roles: ['admin', 'operator']
            },
            rateLimit: {
              limit: 50,
              window: 60000,
              keyGenerator: 'user'
            }
          }
        ]
      }
    }
  ]
});
```

### 2. 与 @stratix/icasync 集成

```typescript
const integrationConfig = {
  routes: [
    // 同步管理API
    {
      id: 'sync-management',
      path: '/api/sync/**',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      target: 'internal://icasync',
      auth: {
        required: true,
        providers: ['jwt'],
        permissions: ['sync:read', 'sync:write']
      },
      rateLimit: {
        limit: 30,
        window: 60000,
        keyGenerator: 'user'
      },
      validation: {
        body: {
          schema: {
            type: 'object',
            properties: {
              scheduleIds: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 100
              }
            }
          }
        }
      }
    },
    
    // 同步状态查询API（公开）
    {
      id: 'sync-status',
      path: '/api/sync/status/**',
      methods: ['GET'],
      target: 'internal://icasync',
      auth: {
        required: false
      },
      rateLimit: {
        limit: 200,
        window: 60000,
        keyGenerator: 'ip'
      }
    }
  ]
};
```

## 自定义拦截器

### 1. 创建自定义认证拦截器

```typescript
import { BaseInterceptor } from '@stratix/gateway';

class CustomAuthInterceptor extends BaseInterceptor {
  name = 'customAuth';
  order = 150;

  async preHandle(context: RequestContext): Promise<InterceptorResult> {
    // 自定义认证逻辑
    const customToken = context.request.headers['x-custom-token'] as string;
    
    if (!customToken) {
      return this.createErrorResult(401, 'Custom token required', 'CUSTOM_TOKEN_MISSING');
    }

    // 验证自定义令牌
    const user = await this.validateCustomToken(customToken);
    if (!user) {
      return this.createErrorResult(401, 'Invalid custom token', 'CUSTOM_TOKEN_INVALID');
    }

    context.user = user;
    return { continue: true };
  }

  private async validateCustomToken(token: string): Promise<UserInfo | null> {
    // 实现自定义令牌验证逻辑
    try {
      // 调用外部认证服务
      const response = await fetch('https://auth.example.com/validate', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        return {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          roles: userData.roles || [],
          permissions: userData.permissions || []
        };
      }
    } catch (error) {
      console.error('Custom token validation error:', error);
    }
    
    return null;
  }
}

// 注册自定义拦截器
const gatewayManager = app.diContainer.resolve('gatewayManager');
gatewayManager.addInterceptor(new CustomAuthInterceptor());
```

### 2. 创建自定义限流拦截器

```typescript
class CustomRateLimitInterceptor extends BaseInterceptor {
  name = 'customRateLimit';
  order = 250;

  async preHandle(context: RequestContext): Promise<InterceptorResult> {
    // 基于业务逻辑的动态限流
    const userTier = context.user?.attributes?.tier || 'basic';
    const endpoint = context.request.url;
    
    const limits = this.getDynamicLimits(userTier, endpoint);
    
    if (!limits) {
      return { continue: true };
    }

    const key = `custom_rate_limit:${userTier}:${context.user?.id}:${endpoint}`;
    const isAllowed = await this.checkCustomRateLimit(key, limits);

    if (!isAllowed) {
      return this.createErrorResult(
        429,
        `Rate limit exceeded for ${userTier} tier`,
        'CUSTOM_RATE_LIMIT_EXCEEDED',
        { tier: userTier, limits }
      );
    }

    return { continue: true };
  }

  private getDynamicLimits(tier: string, endpoint: string) {
    const tierLimits = {
      basic: { requests: 100, window: 3600000 },    // 100/hour
      premium: { requests: 1000, window: 3600000 }, // 1000/hour
      enterprise: { requests: 10000, window: 3600000 } // 10000/hour
    };

    // 特殊端点限制
    if (endpoint.includes('/upload')) {
      return {
        basic: { requests: 10, window: 3600000 },
        premium: { requests: 100, window: 3600000 },
        enterprise: { requests: 1000, window: 3600000 }
      }[tier];
    }

    return tierLimits[tier];
  }

  private async checkCustomRateLimit(key: string, limits: any): Promise<boolean> {
    // 实现自定义限流逻辑
    // 这里可以使用Redis、内存缓存或其他存储
    return true; // 简化实现
  }
}
```

## 监控和调试

### 1. 启用详细日志

```typescript
const debugConfig = {
  logging: {
    level: 'debug',
    accessLog: true,
    errorLog: true,
    securityLog: true,
    format: 'json'
  },
  
  monitoring: {
    metrics: true,
    metricsInterval: 10000,  // 10秒收集一次指标
    healthCheck: true,
    healthCheckInterval: 5000 // 5秒检查一次健康状态
  }
};
```

### 2. 获取运行时指标

```typescript
// 获取网关指标
const gatewayManager = app.diContainer.resolve('gatewayManager');
const metrics = gatewayManager.getMetrics();

console.log('Gateway Metrics:', {
  totalRequests: metrics.totalRequests,
  successRequests: metrics.successRequests,
  errorRequests: metrics.errorRequests,
  avgResponseTime: metrics.avgResponseTime,
  currentConcurrency: metrics.currentConcurrency,
  rateLimitHits: metrics.rateLimitHits,
  authFailures: metrics.authFailures,
  securityEvents: metrics.securityEvents
});

// 获取路由统计
const routeManager = app.diContainer.resolve('routeManager');
const routeStats = routeManager.getStatistics();

console.log('Route Statistics:', routeStats);
```

### 3. 健康检查端点

```bash
# 检查网关健康状态
curl http://localhost:3000/api/gateway/health

# 获取详细指标
curl http://localhost:3000/api/gateway/metrics

# 获取系统统计
curl http://localhost:3000/api/gateway/stats
```

## 部署配置

### 1. Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

ENV NODE_ENV=production
ENV JWT_SECRET=your-production-secret
ENV LOG_LEVEL=info

CMD ["node", "dist/index.js"]
```

### 2. Kubernetes 配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: gateway
        image: your-registry/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: gateway-secrets
              key: jwt-secret
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/gateway/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/gateway/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```
