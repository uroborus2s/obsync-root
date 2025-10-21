# RBAC数据库迁移脚本使用说明

## 📋 脚本清单

### 003_create_rbac_tables.sql

创建RBAC权限管理系统的5张核心数据表:

1. `rbac_roles` - 角色表
2. `rbac_permissions` - 权限表
3. `rbac_role_permissions` - 角色权限关联表
4. `rbac_user_roles` - 用户角色关联表
5. `rbac_menus` - 菜单表

### 004_insert_rbac_data.sql

插入初始化数据:

- 6个系统角色 (super_admin, admin, teacher, assessment_admin, subject_admin, student)
- 51个系统权限 (按资源分组)
- 角色权限关联关系
- 20个示例菜单

### 005_assign_super_admin_to_106033.sql

为用户 106033 分配超级管理员角色:

- 为教师用户 106033 分配 super_admin 角色
- 使其能够访问所有 RBAC 管理页面
- 包含验证查询和结果展示

---

## 🚀 执行步骤

### 方式一: 使用MySQL命令行（推荐）

```bash
# 1. 进入database目录
cd apps/app-icalink/database

# 2. 执行建表脚本
mysql -h localhost -P 3307 -u root -p icasync < 003_create_rbac_tables.sql

# 3. 执行初始化数据脚本
mysql -h localhost -P 3307 -u root -p icasync < 004_insert_rbac_data.sql

# 4. 为用户 106033 分配超级管理员角色
mysql -h localhost -P 3307 -u root -p icasync < 005_assign_super_admin_to_106033.sql
```

**密码**: `lSqMlyo&c*230caLre`

### 方式二: 使用MySQL Workbench

1. 打开MySQL Workbench
2. 连接到数据库 (localhost:3307, 用户名:root, 数据库:icasync)
3. 打开 `003_create_rbac_tables.sql` 文件
4. 点击执行 (⚡ 图标)
5. 打开 `004_insert_rbac_data.sql` 文件
6. 点击执行 (⚡ 图标)

### 方式三: 使用Node.js脚本 (推荐)

创建一个执行脚本 `scripts/migrate-rbac.js`:

```javascript
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'lSqMlyo&c*230caLre',
    database: 'icasync',
    multipleStatements: true
  });

  try {
    console.log('📦 开始执行RBAC数据库迁移...\n');

    // 执行建表脚本
    console.log('1️⃣ 执行 003_create_rbac_tables.sql...');
    const createTablesSql = await fs.readFile(
      path.join(__dirname, '../database/003_create_rbac_tables.sql'),
      'utf8'
    );
    await connection.query(createTablesSql);
    console.log('✅ 表结构创建成功\n');

    // 执行初始化数据脚本
    console.log('2️⃣ 执行 004_insert_rbac_data.sql...');
    const insertDataSql = await fs.readFile(
      path.join(__dirname, '../database/004_insert_rbac_data.sql'),
      'utf8'
    );
    await connection.query(insertDataSql);
    console.log('✅ 初始化数据插入成功\n');

    // 验证数据
    console.log('3️⃣ 验证数据...');
    const [roles] = await connection.query(
      'SELECT COUNT(*) as count FROM rbac_roles'
    );
    const [permissions] = await connection.query(
      'SELECT COUNT(*) as count FROM rbac_permissions'
    );
    const [menus] = await connection.query(
      'SELECT COUNT(*) as count FROM rbac_menus'
    );

    console.log(`   - 角色数量: ${roles[0].count}`);
    console.log(`   - 权限数量: ${permissions[0].count}`);
    console.log(`   - 菜单数量: ${menus[0].count}`);
    console.log('\n🎉 RBAC数据库迁移完成!');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
```

执行:

```bash
node apps/app-icalink/scripts/migrate-rbac.js
```

---

## ✅ 验证数据

执行以下SQL验证数据是否正确插入:

```sql
-- 1. 查看所有角色
SELECT * FROM rbac_roles;

-- 2. 查看所有权限 (按资源分组)
SELECT resource, COUNT(*) as count
FROM rbac_permissions
GROUP BY resource
ORDER BY resource;

-- 3. 查看每个角色的权限数量
SELECT r.name, COUNT(rp.permission_id) as permission_count
FROM rbac_roles r
LEFT JOIN rbac_role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name;

-- 4. 查看菜单树结构
SELECT
  CASE WHEN parent_id IS NULL THEN name ELSE CONCAT('  └─ ', name) END as menu_tree,
  path,
  permission_code
FROM rbac_menus
ORDER BY COALESCE(parent_id, id), sort_order;

-- 5. 查看超级管理员的所有权限
SELECT p.code, p.name, p.resource, p.action
FROM rbac_permissions p
JOIN rbac_role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = 1
ORDER BY p.resource, p.action;
```

**预期结果**:

- 角色数量: 4
- 权限数量: 27
- 菜单数量: 14
- 超级管理员权限数量: 27 (所有权限)
- 管理员权限数量: 13 (admin:\*)
- 教师权限数量: 10 (teacher:\*)
- 学生权限数量: 4 (student:\*)

---

## 🔧 为现有用户分配角色

### 为所有教师分配teacher角色

```sql
INSERT INTO `rbac_user_roles` (`user_id`, `user_type`, `role_id`, `created_by`)
SELECT id, 'teacher', 3, 'system'
FROM `out_jsxx`
WHERE id NOT IN (
  SELECT user_id FROM `rbac_user_roles` WHERE user_type = 'teacher'
);
```

### 为所有学生分配student角色

```sql
INSERT INTO `rbac_user_roles` (`user_id`, `user_type`, `role_id`, `created_by`)
SELECT id, 'student', 4, 'system'
FROM `out_xsxx`
WHERE id NOT IN (
  SELECT user_id FROM `rbac_user_roles` WHERE user_type = 'student'
);
```

### 为特定教师分配super_admin角色

```sql
-- 替换 'TEACHER_ID_HERE' 为实际的教师ID
INSERT INTO `rbac_user_roles` (`user_id`, `user_type`, `role_id`, `created_by`)
VALUES ('TEACHER_ID_HERE', 'teacher', 1, 'system');
```

---

## 📊 数据库表结构说明

### 1. rbac_roles (角色表)

| 字段      | 类型         | 说明                  |
| --------- | ------------ | --------------------- |
| id        | bigint(20)   | 主键                  |
| name      | varchar(100) | 角色名称              |
| code      | varchar(50)  | 角色代码(唯一)        |
| is_system | tinyint(1)   | 是否系统角色          |
| status    | enum         | 状态(active/inactive) |

### 2. rbac_permissions (权限表)

| 字段     | 类型         | 说明           |
| -------- | ------------ | -------------- |
| id       | bigint(20)   | 主键           |
| name     | varchar(100) | 权限名称       |
| code     | varchar(100) | 权限代码(唯一) |
| resource | varchar(50)  | 资源类型       |
| action   | varchar(50)  | 操作类型       |

### 3. rbac_role_permissions (角色权限关联表)

| 字段          | 类型       | 说明         |
| ------------- | ---------- | ------------ |
| id            | bigint(20) | 主键         |
| role_id       | bigint(20) | 角色ID(外键) |
| permission_id | bigint(20) | 权限ID(外键) |

### 4. rbac_user_roles (用户角色关联表)

| 字段      | 类型         | 说明                      |
| --------- | ------------ | ------------------------- |
| id        | bigint(20)   | 主键                      |
| user_id   | varchar(100) | 用户ID                    |
| user_type | enum         | 用户类型(student/teacher) |
| role_id   | bigint(20)   | 角色ID(外键)              |

### 5. rbac_menus (菜单表)

| 字段            | 类型         | 说明         |
| --------------- | ------------ | ------------ |
| id              | bigint(20)   | 主键         |
| name            | varchar(100) | 菜单名称     |
| path            | varchar(200) | 路由路径     |
| parent_id       | bigint(20)   | 父菜单ID     |
| permission_code | varchar(100) | 关联权限代码 |
| sort_order      | int(11)      | 排序序号     |

---

## ⚠️ 注意事项

1. **执行顺序**: 必须先执行 `003_create_rbac_tables.sql`,再执行 `004_insert_rbac_data.sql`
2. **外键约束**: 删除角色或权限时会级联删除关联数据,请谨慎操作
3. **系统角色**: is_system=1的角色和权限不应该被删除
4. **用户类型**: user_type只支持'student'和'teacher'两种类型
5. **权限代码**: 权限代码采用 `resource:action` 格式,如 `admin:users:read`
6. **菜单权限**: 菜单的permission_code可以为NULL,表示无需权限即可访问

---

## 🔄 回滚脚本

如果需要回滚,执行以下SQL:

```sql
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `rbac_menus`;
DROP TABLE IF EXISTS `rbac_user_roles`;
DROP TABLE IF EXISTS `rbac_role_permissions`;
DROP TABLE IF EXISTS `rbac_permissions`;
DROP TABLE IF EXISTS `rbac_roles`;

SET FOREIGN_KEY_CHECKS = 1;
```

---

## 📞 问题反馈

如果在执行过程中遇到问题,请检查:

1. 数据库连接信息是否正确
2. 数据库用户是否有CREATE TABLE权限
3. 是否已经存在同名的表
4. MySQL版本是否为5.7+

---

**创建时间**: 2025-01-25  
**版本**: 2.0.0  
**维护者**: RBAC开发团队
