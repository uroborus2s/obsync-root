# RBAC权限管理系统实施方案 V2.0

> **架构设计**: 认证与授权分离,通过独立接口按需加载权限

---

## 一、架构设计原则

### 1.1 核心思想: 认证与授权分离

```
┌─────────────────────────────────────────────────────────────┐
│  认证层 (Authentication) - 保持不变                          │
│  ✓ WPS OAuth2.0登录流程                                     │
│  ✓ JWT生成和验证                                            │
│  ✓ 用户身份确认                                             │
│  ✓ JWT中roles/permissions保持为空数组                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  授权层 (Authorization) - 新增                              │
│  ✓ 独立的权限查询接口                                       │
│  ✓ 按需加载用户权限                                         │
│  ✓ 支持不同项目的权限需求                                   │
│  ✓ 灵活的权限缓存策略                                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 设计优势

1. **解耦认证和授权**: 认证流程稳定,授权逻辑独立演进
2. **按需加载**: 只有需要权限控制的项目才调用权限接口
3. **灵活缓存**: 前端可以控制权限数据的缓存策略
4. **易于扩展**: 新增权限类型不影响JWT结构
5. **向后兼容**: 不影响现有的agendaedu-app等项目
6. **避免Cookie过大**: JWT不包含大量权限数据

### 1.3 不同项目的权限需求

#### agendaedu-web (管理后台)

**用户角色**: 管理员、教师、部分学生
**权限需求**:

- ✅ 需要详细的角色权限控制
- ✅ 需要动态菜单
- ✅ 需要按钮级别的权限控制

**实现方式**:

```typescript
// 登录后调用权限接口
const { data: permissions } = await fetch(
  '/api/rbac/users/current/permissions'
);
// 存储到Zustand状态管理
usePermissionStore.setState({ roles, permissions, menus });
```

#### agendaedu-app (移动端应用)

**用户角色**: 主要是学生
**权限需求**:

- ❌ 不需要复杂的权限控制
- ❌ 不需要调用RBAC接口
- ✅ 基于userType做简单的功能区分

**实现方式**:

```typescript
// 直接使用JWT中的userType
const { userType } = useUser();
if (userType === 'student') {
  // 显示学生功能
}
```

---

## 二、现有认证流程 (保持不变)

### 2.1 WPS OAuth2.0登录流程

```
用户访问前端
  ↓
重定向到WPS授权页面
  ↓
用户授权成功,WPS回调 /api/auth/authorization?code=xxx
  ↓
api-gateway/AuthController处理:
  1. 用code换取WPS access_token
  2. 用access_token获取WPS用户信息
  3. 根据third_union_id匹配本地用户(out_xsxx/out_jsxx)
  4. 生成JWT token (roles和permissions为空数组)
  5. 设置HTTP-only cookie
  6. 重定向回前端
  ↓
前端从cookie解析JWT获取基本用户信息
```

**关键代码位置** (不修改):

- `apps/api-gateway/src/controllers/AuthController.ts`
- `apps/api-gateway/src/services/JWTService.ts`
- `apps/api-gateway/src/services/UserAuthService.ts`

### 2.2 JWT Payload结构 (保持不变)

```typescript
{
  userId: string,           // 用户ID
  username: string,         // 用户姓名
  userType: 'student' | 'teacher',
  userNumber: string,       // 学号/工号
  collegeName?: string,     // 学院名称
  roles: [],               // 保持为空数组
  permissions: [],         // 保持为空数组
  iat: number,
  exp: number
}
```

---

## 三、新增权限查询接口设计

### 3.1 接口定义

#### 获取当前用户权限信息

```
GET /api/rbac/users/current/permissions
```

**请求头**:

```
Cookie: wps_jwt_token=xxx
```

**响应格式**:

```typescript
{
  success: true,
  message: "获取成功",
  data: {
    userId: "123456",
    userType: "teacher",
    roles: [
      {
        id: 1,
        code: "teacher",
        name: "教师",
        description: "教师角色"
      },
      {
        id: 2,
        code: "admin",
        name: "管理员",
        description: "系统管理员"
      }
    ],
    permissions: [
      {
        id: 1,
        code: "teacher:courses:read",
        name: "查看课程",
        resource: "courses",
        action: "read"
      },
      {
        id: 2,
        code: "teacher:attendance:read",
        name: "查看考勤",
        resource: "attendance",
        action: "read"
      },
      {
        id: 10,
        code: "admin:users:read",
        name: "查看用户",
        resource: "users",
        action: "read"
      }
      // ... 更多权限
    ],
    menus: [
      {
        id: 1,
        name: "工作流管理",
        path: "/workflows",
        icon: "Workflow",
        children: [
          {
            id: 2,
            name: "工作流定义",
            path: "/workflows/definitions",
            permissionCode: "teacher:workflows:read"
          }
        ]
      }
      // ... 更多菜单
    ]
  }
}
```

**错误响应**:

```typescript
{
  success: false,
  message: "未登录或token无效",
  code: "UNAUTHORIZED"
}
```

### 3.2 后端实现

#### UserPermissionController

**创建** `apps/app-icalink/src/plugins/rbac/controllers/UserPermissionController.ts`:

```typescript
import { Controller, Get } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IUserRoleService } from '../services/interfaces/IUserRoleService';
import type { IMenuService } from '../services/interfaces/IMenuService';

@Controller()
export default class UserPermissionController {
  constructor(
    private userRoleService: IUserRoleService,
    private menuService: IMenuService
  ) {}

  /**
   * 获取当前用户的完整权限信息
   * GET /api/rbac/users/current/permissions
   */
  @Get('/api/rbac/users/current/permissions')
  async getCurrentUserPermissions(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      // 从JWT中获取用户信息
      const user = request.user; // Fastify JWT插件注入

      if (!user || !user.userId || !user.userType) {
        reply.status(401);
        return {
          success: false,
          message: '未登录或token无效',
          code: 'UNAUTHORIZED'
        };
      }

      // 获取用户角色
      const rolesResult = await this.userRoleService.getUserRoles(
        user.userId,
        user.userType
      );

      if (!rolesResult.success) {
        reply.status(500);
        return {
          success: false,
          message: '获取用户角色失败',
          error: rolesResult.error
        };
      }

      // 获取用户权限(聚合所有角色的权限)
      const permissionsResult = await this.userRoleService.getUserPermissions(
        user.userId,
        user.userType
      );

      if (!permissionsResult.success) {
        reply.status(500);
        return {
          success: false,
          message: '获取用户权限失败',
          error: permissionsResult.error
        };
      }

      // 获取用户菜单(根据权限过滤)
      const menusResult = await this.menuService.getMenusByUser(
        user.userId,
        user.userType,
        permissionsResult.data || []
      );

      if (!menusResult.success) {
        reply.status(500);
        return {
          success: false,
          message: '获取用户菜单失败',
          error: menusResult.error
        };
      }

      // 返回完整的权限信息
      return {
        success: true,
        message: '获取成功',
        data: {
          userId: user.userId,
          userType: user.userType,
          roles: rolesResult.data || [],
          permissions: permissionsResult.data || [],
          menus: menusResult.data || []
        }
      };
    } catch (error) {
      request.log.error(error, 'Failed to get current user permissions');
      reply.status(500);
      return {
        success: false,
        message: '服务器内部错误',
        error: error.message
      };
    }
  }
}
```

---

## 四、数据库设计

### 4.1 RBAC核心表结构 (5张表)

详细的表结构请参考原方案文档,这里列出核心表:

1. **rbac_roles** - 角色表
2. **rbac_permissions** - 权限表
3. **rbac_role_permissions** - 角色权限关联表
4. **rbac_user_roles** - 用户角色关联表
5. **rbac_menus** - 菜单表

### 4.2 系统预设角色

- `super_admin` - 超级管理员
- `admin` - 管理员
- `teacher` - 任课教师
- `evaluator` - 评估管理员
- `` - 学科管理员

### 4.3 权限命名规范

格式: `resource:action`

示例:

- `admin:users:read` - 查看用户
- `admin:users:write` - 编辑用户
- `teacher:courses:read` - 查看课程
- `student:attendance:checkin` - 签到

---

## 五、前端实现方案

### 5.1 agendaedu-web 权限加载流程

#### 5.1.1 在useUser Hook中加载权限

**修改** `apps/agendaedu-web/src/hooks/use-user.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PermissionData {
  roles: Role[];
  permissions: Permission[];
  menus: Menu[];
  loadedAt: number;
}

interface UserStore {
  user: User | null;
  permissionData: PermissionData | null;

  // 加载权限数据
  loadPermissions: () => Promise<void>;

  // 清除权限数据
  clearPermissions: () => void;

  // 权限检查方法
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

export const useUser = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      permissionData: null,

      loadPermissions: async () => {
        try {
          const response = await fetch('/api/rbac/users/current/permissions', {
            credentials: 'include' // 携带cookie
          });

          if (!response.ok) {
            throw new Error('Failed to load permissions');
          }

          const result = await response.json();

          if (result.success) {
            set({
              permissionData: {
                ...result.data,
                loadedAt: Date.now()
              }
            });
          }
        } catch (error) {
          console.error('Failed to load permissions:', error);
          // 不抛出错误,允许应用继续运行
        }
      },

      clearPermissions: () => {
        set({ permissionData: null });
      },

      hasPermission: (permission: string) => {
        const { permissionData } = get();
        if (!permissionData) return false;
        return permissionData.permissions.some((p) => p.code === permission);
      },

      hasRole: (role: string) => {
        const { permissionData } = get();
        if (!permissionData) return false;
        return permissionData.roles.some((r) => r.code === role);
      },

      hasAnyPermission: (permissions: string[]) => {
        const { permissionData } = get();
        if (!permissionData) return false;
        return permissions.some((p) =>
          permissionData.permissions.some((perm) => perm.code === p)
        );
      },

      hasAllPermissions: (permissions: string[]) => {
        const { permissionData } = get();
        if (!permissionData) return false;
        return permissions.every((p) =>
          permissionData.permissions.some((perm) => perm.code === p)
        );
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        // 只持久化用户基本信息,不持久化权限数据
        user: state.user
      })
    }
  )
);
```

#### 5.1.2 在路由守卫中加载权限

**修改** `apps/agendaedu-web/src/routes/__root.tsx`:

```typescript
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useUser } from '@/hooks/use-user';
import { useEffect } from 'react';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { user, permissionData, loadPermissions } = useUser();

  useEffect(() => {
    // 如果已登录但权限数据未加载,则加载权限
    if (user && !permissionData) {
      loadPermissions();
    }
  }, [user, permissionData, loadPermissions]);

  return <Outlet />;
}
```

#### 5.1.3 动态菜单渲染

**修改** `apps/agendaedu-web/src/components/layout/app-sidebar.tsx`:

```tsx
import { useUser } from '@/hooks/use-user';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter
} from '@/components/ui/sidebar';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { permissionData } = useUser();

  // 使用从接口获取的菜单数据
  const userMenus = permissionData?.menus || [];

  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {userMenus.length === 0 ? (
          <div className='text-muted-foreground p-4 text-sm'>加载菜单中...</div>
        ) : (
          userMenus.map((group) => <NavGroup key={group.id} {...group} />)
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

#### 5.1.4 路由权限检查

**保持现有的路由权限检查机制**,但使用新的权限数据:

```typescript
// apps/agendaedu-web/src/utils/route-permission.ts
import { useUser } from '@/hooks/use-user';

export function createRoutePermissionCheck(options: {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  mode?: 'and' | 'or';
}) {
  return () => {
    const { hasRole, hasPermission, hasAnyPermission, hasAllPermissions } =
      useUser();

    const {
      requiredRoles = [],
      requiredPermissions = [],
      mode = 'and'
    } = options;

    if (mode === 'or') {
      // 任一条件满足即可
      const hasRequiredRole =
        requiredRoles.length === 0 || requiredRoles.some(hasRole);
      const hasRequiredPermission =
        requiredPermissions.length === 0 ||
        hasAnyPermission(requiredPermissions);

      if (!hasRequiredRole && !hasRequiredPermission) {
        throw new Error('Forbidden: Insufficient permissions');
      }
    } else {
      // 所有条件都要满足
      const hasRequiredRoles =
        requiredRoles.length === 0 || requiredRoles.every(hasRole);
      const hasRequiredPermissions =
        requiredPermissions.length === 0 ||
        hasAllPermissions(requiredPermissions);

      if (!hasRequiredRoles || !hasRequiredPermissions) {
        throw new Error('Forbidden: Insufficient permissions');
      }
    }
  };
}
```

**使用示例**:

```typescript
// apps/agendaedu-web/src/routes/_authenticated/rbac/roles/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { createRoutePermissionCheck } from '@/utils/route-permission';

export const Route = createFileRoute('/_authenticated/rbac/roles/')({
  beforeLoad: createRoutePermissionCheck({
    requiredPermissions: ['admin:roles:read']
  }),
  component: RolesPage
});
```

### 5.2 agendaedu-app 简化实现

**不调用RBAC接口**,直接使用JWT中的userType:

```typescript
// apps/agendaedu-app/src/hooks/use-user.ts
export const useUser = create<UserStore>((set) => ({
  user: null,

  // 简单的权限检查,基于userType
  canAccessFeature: (feature: string) => {
    const { user } = get();
    if (!user) return false;

    // 简单的功能访问控制
    if (feature === 'attendance' && user.userType === 'student') {
      return true;
    }

    return false;
  }
}));
```

### 5.3 权限缓存策略

#### 5.3.1 内存缓存

权限数据存储在Zustand状态管理中,页面刷新后需要重新加载。

#### 5.3.2 定时刷新

```typescript
// 在useUser hook中添加定时刷新逻辑
useEffect(() => {
  if (!permissionData) return;

  // 每30分钟刷新一次权限
  const interval = setInterval(
    () => {
      loadPermissions();
    },
    30 * 60 * 1000
  );

  return () => clearInterval(interval);
}, [permissionData, loadPermissions]);
```

#### 5.3.3 手动刷新

提供手动刷新权限的方法:

```typescript
// 在设置页面或用户菜单中添加刷新按钮
<Button onClick={() => loadPermissions()}>
  刷新权限
</Button>
```

---

## 六、完整的交互流程

### 6.1 登录和权限加载流程

```
┌─────────┐         ┌─────────┐         ┌──────────┐         ┌──────────┐
│  用户   │         │  前端   │         │ api-gateway│        │app-icalink│
└────┬────┘         └────┬────┘         └────┬─────┘         └────┬─────┘
     │                   │                   │                     │
     │ 1. 访问前端       │                   │                     │
     ├──────────────────>│                   │                     │
     │                   │ 2. 检查JWT cookie │                     │
     │                   │    (未登录)       │                     │
     │                   │                   │                     │
     │ 3. 重定向WPS授权  │                   │                     │
     │<──────────────────┤                   │                     │
     │                   │                   │                     │
     │ 4. WPS授权成功    │                   │                     │
     │   回调/api/auth/authorization?code=xxx                      │
     ├───────────────────┼──────────────────>│                     │
     │                   │                   │                     │
     │                   │  5. WPS认证流程   │                     │
     │                   │  6. 生成JWT       │                     │
     │                   │     (roles=[], permissions=[])          │
     │                   │  7. 设置cookie    │                     │
     │                   │                   │                     │
     │ 8. 重定向回前端   │                   │                     │
     │<──────────────────┼───────────────────┤                     │
     │                   │                   │                     │
     │                   │ 9. 解析JWT cookie │                     │
     │                   │    获取基本用户信息                      │
     │                   │                   │                     │
     │                   │ 10. 【新增】调用权限接口                 │
     │                   │    GET /api/rbac/users/current/permissions
     │                   ├───────────────────┼────────────────────>│
     │                   │                   │                     │
     │                   │                   │ 11. 从JWT获取userId/userType
     │                   │                   │ 12. 查询用户角色    │
     │                   │                   │ 13. 聚合用户权限    │
     │                   │                   │ 14. 过滤用户菜单    │
     │                   │                   │                     │
     │                   │ 15. 返回完整权限数据                     │
     │                   │<──────────────────┼─────────────────────┤
     │                   │    {roles, permissions, menus}          │
     │                   │                   │                     │
     │                   │ 16. 存储到Zustand │                     │
     │                   │     状态管理      │                     │
     │                   │                   │                     │
     │ 17. 渲染页面      │                   │                     │
     │    (动态菜单+权限控制)                │                     │
     │<──────────────────┤                   │                     │
     │                   │                   │                     │
```

### 6.2 权限检查流程

```
用户操作 (访问路由/点击按钮)
  ↓
前端权限检查
  ├─ 路由级别: beforeLoad中检查requiredPermissions
  ├─ 组件级别: <PermissionGuard>检查权限
  ├─ Hook级别: hasPermission()检查权限
  └─ 菜单级别: 根据permissionData.menus渲染
  ↓
从Zustand获取permissionData
  ↓
检查permissions数组中是否包含所需权限
  ↓
有权限 → 允许访问
无权限 → 拒绝访问(跳转403或隐藏按钮)
```

### 6.3 不同项目的处理差异

#### agendaedu-web (管理后台)

```typescript
// 登录后自动加载权限
useEffect(() => {
  if (user && !permissionData) {
    loadPermissions(); // 调用 /api/rbac/users/current/permissions
  }
}, [user, permissionData]);

// 使用详细的权限控制
<PermissionGuard requiredPermissions={['admin:users:write']}>
  <Button>编辑用户</Button>
</PermissionGuard>
```

#### agendaedu-app (移动端)

```typescript
// 不调用权限接口,直接使用userType
const { user } = useUser();

// 简单的功能区分
{user.userType === 'student' && (
  <AttendanceButton />
)}
```

---

## 七、后端分层架构实现

### 7.1 Repository层

#### IUserRoleRepository

```typescript
export interface IUserRoleRepository {
  // 获取用户的所有角色
  getRolesByUser(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Role[]>>;

  // 为用户分配角色
  assignRoleToUser(
    userId: string,
    userType: UserType,
    roleId: number
  ): Promise<ServiceResult<void>>;

  // 移除用户角色
  removeRoleFromUser(
    userId: string,
    userType: UserType,
    roleId: number
  ): Promise<ServiceResult<void>>;
}
```

#### IRolePermissionRepository

```typescript
export interface IRolePermissionRepository {
  // 获取角色的所有权限
  getPermissionsByRole(roleId: number): Promise<ServiceResult<Permission[]>>;

  // 为角色分配权限
  assignPermissionsToRole(
    roleId: number,
    permissionIds: number[]
  ): Promise<ServiceResult<void>>;
}
```

### 7.2 Service层

#### IUserRoleService

```typescript
export interface IUserRoleService {
  // 获取用户角色
  getUserRoles(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Role[]>>;

  // 获取用户权限(聚合所有角色的权限)
  getUserPermissions(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Permission[]>>;
}
```

**实现示例**:

```typescript
export default class UserRoleService implements IUserRoleService {
  constructor(
    private userRoleRepository: IUserRoleRepository,
    private rolePermissionRepository: IRolePermissionRepository
  ) {}

  async getUserRoles(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Role[]>> {
    return this.userRoleRepository.getRolesByUser(userId, userType);
  }

  async getUserPermissions(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Permission[]>> {
    try {
      // 1. 获取用户所有角色
      const rolesResult = await this.userRoleRepository.getRolesByUser(
        userId,
        userType
      );
      if (!rolesResult.success || !rolesResult.data) {
        return { success: false, error: rolesResult.error };
      }

      // 2. 获取每个角色的权限
      const permissionSets = await Promise.all(
        rolesResult.data.map((role) =>
          this.rolePermissionRepository.getPermissionsByRole(role.id)
        )
      );

      // 3. 聚合并去重
      const allPermissions = permissionSets
        .filter((result) => result.success && result.data)
        .flatMap((result) => result.data!);

      const uniquePermissions = Array.from(
        new Map(allPermissions.map((p) => [p.id, p])).values()
      );

      return { success: true, data: uniquePermissions };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message, code: 'PERMISSION_AGGREGATION_ERROR' }
      };
    }
  }
}
```

#### IMenuService

```typescript
export interface IMenuService {
  // 获取用户菜单(根据权限过滤)
  getMenusByUser(
    userId: string,
    userType: UserType,
    permissions: Permission[]
  ): Promise<ServiceResult<MenuTreeNode[]>>;

  // 获取所有菜单
  getAllMenus(): Promise<ServiceResult<Menu[]>>;
}
```

**实现示例**:

```typescript
export default class MenuService implements IMenuService {
  constructor(private menuRepository: IMenuRepository) {}

  async getMenusByUser(
    userId: string,
    userType: UserType,
    permissions: Permission[]
  ): Promise<ServiceResult<MenuTreeNode[]>> {
    try {
      // 1. 获取所有菜单
      const menusResult = await this.menuRepository.findAll();
      if (!menusResult.success || !menusResult.data) {
        return { success: false, error: menusResult.error };
      }

      // 2. 提取权限代码集合
      const permissionCodes = new Set(permissions.map((p) => p.code));

      // 3. 过滤菜单(只保留用户有权限的菜单)
      const filteredMenus = menusResult.data.filter((menu) => {
        // 如果菜单没有关联权限,默认显示
        if (!menu.permission_code) return true;

        // 检查用户是否有对应权限
        return permissionCodes.has(menu.permission_code);
      });

      // 4. 构建菜单树
      const menuTree = this.buildMenuTree(filteredMenus);

      return { success: true, data: menuTree };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message, code: 'MENU_FILTER_ERROR' }
      };
    }
  }

  private buildMenuTree(menus: Menu[]): MenuTreeNode[] {
    const menuMap = new Map<number, MenuTreeNode>();
    const rootMenus: MenuTreeNode[] = [];

    // 第一遍:创建所有节点
    menus.forEach((menu) => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    // 第二遍:建立父子关系
    menus.forEach((menu) => {
      const node = menuMap.get(menu.id)!;
      if (menu.parent_id) {
        const parent = menuMap.get(menu.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootMenus.push(node);
      }
    });

    return rootMenus;
  }
}
```

---

## 八、实施计划

### 阶段一: 数据库和基础架构 (3-4天)

**任务清单**:

- [ ] 创建RBAC数据表(5张表)
- [ ] 编写初始化数据SQL脚本
  - [ ] 插入系统角色(4个)
  - [ ] 插入系统权限(20+个)
  - [ ] 建立角色-权限关联
  - [ ] 为现有用户分配默认角色
- [ ] 实现Repository层(5个Repository)
- [ ] 实现Service层(UserRoleService, MenuService)
- [ ] 编写单元测试

**交付物**:

- `apps/app-icalink/database/003_create_rbac_tables.sql`
- `apps/app-icalink/database/004_insert_rbac_data.sql`
- Repository实现代码
- Service实现代码
- 单元测试代码

### 阶段二: 后端权限查询接口 (2-3天)

**任务清单**:

- [ ] 实现UserPermissionController
- [ ] 实现权限聚合逻辑
- [ ] 实现菜单过滤逻辑
- [ ] API集成测试
- [ ] 编写API文档

**交付物**:

- UserPermissionController实现代码
- API文档(Markdown格式)
- 集成测试代码
- Postman测试集合

### 阶段三: 前端权限加载 (2-3天)

**任务清单**:

- [ ] 修改useUser hook,添加loadPermissions方法
- [ ] 在路由守卫中调用权限接口
- [ ] 实现权限缓存策略
- [ ] 修改动态菜单组件
- [ ] 测试路由守卫和组件权限

**交付物**:

- 修改后的useUser hook
- 修改后的app-sidebar组件
- 权限加载测试报告

### 阶段四: 前端管理页面 (4-5天)

**任务清单**:

- [ ] 角色管理页面
  - [ ] 角色列表
  - [ ] 角色创建/编辑对话框
  - [ ] 权限分配对话框(树形结构)
- [ ] 用户角色分配页面
- [ ] 菜单管理页面
  - [ ] 菜单树展示
  - [ ] 菜单创建/编辑
  - [ ] 菜单排序

**交付物**:

- 角色管理页面代码
- 用户管理页面代码
- 菜单管理页面代码

### 阶段五: 测试和优化 (2-3天)

**任务清单**:

- [ ] 端到端测试
- [ ] 性能测试
- [ ] 权限缓存优化
- [ ] 文档完善
- [ ] 代码审查

**交付物**:

- 测试报告
- 性能优化报告
- 完整文档

**总计**: 13-18天

---

## 九、技术难点和解决方案

### 9.1 权限数据实时性

**问题**: 管理员修改权限后,用户的权限数据不会立即更新。

**解决方案**:

1. **定时刷新**: 前端每30分钟自动刷新权限
2. **手动刷新**: 提供刷新按钮,用户可以手动刷新
3. **WebSocket通知**: 管理员修改权限后,通过WebSocket通知在线用户刷新(可选)
4. **敏感操作实时验证**: 关键操作时调用后端API实时验证权限

### 9.2 权限接口性能优化

**问题**: 权限聚合涉及多表查询,可能影响性能。

**解决方案**:

1. **数据库索引**: 在关联字段上建立索引
2. **查询优化**: 使用JOIN减少查询次数
3. **Redis缓存**: 缓存用户权限数据(5-10分钟)
4. **批量查询**: 使用IN查询减少数据库往返

**缓存实现示例**:

```typescript
async getUserPermissions(userId: string, userType: UserType): Promise<ServiceResult<Permission[]>> {
  // 1. 尝试从Redis获取缓存
  const cacheKey = `user:permissions:${userType}:${userId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return { success: true, data: JSON.parse(cached) };
  }

  // 2. 从数据库查询
  const result = await this.queryPermissionsFromDB(userId, userType);

  // 3. 写入缓存(5分钟过期)
  if (result.success && result.data) {
    await redis.setex(cacheKey, 300, JSON.stringify(result.data));
  }

  return result;
}
```

### 9.3 多角色权限聚合

**问题**: 一个用户可能有多个角色,需要正确聚合所有权限。

**解决方案**: 使用Map去重,保证每个权限只出现一次。

```typescript
const uniquePermissions = Array.from(
  new Map(allPermissions.map((p) => [p.id, p])).values()
);
```

### 9.4 菜单树构建

**问题**: 菜单是树形结构,需要递归构建。

**解决方案**: 使用两遍遍历算法,时间复杂度O(n)。

```typescript
private buildMenuTree(menus: Menu[]): MenuTreeNode[] {
  const menuMap = new Map<number, MenuTreeNode>();
  const rootMenus: MenuTreeNode[] = [];

  // 第一遍:创建所有节点
  menus.forEach(menu => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });

  // 第二遍:建立父子关系
  menus.forEach(menu => {
    const node = menuMap.get(menu.id)!;
    if (menu.parent_id) {
      const parent = menuMap.get(menu.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      rootMenus.push(node);
    }
  });

  return rootMenus;
}
```

---

## 十、总结

### 10.1 核心优势

1. **认证与授权分离**: 不修改现有认证流程,降低风险
2. **按需加载**: 只有需要权限控制的项目才调用接口
3. **灵活缓存**: 前端控制权限数据的缓存策略
4. **易于扩展**: 新增权限类型不影响JWT结构
5. **向后兼容**: 不影响现有的agendaedu-app等项目
6. **性能优化**: 支持Redis缓存,减少数据库压力

### 10.2 与V1方案的对比

| 对比项     | V1方案(修改JWT)        | V2方案(独立接口) |
| ---------- | ---------------------- | ---------------- |
| 认证流程   | 需要修改AuthController | 保持不变         |
| JWT结构    | 包含roles和permissions | 保持为空数组     |
| 权限加载   | 登录时自动加载         | 前端按需调用接口 |
| Cookie大小 | 可能过大               | 不受影响         |
| 权限更新   | 需要重新登录           | 调用接口即可刷新 |
| 项目兼容性 | 影响所有项目           | 只影响需要的项目 |
| 实施风险   | 较高                   | 较低             |

### 10.3 推荐理由

✅ **推荐使用V2方案**,原因:

1. 风险更低,不修改核心认证流程
2. 更加灵活,支持按需加载和缓存
3. 向后兼容,不影响现有项目
4. 易于维护,认证和授权逻辑分离

---

## 十一、下一步行动

1. **评审方案**: 与团队评审本方案,确认技术细节
2. **创建任务**: 在项目管理工具中创建任务清单
3. **准备环境**: 准备开发和测试数据库
4. **开始开发**: 按照5个阶段逐步实施
5. **持续沟通**: 定期同步进度,及时调整方案

---

**相关文档**:

- [RBAC方案总结](./RBAC_SUMMARY.md)
- [快速开始指南](./RBAC_QUICK_START.md)
- [原方案文档](./RBAC_IMPLEMENTATION_PLAN.md)
