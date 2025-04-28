# API参考文档

## 1. REST API端点

Auth插件提供以下REST API端点，用于处理认证、用户管理和权限控制。

### 1.1 认证端点

#### 用户注册
```
POST /auth/register
```

**请求体**:
```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "securePassword123",
  "profile": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**响应 (201 Created)**:
```json
{
  "id": "5f8d0e1b-3c4e-4a2f-9f2d-8b7e6a8c9d0e",
  "username": "user123",
  "email": "user@example.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "createdAt": "2023-01-15T12:34:56.789Z"
}
```

**错误响应**:
- `400 Bad Request`: 请求格式无效或缺少必需字段
- `409 Conflict`: 用户名或电子邮件已被使用

#### 用户登录
```
POST /auth/login
```

**请求体**:
```json
{
  "username": "user123",
  "password": "securePassword123"
}
```
或者:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**响应 (200 OK)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "5f8d0e1b-3c4e-4a2f-9f2d-8b7e6a8c9d0e",
    "username": "user123",
    "email": "user@example.com",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**错误响应**:
- `400 Bad Request`: 请求格式无效或缺少必需字段
- `401 Unauthorized`: 认证失败，用户名或密码错误
- `403 Forbidden`: 账户被锁定或未激活

#### 刷新令牌
```
POST /auth/refresh
```

**请求体**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应 (200 OK)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**错误响应**:
- `400 Bad Request`: 请求格式无效或缺少必需字段
- `401 Unauthorized`: 刷新令牌无效或已过期

#### 用户登出
```
POST /auth/logout
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应 (204 No Content)**

**错误响应**:
- `401 Unauthorized`: 未提供有效令牌

#### 获取当前用户信息
```
GET /auth/me
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应 (200 OK)**:
```json
{
  "id": "5f8d0e1b-3c4e-4a2f-9f2d-8b7e6a8c9d0e",
  "username": "user123",
  "email": "user@example.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "roles": ["user"],
  "permissions": ["posts:read", "posts:create"],
  "lastLogin": "2023-01-15T12:34:56.789Z"
}
```

**错误响应**:
- `401 Unauthorized`: 未提供有效令牌

#### 更新用户信息
```
PUT /auth/me
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**请求体**:
```json
{
  "profile": {
    "firstName": "Johnny",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

**响应 (200 OK)**:
```json
{
  "id": "5f8d0e1b-3c4e-4a2f-9f2d-8b7e6a8c9d0e",
  "username": "user123",
  "email": "user@example.com",
  "profile": {
    "firstName": "Johnny",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg"
  },
  "updatedAt": "2023-01-15T13:45:56.789Z"
}
```

**错误响应**:
- `400 Bad Request`: 请求格式无效
- `401 Unauthorized`: 未提供有效令牌

#### 修改密码
```
POST /auth/change-password
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**请求体**:
```json
{
  "currentPassword": "securePassword123",
  "newPassword": "evenMoreSecurePassword456"
}
```

**响应 (204 No Content)**

**错误响应**:
- `400 Bad Request`: 请求格式无效或新密码不符合安全策略
- `401 Unauthorized`: 当前密码错误或令牌无效

#### 忘记密码
```
POST /auth/forgot-password
```

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应 (204 No Content)**

#### 重置密码
```
POST /auth/reset-password
```

**请求体**:
```json
{
  "token": "8c7b6a5d-4e3f-2g1h-0i9j-8k7l6m5n4o3p",
  "newPassword": "newSecurePassword789"
}
```

**响应 (204 No Content)**

**错误响应**:
- `400 Bad Request`: 请求格式无效或密码不符合安全策略
- `401 Unauthorized`: 令牌无效或已过期

#### 验证电子邮件
```
GET /auth/verify-email/:token
```

**响应 (302 Found)**
重定向到登录页面或主页

**错误响应**:
- `400 Bad Request`: 令牌无效或已过期

### 1.2 OAuth2端点

#### 开始OAuth2认证流程
```
GET /auth/oauth/:provider
```

**URL参数**:
- `provider`: 提供商名称，如 `google`, `github`, `microsoft` 等

**查询参数**:
- `redirectUri` (可选): 认证后重定向URL
- `state` (可选): 状态参数，用于防止CSRF攻击

**响应 (302 Found)**
重定向到第三方认证服务提供商登录页面

#### OAuth2回调处理
```
GET /auth/oauth/:provider/callback
```

**URL参数**:
- `provider`: 提供商名称

**查询参数**:
- `code`: 授权码
- `state`: 状态参数

**响应 (302 Found)**
认证成功后重定向到应用页面，并设置Cookie或返回令牌

**错误响应**:
- `400 Bad Request`: 缺少必需参数或状态不匹配
- `401 Unauthorized`: 认证失败

### 1.3 角色和权限端点

#### 获取所有角色
```
GET /auth/roles
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应 (200 OK)**:
```json
[
  {
    "id": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    "name": "admin",
    "description": "Administrator role with full access"
  },
  {
    "id": "2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q",
    "name": "editor",
    "description": "Editor role with content management access"
  }
]
```

**错误响应**:
- `401 Unauthorized`: 未提供有效令牌
- `403 Forbidden`: 权限不足

#### 创建角色
```
POST /auth/roles
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**请求体**:
```json
{
  "name": "moderator",
  "description": "Content moderator with limited access",
  "permissions": ["content:read", "content:update", "content:delete"]
}
```

**响应 (201 Created)**:
```json
{
  "id": "3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r",
  "name": "moderator",
  "description": "Content moderator with limited access",
  "permissions": ["content:read", "content:update", "content:delete"],
  "createdAt": "2023-01-15T14:56:78.901Z"
}
```

**错误响应**:
- `400 Bad Request`: 请求格式无效
- `401 Unauthorized`: 未提供有效令牌
- `403 Forbidden`: 权限不足
- `409 Conflict`: 角色名已存在

#### 获取角色详情
```
GET /auth/roles/:id
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应 (200 OK)**:
```json
{
  "id": "3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r",
  "name": "moderator",
  "description": "Content moderator with limited access",
  "permissions": [
    {
      "id": "4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s",
      "name": "content:read",
      "description": "Read content"
    },
    {
      "id": "5e6f7g8h-9i0j-1k2l-3m4n-5o6p7q8r9s0t",
      "name": "content:update",
      "description": "Update content"
    },
    {
      "id": "6f7g8h9i-0j1k-2l3m-4n5o-6p7q8r9s0t1u",
      "name": "content:delete",
      "description": "Delete content"
    }
  ],
  "users": [
    {
      "id": "7g8h9i0j-1k2l-3m4n-5o6p-7q8r9s0t1u2v",
      "username": "moderator_user"
    }
  ],
  "createdAt": "2023-01-15T14:56:78.901Z",
  "updatedAt": "2023-01-15T14:56:78.901Z"
}
```

**错误响应**:
- `401 Unauthorized`: 未提供有效令牌
- `403 Forbidden`: 权限不足
- `404 Not Found`: 角色不存在

#### 更新角色
```
PUT /auth/roles/:id
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**请求体**:
```json
{
  "description": "Updated description for content moderator",
  "permissions": ["content:read", "content:update", "content:delete", "comments:moderate"]
}
```

**响应 (200 OK)**:
```json
{
  "id": "3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r",
  "name": "moderator",
  "description": "Updated description for content moderator",
  "permissions": ["content:read", "content:update", "content:delete", "comments:moderate"],
  "updatedAt": "2023-01-15T15:67:89.012Z"
}
```

**错误响应**:
- `400 Bad Request`: 请求格式无效
- `401 Unauthorized`: 未提供有效令牌
- `403 Forbidden`: 权限不足
- `404 Not Found`: 角色不存在

#### 删除角色
```
DELETE /auth/roles/:id
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应 (204 No Content)**

**错误响应**:
- `401 Unauthorized`: 未提供有效令牌
- `403 Forbidden`: 权限不足
- `404 Not Found`: 角色不存在
- `409 Conflict`: 角色在使用中，无法删除

#### 获取所有权限
```
GET /auth/permissions
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应 (200 OK)**:
```json
[
  {
    "id": "4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s",
    "name": "content:read",
    "description": "Read content",
    "resource": "content",
    "action": "read"
  },
  {
    "id": "5e6f7g8h-9i0j-1k2l-3m4n-5o6p7q8r9s0t",
    "name": "content:update",
    "description": "Update content",
    "resource": "content",
    "action": "update"
  }
]
```

**错误响应**:
- `401 Unauthorized`: 未提供有效令牌
- `403 Forbidden`: 权限不足

#### 为用户分配角色
```
POST /auth/users/:userId/roles
```

**请求头**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**请求体**:
```json
{
  "roleId": "3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r"
}
```

**响应 (204 No Content)**

**错误响应**:
- `400 Bad Request`: 请求格式无效
- `401 Unauthorized`: 未提供有效令牌
- `403 Forbidden`: 权限不足
- `404 Not Found`: 用户或角色不存在
- `409 Conflict`: 用户已拥有该角色

## 2. JavaScript客户端API

Auth插件提供JavaScript客户端API，可方便地在前端应用中使用。

### 2.1 基本用法

```javascript
import { createAuthClient } from '@stratix/auth-client';

// 创建客户端实例
const authClient = createAuthClient({
  baseUrl: 'https://api.example.com',
  tokenStorage: 'localStorage',  // 或 'sessionStorage', 'cookie'
  autoRefresh: true,
  refreshThreshold: 300          // 令牌过期前5分钟刷新
});

// 登录
async function login(username, password) {
  try {
    const result = await authClient.login({ username, password });
    console.log('Logged in as:', result.user);
    return result;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// 注册
async function register(userData) {
  try {
    const user = await authClient.register(userData);
    console.log('Registered user:', user);
    return user;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

// 获取当前用户
function getCurrentUser() {
  return authClient.getCurrentUser();
}

// 检查是否已认证
function isAuthenticated() {
  return authClient.isAuthenticated();
}

// 检查权限
function hasPermission(permission) {
  return authClient.hasPermission(permission);
}

// 检查角色
function hasRole(role) {
  return authClient.hasRole(role);
}

// 登出
async function logout() {
  await authClient.logout();
  console.log('Logged out');
}
```

### 2.2 API请求辅助工具

```javascript
// 创建带认证的API请求
const api = authClient.createApiClient();

// 请求示例
async function getUserProfile() {
  return api.get('/users/profile');
}

async function updateUserProfile(profileData) {
  return api.put('/users/profile', profileData);
}

async function createPost(postData) {
  return api.post('/posts', postData);
}

async function deletePost(postId) {
  return api.delete(`/posts/${postId}`);
}
```

### 2.3 OAuth2辅助工具

```javascript
// 开始OAuth2认证流程
function loginWithGoogle() {
  authClient.startOAuth('google');
}

function loginWithGithub() {
  authClient.startOAuth('github');
}

// 处理OAuth回调
async function handleOAuthCallback() {
  try {
    const result = await authClient.handleOAuthCallback();
    console.log('OAuth login successful:', result.user);
    return result;
  } catch (error) {
    console.error('OAuth login failed:', error);
    throw error;
  }
}
```

## 3. 中间件API

Auth插件提供多个中间件，用于保护API端点和路由。

### 3.1 认证中间件

```typescript
// 要求认证
app.auth.requireAuthentication

// 示例用法
app.web.addRoute('/api/protected', {
  preHandler: app.auth.requireAuthentication,
  get: async (request, reply) => {
    return { message: 'Protected data' };
  }
});
```

### 3.2 权限中间件

```typescript
// 要求特定权限
app.auth.requirePermission(permission)

// 要求多个权限中的任意一个
app.auth.requireAnyPermission(permissions)

// 要求所有指定权限
app.auth.requireAllPermissions(permissions)

// 示例用法
app.web.addRoute('/api/articles', {
  get: {
    handler: async (request, reply) => {
      return { articles: [] };
    },
    preHandler: app.auth.requirePermission('articles:read')
  },
  post: {
    handler: async (request, reply) => {
      return { id: 1, ...request.body };
    },
    preHandler: app.auth.requirePermission('articles:create')
  }
});

app.web.addRoute('/api/articles/:id', {
  put: {
    handler: async (request, reply) => {
      return { id: request.params.id, ...request.body };
    },
    preHandler: app.auth.requireAnyPermission(['articles:update', 'articles:admin'])
  }
});
```

### 3.3 角色中间件

```typescript
// 要求特定角色
app.auth.requireRole(role)

// 要求多个角色中的任意一个
app.auth.requireAnyRole(roles)

// 要求所有指定角色
app.auth.requireAllRoles(roles)

// 示例用法
app.web.addRoute('/api/admin', {
  get: {
    handler: async (request, reply) => {
      return { message: 'Admin panel' };
    },
    preHandler: app.auth.requireRole('admin')
  }
});

app.web.addRoute('/api/dashboard', {
  get: {
    handler: async (request, reply) => {
      return { message: 'Dashboard' };
    },
    preHandler: app.auth.requireAnyRole(['admin', 'editor', 'manager'])
  }
});
```

### 3.4 组合中间件

```typescript
// 复杂条件组合
app.auth.check(expression)

// 示例用法
app.web.addRoute('/api/articles/:id', {
  delete: {
    handler: async (request, reply) => {
      return { success: true };
    },
    preHandler: app.auth.check('(articles:delete AND articles:own) OR articles:admin')
  }
});

// 条件表达式
app.web.addRoute('/api/organizations/:orgId/members', {
  post: {
    handler: async (request, reply) => {
      return { success: true };
    },
    preHandler: app.auth.check('organizations:manage:${params.orgId}')
  }
});
```

## 4. 服务API

Auth插件提供多个服务API，用于在应用代码中处理用户、角色和权限。

### 4.1 用户服务

```typescript
// 用户服务API
interface UserService {
  // 查找用户
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByProvider(provider: string, providerId: string): Promise<User | null>;
  
  // 用户管理
  create(userData: Partial<User>): Promise<User>;
  update(id: string, userData: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
  
  // 密码管理
  verifyPassword(userId: string, password: string): Promise<boolean>;
  changePassword(userId: string, newPassword: string): Promise<boolean>;
  generateResetToken(email: string): Promise<string | null>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  
  // 用户状态
  activate(userId: string): Promise<boolean>;
  deactivate(userId: string): Promise<boolean>;
  lock(userId: string): Promise<boolean>;
  unlock(userId: string): Promise<boolean>;
}

// 示例用法
const userService = app.auth.userService;

// 查找用户
const user = await userService.findById('user-id-123');

// 创建用户
const newUser = await userService.create({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'securePassword123'
});

// 验证密码
const isValid = await userService.verifyPassword('user-id-123', 'inputPassword');

// 更新用户状态
await userService.lock('user-id-123'); // 锁定用户
```

### 4.2 角色服务

```typescript
// 角色服务API
interface RoleService {
  // 查找角色
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  
  // 角色管理
  create(roleData: Partial<Role>): Promise<Role>;
  update(id: string, roleData: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<boolean>;
  
  // 用户角色管理
  getUserRoles(userId: string): Promise<Role[]>;
  addRoleToUser(userId: string, roleId: string): Promise<boolean>;
  removeRoleFromUser(userId: string, roleId: string): Promise<boolean>;
  
  // 角色验证
  hasRole(user: User, role: string): Promise<boolean>;
  hasAnyRole(user: User, roles: string[]): Promise<boolean>;
  hasAllRoles(user: User, roles: string[]): Promise<boolean>;
}

// 示例用法
const roleService = app.auth.roleService;

// 获取所有角色
const roles = await roleService.findAll();

// 为用户分配角色
await roleService.addRoleToUser('user-id-123', 'editor-role-id');

// 检查用户角色
const isAdmin = await roleService.hasRole(user, 'admin');
```

### 4.3 权限服务

```typescript
// 权限服务API
interface PermissionService {
  // 查找权限
  findById(id: string): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  findAll(): Promise<Permission[]>;
  
  // 权限管理
  create(permissionData: Partial<Permission>): Promise<Permission>;
  update(id: string, permissionData: Partial<Permission>): Promise<Permission>;
  delete(id: string): Promise<boolean>;
  
  // 角色权限管理
  getRolePermissions(roleId: string): Promise<Permission[]>;
  addPermissionToRole(roleId: string, permissionId: string): Promise<boolean>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean>;
  
  // 用户权限管理
  getUserPermissions(userId: string): Promise<Permission[]>;
  addPermissionToUser(userId: string, permissionId: string): Promise<boolean>;
  removePermissionFromUser(userId: string, permissionId: string): Promise<boolean>;
  
  // 权限验证
  hasPermission(user: User, permission: string): Promise<boolean>;
  hasAnyPermission(user: User, permissions: string[]): Promise<boolean>;
  hasAllPermissions(user: User, permissions: string[]): Promise<boolean>;
  
  // 高级权限验证
  evaluateExpression(user: User, expression: string, context?: any): Promise<boolean>;
}

// 示例用法
const permissionService = app.auth.permissionService;

// 获取角色权限
const permissions = await permissionService.getRolePermissions('admin-role-id');

// 为角色添加权限
await permissionService.addPermissionToRole('editor-role-id', 'articles:publish');

// 检查用户权限
const canPublish = await permissionService.hasPermission(user, 'articles:publish');

// 评估复杂权限表达式
const canManage = await permissionService.evaluateExpression(
  user,
  '(articles:edit AND articles:own) OR articles:admin',
  { articleId: '123' }
);
``` 