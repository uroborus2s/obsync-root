# Stratix Auth 插件设计文档

## 1. 插件概述

Auth插件(`@stratix/auth`)是Stratix框架中用于处理用户认证和授权的核心插件。它提供了灵活、安全且易于配置的认证解决方案，支持多种认证方式，并能够无缝集成到Stratix应用中。

### 1.1 设计目标

- 提供统一的认证/授权接口
- 支持多种认证方式（JWT、OAuth2、Basic Auth等）
- 同时支持多个单点登录提供商
- 灵活配置权限模型（完整模式和简单模式）
- 支持转发模式，作为第三方认证服务的代理
- 高性能和可扩展性
- 完善的类型定义和文档

### 1.2 核心功能

- **多认证策略**：支持JWT、OAuth2、SAML、Basic Auth等多种认证方式
- **用户管理**：用户注册、登录、资料管理等基本功能
- **角色权限管理**：基于角色(RBAC)和基于属性(ABAC)的访问控制
- **会话管理**：集成缓存插件实现高效的会话存储和管理
- **认证流程**：支持多种认证流程，包括密码认证、社交登录、单点登录等
- **安全防护**：防止常见的安全攻击，如CSRF、XSS等
- **可扩展性**：插件化设计，便于扩展新的认证提供商和策略

### 1.3 依赖关系

- **必要依赖**：
  - `@stratix/web`：提供HTTP服务和路由功能
  - `@stratix/database`：存储用户、角色和权限信息
  - `@stratix/cache`：缓存认证令牌和会话信息
  
- **可选依赖**：
  - `@stratix/logger`：日志记录
  - `@stratix/config`：高级配置管理

### 1.4 使用场景

- **Web应用认证**：为Web应用提供用户登录和权限控制
- **API授权**：保护API端点，确保只有授权用户才能访问
- **微服务认证**：作为微服务架构中的认证服务
- **单点登录集成**：与第三方单点登录服务集成
- **认证代理**：作为认证服务的代理，转发认证请求

## 2. 插件架构

### 2.1 整体架构

Auth插件采用模块化架构，由以下几个核心模块组成：

1. **核心模块**：提供基础认证/授权功能和插件配置
2. **策略模块**：实现不同的认证策略（JWT、OAuth2等）
3. **用户模块**：处理用户管理相关功能
4. **角色权限模块**：实现RBAC和ABAC权限控制
5. **会话模块**：管理用户会话和令牌
6. **钩子系统**：提供认证生命周期钩子
7. **路由和控制器**：提供认证相关的API端点
8. **工具和助手**：提供通用工具和辅助功能

### 2.2 工作流程

1. **初始化阶段**：
   - 加载配置和认证策略
   - 注册路由和中间件
   - 设置钩子和拦截器
   
2. **认证流程**：
   - 接收认证请求
   - 根据请求类型选择认证策略
   - 执行认证逻辑
   - 生成令牌或会话
   - 返回认证结果
   
3. **授权流程**：
   - 拦截受保护资源的请求
   - 验证认证状态
   - 检查权限
   - 放行或拒绝请求

### 2.3 数据模型

Auth插件使用以下核心数据模型：

#### 用户(User)模型
```
{
  id: string,               // 唯一标识符
  username: string,         // 用户名
  email: string,            // 电子邮件
  password: string,         // 加密密码（完整模式）
  externalIds: {            // 外部ID映射
    [provider: string]: string
  },
  status: 'active' | 'inactive' | 'locked', // 用户状态
  profile: {                // 用户资料
    firstName?: string,
    lastName?: string,
    // 其他资料字段...
  },
  roles: string[],          // 角色ID列表
  permissions: string[],    // 直接权限列表
  metadata: object,         // 元数据
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

#### 角色(Role)模型
```
{
  id: string,               // 唯一标识符
  name: string,             // 角色名称
  description: string,      // 角色描述
  permissions: string[],    // 权限ID列表
  metadata: object,         // 元数据
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

#### 权限(Permission)模型
```
{
  id: string,               // 唯一标识符
  name: string,             // 权限名称
  description: string,      // 权限描述
  resource: string,         // 资源类型
  action: string,           // 操作类型(create, read, update, delete等)
  conditions: object,       // 条件表达式（ABAC）
  metadata: object,         // 元数据
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

#### 令牌(Token)模型
```
{
  id: string,               // 唯一标识符
  userId: string,           // 关联用户ID
  type: string,             // 令牌类型(access, refresh, reset等)
  value: string,            // 令牌值
  expiresAt: Date,          // 过期时间
  metadata: object,         // 元数据
  createdAt: Date           // 创建时间
}
```

#### 提供商(Provider)模型
```
{
  id: string,               // 唯一标识符
  name: string,             // 提供商名称
  type: string,             // 提供商类型(oauth2, saml等)
  config: {                 // 提供商配置
    clientId?: string,
    clientSecret?: string,
    // 其他配置...
  },
  enabled: boolean,         // 是否启用
  metadata: object,         // 元数据
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

## 3. 插件配置

### 3.1 基本配置

Auth插件提供灵活的配置选项，以适应不同的使用场景：

```typescript
interface AuthPluginOptions {
  // 基本配置
  mode: 'full' | 'simple' | 'proxy';  // 插件工作模式
  secretKey: string;                  // 用于签名JWT等的密钥
  tokenExpiration: {                  // 令牌过期时间配置
    access: number;                   // 访问令牌过期时间(秒)
    refresh: number;                  // 刷新令牌过期时间(秒)
  };
  
  // 用户配置
  users: {
    table: string;                    // 用户表名，默认'users'
    usernameField: string;            // 用户名字段，默认'username'
    emailField: string;               // 邮箱字段，默认'email'
    passwordField: string;            // 密码字段，默认'password'
    // ... 其他用户配置
  };
  
  // 角色权限配置（完整模式）
  rbac?: {
    enabled: boolean;                 // 是否启用RBAC
    rolesTable: string;               // 角色表名，默认'roles'
    permissionsTable: string;         // 权限表名，默认'permissions'
    userRolesTable: string;           // 用户角色关联表，默认'user_roles'
    // ... 其他RBAC配置
  };
  
  // 认证策略配置
  strategies: {
    jwt?: JwtStrategyOptions;         // JWT策略配置
    oauth2?: OAuth2StrategyOptions;   // OAuth2策略配置
    basic?: BasicAuthStrategyOptions; // Basic Auth策略配置
    // ... 其他策略
  };
  
  // 提供商配置
  providers?: {
    [name: string]: ProviderConfig;   // 各认证提供商配置
  };
  
  // 代理配置（代理模式）
  proxy?: {
    targetUrl: string;                // 目标认证服务URL
    headers?: Record<string, string>; // 请求头配置
    // ... 其他代理配置
  };
  
  // 路由配置
  routes?: {
    prefix: string;                   // API路由前缀，默认'/auth'
    register?: boolean | RouteConfig; // 注册路由配置
    login?: boolean | RouteConfig;    // 登录路由配置
    logout?: boolean | RouteConfig;   // 登出路由配置
    refresh?: boolean | RouteConfig;  // 刷新令牌路由配置
    me?: boolean | RouteConfig;       // 用户信息路由配置
    // ... 其他路由配置
  };
  
  // 缓存配置
  cache?: {
    enabled: boolean;                 // 是否启用缓存
    prefix: string;                   // 缓存键前缀
    ttl: number;                      // 默认TTL(秒)
  };
  
  // 钩子配置
  hooks?: {
    beforeRegister?: HookFunction;    // 注册前钩子
    afterRegister?: HookFunction;     // 注册后钩子
    beforeLogin?: HookFunction;       // 登录前钩子
    afterLogin?: HookFunction;        // 登录后钩子
    // ... 其他钩子
  };
  
  // 安全配置
  security?: {
    passwordPolicy?: PasswordPolicy;  // 密码策略
    rateLimit?: RateLimitOptions;     // 速率限制
    // ... 其他安全配置
  };
}
``` 