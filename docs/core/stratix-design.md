# Stratix框架设计文档

## 1. 框架概述

Stratix是一个基于Fastify的纯配置Node.js框架，以函数式编程思想为核心，追求简洁、透明和组合性。它在Fastify的优秀性能和插件生态基础上，通过配置化和函数式编程理念，提供更加简洁、可组合的开发体验。

### 1.1 设计理念

- **纯配置驱动**：通过配置文件定义应用结构和行为，减少样板代码
- **函数式编程**：强调纯函数、不可变数据和组合性
- **插件化架构**：一切功能都通过插件实现，插件是框架的基本构建单元
- **声明式API**：通过声明配置而非命令式代码构建应用
- **类型安全**：完全支持TypeScript，提供端到端类型安全
- **高性能**：基于Fastify的高性能基础，保持轻量和高效

### 1.2 核心特性

- 基于Fastify的插件系统进行功能扩展
- 纯配置化API，减少样板代码
- 内置常用插件和工具库
- 支持Web和非Web应用开发
- 完善的类型定义和文档
- 良好的测试支持和开发体验

## 2. 项目架构

### 2.1 整体架构

Stratix项目采用monorepo结构，使用pnpm workspaces管理多个包：

```
stratix/
├── apps/               // 示例应用和内部工具
├── docs/               // 文档
├── packages/           // 核心包和插件包
│   ├── stratix/        // 核心框架
│   ├── web/            // Web服务插件
│   ├── database/       // 数据库插件
│   ├── cache/          // 缓存插件
│   ├── queue/          // 队列插件
│   ├── logger/         // 日志插件
│   └── ...             // 其他插件
└── ...
```

### 2.2 核心架构

Stratix核心框架包含以下主要组件：

1. **应用容器**：管理应用生命周期、插件和依赖
2. **插件系统**：处理插件注册、依赖和初始化
3. **配置管理**：管理和验证应用和插件配置
4. **钩子系统**：提供应用生命周期钩子
5. **工具库**：提供常用工具函数

## 3. 核心框架设计

### 3.1 应用容器

应用容器是Stratix的核心，负责管理整个应用的生命周期和所有插件。

#### 3.1.1 创建应用

```typescript
import { createApp } from 'stratix';

const app = createApp({
  name: 'my-app',
  plugins: {
    // 内置插件配置
    logger: {
      level: 'info',
      prettyPrint: true
    }
  },
  // 自定义配置
  config: {
    environment: process.env.NODE_ENV || 'development',
    // 其他全局配置...
  }
});
```

#### 3.1.2 应用生命周期

应用具有以下生命周期阶段：

1. **初始化**：创建应用实例并加载基础配置
2. **插件注册**：注册和配置插件
3. **插件初始化**：按依赖顺序初始化插件
4. **应用启动**：启动应用，运行所有服务
5. **应用关闭**：优雅关闭应用和所有插件

```typescript
// 应用生命周期示例
const app = createApp({ /* 配置 */ });

// 注册插件
app.register(webPlugin, { /* Web插件配置 */ });

// 启动应用
await app.start();

// 关闭应用
await app.close();
```

### 3.2 插件系统

插件是Stratix的基本构建单元，所有功能都通过插件实现。Stratix的插件系统基于Fastify的插件系统，但进行了扩展和简化。

#### 3.2.1 插件结构

每个插件都应该具有以下结构：

```typescript
// 插件接口定义
interface StratixPlugin<TOptions = any> {
  name: string;                             // 插件名称
  dependencies?: string[];                  // 依赖的其他插件
  optionalDependencies?: string[];          // 可选依赖
  register: PluginRegisterFn<TOptions>;     // 注册函数
  decorations?: Record<string, any>;        // 添加到应用实例的装饰器
  schema?: JSONSchema;                      // 配置验证schema
}

// 注册函数类型
type PluginRegisterFn<TOptions = any> = (
  app: StratixApp,                          // 应用实例
  options: TOptions                         // 插件配置
) => Promise<void> | void;
```

#### 3.2.2 插件注册

```typescript
// 注册插件
app.register(myPlugin, {
  // 插件配置
});

// 链式注册多个插件
app.register(pluginA, { /* 配置 */ })
   .register(pluginB, { /* 配置 */ });
```

#### 3.2.3 插件依赖管理

Stratix自动处理插件之间的依赖关系，确保按正确顺序加载插件：

```typescript
// 定义具有依赖的插件
const authPlugin = {
  name: 'auth',
  dependencies: ['web', 'database'], // 依赖web和database插件
  register: async (app, options) => {
    // 实现...
  }
};
```

### 3.3 配置系统

配置系统负责管理和验证应用和插件的配置。

#### 3.3.1 配置加载

配置支持多种加载方式：

```typescript
// 直接在代码中配置
const app = createApp({
  config: {
    // 配置项...
  }
});

// 从文件加载配置
const app = createApp({
  configPath: './config.js' // 支持.js, .json, .yml等格式
});

// 组合多个配置源
const app = createApp({
  config: {
    // 基础配置...
  },
  configPath: './config.js',
  env: true // 启用环境变量覆盖
});
```

#### 3.3.2 配置访问

```typescript
// 获取配置
const dbConfig = app.config.get('database');

// 检查配置是否存在
if (app.config.has('redis.host')) {
  // ...
}

// 获取带默认值的配置
const port = app.config.get('web.port', 3000);
```

#### 3.3.3 配置验证

使用JSON Schema对配置进行验证：

```typescript
// 定义配置Schema
const configSchema = {
  type: 'object',
  required: ['database'],
  properties: {
    database: {
      type: 'object',
      required: ['host', 'port', 'name'],
      properties: {
        host: { type: 'string' },
        port: { type: 'number' },
        name: { type: 'string' }
      }
    }
  }
};

// 在插件中验证配置
app.config.validate('database', configSchema);
```

### 3.4 钩子系统

钩子系统允许插件在应用生命周期的不同阶段注册回调函数。

#### 3.4.1 生命周期钩子

```typescript
// 注册启动前钩子
app.hook('beforeStart', async () => {
  // 应用启动前的准备工作...
});

// 注册关闭钩子
app.hook('beforeClose', async () => {
  // 应用关闭前的清理工作...
});
```

#### 3.4.2 可用钩子列表

- `onRegister`: 插件注册时
- `beforeInit`: 插件初始化前
- `afterInit`: 插件初始化后
- `beforeStart`: 应用启动前
- `afterStart`: 应用启动后
- `beforeClose`: 应用关闭前
- `afterClose`: 应用关闭后

## 4. 插件系统详细设计

Stratix的插件系统是基于Fastify的插件系统扩展而来，但更加简化和纯配置化。

### 4.1 插件类型

Stratix支持以下几种类型的插件：

1. **核心插件**：Stratix框架自带的基础插件，如logger和config
2. **功能插件**：提供特定功能的插件，如web、database、cache等
3. **集成插件**：集成第三方服务的插件，如redis、mongodb、aws等
4. **应用插件**：特定应用领域的插件，如认证、支付、文件上传等

### 4.2 插件工厂函数

```typescript
// 插件工厂函数类型
type PluginFactory<TOptions = any> = (
  factoryOptions?: any                       // 工厂配置
) => StratixPlugin<TOptions>;
```

### 4.3 插件开发

#### 4.3.1 基本插件开发

```typescript
// 简单插件示例
import { StratixPlugin } from 'stratix';

const myPlugin: StratixPlugin = {
  name: 'myPlugin',
  register: async (app, options) => {
    // 在这里实现插件功能
    const { someOption = 'default' } = options;
    
    // 添加功能到应用实例
    app.decorate('myFeature', {
      doSomething: () => {
        // 实现...
        return 'result';
      }
    });
    
    // 注册关闭钩子
    app.hook('beforeClose', async () => {
      // 清理资源...
    });
  }
};

export default myPlugin;
```

#### 4.3.2 使用插件工厂

创建可配置的插件：

```typescript
// 插件工厂函数
import { PluginFactory } from 'stratix';

const myPluginFactory: PluginFactory = (factoryOptions = {}) => {
  const { defaultValue = 'default' } = factoryOptions;
  
  return {
    name: 'myPlugin',
    register: async (app, options) => {
      const { someOption = defaultValue } = options;
      
      // 实现...
    },
    schema: {
      type: 'object',
      properties: {
        someOption: { type: 'string' }
      }
    }
  };
};

export default myPluginFactory;
```

#### 4.3.3 依赖其他插件

```typescript
// 依赖其他插件
const authPlugin: StratixPlugin = {
  name: 'auth',
  dependencies: ['web', 'database'],
  optionalDependencies: ['redis'], // 可选依赖
  register: async (app, options) => {
    // 获取依赖的插件实例
    const web = app.use('web');
    const db = app.use('database');
    
    // 检查可选依赖
    const hasRedis = app.hasPlugin('redis');
    const redis = hasRedis ? app.use('redis') : null;
    
    // 实现...
  }
};
```

### 4.4 插件注册流程

Stratix插件注册流程如下：

1. **注册**：将插件添加到注册队列
2. **依赖解析**：分析插件依赖关系，确定加载顺序
3. **配置验证**：验证插件配置是否符合schema
4. **初始化**：按依赖顺序初始化插件
5. **装饰**：将插件提供的装饰器添加到应用实例
6. **生命周期钩子**：根据应用生命周期触发插件钩子

## 5. 函数式编程设计

Stratix框架采用函数式编程思想，强调不变性、纯函数和组合性。

### 5.1 函数式设计原则

#### 5.1.1 不变性

Stratix鼓励使用不可变数据结构，避免副作用：

```typescript
// 使用不可变数据结构
import { Map, List } from 'immutable';

// 配置转换函数
const transformConfig = (config) => {
  return Map(config)
    .set('port', config.port || 3000)
    .set('host', config.host || 'localhost')
    .toJS();
};

// 中间件函数不修改输入
const addTimestamp = (data) => ({
  ...data,
  timestamp: Date.now()
});
```

#### 5.1.2 纯函数

鼓励使用纯函数，使代码更易测试和维护：

```typescript
// 纯函数示例
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// 避免副作用
const formatResponse = (data) => ({
  status: 'success',
  data,
  timestamp: Date.now()
});
```

#### 5.1.3 函数组合

支持函数组合，构建更复杂的功能：

```typescript
// 函数组合工具
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);

// 使用函数组合
const processData = compose(
  formatResponse,
  calculateTotal,
  filterValidItems
);

const result = processData(items);
```

### 5.2 函数式插件设计

插件设计应遵循函数式编程原则：

```typescript
// 函数式插件示例
const cachePlugin: StratixPlugin<CacheOptions> = {
  name: 'cache',
  register: (app, options) => {
    // 创建不可变缓存存储
    const store = Map({});
    
    // 提供纯函数API
    app.decorate('cache', {
      // 纯函数：返回新状态而不修改原状态
      set: (key, value, ttl) => {
        return {
          store: store.set(key, {
            value,
            expires: ttl ? Date.now() + ttl : null
          }),
          key,
          value
        };
      },
      
      // 纯函数：不修改输入
      get: (key) => {
        const entry = store.get(key);
        if (!entry) return null;
        if (entry.expires && Date.now() > entry.expires) return null;
        return entry.value;
      },
      
      // 纯函数：返回新状态
      remove: (key) => {
        return {
          store: store.delete(key),
          key
        };
      }
    });
  }
};
```

### 5.3 声明式配置

Stratix采用声明式配置方式，通过配置描述应用而非命令式代码：

```typescript
// 声明式路由配置
const app = createApp({
  // ...
  web: {
    routes: {
      '/users': {
        get: {
          handler: 'userController.getUsers',
          schema: {
            response: {
              200: {
                type: 'array',
                items: { $ref: 'User' }
              }
            }
          }
        },
        post: {
          handler: 'userController.createUser',
          schema: {
            body: { $ref: 'CreateUserInput' },
            response: {
              201: { $ref: 'User' }
            }
          }
        },
        '/:id': {
          get: {
            handler: 'userController.getUserById',
            schema: {
              params: {
                id: { type: 'string' }
              },
              response: {
                200: { $ref: 'User' }
              }
            }
          }
        }
      }
    }
  }
});
```

## 6. 插件实现指南

### 6.1 插件基本实现流程

开发Stratix插件的一般流程：

1. **创建插件结构**：定义插件名称、依赖和配置schema
2. **实现核心功能**：开发插件的主要功能
3. **添加装饰器**：向应用实例添加API
4. **注册钩子**：处理生命周期事件
5. **处理错误**：确保错误得到正确处理
6. **清理资源**：在关闭时释放资源

### 6.2 插件命名和目录规范

```
@stratix/plugin-name/
├── src/
│   ├── index.ts          // 主入口文件
│   ├── plugin.ts         // 插件定义
│   ├── types.ts          // 类型定义
│   ├── schema.ts         // 配置schema
│   ├── services/         // 内部服务实现
│   ├── utils/            // 工具函数
│   └── constants.ts      // 常量定义
├── tests/                // 测试目录
├── package.json
├── tsconfig.json
└── README.md             // 文档
```

### 6.3 插件模板示例

以下是一个完整的插件实现模板：

#### 6.3.1 插件主入口

```typescript
// index.ts
import { pluginFactory } from './plugin';

export default pluginFactory();
export * from './types';
```

#### 6.3.2 插件定义

```typescript
// plugin.ts
import { StratixPlugin, PluginFactory } from 'stratix';
import { createService } from './services/service';
import schema from './schema';
import { PluginOptions } from './types';

export const pluginFactory: PluginFactory<PluginOptions> = (factoryOptions = {}) => {
  return {
    name: 'myPlugin',
    dependencies: ['core'],
    optionalDependencies: ['logger'],
    schema,
    register: async (app, options) => {
      // 处理配置
      const config = {
        ...factoryOptions,
        ...options
      };
      
      // 创建服务
      const service = createService(config);
      
      // 添加装饰器
      app.decorate('myPlugin', {
        doSomething: service.doSomething,
        getStatus: service.getStatus
      });
      
      // 注册钩子
      app.hook('beforeClose', async () => {
        await service.cleanup();
      });
      
      // 日志记录
      if (app.hasPlugin('logger')) {
        app.logger.info('myPlugin initialized');
      }
    }
  };
};
```

#### 6.3.3 类型定义

```typescript
// types.ts
export interface PluginOptions {
  enabled?: boolean;
  timeout?: number;
  maxRetries?: number;
}

export interface ServiceResult {
  status: string;
  data: any;
}
```

#### 6.3.4 配置Schema

```typescript
// schema.ts
import { JSONSchema } from 'stratix';

const schema: JSONSchema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean', default: true },
    timeout: { type: 'number', minimum: 0, default: 5000 },
    maxRetries: { type: 'number', minimum: 0, default: 3 }
  }
};

export default schema;
```

#### 6.3.5 服务实现

```typescript
// services/service.ts
import { PluginOptions, ServiceResult } from '../types';

export function createService(options: PluginOptions) {
  // 内部状态
  let status = 'idle';
  
  // 清理函数
  const cleanup = async () => {
    status = 'closed';
    // 清理资源...
  };
  
  // 返回服务API
  return {
    doSomething: async (data: any): Promise<ServiceResult> => {
      try {
        status = 'processing';
        // 实现业务逻辑...
        
        const result = {
          status: 'success',
          data: { /* 处理结果 */ }
        };
        
        status = 'idle';
        return result;
      } catch (error) {
        status = 'error';
        throw error;
      }
    },
    
    getStatus: () => status,
    
    cleanup
  };
}
```

## 7. 配置驱动应用

Stratix框架的一个核心设计理念是通过配置驱动应用开发，减少样板代码，提高开发效率。

### 7.1 配置文件启动应用

Stratix支持通过配置文件直接启动应用：

```typescript
// 从配置文件创建应用
import { createAppFromConfig } from 'stratix';

// 自动加载配置并启动应用
const app = await createAppFromConfig('./stratix.config.js');
```

配置文件支持多种格式，包括JavaScript(.js)、JSON(.json)和YAML(.yml/.yaml)。

### 7.2 完整配置文件示例

```javascript
// stratix.config.js
module.exports = {
  name: 'user-service',
  // 环境变量配置
  env: {
    dotenv: true, // 自动加载.env文件
    required: ['DB_HOST', 'DB_NAME'] // 必需的环境变量
  },
  // 插件配置
  plugins: {
    // 日志插件
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      prettyPrint: process.env.NODE_ENV !== 'production'
    },
    // Web服务插件
    web: {
      port: parseInt(process.env.PORT || '3000'),
      cors: true,
      // 路由配置
      routes: {
        '/api/users': {
          get: 'controllers.user.getUsers',
          post: 'controllers.user.createUser',
          '/:id': {
            get: 'controllers.user.getUserById',
            put: 'controllers.user.updateUser',
            delete: 'controllers.user.deleteUser'
          }
        }
      }
    },
    // 数据库插件
    database: {
      client: 'postgresql',
      connection: {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
    },
    // 缓存插件
    cache: {
      driver: 'redis',
      connection: {
        host: process.env.REDIS_HOST || 'localhost'
      }
    }
  },
  // 控制器定义
  controllers: {
    user: {
      getUsers: async ({ db, cache }) => {
        // 实现获取用户列表...
        return await db('users').select('*');
      },
      createUser: async ({ db }, request) => {
        // 实现创建用户...
        return await db('users').insert(request.body).returning('*');
      },
      getUserById: async ({ db }, request) => {
        // 实现获取单个用户...
        return await db('users').where('id', request.params.id).first();
      },
      updateUser: async ({ db }, request) => {
        // 实现更新用户...
      },
      deleteUser: async ({ db }, request) => {
        // 实现删除用户...
      }
    }
  },
  // 服务定义
  services: {
    email: {
      sendWelcomeEmail: async (user) => {
        // 实现发送欢迎邮件...
      }
    }
  },
  // 生命周期钩子
  hooks: {
    beforeStart: [
      async ({ logger }) => {
        logger.info('正在启动应用...');
      }
    ],
    afterStart: [
      async ({ logger }) => {
        logger.info('应用已成功启动');
      }
    ]
  }
};
```

### 7.3 最小化入口文件

使用配置驱动的方式，应用的入口文件可以非常简洁：

```javascript
// index.js
const { createAppFromConfig } = require('stratix');

async function main() {
  try {
    // 从配置文件创建并启动应用
    const app = await createAppFromConfig('./stratix.config.js');
    
    // 处理优雅关闭
    process.on('SIGTERM', async () => {
      await app.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('应用启动失败:', err);
    process.exit(1);
  }
}

main();
```

### 7.4 配置驱动与命令式编程

Stratix鼓励配置驱动的开发方式，但也允许混合使用命令式编程：

```javascript
// 混合方式
import { createApp } from 'stratix';
import webPlugin from '@stratix/web';

// 基本配置
const app = createApp({
  name: 'my-app',
  plugins: {
    logger: { level: 'info' }
  }
});

// 命令式注册特定插件
if (process.env.NODE_ENV === 'development') {
  app.register(require('dev-tools'), { /* 开发工具配置 */ });
}

// 启动应用
await app.start();
```

### 7.5 配置自动解析机制

Stratix提供了强大的配置解析机制：

#### 7.5.1 环境变量替换

配置中的值可以引用环境变量：

```javascript
// 环境变量替换
{
  database: {
    host: '${DB_HOST}',
    port: '${DB_PORT:5432}' // 默认值5432
  }
}
```

#### 7.5.2 路径解析

字符串路径引用自动解析到实际函数：

```javascript
// 路径解析，'controllers.user.getUsers' 自动解析到对应函数
routes: {
  '/api/users': {
    get: 'controllers.user.getUsers'
  }
}
```

#### 7.5.3 依赖注入

处理函数自动获取依赖：

```javascript
// 函数自动注入依赖
controllers: {
  user: {
    // { db, cache } 参数会自动注入
    getUsers: async ({ db, cache }) => {
      // 使用注入的依赖...
    }
  }
}
```

## 8. API参考

Stratix框架提供了简洁而强大的API，用于创建和管理应用程序。以下是框架对外暴露的主要API。

### 8.1 应用创建API

#### 8.1.1 createApp

创建一个新的Stratix应用实例。

```typescript
function createApp(options: AppOptions): StratixApp;

interface AppOptions {
  name: string;                       // 应用名称
  plugins?: Record<string, any>;      // 内置插件配置
  config?: Record<string, any>;       // 应用配置
  configPath?: string;                // 配置文件路径
  env?: boolean | EnvOptions;         // 环境变量配置
}

interface EnvOptions {
  dotenv?: boolean;                   // 是否加载.env文件
  required?: string[];                // 必需的环境变量
  prefix?: string;                    // 环境变量前缀
}
```

使用示例：

```typescript
import { createApp } from 'stratix';

const app = createApp({
  name: 'my-app',
  plugins: {
    logger: { level: 'info' }
  },
  config: {
    // 自定义配置
  },
  env: {
    dotenv: true,
    required: ['API_KEY']
  }
});
```

#### 8.1.2 createAppFromConfig

从配置文件创建并初始化应用。

```typescript
async function createAppFromConfig(
  configPath: string,
  options?: Partial<AppOptions>
): Promise<StratixApp>;
```

使用示例：

```typescript
import { createAppFromConfig } from 'stratix';

const app = await createAppFromConfig('./stratix.config.js', {
  env: true // 启用环境变量
});
```

### 8.2 应用实例API

应用实例(`StratixApp`)提供以下核心API：

#### 8.2.1 register

注册插件到应用。

```typescript
register(plugin: StratixPlugin, options?: any): StratixApp;
```

使用示例：

```typescript
import webPlugin from '@stratix/web';

app.register(webPlugin, {
  port: 3000,
  cors: true
});
```

#### 8.2.2 start

启动应用及其所有插件。

```typescript
async start(): Promise<StratixApp>;
```

使用示例：

```typescript
await app.start();
console.log('应用已启动');
```

#### 8.2.3 close

优雅关闭应用及其所有插件。

```typescript
async close(): Promise<void>;
```

使用示例：

```typescript
await app.close();
console.log('应用已关闭');
```

#### 8.2.4 use

获取已注册插件的实例。

```typescript
use<T = any>(pluginName: string): T;
```

使用示例：

```typescript
const web = app.use('web');
web.addRoute('/hello', async () => 'Hello World');
```

#### 8.2.5 hasPlugin

检查插件是否已注册。

```typescript
hasPlugin(pluginName: string): boolean;
```

使用示例：

```typescript
if (app.hasPlugin('database')) {
  // 使用数据库...
}
```

#### 8.2.6 hook

注册应用生命周期钩子。

```typescript
hook(name: string, handler: HookHandler): StratixApp;
```

使用示例：

```typescript
app.hook('beforeStart', async () => {
  console.log('应用即将启动');
});
```

#### 8.2.7 decorate

向应用实例添加属性或方法。

```typescript
decorate(name: string, value: any): StratixApp;
```

使用示例：

```typescript
app.decorate('utils', {
  formatDate: (date) => {
    // 实现日期格式化...
  }
});
```

#### 8.2.8 config

配置管理API。

```typescript
interface ConfigAPI {
  get<T = any>(path: string, defaultValue?: T): T;
  has(path: string): boolean;
  set(path: string, value: any): void;
  validate(path: string, schema: JSONSchema): boolean;
}
```

使用示例：

```typescript
// 获取配置
const dbHost = app.config.get('database.host');

// 检查配置是否存在
if (app.config.has('redis.port')) {
  // ...
}

// 设置配置
app.config.set('timeout', 5000);

// 验证配置
app.config.validate('database', {
  type: 'object',
  required: ['host', 'port']
  // ...
});
```

### 8.3 插件开发API

用于开发Stratix插件的API。

#### 8.3.1 定义插件

```typescript
interface StratixPlugin<TOptions = any> {
  name: string;                             // 插件名称
  dependencies?: string[];                  // 依赖插件
  optionalDependencies?: string[];          // 可选依赖
  register: PluginRegisterFn<TOptions>;     // 注册函数
  decorations?: Record<string, any>;        // 添加到应用的装饰器
  schema?: JSONSchema;                      // 配置验证schema
}

type PluginRegisterFn<TOptions = any> = (
  app: StratixApp,                          // 应用实例
  options: TOptions                         // 插件配置
) => Promise<void> | void;
```

使用示例：

```typescript
import { StratixPlugin } from 'stratix';

const myPlugin: StratixPlugin = {
  name: 'myPlugin',
  dependencies: ['web'],
  register: async (app, options) => {
    // 实现插件功能...
  },
  schema: {
    type: 'object',
    properties: {
      // 属性定义...
    }
  }
};
```

#### 8.3.2 插件工厂函数

```typescript
type PluginFactory<TOptions = any> = (
  factoryOptions?: any
) => StratixPlugin<TOptions>;
```

使用示例：

```typescript
const myPluginFactory = (factoryOptions = {}) => {
  return {
    name: 'myPlugin',
    register: async (app, options) => {
      const config = {
        ...factoryOptions,
        ...options
      };
      // 实现插件...
    }
  };
};
```

### 8.4 工具API

Stratix提供的常用工具函数。

#### 8.4.1 路径解析

```typescript
function resolvePath(obj: any, path: string): any;
```

使用示例：

```typescript
import { resolvePath } from 'stratix/utils';

const user = { profile: { name: 'John' } };
const name = resolvePath(user, 'profile.name'); // 'John'
```

#### 8.4.2 深度合并

```typescript
function deepMerge<T>(target: T, ...sources: any[]): T;
```

使用示例：

```typescript
import { deepMerge } from 'stratix/utils';

const result = deepMerge(
  { a: 1, b: { c: 3 } },
  { b: { d: 4 }, e: 5 }
); // { a: 1, b: { c: 3, d: 4 }, e: 5 }
```

#### 8.4.3 类型安全装饰器

```typescript
function decorateTypeSafe<T, K extends string, V>(
  instance: T,
  key: K,
  value: V
): asserts instance is T & Record<K, V>;
```

使用示例：

```typescript
import { decorateTypeSafe } from 'stratix/utils';

interface MyApp {
  name: string;
}

const app: MyApp = { name: 'test' };
decorateTypeSafe(app, 'version', '1.0.0');

// TypeScript现在知道app有version属性
console.log(app.version); // '1.0.0'
```

## 9. CLI命令

Stratix框架提供命令行工具(CLI)，帮助开发者快速创建和管理项目。

### 9.1 安装CLI

```bash
# 全局安装
npm install -g @stratix/cli

# 或使用npx
npx @stratix/cli <command>
```

### 9.2 创建新项目

创建一个新的Stratix项目。

```bash
stratix create [options] <project-name>
```

选项：

- `--template, -t` - 项目模板(default, api, web, minimal)
- `--typescript, -ts` - 使用TypeScript(默认启用)
- `--no-typescript` - 使用JavaScript
- `--skip-install` - 跳过依赖安装
- `--package-manager, -pm` - 包管理器(npm, yarn, pnpm)
- `--verbose` - 显示详细日志

示例：

```bash
# 创建基于web模板的项目
stratix create -t web my-web-app

# 创建JavaScript项目
stratix create --no-typescript my-js-app

# 使用pnpm作为包管理器
stratix create -pm pnpm my-app
```

### 9.3 项目开发

在开发模式下启动项目。

```bash
stratix dev [options]
```

选项：

- `--port, -p` - 端口号
- `--watch, -w` - 监视文件变化(默认启用)
- `--no-watch` - 禁用文件监视
- `--inspect` - 启用Node.js调试器
- `--env, -e` - 环境变量文件(.env.[env])

示例：

```bash
# 开发模式启动
stratix dev

# 指定端口
stratix dev -p 8080

# 使用生产环境变量
stratix dev -e production
```

### 9.4 构建项目

构建项目用于生产环境。

```bash
stratix build [options]
```

选项：

- `--clean` - 构建前清理输出目录
- `--sourcemap` - 生成源映射文件
- `--minify` - 压缩输出(默认启用)
- `--no-minify` - 禁用压缩
- `--target` - 编译目标(es2015, es2018, etc.)

示例：

```bash
# 构建项目
stratix build

# 生成源映射
stratix build --sourcemap

# 不压缩输出
stratix build --no-minify
```

### 9.5 启动生产环境

在生产模式下启动项目。

```bash
stratix start [options]
```

选项：

- `--port, -p` - 端口号
- `--host, -h` - 主机地址
- `--env, -e` - 环境变量文件(.env.[env])

示例：

```bash
stratix start -p 80 -h 0.0.0.0
```

### 9.6 创建新资源

创建新的资源文件(控制器、服务等)。

```bash
stratix generate [type] [name] [options]
```

资源类型：

- `controller` - 控制器
- `service` - 服务
- `plugin` - 插件
- `hook` - 钩子
- `middleware` - 中间件
- `model` - 数据模型
- `migration` - 数据库迁移

选项：

- `--force, -f` - 覆盖现有文件
- `--typescript, -ts` - 使用TypeScript(默认)
- `--no-typescript` - 使用JavaScript
- `--directory, -d` - 自定义目录路径

示例：

```bash
# 创建用户控制器
stratix generate controller user

# 创建支付服务
stratix generate service payment

# 创建自定义插件
stratix generate plugin cache -d plugins/storage
```

### 9.7 管理插件

安装、移除和更新插件。

```bash
stratix plugin [command] [name] [options]
```

命令：

- `add` - 添加插件
- `remove` - 移除插件
- `update` - 更新插件
- `list` - 列出已安装的插件
- `search` - 搜索可用插件

选项：

- `--save-dev, -D` - 安装为开发依赖
- `--version, -v` - 指定版本
- `--registry` - 使用自定义npm注册表

示例：

```bash
# 添加数据库插件
stratix plugin add @stratix/database

# 安装特定版本
stratix plugin add @stratix/web -v 1.0.0

# 移除插件
stratix plugin remove @stratix/cache

# 列出已安装插件
stratix plugin list
```

### 9.8 数据库迁移

管理数据库迁移。

```bash
stratix db [command] [options]
```

命令：

- `migrate` - 运行所有未应用的迁移
- `rollback` - 回滚最近的一批迁移
- `create` - 创建新迁移文件
- `seed` - 运行种子文件填充数据
- `reset` - 回滚所有迁移并重新运行

选项：

- `--name, -n` - 迁移名称(用于create)
- `--env, -e` - 环境名称
- `--config, -c` - 配置文件路径

示例：

```bash
# 创建迁移
stratix db create -n create_users_table

# 运行迁移
stratix db migrate

# 回滚最近的迁移
stratix db rollback

# 填充测试数据
stratix db seed

# 完全重置数据库
stratix db reset
```

### 9.9 测试工具

运行测试。

```bash
stratix test [options]
```

选项：

- `--watch, -w` - 监视文件变化
- `--coverage` - 收集测试覆盖率
- `--verbose` - 显示详细输出
- `--testMatch` - 测试文件匹配模式

示例：

```bash
# 运行所有测试
stratix test

# 监视模式
stratix test -w

# 生成覆盖率报告
stratix test --coverage
```

### 9.10 性能分析

性能分析工具。

```bash
stratix analyze [options]
```

选项：

- `--mode, -m` - 分析模式(memory, cpu, http)
- `--duration, -d` - 分析持续时间(秒)
- `--output, -o` - 输出文件路径

示例：

```bash
# 内存使用分析
stratix analyze -m memory

# HTTP性能分析
stratix analyze -m http -d 60
```