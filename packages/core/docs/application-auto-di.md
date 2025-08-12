# 应用级自动依赖注入

Stratix 框架现在支持应用级别的自动依赖注入功能，可以在应用启动时自动扫描并加载应用根目录下的模块到 root container 中。

## 功能概述

应用级自动依赖注入会在应用启动时：

1. **自动扫描**应用根目录下的 `services/`、`repositories/`、`controllers/` 目录
2. **自动注册**模块到 root container（使用 SINGLETON 生命周期）
3. **自动注册路由**：对于带有 `@Controller` 装饰器的类，自动注册其路由到 Fastify
4. **自动注册生命周期钩子**：使用 `fastify.addHook` 注册应用级对象的生命周期方法

## 配置方式

在 `stratix.config.ts` 中添加 `applicationAutoDI` 配置：

```typescript
export default function createConfig(): StratixConfig {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0'
    },

    // 🎯 应用级自动依赖注入配置
    applicationAutoDI: {
      enabled: true,
      patterns: [
        'services/**/*.{ts,js}',
        'repositories/**/*.{ts,js}',
        'controllers/**/*.{ts,js}'
      ],
      routing: {
        enabled: true,
        prefix: '/api',
        validation: false
      },
      lifecycle: {
        enabled: true,
        errorHandling: 'warn'
      },
      debug: true
    },

    plugins: [],
    autoLoad: {}
  } as any;
}
```

## 配置选项

### `applicationAutoDI`

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | `boolean` | `true` | 是否启用应用级自动注入 |
| `appRootPath` | `string` | 自动检测 | 应用根目录路径 |
| `patterns` | `string[]` | 见下方 | 扫描的目录模式 |
| `routing.enabled` | `boolean` | `true` | 是否启用路由注册 |
| `routing.prefix` | `string` | `''` | 路由前缀 |
| `routing.validation` | `boolean` | `false` | 是否启用验证 |
| `debug` | `boolean` | `isDevelopment()` | 是否启用调试模式 |

### 默认扫描模式

```typescript
patterns: [
  'services/**/*.{ts,js}',
  'repositories/**/*.{ts,js}',
  'controllers/**/*.{ts,js}'
]
```

## 目录结构示例

```
src/
├── services/
│   ├── UserService.ts          # 自动注册为 userService
│   └── EmailService.ts         # 自动注册为 emailService
├── repositories/
│   ├── UserRepository.ts       # 自动注册为 userRepository
│   └── OrderRepository.ts      # 自动注册为 orderRepository
├── controllers/
│   ├── UserController.ts       # 自动注册为 userController + 路由
│   └── OrderController.ts      # 自动注册为 orderController + 路由
└── stratix.config.ts
```

## 使用示例

### 1. 服务类

```typescript
// src/services/UserService.ts
export default class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUsers() {
    return await this.userRepository.findAll();
  }

  async createUser(userData: any) {
    return await this.userRepository.save(userData);
  }
}
```

### 2. 仓储类

```typescript
// src/repositories/UserRepository.ts
export default class UserRepository {
  async findAll() {
    // 数据库查询逻辑
    return [];
  }

  async save(user: any) {
    // 保存逻辑
    return user;
  }
}
```

### 3. 控制器类

```typescript
// src/controllers/UserController.ts
import { Controller, Get, Post } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Controller()
export default class UserController {
  constructor(private userService: UserService) {}

  @Get('/users')
  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = await this.userService.getAllUsers();
    return reply.send({ success: true, data: users });
  }

  @Post('/users')
  async createUser(request: FastifyRequest, reply: FastifyReply) {
    const userData = request.body;
    const user = await this.userService.createUser(userData);
    return reply.status(201).send({ success: true, data: user });
  }
}
```

## 与插件级自动注入的区别

| 特性 | 应用级自动注入 | 插件级自动注入 |
|------|----------------|----------------|
| **注册位置** | root container | 插件 SCOPED 容器 |
| **生命周期** | SINGLETON | SCOPED |
| **可见性** | 全局可用 | 仅插件内可用 |
| **使用场景** | 核心业务逻辑 | 特定功能域 |
| **路由注册** | 自动注册到应用级 | 注册到插件级 |

## 最佳实践

### 1. 模块组织

- **应用级模块**：核心业务逻辑，如用户管理、订单处理等
- **插件级模块**：特定功能域，如支付集成、第三方API等

### 2. 依赖注入

```typescript
// ✅ 推荐：使用构造函数注入
@Controller()
export default class UserController {
  constructor(
    private userService: UserService,
    private logger: Logger
  ) {}
}

// ❌ 避免：直接导入模块
import { userService } from '../services/UserService';
```

### 3. 接口抽象

```typescript
// 定义接口
export interface IUserService {
  getAllUsers(): Promise<User[]>;
  createUser(userData: any): Promise<User>;
}

// 实现接口
export default class UserService implements IUserService {
  // 实现方法...
}

// 使用接口类型
@Controller()
export default class UserController {
  constructor(private userService: IUserService) {}
}
```

### 4. 避免循环依赖

```typescript
// ❌ 避免：循环依赖
// UserService -> OrderService -> UserService

// ✅ 推荐：使用事件或中介者模式
// UserService -> EventBus <- OrderService
```

## 调试和监控

启用调试模式可以查看详细的注册信息：

```typescript
applicationAutoDI: {
  debug: true
}
```

调试输出示例：

```
🚀 Starting application-level auto dependency injection...
📁 App root path: /path/to/app/src
🔍 Patterns: services/**/*.{ts,js}, repositories/**/*.{ts,js}, controllers/**/*.{ts,js}
✅ Application-level auto DI completed: 5 modules registered
📋 Registered modules: userService, emailService, userRepository, orderRepository, userController
✅ Application-level controller routes registered
```

## 故障排除

### 1. 模块未被注册

- 检查文件路径是否匹配 `patterns` 配置
- 确保模块有默认导出
- 检查文件扩展名是否正确

### 2. 路由未注册

- 确保控制器类使用了 `@Controller()` 装饰器
- 检查路由方法是否使用了 `@Get`、`@Post` 等装饰器
- 确认 `routing.enabled` 为 `true`

### 3. 依赖注入失败

- 检查依赖的模块是否已注册
- 确认构造函数参数名与注册名匹配
- 避免循环依赖

## 应用级生命周期管理

### 概述

Stratix 框架支持应用级对象的生命周期管理，复用现有的 `ConventionBasedLifecycleManager` 和 `fastify.addHook` 机制。

### 支持的生命周期方法

应用级对象可以实现以下生命周期方法：

- `onRegister()` - 在模块注册时调用
- `onReady()` - 在应用准备就绪时调用
- `onListen()` - 在服务器开始监听时调用
- `onClose()` - 在应用关闭时调用
- `preClose()` - 在应用关闭前调用
- `onRoute()` - 在路由注册时调用

### 使用示例

```typescript
// src/services/DatabaseService.ts
export default class DatabaseService {
  private connection: any;

  async onRegister() {
    console.log('DatabaseService: Registering...');
    // 初始化配置
  }

  async onReady() {
    console.log('DatabaseService: Ready to connect...');
    // 建立数据库连接
    this.connection = await this.connect();
  }

  async onClose() {
    console.log('DatabaseService: Closing connection...');
    // 关闭数据库连接
    if (this.connection) {
      await this.connection.close();
    }
  }

  private async connect() {
    // 数据库连接逻辑
    return { close: async () => {} };
  }
}
```

### 配置选项

```typescript
applicationAutoDI: {
  lifecycle: {
    enabled: true,           // 是否启用生命周期管理
    errorHandling: 'warn'    // 错误处理策略: 'throw' | 'warn' | 'ignore'
  }
}
```

### 错误处理策略

- `throw` - 抛出错误，中断应用启动
- `warn` - 记录警告，继续执行
- `ignore` - 忽略错误，静默处理

### 执行顺序

1. 模块注册到容器（SINGLETON 生命周期）
2. 扫描生命周期方法并注册到生命周期管理器
3. 使用 `fastify.addHook` 注册聚合的生命周期处理函数
4. Fastify 在相应时机调用生命周期钩子

### 最佳实践

1. **异步操作**：生命周期方法支持异步操作
2. **错误处理**：在生命周期方法中进行适当的错误处理
3. **资源管理**：在 `onClose` 中清理资源
4. **依赖顺序**：注意服务间的依赖关系

## 性能考虑

- 应用级模块使用 SINGLETON 生命周期，只创建一次实例
- 自动扫描在应用启动时执行，不影响运行时性能
- 路由注册在启动时完成，运行时无额外开销
- 生命周期钩子通过 Fastify 的原生机制执行，性能优异
