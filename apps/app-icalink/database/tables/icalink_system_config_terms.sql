CREATE TABLE `icalink_system_config_terms` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `term_code` VARCHAR(50) NOT NULL COMMENT '学期编码（例如 2024-2025-1）',
  `name` VARCHAR(100) NOT NULL COMMENT '学期名称',
  `start_date` DATE NOT NULL COMMENT '学期开始日期',
  `end_date` DATE DEFAULT NULL COMMENT '学期结束日期',
  `is_active` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否当前激活学期',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_term_code` (`term_code`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='学期配置表：定义学期基础信息';