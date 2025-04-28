# 认证策略设计

## 1. 概述

auth插件支持多种认证策略，可以根据应用需求灵活配置。每种策略都有其特定的使用场景和配置选项。插件设计允许同时启用多种认证策略，并可以根据请求类型自动选择合适的策略。

## 2. JWT策略

JWT(JSON Web Token)是一种基于令牌的认证机制，适用于无状态API认证。

### 2.1 配置选项

```typescript
interface JwtStrategyOptions {
  enabled: boolean;                // 是否启用JWT策略
  secret: string;                  // JWT签名密钥
  algorithm?: string;              // 签名算法，默认为'HS256'
  issuer?: string;                 // 令牌签发者
  audience?: string;               // 令牌接收者
  expiresIn?: number;              // 访问令牌过期时间(秒)
  refreshExpiresIn?: number;       // 刷新令牌过期时间(秒)
  cookie?: {                       // Cookie配置
    enabled: boolean;              // 是否启用Cookie
    name: string;                  // Cookie名称
    httpOnly: boolean;             // 是否为httpOnly
    secure: boolean;               // 是否为secure
    sameSite?: 'strict' | 'lax' | 'none'; // SameSite设置
  };
  header?: {                       // Header配置
    enabled: boolean;              // 是否启用Header
    name: string;                  // Header名称，默认'Authorization'
    scheme: string;                // 认证方案，默认'Bearer'
  };
  payload?: {                      // Payload配置
    identityField: string;         // 标识字段，默认'sub'
    customFields?: string[];       // 自定义字段
  };
}
```

### 2.2 工作流程

1. **登录流程**：
   - 验证用户凭证
   - 生成包含用户标识和权限的JWT
   - 返回访问令牌和刷新令牌

2. **认证流程**：
   - 从请求中提取JWT（Header或Cookie）
   - 验证JWT签名和有效期
   - 解析用户信息和权限
   - 将用户信息附加到请求对象

3. **刷新流程**：
   - 验证刷新令牌
   - 生成新的访问令牌
   - 返回新的令牌对

### 2.3 示例配置

```javascript
{
  strategies: {
    jwt: {
      enabled: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      algorithm: 'HS256',
      expiresIn: 3600,               // 1小时
      refreshExpiresIn: 2592000,     // 30天
      cookie: {
        enabled: true,
        name: 'auth_token',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      },
      header: {
        enabled: true,
        name: 'Authorization',
        scheme: 'Bearer'
      }
    }
  }
}
```

## 3. OAuth2策略

OAuth2是一种授权框架，允许第三方应用获取对用户资源的有限访问权限。

### 3.1 配置选项

```typescript
interface OAuth2StrategyOptions {
  enabled: boolean;                // 是否启用OAuth2策略
  defaultProvider?: string;        // 默认提供商
  providers: {                     // OAuth2提供商配置
    [provider: string]: {
      clientId: string;            // 客户端ID
      clientSecret: string;        // 客户端密钥
      callbackURL: string;         // 回调URL
      authorizationURL: string;    // 授权URL
      tokenURL: string;            // 令牌URL
      userInfoURL: string;         // 用户信息URL
      scope: string[];             // 请求的权限范围
      // 映射函数，将提供商用户数据映射到系统用户数据
      profileMapping?: {
        id: string;                // ID字段映射
        username?: string;         // 用户名字段映射
        email?: string;            // 邮箱字段映射
        // 其他字段映射...
      };
    };
  };
  // 会话配置
  session?: {
    enabled: boolean;              // 是否使用会话
    name: string;                  // 会话名称
  };
  // 令牌存储配置
  tokenStorage?: {
    type: 'memory' | 'cache' | 'database'; // 存储类型
    options?: any;                 // 存储选项
  };
}
```

### 3.2 工作流程

1. **授权流程**：
   - 重定向用户到提供商授权页面
   - 用户授权后，提供商重定向回应用回调URL
   - 应用使用授权码获取访问令牌
   - 使用访问令牌获取用户信息
   - 创建或更新用户，并生成session或JWT

2. **认证检查**：
   - 验证session或JWT中的OAuth信息
   - 必要时刷新访问令牌
   - 将用户信息附加到请求对象

### 3.3 示例配置

```javascript
{
  strategies: {
    oauth2: {
      enabled: true,
      defaultProvider: 'google',
      providers: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: 'https://your-app.com/auth/google/callback',
          authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenURL: 'https://oauth2.googleapis.com/token',
          userInfoURL: 'https://openidconnect.googleapis.com/v1/userinfo',
          scope: ['email', 'profile'],
          profileMapping: {
            id: 'sub',
            username: 'name',
            email: 'email'
          }
        },
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: 'https://your-app.com/auth/github/callback',
          authorizationURL: 'https://github.com/login/oauth/authorize',
          tokenURL: 'https://github.com/login/oauth/access_token',
          userInfoURL: 'https://api.github.com/user',
          scope: ['user:email'],
          profileMapping: {
            id: 'id',
            username: 'login',
            email: 'email'
          }
        }
      },
      session: {
        enabled: true,
        name: 'oauth_session'
      },
      tokenStorage: {
        type: 'cache',
        options: {
          ttl: 86400 // 24小时
        }
      }
    }
  }
}
```

## 4. SAML策略

SAML(Security Assertion Markup Language)是一种基于XML的开放标准，用于在身份提供者和服务提供者之间交换认证和授权数据。

### 4.1 配置选项

```typescript
interface SamlStrategyOptions {
  enabled: boolean;                // 是否启用SAML策略
  providers: {                     // SAML提供商配置
    [provider: string]: {
      entryPoint: string;          // 身份提供者登录URL
      issuer: string;              // 服务提供者实体ID
      cert: string;                // 身份提供者证书
      privateKey?: string;         // 服务提供者私钥
      decryptionPvk?: string;      // 解密私钥
      callbackUrl: string;         // 断言消费服务URL
      // 映射函数，将SAML断言映射到系统用户数据
      attributeMapping?: {
        id: string;                // ID属性映射
        username?: string;         // 用户名属性映射
        email?: string;            // 邮箱属性映射
        // 其他属性映射...
      };
    };
  };
  // 会话配置
  session?: {
    enabled: boolean;              // 是否使用会话
    name: string;                  // 会话名称
  };
}
```

### 4.2 工作流程

1. **SP发起的SSO**：
   - 重定向用户到IdP登录页面
   - 用户登录后，IdP发送SAML断言到回调URL
   - 验证SAML断言并提取用户信息
   - 创建或更新用户，并生成session或JWT

2. **IdP发起的SSO**：
   - IdP发送SAML断言到回调URL
   - 验证SAML断言并提取用户信息
   - 创建或更新用户，并生成session或JWT

### 4.3 示例配置

```javascript
{
  strategies: {
    saml: {
      enabled: true,
      providers: {
        okta: {
          entryPoint: 'https://your-org.okta.com/app/app-id/sso/saml',
          issuer: 'https://your-app.com',
          cert: fs.readFileSync('/path/to/okta.cert', 'utf8'),
          callbackUrl: 'https://your-app.com/auth/saml/callback',
          attributeMapping: {
            id: 'nameID',
            username: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
            email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
          }
        }
      },
      session: {
        enabled: true,
        name: 'saml_session'
      }
    }
  }
}
```

## 5. Basic Auth策略

Basic Auth是一种简单的认证方案，使用Base64编码的用户名和密码。

### 5.1 配置选项

```typescript
interface BasicAuthStrategyOptions {
  enabled: boolean;                // 是否启用Basic Auth策略
  realm?: string;                  // 认证领域
  userLookup: {                    // 用户查找配置
    usernameField: string;         // 用户名字段
    passwordField: string;         // 密码字段
  };
}
```

### 5.2 工作流程

1. **认证流程**：
   - 从Authorization header中提取凭证
   - 解码Base64编码的用户名和密码
   - 验证用户名和密码
   - 将用户信息附加到请求对象

### 5.3 示例配置

```javascript
{
  strategies: {
    basic: {
      enabled: true,
      realm: 'Secure Area',
      userLookup: {
        usernameField: 'username',
        passwordField: 'password'
      }
    }
  }
}
```

## 6. 自定义策略

Auth插件支持开发者添加自定义认证策略，以满足特定需求。

### 6.1 策略接口

```typescript
interface AuthStrategy {
  name: string;                    // 策略名称
  authenticate: (request: any, config: any) => Promise<any>; // 认证方法
  generateToken?: (user: any, config: any) => Promise<any>;  // 生成令牌方法
  validateToken?: (token: any, config: any) => Promise<any>; // 验证令牌方法
  revokeToken?: (token: any, config: any) => Promise<void>;  // 撤销令牌方法
}
```

### 6.2 注册自定义策略

```typescript
// 在插件配置中注册自定义策略
{
  strategies: {
    custom: {
      enabled: true,
      strategyClass: MyCustomStrategy,
      // 策略特定配置...
    }
  }
}
```

### 6.3 示例实现

```typescript
class ApiKeyStrategy implements AuthStrategy {
  name = 'apikey';
  
  async authenticate(request, config) {
    const apiKey = request.headers[config.headerName || 'x-api-key'];
    if (!apiKey) {
      throw new Error('API key not provided');
    }
    
    // 查找与API key关联的用户
    const user = await findUserByApiKey(apiKey);
    if (!user) {
      throw new Error('Invalid API key');
    }
    
    return user;
  }
  
  async generateToken(user, config) {
    // 生成新的API key
    const apiKey = generateRandomString(32);
    await saveApiKey(user.id, apiKey);
    return { apiKey };
  }
  
  async validateToken(token, config) {
    // 验证API key
    return findUserByApiKey(token.apiKey);
  }
  
  async revokeToken(token, config) {
    // 撤销API key
    await removeApiKey(token.apiKey);
  }
}
``` 