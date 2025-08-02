# @stratix/icasync 数据库设计文档

## 概述

@stratix/icasync 插件需要管理课程数据的同步状态、映射关系和同步历史。本文档定义了插件所需的数据表结构。

## 数据表设计

### 1. 同步映射表 (icasync_calendar_mapping)

用于存储课程（kkh）与 WPS 日历 ID 的映射关系。

```sql
CREATE TABLE `icasync_calendar_mapping` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `kkh` varchar(60) NOT NULL COMMENT '开课号',
  `xnxq` varchar(20) NOT NULL COMMENT '学年学期',
  `calendar_id` varchar(100) NOT NULL COMMENT 'WPS日历ID',
  `calendar_name` varchar(200) DEFAULT NULL COMMENT '日历名称',
  `sync_status` enum('pending','syncing','completed','failed') DEFAULT 'pending' COMMENT '同步状态',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kkh_xnxq` (`kkh`, `xnxq`),
  KEY `idx_calendar_id` (`calendar_id`),
  KEY `idx_sync_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程日历映射表';
```

### 2. 同步日程映射表 (icasync_schedule_mapping)

用于存储聚合任务（juhe_renwu）与 WPS 日程 ID 的映射关系。

```sql
CREATE TABLE `icasync_schedule_mapping` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `juhe_renwu_id` int(11) NOT NULL COMMENT '聚合任务ID',
  `kkh` varchar(60) NOT NULL COMMENT '开课号',
  `calendar_id` varchar(100) NOT NULL COMMENT 'WPS日历ID',
  `schedule_id` varchar(100) NOT NULL COMMENT 'WPS日程ID',
  `schedule_summary` varchar(500) DEFAULT NULL COMMENT '日程标题',
  `sync_status` enum('pending','syncing','completed','failed','deleted') DEFAULT 'pending' COMMENT '同步状态',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_juhe_renwu_id` (`juhe_renwu_id`),
  KEY `idx_kkh` (`kkh`),
  KEY `idx_calendar_id` (`calendar_id`),
  KEY `idx_schedule_id` (`schedule_id`),
  KEY `idx_sync_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日程映射表';
```

### 3. 用户视图表 (icasync_user_view)

统一的用户视图，包含学生和教师信息。

```sql
CREATE TABLE `icasync_user_view` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_code` varchar(100) NOT NULL COMMENT '用户编号（学号/工号）',
  `user_name` varchar(200) NOT NULL COMMENT '用户姓名',
  `user_type` enum('student','teacher') NOT NULL COMMENT '用户类型',
  `college_code` varchar(30) DEFAULT NULL COMMENT '学院代码',
  `college_name` varchar(90) DEFAULT NULL COMMENT '学院名称',
  `major_code` varchar(30) DEFAULT NULL COMMENT '专业代码（学生）/部门代码（教师）',
  `major_name` varchar(90) DEFAULT NULL COMMENT '专业名称（学生）/部门名称（教师）',
  `class_code` varchar(30) DEFAULT NULL COMMENT '班级代码（仅学生）',
  `class_name` varchar(90) DEFAULT NULL COMMENT '班级名称（仅学生）',
  `phone` varchar(11) DEFAULT NULL COMMENT '手机号',
  `email` varchar(200) DEFAULT NULL COMMENT '邮箱',
  `wps_user_id` varchar(100) DEFAULT NULL COMMENT 'WPS用户ID',
  `sync_status` enum('pending','syncing','completed','failed') DEFAULT 'pending' COMMENT '同步状态',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_code_type` (`user_code`, `user_type`),
  KEY `idx_user_type` (`user_type`),
  KEY `idx_college_code` (`college_code`),
  KEY `idx_major_code` (`major_code`),
  KEY `idx_class_code` (`class_code`),
  KEY `idx_wps_user_id` (`wps_user_id`),
  KEY `idx_sync_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户视图表';
```

### 4. 日历参与者映射表 (icasync_calendar_participants)

用于存储日历参与者关系。

```sql
CREATE TABLE `icasync_calendar_participants` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `calendar_id` varchar(100) NOT NULL COMMENT 'WPS日历ID',
  `kkh` varchar(60) NOT NULL COMMENT '开课号',
  `user_code` varchar(100) NOT NULL COMMENT '用户编号（学号/工号）',
  `user_type` enum('student','teacher') NOT NULL COMMENT '用户类型',
  `permission_role` enum('reader','writer','owner') DEFAULT 'reader' COMMENT '权限角色',
  `sync_status` enum('pending','syncing','completed','failed','deleted') DEFAULT 'pending' COMMENT '同步状态',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_calendar_user` (`calendar_id`, `user_code`, `user_type`),
  KEY `idx_kkh` (`kkh`),
  KEY `idx_user_code` (`user_code`),
  KEY `idx_user_type` (`user_type`),
  KEY `idx_sync_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日历参与者映射表';
```

### 5. 同步任务记录表 (icasync_sync_tasks)

用于记录同步任务的执行历史和状态。

```sql
CREATE TABLE `icasync_sync_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `task_type` enum('full_sync','incremental_sync','user_sync') NOT NULL COMMENT '任务类型',
  `xnxq` varchar(20) DEFAULT NULL COMMENT '学年学期（课程同步）',
  `task_tree_id` varchar(36) DEFAULT NULL COMMENT '任务树ID（@stratix/tasks）',
  `status` enum('pending','running','completed','failed','cancelled') DEFAULT 'pending' COMMENT '任务状态',
  `progress` decimal(5,2) DEFAULT 0.00 COMMENT '执行进度（0-100）',
  `total_items` int(11) DEFAULT 0 COMMENT '总处理项目数',
  `processed_items` int(11) DEFAULT 0 COMMENT '已处理项目数',
  `failed_items` int(11) DEFAULT 0 COMMENT '失败项目数',
  `start_time` timestamp NULL DEFAULT NULL COMMENT '开始时间',
  `end_time` timestamp NULL DEFAULT NULL COMMENT '结束时间',
  `error_message` text DEFAULT NULL COMMENT '错误信息',
  `result_summary` json DEFAULT NULL COMMENT '执行结果摘要',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  PRIMARY KEY (`id`),
  KEY `idx_task_type` (`task_type`),
  KEY `idx_xnxq` (`xnxq`),
  KEY `idx_task_tree_id` (`task_tree_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步任务记录表';
```

## 数据关系说明

### 1. 核心映射关系
- `icasync_calendar_mapping`: 一个课程（kkh）对应一个WPS日历
- `icasync_schedule_mapping`: 一个聚合任务（juhe_renwu）对应一个WPS日程
- `icasync_calendar_participants`: 一个日历可以有多个参与者

### 2. 用户数据整合
- `icasync_user_view`: 整合 `out_xsxx`（学生）和 `out_jsxx`（教师）数据
- 提供统一的用户查询接口

### 3. 同步状态管理
- 所有表都包含 `sync_status` 字段用于跟踪同步状态
- `icasync_sync_tasks` 记录整体同步任务的执行情况

### 4. 与原始数据的关联
- 通过 `kkh` 关联 `u_jw_kcb_cur` 和 `juhe_renwu`
- 通过 `user_code` 关联 `out_xsxx` 和 `out_jsxx`
- 通过 `juhe_renwu_id` 关联 `juhe_renwu`

## 索引策略

### 1. 主键索引
- 所有表使用自增 ID 作为主键，确保性能和唯一性

### 2. 唯一索引
- 业务唯一性约束，防止重复数据

### 3. 查询索引
- 基于常用查询条件创建复合索引
- 支持高效的状态查询和关联查询

## 数据生命周期

### 1. 创建阶段
- 插件启动时自动创建表结构
- 支持数据库迁移和版本管理

### 2. 同步阶段
- 实时更新同步状态
- 记录详细的执行日志

### 3. 清理阶段
- 定期清理过期的同步记录
- 保留必要的映射关系
