# Stratix 框架依赖注入功能设计文档

## 1. 概述

Stratix 框架的依赖注入完全基于 `@fastify/awilix` 和 `awilix`，提供极简的手动注册依赖注入能力。设计理念是**零魔法**，所有依赖关系都在配置文件中显式声明，不使用任何自动扫描或路径解析功能。

### 1.1 设计原则

- **极简主义**：在 `@fastify/awilix` 基础上仅增加配置处理层
- **手动注册**：所有服务和仓储都在配置文件中显式导入和声明  
- **类型安全**：享受完整的 TypeScript 类型检查和自动补全
- **零魔法**：没有隐式行为，所有依赖关系一目了然
- **显式优于隐式**：宁可多写几行配置，也要保持清晰明确

### 1.2 核心功能

1. **配置驱动注册**：在 `stratix.config.ts` 中直接声明所有依赖
2. **极简配置语法**：90%场景只需列出类名，自动推断配置
3. **插件集成**：支持在插件配置中注册服务
4. **生命周期管理**：支持 SINGLETON、SCOPED、TRANSIENT
5. **ServiceRegistrar**：简单的配置处理器，负责将配置转换为 awilix 注册

## 2. 配置文件结构

### 2.1 推荐配置格式（极简版）

```typescript
// apps/template/stratix.config.ts
import { UserService, EmailService, PaymentService, AuthService } from './src/services/index.js';
import { UserRepository, PaymentRepository } from './src/repositories/index.js';

export default (sensitiveInfo: any) => ({
  app: {
    name: 'stratix-app',
    version: '1.0.0'
  },

  // 🎯 极简依赖注入配置
  di: {
    // 默认单例服务（90%场景）
    services: [UserService, EmailService, ConfigService],
    
    // 默认单例仓储
    repositories: [UserRepository, PaymentRepository],
    
    // 请求作用域服务（需要per-request实例）
    scoped: [PaymentService, AuthService, SessionService]
  },

  // 🎯 插件配置中的服务注册也支持极简语法
  adminPlugin: [
    adminPlugin,
    'scoped', 
    {
      services: [AdminService, AdminAuthService],
      repositories: [AdminRepository]
    }
  ]
});
```

### 2.2 自定义名称配置（10%场景）

当需要自定义服务名称时使用对象语法：

```typescript
export default (sensitiveInfo: any) => ({
  di: {
    // 对象配置：支持自定义名称
    services: {
      UserService,                    // 自动生成名称：userService
      emailSender: EmailService,      // 自定义名称：emailSender
      payment: PaymentService,        // 自定义名称：payment
      logger: LoggerService           // 自定义名称：logger
    },
    
    repositories: {
      UserRepository,                 // 自动生成：userRepository
      auditLog: AuditRepository,      // 自定义名称：auditLog
      cache: CacheRepository          // 自定义名称：cache
    },
    
    // 请求作用域也支持对象语法
    scoped: {
      AuthService,                    // 自动生成：authService
      paymentProcessor: PaymentService // 自定义名称：paymentProcessor
    }
  }
});
```

### 2.3 混合使用（灵活搭配）

```typescript
export default (sensitiveInfo: any) => ({
  di: {
    // 大部分服务使用数组（简洁）
    services: [UserService, EmailService, ConfigService],
    
    // 少数需要自定义名称的使用对象
    repositories: {
      UserRepository,                 // 默认名称
      auditLog: AuditRepository,      // 自定义名称
      cache: CacheRepository          // 自定义名称
    },
    
    // 请求作用域服务
    scoped: [PaymentService, AuthService]
  }
});
```

### 2.4 配置规则总结

| 配置方式 | 语法 | 名称生成 | 生命周期 | 使用场景 |
|---------|------|---------|---------|----------|
| 数组配置 | `[Class1, Class2]` | 自动（类名转驼峰） | SINGLETON | 90%的常规场景 |
| 对象配置 | `{ customName: Class }` | 自定义 | SINGLETON | 需要自定义名称 |
| scoped数组 | `scoped: [Class1, Class2]` | 自动 | SCOPED | 请求作用域服务 |
| scoped对象 | `scoped: { name: Class }` | 自定义 | SCOPED | 请求作用域+自定义名称 |

### 2.5 高级配置格式（向后兼容）

为了向后兼容和特殊需求，仍然支持原有的三种格式：

#### 2.5.1 格式1：直接传入类
```typescript
services: [
  UserService,      // -> 自动生成名称: userService
  EmailService,     // -> 自动生成名称: emailService
]
```

#### 2.5.2 格式2：数组格式（带选项）
```typescript
services: [
  [UserService, { lifetime: 'SCOPED' }],                    // 指定生命周期
  [EmailService, { name: 'mailService' }],                  // 自定义名称
  [PaymentService, { name: 'payment', lifetime: 'SINGLETON' }] // 自定义名称+生命周期
]
```

#### 2.5.3 格式3：完整对象（完全控制）
```typescript
services: [
  {
    name: 'userService',
    implementation: UserService,
    lifetime: 'SINGLETON'
  },
  {
    name: 'emailProcessor',
    implementation: EmailService,
    lifetime: 'SCOPED'
  }
]
```

## 3. 架构设计

### 3.1 系统架构

```
┌─────────────────────────────────────────────────────┐
│                Stratix Application                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐    ┌─────────────────┐        │
│  │  Application    │    │  Plugin System  │        │
│  │  Routes/Logic   │◄───┤  & Extensions   │        │
│  └─────────────────┘    └─────────────────┘        │
│                                   │                 │
│                                   ▼                 │
│  ┌─────────────────────────────────────────────┐   │
│  │         Business Layer                      │   │
│  │  ┌─────────────┐    ┌─────────────────┐    │   │
│  │  │  Services   │    │  Repositories   │    │   │
│  │  │             │    │                 │    │   │
│  │  │ • UserSvc   │    │ • UserRepo      │    │   │
│  │  │ • EmailSvc  │    │ • PaymentRepo   │    │   │
│  │  │ • PaymentSvc│    │ • LogRepo       │    │   │
│  │  └─────────────┘    └─────────────────┘    │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│             Dependency Injection Layer              │
│                                                     │
│  ┌─────────────────┐    ┌──────────────────────┐   │
│  │ServiceRegistrar │    │    Configuration     │   │
│  │                 │    │                      │   │
│  │ • Process       │◄───┤ • Global DI Config   │   │
│  │   Global Config │    │ • Plugin DI Config   │   │
│  │ • Process       │    │ • Service Lists      │   │
│  │   Plugin Config │    │ • Repository Lists   │   │
│  │ • Register to   │    │                      │   │
│  │   Awilix        │    │                      │   │
│  └─────────────────┘    └──────────────────────┘   │
│           │                                         │
│           ▼                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │            @fastify/awilix                  │   │
│  │                                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │ Fastify Plugin  │  │ Awilix Container│  │   │
│  │  │                 │  │                 │  │   │
│  │  │ • Request Scope │──┤ • Service Store │  │   │
│  │  │ • Decorators    │  │ • Lifecycle Mgmt│  │   │
│  │  │ • Integration   │  │ • Resolution    │  │   │
│  │  └─────────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 3.2 工作流程

```
启动阶段
├── 1. 加载 stratix.config.ts
├── 2. 注册 @fastify/awilix 插件
├── 3. 创建 ServiceRegistrar
├── 4. 处理全局 DI 配置
│   ├── 处理 config.di.services
│   └── 处理 config.di.repositories
├── 5. 处理插件 DI 配置
│   └── 遍历插件配置，提取 services/repositories
└── 6. 启动应用

运行时阶段
├── 请求到达
├── @fastify/awilix 创建请求作用域
├── 通过 request.diScope.resolve() 获取服务
├── Awilix 自动解析依赖关系
└── 返回服务实例
```

## 4. ServiceRegistrar 设计

### 4.1 类接口设计

```typescript
export class ServiceRegistrar {
  constructor(container: AwilixContainer, logger: Logger);

  // 主要方法
  processConfig(diConfig: UnifiedDIConfig): void;
  processPluginConfig(pluginName: string, pluginOptions: any): void;

  // 🎯 极简配置处理方法
  private processSimpleConfig(diConfig: DIConfig): void;
  private processServices(services: ServiceArray | ServiceObject): void;
  private processRepositories(repositories: RepositoryArray | RepositoryObject): void;
  private processScopedServices(scoped: ScopedServices): void;
  
  // 🔧 高级配置处理方法（向后兼容）
  private processAdvancedConfig(diConfig: AdvancedDIConfig): void;
  private registerServices(services: ServiceDefinition[]): void;
  private registerRepositories(repositories: RepositoryDefinition[]): void;
  
  // 通用方法
  private registerFromArray(classes: ServiceClass[], type: 'service' | 'repository', lifetime: LifetimeType): void;
  private registerFromObject(obj: Record<string, ServiceClass>, type: 'service' | 'repository', lifetime: LifetimeType): void;
  private registerSingle(name: string, implementation: ServiceClass, lifetime: LifetimeType): void;
  private generateName(className: string, type: 'service' | 'repository'): string;
  private mapLifetime(lifetime: LifetimeType): AwilixLifetime;
}
```

### 4.2 核心处理逻辑

```typescript
// 统一入口：自动判断配置类型
processConfig(diConfig: UnifiedDIConfig): void {
  // 判断是极简配置还是高级配置
  if (this.isSimpleConfig(diConfig)) {
    this.processSimpleConfig(diConfig as DIConfig);
  } else {
    this.processAdvancedConfig(diConfig as AdvancedDIConfig);
  }
}

// 🎯 极简配置处理
private processSimpleConfig(diConfig: DIConfig): void {
  // 处理默认单例服务
  if (diConfig.services) {
    this.processServices(diConfig.services);
  }
  
  // 处理默认单例仓储
  if (diConfig.repositories) {
    this.processRepositories(diConfig.repositories);
  }
  
  // 处理请求作用域服务
  if (diConfig.scoped) {
    this.processScopedServices(diConfig.scoped);
  }
  
  // 处理瞬时服务（如果有）
  if (diConfig.transient) {
    if (Array.isArray(diConfig.transient)) {
      this.registerFromArray(diConfig.transient, 'service', 'TRANSIENT');
    } else {
      this.registerFromObject(diConfig.transient, 'service', 'TRANSIENT');
    }
  }
}

// 处理服务配置（支持数组和对象两种格式）
private processServices(services: ServiceArray | ServiceObject): void {
  if (Array.isArray(services)) {
    // 数组格式：[UserService, EmailService]
    this.registerFromArray(services, 'service', 'SINGLETON');
  } else {
    // 对象格式：{ UserService, emailSender: EmailService }
    this.registerFromObject(services, 'service', 'SINGLETON');
  }
}

// 处理仓储配置
private processRepositories(repositories: RepositoryArray | RepositoryObject): void {
  if (Array.isArray(repositories)) {
    this.registerFromArray(repositories, 'repository', 'SINGLETON');
  } else {
    this.registerFromObject(repositories, 'repository', 'SINGLETON');
  }
}

// 处理请求作用域服务
private processScopedServices(scoped: ScopedServices): void {
  if (Array.isArray(scoped)) {
    this.registerFromArray(scoped, 'service', 'SCOPED');
  } else {
    this.registerFromObject(scoped, 'service', 'SCOPED');
  }
}
```

### 4.3 通用注册方法

```typescript
// 从数组注册服务
private registerFromArray(
  classes: ServiceClass[], 
  type: 'service' | 'repository', 
  lifetime: LifetimeType
): void {
  classes.forEach(cls => {
    const name = this.generateName(cls.name, type);
    this.registerSingle(name, cls, lifetime);
  });
}

// 从对象注册服务
private registerFromObject(
  obj: Record<string, ServiceClass>, 
  type: 'service' | 'repository', 
  lifetime: LifetimeType
): void {
  Object.entries(obj).forEach(([key, cls]) => {
    // 如果key是类名，自动生成名称；否则使用key作为名称
    const name = key === cls.name ? this.generateName(cls.name, type) : key;
    this.registerSingle(name, cls, lifetime);
  });
}

// 最终注册方法
private registerSingle(name: string, implementation: ServiceClass, lifetime: LifetimeType): void {
  this.logger.debug(`注册${lifetime}服务: ${name} -> ${implementation.name}`);
  
  this.container.register({
    [name]: asClass(implementation, {
      lifetime: this.mapLifetime(lifetime),
      injectionMode: InjectionMode.PROXY
    })
  });
}

// 判断是否为极简配置
private isSimpleConfig(config: any): boolean {
  const simpleKeys = ['services', 'repositories', 'scoped', 'transient'];
  const hasSimpleKeys = simpleKeys.some(key => config[key] !== undefined);
  
  // 如果有简单配置的key，且services/repositories是数组或对象（而非定义数组），则认为是简单配置
  if (hasSimpleKeys && config.services) {
    return Array.isArray(config.services) || 
           (typeof config.services === 'object' && !Array.isArray(config.services[0]));
  }
  
  return hasSimpleKeys;
}
```

### 4.4 插件配置处理

```typescript
// 插件配置也支持极简语法
processPluginConfig(pluginName: string, pluginOptions: any): void {
  this.logger.debug(`处理插件 ${pluginName} 的依赖注入配置`);
  
  // 提取插件的DI配置
  const diConfig: any = {};
  
  if (pluginOptions.services) {
    diConfig.services = pluginOptions.services;
  }
  
  if (pluginOptions.repositories) {
    diConfig.repositories = pluginOptions.repositories;
  }
  
  if (pluginOptions.scoped) {
    diConfig.scoped = pluginOptions.scoped;
  }
  
  // 使用统一处理逻辑
  if (Object.keys(diConfig).length > 0) {
    this.processConfig(diConfig);
  }
}
```

## 5. 类型定义

### 5.1 主要类型

```typescript
// 生命周期类型
export type LifetimeType = 'SINGLETON' | 'SCOPED' | 'TRANSIENT';

// 服务/仓储类构造函数
export type ServiceClass = new (...args: any[]) => any;
export type RepositoryClass = new (...args: any[]) => any;

// 🎯 极简配置类型定义

// 数组配置：支持类列表
export type ServiceArray = ServiceClass[];
export type RepositoryArray = RepositoryClass[];

// 对象配置：支持自定义名称
export type ServiceObject = Record<string, ServiceClass>;
export type RepositoryObject = Record<string, RepositoryClass>;

// scoped配置：支持数组和对象两种形式
export type ScopedServices = ServiceClass[] | Record<string, ServiceClass>;

// 主配置接口（极简版）
export interface DIConfig {
  services?: ServiceArray | ServiceObject;
  repositories?: RepositoryArray | RepositoryObject;
  scoped?: ScopedServices;
  transient?: ServiceClass[] | Record<string, ServiceClass>; // 备用：瞬时服务
}

// 🔧 高级配置类型定义（向后兼容）

// 配置选项
export interface ServiceOptions {
  name?: string;
  lifetime?: LifetimeType;
}

export interface RepositoryOptions {
  name?: string;
  lifetime?: LifetimeType;
}

// 服务定义（支持三种格式）
export type ServiceDefinition = 
  | ServiceClass                                          // 直接传类
  | [ServiceClass, ServiceOptions?]                       // [类, 选项]
  | { name: string; implementation: ServiceClass; lifetime?: LifetimeType }; // 完整对象

// 仓储定义（支持三种格式）  
export type RepositoryDefinition = 
  | RepositoryClass                                       // 直接传类
  | [RepositoryClass, RepositoryOptions?]                 // [类, 选项]
  | { name: string; implementation: RepositoryClass; lifetime?: LifetimeType }; // 完整对象

// 高级配置接口（完全兼容原有设计）
export interface AdvancedDIConfig {
  services?: ServiceDefinition[];
  repositories?: RepositoryDefinition[];
}

// 统一配置接口（支持两种配置风格）
export type UnifiedDIConfig = DIConfig | AdvancedDIConfig;
```

### 5.2 配置示例的类型推断

```typescript
// ✅ 类型安全的极简配置
const config = {
  di: {
    services: [UserService, EmailService],           // ServiceArray
    repositories: [UserRepository],                  // RepositoryArray
    scoped: [PaymentService, AuthService]            // ScopedServices (数组)
  }
};

// ✅ 类型安全的对象配置
const config = {
  di: {
    services: {                                       // ServiceObject
      UserService,                   // 类型：UserService
      emailSender: EmailService,     // 类型：EmailService
      payment: PaymentService        // 类型：PaymentService
    }
  }
};

// ✅ 混合配置的类型推断
const config = {
  di: {
    services: [UserService, EmailService],           // ServiceArray
    repositories: {                                  // RepositoryObject
      UserRepository,                // 默认名称
      auditLog: AuditRepository      // 自定义名称
    },
    scoped: {                                        // ScopedServices (对象)
      AuthService,
      paymentProcessor: PaymentService
    }
  }
};
```

## 6. 集成到 StratixApplication

### 6.1 应用启动流程

```typescript
// packages/core/src/app.ts
export class StratixApplication implements StratixApp {
  private serviceRegistrar?: ServiceRegistrar;

  private async setupDependencyInjection(): Promise<void> {
    // 1. 注册 @fastify/awilix 插件
    await this.fastify.register(fastifyAwilix, {
      disposeOnClose: true,
      disposeOnResponse: false,
      strictBooleanEnforced: true
    });

    // 2. 创建服务注册器
    this.serviceRegistrar = new ServiceRegistrar(
      this.fastify.diContainer,
      this.logger
    );

    // 3. 处理全局 DI 配置
    if (this.config.di) {
      this.serviceRegistrar.processConfig(this.config.di);
    }

    // 4. 处理插件 DI 配置
    await this.processPluginDIConfigs();
  }

  private async processPluginDIConfigs(): Promise<void> {
    for (const [pluginKey, pluginConfig] of Object.entries(this.config)) {
      if (Array.isArray(pluginConfig) && pluginConfig.length >= 3) {
        const [plugin, scope, options] = pluginConfig;
        
        if (options && (options.services || options.repositories)) {
          this.serviceRegistrar?.processPluginConfig(pluginKey, options);
        }
      }
    }
  }
}
```

## 7. 使用示例

### 7.1 定义服务和仓储

```typescript
// src/services/user.service.ts
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    this.logger.info('创建用户', { userData });
    
    const user = await this.userRepository.create(userData);
    await this.emailService.sendWelcomeEmail(user.email);
    
    return user;
  }
}

// src/repositories/user.repository.ts  
export class UserRepository {
  constructor(private db: DatabaseConnection) {}

  async create(userData: CreateUserDto): Promise<User> {
    return this.db.user.create({ data: userData });
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }
}
```

### 7.2 在路由中使用

```typescript
// src/routes/user.routes.ts
export async function userRoutes(fastify: FastifyInstance) {
  fastify.post('/users', async (request, reply) => {
    // 从请求作用域解析服务
    const userService = request.diScope.resolve<UserService>('userService');
    
    const userData = request.body as CreateUserDto;
    const user = await userService.createUser(userData);
    
    return reply.code(201).send(user);
  });

  fastify.get('/users/:id', async (request, reply) => {
    const userService = request.diScope.resolve<UserService>('userService');
    const { id } = request.params as { id: string };
    
    const user = await userService.getUserById(id);
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    return user;
  });
}
```

### 7.3 在插件中使用

```typescript
// src/plugins/auth.plugin.ts
import fp from 'fastify-plugin';

async function authPlugin(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    // 解析认证服务
    const authService = request.diScope.resolve<AuthService>('authService');
    
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const user = await authService.validateToken(token);
        request.user = user;
      } catch (error) {
        return reply.code(401).send({ error: 'Invalid token' });
      }
    }
  });
}

export default fp(authPlugin);
```

## 8. 配置示例

### 8.1 完整项目配置（极简版）

```typescript
// apps/example/stratix.config.ts
import { 
  UserService, 
  EmailService, 
  PaymentService, 
  AuthService,
  NotificationService,
  LoggerService 
} from './src/services/index.js';

import { 
  UserRepository, 
  PaymentRepository, 
  AuditRepository 
} from './src/repositories/index.js';

import adminPlugin from './src/plugins/admin/plugin.js';
import paymentPlugin from './src/plugins/payment/plugin.js';
import reportingPlugin from './src/plugins/reporting/plugin.js';

export default (sensitiveInfo: any) => ({
  app: {
    name: 'example-app',
    version: '1.0.0',
    port: sensitiveInfo.PORT || 3000
  },

  // 🎯 极简依赖注入配置
  di: {
    // 核心服务（默认单例）
    services: [
      LoggerService,
      UserService,
      EmailService,
      NotificationService
    ],

    // 核心仓储（默认单例）
    repositories: [
      UserRepository,
      PaymentRepository
    ],
    
    // 请求作用域服务
    scoped: [
      PaymentService,    // 支付处理需要请求隔离
      AuthService        // 认证服务需要请求上下文
    ]
  },

  // Web 框架插件
  '@stratix/web': [webPlugin, 'global', {}],
  
  // 管理后台插件
  adminPlugin: [
    adminPlugin,
    'scoped',
    {
      // 管理后台服务（极简语法）
      services: [AdminService, AdminUserService],
      repositories: [AdminRepository],
      scoped: [AdminAuthService],  // 管理员认证服务
      
      // 插件其他配置
      prefix: '/admin',
      middleware: ['adminAuth']
    }
  ],
  
  // 支付插件（混合配置）
  paymentPlugin: [
    paymentPlugin,
    'scoped',
    {
      services: [PaymentProcessorService],
      repositories: {
        PaymentLogRepository,              // 使用默认名称
        paymentAudit: AuditRepository      // 自定义名称
      }
    }
  ],
  
  // 报告插件（对象配置）
  reportingPlugin: [
    reportingPlugin,
    'scoped',
    {
      services: {
        reportGenerator: ReportService,     // 自定义名称
        ReportValidator                     // 默认名称
      }
    }
  ]
});
```

### 8.2 不同场景的配置方式

#### 8.2.1 小型项目（纯数组配置）

```typescript
// 简单项目配置
export default () => ({
  app: { name: 'simple-app' },
  
  di: {
    services: [UserService, EmailService, LoggerService],
    repositories: [UserRepository, SettingRepository],
    scoped: [AuthService]  // 只有认证服务需要请求作用域
  }
});
```

#### 8.2.2 中型项目（混合配置）

```typescript
// 中等复杂度项目
export default () => ({
  app: { name: 'medium-app' },
  
  di: {
    // 大部分服务使用数组（简洁）
    services: [UserService, EmailService, LoggerService, ConfigService],
    
    // 少数需要自定义名称
    repositories: {
      UserRepository,                // 默认：userRepository
      auditLog: AuditRepository,     // 自定义：auditLog
      cache: CacheRepository,        // 自定义：cache
      primaryDb: DatabaseRepository  // 自定义：primaryDb
    },
    
    // 请求作用域服务
    scoped: [PaymentService, AuthService, SessionService]
  }
});
```

#### 8.2.3 大型项目（分组配置）

```typescript
// 大型项目：按功能分组
export default () => ({
  app: { name: 'large-app' },
  
  di: {
    // === 核心基础服务 ===
    services: [
      LoggerService,
      ConfigService,
      CacheService,
      QueueService
    ],
    
    // === 业务服务 ===（使用对象配置便于管理）
    services: {
      // 用户相关
      UserService,
      ProfileService,
      
      // 通信相关
      emailSender: EmailService,
      smsSender: SmsService,
      notifier: NotificationService,
      
      // 支付相关
      paymentGateway: PaymentGatewayService,
      billingProcessor: BillingService
    },
    
    // === 数据层 ===
    repositories: {
      // 核心实体
      UserRepository,
      OrderRepository,
      ProductRepository,
      
      // 审计和日志
      auditLog: AuditRepository,
      accessLog: AccessLogRepository,
      
      // 缓存层
      userCache: UserCacheRepository,
      productCache: ProductCacheRepository
    },
    
    // === 请求作用域服务 ===
    scoped: {
      // 认证授权
      AuthService,
      PermissionService,
      
      // 业务处理
      orderProcessor: OrderProcessingService,
      paymentProcessor: PaymentProcessingService,
      
      // 上下文服务
      requestContext: RequestContextService,
      userSession: UserSessionService
    }
  }
});
```

### 8.3 插件配置示例

#### 8.3.1 极简插件配置

```typescript
// 插件配置：只需要基本服务
userPlugin: [
  userPlugin,
  'scoped',
  {
    services: [UserValidationService, UserNotificationService],
    repositories: [UserPreferenceRepository]
  }
]
```

#### 8.3.2 复杂插件配置

```typescript
// 插件配置：需要自定义名称和作用域
paymentPlugin: [
  paymentPlugin,
  'scoped',
  {
    // 默认单例服务
    services: [PaymentConfigService, PaymentLoggerService],
    
    // 自定义名称的仓储
    repositories: {
      PaymentRepository,              // 默认名称
      paymentAudit: AuditRepository,  // 自定义名称
      paymentCache: CacheRepository   // 自定义名称
    },
    
    // 请求作用域服务
    scoped: {
      paymentProcessor: PaymentProcessingService,
      paymentValidator: PaymentValidationService,
      fraudDetector: FraudDetectionService
    },
    
    // 插件其他配置
    routes: '/api/payments',
    middleware: ['auth', 'rateLimit']
  }
]
```

## 9. 最佳实践

### 9.1 配置选择指南

```typescript
// 🎯 推荐：90%场景使用极简数组配置
di: {
  services: [UserService, EmailService, LoggerService],
  repositories: [UserRepository, PaymentRepository],
  scoped: [AuthService, PaymentService]
}

// 🎯 推荐：需要自定义名称时使用对象配置
di: {
  services: {
    UserService,                    // 默认名称
    emailSender: EmailService,      // 自定义名称
    logger: LoggerService           // 自定义名称
  }
}

// 🔧 高级：特殊需求时使用传统格式
di: {
  services: [
    [TransientService, { lifetime: 'TRANSIENT' }],
    { name: 'customService', implementation: CustomService, lifetime: 'SCOPED' }
  ]
}
```

### 9.2 命名约定

```typescript
// 🎯 自动生成的服务名称（推荐）
UserService       -> userService
EmailService      -> emailService  
PaymentService    -> paymentService
UserRepository    -> userRepository
PaymentRepository -> paymentRepository

// 🎯 自定义名称（当需要多个实例或特殊命名时）
di: {
  services: {
    UserService,                    // userService
    emailSender: EmailService,      // emailSender
    mailProcessor: EmailService,    // 同一个类的不同实例
    primary: DatabaseService,       // primary
    secondary: DatabaseService      // secondary
  }
}
```

### 9.3 生命周期选择指南

```typescript
// 🎯 SINGLETON（默认）- 应用级单例，适合无状态服务
di: {
  services: [
    ConfigService,      // ✅ 配置服务，全局唯一
    LoggerService,      // ✅ 日志服务，全局唯一
    EmailService,       // ✅ 邮件服务，无状态
    DatabaseService     // ✅ 数据库连接池，全局共享
  ]
}

// 🎯 SCOPED - 请求级实例，适合有状态的业务服务
di: {
  scoped: [
    AuthService,        // ✅ 认证服务，需要请求上下文
    PaymentService,     // ✅ 支付服务，涉及状态和事务
    SessionService,     // ✅ 会话服务，请求相关
    UserContextService  // ✅ 用户上下文，请求范围
  ]
}

// 🔧 TRANSIENT - 每次创建新实例（少用）
di: {
  transient: [
    ValidatorService,   // ✅ 验证器，轻量级工具
    EventEmitter,       // ✅ 事件发射器，一次性使用
    CommandHandler      // ✅ 命令处理器，无状态工具
  ]
}
```

### 9.4 配置组织建议

```typescript
// 🎯 推荐：按重要性和依赖关系组织
export default (sensitiveInfo: any) => ({
  di: {
    // === 第1层：基础设施服务（最先初始化） ===
    services: [
      ConfigService,        // 配置服务必须最先
      LoggerService,        // 日志服务
      DatabaseService,      // 数据库连接
      CacheService,         // 缓存服务
      QueueService          // 队列服务
    ],
    
    // === 第2层：业务服务 ===
    repositories: [
      UserRepository,       // 数据访问层
      PaymentRepository,
      OrderRepository
    ],
    
    // === 第3层：请求相关服务 ===
    scoped: [
      AuthService,          // 认证服务
      PaymentService,       // 支付处理
      OrderService          // 订单处理
    ]
  }
});

// 🎯 大项目推荐：使用对象配置便于管理
export default (sensitiveInfo: any) => ({
  di: {
    // 按功能模块分组
    services: {
      // 核心基础
      ConfigService,
      LoggerService,
      
      // 通信模块
      emailSender: EmailService,
      smsSender: SmsService,
      pushNotifier: PushNotificationService,
      
      // 外部集成
      paymentGateway: PaymentGatewayService,
      storageProvider: CloudStorageService,
      analyticsTracker: AnalyticsService
    }
  }
});
```

### 9.5 插件配置最佳实践

```typescript
// 🎯 简单插件：使用数组配置
userPlugin: [
  userPlugin,
  'scoped',
  {
    services: [UserValidationService, UserNotificationService],
    repositories: [UserProfileRepository]
  }
]

// 🎯 复杂插件：使用对象配置
paymentPlugin: [
  paymentPlugin,
  'scoped',
  {
    // 插件专用服务
    services: {
      PaymentConfigService,
      paymentLogger: LoggerService,       // 专用日志服务
      paymentValidator: ValidationService // 专用验证服务
    },
    
    // 数据访问层
    repositories: {
      PaymentRepository,
      paymentAudit: AuditRepository,
      paymentCache: CacheRepository
    },
    
    // 请求相关服务
    scoped: {
      paymentProcessor: PaymentProcessingService,
      fraudDetector: FraudDetectionService
    }
  }
]
```

### 9.6 错误处理和调试技巧

```typescript
// 🎯 在服务中注入日志服务便于调试
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private logger: Logger  // 注入日志服务
  ) {
    this.logger.debug('UserService 已初始化');
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    this.logger.info('开始创建用户', { email: userData.email });
    
    try {
      const user = await this.userRepository.create(userData);
      this.logger.info('用户创建成功', { userId: user.id });
      
      // 异步操作不阻塞主流程
      this.emailService.sendWelcomeEmail(user.email)
        .catch(error => this.logger.error('欢迎邮件发送失败', { error, userId: user.id }));
      
      return user;
    } catch (error) {
      this.logger.error('用户创建失败', { error, email: userData.email });
      throw error;
    }
  }
}

// 🎯 在路由中使用类型安全的依赖解析
export async function userRoutes(fastify: FastifyInstance) {
  fastify.post('/users', async (request, reply) => {
    // 类型安全的服务解析
    const userService = request.diScope.resolve<UserService>('userService');
    const logger = request.diScope.resolve<Logger>('logger');
    
    logger.info('创建用户请求', { ip: request.ip });
    
    const userData = request.body as CreateUserDto;
    const user = await userService.createUser(userData);
    
    return reply.code(201).send(user);
  });
}
```

### 9.7 性能优化建议

```typescript
// 🎯 合理选择生命周期，优化内存使用
di: {
  // 重对象使用单例，减少创建开销
  services: [
    DatabaseService,      // 数据库连接池，重对象
    RedisService,         // Redis客户端，重对象
    ElasticSearchService  // ES客户端，重对象
  ],
  
  // 轻对象可以使用请求作用域
  scoped: [
    UserContextService,   // 轻量级上下文
    ValidationService,    // 轻量级验证器
    FormatterService      // 轻量级格式化器
  ]
}

// 🎯 避免循环依赖
// ❌ 错误：UserService 依赖 OrderService，OrderService 又依赖 UserService
export class UserService {
  constructor(private orderService: OrderService) {}
}
export class OrderService {
  constructor(private userService: UserService) {}  // 循环依赖！
}

// ✅ 正确：通过共享的 Repository 或者事件总线解耦
export class UserService {
  constructor(private userRepository: UserRepository) {}
}
export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private userRepository: UserRepository  // 共享数据访问层
  ) {}
}
```

## 10. 总结

这个极简化的依赖注入设计具有以下特点：

### 10.1 优势

1. **零学习成本**：基于标准的 @fastify/awilix，开发者无需学习新概念
2. **极简配置**：90%场景只需列出类名，自动处理命名和生命周期
3. **完全类型安全**：所有依赖在配置文件中直接导入，享受完整 TypeScript 支持
4. **渐进式复杂度**：从最简单的数组配置到完全自定义，满足不同需求
5. **显式依赖**：所有依赖关系一目了然，便于理解和维护
6. **插件友好**：无缝集成到现有插件系统，支持相同的极简语法
7. **零魔法**：没有隐式行为，所有注册都是显式的

### 10.2 配置层次总结

```typescript
// 🎯 级别1：极简数组配置（90%场景）
di: {
  services: [UserService, EmailService],
  repositories: [UserRepository],
  scoped: [AuthService]
}

// 🎯 级别2：对象自定义配置（10%场景）
di: {
  services: {
    UserService,                    // 默认名称
    emailSender: EmailService       // 自定义名称
  }
}

// 🔧 级别3：高级传统配置（特殊需求）
di: {
  services: [
    [Service, { lifetime: 'TRANSIENT' }],
    { name: 'custom', implementation: Service, lifetime: 'SCOPED' }
  ]
}
```

### 10.3 使用场景

- ✅ **小到中型项目**：配置极简，依赖关系清晰
- ✅ **微服务架构**：每个服务的依赖都明确声明
- ✅ **团队协作**：新成员一看配置就理解依赖关系
- ✅ **类型安全要求高**：完整的 IDE 支持和编译时检查
- ✅ **快速原型开发**：最少的配置代码，快速启动

### 10.4 设计哲学

1. **选择极简而非复杂**：
   - 90%场景只需要列出类名
   - 自动推断服务名称和生命周期
   - 减少认知负担和配置错误

2. **选择显式而非隐式**：
   - 所有依赖在配置文件中明确导入
   - 避免路径扫描和自动发现的魔法行为
   - 让依赖关系一目了然

3. **选择渐进式而非一刀切**：
   - 提供三个复杂度级别的配置方式
   - 简单场景用简单语法，复杂场景用完整配置
   - 向后兼容，无缝升级

4. **选择类型安全而非运行时发现**：
   - 编译时就能发现依赖问题
   - 完整的 IDE 支持和自动补全
   - 重构友好，修改类名自动更新引用

### 10.5 实施建议

**第一步：从最简单开始**
```typescript
// 开始时使用最简单的配置
di: {
  services: [UserService, EmailService],
  repositories: [UserRepository]
}
```

**第二步：按需增加复杂度**
```typescript
// 当需要自定义名称时，切换到对象配置
di: {
  services: {
    UserService,
    emailSender: EmailService    // 需要自定义名称
  }
}
```

**第三步：特殊需求使用高级配置**
```typescript
// 只在确实需要特殊生命周期时使用传统格式
di: {
  services: [UserService],
  repositories: [UserRepository],
  transient: [ValidatorService]  // 特殊生命周期
}
```

这个设计确保了框架在保持最大简洁性的同时，提供强大而直观的依赖注入能力，让开发者能够专注于业务逻辑而不是配置复杂性。通过极简的配置语法，让依赖注入变得像声明变量一样简单，同时保持完整的类型安全和灵活性。 