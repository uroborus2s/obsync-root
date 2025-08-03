# API 网关技术规范

## 项目概述

本项目基于 Stratix 框架构建的企业级 API 网关，提供高性能、可扩展的微服务网关解决方案。

## 技术栈

### 核心框架
- **Stratix**: 基于 Fastify 的 Node.js 应用框架
- **Fastify**: 高性能 Web 框架
- **TypeScript**: 类型安全的 JavaScript 超集
- **Awilix**: 依赖注入容器

### 中间件和插件
- **@fastify/cors**: 跨域资源共享
- **@fastify/helmet**: 安全头设置
- **@fastify/rate-limit**: 请求限流
- **@fastify/swagger**: API 文档生成
- **@fastify/compress**: 响应压缩

### 数据存储
- **Redis**: 缓存和会话存储
- **IoRedis**: Redis 客户端

### 监控和日志
- **Pino**: 高性能日志库
- **Prometheus**: 指标收集
- **Grafana**: 监控仪表板

### 开发工具
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **Vitest**: 测试框架
- **TSX**: TypeScript 执行器

## 系统架构

### 分层架构

```
┌─────────────────────────────────────────┐
│              应用层 (Controllers)        │
├─────────────────────────────────────────┤
│              业务层 (Services)          │
├─────────────────────────────────────────┤
│              数据层 (Adapters)          │
├─────────────────────────────────────────┤
│            基础设施层 (Infrastructure)    │
└─────────────────────────────────────────┘
```

### 插件架构

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Gateway Core  │  │  Fastify Echo   │  │   Middleware    │
│     Plugin      │  │     System      │  │     Plugin      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                              │
         ┌─────────────────────┴─────────────────────┐
         │            Stratix Core Framework         │
         └───────────────────────────────────────────┘
```

## API 设计

### RESTful API 规范

#### 通用响应格式

```typescript
// 成功响应
{
  "data": any,
  "message": string,
  "timestamp": string
}

// 错误响应
{
  "error": {
    "code": string,
    "message": string,
    "details": any
  },
  "timestamp": string,
  "requestId": string
}
```

#### HTTP 状态码

- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未认证
- `403 Forbidden` - 权限不足
- `404 Not Found` - 资源不存在
- `429 Too Many Requests` - 请求过于频繁
- `500 Internal Server Error` - 服务器内部错误
- `502 Bad Gateway` - 上游服务错误
- `503 Service Unavailable` - 服务不可用

### 核心 API 端点

#### 认证相关

```
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/verify
```

#### 健康检查

```
GET /health
GET /health/live
GET /health/ready
GET /metrics
GET /info
```

#### 通用代理

```
* /api/*
```

## 安全规范

### 认证机制

- **JWT (JSON Web Token)**: 基于令牌的身份认证
- **Token 过期机制**: Access Token (1小时) + Refresh Token (7天)
- **Token 黑名单**: 支持令牌撤销

### 授权机制

- **RBAC (基于角色的访问控制)**: 支持多角色权限管理
- **路径级权限**: 支持细粒度的 API 权限控制

### 安全头设置

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

### 限流策略

- **全局限流**: 10000 请求/分钟
- **路径级限流**: 根据不同 API 设置不同限制
- **IP 限流**: 防止恶意攻击

## 性能规范

### 响应时间

- **P95**: < 100ms (内网调用)
- **P99**: < 500ms
- **超时设置**: 5-15秒 (根据服务类型)

### 吞吐量

- **目标 RPS**: 10,000+ 请求/秒
- **并发连接**: 支持 10,000+ 并发连接

### 资源使用

- **内存使用**: < 512MB (单实例)
- **CPU 使用**: < 70% (正常负载)

## 可靠性规范

### 可用性

- **目标可用性**: 99.9%
- **故障恢复时间**: < 5分钟

### 容错机制

- **熔断器**: 保护下游服务
- **重试机制**: 指数退避重试
- **优雅降级**: 部分功能降级而非完全不可用

### 监控指标

#### 业务指标

- 请求总数
- 错误率
- 响应时间分布
- 活跃用户数

#### 系统指标

- CPU 使用率
- 内存使用率
- 网络 I/O
- 磁盘 I/O

#### 应用指标

- 请求队列长度
- 数据库连接数
- 缓存命中率
- 错误日志数量

## 开发规范

### 代码规范

#### 命名规范

- **文件名**: kebab-case (user-service.ts)
- **类名**: PascalCase (UserService)
- **函数名**: camelCase (getUserById)
- **常量**: SCREAMING_SNAKE_CASE (MAX_RETRY_COUNT)

#### 目录结构

```
src/
├── controllers/          # 控制器层
├── services/             # 业务逻辑层
├── adapters/             # 数据适配器层
├── plugins/              # 插件定义
├── types/                # 类型定义
├── utils/                # 工具函数
├── config/               # 配置文件
└── tests/                # 测试文件
```

#### 代码注释

```typescript
/**
 * 用户认证服务
 * 负责处理用户登录、令牌验证等功能
 */
@Injectable()
export class AuthService {
  /**
   * 验证用户凭据
   * @param username 用户名
   * @param password 密码
   * @returns 用户信息或 null
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    // 实现逻辑
  }
}
```

### 错误处理

#### 错误分类

```typescript
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

#### 错误处理示例

```typescript
try {
  const result = await service.performOperation()
  return result
} catch (error) {
  if (error instanceof ValidationError) {
    throw new BadRequestError(error.message)
  } else if (error instanceof ServiceUnavailableError) {
    throw new ServiceUnavailableError('Downstream service is unavailable')
  } else {
    logger.error('Unexpected error:', error)
    throw new InternalServerError('An unexpected error occurred')
  }
}
```

### 测试规范

#### 测试类型

- **单元测试**: 覆盖率 > 80%
- **集成测试**: 覆盖关键业务流程
- **端到端测试**: 覆盖主要用户场景

#### 测试示例

```typescript
describe('AuthService', () => {
  let authService: AuthService
  let mockCacheAdapter: jest.Mocked<CacheAdapter>

  beforeEach(() => {
    mockCacheAdapter = createMockCacheAdapter()
    authService = new AuthService(mockCacheAdapter, mockLogger)
  })

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      // Arrange
      const username = 'testuser'
      const password = 'password123'
      const expectedUser = { id: '1', username, roles: ['user'] }
      
      // Act
      const result = await authService.validateUser(username, password)
      
      // Assert
      expect(result).toEqual(expectedUser)
    })

    it('should return null when credentials are invalid', async () => {
      // Test implementation
    })
  })
})
```

## 部署规范

### 环境分类

- **开发环境**: 开发人员本地开发
- **测试环境**: 功能测试和集成测试
- **预生产环境**: 生产环境的完整镜像
- **生产环境**: 线上生产服务

### 配置管理

#### 环境变量分类

```typescript
interface EnvironmentConfig {
  // 基础配置
  NODE_ENV: 'development' | 'test' | 'staging' | 'production'
  PORT: number
  HOST: string
  
  // 服务配置
  REDIS_HOST: string
  REDIS_PORT: number
  REDIS_PASSWORD?: string
  
  // 安全配置
  JWT_SECRET: string
  ENCRYPTION_KEY: string
  
  // 功能开关
  AUTH_ENABLED: boolean
  RATE_LIMIT_ENABLED: boolean
  
  // 监控配置
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'
  METRICS_ENABLED: boolean
}
```

### 容器化规范

#### Dockerfile 最佳实践

```dockerfile
# 使用多阶段构建
FROM node:20-alpine AS builder
# 构建阶段...

FROM node:20-alpine AS production
# 生产阶段...

# 使用非 root 用户
USER node

# 设置工作目录
WORKDIR /app

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/health || exit 1
```

#### 资源限制

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## 运维规范

### 监控和告警

#### 告警规则

```yaml
groups:
- name: api-gateway
  rules:
  - alert: HighErrorRate
    expr: rate(http_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 2m
    annotations:
      summary: "High error rate detected"
      
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
    for: 2m
    annotations:
      summary: "High response time detected"
```

### 日志规范

#### 日志级别

- **DEBUG**: 详细的调试信息
- **INFO**: 一般信息，如请求日志
- **WARN**: 警告信息，如性能问题
- **ERROR**: 错误信息，需要关注

#### 日志格式

```json
{
  "timestamp": "2025-01-01T00:00:00.000Z",
  "level": "info",
  "service": "api-gateway",
  "requestId": "req_abc123",
  "message": "Request processed",
  "method": "GET",
  "url": "/api/users",
  "statusCode": 200,
  "responseTime": 45,
  "userAgent": "Mozilla/5.0..."
}
```

### 备份和恢复

#### 配置备份

- **配置文件**: 定期备份配置文件
- **环境变量**: 备份关键环境变量
- **密钥**: 安全存储加密密钥

#### 数据备份

- **Redis 数据**: 定期备份缓存数据
- **日志文件**: 归档重要日志
- **监控数据**: 备份关键指标历史

## 扩展指南

### 添加新的中间件

```typescript
// 1. 创建中间件函数
export async function customMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // 中间件逻辑
}

// 2. 注册到插件中
fastify.addHook('preHandler', customMiddleware)
```

### 添加新的服务适配器

```typescript
// 1. 定义适配器接口
interface CustomAdapter {
  connect(): Promise<void>
  disconnect(): Promise<void>
  performOperation(data: any): Promise<any>
}

// 2. 实现适配器
@Injectable()
export class CustomAdapterImpl implements CustomAdapter {
  // 实现逻辑
}

// 3. 注册到容器
container.register('customAdapter', asClass(CustomAdapterImpl))
```

### 添加新的监控指标

```typescript
// 1. 定义指标
const customCounter = new Counter({
  name: 'custom_operations_total',
  help: 'Total number of custom operations'
})

// 2. 记录指标
customCounter.inc()

// 3. 暴露指标
app.get('/metrics', async (request, reply) => {
  reply.header('Content-Type', register.contentType)
  return register.metrics()
})
```

## 总结

本技术规范文档涵盖了 API 网关项目的：

- 技术栈选型和架构设计
- API 设计和安全规范
- 性能和可靠性要求
- 开发和测试规范
- 部署和运维指南
- 扩展开发指南

遵循这些规范可以确保项目的高质量、可维护性和可扩展性。