-- =====================================================
-- 视图：v_student_absence_rate_summary
-- =====================================================
-- 用途：统计每个学生所有课程的总体缺勤率、请假率、旷课率
-- 数据源：icalink_student_absence_rate_detail（物化表）
-- 聚合维度：student_id（学生维度）
-- =====================================================

DROP VIEW IF EXISTS v_student_absence_rate_summary;

CREATE OR REPLACE VIEW v_student_absence_rate_summary AS
SELECT
    -- 学生基本信息（取第一条记录的值）
    student_id,
    student_name AS student_name,
    semester AS semester,
    MAX(school_name) AS school_name,
    MAX(school_id) AS school_id,
    MAX(class_name) AS class_name,
    MAX(class_id) AS class_id,
    MAX(major_name) AS major_name,
    MAX(major_id) AS major_id,
    MAX(grade) AS grade,
    MAX(gender) AS gender,
    MAX(people) AS people,
    
    -- 课程统计
    COUNT(DISTINCT course_code) AS total_courses,
    
    -- 课次统计（所有课程的总和）
    SUM(total_sessions) AS total_sessions,
    SUM(completed_sessions) AS completed_sessions,
    
    -- 缺勤统计（所有课程的总和）
    SUM(absent_count) AS total_absent_count,
    SUM(leave_count) AS total_leave_count,
    SUM(truant_count) AS total_truant_count,
    
    -- 总体缺勤率计算
    -- 缺勤率 = (缺勤次数 + 旷课次数) / 已完成课次数
    CASE
        WHEN SUM(completed_sessions) > 0 THEN
            (SUM(absent_count) + SUM(truant_count)) / SUM(completed_sessions)
        ELSE 0
    END AS overall_absence_rate,
    
    -- 总体旷课率计算
    -- 旷课率 = 旷课次数 / 已完成课次数
    CASE
        WHEN SUM(completed_sessions) > 0 THEN
            SUM(truant_count) / SUM(completed_sessions)
        ELSE 0
    END AS overall_truant_rate,
    
    -- 总体请假率计算
    -- 请假率 = 请假次数 / 已完成课次数
    CASE
        WHEN SUM(completed_sessions) > 0 THEN
            SUM(leave_count) / SUM(completed_sessions)
        ELSE 0
    END AS overall_leave_rate,
    
    -- 平均缺勤率（所有课程缺勤率的平均值）
    AVG(absence_rate) AS avg_absence_rate,
    AVG(truant_rate) AS avg_truant_rate,
    AVG(leave_rate) AS avg_leave_rate,
    
    -- 最高缺勤率（找出缺勤率最高的课程）
    MAX(absence_rate) AS max_absence_rate,
    MAX(truant_rate) AS max_truant_rate,
    MAX(leave_rate) AS max_leave_rate,
    
    -- 统计时间
    MAX(updated_at) AS last_updated_at

FROM icalink_student_absence_rate_detail

GROUP BY student_id, semester;

-- 按总体缺勤率降序排序
ORDER BY overall_absence_rate DESC;

-- =====================================================
-- 视图说明
-- =====================================================
-- 1. 本视图基于物化表 icalink_student_absence_rate_detail
-- 2. 按学生ID分组，汇总该学生所有课程的统计数据
-- 3. 提供两种缺勤率计算方式：
--    - overall_*_rate: 基于总课次数计算的总体比率
--    - avg_*_rate: 所有课程比率的平均值
-- 4. 适用场景：
--    - 学生整体出勤情况分析
--    - 识别高缺勤率学生
--    - 学生出勤排名
--    - 预警系统数据源
-- =====================================================

SELECT '✅ 视图 v_student_absence_rate_summary 创建成功' AS status;

