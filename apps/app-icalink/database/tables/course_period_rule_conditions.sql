-- 规则条件表：描述触发某条规则所需满足的条件组合
  CREATE TABLE `course_period_rule_conditions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `rule_id` BIGINT UNSIGNED NOT NULL COMMENT '关联规则ID',
    `group_no` INT NOT NULL DEFAULT 1 COMMENT '条件组编号（用于支持多组AND/OR组合）',
    `group_connector` ENUM('AND', 'OR') NOT NULL DEFAULT 'AND' COMMENT '该条件组与下一组之间的逻辑关系',
    `dimension` VARCHAR(100) NOT NULL COMMENT '条件维度，如 building/grade',
    `operator` ENUM('=', '!=', 'in', 'not_in', '>', '>=', '<', '<=', 'between') NOT NULL COMMENT '运算符',
    `value_json` JSON NOT NULL COMMENT '条件取值（字符串、数组或区间，按JSON存储）',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_rule_group` (`rule_id`, `group_no`),
    CONSTRAINT `fk_course_period_rule_conditions_rule` FOREIGN KEY (`rule_id`)
      REFERENCES `course_period_rules` (`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='课节规则条件：定义触发规则的维度及取值';