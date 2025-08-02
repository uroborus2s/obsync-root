# Stratix 应用开发指南

## 概述

Stratix 是一个基于 Fastify 5 和 Awilix 12 的现代化、函数式、高性能的 Node.js 应用框架。本指南将帮助您从零开始构建 Stratix 应用，掌握核心概念和最佳实践。

## 快速开始

### 1. 环境要求

- Node.js >= 22.0.0
- TypeScript >= 5.0
- pnpm (推荐) 或 npm

### 2. 项目初始化

#### 2.1 创建项目目录

```bash
mkdir my-stratix-app
cd my-stratix-app
```

#### 2.2 初始化 package.json

```bash
pnpm init
```

#### 2.3 安装依赖

```bash
# 安装 Stratix 核心
pnpm add @stratix/core

# 安装开发依赖
pnpm add -D typescript @types/node tsx vitest
```

#### 2.4 配置 TypeScript

创建 `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. 创建基础应用

#### 3.1 创建配置文件

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

#### 3.2 创建应用入口

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
    console.log(`📍 Server listening on ${app.getAddress()?.address}:${app.getAddress()?.port}`);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

main();
```

#### 3.3 添加启动脚本

在 `package.json` 中添加脚本:

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  }
}
```

#### 3.4 运行应用

```bash
pnpm dev
```

## 核心概念

### 1. 应用类型

Stratix 支持三种应用类型：

#### 1.1 Web 应用 (默认)
```typescript
const app = await Stratix.run({
  type: 'web',
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
```

#### 1.2 CLI 应用
```typescript
const app = await Stratix.run({
  type: 'cli'
});
```

#### 1.3 Worker 应用
```typescript
const app = await Stratix.run({
  type: 'worker'
});
```

### 2. 插件系统

Stratix 的所有功能都基于插件实现。

#### 2.1 创建简单插件

```typescript
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

async function myPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // 注册路由
  fastify.get('/hello', async (request, reply) => {
    return { message: 'Hello from my plugin!' };
  });
}

export default myPlugin;
```

#### 2.2 使用 withRegisterAutoDI 增强插件

```typescript
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

async function myEnhancedPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.get('/enhanced', async (request, reply) => {
    return { message: 'Enhanced plugin with auto DI!' };
  });
}

// 使用 withRegisterAutoDI 包装插件
export default withRegisterAutoDI(myEnhancedPlugin, {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}'
    ]
  },
  routing: {
    enabled: true,
    prefix: '/api',
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

### 3. 依赖注入

Stratix 使用 Awilix 作为依赖注入容器。

#### 3.1 创建服务

创建 `src/services/UserService.ts`:

```typescript
export interface IUserService {
  getUser(id: string): Promise<User>;
  createUser(userData: CreateUserData): Promise<User>;
}

export class UserService implements IUserService {
  constructor(
    private userRepository: IUserRepository,
    private logger: Logger
  ) {}

  async getUser(id: string): Promise<User> {
    this.logger.info(`Getting user: ${id}`);
    return await this.userRepository.findById(id);
  }

  async createUser(userData: CreateUserData): Promise<User> {
    this.logger.info('Creating new user');
    return await this.userRepository.create(userData);
  }
}

// 导出用于自动注册
export default UserService;
```

#### 3.2 创建仓储

创建 `src/repositories/UserRepository.ts`:

```typescript
export interface IUserRepository {
  findById(id: string): Promise<User>;
  create(userData: CreateUserData): Promise<User>;
}

export class UserRepository implements IUserRepository {
  constructor(private logger: Logger) {}

  async findById(id: string): Promise<User> {
    // 模拟数据库查询
    return {
      id,
      name: 'John Doe',
      email: 'john@example.com'
    };
  }

  async create(userData: CreateUserData): Promise<User> {
    // 模拟数据库插入
    return {
      id: Math.random().toString(36),
      ...userData
    };
  }
}

export default UserRepository;
```

### 4. 控制器和路由

#### 4.1 使用装饰器创建控制器

创建 `src/controllers/UserController.ts`:

```typescript
import { Controller, Get, Post } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Controller()
export class UserController {
  constructor(
    private userService: IUserService,
    private logger: Logger
  ) {}

  @Get('/users/:id')
  async getUser(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const user = await this.userService.getUser(request.params.id);
      return reply.send(user);
    } catch (error) {
      this.logger.error('Failed to get user:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  @Post('/users')
  async createUser(request: FastifyRequest<{ Body: CreateUserData }>, reply: FastifyReply) {
    try {
      const user = await this.userService.createUser(request.body);
      return reply.status(201).send(user);
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}

export default UserController;
```

#### 4.2 函数式路由定义

```typescript
// src/routes/userRoutes.ts
import type { FastifyInstance } from 'fastify';

export async function userRoutes(fastify: FastifyInstance) {
  const userService = fastify.diContainer.resolve<IUserService>('userService');

  fastify.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await userService.getUser(id);
    return user;
  });

  fastify.post('/users', async (request, reply) => {
    const userData = request.body as CreateUserData;
    const user = await userService.createUser(userData);
    return reply.status(201).send(user);
  });
}
```

### 5. 配置管理

#### 5.1 环境变量配置

创建 `.env`:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
REDIS_URL=redis://localhost:6379
```

#### 5.2 高级配置

```typescript
// stratix.config.ts
import type { StratixConfig } from '@stratix/core';

export default function createConfig(sensitiveConfig: Record<string, string>): StratixConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
      // Fastify 服务器选项
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
      level: isProduction ? 'warn' : 'info',
      pretty: !isProduction,
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

## 最佳实践

### 1. 项目结构

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
│   ├── utils/              # 工具函数
│   │   └── helpers.ts
│   ├── plugins/            # 自定义插件
│   │   └── userPlugin.ts
│   └── index.ts            # 应用入口
├── tests/                  # 测试文件
├── .env                    # 环境变量
├── stratix.config.ts       # Stratix 配置
├── package.json
└── tsconfig.json
```

### 2. 错误处理

#### 2.1 全局错误处理

```typescript
// src/middleware/errorHandler.ts
import type { FastifyInstance, FastifyError } from 'fastify';

export async function setupErrorHandling(fastify: FastifyInstance) {
  fastify.setErrorHandler(async (error: FastifyError, request, reply) => {
    const { statusCode = 500, message } = error;
    
    fastify.log.error({
      error,
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers
      }
    }, 'Request error');

    return reply.status(statusCode).send({
      error: {
        message: statusCode >= 500 ? 'Internal Server Error' : message,
        statusCode,
        timestamp: new Date().toISOString()
      }
    });
  });
}
```

#### 2.2 业务错误处理

```typescript
// src/utils/errors.ts
export class BusinessError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

export class NotFoundError extends BusinessError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
```

### 3. 测试策略

#### 3.1 单元测试

```typescript
// tests/services/UserService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../../src/services/UserService';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: any;
  let mockLogger: any;

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
      create: vi.fn()
    };
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    };
    userService = new UserService(mockUserRepository, mockLogger);
  });

  it('should get user by id', async () => {
    const mockUser = { id: '1', name: 'John', email: 'john@example.com' };
    mockUserRepository.findById.mockResolvedValue(mockUser);

    const result = await userService.getUser('1');

    expect(result).toEqual(mockUser);
    expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    expect(mockLogger.info).toHaveBeenCalledWith('Getting user: 1');
  });
});
```

#### 3.2 集成测试

```typescript
// tests/integration/app.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Stratix } from '@stratix/core';
import type { StratixApplication } from '@stratix/core';

describe('Application Integration Tests', () => {
  let app: StratixApplication;

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
    expect(JSON.parse(response.payload)).toEqual({
      status: 'healthy'
    });
  });
});
```

### 4. 性能优化

#### 4.1 启动优化

```typescript
// 延迟加载重型依赖
export class HeavyService {
  private _client: any;

  async getClient() {
    if (!this._client) {
      const { HeavyClient } = await import('heavy-library');
      this._client = new HeavyClient();
    }
    return this._client;
  }
}
```

#### 4.2 内存优化

```typescript
// 使用对象池
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;

  constructor(createFn: () => T, initialSize = 10) {
    this.createFn = createFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  acquire(): T {
    return this.pool.pop() || this.createFn();
  }

  release(obj: T): void {
    this.pool.push(obj);
  }
}
```

#### 4.3 缓存策略

```typescript
// src/services/CacheService.ts
export class CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  // 缓存装饰器
  cache(ttl = 3600) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

        let result = await this.cacheService.get(cacheKey);
        if (result === null) {
          result = await originalMethod.apply(this, args);
          await this.cacheService.set(cacheKey, result, ttl);
        }

        return result;
      };
    };
  }
}
```

### 5. 安全最佳实践

#### 5.1 输入验证

```typescript
// src/middleware/validation.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

export function validateSchema(schema: object) {
  const validate = ajv.compile(schema);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const valid = validate(request.body);
    if (!valid) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: validate.errors
      });
    }
  };
}

// 使用示例
const createUserSchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 0, maximum: 150 }
  },
  additionalProperties: false
};

fastify.post('/users', {
  preHandler: validateSchema(createUserSchema)
}, async (request, reply) => {
  // 处理已验证的请求
});
```

#### 5.2 认证和授权

```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    request.user = decoded;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user?.roles?.includes(role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
  };
}
```

#### 5.3 敏感数据处理

```typescript
// src/utils/encryption.ts
import { encrypt, decrypt } from '@stratix/core';

export class DataProtection {
  static encryptSensitiveData(data: any): string {
    return encrypt(JSON.stringify(data), {
      algorithm: 'aes-256-gcm',
      outputFormat: 'base64'
    }).encrypted;
  }

  static decryptSensitiveData(encryptedData: string): any {
    const decrypted = decrypt(encryptedData, {
      algorithm: 'aes-256-gcm',
      inputFormat: 'base64'
    });
    return JSON.parse(decrypted);
  }

  // 日志脱敏
  static sanitizeForLogging(obj: any): any {
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...obj };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    }

    return sanitized;
  }
}
```

## 高级主题

### 1. 微服务架构

#### 1.1 服务发现

```typescript
// src/services/ServiceRegistry.ts
export class ServiceRegistry {
  private services = new Map<string, ServiceInfo>();

  register(name: string, info: ServiceInfo): void {
    this.services.set(name, info);
  }

  discover(name: string): ServiceInfo | undefined {
    return this.services.get(name);
  }

  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, info] of this.services) {
      try {
        const response = await fetch(`${info.url}/health`);
        results.set(name, response.ok);
      } catch {
        results.set(name, false);
      }
    }

    return results;
  }
}
```

#### 1.2 服务间通信

```typescript
// src/services/HttpClient.ts
export class HttpClient {
  constructor(
    private baseURL: string,
    private timeout = 5000
  ) {}

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(path: string, data: any, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### 2. 监控和可观测性

#### 2.1 健康检查

```typescript
// src/plugins/healthPlugin.ts
import { withRegisterAutoDI } from '@stratix/core';

async function healthPlugin(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkExternalServices()
    ]);

    const results = checks.map((check, index) => ({
      name: ['database', 'redis', 'external'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      error: check.status === 'rejected' ? check.reason.message : undefined
    }));

    const isHealthy = results.every(r => r.status === 'healthy');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: results
    };
  });
}

export default withRegisterAutoDI(healthPlugin);
```

#### 2.2 指标收集

```typescript
// src/services/MetricsService.ts
export class MetricsService {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  incrementCounter(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  recordHistogram(name: string, value: number): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    this.histograms.set(name, values);
  }

  getMetrics(): any {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([name, values]) => [
          name,
          {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values)
          }
        ])
      )
    };
  }
}
```

## 部署指南

### 1. Docker 部署

#### 1.1 Dockerfile

```dockerfile
# 多阶段构建
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 生产镜像
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S stratix -u 1001

WORKDIR /app

COPY --from=builder --chown=stratix:nodejs /app/dist ./dist
COPY --from=builder --chown=stratix:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=stratix:nodejs /app/package.json ./package.json

USER stratix

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### 1.2 docker-compose.yml

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
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

### 2. 生产环境配置

#### 2.1 环境变量

```bash
# .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_POOL_SIZE=10

# 安全
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-byte-encryption-key

# 监控
ENABLE_METRICS=true
METRICS_PORT=9090

# 日志
LOG_LEVEL=warn
LOG_FORMAT=json
```

#### 2.2 生产配置

```typescript
// stratix.config.production.ts
export default function createConfig(sensitiveConfig: Record<string, string>): StratixConfig {
  return {
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
      keepAliveTimeout: 30000,
      requestTimeout: 30000,
      bodyLimit: 1048576, // 1MB
      maxParamLength: 100
    },
    plugins: [
      // 生产环境插件配置
    ],
    autoLoad: {},
    logger: {
      level: 'warn',
      pretty: false,
      enableRequestLogging: false,
      enablePerformanceLogging: true,
      enableErrorTracking: true,
      enableAuditLogging: true
    },
    cache: {
      type: 'redis',
      options: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: sensitiveConfig.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      }
    }
  };
}
```

## 故障排除

### 1. 常见问题

#### 1.1 启动失败

**问题**: 应用启动时抛出错误
**解决方案**:
1. 检查 Node.js 版本是否 >= 22.0.0
2. 确认所有依赖已正确安装
3. 检查配置文件语法
4. 查看详细错误日志

#### 1.2 依赖注入失败

**问题**: 服务无法正确注入
**解决方案**:
1. 确认服务类正确导出
2. 检查文件路径和命名约定
3. 验证依赖关系是否正确
4. 启用调试模式查看详细信息

#### 1.3 路由不工作

**问题**: 路由无法访问
**解决方案**:
1. 检查控制器装饰器是否正确
2. 确认路由路径和方法
3. 验证插件注册顺序
4. 检查路由前缀配置

### 2. 调试技巧

#### 2.1 启用调试模式

```typescript
const app = await Stratix.run({
  debug: true,
  logger: {
    level: 'debug',
    pretty: true
  }
});
```

#### 2.2 使用调试工具

```bash
# 使用 Node.js 调试器
node --inspect dist/index.js

# 使用 Chrome DevTools
# 打开 chrome://inspect
```

## 总结

本指南涵盖了 Stratix 应用开发的核心概念和最佳实践。通过遵循这些指导原则，您可以构建高性能、可维护、安全的 Node.js 应用。

### 关键要点

1. **函数式优先**: 优先使用函数式编程模式
2. **插件化架构**: 将功能模块化为插件
3. **依赖注入**: 合理使用依赖注入管理对象生命周期
4. **类型安全**: 充分利用 TypeScript 的类型系统
5. **测试驱动**: 编写全面的测试用例
6. **安全第一**: 始终考虑安全性
7. **性能优化**: 关注应用性能和资源使用
8. **可观测性**: 实现完善的监控和日志

### 下一步

- 阅读 [插件开发指南](./plugin-development-guide.md)
- 查看 [项目分析报告](./project-analysis.md)
- 参考官方示例项目
- 加入社区讨论

---

*本指南基于 @stratix/core v0.0.1 版本编写*
```
