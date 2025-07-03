-- =====================================================
-- 简化版任务系统数据库迁移脚本
-- 功能：为 running_tasks 和 completed_tasks 表添加子任务计数字段
-- =====================================================

-- 为 running_tasks 表添加字段
ALTER TABLE running_tasks 
ADD COLUMN IF NOT EXISTS total_children int NOT NULL DEFAULT 0 COMMENT '总计子任务数量' AFTER progress,
ADD COLUMN IF NOT EXISTS completed_children int NOT NULL DEFAULT 0 COMMENT '已完成子任务数量' AFTER total_children;

-- 为 completed_tasks 表添加字段  
ALTER TABLE completed_tasks 
ADD COLUMN IF NOT EXISTS total_children int NOT NULL DEFAULT 0 COMMENT '总计子任务数量' AFTER progress,
ADD COLUMN IF NOT EXISTS completed_children int NOT NULL DEFAULT 0 COMMENT '已完成子任务数量' AFTER total_children;

-- 更新现有数据
UPDATE running_tasks r1 
SET total_children = (
    SELECT COUNT(*) 
    FROM running_tasks r2 
    WHERE r2.parent_id = r1.id
)
WHERE EXISTS (SELECT 1 FROM running_tasks r2 WHERE r2.parent_id = r1.id);

UPDATE completed_tasks c1 
SET total_children = (
    SELECT COUNT(*) 
    FROM completed_tasks c2 
    WHERE c2.parent_id = c1.id
),
completed_children = (
    SELECT COUNT(*) 
    FROM completed_tasks c2 
    WHERE c2.parent_id = c1.id
)
WHERE EXISTS (SELECT 1 FROM completed_tasks c2 WHERE c2.parent_id = c1.id);

-- 验证结果
SELECT 'Migration completed successfully' as status; 