-- 课节规则表：在默认时间基础上，为不同条件定义特定时间
  CREATE TABLE `icalink_course_period_rules` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `period_id` BIGINT UNSIGNED NOT NULL COMMENT '关联课节ID',
    `priority` INT NOT NULL DEFAULT 100 COMMENT '优先级，数字越小优先级越高',
    `rule_name` VARCHAR(100) DEFAULT NULL COMMENT '规则名称',
    `start_time` TIME NOT NULL COMMENT '规则开始时间',
    `end_time` TIME NOT NULL COMMENT '规则结束时间',
    `effective_start_date` DATE DEFAULT NULL COMMENT '规则生效起始日期（可选）',
    `effective_end_date` DATE DEFAULT NULL COMMENT '规则失效日期（可选）',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
    `created_by` VARCHAR(100) DEFAULT NULL COMMENT '创建人',
    `updated_by` VARCHAR(100) DEFAULT NULL COMMENT '更新人',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_period_priority` (`period_id`, `priority`),
    KEY `idx_period_enabled` (`period_id`, `enabled`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='课节规则表：定义在特定条件下的上课时间';