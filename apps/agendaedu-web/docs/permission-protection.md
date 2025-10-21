# 前端权限保护使用指南

本文档介绍如何在 agendaedu-web 项目中实现前端权限保护，确保当用户权限不足时正确返回403错误。

## 概述

项目提供了多层次的权限保护机制：

1. **API级别**：自动拦截403响应并跳转到错误页面
2. **路由级别**：在路由加载前检查权限
3. **组件级别**：在组件渲染时检查权限
4. **Hook级别**：在组件逻辑中检查权限

## 1. API级别权限保护

### 自动403错误处理

API客户端会自动拦截403响应并处理：

```typescript
// apps/agendaedu-web/src/lib/api-client.ts
private handleForbidden(error: AxiosError): void {
  // 存储错误信息
  const errorInfo = {
    type: 'FORBIDDEN',
    url: error.config?.url || '',
    method: error.config?.method?.toUpperCase() || 'GET',
    status: error.response?.status || 403,
    message: responseData?.message || '权限不足，无法访问此资源',
    userRoles: responseData?.userRoles || [],
    currentPath: window.location.href,
    timestamp: new Date().toISOString(),
  }

  // 自动跳转到403错误页面
  window.location.href = '/web/403'
}
```

### 使用方式

```typescript
// 正常调用API，权限不足时会自动处理
try {
  const data = await apiClient.get('/api/admin/users')
  // 处理成功响应
} catch (error) {
  // 403错误会被自动拦截并跳转，这里处理其他错误
}
```

## 2. 路由级别权限保护

### 使用路由权限检查

```typescript
// apps/agendaedu-web/src/routes/_authenticated/admin/index.tsx
import { createAdminRouteCheck } from '@/utils/route-permission'

export const Route = createFileRoute('/_authenticated/admin/')({
  // 在路由加载前检查管理员权限
  beforeLoad: createAdminRouteCheck(),
  component: AdminDashboard,
})
```

### 可用的路由权限检查函数

```typescript
// 管理员权限检查
beforeLoad: createAdminRouteCheck()

// 教师权限检查
beforeLoad: createTeacherRouteCheck()

// 学生权限检查
beforeLoad: createStudentRouteCheck()

// 自定义权限检查
beforeLoad: createRoutePermissionCheck({
  requiredRoles: ['admin'],
  requiredPermissions: ['admin:users'],
  mode: 'and', // 'or' | 'and'
  redirectTo: '/custom-403' // 可选，默认为 '/403'
})
```

## 3. 组件级别权限保护

### 基本用法

```typescript
import { PermissionGuard } from '@/components/auth/permission-guard'

// 检查角色
<PermissionGuard requiredRoles={['admin']}>
  <AdminPanel />
</PermissionGuard>

// 检查权限
<PermissionGuard requiredPermissions={['admin:users']}>
  <UserManagement />
</PermissionGuard>

// 组合检查（AND模式）
<PermissionGuard 
  requiredRoles={['admin']} 
  requiredPermissions={['admin:system']}
  mode="and"
>
  <SystemSettings />
</PermissionGuard>

// 自定义权限检查
<PermissionGuard 
  customCheck={(user) => user?.type === 'teacher' && user?.department === 'IT'}
>
  <ITTeacherPanel />
</PermissionGuard>
```

### 快捷权限组件

```typescript
import { AdminGuard, TeacherGuard, StudentGuard } from '@/components/auth/permission-guard'

// 管理员权限保护
<AdminGuard>
  <AdminContent />
</AdminGuard>

// 教师权限保护
<TeacherGuard>
  <TeacherContent />
</TeacherGuard>

// 学生权限保护
<StudentGuard>
  <StudentContent />
</StudentGuard>
```

### 自定义无权限组件

```typescript
<PermissionGuard 
  requiredRoles={['admin']}
  forbiddenComponent={
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        您需要管理员权限才能访问此功能
      </AlertDescription>
    </Alert>
  }
>
  <AdminFeature />
</PermissionGuard>
```

## 4. Hook级别权限检查

### 使用权限检查Hook

```typescript
import { useUser } from '@/hooks/use-user'
import { usePermissionCheck } from '@/components/auth/permission-guard'

function MyComponent() {
  const { hasRole, hasPermission } = useUser()
  
  // 使用基础Hook
  const isAdmin = hasRole('admin')
  const canManageUsers = hasPermission('admin:users')
  
  // 使用权限检查Hook
  const canAccessFeature = usePermissionCheck({
    requiredRoles: ['admin'],
    requiredPermissions: ['admin:system'],
    mode: 'and'
  })

  return (
    <div>
      {isAdmin && <AdminButton />}
      {canManageUsers && <UserManagementLink />}
      {canAccessFeature && <AdvancedFeature />}
    </div>
  )
}
```

### 条件渲染

```typescript
function ConditionalContent() {
  const { hasRole, hasPermission } = useUser()

  if (!hasRole('admin')) {
    return <div>您需要管理员权限</div>
  }

  if (!hasPermission('admin:users')) {
    return <div>您需要用户管理权限</div>
  }

  return <UserManagementPanel />
}
```

## 5. 权限类型定义

### 用户角色

```typescript
export type UserRole = 'teacher' | 'student' | 'admin' | 'staff' | 'super_admin'
```

### 用户权限

```typescript
export type UserPermission = 
  | 'read'
  | 'write'
  | 'admin'
  | 'teacher:profile'
  | 'teacher:courses'
  | 'teacher:students'
  | 'student:profile'
  | 'student:courses'
  | 'admin:users'
  | 'admin:system'
```

## 6. 403错误页面

### 错误页面功能

- 显示友好的错误信息
- 展示详细的错误详情（可折叠）
- 提供返回上页和回到首页的选项
- 提供联系技术支持的功能

### 错误信息存储

403错误信息会自动存储到sessionStorage中，包含：

```typescript
{
  type: 'FORBIDDEN',
  url: '/api/admin/users',
  method: 'GET',
  status: 403,
  message: '权限不足，无法访问此资源',
  userRoles: ['teacher'],
  currentPath: 'https://example.com/admin',
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

## 7. 最佳实践

### 1. 优先使用路由级别保护

对于整个页面需要特定权限的情况，优先使用路由级别的权限检查：

```typescript
// ✅ 推荐：路由级别保护
export const Route = createFileRoute('/admin/users')({
  beforeLoad: createAdminRouteCheck(),
  component: AdminUsersPage,
})
```

### 2. 组件级别保护用于细粒度控制

对于页面内的特定功能区域，使用组件级别保护：

```typescript
// ✅ 推荐：组件级别保护
function Dashboard() {
  return (
    <div>
      <PublicContent />
      <PermissionGuard requiredRoles={['admin']}>
        <AdminOnlyFeature />
      </PermissionGuard>
    </div>
  )
}
```

### 3. 使用快捷组件简化代码

```typescript
// ✅ 推荐：使用快捷组件
<AdminGuard>
  <AdminPanel />
</AdminGuard>

// ❌ 不推荐：重复的权限配置
<PermissionGuard requiredRoles={['admin', 'super_admin']} mode="or">
  <AdminPanel />
</PermissionGuard>
```

### 4. 提供友好的无权限提示

```typescript
// ✅ 推荐：自定义无权限提示
<PermissionGuard 
  requiredRoles={['admin']}
  forbiddenComponent={
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        您需要管理员权限才能查看此内容。如需申请权限，请联系系统管理员。
      </AlertDescription>
    </Alert>
  }
>
  <AdminContent />
</PermissionGuard>
```

### 5. 记录权限检查日志

权限检查失败时会自动记录日志，包含用户信息和权限要求，便于调试和审计。

## 8. 测试权限保护

项目提供了权限测试页面 `/permission-test`，可以：

- 测试不同权限级别的组件保护
- 测试API权限控制
- 查看当前用户权限信息
- 演示权限检查功能

访问该页面可以验证权限保护功能是否正常工作。

## 9. 故障排除

### 常见问题

1. **权限检查不生效**
   - 检查用户是否已正确登录
   - 验证用户角色和权限是否正确设置
   - 确认权限检查逻辑是否正确

2. **403页面不显示**
   - 检查API客户端拦截器是否正确配置
   - 验证路由配置是否正确

3. **权限信息不准确**
   - 检查JWT解析是否正确
   - 验证后端返回的用户信息格式

### 调试技巧

1. 使用浏览器开发者工具查看控制台日志
2. 检查sessionStorage中的错误信息
3. 使用权限测试页面验证功能
4. 查看网络请求的响应状态码和内容
