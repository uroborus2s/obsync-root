# Fastify 生态系统插件选择指南

基于 `@fastify/http-proxy` 构建高性能 API 网关的最佳实践

## 概述

本文档详细介绍了如何使用 `@fastify/http-proxy` 作为核心代理功能，结合 Fastify 生态系统中的成熟插件来构建企业级 API 网关。通过精心选择的插件组合，可以避免重复造轮子，同时确保高性能、高可靠性和易维护性。

## 推荐插件列表

### 1. 核心代理功能

**@fastify/http-proxy** (Trust Score: 10)
- **仓库**: https://github.com/fastify/fastify-http-proxy
- **版本**: Latest stable
- **维护状态**: 官方维护，活跃开发
- **核心功能**:
  - HTTP/HTTPS 请求代理
  - WebSocket 支持和转发
  - 动态上游选择
  - 前缀重写 (`rewritePrefix`)
  - 参数化路径支持 (如 `/api/:id/endpoint`)
  - 自定义请求/响应 hooks
  - 自动重连机制 (实验性)

**选择理由**:
- 官方维护，文档完善，社区活跃
- 基于 `@fastify/reply-from`，性能优异
- 支持复杂路由场景和 WebSocket
- 提供丰富的 hooks 用于定制化需求
- 生产环境验证充分

**配置示例**:
```javascript
await fastify.register(require('@fastify/http-proxy'), {
  upstream: 'http://backend-service:3001',
  prefix: '/api/users',
  rewritePrefix: '/users',
  websocket: true,
  preHandler: [authHandler, rateLimitHandler],
  replyOptions: {
    rewriteRequestHeaders: (req, headers) => ({
      ...headers,
      'x-user-id': req.user?.id,
      'x-request-id': req.id
    })
  }
})
```

### 2. 身份验证和授权

#### @fastify/passport (Trust Score: 10)
- **仓库**: https://github.com/fastify/fastify-passport
- **功能**: 支持 200+ Passport.js 认证策略
- **特性**:
  - 多策略组合认证
  - 会话管理集成
  - 用户序列化/反序列化
  - 多实例支持 (命名空间)

#### @fastify/jwt (Trust Score: 10)
- **仓库**: https://github.com/fastify/fastify-jwt
- **功能**: JWT 令牌管理
- **特性**:
  - 签名和验证 JWT
  - 多命名空间支持
  - 自定义密钥解析
  - Cookie 集成
  - TypeScript 完整支持

#### @fastify/auth (Trust Score: 10)
- **仓库**: https://github.com/fastify/fastify-auth
- **功能**: 认证策略组合
- **特性**:
  - AND/OR 逻辑组合
  - 嵌套认证策略
  - 异步函数支持
  - 灵活的配置选项

**选择理由**:
- 官方维护，文档齐全
- 支持复杂的认证场景
- 高度可配置和扩展
- 性能优异，低开销
- 与 fastify-http-proxy 完美集成

**集成示例**:
```javascript
// JWT 配置
await fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET,
  formatUser: (payload) => ({
    id: payload.sub,
    roles: payload.roles || []
  })
})

// 认证组合
await fastify.register(require('@fastify/auth'))

fastify.decorate('authenticate', async function(request, reply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

// 在代理中使用
await fastify.register(require('@fastify/http-proxy'), {
  upstream: 'http://protected-service:3002',
  prefix: '/api/secure',
  preHandler: [fastify.auth([fastify.authenticate])]
})
```

### 3. 限流和熔断

#### @fastify/rate-limit (Trust Score: 10)
- **仓库**: https://github.com/fastify/fastify-rate-limit
- **功能**: 高性能限流器
- **特性**:
  - 内存和 Redis 存储支持
  - 动态限流配置
  - 路由级别定制
  - 自定义键生成器
  - 白名单/黑名单支持
  - 丰富的回调 hooks

**性能特点**:
- 低开销实现
- 支持分布式限流 (Redis)
- 可配置的错误响应
- 支持 IP、用户、API Key 等多维度限流

#### @fastify/circuit-breaker (Trust Score: 10)
- **仓库**: https://github.com/fastify/fastify-circuit-breaker
- **功能**: 轻量级熔断器
- **特性**:
  - 失败阈值配置
  - 超时控制
  - 自动恢复机制
  - 自定义错误处理
  - 路由级别配置

**选择理由**:
- 官方维护，久经生产验证
- 性能优异，配置灵活
- 支持细粒度控制
- 与代理功能无缝集成

**配置示例**:
```javascript
// 全局限流
await fastify.register(require('@fastify/rate-limit'), {
  max: 1000,
  timeWindow: '1 minute',
  redis: redisClient,
  keyGenerator: (request) => request.user?.id || request.ip,
  onExceeded: (request, key) => {
    fastify.log.warn(`Rate limit exceeded for: ${key}`)
  }
})

// 熔断器
await fastify.register(require('@fastify/circuit-breaker'), {
  threshold: 5,
  timeout: 10000,
  resetTimeout: 30000,
  onCircuitOpen: async (request, reply) => {
    reply.statusCode = 503
    return { error: 'Service temporarily unavailable' }
  }
})

// 代理中应用
await fastify.register(require('@fastify/http-proxy'), {
  upstream: 'http://fragile-service:3003',
  prefix: '/api/fragile',
  preHandler: [
    fastify.rateLimit({ max: 50 }),
    fastify.circuitBreaker({ threshold: 3 })
  ]
})
```

### 4. 缓存机制

#### @fastify/caching (Trust Score: 10)
- **仓库**: https://github.com/fastify/fastify-caching
- **功能**: HTTP 缓存头管理
- **特性**:
  - ETag 自动生成和验证
  - Cache-Control 头设置
  - 304 Not Modified 自动响应
  - 抽象缓存接口支持
  - Redis/内存缓存后端

**选择理由**:
- 符合 HTTP 标准的缓存实现
- 易于与 CDN 集成
- 支持多种缓存后端
- 自动处理缓存验证逻辑

**配置示例**:
```javascript
await fastify.register(require('@fastify/caching'), {
  privacy: 'public',
  expiresIn: 300, // 5分钟
  cache: redisAbstractCache, // 可选的 Redis 缓存
  serverExpiresIn: 600 // CDN 缓存时间
})

// 在路由中使用
fastify.get('/api/cached-data', async (request, reply) => {
  reply.etag('data-version-123')
  reply.expires(new Date(Date.now() + 300000))
  return { data: 'cached content' }
})
```

### 5. 日志记录和监控

#### @immobiliarelabs/fastify-sentry (Trust Score: 9.6)
- **仓库**: https://github.com/immobiliare/fastify-sentry
- **功能**: 错误追踪和性能监控
- **特性**:
  - 自动错误捕获
  - 性能事务追踪
  - 用户上下文提取
  - 自定义数据过滤
  - 面包屑记录

**优势**:
- 生产级错误监控解决方案
- 丰富的上下文信息收集
- 支持自定义错误过滤逻辑
- 与 Sentry 平台完美集成

#### @fastify/under-pressure (Trust Score: 10)
- **仓库**: https://github.com/fastify/under-pressure
- **功能**: 系统负载监控
- **特性**:
  - 事件循环延迟监控
  - 内存使用跟踪
  - 健康检查端点
  - 自动降级保护
  - 自定义健康检查逻辑

**选择理由**:
- 官方维护的监控解决方案
- 提供系统级健康检查
- 支持自动熔断和降级
- 低开销的性能监控

**配置示例**:
```javascript
// Sentry 错误追踪
await fastify.register(require('@immobiliarelabs/fastify-sentry'), {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  shouldHandleError: (error, request, reply) => {
    return error.statusCode >= 500
  },
  extractUserData: (request) => ({
    id: request.user?.id,
    email: request.user?.email
  })
})

// 系统监控
await fastify.register(require('@fastify/under-pressure'), {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: 1073741824, // 1GB
  exposeStatusRoute: '/health',
  healthCheck: async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})
```

### 6. 请求/响应转换

#### fastify-http-proxy 内置功能
- **rewriteRequestHeaders**: 请求头转换
- **replyOptions**: 响应选项配置
- **preHandler/preValidation**: 请求预处理

#### @fastify/helmet (Trust Score: 10)
- **功能**: 安全头设置
- **特性**: CSP、HSTS、X-Frame-Options 等

#### @fastify/cors (Trust Score: 10)
- **功能**: 跨域资源共享
- **特性**: 动态 origin 检查、预检请求处理

**选择理由**:
- 充分利用代理内置功能
- 减少额外依赖
- 标准化的安全实践

### 7. 负载均衡

#### 基于 fastify-http-proxy 的负载均衡
- **实现方式**: 多实例注册 + 动态上游选择
- **算法支持**: 轮询、加权、最少连接
- **健康检查**: 结合 under-pressure 实现

**实现示例**:
```javascript
// 服务实例列表
const serviceInstances = [
  { url: 'http://service-1:3001', weight: 1, healthy: true },
  { url: 'http://service-2:3001', weight: 2, healthy: true },
  { url: 'http://service-3:3001', weight: 1, healthy: false }
]

// 加权轮询算法
let currentWeight = 0
function selectUpstream() {
  const healthyInstances = serviceInstances.filter(i => i.healthy)
  // 加权轮询逻辑
  const totalWeight = healthyInstances.reduce((sum, i) => sum + i.weight, 0)
  currentWeight = (currentWeight + 1) % totalWeight
  
  let cumWeight = 0
  for (const instance of healthyInstances) {
    cumWeight += instance.weight
    if (currentWeight < cumWeight) {
      return instance.url
    }
  }
}

// 代理配置
await fastify.register(require('@fastify/http-proxy'), {
  upstream: selectUpstream,
  prefix: '/api/balanced',
  rewritePrefix: '/service'
})
```

## 完整架构设计

### 架构概览

```
┌─────────────────────────────────────────────────┐
│                API Gateway                      │
├─────────────────────────────────────────────────┤
│  Monitoring & Logging                          │
│  ├── @immobiliarelabs/fastify-sentry           │
│  └── @fastify/under-pressure                   │
├─────────────────────────────────────────────────┤
│  Security & CORS                               │
│  ├── @fastify/helmet                           │
│  └── @fastify/cors                             │
├─────────────────────────────────────────────────┤
│  Authentication & Authorization                │
│  ├── @fastify/passport                         │
│  ├── @fastify/jwt                              │
│  └── @fastify/auth                             │
├─────────────────────────────────────────────────┤
│  Protection & Caching                          │
│  ├── @fastify/rate-limit                       │
│  ├── @fastify/circuit-breaker                  │
│  └── @fastify/caching                          │
├─────────────────────────────────────────────────┤
│  Core Proxy Engine                             │
│  └── @fastify/http-proxy                       │
└─────────────────────────────────────────────────┘
```

### 完整实现代码

```javascript
const fastify = require('fastify')({ 
  logger: {
    level: 'info',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        hostname: req.hostname,
        remoteAddress: req.ip
      })
    }
  }
})

// 全局配置
const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecret'
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development'
  }
}

// 1. 基础插件设置
async function setupBasePlugins() {
  // 错误监控 - 最先注册
  if (config.sentry.dsn) {
    await fastify.register(require('@immobiliarelabs/fastify-sentry'), {
      dsn: config.sentry.dsn,
      environment: config.sentry.environment,
      release: process.env.APP_VERSION,
      shouldHandleError: (error, request, reply) => {
        return error.statusCode >= 500
      },
      extractUserData: (request) => ({
        id: request.user?.id,
        email: request.user?.email
      })
    })
  }

  // 系统监控和健康检查
  await fastify.register(require('@fastify/under-pressure'), {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 1073741824, // 1GB
    maxRssBytes: 1073741824,      // 1GB
    maxEventLoopUtilization: 0.98,
    exposeStatusRoute: {
      url: '/health',
      routeOpts: {
        logLevel: 'silent'
      }
    },
    healthCheck: async (fastifyInstance) => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.APP_VERSION
      }
    }
  })

  // 安全头设置
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"]
      }
    }
  })

  // CORS 配置
  await fastify.register(require('@fastify/cors'), {
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*']
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
}

// 2. 认证和授权设置
async function setupAuthPlugins() {
  // JWT 插件
  await fastify.register(require('@fastify/jwt'), {
    secret: config.jwt.secret,
    sign: {
      expiresIn: '1h',
      issuer: 'api-gateway'
    },
    verify: {
      allowedIss: 'api-gateway'
    },
    formatUser: (payload) => ({
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || []
    })
  })

  // 认证组合插件
  await fastify.register(require('@fastify/auth'))

  // 认证函数装饰器
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token' })
    }
  })

  // 角色检查装饰器
  fastify.decorate('requireRole', (role) => {
    return async function(request, reply) {
      if (!request.user?.roles?.includes(role)) {
        reply.code(403).send({ error: 'Forbidden', message: `Role '${role}' required` })
      }
    }
  })
}

// 3. 限流和熔断设置
async function setupProtectionPlugins() {
  // Redis 客户端 (如果需要)
  const redis = config.redis ? require('ioredis')(config.redis) : null

  // 全局限流
  await fastify.register(require('@fastify/rate-limit'), {
    max: 1000,
    timeWindow: '1 minute',
    redis: redis,
    keyGenerator: (request) => {
      return request.user?.id || request.ip
    },
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Max ${context.max} requests per ${context.after}`,
      retryAfter: Math.round(context.ttl / 1000)
    }),
    onExceeded: (request, key) => {
      fastify.log.warn(`Rate limit exceeded for key: ${key}`)
    }
  })

  // 缓存设置
  await fastify.register(require('@fastify/caching'), {
    privacy: 'public',
    expiresIn: 300, // 5分钟默认缓存
    cache: redis ? require('abstract-cache')({
      useAwait: false,
      driver: {
        name: 'abstract-cache-redis',
        options: { client: redis }
      }
    }) : undefined
  })

  // 熔断器
  await fastify.register(require('@fastify/circuit-breaker'), {
    threshold: 5,        // 5次失败后开启熔断
    timeout: 10000,      // 10秒超时
    resetTimeout: 30000, // 30秒后尝试恢复
    onCircuitOpen: async (request, reply) => {
      reply.statusCode = 503
      return {
        error: 'Service Unavailable',
        message: 'Circuit breaker is open',
        retryAfter: 30
      }
    },
    onTimeout: async (request, reply) => {
      reply.statusCode = 504
      return {
        error: 'Gateway Timeout',
        message: 'Request timeout'
      }
    }
  })
}

// 4. 代理服务配置
async function setupProxyServices() {
  // 用户服务代理
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: process.env.USER_SERVICE_URL || 'http://user-service:3001',
    prefix: '/api/v1/users',
    rewritePrefix: '/users',
    http2: false,
    preHandler: [
      fastify.auth([fastify.authenticate]),
      fastify.rateLimit({ max: 100, timeWindow: '1 minute' }),
      fastify.circuitBreaker()
    ],
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => ({
        ...headers,
        'x-user-id': originalReq.user?.id,
        'x-user-roles': JSON.stringify(originalReq.user?.roles || []),
        'x-request-id': originalReq.id,
        'x-forwarded-for': originalReq.ip,
        'x-gateway-version': process.env.APP_VERSION
      })
    },
    websocket: true,
    wsClientOptions: {
      rewriteRequestHeaders: (headers, request) => ({
        ...headers,
        'x-user-id': request.user?.id
      })
    }
  })

  // 订单服务代理 (高安全性)
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: process.env.ORDER_SERVICE_URL || 'http://order-service:3002',
    prefix: '/api/v1/orders',
    rewritePrefix: '/orders',
    preHandler: [
      fastify.auth([
        fastify.authenticate,
        fastify.requireRole('customer')
      ], { relation: 'and' }),
      fastify.rateLimit({ max: 50, timeWindow: '1 minute' }),
      fastify.circuitBreaker({ threshold: 3 })
    ]
  })

  // 管理员API (最严格的访问控制)
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: process.env.ADMIN_SERVICE_URL || 'http://admin-service:3003',
    prefix: '/api/v1/admin',
    rewritePrefix: '/admin',
    preHandler: [
      fastify.auth([
        fastify.authenticate,
        fastify.requireRole('admin')
      ], { relation: 'and' }),
      fastify.rateLimit({ max: 20, timeWindow: '1 minute' })
    ]
  })

  // 公开API (最宽松的限制)
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: process.env.PUBLIC_SERVICE_URL || 'http://public-service:3004',
    prefix: '/api/v1/public',
    rewritePrefix: '/public',
    preHandler: [
      fastify.rateLimit({ max: 500, timeWindow: '1 minute' })
    ]
  })

  // 负载均衡示例
  const serviceInstances = [
    'http://analytics-1:3005',
    'http://analytics-2:3005',
    'http://analytics-3:3005'
  ]
  
  let currentInstance = 0
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: () => {
      // 简单轮询负载均衡
      const instance = serviceInstances[currentInstance]
      currentInstance = (currentInstance + 1) % serviceInstances.length
      return instance
    },
    prefix: '/api/v1/analytics',
    rewritePrefix: '/analytics',
    preHandler: [
      fastify.auth([fastify.authenticate]),
      fastify.rateLimit({ max: 200 })
    ]
  })
}

// 5. 自定义中间件和工具
async function setupCustomMiddleware() {
  // 请求日志中间件
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = process.hrtime.bigint()
  })

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Number(process.hrtime.bigint() - request.startTime) / 1000000
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: `${duration.toFixed(2)}ms`,
      userAgent: request.headers['user-agent'],
      userId: request.user?.id
    }, 'Request completed')
  })

  // 全局错误处理
  fastify.setErrorHandler(async (error, request, reply) => {
    request.log.error(error)

    if (error.statusCode >= 500) {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Something went wrong',
        requestId: request.id
      })
    } else {
      reply.status(error.statusCode || 400).send({
        error: error.name || 'Bad Request',
        message: error.message,
        requestId: request.id
      })
    }
  })

  // 404 处理
  fastify.setNotFoundHandler(async (request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      requestId: request.id
    })
  })
}

// 6. 启动函数
async function start() {
  try {
    // 按顺序注册插件
    await setupBasePlugins()
    await setupAuthPlugins()
    await setupProtectionPlugins()
    await setupCustomMiddleware()
    await setupProxyServices()

    // 启动服务器
    const port = process.env.PORT || 3000
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port, host })
    
    fastify.log.info(`🚀 API Gateway started on http://${host}:${port}`)
    fastify.log.info(`📊 Health check available at http://${host}:${port}/health`)
    
    // 优雅关闭处理
    process.on('SIGTERM', async () => {
      fastify.log.info('Received SIGTERM, shutting down gracefully')
      await fastify.close()
      process.exit(0)
    })

  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// 启动应用
if (require.main === module) {
  start()
}

module.exports = { fastify, start }
```

## 部署配置

### Docker Compose 示例

```yaml
version: '3.8'
services:
  api-gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - JWT_SECRET=${JWT_SECRET}
      - SENTRY_DSN=${SENTRY_DSN}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - USER_SERVICE_URL=http://user-service:3001
      - ORDER_SERVICE_URL=http://order-service:3002
      - ADMIN_SERVICE_URL=http://admin-service:3003
      - PUBLIC_SERVICE_URL=http://public-service:3004
      - ALLOWED_ORIGINS=https://yourapp.com,https://admin.yourapp.com
    depends_on:
      - redis
      - user-service
      - order-service
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  user-service:
    image: your-registry/user-service:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  order-service:
    image: your-registry/order-service:latest
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

volumes:
  redis_data:
```

### Kubernetes 部署示例

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
      - name: api-gateway
        image: your-registry/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: gateway-secrets
              key: jwt-secret
        - name: SENTRY_DSN
          valueFrom:
            secretKeyRef:
              name: gateway-secrets
              key: sentry-dsn
        - name: REDIS_HOST
          value: "redis-service"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
spec:
  selector:
    app: api-gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 性能优化建议

### 1. 内存和连接池优化

```javascript
const fastify = require('fastify')({
  logger: true,
  maxParamLength: 100,
  bodyLimit: 1048576, // 1MB
  keepAliveTimeout: 5000,
  connectionTimeout: 60000
})
```

### 2. Redis 连接优化

```javascript
const redis = new require('ioredis')({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  db: 0
})
```

### 3. HTTP 客户端优化

```javascript
// 在 fastify-http-proxy 中使用连接池
await fastify.register(require('@fastify/http-proxy'), {
  upstream: 'http://backend-service:3001',
  undici: {
    connections: 128,
    pipelining: 10,
    keepAliveTimeout: 60000,
    keepAliveMaxTimeout: 600000
  }
})
```

## 监控和可观测性

### 1. 指标收集

推荐集成 Prometheus 指标收集：

```javascript
await fastify.register(require('fastify-metrics'), {
  endpoint: '/metrics',
  blacklist: /.*_bucket$/
})
```

### 2. 分布式追踪

集成 Jaeger 或 Zipkin：

```javascript
await fastify.register(require('@fastify/zipkin'), {
  serviceName: 'api-gateway',
  endpoint: 'http://zipkin:9411'
})
```

### 3. 日志聚合

配置结构化日志输出：

```javascript
const fastify = require('fastify')({
  logger: {
    level: 'info',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        hostname: req.hostname,
        remoteAddress: req.ip
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.headers
      })
    }
  }
})
```

## 安全最佳实践

### 1. 认证安全

```javascript
// JWT 安全配置
await fastify.register(require('@fastify/jwt'), {
  secret: {
    private: fs.readFileSync('private.key'),
    public: fs.readFileSync('public.key')
  },
  sign: { 
    algorithm: 'RS256',
    expiresIn: '15m' // 短期令牌
  },
  verify: { 
    algorithms: ['RS256'],
    allowedIss: ['api-gateway'],
    maxAge: '15m'
  }
})
```

### 2. 输入验证

```javascript
const schema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 50 },
      password: { type: 'string', minLength: 8, maxLength: 100 }
    }
  }
}

fastify.post('/login', { schema }, async (request, reply) => {
  // 处理登录逻辑
})
```

### 3. 速率限制强化

```javascript
await fastify.register(require('@fastify/rate-limit'), {
  max: async (request, key) => {
    // 基于用户级别的动态限流
    if (request.user?.plan === 'premium') return 5000
    if (request.user?.plan === 'standard') return 1000
    return 100 // 匿名用户
  },
  timeWindow: '1 hour',
  ban: 10, // 超限10次后封禁
  skipOnError: false
})
```

## 故障排除指南

### 1. 常见问题诊断

**代理连接失败**:
```bash
# 检查上游服务状态
curl -v http://backend-service:3001/health

# 检查网络连通性
ping backend-service

# 查看代理错误日志
docker logs api-gateway | grep -i error
```

**认证问题**:
```bash
# 验证 JWT 密钥配置
openssl rsa -in private.key -pubout -outform PEM

# 测试令牌验证
curl -H "Authorization: Bearer <token>" http://gateway:3000/api/protected
```

**性能问题**:
```bash
# 检查系统指标
curl http://gateway:3000/health

# 查看内存使用
docker stats api-gateway

# 分析慢查询
grep "responseTime.*[5-9][0-9][0-9]ms" api-gateway.log
```

### 2. 调试模式配置

```javascript
const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production'
  }
})

// 添加调试中间件
if (process.env.NODE_ENV === 'development') {
  fastify.addHook('onRequest', async (request, reply) => {
    console.log(`📝 ${request.method} ${request.url}`)
    console.log('Headers:', request.headers)
    console.log('Query:', request.query)
  })
}
```

## 结论

通过使用 `@fastify/http-proxy` 作为核心代理引擎，结合 Fastify 生态系统中经过生产验证的插件，我们可以快速构建一个功能完整、性能优异的 API 网关。

### 核心优势

1. **高性能**: 基于 Fastify 框架，提供最佳的 Node.js 性能表现
2. **生产就绪**: 包含完整的监控、日志、错误处理和优雅关闭机制
3. **企业级安全**: 多层认证授权、安全头防护、输入验证
4. **高可用性**: 限流、熔断、健康检查、负载均衡保障系统稳定性
5. **可观测性**: 全面的日志记录、错误追踪、性能监控
6. **易维护**: 使用成熟开源插件，降低长期维护成本

### 适用场景

- 微服务架构的统一入口
- API 版本管理和路由
- 统一认证和授权
- 流量控制和保护
- 跨域和安全策略实施
- 监控和日志聚合

这个解决方案充分体现了"不要重复造轮子"的原则，通过组合现有的成熟组件，快速构建了一个功能强大、性能优异的 API 网关系统。