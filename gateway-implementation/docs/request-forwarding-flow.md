# Stratix Gateway 请求转发详细流程

## 🎯 概述

本文档详细解释 Stratix Gateway 如何将客户端请求转发到后端 Docker 服务的完整流程。

## 🏗️ 整体架构图

```
┌─────────────┐    ┌─────────────────────────────────────────┐    ┌─────────────────┐
│   Client    │    │           Stratix Gateway               │    │  Docker Services│
│             │    │                                         │    │                 │
│ ┌─────────┐ │    │ ┌─────────┐ ┌─────────┐ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Browser/ │ │───▶│ │ Auth    │ │ Rate    │ │ Dynamic     │ │───▶│ │user-service│ │
│ │Mobile   │ │    │ │ Plugin  │ │ Limiter │ │ Router      │ │    │ │:3001        │ │
│ │App      │ │    │ └─────────┘ └─────────┘ └─────────────┘ │    │ └─────────────┘ │
│ └─────────┘ │    │                                         │    │                 │
│             │    │ ┌─────────┐ ┌─────────┐ ┌─────────────┐ │    │ ┌─────────────┐ │
│             │    │ │ CORS    │ │ Logger  │ │ Load        │ │    │ │order-service│ │
│             │    │ │ Handler │ │ Plugin  │ │ Balancer    │ │    │ │:3002        │ │
│             │    │ └─────────┘ └─────────┘ └─────────────┘ │    │ └─────────────┘ │
└─────────────┘    └─────────────────────────────────────────┘    └─────────────────┘
```

## 🔄 详细转发流程

### 1. 请求接收阶段

```typescript
// 客户端发送请求
POST /api/users/123/profile
Host: gateway.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**网关接收处理：**
1. Fastify 服务器接收 HTTP 请求
2. 解析请求头、路径、查询参数
3. 创建请求上下文对象

### 2. 插件链处理阶段

#### 2.1 CORS 处理
```typescript
// CORS插件检查
if (request.headers.origin) {
  // 验证来源域名
  if (allowedOrigins.includes(request.headers.origin)) {
    reply.header('Access-Control-Allow-Origin', request.headers.origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
  }
}
```

#### 2.2 认证验证
```typescript
// JWT认证插件
const token = request.headers.authorization?.replace('Bearer ', '');
if (token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = {
      id: decoded.sub,
      username: decoded.username,
      roles: decoded.roles,
      permissions: decoded.permissions
    };
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}
```

#### 2.3 限流检查
```typescript
// 限流插件
const key = `ip:${request.ip}`;
const current = await rateLimiter.increment(key);
if (current.count > maxRequests) {
  return reply.status(429).send({
    error: 'Too Many Requests',
    retryAfter: current.resetTime
  });
}
```

### 3. 路由匹配阶段

```typescript
// 动态路由插件匹配
function matchRoute(method: string, path: string): RouteConfig | null {
  for (const config of routeConfigs) {
    // 检查HTTP方法匹配
    const methods = Array.isArray(config.method) ? config.method : [config.method || 'GET'];
    if (!methods.includes(method.toUpperCase())) {
      continue;
    }

    // 检查路径匹配
    if (config.path.endsWith('/*')) {
      const prefix = config.path.slice(0, -2); // 移除 /*
      if (path.startsWith(prefix)) {
        return config; // 匹配成功
      }
    } else if (config.path === path) {
      return config; // 精确匹配
    }
  }
  return null; // 无匹配路由
}

// 示例匹配过程
// 请求: POST /api/users/123/profile
// 路由配置: /api/users/*
// 匹配结果: ✅ 成功匹配
```

**匹配的路由配置：**
```typescript
{
  id: 'user-service',
  path: '/api/users/*',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
  target: ['http://user-service-1:3001', 'http://user-service-2:3001'],
  rewrite: {
    '^/api/users': '/users'  // 路径重写规则
  },
  loadBalancing: {
    strategy: 'round-robin',
    healthCheck: true
  },
  auth: {
    required: true,
    permissions: ['user:write']
  }
}
```

### 4. 权限验证阶段

```typescript
// 检查路由级别的权限要求
if (routeConfig.auth?.required) {
  if (!request.user) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  // 检查权限
  if (routeConfig.auth.permissions) {
    const hasPermission = routeConfig.auth.permissions.some(permission =>
      request.user.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        required: routeConfig.auth.permissions
      });
    }
  }
}
```

### 5. 负载均衡阶段

```typescript
// 负载均衡器选择目标服务
class RoundRobinLoadBalancer {
  selectTarget(targets: string[]): string {
    // 1. 过滤健康的服务
    const healthyTargets = targets.filter(target => {
      const health = this.healthStatus.get(target);
      return !health || health.healthy;
    });

    if (healthyTargets.length === 0) {
      throw new Error('No healthy targets available');
    }

    // 2. 轮询选择
    const counter = this.counters.get('round-robin') || 0;
    const selectedTarget = healthyTargets[counter % healthyTargets.length];
    this.counters.set('round-robin', counter + 1);

    return selectedTarget;
  }
}

// 选择结果示例
// 可用服务: ['http://user-service-1:3001', 'http://user-service-2:3001']
// 健康检查: user-service-1 ✅, user-service-2 ✅
// 轮询计数: 0
// 选中服务: http://user-service-1:3001
```

### 6. 请求转换阶段

#### 6.1 URL 重写
```typescript
// 应用路径重写规则
function buildTargetUrl(targetUrl: string, request: FastifyRequest, routeConfig: RouteConfig): string {
  let path = request.url; // /api/users/123/profile

  // 应用重写规则
  if (routeConfig.rewrite) {
    for (const [pattern, replacement] of Object.entries(routeConfig.rewrite)) {
      const regex = new RegExp(pattern);
      path = path.replace(regex, replacement);
      // /api/users/123/profile -> /users/123/profile
    }
  }

  return `${targetUrl}${path}`;
  // 最终URL: http://user-service-1:3001/users/123/profile
}
```

#### 6.2 请求头处理
```typescript
// 准备转发的请求头
function prepareHeaders(request: FastifyRequest, routeConfig: RouteConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  // 1. 复制原始请求头（排除hop-by-hop头）
  for (const [key, value] of Object.entries(request.headers)) {
    if (!['connection', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
      headers[key] = String(value);
    }
  }

  // 2. 添加代理相关头
  headers['x-forwarded-for'] = request.ip;           // 客户端真实IP
  headers['x-forwarded-proto'] = request.protocol;   // 原始协议
  headers['x-forwarded-host'] = request.hostname;    // 原始主机名
  headers['x-real-ip'] = request.ip;                 // 真实IP
  headers['x-gateway'] = 'stratix-gateway';          // 网关标识

  // 3. 添加路由特定头
  if (routeConfig.headers) {
    Object.assign(headers, routeConfig.headers);
    // 例如: { 'X-Service': 'user-service', 'X-Version': 'v1' }
  }

  return headers;
}
```

#### 6.3 请求体处理
```typescript
// 处理请求体
async function prepareBody(request: FastifyRequest): Promise<string | undefined> {
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return undefined;
  }

  if (request.body) {
    if (typeof request.body === 'object') {
      return JSON.stringify(request.body); // 重新序列化JSON
    } else {
      return String(request.body); // 转换为字符串
    }
  }

  return undefined;
}
```

### 7. HTTP 请求发送阶段

```typescript
// 使用 fetch API 发送请求到 Docker 服务
async function attemptRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  targetUrl: string,
  routeConfig: RouteConfig
): Promise<void> {
  const fullTargetUrl = buildTargetUrl(targetUrl, request, routeConfig);
  const headers = prepareHeaders(request, routeConfig);
  const body = await prepareBody(request);

  // 设置超时控制
  const controller = new AbortController();
  const timeout = routeConfig.timeout || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // 发送HTTP请求到Docker服务
    const response = await fetch(fullTargetUrl, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
      redirect: 'manual' // 不自动跟随重定向
    });

    clearTimeout(timeoutId);

    // 处理响应...
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
```

**实际发送的请求示例：**
```http
POST /users/123/profile HTTP/1.1
Host: user-service-1:3001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Forwarded-For: 192.168.1.100
X-Forwarded-Proto: https
X-Forwarded-Host: gateway.example.com
X-Real-IP: 192.168.1.100
X-Gateway: stratix-gateway
X-Service: user-service
X-Version: v1

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### 8. Docker 服务处理

```yaml
# docker-compose.yml 中的服务定义
version: '3.8'
services:
  user-service-1:
    image: user-service:latest
    container_name: user-service-1
    ports:
      - "3001:3000"  # 容器内端口3000映射到主机3001
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    networks:
      - app-network

  user-service-2:
    image: user-service:latest
    container_name: user-service-2
    ports:
      - "3002:3000"  # 容器内端口3000映射到主机3002
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**Docker 服务接收请求：**
1. Docker 容器监听内部端口 3000
2. 请求通过 Docker 网络路由到容器
3. 容器内的应用处理业务逻辑
4. 返回响应数据

### 9. 响应处理阶段

#### 9.1 响应头处理
```typescript
// 设置响应头
function setResponseHeaders(reply: FastifyReply, response: Response, routeConfig: RouteConfig): void {
  // 1. 复制上游服务的响应头
  for (const [key, value] of response.headers.entries()) {
    if (!['connection', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
      reply.header(key, value);
    }
  }

  // 2. 添加网关标识头
  reply.header('x-gateway', 'stratix-gateway');
  reply.header('x-proxy-target', response.url);
  reply.header('x-response-time', Date.now() - startTime);

  // 3. 添加安全头（如果配置了）
  if (routeConfig.security?.additionalHeaders) {
    for (const [key, value] of Object.entries(routeConfig.security.additionalHeaders)) {
      reply.header(key, value);
    }
  }
}
```

#### 9.2 响应体处理
```typescript
// 处理不同类型的响应体
async function handleResponseBody(reply: FastifyReply, response: Response): Promise<void> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    // JSON 响应
    const jsonData = await response.json();
    reply.send(jsonData);
  } else if (contentType.includes('text/')) {
    // 文本响应
    const textData = await response.text();
    reply.send(textData);
  } else {
    // 二进制响应（图片、文件等）
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    reply.send(buffer);
  }
}
```

### 10. 客户端响应

**最终返回给客户端的响应：**
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Gateway: stratix-gateway
X-Proxy-Target: http://user-service-1:3001/users/123/profile
X-Response-Time: 45
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95

{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

## 🔧 Docker 网络配置

### 网络拓扑
```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host                              │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  Gateway        │    │        App Network              │ │
│  │  Container      │    │                                 │ │
│  │  Port: 3000     │────┤  ┌─────────────┐                │ │
│  └─────────────────┘    │  │user-service-1│                │ │
│                         │  │Port: 3000    │                │ │
│  ┌─────────────────┐    │  └─────────────┘                │ │
│  │     Redis       │    │                                 │ │
│  │  Port: 6379     │────┤  ┌─────────────┐                │ │
│  └─────────────────┘    │  │user-service-2│                │ │
│                         │  │Port: 3000    │                │ │
│                         │  └─────────────┘                │ │
│                         └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Docker Compose 完整配置
```yaml
version: '3.8'

services:
  # API 网关
  gateway:
    build: .
    container_name: stratix-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL_1=http://user-service-1:3000
      - USER_SERVICE_URL_2=http://user-service-2:3000
      - ORDER_SERVICE_URL=http://order-service:3000
    depends_on:
      - redis
      - user-service-1
      - user-service-2
      - order-service
    networks:
      - app-network
    restart: unless-stopped

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    networks:
      - app-network
    restart: unless-stopped

  # 用户服务实例1
  user-service-1:
    image: user-service:latest
    container_name: user-service-1
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    networks:
      - app-network
    restart: unless-stopped

  # 用户服务实例2
  user-service-2:
    image: user-service:latest
    container_name: user-service-2
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    networks:
      - app-network
    restart: unless-stopped

  # 订单服务
  order-service:
    image: order-service:latest
    container_name: order-service
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - USER_SERVICE_URL=http://user-service-1:3000
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 🔍 健康检查机制

### 健康检查流程
```typescript
// 定期健康检查
setInterval(async () => {
  const targets = ['http://user-service-1:3000', 'http://user-service-2:3000'];
  
  for (const target of targets) {
    try {
      const response = await fetch(`${target}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      const isHealthy = response.ok;
      loadBalancer.updateHealth(target, isHealthy);
      
      if (!isHealthy) {
        console.warn(`Service ${target} is unhealthy: ${response.status}`);
      }
    } catch (error) {
      loadBalancer.updateHealth(target, false);
      console.error(`Health check failed for ${target}:`, error.message);
    }
  }
}, 30000); // 每30秒检查一次
```

### 故障转移
```typescript
// 当服务不健康时的处理
selectTarget(targets: string[]): string {
  const healthyTargets = targets.filter(target => {
    const health = this.healthStatus.get(target);
    return !health || health.healthy; // 未知状态视为健康
  });

  if (healthyTargets.length === 0) {
    // 所有服务都不健康，抛出错误
    throw new Error('No healthy targets available');
  }

  // 从健康的服务中选择
  return this.roundRobinSelect(healthyTargets);
}
```

## 📊 监控和日志

### 请求日志
```typescript
// 每个请求的详细日志
fastify.log.info('Proxy request completed', {
  requestId: 'req_123456',
  method: 'POST',
  originalPath: '/api/users/123/profile',
  targetPath: '/users/123/profile',
  targetService: 'http://user-service-1:3000',
  statusCode: 200,
  duration: 45,
  userAgent: 'Mozilla/5.0...',
  clientIP: '192.168.1.100',
  userId: 'user_789'
});
```

### 性能指标
```typescript
// Prometheus 格式的指标
const metrics = [
  '# HELP gateway_requests_total Total number of requests',
  '# TYPE gateway_requests_total counter',
  `gateway_requests_total{method="POST",route="/api/users/*",status="200"} 1`,
  
  '# HELP gateway_request_duration_seconds Request duration',
  '# TYPE gateway_request_duration_seconds histogram',
  `gateway_request_duration_seconds_bucket{le="0.1"} 0`,
  `gateway_request_duration_seconds_bucket{le="0.5"} 1`,
  `gateway_request_duration_seconds_sum 0.045`,
  `gateway_request_duration_seconds_count 1`
].join('\n');
```

## 🚨 错误处理

### 重试机制
```typescript
// 请求失败时的重试逻辑
async function proxyWithRetry(request, reply, targetUrl, routeConfig) {
  const maxRetries = routeConfig.retries || 3;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      await attemptRequest(request, reply, targetUrl, routeConfig);
      return; // 成功，退出重试循环
    } catch (error) {
      attempt++;
      
      if (attempt > maxRetries) {
        // 所有重试都失败
        reply.status(502).send({
          error: 'Bad Gateway',
          message: 'All retry attempts failed',
          attempts: attempt
        });
        return;
      }

      // 指数退避延迟
      const delay = 1000 * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}
```

### 超时处理
```typescript
// 请求超时控制
const controller = new AbortController();
const timeoutId = setTimeout(() => {
  controller.abort();
}, routeConfig.timeout || 30000);

try {
  const response = await fetch(targetUrl, {
    signal: controller.signal,
    // ... 其他选项
  });
} catch (error) {
  if (error.name === 'AbortError') {
    reply.status(504).send({
      error: 'Gateway Timeout',
      message: `Request timeout after ${routeConfig.timeout}ms`
    });
  }
} finally {
  clearTimeout(timeoutId);
}
```

这就是 Stratix Gateway 将客户端请求转发到 Docker 服务的完整流程。整个过程包括了认证、授权、负载均衡、健康检查、错误处理等多个环节，确保了高可用性和高性能的服务代理。