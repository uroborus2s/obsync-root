# @stratix/validation 与其他插件集成

本文档介绍 `@stratix/validation` 插件如何与Stratix框架中的其他插件进行集成。

## 1. 与Web插件集成

`@stratix/validation` 插件可以与 `@stratix/web` 插件无缝集成，提供API请求和响应的验证能力。

### 1.1 请求验证

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';
import { webPlugin } from '@stratix/web';

const app = createApp();

// 注册插件
app.register(validationPlugin);
app.register(webPlugin, {
  routes: {
    '/api/users': {
      post: {
        // 定义请求验证规则
        validate: {
          // 请求体验证
          body: {
            username: app.validation.string().min(3).max(20),
            email: app.validation.string().email(),
            age: app.validation.number().int().positive().optional()
          },
          
          // 查询参数验证
          query: {
            includeDetails: app.validation.boolean().optional()
          }
        },
        handler: async (request, reply) => {
          // 此时request.body已经通过验证
          const { username, email, age } = request.body;
          
          // 创建用户逻辑...
          
          return { success: true, userId: 1 };
        }
      },
      
      get: {
        // 查询参数验证
        validate: {
          query: {
            page: app.validation.number().int().positive().default(1),
            limit: app.validation.number().int().positive().max(100).default(20),
            sort: app.validation.enum(['name', 'email', 'created_at']).optional(),
            order: app.validation.enum(['asc', 'desc']).default('asc')
          }
        },
        handler: async (request, reply) => {
          // 此时request.query已经通过验证和转换
          const { page, limit, sort, order } = request.query;
          
          // 获取用户列表逻辑...
          
          return { users: [], total: 0 };
        }
      }
    },
    
    '/api/users/:id': {
      get: {
        // 路径参数验证
        validate: {
          params: {
            id: app.validation.string().uuid()
          }
        },
        handler: async (request, reply) => {
          // 此时request.params已经通过验证
          const { id } = request.params;
          
          // 获取用户详情逻辑...
          
          return { user: { id, name: 'Test User' } };
        }
      },
      
      put: {
        // 组合验证
        validate: {
          params: {
            id: app.validation.string().uuid()
          },
          body: {
            username: app.validation.string().min(3).max(20).optional(),
            email: app.validation.string().email().optional(),
            age: app.validation.number().int().positive().optional()
          }
        },
        handler: async (request, reply) => {
          // 更新用户逻辑...
          return { success: true };
        }
      }
    }
  }
});
```

### 1.2 响应验证

```typescript
// 定义响应验证
app.register(webPlugin, {
  routes: {
    '/api/products/:id': {
      get: {
        validate: {
          params: {
            id: app.validation.string().uuid()
          },
          
          // 响应验证
          response: {
            // 200状态码响应验证
            200: app.validation.object({
              id: app.validation.string().uuid(),
              name: app.validation.string(),
              price: app.validation.number().positive(),
              description: app.validation.string().optional(),
              createdAt: app.validation.string().datetime()
            })
          }
        },
        handler: async (request, reply) => {
          const product = await getProductById(request.params.id);
          
          // 响应将会被验证
          return product;
        }
      }
    }
  }
});
```

### 1.3 自定义错误处理

```typescript
// 自定义验证错误处理
app.register(webPlugin, {
  // 全局钩子
  hooks: {
    // 错误处理钩子
    onError: async (request, reply, error) => {
      // 检查是否为验证错误
      if (error.name === 'ZodError') {
        // 自定义验证错误响应格式
        reply.code(400).send({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          errors: error.format(),
          timestamp: new Date().toISOString()
        });
        
        // 返回true表示错误已处理
        return true;
      }
      
      // 其他错误交给默认处理器
      return false;
    }
  },
  
  // 路由配置...
});
```

### 1.4 重用验证Schema

```typescript
// 定义共享验证Schema
const schemas = {
  userId: app.validation.string().uuid(),
  
  userCreate: app.validation.object({
    username: app.validation.string().min(3).max(20),
    email: app.validation.string().email(),
    password: app.validation.string().min(8),
    role: app.validation.enum(['admin', 'user']).default('user')
  }),
  
  userUpdate: app.validation.object({
    username: app.validation.string().min(3).max(20).optional(),
    email: app.validation.string().email().optional()
  }),
  
  pagination: app.validation.object({
    page: app.validation.number().int().positive().default(1),
    limit: app.validation.number().int().positive().max(100).default(20)
  })
};

// 使用共享Schema
app.register(webPlugin, {
  routes: {
    '/api/users': {
      post: {
        validate: {
          body: schemas.userCreate
        },
        handler: createUserHandler
      },
      
      get: {
        validate: {
          query: schemas.pagination
        },
        handler: getUsersHandler
      }
    },
    
    '/api/users/:id': {
      get: {
        validate: {
          params: app.validation.object({
            id: schemas.userId
          })
        },
        handler: getUserHandler
      },
      
      put: {
        validate: {
          params: app.validation.object({
            id: schemas.userId
          }),
          body: schemas.userUpdate
        },
        handler: updateUserHandler
      }
    }
  }
});
```

### 1.5 验证中间件

```typescript
// 创建验证中间件
function createValidationMiddleware(app) {
  return {
    auth: async (request, reply) => {
      const authToken = request.headers.authorization;
      
      if (!authToken) {
        reply.code(401).send({ error: '未授权' });
        throw new Error('未授权');
      }
      
      // 验证令牌...
      request.user = { id: '1', role: 'admin' };
    },
    
    admin: async (request, reply) => {
      if (!request.user || request.user.role !== 'admin') {
        reply.code(403).send({ error: '权限不足' });
        throw new Error('权限不足');
      }
    }
  };
}

// 获取验证中间件
const middleware = createValidationMiddleware(app);

// 在路由中使用
app.register(webPlugin, {
  routes: {
    '/api/admin/users': {
      get: {
        // 组合多个中间件
        preHandler: [
          middleware.auth,    // 验证身份
          middleware.admin,   // 验证管理员权限
        ],
        validate: {
          query: schemas.pagination
        },
        handler: adminGetUsersHandler
      }
    }
  }
});
```

## 2. 与数据库插件集成

`@stratix/validation` 插件可以与 `@stratix/database` 插件集成，提供数据库模型验证能力。

### 2.1 模型验证

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';
import { databasePlugin } from '@stratix/database';

const app = createApp();

// 注册插件
app.register(validationPlugin);
app.register(databasePlugin, {
  // 数据库连接配置...
  
  // 模型定义
  models: {
    users: {
      // 表名配置
      tableName: 'users',
      
      // 数据验证模式
      schema: {
        id: app.validation.string().uuid(),
        username: app.validation.string().min(3).max(50),
        email: app.validation.string().email(),
        password: app.validation.string(),
        role: app.validation.enum(['admin', 'user', 'guest']).default('user'),
        active: app.validation.boolean().default(true),
        createdAt: app.validation.date().default(() => new Date())
      },
      
      // 其他模型配置...
    },
    
    products: {
      tableName: 'products',
      
      schema: {
        id: app.validation.string().uuid(),
        name: app.validation.string().min(2).max(100),
        description: app.validation.string().optional(),
        price: app.validation.number().positive(),
        stockQuantity: app.validation.number().int().nonnegative(),
        category: app.validation.enum(['electronics', 'clothing', 'food', 'other']),
        active: app.validation.boolean().default(true),
        createdAt: app.validation.date().default(() => new Date())
      }
    }
  }
});

// 使用带验证的模型
async function createUser(userData) {
  try {
    // 创建前会自动验证数据
    const user = await app.db.models.users.create(userData);
    return user;
  } catch (error) {
    if (error.name === 'ZodError') {
      console.error('用户数据验证失败', error.format());
      throw new Error('用户数据验证失败');
    }
    throw error;
  }
}
```

### 2.2 自定义模型验证钩子

```typescript
// 注册数据库插件
app.register(databasePlugin, {
  // 数据库连接配置...
  
  // 模型定义
  models: {
    users: {
      tableName: 'users',
      
      // 基本Schema
      schema: {
        id: app.validation.string().uuid(),
        username: app.validation.string().min(3).max(50),
        email: app.validation.string().email(),
        password: app.validation.string().min(8),
        // 其他字段...
      },
      
      // 自定义验证钩子
      hooks: {
        // 创建前钩子
        beforeCreate: async (data) => {
          // 自定义验证逻辑
          if (data.username && data.username === data.password) {
            throw new Error('用户名不能与密码相同');
          }
          
          // 数据转换
          if (data.password) {
            data.password = await hashPassword(data.password);
          }
          
          return data;
        }
      }
    }
  }
});
```

### 2.3 高级模型验证

```typescript
// 高级模型验证
app.register(databasePlugin, {
  // 数据库连接配置...
  
  // 模型定义
  models: {
    orders: {
      tableName: 'orders',
      
      // 基本Schema
      schema: app.validation.object({
        id: app.validation.string().uuid(),
        userId: app.validation.string().uuid(),
        items: app.validation.array(
          app.validation.object({
            productId: app.validation.string().uuid(),
            quantity: app.validation.number().int().positive(),
            price: app.validation.number().positive()
          })
        ),
        totalAmount: app.validation.number().positive(),
        status: app.validation.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled']),
        shippingAddress: app.validation.object({
          street: app.validation.string(),
          city: app.validation.string(),
          state: app.validation.string(),
          zipCode: app.validation.string(),
          country: app.validation.string()
        }),
        createdAt: app.validation.date().default(() => new Date())
      })
      // 添加复杂验证规则
      .refine(
        order => {
          // 计算项目总金额
          const calculatedTotal = order.items.reduce(
            (sum, item) => sum + item.quantity * item.price, 
            0
          );
          
          // 验证总金额是否匹配
          return Math.abs(calculatedTotal - order.totalAmount) < 0.001;
        },
        {
          message: '订单总金额与商品明细不匹配',
          path: ['totalAmount']
        }
      )
    }
  }
});
```

### 2.4 关联模型验证

```typescript
// 定义关联模型验证
app.register(databasePlugin, {
  // 数据库连接配置...
  
  // 模型定义
  models: {
    users: {
      tableName: 'users',
      schema: {
        id: app.validation.string().uuid(),
        username: app.validation.string().min(3).max(50),
        email: app.validation.string().email()
      },
      // 定义关联
      relations: {
        profile: { type: 'hasOne', model: 'profiles', foreignKey: 'userId' },
        posts: { type: 'hasMany', model: 'posts', foreignKey: 'authorId' }
      }
    },
    
    profiles: {
      tableName: 'profiles',
      schema: {
        id: app.validation.string().uuid(),
        userId: app.validation.string().uuid(),
        fullName: app.validation.string().optional(),
        age: app.validation.number().int().positive().optional(),
        bio: app.validation.string().optional()
      },
      // 定义关联
      relations: {
        user: { type: 'belongsTo', model: 'users', foreignKey: 'userId' }
      }
    },
    
    posts: {
      tableName: 'posts',
      schema: {
        id: app.validation.string().uuid(),
        authorId: app.validation.string().uuid(),
        title: app.validation.string().min(3).max(100),
        content: app.validation.string(),
        published: app.validation.boolean().default(false),
        createdAt: app.validation.date().default(() => new Date())
      },
      // 定义关联
      relations: {
        author: { type: 'belongsTo', model: 'users', foreignKey: 'authorId' }
      }
    }
  }
});

// 使用带验证的关联创建
async function createUserWithProfile(userData, profileData) {
  // 开始事务
  const transaction = await app.db.transaction();
  
  try {
    // 创建用户（会验证用户数据）
    const user = await app.db.models.users.create(userData, { transaction });
    
    // 创建关联的资料（会验证资料数据）
    const profile = await app.db.models.profiles.create({
      ...profileData,
      userId: user.id
    }, { transaction });
    
    // 提交事务
    await transaction.commit();
    
    return { user, profile };
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    
    // 处理验证错误
    if (error.name === 'ZodError') {
      console.error('数据验证失败', error.format());
      throw new Error('数据验证失败');
    }
    
    throw error;
  }
}
```

## 3. 与缓存插件集成

`@stratix/validation` 插件可以与 `@stratix/cache` 插件集成，提供缓存数据验证能力。

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';
import { cachePlugin } from '@stratix/cache';

const app = createApp();

// 注册插件
app.register(validationPlugin);
app.register(cachePlugin, {
  // 缓存配置...
});

// 定义用户Schema
const userSchema = app.validation.object({
  id: app.validation.string().uuid(),
  username: app.validation.string(),
  email: app.validation.string().email(),
  role: app.validation.enum(['admin', 'user']),
  lastActive: app.validation.date()
});

// 使用Schema验证缓存数据
async function getUserFromCache(userId) {
  // 从缓存获取数据
  const cachedUser = await app.cache.get(`user:${userId}`);
  
  if (cachedUser) {
    try {
      // 验证缓存数据
      const validUser = userSchema.parse(cachedUser);
      
      // 转换日期字符串为Date对象
      validUser.lastActive = new Date(validUser.lastActive);
      
      return validUser;
    } catch (error) {
      // 缓存数据无效，清除缓存
      await app.cache.delete(`user:${userId}`);
      console.warn('缓存数据验证失败，已清除缓存', error.format());
    }
  }
  
  // 从数据库获取数据
  const user = await app.db.models.users.findById(userId);
  
  if (user) {
    // 更新缓存
    await app.cache.set(`user:${userId}`, user, { ttl: 3600 });
    return user;
  }
  
  return null;
}
```

## 4. 与配置插件集成

`@stratix/validation` 插件可以与 `@stratix/config` 插件集成，提供配置验证能力。

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';
import { configPlugin } from '@stratix/config';

const app = createApp();

// 注册插件
app.register(validationPlugin);

// 使用验证Schema定义配置
app.register(configPlugin, {
  // 基础配置路径
  configPath: './config',
  
  // 配置验证Schema
  schema: {
    app: app.validation.object({
      name: app.validation.string(),
      version: app.validation.string(),
      environment: app.validation.enum(['development', 'testing', 'staging', 'production']),
      port: app.validation.number().int().positive().default(3000),
      host: app.validation.string().default('localhost'),
      baseUrl: app.validation.string().url().optional(),
      trustProxy: app.validation.boolean().default(false)
    }),
    
    db: app.validation.object({
      client: app.validation.enum(['pg', 'mysql', 'sqlite3']),
      connection: app.validation.object({
        host: app.validation.string().optional(),
        port: app.validation.number().int().positive().optional(),
        user: app.validation.string().optional(),
        password: app.validation.string().optional(),
        database: app.validation.string(),
        filename: app.validation.string().optional()
      }),
      pool: app.validation.object({
        min: app.validation.number().int().nonnegative().default(0),
        max: app.validation.number().int().positive().default(10)
      }).optional()
    }),
    
    redis: app.validation.object({
      host: app.validation.string().default('localhost'),
      port: app.validation.number().int().positive().default(6379),
      password: app.validation.string().optional(),
      db: app.validation.number().int().nonnegative().default(0)
    }).optional(),
    
    email: app.validation.object({
      service: app.validation.string().optional(),
      host: app.validation.string().optional(),
      port: app.validation.number().int().positive().optional(),
      secure: app.validation.boolean().default(true),
      auth: app.validation.object({
        user: app.validation.string(),
        pass: app.validation.string()
      })
    }).optional()
  }
});

// 验证在应用启动前执行
app.hook('beforeStart', async () => {
  // 配置已经通过验证，可以安全使用
  const { port, host } = app.config.get('app');
  console.log(`应用将在 ${host}:${port} 启动`);
});
```

## 5. 与日志插件集成

`@stratix/validation` 插件可以与 `@stratix/logger` 插件集成，提供验证错误日志能力。

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';
import { loggerPlugin } from '@stratix/logger';
import { webPlugin } from '@stratix/web';

const app = createApp();

// 注册插件
app.register(loggerPlugin, {
  // 日志配置...
  level: 'info',
  prettyPrint: process.env.NODE_ENV === 'development'
});

app.register(validationPlugin, {
  // 自定义验证错误处理，集成日志
  errorHandler: (error, context) => {
    if (app.logger) {
      // 记录验证错误
      app.logger.warn({
        msg: '数据验证失败',
        error: error.format(),
        context: {
          path: context.path,
          operation: context.operation
        }
      });
    }
    
    // 返回错误
    return error;
  }
});

app.register(webPlugin, {
  // Web配置...
  hooks: {
    onError: async (request, reply, error) => {
      if (error.name === 'ZodError') {
        // 记录API验证错误
        app.logger.warn({
          msg: 'API请求验证失败',
          method: request.method,
          url: request.url,
          ip: request.ip,
          body: request.body,
          error: error.format()
        });
        
        // 发送错误响应
        reply.code(400).send({
          error: 'Validation Error',
          details: error.format()
        });
        
        return true;
      }
      
      return false;
    }
  }
});
```

## 6. 创建自定义集成

### 6.1 插件集成工厂

```typescript
// 创建自定义集成
function createCustomIntegration(app, validationPlugin, customPlugin, options = {}) {
  // 确保插件已注册
  if (!app.validation) {
    throw new Error('Validation plugin must be registered before integration');
  }
  
  if (!app.custom) {
    throw new Error('Custom plugin must be registered before integration');
  }
  
  // 创建共享验证Schema
  const schemas = {
    // 自定义Schema定义...
  };
  
  // 扩展自定义插件
  app.custom.validate = {
    // 添加验证方法
    data: (data, schema) => {
      return app.validation.validate(schema, data);
    },
    
    // 添加Schema管理
    schemas,
    
    // 其他集成方法...
  };
  
  // 注册生命周期钩子
  app.hook('beforeClose', async () => {
    // 清理集成资源...
  });
  
  return {
    // 返回集成API
    schemas,
    
    // 其他公共方法...
  };
}

// 使用自定义集成
const app = createApp();

// 注册插件
app.register(validationPlugin);
app.register(customPlugin);

// 创建集成
const integration = createCustomIntegration(app, validationPlugin, customPlugin, {
  // 集成选项...
});
```

### 6.2 插件间通信

```typescript
// 使用事件系统集成插件
app.register(validationPlugin);
app.register(eventPlugin);

// 监听验证事件
app.events.on('validation:error', (error, context) => {
  // 处理验证错误...
  console.error('验证错误', error.format());
  
  // 发送通知或执行其他操作
  app.events.emit('notification:send', {
    type: 'error',
    title: '验证失败',
    message: '数据验证出现错误',
    details: error.format()
  });
});

// 扩展validation插件添加事件
app.validation.validate = (schema, data, options = {}) => {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    // 发出验证错误事件
    app.events.emit('validation:error', result.error, {
      operation: options.operation || 'validate',
      path: options.path || []
    });
  }
  
  return result;
};
```

## 7. 集成最佳实践

### 7.1 共享Schema策略

```typescript
// 创建共享Schema目录
// schemas/
//   |- user.js
//   |- product.js
//   |- order.js
//   |- common.js
//   |- index.js

// schemas/common.js
export default function createCommonSchemas(app) {
  return {
    id: app.validation.string().uuid(),
    pagination: app.validation.object({
      page: app.validation.number().int().positive().default(1),
      limit: app.validation.number().int().positive().max(100).default(20)
    }),
    timestamp: app.validation.object({
      createdAt: app.validation.date().default(() => new Date()),
      updatedAt: app.validation.date().optional()
    })
  };
}

// schemas/user.js
export default function createUserSchemas(app, commonSchemas) {
  return {
    base: app.validation.object({
      id: commonSchemas.id,
      username: app.validation.string().min(3).max(50),
      email: app.validation.string().email(),
      role: app.validation.enum(['admin', 'user', 'guest']).default('user')
    }),
    
    create: app.validation.object({
      username: app.validation.string().min(3).max(50),
      email: app.validation.string().email(),
      password: app.validation.string().min(8),
      role: app.validation.enum(['admin', 'user', 'guest']).optional()
    }),
    
    update: app.validation.object({
      username: app.validation.string().min(3).max(50).optional(),
      email: app.validation.string().email().optional()
    }),
    
    login: app.validation.object({
      username: app.validation.string(),
      password: app.validation.string()
    })
  };
}

// schemas/index.js
import createCommonSchemas from './common';
import createUserSchemas from './user';
import createProductSchemas from './product';
import createOrderSchemas from './order';

export default function createSchemas(app) {
  // 创建基础Schema
  const common = createCommonSchemas(app);
  
  // 创建业务Schema
  const user = createUserSchemas(app, common);
  const product = createProductSchemas(app, common);
  const order = createOrderSchemas(app, common, { user, product });
  
  // 返回所有Schema
  return {
    common,
    user,
    product,
    order
  };
}

// 使用共享Schema
import createSchemas from './schemas';

const app = createApp();
app.register(validationPlugin);

// 创建并缓存所有Schema
const schemas = createSchemas(app);

// 在插件中使用
app.register(webPlugin, {
  routes: {
    '/api/users': {
      post: {
        validate: {
          body: schemas.user.create
        },
        handler: createUserHandler
      }
    }
  }
});
```

### 7.2 统一错误处理

```typescript
// 创建统一的验证错误处理
function createErrorHandlers(app) {
  return {
    // API错误处理
    api: (error, request, reply) => {
      if (error.name === 'ZodError') {
        // 记录错误
        app.logger?.warn({
          msg: 'API验证错误',
          method: request.method,
          url: request.url,
          error: error.format()
        });
        
        // 按错误类型构造响应
        const formattedErrors = {};
        const flatErrors = error.flatten();
        
        // 格式化字段错误
        for (const [field, messages] of Object.entries(flatErrors.fieldErrors)) {
          formattedErrors[field] = Array.isArray(messages) 
            ? messages[0] 
            : messages;
        }
        
        // 处理表单级错误
        if (flatErrors.formErrors.length > 0) {
          formattedErrors._form = flatErrors.formErrors[0];
        }
        
        // 发送格式化响应
        reply.code(400).send({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          errors: formattedErrors
        });
        
        return true;
      }
      
      return false;
    },
    
    // 数据库错误处理
    database: (error, operation, entity) => {
      if (error.name === 'ZodError') {
        // 记录错误
        app.logger?.warn({
          msg: '数据库操作验证错误',
          operation,
          entity,
          error: error.format()
        });
        
        // 转换为应用级错误
        const applicationError = new Error('数据验证失败');
        applicationError.code = 'DB_VALIDATION_ERROR';
        applicationError.status = 400;
        applicationError.details = error.format();
        
        throw applicationError;
      }
      
      throw error;
    },
    
    // 配置错误处理
    config: (error) => {
      if (error.name === 'ZodError') {
        console.error('配置验证错误:');
        console.error(JSON.stringify(error.format(), null, 2));
        
        // 配置错误通常是致命的
        process.exit(1);
      }
      
      throw error;
    }
  };
}

// 使用错误处理
const app = createApp();
app.register(validationPlugin);

// 创建错误处理器
const errorHandlers = createErrorHandlers(app);

// 在Web插件中使用
app.register(webPlugin, {
  hooks: {
    onError: errorHandlers.api
  }
});

// 在数据库操作中使用
async function createUser(userData) {
  try {
    return await app.db.models.users.create(userData);
  } catch (error) {
    return errorHandlers.database(error, 'create', 'users');
  }
}
``` 