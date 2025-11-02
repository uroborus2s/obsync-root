CREATE TABLE `icalink_system_configs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `config_key` varchar(200) NOT NULL COMMENT '配置键',
  `config_value` text COMMENT '配置值',
  `config_type` enum('string','number','boolean','json','array') NOT NULL DEFAULT 'string' COMMENT '配置类型',
  `config_group` varchar(100) NOT NULL DEFAULT 'default' COMMENT '配置分组',
  `description` varchar(1000) COMMENT '配置描述',
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否系统配置',
  `is_encrypted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否加密存储',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) COMMENT '创建人',
  `updated_by` varchar(100) COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_config_group` (`config_group`),
  KEY `idx_is_system` (`is_system`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='系统配置表-存储系统级配置参数';