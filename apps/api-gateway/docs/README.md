# Stratix API Gateway 文档中心

欢迎使用 Stratix API Gateway！这是一个基于 Stratix 框架（Fastify 5 + Awilix 12）构建的现代化、高性能 API 网关服务。

## 📚 文档导航

### 🏗️ 架构设计
- **[架构设计文档](./architecture.md)** - 完整的系统架构设计，包括核心组件、插件系统、数据流等
- **[API 接口规范](./api-specification.md)** - 网关管理 API 的详细接口规范
- **[OAuth2 集成方案](./oauth2-integration.md)** - 基于 WPS 协作平台的 OAuth2 认证集成方案

### 🚀 部署运维
- **[部署指南](./deployment-guide.md)** - 从本地开发到分布式集群的完整部署指南
- **[配置说明](./configuration.md)** - 详细的配置选项、环境变量和最佳实践

### 🔧 开发指南
- **[快速开始](#快速开始)** - 5分钟快速搭建开发环境
- **[插件开发](#插件开发)** - 如何开发自定义网关插件
- **[API 使用示例](#api-使用示例)** - 常见 API 使用场景和示例

## 🚀 快速开始

### 环境要求

- Node.js >= 22.0.0
- pnpm >= 8.0.0
- Redis (可选，用于缓存和限流)
- Docker (可选，用于容器化部署)

### 安装和启动

```bash
# 1. 克隆项目
git clone https://github.com/your-org/stratix-gateway.git
cd stratix-gateway

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp apps/api-gateway/.env.example apps/api-gateway/.env.local

# 4. 启动开发服务器
pnpm dev

# 5. 验证服务
curl http://localhost:3000/health
```

### 基础配置

创建 `apps/api-gateway/stratix.config.ts`:

```typescript
import type { StratixConfig } from '@stratix/core';

export default function createConfig(): StratixConfig {
  return {
    name: 'api-gateway',
    version: '1.0.0',
    
    server: {
      host: '0.0.0.0',
      port: 3000,
      logger: { level: 'info' }
    },
    
    plugins: [
      // OAuth2 认证
      ['@stratix/oauth2-auth', {
        wps: {
          clientId: process.env.WPS_CLIENT_ID,
          clientSecret: process.env.WPS_CLIENT_SECRET,
          // ... 其他配置
        }
      }],
      
      // HTTP 代理
      ['@fastify/http-proxy', {
        upstream: 'http://localhost:4000',
        prefix: '/api/v1'
      }],
      
      // 限流
      ['@fastify/rate-limit', {
        max: 100,
        timeWindow: '1 minute'
      }]
    ]
  };
}
```

## 🔌 插件开发

Stratix API Gateway 采用插件化架构，所有功能都以 Fastify 插件的形式实现。

### 创建自定义插件

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { withRegisterAutoDI } from '@stratix/core/plugin';

interface MyPluginOptions extends FastifyPluginOptions {
  customOption: string;
}

async function myCustomPlugin(
  fastify: FastifyInstance,
  options: MyPluginOptions
) {
  // 注册路由
  fastify.get('/my-endpoint', async (request, reply) => {
    return { message: 'Hello from custom plugin!' };
  });
  
  // 注册钩子
  fastify.addHook('preHandler', async (request, reply) => {
    // 自定义预处理逻辑
  });
}

// 导出插件
export default withRegisterAutoDI(myCustomPlugin, {
  discovery: {
    patterns: ['services/**/*.ts']
  }
});
```

### 插件注册

在 `stratix.config.ts` 中注册插件：

```typescript
plugins: [
  ['./plugins/my-custom-plugin', {
    customOption: 'value'
  }]
]
```

## 📖 API 使用示例

### 认证流程

```bash
# 1. 获取授权 URL
curl -X GET "http://localhost:3000/api/v1/auth/authorize"

# 2. 用户授权后，使用授权码换取 token
curl -X POST "http://localhost:3000/api/v1/auth/callback" \
  -H "Content-Type: application/json" \
  -d '{"code": "authorization_code", "state": "random_state"}'

# 3. 使用 token 访问受保护的 API
curl -X GET "http://localhost:3000/api/v1/protected-resource" \
  -H "Authorization: Bearer your_access_token"
```

### 管理 API

```bash
# 获取路由列表
curl -X GET "http://localhost:3000/admin/api/v1/routes" \
  -H "Authorization: Bearer admin_token"

# 创建新路由
curl -X POST "http://localhost:3000/admin/api/v1/routes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token" \
  -d '{
    "name": "新服务路由",
    "path": "/api/new-service/*",
    "upstream": {
      "type": "static",
      "targets": [{"url": "http://new-service:3000", "weight": 100}]
    }
  }'

# 获取监控指标
curl -X GET "http://localhost:3000/admin/api/v1/metrics/realtime" \
  -H "Authorization: Bearer admin_token"
```

### 健康检查

```bash
# 基础健康检查
curl -X GET "http://localhost:3000/health"

# 详细健康检查
curl -X GET "http://localhost:3000/admin/api/v1/health/detailed" \
  -H "Authorization: Bearer admin_token"

# 就绪检查
curl -X GET "http://localhost:3000/ready"
```

## 🏗️ 核心特性

### 🔐 认证授权
- **OAuth2 集成**: 深度集成 WPS 协作平台认证
- **JWT 支持**: 完整的 JWT 令牌验证和管理
- **权限控制**: 基于角色和资源的访问控制
- **会话管理**: 支持有状态和无状态会话

### 🚦 流量控制
- **智能路由**: 支持多种路由匹配策略
- **负载均衡**: 多种负载均衡算法
- **限流保护**: 多维度限流策略
- **熔断机制**: 防止级联故障

### 📊 监控观测
- **实时监控**: Prometheus 指标收集
- **链路追踪**: 分布式链路追踪支持
- **健康检查**: 多层次健康检查机制
- **日志聚合**: 结构化日志记录

### 🔧 运维友好
- **配置管理**: 多环境配置和热重载
- **服务发现**: 支持 Consul、etcd、Kubernetes
- **容器化**: 完整的 Docker 和 K8s 支持
- **高可用**: 分布式部署和故障转移

## 🛠️ 开发工具

### 本地开发

```bash
# 开发模式启动
pnpm dev

# 调试模式启动
pnpm dev:debug

# 构建项目
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 格式化代码
pnpm format
```

### Docker 开发

```bash
# 构建镜像
docker build -t stratix/api-gateway .

# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose logs -f gateway

# 停止服务
docker-compose down
```

## 📈 性能指标

### 基准测试结果

| 指标 | 数值 | 说明 |
|------|------|------|
| 吞吐量 | > 10,000 RPS | 单实例处理能力 |
| 延迟 | P99 < 100ms | 99% 请求响应时间 |
| 内存使用 | < 512MB | 稳定运行内存占用 |
| CPU 使用 | < 50% | 高负载下 CPU 占用 |

### 扩展性

- **水平扩展**: 支持无状态多实例部署
- **垂直扩展**: 优化的资源使用和异步处理
- **缓存优化**: 多级缓存策略提升性能
- **连接复用**: HTTP 连接池和 Keep-Alive 优化

## 🤝 贡献指南

### 开发流程

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 进行开发
- 遵循 ESLint 和 Prettier 配置
- 编写单元测试和集成测试
- 更新相关文档

### 测试要求

```bash
# 运行所有测试
pnpm test

# 运行测试覆盖率
pnpm test:coverage

# 运行特定测试
pnpm test auth

# 运行集成测试
pnpm test:integration
```

## 📞 支持和反馈

### 获取帮助

- **文档**: 查看本文档中心的详细指南
- **示例**: 参考 `examples/` 目录中的示例代码
- **FAQ**: 查看常见问题解答
- **社区**: 加入开发者社区讨论

### 问题反馈

- **Bug 报告**: 在 GitHub Issues 中报告问题
- **功能请求**: 提交功能需求和改进建议
- **安全问题**: 通过私有渠道报告安全漏洞

### 联系方式

- **邮箱**: support@example.com
- **文档**: https://docs.example.com
- **GitHub**: https://github.com/your-org/stratix-gateway

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](../LICENSE) 文件。

---

**Stratix API Gateway** - 现代化、高性能的 API 网关解决方案 🚀
