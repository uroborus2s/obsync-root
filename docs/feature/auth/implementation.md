# 实现详情

## 1. 核心模块实现

Auth插件的核心模块负责协调各个组件的工作，提供统一的API。

### 1.1 插件结构

```
packages/auth/
├── src/
│   ├── index.ts                  // 入口文件
│   ├── plugin.ts                 // 插件定义
│   ├── types.ts                  // 类型定义
│   ├── constants.ts              // 常量定义
│   ├── errors/                   // 错误类
│   │   ├── index.ts
│   │   ├── auth-error.ts
│   │   └── ...
│   ├── strategies/               // 认证策略
│   │   ├── index.ts
│   │   ├── jwt.ts
│   │   ├── oauth2.ts
│   │   ├── saml.ts
│   │   ├── basic.ts
│   │   └── ...
│   ├── controllers/              // 控制器
│   │   ├── index.ts
│   │   ├── auth-controller.ts
│   │   ├── user-controller.ts
│   │   ├── role-controller.ts
│   │   └── ...
│   ├── models/                   // 数据模型
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── role.ts
│   │   ├── permission.ts
│   │   └── ...
│   ├── services/                 // 业务逻辑
│   │   ├── index.ts
│   │   ├── auth-service.ts
│   │   ├── user-service.ts
│   │   ├── role-service.ts
│   │   └── ...
│   ├── middlewares/              // 中间件
│   │   ├── index.ts
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   └── ...
│   ├── utils/                    // 工具函数
│   │   ├── index.ts
│   │   ├── crypto.ts
│   │   ├── validators.ts
│   │   └── ...
│   ├── dao/                      // 数据访问
│   │   ├── index.ts
│   │   ├── user-dao.ts
│   │   ├── role-dao.ts
│   │   └── ...
│   └── migrations/               // 数据库迁移
│       ├── index.ts
│       └── ...
├── test/                         // 测试
├── package.json
└── tsconfig.json
```

### 1.2 插件入口

```typescript
// index.ts
import { StratixPlugin } from '@stratix/core';
import { createAuthPlugin } from './plugin';

const authPlugin: StratixPlugin = createAuthPlugin();

export default authPlugin;
export * from './types';
export * from './strategies';
export * from './middlewares';
export * from './services';
export * from './controllers';
export * from './models';
```

### 1.3 插件工厂

```typescript
// plugin.ts
import { StratixPlugin } from '@stratix/core';
import { AuthPluginOptions } from './types';
import { configSchema } from './config-schema';
import { registerStrategies } from './strategies';
import { setupRoutes } from './routes';
import { registerMiddlewares } from './middlewares';
import { setupMigrations } from './migrations';
import { setupServices } from './services';

export function createAuthPlugin(
  factoryOptions: any = {}
): StratixPlugin<AuthPluginOptions> {
  return {
    name: 'auth',
    dependencies: ['web', 'database', 'cache'],
    optionalDependencies: ['logger'],
    register: async (app, options) => {
      // 合并默认选项
      const pluginOptions = {
        ...getDefaultOptions(),
        ...options
      };
      
      // 设置钩子
      registerHooks(app);
      
      // 设置数据库迁移
      if (pluginOptions.mode !== 'proxy') {
        await setupMigrations(app, pluginOptions);
      }
      
      // 设置服务
      const services = await setupServices(app, pluginOptions);
      
      // 注册认证策略
      const strategies = await registerStrategies(app, pluginOptions, services);
      
      // 注册中间件
      const middlewares = registerMiddlewares(app, pluginOptions, strategies, services);
      
      // 设置路由
      await setupRoutes(app, pluginOptions, middlewares, services);
      
      // 添加装饰器
      app.decorate('auth', {
        // 认证方法
        authenticate: async (request, strategy = 'default') => {
          return strategies[strategy].authenticate(request, pluginOptions);
        },
        
        // 生成令牌
        generateToken: async (user, strategy = 'default') => {
          return strategies[strategy].generateToken(user, pluginOptions);
        },
        
        // 校验令牌
        validateToken: async (token, strategy = 'default') => {
          return strategies[strategy].validateToken(token, pluginOptions);
        },
        
        // 撤销令牌
        revokeToken: async (token, strategy = 'default') => {
          return strategies[strategy].revokeToken(token, pluginOptions);
        },
        
        // 中间件
        requireAuthentication: middlewares.requireAuthentication,
        requirePermission: middlewares.requirePermission,
        requireRole: middlewares.requireRole,
        
        // 服务
        userService: services.userService,
        roleService: services.roleService,
        permissionService: services.permissionService,
        
        // 工具方法
        isAuthenticated: (request) => !!request.user,
        getUser: (request) => request.user,
        hasPermission: (request, permission) => {
          return services.permissionService.hasPermission(request.user, permission);
        },
        hasRole: (request, role) => {
          return services.roleService.hasRole(request.user, role);
        }
      });
      
      // 关闭钩子
      app.hook('beforeClose', async () => {
        // 清理资源
        await cleanupResources(app, pluginOptions);
      });
    },
    schema: configSchema
  };
}

// 默认选项
function getDefaultOptions(): Partial<AuthPluginOptions> {
  return {
    mode: 'full',
    tokenExpiration: {
      access: 3600,        // 1小时
      refresh: 2592000     // 30天
    },
    users: {
      table: 'users',
      usernameField: 'username',
      emailField: 'email',
      passwordField: 'password'
    },
    routes: {
      prefix: '/auth',
      register: true,
      login: true,
      logout: true,
      refresh: true,
      me: true
    },
    cache: {
      enabled: true,
      prefix: 'auth',
      ttl: 3600
    }
  };
}

// 注册钩子
function registerHooks(app) {
  // 实现钩子注册逻辑...
}

// 清理资源
async function cleanupResources(app, options) {
  // 实现资源清理逻辑...
}
```

## 2. 认证策略实现

每种认证策略都有专门的实现类，遵循统一的接口。

### 2.1 JWT策略实现

```typescript
// strategies/jwt.ts
import { JwtStrategyOptions } from '../types';
import { AuthStrategy } from './strategy-interface';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors';
import { extractToken } from '../utils/token-extractor';

export class JwtStrategy implements AuthStrategy {
  name = 'jwt';
  
  constructor(
    private readonly app: any,
    private readonly options: JwtStrategyOptions
  ) {}
  
  async authenticate(request, config) {
    // 提取令牌
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    
    try {
      // 验证令牌
      const decoded = jwt.verify(token, this.options.secret, {
        algorithms: [this.options.algorithm || 'HS256'],
        issuer: this.options.issuer,
        audience: this.options.audience
      });
      
      // 检查令牌是否在黑名单中
      const cache = this.app.cache;
      if (cache) {
        const isBlacklisted = await cache.get(`${config.cache.prefix}.blacklist.${decoded.jti}`);
        if (isBlacklisted) {
          throw new UnauthorizedError('Token has been revoked');
        }
      }
      
      // 获取用户信息
      const userService = this.app.auth.userService;
      const identityField = this.options.payload?.identityField || 'sub';
      const userId = decoded[identityField];
      const user = await userService.findById(userId);
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      
      return user;
    } catch (error) {
      throw new UnauthorizedError(`Invalid token: ${error.message}`);
    }
  }
  
  async generateToken(user, config) {
    const payload = {
      sub: user.id,
      jti: generateTokenId(),  // 唯一令牌ID
      // 添加自定义字段
      ...(this.options.payload?.customFields?.reduce((acc, field) => {
        if (user[field]) {
          acc[field] = user[field];
        }
        return acc;
      }, {}))
    };
    
    // 生成访问令牌
    const accessToken = jwt.sign(payload, this.options.secret, {
      algorithm: this.options.algorithm || 'HS256',
      expiresIn: this.options.expiresIn || config.tokenExpiration.access,
      issuer: this.options.issuer,
      audience: this.options.audience
    });
    
    // 生成刷新令牌
    const refreshToken = jwt.sign(
      { sub: user.id, jti: generateTokenId() },
      this.options.secret,
      {
        algorithm: this.options.algorithm || 'HS256',
        expiresIn: this.options.refreshExpiresIn || config.tokenExpiration.refresh,
        issuer: this.options.issuer,
        audience: this.options.audience
      }
    );
    
    // 存储刷新令牌
    if (this.app.cache && config.cache.enabled) {
      const cache = this.app.cache;
      await cache.set(
        `${config.cache.prefix}.refresh_tokens.${user.id}`,
        refreshToken,
        this.options.refreshExpiresIn || config.tokenExpiration.refresh
      );
    }
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.options.expiresIn || config.tokenExpiration.access
    };
  }
  
  async validateToken(token, config) {
    try {
      const decoded = jwt.verify(token, this.options.secret, {
        algorithms: [this.options.algorithm || 'HS256'],
        issuer: this.options.issuer,
        audience: this.options.audience
      });
      
      return decoded;
    } catch (error) {
      return null;
    }
  }
  
  async revokeToken(token, config) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.jti) {
        return;
      }
      
      // 将令牌加入黑名单
      if (this.app.cache && config.cache.enabled) {
        const cache = this.app.cache;
        const tokenTtl = getTokenRemainingTime(decoded);
        if (tokenTtl > 0) {
          await cache.set(
            `${config.cache.prefix}.blacklist.${decoded.jti}`,
            true,
            tokenTtl
          );
        }
      }
    } catch (error) {
      // 忽略解码错误
    }
  }
  
  private extractToken(request) {
    // 从头部或Cookie中提取令牌
    if (this.options.header?.enabled !== false) {
      const headerName = this.options.header?.name || 'Authorization';
      const scheme = this.options.header?.scheme || 'Bearer';
      const header = request.headers[headerName.toLowerCase()];
      
      if (header) {
        if (scheme) {
          const [authScheme, token] = header.split(' ');
          if (authScheme === scheme && token) {
            return token;
          }
        } else {
          return header;
        }
      }
    }
    
    // 从Cookie中提取
    if (this.options.cookie?.enabled) {
      const cookieName = this.options.cookie.name;
      return request.cookies[cookieName];
    }
    
    return null;
  }
}

// 生成唯一令牌ID
function generateTokenId() {
  return require('crypto').randomBytes(16).toString('hex');
}

// 计算令牌剩余有效时间
function getTokenRemainingTime(decoded) {
  if (!decoded.exp) {
    return 0;
  }
  
  const now = Math.floor(Date.now() / 1000);
  const exp = decoded.exp;
  
  return Math.max(0, exp - now);
}
```

### 2.2 OAuth2策略实现

```typescript
// strategies/oauth2.ts
import { OAuth2StrategyOptions } from '../types';
import { AuthStrategy } from './strategy-interface';
import { UnauthorizedError } from '../errors';

export class OAuth2Strategy implements AuthStrategy {
  name = 'oauth2';
  
  constructor(
    private readonly app: any,
    private readonly options: OAuth2StrategyOptions
  ) {}
  
  // 注意：OAuth2认证通常不是通过authenticate方法，而是通过专门的控制器处理
  async authenticate(request, config) {
    // 这里主要处理令牌验证
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    
    // 验证令牌
    return this.validateOAuth2Token(token, config);
  }
  
  // 生成授权URL
  async getAuthorizationUrl(provider, redirectUri, state, scope) {
    const providerConfig = this.options.providers[provider];
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }
    
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri || providerConfig.callbackURL,
      response_type: 'code',
      state: state || generateState(),
      scope: (scope || providerConfig.scope || []).join(' ')
    });
    
    return `${providerConfig.authorizationURL}?${params.toString()}`;
  }
  
  // 交换授权码获取令牌
  async exchangeCodeForToken(provider, code, redirectUri) {
    const providerConfig = this.options.providers[provider];
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }
    
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri || providerConfig.callbackURL
    });
    
    const response = await fetch(providerConfig.tokenURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  // 获取用户信息
  async getUserProfile(provider, accessToken) {
    const providerConfig = this.options.providers[provider];
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured`);
    }
    
    const response = await fetch(providerConfig.userInfoURL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }
    
    const userData = await response.json();
    
    // 映射用户数据
    const mapping = providerConfig.profileMapping || {};
    const mappedData = {
      id: userData[mapping.id || 'id'],
      username: mapping.username ? userData[mapping.username] : undefined,
      email: mapping.email ? userData[mapping.email] : undefined,
      profile: {}
    };
    
    // 映射其他字段
    Object.entries(mapping).forEach(([key, value]) => {
      if (!['id', 'username', 'email'].includes(key) && value && userData[value]) {
        mappedData.profile[key] = userData[value];
      }
    });
    
    return mappedData;
  }
  
  // 实现其他必要方法
  async generateToken(user, config) {
    // 如果有配置JWT认证，可以使用JWT策略生成令牌
    if (this.app.auth.strategies.jwt) {
      return this.app.auth.strategies.jwt.generateToken(user, config);
    }
    
    // 否则使用简单会话令牌
    const tokenId = generateTokenId();
    const token = {
      id: tokenId,
      userId: user.id,
      expiresAt: new Date(Date.now() + config.tokenExpiration.access * 1000)
    };
    
    // 存储令牌
    if (this.app.cache && config.cache.enabled) {
      await this.app.cache.set(
        `${config.cache.prefix}.oauth_tokens.${tokenId}`,
        token,
        config.tokenExpiration.access
      );
    }
    
    return { token: tokenId };
  }
  
  async validateToken(token, config) {
    // 如果使用JWT，委托给JWT策略
    if (this.app.auth.strategies.jwt) {
      return this.app.auth.strategies.jwt.validateToken(token, config);
    }
    
    // 否则从缓存检查令牌
    if (this.app.cache && config.cache.enabled) {
      return this.app.cache.get(`${config.cache.prefix}.oauth_tokens.${token}`);
    }
    
    return null;
  }
  
  async revokeToken(token, config) {
    // 如果使用JWT，委托给JWT策略
    if (this.app.auth.strategies.jwt) {
      return this.app.auth.strategies.jwt.revokeToken(token, config);
    }
    
    // 否则从缓存删除令牌
    if (this.app.cache && config.cache.enabled) {
      await this.app.cache.delete(`${config.cache.prefix}.oauth_tokens.${token}`);
    }
  }
  
  private extractToken(request) {
    // 从请求中提取OAuth令牌
    // ...实现令牌提取逻辑
  }
  
  private async validateOAuth2Token(token, config) {
    // 验证OAuth令牌
    // ...实现令牌验证逻辑
  }
}

// 生成随机状态
function generateState() {
  return require('crypto').randomBytes(16).toString('hex');
}

// 生成唯一令牌ID
function generateTokenId() {
  return require('crypto').randomBytes(16).toString('hex');
}