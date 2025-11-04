-- 课节默认时间配置：每个学期的基础节次定义
  CREATE TABLE `course_periods` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `term_id` BIGINT UNSIGNED NOT NULL COMMENT '关联学期ID',
    `period_no` INT NOT NULL COMMENT '节次编号（从1开始）',
    `name` VARCHAR(50) DEFAULT NULL COMMENT '节次名称，如“第一节”',
    `default_start_time` TIME NOT NULL COMMENT '默认开始时间',
    `default_end_time` TIME NOT NULL COMMENT '默认结束时间',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用该节次',
    `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_term_period_no` (`term_id`, `period_no`),
    KEY `idx_term_active` (`term_id`, `is_active`),
    CONSTRAINT `fk_course_periods_term` FOREIGN KEY (`term_id`)
      REFERENCES `system_config_terms` (`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='课节默认时间配置：定义学期内各节次的标准时间';