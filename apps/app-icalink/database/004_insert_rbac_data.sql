-- =====================================================
-- @wps/app-icalink RBAC权限管理系统初始化数据
-- 基于 MySQL 5.7+ 兼容设计
-- 包含: 系统角色、系统权限、角色权限关联、示例菜单
-- 创建时间: 2025-01-25
-- 版本: 2.0.0
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 插入系统角色 (5个预设角色)
-- =====================================================

INSERT INTO `rbac_roles` (`id`, `name`, `code`, `description`, `is_system`, `status`, `created_by`) VALUES
(1, '超级管理员', 'super_admin', '拥有系统所有权限,可以管理所有功能', 1, 'active', 'system'),
(2, '管理员', 'admin', '拥有大部分管理权限,可以管理用户、角色、菜单等', 1, 'active', 'system'),
(3, '任课教师', 'teacher', '任课教师角色,可以管理课程、考勤、请假审批等', 1, 'active', 'system'),
(4, '评估管理员', 'assessment_admin', '评估管理员角色,负责教学评估、质量监控等工作', 1, 'active', 'system'),
(5, '学科管理员', 'subject_admin', '学科管理员角色,负责学科建设、课程规划等工作', 1, 'active', 'system'),
(6, '学生', 'student', '学生角色,可以签到、提交请假申请等', 1, 'active', 'system');

-- =====================================================
-- 2. 插入系统权限 (按资源分组)
-- 权限命名规范: resource:action
-- =====================================================

-- 2.1 管理员权限 (admin:*)
INSERT INTO `rbac_permissions` (`id`, `name`, `code`, `resource`, `action`, `description`, `is_system`, `created_by`) VALUES
-- 用户管理
(1, '查看用户', 'admin:users:read', 'users', 'read', '查看用户列表和详情', 1, 'system'),
(2, '编辑用户', 'admin:users:write', 'users', 'write', '创建、编辑用户信息', 1, 'system'),
(3, '删除用户', 'admin:users:delete', 'users', 'delete', '删除用户', 1, 'system'),
(4, '分配角色', 'admin:users:assign-roles', 'users', 'assign-roles', '为用户分配角色', 1, 'system'),

-- 角色管理
(5, '查看角色', 'admin:roles:read', 'roles', 'read', '查看角色列表和详情', 1, 'system'),
(6, '编辑角色', 'admin:roles:write', 'roles', 'write', '创建、编辑角色', 1, 'system'),
(7, '删除角色', 'admin:roles:delete', 'roles', 'delete', '删除自定义角色', 1, 'system'),
(8, '分配权限', 'admin:roles:assign-permissions', 'roles', 'assign-permissions', '为角色分配权限', 1, 'system'),

-- 权限管理
(9, '查看权限', 'admin:permissions:read', 'permissions', 'read', '查看权限列表', 1, 'system'),
(10, '编辑权限', 'admin:permissions:write', 'permissions', 'write', '创建、编辑权限', 1, 'system'),

-- 菜单管理
(11, '查看菜单', 'admin:menus:read', 'menus', 'read', '查看菜单列表', 1, 'system'),
(12, '编辑菜单', 'admin:menus:write', 'menus', 'write', '创建、编辑、排序菜单', 1, 'system'),
(13, '删除菜单', 'admin:menus:delete', 'menus', 'delete', '删除菜单', 1, 'system');

-- 2.2 教师权限 (teacher:*)
INSERT INTO `rbac_permissions` (`id`, `name`, `code`, `resource`, `action`, `description`, `is_system`, `created_by`) VALUES
-- 课程管理
(20, '查看课程', 'teacher:courses:read', 'courses', 'read', '查看课程列表和详情', 1, 'system'),
(21, '编辑课程', 'teacher:courses:write', 'courses', 'write', '创建、编辑课程', 1, 'system'),
(22, '删除课程', 'teacher:courses:delete', 'courses', 'delete', '删除课程', 1, 'system'),

-- 考勤管理
(23, '查看考勤', 'teacher:attendance:read', 'attendance', 'read', '查看考勤记录', 1, 'system'),
(24, '发起签到', 'teacher:attendance:create', 'attendance', 'create', '创建签到任务', 1, 'system'),
(25, '导出考勤', 'teacher:attendance:export', 'attendance', 'export', '导出考勤报表', 1, 'system'),

-- 请假审批
(26, '查看请假', 'teacher:leave:read', 'leave', 'read', '查看请假申请', 1, 'system'),
(27, '审批请假', 'teacher:leave:approve', 'leave', 'approve', '审批学生请假申请', 1, 'system'),

-- 工作流管理
(28, '查看工作流', 'teacher:workflows:read', 'workflows', 'read', '查看工作流定义', 1, 'system'),
(29, '编辑工作流', 'teacher:workflows:write', 'workflows', 'write', '创建、编辑工作流', 1, 'system');

-- 2.3 评估管理员权限 (assessment:*)
INSERT INTO `rbac_permissions` (`id`, `name`, `code`, `resource`, `action`, `description`, `is_system`, `created_by`) VALUES
-- 教学评估
(30, '查看评估', 'assessment:evaluations:read', 'evaluations', 'read', '查看教学评估数据', 1, 'system'),
(31, '创建评估', 'assessment:evaluations:write', 'evaluations', 'write', '创建、编辑评估任务', 1, 'system'),
(32, '导出评估', 'assessment:evaluations:export', 'evaluations', 'export', '导出评估报表', 1, 'system'),

-- 质量监控
(33, '查看质量报告', 'assessment:quality:read', 'quality', 'read', '查看教学质量报告', 1, 'system'),
(34, '生成质量报告', 'assessment:quality:generate', 'quality', 'generate', '生成质量分析报告', 1, 'system'),

-- 数据分析
(35, '查看统计', 'assessment:statistics:read', 'statistics', 'read', '查看教学统计数据', 1, 'system'),
(36, '导出统计', 'assessment:statistics:export', 'statistics', 'export', '导出统计报表', 1, 'system');

-- 2.4 学科管理员权限 (subject:*)
INSERT INTO `rbac_permissions` (`id`, `name`, `code`, `resource`, `action`, `description`, `is_system`, `created_by`) VALUES
-- 学科管理
(50, '查看学科', 'subject:subjects:read', 'subjects', 'read', '查看学科信息', 1, 'system'),
(51, '编辑学科', 'subject:subjects:write', 'subjects', 'write', '创建、编辑学科', 1, 'system'),
(52, '删除学科', 'subject:subjects:delete', 'subjects', 'delete', '删除学科', 1, 'system'),

-- 课程规划
(53, '查看课程规划', 'subject:planning:read', 'planning', 'read', '查看课程规划', 1, 'system'),
(54, '编辑课程规划', 'subject:planning:write', 'planning', 'write', '创建、编辑课程规划', 1, 'system'),

-- 教学资源
(55, '查看资源', 'subject:resources:read', 'resources', 'read', '查看教学资源', 1, 'system'),
(56, '管理资源', 'subject:resources:write', 'resources', 'write', '上传、编辑教学资源', 1, 'system'),

-- 教师管理
(57, '查看教师', 'subject:teachers:read', 'teachers', 'read', '查看学科教师', 1, 'system'),
(58, '分配教师', 'subject:teachers:assign', 'teachers', 'assign', '为学科分配教师', 1, 'system');

-- 2.5 学生权限 (student:*)
INSERT INTO `rbac_permissions` (`id`, `name`, `code`, `resource`, `action`, `description`, `is_system`, `created_by`) VALUES
-- 课程查看
(60, '查看课程', 'student:courses:read', 'courses', 'read', '查看自己的课程', 1, 'system'),

-- 考勤签到
(61, '签到', 'student:attendance:checkin', 'attendance', 'checkin', '进行签到', 1, 'system'),
(62, '查看考勤', 'student:attendance:read', 'attendance', 'read', '查看自己的考勤记录', 1, 'system'),

-- 请假申请
(63, '提交请假', 'student:leave:submit', 'leave', 'submit', '提交请假申请', 1, 'system'),
(64, '查看请假', 'student:leave:read', 'leave', 'read', '查看自己的请假记录', 1, 'system');

-- =====================================================
-- 3. 建立角色权限关联
-- =====================================================

-- 3.1 超级管理员 (拥有所有权限)
INSERT INTO `rbac_role_permissions` (`role_id`, `permission_id`, `created_by`)
SELECT 1, id, 'system' FROM `rbac_permissions`;

-- 3.2 管理员 (拥有所有admin:*权限)
INSERT INTO `rbac_role_permissions` (`role_id`, `permission_id`, `created_by`)
SELECT 2, id, 'system' FROM `rbac_permissions` WHERE `code` LIKE 'admin:%';

-- 3.3 任课教师 (拥有所有teacher:*权限)
INSERT INTO `rbac_role_permissions` (`role_id`, `permission_id`, `created_by`)
SELECT 3, id, 'system' FROM `rbac_permissions` WHERE `code` LIKE 'teacher:%';

-- 3.4 评估管理员 (拥有所有assessment:*权限 + 部分teacher:*查看权限)
INSERT INTO `rbac_role_permissions` (`role_id`, `permission_id`, `created_by`)
SELECT 4, id, 'system' FROM `rbac_permissions` WHERE `code` LIKE 'assessment:%';

-- 评估管理员额外权限: 可以查看课程、考勤、请假数据
INSERT INTO `rbac_role_permissions` (`role_id`, `permission_id`, `created_by`)
SELECT 4, id, 'system' FROM `rbac_permissions`
WHERE `code` IN ('teacher:courses:read', 'teacher:attendance:read', 'teacher:leave:read', 'teacher:workflows:read');

-- 3.5 学科管理员 (拥有所有subject:*权限 + 部分teacher:*权限)
INSERT INTO `rbac_role_permissions` (`role_id`, `permission_id`, `created_by`)
SELECT 5, id, 'system' FROM `rbac_permissions` WHERE `code` LIKE 'subject:%';

-- 学科管理员额外权限: 可以管理课程和工作流
INSERT INTO `rbac_role_permissions` (`role_id`, `permission_id`, `created_by`)
SELECT 5, id, 'system' FROM `rbac_permissions`
WHERE `code` IN ('teacher:courses:read', 'teacher:courses:write', 'teacher:workflows:read', 'teacher:workflows:write');

-- 3.6 学生 (拥有所有student:*权限)
INSERT INTO `rbac_role_permissions` (`role_id`, `permission_id`, `created_by`)
SELECT 6, id, 'system' FROM `rbac_permissions` WHERE `code` LIKE 'student:%';

-- =====================================================
-- 4. 插入示例菜单 (基于agendaedu-web的实际菜单结构)
-- =====================================================

-- 4.1 一级菜单 (分组)
INSERT INTO `rbac_menus` (`id`, `name`, `path`, `icon`, `parent_id`, `permission_code`, `sort_order`, `is_visible`, `menu_type`, `created_by`) VALUES
(1, '工作流管理', NULL, 'Workflow', NULL, NULL, 10, 1, 'group', 'system'),
(2, '考勤管理', NULL, 'ClipboardCheck', NULL, NULL, 20, 1, 'group', 'system'),
(3, '教学评估', NULL, 'BarChart', NULL, 'assessment:evaluations:read', 30, 1, 'group', 'system'),
(4, '学科管理', NULL, 'BookOpen', NULL, 'subject:subjects:read', 40, 1, 'group', 'system'),
(5, '系统管理', NULL, 'Settings', NULL, 'admin:users:read', 50, 1, 'group', 'system');

-- 4.2 工作流管理子菜单
INSERT INTO `rbac_menus` (`id`, `name`, `path`, `icon`, `parent_id`, `permission_code`, `sort_order`, `is_visible`, `menu_type`, `created_by`) VALUES
(11, '工作流定义', '/workflows/definitions', 'FileText', 1, 'teacher:workflows:read', 10, 1, 'item', 'system'),
(12, '工作流实例', '/workflows/instances', 'PlayCircle', 1, 'teacher:workflows:read', 20, 1, 'item', 'system');

-- 4.3 考勤管理子菜单
INSERT INTO `rbac_menus` (`id`, `name`, `path`, `icon`, `parent_id`, `permission_code`, `sort_order`, `is_visible`, `menu_type`, `created_by`) VALUES
(21, '签到管理', '/attendance/checkin', 'UserCheck', 2, 'teacher:attendance:read', 10, 1, 'item', 'system'),
(22, '考勤记录', '/attendance/records', 'ClipboardList', 2, 'teacher:attendance:read', 20, 1, 'item', 'system'),
(23, '请假管理', '/attendance/leave', 'Calendar', 2, 'teacher:leave:read', 30, 1, 'item', 'system');

-- 4.4 教学评估子菜单
INSERT INTO `rbac_menus` (`id`, `name`, `path`, `icon`, `parent_id`, `permission_code`, `sort_order`, `is_visible`, `menu_type`, `created_by`) VALUES
(31, '评估任务', '/assessment/tasks', 'ClipboardList', 3, 'assessment:evaluations:read', 10, 1, 'item', 'system'),
(32, '质量报告', '/assessment/quality', 'FileText', 3, 'assessment:quality:read', 20, 1, 'item', 'system'),
(33, '数据统计', '/assessment/statistics', 'TrendingUp', 3, 'assessment:statistics:read', 30, 1, 'item', 'system');

-- 4.5 学科管理子菜单
INSERT INTO `rbac_menus` (`id`, `name`, `path`, `icon`, `parent_id`, `permission_code`, `sort_order`, `is_visible`, `menu_type`, `created_by`) VALUES
(41, '学科列表', '/subject/subjects', 'BookOpen', 4, 'subject:subjects:read', 10, 1, 'item', 'system'),
(42, '课程规划', '/subject/planning', 'Calendar', 4, 'subject:planning:read', 20, 1, 'item', 'system'),
(43, '教学资源', '/subject/resources', 'FolderOpen', 4, 'subject:resources:read', 30, 1, 'item', 'system'),
(44, '教师管理', '/subject/teachers', 'Users', 4, 'subject:teachers:read', 40, 1, 'item', 'system');

-- 4.6 系统管理子菜单
INSERT INTO `rbac_menus` (`id`, `name`, `path`, `icon`, `parent_id`, `permission_code`, `sort_order`, `is_visible`, `menu_type`, `created_by`) VALUES
(51, '用户管理', '/rbac/users', 'Users', 5, 'admin:users:read', 10, 1, 'item', 'system'),
(52, '角色管理', '/rbac/roles', 'Shield', 5, 'admin:roles:read', 20, 1, 'item', 'system'),
(53, '权限管理', '/rbac/permissions', 'Key', 5, 'admin:permissions:read', 30, 1, 'item', 'system'),
(54, '菜单管理', '/rbac/menus', 'Menu', 5, 'admin:menus:read', 40, 1, 'item', 'system');

-- 4.7 学生菜单 (移动端)
INSERT INTO `rbac_menus` (`id`, `name`, `path`, `icon`, `parent_id`, `permission_code`, `sort_order`, `is_visible`, `menu_type`, `created_by`) VALUES
(61, '我的课程', '/student/courses', 'BookOpen', NULL, 'student:courses:read', 10, 1, 'item', 'system'),
(62, '我的考勤', '/student/attendance', 'CheckCircle', NULL, 'student:attendance:read', 20, 1, 'item', 'system'),
(63, '我的请假', '/student/leave', 'FileText', NULL, 'student:leave:read', 30, 1, 'item', 'system');

-- =====================================================
-- 5. 为现有用户分配默认角色 (可选,根据实际情况调整)
-- =====================================================

-- 注意: 以下SQL仅为示例,实际执行时需要根据业务需求调整
-- 如果需要为所有教师分配teacher角色,可以执行:
-- INSERT INTO `rbac_user_roles` (`user_id`, `user_type`, `role_id`, `created_by`)
-- SELECT id, 'teacher', 3, 'system' FROM `out_jsxx`
-- WHERE id NOT IN (SELECT user_id FROM `rbac_user_roles` WHERE user_type = 'teacher');

-- 如果需要为所有学生分配student角色,可以执行:
-- INSERT INTO `rbac_user_roles` (`user_id`, `user_type`, `role_id`, `created_by`)
-- SELECT id, 'student', 4, 'system' FROM `out_xsxx`
-- WHERE id NOT IN (SELECT user_id FROM `rbac_user_roles` WHERE user_type = 'student');

-- 为特定管理员分配super_admin角色 (请替换为实际的教师ID):
-- INSERT INTO `rbac_user_roles` (`user_id`, `user_type`, `role_id`, `created_by`) VALUES
-- ('TEACHER_ID_HERE', 'teacher', 1, 'system');

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 数据统计
-- =====================================================
-- 角色数量: 6个 (super_admin, admin, teacher, assessment_admin, subject_admin, student)
-- 权限数量: 51个 (admin:13, teacher:10, assessment:7, subject:9, student:5)
-- 菜单数量: 20个 (5个一级菜单, 15个二级菜单)
--
-- 角色权限分配:
-- - 超级管理员: 51个权限 (所有权限)
-- - 管理员: 13个权限 (admin:*)
-- - 任课教师: 10个权限 (teacher:*)
-- - 评估管理员: 11个权限 (assessment:* + 部分teacher:*查看权限)
-- - 学科管理员: 13个权限 (subject:* + 部分teacher:*权限)
-- - 学生: 5个权限 (student:*)
-- =====================================================

-- =====================================================
-- 脚本执行完成
-- 下一步: 验证数据是否正确插入
-- 
-- 验证SQL:
-- SELECT * FROM rbac_roles;
-- SELECT * FROM rbac_permissions ORDER BY resource, action;
-- SELECT r.name, COUNT(rp.permission_id) as permission_count
-- FROM rbac_roles r
-- LEFT JOIN rbac_role_permissions rp ON r.id = rp.role_id
-- GROUP BY r.id, r.name;
-- SELECT * FROM rbac_menus ORDER BY parent_id, sort_order;
-- =====================================================

