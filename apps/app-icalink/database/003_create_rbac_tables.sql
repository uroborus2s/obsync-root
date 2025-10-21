-- =====================================================
-- @wps/app-icalink RBAC权限管理系统数据库表结构
-- 基于 MySQL 5.7+ 兼容设计
-- 架构设计: 认证与授权分离,通过独立接口按需加载权限
-- 创建时间: 2025-01-25
-- 版本: 2.0.0
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 角色表 (rbac_roles)
-- 存储系统角色信息,支持自定义角色和系统预设角色
-- =====================================================

DROP TABLE IF EXISTS `rbac_roles`;

CREATE TABLE `rbac_roles` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `name` varchar(100) NOT NULL COMMENT '角色名称',
  `code` varchar(50) NOT NULL COMMENT '角色代码(唯一标识,如:admin,teacher,student)',
  `description` varchar(500) DEFAULT NULL COMMENT '角色描述',
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否系统角色(1=系统角色不可删除,0=自定义角色)',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active' COMMENT '状态(active=启用,inactive=禁用)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建人',
  `updated_by` varchar(100) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_is_system` (`is_system`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='RBAC角色表-存储系统角色和自定义角色';

-- =====================================================
-- 2. 权限表 (rbac_permissions)
-- 存储系统权限点,采用resource:action命名规范
-- =====================================================

DROP TABLE IF EXISTS `rbac_permissions`;

CREATE TABLE `rbac_permissions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '权限ID',
  `name` varchar(100) NOT NULL COMMENT '权限名称(中文描述)',
  `code` varchar(100) NOT NULL COMMENT '权限代码(唯一标识,格式:resource:action,如:admin:users:read)',
  `resource` varchar(50) NOT NULL COMMENT '资源类型(如:users,roles,courses)',
  `action` varchar(50) NOT NULL COMMENT '操作类型(如:read,write,delete,export)',
  `description` varchar(500) DEFAULT NULL COMMENT '权限描述',
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否系统权限(1=系统权限不可删除,0=自定义权限)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建人',
  `updated_by` varchar(100) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_resource` (`resource`),
  KEY `idx_action` (`action`),
  KEY `idx_is_system` (`is_system`),
  KEY `idx_resource_action` (`resource`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='RBAC权限表-存储系统权限点';

-- =====================================================
-- 3. 角色权限关联表 (rbac_role_permissions)
-- 多对多关系:一个角色可以有多个权限,一个权限可以分配给多个角色
-- =====================================================

DROP TABLE IF EXISTS `rbac_role_permissions`;

CREATE TABLE `rbac_role_permissions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `role_id` bigint(20) NOT NULL COMMENT '角色ID(关联rbac_roles.id)',
  `permission_id` bigint(20) NOT NULL COMMENT '权限ID(关联rbac_permissions.id)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_permission_id` (`permission_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `rbac_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `rbac_permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='RBAC角色权限关联表-多对多关系';

-- =====================================================
-- 4. 用户角色关联表 (rbac_user_roles)
-- 多对多关系:一个用户可以有多个角色,一个角色可以分配给多个用户
-- 支持区分学生(student)和教师(teacher)两种用户类型
-- =====================================================

DROP TABLE IF EXISTS `rbac_user_roles`;

CREATE TABLE `rbac_user_roles` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` varchar(100) NOT NULL COMMENT '用户ID(学生ID或教师ID)',
  `user_type` enum('student','teacher') NOT NULL COMMENT '用户类型(student=学生,teacher=教师)',
  `role_id` bigint(20) NOT NULL COMMENT '角色ID(关联rbac_roles.id)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建人(分配角色的管理员)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `user_type`, `role_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_type` (`user_type`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_user_type_id` (`user_type`, `user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `rbac_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='RBAC用户角色关联表-支持学生和教师两种用户类型';

-- =====================================================
-- 5. 菜单表 (rbac_menus)
-- 存储系统菜单结构,支持树形层级和权限关联
-- =====================================================

DROP TABLE IF EXISTS `rbac_menus`;

CREATE TABLE `rbac_menus` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `name` varchar(100) NOT NULL COMMENT '菜单名称',
  `path` varchar(200) DEFAULT NULL COMMENT '路由路径(如:/workflows/definitions)',
  `icon` varchar(50) DEFAULT NULL COMMENT '图标名称(如:Workflow,Users)',
  `parent_id` bigint(20) DEFAULT NULL COMMENT '父菜单ID(NULL表示根菜单)',
  `permission_code` varchar(100) DEFAULT NULL COMMENT '关联权限代码(关联rbac_permissions.code,NULL表示无需权限)',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序序号(数字越小越靠前)',
  `is_visible` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否可见(1=显示,0=隐藏)',
  `menu_type` enum('group','item','link') NOT NULL DEFAULT 'item' COMMENT '菜单类型(group=分组,item=菜单项,link=外部链接)',
  `external_link` varchar(500) DEFAULT NULL COMMENT '外部链接URL(仅当menu_type=link时有效)',
  `description` varchar(500) DEFAULT NULL COMMENT '菜单描述',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建人',
  `updated_by` varchar(100) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_permission_code` (`permission_code`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_is_visible` (`is_visible`),
  KEY `idx_menu_type` (`menu_type`),
  KEY `idx_parent_sort` (`parent_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='RBAC菜单表-存储系统菜单结构和权限关联';

-- =====================================================
-- 索引优化说明
-- =====================================================
-- 1. rbac_roles: 
--    - uk_code: 角色代码唯一索引,用于快速查找角色
--    - idx_status: 状态索引,用于筛选启用/禁用角色
--
-- 2. rbac_permissions:
--    - uk_code: 权限代码唯一索引,用于快速查找权限
--    - idx_resource_action: 复合索引,用于按资源和操作查询
--
-- 3. rbac_role_permissions:
--    - uk_role_permission: 唯一索引,防止重复分配
--    - 外键约束: 级联删除,删除角色或权限时自动清理关联
--
-- 4. rbac_user_roles:
--    - uk_user_role: 唯一索引,防止重复分配
--    - idx_user_type_id: 复合索引,用于快速查询用户的所有角色
--
-- 5. rbac_menus:
--    - idx_parent_sort: 复合索引,用于快速构建菜单树
--    - idx_permission_code: 用于根据权限过滤菜单
-- =====================================================

-- =====================================================
-- 外键约束说明
-- =====================================================
-- 1. rbac_role_permissions:
--    - fk_rp_role: 关联rbac_roles,级联删除
--    - fk_rp_permission: 关联rbac_permissions,级联删除
--
-- 2. rbac_user_roles:
--    - fk_ur_role: 关联rbac_roles,级联删除
--    - 注意: user_id不设置外键,因为用户数据在out_xsxx和out_jsxx表中
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 脚本执行完成
-- 下一步: 执行 004_insert_rbac_data.sql 插入初始化数据
-- =====================================================

