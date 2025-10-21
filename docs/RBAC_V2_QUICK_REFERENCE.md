# RBAC V2.0 快速参考卡片

> **核心理念**: 认证与授权分离,通过独立接口按需加载权限

---

## 🎯 核心设计

```
认证层 (api-gateway)          授权层 (app-icalink)
     ↓                              ↓
WPS OAuth2.0登录      →    独立权限查询接口
生成JWT (保持不变)    →    GET /api/rbac/users/current/permissions
roles = []            →    返回 {roles, permissions, menus}
permissions = []      →    前端按需调用
```

---

## 📝 关键接口

### 权限查询接口

```
GET /api/rbac/users/current/permissions
```

**请求**: 携带JWT Cookie

**响应**:
```json
{
  "success": true,
  "data": {
    "userId": "123456",
    "userType": "teacher",
    "roles": [
      { "id": 1, "code": "teacher", "name": "教师" }
    ],
    "permissions": [
      { "id": 1, "code": "teacher:courses:read", "name": "查看课程" }
    ],
    "menus": [
      { "id": 1, "name": "工作流管理", "path": "/workflows", "children": [...] }
    ]
  }
}
```

---

## 💻 前端实现 (agendaedu-web)

### 1. 修改 useUser Hook

```typescript
// apps/agendaedu-web/src/hooks/use-user.ts
export const useUser = create<UserStore>((set, get) => ({
  user: null,
  permissionData: null,
  
  // 加载权限
  loadPermissions: async () => {
    const res = await fetch('/api/rbac/users/current/permissions');
    const result = await res.json();
    if (result.success) {
      set({ permissionData: result.data });
    }
  },
  
  // 权限检查
  hasPermission: (permission: string) => {
    const { permissionData } = get();
    return permissionData?.permissions.some(p => p.code === permission) || false;
  }
}));
```

### 2. 在路由守卫中调用

```typescript
// apps/agendaedu-web/src/routes/__root.tsx
function RootComponent() {
  const { user, permissionData, loadPermissions } = useUser();

  useEffect(() => {
    if (user && !permissionData) {
      loadPermissions(); // 登录后自动加载
    }
  }, [user, permissionData]);

  return <Outlet />;
}
```

### 3. 动态菜单

```tsx
// apps/agendaedu-web/src/components/layout/app-sidebar.tsx
export function AppSidebar() {
  const { permissionData } = useUser();
  const userMenus = permissionData?.menus || [];
  
  return (
    <Sidebar>
      {userMenus.map(group => <NavGroup {...group} />)}
    </Sidebar>
  );
}
```

### 4. 路由权限检查

```typescript
// apps/agendaedu-web/src/routes/_authenticated/rbac/roles/index.tsx
export const Route = createFileRoute('/_authenticated/rbac/roles/')({
  beforeLoad: createRoutePermissionCheck({
    requiredPermissions: ['admin:roles:read']
  }),
  component: RolesPage
});
```

---

## 🔧 后端实现 (app-icalink)

### 1. Controller

```typescript
// apps/app-icalink/src/plugins/rbac/controllers/UserPermissionController.ts
@Controller()
export default class UserPermissionController {
  @Get('/api/rbac/users/current/permissions')
  async getCurrentUserPermissions(request, reply) {
    const user = request.user; // 从JWT获取
    
    const roles = await this.userRoleService.getUserRoles(user.userId, user.userType);
    const permissions = await this.userRoleService.getUserPermissions(user.userId, user.userType);
    const menus = await this.menuService.getMenusByUser(user.userId, user.userType, permissions.data);
    
    return {
      success: true,
      data: { userId: user.userId, userType: user.userType, roles: roles.data, permissions: permissions.data, menus: menus.data }
    };
  }
}
```

### 2. Service - 权限聚合

```typescript
// apps/app-icalink/src/plugins/rbac/services/UserRoleService.ts
async getUserPermissions(userId: string, userType: UserType) {
  // 1. 获取用户所有角色
  const roles = await this.userRoleRepository.getRolesByUser(userId, userType);
  
  // 2. 获取每个角色的权限
  const permissionSets = await Promise.all(
    roles.data.map(role => this.rolePermissionRepository.getPermissionsByRole(role.id))
  );
  
  // 3. 聚合并去重
  const allPermissions = permissionSets.flatMap(result => result.data);
  const uniquePermissions = Array.from(
    new Map(allPermissions.map(p => [p.id, p])).values()
  );
  
  return { success: true, data: uniquePermissions };
}
```

### 3. Service - 菜单过滤

```typescript
// apps/app-icalink/src/plugins/rbac/services/MenuService.ts
async getMenusByUser(userId: string, userType: UserType, permissions: Permission[]) {
  // 1. 获取所有菜单
  const allMenus = await this.menuRepository.findAll();
  
  // 2. 提取权限代码
  const permissionCodes = new Set(permissions.map(p => p.code));
  
  // 3. 过滤菜单
  const filteredMenus = allMenus.data.filter(menu => 
    !menu.permission_code || permissionCodes.has(menu.permission_code)
  );
  
  // 4. 构建菜单树
  const menuTree = this.buildMenuTree(filteredMenus);
  
  return { success: true, data: menuTree };
}
```

---

## 🗄️ 数据库表

### 核心表 (5张)

1. **rbac_roles** - 角色表
2. **rbac_permissions** - 权限表
3. **rbac_role_permissions** - 角色权限关联
4. **rbac_user_roles** - 用户角色关联
5. **rbac_menus** - 菜单表

### 关键查询

```sql
-- 获取用户角色
SELECT r.* FROM rbac_roles r
JOIN rbac_user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = ? AND ur.user_type = ?;

-- 获取角色权限
SELECT p.* FROM rbac_permissions p
JOIN rbac_role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id IN (?);

-- 获取菜单
SELECT * FROM rbac_menus
WHERE is_visible = 1
ORDER BY sort_order;
```

---

## 🚀 实施步骤

### 阶段1: 数据库 (3-4天)
- [ ] 创建5张RBAC表
- [ ] 插入初始数据(角色、权限、关联)
- [ ] 为现有用户分配默认角色

### 阶段2: 后端接口 (2-3天)
- [ ] 实现Repository层
- [ ] 实现Service层(权限聚合、菜单过滤)
- [ ] 实现UserPermissionController
- [ ] API测试

### 阶段3: 前端集成 (2-3天)
- [ ] 修改useUser hook
- [ ] 在路由守卫中调用权限接口
- [ ] 修改动态菜单组件
- [ ] 测试权限控制

### 阶段4: 管理页面 (4-5天)
- [ ] 角色管理页面
- [ ] 用户角色分配页面
- [ ] 菜单管理页面

### 阶段5: 测试优化 (2-3天)
- [ ] 端到端测试
- [ ] 性能优化(Redis缓存)
- [ ] 文档完善

**总计**: 13-18天

---

## ⚡ 性能优化

### Redis缓存

```typescript
async getUserPermissions(userId: string, userType: UserType) {
  const cacheKey = `user:permissions:${userType}:${userId}`;
  
  // 1. 尝试从缓存获取
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // 2. 从数据库查询
  const permissions = await this.queryFromDB(userId, userType);
  
  // 3. 写入缓存(5分钟)
  await redis.setex(cacheKey, 300, JSON.stringify(permissions));
  
  return permissions;
}
```

### 前端定时刷新

```typescript
useEffect(() => {
  if (!permissionData) return;
  
  // 每30分钟刷新一次
  const interval = setInterval(() => {
    loadPermissions();
  }, 30 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [permissionData]);
```

---

## 🔍 常见问题

### Q1: 权限更新后不生效?

**解决**: 调用 `loadPermissions()` 刷新权限,或提供刷新按钮。

### Q2: 页面刷新后权限丢失?

**解决**: 在 `__root.tsx` 的 `useEffect` 中检测并重新加载。

### Q3: agendaedu-app需要权限吗?

**解决**: 不需要,直接使用JWT中的 `userType` 做简单判断。

### Q4: 如何添加新权限?

```sql
-- 1. 添加权限
INSERT INTO rbac_permissions (name, code, resource, action)
VALUES ('导出报表', 'teacher:reports:export', 'reports', 'export');

-- 2. 分配给角色
INSERT INTO rbac_role_permissions (role_id, permission_id)
VALUES (3, LAST_INSERT_ID());
```

---

## 📊 与V1方案对比

| 对比项 | V1 (修改JWT) | V2 (独立接口) ⭐ |
|--------|-------------|----------------|
| 认证流程 | 需要修改 | ✅ 保持不变 |
| JWT大小 | 可能过大 | ✅ 不受影响 |
| 权限更新 | 需重新登录 | ✅ 调用接口刷新 |
| 项目兼容 | 影响所有项目 | ✅ 按需使用 |
| 实施风险 | 较高 | ✅ 较低 |

**推荐**: 使用V2方案

---

## 📚 相关文档

- [完整实施方案](./RBAC_IMPLEMENTATION_PLAN_V2.md)
- [V1 vs V2 对比](./RBAC_V1_VS_V2_COMPARISON.md)
- [原方案文档](./RBAC_IMPLEMENTATION_PLAN.md)

---

## 🎓 核心要点

1. ✅ **不修改认证流程** - api-gateway保持不变
2. ✅ **JWT保持简洁** - roles和permissions为空数组
3. ✅ **独立权限接口** - GET /api/rbac/users/current/permissions
4. ✅ **前端按需加载** - agendaedu-web调用,agendaedu-app不调用
5. ✅ **支持刷新** - 手动刷新或定时刷新
6. ✅ **Redis缓存** - 提升性能,减少数据库压力

---

**开始实施**: 从阶段1(数据库)开始,逐步完成5个阶段!

