-- =====================================================
-- @wps/app-icalink 系统默认配置数据
-- 初始化系统配置表的默认值
-- 创建时间: 2025-01-25
-- 版本: 1.0.0
-- =====================================================

SET NAMES utf8mb4;

-- =====================================================
-- 插入考勤相关配置
-- =====================================================

INSERT INTO `icalink_system_configs` (`config_key`, `config_value`, `config_type`, `config_group`, `description`, `is_system`, `created_by`) VALUES
-- 签到时间窗口配置
('attendance.checkin_window_start', '-10', 'number', 'attendance', '签到开始时间偏移(分钟)，负数表示课程开始前', 1, 'system'),
('attendance.checkin_window_end', '10', 'number', 'attendance', '签到结束时间偏移(分钟)，正数表示课程开始后', 1, 'system'),
('attendance.late_threshold', '10', 'number', 'attendance', '迟到阈值(分钟)，超过此时间算迟到', 1, 'system'),
('attendance.auto_absent_after', '60', 'number', 'attendance', '自动标记缺勤时间(分钟)，超过此时间自动标记缺勤', 1, 'system'),

-- 位置验证配置
('attendance.location_required', 'true', 'boolean', 'attendance', '是否要求位置验证', 1, 'system'),
('attendance.location_accuracy_threshold', '100', 'number', 'attendance', '位置精度阈值(米)，超过此精度的位置信息将被标记', 1, 'system'),
('attendance.classroom_radius', '50', 'number', 'attendance', '教室签到半径(米)，在此范围内可以签到', 1, 'system'),

-- 请假申请配置（仅支持图片附件）
('leave.max_image_size', '10485760', 'number', 'leave', '图片最大大小(字节)，默认10MB', 1, 'system'),
('leave.max_image_count', '5', 'number', 'leave', '每个请假申请最大图片数量', 1, 'system'),
('leave.allowed_image_types', '["image/jpeg","image/png","image/gif","image/webp"]', 'json', 'leave', '允许的图片文件类型', 1, 'system'),
('leave.image_quality', '80', 'number', 'leave', '图片压缩质量(1-100)', 1, 'system'),
('leave.thumbnail_width', '200', 'number', 'leave', '缩略图宽度(像素)', 1, 'system'),
('leave.thumbnail_height', '200', 'number', 'leave', '缩略图高度(像素)', 1, 'system'),
('leave.auto_generate_thumbnail', 'true', 'boolean', 'leave', '是否自动生成缩略图', 1, 'system'),
('leave.reason_min_length', '5', 'number', 'leave', '请假原因最小长度', 1, 'system'),
('leave.reason_max_length', '500', 'number', 'leave', '请假原因最大长度', 1, 'system'),

-- 审批流程配置
('approval.auto_approve_threshold', '0', 'number', 'approval', '自动审批阈值(小时)，0表示不自动审批', 1, 'system'),
('approval.notification_enabled', 'true', 'boolean', 'approval', '是否启用审批通知', 1, 'system'),
('approval.reminder_interval', '24', 'number', 'approval', '审批提醒间隔(小时)', 1, 'system'),

-- 系统功能开关
('system.maintenance_mode', 'false', 'boolean', 'system', '系统维护模式开关', 1, 'system'),
('system.debug_mode', 'false', 'boolean', 'system', '调试模式开关', 1, 'system'),
('system.api_rate_limit', '1000', 'number', 'system', 'API请求频率限制(每小时)', 1, 'system'),

-- WPS协作集成配置
('wps.app_id', 'AK20250614WBSGPX', 'string', 'wps', 'WPS协作应用ID', 1, 'system'),
('wps.redirect_uri', 'https://chat.whzhsc.cn/api/auth/authorization', 'string', 'wps', 'WPS授权回调地址', 1, 'system'),
('wps.scope', '["user_info"]', 'json', 'wps', 'WPS授权范围', 1, 'system'),
('wps.token_expire_buffer', '300', 'number', 'wps', 'Token过期缓冲时间(秒)', 1, 'system'),

-- 数据保留策略
('data.attendance_retention_days', '1095', 'number', 'data', '签到记录保留天数(默认3年)', 1, 'system'),
('data.leave_retention_days', '1095', 'number', 'data', '请假记录保留天数(默认3年)', 1, 'system'),
('data.attachment_retention_days', '365', 'number', 'data', '附件保留天数(默认1年)', 1, 'system'),
('data.log_retention_days', '90', 'number', 'data', '日志保留天数(默认3个月)', 1, 'system'),

-- 通知配置
('notification.email_enabled', 'false', 'boolean', 'notification', '是否启用邮件通知', 1, 'system'),
('notification.sms_enabled', 'false', 'boolean', 'notification', '是否启用短信通知', 1, 'system'),
('notification.wechat_enabled', 'false', 'boolean', 'notification', '是否启用微信通知', 1, 'system'),

-- 安全配置
('security.session_timeout', '7200', 'number', 'security', '会话超时时间(秒)，默认2小时', 1, 'system'),
('security.max_login_attempts', '5', 'number', 'security', '最大登录尝试次数', 1, 'system'),
('security.lockout_duration', '1800', 'number', 'security', '账户锁定时间(秒)，默认30分钟', 1, 'system'),

-- 缓存配置
('cache.attendance_cache_ttl', '300', 'number', 'cache', '签到数据缓存时间(秒)', 1, 'system'),
('cache.course_cache_ttl', '3600', 'number', 'cache', '课程数据缓存时间(秒)', 1, 'system'),
('cache.user_cache_ttl', '1800', 'number', 'cache', '用户数据缓存时间(秒)', 1, 'system'),

-- 业务规则配置
('business.allow_retroactive_checkin', 'false', 'boolean', 'business', '是否允许补签到', 1, 'system'),
('business.allow_multiple_leave_requests', 'true', 'boolean', 'business', '是否允许同一课程多次请假申请', 1, 'system'),
('business.require_leave_approval', 'true', 'boolean', 'business', '是否要求请假审批', 1, 'system'),
('business.auto_mark_absent_enabled', 'true', 'boolean', 'business', '是否启用自动标记缺勤', 1, 'system');

-- =====================================================
-- 插入默认的请假类型配置
-- =====================================================

INSERT INTO `icalink_system_configs` (`config_key`, `config_value`, `config_type`, `config_group`, `description`, `is_system`, `created_by`) VALUES
('leave_types.sick.enabled', 'true', 'boolean', 'leave_types', '病假是否启用', 1, 'system'),
('leave_types.sick.requires_attachment', 'true', 'boolean', 'leave_types', '病假是否需要附件', 1, 'system'),
('leave_types.sick.max_days', '7', 'number', 'leave_types', '病假最大天数', 1, 'system'),

('leave_types.personal.enabled', 'true', 'boolean', 'leave_types', '事假是否启用', 1, 'system'),
('leave_types.personal.requires_attachment', 'false', 'boolean', 'leave_types', '事假是否需要附件', 1, 'system'),
('leave_types.personal.max_days', '3', 'number', 'leave_types', '事假最大天数', 1, 'system'),

('leave_types.emergency.enabled', 'true', 'boolean', 'leave_types', '紧急事假是否启用', 1, 'system'),
('leave_types.emergency.requires_attachment', 'false', 'boolean', 'leave_types', '紧急事假是否需要附件', 1, 'system'),
('leave_types.emergency.max_days', '1', 'number', 'leave_types', '紧急事假最大天数', 1, 'system'),

('leave_types.other.enabled', 'true', 'boolean', 'leave_types', '其他假期是否启用', 1, 'system'),
('leave_types.other.requires_attachment', 'true', 'boolean', 'leave_types', '其他假期是否需要附件', 1, 'system'),
('leave_types.other.max_days', '1', 'number', 'leave_types', '其他假期最大天数', 1, 'system');

-- =====================================================
-- 插入UI界面配置
-- =====================================================

INSERT INTO `icalink_system_configs` (`config_key`, `config_value`, `config_type`, `config_group`, `description`, `is_system`, `created_by`) VALUES
('ui.app_title', '学生考勤管理系统', 'string', 'ui', '应用标题', 0, 'system'),
('ui.app_logo', '', 'string', 'ui', '应用Logo URL', 0, 'system'),
('ui.theme_color', '#1890ff', 'string', 'ui', '主题色', 0, 'system'),
('ui.show_statistics', 'true', 'boolean', 'ui', '是否显示统计信息', 0, 'system'),
('ui.show_location_map', 'true', 'boolean', 'ui', '是否显示位置地图', 0, 'system'),
('ui.default_page_size', '20', 'number', 'ui', '默认分页大小', 0, 'system'),
('ui.max_page_size', '100', 'number', 'ui', '最大分页大小', 0, 'system');

-- =====================================================
-- 插入API配置
-- =====================================================

INSERT INTO `icalink_system_configs` (`config_key`, `config_value`, `config_type`, `config_group`, `description`, `is_system`, `created_by`) VALUES
('api.base_url', '/api', 'string', 'api', 'API基础路径', 1, 'system'),
('api.version', 'v1', 'string', 'api', 'API版本', 1, 'system'),
('api.timeout', '30000', 'number', 'api', 'API超时时间(毫秒)', 1, 'system'),
('api.cors_enabled', 'true', 'boolean', 'api', '是否启用CORS', 1, 'system'),
('api.cors_origins', '["*"]', 'json', 'api', 'CORS允许的源', 1, 'system');

-- =====================================================
-- 执行完成提示
-- =====================================================

-- 系统配置数据插入完成
-- 总计插入配置项: 50+
-- 配置分组包括:
-- - attendance: 考勤相关配置
-- - leave: 请假相关配置  
-- - approval: 审批相关配置
-- - system: 系统功能配置
-- - wps: WPS协作集成配置
-- - data: 数据保留策略
-- - notification: 通知配置
-- - security: 安全配置
-- - cache: 缓存配置
-- - business: 业务规则配置
-- - leave_types: 请假类型配置
-- - ui: 界面配置
-- - api: API配置
