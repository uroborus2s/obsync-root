# onRequestPermissionHook 权限验证钩子

## 概述

`onRequestPermissionHook` 是一个 Fastify 请求钩子，用于在请求处理前进行权限验证。支持基于角色的访问控制、路径白名单和多种验证模式。

## 功能特性

- ✅ **基于角色的权限验证**：支持自定义权限验证函数
- ✅ **路径白名单**：支持跳过特定路径的权限验证
- ✅ **多种验证模式**：支持 `or`（任一通过）和 `and`（全部通过）模式
- ✅ **向后兼容**：完全兼容原有的函数签名
- ✅ **详细日志**：提供完整的权限验证日志记录
- ✅ **错误处理**：完善的错误处理和状态码返回

## 函数签名

```typescript
export const onRequestPermissionHook = (
  handles: Array<(identity: UserIdentity) => boolean>,
  options?: OnRequestPermissionHookOptions
) => async (request: any, reply: any) => { ... }

export interface OnRequestPermissionHookOptions {
  /** 需要跳过权限验证的路径列表，支持精确匹配和前缀匹配 */
  skipPaths?: string[];
  /** 多个权限验证函数的逻辑关系，'or'表示任一通过即可，'and'表示全部通过才行 */
  mode?: 'and' | 'or';
}
```

## 基本用法

### 1. 简单权限验证（向后兼容）

```typescript
import { onRequestPermissionHook, hasUserType, hasRole } from '@stratix/utils/auth';

// 原有用法，完全兼容
fastify.addHook(
  'onRequest',
  onRequestPermissionHook([
    (identity) => hasUserType(identity, 'teacher'),
    (identity) => hasRole(identity, 'admin')
  ])
);
```

### 2. 使用路径白名单

```typescript
// 跳过健康检查路径的权限验证
fastify.addHook(
  'onRequest',
  onRequestPermissionHook(
    [
      (identity) => hasUserType(identity, 'teacher'),
      (identity) => hasRole(identity, 'admin')
    ],
    {
      skipPaths: ['/health', '/metrics', '/status']
    }
  )
);
```

### 3. 使用不同验证模式

```typescript
// OR 模式（默认）：任一权限验证通过即可
fastify.addHook(
  'onRequest',
  onRequestPermissionHook(
    [
      (identity) => hasUserType(identity, 'teacher'),
      (identity) => hasUserType(identity, 'admin')
    ],
    {
      mode: 'or' // 默认值，可省略
    }
  )
);

// AND 模式：所有权限验证都必须通过
fastify.addHook(
  'onRequest',
  onRequestPermissionHook(
    [
      (identity) => hasUserType(identity, 'teacher'),
      (identity) => hasRole(identity, 'course_manager')
    ],
    {
      mode: 'and'
    }
  )
);
```

### 4. 综合使用

```typescript
// 完整配置示例
fastify.addHook(
  'onRequest',
  onRequestPermissionHook(
    [
      (identity) => hasUserType(identity, 'teacher'),
      (identity) => hasRole(identity, 'admin')
    ],
    {
      skipPaths: ['/health', '/metrics', '/api/public'],
      mode: 'or'
    }
  )
);
```

## 路径白名单详解

### 支持的匹配方式

1. **精确匹配**：
   ```typescript
   skipPaths: ['/health']
   // 匹配：/health
   // 不匹配：/health/status
   ```

2. **前缀匹配**：
   ```typescript
   skipPaths: ['/api/public']
   // 匹配：/api/public, /api/public/info, /api/public/data/list
   ```

### 常用白名单路径

```typescript
{
  skipPaths: [
    '/health',           // 健康检查
    '/metrics',          // 监控指标
    '/status',           // 状态检查
    '/api/public',       // 公开API
    '/docs',             // API文档
    '/favicon.ico'       // 静态资源
  ]
}
```

## 验证模式详解

### OR 模式（默认）

- **逻辑**：任一验证函数返回 `true` 即通过验证
- **适用场景**：多种角色都可以访问的资源
- **示例**：教师或管理员都可以访问

```typescript
// 教师或管理员都可以访问
onRequestPermissionHook([
  (identity) => hasUserType(identity, 'teacher'),
  (identity) => hasUserType(identity, 'admin')
], { mode: 'or' })
```

### AND 模式

- **逻辑**：所有验证函数都必须返回 `true` 才能通过验证
- **适用场景**：需要同时满足多个条件的资源
- **示例**：必须是教师且具有特定角色

```typescript
// 必须是教师且具有课程管理角色
onRequestPermissionHook([
  (identity) => hasUserType(identity, 'teacher'),
  (identity) => hasRole(identity, 'course_manager')
], { mode: 'and' })
```

## 错误响应

### 401 - 未授权

```json
{
  "error": "Unauthorized",
  "message": "Valid user identity required",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 403 - 权限不足

```json
{
  "error": "Forbidden",
  "message": "Required permission not found to access this resource (mode: or)",
  "userRoles": ["student"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 500 - 服务器错误

```json
{
  "error": "Internal Server Error",
  "message": "Failed to verify permissions",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 日志记录

### 跳过权限验证

```javascript
request.log.debug('Skipping permission check for whitelisted path', {
  url: '/health',
  skipPaths: ['/health', '/metrics'],
  reason: 'Path in whitelist'
});
```

### 权限验证成功

```javascript
request.log.debug('Access granted', {
  url: '/api/courses',
  userId: 'teacher-001',
  userType: 'teacher',
  roles: ['teacher', 'course_manager'],
  mode: 'or',
  handleCount: 2
});
```

### 权限验证失败

```javascript
request.log.warn('Access denied: permission check failed', {
  url: '/api/admin',
  userId: 'student-001',
  userRoles: ['student'],
  mode: 'and',
  handleCount: 2
});
```

## 最佳实践

### 1. 健康检查路径

```typescript
// 始终跳过健康检查路径
{
  skipPaths: ['/health', '/health/status', '/health/ready']
}
```

### 2. 公开API路径

```typescript
// 跳过公开API路径
{
  skipPaths: ['/api/public', '/api/v1/public']
}
```

### 3. 静态资源路径

```typescript
// 跳过静态资源
{
  skipPaths: ['/static', '/assets', '/favicon.ico']
}
```

### 4. 分层权限验证

```typescript
// 基础权限验证（所有路由）
fastify.addHook('onRequest', onRequestPermissionHook([
  (identity) => identity.userType !== 'anonymous'
], {
  skipPaths: ['/health', '/api/public']
}));

// 管理员权限验证（特定路由组）
fastify.register(async (fastify) => {
  fastify.addHook('onRequest', onRequestPermissionHook([
    (identity) => hasRole(identity, 'admin')
  ]));
  
  // 管理员路由
  fastify.get('/admin/*', adminHandler);
}, { prefix: '/admin' });
```

## 性能考虑

1. **路径匹配优化**：白名单路径检查在权限验证之前，减少不必要的身份解析
2. **验证函数顺序**：在 OR 模式下，将最可能通过的验证函数放在前面
3. **缓存策略**：考虑在验证函数中实现适当的缓存机制

## 迁移指南

### 从旧版本迁移

```typescript
// 旧版本
onRequestPermissionHook([
  (identity) => hasUserType(identity, 'teacher')
])

// 新版本（完全兼容）
onRequestPermissionHook([
  (identity) => hasUserType(identity, 'teacher')
])

// 新版本（使用新功能）
onRequestPermissionHook([
  (identity) => hasUserType(identity, 'teacher')
], {
  skipPaths: ['/health'],
  mode: 'or'
})
```

## 测试

详见测试文件：`src/tests/auth/onRequestPermissionHook.test.ts`

包含以下测试场景：
- 路径白名单功能
- 验证模式功能
- 向后兼容性
- 错误处理
- 综合场景
