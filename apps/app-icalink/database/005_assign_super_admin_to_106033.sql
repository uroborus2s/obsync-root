-- =====================================================
-- 为用户 106033 分配超级管理员角色
-- 创建时间: 2025-01-25
-- 用途: 使用户 106033 能够访问所有 RBAC 管理页面
-- =====================================================

SET NAMES utf8mb4;

-- =====================================================
-- 1. 为用户 106033 分配超级管理员角色
-- =====================================================

-- 检查用户是否已有超级管理员角色，如果没有则添加
INSERT INTO `rbac_user_roles` (`user_id`, `user_type`, `role_id`, `created_by`)
SELECT '106033', 'teacher', 1, 'system'
WHERE NOT EXISTS (
    SELECT 1 FROM `rbac_user_roles`
    WHERE `user_id` = '106033'
      AND `user_type` = 'teacher'
      AND `role_id` = 1
);

-- =====================================================
-- 2. 验证分配结果
-- =====================================================

-- 查看用户 106033 的角色
SELECT 
    ur.user_id AS '用户ID',
    ur.user_type AS '用户类型',
    r.name AS '角色名称',
    r.code AS '角色代码',
    r.status AS '角色状态',
    ur.created_at AS '分配时间'
FROM rbac_user_roles ur
JOIN rbac_roles r ON ur.role_id = r.id
WHERE ur.user_id = '106033';

-- 查看用户 106033 拥有的权限数量
SELECT 
    '用户106033拥有的权限数量' AS '统计项',
    COUNT(DISTINCT p.id) AS '数量'
FROM rbac_user_roles ur
JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
JOIN rbac_permissions p ON rp.permission_id = p.id
WHERE ur.user_id = '106033';

-- 查看用户 106033 可访问的菜单
SELECT 
    m.id AS '菜单ID',
    m.name AS '菜单名称',
    m.path AS '路由路径',
    m.parent_id AS '父菜单ID',
    m.permission_code AS '权限代码',
    m.sort_order AS '排序'
FROM rbac_menus m
WHERE m.permission_code IS NULL
   OR m.permission_code IN (
       SELECT p.code
       FROM rbac_user_roles ur
       JOIN rbac_role_permissions rp ON ur.role_id = rp.role_id
       JOIN rbac_permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = '106033'
   )
ORDER BY m.parent_id, m.sort_order;

-- =====================================================
-- 执行完成提示
-- =====================================================

SELECT '========================================' AS '';
SELECT '✅ 用户 106033 已成功分配超级管理员角色！' AS '';
SELECT '========================================' AS '';
SELECT '用户ID: 106033' AS '';
SELECT '用户类型: teacher (教师)' AS '';
SELECT '角色: 超级管理员 (super_admin)' AS '';
SELECT '权限: 拥有所有系统权限 (51个)' AS '';
SELECT '========================================' AS '';
SELECT '可访问的 RBAC 管理页面:' AS '';
SELECT '  - /rbac/users (用户管理)' AS '';
SELECT '  - /rbac/roles (角色管理)' AS '';
SELECT '  - /rbac/permissions (权限管理)' AS '';
SELECT '  - /rbac/menus (菜单管理)' AS '';
SELECT '========================================' AS '';

-- =====================================================
-- 脚本执行完成
-- =====================================================

