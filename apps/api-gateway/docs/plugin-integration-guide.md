# API 网关插件集成方案

基于 fastify-http-proxy 的企业级 API 网关实现方案

## 方案概述

本方案提供了一个基于 `@fastify/http-proxy` 的完整 API 网关实现，通过精心选择的 Fastify 生态系统插件，实现了企业级 API 网关所需的全部核心功能。

## 核心插件组合

### 代理层 (Core Proxy)
- **@fastify/http-proxy**: 核心 HTTP/WebSocket 代理功能
- 支持动态路由、前缀重写、WebSocket 转发
- 提供请求/响应 hooks 和自定义处理逻辑

### 安全层 (Security Layer)  
- **@fastify/passport**: 多策略认证支持
- **@fastify/jwt**: JWT 令牌管理和验证
- **@fastify/auth**: 认证策略组合和权限控制
- **@fastify/helmet**: HTTP 安全头设置
- **@fastify/cors**: 跨域资源共享配置

### 保护层 (Protection Layer)
- **@fastify/rate-limit**: 高性能限流器
- **@fastify/circuit-breaker**: 熔断器保护
- **@fastify/caching**: HTTP 缓存管理

### 监控层 (Monitoring Layer)
- **@immobiliarelabs/fastify-sentry**: 错误追踪和性能监控
- **@fastify/under-pressure**: 系统负载监控和健康检查

## 架构实现

```javascript
const fastify = require('fastify')({ logger: true })

// 插件注册顺序 (重要!)
async function initializeGateway() {
  // 1. 监控和错误处理 (最先注册)
  await setupMonitoring()
  
  // 2. 安全和 CORS
  await setupSecurity()
  
  // 3. 认证和授权
  await setupAuthentication()
  
  // 4. 保护机制 (限流、熔断、缓存)
  await setupProtection()
  
  // 5. 代理服务 (最后注册)
  await setupProxyRoutes()
}
```

### 监控设置

```javascript
async function setupMonitoring() {
  // Sentry 错误追踪
  await fastify.register(require('@immobiliarelabs/fastify-sentry'), {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    shouldHandleError: (error) => error.statusCode >= 500,
    extractUserData: (request) => ({
      id: request.user?.id,
      email: request.user?.email
    })
  })

  // 系统负载监控
  await fastify.register(require('@fastify/under-pressure'), {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 1073741824, // 1GB
    exposeStatusRoute: '/health',
    healthCheck: async () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION
    })
  })
}
```

### 安全设置

```javascript
async function setupSecurity() {
  // 安全头
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"]
      }
    }
  })

  // CORS 配置
  await fastify.register(require('@fastify/cors'), {
    origin: (origin, callback) => {
      const allowed = process.env.ALLOWED_ORIGINS?.split(',') || ['*']
      callback(null, !origin || allowed.includes('*') || allowed.includes(origin))
    },
    credentials: true
  })
}
```

### 认证设置

```javascript
async function setupAuthentication() {
  // JWT 配置
  await fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET,
    sign: { expiresIn: '1h', issuer: 'api-gateway' },
    verify: { allowedIss: 'api-gateway' },
    formatUser: (payload) => ({
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || []
    })
  })

  // 认证组合
  await fastify.register(require('@fastify/auth'))

  // 认证装饰器
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  // 角色检查装饰器
  fastify.decorate('requireRole', (role) => {
    return async function(request, reply) {
      if (!request.user?.roles?.includes(role)) {
        reply.code(403).send({ error: 'Forbidden' })
      }
    }
  })
}
```

### 保护机制设置

```javascript
async function setupProtection() {
  // Redis 客户端 (可选)
  const redis = process.env.REDIS_HOST ? 
    new require('ioredis')(process.env.REDIS_HOST) : null

  // 限流器
  await fastify.register(require('@fastify/rate-limit'), {
    max: 1000,
    timeWindow: '1 minute',
    redis: redis,
    keyGenerator: (request) => request.user?.id || request.ip,
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      retryAfter: Math.round(context.ttl / 1000)
    })
  })

  // 缓存
  await fastify.register(require('@fastify/caching'), {
    privacy: 'public',
    expiresIn: 300 // 5分钟
  })

  // 熔断器
  await fastify.register(require('@fastify/circuit-breaker'), {
    threshold: 5,
    timeout: 10000,
    resetTimeout: 30000,
    onCircuitOpen: async (request, reply) => {
      reply.statusCode = 503
      return { error: 'Service Unavailable', retryAfter: 30 }
    }
  })
}
```

### 代理路由设置

```javascript
async function setupProxyRoutes() {
  // 用户服务代理
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: 'http://user-service:3001',
    prefix: '/api/v1/users',
    rewritePrefix: '/users',
    preHandler: [
      fastify.auth([fastify.authenticate]),
      fastify.rateLimit({ max: 100 }),
      fastify.circuitBreaker()
    ],
    replyOptions: {
      rewriteRequestHeaders: (req, headers) => ({
        ...headers,
        'x-user-id': req.user?.id,
        'x-request-id': req.id,
        'x-gateway-version': process.env.APP_VERSION
      })
    },
    websocket: true // WebSocket 支持
  })

  // 订单服务代理 (需要客户角色)
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: 'http://order-service:3002',
    prefix: '/api/v1/orders',
    rewritePrefix: '/orders',
    preHandler: [
      fastify.auth([
        fastify.authenticate,
        fastify.requireRole('customer')
      ], { relation: 'and' }),
      fastify.rateLimit({ max: 50 }),
      fastify.circuitBreaker({ threshold: 3 })
    ]
  })

  // 管理员服务代理 (最严格权限)
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: 'http://admin-service:3003',
    prefix: '/api/v1/admin',
    rewritePrefix: '/admin',
    preHandler: [
      fastify.auth([
        fastify.authenticate,
        fastify.requireRole('admin')
      ], { relation: 'and' }),
      fastify.rateLimit({ max: 20 })
    ]
  })

  // 公开服务代理 (仅限流)
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: 'http://public-service:3004',
    prefix: '/api/v1/public',
    rewritePrefix: '/public',
    preHandler: [
      fastify.rateLimit({ max: 500 })
    ]
  })

  // 负载均衡示例
  const instances = [
    'http://analytics-1:3005',
    'http://analytics-2:3005',
    'http://analytics-3:3005'
  ]
  
  let currentIndex = 0
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: () => {
      const instance = instances[currentIndex]
      currentIndex = (currentIndex + 1) % instances.length
      return instance
    },
    prefix: '/api/v1/analytics',
    preHandler: [
      fastify.auth([fastify.authenticate]),
      fastify.rateLimit({ max: 200 })
    ]
  })
}
```

## 高级功能配置

### 动态配置加载

```javascript
// config/gateway.config.js
module.exports = {
  services: [
    {
      name: 'user-service',
      upstream: process.env.USER_SERVICE_URL,
      prefix: '/api/v1/users',
      rewritePrefix: '/users',
      auth: { required: true },
      rateLimit: { max: 100 },
      circuitBreaker: { threshold: 5 }
    },
    {
      name: 'public-service',
      upstream: process.env.PUBLIC_SERVICE_URL,
      prefix: '/api/v1/public',
      rewritePrefix: '/public',
      auth: { required: false },
      rateLimit: { max: 500 }
    }
  ]
}

// 动态注册代理
const config = require('./config/gateway.config')
for (const service of config.services) {
  await fastify.register(require('@fastify/http-proxy'), {
    upstream: service.upstream,
    prefix: service.prefix,
    rewritePrefix: service.rewritePrefix,
    preHandler: buildPreHandlers(service)
  })
}
```

### 中间件管道

```javascript
function buildPreHandlers(serviceConfig) {
  const handlers = []
  
  // 认证
  if (serviceConfig.auth?.required) {
    handlers.push(fastify.auth([fastify.authenticate]))
  }
  
  // 角色检查
  if (serviceConfig.auth?.roles) {
    const roleHandlers = serviceConfig.auth.roles.map(role => 
      fastify.requireRole(role)
    )
    handlers.push(fastify.auth(roleHandlers, { relation: 'or' }))
  }
  
  // 限流
  if (serviceConfig.rateLimit) {
    handlers.push(fastify.rateLimit(serviceConfig.rateLimit))
  }
  
  // 熔断器
  if (serviceConfig.circuitBreaker) {
    handlers.push(fastify.circuitBreaker(serviceConfig.circuitBreaker))
  }
  
  return handlers
}
```

### WebSocket 支持

```javascript
await fastify.register(require('@fastify/http-proxy'), {
  upstream: 'http://websocket-service:3006',
  prefix: '/ws',
  websocket: true,
  wsClientOptions: {
    rewriteRequestHeaders: (headers, request) => ({
      ...headers,
      'x-user-id': request.user?.id,
      'x-session-id': request.sessionId
    })
  },
  wsHooks: {
    onConnect: (context, source, target) => {
      fastify.log.info('WebSocket connected')
    },
    onDisconnect: (context, source) => {
      fastify.log.info('WebSocket disconnected')
    },
    onIncomingMessage: (context, source, target, { data }) => {
      // 消息过滤或转换
      return data
    }
  }
})
```

## 运维和监控

### 健康检查端点

```javascript
// 扩展健康检查
await fastify.register(require('@fastify/under-pressure'), {
  exposeStatusRoute: {
    url: '/health',
    routeResponseSchemaOpts: {
      services: {
        type: 'object',
        properties: {
          userService: { type: 'string' },
          orderService: { type: 'string' },
          database: { type: 'string' }
        }
      }
    }
  },
  healthCheck: async () => {
    const services = {
      userService: await checkService('http://user-service:3001/health'),
      orderService: await checkService('http://order-service:3002/health'),
      database: await checkDatabase()
    }
    
    return {
      status: Object.values(services).every(s => s === 'healthy') ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION
    }
  }
})

async function checkService(url) {
  try {
    const response = await fetch(url, { timeout: 5000 })
    return response.ok ? 'healthy' : 'unhealthy'
  } catch (error) {
    return 'unhealthy'
  }
}
```

### 指标收集

```javascript
// 自定义指标
const promClient = require('prom-client')

const requestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
})

const proxyRequests = new promClient.Counter({
  name: 'proxy_requests_total',
  help: 'Total number of proxy requests',
  labelNames: ['service', 'method', 'status']
})

// 中间件
fastify.addHook('onRequest', (request, reply, done) => {
  request.startTime = Date.now()
  done()
})

fastify.addHook('onResponse', (request, reply, done) => {
  const duration = (Date.now() - request.startTime) / 1000
  requestDuration
    .labels(request.method, request.routerPath || 'unknown', reply.statusCode)
    .observe(duration)
  done()
})

// Prometheus 端点
fastify.get('/metrics', async (request, reply) => {
  reply.type('text/plain')
  return promClient.register.metrics()
})
```

### 日志结构化

```javascript
const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'authorization': req.headers.authorization ? '[REDACTED]' : undefined
        },
        hostname: req.hostname,
        remoteAddress: req.ip,
        userId: req.user?.id
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.headers,
        responseTime: res.elapsedTime
      })
    }
  }
})

// 结构化日志中间件
fastify.addHook('onResponse', async (request, reply) => {
  const logData = {
    requestId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.elapsedTime,
    userAgent: request.headers['user-agent'],
    userId: request.user?.id,
    service: request.routerPath?.split('/')[3] // 提取服务名
  }
  
  if (reply.statusCode >= 400) {
    request.log.warn(logData, 'Request completed with error')
  } else {
    request.log.info(logData, 'Request completed successfully')
  }
})
```

## 性能优化

### 连接池配置

```javascript
await fastify.register(require('@fastify/http-proxy'), {
  upstream: 'http://backend-service:3001',
  undici: {
    connections: 128,      // 连接池大小
    pipelining: 10,        // 管道化请求数
    keepAliveTimeout: 60000,
    keepAliveMaxTimeout: 600000,
    headersTimeout: 30000,
    bodyTimeout: 30000
  }
})
```

### 缓存策略

```javascript
// 多层缓存配置
await fastify.register(require('@fastify/caching'), {
  privacy: 'public',
  expiresIn: 300,          // 浏览器缓存 5分钟
  serverExpiresIn: 600,    // CDN 缓存 10分钟
  cache: redisAbstractCache
})

// 路由级缓存
fastify.get('/api/v1/config', {
  config: {
    cache: {
      expiresIn: 3600,     // 配置信息缓存 1小时
      privacy: 'public'
    }
  }
}, async (request, reply) => {
  reply.etag('config-v1.2.3')
  return getSystemConfig()
})
```

### 内存优化

```javascript
// V8 内存优化
process.env.NODE_OPTIONS = '--max-old-space-size=2048'

// 监控内存使用
setInterval(() => {
  const memUsage = process.memoryUsage()
  fastify.log.info({
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
  }, 'Memory usage')
}, 60000)
```

## 部署配置

### Docker 配置

```dockerfile
FROM node:18-alpine

# 安装生产依赖
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "index.js"]
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  labels:
    app: api-gateway
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
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
          name: http
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
        - name: REDIS_HOST
          value: "redis-service.default.svc.cluster.local"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: api-gateway

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: api-gateway-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway-service
            port:
              number: 80
```

## 故障排除

### 常见问题诊断

```javascript
// 调试模式配置
if (process.env.DEBUG === 'true') {
  fastify.addHook('onRequest', async (request, reply) => {
    request.log.debug({
      url: request.url,
      method: request.method,
      headers: request.headers,
      query: request.query
    }, 'Incoming request')
  })

  fastify.addHook('preHandler', async (request, reply) => {
    if (request.user) {
      request.log.debug({
        userId: request.user.id,
        roles: request.user.roles
      }, 'User authenticated')
    }
  })
}

// 错误日志增强
fastify.setErrorHandler(async (error, request, reply) => {
  const errorDetails = {
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    url: request.url,
    method: request.method,
    userId: request.user?.id,
    requestId: request.id
  }

  if (error.statusCode >= 500) {
    request.log.error(errorDetails, 'Internal server error')
  } else {
    request.log.warn(errorDetails, 'Client error')
  }

  reply.status(error.statusCode || 500).send({
    error: error.statusCode >= 500 ? 'Internal Server Error' : error.message,
    requestId: request.id
  })
})
```

### 性能诊断

```bash
# 检查服务状态
curl -s http://gateway:3000/health | jq '.'

# 查看系统指标
curl -s http://gateway:3000/metrics | grep -E "(request_duration|memory_usage)"

# 分析慢请求
kubectl logs -f deployment/api-gateway | grep "responseTime.*[0-9]{3,}ms"

# 检查代理连接
kubectl exec -it deployment/api-gateway -- nslookup user-service
```

## 总结

这个集成方案通过合理使用 Fastify 生态系统的成熟插件，构建了一个功能完整、性能优异的 API 网关系统。主要特点包括：

1. **模块化设计**: 每个功能都使用独立插件，易于维护和扩展
2. **高性能**: 基于 Fastify 和经过优化的插件组合
3. **生产就绪**: 包含完整的监控、日志、错误处理机制
4. **安全性**: 多层防护，从认证到限流到熔断
5. **可观测性**: 完整的指标收集和日志记录
6. **易部署**: 支持 Docker 和 Kubernetes 部署

通过这种插件组合的方式，避免了重复造轮子，同时确保了系统的稳定性和可维护性。