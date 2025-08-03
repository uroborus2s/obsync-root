# Stratix API Gateway

基于 Stratix 框架构建的现代化、高性能 API 网关。

## 架构设计

### 插件化架构

本项目充分利用 Stratix 框架的插件化架构和 Fastify 生态系统：

```
┌─────────────────────────────────────┐
│        Stratix 配置驱动             │
├─────────────────────────────────────┤
│ stratix.config.ts                   │  ← 统一配置入口
│ ├── @fastify/cors                   │  ← CORS 支持
│ ├── @fastify/helmet                 │  ← 安全头
│ ├── @fastify/rate-limit             │  ← 限流
│ ├── @fastify/redis                  │  ← Redis 连接
│ ├── @fastify/swagger                │  ← API 文档
│ ├── @fastify/http-proxy             │  ← HTTP 代理 (核心)
│ └── 自定义业务插件                  │  ← 认证、监控等
└─────────────────────────────────────┘
```

### 核心特性

1. **配置驱动**: 所有插件都在 `stratix.config.ts` 中统一配置
2. **Fastify 生态**: 充分利用 Fastify 官方插件，避免重复造轮子
3. **HTTP 代理**: 使用 `@fastify/http-proxy` 实现高性能请求转发
4. **自动发现**: Stratix 自动发现和注册服务、控制器
5. **类型安全**: 完整的 TypeScript 类型支持

## 快速开始

### 环境要求

- Node.js >= 22.0.0
- pnpm >= 8.0.0
- Redis (可选，用于缓存和限流)

### 安装和启动

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境配置
cp .env.example .env.local

# 3. 编辑配置文件
vim .env.local

# 4. 启动开发服务器
pnpm dev

# 或使用启动脚本
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

### 配置说明

#### 环境变量配置

主要环境变量在 `.env.local` 中配置：

```bash
# 应用基础配置
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# JWT 认证配置
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 后端服务 URL
USER_SERVICE_URL=http://localhost:3001
ORDER_SERVICE_URL=http://localhost:3002
PAYMENT_SERVICE_URL=http://localhost:3003
```

#### 插件配置

在 `src/stratix.config.ts` 中配置所有插件：

```typescript
export default function createConfig(sensitiveConfig: Record<string, string>): StratixConfig {
  return {
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0'
    },
    
    plugins: [
      // CORS 支持
      {
        name: 'cors',
        plugin: import('@fastify/cors'),
        options: {
          origin: process.env.CORS_ORIGIN?.split(',') || true,
          credentials: true
        }
      },
      
      // HTTP 代理 (核心功能)
      {
        name: 'gateway-core',
        plugin: gatewayCorePlugin,
        options: {
          routes: [
            {
              path: '/api/users/*',
              target: sensitiveConfig.USER_SERVICE_URL,
              middleware: ['auth', 'audit']
            }
          ]
        }
      }
    ]
  }
}
```

## 核心功能

### 1. HTTP 代理

使用 `@fastify/http-proxy` 实现高性能的请求转发：

- 支持多个后端服务
- 自动负载均衡
- WebSocket 支持
- 请求头转换

### 2. 认证授权

- JWT 令牌验证
- 基于角色的访问控制
- 令牌刷新机制
- 路径排除配置

### 3. 限流保护

使用 `@fastify/rate-limit` 实现多维度限流：

- 全局限流
- 用户级限流
- IP 级限流
- 路由级限流

### 4. 监控观测

- Prometheus 指标导出
- 健康检查端点
- 请求链路追踪
- 结构化日志

### 5. 安全防护

- CORS 配置
- 安全头设置
- 熔断器保护
- 系统压力监控

## API 端点

### 健康检查

- `GET /health` - 基础健康检查
- `GET /health/detailed` - 详细健康状态
- `GET /ready` - 就绪检查
- `GET /status` - 系统状态

### 监控指标

- `GET /metrics` - Prometheus 指标
- `GET /metrics/json` - JSON 格式指标

### API 文档

- `GET /docs` - Swagger UI 文档

### 代理路由

- `ANY /api/users/*` → 用户服务
- `ANY /api/orders/*` → 订单服务
- `POST /api/payments/*` → 支付服务

## 开发指南

### 添加新的代理路由

在 `stratix.config.ts` 中添加路由配置：

```typescript
{
  name: 'gateway-core',
  plugin: gatewayCorePlugin,
  options: {
    routes: [
      {
        path: '/api/products/*',
        target: 'http://product-service:3000',
        middleware: ['auth'],
        timeout: 5000,
        retries: 3
      }
    ]
  }
}
```

### 添加新的 Fastify 插件

直接在 `plugins` 数组中添加：

```typescript
{
  name: 'my-plugin',
  plugin: import('@fastify/my-plugin'),
  options: {
    // 插件配置
  }
}
```

### 自定义业务逻辑

1. 在 `src/services/` 中创建服务类
2. 在 `src/controllers/` 中创建控制器
3. 在 `src/adapters/` 中创建适配器
4. Stratix 会自动发现和注册这些组件

## 测试

```bash
# 运行测试
pnpm test

# 测试配置
node test-config.js

# 代码检查
pnpm lint

# 格式化代码
pnpm format
```

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t stratix-gateway .

# 运行容器
docker run -p 3000:3000 -e NODE_ENV=production stratix-gateway
```

### 生产环境配置

1. 设置环境变量
2. 配置 Redis 集群
3. 设置负载均衡器
4. 配置监控和告警

## 性能特点

- **高吞吐量**: > 10,000 RPS
- **低延迟**: P99 < 100ms
- **内存效率**: < 512MB 稳定运行
- **快速启动**: < 5s 冷启动

## 故障排除

### 常见问题

1. **插件加载失败**: 检查 `stratix.config.ts` 中的插件配置
2. **代理连接失败**: 验证后端服务 URL 和网络连接
3. **认证失败**: 检查 JWT 密钥配置
4. **限流触发**: 调整限流配置或检查请求频率

### 调试模式

```bash
# 启用调试日志
LOG_LEVEL=debug pnpm dev

# 查看详细错误信息
NODE_ENV=development pnpm dev
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

MIT License

---

**Stratix API Gateway** - 现代化、高性能的 API 网关解决方案 🚀