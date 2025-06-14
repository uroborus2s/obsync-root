-- 为icalink_leave_attachments表添加新字段的迁移脚本
-- 执行日期：2024年

-- 1. 修改file_path字段为可选
ALTER TABLE `icalink_leave_attachments` 
MODIFY COLUMN `file_path` varchar(500) DEFAULT NULL COMMENT '文件路径(可选，用于文件系统存储)';

-- 2. 添加file_content字段用于存储二进制数据
ALTER TABLE `icalink_leave_attachments` 
ADD COLUMN `file_content` LONGBLOB DEFAULT NULL COMMENT '文件内容(二进制数据，用于数据库存储)' AFTER `file_path`;

-- 3. 添加storage_type字段
ALTER TABLE `icalink_leave_attachments` 
ADD COLUMN `storage_type` enum('file','database') NOT NULL DEFAULT 'database' COMMENT '存储类型：file文件系统存储，database数据库存储' AFTER `file_type`;

-- 4. 添加索引
ALTER TABLE `icalink_leave_attachments` 
ADD KEY `idx_storage_type` (`storage_type`);

-- 5. 更新现有记录的storage_type（如果有的话）
UPDATE `icalink_leave_attachments` 
SET `storage_type` = 'file' 
WHERE `file_path` IS NOT NULL AND `file_path` != '';

-- 6. 验证表结构
DESCRIBE `icalink_leave_attachments`; 