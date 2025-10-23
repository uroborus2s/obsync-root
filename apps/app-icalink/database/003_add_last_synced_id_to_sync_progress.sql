-- 为 sync_progress 表添加 last_synced_id 字段
-- 用于支持基于 ID 的增量同步

-- 检查字段是否已存在，如果不存在则添加
ALTER TABLE sync_progress 
ADD COLUMN IF NOT EXISTS last_synced_id BIGINT NOT NULL DEFAULT 0 
COMMENT '上次同步的最大记录 ID（用于增量同步）';

-- 为 last_synced_id 字段添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_last_synced_id ON sync_progress(last_synced_id);

-- 更新说明
-- 此迁移脚本为 sync_progress 表添加 last_synced_id 字段
-- 该字段用于记录上次同步的最大记录 ID，实现基于 ID 的增量同步
-- 
-- 业务逻辑：
-- 1. 每次同步从 last_synced_id 开始，查询 id > last_synced_id 的新记录
-- 2. 同步完成后，将本批次的最大 ID 更新到 last_synced_id
-- 3. 下次同步时从新的 last_synced_id 继续
-- 
-- 优势：
-- - 避免重复同步已处理的数据
-- - 支持数据只新增不删除的业务场景
-- - 断点续传更加精确和高效

