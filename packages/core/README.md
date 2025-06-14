# Stratix Framework Core

一个轻量级、插件驱动的 Node.js 应用框架，基于 Fastify 构建，提供强大的依赖注入和生命周期管理功能。

## 特性

- 🚀 **基于 Fastify** - 高性能的 HTTP 服务器
- 💉 **依赖注入** - 基于 Awilix 的强大 DI 容器
- 🔄 **生命周期管理** - 集成 awilix-manager 的异步初始化和销毁
- 🔌 **插件系统** - 灵活的插件架构
- 📝 **TypeScript 支持** - 完整的类型定义
- ⚙️ **配置管理** - 灵活的配置系统
- 📊 **日志记录** - 基于 Pino 的结构化日志

## 安装

```bash
npm install @stratix/core
# 或
yarn add @stratix/core
# 或
pnpm add @stratix/core
```

## 快速开始

### 基本应用

```typescript
import { StratixApp } from '@stratix/core';

// 创建并运行应用
const app = await StratixApp.run({
  config: {
    name: 'my-app',
    version: '1.0.0',
    server: {
      port: 3000,
      host: '0.0.0.0'
    }
  }
});

console.log('应用已启动');
```

### 使用配置文件

```typescript
// stratix.config.js
export default {
  name: 'my-app',
  version: '1.0.0',
  server: {
    port: 3000
  },
  registers: [
    // 插件注册
  ]
};

// main.js
import { StratixApp } from '@stratix/core';

await StratixApp.run({
  config: './stratix.config.js'
});
```

## 依赖注入系统

Stratix 提供了强大的依赖注入系统，基于 Awilix 和 awilix-manager 构建。

### 基本用法

```typescript
import type { FastifyInstance } from '@stratix/core';

// 服务类
class UserService {
  constructor() {
    console.log('UserService 已创建');
  }

  async init() {
    console.log('UserService 初始化');
    // 异步初始化逻辑，如数据库连接
  }

  async dispose() {
    console.log('UserService 销毁');
    // 清理资源
  }

  getUser(id: number) {
    return { id, name: `User ${id}` };
  }
}

// 在插件中注册
export default async function userPlugin(fastify: FastifyInstance) {
  // 智能注册 - 自动判断使用 asClass
  fastify.registerDI(UserService, {
    name: 'userService',
    lifetime: 'SINGLETON',
    asyncInit: 'init',           // 异步初始化方法
    asyncDispose: 'dispose',     // 异步销毁方法
    asyncInitPriority: 10,       // 初始化优先级
    asyncDisposePriority: 10,    // 销毁优先级
    eagerInject: true,           // 立即注入
    tags: ['service', 'user']    // 标签
  });

  // 添加路由
  fastify.get('/users/:id', async (request, reply) => {
    const userService = fastify.diContainer.resolve('userService');
    const user = userService.getUser(parseInt(request.params.id));
    return user;
  });
}
```

### 注册选项

#### DIRegisterOptions

```typescript
interface DIRegisterOptions {
  name?: string;                    // 注册名称
  lifetime?: 'SINGLETON' | 'SCOPED' | 'TRANSIENT';  // 生命周期
  override?: boolean;               // 是否覆盖已存在的注册
  asyncInit?: string | boolean;     // 异步初始化方法名
  asyncDispose?: string | boolean;  // 异步销毁方法名
  asyncInitPriority?: number;       // 初始化优先级（数值越小越早）
  asyncDisposePriority?: number;    // 销毁优先级（数值越小越早）
  eagerInject?: boolean | string;   // 立即注入
  enabled?: boolean;                // 是否启用
  tags?: string[];                  // 标签列表
}
```

### 注册方式

#### 1. 单个注册

```typescript
// 注册类
fastify.registerDI(UserService, {
  name: 'userService',
  lifetime: 'SINGLETON'
});

// 注册工厂函数
const createLogger = () => console;
fastify.registerDI(createLogger, {
  name: 'logger',
  lifetime: 'SINGLETON'
});

// 注册值
fastify.registerDI('database-url', {
  name: 'databaseUrl'
});
```

#### 2. 批量注册

```typescript
// 对象格式
fastify.registerDI({
  userService: UserService,
  logger: createLogger,
  config: { port: 3000 }
});

// 数组格式
fastify.registerDI([
  ['userService', UserService, { lifetime: 'SINGLETON' }],
  ['logger', createLogger, { lifetime: 'SINGLETON' }],
  ['config', { port: 3000 }]
]);
```

### 生命周期管理

#### 异步初始化

```typescript
class DatabaseService {
  private connection: any;

  async init() {
    // 异步初始化 - 建立数据库连接
    this.connection = await connectToDatabase();
    console.log('数据库连接已建立');
  }

  async dispose() {
    // 异步销毁 - 关闭数据库连接
    if (this.connection) {
      await this.connection.close();
      console.log('数据库连接已关闭');
    }
  }
}

fastify.registerDI(DatabaseService, {
  name: 'databaseService',
  lifetime: 'SINGLETON',
  asyncInit: 'init',
  asyncDispose: 'dispose',
  asyncInitPriority: 1,  // 优先初始化
  eagerInject: true      // 立即创建实例
});
```

#### 立即注入

```typescript
class CacheService {
  constructor() {
    console.log('缓存服务已创建');
  }

  warmup() {
    console.log('缓存预热完成');
  }
}

fastify.registerDI(CacheService, {
  name: 'cacheService',
  lifetime: 'SINGLETON',
  eagerInject: 'warmup'  // 创建实例后调用 warmup 方法
});
```

#### 条件性启用

```typescript
const isRedisEnabled = process.env.REDIS_ENABLED === 'true';

fastify.registerDI(RedisService, {
  name: 'redisService',
  lifetime: 'SINGLETON',
  enabled: isRedisEnabled,  // 根据环境变量决定是否启用
  asyncInit: 'connect',
  asyncDispose: 'disconnect'
});
```

### 标签和查找

#### 基于标签的查找

```typescript
// 注册带标签的服务
fastify.registerDI(EmailService, {
  name: 'emailService',
  tags: ['service', 'notification']
});

fastify.registerDI(SmsService, {
  name: 'smsService',
  tags: ['service', 'notification']
});

// 根据标签获取所有通知服务
const notificationServices = fastify.diManager.getWithTags(['notification']);
// 返回: { emailService: EmailService实例, smsService: SmsService实例 }
```

#### 基于谓词的查找

```typescript
// 获取所有实现了特定接口的服务
const services = fastify.diManager.getByPredicate(
  (service) => typeof service.send === 'function'
);
```

### DI 容器管理器

```typescript
// 手动执行初始化（通常由框架自动调用）
await fastify.diManager.executeInit();

// 手动执行销毁（通常由框架自动调用）
await fastify.diManager.executeDispose();

// 根据标签获取依赖
const services = fastify.diManager.getWithTags(['service']);

// 根据谓词获取依赖
const instances = fastify.diManager.getByPredicate(
  (instance) => instance instanceof BaseService
);
```

## 插件系统

### 创建插件

```typescript
import type { FastifyInstance, StratixPlugin } from '@stratix/core';

interface MyPluginOptions {
  prefix?: string;
  enabled?: boolean;
}

const myPlugin: StratixPlugin<MyPluginOptions> = async (
  fastify: FastifyInstance,
  options: MyPluginOptions
) => {
  const { prefix = '/api', enabled = true } = options;

  if (!enabled) {
    fastify.log.info('插件已禁用');
    return;
  }

  // 注册服务
  fastify.registerDI(MyService, {
    name: 'myService',
    lifetime: 'SINGLETON'
  });

  // 添加路由
  fastify.get(`${prefix}/hello`, async (request, reply) => {
    return { message: 'Hello from plugin!' };
  });

  fastify.log.info(`插件已注册，前缀: ${prefix}`);
};

export default myPlugin;
```

### 使用 fastify-plugin 包装器

```typescript
// 创建可重用的插件
export function createMyPlugin(fastify: FastifyInstance) {
  return fastify.fp(myPlugin, {
    name: 'my-plugin',
    fastify: '5.x',
    dependencies: [],
    decorators: {
      fastify: ['diContainer', 'registerDI', 'log']
    }
  });
}

// 在应用中使用
const wrappedPlugin = createMyPlugin(app.server);
await app.server.register(wrappedPlugin, {
  prefix: '/v1',
  enabled: true
});
```

### 插件组合

```typescript
// 数据库连接插件
async function connectionPlugin(fastify: FastifyInstance, options: any) {
  class ConnectionManager {
    async connect() {
      fastify.log.info('数据库连接已建立');
    }
  }
  
  fastify.registerDI(ConnectionManager, {
    name: 'connectionManager',
    lifetime: 'SINGLETON',
    asyncInit: 'connect'
  });
}

// 数据库操作插件（依赖连接插件）
async function operationsPlugin(fastify: FastifyInstance, options: any) {
  class DatabaseOperations {
    constructor() {
      const connectionManager = fastify.diContainer.resolve('connectionManager');
      fastify.log.info('数据库操作管理器已创建');
    }
  }
  
  fastify.registerDI(DatabaseOperations, {
    name: 'databaseOperations',
    lifetime: 'SINGLETON'
  });
}

// 组合插件
export function createDatabaseSuite(fastify: FastifyInstance) {
  const wrappedConnectionPlugin = fastify.fp(connectionPlugin, {
    name: 'database-connection',
    fastify: '5.x'
  });
  
  const wrappedOperationsPlugin = fastify.fp(operationsPlugin, {
    name: 'database-operations',
    fastify: '5.x',
    dependencies: ['database-connection']
  });
  
  return async function databaseSuite(fastify: FastifyInstance) {
    await fastify.register(wrappedConnectionPlugin);
    await fastify.register(wrappedOperationsPlugin);
  };
}
```

## 配置系统

### 配置文件格式

```typescript
// stratix.config.ts
import type { StratixConfig } from '@stratix/core';

const config: StratixConfig = {
  name: 'my-app',
  version: '1.0.0',
  
  // 服务器配置
  server: {
    port: 3000,
    host: '0.0.0.0'
  },

  // 日志配置
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  },

  // DI 注册
  diRegisters: [
    {
      name: 'config',
      target: { database: { url: 'postgresql://...' } },
      options: { lifetime: 'SINGLETON' }
    }
  ],

  // 插件注册
  registers: [
    [myPlugin, { prefix: '/api' }],
    [databasePlugin, { connectionString: 'postgresql://...' }]
  ],

  // 路由配置
  routes: {
    prefix: '/api/v1',
    definitions: [
      {
        method: 'GET',
        path: '/health',
        handler: async () => ({ status: 'ok' })
      }
    ]
  }
};

export default config;
```

### 环境变量

```bash
# .env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/mydb
LOG_LEVEL=debug
```

```typescript
// 在配置中使用环境变量
const config: StratixConfig = {
  name: 'my-app',
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0'
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
```

## 路由系统

### 基本路由

```typescript
// 在配置中定义路由
const config: StratixConfig = {
  routes: {
    definitions: [
      {
        method: 'GET',
        path: '/users/:id',
        handler: async (request, reply) => {
          const { id } = request.params;
          return { id, name: `User ${id}` };
        }
      },
      {
        method: 'POST',
        path: '/users',
        handler: async (request, reply) => {
          const userData = request.body;
          return { id: 1, ...userData };
        },
        schema: {
          body: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' }
            },
            required: ['name', 'email']
          }
        }
      }
    ]
  }
};
```

### 路由组

```typescript
const config: StratixConfig = {
  routes: {
    definitions: [
      {
        prefix: '/api/v1',
        routes: [
          {
            method: 'GET',
            path: '/users',
            handler: async () => ({ users: [] })
          },
          {
            method: 'GET',
            path: '/posts',
            handler: async () => ({ posts: [] })
          }
        ]
      }
    ]
  }
};
```

### 在插件中添加路由

```typescript
export default async function apiPlugin(fastify: FastifyInstance) {
  // 类型安全的路由定义
  fastify.get<{
    Params: { id: string };
    Reply: { id: number; name: string } | { error: string };
  }>('/users/:id', async (request, reply) => {
    const id = parseInt(request.params.id);
    
    if (isNaN(id)) {
      return reply.code(400).send({ error: '无效的用户ID' });
    }
    
    const userService = fastify.diContainer.resolve('userService');
    const user = await userService.findById(id);
    
    if (!user) {
      return reply.code(404).send({ error: '用户未找到' });
    }
    
    return user;
  });
}
```

## 日志系统

### 基本使用

```typescript
export default async function myPlugin(fastify: FastifyInstance) {
  // 使用 Fastify 的日志记录器
  fastify.log.info('插件初始化开始');
  fastify.log.debug('调试信息', { data: 'some data' });
  fastify.log.warn('警告信息');
  fastify.log.error('错误信息', { error: new Error('Something went wrong') });

  // 在路由中使用
  fastify.get('/test', async (request, reply) => {
    request.log.info('处理请求', { path: request.url });
    return { message: 'success' };
  });
}
```

### 日志配置

```typescript
const config: StratixConfig = {
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
        colorize: true
      }
    }
  }
};
```

## 类型系统

### 扩展的 FastifyInstance

```typescript
import type { FastifyInstance } from '@stratix/core';

// 现在 FastifyInstance 包含所有 Stratix 扩展
export default async function myPlugin(fastify: FastifyInstance) {
  // DI 容器
  const container = fastify.diContainer;
  
  // 应用配置
  const config = fastify.config;
  
  // 智能 DI 注册
  fastify.registerDI(MyService, { name: 'myService' });
  
  // DI 容器管理器
  await fastify.diManager.executeInit();
  
  // 日志记录器
  fastify.log.info('插件已加载');
  
  // fastify-plugin 包装器
  const wrappedPlugin = fastify.fp(somePlugin, { name: 'wrapped' });
}
```

### 类型安全的服务

```typescript
interface IUserService {
  findById(id: number): Promise<User | null>;
  create(userData: CreateUserData): Promise<User>;
}

class UserService implements IUserService {
  async findById(id: number): Promise<User | null> {
    // 实现
  }

  async create(userData: CreateUserData): Promise<User> {
    // 实现
  }
}

// 注册时保持类型信息
fastify.registerDI(UserService, {
  name: 'userService',
  lifetime: 'SINGLETON'
});

// 解析时获得类型安全
const userService = fastify.diContainer.resolve<IUserService>('userService');
```

## 生命周期钩子

### 应用级钩子

```typescript
await StratixApp.run({
  config: './stratix.config.js',
  hooks: {
    beforeConfig: async (logger) => {
      logger.info('配置加载前');
    },
    afterConfig: async (config, logger) => {
      logger.info('配置加载后', { appName: config.name });
    },
    afterCreate: async (app, logger) => {
      logger.info('应用创建后');
    },
    beforeInit: async (app, logger) => {
      logger.info('应用初始化前');
    },
    afterInit: async (app, logger) => {
      logger.info('应用初始化后');
    },
    beforeStart: async (app, logger) => {
      logger.info('应用启动前');
    },
    afterStart: async (app, logger) => {
      logger.info('应用启动后');
    }
  }
});
```

### Fastify 钩子

```typescript
export default async function myPlugin(fastify: FastifyInstance) {
  // 请求钩子
  fastify.addHook('preHandler', async (request, reply) => {
    request.log.info('请求处理前', { url: request.url });
  });

  // 关闭钩子
  fastify.addHook('onClose', async () => {
    fastify.log.info('插件关闭');
    // 清理资源
  });
}
```

## 错误处理

### 全局错误处理

```typescript
export default async function errorHandlerPlugin(fastify: FastifyInstance) {
  // 设置错误处理器
  fastify.setErrorHandler(async (error, request, reply) => {
    request.log.error({ error }, '请求处理错误');

    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        error: error.message,
        statusCode: error.statusCode
      });
    }

    return reply.code(500).send({
      error: '内部服务器错误',
      statusCode: 500
    });
  });

  // 404 处理
  fastify.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send({
      error: '资源未找到',
      statusCode: 404,
      path: request.url
    });
  });
}
```

### DI 初始化错误处理

```typescript
class DatabaseService {
  async init() {
    try {
      await this.connect();
    } catch (error) {
      // 初始化失败会阻止应用启动
      throw new Error(`数据库连接失败: ${error.message}`);
    }
  }
}
```

## 测试

### 单元测试

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StratixApplication } from '@stratix/core';

describe('UserService', () => {
  let app: StratixApplication;

  beforeEach(async () => {
    app = new StratixApplication({
      name: 'test-app',
      version: '1.0.0'
    });

    // 注册测试服务
    app.server.registerDI(UserService, {
      name: 'userService',
      lifetime: 'SINGLETON'
    });

    await app.server.ready();
  });

  afterEach(async () => {
    await app.stop();
  });

  it('should create user', async () => {
    const userService = app.server.diContainer.resolve('userService');
    const user = await userService.create({ name: 'Test User' });
    
    expect(user).toBeDefined();
    expect(user.name).toBe('Test User');
  });
});
```

### 集成测试

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StratixApp } from '@stratix/core';

describe('API Integration', () => {
  let app: any;

  beforeEach(async () => {
    app = await StratixApp.run({
      config: {
        name: 'test-app',
        version: '1.0.0',
        server: { port: 0 }, // 随机端口
        registers: [
          [userPlugin, {}]
        ]
      }
    });
  });

  afterEach(async () => {
    await app.stop();
  });

  it('should get user by id', async () => {
    const response = await app.server.inject({
      method: 'GET',
      url: '/users/1'
    });

    expect(response.statusCode).toBe(200);
    const user = JSON.parse(response.payload);
    expect(user.id).toBe(1);
  });
});
```

## 部署

### 生产环境配置

```typescript
// stratix.config.prod.ts
const config: StratixConfig = {
  name: 'my-app',
  version: '1.0.0',
  
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: '0.0.0.0'
  },

  logger: {
    level: 'info',
    // 生产环境使用 JSON 格式
    transport: undefined
  }
};

export default config;
```

### Docker

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

### 健康检查

```typescript
export default async function healthPlugin(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    try {
      // 检查数据库连接
      const db = fastify.diContainer.resolve('database');
      await db.ping();

      // 检查其他服务
      const services = fastify.diManager.getWithTags(['service']);
      const healthChecks = await Promise.all(
        Object.values(services).map(async (service: any) => {
          if (typeof service.healthCheck === 'function') {
            return service.healthCheck();
          }
          return true;
        })
      );

      if (healthChecks.every(check => check)) {
        return { status: 'healthy', timestamp: new Date().toISOString() };
      } else {
        return reply.code(503).send({ 
          status: 'unhealthy', 
          timestamp: new Date().toISOString() 
        });
      }
    } catch (error) {
      return reply.code(503).send({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString() 
      });
    }
  });
}
```

## 最佳实践

### 1. 服务设计

```typescript
// 好的实践：定义接口
interface IEmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

class EmailService implements IEmailService {
  constructor(
    private config: EmailConfig,
    private logger: Logger
  ) {}

  async init() {
    // 异步初始化
    await this.setupTransporter();
  }

  async dispose() {
    // 清理资源
    await this.closeTransporter();
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.info('发送邮件', { to, subject });
    // 发送逻辑
  }
}
```

### 2. 错误处理

```typescript
class DatabaseService {
  async init() {
    try {
      await this.connect();
      this.logger.info('数据库连接成功');
    } catch (error) {
      this.logger.error('数据库连接失败', { error });
      throw error; // 重新抛出，阻止应用启动
    }
  }

  async query(sql: string) {
    try {
      return await this.connection.query(sql);
    } catch (error) {
      this.logger.error('查询失败', { sql, error });
      throw new DatabaseError('查询失败', { cause: error });
    }
  }
}
```

### 3. 配置管理

```typescript
// 使用环境变量和默认值
const config: StratixConfig = {
  name: process.env.APP_NAME || 'my-app',
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10')
    }
  }
};
```

### 4. 插件组织

```typescript
// plugins/index.ts
export { default as databasePlugin } from './database.js';
export { default as authPlugin } from './auth.js';
export { default as apiPlugin } from './api.js';

// stratix.config.ts
import { databasePlugin, authPlugin, apiPlugin } from './plugins/index.js';

const config: StratixConfig = {
  registers: [
    [databasePlugin, { connectionString: process.env.DATABASE_URL }],
    [authPlugin, { secret: process.env.JWT_SECRET }],
    [apiPlugin, { prefix: '/api/v1' }]
  ]
};
```

## API 参考

### StratixApp

```typescript
class StratixApp {
  static async run(options?: StratixRunOptions): Promise<StratixApp>;
}

interface StratixRunOptions {
  config?: ConfigLoaderOptions | string;
  envOptions?: EnvLoaderOptions;
  loglevel?: LogLevel;
  hooks?: LifecycleHooks;
}
```

### FastifyInstance 扩展

```typescript
interface FastifyInstance {
  diContainer: AwilixContainer;
  config: StratixConfig;
  registerDI: SmartDIRegister;
  diManager: DIContainerManager;
  log: FastifyBaseLogger;
  fp: FastifyPluginWrapper;
}
```

### DIRegisterOptions

```typescript
interface DIRegisterOptions {
  name?: string;
  lifetime?: 'SINGLETON' | 'SCOPED' | 'TRANSIENT';
  override?: boolean;
  asyncInit?: string | boolean;
  asyncDispose?: string | boolean;
  asyncInitPriority?: number;
  asyncDisposePriority?: number;
  eagerInject?: boolean | string;
  enabled?: boolean;
  tags?: string[];
}
```

### DIContainerManager

```typescript
interface DIContainerManager {
  executeInit(): Promise<void>;
  executeDispose(): Promise<void>;
  getWithTags(tags: string[]): Record<string, any>;
  getByPredicate(predicate: (entry: any) => boolean): Record<string, any>;
}
```

## 许可证

MIT

## 贡献

欢迎贡献代码！请查看贡献指南了解更多信息。

## 支持

如果您遇到问题或有疑问，请：

1. 查看文档
2. 搜索已有的 Issues
3. 创建新的 Issue

---

**Stratix Framework** - 让 Node.js 应用开发更简单、更强大！ 