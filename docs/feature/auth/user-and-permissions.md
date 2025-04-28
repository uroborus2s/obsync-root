# 用户管理与权限控制

## 1. 用户管理

Auth插件提供完整的用户管理功能，包括用户注册、认证、信息管理等。

### 1.1 用户模型

用户模型是认证系统的核心，根据工作模式不同，用户模型可以有不同的实现：

#### 完整模式用户模型
```typescript
interface User {
  id: string;                      // 用户唯一标识
  username: string;                // 用户名
  email: string;                   // 电子邮件
  password: string;                // 加密密码
  status: UserStatus;              // 用户状态
  verificationToken?: string;      // 验证令牌
  resetToken?: string;             // 密码重置令牌
  lastLogin?: Date;                // 最后登录时间
  externalIds?: {                  // 外部系统ID映射
    [provider: string]: string;
  };
  profile?: {                      // 用户资料
    firstName?: string;
    lastName?: string;
    avatar?: string;
    // 其他资料字段...
  };
  metadata?: Record<string, any>;  // 元数据
  roles?: string[];                // 角色列表
  permissions?: string[];          // 直接权限列表
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}

enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
  LOCKED = 'locked'
}
```

#### 简单模式用户模型
```typescript
interface SimpleUser {
  id: string;                      // 用户唯一标识
  username?: string;               // 用户名（可选）
  email?: string;                  // 电子邮件（可选）
  externalIds: {                   // 外部系统ID映射（必需）
    [provider: string]: string;
  };
  profile?: {                      // 用户资料
    displayName?: string;
    avatar?: string;
    // 基本资料...
  };
  metadata?: Record<string, any>;  // 元数据
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}
```

### 1.2 用户数据存储

用户数据可以存储在以下几种位置：

1. **数据库存储**：使用`@stratix/database`插件存储用户信息
   - 支持所有Knex.js兼容的数据库（PostgreSQL、MySQL、SQLite等）
   - 自动创建用户相关表和关系
   - 提供数据迁移和种子数据

2. **缓存存储**：使用`@stratix/cache`插件缓存用户会话和令牌
   - 支持多种缓存后端（Redis、Memcached、内存缓存等）
   - 配置化的缓存策略和过期时间
   - 高性能读取和写入

3. **外部存储**：转发模式下，用户数据存储在外部认证服务
   - 仅缓存必要的用户信息，主要依赖外部服务
   - 同步策略可配置（实时同步或定期同步）

### 1.3 用户生命周期

1. **注册流程**：
   - 验证用户输入（邮箱、用户名、密码等）
   - 创建用户记录
   - 发送验证邮件（可选）
   - 分配默认角色（可选）

2. **验证流程**：
   - 用户点击验证链接
   - 验证令牌有效性
   - 更新用户状态为激活

3. **登录流程**：
   - 验证用户凭证
   - 检查用户状态
   - 生成访问令牌和刷新令牌
   - 记录登录信息

4. **密码重置流程**：
   - 用户请求密码重置
   - 生成重置令牌并发送邮件
   - 用户提交新密码
   - 验证令牌并更新密码

5. **用户信息更新**：
   - 验证用户权限
   - 更新用户信息
   - 记录修改历史（可选）

6. **账户注销流程**：
   - 验证用户权限
   - 撤销所有令牌
   - 删除或归档用户数据

### 1.4 用户API端点

Auth插件提供以下用户相关API端点（可配置启用/禁用）：

- **POST /auth/register**：用户注册
- **POST /auth/login**：用户登录
- **POST /auth/logout**：用户登出
- **POST /auth/refresh**：刷新访问令牌
- **GET /auth/me**：获取当前用户信息
- **PUT /auth/me**：更新当前用户信息
- **POST /auth/forgot-password**：请求密码重置
- **POST /auth/reset-password**：重置密码
- **GET /auth/verify-email/:token**：验证电子邮件
- **POST /auth/change-password**：修改密码

## 2. 角色和权限管理

Auth插件提供基于角色(RBAC)和基于属性(ABAC)的访问控制系统，适用于完整模式。

### 2.1 RBAC模型

RBAC(基于角色的访问控制)通过角色分配权限，并将用户关联到角色。

#### 角色模型
```typescript
interface Role {
  id: string;                      // 角色唯一标识
  name: string;                    // 角色名称
  description?: string;            // 角色描述
  permissions: string[];           // 权限列表
  metadata?: Record<string, any>;  // 元数据
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}
```

#### 权限模型
```typescript
interface Permission {
  id: string;                      // 权限唯一标识
  name: string;                    // 权限名称
  description?: string;            // 权限描述
  resource: string;                // 资源类型
  action: string;                  // 操作类型(create, read, update, delete等)
  conditions?: Record<string, any>; // 条件表达式（ABAC）
  metadata?: Record<string, any>;  // 元数据
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
}
```

### 2.2 权限检查流程

1. **直接权限检查**：
   - 检查用户是否直接拥有指定权限

2. **角色权限检查**：
   - 获取用户所有角色
   - 检查这些角色是否包含指定权限

3. **条件评估（ABAC）**：
   - 如果权限包含条件，评估条件表达式
   - 条件可以基于用户属性、资源属性、上下文等

4. **层次结构检查**：
   - 支持资源层次结构和通配符权限
   - 例如：`posts:*` 包含 `posts:create`, `posts:read` 等

### 2.3 权限API

Auth插件提供以下权限相关API端点（仅完整模式）：

- **GET /auth/roles**：获取所有角色
- **POST /auth/roles**：创建新角色
- **GET /auth/roles/:id**：获取特定角色
- **PUT /auth/roles/:id**：更新角色
- **DELETE /auth/roles/:id**：删除角色
- **GET /auth/permissions**：获取所有权限
- **POST /auth/permissions**：创建新权限
- **GET /auth/permissions/:id**：获取特定权限
- **PUT /auth/permissions/:id**：更新权限
- **DELETE /auth/permissions/:id**：删除权限
- **GET /auth/users/:id/roles**：获取用户角色
- **POST /auth/users/:id/roles**：为用户分配角色
- **DELETE /auth/users/:id/roles/:roleId**：移除用户角色

### 2.4 权限中间件

Auth插件提供权限验证中间件，用于保护API端点：

```typescript
// 示例：保护路由需要特定权限
app.register(require('@stratix/web'), {
  routes: {
    '/api/protected-resource': {
      // 需要'resource:action'权限
      get: {
        handler: 'controller.getResource',
        preHandler: 'auth.requirePermission("resource:read")'
      },
      // 需要多个权限之一
      post: {
        handler: 'controller.createResource',
        preHandler: 'auth.requireAnyPermission(["resource:create", "resource:admin"])'
      },
      // 需要所有指定权限
      put: {
        handler: 'controller.updateResource',
        preHandler: 'auth.requireAllPermissions(["resource:update", "resource:verify"])'
      },
      // 需要特定角色
      delete: {
        handler: 'controller.deleteResource',
        preHandler: 'auth.requireRole("admin")'
      }
    }
  }
});
```

### 2.5 权限DSL

对于复杂的权限逻辑，Auth插件提供声明式的权限表达式语言：

```typescript
// 示例：复杂权限表达式
app.register(require('@stratix/web'), {
  routes: {
    '/api/posts/:postId': {
      put: {
        handler: 'postController.updatePost',
        preHandler: 'auth.check("(posts:update AND posts:own) OR posts:admin")'
      }
    }
  }
});

// 支持条件表达式
app.register(require('@stratix/web'), {
  routes: {
    '/api/organizations/:orgId/members': {
      get: {
        handler: 'orgController.getMembers',
        preHandler: 'auth.check("organizations:read:${params.orgId}")'
      }
    }
  }
});
```

## 3. 数据库集成

Auth插件与`@stratix/database`插件深度集成，提供以下功能：

### 3.1 数据库表结构

在完整模式下，Auth插件创建并管理以下数据库表：

1. **users**：存储用户信息
2. **roles**：存储角色信息
3. **permissions**：存储权限信息
4. **user_roles**：用户-角色关联表
5. **role_permissions**：角色-权限关联表
6. **user_permissions**：用户-权限关联表（直接权限）
7. **tokens**：存储认证令牌
8. **auth_providers**：存储认证提供商配置
9. **user_providers**：用户-提供商关联表

### 3.2 数据库迁移

Auth插件提供自动数据库迁移功能：

```typescript
// 创建用户表迁移
const createUserTable = (knex) => {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('username').unique().nullable();
    table.string('email').unique().nullable();
    table.string('password').nullable();
    table.enum('status', ['active', 'pending', 'inactive', 'locked']).defaultTo('pending');
    table.string('verification_token').nullable();
    table.string('reset_token').nullable();
    table.timestamp('last_login').nullable();
    table.jsonb('external_ids').defaultTo('{}');
    table.jsonb('profile').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);
  });
};

// 创建角色表迁移
const createRoleTable = (knex) => {
  return knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').unique().notNullable();
    table.string('description').nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);
  });
};

// 依此类推创建其他表...
```

### 3.3 数据访问层

Auth插件提供封装良好的数据访问层，支持以下操作：

```typescript
// 用户数据访问层
interface UserDAO {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByProvider(provider: string, providerId: string): Promise<User | null>;
  create(userData: Partial<User>): Promise<User>;
  update(id: string, userData: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
  // 更多方法...
}

// 角色数据访问层
interface RoleDAO {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(roleData: Partial<Role>): Promise<Role>;
  update(id: string, roleData: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<boolean>;
  // 更多方法...
}

// 权限数据访问层
interface PermissionDAO {
  findById(id: string): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  create(permissionData: Partial<Permission>): Promise<Permission>;
  update(id: string, permissionData: Partial<Permission>): Promise<Permission>;
  delete(id: string): Promise<boolean>;
  // 更多方法...
}
```

## 4. 缓存集成

Auth插件与`@stratix/cache`插件集成，用于高效存储会话和令牌信息。

### 4.1 缓存策略

```typescript
interface CacheConfig {
  enabled: boolean;                // 是否启用缓存
  prefix: string;                  // 缓存键前缀
  ttl: number;                     // 默认过期时间(秒)
  stores: {                        // 不同类型数据的缓存配置
    tokens: {                      // 令牌缓存配置
      prefix: string;
      ttl: number;
    };
    sessions: {                    // 会话缓存配置
      prefix: string;
      ttl: number;
    };
    users: {                       // 用户缓存配置
      prefix: string;
      ttl: number;
    };
    permissions: {                 // 权限缓存配置
      prefix: string;
      ttl: number;
    };
  };
}
```

### 4.2 缓存用例

1. **令牌缓存**：
   - 存储JWT黑名单（已撤销的令牌）
   - 存储刷新令牌
   - 快速令牌验证

2. **会话缓存**：
   - 存储用户会话信息
   - 支持会话过期和失效

3. **用户数据缓存**：
   - 缓存频繁访问的用户信息
   - 减少数据库查询

4. **权限缓存**：
   - 缓存用户权限和角色
   - 加速权限检查

### 4.3 缓存实现示例

```typescript
// 缓存用户信息
async function cacheUser(userId, userData, ttl = 3600) {
  const cacheKey = `${cacheConfig.prefix}.users.${userId}`;
  await cache.set(cacheKey, userData, ttl);
}

// 获取缓存的用户信息
async function getCachedUser(userId) {
  const cacheKey = `${cacheConfig.prefix}.users.${userId}`;
  return await cache.get(cacheKey);
}

// 缓存令牌
async function cacheToken(tokenId, tokenData, ttl = 3600) {
  const cacheKey = `${cacheConfig.prefix}.tokens.${tokenId}`;
  await cache.set(cacheKey, tokenData, ttl);
}

// 验证令牌是否在黑名单中
async function isTokenBlacklisted(tokenId) {
  const cacheKey = `${cacheConfig.prefix}.blacklist.${tokenId}`;
  return await cache.has(cacheKey);
}

// 将令牌加入黑名单
async function blacklistToken(tokenId, expiry) {
  const cacheKey = `${cacheConfig.prefix}.blacklist.${tokenId}`;
  // 存储直到令牌自然过期
  await cache.set(cacheKey, true, expiry);
}
``` 