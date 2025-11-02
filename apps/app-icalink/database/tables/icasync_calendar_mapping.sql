CREATE TABLE `icasync_calendar_mapping` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `kkh` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '开课号',
  `xnxq` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学年学期',
  `calendar_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'WPS日历ID',
  `calendar_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日历名称',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '软删除标志',
  `deleted_at` datetime DEFAULT NULL COMMENT '删除时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  PRIMARY KEY (`id`),
  KEY `idx_calendar_id` (`calendar_id`),
  KEY `idx_is_deleted` (`is_deleted`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_ic_kkh` (`kkh`)
) ENGINE=InnoDB AUTO_INCREMENT=1796 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程日历映射表';