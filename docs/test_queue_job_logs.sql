-- 测试 queue_job_logs 表的 MySQL 5 兼容性
-- 这个脚本用于验证修复后的表结构是否可以在 MySQL 5 中正常创建

SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- 删除测试表（如果存在）
DROP TABLE IF EXISTS `test_queue_job_logs`;

-- 创建修复后的 queue_job_logs 表
CREATE TABLE `test_queue_job_logs` (
  `id` varchar(255) NOT NULL,
  `jobId` varchar(255) NOT NULL,
  `queueName` varchar(255) NOT NULL,
  `jobType` varchar(255) NOT NULL,
  `data` text NOT NULL,
  `finalStatus` varchar(50) NOT NULL,
  `result` text,
  `failedReason` text,
  `attempts` int NOT NULL,
  `priority` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processedAt` timestamp NULL DEFAULT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `processingTime` int NOT NULL,
  `archivedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_queue_job_logs_queue_completed` (`queueName`,`completedAt`),
  KEY `idx_queue_job_logs_job_id` (`jobId`),
  KEY `idx_queue_job_logs_job_type` (`queueName`,`jobType`),
  KEY `idx_queue_job_logs_archived` (`archivedAt`),
  KEY `idx_queue_job_logs_status` (`queueName`,`finalStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- 测试插入数据
INSERT INTO `test_queue_job_logs` (
  `id`, `jobId`, `queueName`, `jobType`, `data`, `finalStatus`, 
  `attempts`, `priority`, `processingTime`
) VALUES (
  'test-1', 'job-1', 'test-queue', 'test-job', '{"test": true}', 'completed',
  1, 5, 1000
);

-- 验证数据插入成功
SELECT * FROM `test_queue_job_logs`;

-- 清理测试表
DROP TABLE IF EXISTS `test_queue_job_logs`;

SELECT 'queue_job_logs 表 MySQL 5 兼容性测试完成' AS result; 