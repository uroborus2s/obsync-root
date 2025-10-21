# 为用户 106033 分配超级管理员权限

## 📋 概述

本文档说明如何为用户 **106033** 分配超级管理员角色，使其能够访问所有 RBAC 权限管理页面。

## ⚡ 快速执行

### 方式一：使用 MySQL 命令行（推荐）

```bash
# 在项目根目录执行
mysql -h localhost -P 3307 -u root -p icasync < apps/app-icalink/database/005_assign_super_admin_to_106033.sql

# 输入密码：lSqMlyo&c*230caLre
```

### 方式二：使用 MySQL 客户端

1. 打开 MySQL 客户端或 Navicat 等工具
2. 连接到数据库：
   - Host: localhost
   - Port: 3307
   - User: root
   - Password: lSqMlyo&c*230caLre
   - Database: icasync
3. 执行以下 SQL：

```sql
-- 为用户 106033 分配超级管理员角色
INSERT INTO `rbac_user_roles` (`user_id`, `user_type`, `role_id`, `created_by`)
SELECT '106033', 'teacher', 1, 'system'
WHERE NOT EXISTS (
    SELECT 1 FROM `rbac_user_roles`
    WHERE `user_id` = '106033'
      AND `user_type` = 'teacher'
      AND `role_id` = 1
);
```

## ✅ 验证分配结果

### 1. 查看用户角色

```sql
SELECT 
    ur.user_id AS '用户ID',
    ur.user_type AS '用户类型',
    r.name AS '角色名称',
    r.code AS '角色代码',
    r.status AS '角色状态'
FROM rbac_user_roles ur
JOIN rbac_roles r ON ur.role_id = r.id
WHERE ur.user_id = '106033';
```

**预期结果**：
```
用户ID  | 用户类型 | 角色名称     | 角色代码     | 角色状态
106033  | teacher  | 超级管理员   | super_admin  | active
```

### 2. 查看用户权限数量

```sql
SELECT COUNT(DISTINCT p.id) AS '权限数量'
FROM rbac_user_roles ur
JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
JOIN rbac_permissions p ON rp.permission_id = p.id
WHERE ur.user_id = '106033';
```

**预期结果**：
```
权限数量
51
```

### 3. 查看可访问的 RBAC 管理菜单

```sql
SELECT 
    m.name AS '菜单名称',
    m.path AS '路由路径'
FROM rbac_menus m
WHERE m.path IN ('/rbac/users', '/rbac/roles', '/rbac/permissions', '/rbac/menus')
  AND (m.permission_code IS NULL OR m.permission_code IN (
      SELECT p.code
      FROM rbac_user_roles ur
      JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
      JOIN rbac_permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = '106033'
  ));
```

**预期结果**：
```
菜单名称   | 路由路径
用户管理   | /rbac/users
角色管理   | /rbac/roles
权限管理   | /rbac/permissions
菜单管理   | /rbac/menus
```

## 🎯 分配后的权限

用户 **106033** 将拥有以下权限：

### 系统管理权限（admin:*）
- ✅ 查看/编辑/删除用户
- ✅ 分配用户角色
- ✅ 查看/编辑/删除角色
- ✅ 分配角色权限
- ✅ 查看/编辑权限
- ✅ 查看/编辑/删除菜单

### 教师权限（teacher:*）
- ✅ 课程管理（查看/编辑/删除）
- ✅ 考勤管理（查看/发起/导出）
- ✅ 请假审批（查看/审批）
- ✅ 工作流管理（查看/编辑）

### 评估管理权限（assessment:*）
- ✅ 教学评估（查看/创建/导出）
- ✅ 质量监控（查看/生成报告）
- ✅ 数据分析（查看/导出统计）

### 学科管理权限（subject:*）
- ✅ 学科管理（查看/编辑/删除）
- ✅ 课程规划（查看/编辑）
- ✅ 教学资源（查看/管理）
- ✅ 教师管理（查看/分配）

### 学生权限（student:*）
- ✅ 查看课程
- ✅ 签到/查看考勤
- ✅ 提交/查看请假

**总计：51 个权限**

## 🌐 可访问的页面

分配超级管理员角色后，用户 106033 可以访问：

### RBAC 管理页面
1. **用户管理**: http://localhost:5173/web/rbac/users
2. **角色管理**: http://localhost:5173/web/rbac/roles
3. **权限管理**: http://localhost:5173/web/rbac/permissions
4. **菜单管理**: http://localhost:5173/web/rbac/menus

### 业务功能页面
1. **工作流管理**: /workflows/definitions, /workflows/instances
2. **考勤管理**: /attendance/checkin, /attendance/records, /attendance/leave
3. **教学评估**: /assessment/tasks, /assessment/quality, /assessment/statistics
4. **学科管理**: /subject/subjects, /subject/planning, /subject/resources, /subject/teachers

## 🔧 撤销超级管理员权限

如果需要撤销用户 106033 的超级管理员权限：

```sql
-- 删除用户的超级管理员角色
DELETE FROM rbac_user_roles
WHERE user_id = '106033'
  AND user_type = 'teacher'
  AND role_id = 1;
```

## 📊 数据库表说明

### rbac_roles（角色表）
- ID=1: 超级管理员（super_admin）
- ID=2: 管理员（admin）
- ID=3: 任课教师（teacher）
- ID=4: 评估管理员（assessment_admin）
- ID=5: 学科管理员（subject_admin）
- ID=6: 学生（student）

### rbac_permissions（权限表）
- 共 51 个系统权限
- 按资源分组：admin, teacher, assessment, subject, student

### rbac_user_roles（用户角色关联表）
- 记录用户和角色的多对多关系
- 支持 student 和 teacher 两种用户类型

### rbac_role_permissions（角色权限关联表）
- 记录角色和权限的多对多关系
- 超级管理员拥有所有 51 个权限

## ⚠️ 注意事项

1. **幂等性**：SQL 脚本可以重复执行，不会产生重复数据
2. **用户类型**：用户 106033 的类型为 `teacher`（教师）
3. **角色 ID**：超级管理员角色的 ID 固定为 `1`
4. **系统角色**：超级管理员是系统角色（is_system=1），不能通过界面删除
5. **权限继承**：用户通过角色获得权限，不直接分配权限给用户

## 🐛 故障排除

### 问题1：执行 SQL 失败

**错误**：`ERROR 1062: Duplicate entry`

**原因**：用户已经分配了超级管理员角色

**解决**：这是正常的，说明用户已经有超级管理员权限了

### 问题2：验证查询返回空结果

**原因**：
1. 用户 ID 不正确
2. 数据库表未正确初始化
3. 角色数据缺失

**解决**：
```sql
-- 检查角色表
SELECT * FROM rbac_roles WHERE id = 1;

-- 检查用户角色表
SELECT * FROM rbac_user_roles WHERE user_id = '106033';

-- 检查权限数据
SELECT COUNT(*) FROM rbac_permissions;
```

### 问题3：前端页面无法访问

**原因**：
1. 前端权限验证逻辑未实现
2. 后端 API 未正确返回用户权限
3. 菜单数据缺失

**解决**：
```bash
# 测试后端 API
curl http://localhost:3000/api/icalink/v1/rbac/user-permissions/106033?userType=teacher

# 检查菜单数据
mysql -h localhost -P 3307 -u root -p icasync -e "SELECT * FROM rbac_menus WHERE path LIKE '/rbac%';"
```

## 📚 相关文档

- [003_create_rbac_tables.sql](./003_create_rbac_tables.sql) - RBAC 表结构
- [004_insert_rbac_data.sql](./004_insert_rbac_data.sql) - RBAC 初始数据
- [README_RBAC.md](./README_RBAC.md) - RBAC 系统说明

## ✅ 完成检查清单

- [ ] 执行 SQL 脚本成功
- [ ] 验证用户角色查询返回正确结果
- [ ] 验证用户权限数量为 51
- [ ] 验证可访问 RBAC 管理菜单
- [ ] 使用用户 106033 登录系统
- [ ] 能够访问 /rbac/users 页面
- [ ] 能够访问 /rbac/roles 页面
- [ ] 能够访问 /rbac/permissions 页面
- [ ] 能够访问 /rbac/menus 页面

---

**完成！** 🎉 用户 106033 现在拥有超级管理员权限，可以访问所有系统功能。

