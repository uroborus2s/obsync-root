# 插件集成指南

## 1. 基本集成

Auth插件可以轻松集成到Stratix应用中，下面是基本集成步骤和示例。

### 1.1 安装插件

```bash
# 使用npm
npm install @stratix/auth

# 使用yarn
yarn add @stratix/auth

# 使用pnpm
pnpm add @stratix/auth
```

### 1.2 基本用法

```typescript
// app.ts
import { createApp } from '@stratix/core';
import webPlugin from '@stratix/web';
import databasePlugin from '@stratix/database';
import cachePlugin from '@stratix/cache';
import authPlugin from '@stratix/auth';

const app = createApp({
  name: 'my-app',
  // 全局配置...
});

// 注册依赖插件
app.register(webPlugin, {
  port: 3000,
  host: 'localhost'
});

app.register(databasePlugin, {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'my_app'
  }
});

app.register(cachePlugin, {
  driver: 'redis',
  connection: {
    host: 'localhost',
    port: 6379
  }
});

// 注册认证插件
app.register(authPlugin, {
  mode: 'full',
  secretKey: process.env.AUTH_SECRET_KEY,
  strategies: {
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET
    }
  },
  routes: {
    prefix: '/auth',
    register: true,
    login: true,
    logout: true,
    refresh: true,
    me: true
  }
});

// 启动应用
app.start()
  .then(() => console.log('Application started'))
  .catch(err => console.error('Failed to start application:', err));
```

### 1.3 纯配置方式

```typescript
// config.js
module.exports = {
  web: {
    port: 3000,
    host: 'localhost'
  },
  database: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      user: 'postgres',
      password: 'postgres',
      database: 'my_app'
    }
  },
  cache: {
    driver: 'redis',
    connection: {
      host: 'localhost',
      port: 6379
    }
  },
  auth: {
    mode: 'full',
    secretKey: process.env.AUTH_SECRET_KEY,
    strategies: {
      jwt: {
        enabled: true,
        secret: process.env.JWT_SECRET
      }
    },
    routes: {
      prefix: '/auth',
      register: true,
      login: true,
      logout: true,
      refresh: true,
      me: true
    }
  }
};

// app.ts
import { createApp } from '@stratix/core';

const app = createApp({
  name: 'my-app',
  configPath: './config.js'
});

// 启动应用
app.start()
  .then(() => console.log('Application started'))
  .catch(err => console.error('Failed to start application:', err));
```

## 2. 与Web插件集成

Auth插件与Web插件紧密集成，提供认证和授权中间件。

### 2.1 保护路由

```typescript
// 配置方式
app.register(webPlugin, {
  routes: {
    '/api/public': {
      get: 'publicController.getData' // 公开路由
    },
    '/api/private': {
      // 所有请求需要认证
      preHandler: 'auth.requireAuthentication',
      get: 'privateController.getData',
      post: 'privateController.createData'
    },
    '/api/admin': {
      // 需要admin角色
      preHandler: 'auth.requireRole("admin")',
      get: 'adminController.getData',
      post: 'adminController.createData'
    },
    '/api/resources': {
      get: {
        // 需要读取权限
        handler: 'resourceController.listResources',
        preHandler: 'auth.requirePermission("resources:read")'
      },
      post: {
        // 需要创建权限
        handler: 'resourceController.createResource',
        preHandler: 'auth.requirePermission("resources:create")'
      }
    }
  }
});

// 编程方式
const app = createApp();
app.register(webPlugin);
app.register(authPlugin, { /* 配置 */ });

// 手动添加路由和中间件
app.web.addHook('onRequest', app.auth.requireAuthentication);

app.web.addRoute('/api/admin', {
  preHandler: app.auth.requireRole('admin'),
  get: async (request, reply) => {
    return { data: 'Admin data' };
  }
});

app.web.addRoute('/api/resources', {
  get: {
    handler: async (request, reply) => {
      return { resources: [] };
    },
    preHandler: app.auth.requirePermission('resources:read')
  }
});
```

### 2.2 多层认证策略

```typescript
// 多种认证策略配置
app.register(authPlugin, {
  strategies: {
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET
    },
    oauth2: {
      enabled: true,
      providers: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: 'https://your-app.com/auth/google/callback'
          // 其他配置...
        }
      }
    },
    basic: {
      enabled: true,
      realm: 'API Access'
    }
  }
});

// 路由使用特定认证策略
app.register(webPlugin, {
  routes: {
    '/api/jwt-protected': {
      preHandler: 'auth.requireAuthentication("jwt")',
      get: 'controller.getJwtData'
    },
    '/api/basic-auth': {
      preHandler: 'auth.requireAuthentication("basic")',
      get: 'controller.getBasicAuthData'
    }
  }
});
```

### 2.3 自定义认证逻辑

```typescript
// 自定义认证处理器
app.register(webPlugin, {
  routes: {
    '/api/custom-auth': {
      preHandler: async (request, reply) => {
        // 自定义认证逻辑
        const token = request.headers['x-custom-token'];
        if (!token) {
          return reply.code(401).send({ error: 'Authentication required' });
        }
        
        try {
          // 使用Auth插件提供的方法验证令牌
          const user = await request.server.auth.validateToken(token, 'jwt');
          if (!user) {
            return reply.code(401).send({ error: 'Invalid token' });
          }
          
          // 将用户信息附加到请求
          request.user = user;
        } catch (error) {
          return reply.code(401).send({ error: error.message });
        }
      },
      get: 'controller.getData'
    }
  }
});
```

## 3. 与Cache插件集成

Auth插件使用Cache插件存储会话、令牌和用户信息，提高性能和可扩展性。

### 3.1 缓存配置

```typescript
// 缓存配置
app.register(cachePlugin, {
  driver: 'redis',
  connection: {
    host: 'localhost',
    port: 6379,
    password: process.env.REDIS_PASSWORD
  },
  prefix: 'app',
  defaultTtl: 3600
});

app.register(authPlugin, {
  cache: {
    enabled: true,
    prefix: 'auth',
    ttl: 3600,
    stores: {
      tokens: {
        prefix: 'tokens',
        ttl: 3600            // 访问令牌1小时
      },
      refreshTokens: {
        prefix: 'refresh',
        ttl: 2592000         // 刷新令牌30天
      },
      users: {
        prefix: 'users',
        ttl: 300             // 用户数据5分钟
      }
    }
  }
});
```

### 3.2 自定义缓存策略

```typescript
// 自定义缓存策略
app.register(authPlugin, {
  cache: {
    enabled: true,
    prefix: 'auth',
    stores: {
      tokens: {
        prefix: 'tokens',
        ttl: 3600,
        // 自定义序列化/反序列化
        serialize: (data) => JSON.stringify(data),
        deserialize: (data) => JSON.parse(data)
      },
      users: {
        prefix: 'users',
        ttl: 300,
        // 缓存键生成函数
        keyGenerator: (userId) => `user:${userId}`
      }
    }
  }
});
```

## 4. 与Database插件集成

Auth插件使用Database插件存储用户、角色和权限信息。

### 4.1 数据库配置

```typescript
// 数据库配置
app.register(databasePlugin, {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'my_app'
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './migrations'
  }
});

app.register(authPlugin, {
  // 数据库表配置
  users: {
    table: 'users',
    usernameField: 'username',
    emailField: 'email',
    passwordField: 'password'
  },
  rbac: {
    enabled: true,
    rolesTable: 'roles',
    permissionsTable: 'permissions',
    userRolesTable: 'user_roles',
    rolePermissionsTable: 'role_permissions'
  }
});
```

### 4.2 自定义数据访问

```typescript
// 自定义数据访问层
app.register(authPlugin, {
  // 自定义用户数据访问
  userDao: {
    findById: async (id) => {
      // 自定义查询逻辑
      return await app.database.knex('custom_users')
        .where('user_id', id)
        .first();
    },
    findByUsername: async (username) => {
      return await app.database.knex('custom_users')
        .where('login_name', username)
        .first();
    },
    // 其他方法...
  }
});
```

## 5. 使用场景示例

下面是不同使用场景的集成示例。

### 5.1 API认证

```typescript
// 保护API的配置
app.register(authPlugin, {
  mode: 'full',
  strategies: {
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET,
      header: {
        enabled: true,
        name: 'Authorization',
        scheme: 'Bearer'
      },
      cookie: {
        enabled: false
      }
    }
  }
});

// 添加API路由
app.register(webPlugin, {
  routes: {
    '/api': {
      '/public': {
        get: 'publicController.getData' // 公开API
      },
      '/users': {
        // 保护用户API
        preHandler: 'auth.requireAuthentication',
        get: 'userController.listUsers',
        post: {
          handler: 'userController.createUser',
          preHandler: 'auth.requirePermission("users:create")'
        },
        '/:id': {
          get: 'userController.getUser',
          put: {
            handler: 'userController.updateUser',
            preHandler: 'auth.requirePermission("users:update")'
          },
          delete: {
            handler: 'userController.deleteUser',
            preHandler: 'auth.requirePermission("users:delete")'
          }
        }
      }
    }
  }
});
```

### 5.2 Web应用认证

```typescript
// Web应用认证配置
app.register(authPlugin, {
  mode: 'full',
  strategies: {
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET,
      header: {
        enabled: true
      },
      cookie: {
        enabled: true,
        name: 'auth_token',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }
    },
    oauth2: {
      enabled: true,
      defaultProvider: 'google',
      providers: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/auth/google/callback'
        }
      },
      session: {
        enabled: true,
        name: 'oauth_session'
      }
    }
  },
  routes: {
    prefix: '/auth',
    register: true,
    login: true,
    logout: true,
    refresh: true,
    me: true
  }
});

// 保护页面路由
app.register(webPlugin, {
  routes: {
    '/': {
      get: 'homeController.getHomePage' // 公开页面
    },
    '/dashboard': {
      // 需要认证才能访问
      preHandler: 'auth.requireAuthentication',
      get: 'dashboardController.getDashboard'
    },
    '/admin': {
      // 需要admin角色
      preHandler: 'auth.requireRole("admin")',
      get: 'adminController.getAdminPage'
    }
  }
});
```

### 5.3 单点登录集成

```typescript
// 单点登录配置（简单模式）
app.register(authPlugin, {
  mode: 'simple',
  strategies: {
    oauth2: {
      enabled: true,
      providers: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/auth/google/callback'
        },
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: '/auth/github/callback'
        },
        azuread: {
          clientId: process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          callbackURL: '/auth/azure/callback',
          authorizationURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          tokenURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          scope: ['openid', 'profile', 'email']
        },
        cas: {
          enabled: true,
          serverUrl: 'https://cas.example.com/cas',
          serviceUrl: 'https://your-app.com',
          version: '3.0',       // CAS协议版本，支持1.0, 2.0, 3.0
          validatePath: '/p3/serviceValidate', // 自定义验证路径
          secureSSL: true,      // 是否验证SSL证书
          sessionName: 'cas_user',
          attributeMapping: {   // CAS属性映射
            id: 'id',
            username: 'user',
            email: 'mail',
            displayName: 'name',
            role: 'authorities'
          },
          cache: {
            enabled: true,
            ttl: 3600           // 缓存票据1小时
          }
        }
      }
    },
    saml: {
      enabled: true,
      providers: {
        okta: {
          entryPoint: process.env.OKTA_ENTRY_POINT,
          issuer: process.env.SAML_ISSUER,
          cert: process.env.OKTA_CERT,
          callbackUrl: '/auth/saml/callback'
        }
      }
    }
  }
});
```

### 5.3.1 CAS认证集成

CAS (Central Authentication Service) 是一种流行的企业级单点登录协议，@stratix/auth插件提供了完整的CAS支持，下面是详细配置：

```typescript
// CAS认证配置
app.register(authPlugin, {
  strategies: {
    cas: {
      enabled: true,
      // 基本配置
      serverUrl: 'https://cas.example.com/cas',  // CAS服务器URL
      serviceUrl: 'https://your-app.com',        // 您的应用URL
      version: '3.0',                           // CAS协议版本(1.0, 2.0, 3.0)
      
      // 路径配置
      loginPath: '/login',                      // 登录路径
      logoutPath: '/logout',                    // 登出路径
      validatePath: '/p3/serviceValidate',      // 票据验证路径
      
      // 安全配置
      secureSSL: true,                          // 是否验证SSL证书
      sslCert: '/path/to/cert.pem',             // SSL证书路径（可选）
      
      // 会话配置
      sessionInfo: {
        sessionName: 'cas_user',                // 会话名称
        sessionKey: 'cas_sso_token',            // 会话键名
        cookieOptions: {                        // Cookie配置
          path: '/',
          httpOnly: true,
          secure: true,
          maxAge: 86400000                      // 24小时
        }
      },
      
      // 属性映射
      attributeMapping: {
        id: 'id',                               // 用户ID
        username: 'user',                       // 用户名
        email: 'mail',                          // 邮箱
        firstName: 'givenName',                 // 名
        lastName: 'surname',                    // 姓
        displayName: 'displayName',             // 显示名称
        roles: 'authorities',                   // 角色
        groups: 'memberOf'                      // 用户组
      },
      
      // 缓存配置
      cache: {
        enabled: true,
        prefix: 'cas_tickets',
        ttl: 3600                               // 票据缓存时间（秒）
      },
      
      // 自定义处理器
      handlers: {
        // 自定义票据验证
        ticketValidator: async (ticket, service) => {
          // 自定义票据验证逻辑
          return validated;
        },
        
        // 用户转换函数
        userTransformer: (casUser) => {
          // 自定义用户数据转换
          return {
            id: casUser.id,
            username: casUser.user,
            email: casUser.attributes.mail,
            roles: casUser.attributes.authorities?.split(',') || [],
            // 其他自定义转换
          };
        },
        
        // 登录成功处理
        onLoginSuccess: async (user, request, reply) => {
          // 登录成功后的自定义处理
          await recordUserLogin(user);
          return true;
        },
        
        // 登录失败处理
        onLoginFailure: async (error, request, reply) => {
          // 登录失败后的自定义处理
          await recordFailedLogin(request);
          return false;
        }
      }
    }
  }
});
```

### 5.3.2 CAS认证流程定制

Auth插件允许您定制CAS认证流程的各个阶段：

```typescript
// CAS认证流程定制
app.register(authPlugin, {
  strategies: {
    cas: {
      enabled: true,
      serverUrl: 'https://cas.example.com/cas',
      serviceUrl: 'https://your-app.com',
      
      // 自定义路由
      routes: {
        login: {
          path: '/custom-login',               // 自定义登录路径
          handler: async (request, reply) => {
            // 自定义登录处理逻辑
            const casLoginUrl = getCasLoginUrl(request);
            return reply.redirect(casLoginUrl);
          }
        },
        logout: {
          path: '/custom-logout',              // 自定义登出路径
          handler: async (request, reply) => {
            // 自定义登出处理逻辑
            await clearUserSession(request);
            const casLogoutUrl = getCasLogoutUrl();
            return reply.redirect(casLogoutUrl);
          }
        },
        callback: {
          path: '/cas-callback',               // 自定义回调路径
          handler: async (request, reply) => {
            // 自定义回调处理逻辑
            const ticket = request.query.ticket;
            if (!ticket) {
              return reply.redirect('/login-error');
            }
            
            try {
              const user = await validateCasTicket(ticket, request);
              await setUserSession(request, user);
              return reply.redirect('/dashboard');
            } catch (error) {
              return reply.redirect('/login-error?reason=invalid-ticket');
            }
          }
        }
      },
      
      // 协议定制
      protocol: {
        ticketParam: 'custom-ticket',          // 自定义票据参数名
        serviceParam: 'custom-service',         // 自定义服务参数名
        validation: {
          format: 'json',                      // 验证返回格式(XML/JSON)
          parseResponse: (response) => {
            // 自定义响应解析
            return parsedUser;
          }
        }
      },
      
      // 高级配置
      advanced: {
        renew: false,                          // 是否每次强制重新认证
        gateway: false,                        // 是否允许网关模式
        proxyValidate: false,                  // 是否启用代理验证
        acceptAny: false,                      // 是否接受任何服务
        proxyCallback: '/proxy-callback',      // 代理回调URL
        restletIntegration: {                  // RESTLET集成
          enabled: true,
          endpoints: {
            v1: '/v1/tickets',
            v2: '/v2/tickets'
          }
        }
      }
    }
  }
});
```

### 5.3.3 CAS与其他认证方式集成

Auth插件支持CAS与其他认证方式的混合使用：

```typescript
// CAS与其他认证方式混合配置
app.register(authPlugin, {
  mode: 'full',
  strategies: {
    // CAS认证配置
    cas: {
      enabled: true,
      serverUrl: 'https://cas.example.com/cas',
      serviceUrl: 'https://your-app.com',
      version: '3.0'
    },
    
    // JWT配置(用于API访问)
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET,
      header: { enabled: true },
      cookie: { enabled: false }
    },
    
    // 本地认证作为备用
    local: {
      enabled: true,
      usernameField: 'username',
      passwordField: 'password'
    }
  },
  
  // 认证策略选择器
  strategySelector: (request) => {
    // 根据请求选择合适的认证策略
    if (request.url.startsWith('/api/')) {
      return 'jwt';  // API请求使用JWT
    } else if (request.cookies.local_auth) {
      return 'local'; // 有本地认证Cookie则使用本地认证
    } else {
      return 'cas';   // 默认使用CAS认证
    }
  },
  
  // 统一登出处理
  unifiedLogout: async (request, reply) => {
    // 清理所有认证相关的会话和Cookie
    await clearAllAuthTokens(request);
    // 重定向到CAS登出
    return reply.redirect('https://cas.example.com/cas/logout');
  }
});

// 路由配置
app.register(webPlugin, {
  routes: {
    '/auth/login': {
      get: 'authController.choosePath',        // 选择登录方式
      post: 'authController.localLogin'        // 本地登录处理
    },
    '/auth/cas': {
      get: 'authController.casLogin'           // CAS登录
    },
    '/auth/logout': {
      get: 'authController.unifiedLogout'      // 统一登出
    },
    '/api': {
      preHandler: 'auth.requireAuthentication("jwt")', // API使用JWT认证
      '/users': {
        get: 'userController.listUsers'
      }
    },
    '/dashboard': {
      preHandler: 'auth.requireAuthentication', // 默认认证策略(CAS或本地)
      get: 'dashboardController.getDashboard'
    }
  }
});
```

## 6. 高级定制

### 6.1 添加自定义钩子

```typescript
// 添加认证钩子
app.register(authPlugin, {
  hooks: {
    beforeRegister: async (userData, request) => {
      // 注册前处理
      // 例如：验证额外字段、应用业务规则等
      if (userData.email && userData.email.endsWith('@example.com')) {
        throw new Error('Registration from example.com is not allowed');
      }
      
      // 可以修改userData
      userData.metadata = {
        ...userData.metadata,
        registrationSource: 'web',
        ipAddress: request.ip
      };
      
      return userData;
    },
    afterRegister: async (user, request) => {
      // 注册后处理
      // 例如：发送欢迎邮件、创建默认设置等
      await app.services.email.sendWelcomeEmail(user.email);
      
      return user;
    },
    beforeLogin: async (credentials, request) => {
      // 登录前处理
      // 例如：IP限制、风险评估等
      const bannedIps = await app.cache.get('banned_ips');
      if (bannedIps && bannedIps.includes(request.ip)) {
        throw new Error('Login blocked from this IP');
      }
      
      return credentials;
    },
    afterLogin: async (user, tokens, request) => {
      // 登录后处理
      // 例如：记录登录活动、更新最后登录时间等
      await app.database.knex('users')
        .where('id', user.id)
        .update({
          last_login: new Date(),
          login_count: app.database.knex.raw('login_count + 1')
        });
      
      return { user, tokens };
    }
  }
});
```

### 6.2 自定义密码策略

```typescript
// 自定义密码策略
app.register(authPlugin, {
  security: {
    passwordPolicy: {
      minLength: 10,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      validate: (password, user) => {
        // 自定义验证逻辑
        if (password.includes(user.username)) {
          return { valid: false, message: 'Password cannot contain username' };
        }
        
        // 检查常见密码列表
        const commonPasswords = ['password123', 'qwerty123', '123456789'];
        if (commonPasswords.includes(password)) {
          return { valid: false, message: 'Password is too common' };
        }
        
        return { valid: true };
      },
      hashingAlgorithm: 'argon2id',
      hashingOptions: {
        timeCost: 3,
        memoryCost: 65536,
        parallelism: 4
      }
    }
  }
});
```

### 6.3 自定义令牌处理

```typescript
// 自定义令牌处理
app.register(authPlugin, {
  strategies: {
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET,
      algorithm: 'RS256',
      // 使用私钥/公钥
      secretOrPrivateKey: fs.readFileSync('./private-key.pem'),
      secretOrPublicKey: fs.readFileSync('./public-key.pem'),
      // 自定义令牌验证
      verifyOptions: {
        issuer: 'my-app',
        audience: 'api',
        algorithms: ['RS256'],
        maxAge: '1h'
      },
      // 自定义令牌生成
      signOptions: {
        issuer: 'my-app',
        audience: 'api',
        algorithm: 'RS256',
        expiresIn: '1h'
      },
      // 自定义负载
      payload: {
        identityField: 'sub',
        customFields: ['roles', 'permissions', 'name', 'email']
      }
    }
  }
});
``` 