-- =====================================================
-- 迁移：添加学院周度签到统计查询优化索引
-- =====================================================
-- 用途：优化按学院、学期、教学周查询签到统计数据的性能
-- 表：icalink_course_checkin_stats
-- 索引字段：course_unit_id, semester, teaching_week, need_checkin
-- =====================================================

-- 检查索引是否已存在，如果存在则先删除
DROP INDEX IF EXISTS idx_unit_semester_week_checkin ON icalink_course_checkin_stats;

-- 创建复合索引以优化学院周度统计查询
CREATE INDEX idx_unit_semester_week_checkin 
ON icalink_course_checkin_stats(course_unit_id, semester, teaching_week, need_checkin);

-- =====================================================
-- 索引说明
-- =====================================================
-- 1. course_unit_id: 学院ID，查询的主要过滤条件
-- 2. semester: 学期，用于限定查询范围
-- 3. teaching_week: 教学周，用于分组和范围查询
-- 4. need_checkin: 是否需要签到，过滤不需要签到的课程
--
-- 查询优化效果：
-- - 支持 WHERE course_unit_id = ? AND semester = ? AND teaching_week BETWEEN ? AND ?
-- - 支持 GROUP BY teaching_week 的高效执行
-- - 预计查询时间从秒级降低到毫秒级
-- =====================================================

SELECT '✅ 索引 idx_unit_semester_week_checkin 创建成功' AS status;

