# API Gateway 认证流程详解

## 概述

本文档详细说明了 Stratix API Gateway 的认证流程，包括用户登录、令牌验证、用户信息转发和登出等完整流程。

## 认证流程架构

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Gateway as API Gateway
    participant AuthService as 认证服务
    participant Backend as 后端服务
    participant Redis as Redis缓存

    Note over Client,Redis: 1. 用户登录流程
    Client->>Gateway: POST /auth/login {username, password}
    Gateway->>AuthService: 验证用户凭据
    AuthService->>Redis: 查询用户缓存
    AuthService->>AuthService: 验证密码
    AuthService->>AuthService: 生成 JWT tokens
    AuthService->>Redis: 缓存用户信息
    Gateway->>Client: 返回 access_token + 设置 refresh_token Cookie

    Note over Client,Redis: 2. 访问受保护资源
    Client->>Gateway: GET /api/users (Bearer token)
    Gateway->>AuthService: 验证 access_token
    AuthService->>Redis: 检查 token 黑名单
    AuthService->>AuthService: 解析 JWT payload
    AuthService->>Redis: 获取用户详细信息
    Gateway->>Backend: 转发请求 + 用户信息头
    Backend->>Gateway: 返回响应
    Gateway->>Client: 返回响应

    Note over Client,Redis: 3. 令牌刷新流程
    Client->>Gateway: POST /auth/refresh (Cookie: refresh_token)
    Gateway->>AuthService: 验证 refresh_token
    AuthService->>Redis: 检查 refresh_token 有效性
    AuthService->>AuthService: 生成新的 tokens
    AuthService->>Redis: 更新 token 缓存
    Gateway->>Client: 返回新 access_token + 更新 Cookie

    Note over Client,Redis: 4. 用户登出流程
    Client->>Gateway: POST /auth/logout
    Gateway->>AuthService: 撤销所有 tokens
    AuthService->>Redis: 添加 tokens 到黑名单
    Gateway->>Client: 清除 Cookies + 确认登出
```

## 详细流程说明

### 1. 用户登录 (POST /auth/login)

#### 请求示例
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "1",
      "username": "admin",
      "roles": ["admin"]
    },
    "expiresIn": "1h"
  },
  "requestId": "req_1234567890"
}
```

#### Cookie 设置
```
Set-Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; 
            HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/
```

#### 处理逻辑
1. 验证用户名和密码
2. 生成 access_token (1小时有效期)
3. 生成 refresh_token (7天有效期)
4. 将 refresh_token 设置为 HTTP-only Cookie
5. 返回 access_token 和用户信息

### 2. 访问受保护资源

#### 请求示例
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 网关处理流程
1. **认证中间件验证**：
   - 从 Authorization 头提取 token
   - 验证 JWT 签名和有效期
   - 检查 token 是否在黑名单中
   - 获取用户信息并设置到 request.user

2. **用户信息转发**：
   网关会在转发给后端服务的请求中添加以下头信息：

```http
x-request-id: req_1234567890
x-forwarded-for: 192.168.1.100
x-real-ip: 192.168.1.100
x-gateway-version: 1.0.0
x-forwarded-proto: https
x-forwarded-host: gateway.example.com
x-user-id: 1
x-user-username: admin
x-user-roles: ["admin"]
x-user-permissions: ["*:*"]
x-user-email: admin@example.com
x-auth-timestamp: 2024-01-01T12:00:00.000Z
x-user-is-admin: true
x-user-is-manager: false
```

3. **后端服务处理**：
   后端服务可以直接从请求头获取用户信息，无需再次验证 JWT：

```javascript
// 后端服务示例代码
app.get('/users', (req, res) => {
  const userId = req.headers['x-user-id'];
  const userRoles = JSON.parse(req.headers['x-user-roles'] || '[]');
  const isAdmin = req.headers['x-user-is-admin'] === 'true';
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (isAdmin) {
    // 管理员可以查看所有用户
    return res.json({ users: getAllUsers() });
  } else {
    // 普通用户只能查看自己的信息
    return res.json({ user: getUserById(userId) });
  }
});
```

### 3. 令牌刷新 (POST /auth/refresh)

#### 请求示例（使用 Cookie）
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 请求示例（使用请求体）
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "1h"
  },
  "requestId": "req_1234567891"
}
```

#### 处理逻辑
1. 从 Cookie 或请求体获取 refresh_token
2. 验证 refresh_token 的有效性
3. 生成新的 access_token 和 refresh_token
4. 将旧的 refresh_token 加入黑名单
5. 更新 Cookie 中的 refresh_token
6. 返回新的 access_token

### 4. 用户登出 (POST /auth/logout)

#### 请求示例
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 响应示例
```json
{
  "success": true,
  "message": "Logged out successfully",
  "requestId": "req_1234567892"
}
```

#### 处理逻辑
1. 从 Authorization 头获取 access_token
2. 从 Cookie 获取 refresh_token
3. 将两个 token 都加入黑名单
4. 清除所有认证相关的 Cookie
5. 返回成功消息

### 5. 获取当前用户信息 (GET /auth/me)

#### 请求示例
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "username": "admin",
      "roles": ["admin"],
      "email": "admin@example.com",
      "permissions": ["*:*"]
    }
  },
  "requestId": "req_1234567893"
}
```

## 错误处理

### 1. 未认证 (401)

当请求缺少有效的认证信息时：

```json
{
  "error": "Unauthorized",
  "message": "Missing authentication token",
  "requestId": "req_1234567894"
}
```

### 2. 令牌过期 (401)

当访问令牌过期时：

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "requestId": "req_1234567895"
}
```

### 3. 权限不足 (403)

当用户没有访问特定资源的权限时：

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "requestId": "req_1234567896"
}
```

## 安全特性

### 1. JWT 令牌安全
- 使用 HS256 算法签名
- 短期有效期 (1小时)
- 支持令牌撤销和黑名单

### 2. Cookie 安全
- HTTP-only Cookie 防止 XSS 攻击
- Secure 标志 (生产环境)
- SameSite=Strict 防止 CSRF 攻击

### 3. 请求头安全
- 移除原始 Authorization 头
- 添加认证时间戳
- 用户信息头签名验证

### 4. 缓存安全
- 敏感信息缓存加密
- 定期清理过期缓存
- 用户活动跟踪

## 配置选项

### 环境变量配置

```bash
# JWT 配置
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cookie 配置
COOKIE_SECRET=your-super-secret-cookie-key
USE_ACCESS_TOKEN_COOKIE=false

# 认证配置
AUTH_ENABLED=true
AUTH_TOKEN_SOURCES=header,cookie,query
AUTH_EXCLUDE_PATHS=/health,/metrics,/docs,/auth/login
```

### 高级配置

```typescript
// stratix.config.ts 中的认证配置
auth: {
  enabled: true,
  jwtSecret: sensitiveConfig.JWT_SECRET,
  tokenExpiry: '1h',
  refreshTokenExpiry: '7d',
  excludePaths: ['/health', '/metrics', '/docs', '/auth/*'],
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
  }
}
```

## 最佳实践

### 1. 客户端实现
- 将 access_token 存储在内存中
- 使用 HTTP-only Cookie 存储 refresh_token
- 实现自动令牌刷新机制
- 处理认证失败的重定向

### 2. 后端服务实现
- 信任网关转发的用户信息头
- 不要重复验证 JWT 令牌
- 实现基于角色的权限检查
- 记录用户操作审计日志

### 3. 安全建议
- 定期轮换 JWT 密钥
- 监控异常登录行为
- 实现账户锁定机制
- 使用 HTTPS 传输

### 4. 性能优化
- 缓存用户信息和权限
- 使用 Redis 集群提高可用性
- 实现令牌预刷新机制
- 优化数据库查询

## 故障排除

### 常见问题

1. **令牌验证失败**
   - 检查 JWT 密钥配置
   - 验证令牌格式和签名
   - 确认令牌未过期

2. **Cookie 无法设置**
   - 检查域名和路径配置
   - 确认 HTTPS 设置正确
   - 验证 SameSite 策略

3. **用户信息未转发**
   - 检查认证中间件配置
   - 验证请求头转换逻辑
   - 确认后端服务接收头信息

4. **权限检查失败**
   - 验证用户角色和权限
   - 检查权限映射配置
   - 确认权限检查逻辑

通过以上完整的认证流程，API 网关能够提供安全、高效的用户认证和信息转发服务。