# RBAC方案对比: V1 vs V2

## 核心差异总结

| 对比维度 | V1方案 (修改JWT) | V2方案 (独立接口) ⭐推荐 |
|---------|-----------------|---------------------|
| **认证流程** | 需要修改AuthController | ✅ 保持不变 |
| **JWT结构** | 包含roles和permissions数组 | ✅ 保持为空数组 |
| **权限加载时机** | 登录时自动加载到JWT | ✅ 前端按需调用接口 |
| **Cookie大小** | 可能过大(权限多时) | ✅ 不受影响 |
| **权限更新** | 需要重新登录(JWT有效期29天) | ✅ 调用接口即可刷新 |
| **项目兼容性** | 影响所有使用JWT的项目 | ✅ 只影响需要的项目 |
| **实施风险** | 较高(修改核心认证) | ✅ 较低(新增独立模块) |
| **灵活性** | 权限固化在JWT中 | ✅ 支持动态加载和缓存 |
| **性能** | 登录时一次性加载 | 需要额外API调用(可缓存) |
| **实施复杂度** | 中等 | 中等 |

---

## 详细对比

### 1. 认证流程

#### V1方案: 修改现有认证流程

```typescript
// 需要修改 apps/api-gateway/src/controllers/AuthController.ts
async handleAuthorization(request, reply) {
  // ... WPS认证流程 ...
  
  // 【新增】加载用户角色和权限
  const roles = await userRoleService.getUserRoles(userId, userType);
  const permissions = await userRoleService.getUserPermissions(userId, userType);
  
  // 生成包含权限的JWT
  const jwtPayload = {
    ...userInfo,
    roles: roles.map(r => r.code),
    permissions: permissions.map(p => p.code)
  };
  
  const jwtToken = jwtService.generateToken(jwtPayload);
  // ...
}
```

**风险**:
- ❌ 修改核心认证逻辑,可能影响其他项目
- ❌ 需要在api-gateway中引入RBAC依赖
- ❌ 登录流程变慢(需要查询权限)
- ❌ 如果权限查询失败,可能导致登录失败

#### V2方案: 保持认证流程不变

```typescript
// apps/api-gateway/src/controllers/AuthController.ts
// 完全不修改,保持原样

// 新增独立的权限查询接口
// apps/app-icalink/src/plugins/rbac/controllers/UserPermissionController.ts
@Get('/api/rbac/users/current/permissions')
async getCurrentUserPermissions(request, reply) {
  const user = request.user; // 从JWT获取
  const roles = await this.userRoleService.getUserRoles(user.userId, user.userType);
  const permissions = await this.userRoleService.getUserPermissions(user.userId, user.userType);
  const menus = await this.menuService.getMenusByUser(user.userId, user.userType, permissions);
  
  return { success: true, data: { roles, permissions, menus } };
}
```

**优势**:
- ✅ 认证流程稳定,不影响其他项目
- ✅ 权限查询失败不影响登录
- ✅ 职责分离,认证和授权解耦
- ✅ 易于测试和维护

---

### 2. JWT Payload结构

#### V1方案: JWT包含权限数据

```json
{
  "userId": "123456",
  "username": "张三",
  "userType": "teacher",
  "roles": ["teacher", "admin"],  // 包含角色
  "permissions": [                 // 包含权限
    "teacher:courses:read",
    "teacher:attendance:read",
    "admin:users:read",
    "admin:users:write",
    "admin:roles:read",
    // ... 可能有20-50个权限
  ],
  "iat": 1234567890,
  "exp": 1237159890
}
```

**问题**:
- ❌ Cookie可能过大(HTTP header限制通常8KB)
- ❌ 权限多时可能超出限制
- ❌ 权限固化,更新需要重新登录

#### V2方案: JWT保持简洁

```json
{
  "userId": "123456",
  "username": "张三",
  "userType": "teacher",
  "roles": [],        // 保持为空
  "permissions": [],  // 保持为空
  "iat": 1234567890,
  "exp": 1237159890
}
```

**优势**:
- ✅ Cookie大小可控
- ✅ JWT结构稳定
- ✅ 权限数据通过接口动态获取

---

### 3. 前端实现差异

#### V1方案: 从JWT直接获取权限

```typescript
// apps/agendaedu-web/src/hooks/use-user.ts
export const useUser = create<UserStore>((set) => ({
  user: null,
  
  // 从JWT解析权限
  loadUser: () => {
    const jwt = parseJWT(getCookie('wps_jwt_token'));
    set({
      user: {
        ...jwt,
        roles: jwt.roles,        // 直接从JWT获取
        permissions: jwt.permissions  // 直接从JWT获取
      }
    });
  },
  
  hasPermission: (permission: string) => {
    const { user } = get();
    return user?.permissions.includes(permission) || false;
  }
}));
```

**问题**:
- ❌ 权限更新需要重新登录
- ❌ 无法手动刷新权限
- ❌ JWT过期前权限一直不变

#### V2方案: 通过接口获取权限

```typescript
// apps/agendaedu-web/src/hooks/use-user.ts
export const useUser = create<UserStore>((set, get) => ({
  user: null,
  permissionData: null,
  
  // 调用接口加载权限
  loadPermissions: async () => {
    const response = await fetch('/api/rbac/users/current/permissions');
    const result = await response.json();
    
    if (result.success) {
      set({
        permissionData: {
          roles: result.data.roles,
          permissions: result.data.permissions,
          menus: result.data.menus,
          loadedAt: Date.now()
        }
      });
    }
  },
  
  // 手动刷新权限
  refreshPermissions: async () => {
    await get().loadPermissions();
  },
  
  hasPermission: (permission: string) => {
    const { permissionData } = get();
    return permissionData?.permissions.some(p => p.code === permission) || false;
  }
}));
```

**优势**:
- ✅ 支持手动刷新权限
- ✅ 支持定时自动刷新
- ✅ 权限数据更灵活
- ✅ 可以控制缓存策略

---

### 4. 不同项目的适配

#### V1方案: 所有项目都受影响

```typescript
// agendaedu-web: 使用JWT中的权限
const { user } = useUser();
console.log(user.permissions); // 从JWT获取

// agendaedu-app: 也会获取到权限数据(但不需要)
const { user } = useUser();
console.log(user.permissions); // 也有数据,但用不上
```

**问题**:
- ❌ agendaedu-app不需要权限,但JWT中也包含
- ❌ 增加了不必要的数据传输
- ❌ 所有项目都需要适配新的JWT结构

#### V2方案: 按需使用

```typescript
// agendaedu-web: 主动调用权限接口
useEffect(() => {
  if (user && !permissionData) {
    loadPermissions(); // 调用接口
  }
}, [user, permissionData]);

// agendaedu-app: 不调用权限接口
const { user } = useUser();
// 直接使用userType做简单判断
if (user.userType === 'student') {
  // 显示学生功能
}
```

**优势**:
- ✅ agendaedu-web按需加载权限
- ✅ agendaedu-app不受影响
- ✅ 各项目独立演进

---

### 5. 权限更新场景

#### 场景: 管理员修改了某个用户的权限

**V1方案处理**:
1. 管理员在后台修改权限
2. 数据库更新成功
3. 用户的JWT仍然有效(29天过期)
4. 用户看到的权限仍然是旧的
5. **必须重新登录才能生效**

**解决方案**:
- 提供"强制用户重新登录"功能
- 或者缩短JWT有效期(影响用户体验)

**V2方案处理**:
1. 管理员在后台修改权限
2. 数据库更新成功
3. 用户点击"刷新权限"按钮
4. 调用 `GET /api/rbac/users/current/permissions`
5. **立即获取最新权限**

**解决方案**:
- 提供手动刷新按钮
- 定时自动刷新(如每30分钟)
- WebSocket实时通知(可选)

---

### 6. 性能对比

#### V1方案: 登录时一次性加载

**优势**:
- ✅ 登录后不需要额外请求
- ✅ 权限检查速度快(直接从内存读取)

**劣势**:
- ❌ 登录流程变慢(需要查询权限)
- ❌ 每次登录都要查询权限(即使权限没变)
- ❌ 权限多时JWT解析变慢

#### V2方案: 按需加载+缓存

**优势**:
- ✅ 登录流程不受影响
- ✅ 支持Redis缓存(5-10分钟)
- ✅ 可以控制刷新频率

**劣势**:
- ❌ 需要额外的API调用
- ❌ 首次加载权限有延迟

**性能优化**:
```typescript
// 后端Redis缓存
async getUserPermissions(userId: string, userType: UserType) {
  const cacheKey = `user:permissions:${userType}:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached); // 命中缓存,极快
  }
  
  const permissions = await this.queryFromDB(userId, userType);
  await redis.setex(cacheKey, 300, JSON.stringify(permissions)); // 缓存5分钟
  
  return permissions;
}
```

---

### 7. 实施复杂度

#### V1方案

**需要修改的文件**:
1. `apps/api-gateway/src/controllers/AuthController.ts` - 修改登录逻辑
2. `apps/api-gateway/package.json` - 添加RBAC依赖
3. `apps/app-icalink` - 实现RBAC模块
4. `apps/agendaedu-web` - 前端适配
5. 所有使用JWT的项目 - 适配新结构

**风险点**:
- ❌ 修改核心认证逻辑
- ❌ 可能影响现有项目
- ❌ 回滚困难

#### V2方案

**需要修改的文件**:
1. `apps/app-icalink` - 实现RBAC模块(新增)
2. `apps/agendaedu-web/src/hooks/use-user.ts` - 添加loadPermissions方法
3. `apps/agendaedu-web/src/routes/__root.tsx` - 调用权限接口

**风险点**:
- ✅ 不修改核心认证逻辑
- ✅ 不影响现有项目
- ✅ 易于回滚(删除新增代码即可)

---

## 推荐方案: V2 (独立接口)

### 推荐理由

1. **风险更低**: 不修改核心认证流程,降低出错风险
2. **更加灵活**: 支持按需加载、手动刷新、定时刷新
3. **向后兼容**: 不影响agendaedu-app等现有项目
4. **易于维护**: 认证和授权逻辑分离,职责清晰
5. **性能可控**: 支持Redis缓存,可以优化性能
6. **易于扩展**: 未来可以添加更多权限相关功能

### 适用场景

✅ **推荐使用V2方案**,如果:
- 有多个项目共享同一个认证系统
- 不同项目的权限需求差异大
- 需要灵活的权限更新机制
- 希望降低实施风险

❌ **不推荐V1方案**,因为:
- 修改核心认证流程风险高
- JWT可能过大
- 权限更新不灵活
- 影响所有项目

---

## 迁移路径

如果未来需要从V2迁移到V1(不推荐):

1. 实现V2方案,验证RBAC功能正常
2. 在api-gateway中添加权限加载逻辑
3. 修改JWT生成,包含权限数据
4. 前端逐步切换到从JWT读取权限
5. 保留权限接口作为备用

如果从V1迁移到V2(推荐):

1. 保持JWT中的权限数据
2. 新增独立的权限查询接口
3. 前端优先使用接口获取权限
4. 验证功能正常后,移除JWT中的权限数据

---

## 总结

| 方案 | 适用场景 | 推荐指数 |
|------|---------|---------|
| V1 (修改JWT) | 单一项目,权限数量少,不需要频繁更新 | ⭐⭐ |
| V2 (独立接口) | 多项目,权限灵活,需要动态更新 | ⭐⭐⭐⭐⭐ |

**最终推荐**: 使用 **V2方案 (独立接口)** 实施RBAC系统。

