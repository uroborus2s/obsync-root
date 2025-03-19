# Stratix框架核心设计文档

## 目录
- [Stratix框架核心设计文档](#stratix框架核心设计文档)
  - [目录](#目录)
  - [1. 框架概述](#1-框架概述)
  - [2. 使用方式](#2-使用方式)
    - [2.1 基本使用](#21-基本使用)
    - [2.2 插件注册](#22-插件注册)
      - [2.2.1 注册单个插件](#221-注册单个插件)
      - [2.2.2 注册具有依赖关系的插件](#222-注册具有依赖关系的插件)
      - [2.2.3 默认插件](#223-默认插件)
    - [2.3 依赖注入](#23-依赖注入)
      - [2.3.1 注册服务](#231-注册服务)
      - [2.3.2 使用服务](#232-使用服务)
    - [2.4 钩子与生命周期](#24-钩子与生命周期)
    - [2.5 错误处理](#25-错误处理)
    - [2.6 框架方法直接调用插件服务](#26-框架方法直接调用插件服务)
  - [3. 框架架构设计](#3-框架架构设计)
    - [3.1 核心架构](#31-核心架构)
    - [3.2 插件系统](#32-插件系统)
    - [3.3 依赖注入系统](#33-依赖注入系统)
    - [3.4 生命周期管理](#34-生命周期管理)
    - [3.5 默认插件集成](#35-默认插件集成)
  - [4. API设计](#4-api设计)
    - [4.1 框架API](#41-框架api)
      - [创建应用](#创建应用)
      - [应用实例API](#应用实例api)
    - [4.2 插件API](#42-插件api)
    - [4.3 钩子API](#43-钩子api)
  - [5. 实现细节](#5-实现细节)
    - [5.1 插件注册与解析实现](#51-插件注册与解析实现)
    - [5.2 依赖注入实现](#52-依赖注入实现)
    - [5.3 钩子系统实现](#53-钩子系统实现)
    - [5.4 装饰器系统实现](#54-装饰器系统实现)
    - [5.5 错误处理实现](#55-错误处理实现)
    - [5.6 默认插件实现](#56-默认插件实现)
    - [5.7 插件服务代理实现](#57-插件服务代理实现)
  - [6. 插件开发指南](#6-插件开发指南)
    - [6.1 插件结构与规范](#61-插件结构与规范)
      - [6.1.1 基本结构](#611-基本结构)
      - [6.1.2 命名规范](#612-命名规范)
      - [6.1.3 目录结构](#613-目录结构)
    - [6.2 创建插件的步骤](#62-创建插件的步骤)
      - [6.2.1 定义插件接口](#621-定义插件接口)
      - [6.2.2 实现插件主体](#622-实现插件主体)
      - [6.2.3 实现内部服务](#623-实现内部服务)
    - [6.3 松耦合设计原则](#63-松耦合设计原则)
      - [6.3.1 依赖声明与注入](#631-依赖声明与注入)
      - [6.3.2 服务抽象与接口](#632-服务抽象与接口)
      - [6.3.3 钩子与装饰器](#633-钩子与装饰器)
    - [6.4 与其他插件交互](#64-与其他插件交互)
      - [6.4.1 使用依赖注入](#641-使用依赖注入)
      - [6.4.2 钩子通信机制](#642-钩子通信机制)
      - [6.4.3 检测与使用可选插件](#643-检测与使用可选插件)
    - [6.5 插件测试](#65-插件测试)
      - [6.5.1 单元测试](#651-单元测试)
      - [6.5.2 集成测试](#652-集成测试)
    - [6.6 插件最佳实践](#66-插件最佳实践)
      - [6.6.1 配置验证](#661-配置验证)
      - [6.6.2 优雅的错误处理](#662-优雅的错误处理)
      - [6.6.3 资源清理](#663-资源清理)
      - [6.6.4 性能考虑](#664-性能考虑)
      - [6.6.5 插件文档化](#665-插件文档化)
  - [使用方法](#使用方法)
  - [配置选项](#配置选项)
  - [API](#api)
    - [myService](#myservice)
      - [`doSomething(data: any): Promise<Result>`](#dosomethingdata-any-promiseresult)
      - [`getStatus(): string`](#getstatus-string)
  - [钩子](#钩子)
  - [兼容性](#兼容性)
      - [6.7.2 插件组合模式](#672-插件组合模式)
      - [6.7.3 插件扩展点模式](#673-插件扩展点模式)

## 1. 框架概述

Stratix是一个基于Node.js的轻量级应用框架，采用插件化架构，遵循函数式编程思想，追求简洁、透明和组合性。框架的核心理念是"一切皆插件"，所有功能模块（如路由、ORM、缓存、日志等）都作为插件实现，并可以自由组合。

核心特点：
- **插件化架构**：所有功能通过插件实现和扩展
- **依赖注入**：基于awilix提供强大的依赖注入能力
- **生命周期钩子**：支持框架和插件生命周期管理
- **封装与装饰器**：支持插件间的封装和扩展
- **类型安全**：使用TypeScript开发，提供完整类型定义
- **默认插件**：提供日志和定时任务等核心功能作为默认插件
- **插件服务代理**：支持通过框架实例直接调用插件服务

## 2. 使用方式

### 2.1 基本使用

```typescript
// 创建应用实例
import { createApp } from 'stratix';

// 创建应用
const app = createApp({
  name: 'my-app',
  logger: {
    level: 'info'
  }
});

// 注册插件
app.register(require('@stratix/web'), {
  port: 3000
});

// 启动应用
await app.start();

// 使用默认日志插件
app.log.info('应用已启动');

// 使用默认cron插件
app.cron.schedule('*/5 * * * *', () => {
  console.log('每5分钟执行一次');
});

// 优雅关闭
process.on('SIGTERM', async () => {
  await app.close();
});
```

### 2.2 插件注册

插件是Stratix的核心概念，所有功能都通过插件实现。

#### 2.2.1 注册单个插件

```typescript
// 引入插件
import webPlugin from '@stratix/web';
import dbPlugin from '@stratix/database';

// 注册插件
app.register(webPlugin, { port: 3000 });

// 链式调用
app.register(dbPlugin, {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'my_db',
    user: 'username',
    password: 'password'
  }
}).register(require('./plugins/myPlugin'), { 
  // 插件选项 
});
```

#### 2.2.2 注册具有依赖关系的插件

```typescript
// 注册有依赖的插件
app.register(require('@stratix/web-auth'), {
  // 此插件依赖 web 和 database 插件
  secretKey: 'my-secret-key',
  tokenExpiration: '1h'
});

// 手动指定插件依赖
const myPlugin = {
  name: 'myFeature',
  dependencies: ['web', 'database'],
  register: async (app, options) => {
    // 插件实现...
  }
};

app.register(myPlugin, { /* options */ });
```

#### 2.2.3 默认插件

Stratix框架内置了一些默认插件，这些插件会在应用创建时自动加载，无需手动注册：

```typescript
// 创建应用时自动加载默认插件
const app = createApp({
  // 配置默认插件
  logger: {
    level: 'info',
    prettyPrint: true
  },
  cron: {
    timezone: 'Asia/Shanghai'
  }
});

// 禁用某个默认插件
const app = createApp({
  plugins: {
    logger: false, // 禁用默认日志插件
    cron: {        // 启用并配置定时任务插件
      timezone: 'UTC'
    }
  }
});

// 自定义默认插件列表
const app = createApp({
  defaultPlugins: ['logger'], // 只加载logger作为默认插件
  plugins: {
    logger: {
      level: 'debug'
    }
  }
});
```

### 2.3 依赖注入

Stratix使用awilix提供依赖注入系统，使模块间解耦。

#### 2.3.1 注册服务

```typescript
// 注册单个服务
app.inject('userService', async (container) => {
  const db = await container.resolve('db');
  const logger = await container.resolve('logger');
  
  return {
    findById: async (id) => {
      logger.debug(`Finding user by id: ${id}`);
      return db.users.findById(id);
    },
    create: async (userData) => {
      logger.debug('Creating new user');
      return db.users.create(userData);
    }
  };
});

// 注册类服务
class OrderService {
  constructor({ db, logger }) {
    this.db = db;
    this.logger = logger;
  }
  
  async getOrders(userId) {
    this.logger.debug(`Getting orders for user: ${userId}`);
    return this.db.orders.findByUserId(userId);
  }
}

app.injectClass('orderService', OrderService);
```

#### 2.3.2 使用服务

```typescript
// 在插件内使用服务
app.register(async (app, options) => {
  const userService = await app.resolve('userService');
  const orderService = await app.resolve('orderService');
  
  app.get('/api/users/:id/orders', async (req, reply) => {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    const orders = await orderService.getOrders(user.id);
    return { user, orders };
  });
});

// 直接使用
const start = async () => {
  const userService = await app.resolve('userService');
  const user = await userService.findById('123');
  console.log(user);
};
```

### 2.6 框架方法直接调用插件服务

Stratix支持通过框架实例直接调用插件服务，无需手动解析依赖：

```typescript
// 创建应用实例
const app = createApp();

// 注册自定义插件
app.register(require('@stratix/redis'), {
  host: 'localhost',
  port: 6379
});

// 启动应用
await app.start();

// 直接通过框架实例调用插件服务
await app.redis.set('key', 'value');
const value = await app.redis.get('key');

// 使用默认插件服务
app.log.info('这是一条日志'); // 使用日志插件
app.cron.schedule('* * * * *', () => { // 使用定时任务插件
  console.log('每分钟执行一次');
});

// 插件方法可以链式调用
app.log.child({ module: 'auth' }).info('用户登录成功');
```

## 3. 框架架构设计

### 3.1 核心架构

Stratix的核心架构由以下组件构成：

```
┌─────────────────────────────────────────┐
│              Stratix App                │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────┐       ┌──────────────┐  │
│  │  Plugin    │       │  Dependency  │  │
│  │  System    │◄─────►│  Injection   │  │
│  └────────────┘       └──────────────┘  │
│         ▲                    ▲          │
│         │                    │          │
│         ▼                    ▼          │
│  ┌────────────┐       ┌──────────────┐  │
│  │ Lifecycle  │       │    Config    │  │
│  │   Hooks    │◄─────►│    System    │  │
│  └────────────┘       └──────────────┘  │
│         ▲                    ▲          │
│         │                    │          │
│         ▼                    ▼          │
│  ┌────────────┐       ┌──────────────┐  │
│  │ Decorator  │       │    Error     │  │
│  │  System    │◄─────►│   Handling   │  │
│  └────────────┘       └──────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 插件系统

插件系统是Stratix的核心，提供了一种模块化、可扩展的方式组织应用。

**设计原则**:
- 插件是自包含的功能单元
- 插件可以依赖其他插件
- 插件可以装饰应用实例，添加新功能
- 插件具有隔离的作用域和上下文

**插件生命周期**:
1. 注册 (register)：插件通过`app.register()`注册
2. 初始化 (initialize)：在应用启动前初始化插件
3. 运行 (ready)：插件在应用运行时处于活跃状态
4. 卸载 (unregister)：应用关闭时卸载插件

**插件封装**:
```typescript
// 插件内部作用域示例
app.register(async (app, options) => {
  // 这里定义的装饰器只在这个插件作用域内可见
  app.decorate('util', {
    helper: () => 'helper'
  });
  
  // 嵌套插件继承父插件作用域
  app.register(async (childApp, childOptions) => {
    // 可以访问父插件的装饰器
    childApp.util.helper();
  });
});

// 另一个插件无法访问其他插件的作用域装饰器
app.register(async (anotherApp, options) => {
  // 这里将会抛出错误
  // anotherApp.util 未定义
});
```

### 3.3 依赖注入系统

Stratix使用awilix实现依赖注入，遵循以下原则：

**容器设计**:
- 每个应用实例有一个根容器
- 每个插件可以有自己的子容器
- 容器之间形成层级关系，子容器可以解析父容器中的依赖

**注入方式**:
- 函数注入：`app.inject('name', factory)`
- 值注入：`app.injectValue('name', value)`
- 类注入：`app.injectClass('name', Class)`

**解析策略**:
- 懒加载：依赖在首次请求时初始化
- 单例：默认每个依赖项只实例化一次
- 作用域：支持请求级别的作用域

### 3.4 生命周期管理

Stratix定义了明确的应用生命周期，并在关键节点提供了钩子：

**应用生命周期**:
1. 创建 (Create): 应用实例创建
2. 注册 (Register): 插件注册阶段
3. 初始化 (Initialize): 系统初始化
4. 启动 (Start): 应用启动
5. 运行 (Running): 应用运行
6. 关闭 (Close): 应用关闭

**钩子类型**:
- `beforeRegister`: 插件注册前执行
- `afterRegister`: 插件注册后执行
- `beforeStart`: 应用启动前执行
- `afterStart`: 应用启动后执行
- `beforeClose`: 应用关闭前执行
- `afterClose`: 应用关闭后执行

**钩子执行顺序**:
- 钩子按注册顺序同步执行
- 插件钩子在全局钩子之后执行
- 父插件钩子在子插件钩子之前执行

### 3.5 默认插件集成

Stratix框架默认集成了几个核心插件，无需显式注册即可使用：

**默认插件架构**:
```
┌─────────────────────────────────────────┐
│              Stratix App                │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────────┐ │
│  │          Default Plugins           │ │
│  │                                    │ │
│  │    ┌──────────┐    ┌───────────┐   │ │
│  │    │  Logger  │    │   Cron    │   │ │
│  │    └──────────┘    └───────────┘   │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                   ▲                     │
│                   │                     │
│  ┌────────────────┼────────────────────┐│
│  │                │                    ││
│  │     User Registered Plugins         ││
│  │                                    ││
│  └────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

**默认插件加载流程**:
1. 创建应用实例时自动加载默认插件
2. 应用配置可覆盖默认插件配置
3. 用户可禁用特定默认插件
4. 自定义插件可依赖默认插件

**服务代理机制**:
1. 框架初始化时注册插件服务代理
2. 代理允许通过`app.插件名`直接访问插件服务
3. 内部通过依赖注入系统解析实际服务实例
4. 保留类型安全和自动完成能力

## 4. API设计

### 4.1 框架API

#### 创建应用

```typescript
interface AppOptions {
  name?: string;
  logger?: LoggerOptions;
  env?: string;
  plugins?: Record<string, any>;
}

function createApp(options?: AppOptions): StratixApp;
```

#### 应用实例API

```typescript
interface StratixApp {
  // 插件注册
  register(plugin: StratixPlugin | Function, options?: any): StratixApp;
  
  // 依赖注入
  inject(name: string, factory: (container: Container) => any): StratixApp;
  injectValue(name: string, value: any): StratixApp;
  injectClass(name: string, constructor: any, options?: any): StratixApp;
  resolve<T>(name: string): Promise<T>;
  
  // 钩子系统
  hook(name: string, handler: HookHandler): StratixApp;
  addHook(name: string, handler: HookHandler): StratixApp;
  
  // 装饰器
  decorate(name: string, value: any): StratixApp;
  decorateRequest(name: string, value: any): StratixApp;
  decorateReply(name: string, value: any): StratixApp;
  hasDecorator(name: string): boolean;
  
  // 生命周期
  start(): Promise<void>;
  close(): Promise<void>;
  ready(): Promise<void>;
  
  // 错误处理
  setErrorHandler(handler: ErrorHandler): StratixApp;
  createError(name: string, options?: ErrorOptions): ErrorConstructor;
  
  // 配置
  config<T>(key?: string, defaultValue?: T): T;
  setConfig(key: string, value: any): StratixApp;
  
  // 日志
  log: Logger;
}
```

### 4.2 插件API

```typescript
interface StratixPlugin {
  name: string;
  dependencies?: string[];
  register: PluginRegisterFunction;
  options?: any;
}

type PluginRegisterFunction = (
  app: StratixApp,
  options: any
) => Promise<void> | void;
```

### 4.3 钩子API

```typescript
type HookHandler = (payload?: any) => Promise<void> | void;

interface Hooks {
  beforeRegister: HookHandler[];
  afterRegister: HookHandler[];
  beforeStart: HookHandler[];
  afterStart: HookHandler[];
  beforeClose: HookHandler[];
  afterClose: HookHandler[];
  [key: string]: HookHandler[];
}
```

## 5. 实现细节

### 5.1 插件注册与解析实现

```typescript
// 插件注册内部实现
private async registerPlugin(plugin: StratixPlugin | Function, options: any = {}): Promise<void> {
  // 标准化插件
  const normalizedPlugin = this.normalizePlugin(plugin);
  
  // 检查插件依赖
  await this.checkPluginDependencies(normalizedPlugin);
  
  // 创建插件实例上下文
  const pluginInstance = new PluginInstance(this, normalizedPlugin, options);
  
  // 执行钩子
  await this.runHook('beforeRegister', { plugin: normalizedPlugin });
  
  // 执行插件注册函数
  await normalizedPlugin.register(pluginInstance, options);
  
  // 存储插件实例
  this.plugins.set(normalizedPlugin.name, pluginInstance);
  
  // 执行钩子
  await this.runHook('afterRegister', { plugin: normalizedPlugin });
}
```

### 5.2 依赖注入实现

```typescript
// 基于awilix的依赖注入实现
import { createContainer, asFunction, asValue, asClass } from 'awilix';

// 创建容器
private createDIContainer() {
  this.container = createContainer();
  
  // 注册框架核心服务
  this.container.register({
    app: asValue(this),
    config: asFunction(() => this.config).singleton(),
    logger: asFunction(() => this.logger).singleton()
  });
}

// 服务注入
public inject(name: string, factory: (container: any) => any): StratixApp {
  this.container.register({
    [name]: asFunction((container) => factory(container)).singleton()
  });
  return this;
}

// 服务解析
public async resolve<T>(name: string): Promise<T> {
  try {
    return this.container.resolve(name);
  } catch (err) {
    throw new Error(`Cannot resolve dependency '${name}': ${err.message}`);
  }
}
```

### 5.3 钩子系统实现

```typescript
// 钩子系统实现
private hooks: Hooks = {
  beforeRegister: [],
  afterRegister: [],
  beforeStart: [],
  afterStart: [],
  beforeClose: [],
  afterClose: []
};

// 添加钩子
public hook(name: string, handler: HookHandler): StratixApp {
  if (!this.hooks[name]) {
    this.hooks[name] = [];
  }
  this.hooks[name].push(handler);
  return this;
}

// 执行钩子
private async runHook(name: string, payload?: any): Promise<void> {
  if (!this.hooks[name]) return;
  
  for (const handler of this.hooks[name]) {
    await handler(payload);
  }
}
```

### 5.4 装饰器系统实现

```typescript
// 装饰器系统实现
private decorators: Map<string, any> = new Map();

// 添加装饰器
public decorate(name: string, value: any): StratixApp {
  if (this.hasDecorator(name)) {
    throw new Error(`Decorator '${name}' already exists`);
  }
  
  this.decorators.set(name, value);
  
  // 添加到实例
  this[name] = value;
  
  return this;
}

// 检查装饰器存在
public hasDecorator(name: string): boolean {
  return this.decorators.has(name) || name in this;
}
```

### 5.5 错误处理实现

```typescript
// 错误处理实现
private defaultErrorHandler: ErrorHandler = (err, req, reply) => {
  this.log.error(err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  reply.code(statusCode).send({ error: message });
};

private errorHandler: ErrorHandler = this.defaultErrorHandler;

// 设置错误处理
public setErrorHandler(handler: ErrorHandler): StratixApp {
  this.errorHandler = handler;
  return this;
}

// 创建自定义错误
public createError(name: string, options: ErrorOptions = {}): ErrorConstructor {
  class CustomError extends Error {
    constructor(message: string) {
      super(message);
      this.name = name;
      this.statusCode = options.statusCode || 500;
      
      // 捕获堆栈跟踪
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // 添加到错误集合
  this.errors[name] = CustomError;
  
  return CustomError;
}
```

### 5.6 默认插件实现

框架在初始化过程中会自动加载并初始化默认插件：

```typescript
// 默认插件加载流程伪代码
function createApp(options: AppOptions): StratixApp {
  const app = new StratixApp(options);
  
  // 获取默认插件列表
  const defaultPlugins = options.defaultPlugins || ['logger', 'cron'];
  
  // 加载默认插件
  for (const pluginName of defaultPlugins) {
    // 检查是否禁用
    if (options.plugins && options.plugins[pluginName] === false) {
      continue;
    }
    
    // 获取插件配置
    const pluginOptions = (options.plugins && options.plugins[pluginName]) || {};
    
    // 加载并注册插件
    const plugin = require(`@stratix/${pluginName}`);
    app.register(plugin, pluginOptions);
  }
  
  return app;
}
```

**核心默认插件**:

1. **日志插件 (@stratix/logger)**
   - 提供全局日志记录能力
   - 支持多级别日志和格式化
   - 在`app.log`上暴露方法

2. **定时任务插件 (@stratix/cron)**
   - 提供任务调度和定时执行功能
   - 支持cron表达式
   - 在`app.cron`上暴露方法

### 5.7 插件服务代理实现

框架使用代理模式实现对插件服务的直接访问：

```typescript
// 插件服务代理实现伪代码
function setupPluginProxy(app: StratixApp, pluginName: string): void {
  // 使用代理捕获属性访问
  Object.defineProperty(app, pluginName, {
    get: function() {
      // 懒加载机制，首次访问时解析服务
      if (!this._pluginProxies[pluginName]) {
        // 通过依赖注入解析实际服务
        this._pluginProxies[pluginName] = app.container.resolve(pluginName);
      }
      return this._pluginProxies[pluginName];
    }
  });
}

// 注册插件时自动设置代理
StratixApp.prototype.register = async function(plugin, options) {
  // 原有注册逻辑...
  
  // 注册完成后设置服务代理
  if (plugin.name) {
    setupPluginProxy(this, plugin.name);
  }
  
  return this;
};
```

## 6. 插件开发指南

插件是Stratix框架的核心扩展机制，通过插件可以扩展框架功能并保持松耦合设计。本章节将详细介绍如何开发一个高质量的Stratix插件。

### 6.1 插件结构与规范

#### 6.1.1 基本结构

一个标准的Stratix插件应包含以下要素：

```typescript
// 插件定义
const myPlugin: StratixPlugin = {
  // 插件名称（必需），作为插件标识
  name: 'my-plugin',
  
  // 依赖的其他插件（可选）
  dependencies: ['logger', 'config'],
  
  // 注册函数（必需），插件的主要实现
  register: async (app, options) => {
    // 插件实现代码
  }
};

// 导出插件
export default myPlugin;
```

#### 6.1.2 命名规范

- 插件名称应该简洁、描述性强，并遵循小写字母和连字符的命名风格
- 官方插件使用`@stratix/`前缀，如`@stratix/web`
- 第三方插件可使用`stratix-`前缀，如`stratix-auth`
- 项目内部插件可使用项目特定前缀，如`myapp-admin`

#### 6.1.3 目录结构

推荐的插件目录结构：

```
my-plugin/
├── src/
│   ├── index.ts          # 主入口，导出插件
│   ├── types.ts          # 类型定义
│   ├── errors.ts         # 自定义错误类型
│   ├── utils/            # 工具函数
│   ├── services/         # 内部服务实现
│   └── hooks/            # 钩子实现
├── test/                 # 单元测试
├── package.json          # 包配置
├── tsconfig.json         # TypeScript配置
└── README.md             # 文档
```

### 6.2 创建插件的步骤

#### 6.2.1 定义插件接口

首先为插件定义明确的接口和类型：

```typescript
// types.ts
export interface MyPluginOptions {
  // 插件配置选项
  enabled?: boolean;
  timeout?: number;
  // ...其他选项
}

export interface MyService {
  // 插件提供的服务接口
  doSomething(data: any): Promise<any>;
  getStatus(): string;
}
```

#### 6.2.2 实现插件主体

```typescript
// index.ts
import type { StratixPlugin } from 'stratix';
import type { MyPluginOptions } from './types';
import { createMyService } from './services/my-service';

const myPlugin: StratixPlugin = {
  name: 'my-plugin',
  dependencies: ['logger'],
  register: async (app, options: MyPluginOptions = {}) => {
    // 1. 合并默认选项
    const pluginOptions = {
      enabled: true,
      timeout: 3000,
      ...options
    };
    
    // 2. 验证配置
    if (pluginOptions.timeout < 0) {
      throw new Error('timeout must be non-negative');
    }
    
    // 3. 获取依赖
    const logger = await app.resolve('logger');
    
    // 4. 创建服务
    const myService = createMyService(pluginOptions, { logger });
    
    // 5. 注册服务到DI容器
    app.inject('myService', () => myService);
    
    // 6. 装饰应用实例（可选）
    app.decorate('myUtil', {
      helper: () => 'helping you'
    });
    
    // 7. 添加钩子（可选）
    app.hook('beforeStart', async () => {
      logger.info('My plugin is starting');
      await myService.initialize();
    });
    
    app.hook('beforeClose', async () => {
      logger.info('My plugin is shutting down');
      await myService.cleanup();
    });
    
    // 8. 暴露自定义钩子（可选）
    app.addHook('beforeMyOperation', async (payload) => {
      // 自定义钩子实现
    });
    
    // 9. 注册错误类型（可选）
    app.createError('MyPluginError', { statusCode: 400 });
    
    // 10. 日志记录
    logger.info('My plugin registered successfully');
  }
};

export default myPlugin;
```

#### 6.2.3 实现内部服务

```typescript
// services/my-service.ts
import type { Logger } from '@stratix/logger';
import type { MyPluginOptions, MyService } from '../types';

export function createMyService(
  options: MyPluginOptions,
  dependencies: { logger: Logger }
): MyService {
  const { logger } = dependencies;
  
  // 私有状态
  let isInitialized = false;
  
  return {
    async initialize() {
      logger.debug('Initializing MyService');
      // 初始化逻辑
      isInitialized = true;
    },
    
    async doSomething(data: any) {
      if (!isInitialized) {
        throw new Error('MyService not initialized');
      }
      
      logger.debug({ data }, 'Doing something with data');
      // 实现业务逻辑
      return { success: true, result: data };
    },
    
    getStatus() {
      return isInitialized ? 'ready' : 'not_initialized';
    },
    
    async cleanup() {
      logger.debug('Cleaning up MyService');
      // 清理资源
      isInitialized = false;
    }
  };
}
```

### 6.3 松耦合设计原则

#### 6.3.1 依赖声明与注入

插件应明确声明其依赖关系，但与依赖保持松散耦合：

```typescript
// 正确方式：通过依赖注入获取依赖
const myPlugin = {
  name: 'my-plugin',
  dependencies: ['logger', 'database'],
  register: async (app, options) => {
    // 运行时解析依赖
    const logger = await app.resolve('logger');
    const db = await app.resolve('database');
    
    // 使用依赖
  }
};

// 错误方式：直接导入依赖模块
import logger from '@stratix/logger'; // 避免这样做
import db from '@stratix/database';   // 避免这样做
```

#### 6.3.2 服务抽象与接口

使用接口和抽象来定义服务，而不是具体实现：

```typescript
// 定义接口
interface StorageService {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
}

// 注册实现
app.inject('storage', async (container) => {
  // 根据配置选择具体实现
  const config = await container.resolve('config');
  
  if (config.storage.type === 'redis') {
    const redis = await container.resolve('redis');
    return createRedisStorage(redis);
  } else {
    return createFileStorage(config.storage.path);
  }
});

// 使用接口
app.register(async (app) => {
  const storage = await app.resolve<StorageService>('storage');
  
  // 通过接口使用，不关心具体实现
  await storage.save('key', { value: 'data' });
});
```

#### 6.3.3 钩子与装饰器

通过钩子和装饰器扩展功能，而不是直接修改对象：

```typescript
// 使用钩子扩展功能
app.hook('afterUserCreated', async (user) => {
  // 发送欢迎邮件
  const emailService = await app.resolve('email');
  await emailService.sendWelcomeEmail(user);
});

// 使用装饰器添加功能
app.register(async (app) => {
  const originalSend = app.reply.send;
  
  // 装饰reply.send方法
  app.decorateReply('send', function(payload) {
    // 添加版本信息
    if (typeof payload === 'object' && payload !== null) {
      payload.apiVersion = 'v1';
    }
    
    // 调用原始方法
    return originalSend.call(this, payload);
  });
});
```

### 6.4 与其他插件交互

#### 6.4.1 使用依赖注入

插件间交互的主要方式是通过依赖注入容器：

```typescript
// 插件A：注册服务
app.register(async (app) => {
  // 注册服务
  app.inject('userManager', () => {
    return {
      findById: async (id) => { /* ... */ },
      create: async (data) => { /* ... */ }
    };
  });
});

// 插件B：使用服务
app.register(async (app) => {
  // 解析服务
  const userManager = await app.resolve('userManager');
  
  // 使用服务
  app.get('/api/users/:id', async (req, reply) => {
    const user = await userManager.findById(req.params.id);
    return user;
  });
});
```

#### 6.4.2 钩子通信机制

通过钩子系统进行松散耦合的事件驱动通信：

```typescript
// 插件A：添加钩子点
app.register(async (app) => {
  // 注册钩子点
  app.addHook('onUserAction', async (action, user) => {
    // 默认实现或空实现
  });
  
  // 在适当的地方触发钩子
  app.post('/api/users/:id/action', async (req, reply) => {
    const user = await getUserById(req.params.id);
    const action = req.body.action;
    
    // 触发钩子
    await app.runHook('onUserAction', action, user);
    
    return { success: true };
  });
});

// 插件B：监听钩子
app.register(async (app) => {
  // 添加钩子处理器
  app.hook('onUserAction', async (action, user) => {
    // 记录用户行为
    const analyticsService = await app.resolve('analytics');
    await analyticsService.trackUserAction(user.id, action);
  });
});
```

#### 6.4.3 检测与使用可选插件

处理可选依赖，使插件更灵活：

```typescript
// 检测可选插件是否存在
app.register(async (app) => {
  // 检查插件是否已注册
  const hasCachePlugin = app.hasPlugin('cache');
  
  if (hasCachePlugin) {
    // 使用缓存插件功能
    const cache = await app.resolve('cache');
    
    // 实现带缓存的逻辑
    app.inject('dataService', () => {
      return {
        async getData(id) {
          // 先尝试从缓存获取
          const cached = await cache.get(`data:${id}`);
          if (cached) return cached;
          
          // 缓存未命中，从源获取
          const data = await fetchFromSource(id);
          
          // 存入缓存
          await cache.set(`data:${id}`, data, 3600);
          
          return data;
        }
      };
    });
  } else {
    // 降级实现：无缓存版本
    app.inject('dataService', () => {
      return {
        async getData(id) {
          // 直接从源获取
          return await fetchFromSource(id);
        }
      };
    });
  }
});
```

### 6.5 插件测试

#### 6.5.1 单元测试

针对插件各组件的单元测试：

```typescript
// 服务测试示例
import { createMyService } from '../src/services/my-service';

describe('MyService', () => {
  // 创建模拟依赖
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  
  // 创建服务实例
  const service = createMyService(
    { timeout: 1000 },
    { logger: mockLogger }
  );
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('initialize sets service to ready state', async () => {
    await service.initialize();
    expect(service.getStatus()).toBe('ready');
    expect(mockLogger.debug).toHaveBeenCalledWith('Initializing MyService');
  });
  
  test('doSomething processes data correctly', async () => {
    await service.initialize();
    const result = await service.doSomething({ test: 'data' });
    expect(result.success).toBe(true);
    expect(result.result).toEqual({ test: 'data' });
  });
});
```

#### 6.5.2 集成测试

测试插件与框架的集成：

```typescript
import { createApp } from 'stratix';
import myPlugin from '../src';

describe('MyPlugin Integration', () => {
  let app;
  
  beforeEach(async () => {
    // 创建干净的应用实例
    app = createApp();
    
    // 注册插件
    app.register(myPlugin, { timeout: 1000 });
    
    // 启动应用
    await app.start();
  });
  
  afterEach(async () => {
    // 关闭应用
    await app.close();
  });
  
  test('plugin registers myService correctly', async () => {
    const myService = await app.resolve('myService');
    expect(myService).toBeDefined();
    expect(typeof myService.doSomething).toBe('function');
  });
  
  test('plugin decorates app with myUtil', async () => {
    expect(app.myUtil).toBeDefined();
    expect(app.myUtil.helper()).toBe('helping you');
  });
  
  test('plugin works with other plugins', async () => {
    // 注册模拟插件
    app.register(async (app) => {
      // 使用myPlugin功能
      const myService = await app.resolve('myService');
      const result = await myService.doSomething({ test: true });
      
      // 验证结果
      expect(result.success).toBe(true);
    });
  });
});
```

### 6.6 插件最佳实践

#### 6.6.1 配置验证

始终验证插件配置，提供有意义的错误信息：

```typescript
// 配置验证示例
function validateOptions(options) {
  const errors = [];
  
  if (options.timeout !== undefined && typeof options.timeout !== 'number') {
    errors.push('timeout must be a number');
  }
  
  if (options.retries !== undefined && 
      (typeof options.retries !== 'number' || options.retries < 0)) {
    errors.push('retries must be a non-negative number');
  }
  
  if (options.mode && !['sync', 'async'].includes(options.mode)) {
    errors.push('mode must be either "sync" or "async"');
  }
  
  if (errors.length > 0) {
    throw new Error(`Invalid plugin options: ${errors.join(', ')}`);
  }
}
```

#### 6.6.2 优雅的错误处理

使用自定义错误类型并提供清晰的上下文：

```typescript
// 自定义错误类型
class MyPluginError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MyPluginError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 在插件中注册错误
app.register(async (app) => {
  // 注册错误类型
  app.errors.MyPluginError = MyPluginError;
  
  // 使用错误
  app.get('/api/resource', async (req, reply) => {
    try {
      // 业务逻辑
    } catch (err) {
      throw new app.errors.MyPluginError(
        'Failed to process resource',
        'RESOURCE_ERROR',
        { originalError: err.message }
      );
    }
  });
});
```

#### 6.6.3 资源清理

确保插件正确处理资源的生命周期：

```typescript
// 资源管理示例
app.register(async (app, options) => {
  // 创建资源
  const resource = await createResource(options);
  
  // 注册服务
  app.inject('resourceService', () => resource);
  
  // 添加清理钩子
  app.hook('beforeClose', async () => {
    // 清理资源
    await resource.close();
  });
});
```

#### 6.6.4 性能考虑

设计插件时注重性能：

```typescript
// 添加缓存优化
app.register(async (app) => {
  // 内存缓存
  const cache = new Map();
  
  // 注册带缓存的服务
  app.inject('computeService', () => {
    return {
      compute: async (input) => {
        // 检查缓存
        const cacheKey = JSON.stringify(input);
        if (cache.has(cacheKey)) {
          return cache.get(cacheKey);
        }
        
        // 执行计算（假设这是耗时操作）
        const result = await performHeavyComputation(input);
        
        // 存入缓存
        cache.set(cacheKey, result);
        
        return result;
      }
    };
  });
  
  // 定期清理缓存
  const cleanup = setInterval(() => {
    cache.clear();
  }, 3600 * 1000); // 每小时清理
  
  // 应用关闭时停止定时器
  app.hook('beforeClose', () => {
    clearInterval(cleanup);
  });
});
```

#### 6.6.5 插件文档化

提供清晰的文档，包括用法示例：

```markdown
# My Plugin

为Stratix框架提供XYZ功能的插件。

## 安装

```bash
npm install stratix-my-plugin
```

## 使用方法

```typescript
import { createApp } from 'stratix';
import myPlugin from 'stratix-my-plugin';

const app = createApp();

// 注册插件
app.register(myPlugin, {
  timeout: 5000,
  retries: 3
});

// 使用插件提供的服务
app.register(async (app) => {
  const myService = await app.resolve('myService');
  
  app.get('/api/test', async (req, reply) => {
    const result = await myService.doSomething(req.query);
    return result;
  });
});
```

## 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `timeout` | number | 3000 | 操作超时时间(毫秒) |
| `retries` | number | 0 | 失败重试次数 |
| `mode` | string | 'async' | 操作模式，'sync'或'async' |

## API

### myService

插件注册的主要服务。

#### `doSomething(data: any): Promise<Result>`

处理提供的数据并返回结果。

#### `getStatus(): string`

返回服务当前状态。

## 钩子

插件增加了以下钩子点：

- `beforeMyOperation`: 在操作执行前触发
- `afterMyOperation`: 在操作完成后触发

## 兼容性

- Stratix ^1.0.0
- Node.js >=14
```

### 6.7 高级插件模式

#### 6.7.1 插件工厂模式

创建可配置的插件工厂：

```typescript
// 插件工厂
export function createMyPlugin(factoryOptions = {}) {
  return {
    name: 'my-plugin',
    dependencies: ['logger'],
    register: async (app, options = {}) => {
      // 合并工厂选项和实例选项
      const mergedOptions = {
        ...factoryOptions,
        ...options
      };
      
      // 插件实现
      // ...
    }
  };
}

// 使用工厂创建插件
const myPlugin = createMyPlugin({
  defaultMode: 'advanced',
  maxRetries: 5
});

app.register(myPlugin, {
  // 实例特定选项
  timeout: 2000
});
```

#### 6.7.2 插件组合模式

将多个相关插件组合成一个：

```typescript
// 插件组合器
export function createPluginBundle(options = {}) {
  return {
    name: 'my-bundle',
    register: async (app, bundleOptions = {}) => {
      // 合并选项
      const mergedOptions = { ...options, ...bundleOptions };
      
      // 注册组件插件
      await app.register(require('./plugins/core'), {
        ...mergedOptions.core
      });
      
      await app.register(require('./plugins/auth'), {
        ...mergedOptions.auth
      });
      
      await app.register(require('./plugins/api'), {
        ...mergedOptions.api
      });
      
      // 添加额外功能
      app.decorate('bundle', {
        version: '1.0.0',
        getInfo: () => ({
          name: 'my-bundle',
          plugins: ['core', 'auth', 'api']
        })
      });
    }
  };
}

// 使用插件包
const bundle = createPluginBundle({
  // 默认配置
});

app.register(bundle, {
  // 特定配置
  core: { /* 核心插件配置 */ },
  auth: { /* 认证插件配置 */ },
  api: { /* API插件配置 */ }
});
```

#### 6.7.3 插件扩展点模式

创建可扩展的插件：

```typescript
// 具有扩展点的插件
app.register(async (app, options) => {
  // 存储扩展处理器
  const extensions = new Map();
  
  // 注册扩展点API
  app.decorate('extendMyPlugin', (point, handler) => {
    if (!extensions.has(point)) {
      extensions.set(point, []);
    }
    
    extensions.get(point).push(handler);
  });
  
  // 扩展点执行器
  const runExtensions = async (point, ...args) => {
    if (!extensions.has(point)) return;
    
    for (const handler of extensions.get(point)) {
      await handler(...args);
    }
  };
  
  // 在核心功能中使用扩展点
  app.get('/api/resource', async (req, reply) => {
    // 前置扩展点
    await runExtensions('beforeGetResource', req);
    
    // 核心逻辑
    const resource = await getResource(req.query);
    
    // 后置扩展点（可以修改结果）
    await runExtensions('afterGetResource', resource, req);
    
    return resource;
  });
});

// 使用扩展点
app.register(async (app) => {
  // 扩展插件功能
  app.extendMyPlugin('beforeGetResource', async (req) => {
    // 添加额外的请求验证
    if (!req.query.valid) {
      throw new Error('Invalid request');
    }
  });
  
  app.extendMyPlugin('afterGetResource', async (resource, req) => {
    // 扩展响应数据
    resource.extended = true;
    resource.timestamp = new Date();
  });
});
``` 