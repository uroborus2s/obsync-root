---
type: "manual"
---

# 项目总体说明
Stratix框架是包装fastify 5 +awilix 12 的现代化、函数式、高性能的Node.js应用框架
  - **函数式编程**: 完全采用函数式编程范式
  - **插件化架构**: 所有功能以 fastify插件的方式加载
  - **Monorepo架构**: 使用pnpm workspaces + Turbo构建系统
  - vitest和pnpm无缝结合，共用项目根目录的vitest.config
  - **依赖注入**: 基于Awilix的IOC容器管理
  - 从@stratix/utils库中获取函数式编程工具和其他工具

# 插件开发指南
## 插件文件结构
```
@stratix/my-plugin/
├── package.json                    # 插件包配置
├── index.ts                        # 插件入口文件
├── repositories/                   # 数据访问层（插件域SCOPED）可选
│   ├── UserRepository.ts           # 用户仓储
│   ├── OrderRepository.ts          # 订单仓储
│   └── base/
│       └── BaseRepository.ts       # 基础仓储
├── services/                       # 业务逻辑层（插件域SCOPED）
│   ├── UserService.ts              # 用户服务
│   ├── OrderService.ts             # 订单服务
│   └── shared/
│       └── ValidationService.ts    # 共享验证服务
├── controllers/                    # 控制器层（插件域SCOPED）可选
│   ├── UserController.ts           # 用户控制器
│   └── OrderController.ts          # 订单控制器
├── executors/                      # 执行器层（插件域SCOPED）可选
│   ├── UserNotificationExecutor.ts # 用户通知执行器
│   └── DataProcessingExecutor.ts   # 数据处理执行器
├── adapters/                       # 适配器层（插件域SCOPED）可选
│   ├── UserSyncAdapter.ts          # 用户同步适配器
│   └── EmailAdapter.ts             # 邮件适配器
├── utils/                          # 工具函数（插件域SCOPED），可选
│   ├── dateUtils.ts               # 日期工具
│   └── stringUtils.ts             # 字符串工具
└── types/                          # 类型定义
    ├── User.ts                     # 用户类型
    └── Order.ts                    # 订单类型
```
## 插件入口文件（index.ts）

```typescript
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { withRegisterAutoDI } from '@stratix/core';

// 插件主函数 - 保持简洁，专注业务逻辑
async function myPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // 插件特定的业务逻辑
  // 路由、服务、执行器等会通过 withRegisterAutoDI 自动注册

  // 可选：注册插件特定的钩子
  fastify.addHook('onReady', async () => {
    fastify.log.info('My plugin is ready');
  });
}

// 插件配置
const pluginConfig = {
  name: '@my-company/my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  enhancement: {
    autoDiscovery: {
      esModules: true,
      globs: [
        'repositories/**/*.{ts,js}',
        'services/**/*.{ts,js}',
        'controllers/**/*.{ts,js}',
        'executors/**/*.{ts,js}',
        'adapters/**/*.{ts,js}'
      ]
    },
    debug: process.env.NODE_ENV === 'development'
  }
};

// 导出增强后的插件
export default withRegisterAutoDI(myPlugin, pluginConfig);
```

# 开发说明
- 框架应用基于fastify的封装，di容器使用awilix
- 使用context7阅读fastify 5 和 awilix 12 的文档
- 阅读awilix的文档https://github.com/jeffijoe/awilix，获取最新版本特性

# 分层架构开发指南

## 核心架构原则
- **插件域生命周期**: 所有层（Repository、Service、Controller、Executor、Adapter）都是插件域的SCOPED生命周期
- **容器层次**: 根容器 → 插件SCOPED容器 → 请求作用域
- **自动发现**: 通过withRegisterAutoDI实现模块自动发现和注册
- **即时注册**: 模块发现后立即注册，避免批量处理延迟

## Repository层（数据访问层）
**生命周期**: 插件域SCOPED
**职责**: 数据访问、CRUD操作、业务查询

### 标准实现模式
```typescript
// repositories/UserRepository.ts
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { BaseRepository } from './base/BaseRepository.js';

export interface IUserRepository {
  findByIdNullable(id: number): Promise<DatabaseResult<User | null>>;
  create(data: NewUser): Promise<DatabaseResult<User>>;
  updateNullable(id: number, data: UserUpdate): Promise<DatabaseResult<User | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;

  // 业务查询方法
  findByEmail(email: string): Promise<DatabaseResult<User | null>>;
  findActiveUsers(): Promise<DatabaseResult<User[]>>;
}

export default class UserRepository
  extends BaseRepository<'users', User, NewUser, UserUpdate>
  implements IUserRepository
{
  protected readonly tableName = 'users' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
  }

  async findByEmail(email: string): Promise<DatabaseResult<User | null>> {
    this.validateEmail(email);
    return await this.findOneNullable((eb: any) =>
      eb('email', '=', email)
    );
  }

  private validateEmail(email: string): void {
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email format');
    }
  }
}
```

### Repository层规范
- 继承BaseRepository提供通用CRUD
- 实现明确的接口契约
- 包含业务特定的查询方法
- 内置参数验证
- 统一的错误处理

## Service层（业务逻辑层）
**生命周期**: 插件域SCOPED
**职责**: 业务逻辑封装、复杂流程处理

### 标准实现模式
```typescript
// services/UserService.ts
import { Logger } from '@stratix/core';
import type { IUserRepository } from '../repositories/UserRepository.js';

export interface IUserService {
  createUser(userData: CreateUserRequest): Promise<ServiceResult<User>>;
  updateUser(id: number, userData: UpdateUserRequest): Promise<ServiceResult<User>>;
  deleteUser(id: number): Promise<ServiceResult<boolean>>;
  getUserById(id: number): Promise<ServiceResult<User>>;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export default class UserService implements IUserService {
  constructor(
    private userRepository: IUserRepository,
    private logger: Logger
  ) {}

  async createUser(userData: CreateUserRequest): Promise<ServiceResult<User>> {
    try {
      // 1. 验证输入
      this.validateCreateUserRequest(userData);

      // 2. 检查邮箱是否已存在
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser.success && existingUser.data) {
        return {
          success: false,
          error: 'Email already exists',
          code: 'EMAIL_EXISTS'
        };
      }

      // 3. 创建用户
      const result = await this.userRepository.create(userData);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create user');
      }

      this.logger.info(`User created successfully: ${result.data.id}`);

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private validateCreateUserRequest(userData: CreateUserRequest): void {
    if (!userData.email || !userData.name) {
      throw new Error('Missing required fields');
    }
  }
}
```

### Service层规范
- 实现清晰的服务接口
- 封装复杂的业务逻辑
- 统一的结果返回格式
- 完整的错误处理
- 业务级验证和规则

## Controller层（控制器层）
**生命周期**: 插件域SCOPED
**职责**: HTTP接口、路由处理、请求响应

### 标准实现模式
```typescript
// controllers/UserController.ts
import { Controller, Get, Post, Put, Delete, RESOLVER } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from '@stratix/core';
import type { IUserService } from '../services/UserService.js';

@Controller()
export default class UserController {
  constructor(
    private userService: IUserService
  ) {}

  @Get('/users/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  async getUserById(
    request: FastifyRequest<{ Params: { id: number } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const result = await this.userService.getUserById(id);

    if (!result.success) {
      return reply.code(404).send({
        success: false,
        error: result.error || 'User not found'
      });
    }

    return reply.code(200).send({
      success: true,
      data: result.data
    });
  }

  @Post('/users', {
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 1 }
        },
        required: ['email', 'name']
      }
    }
  })
  async createUser(
    request: FastifyRequest<{ Body: CreateUserBody }>,
    reply: FastifyReply
  ) {
    const result = await this.userService.createUser(request.body);

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: result.error
      });
    }

    return reply.code(201).send({
      success: true,
      data: result.data
    });
  }

  // 生命周期方法
  async onReady() {
    console.log('UserController is ready');
  }
}
```

### Controller层规范
- 使用@Controller装饰器标识
- 使用路由装饰器(@Get、@Post等)
- 完整的Schema定义
- 正确的HTTP状态码
- 统一的响应格式

## Executor层（执行器层）
**生命周期**: 插件域SCOPED
**职责**: 任务执行、异步处理、后台作业

### 标准实现模式
```typescript
// executors/UserNotificationExecutor.ts
import { Executor } from '@stratix/core';
import type { TaskExecutor, ExecutionContext, ExecutionResult } from '@stratix/tasks';
import type { IUserService } from '../services/UserService.js';

@Executor({
  name: 'userNotification',
  description: '用户通知执行器',
  version: '1.0.0',
  tags: ['user', 'notification', 'email'],
  category: 'communication'
})
export default class UserNotificationExecutor implements TaskExecutor {
  readonly name = 'userNotification';
  readonly description = '用户通知执行器';
  readonly version = '1.0.0';

  constructor(
    private userService: IUserService
  ) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    try {
      const config = context.config as NotificationConfig;

      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 执行通知逻辑
      const result = await this.sendNotification(config);

      return {
        success: true,
        data: {
          userId: config.userId,
          notificationType: config.type,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validateConfig(config: any): { valid: boolean; error?: string } {
    if (!config || !config.userId || !config.type) {
      return { valid: false, error: 'Invalid configuration' };
    }
    return { valid: true };
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    return { healthy: true, message: 'Executor is ready' };
  }
}
```

### Executor层规范
- 使用@Executor装饰器配置
- 实现TaskExecutor接口
- 包含execute核心方法
- 实现配置验证
- 提供健康检查
- 可选的初始化和销毁方法

## Adapter层（适配器层）
**生命周期**: 插件域SCOPED
**职责**: 外部系统集成、简化接口封装

### 标准实现模式
```typescript
// adapters/UserSyncAdapter.ts
import type { AwilixContainer, Logger } from '@stratix/core';
import type { IUserService } from '../services/UserService.js';

export default class UserSyncAdapter {
  static adapterName = 'userSync';

  private userService: IUserService;
  private logger: Logger;

  constructor(container: AwilixContainer) {
    this.userService = container.resolve('userService');
    this.logger = container.resolve('logger');
  }

  async syncUsers(config: UserSyncConfig = {}): Promise<UserSyncResult> {
    const startTime = Date.now();
    const { batchSize = 100, timeout = 30000, dryRun = false } = config;

    this.logger.info(`Starting user sync (dryRun: ${dryRun})`);

    try {
      // 实现同步逻辑
      const result = await this.performSync(config);

      result.duration = Date.now() - startTime;
      this.logger.info(`User sync completed: ${result.processedCount} processed`);

      return result;
    } catch (error) {
      this.logger.error('User sync failed:', error);
      return {
        success: false,
        duration: Date.now() - startTime,
        processedCount: 0,
        errorCount: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.userService !== null && this.userService !== undefined;
  }
}
```

### Adapter层规范
- 静态adapterName标识
- 通过容器解析依赖
- 提供简化的外部接口
- 统一的配置和结果格式
- 健康检查和状态查询
- 完整的错误处理和日志

# 代码规范

## 命名约定
- **文件命名**: PascalCase + 层级后缀 (UserRepository.ts, UserService.ts)
- **类命名**: PascalCase + 层级后缀 (class UserRepository)
- **接口命名**: I + PascalCase + 层级后缀 (interface IUserRepository)
- **方法命名**: camelCase + 动词开头 (async createUser())
- **常量命名**: UPPER_SNAKE_CASE (const DEFAULT_BATCH_SIZE = 100)

## 类型定义
```typescript
// types/User.ts
export interface User {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly status: UserStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ServiceResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly code?: string;
}
```

## 测试规范
- **单元测试**: 使用vitest，模拟依赖，测试业务逻辑
- **集成测试**: 测试完整的API流程和插件集成
- **测试文件**: 放在__tests__目录下，按层级组织

## 最佳实践
- **性能优化**: 使用连接池、批量操作、缓存策略
- **错误处理**: 统一BusinessError类型、错误处理中间件
- **日志记录**: 结构化日志、性能日志、错误日志
- **生命周期**: 正确实现onReady、onClose等生命周期方法
