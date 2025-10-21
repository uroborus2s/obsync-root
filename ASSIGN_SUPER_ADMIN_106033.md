# 为用户 106033 分配超级管理员权限 - 快速指南

## 🎯 目标

为用户 **106033** 分配超级管理员角色，使其能够访问所有 RBAC 权限管理页面。

## ⚡ 一键执行

```bash
# 在项目根目录执行
mysql -h localhost -P 3307 -u root -p icasync < apps/app-icalink/database/005_assign_super_admin_to_106033.sql

# 输入密码：lSqMlyo&c*230caLre
```

## ✅ 执行成功标志

执行成功后，你将看到类似以下输出：

```
========================================
✅ 用户 106033 已成功分配超级管理员角色！
========================================
用户ID: 106033
用户类型: teacher (教师)
角色: 超级管理员 (super_admin)
权限: 拥有所有系统权限 (51个)
========================================
可访问的 RBAC 管理页面:
  - /rbac/users (用户管理)
  - /rbac/roles (角色管理)
  - /rbac/permissions (权限管理)
  - /rbac/menus (菜单管理)
========================================
```

## 🔍 验证分配结果

### 快速验证

```sql
-- 查看用户角色
SELECT 
    ur.user_id,
    r.name AS role_name,
    r.code AS role_code
FROM rbac_user_roles ur
JOIN rbac_roles r ON ur.role_id = r.id
WHERE ur.user_id = '106033';
```

**预期结果**：
```
user_id | role_name    | role_code
106033  | 超级管理员   | super_admin
```

### 完整验证

```sql
-- 查看用户权限数量
SELECT COUNT(DISTINCT p.id) AS permission_count
FROM rbac_user_roles ur
JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
JOIN rbac_permissions p ON rp.permission_id = p.id
WHERE ur.user_id = '106033';
```

**预期结果**：`51` 个权限

## 🌐 可访问的页面

分配成功后，用户 106033 可以访问：

### RBAC 管理页面（主要）
- ✅ http://localhost:5173/web/rbac/permissions - 权限管理
- ✅ http://localhost:5173/web/rbac/roles - 角色管理
- ✅ http://localhost:5173/web/rbac/menus - 菜单管理
- ✅ http://localhost:5173/web/rbac/users - 人员管理

### 其他业务页面（全部）
- ✅ 工作流管理
- ✅ 考勤管理
- ✅ 教学评估
- ✅ 学科管理
- ✅ 所有其他系统功能

## 📊 权限详情

用户 106033 将拥有：

| 权限类别 | 权限数量 | 说明 |
|---------|---------|------|
| 系统管理 (admin:*) | 13 | 用户、角色、权限、菜单管理 |
| 教师功能 (teacher:*) | 10 | 课程、考勤、请假、工作流 |
| 评估管理 (assessment:*) | 11 | 教学评估、质量监控、数据分析 |
| 学科管理 (subject:*) | 13 | 学科、课程规划、教学资源、教师管理 |
| 学生功能 (student:*) | 4 | 课程查看、签到、请假 |
| **总计** | **51** | **所有系统权限** |

## 🔧 常见问题

### Q1: 执行脚本时提示 "Duplicate entry"

**A**: 这是正常的，说明用户已经有超级管理员角色了。脚本使用了 `WHERE NOT EXISTS` 防止重复插入。

### Q2: 如何撤销超级管理员权限？

**A**: 执行以下 SQL：
```sql
DELETE FROM rbac_user_roles
WHERE user_id = '106033'
  AND user_type = 'teacher'
  AND role_id = 1;
```

### Q3: 前端页面看不到 RBAC 管理菜单？

**A**: 检查以下几点：
1. 确认已使用用户 106033 登录
2. 确认后端服务正常运行
3. 检查浏览器控制台是否有错误
4. 测试 API：`curl http://localhost:3000/api/icalink/v1/rbac/user-permissions/106033?userType=teacher`

### Q4: 数据库连接失败？

**A**: 检查：
- MySQL 服务是否启动
- 端口 3307 是否正确
- 用户名密码是否正确
- 数据库 icasync 是否存在

## 📝 前置条件

在执行此脚本前，请确保：

- ✅ 已执行 `003_create_rbac_tables.sql`（创建表结构）
- ✅ 已执行 `004_insert_rbac_data.sql`（插入初始数据）
- ✅ MySQL 服务正常运行
- ✅ 数据库 icasync 存在

## 🔄 重复执行

此脚本可以安全地重复执行，不会产生重复数据。使用了 `WHERE NOT EXISTS` 条件来防止重复插入。

## 📚 相关文档

- [ASSIGN_SUPER_ADMIN.md](./apps/app-icalink/database/ASSIGN_SUPER_ADMIN.md) - 详细说明文档
- [README_RBAC.md](./apps/app-icalink/database/README_RBAC.md) - RBAC 系统完整文档
- [003_create_rbac_tables.sql](./apps/app-icalink/database/003_create_rbac_tables.sql) - 表结构脚本
- [004_insert_rbac_data.sql](./apps/app-icalink/database/004_insert_rbac_data.sql) - 初始数据脚本

## 🎓 下一步

1. ✅ 执行 SQL 脚本
2. ✅ 验证分配结果
3. ✅ 使用用户 106033 登录系统
4. ✅ 访问 RBAC 管理页面
5. 🔄 开始管理系统权限

---

**完成！** 🎉 用户 106033 现在拥有超级管理员权限！

