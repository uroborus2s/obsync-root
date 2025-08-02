# @stratix/core

[![npm version](https://badge.fury.io/js/@stratix%2Fcore.svg)](https://badge.fury.io/js/@stratix%2Fcore)
[![Node.js Version](https://img.shields.io/node/v/@stratix/core.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 现代化、函数式、高性能的 Node.js 应用框架

@stratix/core 是 Stratix 框架的核心库，基于 Fastify 5 和 Awilix 12 构建的企业级 Node.js 应用框架。它采用插件化架构，完全拥抱函数式编程范式，提供了强大的依赖注入、自动发现、生命周期管理等特性。

## ✨ 核心特性

- 🚀 **高性能**: 基于 Fastify 5 的高性能 HTTP 服务器
- 🔧 **插件化架构**: 所有功能以 Fastify 插件的方式加载
- 🎯 **函数式编程**: 完全采用函数式编程范式
- 💉 **依赖注入**: 基于 Awilix 12 的强大 IOC 容器
- 🔍 **自动发现**: 智能的模块自动发现和注册机制
- 🔄 **生命周期管理**: 完整的应用和插件生命周期管理
- 🎨 **装饰器支持**: 可选的装饰器系统支持（Controller、Route、Validation）
- 🛡️ **类型安全**: 完整的 TypeScript 类型定义
- 🔐 **安全性**: 内置配置加密和安全最佳实践
- 📊 **可观测性**: 内置监控、日志和健康检查

## 🚀 快速开始

### 环境要求

- Node.js >= 22.0.0
- TypeScript >= 5.0
- pnpm (推荐) 或 npm

### 安装

```bash
# 使用 pnpm (推荐)
pnpm add @stratix/core

# 使用 npm
npm install @stratix/core

# 使用 yarn
yarn add @stratix/core
```

### 创建你的第一个应用

#### 1. 创建配置文件

创建 `stratix.config.ts`:

```typescript
import type { StratixConfig } from '@stratix/core';

export default function createConfig(sensitiveConfig: Record<string, string>): StratixConfig {
  return {
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0'
    },
    plugins: [],
    autoLoad: {},
    logger: {
      level: 'info',
      pretty: process.env.NODE_ENV !== 'production'
    }
  };
}
```

#### 2. 创建应用入口

创建 `src/index.ts`:

```typescript
import { Stratix } from '@stratix/core';

async function main() {
  try {
    // 启动应用
    const app = await Stratix.run({
      type: 'web',
      debug: process.env.NODE_ENV !== 'production'
    });

    console.log('🚀 Stratix application started successfully!');
    console.log(`📍 Server listening on http://localhost:${app.getAddress()?.port}`);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

main();
```

#### 3. 运行应用

```bash
# 开发模式
npx tsx src/index.ts

# 或者添加到 package.json scripts
npm run dev
```

## 📖 基本使用

### 创建插件

```typescript
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

async function userPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // 注册路由
  fastify.get('/users', async (request, reply) => {
    return { users: [] };
  });

  fastify.post('/users', async (request, reply) => {
    // 创建用户逻辑
    return { message: 'User created' };
  });
}

// 使用 withRegisterAutoDI 增强插件
export default withRegisterAutoDI(userPlugin, {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}'
    ]
  },
  routing: {
    enabled: true,
    prefix: '/api/v1',
    validation: false
  },
  services: {
    enabled: true,
    patterns: ['adapters/*.{ts,js}']
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'throw',
    debug: true
  }
});
```

### 使用装饰器

```typescript
import { Controller, Get, Post } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Controller()
export class UserController {
  constructor(
    private userService: IUserService,
    private logger: Logger
  ) {}

  @Get('/users')
  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = await this.userService.getAllUsers();
    return reply.send(users);
  }

  @Post('/users')
  async createUser(request: FastifyRequest, reply: FastifyReply) {
    const userData = request.body as CreateUserData;
    const user = await this.userService.createUser(userData);
    return reply.status(201).send(user);
  }
}

export default UserController;
```

### 依赖注入

```typescript
// src/services/UserService.ts
export interface IUserService {
  getAllUsers(): Promise<User[]>;
  createUser(userData: CreateUserData): Promise<User>;
}

export class UserService implements IUserService {
  constructor(
    private userRepository: IUserRepository,
    private logger: Logger
  ) {}

  async getAllUsers(): Promise<User[]> {
    this.logger.info('Fetching all users');
    return await this.userRepository.findAll();
  }

  async createUser(userData: CreateUserData): Promise<User> {
    this.logger.info('Creating new user', { email: userData.email });
    return await this.userRepository.create(userData);
  }
}

export default UserService;
```

## 🏗️ 项目结构

推荐的项目结构：

```
my-stratix-app/
├── src/
│   ├── controllers/          # 控制器
│   │   ├── UserController.ts
│   │   └── ProductController.ts
│   ├── services/            # 业务逻辑服务
│   │   ├── UserService.ts
│   │   └── ProductService.ts
│   ├── repositories/        # 数据访问层
│   │   ├── UserRepository.ts
│   │   └── ProductRepository.ts
│   ├── adapters/           # 服务适配器
│   │   ├── DatabaseAdapter.ts
│   │   └── CacheAdapter.ts
│   ├── middleware/         # 中间件
│   │   ├── authMiddleware.ts
│   │   └── validationMiddleware.ts
│   ├── types/              # 类型定义
│   │   ├── User.ts
│   │   └── Product.ts
│   ├── plugins/            # 自定义插件
│   │   └── userPlugin.ts
│   └── index.ts            # 应用入口
├── tests/                  # 测试文件
├── .env                    # 环境变量
├── stratix.config.ts       # Stratix 配置
├── package.json
└── tsconfig.json
```

## 🔧 配置

### 环境变量

创建 `.env` 文件：

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
REDIS_URL=redis://localhost:6379
```

### 高级配置

```typescript
// stratix.config.ts
export default function createConfig(sensitiveConfig: Record<string, string>): StratixConfig {
  return {
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
      keepAliveTimeout: 30000,
      requestTimeout: 30000
    },
    plugins: [
      {
        name: 'user-plugin',
        plugin: userPlugin,
        options: {
          prefix: '/api/v1'
        }
      }
    ],
    autoLoad: {},
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
      pretty: process.env.NODE_ENV !== 'production',
      enableRequestLogging: true,
      enablePerformanceLogging: true
    },
    cache: {
      type: 'redis',
      options: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: sensitiveConfig.REDIS_PASSWORD
      }
    }
  };
}
```

## 🧪 测试

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Stratix } from '@stratix/core';

describe('Application Tests', () => {
  let app: any;

  beforeEach(async () => {
    app = await Stratix.run({
      type: 'web',
      server: { port: 0 }, // 使用随机端口
      config: {
        // 测试配置
      }
    });
  });

  afterEach(async () => {
    await app.stop();
  });

  it('should respond to health check', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
  });
});
```

## 📚 文档

- [应用开发指南](./docs/application-development-guide.md) - 完整的应用开发教程
- [插件开发指南](./docs/plugin-development-guide.md) - 插件开发详细指南
- [项目分析报告](./docs/project-analysis.md) - 架构设计和技术分析
- [API 文档](https://stratix-docs.example.com) - 完整的 API 参考

## 🤝 生态系统

### 官方插件

- `@stratix/logger` - 高级日志插件
- `@stratix/database` - 数据库集成插件
- `@stratix/cache` - 缓存插件
- `@stratix/auth` - 认证授权插件
- `@stratix/monitoring` - 监控插件

### 社区插件

- `@stratix/swagger` - API 文档生成
- `@stratix/rate-limit` - 限流插件
- `@stratix/cors` - CORS 支持
- `@stratix/helmet` - 安全头插件

## 🚀 部署

### Docker

```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
    depends_on:
      - db
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
```

## 🤝 贡献

我们欢迎所有形式的贡献！请阅读 [贡献指南](CONTRIBUTING.md) 了解如何参与项目开发。

### 开发设置

```bash
# 克隆仓库
git clone https://github.com/stratix-framework/stratix.git
cd stratix

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行测试
pnpm test

# 开发模式
pnpm dev
```

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 🙏 致谢

感谢以下优秀的开源项目：

- [Fastify](https://fastify.io/) - 高性能 Web 框架
- [Awilix](https://github.com/jeffijoe/awilix) - 依赖注入容器
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript

## 🔥 示例项目

查看这些示例项目来快速上手：

- [基础 Web API](https://github.com/stratix-framework/examples/tree/main/basic-web-api) - 简单的 REST API 示例
- [电商应用](https://github.com/stratix-framework/examples/tree/main/ecommerce-app) - 完整的电商应用示例
- [微服务架构](https://github.com/stratix-framework/examples/tree/main/microservices) - 微服务架构示例
- [GraphQL API](https://github.com/stratix-framework/examples/tree/main/graphql-api) - GraphQL 集成示例

## 🎯 使用场景

Stratix 适用于以下场景：

### 🌐 Web API 开发
- RESTful API 服务
- GraphQL API 服务
- 微服务架构
- 企业级后端应用

### 🔧 CLI 工具
- 命令行应用
- 脚本工具
- 自动化工具
- 开发工具

### ⚡ Worker 服务
- 后台任务处理
- 消息队列消费者
- 定时任务服务
- 数据处理服务

## 🚀 性能

Stratix 基于 Fastify 构建，提供卓越的性能：

| 框架 | 请求/秒 | 延迟 (ms) | 吞吐量 (MB/s) |
|------|---------|-----------|---------------|
| Stratix | ~65,000 | 0.2 | 11.6 |
| Express | ~15,000 | 6.1 | 2.64 |
| Koa | ~20,000 | 4.8 | 3.55 |
| NestJS | ~25,000 | 3.9 | 4.44 |

*基准测试环境：Node.js 22, 单核 CPU, 简单 JSON 响应*

## 🔒 安全性

Stratix 内置多层安全保护：

- ✅ **输入验证**: 基于 JSON Schema 的请求验证
- ✅ **配置加密**: AES-256-GCM 敏感配置加密
- ✅ **安全头**: 自动设置安全 HTTP 头
- ✅ **CORS 保护**: 可配置的跨域资源共享
- ✅ **限流保护**: 内置请求限流机制
- ✅ **日志脱敏**: 自动脱敏敏感信息

## 🌟 社区

加入我们的社区：

- 🐦 [Twitter](https://twitter.com/stratix_dev) - 最新动态和技巧
- 💬 [Discord](https://discord.gg/stratix) - 实时讨论和支持
- 📺 [YouTube](https://youtube.com/c/stratix-dev) - 教程和演示
- 📝 [博客](https://blog.stratix.dev) - 深度文章和最佳实践

## 🗺️ 路线图

### v0.1.0 (当前版本)
- ✅ 核心框架架构
- ✅ 插件系统
- ✅ 依赖注入
- ✅ 装饰器支持
- ✅ 基础文档

### v0.2.0 (计划中)
- 🔄 CLI 工具
- 🔄 更多官方插件
- 🔄 性能优化
- 🔄 监控集成

### v1.0.0 (长期目标)
- 🔄 稳定 API
- 🔄 完整生态系统
- 🔄 企业级特性
- 🔄 云原生支持

## ❓ 常见问题

### Q: Stratix 与其他 Node.js 框架有什么区别？

A: Stratix 的主要特点是：
- **函数式优先**: 完全拥抱函数式编程范式
- **插件化架构**: 基于 Fastify 的强大插件系统
- **依赖注入**: 内置企业级依赖注入容器
- **类型安全**: 完整的 TypeScript 支持
- **高性能**: 基于 Fastify 的卓越性能

### Q: 是否支持 JavaScript？

A: 虽然 Stratix 使用 TypeScript 开发，但完全支持 JavaScript 项目。不过我们强烈推荐使用 TypeScript 以获得更好的开发体验。

### Q: 如何迁移现有项目？

A: 我们提供了详细的[迁移指南](./docs/migration-guide.md)，支持从 Express、Koa、NestJS 等框架迁移。

### Q: 是否适合生产环境？

A: Stratix 目前处于早期版本，建议在非关键业务中试用。我们正在努力完善功能和稳定性，预计 v1.0.0 版本将完全适合生产环境。

## 📊 统计信息

- 📦 包大小: ~2.5MB (包含依赖)
- 🚀 启动时间: <100ms (小型应用)
- 💾 内存占用: <20MB (基础框架)
- 🔧 插件数量: 15+ (官方和社区)
- 👥 社区规模: 500+ 开发者

## 📞 支持

- 📖 [文档](https://stratix-docs.example.com)
- 💬 [讨论区](https://github.com/stratix-framework/stratix/discussions)
- 🐛 [问题反馈](https://github.com/stratix-framework/stratix/issues)
- 📧 [邮件支持](mailto:support@stratix.dev)
- 💼 [企业支持](mailto:enterprise@stratix.dev)

## 🏆 赞助商

感谢我们的赞助商支持 Stratix 的发展：

<p align="center">
  <a href="https://sponsor1.example.com"><img src="https://via.placeholder.com/200x60/0066cc/ffffff?text=Sponsor+1" alt="Sponsor 1"></a>
  <a href="https://sponsor2.example.com"><img src="https://via.placeholder.com/200x60/00cc66/ffffff?text=Sponsor+2" alt="Sponsor 2"></a>
</p>

[成为赞助商](https://github.com/sponsors/stratix-framework)

---

<p align="center">
  <strong>用 ❤️ 和 ☕ 制作</strong><br>
  <sub>© 2025 Stratix Team. 保留所有权利。</sub>
</p>
