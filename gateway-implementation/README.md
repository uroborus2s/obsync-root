# Stratix Gateway

基于 Stratix 框架构建的高性能 API 网关服务，提供认证、授权、路由转发、限流、监控等完整的网关功能。

## 🌟 特性

- **🔐 多种认证方式**: JWT、OAuth2、API Key
- **🛡️ 安全防护**: CORS、CSRF、XSS、限流保护
- **🔄 智能路由**: 动态路由配置、负载均衡、健康检查
- **📊 监控告警**: 请求日志、性能监控、Prometheus 指标
- **⚡ 高性能**: 基于 Fastify 的高性能 HTTP 服务器
- **🔌 插件化**: 模块化插件架构，易于扩展
- **🎯 零配置**: 开箱即用，支持环境变量配置

## 🚀 快速开始

### 安装

```bash
npm install @stratix/gateway
# 或
yarn add @stratix/gateway
```

### 基本使用

```typescript
import { createGateway } from '@stratix/gateway';

// 创建网关实例
const gateway = await createGateway();

console.log('🚀 网关启动成功');
console.log(`📍 服务地址: http://localhost:3000`);
```

### 环境变量配置

```bash
# 服务器配置
GATEWAY_PORT=3000
GATEWAY_HOST=0.0.0.0

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
JWT_ISSUER=stratix-gateway

# 限流配置
RATE_LIMIT_GLOBAL=1000
RATE_LIMIT_PER_IP=200
RATE_LIMIT_PER_USER=100

# 日志配置
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_PATH=./logs/gateway.log

# Redis配置（可选）
REDIS_URL=redis://localhost:6379
```

## 📋 API 文档

### 认证 API

#### 用户登录
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123",
  "rememberMe": false
}
```

**响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "username": "admin",
    "roles": ["admin", "user"],
    "permissions": ["user:read", "user:write", "admin:access"]
  },
  "expiresIn": 86400
}
```

#### 获取用户信息
```http
GET /auth/profile
Authorization: Bearer <token>
```

### 网关管理 API

#### 获取网关信息
```http
GET /gateway/info
```

#### 获取路由配置
```http
GET /gateway/routes
Authorization: Bearer <admin-token>
```

#### 创建路由
```http
POST /gateway/routes
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "id": "new-service",
  "path": "/api/new/*",
  "target": "http://new-service:3000",
  "auth": {
    "required": true,
    "permissions": ["service:access"]
  }
}
```

### 监控 API

#### 健康检查
```http
GET /health
```

#### 详细健康检查
```http
GET /health/detailed
```

#### Prometheus 指标
```http
GET /metrics
```

## 🔧 配置说明

### 网关配置文件

创建 `config/gateway.config.ts`:

```typescript
import type { StratixConfig } from '@stratix/core';

export default function createGatewayConfig(sensitiveConfig: Record<string, string>): StratixConfig {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    plugins: [
      // 插件配置...
    ]
  };
}
```

### 路由配置文件

创建 `config/routes.config.ts`:

```typescript
export default [
  {
    id: 'user-service',
    path: '/api/users/*',
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    target: 'http://user-service:3001',
    auth: {
      required: true,
      permissions: ['user:read', 'user:write']
    },
    rateLimit: {
      max: 100,
      timeWindow: '1 minute'
    }
  }
];
```

## 🔌 插件系统

### 认证插件

```typescript
// JWT 认证
{
  name: 'jwt-auth',
  plugin: jwtAuthPlugin,
  options: {
    secret: 'your-secret',
    expiresIn: '24h',
    excludePaths: ['/health', '/public']
  }
}
```

### 限流插件

```typescript
// 限流配置
{
  name: 'rate-limiter',
  plugin: rateLimiterPlugin,
  options: {
    global: { max: 1000, timeWindow: '1 minute' },
    perIP: { max: 200, timeWindow: '1 minute' },
    perUser: { max: 100, timeWindow: '1 minute' }
  }
}
```

### 路由插件

```typescript
// 动态路由
{
  name: 'dynamic-router',
  plugin: dynamicRouterPlugin,
  options: {
    configPath: './config/routes.config.js',
    loadBalancing: {
      strategy: 'round-robin',
      healthCheck: { enabled: true }
    }
  }
}
```

## 🛡️ 安全特性

### 认证和授权

- **JWT 认证**: 支持 HS256/RS256 算法
- **角色权限**: 基于角色和权限的访问控制
- **令牌刷新**: 支持刷新令牌机制
- **会话管理**: 安全的会话管理

### 安全防护

- **CORS 保护**: 跨域请求保护
- **限流保护**: 多维度限流策略
- **请求验证**: 请求体大小限制
- **安全头**: 自动添加安全响应头

### 监控和审计

- **请求日志**: 详细的请求响应日志
- **性能监控**: 响应时间和吞吐量监控
- **错误追踪**: 错误日志和堆栈追踪
- **审计日志**: 敏感操作审计记录

## 📊 监控和运维

### 健康检查

网关提供多层次的健康检查：

```bash
# 基本健康检查
curl http://localhost:3000/health

# 详细健康检查
curl http://localhost:3000/health/detailed
```

### Prometheus 指标

```bash
# 获取 Prometheus 格式指标
curl http://localhost:3000/metrics
```

支持的指标包括：
- `gateway_requests_total` - 总请求数
- `gateway_request_duration_seconds` - 请求响应时间
- `gateway_rate_limit_hits_total` - 限流触发次数
- `gateway_upstream_health` - 上游服务健康状态

### 日志管理

```typescript
// 日志配置
logger: {
  level: 'info',
  enableRequestLogging: true,
  enablePerformanceLogging: true,
  enableErrorTracking: true,
  file: {
    enabled: true,
    path: './logs/gateway.log',
    maxSize: '10MB',
    maxFiles: 5
  }
}
```

## 🚀 部署指南

### Docker 部署

```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# 构建镜像
docker build -t stratix-gateway .

# 运行容器
docker run -d \
  --name gateway \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret \
  -e REDIS_URL=redis://redis:6379 \
  stratix-gateway
```

### Docker Compose

```yaml
version: '3.8'

services:
  gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      - JWT_SECRET=your-super-secret-key
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL=info
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  # 示例上游服务
  user-service:
    image: user-service:latest
    ports:
      - "3001:3000"
    restart: unless-stopped
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stratix-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: stratix-gateway
  template:
    metadata:
      labels:
        app: stratix-gateway
    spec:
      containers:
      - name: gateway
        image: stratix-gateway:latest
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
---
apiVersion: v1
kind: Service
metadata:
  name: gateway-service
spec:
  selector:
    app: stratix-gateway
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 🧪 测试

### 运行测试

```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# 性能测试
npm run test:performance

# 覆盖率测试
npm run test:coverage
```

### 示例测试

```bash
# 运行完整示例
npm run example

# 运行特定示例
npm run example:basic
npm run example:performance
npm run example:monitoring
```

## 🔧 开发指南

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd stratix-gateway

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build
```

### 自定义插件

```typescript
// 创建自定义插件
import { withRegisterAutoDI } from '@stratix/core';

async function customPlugin(fastify, options) {
  // 插件逻辑
  fastify.addHook('preHandler', async (request, reply) => {
    // 自定义处理逻辑
  });
}

export default withRegisterAutoDI(customPlugin, {
  discovery: {
    patterns: ['services/CustomService.{ts,js}']
  }
});
```

### 扩展认证

```typescript
// 自定义认证提供者
export class CustomAuthProvider {
  async authenticate(token: string): Promise<User | null> {
    // 自定义认证逻辑
    return user;
  }
}
```

## 📚 更多资源

- [Stratix 框架文档](https://stratix.dev)
- [Fastify 文档](https://fastify.dev)
- [API 网关最佳实践](https://example.com/best-practices)
- [性能优化指南](https://example.com/performance)

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md) 了解详情。

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

- 📧 邮箱: support@stratix.dev
- 💬 讨论: [GitHub Discussions](https://github.com/stratix/gateway/discussions)
- 🐛 问题: [GitHub Issues](https://github.com/stratix/gateway/issues)
- 📖 文档: [官方文档](https://docs.stratix.dev/gateway)