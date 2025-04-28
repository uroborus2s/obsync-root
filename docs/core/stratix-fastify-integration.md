# Stratix与Fastify集成指南

## 1. Stratix与Fastify的关系

Stratix是基于Fastify构建的纯配置Node.js框架，它利用Fastify的高性能和插件系统，同时添加了函数式编程思想和配置化的开发体验。

### 1.1 为什么选择Fastify

Fastify是一个高性能的Node.js Web框架，具有以下特点：

- **高性能**：基准测试显示Fastify是最快的Web框架之一
- **插件系统**：强大且灵活的插件架构
- **Schema验证**：内置JSON Schema验证
- **TypeScript支持**：完整的类型定义
- **生态系统**：丰富的插件生态

Stratix框架在Fastify的基础上，添加了更多的功能和理念：

- 纯配置驱动的应用开发
- 函数式编程思想
- 更简化的API
- 内置常用插件
- 声明式编程模型

## 2. Fastify核心概念在Stratix中的应用

### 2.1 插件系统

Fastify的插件系统是Stratix的核心基础。Stratix插件直接基于Fastify插件API构建，但增加了更多类型安全和配置化的特性。

```typescript
// Fastify插件
const fastifyPlugin = (fastify, options, done) => {
  fastify.get('/hello', async () => {
    return { hello: 'world' }
  });
  
  done();
};

// Stratix封装的插件
const stratixPlugin: StratixPlugin<HelloPluginOptions> = {
  name: 'hello',
  dependencies: [], // 没有依赖
  register: async (app, options) => {
    // 访问内部的Fastify实例
    const fastify = app.fastify;
    
    fastify.get('/hello', async () => {
      return { hello: options.message || 'world' }
    });
  },
  schema: {
    type: 'object',
    properties: {
      message: { type: 'string' }
    }
  }
};

// 插件工厂函数
const createHelloPlugin: PluginFactory<HelloPluginOptions> = (factoryOptions = {}) => {
  const { defaultMessage = 'world' } = factoryOptions;
  
  return {
    name: 'hello',
    register: async (app, options) => {
      const message = options.message || defaultMessage;
      
      const fastify = app.fastify;
      fastify.get('/hello', async () => {
        return { hello: message }
      });
    },
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  };
};

// 使用插件工厂
app.register(createHelloPlugin({ defaultMessage: 'universe' }), {
  message: 'stratix'
});
```

### 2.2 路由与请求处理

Stratix在Fastify的路由系统基础上提供了更加配置化的API：

```typescript
// Fastify路由
fastify.get('/users/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  return { user: { id: request.params.id } };
});

// Stratix配置化路由
app.register(require('@stratix/web'), {
  routes: {
    '/users/:id': {
      get: {
        schema: {
          params: {
            id: { type: 'string' }
          }
        },
        handler: async (request, reply) => {
          return { user: { id: request.params.id } };
        }
      }
    }
  }
});

// 更进一步配置化
app.register(require('@stratix/web'), {
  routes: {
    '/users/:id': {
      get: 'userController.getUserById' // 引用控制器方法
    }
  },
  controllers: {
    userController: {
      getUserById: async (request) => {
        return { user: { id: request.params.id } };
      }
    }
  }
});
```

### 2.3 Schema验证

Stratix继承了Fastify的JSON Schema验证，但提供了更集中和可重用的定义方式：

```typescript
// Fastify Schema
fastify.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      }
    }
  }
}, handler);

// Stratix Schema
app.register(require('@stratix/web'), {
  schemas: {
    User: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      }
    },
    CreateUserInput: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      }
    }
  },
  routes: {
    '/users': {
      post: {
        schema: {
          body: { $ref: 'CreateUserInput' },
          response: {
            201: { $ref: 'User' }
          }
        },
        handler: 'userController.createUser'
      }
    }
  }
});
```

### 2.4 钩子系统

Stratix扩展了Fastify的钩子系统，提供更多的应用生命周期钩子：

```typescript
// Fastify钩子
fastify.addHook('onRequest', async (request, reply) => {
  // 请求前处理
});

fastify.addHook('preHandler', async (request, reply) => {
  // 处理器前处理
});

// Stratix钩子
app.hook('beforeStart', async () => {
  // 应用启动前
});

app.hook('afterStart', async () => {
  // 应用启动后
});

// Web插件中使用Fastify钩子
app.register(require('@stratix/web'), {
  hooks: {
    onRequest: async (request, reply) => {
      // 请求前处理
    },
    preHandler: async (request, reply) => {
      // 处理器前处理
    }
  }
});
```

### 2.5 装饰器

Stratix利用Fastify的装饰器模式，实现插件功能扩展：

```typescript
// Fastify装饰器
fastify.decorate('util', {
  formatDate: (date) => {
    return date.toISOString();
  }
});

// Stratix装饰器
app.decorate('utils', {
  formatDate: (date) => {
    return date.toISOString();
  }
});

// 在插件中使用
myPlugin.register = (app, options) => {
  app.decorate('myFeature', {
    doSomething: () => {
      // 功能实现...
    }
  });
};

// 插件中使用装饰器的完整示例
const utilsPlugin: StratixPlugin<UtilsPluginOptions> = {
  name: 'utils',
  register: (app, options) => {
    const { dateFormat = 'ISO' } = options;
    
    app.decorate('utils', {
      formatDate: (date) => {
        if (dateFormat === 'ISO') {
          return date.toISOString();
        } else if (dateFormat === 'local') {
          return date.toLocaleString();
        } else {
          return date.toString();
        }
      },
      
      parseDate: (dateString) => {
        return new Date(dateString);
      }
    });
  },
  schema: {
    type: 'object',
    properties: {
      dateFormat: { type: 'string', enum: ['ISO', 'local', 'string'] }
    }
  }
};

// 使用类型安全的装饰器方法
import { decorateTypeSafe } from 'stratix/utils';

const typedPlugin: StratixPlugin = {
  name: 'typedPlugin',
  register: (app, options) => {
    // 使用类型安全装饰器方法
    decorateTypeSafe(app, 'versionInfo', {
      version: '1.0.0',
      getVersion: () => '1.0.0',
      isNewerThan: (other) => compareVersions('1.0.0', other) > 0
    });
    
    // TypeScript现在可以安全访问这些属性
    console.log(app.versionInfo.version);
    console.log(app.versionInfo.getVersion());
  }
};
```

## 3. 直接访问Fastify实例

在某些情况下，你可能需要直接访问Stratix内部的Fastify实例，以使用Fastify的特性或插件：

```typescript
// 访问Fastify实例
const app = createApp();
const fastify = app.fastify;

// 使用Fastify插件
fastify.register(require('fastify-cors'));

// 自定义Fastify配置
app.register(require('@stratix/web'), {
  fastify: {
    // Fastify选项
    logger: true,
    ignoreTrailingSlash: true,
    caseSensitive: false
  }
});
```

## 4. 函数式设计与Fastify集成

Stratix在Fastify基础上添加了函数式编程理念，以下示例展示了如何在Fastify集成中应用函数式设计原则：

### 4.1 不变性原则

```typescript
// 使用不可变数据处理请求
app.register(require('@stratix/web'), {
  routes: {
    '/users': {
      post: async (request) => {
        // 不修改原始请求数据
        const userData = { ...request.body };
        
        // 添加创建时间而不修改原始数据
        const enrichedData = {
          ...userData,
          createdAt: new Date().toISOString()
        };
        
        // 处理数据并返回新对象
        return { 
          success: true,
          data: enrichedData
        };
      }
    }
  }
});
```

### 4.2 纯函数处理器

```typescript
// 定义纯函数
const validateUser = (user) => {
  const errors = [];
  if (!user.name) errors.push('名称是必填的');
  if (!user.email) errors.push('邮箱是必填的');
  return { isValid: errors.length === 0, errors };
};

const formatUser = (user) => ({
  ...user,
  createdAt: new Date().toISOString(),
  name: user.name.trim()
});

// 在路由中使用纯函数
app.register(require('@stratix/web'), {
  routes: {
    '/users': {
      post: async (request) => {
        const validation = validateUser(request.body);
        if (!validation.isValid) {
          return { success: false, errors: validation.errors };
        }
        
        const formattedUser = formatUser(request.body);
        // 保存用户...
        
        return { success: true, data: formattedUser };
      }
    }
  }
});
```

### 4.3 函数组合

```typescript
// 函数组合工具
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);

// 处理函数
const sanitizeInput = (input) => {
  return {
    ...input,
    name: input.name?.trim(),
    email: input.email?.toLowerCase().trim()
  };
};

const validateInput = (input) => {
  const errors = [];
  if (!input.name) errors.push('名称是必填的');
  if (!input.email) errors.push('邮箱是必填的');
  
  return {
    data: input,
    valid: errors.length === 0,
    errors
  };
};

const processValidInput = (result) => {
  if (!result.valid) {
    throw new Error(result.errors.join(', '));
  }
  
  return {
    ...result.data,
    id: generateId(),
    createdAt: new Date().toISOString()
  };
};

// 在Fastify路由中使用函数组合
app.register(require('@stratix/web'), {
  routes: {
    '/users': {
      post: async (request, reply) => {
        try {
          // 组合多个处理函数
          const processUser = compose(
            processValidInput,
            validateInput,
            sanitizeInput
          );
          
          const processedUser = processUser(request.body);
          // 保存用户...
          
          return { success: true, data: processedUser };
        } catch (error) {
          reply.code(400);
          return { success: false, error: error.message };
        }
      }
    }
  }
});
```

### 4.4 声明式路由配置

```typescript
// 声明式路由配置与控制器分离
const app = createApp({
  web: {
    port: 3000,
    routes: {
      '/api': {
        '/users': {
          get: 'userController.getUsers',
          post: 'userController.createUser',
          '/:id': {
            get: 'userController.getUserById',
            put: 'userController.updateUser',
            delete: 'userController.deleteUser'
          }
        }
      }
    },
    // 分离的控制器实现
    controllers: {
      userController: {
        getUsers: async () => {
          // 实现获取用户列表...
          return { users: [] };
        },
        createUser: async ({ body }) => {
          // 实现创建用户...
          return { id: 1, ...body };
        },
        getUserById: async ({ params }) => {
          // 实现获取用户...
          return { id: params.id, name: 'User' };
        },
        updateUser: async ({ params, body }) => {
          // 实现更新用户...
          return { id: params.id, ...body };
        },
        deleteUser: async ({ params }) => {
          // 实现删除用户...
          return { success: true };
        }
      }
    }
  }
});
```

这种函数式的方法使得API更加声明式、更易测试，并减少了副作用。Stratix通过将Fastify的优秀性能与函数式编程理念相结合，提供了更清晰、更可维护的API开发体验。

## 5. 使用Fastify插件

Stratix允许你直接使用Fastify生态系统中的插件：

```typescript
// 注册Fastify插件
app.register(require('@stratix/web'), {
  plugins: [
    {
      plugin: require('fastify-cors'),
      options: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    },
    {
      plugin: require('fastify-swagger'),
      options: {
        routePrefix: '/documentation',
        swagger: {
          info: {
            title: 'API Documentation',
            version: '1.0.0'
          }
        },
        exposeRoute: true
      }
    }
  ]
});

// 或者使用专用API
app.web.useFastifyPlugin(require('fastify-cors'), {
  origin: '*'
});
```

## 6. 扩展Fastify功能

Stratix提供了扩展Fastify功能的方法：

```typescript
// 扩展请求对象
app.register(require('@stratix/web'), {
  extends: {
    request: {
      // 添加自定义属性或方法到请求对象
      getCurrentUser: function() {
        return this.user;
      }
    },
    reply: {
      // 添加自定义方法到响应对象
      success: function(data) {
        return this.code(200).send({
          status: 'success',
          data
        });
      },
      error: function(message, code = 400) {
        return this.code(code).send({
          status: 'error',
          message
        });
      }
    }
  }
});

// 使用扩展方法
app.web.get('/profile', async (request, reply) => {
  const user = request.getCurrentUser();
  if (!user) {
    return reply.error('Unauthorized', 401);
  }
  return reply.success({ user });
});
```

## 7. 性能优化

Stratix继承了Fastify的高性能，并提供了一些额外的优化选项：

```typescript
// 性能优化配置
app.register(require('@stratix/web'), {
  performance: {
    // JSON序列化优化
    serializer: require('fast-json-stringify'),
    
    // 请求日志优化
    disableRequestLogging: true,
    
    // 路由查找优化
    caseSensitive: true,
    ignoreTrailingSlash: false
  },
  
  // 压缩配置
  compression: {
    global: false,  // 只对特定路由启用
    threshold: 1024 // 只压缩大于1KB的响应
  }
});
```

## 8. 高级配置和集成

Stratix提供了高级Fastify配置选项：

```typescript
app.register(require('@stratix/web'), {
  // 自定义服务器实例
  serverFactory: (handler) => {
    const server = require('http2').createSecureServer({
      key: fs.readFileSync('./key.pem'),
      cert: fs.readFileSync('./cert.pem')
    }, handler);
    
    return server;
  },
  
  // 错误处理
  errorHandler: (error, request, reply) => {
    // 自定义错误处理逻辑
    app.logger.error(error);
    
    reply.status(500).send({
      error: 'Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : error.message
    });
  }
});
```

## 9. 最佳实践

### 9.1 插件开发

- 使用Stratix插件API而不是直接操作Fastify实例
- 遵循Fastify插件指南，特别是有关封装的规则
- 使用Schema验证输入和输出
- 提供清晰的类型定义

### 9.2 路由设计

- 使用Stratix的配置化路由API而不是命令式定义
- 集中管理Schema定义
- 使用控制器分组相关端点逻辑
- 利用中间件和钩子进行横切关注点处理

### 9.3 性能考虑

- 最小化插件数量
- 使用Schema提高验证和序列化性能
- 合理配置缓存
- 监控应用性能 