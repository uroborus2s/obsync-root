# RBAC权限管理系统 - 快速开始指南

## 📚 文档导航

- **[完整实施方案](./RBAC_IMPLEMENTATION_PLAN.md)** - 详细的技术方案和实现细节
- **[方案总结](./RBAC_SUMMARY.md)** - 核心要点和快速参考
- **本文档** - 快速开始和常见问题

---

## 🎯 核心概念

### 什么是RBAC?

RBAC (Role-Based Access Control) 是一种基于角色的访问控制模型:

```
用户 → 角色 → 权限 → 资源
```

**示例**:
- 用户"张三"拥有"教师"和"管理员"两个角色
- "教师"角色拥有"查看课程"、"查看考勤"等权限
- "管理员"角色拥有"用户管理"、"角色管理"等权限
- 张三可以访问所有这些权限对应的功能

### 为什么需要RBAC?

**当前问题**:
- ❌ JWT中的roles和permissions是空数组
- ❌ 前端权限检查机制无法生效
- ❌ 所有用户看到相同的菜单
- ❌ 无法区分不同用户的操作权限

**实施后**:
- ✅ JWT包含完整的角色和权限信息
- ✅ 前端权限检查正常工作
- ✅ 每个用户看到个性化的菜单
- ✅ 精细化的权限控制

---

## 🚀 快速开始

### 前置条件

1. **环境要求**:
   - Node.js 18+
   - MySQL 8.0+
   - pnpm 8+

2. **项目结构**:
   ```
   obsync-root/
   ├── apps/
   │   ├── agendaedu-web/    # 前端项目
   │   ├── api-gateway/       # 网关服务
   │   └── app-icalink/       # 后端API服务
   └── packages/
       └── utils/             # 工具包
   ```

### 第一步: 创建数据库表

```bash
# 进入app-icalink目录
cd apps/app-icalink

# 执行SQL脚本
mysql -u root -p icasync < database/003_create_rbac_tables.sql
mysql -u root -p icasync < database/004_insert_rbac_data.sql
```

**验证**:
```sql
-- 检查表是否创建成功
SHOW TABLES LIKE 'rbac_%';

-- 应该看到5张表:
-- rbac_roles
-- rbac_permissions
-- rbac_role_permissions
-- rbac_user_roles
-- rbac_menus

-- 检查初始数据
SELECT * FROM rbac_roles;
SELECT * FROM rbac_permissions;
```

### 第二步: 实现后端代码

#### 2.1 创建Repository层

```bash
# 创建目录结构
mkdir -p apps/app-icalink/src/plugins/rbac/repositories/interfaces
mkdir -p apps/app-icalink/src/plugins/rbac/repositories/implementations
```

**创建接口** (`repositories/interfaces/IRoleRepository.ts`):
```typescript
import { ServiceResult } from '@stratix/core';

export interface IRoleRepository {
  findAll(): Promise<ServiceResult<Role[]>>;
  findById(id: number): Promise<ServiceResult<Role | null>>;
  create(role: CreateRoleDto): Promise<ServiceResult<Role>>;
  // ... 其他方法
}
```

**创建实现** (`repositories/implementations/RoleRepository.ts`):
```typescript
import { BaseRepository } from '@stratix/database';

export default class RoleRepository extends BaseRepository<Role> implements IRoleRepository {
  constructor(/* 依赖注入 */) {
    super('rbac_roles');
  }
  
  async findAll(): Promise<ServiceResult<Role[]>> {
    // 实现逻辑
  }
}
```

#### 2.2 创建Service层

**创建接口** (`services/interfaces/IRoleService.ts`):
```typescript
export interface IRoleService {
  getRoles(): Promise<ServiceResult<Role[]>>;
  createRole(dto: CreateRoleDto): Promise<ServiceResult<Role>>;
  assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<ServiceResult<void>>;
}
```

**创建实现** (`services/implementations/RoleService.ts`):
```typescript
export default class RoleService implements IRoleService {
  constructor(
    private roleRepository: IRoleRepository,
    private rolePermissionRepository: IRolePermissionRepository
  ) {}
  
  async getRoles(): Promise<ServiceResult<Role[]>> {
    return this.roleRepository.findAll();
  }
}
```

#### 2.3 创建Controller层

**创建控制器** (`controllers/RoleController.ts`):
```typescript
import { Controller, Get, Post } from '@stratix/core';

@Controller()
export default class RoleController {
  constructor(private roleService: IRoleService) {}
  
  @Get('/api/rbac/roles')
  async getRoles(request, reply) {
    const result = await this.roleService.getRoles();
    if (result.success) {
      return { success: true, data: result.data };
    }
    reply.status(500);
    return { success: false, message: result.error?.message };
  }
}
```

#### 2.4 创建插件入口

**创建插件** (`plugins/rbac/index.ts`):
```typescript
import { withRegisterAutoDI } from '@stratix/core';

export default withRegisterAutoDI(
  async (app, options) => {
    app.log.info('RBAC plugin loaded');
  },
  {
    name: 'rbac',
    autoDiscovery: {
      repositories: {
        pattern: 'repositories/implementations/**/*.ts',
        lifetime: 'SCOPED'
      },
      services: {
        pattern: 'services/implementations/**/*.ts',
        lifetime: 'SCOPED'
      },
      controllers: {
        pattern: 'controllers/**/*.ts',
        lifetime: 'SCOPED'
      }
    }
  }
);
```

### 第三步: 修改AuthController

**修改** `apps/api-gateway/src/controllers/AuthController.ts`:

```typescript
// 在构造函数中注入UserRoleService
constructor(
  // ... 现有依赖
  private userRoleService: IUserRoleService  // 新增
) {}

// 修改handleAuthorization方法
async handleAuthorization(request, reply) {
  // ... WPS认证流程 ...
  
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
  
  // 生成增强的JWT payload
  const jwtPayload = {
    ...this.createBasicJWTPayload(userInfo),
    roles: rolesResult.data?.map(r => r.code) || [],
    permissions: permissionsResult.data?.map(p => p.code) || []
  };
  
  // ... 生成JWT并设置cookie ...
}
```

### 第四步: 前端集成

#### 4.1 扩展类型定义

**修改** `apps/agendaedu-web/src/types/user.types.ts`:

```typescript
export type UserPermission = 
  | 'admin:users:read'
  | 'admin:users:write'
  | 'teacher:courses:read'
  | 'student:attendance:checkin'
  // ... 添加所有权限类型

export type UserRole = 
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'student';
```

#### 4.2 实现动态菜单

**修改** `apps/agendaedu-web/src/components/layout/app-sidebar.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';

export function AppSidebar() {
  const { user } = useUser();
  
  const { data: userMenus, isLoading } = useQuery({
    queryKey: ['user-menus'],
    queryFn: async () => {
      const res = await fetch('/api/rbac/menus/user');
      const result = await res.json();
      return result.data;
    },
    enabled: !!user
  });
  
  return (
    <Sidebar>
      <SidebarContent>
        {isLoading ? (
          <div>加载中...</div>
        ) : (
          userMenus?.map(group => <NavGroup key={group.id} {...group} />)
        )}
      </SidebarContent>
    </Sidebar>
  );
}
```

#### 4.3 创建角色管理页面

**创建** `apps/agendaedu-web/src/routes/_authenticated/rbac/roles/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { createRoutePermissionCheck } from '@/utils/route-permission';
import RolesPage from '@/features/rbac/roles';

export const Route = createFileRoute('/_authenticated/rbac/roles/')({
  beforeLoad: createRoutePermissionCheck({
    requiredPermissions: ['admin:roles:read'],
  }),
  component: RolesPage,
});
```

---

## 🧪 测试验证

### 1. 测试数据库

```sql
-- 创建测试用户角色
INSERT INTO rbac_user_roles (user_id, user_type, role_id, created_by)
VALUES ('your_user_id', 'teacher', 1, 'system');

-- 验证用户角色
SELECT u.user_id, u.user_type, r.name, r.code
FROM rbac_user_roles u
JOIN rbac_roles r ON u.role_id = r.id
WHERE u.user_id = 'your_user_id';

-- 验证用户权限(聚合查询)
SELECT DISTINCT p.code, p.name
FROM rbac_user_roles ur
JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
JOIN rbac_permissions p ON rp.permission_id = p.id
WHERE ur.user_id = 'your_user_id' AND ur.user_type = 'teacher';
```

### 2. 测试后端API

```bash
# 获取角色列表
curl http://localhost:8090/api/rbac/roles

# 获取权限列表
curl http://localhost:8090/api/rbac/permissions

# 获取用户菜单(需要登录)
curl -b cookies.txt http://localhost:8090/api/rbac/menus/user
```

### 3. 测试前端权限

```typescript
// 在浏览器控制台测试
const { user } = useUser();
console.log('用户角色:', user.roles);
console.log('用户权限:', user.permissions);
console.log('是否有管理员权限:', user.hasPermission('admin:users:read'));
```

---

## 📝 常见问题

### Q1: JWT中的roles和permissions为空怎么办?

**原因**: 用户还没有分配角色。

**解决**:
```sql
-- 为用户分配默认角色
INSERT INTO rbac_user_roles (user_id, user_type, role_id, created_by)
SELECT id, 'teacher', 3, 'system'
FROM out_jsxx
WHERE id NOT IN (SELECT user_id FROM rbac_user_roles WHERE user_type = 'teacher');

INSERT INTO rbac_user_roles (user_id, user_type, role_id, created_by)
SELECT id, 'student', 4, 'system'
FROM out_xsxx
WHERE id NOT IN (SELECT user_id FROM rbac_user_roles WHERE user_type = 'student');
```

### Q2: 修改权限后不生效?

**原因**: JWT有效期29天,权限信息缓存在JWT中。

**解决**:
1. 调用权限刷新API: `POST /api/auth/refresh-permissions`
2. 或者重新登录

### Q3: 菜单没有显示?

**检查清单**:
1. 菜单是否关联了权限代码?
2. 用户是否有对应的权限?
3. 菜单的`is_visible`字段是否为1?
4. 检查浏览器控制台是否有错误

### Q4: 如何添加新权限?

```sql
-- 1. 添加权限
INSERT INTO rbac_permissions (name, code, resource, action, description)
VALUES ('导出报表', 'teacher:reports:export', 'reports', 'export', '导出考勤报表');

-- 2. 分配给角色
INSERT INTO rbac_role_permissions (role_id, permission_id, created_by)
VALUES (3, LAST_INSERT_ID(), 'admin');

-- 3. 用户重新登录或刷新权限
```

---

## 🔗 相关资源

- [Stratix框架文档](../packages/core/README.md)
- [Fastify文档](https://www.fastify.io/)
- [TanStack Router文档](https://tanstack.com/router)
- [shadcn/ui组件库](https://ui.shadcn.com/)

---

## 📞 获取帮助

如有问题,请:
1. 查看[完整实施方案](./RBAC_IMPLEMENTATION_PLAN.md)
2. 查看[方案总结](./RBAC_SUMMARY.md)
3. 联系开发团队

---

**下一步**: 开始实施! 按照[实施计划](./RBAC_SUMMARY.md#实施计划)逐步完成开发。

