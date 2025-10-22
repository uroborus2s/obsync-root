-- ====================================================================
-- 添加 icalink_attendance_records 表的性能优化索引
-- ====================================================================
-- Description:
-- 为支持视图查询优化，添加复合索引
-- 这个索引将显著提升获取最新签到记录的性能
-- ====================================================================

-- 检查索引是否已存在
SELECT 
    INDEX_NAME as '索引名称',
    COLUMN_NAME as '列名',
    SEQ_IN_INDEX as '列序号'
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name = 'icalink_attendance_records' 
  AND index_name = 'idx_course_student_id';

-- 添加复合索引：(attendance_course_id, student_id, id DESC)
-- 这个索引将用于快速查找每个学生每个课程的最新记录
ALTER TABLE `icalink_attendance_records` 
ADD INDEX `idx_course_student_id` (`attendance_course_id`, `student_id`, `id` DESC);

-- 验证索引创建结果
SELECT 
    INDEX_NAME as '索引名称',
    COLUMN_NAME as '列名',
    SEQ_IN_INDEX as '列序号',
    CARDINALITY as '基数',
    INDEX_TYPE as '索引类型'
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name = 'icalink_attendance_records' 
  AND index_name = 'idx_course_student_id'
ORDER BY SEQ_IN_INDEX;

