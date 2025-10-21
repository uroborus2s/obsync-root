# RBAC权限管理系统实施方案

## 一、项目背景

### 1.1 项目概述

为 **agendaedu-web** (管理后台) 和 **app-icalink** (后端API服务) 实现完整的基于角色的访问控制(RBAC)系统。

### 1.2 技术栈

- **后端**: Stratix框架 (Fastify 5 + Awilix 12)
- **前端**: React + TanStack Router + shadcn/ui
- **数据库**: MySQL 5.7+
- **认证**: WPS OAuth2.0 + JWT

### 1.3 现有认证流程分析

#### 当前登录流程

```
用户访问前端
  ↓
重定向到WPS授权页面 (https://openapi.wps.cn/oauthapi/v2/authorize)
  ↓
用户授权成功,WPS回调 /api/auth/authorization?code=xxx&state=xxx
  ↓
api-gateway/AuthController处理:
  1. 用code换取WPS access_token
  2. 用access_token获取WPS用户信息(openid, third_union_id等)
  3. 根据third_union_id匹配本地用户(out_xsxx或out_jsxx表)
  4. 生成JWT token并设置HTTP-only cookie
  5. 重定向回前端页面
  ↓
前端从cookie解析JWT获取用户信息
```

#### 当前JWT Payload结构

```typescript
{
  userId: string,           // 用户ID
  username: string,         // 用户姓名
  userType: 'student' | 'teacher',
  userNumber: string,       // 学号/工号
  email?: string,
  phone?: string,
  collegeName?: string,     // 学院名称
  majorName?: string,       // 专业名称
  className?: string,       // 班级名称
  roles: [],               // ⚠️ 当前为空数组
  permissions: [],         // ⚠️ 当前为空数组
  iat: number,             // 签发时间
  exp: number,             // 过期时间
  aud: string,             // 受众
  iss: string              // 签发者
}
```

#### 前端权限检查机制

1. **路由级别**: `createRoutePermissionCheck()` 检查roles/permissions
2. **组件级别**: `<PermissionGuard>` 组件控制显示
3. **菜单级别**: `filterMenuItems()` 过滤无权限菜单
4. **Hook级别**: `useUser()` 提供 `hasPermission()` 和 `hasRole()` 方法

**关键问题**: 当前roles和permissions是空数组,需要实现完整的RBAC系统来填充这些数据。

---

## 二、数据库设计

### 2.1 RBAC核心表结构

#### 2.1.1 角色表 (rbac_roles)

```sql
CREATE TABLE `rbac_roles` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `name` VARCHAR(100) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(50) NOT NULL COMMENT '角色代码(唯一标识)',
  `description` VARCHAR(500) COMMENT '角色描述',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统角色(不可删除)',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` VARCHAR(100),
  `updated_by` VARCHAR(100),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';
```

#### 2.1.2 权限表 (rbac_permissions)

```sql
CREATE TABLE `rbac_permissions` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '权限ID',
  `name` VARCHAR(100) NOT NULL COMMENT '权限名称',
  `code` VARCHAR(100) NOT NULL COMMENT '权限代码(唯一标识)',
  `resource` VARCHAR(50) NOT NULL COMMENT '资源类型',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `description` VARCHAR(500) COMMENT '权限描述',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统权限',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_resource` (`resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';
```

#### 2.1.3 角色权限关联表 (rbac_role_permissions)

```sql
CREATE TABLE `rbac_role_permissions` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT(20) NOT NULL COMMENT '角色ID',
  `permission_id` BIGINT(20) NOT NULL COMMENT '权限ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(100),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_permission_id` (`permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `rbac_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `rbac_permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';
```

#### 2.1.4 用户角色关联表 (rbac_user_roles)

```sql
CREATE TABLE `rbac_user_roles` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(100) NOT NULL COMMENT '用户ID(对应out_xsxx.id或out_jsxx.id)',
  `user_type` ENUM('student', 'teacher') NOT NULL COMMENT '用户类型',
  `role_id` BIGINT(20) NOT NULL COMMENT '角色ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(100),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `user_type`, `role_id`),
  KEY `idx_user` (`user_id`, `user_type`),
  KEY `idx_role_id` (`role_id`),
  CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `rbac_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';
```

#### 2.1.5 菜单表 (rbac_menus)

```sql
CREATE TABLE `rbac_menus` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `name` VARCHAR(100) NOT NULL COMMENT '菜单名称',
  `path` VARCHAR(200) COMMENT '路由路径',
  `icon` VARCHAR(50) COMMENT '图标名称',
  `parent_id` BIGINT(20) COMMENT '父菜单ID',
  `permission_code` VARCHAR(100) COMMENT '关联的权限代码',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序序号',
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否可见',
  `menu_type` ENUM('group', 'menu', 'button') NOT NULL DEFAULT 'menu' COMMENT '菜单类型',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_permission_code` (`permission_code`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜单表';
```

### 2.2 初始数据设计

#### 2.2.1 系统预设角色

| code        | name       | description                  | is_system |
| ----------- | ---------- | ---------------------------- | --------- |
| super_admin | 超级管理员 | 拥有所有权限,用于系统管理    | 1         |
| admin       | 管理员     | 用户管理、角色管理、系统配置 | 1         |
| teacher     | 教师       | 课程管理、考勤管理、请假审批 | 1         |
| student     | 学生       | 签到、请假申请、查看个人记录 | 1         |

#### 2.2.2 系统预设权限(按资源分组)

**用户管理 (admin:users:\*)**

- `admin:users:read` - 查看用户列表
- `admin:users:write` - 编辑用户信息
- `admin:users:delete` - 删除用户
- `admin:users:assign-roles` - 分配角色

**角色管理 (admin:roles:\*)**

- `admin:roles:read` - 查看角色列表
- `admin:roles:write` - 编辑角色
- `admin:roles:delete` - 删除角色
- `admin:roles:assign-permissions` - 分配权限

**菜单管理 (admin:menus:\*)**

- `admin:menus:read` - 查看菜单
- `admin:menus:write` - 编辑菜单

**课程管理 (course:\*)**

- `teacher:courses:read` - 查看课程列表
- `teacher:courses:write` - 编辑课程设置
- `student:courses:read` - 查看自己的课程

**考勤管理 (attendance:\*)**

- `teacher:attendance:read` - 查看考勤记录
- `teacher:attendance:export` - 导出考勤数据
- `student:attendance:checkin` - 学生签到
- `student:attendance:read` - 查看自己的考勤

**请假管理 (leave:\*)**

- `teacher:leave:approve` - 审批请假申请
- `teacher:leave:read` - 查看请假记录
- `student:leave:submit` - 提交请假申请
- `student:leave:read` - 查看自己的请假

---

## 三、后端实现方案

### 3.1 分层架构设计

遵循Stratix框架的标准分层架构: **Repository → Service → Controller**

#### 3.1.1 Repository层 (数据访问)

**IRoleRepository**

```typescript
export interface IRoleRepository {
  findAll(filters?: RoleFilters): Promise<ServiceResult<Role[]>>;
  findById(id: number): Promise<ServiceResult<Role | null>>;
  findByCode(code: string): Promise<ServiceResult<Role | null>>;
  create(role: CreateRoleDto): Promise<ServiceResult<Role>>;
  update(id: number, role: UpdateRoleDto): Promise<ServiceResult<Role>>;
  delete(id: number): Promise<ServiceResult<void>>;
}
```

**IPermissionRepository**

```typescript
export interface IPermissionRepository {
  findAll(filters?: PermissionFilters): Promise<ServiceResult<Permission[]>>;
  findById(id: number): Promise<ServiceResult<Permission | null>>;
  findByResource(resource: string): Promise<ServiceResult<Permission[]>>;
  findByRoleId(roleId: number): Promise<ServiceResult<Permission[]>>;
}
```

**IRolePermissionRepository**

```typescript
export interface IRolePermissionRepository {
  assignPermissionsToRole(
    roleId: number,
    permissionIds: number[]
  ): Promise<ServiceResult<void>>;
  removePermissionsFromRole(
    roleId: number,
    permissionIds: number[]
  ): Promise<ServiceResult<void>>;
  getPermissionsByRole(roleId: number): Promise<ServiceResult<Permission[]>>;
}
```

**IUserRoleRepository**

```typescript
export interface IUserRoleRepository {
  assignRolesToUser(
    userId: string,
    userType: UserType,
    roleIds: number[]
  ): Promise<ServiceResult<void>>;
  removeRolesFromUser(
    userId: string,
    userType: UserType,
    roleIds: number[]
  ): Promise<ServiceResult<void>>;
  getRolesByUser(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Role[]>>;
  getPermissionsByUser(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Permission[]>>;
}
```

**IMenuRepository**

```typescript
export interface IMenuRepository {
  findAll(): Promise<ServiceResult<Menu[]>>;
  findById(id: number): Promise<ServiceResult<Menu | null>>;
  findByPermissionCodes(codes: string[]): Promise<ServiceResult<Menu[]>>;
  create(menu: CreateMenuDto): Promise<ServiceResult<Menu>>;
  update(id: number, menu: UpdateMenuDto): Promise<ServiceResult<Menu>>;
  delete(id: number): Promise<ServiceResult<void>>;
}
```

#### 3.1.2 Service层 (业务逻辑)

**IRoleService**

```typescript
export interface IRoleService {
  // 角色CRUD
  getRoles(filters?: RoleFilters): Promise<ServiceResult<Role[]>>;
  getRoleById(id: number): Promise<ServiceResult<Role>>;
  createRole(dto: CreateRoleDto): Promise<ServiceResult<Role>>;
  updateRole(id: number, dto: UpdateRoleDto): Promise<ServiceResult<Role>>;
  deleteRole(id: number): Promise<ServiceResult<void>>;

  // 权限管理
  assignPermissionsToRole(
    roleId: number,
    permissionIds: number[]
  ): Promise<ServiceResult<void>>;
  getPermissionsByRole(roleId: number): Promise<ServiceResult<Permission[]>>;
}
```

**IUserRoleService**

```typescript
export interface IUserRoleService {
  // 用户角色管理
  assignRolesToUser(
    userId: string,
    userType: UserType,
    roleIds: number[]
  ): Promise<ServiceResult<void>>;
  getUserRoles(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Role[]>>;

  // 用户权限聚合(核心方法)
  getUserPermissions(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Permission[]>>;

  // 权限检查
  hasPermission(
    userId: string,
    userType: UserType,
    permissionCode: string
  ): Promise<ServiceResult<boolean>>;
  hasRole(
    userId: string,
    userType: UserType,
    roleCode: string
  ): Promise<ServiceResult<boolean>>;
}
```

**IMenuService**

```typescript
export interface IMenuService {
  // 菜单CRUD
  getMenus(): Promise<ServiceResult<Menu[]>>;
  getMenuById(id: number): Promise<ServiceResult<Menu>>;
  createMenu(dto: CreateMenuDto): Promise<ServiceResult<Menu>>;
  updateMenu(id: number, dto: UpdateMenuDto): Promise<ServiceResult<Menu>>;
  deleteMenu(id: number): Promise<ServiceResult<void>>;

  // 用户菜单(根据权限过滤)
  getMenusByUser(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<Menu[]>>;

  // 菜单树构建
  buildMenuTree(menus: Menu[]): Promise<ServiceResult<MenuTreeNode[]>>;
}
```

#### 3.1.3 Controller层 (HTTP接口)

**RoleController** - 角色管理接口

```typescript
@Controller()
export class RoleController {
  // GET /api/rbac/roles - 获取角色列表
  @Get('/api/rbac/roles')
  async getRoles(request, reply): Promise<ApiResponse<Role[]>>;

  // GET /api/rbac/roles/:id - 获取角色详情
  @Get('/api/rbac/roles/:id')
  async getRoleById(request, reply): Promise<ApiResponse<Role>>;

  // POST /api/rbac/roles - 创建角色
  @Post('/api/rbac/roles')
  async createRole(request, reply): Promise<ApiResponse<Role>>;

  // PUT /api/rbac/roles/:id - 更新角色
  @Put('/api/rbac/roles/:id')
  async updateRole(request, reply): Promise<ApiResponse<Role>>;

  // DELETE /api/rbac/roles/:id - 删除角色
  @Delete('/api/rbac/roles/:id')
  async deleteRole(request, reply): Promise<ApiResponse<void>>;

  // POST /api/rbac/roles/:id/permissions - 分配权限
  @Post('/api/rbac/roles/:id/permissions')
  async assignPermissions(request, reply): Promise<ApiResponse<void>>;

  // GET /api/rbac/roles/:id/permissions - 获取角色权限
  @Get('/api/rbac/roles/:id/permissions')
  async getRolePermissions(request, reply): Promise<ApiResponse<Permission[]>>;
}
```

**PermissionController** - 权限管理接口

```typescript
@Controller()
export class PermissionController {
  // GET /api/rbac/permissions - 获取权限列表
  @Get('/api/rbac/permissions')
  async getPermissions(request, reply): Promise<ApiResponse<Permission[]>>;

  // GET /api/rbac/permissions/grouped - 获取分组权限(按resource分组)
  @Get('/api/rbac/permissions/grouped')
  async getGroupedPermissions(request, reply): Promise<ApiResponse<GroupedPermissions>>;
}
```

**UserRoleController** - 用户角色管理接口

```typescript
@Controller()
export class UserRoleController {
  // POST /api/rbac/users/:id/roles - 分配角色
  @Post('/api/rbac/users/:id/roles')
  async assignRoles(request, reply): Promise<ApiResponse<void>>;

  // GET /api/rbac/users/:id/roles - 获取用户角色
  @Get('/api/rbac/users/:id/roles')
  async getUserRoles(request, reply): Promise<ApiResponse<Role[]>>;

  // GET /api/rbac/users/:id/permissions - 获取用户权限
  @Get('/api/rbac/users/:id/permissions')
  async getUserPermissions(request, reply): Promise<ApiResponse<Permission[]>>;
}
```

**MenuController** - 菜单管理接口

```typescript
@Controller()
export class MenuController {
  // GET /api/rbac/menus - 获取所有菜单
  @Get('/api/rbac/menus')
  async getMenus(request, reply): Promise<ApiResponse<Menu[]>>;

  // GET /api/rbac/menus/user - 获取当前用户菜单(核心接口)
  @Get('/api/rbac/menus/user')
  async getUserMenus(request, reply): Promise<ApiResponse<MenuTreeNode[]>>;

  // POST /api/rbac/menus - 创建菜单
  @Post('/api/rbac/menus')
  async createMenu(request, reply): Promise<ApiResponse<Menu>>;

  // PUT /api/rbac/menus/:id - 更新菜单
  @Put('/api/rbac/menus/:id')
  async updateMenu(request, reply): Promise<ApiResponse<Menu>>;

  // DELETE /api/rbac/menus/:id - 删除菜单
  @Delete('/api/rbac/menus/:id')
  async deleteMenu(request, reply): Promise<ApiResponse<void>>;
}
```

### 3.2 核心流程实现

#### 3.2.1 登录时加载用户权限

**修改 api-gateway/src/controllers/AuthController.ts**

```typescript
async handleAuthorization(request, reply) {
  // ... WPS认证流程(获取code, 换取token, 获取用户信息) ...

  // 匹配本地用户
  const userMatchResult = await this.userAuthService.findLocalUser(wpsUserInfo);
  const userInfo = userMatchResult.user;

  // 【新增】获取用户角色和权限
  const rolesResult = await this.userRoleService.getUserRoles(
    userInfo.id,
    userInfo.userType
  );
  const permissionsResult = await this.userRoleService.getUserPermissions(
    userInfo.id,
    userInfo.userType
  );

  // 处理失败情况,使用默认角色
  let roles: string[] = [];
  let permissions: string[] = [];

  if (isSuccessResult(rolesResult) && rolesResult.data) {
    roles = rolesResult.data.map(r => r.code);
  } else {
    // 默认角色
    roles = userInfo.userType === 'teacher' ? ['teacher'] : ['student'];
    this.logger.warn('Failed to load user roles, using default', {
      userId: userInfo.id,
      userType: userInfo.userType
    });
  }

  if (isSuccessResult(permissionsResult) && permissionsResult.data) {
    permissions = permissionsResult.data.map(p => p.code);
  }

  // 生成增强的JWT payload
  const jwtPayload = this.createEnhancedJWTPayload(userInfo, { roles, permissions });

  // 生成JWT并设置cookie
  const jwtToken = this.jwtService.generateToken(jwtPayload);
  await this.setAuthCookie(reply, jwtToken);

  // 重定向回前端
  const callbackUrl = decodeURIComponent(Buffer.from(state, 'base64').toString('utf8'));
  return reply.redirect(callbackUrl);
}

private createEnhancedJWTPayload(
  userInfo: ExtendedAuthenticatedUser,
  rbac: { roles: string[], permissions: string[] }
): JWTPayload {
  return {
    userId: userInfo.id,
    username: userInfo.name,
    userName: userInfo.name,
    userType: userInfo.userType,
    userNumber: userInfo.userNumber,
    email: userInfo.email,
    phone: userInfo.phone,
    collegeName: userInfo.collegeName,
    majorName: userInfo.majorName,
    className: userInfo.className,
    roles: rbac.roles,           // 【新增】角色数组
    permissions: rbac.permissions // 【新增】权限数组
  };
}
```

#### 3.2.2 权限刷新接口

**新增刷新权限的API**

```typescript
// AuthController.ts
@Post('/api/auth/refresh-permissions')
async refreshPermissions(request: FastifyRequest, reply: FastifyReply) {
  try {
    // 从JWT中获取用户信息
    const userIdentity = (request as any).userIdentity;
    if (!userIdentity) {
      reply.status(401);
      return { success: false, message: '未登录' };
    }

    // 重新加载角色和权限
    const rolesResult = await this.userRoleService.getUserRoles(
      userIdentity.userId,
      userIdentity.userType
    );
    const permissionsResult = await this.userRoleService.getUserPermissions(
      userIdentity.userId,
      userIdentity.userType
    );

    // 生成新的JWT
    const newPayload = {
      ...userIdentity,
      roles: rolesResult.data?.map(r => r.code) || [],
      permissions: permissionsResult.data?.map(p => p.code) || []
    };

    const newToken = this.jwtService.generateToken(newPayload);
    await this.setAuthCookie(reply, newToken);

    return {
      success: true,
      message: '权限已刷新',
      data: {
        roles: newPayload.roles,
        permissions: newPayload.permissions
      }
    };
  } catch (error) {
    reply.status(500);
    return { success: false, message: '刷新权限失败' };
  }
}
```

---

## 四、前端实现方案

### 4.1 类型定义增强

**修改 apps/agendaedu-web/src/types/user.types.ts**

```typescript
// 扩展权限类型
export type UserPermission =
  // 管理员权限
  | 'admin:users:read'
  | 'admin:users:write'
  | 'admin:users:delete'
  | 'admin:users:assign-roles'
  | 'admin:roles:read'
  | 'admin:roles:write'
  | 'admin:roles:delete'
  | 'admin:roles:assign-permissions'
  | 'admin:menus:read'
  | 'admin:menus:write'
  // 教师权限
  | 'teacher:courses:read'
  | 'teacher:courses:write'
  | 'teacher:attendance:read'
  | 'teacher:attendance:export'
  | 'teacher:leave:approve'
  | 'teacher:leave:read'
  // 学生权限
  | 'student:courses:read'
  | 'student:attendance:checkin'
  | 'student:attendance:read'
  | 'student:leave:submit'
  | 'student:leave:read';

// 扩展角色类型
export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student';
```

### 4.2 动态菜单加载

**修改 apps/agendaedu-web/src/components/layout/app-sidebar.tsx**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();

  // 从后端获取用户菜单
  const { data: userMenus, isLoading } = useQuery({
    queryKey: ['user-menus'],
    queryFn: async () => {
      const response = await fetch('/api/rbac/menus/user');
      if (!response.ok) throw new Error('Failed to fetch menus');
      const result = await response.json();
      return result.data;
    },
    enabled: !!user, // 只有登录后才获取
  });

  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {isLoading ? (
          <div>加载中...</div>
        ) : (
          userMenus?.map((group) => (
            <NavGroup key={group.title} {...group} />
          ))
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

### 4.3 前端管理页面

#### 4.3.1 角色管理页面

**创建 apps/agendaedu-web/src/features/rbac/roles/index.tsx**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { RoleDialog } from './role-dialog';
import { PermissionDialog } from './permission-dialog';

export function RolesPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  // 获取角色列表
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/rbac/roles');
      const result = await res.json();
      return result.data;
    }
  });

  // 删除角色
  const deleteMutation = useMutation({
    mutationFn: async (roleId: number) => {
      await fetch(`/api/rbac/roles/${roleId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  const columns = [
    { accessorKey: 'name', header: '角色名称' },
    { accessorKey: 'code', header: '角色代码' },
    { accessorKey: 'description', header: '描述' },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className='flex gap-2'>
          <Button
            onClick={() => {
              setSelectedRole(row.original);
              setShowRoleDialog(true);
            }}
          >
            编辑
          </Button>
          <Button
            onClick={() => {
              setSelectedRole(row.original);
              setShowPermissionDialog(true);
            }}
          >
            分配权限
          </Button>
          <Button
            variant='destructive'
            onClick={() => deleteMutation.mutate(row.original.id)}
            disabled={row.original.is_system}
          >
            删除
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className='p-6'>
      <div className='mb-4 flex justify-between'>
        <h1 className='text-2xl font-bold'>角色管理</h1>
        <Button
          onClick={() => {
            setSelectedRole(null);
            setShowRoleDialog(true);
          }}
        >
          新建角色
        </Button>
      </div>

      <DataTable columns={columns} data={roles || []} loading={isLoading} />

      {showRoleDialog && (
        <RoleDialog
          role={selectedRole}
          onClose={() => setShowRoleDialog(false)}
          onSuccess={() => {
            setShowRoleDialog(false);
            queryClient.invalidateQueries({ queryKey: ['roles'] });
          }}
        />
      )}

      {showPermissionDialog && selectedRole && (
        <PermissionDialog
          role={selectedRole}
          onClose={() => setShowPermissionDialog(false)}
          onSuccess={() => {
            setShowPermissionDialog(false);
          }}
        />
      )}
    </div>
  );
}
```

#### 4.3.2 权限分配对话框

**创建 apps/agendaedu-web/src/features/rbac/roles/permission-dialog.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

export function PermissionDialog({ role, onClose, onSuccess }) {
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  // 获取所有权限
  const { data: allPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await fetch('/api/rbac/permissions');
      const result = await res.json();
      return result.data;
    }
  });

  // 获取角色已有权限
  const { data: rolePermissions } = useQuery({
    queryKey: ['role-permissions', role.id],
    queryFn: async () => {
      const res = await fetch(`/api/rbac/roles/${role.id}/permissions`);
      const result = await res.json();
      return result.data;
    },
    onSuccess: (data) => {
      setSelectedPermissions(data.map((p) => p.id));
    }
  });

  // 保存权限分配
  const saveMutation = useMutation({
    mutationFn: async (permissionIds: number[]) => {
      await fetch(`/api/rbac/roles/${role.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds })
      });
    },
    onSuccess: () => {
      onSuccess();
    }
  });

  // 按资源分组权限
  const groupedPermissions = allPermissions?.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {});

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>为角色 "{role.name}" 分配权限</DialogTitle>
        </DialogHeader>

        <ScrollArea className='h-96'>
          {Object.entries(groupedPermissions || {}).map(
            ([resource, permissions]) => (
              <div key={resource} className='mb-4'>
                <h3 className='mb-2 font-semibold'>{resource}</h3>
                <div className='space-y-2 pl-4'>
                  {permissions.map((perm) => (
                    <div key={perm.id} className='flex items-center space-x-2'>
                      <Checkbox
                        checked={selectedPermissions.includes(perm.id)}
                        onCheckedChange={(checked) => {
                          setSelectedPermissions((prev) =>
                            checked
                              ? [...prev, perm.id]
                              : prev.filter((id) => id !== perm.id)
                          );
                        }}
                      />
                      <label className='text-sm'>
                        {perm.name}{' '}
                        <span className='text-gray-500'>({perm.code})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </ScrollArea>

        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => saveMutation.mutate(selectedPermissions)}>
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 五、前后端交互流程详解

### 5.1 完整的登录认证流程

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│  用户   │                │  前端   │                │  后端    │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │  1. 访问前端页面         │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │  2. 检查JWT cookie       │
     │                          │     (未登录)             │
     │                          │                          │
     │  3. 重定向到WPS授权      │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │  4. WPS授权成功          │                          │
     │     回调/api/auth/authorization?code=xxx            │
     ├──────────────────────────┼─────────────────────────>│
     │                          │                          │
     │                          │  5. 用code换取WPS token  │
     │                          │  6. 获取WPS用户信息      │
     │                          │  7. 匹配本地用户         │
     │                          │  8. 【新增】加载用户角色 │
     │                          │  9. 【新增】加载用户权限 │
     │                          │  10. 生成JWT(含roles/permissions)
     │                          │  11. 设置HTTP-only cookie│
     │                          │                          │
     │  12. 重定向回前端        │                          │
     │<─────────────────────────┼──────────────────────────┤
     │                          │                          │
     │                          │  13. 解析JWT cookie      │
     │                          │      提取roles/permissions
     │                          │                          │
     │  14. 显示页面            │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │                          │  15. 获取用户菜单        │
     │                          │      GET /api/rbac/menus/user
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │  16. 根据permissions过滤 │
     │                          │      返回菜单树          │
     │                          │<─────────────────────────┤
     │                          │                          │
     │  17. 渲染动态菜单        │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

### 5.2 JWT Payload结构

**登录前** (当前状态):

```json
{
  "userId": "123456",
  "username": "张三",
  "userType": "teacher",
  "roles": [], // ⚠️ 空数组
  "permissions": [], // ⚠️ 空数组
  "iat": 1234567890,
  "exp": 1237159890
}
```

**登录后** (实现RBAC后):

```json
{
  "userId": "123456",
  "username": "张三",
  "userType": "teacher",
  "userNumber": "T001",
  "collegeName": "计算机学院",
  "roles": ["teacher", "admin"], // ✅ 包含角色
  "permissions": [
    // ✅ 包含权限
    "teacher:courses:read",
    "teacher:attendance:read",
    "admin:users:read"
  ],
  "iat": 1234567890,
  "exp": 1237159890
}
```

### 5.3 前端权限检查流程

```typescript
// 1. 路由级别权限检查
export const Route = createFileRoute('/_authenticated/rbac/roles')({
  beforeLoad: createRoutePermissionCheck({
    requiredRoles: ['admin', 'super_admin'],
    requiredPermissions: ['admin:roles:read'],
    mode: 'or' // 任一条件满足即可
  }),
  component: RolesPage
});

// 2. 组件级别权限检查
<PermissionGuard requiredPermissions={['admin:roles:write']}>
  <Button onClick={handleCreate}>新建角色</Button>
</PermissionGuard>

// 3. Hook级别权限检查
const { hasPermission, hasRole } = useUser();

{hasPermission('admin:roles:delete') && (
  <Button variant="destructive">删除</Button>
)}

// 4. 菜单级别权限过滤
const filteredMenus = filterMenuItems(allMenus, user);
```

---

## 六、实施计划

### 阶段一: 数据库和基础架构 (3-4天)

**任务清单**:

- [ ] 创建RBAC数据表(5张表)
- [ ] 编写初始化数据SQL脚本
  - [ ] 插入系统角色(4个)
  - [ ] 插入系统权限(20+个)
  - [ ] 建立角色-权限关联
  - [ ] 为现有用户分配默认角色
- [ ] 实现Repository层(5个Repository)
- [ ] 实现Service层(3个Service)
- [ ] 编写单元测试

**交付物**:

- `apps/app-icalink/database/003_create_rbac_tables.sql`
- `apps/app-icalink/database/004_insert_rbac_data.sql`
- Repository实现代码
- Service实现代码
- 单元测试代码

### 阶段二: 后端API接口 (3-4天)

**任务清单**:

- [ ] 实现Controller层(4个Controller)
- [ ] 修改AuthController,在登录时加载角色和权限
- [ ] 实现权限刷新接口
- [ ] 实现权限验证装饰器(可选)
- [ ] API集成测试
- [ ] 编写API文档

**交付物**:

- Controller实现代码
- 修改后的AuthController
- API文档(Markdown格式)
- 集成测试代码

### 阶段三: 前端基础功能 (2-3天)

**任务清单**:

- [ ] 扩展用户类型定义
- [ ] 修改JWT解析逻辑
- [ ] 实现动态菜单加载
- [ ] 测试路由守卫
- [ ] 测试组件权限控制

**交付物**:

- 修改后的类型定义
- 修改后的app-sidebar组件
- 测试报告

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

**总计**: 14-19天

---

## 七、技术难点和解决方案

### 7.1 权限数据量控制

**问题**: JWT存储在cookie中,如果权限过多会导致cookie过大。

**解决方案**:

1. JWT中只存储权限code数组(字符串),不存储完整对象
2. 设置合理的权限粒度,避免过度细分
3. 如果权限超过50个,考虑只存储角色,权限实时查询

### 7.2 权限变更实时生效

**问题**: 用户权限变更后,JWT仍然有效(29天过期)。

**解决方案**:

1. 提供权限刷新API: `POST /api/auth/refresh-permissions`
2. 前端定期调用刷新接口(如每小时)
3. 敏感操作实时验证权限(调用后端API)
4. 管理员修改权限后,通知用户重新登录

### 7.3 多角色权限聚合

**问题**: 一个用户可能有多个角色,需要聚合所有权限。

**解决方案**:

```typescript
async getUserPermissions(userId: string, userType: UserType) {
  // 1. 获取用户所有角色
  const roles = await this.userRoleRepository.getRolesByUser(userId, userType);

  // 2. 获取每个角色的权限
  const permissionSets = await Promise.all(
    roles.map(role => this.rolePermissionRepository.getPermissionsByRole(role.id))
  );

  // 3. 去重合并
  const allPermissions = permissionSets.flat();
  const uniquePermissions = Array.from(
    new Map(allPermissions.map(p => [p.id, p])).values()
  );

  return { success: true, data: uniquePermissions };
}
```

### 7.4 菜单树构建

**问题**: 菜单是树形结构,需要递归构建。

**解决方案**:

```typescript
buildMenuTree(menus: Menu[]): MenuTreeNode[] {
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

## 八、测试策略

### 8.1 单元测试

**Repository层测试**:

```typescript
describe('RoleRepository', () => {
  it('should create a role', async () => {
    const role = await roleRepository.create({
      name: '测试角色',
      code: 'test_role',
      description: '测试'
    });
    expect(role.success).toBe(true);
    expect(role.data.code).toBe('test_role');
  });
});
```

**Service层测试**:

```typescript
describe('UserRoleService', () => {
  it('should aggregate permissions from multiple roles', async () => {
    const permissions = await userRoleService.getUserPermissions(
      'user123',
      'teacher'
    );
    expect(permissions.success).toBe(true);
    expect(permissions.data.length).toBeGreaterThan(0);
  });
});
```

### 8.2 集成测试

**API测试**:

```typescript
describe('Role API', () => {
  it('should require admin permission to create role', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/rbac/roles',
      headers: { Authorization: 'Bearer student_token' },
      payload: { name: '新角色', code: 'new_role' }
    });
    expect(response.statusCode).toBe(403);
  });
});
```

### 8.3 端到端测试

**前端测试**:

```typescript
describe('Role Management Page', () => {
  it('should display roles for admin user', async () => {
    // 模拟管理员登录
    await loginAsAdmin();

    // 访问角色管理页面
    await page.goto('/web/rbac/roles');

    // 验证页面显示
    expect(await page.locator('h1').textContent()).toBe('角色管理');
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0);
  });
});
```

---

## 九、API接口文档

### 9.1 角色管理接口

#### 获取角色列表

```
GET /api/rbac/roles
```

**Query参数**:

- `status`: 状态筛选(active/inactive)
- `search`: 搜索关键词

**响应**:

```json
{
  "success": true,
  "message": "获取成功",
  "data": [
    {
      "id": 1,
      "name": "管理员",
      "code": "admin",
      "description": "系统管理员",
      "is_system": true,
      "status": "active",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### 创建角色

```
POST /api/rbac/roles
```

**请求体**:

```json
{
  "name": "新角色",
  "code": "new_role",
  "description": "角色描述"
}
```

**权限要求**: `admin:roles:write`

#### 分配权限

```
POST /api/rbac/roles/:id/permissions
```

**请求体**:

```json
{
  "permissionIds": [1, 2, 3, 4]
}
```

**权限要求**: `admin:roles:assign-permissions`

### 9.2 用户角色接口

#### 获取用户菜单

```
GET /api/rbac/menus/user
```

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "工作流管理",
      "path": "/workflows",
      "icon": "Workflow",
      "children": [
        {
          "id": 2,
          "name": "工作流定义",
          "path": "/workflows/definitions"
        }
      ]
    }
  ]
}
```

---

## 十、总结

本方案提供了完整的RBAC权限管理系统实施方案,包括:

1. **数据库设计**: 5张核心表,支持灵活的角色-权限-用户关联
2. **后端实现**: 遵循Stratix框架的分层架构,清晰的接口定义
3. **前端实现**: 基于现有权限检查机制,增强JWT解析和动态菜单
4. **交互流程**: 详细的登录认证和权限加载流程
5. **实施计划**: 分5个阶段,预计14-19天完成
6. **技术方案**: 解决权限聚合、菜单树构建等关键问题

**核心优势**:

- ✅ 与现有WPS登录流程无缝集成
- ✅ 前端已有权限检查机制,只需填充数据
- ✅ 遵循Stratix框架规范,代码结构清晰
- ✅ 支持动态菜单,权限变更灵活
- ✅ 完整的测试策略,保证质量

  // GET /api/rbac/menus/user - 获取当前用户菜单(核心接口)
  @Get('/api/rbac/menus/user')
  async getUserMenus(request, reply): Promise<ApiResponse<MenuTreeNode[]>>;

  // POST /api/rbac/menus - 创建菜单
  @Post('/api/rbac/menus')
  async createMenu(request, reply): Promise<ApiResponse<Menu>>;

  // PUT /api/rbac/menus/:id - 更新菜单
  @Put('/api/rbac/menus/:id')
  async updateMenu(request, reply): Promise<ApiResponse<Menu>>;

  // DELETE /api/rbac/menus/:id - 删除菜单
  @Delete('/api/rbac/menus/:id')
  async deleteMenu(request, reply): Promise<ApiResponse<void>>;
  }

```

```
